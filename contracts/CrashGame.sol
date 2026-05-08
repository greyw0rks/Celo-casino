// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title CrashGame
 * @notice Provably fair crash game using commit-reveal scheme.
 *         Admin commits hash(crashPoint, salt) before betting opens.
 *         Players bet USDm during BETTING phase.
 *         Round goes LIVE — players call cashOut(multiplier * 100) to lock winnings.
 *         Admin reveals crashPoint; anyone who cashed out below crashPoint wins.
 *
 * Multipliers stored as uint32 scaled by 100 (e.g. 150 = 1.50x, 314 = 3.14x).
 */
contract CrashGame {
    IERC20 public immutable usdm;
    address public admin;

    uint256 public constant HOUSE_EDGE_BPS = 300; // 3%
    uint256 public constant MIN_BET = 0.1e18;     // 0.1 USDm
    uint256 public constant MAX_BET = 100e18;     // 100 USDm
    uint256 public constant MAX_MULTIPLIER = 100_00; // 100.00x
    uint256 public constant MIN_MULTIPLIER = 1_01;   // 1.01x

    enum Phase { IDLE, BETTING, LIVE, REVEALING }

    struct Round {
        uint256 roundId;
        bytes32 commitment;   // hash(crashPoint, salt)
        uint32  crashPoint;   // revealed after round ends (scaled x100)
        Phase   phase;
        uint256 totalBets;
        uint256 startTime;
    }

    struct Bet {
        uint256 amount;
        uint32  cashedOutAt; // 0 = not cashed out yet
        bool    claimed;
    }

    uint256 public currentRoundId;
    mapping(uint256 => Round) public rounds;
    // roundId => player => Bet
    mapping(uint256 => mapping(address => Bet)) public bets;

    event RoundOpened(uint256 indexed roundId, bytes32 commitment);
    event BetPlaced(uint256 indexed roundId, address indexed player, uint256 amount);
    event RoundLive(uint256 indexed roundId, uint256 startTime);
    event CashedOut(uint256 indexed roundId, address indexed player, uint32 multiplier, uint256 payout);
    event RoundRevealed(uint256 indexed roundId, uint32 crashPoint);
    event WinClaimed(uint256 indexed roundId, address indexed player, uint256 payout);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _usdm) {
        usdm = IERC20(_usdm);
        admin = msg.sender;
    }

    // ── Admin: open betting with commitment ──────────────────────────────────

    function openRound(bytes32 commitment) external onlyAdmin {
        require(rounds[currentRoundId].phase == Phase.IDLE || currentRoundId == 0, "Previous round not settled");
        currentRoundId++;
        rounds[currentRoundId] = Round({
            roundId:    currentRoundId,
            commitment: commitment,
            crashPoint: 0,
            phase:      Phase.BETTING,
            totalBets:  0,
            startTime:  0
        });
        emit RoundOpened(currentRoundId, commitment);
    }

    // ── Admin: start the live phase ──────────────────────────────────────────

    function startRound() external onlyAdmin {
        Round storage r = rounds[currentRoundId];
        require(r.phase == Phase.BETTING, "Not in betting phase");
        r.phase = Phase.LIVE;
        r.startTime = block.timestamp;
        emit RoundLive(currentRoundId, block.timestamp);
    }

    // ── Player: place bet ────────────────────────────────────────────────────

    function placeBet(uint256 amount) external {
        Round storage r = rounds[currentRoundId];
        require(r.phase == Phase.BETTING, "Betting closed");
        require(amount >= MIN_BET && amount <= MAX_BET, "Invalid bet amount");
        require(bets[currentRoundId][msg.sender].amount == 0, "Already bet this round");

        usdm.transferFrom(msg.sender, address(this), amount);
        bets[currentRoundId][msg.sender] = Bet({ amount: amount, cashedOutAt: 0, claimed: false });
        r.totalBets += amount;

        emit BetPlaced(currentRoundId, msg.sender, amount);
    }

    // ── Player: cash out at current multiplier ───────────────────────────────

    function cashOut(uint32 multiplier) external {
        Round storage r = rounds[currentRoundId];
        require(r.phase == Phase.LIVE, "Round not live");
        require(multiplier >= MIN_MULTIPLIER, "Multiplier too low");

        Bet storage b = bets[currentRoundId][msg.sender];
        require(b.amount > 0, "No bet");
        require(b.cashedOutAt == 0, "Already cashed out");

        b.cashedOutAt = multiplier;

        uint256 gross = (b.amount * multiplier) / 100;
        uint256 fee = (gross * HOUSE_EDGE_BPS) / 10_000;
        uint256 payout = gross - fee;

        usdm.transfer(msg.sender, payout);
        emit CashedOut(currentRoundId, msg.sender, multiplier, payout);
    }

    // ── Admin: reveal crash point ────────────────────────────────────────────

    function revealCrash(uint32 crashPoint, bytes32 salt) external onlyAdmin {
        Round storage r = rounds[currentRoundId];
        require(r.phase == Phase.LIVE, "Round not live");

        bytes32 expected = keccak256(abi.encodePacked(crashPoint, salt));
        require(expected == r.commitment, "Invalid reveal");
        require(crashPoint >= 100, "Crash point must be >= 1.00x");

        r.crashPoint = crashPoint;
        r.phase = Phase.IDLE;

        emit RoundRevealed(currentRoundId, crashPoint);
    }

    // ── View helpers ─────────────────────────────────────────────────────────

    function getCurrentRound() external view returns (Round memory) {
        return rounds[currentRoundId];
    }

    function getMyBet(uint256 roundId) external view returns (Bet memory) {
        return bets[roundId][msg.sender];
    }

    function computeCommitment(uint32 crashPoint, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(crashPoint, salt));
    }

    // ── Admin: withdraw house fees ───────────────────────────────────────────

    function withdrawFees(uint256 amount) external onlyAdmin {
        usdm.transfer(admin, amount);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}
