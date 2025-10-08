"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  CreditCardIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Apps", href: "/dashboard/apps", icon: CreditCardIcon },
  { name: "Invoices", href: "/dashboard/invoices", icon: DocumentTextIcon },
  { name: "Transactions", href: "/dashboard/transactions", icon: ChartBarIcon },
  { name: "Withdrawals", href: "/dashboard/withdrawals", icon: BanknotesIcon },
  { name: "Settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? "" : "hidden"}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <CreditCardIcon className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Universal Pay</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? "bg-indigo-100 text-indigo-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                  >
                    <item.icon
                      className={`${
                        isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"
                      } mr-4 flex-shrink-0 h-6 w-6`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div>
                <UserCircleIcon className="h-10 w-10 text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700">{session?.user?.name}</p>
                <p className="text-sm font-medium text-gray-500">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <CreditCardIcon className="w-5 h-5 text-white" />
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">Universal Pay</span>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        isActive
                          ? "bg-indigo-100 text-indigo-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                    >
                      <item.icon
                        className={`${
                          isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"
                        } mr-3 flex-shrink-0 h-6 w-6`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center w-full">
                <div>
                  <UserCircleIcon className="h-10 w-10 text-gray-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">{session?.user?.name}</p>
                  <p className="text-xs font-medium text-gray-500">{session?.user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-2 p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Sign out"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}