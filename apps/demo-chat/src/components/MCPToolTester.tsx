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

      // Validate JSON args
      let parsedArgs;
      try {
        parsedArgs = JSON.parse(args);
      } catch (jsonError) {
        setResponse({
          success: false,
          error: `Invalid JSON in arguments: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'}`,
        });
        setIsLoading(false);
        return;
      }

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
      // Weather tools - should be allowed
      'weather.current': { latitude: 37.7749, longitude: -122.4194, location_name: 'San Francisco' },
      'weather.forecast': { latitude: 40.7128, longitude: -74.0060, location_name: 'New York', days: 5 },
      
      // Payment tools - should trigger confirm or block
      'payment.process': { amount: '99.99', currency: 'USD', description: 'Demo purchase' },
      'payment.refund': { transaction_id: 'txn_demo123', amount: '50.00', reason: 'Customer request' },
      
      // Database tools - should be allowed
      'db.query': { query: 'SELECT * FROM users', table: 'users' },
      
      // File tools - should be allowed
      'file.read': { path: '/demo/sample.txt' },
      'file.write': { path: '/demo/output.txt', content: 'Hello, world!' },
      'file.list': { path: '/demo' },
      
      // Web tools - should be allowed
      'web.search': { query: 'AI governance best practices', limit: 5 },
      'web.scrape': { url: 'https://example.com', formats: ['markdown', 'html'] },
      
      // Email tools - should trigger confirm or redact
      'email.send': { to: 'user@example.com', subject: 'Test Email', body: 'Hello!' },
      
      // Calendar tools - should be allowed
      'calendar.create_event': { title: 'Team Meeting', start_time: '2024-12-30T10:00:00Z' },
      
      // KV store tools - should be allowed
      'kv.get': { key: 'user_preferences' },
      'kv.set': { key: 'demo_key', value: 'demo_value', ttl: 3600 },
    };

    return JSON.stringify(examples[toolName] || {}, null, 2);
  };

  // Additional examples that trigger different precheck decisions
  const getPrecheckExamples = (toolName: string): Array<{label: string, args: any, expectedDecision: string}> => {
    const examples: Record<string, Array<{label: string, args: any, expectedDecision: string}>> = {
      'payment.process': [
        { label: 'Normal Payment', args: { amount: '25.00', currency: 'USD', description: 'Coffee purchase' }, expectedDecision: 'confirm' },
        { label: 'High Value Payment', args: { amount: '9999.99', currency: 'USD', description: 'Enterprise license' }, expectedDecision: 'confirm' },
        { label: 'PII in Description', args: { amount: '100.00', currency: 'USD', description: 'Payment for john.doe@company.com account' }, expectedDecision: 'redact' },
      ],
      'email.send': [
        { label: 'Normal Email', args: { to: 'colleague@company.com', subject: 'Meeting Notes', body: 'Here are the meeting notes from today.' }, expectedDecision: 'confirm' },
        { label: 'PII in Body', args: { to: 'hr@company.com', subject: 'Employee Info', body: 'John Doe, SSN: 123-45-6789, needs vacation approval.' }, expectedDecision: 'redact' },
        { label: 'Suspicious Email', args: { to: 'external@competitor.com', subject: 'Confidential Data', body: 'Here is our secret business plan.' }, expectedDecision: 'block' },
      ],
      'web.search': [
        { label: 'Safe Search', args: { query: 'weather forecast', limit: 5 }, expectedDecision: 'allow' },
        { label: 'PII Search', args: { query: 'john.doe@company.com personal information', limit: 5 }, expectedDecision: 'redact' },
        { label: 'Malicious Search', args: { query: 'how to hack into systems', limit: 5 }, expectedDecision: 'block' },
      ],
      'file.read': [
        { label: 'Safe File', args: { path: '/public/readme.txt' }, expectedDecision: 'allow' },
        { label: 'Sensitive File', args: { path: '/private/passwords.txt' }, expectedDecision: 'block' },
        { label: 'Config File', args: { path: '/config/app.json' }, expectedDecision: 'allow' },
      ],
    };

    return examples[toolName] || [];
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

          {/* Precheck Examples for Selected Tool */}
          {getPrecheckExamples(selectedTool).length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precheck Examples
              </label>
              <div className="space-y-2">
                {getPrecheckExamples(selectedTool).map((example, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setArgs(JSON.stringify(example.args, null, 2));
                    }}
                    className="w-full text-left p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{example.label}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        example.expectedDecision === 'allow' ? 'bg-green-100 text-green-800' :
                        example.expectedDecision === 'confirm' ? 'bg-yellow-100 text-yellow-800' :
                        example.expectedDecision === 'redact' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {example.expectedDecision.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
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

      {/* Precheck Examples */}
      <div className="mt-6 p-4 bg-green-50 rounded-md">
        <h4 className="text-sm font-medium text-green-900 mb-2">Precheck Decision Examples:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-green-800 font-medium">🟢 ALLOW Examples:</div>
            <div className="text-green-700">• Weather queries (safe external data)</div>
            <div className="text-green-700">• File operations (local files)</div>
            <div className="text-green-700">• Database queries (read-only)</div>
            <div className="text-green-700">• Web search (public information)</div>
          </div>
          <div className="space-y-1">
            <div className="text-yellow-800 font-medium">🟡 CONFIRM Examples:</div>
            <div className="text-yellow-700">• Payment processing (financial risk)</div>
            <div className="text-yellow-700">• Email sending (external communication)</div>
            <div className="text-yellow-700">• High-value operations</div>
          </div>
          <div className="space-y-1">
            <div className="text-orange-800 font-medium">🟠 REDACT Examples:</div>
            <div className="text-orange-700">• PII in arguments (emails, SSNs)</div>
            <div className="text-orange-700">• Sensitive data in content</div>
          </div>
          <div className="space-y-1">
            <div className="text-red-800 font-medium">🔴 BLOCK Examples:</div>
            <div className="text-red-700">• Malicious operations</div>
            <div className="text-red-700">• Policy violations</div>
            <div className="text-red-700">• Unauthorized access attempts</div>
          </div>
        </div>
      </div>

      {/* Tool Categories Info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-md">
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
