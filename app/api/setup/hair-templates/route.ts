import { NextRequest } from 'next/server';

export const maxDuration = 60;

const REPL_KEY = process.env.REPLICATE_API_KEY!;
const SB_URL   = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SB_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';

const TEMPLATES = [
  { id: 'undercut_nam',  p: 'Professional Vietnamese male portrait, classic undercut fade hairstyle shaved sides longer top, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'undercut_nu',   p: 'Professional Vietnamese female portrait, undercut hairstyle shaved sides styled longer top, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'pompadour_nam', p: 'Professional Vietnamese male portrait, pompadour hairstyle high volume swept back, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'pompadour_nu',  p: 'Professional Vietnamese female portrait, modern pompadour voluminous swept front, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'curtain_nam',   p: 'Professional Vietnamese male portrait, curtain bangs center part hair falling both sides, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'curtain_nu',    p: 'Professional Vietnamese female portrait, curtain bangs center part soft waves framing face, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'buzz_nam',      p: 'Professional Vietnamese male portrait, buzz cut very short uniform hair, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'buzz_nu',       p: 'Professional Vietnamese female portrait, buzz cut very short cropped bold, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'textured_nam',  p: 'Professional Vietnamese male portrait, textured crop short natural movement modern trendy, neutral expression, white background, front facing, photorealistic, studio photo' },
  { id: 'textured_nu',   p: 'Professional Vietnamese female portrait, textured crop tousled short waves, neutral expression, white background, front facing, photorealistic, studio photo' },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function genAndUpload(id: string, prompt: string): Promise<{ id: string; url?: string; error?: string }> {
  try {
    // Start flux-schnell prediction
    const start = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REPL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { prompt, aspect_ratio: '3:4', output_format: 'jpg', num_outputs: 1 } })
    });
    if (!start.ok) throw new Error(`start ${start.status}`);
    const pred = await start.json() as { id: string; status: string; output?: string[] };

    // Poll
    let imgUrl = pred.status === 'succeeded' ? pred.output![0] : null;
    if (!imgUrl) {
      for (let i = 0; i < 20; i++) {
        await sleep(1500);
        const poll = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { 'Authorization': `Bearer ${REPL_KEY}` }
        });
        const d = await poll.json() as { status: string; output?: string[]; error?: string };
        if (d.status === 'succeeded') { imgUrl = d.output![0]; break; }
        if (d.status === 'failed') throw new Error(d.error || 'failed');
      }
    }
    if (!imgUrl) throw new Error('timeout');

    // Download + upload to Supabase
    const imgBuf = await fetch(imgUrl).then(r => r.arrayBuffer());
    const up = await fetch(`${SB_URL}/storage/v1/object/hair-templates/${id}.jpg`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SB_ANON}`, 'apikey': SB_ANON, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: imgBuf,
    });
    if (!up.ok) throw new Error(`upload ${await up.text()}`);

    const publicUrl = `${SB_URL}/storage/v1/object/public/hair-templates/${id}.jpg`;
    return { id, url: publicUrl };
  } catch(e) {
    return { id, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('secret') !== 'tuvi2024setup') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate all in parallel
  const results = await Promise.all(TEMPLATES.map(t => genAndUpload(t.id, t.p)));
  const urls: Record<string, string> = {};
  const errors: Record<string, string> = {};
  results.forEach(r => { if (r.url) urls[r.id] = r.url; else if (r.error) errors[r.id] = r.error; });

  return Response.json({ urls, errors, count: Object.keys(urls).length });
}
