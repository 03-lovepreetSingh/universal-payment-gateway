"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  KeyIcon,
  BellIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/dashboard/layout";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  lastUsed?: string;
  createdAt: string;
  permissions: string[];
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: string;
  lastDelivery?: string;
}

interface UserSettings {
  emailNotifications: {
    paymentReceived: boolean;
    invoiceExpired: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
  };
  twoFactorEnabled: boolean;
  timezone: string;
  currency: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("profile");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: {
      paymentReceived: true,
      invoiceExpired: true,
      weeklyReport: false,
      securityAlerts: true,
    },
    twoFactorEnabled: false,
    timezone: "UTC",
    currency: "USD",
  });
  const [showApiKey, setShowApiKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // New API Key form
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [newApiKeyPermissions, setNewApiKeyPermissions] = useState<string[]>([]);
  const [showNewApiKeyForm, setShowNewApiKeyForm] = useState(false);

  // New Webhook form
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [showNewWebhookForm, setShowNewWebhookForm] = useState(false);

  const availablePermissions = [
    "read:invoices",
    "write:invoices",
    "read:payments",
    "read:transactions",
    "write:webhooks",
  ];

  const availableEvents = [
    "payment.completed",
    "payment.failed",
    "invoice.created",
    "invoice.paid",
    "invoice.expired",
    "withdrawal.requested",
    "withdrawal.completed",
  ];

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
    fetchSettings();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/settings/api-keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys);
      }
    } catch (error) {
      toast.error("Failed to load API keys");
    }
  };

  const fetchWebhooks = async () => {
    try {
      const response = await fetch("/api/settings/webhooks");
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      toast.error("Failed to load webhooks");
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      toast.error("Failed to load settings");
    }
  };

  const createApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newApiKeyName,
          permissions: newApiKeyPermissions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys([...apiKeys, data.apiKey]);
        setNewApiKeyName("");
        setNewApiKeyPermissions([]);
        setShowNewApiKeyForm(false);
        toast.success("API key created successfully");
      } else {
        toast.error("Failed to create API key");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
        toast.success("API key deleted");
      } else {
        toast.error("Failed to delete API key");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const createWebhook = async () => {
    if (!newWebhookUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }

    if (newWebhookEvents.length === 0) {
      toast.error("Please select at least one event");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newWebhookUrl,
          events: newWebhookEvents,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWebhooks([...webhooks, data.webhook]);
        setNewWebhookUrl("");
        setNewWebhookEvents([]);
        setShowNewWebhookForm(false);
        toast.success("Webhook created successfully");
      } else {
        toast.error("Failed to create webhook");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/webhooks/${webhookId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setWebhooks(webhooks.filter(webhook => webhook.id !== webhookId));
        toast.success("Webhook deleted");
      } else {
        toast.error("Failed to delete webhook");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        toast.success("Settings updated");
      } else {
        toast.error("Failed to update settings");
        // Revert on error
        setSettings(settings);
      }
    } catch (error) {
      toast.error("Something went wrong");
      setSettings(settings);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const tabs = [
    { id: "profile", name: "Profile", icon: UserCircleIcon },
    { id: "api-keys", name: "API Keys", icon: KeyIcon },
    { id: "webhooks", name: "Webhooks", icon: BellIcon },
    { id: "notifications", name: "Notifications", icon: BellIcon },
    { id: "security", name: "Security", icon: ShieldCheckIcon },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences.</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <IconComponent className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={session?.user?.name || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => updateSettings({ timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => updateSettings({ currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="PUSH">PUSH</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "api-keys" && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">API Keys</h2>
                <p className="text-sm text-gray-500">Manage your API keys for programmatic access.</p>
              </div>
              <button
                onClick={() => setShowNewApiKeyForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create API Key
              </button>
            </div>

            {/* New API Key Form */}
            {showNewApiKeyForm && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Create New API Key</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                      placeholder="e.g., Production API Key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-2">
                      {availablePermissions.map((permission) => (
                        <label key={permission} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newApiKeyPermissions.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewApiKeyPermissions([...newApiKeyPermissions, permission]);
                              } else {
                                setNewApiKeyPermissions(newApiKeyPermissions.filter(p => p !== permission));
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={createApiKey}
                      disabled={isLoading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isLoading ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewApiKeyForm(false);
                        setNewApiKeyName("");
                        setNewApiKeyPermissions([]);
                      }}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys List */}
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{apiKey.name}</h3>
                      <p className="text-xs text-gray-500">
                        Created {new Date(apiKey.createdAt).toLocaleDateString()}
                        {apiKey.lastUsed && ` • Last used ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteApiKey(apiKey.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex-1 bg-gray-50 px-3 py-2 rounded-md font-mono text-sm">
                      {showApiKey === apiKey.id ? apiKey.key : "••••••••••••••••••••••••••••••••"}
                    </div>
                    <button
                      onClick={() => setShowApiKey(showApiKey === apiKey.id ? "" : apiKey.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey === apiKey.id ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey.key)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {apiKey.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {apiKeys.length === 0 && (
                <div className="text-center py-8">
                  <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first API key to start integrating with our API.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === "webhooks" && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Webhooks</h2>
                <p className="text-sm text-gray-500">Configure webhook endpoints to receive real-time notifications.</p>
              </div>
              <button
                onClick={() => setShowNewWebhookForm(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Webhook
              </button>
            </div>

            {/* New Webhook Form */}
            {showNewWebhookForm && (
              <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Add New Webhook</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="https://your-app.com/webhooks"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Events
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableEvents.map((event) => (
                        <label key={event} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newWebhookEvents.includes(event)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewWebhookEvents([...newWebhookEvents, event]);
                              } else {
                                setNewWebhookEvents(newWebhookEvents.filter(e => e !== event));
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{event}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={createWebhook}
                      disabled={isLoading}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isLoading ? "Creating..." : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewWebhookForm(false);
                        setNewWebhookUrl("");
                        setNewWebhookEvents([]);
                      }}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Webhooks List */}
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900">{webhook.url}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          webhook.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {webhook.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {new Date(webhook.createdAt).toLocaleDateString()}
                        {webhook.lastDelivery && ` • Last delivery ${new Date(webhook.lastDelivery).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Webhook Secret:</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-gray-50 px-2 py-1 rounded text-xs font-mono">
                        {webhook.secret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhook.secret)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <DocumentDuplicateIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {webhooks.length === 0 && (
                <div className="text-center py-8">
                  <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a webhook endpoint to receive real-time notifications.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Email Notifications</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Payment Received</h3>
                  <p className="text-sm text-gray-500">Get notified when you receive a payment</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications.paymentReceived}
                    onChange={(e) => updateSettings({
                      emailNotifications: {
                        ...settings.emailNotifications,
                        paymentReceived: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Invoice Expired</h3>
                  <p className="text-sm text-gray-500">Get notified when an invoice expires</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications.invoiceExpired}
                    onChange={(e) => updateSettings({
                      emailNotifications: {
                        ...settings.emailNotifications,
                        invoiceExpired: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Weekly Report</h3>
                  <p className="text-sm text-gray-500">Receive a weekly summary of your activity</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications.weeklyReport}
                    onChange={(e) => updateSettings({
                      emailNotifications: {
                        ...settings.emailNotifications,
                        weeklyReport: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Security Alerts</h3>
                  <p className="text-sm text-gray-500">Get notified about important security events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications.securityAlerts}
                    onChange={(e) => updateSettings({
                      emailNotifications: {
                        ...settings.emailNotifications,
                        securityAlerts: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm ${settings.twoFactorEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                    {settings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => updateSettings({ twoFactorEnabled: !settings.twoFactorEnabled })}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      settings.twoFactorEnabled
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {settings.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Recent Security Activity</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-gray-900">Login from Chrome on macOS</p>
                      <p className="text-xs text-gray-500">2 hours ago • 192.168.1.1</p>
                    </div>
                    <span className="text-xs text-green-600">Current session</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-gray-900">API key created</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-gray-900">Password changed</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}