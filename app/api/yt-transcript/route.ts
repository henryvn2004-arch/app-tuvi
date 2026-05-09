import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get('v');
  if (!v || !/^[a-zA-Z0-9_-]{10,12}$/.test(v))
    return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });

  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${v}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    if (!pageRes.ok) throw new Error(`YouTube ${pageRes.status}`);
    const html = await pageRes.text();

    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*(?:;|<\/script)/);
    if (!m) throw new Error('ytInitialPlayerResponse not found — video may be private/age-restricted');

    const pr = JSON.parse(m[1]);
    const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) return NextResponse.json({ error: 'No captions on this video' }, { status: 404 });

    const pick =
      tracks.find((t: any) => t.languageCode === 'vi' && t.kind !== 'asr') ||
      tracks.find((t: any) => t.languageCode === 'vi') ||
      tracks.find((t: any) => t.languageCode?.startsWith('vi')) ||
      tracks[0];

    if (!pick?.baseUrl) return NextResponse.json({ error: 'Caption URL missing' }, { status: 404 });

    const capRes = await fetch(pick.baseUrl + '&fmt=json3');
    if (!capRes.ok) throw new Error(`Caption fetch ${capRes.status}`);
    const json = await capRes.json();

    const text = (json?.events || [])
      .filter((e: any) => e.segs)
      .map((e: any) => e.segs.map((s: any) => s.utf8 || '').join(''))
      .join(' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json(
      { text, lang: pick.languageCode, kind: pick.kind || 'manual' },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
