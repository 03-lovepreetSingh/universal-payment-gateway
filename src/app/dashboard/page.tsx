"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCardIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  PlusIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "@/components/dashboard/layout";

interface DashboardStats {
  totalRevenue: number;
  totalTransactions: number;
  pendingPayments: number;
  successRate: number;
}

interface RecentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  description: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    pendingPayments: 0,
    successRate: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch("/api/dashboard/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent transactions
      const transactionsResponse = await fetch("/api/transactions?limit=5");
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData.transactions || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {session.user?.name}</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href="/dashboard/invoices/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Invoice
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BanknotesIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCardIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ArrowTrendingUpIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link
              href="/dashboard/transactions"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <CreditCardIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description || "Payment"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        transaction.status
                      )}`}
                    >
                      {transaction.status}
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center">
                <CreditCardIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create your first invoice to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/invoices/new"
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <PlusIcon className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-medium text-gray-900">Create Invoice</h3>
              <p className="text-sm text-gray-600">Generate a new payment request</p>
            </Link>
            <Link
              href="/dashboard/apps"
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <CreditCardIcon className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Apps</h3>
              <p className="text-sm text-gray-600">Configure your applications</p>
            </Link>
            <Link
              href="/dashboard/withdrawals"
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <BanknotesIcon className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-medium text-gray-900">Withdraw Funds</h3>
              <p className="text-sm text-gray-600">Transfer earnings to your wallet</p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}