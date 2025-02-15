import { headers } from 'next/headers';

export async function GET(request, { params }) {
  const { id } = await params;

  const response = new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Store the controller in a global map with the section ID
        if (!global.sseClients) global.sseClients = new Map();
        if (!global.sseClients.has(id)) global.sseClients.set(id, new Set());
        global.sseClients.get(id).add(controller);

        // Clean up when client disconnects
        request.signal.addEventListener('abort', () => {
          global.sseClients.get(id).delete(controller);
          controller.close();
        });

        // Send initial message
        controller.enqueue(encoder.encode('event: connected\ndata: Connected to SSE\n\n'));
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );

  return response;
} 