import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { precheck, createChatPrecheckRequest } from '@/lib/precheck';
import { OpenAIProvider } from '@/lib/providers/openai';
import { OllamaProvider } from '@/lib/providers/ollama';
import { SSEWriter } from '@/lib/sse';
import { ChatRequest, Provider } from '@/lib/types';
import { getPrecheckUserIdDetails } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model, provider: requestProvider } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Determine provider
    const provider: Provider = requestProvider || (process.env.PROVIDER as Provider) || 'openai';
    const corrId = uuidv4();

    // Create SSE response
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
      },
    });

    const writer = new SSEWriter(controller!);

    // Handle the streaming in the background
    (async () => {
      try {
        // Step 1: Precheck with user context
        const precheckRequest = createChatPrecheckRequest(messages, provider, corrId);
        const { userId, apiKey } = getPrecheckUserIdDetails();

        const precheckResponse = await precheck(precheckRequest, userId, apiKey);

        // Send decision event
        writer.writeDecision(precheckResponse.decision, precheckResponse.reasons);

        // Step 2: Handle precheck decision
        if (precheckResponse.decision === 'block') {
          writer.writeError(
            `Request blocked: ${precheckResponse.reasons?.join(', ') || 'Policy violation'}`
          );
          writer.close();
          return;
        }

        // Use possibly redacted messages from precheck response
        const processedMessages = precheckResponse.content?.messages || messages;

        // Step 3: Get provider and stream response
        let chatProvider;
        try {
          if (provider === 'openai') {
            chatProvider = new OpenAIProvider();
          } else if (provider === 'ollama') {
            chatProvider = new OllamaProvider();
          } else {
            throw new Error(`Unsupported provider: ${provider}`);
          }
        } catch (error) {
          writer.writeError(
            `Provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          writer.close();
          return;
        }

        // Step 4: Stream tokens
        const modelToUse = model || chatProvider.getDefaultModel();
        
        try {
          for await (const token of chatProvider.stream(processedMessages, modelToUse)) {
            writer.writeContent(token);
          }
          
          writer.writeDone();
        } catch (error) {
          writer.writeError(
            `Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        } finally {
          writer.close();
        }

      } catch (error) {
        writer.writeError(
          `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        writer.close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
