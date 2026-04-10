// app/api/upload-laso-image/route.ts
export const maxDuration = 30;
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ok, err, options } from '@/lib/cors';

export async function OPTIONS() { return options(); }

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    const formData = await request.formData();
    const slug  = String(formData.get('slug') || '');
    const image = formData.get('image') as File | null;
    if (!image || !slug) return err('Missing image or slug', 400);

    const buffer = Buffer.from(await image.arrayBuffer());
    const filePath = `laso/${slug}.png`;

    const { error: uploadError } = await supabase.storage
      .from('laso-images')
      .upload(filePath, buffer, { contentType: 'image/png', upsert: true });
    if (uploadError) return err(uploadError.message);

    const { data: urlData } = supabase.storage
      .from('laso-images')
      .getPublicUrl(filePath);

    await supabase.from('laso_public')
      .update({ laso_image: urlData?.publicUrl })
      .eq('slug', slug);

    return ok({ success: true, url: urlData?.publicUrl });
  } catch(e: unknown) { return err((e as Error).message); }
}
