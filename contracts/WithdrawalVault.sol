// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title WithdrawalVault
 * @dev Manages funds and processes withdrawals for the payment gateway
 */
contract WithdrawalVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum WithdrawalStatus { Pending, Approved, Executed, Rejected, Cancelled }

    struct Withdrawal {
        uint256 id;
        address appOwner;
        address recipient;
        uint256 amount;
        address token; // address(0) for native token
        WithdrawalStatus status;
        string reason;
        uint256 requestedAt;
        uint256 processedAt;
        bytes32 executedTxHash;
        address approvedBy;
    }

    struct Balance {
        uint256 available;
        uint256 pending;
        uint256 reserved;
        uint256 totalWithdrawn;
        uint256 lastUpdated;
    }

    // Minimum withdrawal amount (to prevent spam)
    uint256 public minWithdrawalAmount = 0.001 ether;
    
    // Maximum withdrawal amount per request
    uint256 public maxWithdrawalAmount = 100 ether;
    
    // Withdrawal fee in basis points (default 0.5%)
    uint256 public withdrawalFeeBps = 50;
    
    // Maximum withdrawal fee
    uint256 public constant MAX_WITHDRAWAL_FEE_BPS = 1000; // 10%
    
    // Withdrawal counter
    uint256 public withdrawalCounter;
    
    // Auto-approval threshold (withdrawals below this are auto-approved)
    uint256 public autoApprovalThreshold = 1 ether;
    
    // Mapping from withdrawal ID to withdrawal
    mapping(uint256 => Withdrawal) public withdrawals;
    
    // Mapping from app owner to withdrawal IDs
    mapping(address => uint256[]) public ownerWithdrawals;
    
    // Mapping from app owner to token balances
    mapping(address => mapping(address => Balance)) public balances;
    
    // Mapping from app owner to total balance (native token)
    mapping(address => Balance) public nativeBalances;
    
    // Supported tokens
    mapping(address => bool) public supportedTokens;
    
    // Withdrawal approvers
    mapping(address => bool) public approvers;

    event WithdrawalRequested(
        uint256 indexed withdrawalId,
        address indexed appOwner,
        address indexed recipient,
        uint256 amount,
        address token,
        uint256 timestamp
    );

    event WithdrawalApproved(
        uint256 indexed withdrawalId,
        address indexed approver,
        uint256 timestamp
    );

    event WithdrawalExecuted(
        uint256 indexed withdrawalId,
        address indexed appOwner,
        address indexed recipient,
        uint256 amount,
        uint256 fee,
        bytes32 txHash,
        uint256 timestamp
    );

    event WithdrawalRejected(
        uint256 indexed withdrawalId,
        address indexed approver,
        string reason,
        uint256 timestamp
    );

    event WithdrawalCancelled(
        uint256 indexed withdrawalId,
        address indexed appOwner,
        uint256 timestamp
    );

    event BalanceUpdated(
        address indexed appOwner,
        address indexed token,
        uint256 available,
        uint256 pending,
        uint256 reserved,
        uint256 timestamp
    );

    event FundsDeposited(
        address indexed appOwner,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event TokenSupported(
        address indexed token,
        bool supported,
        uint256 timestamp
    );

    event ApproverUpdated(
        address indexed approver,
        bool isApprover,
        uint256 timestamp
    );

    modifier validWithdrawal(uint256 withdrawalId) {
        require(withdrawalId > 0 && withdrawalId <= withdrawalCounter, "Invalid withdrawal ID");
        _;
    }

    modifier onlyWithdrawalOwner(uint256 withdrawalId) {
        require(withdrawals[withdrawalId].appOwner == msg.sender, "Not withdrawal owner");
        _;
    }

    modifier onlyApprover() {
        require(approvers[msg.sender] || msg.sender == owner(), "Not authorized approver");
        _;
    }

    constructor() {
        // Add owner as default approver
        approvers[msg.sender] = true;
        
        // Support native token by default
        supportedTokens[address(0)] = true;
    }

    /**
     * @dev Requests a withdrawal
     */
    function requestWithdrawal(
        address recipient,
        uint256 amount,
        address token
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(amount >= minWithdrawalAmount, "Amount below minimum");
        require(amount <= maxWithdrawalAmount, "Amount exceeds maximum");
        require(supportedTokens[token], "Token not supported");

        // Check available balance
        uint256 availableBalance;
        if (token == address(0)) {
            availableBalance = nativeBalances[msg.sender].available;
        } else {
            availableBalance = balances[msg.sender][token].available;
        }
        
        require(availableBalance >= amount, "Insufficient balance");

        withdrawalCounter++;
        uint256 withdrawalId = withdrawalCounter;

        Withdrawal storage newWithdrawal = withdrawals[withdrawalId];
        newWithdrawal.id = withdrawalId;
        newWithdrawal.appOwner = msg.sender;
        newWithdrawal.recipient = recipient;
        newWithdrawal.amount = amount;
        newWithdrawal.token = token;
        newWithdrawal.status = WithdrawalStatus.Pending;
        newWithdrawal.requestedAt = block.timestamp;

        ownerWithdrawals[msg.sender].push(withdrawalId);

        // Move funds from available to pending
        _updateBalance(msg.sender, token, availableBalance - amount, amount, 0);

        // Auto-approve if below threshold
        if (amount <= autoApprovalThreshold) {
            _approveWithdrawal(withdrawalId, address(this));
        }

        emit WithdrawalRequested(
            withdrawalId,
            msg.sender,
            recipient,
            amount,
            token,
            block.timestamp
        );

        return withdrawalId;
    }

    /**
     * @dev Approves a withdrawal
     */
    function approveWithdrawal(uint256 withdrawalId) 
        external 
        nonReentrant 
        whenNotPaused 
        validWithdrawal(withdrawalId) 
        onlyApprover 
    {
        _approveWithdrawal(withdrawalId, msg.sender);
    }

    /**
     * @dev Executes an approved withdrawal
     */
    function executeWithdrawal(uint256 withdrawalId) 
        external 
        nonReentrant 
        whenNotPaused 
        validWithdrawal(withdrawalId) 
    {
        Withdrawal storage withdrawal = withdrawals[withdrawalId];
        require(withdrawal.status == WithdrawalStatus.Approved, "Withdrawal not approved");

        uint256 fee = (withdrawal.amount * withdrawalFeeBps) / 10000;
        uint256 netAmount = withdrawal.amount - fee;

        // Update withdrawal status
        withdrawal.status = WithdrawalStatus.Executed;
        withdrawal.processedAt = block.timestamp;
        withdrawal.executedTxHash = keccak256(abi.encodePacked(block.timestamp, withdrawalId));

        // Update balances
        address token = withdrawal.token;
        address appOwner = withdrawal.appOwner;
        
        if (token == address(0)) {
            Balance storage balance = nativeBalances[appOwner];
            balance.pending -= withdrawal.amount;
            balance.totalWithdrawn += withdrawal.amount;
            balance.lastUpdated = block.timestamp;
            
            // Transfer native token
            payable(withdrawal.recipient).transfer(netAmount);
            if (fee > 0) {
                payable(owner()).transfer(fee);
            }
        } else {
            Balance storage balance = balances[appOwner][token];
            balance.pending -= withdrawal.amount;
            balance.totalWithdrawn += withdrawal.amount;
            balance.lastUpdated = block.timestamp;
            
            // Transfer ERC20 token
            IERC20(token).safeTransfer(withdrawal.recipient, netAmount);
            if (fee > 0) {
                IERC20(token).safeTransfer(owner(), fee);
            }
        }

        emit WithdrawalExecuted(
            withdrawalId,
            appOwner,
            withdrawal.recipient,
            withdrawal.amount,
            fee,
            withdrawal.executedTxHash,
            block.timestamp
        );

        emit BalanceUpdated(
            appOwner,
            token,
            token == address(0) ? nativeBalances[appOwner].available : balances[appOwner][token].available,
            token == address(0) ? nativeBalances[appOwner].pending : balances[appOwner][token].pending,
            token == address(0) ? nativeBalances[appOwner].reserved : balances[appOwner][token].reserved,
            block.timestamp
        );
    }

    /**
     * @dev Rejects a withdrawal
     */
    function rejectWithdrawal(uint256 withdrawalId, string memory reason) 
        external 
        nonReentrant 
        whenNotPaused 
        validWithdrawal(withdrawalId) 
        onlyApprover 
    {
        Withdrawal storage withdrawal = withdrawals[withdrawalId];
        require(withdrawal.status == WithdrawalStatus.Pending, "Withdrawal not pending");

        withdrawal.status = WithdrawalStatus.Rejected;
        withdrawal.reason = reason;
        withdrawal.processedAt = block.timestamp;
        withdrawal.approvedBy = msg.sender;

        // Move funds back from pending to available
        address token = withdrawal.token;
        address appOwner = withdrawal.appOwner;
        
        if (token == address(0)) {
            Balance storage balance = nativeBalances[appOwner];
            balance.available += withdrawal.amount;
            balance.pending -= withdrawal.amount;
            balance.lastUpdated = block.timestamp;
        } else {
            Balance storage balance = balances[appOwner][token];
            balance.available += withdrawal.amount;
            balance.pending -= withdrawal.amount;
            balance.lastUpdated = block.timestamp;
        }

        emit WithdrawalRejected(withdrawalId, msg.sender, reason, block.timestamp);
        
        emit BalanceUpdated(
            appOwner,
            token,
            token == address(0) ? nativeBalances[appOwner].available : balances[appOwner][token].available,
            token == address(0) ? nativeBalances[appOwner].pending : balances[appOwner][token].pending,
            token == address(0) ? nativeBalances[appOwner].reserved : balances[appOwner][token].reserved,
            block.timestamp
        );
    }

    /**
     * @dev Cancels a pending withdrawal
     */
    function cancelWithdrawal(uint256 withdrawalId) 
        external 
        nonReentrant 
        whenNotPaused 
        validWithdrawal(withdrawalId) 
        onlyWithdrawalOwner(withdrawalId) 
    {
        Withdrawal storage withdrawal = withdrawals[withdrawalId];
        require(withdrawal.status == WithdrawalStatus.Pending, "Withdrawal not pending");

        withdrawal.status = WithdrawalStatus.Cancelled;
        withdrawal.processedAt = block.timestamp;

        // Move funds back from pending to available
        address token = withdrawal.token;
        
        if (token == address(0)) {
            Balance storage balance = nativeBalances[msg.sender];
            balance.available += withdrawal.amount;
            balance.pending -= withdrawal.amount;
            balance.lastUpdated = block.timestamp;
        } else {
            Balance storage balance = balances[msg.sender][token];
            balance.available += withdrawal.amount;
            balance.pending -= withdrawal.amount;
            balance.lastUpdated = block.timestamp;
        }

        emit WithdrawalCancelled(withdrawalId, msg.sender, block.timestamp);
        
        emit BalanceUpdated(
            msg.sender,
            token,
            token == address(0) ? nativeBalances[msg.sender].available : balances[msg.sender][token].available,
            token == address(0) ? nativeBalances[msg.sender].pending : balances[msg.sender][token].pending,
            token == address(0) ? nativeBalances[msg.sender].reserved : balances[msg.sender][token].reserved,
            block.timestamp
        );
    }

    /**
     * @dev Deposits funds to an app owner's balance
     */
    function depositFunds(address appOwner, address token, uint256 amount) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(appOwner != address(0), "Invalid app owner");
        require(supportedTokens[token], "Token not supported");

        if (token == address(0)) {
            require(msg.value == amount, "Incorrect native token amount");
            Balance storage balance = nativeBalances[appOwner];
            balance.available += amount;
            balance.lastUpdated = block.timestamp;
        } else {
            require(msg.value == 0, "No native token expected");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            Balance storage balance = balances[appOwner][token];
            balance.available += amount;
            balance.lastUpdated = block.timestamp;
        }

        emit FundsDeposited(appOwner, token, amount, block.timestamp);
        
        emit BalanceUpdated(
            appOwner,
            token,
            token == address(0) ? nativeBalances[appOwner].available : balances[appOwner][token].available,
            token == address(0) ? nativeBalances[appOwner].pending : balances[appOwner][token].pending,
            token == address(0) ? nativeBalances[appOwner].reserved : balances[appOwner][token].reserved,
            block.timestamp
        );
    }

    /**
     * @dev Gets withdrawal details
     */
    function getWithdrawal(uint256 withdrawalId) 
        external 
        view 
        validWithdrawal(withdrawalId) 
        returns (Withdrawal memory) 
    {
        return withdrawals[withdrawalId];
    }

    /**
     * @dev Gets withdrawals by owner
     */
    function getWithdrawalsByOwner(address owner) external view returns (uint256[] memory) {
        return ownerWithdrawals[owner];
    }

    /**
     * @dev Gets balance for app owner and token
     */
    function getBalance(address appOwner, address token) external view returns (Balance memory) {
        if (token == address(0)) {
            return nativeBalances[appOwner];
        }
        return balances[appOwner][token];
    }

    /**
     * @dev Internal function to approve withdrawal
     */
    function _approveWithdrawal(uint256 withdrawalId, address approver) internal {
        Withdrawal storage withdrawal = withdrawals[withdrawalId];
        require(withdrawal.status == WithdrawalStatus.Pending, "Withdrawal not pending");

        withdrawal.status = WithdrawalStatus.Approved;
        withdrawal.approvedBy = approver;
        withdrawal.processedAt = block.timestamp;

        emit WithdrawalApproved(withdrawalId, approver, block.timestamp);
    }

    /**
     * @dev Internal function to update balance
     */
    function _updateBalance(
        address appOwner,
        address token,
        uint256 available,
        uint256 pending,
        uint256 reserved
    ) internal {
        if (token == address(0)) {
            Balance storage balance = nativeBalances[appOwner];
            balance.available = available;
            balance.pending = pending;
            balance.reserved = reserved;
            balance.lastUpdated = block.timestamp;
        } else {
            Balance storage balance = balances[appOwner][token];
            balance.available = available;
            balance.pending = pending;
            balance.reserved = reserved;
            balance.lastUpdated = block.timestamp;
        }
    }

    /**
     * @dev Updates withdrawal settings (only owner)
     */
    function updateWithdrawalSettings(
        uint256 _minWithdrawalAmount,
        uint256 _maxWithdrawalAmount,
        uint256 _withdrawalFeeBps,
        uint256 _autoApprovalThreshold
    ) external onlyOwner {
        require(_withdrawalFeeBps <= MAX_WITHDRAWAL_FEE_BPS, "Fee too high");
        require(_minWithdrawalAmount <= _maxWithdrawalAmount, "Invalid amounts");

        minWithdrawalAmount = _minWithdrawalAmount;
        maxWithdrawalAmount = _maxWithdrawalAmount;
        withdrawalFeeBps = _withdrawalFeeBps;
        autoApprovalThreshold = _autoApprovalThreshold;
    }

    /**
     * @dev Updates token support
     */
    function updateTokenSupport(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported, block.timestamp);
    }

    /**
     * @dev Updates approver status
     */
    function updateApprover(address approver, bool isApprover) external onlyOwner {
        approvers[approver] = isApprover;
        emit ApproverUpdated(approver, isApprover, block.timestamp);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Receive function for native token deposits
     */
    receive() external payable {
        // Allow direct deposits to contract
    }
}