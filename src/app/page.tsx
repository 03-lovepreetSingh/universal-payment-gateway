import Link from "next/link";
import { ArrowRightIcon, CreditCardIcon, GlobeAltIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Navigation */}
      <nav className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CreditCardIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Universal Pay</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/auth/signin"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Universal Payment
              <span className="text-indigo-600 block">Gateway</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Accept payments from any blockchain with a single integration. 
              Powered by Push Chain for instant cross-chain settlements.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                Start Building
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="/docs"
                className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                View Documentation
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-24 grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <GlobeAltIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cross-Chain Payments</h3>
              <p className="text-gray-600">
                Accept payments from Ethereum, Polygon, BSC, and other EVM chains with automatic conversion.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Built on Push Chain with enterprise-grade security and 99.9% uptime guarantee.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CreditCardIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Integration</h3>
              <p className="text-gray-600">
                Simple REST API and SDKs for popular frameworks. Get started in minutes, not days.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-24 bg-white rounded-2xl shadow-lg p-8">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-indigo-600">$50M+</div>
                <div className="text-gray-600">Volume Processed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-600">10+</div>
                <div className="text-gray-600">Supported Chains</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-600">99.9%</div>
                <div className="text-gray-600">Uptime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-indigo-600">1000+</div>
                <div className="text-gray-600">Developers</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
