// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title InvoiceRegistry
 * @dev Manages invoice creation and status updates on Push Chain
 */
contract InvoiceRegistry is Ownable, Pausable, ReentrancyGuard {
    enum InvoiceStatus { Pending, Paid, Expired, Cancelled }

    struct Invoice {
        bytes32 id;
        address appOwner;
        uint256 amount;
        string currency;
        string externalChain;
        InvoiceStatus status;
        string memo;
        uint256 dueAt;
        uint256 createdAt;
        uint256 paidAt;
        string metadata;
    }

    // Mapping from invoice ID to invoice
    mapping(bytes32 => Invoice) public invoices;
    
    // Mapping from app owner to invoice IDs
    mapping(address => bytes32[]) public ownerInvoices;
    
    // Mapping to check if invoice exists
    mapping(bytes32 => bool) public invoiceExists;

    // Counter for total invoices
    uint256 public totalInvoices;

    event InvoiceCreated(
        bytes32 indexed invoiceId,
        address indexed appOwner,
        uint256 amount,
        string currency,
        string externalChain,
        uint256 dueAt,
        uint256 createdAt
    );

    event InvoicePaid(
        bytes32 indexed invoiceId,
        address indexed appOwner,
        uint256 paidAt
    );

    event InvoiceStatusUpdated(
        bytes32 indexed invoiceId,
        InvoiceStatus oldStatus,
        InvoiceStatus newStatus,
        uint256 timestamp
    );

    event InvoiceExpired(
        bytes32 indexed invoiceId,
        uint256 expiredAt
    );

    modifier onlyInvoiceOwner(bytes32 invoiceId) {
        require(invoiceExists[invoiceId], "Invoice does not exist");
        require(invoices[invoiceId].appOwner == msg.sender, "Not invoice owner");
        _;
    }

    modifier validInvoice(bytes32 invoiceId) {
        require(invoiceExists[invoiceId], "Invoice does not exist");
        _;
    }

    constructor() {}

    /**
     * @dev Creates a new invoice
     */
    function createInvoice(
        bytes32 invoiceId,
        uint256 amount,
        string memory currency,
        string memory externalChain,
        string memory memo,
        uint256 dueAt,
        string memory metadata
    ) external nonReentrant whenNotPaused {
        require(!invoiceExists[invoiceId], "Invoice already exists");
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(currency).length > 0, "Currency cannot be empty");
        require(dueAt > block.timestamp, "Due date must be in the future");

        Invoice memory newInvoice = Invoice({
            id: invoiceId,
            appOwner: msg.sender,
            amount: amount,
            currency: currency,
            externalChain: externalChain,
            status: InvoiceStatus.Pending,
            memo: memo,
            dueAt: dueAt,
            createdAt: block.timestamp,
            paidAt: 0,
            metadata: metadata
        });

        invoices[invoiceId] = newInvoice;
        ownerInvoices[msg.sender].push(invoiceId);
        invoiceExists[invoiceId] = true;
        totalInvoices++;

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            amount,
            currency,
            externalChain,
            dueAt,
            block.timestamp
        );
    }

    /**
     * @dev Marks an invoice as paid
     */
    function markInvoicePaid(bytes32 invoiceId) 
        external 
        nonReentrant 
        whenNotPaused 
        validInvoice(invoiceId) 
    {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.status == InvoiceStatus.Pending, "Invoice is not pending");
        
        InvoiceStatus oldStatus = invoice.status;
        invoice.status = InvoiceStatus.Paid;
        invoice.paidAt = block.timestamp;

        emit InvoicePaid(invoiceId, invoice.appOwner, block.timestamp);
        emit InvoiceStatusUpdated(invoiceId, oldStatus, InvoiceStatus.Paid, block.timestamp);
    }

    /**
     * @dev Marks an invoice as expired
     */
    function markInvoiceExpired(bytes32 invoiceId) 
        external 
        nonReentrant 
        whenNotPaused 
        validInvoice(invoiceId) 
    {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.status == InvoiceStatus.Pending, "Invoice is not pending");
        require(block.timestamp > invoice.dueAt, "Invoice has not expired yet");
        
        InvoiceStatus oldStatus = invoice.status;
        invoice.status = InvoiceStatus.Expired;

        emit InvoiceExpired(invoiceId, block.timestamp);
        emit InvoiceStatusUpdated(invoiceId, oldStatus, InvoiceStatus.Expired, block.timestamp);
    }

    /**
     * @dev Cancels an invoice (only by owner)
     */
    function cancelInvoice(bytes32 invoiceId) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyInvoiceOwner(invoiceId) 
    {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.status == InvoiceStatus.Pending, "Invoice is not pending");
        
        InvoiceStatus oldStatus = invoice.status;
        invoice.status = InvoiceStatus.Cancelled;

        emit InvoiceStatusUpdated(invoiceId, oldStatus, InvoiceStatus.Cancelled, block.timestamp);
    }

    /**
     * @dev Batch expire invoices that are past due
     */
    function batchExpireInvoices(bytes32[] memory invoiceIds) external nonReentrant whenNotPaused {
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            bytes32 invoiceId = invoiceIds[i];
            if (invoiceExists[invoiceId]) {
                Invoice storage invoice = invoices[invoiceId];
                if (invoice.status == InvoiceStatus.Pending && block.timestamp > invoice.dueAt) {
                    InvoiceStatus oldStatus = invoice.status;
                    invoice.status = InvoiceStatus.Expired;
                    
                    emit InvoiceExpired(invoiceId, block.timestamp);
                    emit InvoiceStatusUpdated(invoiceId, oldStatus, InvoiceStatus.Expired, block.timestamp);
                }
            }
        }
    }

    /**
     * @dev Get invoice details
     */
    function getInvoice(bytes32 invoiceId) external view validInvoice(invoiceId) returns (Invoice memory) {
        return invoices[invoiceId];
    }

    /**
     * @dev Get invoices by owner
     */
    function getInvoicesByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerInvoices[owner];
    }

    /**
     * @dev Check if invoice is paid
     */
    function isInvoicePaid(bytes32 invoiceId) external view validInvoice(invoiceId) returns (bool) {
        return invoices[invoiceId].status == InvoiceStatus.Paid;
    }

    /**
     * @dev Check if invoice is expired
     */
    function isInvoiceExpired(bytes32 invoiceId) external view validInvoice(invoiceId) returns (bool) {
        Invoice memory invoice = invoices[invoiceId];
        return invoice.status == InvoiceStatus.Expired || 
               (invoice.status == InvoiceStatus.Pending && block.timestamp > invoice.dueAt);
    }

    /**
     * @dev Get invoice status
     */
    function getInvoiceStatus(bytes32 invoiceId) external view validInvoice(invoiceId) returns (InvoiceStatus) {
        return invoices[invoiceId].status;
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