export const dynamic = 'force-dynamic';

// ── Demanda 157: o dia de um pedido já foi fechado? ──
// Usado pelo cancelamento de pedido ENTREGUE (TelaPedidos): cancelar pedido
// de dia já fechado não corrige o fechamento antigo (é histórico) — só some
// do recálculo dali pra frente, o que cria divergência nova naquele dia se
// alguém conferir depois. Esta rota só responde "fechado ou não" pro aviso;
// quem investiga a divergência é o Diagnóstico de Fechamento (149-153).
// Recebe o timestamp (`ts`, ISO — ex. data_entregue_at do pedido) e converte
// pro dia do caixa no servidor (fuso de Recife, mesma régua de tudo).

import { NextRequest, NextResponse } from 'next/server';
import { timestampParaDiaCaixa, formatarDiaCaixa } from '@/lib/supabase';
import { getStatusFechamentoHoje } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const ts = req.nextUrl.searchParams.get('ts');
    if (ts && Number.isNaN(Date.parse(ts))) {
      return NextResponse.json({ error: 'Timestamp inválido' }, { status: 400 });
    }
    const dataDia = ts ? timestampParaDiaCaixa(ts) : formatarDiaCaixa();
    // getStatusFechamentoHoje já checa fechamento GERAL de qualquer data_dia
    // (o "Hoje" do nome é só histórico da 099).
    const { fechado, fechadoEm } = await getStatusFechamentoHoje(dataDia);
    return NextResponse.json({ dataDia, fechado, fechadoEm });
  } catch (error) {
    console.error('[157] Erro ao checar dia fechado', error);
    return NextResponse.json({ error: 'Erro ao checar o fechamento do dia' }, { status: 500 });
  }
}
