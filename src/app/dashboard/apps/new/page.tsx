"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { DashboardLayout } from "@/components/dashboard/layout";
import toast from "react-hot-toast";

export default function NewAppPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    webhookUrl: "",
    allowedOrigins: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          webhookUrl: formData.webhookUrl || null,
          allowedOrigins: formData.allowedOrigins
            ? formData.allowedOrigins.split(",").map(origin => origin.trim())
            : [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("App created successfully");
        router.push(`/dashboard/apps/${data.app.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create app");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/apps"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Apps
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Application</h1>
          <p className="text-gray-600 mt-1">
            Set up a new application to start accepting payments
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Application Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="My E-commerce Store"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A descriptive name for your application
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description of your application..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional description to help you identify this app
                </p>
              </div>
            </div>

            {/* Integration Settings */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Integration Settings</h2>
              
              <div>
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  id="webhookUrl"
                  name="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://your-app.com/webhooks/payments"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL where we'll send payment notifications (optional)
                </p>
              </div>

              <div>
                <label htmlFor="allowedOrigins" className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Origins
                </label>
                <input
                  type="text"
                  id="allowedOrigins"
                  name="allowedOrigins"
                  value={formData.allowedOrigins}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://mystore.com, https://checkout.mystore.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated list of domains allowed to use this app (optional)
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Security Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your API key will be generated automatically after creation</li>
                      <li>Keep your API key secure and never share it publicly</li>
                      <li>Use webhook signatures to verify payment notifications</li>
                      <li>Allowed origins help prevent unauthorized API usage</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href="/dashboard/apps"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create Application"}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">Get your API key</p>
                <p>After creating your app, you'll receive an API key for integration</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">Create your first invoice</p>
                <p>Start accepting payments by creating invoices through the API or dashboard</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">Test payments</p>
                <p>Use our testnet environment to verify your integration before going live</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}