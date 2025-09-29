import { NextRequest } from 'next/server';

/**
 * Proxy endpoint for precheck service - useful for local development
 * to avoid CORS issues when calling precheck service directly from client
 */
export async function POST(request: NextRequest) {
  const precheckUrl = process.env.PRECHECK_URL;
  const precheckApiKey = process.env.PRECHECK_API_KEY;

  if (!precheckUrl) {
    return Response.json(
      { error: 'Precheck service not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    
    const response = await fetch(precheckUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(precheckApiKey && { 'Authorization': `Bearer ${precheckApiKey}` }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return Response.json(data, { 
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Precheck proxy error:', error);
    return Response.json(
      { 
        error: 'Failed to connect to precheck service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
