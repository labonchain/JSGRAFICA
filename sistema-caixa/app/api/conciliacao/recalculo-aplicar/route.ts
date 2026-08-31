export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { aplicarRecalculo } from '@/lib/supabase-admin';

// Demanda 231 — modo aplicar do recálculo de fechamento "Sistema"
// desatualizado. Recebe de volta o "fingerprint" exato da prévia que o
// Admin viu e confirmou (quais pendências foram contadas em cada dia) — só
// aplica se, ao re-derivar o delta na hora, o conjunto ainda bater com o
// que a prévia mostrou. Ação explícita e separada da prévia, nunca
// automática (risco explícito da demanda, mesmo espírito das 217/223).
export async function POST(req: NextRequest) {
  try {
    const { diasEsperados } = await req.json();
    if (!Array.isArray(diasEsperados) || diasEsperados.length === 0) {
      return NextResponse.json({ error: 'diasEsperados é obrigatório' }, { status: 400 });
    }
    for (const d of diasEsperados) {
      if (!d?.dataDia || !Array.isArray(d.pendenciaIds)) {
        return NextResponse.json({ error: 'Cada dia precisa de dataDia e pendenciaIds' }, { status: 400 });
      }
    }

    const { resultados, paradoCedo } = await aplicarRecalculo(diasEsperados);
    return NextResponse.json({ resultados, paradoCedo });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao aplicar recálculo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
