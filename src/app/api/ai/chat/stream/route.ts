import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  const response = await fetch('http://localhost:3001/api/ai/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 