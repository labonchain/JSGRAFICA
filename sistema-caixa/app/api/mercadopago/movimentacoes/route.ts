export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { buscarPagamentos, getConfigMercadoPago, diasParaExpirarToken } from '@/lib/mercadopago';
import { limitesDiaCaixaUTC } from '@/lib/supabase';

// Demanda 084 — saldo/movimentações da conta Mercado Pago, montado a partir
// de `GET /v1/payments/search` (síncrono, confirmado em sandbox) — não dos
// relatórios "Dinheiro em conta"/"Liberações" (assíncronos, fora do
// escopo). Só Admin acessa (PDV não vê essa tela, mesma decisão da 077/096).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Demanda 264: `dataDia` (DD-MM-AA, mesma convenção do resto do sistema)
    // pra ver 1 dia específico — tem prioridade sobre `dias` quando informado.
    const dataDiaParam = searchParams.get('dataDia');
    const dias = Math.min(Number(searchParams.get('dias')) || 30, 180);

    let inicio: Date, fim: Date;
    if (dataDiaParam) {
      const limites = limitesDiaCaixaUTC(dataDiaParam);
      if (!limites) return NextResponse.json({ error: 'dataDia inválida (esperado DD-MM-AA)' }, { status: 400 });
      inicio = new Date(limites.inicio);
      fim    = new Date(limites.fim);
    } else {
      fim    = new Date();
      inicio = new Date(fim.getTime() - dias * 24 * 60 * 60 * 1000);
    }

    const [config, busca] = await Promise.all([
      getConfigMercadoPago(),
      // Dia específico busca com limite maior (100, mesmo teto usado nos
      // scripts de investigação) — janela de 1 dia raramente passa disso,
      // diferente das janelas de 7/30/90 dias que já usavam 50 por padrão.
      buscarPagamentos({ dataInicio: inicio.toISOString(), dataFim: fim.toISOString(), limit: dataDiaParam ? 100 : 50 }),
    ]);

    const movimentacoes = busca.results.map(p => ({
      id: p.id,
      status: p.status,
      statusDetail: p.status_detail,
      dataCriacao: p.date_created,
      dataAprovacao: p.date_approved,
      dataLiberacao: p.money_release_date,
      statusLiberacao: p.money_release_status,
      metodoPagamento: p.payment_method_id,
      tipoPagamento: p.payment_type_id,
      valorBruto: p.transaction_amount,
      valorLiquido: p.transaction_details?.net_received_amount ?? null,
      referenciaExterna: p.external_reference,
    }));

    const aprovados = movimentacoes.filter(m => m.status === 'approved');
    const saldoBruto   = aprovados.reduce((acc, m) => acc + m.valorBruto, 0);
    const saldoLiquido = aprovados.reduce((acc, m) => acc + (m.valorLiquido ?? m.valorBruto), 0);
    // Demanda 264: taxa de cada movimentação é a diferença bruto−líquido;
    // some só quando `valorLiquido` veio de verdade (senão a diferença seria
    // sempre 0 por causa do fallback `?? m.valorBruto` acima, escondendo que
    // o dado não veio, não que a taxa foi zero).
    const totalTaxas = aprovados.reduce((acc, m) => acc + (m.valorLiquido !== null ? m.valorBruto - m.valorLiquido : 0), 0);

    return NextResponse.json({
      ambiente: config.ambiente,
      periodo: { dias: dataDiaParam ? 1 : dias, dataDia: dataDiaParam || null, inicio: inicio.toISOString(), fim: fim.toISOString() },
      totalMovimentacoes: busca.paging.total,
      saldoBruto,
      saldoLiquido,
      totalTaxas,
      movimentacoes,
      token: {
        criadoEm: config.tokenCriadoEm,
        diasParaExpirar: diasParaExpirarToken(config.tokenCriadoEm),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar movimentações do Mercado Pago' }, { status: 500 });
  }
}
