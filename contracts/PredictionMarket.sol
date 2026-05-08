// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title PredictionMarket
 * @notice Binary & multi-outcome prediction markets settled by admin.
 *         Winners split the total pot proportional to their stake on the winning outcome.
 *         5% protocol fee on winnings.
 */
contract PredictionMarket {
    IERC20 public immutable usdm;
    address public admin;

    uint256 public constant PROTOCOL_FEE_BPS = 500; // 5%
    uint256 public constant MIN_BET = 0.5e18;
    uint256 public constant MAX_BET = 500e18;

    enum Status { OPEN, CLOSED, RESOLVED, CANCELLED }

    struct Market {
        uint256 id;
        string  question;
        string[] outcomes;
        uint256  deadline;        // bets close at this timestamp
        Status   status;
        uint8    winningOutcome;  // set on resolve
        uint256  totalPool;
        uint256[] outcomePools;   // pool per outcome
        address  creator;
        string   category;        // "crypto" | "sports" | "politics" | "other"
        string   imageUrl;
    }

    struct Position {
        uint256 amount;
        uint8   outcome;
        bool    claimed;
    }

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    // marketId => player => positions (one per outcome)
    mapping(uint256 => mapping(address => Position[])) public positions;

    event MarketCreated(uint256 indexed id, string question, uint256 deadline);
    event BetPlaced(uint256 indexed marketId, address indexed player, uint8 outcome, uint256 amount);
    event MarketClosed(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, uint8 winningOutcome);
    event MarketCancelled(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed player, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(address _usdm) {
        usdm = IERC20(_usdm);
        admin = msg.sender;
    }

    // ── Admin: create market ─────────────────────────────────────────────────

    function createMarket(
        string calldata question,
        string[] calldata outcomes,
        uint256 deadline,
        string calldata category,
        string calldata imageUrl
    ) external onlyAdmin returns (uint256) {
        require(outcomes.length >= 2 && outcomes.length <= 8, "2-8 outcomes");
        require(deadline > block.timestamp, "Deadline must be future");

        marketCount++;
        Market storage m = markets[marketCount];
        m.id = marketCount;
        m.question = question;
        m.deadline = deadline;
        m.status = Status.OPEN;
        m.creator = msg.sender;
        m.category = category;
        m.imageUrl = imageUrl;

        for (uint i = 0; i < outcomes.length; i++) {
            m.outcomes.push(outcomes[i]);
            m.outcomePools.push(0);
        }

        emit MarketCreated(marketCount, question, deadline);
        return marketCount;
    }

    // ── Player: place bet ────────────────────────────────────────────────────

    function placeBet(uint256 marketId, uint8 outcome, uint256 amount) external {
        Market storage m = markets[marketId];
        require(m.status == Status.OPEN, "Market not open");
        require(block.timestamp < m.deadline, "Betting closed");
        require(outcome < m.outcomes.length, "Invalid outcome");
        require(amount >= MIN_BET && amount <= MAX_BET, "Invalid amount");

        usdm.transferFrom(msg.sender, address(this), amount);

        m.totalPool += amount;
        m.outcomePools[outcome] += amount;

        positions[marketId][msg.sender].push(Position({
            amount: amount,
            outcome: outcome,
            claimed: false
        }));

        emit BetPlaced(marketId, msg.sender, outcome, amount);
    }

    // ── Admin: close betting ─────────────────────────────────────────────────

    function closeMarket(uint256 marketId) external onlyAdmin {
        Market storage m = markets[marketId];
        require(m.status == Status.OPEN, "Not open");
        m.status = Status.CLOSED;
        emit MarketClosed(marketId);
    }

    // ── Admin: resolve market ────────────────────────────────────────────────

    function resolveMarket(uint256 marketId, uint8 winningOutcome) external onlyAdmin {
        Market storage m = markets[marketId];
        require(m.status == Status.CLOSED || m.status == Status.OPEN, "Already resolved");
        require(winningOutcome < m.outcomes.length, "Invalid outcome");

        m.winningOutcome = winningOutcome;
        m.status = Status.RESOLVED;
        emit MarketResolved(marketId, winningOutcome);
    }

    // ── Admin: cancel market (full refunds) ──────────────────────────────────

    function cancelMarket(uint256 marketId) external onlyAdmin {
        Market storage m = markets[marketId];
        require(m.status != Status.RESOLVED, "Already resolved");
        m.status = Status.CANCELLED;
        emit MarketCancelled(marketId);
    }

    // ── Player: claim winnings ───────────────────────────────────────────────

    function claim(uint256 marketId, uint256 positionIndex) external {
        Market storage m = markets[marketId];
        require(m.status == Status.RESOLVED || m.status == Status.CANCELLED, "Not claimable");

        Position storage pos = positions[marketId][msg.sender][positionIndex];
        require(!pos.claimed, "Already claimed");
        pos.claimed = true;

        uint256 payout;

        if (m.status == Status.CANCELLED) {
            payout = pos.amount;
        } else {
            require(pos.outcome == m.winningOutcome, "Not a winner");
            uint256 winnerPool = m.outcomePools[m.winningOutcome];
            uint256 gross = (pos.amount * m.totalPool) / winnerPool;
            uint256 fee = (gross * PROTOCOL_FEE_BPS) / 10_000;
            payout = gross - fee;
        }

        usdm.transfer(msg.sender, payout);
        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getMarket(uint256 marketId) external view returns (
        uint256 id,
        string memory question,
        string[] memory outcomes,
        uint256 deadline,
        Status status,
        uint8 winningOutcome,
        uint256 totalPool,
        uint256[] memory outcomePools,
        string memory category
    ) {
        Market storage m = markets[marketId];
        return (m.id, m.question, m.outcomes, m.deadline, m.status, m.winningOutcome, m.totalPool, m.outcomePools, m.category);
    }

    function getPositions(uint256 marketId, address player) external view returns (Position[] memory) {
        return positions[marketId][player];
    }

    function getMarketOdds(uint256 marketId) external view returns (uint256[] memory odds) {
        Market storage m = markets[marketId];
        odds = new uint256[](m.outcomes.length);
        if (m.totalPool == 0) return odds;
        for (uint i = 0; i < m.outcomes.length; i++) {
            odds[i] = m.outcomePools[i] * 10_000 / m.totalPool; // bps
        }
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }

    function withdrawFees(uint256 amount) external onlyAdmin {
        usdm.transfer(admin, amount);
    }
}
