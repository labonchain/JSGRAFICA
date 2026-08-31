export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse, after } from 'next/server';
import { formatarDiaCaixa } from '@/lib/supabase';
import {
  supabaseAdmin, getSaldoAnterior, getResumoDia,
  getResumoPorFormaPagamento, getAberturaOperador, getTotalDinheiroRecebidoOperador,
  getTotalSaidasOperador, getStatusFechamentoHoje, getHistoricoFechamento,
  getFechamentosOperadoresHoje,
} from '@/lib/supabase-admin';
import { saldoMercadoPagoDoDia } from '@/lib/mercadopago';
import { conciliarDia } from '@/lib/conciliacao';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const operador = searchParams.get('operador') || undefined;

    const dataDia = formatarDiaCaixa();

    if (operador) {
      // Demanda 074 (correção obrigatória do achado 080): o "esperado" pro
      // caixa físico do operador é só a parte em dinheiro que passou pela
      // mão dele — abertura contada + dinheiro recebido − dinheiro pago em
      // saídas. Nunca o total geral (que inclui cartão/Pix/pendente, que
      // não passam fisicamente por ninguém).
      const [abertura, dinheiroRecebido, saidasOperador] = await Promise.all([
        getAberturaOperador(dataDia, operador),
        getTotalDinheiroRecebidoOperador(dataDia, operador),
        getTotalSaidasOperador(dataDia, operador),
      ]);
      const aberturaContada = abertura?.total_contado ?? 0;
      const esperado = Math.round((aberturaContada + dinheiroRecebido - saidasOperador) * 100) / 100;

      return NextResponse.json({
        nomeAba: dataDia,
        operador,
        abertura,
        aberturaContada,
        totalEntradas: dinheiroRecebido,
        totalSaidas: saidasOperador,
        resultadoDia: dinheiroRecebido - saidasOperador,
        saldoAcumulado: esperado,
        porFormaPagamento: null,
      });
    }

    const { totalEntradas, totalSaidas } = await getResumoDia(dataDia);
    const saldoAnterior = await getSaldoAnterior();
    const resultadoDia  = totalEntradas - totalSaidas;
    const saldoAcumulado = resultadoDia + saldoAnterior;
    const [porFormaPagamento, statusFechamentoHoje, historico, fechamentosOperadores, saldoMercadoPago] = await Promise.all([
      getResumoPorFormaPagamento(dataDia),
      getStatusFechamentoHoje(dataDia),
      getHistoricoFechamento(10),
      getFechamentosOperadoresHoje(dataDia),
      // Demanda 127: saldo Mercado Pago do dia, automático (integração 084)
      // — se a integração falhar (token expirado, MP fora do ar), vira null
      // e a tela abre o campo pra preenchimento manual em vez de travar o
      // fechamento com um zero read-only errado.
      saldoMercadoPagoDoDia(dataDia).catch(e => {
        console.error('[127] Falha ao buscar saldo Mercado Pago do dia', e);
        return null;
      }),
    ]);

    return NextResponse.json({
      nomeAba: dataDia,
      operador: null,
      abertura: null,
      saldoAnterior,
      totalEntradas,
      totalSaidas,
      resultadoDia,
      saldoAcumulado,
      porFormaPagamento,
      // Demanda 099: selo aberto/fechado + histórico dos últimos dias.
      fechadoHoje: statusFechamentoHoje.fechado,
      fechadoEmHoje: statusFechamentoHoje.fechadoEm,
      historico,
      // Demanda 121: quanto Zu/Gabi já fecharam de dinheiro/moedas de verdade
      // hoje — usado pra pré-preencher a Contagem física geral do Admin.
      fechamentosOperadores,
      // Demanda 127: líquido recebido hoje na conta Mercado Pago (automático,
      // read-only na tela) — null quando a integração falhou.
      saldoMercadoPago,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar dados de fechamento' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      bancos, dinheiro, moedas, operador,
      saldoMercadoPago, saldoCaixaEconomica, saldoStone, saldoRecargapay,
    } = await req.json();
    const dataDia = formatarDiaCaixa();

    // Demanda 127: o fechamento geral manda as 4 contas separadas — `bancos`
    // vira a SOMA delas (compatibilidade com todo o histórico e qualquer
    // leitura antiga). Se nenhum dos 4 campos veio (fechamento por operador,
    // ou chamada antiga), `bancos` do corpo continua valendo como antes.
    const temContasNomeadas = [saldoMercadoPago, saldoCaixaEconomica, saldoStone, saldoRecargapay]
      .some(v => v !== undefined && v !== null);
    const bancosFinal = temContasNomeadas
      ? Math.round(((saldoMercadoPago || 0) + (saldoCaixaEconomica || 0) + (saldoStone || 0) + (saldoRecargapay || 0)) * 100) / 100
      : (bancos || 0);

    const totalFisico = Math.round((bancosFinal + (dinheiro || 0) + (moedas || 0)) * 100) / 100;

    let totalEntradas: number, totalSaidas: number, saldoAnterior: number, saldoAcumulado: number, divergencia: number;

    if (operador) {
      // Demanda 074 (correção obrigatória do achado 080): divergência
      // compara o físico contado só contra a parte em dinheiro que passou
      // pela mão desse operador (abertura contada + dinheiro recebido −
      // dinheiro pago em saídas) — nunca o total geral (cartão/Pix/pendente
      // não passam fisicamente pela gaveta de ninguém).
      const [abertura, dinheiroRecebido, saidasOperador] = await Promise.all([
        getAberturaOperador(dataDia, operador),
        getTotalDinheiroRecebidoOperador(dataDia, operador),
        getTotalSaidasOperador(dataDia, operador),
      ]);
      totalEntradas  = dinheiroRecebido;
      totalSaidas    = saidasOperador;
      saldoAnterior  = abertura?.total_contado ?? 0;
      saldoAcumulado = Math.round((saldoAnterior + totalEntradas - totalSaidas) * 100) / 100;
    } else {
      // Demanda 104: repasse de recarga (e qualquer produto marcado) deixou
      // de ser gerado aqui — agora é por-transação, na hora da venda
      // (`gerarSaidaAutomaticaNaVenda`, chamada em app/api/pedidos/route.ts
      // quando o pedido vira "entregue"). Substitui o mecanismo agregado da
      // 079, que rodava só neste fechamento geral.
      const resumo = await getResumoDia(dataDia);
      totalEntradas = resumo.totalEntradas;
      totalSaidas   = resumo.totalSaidas;
      saldoAnterior = await getSaldoAnterior();
      saldoAcumulado = Math.round((totalEntradas - totalSaidas + saldoAnterior) * 100) / 100;
    }

    divergencia = Math.round((totalFisico - saldoAcumulado) * 100) / 100;

    const { error } = await supabaseAdmin
      .from('jsgrafica_fechamento')
      .upsert({
        data_dia:        dataDia,
        fechado_por:     operador || 'Sistema',
        saldo_anterior:  saldoAnterior,
        total_entradas:  totalEntradas,
        total_saidas:    totalSaidas,
        resultado_dia:   totalEntradas - totalSaidas,
        saldo_acumulado: saldoAcumulado,
        bancos:          bancosFinal,
        // Demanda 127: as 4 contas separadas — null quando não vieram
        // (fechamento por operador ou linha antiga), rastreabilidade só no
        // fechamento geral novo.
        saldo_mercadopago:     temContasNomeadas ? (saldoMercadoPago     || 0) : null,
        saldo_caixa_economica: temContasNomeadas ? (saldoCaixaEconomica || 0) : null,
        saldo_stone:           temContasNomeadas ? (saldoStone           || 0) : null,
        saldo_recargapay:      temContasNomeadas ? (saldoRecargapay      || 0) : null,
        dinheiro:        dinheiro || 0,
        moedas:          moedas || 0,
        total_fisico:    totalFisico,
        divergencia,
        fechado_em:      new Date().toISOString(),
      }, { onConflict: 'data_dia,fechado_por' });

    if (error) throw error;

    // Demandas 227/228: conciliação automática (matching Mercado Pago +
    // gap agregado das 4 contas) — só faz sentido no fechamento "Sistema"
    // com as 4 contas nomeadas (é aí que `saldo_mercadopago`/etc. ficam
    // disponíveis pra calcular a variação informada). Roda depois da
    // resposta (`after()`, mesmo padrão de `conferirCobrancasPixPendentes`
    // em app/api/pedidos/route.ts) — nunca trava o fechamento.
    if (!operador && temContasNomeadas) {
      after(async () => {
        try { await conciliarDia(dataDia); }
        catch (e) { console.error('[227/228] Falha na conciliação automática do dia', e); }
      });
    }

    return NextResponse.json({
      success: true,
      nomeAba: dataDia,
      saldoAcumulado,
      totalFisico,
      divergencia,
      fechadoEm: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao fechar caixa' }, { status: 500 });
  }
}
