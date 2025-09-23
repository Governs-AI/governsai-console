export default function PlatformHomePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          GovernsAI Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Secure, monitor, and control your AI interactions
        </p>
        <div className="space-x-4">
          <a href="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Go to Dashboard
          </a>
          <a href="/profile" className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">
            View Profile
          </a>
        </div>
      </div>
    </div>
  )
}