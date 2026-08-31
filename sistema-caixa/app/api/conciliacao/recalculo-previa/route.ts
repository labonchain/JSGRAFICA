export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { gerarPreviaRecalculo } from '@/lib/supabase-admin';

// Demanda 231 — modo prévia do recálculo de fechamento "Sistema"
// desatualizado. Só leitura: nunca escreve em jsgrafica_fechamento nem em
// jsgrafica_conciliacao_pendencias. Mostra a cascata inteira (dia afetado +
// todos os seguintes até o último fechamento "Sistema" existente).
export async function GET() {
  try {
    const previa = await gerarPreviaRecalculo();
    return NextResponse.json({ previa });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao gerar prévia do recálculo' }, { status: 500 });
  }
}
