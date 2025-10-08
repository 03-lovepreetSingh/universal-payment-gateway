// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title FeeManager
 * @dev Manages fee plans, calculations, and platform fees
 */
contract FeeManager is Ownable, Pausable, ReentrancyGuard {
    enum FeeModel { Flat, Percentage, Tiered }

    struct FeePlan {
        uint256 id;
        address appOwner;
        string name;
        FeeModel model;
        uint256 bps; // basis points for percentage model (1 bps = 0.01%)
        uint256 flatFee; // flat fee amount
        TierConfig[] tiers; // for tiered model
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct TierConfig {
        uint256 minAmount;
        uint256 maxAmount;
        uint256 bps;
        uint256 flatFee;
    }

    struct FeeQuote {
        uint256 networkFee;
        uint256 platformFee;
        uint256 totalFee;
        string currency;
        string chain;
        uint256 gasPrice;
        uint256 gasLimit;
        uint256 expiresAt;
        uint256 generatedAt;
    }

    // Platform fee in basis points (default 2.5%)
    uint256 public platformFeeBps = 250;
    
    // Maximum platform fee (10%)
    uint256 public constant MAX_PLATFORM_FEE_BPS = 1000;
    
    // Fee plan counter
    uint256 public feePlanCounter;
    
    // Mapping from fee plan ID to fee plan
    mapping(uint256 => FeePlan) public feePlans;
    
    // Mapping from app owner to fee plan IDs
    mapping(address => uint256[]) public ownerFeePlans;
    
    // Mapping from app owner to active fee plan ID
    mapping(address => uint256) public activeFeePlan;
    
    // Mapping for fee quotes by invoice ID
    mapping(bytes32 => FeeQuote) public feeQuotes;

    event FeePlanCreated(
        uint256 indexed feePlanId,
        address indexed appOwner,
        string name,
        FeeModel model,
        uint256 createdAt
    );

    event FeePlanUpdated(
        uint256 indexed feePlanId,
        address indexed appOwner,
        uint256 updatedAt
    );

    event FeePlanActivated(
        uint256 indexed feePlanId,
        address indexed appOwner,
        uint256 activatedAt
    );

    event FeeApplied(
        bytes32 indexed invoiceId,
        address indexed appOwner,
        uint256 amount,
        uint256 platformFee,
        uint256 networkFee,
        uint256 totalFee,
        uint256 timestamp
    );

    event PlatformFeeUpdated(
        uint256 oldFeeBps,
        uint256 newFeeBps,
        uint256 timestamp
    );

    modifier validFeePlan(uint256 feePlanId) {
        require(feePlanId > 0 && feePlanId <= feePlanCounter, "Invalid fee plan ID");
        _;
    }

    modifier onlyFeePlanOwner(uint256 feePlanId) {
        require(feePlans[feePlanId].appOwner == msg.sender, "Not fee plan owner");
        _;
    }

    constructor() {}

    /**
     * @dev Creates a new fee plan
     */
    function createFeePlan(
        string memory name,
        FeeModel model,
        uint256 bps,
        uint256 flatFee,
        TierConfig[] memory tiers
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        
        if (model == FeeModel.Percentage) {
            require(bps > 0 && bps <= 10000, "Invalid basis points"); // Max 100%
        } else if (model == FeeModel.Flat) {
            require(flatFee > 0, "Flat fee must be greater than 0");
        } else if (model == FeeModel.Tiered) {
            require(tiers.length > 0, "Tiers cannot be empty");
            _validateTiers(tiers);
        }

        feePlanCounter++;
        uint256 feePlanId = feePlanCounter;

        FeePlan storage newFeePlan = feePlans[feePlanId];
        newFeePlan.id = feePlanId;
        newFeePlan.appOwner = msg.sender;
        newFeePlan.name = name;
        newFeePlan.model = model;
        newFeePlan.bps = bps;
        newFeePlan.flatFee = flatFee;
        newFeePlan.isActive = true;
        newFeePlan.createdAt = block.timestamp;
        newFeePlan.updatedAt = block.timestamp;

        // Add tiers if tiered model
        if (model == FeeModel.Tiered) {
            for (uint256 i = 0; i < tiers.length; i++) {
                newFeePlan.tiers.push(tiers[i]);
            }
        }

        ownerFeePlans[msg.sender].push(feePlanId);
        
        // Set as active if it's the first fee plan for this owner
        if (activeFeePlan[msg.sender] == 0) {
            activeFeePlan[msg.sender] = feePlanId;
        }

        emit FeePlanCreated(feePlanId, msg.sender, name, model, block.timestamp);
        
        return feePlanId;
    }

    /**
     * @dev Activates a fee plan
     */
    function activateFeePlan(uint256 feePlanId) 
        external 
        nonReentrant 
        whenNotPaused 
        validFeePlan(feePlanId) 
        onlyFeePlanOwner(feePlanId) 
    {
        require(feePlans[feePlanId].isActive, "Fee plan is not active");
        
        activeFeePlan[msg.sender] = feePlanId;
        
        emit FeePlanActivated(feePlanId, msg.sender, block.timestamp);
    }

    /**
     * @dev Calculates fee for an amount using the active fee plan
     */
    function calculateFee(address appOwner, uint256 amount) 
        external 
        view 
        returns (uint256 appFee, uint256 platformFee, uint256 totalFee) 
    {
        uint256 activeFeePlanId = activeFeePlan[appOwner];
        
        if (activeFeePlanId == 0) {
            // No fee plan, only platform fee
            platformFee = (amount * platformFeeBps) / 10000;
            return (0, platformFee, platformFee);
        }

        FeePlan storage plan = feePlans[activeFeePlanId];
        
        if (plan.model == FeeModel.Flat) {
            appFee = plan.flatFee;
        } else if (plan.model == FeeModel.Percentage) {
            appFee = (amount * plan.bps) / 10000;
        } else if (plan.model == FeeModel.Tiered) {
            appFee = _calculateTieredFee(plan, amount);
        }

        platformFee = (amount * platformFeeBps) / 10000;
        totalFee = appFee + platformFee;
    }

    /**
     * @dev Generates a fee quote for an invoice
     */
    function generateFeeQuote(
        bytes32 invoiceId,
        address appOwner,
        uint256 amount,
        string memory currency,
        string memory chain,
        uint256 gasPrice,
        uint256 gasLimit
    ) external nonReentrant whenNotPaused {
        (uint256 appFee, uint256 platformFee, uint256 totalAppFee) = this.calculateFee(appOwner, amount);
        
        uint256 networkFee = gasPrice * gasLimit;
        uint256 totalFee = totalAppFee + networkFee;

        FeeQuote memory quote = FeeQuote({
            networkFee: networkFee,
            platformFee: platformFee,
            totalFee: totalFee,
            currency: currency,
            chain: chain,
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            expiresAt: block.timestamp + 300, // 5 minutes
            generatedAt: block.timestamp
        });

        feeQuotes[invoiceId] = quote;

        emit FeeApplied(
            invoiceId,
            appOwner,
            amount,
            platformFee,
            networkFee,
            totalFee,
            block.timestamp
        );
    }

    /**
     * @dev Updates platform fee (only owner)
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_PLATFORM_FEE_BPS, "Fee too high");
        
        uint256 oldFeeBps = platformFeeBps;
        platformFeeBps = newFeeBps;
        
        emit PlatformFeeUpdated(oldFeeBps, newFeeBps, block.timestamp);
    }

    /**
     * @dev Gets fee plan details
     */
    function getFeePlan(uint256 feePlanId) 
        external 
        view 
        validFeePlan(feePlanId) 
        returns (FeePlan memory) 
    {
        return feePlans[feePlanId];
    }

    /**
     * @dev Gets fee plans by owner
     */
    function getFeePlansByOwner(address owner) external view returns (uint256[] memory) {
        return ownerFeePlans[owner];
    }

    /**
     * @dev Gets fee quote for invoice
     */
    function getFeeQuote(bytes32 invoiceId) external view returns (FeeQuote memory) {
        return feeQuotes[invoiceId];
    }

    /**
     * @dev Validates tier configuration
     */
    function _validateTiers(TierConfig[] memory tiers) internal pure {
        for (uint256 i = 0; i < tiers.length; i++) {
            require(tiers[i].minAmount < tiers[i].maxAmount, "Invalid tier range");
            require(tiers[i].bps <= 10000, "Invalid tier basis points");
            
            if (i > 0) {
                require(tiers[i].minAmount >= tiers[i-1].maxAmount, "Overlapping tiers");
            }
        }
    }

    /**
     * @dev Calculates tiered fee
     */
    function _calculateTieredFee(FeePlan storage plan, uint256 amount) 
        internal 
        view 
        returns (uint256) 
    {
        for (uint256 i = 0; i < plan.tiers.length; i++) {
            TierConfig memory tier = plan.tiers[i];
            if (amount >= tier.minAmount && amount <= tier.maxAmount) {
                return tier.flatFee + (amount * tier.bps) / 10000;
            }
        }
        
        // If no tier matches, use the last tier
        if (plan.tiers.length > 0) {
            TierConfig memory lastTier = plan.tiers[plan.tiers.length - 1];
            return lastTier.flatFee + (amount * lastTier.bps) / 10000;
        }
        
        return 0;
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
}