import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // needs service key to upload storage
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse multipart form data
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    // Extract boundary
    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return res.status(400).json({ error: 'No boundary' });

    // Parse parts
    const parts = body.toString('binary').split('--' + boundary);
    let imageBuffer = null, slug = '';

    for (const part of parts) {
      if (part.includes('name="slug"')) {
        slug = part.split('\r\n\r\n')[1]?.trim().replace(/\r\n--$/, '') || '';
      }
      if (part.includes('name="image"') && part.includes('filename=')) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd >= 0) {
          const rawData = part.slice(headerEnd + 4);
          // Remove trailing boundary marker
          const endIdx = rawData.lastIndexOf('\r\n');
          const imgStr = endIdx > 0 ? rawData.slice(0, endIdx) : rawData;
          imageBuffer = Buffer.from(imgStr, 'binary');
        }
      }
    }

    if (!imageBuffer || !slug) {
      return res.status(400).json({ error: 'Missing image or slug' });
    }

    // Upload to Supabase Storage
    const filePath = `laso/${slug}.png`;
    const { error: uploadError } = await supabase.storage
      .from('laso-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-laso-image] storage error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('laso-images')
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;

    // Update laso_public table
    const { error: updateError } = await supabase
      .from('laso_public')
      .update({ laso_image: publicUrl })
      .eq('slug', slug);

    if (updateError) {
      console.error('[upload-laso-image] update error:', updateError);
    }

    return res.status(200).json({ success: true, url: publicUrl });

  } catch (e) {
    console.error('[upload-laso-image]', e);
    return res.status(500).json({ error: e.message });
  }
}
