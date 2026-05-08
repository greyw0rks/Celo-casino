// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title ChessWager
 * @notice Peer-to-peer chess wager. Player A creates a challenge with a stake.
 *         Player B accepts, matching the stake. Both funds locked in escrow.
 *         Admin resolves the winner (or calls a draw — both get 95% back).
 *         5% protocol fee on the winner's gross payout.
 *
 *         Game is played off-chain (on-screen board in the dApp).
 *         Both players attest their result; admin arbitrates disputes.
 */
contract ChessWager {
    IERC20 public immutable usdm;
    address public admin;

    uint256 public constant PROTOCOL_FEE_BPS = 500; // 5%
    uint256 public constant MIN_STAKE = 1e18;         // 1 USDm
    uint256 public constant MAX_STAKE = 1000e18;
    uint256 public constant CHALLENGE_EXPIRY = 24 hours;

    enum GameStatus { OPEN, ACTIVE, RESOLVED, CANCELLED, EXPIRED }
    enum Result    { NONE, WHITE_WINS, BLACK_WINS, DRAW }

    struct Game {
        uint256  id;
        address  white;        // challenger (creates + stakes first)
        address  black;        // acceptor
        uint256  stake;        // each player's stake (total pot = stake * 2)
        GameStatus status;
        Result   result;
        uint256  createdAt;
        uint256  startedAt;
        // attestations (each player reports their perceived result)
        Result   whiteAttestation;
        Result   blackAttestation;
        string   pgn;          // final game PGN stored on resolve
    }

    uint256 public gameCount;
    mapping(uint256 => Game) public games;
    // player => active game id (0 = none)
    mapping(address => uint256) public activeGame;

    event GameCreated(uint256 indexed id, address indexed white, uint256 stake);
    event GameAccepted(uint256 indexed id, address indexed black);
    event ResultAttested(uint256 indexed id, address indexed player, Result result);
    event GameResolved(uint256 indexed id, Result result, address winner);
    event GameCancelled(uint256 indexed id);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _usdm) {
        usdm = IERC20(_usdm);
        admin = msg.sender;
    }

    // ── Player A: create challenge ───────────────────────────────────────────

    function createChallenge(uint256 stake) external returns (uint256) {
        require(stake >= MIN_STAKE && stake <= MAX_STAKE, "Invalid stake");
        require(activeGame[msg.sender] == 0, "Already in a game");

        usdm.transferFrom(msg.sender, address(this), stake);

        gameCount++;
        games[gameCount] = Game({
            id:               gameCount,
            white:            msg.sender,
            black:            address(0),
            stake:            stake,
            status:           GameStatus.OPEN,
            result:           Result.NONE,
            createdAt:        block.timestamp,
            startedAt:        0,
            whiteAttestation: Result.NONE,
            blackAttestation: Result.NONE,
            pgn:              ""
        });

        activeGame[msg.sender] = gameCount;
        emit GameCreated(gameCount, msg.sender, stake);
        return gameCount;
    }

    // ── Player B: accept challenge ───────────────────────────────────────────

    function acceptChallenge(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == GameStatus.OPEN, "Not open");
        require(msg.sender != g.white, "Cannot play yourself");
        require(activeGame[msg.sender] == 0, "Already in a game");
        require(block.timestamp < g.createdAt + CHALLENGE_EXPIRY, "Challenge expired");

        usdm.transferFrom(msg.sender, address(this), g.stake);

        g.black = msg.sender;
        g.status = GameStatus.ACTIVE;
        g.startedAt = block.timestamp;
        activeGame[msg.sender] = gameId;

        emit GameAccepted(gameId, msg.sender);
    }

    // ── Player: attest result ────────────────────────────────────────────────

    function attestResult(uint256 gameId, Result result) external {
        Game storage g = games[gameId];
        require(g.status == GameStatus.ACTIVE, "Game not active");
        require(result != Result.NONE, "Must specify result");
        require(msg.sender == g.white || msg.sender == g.black, "Not a player");

        if (msg.sender == g.white) {
            g.whiteAttestation = result;
        } else {
            g.blackAttestation = result;
        }

        emit ResultAttested(gameId, msg.sender, result);

        // Auto-resolve if both agree
        if (g.whiteAttestation == g.blackAttestation && g.whiteAttestation != Result.NONE) {
            _resolve(gameId, g.whiteAttestation, "");
        }
    }

    // ── Admin: resolve disputed game ─────────────────────────────────────────

    function resolveGame(uint256 gameId, Result result, string calldata pgn) external onlyAdmin {
        Game storage g = games[gameId];
        require(g.status == GameStatus.ACTIVE, "Game not active");
        _resolve(gameId, result, pgn);
    }

    function _resolve(uint256 gameId, Result result, string memory pgn) internal {
        Game storage g = games[gameId];
        g.result = result;
        g.status = GameStatus.RESOLVED;
        g.pgn = pgn;

        uint256 totalPot = g.stake * 2;
        address winner;

        if (result == Result.DRAW) {
            uint256 eachBack = (totalPot * (10_000 - PROTOCOL_FEE_BPS)) / 2 / 10_000;
            usdm.transfer(g.white, eachBack);
            usdm.transfer(g.black, eachBack);
        } else {
            winner = result == Result.WHITE_WINS ? g.white : g.black;
            address loser = result == Result.WHITE_WINS ? g.black : g.white;
            uint256 fee = (totalPot * PROTOCOL_FEE_BPS) / 10_000;
            usdm.transfer(winner, totalPot - fee);
            (loser); // silence unused warning
        }

        activeGame[g.white] = 0;
        activeGame[g.black] = 0;

        emit GameResolved(gameId, result, winner);
    }

    // ── Player A: cancel unclaimed challenge ─────────────────────────────────

    function cancelChallenge(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == GameStatus.OPEN, "Not open");
        require(msg.sender == g.white, "Not creator");

        g.status = GameStatus.CANCELLED;
        activeGame[g.white] = 0;
        usdm.transfer(g.white, g.stake);

        emit GameCancelled(gameId);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function getOpenChallenges(uint256 fromId, uint256 limit) external view
        returns (uint256[] memory ids)
    {
        uint256 count = 0;
        ids = new uint256[](limit);
        for (uint256 i = fromId; i <= gameCount && count < limit; i++) {
            if (games[i].status == GameStatus.OPEN) {
                ids[count++] = i;
            }
        }
        assembly { mstore(ids, count) }
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }

    function withdrawFees(uint256 amount) external onlyAdmin {
        usdm.transfer(admin, amount);
    }
}
