"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "@/components/dashboard/layout";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  hash: string;
  amount: string;
  currency: string;
  status: "pending" | "confirmed" | "failed" | "cancelled";
  type: "payment" | "withdrawal" | "fee";
  fromAddress?: string;
  toAddress?: string;
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  confirmedAt?: string;
  createdAt: string;
  invoice?: {
    invoiceNumber: string;
    description?: string;
  };
  app?: {
    name: string;
  };
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: ClockIcon,
    className: "bg-yellow-100 text-yellow-800",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircleIcon,
    className: "bg-green-100 text-green-800",
  },
  failed: {
    label: "Failed",
    icon: XCircleIcon,
    className: "bg-red-100 text-red-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: ExclamationTriangleIcon,
    className: "bg-gray-100 text-gray-800",
  },
};

const typeConfig = {
  payment: {
    label: "Payment",
    className: "bg-blue-100 text-blue-800",
  },
  withdrawal: {
    label: "Withdrawal",
    className: "bg-purple-100 text-purple-800",
  },
  fee: {
    label: "Fee",
    className: "bg-orange-100 text-orange-800",
  },
};

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      } else {
        toast.error("Failed to fetch transactions");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = 
        transaction.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.fromAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.toAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.invoice?.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof Transaction] as string;
      const bValue = b[sortBy as keyof Transaction] as string;
      
      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  const formatAmount = (amount: string, currency: string) => {
    return `${parseFloat(amount).toLocaleString()} ${currency.toUpperCase()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAddress = (address: string) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openBlockExplorer = (hash: string) => {
    // This would need to be configured based on the chain
    const explorerUrl = `https://etherscan.io/tx/${hash}`;
    window.open(explorerUrl, "_blank");
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">
              Monitor all blockchain transactions and payments
            </p>
          </div>
          <button
            onClick={fetchTransactions}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowTopRightOnSquareIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {transactions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Confirmed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {transactions.filter(t => t.status === "confirmed").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {transactions.filter(t => t.status === "pending").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircleIcon className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {transactions.filter(t => t.status === "failed").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by hash, address, or invoice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="payment">Payment</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="fee">Fee</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-");
                  setSortBy(field);
                  setSortOrder(order as "asc" | "desc");
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="confirmedAt-desc">Recently Confirmed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <ArrowTopRightOnSquareIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Transactions will appear here once payments are processed"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From/To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => {
                    const StatusIcon = statusConfig[transaction.status].icon;
                    return (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              <button
                                onClick={() => copyToClipboard(transaction.hash)}
                                className="hover:text-indigo-600"
                                title="Click to copy"
                              >
                                {formatAddress(transaction.hash)}
                              </button>
                            </div>
                            {transaction.invoice && (
                              <div className="text-sm text-gray-500">
                                Invoice: {transaction.invoice.invoiceNumber}
                              </div>
                            )}
                            {transaction.blockNumber && (
                              <div className="text-sm text-gray-500">
                                Block: {transaction.blockNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig[transaction.type].className}`}>
                            {typeConfig[transaction.type].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatAmount(transaction.amount, transaction.currency)}
                          </div>
                          {transaction.gasUsed && transaction.gasPrice && (
                            <div className="text-sm text-gray-500">
                              Gas: {parseFloat(transaction.gasUsed).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[transaction.status].className}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[transaction.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>From: {formatAddress(transaction.fromAddress || "")}</div>
                            <div>To: {formatAddress(transaction.toAddress || "")}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(transaction.createdAt)}
                          </div>
                          {transaction.confirmedAt && (
                            <div className="text-sm text-gray-500">
                              Confirmed: {formatDate(transaction.confirmedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openBlockExplorer(transaction.hash)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View on block explorer"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}