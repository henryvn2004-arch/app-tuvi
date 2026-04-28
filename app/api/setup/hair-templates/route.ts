import { NextRequest } from 'next/server';
export const maxDuration = 60;

const REPL_KEY = process.env.REPLICATE_API_KEY!;
const SB_URL   = 'https://dciwkfdqhhddeymlisey.supabase.co';
const SB_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I';
const PUBLIC   = `${SB_URL}/storage/v1/object/public/hair-templates`;

const TEMPLATES = [
  // NAM
  { id: 'undercut_nam',   p: 'Vietnamese male portrait, classic undercut fade hairstyle, shaved sides, longer textured top, neutral expression, white background, front facing, photorealistic, studio lighting' },
  { id: 'pompadour_nam',  p: 'Vietnamese male portrait, pompadour hairstyle high volume swept back from forehead, well-groomed, neutral expression, white background, front facing, photorealistic, studio lighting' },
  { id: 'curtain_nam',    p: 'Vietnamese male portrait, curtain bangs hairstyle center parted soft hair falling naturally to both sides, neutral expression, white background, front facing, photorealistic' },
  { id: 'buzz_nam',       p: 'Vietnamese male portrait, buzz cut very short uniform hair all over, clean look, neutral expression, white background, front facing, photorealistic' },
  { id: 'textured_nam',   p: 'Vietnamese male portrait, textured crop haircut short with natural movement and volume, neutral expression, white background, front facing, photorealistic' },
  { id: 'two_block_nam',  p: 'Vietnamese male portrait, Korean two-block haircut, very short shaved sides, longer natural top, modern K-style, neutral expression, white background, front facing, photorealistic' },
  { id: 'side_part_nam',  p: 'Vietnamese male portrait, classic side part haircut neatly combed to one side, professional look, neutral expression, white background, front facing, photorealistic' },
  { id: 'slick_back_nam', p: 'Vietnamese male portrait, slick back hairstyle hair swept straight back glossy, polished look, neutral expression, white background, front facing, photorealistic' },
  // NỮ
  { id: 'curtain_nu',     p: 'Vietnamese female portrait, curtain bangs center part soft waves framing face, romantic feminine, neutral expression, white background, front facing, photorealistic' },
  { id: 'wolf_nu',        p: 'Vietnamese female portrait, wolf cut hairstyle layered with wispy curtain bangs shaggy texture, modern Gen-Z style, neutral expression, white background, front facing, photorealistic' },
  { id: 'bob_nu',         p: 'Vietnamese female portrait, short bob haircut jaw-length clean structured, neutral expression, white background, front facing, photorealistic' },
  { id: 'long_layers_nu', p: 'Vietnamese female portrait, long layered haircut flowing layers adding volume and movement, neutral expression, white background, front facing, photorealistic' },
  { id: 'pixie_nu',       p: 'Vietnamese female portrait, pixie cut very short back and sides slightly longer on top feminine, neutral expression, white background, front facing, photorealistic' },
  { id: 'side_waves_nu',  p: 'Vietnamese female portrait, side part with soft waves flowing to shoulder elegant, neutral expression, white background, front facing, photorealistic' },
  { id: 'wispy_nu',       p: 'Vietnamese female portrait, wispy bangs soft feathery fringe with medium length hair, youthful, neutral expression, white background, front facing, photorealistic' },
  { id: 'shag_nu',        p: 'Vietnamese female portrait, shag haircut with layers choppy ends and curtain bangs retro-modern, neutral expression, white background, front facing, photorealistic' },
  { id: 'lob_nu',         p: 'Vietnamese female portrait, lob long bob shoulder-length sleek polished, neutral expression, white background, front facing, photorealistic' },
  { id: 'blunt_fringe_nu',p: 'Vietnamese female portrait, blunt fringe straight across bangs with long straight hair, clean sharp look, neutral expression, white background, front facing, photorealistic' },
  { id: 'textured_wavy_nu',p:'Vietnamese female portrait, textured wavy medium length hair natural beach waves effortless, neutral expression, white background, front facing, photorealistic' },
  { id: 'pompadour_nu',   p: 'Vietnamese female portrait, modern female pompadour voluminous swept front soft, elegant, neutral expression, white background, front facing, photorealistic' },
  { id: 'undercut_nu',    p: 'Vietnamese female portrait, undercut hairstyle shaved sides styled longer top, neutral expression, white background, front facing, photorealistic' },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getExistingFiles(): Promise<Set<string>> {
  // Query Supabase Storage API to list existing files
  const r = await fetch(`${SB_URL}/storage/v1/object/list/hair-templates`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SB_ANON}`, 'apikey': SB_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: '', limit: 100 })
  });
  if (!r.ok) return new Set();
  const files = await r.json() as { name: string }[];
  return new Set(files.map(f => f.name.replace('.jpg', '')));
}

async function genAndUpload(id: string, prompt: string): Promise<{ id: string; url?: string; error?: string }> {
  try {
    const start = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REPL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { prompt, aspect_ratio: '3:4', output_format: 'jpg', num_outputs: 1 } })
    });
    if (!start.ok) throw new Error(`start ${start.status}`);
    const pred = await start.json() as { id: string; status: string; output?: string[] };
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
    const imgBuf = await fetch(imgUrl).then(r => r.arrayBuffer());
    const up = await fetch(`${SB_URL}/storage/v1/object/hair-templates/${id}.jpg`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SB_ANON}`, 'apikey': SB_ANON, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: imgBuf,
    });
    if (!up.ok) throw new Error(`upload ${await up.text()}`);
    return { id, url: `${PUBLIC}/${id}.jpg` };
  } catch(e) {
    return { id, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('secret') !== 'tuvi2024setup') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await getExistingFiles();
  const todo = TEMPLATES.filter(t => !existing.has(t.id));
  const done = TEMPLATES.filter(t => existing.has(t.id)).map(t => ({ id: t.id, url: `${PUBLIC}/${t.id}.jpg` }));

  // Generate sequentially — rate limit safe
  const generated: { id: string; url?: string; error?: string }[] = [];
  for (const t of todo) {
    const r = await genAndUpload(t.id, t.p);
    generated.push(r);
    if (generated.length < todo.length) await sleep(1000);
  }

  type ResultItem = { id: string; url?: string; error?: string };
  const urls: Record<string, string> = {};
  const errors: Record<string, string> = {};
  ([...done, ...generated] as ResultItem[]).forEach(r => { if (r.url) urls[r.id] = r.url; else if (r.error) errors[r.id] = r.error; });

  return Response.json({
    urls, errors,
    count: Object.keys(urls).length,
    skipped: done.length,
    generated: generated.filter(r => r.url).length,
    todo: todo.map(t => t.id),
  });
}
