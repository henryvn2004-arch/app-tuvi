// scripts/tuvi-compat/analyze.mjs
// Parse slug + analyze 2 tuổi → factors + score
import { CAN, CHI, napAm, tuoiName } from './can-chi.mjs';
import { canRelation, chiRelation, napAmRelation } from './rules.mjs';

// ── Slug parser ────────────────────────────────────────────────────────────────
// Slug format: tuong-hop-{type}-tuoi-{canA}-{chiA}-va-{canB}-{chiB}
// Note: chi "ty" = Tý, "ti" = Tỵ
const CAN_KEYS = ['giap','at','binh','dinh','mau','ky','canh','tan','nham','quy'];
const CHI_KEYS = ['ty','suu','dan','mao','thin','ti','ngo','mui','than','dau','tuat','hoi'];

export function parseSlug(slug) {
  // Strip category prefix
  const m = slug.match(/^tuong-hop-(hon-nhan|lam-an)-tuoi-(.+?)-va-(.+)$/);
  if (!m) return null;
  const cat = m[1] === 'hon-nhan' ? 'honnhan' : 'lamam';

  const parseTuoi = (raw) => {
    // raw could be "at-dau", "binh-dan", "quy-ti", "giap-ty", etc.
    const parts = raw.split('-');
    if (parts.length !== 2) return null;
    const [c, ch] = parts;
    if (!CAN_KEYS.includes(c) || !CHI_KEYS.includes(ch)) return null;
    return { canSlug: c, chiSlug: ch };
  };

  const A = parseTuoi(m[2]);
  const B = parseTuoi(m[3]);
  if (!A || !B) return null;
  return { cat, A, B };
}

// ── Analyze: từ 2 tuổi sinh ra full factor object ──────────────────────────────
export function analyze(A, B) {
  const canA = CAN[A.canSlug], canB = CAN[B.canSlug];
  const chiA = CHI[A.chiSlug], chiB = CHI[B.chiSlug];
  const naA  = napAm(A.canSlug, A.chiSlug);
  const naB  = napAm(B.canSlug, B.chiSlug);

  const canRel  = canRelation(A.canSlug, B.canSlug);
  const chiRel  = chiRelation(A.chiSlug, B.chiSlug);
  const naRel   = napAmRelation(naA.napAmHanh, naB.napAmHanh);

  // ── Scoring ────────────────────────────────────────────────────────────
  let score = 50;
  // Thiên Can
  if (canRel.type === 'hop')         score += 15;
  else if (canRel.type === 'sinh')   score += 8;
  else if (canRel.type === 'tuong-dong') score += 5;
  else if (canRel.type === 'khac')   score -= 10;
  // Địa Chi
  if (chiRel.type === 'tam-hop')     score += 25;
  else if (chiRel.type === 'luc-hop') score += 20;
  else if (chiRel.type === 'chi-sinh') score += 10;
  else if (chiRel.type === 'chi-dong') score += 5;
  else if (chiRel.type === 'tu-xung')  score -= 25;
  else if (chiRel.type === 'luc-hai')  score -= 15;
  else if (chiRel.type === 'tam-hinh') score -= 15;
  else if (chiRel.type === 'tu-hinh')  score -= 10;
  else if (chiRel.type === 'chi-khac') score -= 8;
  // Nạp âm
  if (naRel.type === 'tuong-dong')   score += 10;
  else if (naRel.type === 'a-sinh-b' || naRel.type === 'b-sinh-a') score += 15;
  else if (naRel.type === 'a-khac-b' || naRel.type === 'b-khac-a') score -= 15;

  // Clamp + đẩy về 1 trong vài cluster để text không trùng
  score = Math.max(15, Math.min(95, score));

  // Verdict bucket
  let verdict;
  if (score >= 80) verdict = 'rat-hop';
  else if (score >= 65) verdict = 'hop';
  else if (score >= 50) verdict = 'kha';
  else if (score >= 35) verdict = 'trung-binh';
  else verdict = 'khong-hop';

  return {
    A, B, canA, canB, chiA, chiB, naA, naB,
    canRel, chiRel, naRel,
    score, verdict,
    tuoiAName: tuoiName(A.canSlug, A.chiSlug),
    tuoiBName: tuoiName(B.canSlug, B.chiSlug),
  };
}

// ── Deterministic hash (cho variant selection) ─────────────────────────────────
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Pick variant deterministically từ array dựa trên seed + section
export function pick(arr, seed, salt = 0) {
  if (!arr || arr.length === 0) return '';
  return arr[(seed + salt) % arr.length];
}
