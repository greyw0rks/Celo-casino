// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title Blackjack
 * @notice On-chain Blackjack with commit-reveal card dealing.
 *
 *  Flow:
 *  1. Admin commits hash(serverSeed) before each player session.
 *  2. Player calls startGame(betAmount) — transfers USDm, gets initial 2 cards.
 *  3. Player calls hit() for more cards, or stand() to finalize.
 *  4. Admin calls reveal(serverSeed) to settle the dealer's hand & pay out.
 *
 *  Card generation: sha256(serverSeed, clientSeed, drawIndex) % 52
 *  Deck re-shuffles conceptually on each draw (sampling with replacement, simplified).
 *
 *  Payouts:
 *  - Blackjack (natural 21 on 2 cards): 3:2
 *  - Win: 1:1
 *  - Push: return bet
 *  - Lose: house keeps bet
 *  - Bust (>21): house keeps bet immediately
 */
contract Blackjack {
    IERC20 public immutable usdm;
    address public admin;

    uint256 public constant MIN_BET = 0.5e18;
    uint256 public constant MAX_BET = 200e18;
    uint256 public constant HOUSE_EDGE_BPS = 200; // 2%

    enum GameState { IDLE, PLAYER_TURN, DEALER_TURN, SETTLED }

    struct Session {
        address player;
        uint256 bet;
        bytes32 commitment;     // hash(serverSeed) committed by admin upfront
        bytes32 clientSeed;     // derived from player address + block hash
        GameState state;
        uint8[] playerCards;
        uint8[] dealerCards;    // dealer's hole card revealed after player stands
        uint8   playerTotal;
        uint8   dealerTotal;
        bool    isBlackjack;
        bool    playerBust;
        uint256 createdAt;
    }

    uint256 public sessionCount;
    mapping(uint256 => Session) public sessions;
    mapping(address => uint256) public activeSession; // 0 = none
    // pre-committed seeds: admin pushes these before players start
    mapping(uint256 => bytes32) public pendingCommitments;
    uint256 public nextCommitmentIndex;
    uint256 public usedCommitmentIndex;

    event CommitmentAdded(uint256 indexed index, bytes32 commitment);
    event GameStarted(uint256 indexed sessionId, address indexed player, uint256 bet);
    event CardDealt(uint256 indexed sessionId, address indexed player, uint8 card, uint8 newTotal);
    event PlayerStood(uint256 indexed sessionId, uint8 playerTotal);
    event GameSettled(uint256 indexed sessionId, GameState result, uint256 payout);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _usdm) {
        usdm = IERC20(_usdm);
        admin = msg.sender;
    }

    // ── Admin: add commitments (batch) ───────────────────────────────────────

    function addCommitments(bytes32[] calldata commitments) external onlyAdmin {
        for (uint i = 0; i < commitments.length; i++) {
            pendingCommitments[nextCommitmentIndex] = commitments[i];
            emit CommitmentAdded(nextCommitmentIndex, commitments[i]);
            nextCommitmentIndex++;
        }
    }

    // ── Player: start game ───────────────────────────────────────────────────

    function startGame(uint256 bet) external returns (uint256) {
        require(activeSession[msg.sender] == 0, "Already in a game");
        require(bet >= MIN_BET && bet <= MAX_BET, "Invalid bet");
        require(usedCommitmentIndex < nextCommitmentIndex, "No commitments available");
        require(
            usdm.balanceOf(address(this)) >= bet * 3,
            "House reserve too low"
        );

        usdm.transferFrom(msg.sender, address(this), bet);

        bytes32 commitment = pendingCommitments[usedCommitmentIndex];
        usedCommitmentIndex++;

        sessionCount++;
        bytes32 clientSeed = keccak256(abi.encodePacked(msg.sender, blockhash(block.number - 1), block.timestamp));

        Session storage s = sessions[sessionCount];
        s.player = msg.sender;
        s.bet = bet;
        s.commitment = commitment;
        s.clientSeed = clientSeed;
        s.state = GameState.PLAYER_TURN;
        s.createdAt = block.timestamp;

        activeSession[msg.sender] = sessionCount;

        // Deal 2 cards to player, 1 face-up to dealer
        uint8 c1 = _drawCard(sessionCount, 0);
        uint8 c2 = _drawCard(sessionCount, 1);
        uint8 d1 = _drawCard(sessionCount, 2); // dealer face-up
        // dealer hole card drawn at index 3 during reveal

        s.playerCards.push(c1);
        s.playerCards.push(c2);
        s.dealerCards.push(d1);
        s.playerTotal = _handValue(s.playerCards);

        // Natural blackjack check
        if (s.playerTotal == 21 && s.playerCards.length == 2) {
            s.isBlackjack = true;
            s.state = GameState.DEALER_TURN;
        }

        emit GameStarted(sessionCount, msg.sender, bet);
        return sessionCount;
    }

    // ── Player: hit ──────────────────────────────────────────────────────────

    function hit() external {
        uint256 sid = activeSession[msg.sender];
        require(sid != 0, "No active game");
        Session storage s = sessions[sid];
        require(s.state == GameState.PLAYER_TURN, "Cannot hit");

        uint8 newCard = _drawCard(sid, uint256(s.playerCards.length + s.dealerCards.length));
        s.playerCards.push(newCard);
        s.playerTotal = _handValue(s.playerCards);

        emit CardDealt(sid, msg.sender, newCard, s.playerTotal);

        if (s.playerTotal > 21) {
            s.playerBust = true;
            s.state = GameState.DEALER_TURN;
        } else if (s.playerTotal == 21) {
            s.state = GameState.DEALER_TURN;
        }
    }

    // ── Player: stand ────────────────────────────────────────────────────────

    function stand() external {
        uint256 sid = activeSession[msg.sender];
        require(sid != 0, "No active game");
        Session storage s = sessions[sid];
        require(s.state == GameState.PLAYER_TURN, "Cannot stand");
        s.state = GameState.DEALER_TURN;
        emit PlayerStood(sid, s.playerTotal);
    }

    // ── Admin: reveal server seed & settle ───────────────────────────────────

    function reveal(uint256 sessionId, bytes32 serverSeed) external onlyAdmin {
        Session storage s = sessions[sessionId];
        require(s.state == GameState.DEALER_TURN, "Not dealer turn");
        require(keccak256(abi.encodePacked(serverSeed)) == s.commitment, "Invalid seed");

        uint256 payout;

        if (s.playerBust) {
            // Player busted — house wins
            s.state = GameState.SETTLED;
            emit GameSettled(sessionId, GameState.SETTLED, 0);
            activeSession[s.player] = 0;
            return;
        }

        // Reveal dealer hole card and draw until 17+
        uint8 holeCard = _drawCard(sessionId, s.playerCards.length + s.dealerCards.length);
        s.dealerCards.push(holeCard);
        s.dealerTotal = _handValue(s.dealerCards);

        uint256 drawIdx = s.playerCards.length + s.dealerCards.length;
        while (s.dealerTotal < 17) {
            uint8 c = _drawCard(sessionId, drawIdx++);
            s.dealerCards.push(c);
            s.dealerTotal = _handValue(s.dealerCards);
        }

        bool dealerBust = s.dealerTotal > 21;

        if (s.isBlackjack && !(s.dealerTotal == 21 && s.dealerCards.length == 2)) {
            // Player blackjack, dealer no blackjack: 3:2
            uint256 gross = s.bet + (s.bet * 3) / 2;
            uint256 fee = (gross * HOUSE_EDGE_BPS) / 10_000;
            payout = gross - fee;
        } else if (dealerBust || s.playerTotal > s.dealerTotal) {
            // Player wins: 1:1
            uint256 gross = s.bet * 2;
            uint256 fee = (gross * HOUSE_EDGE_BPS) / 10_000;
            payout = gross - fee;
        } else if (s.playerTotal == s.dealerTotal) {
            // Push
            payout = s.bet;
        } else {
            // Dealer wins
            payout = 0;
        }

        s.state = GameState.SETTLED;
        activeSession[s.player] = 0;

        if (payout > 0) {
            usdm.transfer(s.player, payout);
        }

        emit GameSettled(sessionId, GameState.SETTLED, payout);
    }

    // ── Internal: deterministic card draw ───────────────────────────────────

    function _drawCard(uint256 sessionId, uint256 drawIndex) internal view returns (uint8) {
        Session storage s = sessions[sessionId];
        bytes32 hash = keccak256(abi.encodePacked(s.commitment, s.clientSeed, drawIndex));
        return uint8(uint256(hash) % 52);
    }

    // ── Internal: hand value (aces are 11, then 1 if bust) ──────────────────

    function _handValue(uint8[] memory cards) internal pure returns (uint8) {
        uint8 total = 0;
        uint8 aces = 0;
        for (uint i = 0; i < cards.length; i++) {
            uint8 rank = cards[i] % 13; // 0=Ace, 1-9=2-10, 10-12=J,Q,K
            if (rank == 0) {
                aces++;
                total += 11;
            } else if (rank >= 10) {
                total += 10;
            } else {
                total += rank + 1;
            }
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getSession(uint256 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }

    function cardToString(uint8 card) external pure returns (string memory rank, string memory suit) {
        string[13] memory ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
        string[4]  memory suits = ["\xE2\x99\xA0","\xE2\x99\xA5","\xE2\x99\xA6","\xE2\x99\xA3"];
        rank = ranks[card % 13];
        suit = suits[card / 13];
    }

    function houseBalance() external view returns (uint256) {
        return usdm.balanceOf(address(this));
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function depositReserve(uint256 amount) external onlyAdmin {
        usdm.transferFrom(msg.sender, address(this), amount);
    }

    function withdrawFees(uint256 amount) external onlyAdmin {
        usdm.transfer(admin, amount);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}
