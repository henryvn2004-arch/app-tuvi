// app/api/tts/route.ts — Vietnamese TTS via MS Edge Neural TTS (free, no API key)
export const maxDuration = 20;

import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { CORS_HEADERS, err, options as corsOptions } from '@/lib/cors';

const MAX_CHARS = 1500;

// Vietnamese Neural voices available in Edge TTS
const ALLOWED_VOICES: Record<string, string> = {
  'hoaimy':  'vi-VN-HoaiMyNeural',   // female (default)
  'namminh': 'vi-VN-NamMinhNeural',  // male
};

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

export function OPTIONS() {
  return corsOptions();
}

export async function POST(req: NextRequest) {
  let body: { text?: string; voice?: string };
  try { body = await req.json(); }
  catch { return err('Invalid JSON', 400); }

  const text = cleanText(body.text || '');
  if (!text) return err('Thiếu text', 400);

  const voiceName = ALLOWED_VOICES[body.voice || ''] ?? ALLOWED_VOICES['hoaimy'];

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':  'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[TTS] msedge-tts error', e);
    return err('TTS error', 500);
  } finally {
    tts.close();
  }
}
