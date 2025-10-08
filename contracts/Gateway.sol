// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Gateway
 * @dev Records external payments from other chains and prevents replay attacks
 */
contract Gateway is ReentrancyGuard, Ownable, Pausable {
    struct ExternalPayment {
        string externalChain;
        string externalTxHash;
        address payer;
        uint256 amount;
        string currency;
        bytes32 invoiceId;
        uint256 timestamp;
        bool processed;
    }

    // Mapping from external tx hash to payment record
    mapping(string => ExternalPayment) public externalPayments;
    
    // Mapping to prevent replay attacks
    mapping(string => bool) public processedTxHashes;
    
    // Mapping from invoice ID to payment status
    mapping(bytes32 => bool) public invoicePaid;

    event PaymentRecorded(
        string indexed externalChain,
        string indexed externalTxHash,
        address indexed payer,
        bytes32 invoiceId,
        uint256 amount,
        string currency,
        uint256 timestamp
    );

    event PaymentProcessed(
        string indexed externalTxHash,
        bytes32 indexed invoiceId,
        address processor
    );

    modifier onlyUnprocessed(string memory externalTxHash) {
        require(!processedTxHashes[externalTxHash], "Transaction already processed");
        _;
    }

    modifier validPayment(
        string memory externalChain,
        string memory externalTxHash,
        address payer,
        uint256 amount,
        bytes32 invoiceId
    ) {
        require(bytes(externalChain).length > 0, "Invalid external chain");
        require(bytes(externalTxHash).length > 0, "Invalid external tx hash");
        require(payer != address(0), "Invalid payer address");
        require(amount > 0, "Amount must be greater than 0");
        require(invoiceId != bytes32(0), "Invalid invoice ID");
        _;
    }

    constructor() {}

    /**
     * @dev Records an external payment from another chain
     * @param externalChain The chain where the payment originated
     * @param externalTxHash The transaction hash on the external chain
     * @param payer The address that made the payment
     * @param amount The amount paid
     * @param currency The currency of the payment
     * @param invoiceId The invoice being paid
     */
    function recordExternalPayment(
        string memory externalChain,
        string memory externalTxHash,
        address payer,
        uint256 amount,
        string memory currency,
        bytes32 invoiceId
    ) 
        external 
        nonReentrant 
        whenNotPaused
        onlyUnprocessed(externalTxHash)
        validPayment(externalChain, externalTxHash, payer, amount, invoiceId)
    {
        // Create payment record
        ExternalPayment memory payment = ExternalPayment({
            externalChain: externalChain,
            externalTxHash: externalTxHash,
            payer: payer,
            amount: amount,
            currency: currency,
            invoiceId: invoiceId,
            timestamp: block.timestamp,
            processed: true
        });

        // Store the payment
        externalPayments[externalTxHash] = payment;
        processedTxHashes[externalTxHash] = true;
        invoicePaid[invoiceId] = true;

        emit PaymentRecorded(
            externalChain,
            externalTxHash,
            payer,
            invoiceId,
            amount,
            currency,
            block.timestamp
        );

        emit PaymentProcessed(externalTxHash, invoiceId, msg.sender);
    }

    /**
     * @dev Batch record multiple external payments
     */
    function recordExternalPaymentsBatch(
        string[] memory externalChains,
        string[] memory externalTxHashes,
        address[] memory payers,
        uint256[] memory amounts,
        string[] memory currencies,
        bytes32[] memory invoiceIds
    ) external nonReentrant whenNotPaused {
        require(
            externalChains.length == externalTxHashes.length &&
            externalTxHashes.length == payers.length &&
            payers.length == amounts.length &&
            amounts.length == currencies.length &&
            currencies.length == invoiceIds.length,
            "Array lengths must match"
        );

        for (uint256 i = 0; i < externalTxHashes.length; i++) {
            if (!processedTxHashes[externalTxHashes[i]]) {
                recordExternalPayment(
                    externalChains[i],
                    externalTxHashes[i],
                    payers[i],
                    amounts[i],
                    currencies[i],
                    invoiceIds[i]
                );
            }
        }
    }

    /**
     * @dev Check if a transaction has been processed
     */
    function isTransactionProcessed(string memory externalTxHash) external view returns (bool) {
        return processedTxHashes[externalTxHash];
    }

    /**
     * @dev Check if an invoice has been paid
     */
    function isInvoicePaid(bytes32 invoiceId) external view returns (bool) {
        return invoicePaid[invoiceId];
    }

    /**
     * @dev Get payment details by external transaction hash
     */
    function getPaymentByTxHash(string memory externalTxHash) 
        external 
        view 
        returns (ExternalPayment memory) 
    {
        return externalPayments[externalTxHash];
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}