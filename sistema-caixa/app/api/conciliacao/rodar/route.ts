export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa } from '@/lib/supabase';
import { conciliarDia } from '@/lib/conciliacao';

// Demandas 227/228 — "conciliar de novo" sob demanda (desenho 225, seção 4):
// mesma rotina do gatilho automático do fechamento "Sistema"
// (app/api/fechamento/route.ts), disponível pra rodar pra um dia específico
// sem precisar refechar o caixa. UI de botão fica pra demanda 229 (fora de
// escopo aqui) — a rota já existe pronta pra ser chamada.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dataDia = typeof body?.dataDia === 'string' && body.dataDia ? body.dataDia : formatarDiaCaixa();

    const resultado = await conciliarDia(dataDia);
    return NextResponse.json({ success: true, dataDia, ...resultado });
  } catch (error) {
    console.error('[227/228] Falha ao rodar conciliação sob demanda', error);
    return NextResponse.json({ error: 'Erro ao rodar conciliação' }, { status: 500 });
  }
}
