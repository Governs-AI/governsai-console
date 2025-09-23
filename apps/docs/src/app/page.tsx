export default function DocsHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GovernsAI Documentation
              </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn how to use GovernsAI to secure, monitor, and control your AI interactions
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
            <p className="text-gray-600 mb-4">
              Quick setup guide to get you started with GovernsAI
            </p>
            <a href="/getting-started" className="text-blue-600 hover:text-blue-800 font-medium">
              Get Started →
            </a>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">API Reference</h2>
            <p className="text-gray-600 mb-4">
              Complete API documentation for developers
            </p>
            <a href="/api-reference" className="text-blue-600 hover:text-blue-800 font-medium">
              View API Docs →
            </a>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Guides</h2>
            <p className="text-gray-600 mb-4">
              Step-by-step guides for common use cases
            </p>
            <a href="/guides" className="text-blue-600 hover:text-blue-800 font-medium">
              Browse Guides →
            </a>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Security</h2>
            <p className="text-gray-600 mb-4">
              Learn about PII detection and security features
            </p>
            <a href="/security" className="text-blue-600 hover:text-blue-800 font-medium">
              Security Guide →
            </a>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Billing</h2>
            <p className="text-gray-600 mb-4">
              Understand usage tracking and budget management
            </p>
            <a href="/billing" className="text-blue-600 hover:text-blue-800 font-medium">
              Billing Guide →
            </a>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Support</h2>
            <p className="text-gray-600 mb-4">
              Get help and contact our support team
            </p>
            <a href="/support" className="text-blue-600 hover:text-blue-800 font-medium">
              Get Support →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
