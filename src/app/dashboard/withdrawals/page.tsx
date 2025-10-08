"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "@/components/dashboard/layout";
import toast from "react-hot-toast";

interface Withdrawal {
  id: string;
  amount: string;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  destinationAddress: string;
  transactionHash?: string;
  fee: string;
  netAmount: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  notes?: string;
  app: {
    name: string;
  };
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: ClockIcon,
    className: "bg-yellow-100 text-yellow-800",
    description: "Withdrawal request submitted"
  },
  processing: {
    label: "Processing",
    icon: ArrowPathIcon,
    className: "bg-blue-100 text-blue-800",
    description: "Transaction being processed"
  },
  completed: {
    label: "Completed",
    icon: CheckCircleIcon,
    className: "bg-green-100 text-green-800",
    description: "Withdrawal successful"
  },
  failed: {
    label: "Failed",
    icon: XCircleIcon,
    className: "bg-red-100 text-red-800",
    description: "Withdrawal failed"
  },
  cancelled: {
    label: "Cancelled",
    icon: ExclamationTriangleIcon,
    className: "bg-gray-100 text-gray-800",
    description: "Withdrawal cancelled"
  },
};

export default function WithdrawalsPage() {
  const { data: session } = useSession();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("requestedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showNewWithdrawal, setShowNewWithdrawal] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch("/api/withdrawals");
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals);
      } else {
        toast.error("Failed to fetch withdrawals");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWithdrawals = withdrawals
    .filter(withdrawal => {
      const matchesSearch = 
        withdrawal.destinationAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.transactionHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        withdrawal.app.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || withdrawal.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof Withdrawal] as string;
      const bValue = b[sortBy as keyof Withdrawal] as string;
      
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
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const openBlockExplorer = (hash: string) => {
    const explorerUrl = `https://etherscan.io/tx/${hash}`;
    window.open(explorerUrl, "_blank");
  };

  const getTotalWithdrawals = () => {
    return withdrawals.reduce((total, w) => total + parseFloat(w.amount), 0);
  };

  const getCompletedWithdrawals = () => {
    return withdrawals
      .filter(w => w.status === "completed")
      .reduce((total, w) => total + parseFloat(w.amount), 0);
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
            <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
            <p className="text-gray-600 mt-1">
              Manage your withdrawal requests and track their status
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchWithdrawals}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowNewWithdrawal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Withdrawal
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowDownTrayIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {withdrawals.length}
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
                  {withdrawals.filter(w => w.status === "pending").length}
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
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {withdrawals.filter(w => w.status === "completed").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${getTotalWithdrawals().toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by address, transaction hash, or app..."
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
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
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
                <option value="requestedAt-desc">Newest First</option>
                <option value="requestedAt-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="completedAt-desc">Recently Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {filteredWithdrawals.length === 0 ? (
            <div className="text-center py-12">
              <ArrowDownTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No withdrawals found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first withdrawal request"
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowNewWithdrawal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    New Withdrawal
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Withdrawal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWithdrawals.map((withdrawal) => {
                    const StatusIcon = statusConfig[withdrawal.status].icon;
                    return (
                      <tr key={withdrawal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {withdrawal.app.name}
                            </div>
                            {withdrawal.transactionHash && (
                              <div className="text-sm text-gray-500">
                                <button
                                  onClick={() => copyToClipboard(withdrawal.transactionHash!)}
                                  className="hover:text-indigo-600"
                                  title="Click to copy transaction hash"
                                >
                                  Tx: {formatAddress(withdrawal.transactionHash)}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatAmount(withdrawal.amount, withdrawal.currency)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Fee: {formatAmount(withdrawal.fee, withdrawal.currency)}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              Net: {formatAmount(withdrawal.netAmount, withdrawal.currency)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[withdrawal.status].className}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[withdrawal.status].label}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {statusConfig[withdrawal.status].description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => copyToClipboard(withdrawal.destinationAddress)}
                            className="text-sm text-gray-900 hover:text-indigo-600"
                            title="Click to copy address"
                          >
                            {formatAddress(withdrawal.destinationAddress)}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(withdrawal.requestedAt)}
                          </div>
                          {withdrawal.completedAt && (
                            <div className="text-sm text-gray-500">
                              Completed: {formatDate(withdrawal.completedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {withdrawal.transactionHash && (
                              <button
                                onClick={() => openBlockExplorer(withdrawal.transactionHash!)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="View on block explorer"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </button>
                            )}
                            {withdrawal.status === "pending" && (
                              <button
                                className="text-red-600 hover:text-red-900"
                                title="Cancel withdrawal"
                              >
                                <XCircleIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* New Withdrawal Modal */}
        {showNewWithdrawal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  New Withdrawal Request
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  This feature is coming soon. You'll be able to request withdrawals directly from the dashboard.
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowNewWithdrawal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}