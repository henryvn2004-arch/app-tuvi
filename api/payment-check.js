// api/payment-check.js
// Check xem slug đã được purchase chưa
// GET ?slug=xxx&userId=xxx (userId optional)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  const { slug, userId } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    // Check by slug + userId nếu có, hoặc chỉ slug
    let url = `${SUPABASE_URL}/rest/v1/purchases?slug=eq.${encodeURIComponent(slug)}&status=eq.completed&limit=1&select=id,email,user_id,created_at`;
    if (userId) url += `&user_id=eq.${encodeURIComponent(userId)}`;

    const res2 = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res2.ok) throw new Error('Supabase query failed');
    const rows = await res2.json();

    return res.status(200).json({
      purchased: rows.length > 0,
      purchasedAt: rows[0]?.created_at || null,
    });

  } catch (e) {
    console.error('[payment-check]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
