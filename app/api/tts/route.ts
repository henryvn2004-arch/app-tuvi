// app/api/tts/route.ts — Vietnamese TTS via Google Translate (free, no API key)
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS, err, options as corsOptions } from '@/lib/cors';

const CHUNK_MAX = 180;
const TEXT_MAX  = 2000;

function cleanText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, TEXT_MAX);
}

function splitChunks(text: string): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?,;:])\s+/);
  let buf = '';
  for (const s of sentences) {
    const candidate = buf ? buf + ' ' + s : s;
    if (candidate.length <= CHUNK_MAX) {
      buf = candidate;
    } else {
      if (buf) chunks.push(buf);
      if (s.length > CHUNK_MAX) {
        const words = s.split(' ');
        buf = '';
        for (const w of words) {
          const c = buf ? buf + ' ' + w : w;
          if (c.length <= CHUNK_MAX) { buf = c; }
          else { if (buf) chunks.push(buf); buf = w; }
        }
      } else {
        buf = s;
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks.filter(Boolean);
}

// Returns null on failure instead of throwing, so one bad chunk doesn't kill the whole response
async function googleTTS(text: string): Promise<Buffer | null> {
  try {
    const url = 'https://translate.google.com/translate_tts?' + new URLSearchParams({
      ie: 'UTF-8', q: text, tl: 'vi', client: 'tw-ob', ttsspeed: '0.9',
    });
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer':    'https://translate.google.com/',
      },
    });
    if (!res.ok) { console.warn('[TTS] chunk failed', res.status, text.slice(0, 40)); return null; }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn('[TTS] chunk error', e);
    return null;
  }
}

export function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try { body = await req.json(); }
  catch { return err('Invalid JSON', 400); }

  const text = cleanText(body.text || '');
  if (!text) return err('Thiếu text', 400);

  try {
    const chunks  = splitChunks(text);
    const buffers: Buffer[] = [];

    // Sequential — tránh Google rate-limit khi fetch parallel nhiều chunk cùng lúc
    for (const chunk of chunks) {
      const buf = await googleTTS(chunk);
      if (buf) buffers.push(buf);
    }

    if (buffers.length === 0) return err('TTS không phản hồi', 502);

    return new NextResponse(Buffer.concat(buffers), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':  'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[TTS] error', e);
    return err('TTS error', 500);
  }
}
