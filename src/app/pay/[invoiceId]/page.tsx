"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  CreditCardIcon,
  WalletIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  recipientEmail?: string;
  description?: string;
  notes?: string;
  dueDate?: string;
  createdAt: string;
  paidAt?: string;
  allowPartialPayments: boolean;
  app: {
    name: string;
    description?: string;
  };
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
  }>;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  available: boolean;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: WalletIcon,
    description: "Pay with MetaMask wallet",
    available: true,
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    icon: WalletIcon,
    description: "Connect any wallet",
    available: true,
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: WalletIcon,
    description: "Pay with Coinbase Wallet",
    available: true,
  },
  {
    id: "card",
    name: "Credit Card",
    icon: CreditCardIcon,
    description: "Pay with credit/debit card",
    available: false, // Coming soon
  },
];

export default function PayInvoicePage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.invoice);
        setPaymentAmount(data.invoice.amount);
      } else if (response.status === 404) {
        toast.error("Invoice not found");
      } else {
        toast.error("Failed to load invoice");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod || !invoice) return;

    setIsProcessing(true);
    
    try {
      // This would integrate with the universal signer and payment processing
      toast.success("Payment processing started");
      
      // Simulate payment processing
      setTimeout(() => {
        toast.success("Payment completed successfully!");
        setInvoice(prev => prev ? { ...prev, status: "paid", paidAt: new Date().toISOString() } : null);
        setIsProcessing(false);
      }, 3000);
      
    } catch (error) {
      toast.error("Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  const copyInvoiceLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Invoice link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const shareInvoice = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice?.invoiceNumber}`,
          text: `Payment request from ${invoice?.app.name}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyInvoiceLink();
    }
  };

  const formatAmount = (amount: string, currency: string) => {
    return `${parseFloat(amount).toLocaleString()} ${currency.toUpperCase()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The invoice you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = invoice.dueDate && new Date(invoice.dueDate) < new Date();
  const canPay = invoice.status === "pending" && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={copyInvoiceLink}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Copy link"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
              </button>
              <button
                onClick={shareInvoice}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Share"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Payment Request</h1>
            <p className="text-gray-600 mt-2">from {invoice.app.name}</p>
          </div>
        </div>

        {/* Invoice Status */}
        {invoice.status === "paid" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">Payment Completed</p>
                <p className="text-sm text-green-600">
                  Paid on {invoice.paidAt ? formatDate(invoice.paidAt) : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        )}

        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-800">Invoice Expired</p>
                <p className="text-sm text-red-600">
                  This invoice expired on {formatDate(invoice.dueDate!)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Invoice #{invoice.invoiceNumber}
                </h2>
                <p className="text-sm text-gray-500">
                  Created on {formatDate(invoice.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(invoice.amount, invoice.currency)}
                </p>
                {invoice.dueDate && (
                  <p className="text-sm text-gray-500">
                    Due: {formatDate(invoice.dueDate)}
                  </p>
                )}
              </div>
            </div>

            {invoice.description && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-900">{invoice.description}</p>
              </div>
            )}

            {invoice.recipientEmail && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Bill To</p>
                <p className="text-sm text-gray-900">{invoice.recipientEmail}</p>
              </div>
            )}

            {/* Line Items */}
            {invoice.lineItems && invoice.lineItems.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Items</p>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Price
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoice.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatAmount(item.unitPrice, invoice.currency)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {formatAmount(item.amount, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {invoice.notes && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                <p className="text-sm text-gray-900">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Section */}
        {canPay && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Choose Payment Method
              </h3>

              {/* Partial Payment Option */}
              {invoice.allowPartialPayments && (
                <div className="mb-6">
                  <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="paymentAmount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      max={invoice.amount}
                      min="0.01"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <span className="text-gray-500 text-sm">{invoice.currency.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: {formatAmount(invoice.amount, invoice.currency)}
                  </p>
                </div>
              )}

              {/* Payment Methods */}
              <div className="space-y-3 mb-6">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <div
                      key={method.id}
                      className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                        selectedPaymentMethod === method.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-300 hover:border-gray-400"
                      } ${!method.available ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => method.available && setSelectedPaymentMethod(method.id)}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPaymentMethod === method.id}
                          disabled={!method.available}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          readOnly
                        />
                        <div className="ml-3 flex items-center">
                          <IconComponent className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {method.name}
                              {!method.available && (
                                <span className="ml-2 text-xs text-gray-500">(Coming Soon)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                disabled={!selectedPaymentMethod || isProcessing || parseFloat(paymentAmount) <= 0}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </div>
                ) : (
                  `Pay ${formatAmount(paymentAmount, invoice.currency)}`
                )}
              </button>

              {/* Security Notice */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  🔒 Secured by Universal Payment Gateway
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Powered by Universal Payment Gateway</p>
          <p className="mt-1">
            Questions? Contact {invoice.app.name} for support.
          </p>
        </div>
      </div>
    </div>
  );
}