import { NextRequest } from 'next/server';

export const maxDuration = 300;

const REPL_KEY = process.env.REPLICATE_API_KEY!;
const SB_URL   = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SB_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEMPLATES = [
  { id: 'undercut_nam',  prompt: 'Professional Asian male portrait, classic undercut hairstyle shaved fade sides longer textured top, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'undercut_nu',   prompt: 'Professional Asian female portrait, undercut hairstyle shaved sides longer styled top, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'pompadour_nam', prompt: 'Professional Asian male portrait, pompadour hairstyle high volume swept back from forehead, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'pompadour_nu',  prompt: 'Professional Asian female portrait, modern pompadour hairstyle voluminous swept front, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'curtain_nam',   prompt: 'Professional Asian male portrait, curtain bangs hairstyle center parted soft hair falling naturally both sides, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'curtain_nu',    prompt: 'Professional Asian female portrait, curtain bangs center part soft waves framing face, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'buzz_nam',      prompt: 'Professional Asian male portrait, buzz cut very short uniform hair clean sharp, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'buzz_nu',       prompt: 'Professional Asian female portrait, buzz cut very short cropped hair bold look, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'textured_nam',  prompt: 'Professional Asian male portrait, textured crop haircut short natural movement modern, neutral expression, plain white background, front facing, photorealistic' },
  { id: 'textured_nu',   prompt: 'Professional Asian female portrait, textured crop tousled short waves natural texture, neutral expression, plain white background, front facing, photorealistic' },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function genImage(prompt: string): Promise<string> {
  const start = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${REPL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { prompt, aspect_ratio: '3:4', output_format: 'jpg', num_outputs: 1 } })
  });
  if (!start.ok) throw new Error(`Replicate start: ${start.status}`);
  const pred = await start.json() as { id: string; status: string; output?: string[] };
  if (pred.status === 'succeeded') return pred.output![0];
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { 'Authorization': `Bearer ${REPL_KEY}` }
    });
    const d = await poll.json() as { status: string; output?: string[]; error?: string };
    if (d.status === 'succeeded') return d.output![0];
    if (d.status === 'failed') throw new Error(d.error || 'failed');
  }
  throw new Error('timeout');
}

async function uploadSB(imageUrl: string, filename: string): Promise<string> {
  const imgBuf = await fetch(imageUrl).then(r => r.arrayBuffer());
  const up = await fetch(`${SB_URL}/storage/v1/object/hair-templates/${filename}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SB_KEY}`, 'apikey': SB_KEY, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
    body: imgBuf,
  });
  if (!up.ok) throw new Error(`SB upload: ${await up.text()}`);
  return `${SB_URL}/storage/v1/object/public/hair-templates/${filename}`;
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('secret') !== 'tuvi2024setup') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const t of TEMPLATES) {
    try {
      const imgUrl = await genImage(t.prompt);
      results[t.id] = await uploadSB(imgUrl, `${t.id}.jpg`);
    } catch (e: unknown) {
      errors[t.id] = e instanceof Error ? e.message : String(e);
    }
  }
  return Response.json({ results, errors });
}
