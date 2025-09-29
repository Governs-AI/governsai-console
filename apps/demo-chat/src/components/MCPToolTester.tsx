'use client';

import { useState, useEffect } from 'react';
import { MCPResponse } from '@/lib/types';
import DecisionBadge from './DecisionBadge';
import { getPrecheckUserIdDetails } from '@/lib/utils';

interface Tool {
  name: string;
  description: string;
  category: string;
}

interface ToolCategories {
  [category: string]: string[];
}

export default function MCPToolTester() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<ToolCategories>({});
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [args, setArgs] = useState<string>('{}');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<MCPResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch available tools on component mount
  useEffect(() => {
    fetch('/api/mcp')
      .then(res => res.json())
      .then(data => {
        setTools(data.tools || []);
        setCategories(data.categories || {});
        if (data.tools && data.tools.length > 0) {
          setSelectedTool(data.tools[0].name);
        }
      })
      .catch(console.error);
  }, []);

  const handleToolTest = async () => {
    if (!selectedTool) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const { userId, apiKey } = getPrecheckUserIdDetails();

      const parsedArgs = JSON.parse(args);
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: selectedTool,
          args: parsedArgs,
          userId,
          apiKey,
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getExampleArgs = (toolName: string): string => {
    const examples: Record<string, any> = {
      'weather.current': { latitude: 37.7749, longitude: -122.4194, location_name: 'San Francisco' },
      'weather.forecast': { latitude: 40.7128, longitude: -74.0060, location_name: 'New York', days: 5 },
      'payment.process': { amount: '99.99', currency: 'USD', description: 'Demo purchase' },
      'payment.refund': { transaction_id: 'txn_demo123', amount: '50.00', reason: 'Customer request' },
      'db.query': { query: 'SELECT * FROM users', table: 'users' },
      'file.read': { path: '/demo/sample.txt' },
      'file.write': { path: '/demo/output.txt', content: 'Hello, world!' },
      'file.list': { path: '/demo' },
      'web.search': { query: 'AI governance best practices', limit: 5 },
      'web.scrape': { url: 'https://example.com', formats: ['markdown', 'html'] },
      'email.send': { to: 'user@example.com', subject: 'Test Email', body: 'Hello!' },
      'calendar.create_event': { title: 'Team Meeting', start_time: '2024-12-30T10:00:00Z' },
      'kv.get': { key: 'user_preferences' },
      'kv.set': { key: 'demo_key', value: 'demo_value', ttl: 3600 },
    };

    return JSON.stringify(examples[toolName] || {}, null, 2);
  };

  const handleToolChange = (toolName: string) => {
    setSelectedTool(toolName);
    setArgs(getExampleArgs(toolName));
    setResponse(null);
  };

  if (!isExpanded) {
    return (
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span>🔧</span>
          <span>Test MCP Tools Directly</span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {tools.length} tools available
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">MCP Tool Tester</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ✕ Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tool Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Tool
            </label>
            <select
              value={selectedTool}
              onChange={(e) => handleToolChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(categories).map(([category, toolNames]) => (
                <optgroup key={category} label={category.toUpperCase()}>
                  {toolNames.map((toolName) => {
                    const tool = tools.find(t => t.name === toolName);
                    return (
                      <option key={toolName} value={toolName}>
                        {toolName} - {tool?.description}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arguments (JSON)
            </label>
            <textarea
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={6}
              placeholder='{"key": "value"}'
            />
          </div>

          <button
            onClick={handleToolTest}
            disabled={isLoading || !selectedTool}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test Tool'}
          </button>
        </div>

        {/* Response Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Response
            </label>
            {response && response.decision && (
              <DecisionBadge 
                decision={response.decision}
                reasons={response.reasons}
              />
            )}
          </div>
          
          <div className="bg-white border border-gray-200 rounded-md p-4 min-h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span>Testing tool...</span>
                </div>
              </div>
            ) : response ? (
              <pre className="text-sm text-gray-800 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            ) : (
              <div className="text-gray-500 text-sm">
                Select a tool and click "Test Tool" to see the response
              </div>
            )}
          </div>

          {response && !response.success && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-red-800 text-sm">
                <strong>Error:</strong> {response.error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tool Categories Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Available Tool Categories:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(categories).map(([category, toolNames]) => (
            <div key={category} className="text-blue-800">
              <strong>{category.toUpperCase()}:</strong> {toolNames.length} tools
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
