"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "@/components/dashboard/layout";
import toast from "react-hot-toast";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  currency: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  recipientEmail?: string;
  description?: string;
  dueDate?: string;
  createdAt: string;
  paidAt?: string;
  app: {
    name: string;
  };
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: ClockIcon,
    className: "bg-yellow-100 text-yellow-800",
  },
  paid: {
    label: "Paid",
    icon: CheckCircleIcon,
    className: "bg-green-100 text-green-800",
  },
  expired: {
    label: "Expired",
    icon: ExclamationTriangleIcon,
    className: "bg-red-100 text-red-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircleIcon,
    className: "bg-gray-100 text-gray-800",
  },
};

export default function InvoicesPage() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/invoices");
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices);
      } else {
        toast.error("Failed to fetch invoices");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof Invoice] as string;
      const bValue = b[sortBy as keyof Invoice] as string;
      
      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  const copyInvoiceLink = async (invoiceId: string) => {
    const link = `${window.location.origin}/pay/${invoiceId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Payment link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-1">
              Manage and track your payment invoices
            </p>
          </div>
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Invoice
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invoices.filter(i => i.status === "pending").length}
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
                <p className="text-sm font-medium text-gray-500">Paid</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invoices.filter(i => i.status === "paid").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Expired</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invoices.filter(i => i.status === "expired").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <DocumentDuplicateIcon className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {invoices.length}
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
                  placeholder="Search invoices..."
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
                <option value="paid">Paid</option>
                <option value="expired">Expired</option>
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
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="dueDate-asc">Due Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first invoice"
                }
              </p>
              {!searchTerm && statusFilter === "all" && (
                <div className="mt-6">
                  <Link
                    href="/dashboard/invoices/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => {
                    const StatusIcon = statusConfig[invoice.status].icon;
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {invoice.description || "No description"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatAmount(invoice.amount, invoice.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[invoice.status].className}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[invoice.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {invoice.recipientEmail || "No recipient"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(invoice.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => copyInvoiceLink(invoice.id)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy payment link"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
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
      </div>
    </DashboardLayout>
  );
}