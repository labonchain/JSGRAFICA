export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getQRCode } from '@/lib/zapi';

export async function GET() {
  try {
    const data = await getQRCode();
    return NextResponse.json({ qrcode: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
