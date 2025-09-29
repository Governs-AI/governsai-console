'use client';

import { Provider } from '@/lib/types';

interface ProviderSwitchProps {
  provider: Provider;
  onChange: (provider: Provider) => void;
  className?: string;
}

export default function ProviderSwitch({ provider, onChange, className = '' }: ProviderSwitchProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Provider:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onChange('openai')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            provider === 'openai'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          OpenAI
        </button>
        <button
          onClick={() => onChange('ollama')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            provider === 'ollama'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Ollama
        </button>
      </div>
    </div>
  );
}
