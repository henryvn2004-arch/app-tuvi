// TODO: Port full logic from api/upload-laso-image.js — see MIGRATION.md
export const maxDuration = 60;
import { NextRequest } from 'next/server';
import { err, options } from '@/lib/cors';
export async function OPTIONS() { return options(); }
export async function GET(request: NextRequest) {
  void request;
  return err('Not yet migrated — keep api/upload-laso-image.js active', 501);
}
export async function POST(request: NextRequest) {
  void request;
  return err('Not yet migrated — keep api/upload-laso-image.js active', 501);
}
