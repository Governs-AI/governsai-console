export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Governance Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor your AI usage, track spending, and manage policies with complete visibility and control.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Decision Log</h3>
            <p className="text-gray-600 mb-4">Monitor AI governance decisions in real-time</p>
            <a href="/dashboard/decisions" className="text-blue-600 hover:text-blue-800">
              View Decisions →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">API Keys</h3>
            <p className="text-gray-600 mb-4">Manage your API keys and access controls</p>
            <a href="/dashboard/keys" className="text-blue-600 hover:text-blue-800">
              Manage Keys →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Policies</h3>
            <p className="text-gray-600 mb-4">Configure AI governance policies and rules</p>
            <a href="/dashboard/policies" className="text-blue-600 hover:text-blue-800">
              Manage Policies →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
