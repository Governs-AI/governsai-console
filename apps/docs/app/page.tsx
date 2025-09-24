export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GovernsAI Documentation
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            The AI Governance OS - Secure control plane for AI interactions
          </p>
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Welcome to GovernsAI
            </h2>
            <p className="text-gray-600 mb-6">
              GovernsAI is a secure control plane for AI interactions that acts as an intelligent gateway 
              between users and AI models, providing complete visibility and control over AI usage, spending, and compliance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Cost Control</h3>
                <p className="text-sm text-gray-600">
                  Predictable AI spending with budget enforcement and real-time monitoring.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Security</h3>
                <p className="text-sm text-gray-600">
                  PII detection and data protection to ensure compliance and privacy.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Visibility</h3>
                <p className="text-sm text-gray-600">
                  Comprehensive audit trails and real-time analytics for all AI interactions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
