export const dynamic = 'force-dynamic';

// ── Demandas 149/150 — Diagnóstico de Fechamento (Camadas A+B) ──
// Casca HTTP fina: coleta + sinais moram em lib/diagnostico.ts desde a 152
// (o endpoint de resumo narrativo reaproveita a mesma função).

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa, parseDiaCaixa } from '@/lib/supabase';
import { montarDiagnosticoDia } from '@/lib/diagnostico';

export async function GET(req: NextRequest) {
  try {
    const dataDia = req.nextUrl.searchParams.get('data') || formatarDiaCaixa();
    if (!parseDiaCaixa(dataDia)) {
      return NextResponse.json({ error: 'Data inválida — use DD-MM-AA (ex.: 07-07-26)' }, { status: 400 });
    }
    return NextResponse.json(await montarDiagnosticoDia(dataDia));
  } catch (error) {
    console.error('[149] Erro no diagnóstico de fechamento', error);
    return NextResponse.json({ error: 'Erro ao montar o diagnóstico do dia' }, { status: 500 });
  }
}
