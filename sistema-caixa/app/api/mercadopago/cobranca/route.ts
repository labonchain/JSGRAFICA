export const dynamic = 'force-dynamic';
// Demanda 198: mesmo motivo do app/api/pedidos/route.ts — teto explícito
// pra sobrar margem além da nova janela de espera do QR em mercadopago.ts.
export const maxDuration = 25;

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getPixRecargaPay, idsProdutosRecarga, registrarFalhaCobrancaPix } from '@/lib/supabase-admin';
import { criarCobrancaPix, buscarOrderPorId, confirmarPedidosPagosPorOrder, marcarPedidosEstornadosPorOrder } from '@/lib/mercadopago';

// Demanda 141 (Fase 3) — cobrança Pix pro BALCÃO. O Inbox cria a cobrança
// dentro do próprio POST /api/pedidos (precisa do copia-e-cola pra montar o
// rascunho no mesmo ciclo, 124/141); o balcão precisa do QR DE VOLTA na UI
// pra mostrar na tela nova — por isso este endpoint dedicado, chamado depois
// que os itens da venda já foram gravados. Mesma `criarCobrancaPix` da 124,
// nada duplicado.
export async function POST(req: NextRequest) {
  try {
    const { pedidoId, vendaId, telefone } = await req.json();
    if (!pedidoId && !vendaId) {
      return NextResponse.json({ error: 'Informe pedidoId ou vendaId' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('jsgrafica_pedidos')
      .select('id, servico_id, valor_final, forma_pagamento_escolhida, pagamento_confirmado, mp_order_id, mp_pix_qr_code, mp_pix_expira_at, status');
    query = vendaId ? query.eq('venda_id', vendaId) : query.eq('id', pedidoId);
    const { data: pedidos } = await query;
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ error: 'Pedido/venda não encontrado' }, { status: 404 });
    }

    // Demanda 301 (achado real da 300, lendo o código pra decidir se
    // reaproveitava esta rota): faltava a mesma checagem que
    // app/api/pedidos/route.ts e app/api/pedidos/retentar-pix/route.ts já
    // fazem — sem isso, dava pra gerar um Pix real pra uma venda JÁ
    // cancelada chamando esta rota de novo depois do cancelamento.
    // `.some()` (não `.every()`) de propósito: 1 item cancelado já é motivo
    // pra recusar a cobrança inteira, mesmo que os outros itens da venda
    // continuem ativos (cancelar 1 venda cancela todos os itens juntos, no
    // fluxo normal — ver PATCH /api/pedidos — então "algum cancelado" já é
    // sinal forte de que a venda não deveria mais gerar cobrança).
    if (pedidos.some(p => p.status === 'cancelado')) {
      return NextResponse.json({ error: 'Este pedido/venda está cancelado' }, { status: 400 });
    }

    // Validações server-side: só gera cobrança pra venda onde o Pix foi
    // ESCOLHIDO (campo da Fase 1) e ainda não está paga — nunca confia só
    // no que a UI mandou.
    if (!pedidos.every(p => p.forma_pagamento_escolhida === 'pix')) {
      return NextResponse.json({ error: 'Esta venda não tem Pix como forma de pagamento escolhida' }, { status: 400 });
    }
    if (pedidos.every(p => p.pagamento_confirmado)) {
      return NextResponse.json({ error: 'Esta venda já está paga' }, { status: 400 });
    }

    // Demanda 147: recarga VEM/celular nunca gera cobrança no Mercado Pago —
    // o dinheiro precisa cair no RecargaPay. Venda 100% recarga devolve o
    // QR/chave ESTÁTICOS (sem order, sem vínculo, confirmação manual pelo
    // botão do popup); venda mista segue pro MP cobrindo SÓ os não-recarga.
    const setRecarga = await idsProdutosRecarga(pedidos.map(p => p.servico_id));
    const pedidosNaoRecarga = pedidos.filter(p => !p.servico_id || !setRecarga.has(p.servico_id));
    if (pedidosNaoRecarga.length === 0) {
      const rp = await getPixRecargaPay();
      if (!rp) {
        return NextResponse.json({ error: 'Configuração Pix do RecargaPay não encontrada' }, { status: 500 });
      }
      const valorRecarga = Math.round(pedidos.reduce((a, p) => a + (Number(p.valor_final) || 0), 0) * 100) / 100;
      return NextResponse.json({
        recargaPay: true,
        orderId: '',
        qrCode: rp.payload,
        qrCodeBase64: rp.qrBase64,
        valor: valorRecarga,
        chave: rp.chave,
        titular: rp.titular,
      });
    }

    // Demanda 179: venda MISTA (recarga + item comum) — a cobrança MP cobre
    // só os não-recarga (147), mas antes a parte da recarga ficava SEM
    // nenhuma instrução nem caminho de confirmação (o popup só mostrava o QR
    // do MP). Agora a resposta leva junto o bloco `recarga` (chave/QR
    // estáticos do RecargaPay + valor + ids dos itens ainda não pagos) pra
    // UI mostrar as DUAS instruções e confirmar a recarga manualmente.
    const pedidosRecargaPendentes = pedidos.filter(p =>
      p.servico_id && setRecarga.has(p.servico_id) && !p.pagamento_confirmado);
    let recarga: {
      valor: number; pedidoIds: string[];
      chave: string | null; titular: string | null;
      qrCode: string | null; qrCodeBase64: string | null;
    } | null = null;
    if (pedidosRecargaPendentes.length > 0) {
      const rp = await getPixRecargaPay();
      if (!rp) console.error('[179] Config Pix do RecargaPay ausente — venda mista fica sem instrução da recarga');
      recarga = {
        valor: Math.round(pedidosRecargaPendentes.reduce((a, p) => a + (Number(p.valor_final) || 0), 0) * 100) / 100,
        pedidoIds: pedidosRecargaPendentes.map(p => p.id),
        chave: rp?.chave ?? null,
        titular: rp?.titular ?? null,
        qrCode: rp?.payload ?? null,
        qrCodeBase64: rp?.qrBase64 ?? null,
      };
    }

    // Idempotência de aplicação: se a venda já tem uma cobrança viva (não
    // expirada), devolve ela em vez de criar outra — chamar 2x não duplica.
    // Demanda 147: valor e vínculo consideram só os itens não-recarga (numa
    // venda sem recarga, é a lista inteira — comportamento da 141 intocado).
    const valor = Math.round(pedidosNaoRecarga.reduce((a, p) => a + (Number(p.valor_final) || 0), 0) * 100) / 100;
    const existente = pedidosNaoRecarga.find(p => p.mp_order_id && p.mp_pix_qr_code &&
      (!p.mp_pix_expira_at || new Date(p.mp_pix_expira_at).getTime() > Date.now()));
    if (existente) {
      return NextResponse.json({
        orderId: existente.mp_order_id,
        qrCode: existente.mp_pix_qr_code,
        qrCodeBase64: null, // imagem não é persistida; o copia-e-cola cobre
        valor,
        expiraEm: existente.mp_pix_expira_at,
        reaproveitada: true,
        recarga,
      });
    }

    if (!valor || valor <= 0) {
      return NextResponse.json({ error: 'Venda sem valor a cobrar' }, { status: 400 });
    }

    // Demanda 220: try/catch dedicado (era coberto só pelo catch geral da
    // rota) — registra falha permanente antes de cair no fallback de sempre,
    // sem mudar a resposta visível pro atendente.
    const inicioTentativaCobranca = Date.now();
    let cobranca;
    try {
      cobranca = await criarCobrancaPix({
        valor,
        externalReference: String(vendaId ?? pedidoId),
        telefone: telefone || '',
      });
    } catch (erroCobranca) {
      console.error('[141] Falha ao criar cobrança Pix do balcão', erroCobranca);
      await registrarFalhaCobrancaPix({
        origem:            'mercadopago_cobranca',
        pedidoId:          vendaId ? null : String(pedidoId),
        vendaId:           vendaId ? String(vendaId) : null,
        telefone:          telefone || null,
        valor,
        erroMensagem:      erroCobranca instanceof Error ? erroCobranca.message : String(erroCobranca),
        tempoDecorridoMs:  Date.now() - inicioTentativaCobranca,
        payloadTentativa:  { externalReference: String(vendaId ?? pedidoId), valor, telefone: telefone || null },
      });
      return NextResponse.json({ error: 'Não foi possível gerar a cobrança Pix' }, { status: 500 });
    }

    // Vincula em TODOS os itens cobertos — é por `mp_order_id` que a
    // confirmação automática (webhook/fallback/poll) acha e marca os pedidos.
    // Demanda 147: por id, nunca em item de recarga (a cobrança não os cobre).
    const { error: erroVinculo } = await supabaseAdmin.from('jsgrafica_pedidos').update({
      mp_order_id:      cobranca.orderId,
      mp_pix_qr_code:   cobranca.qrCode,
      mp_pix_expira_at: cobranca.expiraEm,
    }).in('id', pedidosNaoRecarga.map(p => p.id));
    if (erroVinculo) throw erroVinculo;

    return NextResponse.json({
      orderId: cobranca.orderId,
      qrCode: cobranca.qrCode,
      qrCodeBase64: cobranca.qrCodeBase64,
      valor,
      expiraEm: cobranca.expiraEm,
      // Demanda 179: instrução da parte de recarga na venda mista (null
      // quando a venda não tem recarga pendente — caso comum, intocado).
      recarga,
    });
  } catch (error) {
    console.error('[141] Falha ao criar cobrança Pix do balcão', error);
    return NextResponse.json({ error: 'Não foi possível gerar a cobrança Pix' }, { status: 500 });
  }
}

// Checagem de status pro poll da tela de QR do balcão (a cada ~5s enquanto
// o modal está aberto). Não dá pra usar `conferirCobrancasPixPendentes` aqui
// — ela tem trava de 60s por cobrança (anti-spam do fallback da 124), lenta
// demais pra uma tela de "aguardando pagamento". Re-busca autoritativa na
// API do MP com nosso token + a MESMA `confirmarPedidosPagosPorOrder` de
// sempre — o poll também confirma os pedidos, não só olha.
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('orderId');
    if (!orderId) return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });

    const order = await buscarOrderPorId(orderId);
    const pedidosConfirmados = await confirmarPedidosPagosPorOrder(order);
    // Demanda 178: mesmo aproveitamento da re-busca — se a order aparecer
    // estornada depois de já confirmada, sinaliza pro time (nunca reverte).
    await marcarPedidosEstornadosPorOrder(order);
    return NextResponse.json({
      pago: order.status === 'processed',
      status: order.status ?? null,
      pedidosConfirmados,
    });
  } catch (error) {
    console.error('[141] Falha ao checar status da cobrança', error);
    return NextResponse.json({ error: 'Erro ao checar status da cobrança' }, { status: 500 });
  }
}
