import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
): Promise<Response> {
  const ticketId = (await params).ticketId;

  const isDev = process.env.NODE_ENV === 'development';
  const backendUrl = isDev ? 'http://localhost:3001' : '';
  const authHeader = request.headers.get('Authorization');

  // Proxy para o backend Express
  const response = await fetch(`${backendUrl}/api/tickets/${ticketId}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader && { 'Authorization': authHeader }),
    },
    body: await request.text(),
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
