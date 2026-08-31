export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getConfigMercadoPago, validarAssinaturaWebhook, registrarEventoWebhook,
  buscarOrderPorId, confirmarPedidosPagosPorOrder, marcarPedidosEstornadosPorOrder,
} from '@/lib/mercadopago';

// Demanda 084 — endpoint público que recebe os avisos do Mercado Pago
// (pagamento aprovado, estorno, etc.). Complementar à busca de pagamentos
// (não substitui) — só avisa que algo mudou, não é a fonte principal de
// saldo/movimentações. Precisa responder rápido (Mercado Pago dá até 22s,
// senão considera falha e reenvia a cada 15min) — por isso só valida a
// assinatura e grava o evento bruto, sem processar nada pesado aqui.
//
// `data.id` vem na query string da URL do webhook (não só no corpo) — é
// isso que entra no HMAC, confirmado no código-fonte + testes do SDK
// oficial (ver `validarAssinaturaWebhook` em lib/mercadopago.ts).
export async function POST(req: NextRequest) {
  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const body = payload as { type?: string; action?: string; data?: { id?: string } };
  const dataIdQuery = req.nextUrl.searchParams.get('data.id');
  const dataId = dataIdQuery || body?.data?.id || null;
  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  let assinaturaValida = false;
  let erro: string | undefined;
  try {
    const config = await getConfigMercadoPago();
    if (!config.webhookSecret) {
      erro = 'Segredo do webhook ainda não configurado (falta o passo manual no painel do Mercado Pago)';
    } else {
      assinaturaValida = validarAssinaturaWebhook({
        xSignature, xRequestId, dataId, secret: config.webhookSecret,
      });
      if (!assinaturaValida) erro = 'Assinatura inválida';
    }
  } catch (e) {
    erro = e instanceof Error ? e.message : 'Erro ao validar assinatura';
  }

  // Demanda 124: confirmação automática de pagamento. O aviso é só um
  // GATILHO — nunca confiamos no conteúdo do payload (a assinatura do
  // tópico "order" não valida por inconsistência do próprio Mercado Pago,
  // seção 9 da base de conhecimento). Tudo que vale vem da re-busca
  // autoritativa na API com o NOSSO token: um aviso forjado só consegue nos
  // fazer consultar a nossa própria conta — se a order não estiver paga de
  // verdade lá, nada acontece. Por isso roda mesmo com assinatura inválida.
  // Cobrança criada via Orders API dispara evento do tópico "order"
  // (confirmado em teste real na 084) — tópico "payment" fica só no log.
  let pedidosConfirmados = 0;
  if (body?.type === 'order' && dataId) {
    try {
      const order = await buscarOrderPorId(dataId);
      pedidosConfirmados = await confirmarPedidosPagosPorOrder(order);
      // Demanda 178: a MESMA order re-buscada pode indicar o caminho inverso
      // — estorno/cancelamento DEPOIS de um pagamento já confirmado. Só
      // sinaliza (nunca reverte sozinho); ver marcarPedidosEstornadosPorOrder.
      await marcarPedidosEstornadosPorOrder(order);
    } catch (e) {
      console.error(`[124] Falha ao conferir order ${dataId} do webhook`, e);
    }
  }

  const todosHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { todosHeaders[key] = value; });

  await registrarEventoWebhook({
    tipo: body?.type ?? null,
    acao: body?.action ?? null,
    recursoId: dataId,
    assinaturaValida,
    payload,
    erro,
    xSignature,
    xRequestId,
    queryString: req.nextUrl.search || null,
    headersBrutos: todosHeaders,
  });

  // Responde 200 sempre que recebeu e logou — mesmo com assinatura inválida
  // ou não configurada ainda, pra não entrar num loop de reenvio do lado do
  // Mercado Pago por um evento que já foi registrado (fica visível no log
  // pra investigar, não silenciosamente ignorado).
  return NextResponse.json({ recebido: true, assinaturaValida, pedidosConfirmados });
}
