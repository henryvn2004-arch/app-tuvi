// app/api/tts/route.ts — Vietnamese TTS proxy (FPT.AI)
export const maxDuration = 20;

import { NextRequest, NextResponse } from 'next/server';
import { err, options as corsOptions, CORS_HEADERS } from '@/lib/cors';

const FPT_API_KEY  = process.env.FPT_TTS_API_KEY || '';
const FPT_TTS_URL  = 'https://api.fpt.ai/hmi/tts/v5';
const MAX_CHARS    = 1500; // FPT.AI supports ~5000 but cap for latency

// Voices: banmai/linhsan/minhquang/giahuy (female/female/male/male)
const ALLOWED_VOICES = new Set(['banmai', 'linhsan', 'minhquang', 'giahuy', 'thanhlam']);

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
    .slice(0, MAX_CHARS);
}

export async function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  if (!FPT_API_KEY) {
    return err('TTS chưa được cấu hình', 503);
  }

  let body: { text?: string; voice?: string };
  try { body = await req.json(); }
  catch { return err('Invalid JSON', 400); }

  const text = cleanText(body.text || '');
  if (!text) return err('Thiếu text', 400);

  const voice = ALLOWED_VOICES.has(body.voice || '') ? body.voice! : 'banmai';

  try {
    // Step 1: request synthesis
    const synthRes = await fetch(FPT_TTS_URL, {
      method:  'POST',
      headers: { 'api-key': FPT_API_KEY, 'voice': voice },
      body:    text,
    });

    if (!synthRes.ok) {
      console.error('[TTS] FPT synth error', synthRes.status);
      return err('TTS service error', 502);
    }

    const synthData = await synthRes.json() as { error: number; async?: string };
    if (synthData.error !== 0 || !synthData.async) {
      console.error('[TTS] FPT bad response', synthData);
      return err('TTS generation failed', 502);
    }

    // Step 2: fetch the audio file FPT.AI generated
    const audioRes = await fetch(synthData.async);
    if (!audioRes.ok) {
      return err('Audio fetch failed', 502);
    }

    const audioBuffer = await audioRes.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status:  200,
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
