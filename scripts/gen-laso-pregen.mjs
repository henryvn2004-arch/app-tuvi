#!/usr/bin/env node
// scripts/gen-laso-pregen.mjs
// Generates pre-computed lá số using the engine (zero API cost)
// Run: node scripts/gen-laso-pregen.mjs

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const SB_URL = process.env.SUPABASE_URL || 'https://dciwkfdqhhddeymlisey.supabase.co';
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SB_KEY) { console.error('Missing SUPABASE_SERVICE_KEY'); process.exit(1); }

// ── Load engine ────────────────────────────────────────────────────────────────
const engineCode = readFileSync(join(__dirname, '../public/tuvi-ansao-engine.js'), 'utf-8');
// Polyfill browser globals
const g = globalThis;
g.window = g;

// Execute engine code in current context
const engineFn = new Function(
  'window', 'globalThis',
  engineCode + '\nreturn { convertDuongToAm, anSaoLaSo };'
);
const { convertDuongToAm, anSaoLaSo } = engineFn(g, g);

// ── Constants ──────────────────────────────────────────────────────────────────
const CAN  = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
const CHI  = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_CHI = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const GIO_SLUG = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];
const GIO_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21]; // representative hour for each chi

// Base years for each can-chi (2 complete cycles: 1924-2043)
function getBaseYears(canIdx, chiIdx) {
  const years = [];
  // Find years where can=(canIdx) and chi=(chiIdx)
  for (let y = 1924; y <= 2043; y++) {
    if ((y - 4 + 400) % 10 === canIdx && (y - 4 + 480) % 12 === chiIdx) {
      years.push(y);
    }
  }
  return years;
}

