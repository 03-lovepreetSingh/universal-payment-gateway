"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DashboardLayout } from "@/components/dashboard/layout";
import toast from "react-hot-toast";

interface App {
  id: string;
  name: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: "", amount: "0" }
  ]);
  
  const [formData, setFormData] = useState({
    appId: "",
    recipientEmail: "",
    description: "",
    currency: "USDC",
    dueDate: "",
    notes: "",
    allowPartialPayments: false,
    sendEmailNotification: true,
  });

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const response = await fetch("/api/apps");
      if (response.ok) {
        const data = await response.json();
        setApps(data.apps);
        if (data.apps.length > 0) {
          setFormData(prev => ({ ...prev, appId: data.apps[0].id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addLineItem = () => {
    const newId = (lineItems.length + 1).toString();
    setLineItems(prev => [
      ...prev,
      { id: newId, description: "", quantity: 1, unitPrice: "", amount: "0" }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Calculate amount when quantity or unitPrice changes
        if (field === "quantity" || field === "unitPrice") {
          const quantity = field === "quantity" ? Number(value) : item.quantity;
          const unitPrice = field === "unitPrice" ? String(value) : item.unitPrice;
          updated.amount = (quantity * parseFloat(unitPrice || "0")).toFixed(2);
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return lineItems.reduce((total, item) => total + parseFloat(item.amount || "0"), 0).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appId) {
      toast.error("Please select an application");
      return;
    }

    const total = calculateTotal();
    if (parseFloat(total) <= 0) {
      toast.error("Invoice total must be greater than 0");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appId: formData.appId,
          amount: total,
          currency: formData.currency,
          recipientEmail: formData.recipientEmail || null,
          description: formData.description || null,
          dueDate: formData.dueDate || null,
          notes: formData.notes || null,
          allowPartialPayments: formData.allowPartialPayments,
          sendEmailNotification: formData.sendEmailNotification,
          lineItems: lineItems.filter(item => item.description && parseFloat(item.amount) > 0),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Invoice created successfully");
        router.push(`/dashboard/invoices/${data.invoice.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create invoice");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Invoice</h1>
          <p className="text-gray-600 mt-1">
            Create a payment invoice for your customers
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="appId" className="block text-sm font-medium text-gray-700 mb-1">
                  Application *
                </label>
                <select
                  id="appId"
                  name="appId"
                  required
                  value={formData.appId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select an application</option>
                  {apps.map(app => (
                    <option key={app.id} value={app.id}>{app.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency *
                </label>
                <select
                  id="currency"
                  name="currency"
                  required
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="ETH">ETH</option>
                  <option value="PUSH">PUSH</option>
                </select>
              </div>

              <div>
                <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  id="recipientEmail"
                  name="recipientEmail"
                  value={formData.recipientEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief description of the invoice"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Item description"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="text"
                      value={item.amount}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                      className="p-2 text-red-400 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {calculateTotal()} {formData.currency}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Additional Options</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Additional notes or terms..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="allowPartialPayments"
                    name="allowPartialPayments"
                    type="checkbox"
                    checked={formData.allowPartialPayments}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="allowPartialPayments" className="ml-2 block text-sm text-gray-900">
                    Allow partial payments
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="sendEmailNotification"
                    name="sendEmailNotification"
                    type="checkbox"
                    checked={formData.sendEmailNotification}
                    onChange={handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendEmailNotification" className="ml-2 block text-sm text-gray-900">
                    Send email notification to recipient
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/dashboard/invoices"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || !formData.appId || parseFloat(calculateTotal()) <= 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}