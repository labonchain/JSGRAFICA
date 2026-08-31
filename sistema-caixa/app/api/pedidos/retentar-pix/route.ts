export const dynamic = 'force-dynamic';
// Demanda 198/300: mesma margem das outras rotas que chamam criarCobrancaPix.
export const maxDuration = 25;

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, gravarRascunhosPedido, registrarFalhaCobrancaPix } from '@/lib/supabase-admin';
import { criarCobrancaPix } from '@/lib/mercadopago';
import { montarTrechoPix } from '@/lib/pedidos';

// Demanda 300: pedido com Pix escolhido que nasceu com o telefone do contato
// em formato "@lid" (WhatsApp ainda não tinha resolvido o número real) nunca
// tenta gerar o Pix (app/api/pedidos/route.ts pula o bloco inteiro nesse
// caso, achado da demanda 238) — mesmo depois do telefone ser corrigido
// (jsgrafica_backfill_telefone_lid, agora a cada 15min), o pedido fica preso
// pra sempre, porque nada retentava. Esta rota é o retry: chamada (a)
// automaticamente por um trigger no banco assim que o telefone de um pedido
// elegível é corrigido (via pg_net, sem esperar ninguém notar), e (b)
// manualmente pelo botão "Gerar Pix" em TelaPedidos.tsx (rede de segurança
// pro caso sem correção automática possível, ex. telefone sem número
// recuperável no log).
//
// Reaproveita criarCobrancaPix (lib/mercadopago.ts) sem duplicar — mesma
// função que app/api/pedidos/route.ts e app/api/mercadopago/cobranca/route.ts
// já usam. Escopo desta demanda: só pedido AVULSO (venda_id null) — os 4
// casos reais que motivaram a demanda (ped-3065/3066/3073/3074) são todos
// avulsos; replicar aqui a lógica de agrupamento/recarga de múltiplos itens
// (076/147/179) sem um caso real pra validar seria arriscado. Pedido com
// venda_id fica de fora, reportado como limite conhecido no relato.
export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json();
    if (!pedidoId) return NextResponse.json({ error: 'pedidoId é obrigatório' }, { status: 400 });

    const { data: pedido, error: erroBusca } = await supabaseAdmin
      .from('jsgrafica_pedidos')
      .select('id, telefone, venda_id, forma_pagamento_escolhida, pagamento_confirmado, mp_order_id, status, valor_final')
      .eq('id', pedidoId)
      .single();
    if (erroBusca || !pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    // Revalida tudo aqui, sempre — nunca confia em quem chamou (o gatilho do
    // banco ou o botão manual), mesmo princípio de sempre neste sistema.
    if (pedido.forma_pagamento_escolhida !== 'pix') {
      return NextResponse.json({ error: 'Este pedido não tem Pix como forma de pagamento escolhida' }, { status: 400 });
    }
    if (pedido.mp_order_id) {
      return NextResponse.json({ success: true, jaExistia: true, orderId: pedido.mp_order_id });
    }
    if (pedido.pagamento_confirmado) {
      return NextResponse.json({ error: 'Este pedido já está pago' }, { status: 400 });
    }
    if (pedido.status === 'cancelado') {
      return NextResponse.json({ error: 'Este pedido está cancelado' }, { status: 400 });
    }
    if (pedido.venda_id) {
      return NextResponse.json({ error: 'Pedido faz parte de uma venda com múltiplos itens — gere o Pix combinando com o cliente (fora do escopo automático desta correção, ver demanda 300)' }, { status: 400 });
    }
    if (!/^\d+$/.test(pedido.telefone || '')) {
      return NextResponse.json({ error: 'O telefone deste pedido ainda não é um número válido (provável @lid não resolvido)' }, { status: 400 });
    }
    const valor = Number(pedido.valor_final) || 0;
    if (valor <= 0) return NextResponse.json({ error: 'Pedido sem valor a cobrar' }, { status: 400 });

    const inicioTentativa = Date.now();
    let cobranca;
    try {
      cobranca = await criarCobrancaPix({
        valor,
        externalReference: pedido.id,
        telefone: pedido.telefone,
      });
    } catch (e) {
      console.error('[300] Falha ao retentar cobrança Pix', e);
      await registrarFalhaCobrancaPix({
        origem:            'pedidos',
        pedidoId:          pedido.id,
        telefone:          pedido.telefone,
        valor,
        erroMensagem:      e instanceof Error ? e.message : String(e),
        tempoDecorridoMs:  Date.now() - inicioTentativa,
        payloadTentativa:  { externalReference: pedido.id, valor, telefone: pedido.telefone, retentativa: true },
      });
      return NextResponse.json({ error: 'Não foi possível gerar a cobrança Pix' }, { status: 500 });
    }

    // Idempotência: só grava/avisa se ESTE processo venceu a corrida (guarda
    // atômica via `.is('mp_order_id', null)` no WHERE do UPDATE) — cobre o
    // caso do gatilho automático e o botão manual disparando quase juntos.
    // criarCobrancaPix já é idempotente do lado do Mercado Pago
    // (X-Idempotency-Key por pedido.id), então mesmo 2 chamadas concorrentes
    // nunca geram 2 cobranças reais — isto só evita 2 rascunhos duplicados.
    const { data: vinculado, error: erroVinculo } = await supabaseAdmin
      .from('jsgrafica_pedidos')
      .update({
        mp_order_id:      cobranca.orderId,
        mp_pix_qr_code:   cobranca.qrCode,
        mp_pix_expira_at: cobranca.expiraEm,
      })
      .eq('id', pedido.id)
      .is('mp_order_id', null)
      .select('id')
      .maybeSingle();
    if (erroVinculo) throw erroVinculo;

    if (vinculado) {
      // Rascunho de aviso (mesmo padrão 124/141) — só quando este processo
      // realmente vinculou a cobrança nova, senão duplicaria o aviso.
      const mensagem = montarTrechoPix(
        'Desculpa a demora — o Pix do seu pedido já está pronto 😊',
        valor, null, null, cobranca.qrCode,
      );
      await gravarRascunhosPedido(pedido.telefone, [mensagem]);
    }

    return NextResponse.json({
      success: true,
      jaExistia: !vinculado,
      orderId: cobranca.orderId,
      qrCode: cobranca.qrCode,
      qrCodeBase64: cobranca.qrCodeBase64,
      valor,
      expiraEm: cobranca.expiraEm,
    });
  } catch (error) {
    console.error('[300] Erro ao retentar Pix', error);
    return NextResponse.json({ error: 'Erro ao retentar Pix' }, { status: 500 });
  }
}
