import { StreamEvent } from './types';

export function createSSEResponse() {
  const encoder = new TextEncoder();
  
  return new Response(
    new ReadableStream({
      start(controller) {
        // Store controller for later use
        (this as any).controller = controller;
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

export async function* writeSSE(
  generator: AsyncGenerator<string>
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();
  
  try {
    for await (const chunk of generator) {
      const event: StreamEvent = {
        type: 'content',
        data: chunk,
      };
      
      yield encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    }
    
    // Send done event
    const doneEvent: StreamEvent = {
      type: 'done',
      data: null,
    };
    yield encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`);
  } catch (error) {
    // Send error event
    const errorEvent: StreamEvent = {
      type: 'error',
      data: error instanceof Error ? error.message : 'Unknown error',
    };
    yield encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`);
  }
}

export function sendSSEEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export class SSEWriter {
  private encoder = new TextEncoder();
  
  constructor(private controller: ReadableStreamDefaultController<Uint8Array>) {}
  
  writeEvent(event: StreamEvent) {
    const data = this.encoder.encode(sendSSEEvent(event));
    this.controller.enqueue(data);
  }
  
  writeContent(content: string) {
    this.writeEvent({
      type: 'content',
      data: content,
    });
  }
  
  writeDecision(decision: string, reasons?: string[]) {
    this.writeEvent({
      type: 'decision',
      data: { decision, reasons },
    });
  }
  
  writeError(error: string) {
    this.writeEvent({
      type: 'error',
      data: error,
    });
  }
  
  writeDone() {
    this.writeEvent({
      type: 'done',
      data: null,
    });
  }
  
  close() {
    this.controller.close();
  }
}
