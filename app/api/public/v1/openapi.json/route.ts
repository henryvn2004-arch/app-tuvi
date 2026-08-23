// app/api/public/v1/openapi.json/route.ts
// ============================================================
// Mô tả OpenAPI 3.1 cho API công khai.
//
// Có mặt vì hai lý do đo được, không phải vì "cho đủ bộ":
//  1. `apis.guru` và vài danh bạ khác CHỈ nhận API có spec máy đọc được —
//     không có file này thì mấy cửa đó đóng, không cách nào lách.
//  2. Spec là thứ công cụ sinh SDK/Postman đọc được, nên nó hạ chi phí tích
//     hợp của người lạ xuống gần bằng 0 — đó mới là điều kiện để họ dùng.
//
// 🔑 Trần dải ngày và biên năm NỘI SUY từ `lib/api/public.ts`, không gõ lại:
// spec nói một đằng mà API làm một nẻo là kiểu nói dối tệ nhất — máy đọc spec
// rồi sinh code sai mà không ai đọc lại bằng mắt.
// ============================================================
export const revalidate = 86400;

import { NextResponse } from 'next/server';
import { CORS, MAX_RANGE_DAYS, MIN_YEAR, MAX_YEAR } from '@/lib/api/public';
import { SEO_BASE } from '@/lib/seo/entity';

const DATE_PARAMS = [
  {
    name: 'date', in: 'query', required: false,
    description: `A single date (YYYY-MM-DD), between ${MIN_YEAR} and ${MAX_YEAR}. Defaults to today in Vietnam time (UTC+7).`,
    schema: { type: 'string', format: 'date' },
  },
  {
    name: 'from', in: 'query', required: false,
    description: `Start of a date range. Must be used together with \`to\`. Maximum ${MAX_RANGE_DAYS} days per request.`,
    schema: { type: 'string', format: 'date' },
  },
  {
    name: 'to', in: 'query', required: false,
    description: 'End of a date range (inclusive). Must be used together with `from`.',
    schema: { type: 'string', format: 'date' },
  },
];

const ERROR_RESPONSE = {
  description: 'Invalid request. Match on `error.code`, not on the message text.',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                enum: ['bad_date', 'bad_range', 'range_too_long', 'missing_param', 'conflicting_params', 'engine_error'],
              },
              message: { type: 'string' },
            },
            required: ['code', 'message'],
          },
        },
        required: ['ok', 'error'],
      },
    },
  },
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Vietnamese Lunar Calendar API',
      version: '1.0.0',
      description:
        'Free, no-key REST API for the Vietnamese lunar calendar: Gregorian↔lunar conversion, sexagenary cycle (can chi), zodiac, nap-am element, auspicious hours, and traditional day divination. CORS enabled. Attribution appreciated but not required.',
      contact: { name: 'Tử Vi Minh Bảo', url: `${SEO_BASE}/api-docs`, email: 'contact@tuviminhbao.com' },
      license: { name: 'Free for personal and commercial use', url: `${SEO_BASE}/api-docs` },
    },
    servers: [{ url: SEO_BASE }],
    paths: {
      '/api/public/v1/lunar': {
        get: {
          summary: 'Lunar date, sexagenary cycle, zodiac and auspicious hours',
          description:
            'Converts a Gregorian date to the Vietnamese lunar calendar and returns the sexagenary day/month/year, zodiac animal, nap-am element, and the 12 two-hour periods marked auspicious or not.',
          operationId: 'getLunarDate',
          tags: ['calendar'],
          parameters: DATE_PARAMS,
          responses: {
            200: {
              description: 'One day, or `{ days: [...] }` when a range was requested.',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            400: ERROR_RESPONSE,
          },
        },
      },
      '/api/public/v1/almanac': {
        get: {
          summary: 'Traditional day divination and activity scores',
          description:
            'Returns the 12 "truc" officers, 28 lunar mansions, day star, taboo days, and a 0–10 score with reasons for 10 kinds of activity (wedding, groundbreaking, business opening, travel, and so on). Cultural reference, not advice.',
          operationId: 'getAlmanacDay',
          tags: ['divination'],
          parameters: DATE_PARAMS,
          responses: {
            200: {
              description: 'One day, or `{ days: [...] }` when a range was requested.',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            400: ERROR_RESPONSE,
          },
        },
      },
    },
    tags: [
      { name: 'calendar', description: 'Calendar facts — deterministic and uncontroversial.' },
      { name: 'divination', description: 'Traditional judgement layer — one school of thought.' },
    ],
  };

  return NextResponse.json(spec, {
    headers: { ...CORS, 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
