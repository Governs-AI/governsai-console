import Chat from '@/components/Chat';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="h-full flex flex-col">
      {/* Header with navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Demo Chat</h1>
          <Link 
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage API Keys →
          </Link>
        </div>
      </div>
      
      {/* Chat component */}
      <div className="flex-1">
        <Chat />
      </div>
    </div>
  );
}
