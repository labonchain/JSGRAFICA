export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa } from '@/lib/supabase';
import { getAberturaOperador, salvarAberturaOperador } from '@/lib/supabase-admin';

// Demanda 074: abertura de caixa por operador — contagem física do início
// do dia, 1 linha por operador por dia (jsgrafica_abertura_caixa).
export async function GET(req: NextRequest) {
  try {
    const operador = req.nextUrl.searchParams.get('operador');
    if (!operador) return NextResponse.json({ error: 'operador é obrigatório' }, { status: 400 });

    const dataDia = formatarDiaCaixa();
    const abertura = await getAberturaOperador(dataDia, operador);
    return NextResponse.json({ nomeAba: dataDia, abertura });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar abertura de caixa' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { operador, dinheiro, moedas } = await req.json();
    if (!operador) return NextResponse.json({ error: 'operador é obrigatório' }, { status: 400 });

    const dataDia = formatarDiaCaixa();
    const abertura = await salvarAberturaOperador(dataDia, operador, Number(dinheiro) || 0, Number(moedas) || 0);
    return NextResponse.json({ success: true, nomeAba: dataDia, abertura });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar abertura de caixa' }, { status: 500 });
  }
}
