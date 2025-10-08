"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  PlusIcon,
  EyeIcon,
  Cog6ToothIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "@/components/dashboard/layout";
import toast from "react-hot-toast";

interface App {
  id: string;
  name: string;
  description: string;
  apiKey: string;
  webhookUrl: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    invoices: number;
    transactions: number;
  };
}

export default function AppsPage() {
  const { data: session } = useSession();
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (session) {
      fetchApps();
    }
  }, [session]);

  const fetchApps = async () => {
    try {
      const response = await fetch("/api/apps");
      if (response.ok) {
        const data = await response.json();
        setApps(data.apps || []);
      }
    } catch (error) {
      console.error("Failed to fetch apps:", error);
      toast.error("Failed to load apps");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleApiKeyVisibility = (appId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [appId]: !prev[appId]
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleAppStatus = async (appId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/apps/${appId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        setApps(prev => prev.map(app => 
          app.id === appId ? { ...app, isActive: !isActive } : app
        ));
        toast.success(`App ${!isActive ? "activated" : "deactivated"}`);
      } else {
        toast.error("Failed to update app status");
      }
    } catch (error) {
      toast.error("Failed to update app status");
    }
  };

  const deleteApp = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this app? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/apps/${appId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setApps(prev => prev.filter(app => app.id !== appId));
        toast.success("App deleted successfully");
      } else {
        toast.error("Failed to delete app");
      }
    } catch (error) {
      toast.error("Failed to delete app");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const maskApiKey = (apiKey: string) => {
    return `${apiKey.substring(0, 8)}${"*".repeat(24)}${apiKey.substring(apiKey.length - 4)}`;
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
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600">Manage your payment applications and API keys</p>
          </div>
          <Link
            href="/dashboard/apps/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New App
          </Link>
        </div>

        {/* Apps Grid */}
        {apps.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {apps.map((app) => (
              <div key={app.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          app.isActive
                            ? "text-green-600 bg-green-100"
                            : "text-gray-600 bg-gray-100"
                        }`}
                      >
                        {app.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{app.description}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Created {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/dashboard/apps/${app.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View details"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/apps/${app.id}/settings`}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Settings"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteApp(app.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete app"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{app._count.invoices}</p>
                    <p className="text-sm text-gray-600">Invoices</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{app._count.transactions}</p>
                    <p className="text-sm text-gray-600">Transactions</p>
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono">
                        {showApiKey[app.id] ? app.apiKey : maskApiKey(app.apiKey)}
                      </code>
                      <button
                        onClick={() => toggleApiKeyVisibility(app.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title={showApiKey[app.id] ? "Hide" : "Show"}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(app.apiKey, "API Key")}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy API Key"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {app.webhookUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook URL
                      </label>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono truncate">
                          {app.webhookUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(app.webhookUrl, "Webhook URL")}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy Webhook URL"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => toggleAppStatus(app.id, app.isActive)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      app.isActive
                        ? "text-red-600 hover:bg-red-50"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {app.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <Link
                    href={`/dashboard/invoices/new?appId=${app.id}`}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Create Invoice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Cog6ToothIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first application to start accepting payments
            </p>
            <Link
              href="/dashboard/apps/new"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Your First App
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}