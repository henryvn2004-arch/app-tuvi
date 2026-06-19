// app/api/tts/route.ts — Vietnamese TTS via Google Translate (free, no API key)
export const maxDuration = 20;

import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS, err, options as corsOptions } from '@/lib/cors';

const CHUNK_MAX  = 180;   // Google TTS char limit per request
const TEXT_MAX   = 1500;

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

// Split into chunks ≤ CHUNK_MAX chars, breaking at word boundaries
function splitChunks(text: string): string[] {
  const chunks: string[] = [];
  // Split on sentence-ending punctuation first
  const sentences = text.split(/(?<=[.!?,;:])\s+/);
  let buf = '';
  for (const s of sentences) {
    const candidate = buf ? buf + ' ' + s : s;
    if (candidate.length <= CHUNK_MAX) {
      buf = candidate;
    } else {
      if (buf) chunks.push(buf);
      // Sentence itself too long — split by words
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

async function googleTTS(text: string): Promise<Buffer> {
  const url = 'https://translate.google.com/translate_tts?' + new URLSearchParams({
    ie: 'UTF-8', q: text, tl: 'vi', client: 'tw-ob', ttsspeed: '0.9',
  });
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer':    'https://translate.google.com/',
    },
  });
  if (!res.ok) throw new Error(`Google TTS ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
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
    const chunks   = splitChunks(text);
    const buffers  = await Promise.all(chunks.map(googleTTS));
    const combined = Buffer.concat(buffers);

    return new NextResponse(combined, {
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
