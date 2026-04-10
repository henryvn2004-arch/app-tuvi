// Shared helpers for all API route handlers
import { NextResponse } from 'next/server';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function cors(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export function ok(data: unknown, status = 200): NextResponse {
  return cors(NextResponse.json(data, { status }));
}

export function err(message: string, status = 500): NextResponse {
  return cors(NextResponse.json({ error: message }, { status }));
}

export function options(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Parse body safely
export async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json(); }
  catch { return {}; }
}
