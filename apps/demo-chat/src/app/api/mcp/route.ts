import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { precheck, createMCPPrecheckRequest } from '@/lib/precheck';
import { MCPRequest, MCPResponse } from '@/lib/types';

// Mock MCP tool implementations with realistic data
const mockTools = {
  // Weather Tools
  'weather.current': async (args: Record<string, any>) => {
    const location = args.location || 'San Francisco';
    const mockWeatherData = {
      'San Francisco': { temp: 68, condition: 'Partly Cloudy', humidity: 65, wind: '10 mph NW' },
      'New York': { temp: 72, condition: 'Sunny', humidity: 55, wind: '8 mph SW' },
      'London': { temp: 61, condition: 'Rainy', humidity: 80, wind: '12 mph W' },
      'Tokyo': { temp: 75, condition: 'Clear', humidity: 60, wind: '6 mph E' },
    };
    
    const weather = mockWeatherData[location as keyof typeof mockWeatherData] || 
                   { temp: 70, condition: 'Unknown', humidity: 50, wind: '5 mph' };
    
    return {
      location,
      temperature: `${weather.temp}°F`,
      condition: weather.condition,
      humidity: `${weather.humidity}%`,
      wind: weather.wind,
      timestamp: new Date().toISOString(),
      source: 'Mock Weather API',
    };
  },

  'weather.forecast': async (args: Record<string, any>) => {
    const location = args.location || 'San Francisco';
    const days = Math.min(args.days || 3, 7);
    
    const forecast = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      high: 70 + Math.floor(Math.random() * 20),
      low: 55 + Math.floor(Math.random() * 15),
      condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
      precipitation: Math.floor(Math.random() * 30) + '%',
    }));
    
    return {
      location,
      forecast,
      source: 'Mock Weather API',
    };
  },

  // Payment Tools
  'payment.process': async (args: Record<string, any>) => {
    const { amount, currency = 'USD', method = 'credit_card', description } = args;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      transaction_id: `txn_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      amount: parseFloat(amount) || 0,
      currency,
      method,
      description: description || 'Demo payment',
      timestamp: new Date().toISOString(),
      fee: Math.round((parseFloat(amount) || 0) * 0.029 * 100) / 100, // 2.9% fee
      net_amount: Math.round((parseFloat(amount) || 0) * 0.971 * 100) / 100,
    };
  },

  'payment.refund': async (args: Record<string, any>) => {
    const { transaction_id, amount, reason } = args;
    
    return {
      refund_id: `ref_${Math.random().toString(36).substr(2, 9)}`,
      original_transaction: transaction_id,
      status: 'processed',
      refund_amount: parseFloat(amount) || 0,
      reason: reason || 'Customer request',
      timestamp: new Date().toISOString(),
      estimated_arrival: '3-5 business days',
    };
  },

  // Database Tools
  'db.query': async (args: Record<string, any>) => {
    const { query, table = 'users' } = args;
    
    const mockData = {
      users: [
        { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-02-20' },
        { id: 3, name: 'Bob Wilson', email: 'bob@example.com', created_at: '2024-03-10' },
      ],
      orders: [
        { id: 101, user_id: 1, amount: 99.99, status: 'completed', date: '2024-12-01' },
        { id: 102, user_id: 2, amount: 149.50, status: 'pending', date: '2024-12-15' },
      ],
      products: [
        { id: 201, name: 'Premium Plan', price: 99.99, category: 'subscription' },
        { id: 202, name: 'Enterprise Plan', price: 299.99, category: 'subscription' },
      ],
    };
    
    return {
      query: query || `SELECT * FROM ${table}`,
      table,
      results: mockData[table as keyof typeof mockData] || [],
      count: mockData[table as keyof typeof mockData]?.length || 0,
      execution_time: '0.05ms',
    };
  },

  // File Operations
  'file.read': async (args: Record<string, any>) => {
    const path = args.path || '/demo/sample.txt';
    const mockFiles = {
      '/demo/sample.txt': 'This is a sample text file for demonstration purposes.',
      '/config/app.json': '{"name": "Demo App", "version": "1.0.0", "debug": true}',
      '/logs/error.log': '2024-12-29 10:30:15 [ERROR] Connection timeout\n2024-12-29 10:31:22 [WARN] Retrying connection',
      '/data/users.csv': 'id,name,email\n1,John Doe,john@example.com\n2,Jane Smith,jane@example.com',
    };
    
    return {
      path,
      content: mockFiles[path as keyof typeof mockFiles] || `Mock content for ${path}`,
      size: mockFiles[path as keyof typeof mockFiles]?.length || 100,
      modified: new Date().toISOString(),
      encoding: 'utf-8',
    };
  },

  'file.write': async (args: Record<string, any>) => {
    const { path, content, mode = 'w' } = args;
    
    return {
      path: path || '/demo/output.txt',
      content: content || '',
      bytes_written: (content || '').length,
      mode,
      timestamp: new Date().toISOString(),
      success: true,
    };
  },

  'file.list': async (args: Record<string, any>) => {
    const directory = args.path || '/demo';
    
    const mockDirectories = {
      '/demo': [
        { name: 'sample.txt', type: 'file', size: 256, modified: '2024-12-29T10:00:00Z' },
        { name: 'images', type: 'directory', size: null, modified: '2024-12-28T15:30:00Z' },
        { name: 'data.json', type: 'file', size: 1024, modified: '2024-12-29T09:45:00Z' },
      ],
      '/config': [
        { name: 'app.json', type: 'file', size: 512, modified: '2024-12-29T08:00:00Z' },
        { name: 'database.yml', type: 'file', size: 256, modified: '2024-12-28T16:20:00Z' },
      ],
      '/logs': [
        { name: 'error.log', type: 'file', size: 2048, modified: '2024-12-29T11:00:00Z' },
        { name: 'access.log', type: 'file', size: 5120, modified: '2024-12-29T11:00:00Z' },
      ],
    };
    
    return {
      path: directory,
      files: mockDirectories[directory as keyof typeof mockDirectories] || [],
      total: mockDirectories[directory as keyof typeof mockDirectories]?.length || 0,
    };
  },

  // Web Scraping Tools
  'web.search': async (args: Record<string, any>) => {
    const query = args.query || 'default query';
    const limit = Math.min(args.limit || 5, 10);
    
    const results = Array.from({ length: limit }, (_, i) => ({
      title: `${query} - Result ${i + 1}`,
      url: `https://example.com/search/${i + 1}`,
      snippet: `This is search result ${i + 1} for "${query}". Mock content demonstrating web search capabilities.`,
      domain: 'example.com',
      published: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    
    return {
      query,
      results,
      total: results.length,
      search_time: '0.12s',
      source: 'Mock Search API',
    };
  },

  'web.scrape': async (args: Record<string, any>) => {
    const url = args.url || 'https://example.com';
    
    return {
      url,
      title: 'Example Domain',
      content: 'This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.',
      meta: {
        description: 'Example domain for demonstrations',
        keywords: 'example, domain, test',
        author: 'IANA',
      },
      links: [
        { text: 'More information...', href: 'https://www.iana.org/domains/example' },
      ],
      scraped_at: new Date().toISOString(),
    };
  },

  // Email Tools
  'email.send': async (args: Record<string, any>) => {
    const { to, subject, body, from = 'demo@example.com' } = args;
    
    return {
      message_id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      to: to || 'recipient@example.com',
      from,
      subject: subject || 'Demo Email',
      status: 'sent',
      timestamp: new Date().toISOString(),
      delivery_time: '< 1 minute',
    };
  },

  // Calendar Tools
  'calendar.create_event': async (args: Record<string, any>) => {
    const { title, start_time, end_time, description, attendees = [] } = args;
    
    return {
      event_id: `evt_${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'Demo Meeting',
      start_time: start_time || new Date().toISOString(),
      end_time: end_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      description,
      attendees,
      calendar: 'primary',
      status: 'confirmed',
      created_at: new Date().toISOString(),
    };
  },

  // Key-Value Store
  'kv.get': async (args: Record<string, any>) => {
    const key = args.key || 'default_key';
    const mockStore = {
      'user_preferences': '{"theme": "dark", "notifications": true}',
      'api_config': '{"timeout": 30000, "retries": 3}',
      'cache_stats': '{"hits": 1250, "misses": 89, "ratio": 0.93}',
    };
    
    return {
      key,
      value: mockStore[key as keyof typeof mockStore] || `Mock value for ${key}`,
      exists: key in mockStore,
      timestamp: new Date().toISOString(),
      ttl: 3600, // 1 hour
    };
  },

  'kv.set': async (args: Record<string, any>) => {
    const { key, value, ttl = 3600 } = args;
    
    return {
      key: key || 'new_key',
      value: value || '',
      success: true,
      ttl,
      expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      timestamp: new Date().toISOString(),
    };
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: MCPRequest = await request.json();
    const { tool, args } = body;

    if (!tool) {
      return Response.json(
        { success: false, error: 'Tool name is required' } as MCPResponse,
        { status: 400 }
      );
    }

    const corrId = uuidv4();

    // Step 1: Precheck the MCP call
    const precheckRequest = createMCPPrecheckRequest(tool, args || {}, corrId);
    
    try {
      const precheckResponse = await precheck(precheckRequest);

      // Step 2: Handle precheck decision
      if (precheckResponse.decision === 'block') {
        return Response.json({
          success: false,
          error: 'MCP call blocked by policy',
          decision: precheckResponse.decision,
          reasons: precheckResponse.reasons,
        } as MCPResponse, { status: 403 });
      }

      // For confirm decision, we mock-approve (no actual UI confirmation in demo)
      if (precheckResponse.decision === 'confirm') {
        console.log(`Mock-confirming MCP call: ${tool} with args:`, args);
      }

      // Use possibly modified args from precheck response
      const processedArgs = precheckResponse.content?.args || args || {};

      // Step 3: Execute the MCP tool (mock implementation)
      const toolFunction = mockTools[tool as keyof typeof mockTools];
      
      if (!toolFunction) {
        return Response.json({
          success: false,
          error: `Unknown tool: ${tool}`,
          decision: precheckResponse.decision,
          reasons: precheckResponse.reasons,
        } as MCPResponse, { status: 400 });
      }

      const result = await toolFunction(processedArgs);

      return Response.json({
        success: true,
        data: result,
        decision: precheckResponse.decision,
        reasons: precheckResponse.reasons,
      } as MCPResponse);

    } catch (precheckError) {
      console.error('Precheck failed for MCP call:', precheckError);
      
      return Response.json({
        success: false,
        error: 'Precheck service unavailable',
        details: precheckError instanceof Error ? precheckError.message : 'Unknown error',
      } as MCPResponse, { status: 503 });
    }

  } catch (error) {
    console.error('MCP API error:', error);
    return Response.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      } as MCPResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return available tools with detailed descriptions
  const toolDescriptions = {
    'weather.current': 'Get current weather conditions for a location',
    'weather.forecast': 'Get weather forecast for multiple days',
    'payment.process': 'Process a payment transaction',
    'payment.refund': 'Process a refund for a transaction',
    'db.query': 'Execute database queries on mock tables',
    'file.read': 'Read contents of a file',
    'file.write': 'Write content to a file',
    'file.list': 'List files and directories',
    'web.search': 'Search the web for information',
    'web.scrape': 'Scrape content from a webpage',
    'email.send': 'Send an email message',
    'calendar.create_event': 'Create a calendar event',
    'kv.get': 'Get value from key-value store',
    'kv.set': 'Set value in key-value store',
  };
  
  return Response.json({
    tools: Object.keys(mockTools).map(tool => ({
      name: tool,
      description: toolDescriptions[tool as keyof typeof toolDescriptions] || `Mock implementation of ${tool}`,
      category: tool.split('.')[0],
    })),
    categories: {
      weather: ['weather.current', 'weather.forecast'],
      payment: ['payment.process', 'payment.refund'],
      db: ['db.query'],
      file: ['file.read', 'file.write', 'file.list'],
      web: ['web.search', 'web.scrape'],
      email: ['email.send'],
      calendar: ['calendar.create_event'],
      kv: ['kv.get', 'kv.set'],
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