function toSlug(str) {
  return str.toLowerCase()
    .replace(/á|à|ã|ả|ạ|ă|ắ|ằ|ẵ|ẳ|ặ|â|ấ|ầ|ẫ|ẩ|ậ/g,'a')
    .replace(/é|è|ẽ|ẻ|ẹ|ê|ế|ề|ễ|ể|ệ/g,'e')
    .replace(/í|ì|ĩ|ỉ|ị/g,'i')
    .replace(/ó|ò|õ|ỏ|ọ|ô|ố|ồ|ỗ|ổ|ộ|ơ|ớ|ờ|ỡ|ở|ợ/g,'o')
    .replace(/ú|ù|ũ|ủ|ụ|ư|ứ|ừ|ữ|ử|ự/g,'u')
    .replace(/ý|ỳ|ỹ|ỷ|ỵ/g,'y')
    .replace(/đ/g,'d')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

// ── Generate all combinations ──────────────────────────────────────────────────
async function generateAll() {
  const records = [];
  const NGAY = 15, THANG = 6; // representative birth date

  for (let canIdx = 0; canIdx < 10; canIdx++) {
    for (let chiIdx = 0; chiIdx < 12; chiIdx++) {
      const canChi = `${CAN[canIdx]} ${CHI[chiIdx]}`;
      const years  = getBaseYears(canIdx, chiIdx);
      if (!years.length) continue;

      for (const namSinh of years) {
        for (let gioIdx = 0; gioIdx < 12; gioIdx++) {
          for (const gioi of ['nam','nu']) {
            const gioChi  = GIO_CHI[gioIdx];
            const gioHour = GIO_HOURS[gioIdx];

            try {
              const conv = convertDuongToAm(NGAY, THANG, namSinh, gioHour);
              if (!conv || !conv.amLich) continue;

              const ls = anSaoLaSo({
                ngayAL: conv.amLich.day,
                thangAL: conv.amLich.month,
                namAL: namSinh,
                canNam: conv.canNam,
                chiNam: conv.chiNam,
                gioIdx: conv.gioIdx,
                gioitinh: gioi,
                namXem: 2026,
              });
              if (!ls) continue;

              // Find cung mệnh info
              const menhPalace = ls.palaces?.find(p => p.isMenh);
              const cungMenh   = menhPalace?.cungName || '';
              const chinhTinh  = menhPalace?.majorStars?.map(s => s.ten || s).join(', ') || '';

              // Slim cungScores (only non-zero cungs)
              const cungScores = {};
              if (ls.cungScores) {
                for (const [k, v] of Object.entries(ls.cungScores)) {
                  if (v && Object.values(v).some(x => x > 0)) {
                    cungScores[k] = v;
                  }
                }
              }

              // Slim engine data
              const engineData = {
                palaces: ls.palaces?.map(p => ({
                  cungName: p.cungName,
                  diaChi: p.diaChi,
                  isMenh: p.isMenh || false,
                  isThan: p.isThan || false,
                  majorStars: (p.majorStars||[]).map(s => ({ ten: s.ten||s, trangThai: s.trangThai })),
                  stars: (p.stars||[]).slice(0,8).map(s => s.ten||s),
                })),
                canChiNam: ls.canChiNam,
                napAm: ls.napAm,
                napAmHanh: ls.napAmHanh,
                menhDC: ls.menhDC,
                thanDC: ls.thanDC,
              };

              const gt  = gioi === 'nu' ? 'nu' : 'nam';
              const slug = `${toSlug(canChi)}-${gt}-${namSinh}-gio-${toSlug(gioChi)}`;

              records.push({
                slug,
                can_chi:     canChi,
                gioi_tinh:   gioi,
                nam_sinh:    namSinh,
                thang_sinh:  THANG,
                ngay_sinh:   NGAY,
                gio_chi:     gioChi,
                gio_idx:     gioIdx,
                cung_menh:   cungMenh,
                chinh_tinh_menh: chinhTinh,
                nap_am:      ls.napAm || '',
                nap_am_hanh: ls.napAmHanh || '',
                cuc:         ls.cuc || '',
                am_duong:    ls.amDuong || '',
                cach_cuc:    ls.cachCuc || [],
                cung_scores: cungScores,
                dai_van:     (ls.daiVans||[]).slice(0,10).map(d => ({
                  startAge: d.startAge,
                  endAge:   d.endAge,
                  canChi:   d.canChi,
                  isCurrentDV: d.isCurrentDV || false,
                })),
                engine_data: engineData,
                seo_title:   `Lá Số Tử Vi ${canChi} ${gioi === 'nu' ? 'Nữ' : 'Nam'} ${namSinh} Giờ ${gioChi} — Tử Vi Minh Bảo`,
                seo_desc:    `Lá số tử vi ${canChi} ${gioi === 'nu' ? 'nữ' : 'nam'} năm ${namSinh} giờ ${gioChi}, cung mệnh ${cungMenh}, nạp âm ${ls.napAm||''}. Xem cách cục và phân tích 12 cung theo cổ pháp.`,
              });
            } catch(e) {
              console.warn(`Skip ${canChi} ${gioi} ${namSinh} ${gioChi}: ${e.message}`);
            }
          }
        }
      }
    }
  }

  console.log(`Generated ${records.length} records`);
  return records;
}

// ── Insert to Supabase ─────────────────────────────────────────────────────────
async function upsertBatch(records) {
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const res = await fetch(`${SB_URL}/rest/v1/laso_pregen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`Batch ${i}-${i+BATCH} failed: ${err}`);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted ${inserted}/${records.length}...`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`\nDone: ${inserted} records inserted`);
}

// ── Also update sitemap ────────────────────────────────────────────────────────
async function checkCount() {
  const res = await fetch(`${SB_URL}/rest/v1/laso_pregen?select=count`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Prefer': 'count=exact' },
  });
  const count = res.headers.get('content-range')?.split('/')[1] || '?';
  console.log(`Total in DB: ${count}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Starting pre-generation...');
  const records = await generateAll();
  await upsertBatch(records);
  await checkCount();
  console.log('Done!');
})();
