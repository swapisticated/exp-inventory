import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

// Handle SSE connection
export async function GET(request, { params }) {
  const { id: sectionId } = params;
  
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Subscribe to Redis channel
  const subscription = redis.subscribe(`section:${sectionId}`);
  
  subscription.on('message', (channel, message) => {
    writer.write(encoder.encode(`data: ${message}\n\n`));
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 