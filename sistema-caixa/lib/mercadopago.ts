import crypto from 'crypto';
import { supabaseAdmin, gravarRascunhosPedido } from './supabase-admin';
import { limitesDiaCaixaUTC } from './supabase';
import { montarMensagemPagamentoConfirmado } from './pedidos';

// Demanda 084 — integração Mercado Pago (saldo e movimentações, piloto sem
// custo). Base de conhecimento completa em
// `pm/conhecimento/mercado-pago-integracao.md` — ler antes de mexer aqui.
//
// Achado confirmado em sandbox (não só documentação, que a própria base de
// conhecimento já avisa ser confusa): a app foi criada em "Checkout
// Transparente via Orders", mas pra SALDO/MOVIMENTAÇÕES (esta demanda) a
// fonte usada é a API clássica de Pagamentos (`/v1/payments/search`), não a
// API de Orders (`/v1/orders`) — motivo: um pagamento criado via Orders API
// também aparece em `/v1/payments/search`, com dados financeiros que o
// objeto de pagamento da própria Orders API não tem (`net_received_amount`,
// taxas discriminadas, `money_release_date`/`money_release_status`). A API
// de Orders (`/v1/orders`) fica reservada pra quando a 124 (Parte B, cobrança
// Pix por pedido) precisar criar cobranças — não é usada aqui.

const MP_BASE_URL = 'https://api.mercadopago.com';

interface MPConfig {
  ambiente: 'teste' | 'producao';
  publicKey: string;
  accessToken: string;
  webhookSecret: string | null;
  tokenCriadoEm: string;
}

let configCache: MPConfig | null = null;
let cacheTtl = 0;

// Mesmo padrão de `lib/zapi.ts` (demandas 024/025): credencial vive numa
// tabela com RLS ativa e nenhuma política — só o cliente service_role
// (backend) consegue ler. Nunca importar este arquivo de um componente
// "use client".
export async function getConfigMercadoPago(): Promise<MPConfig> {
  if (configCache && Date.now() < cacheTtl) return configCache;
  const { data } = await supabaseAdmin
    .from('jsgrafica_mercadopago_config')
    .select('ambiente, public_key, access_token, webhook_secret, token_criado_em')
    .eq('ativo', true)
    .single();
  if (!data) throw new Error('Configuração do Mercado Pago não encontrada');
  configCache = {
    ambiente:       data.ambiente,
    publicKey:      data.public_key,
    accessToken:    data.access_token,
    webhookSecret:  data.webhook_secret,
    tokenCriadoEm:  data.token_criado_em,
  };
  cacheTtl = Date.now() + 60_000; // 1 min
  return configCache;
}

async function mpFetch(path: string, init?: RequestInit) {
  const cfg = await getConfigMercadoPago();
  const res = await fetch(`${MP_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mercado Pago ${path}: ${res.status} ${err}`);
  }
  return res.json();
}

export interface PagamentoMP {
  id: number;
  status: string;
  status_detail: string;
  date_created: string;
  date_approved: string | null;
  money_release_date: string | null;
  money_release_status: string | null;
  payment_method_id: string;
  payment_type_id: string;
  transaction_amount: number;
  external_reference: string | null;
  transaction_details?: { net_received_amount?: number; total_paid_amount?: number };
  fee_details?: { type: string; amount: number }[];
  payer?: { email?: string | null };
}

// `GET /v1/payments/search` — síncrono (confirmado em sandbox, seção 5 da
// base de conhecimento), diferente dos relatórios "Dinheiro em conta"/
// "Liberações" (assíncronos, fora do escopo). `limit`/`offset` são os nomes
// reais aceitos aqui (confirmado em sandbox — a API de Orders usa
// `page`/`page_size`, nomes diferentes, mais um ponto de atenção real entre
// as duas APIs).
export async function buscarPagamentos(opts: {
  dataInicio: string; // ISO 8601
  dataFim: string;    // ISO 8601
  limit?: number;
  offset?: number;
}): Promise<{ results: PagamentoMP[]; paging: { total: number; offset: number; limit: number } }> {
  const params = new URLSearchParams({
    sort: 'date_created',
    criteria: 'desc',
    range: 'date_created',
    begin_date: opts.dataInicio,
    end_date: opts.dataFim,
    limit: String(opts.limit ?? 50),
    offset: String(opts.offset ?? 0),
  });
  return mpFetch(`/v1/payments/search?${params.toString()}`);
}

export async function buscarPagamentoPorId(id: string | number): Promise<PagamentoMP> {
  return mpFetch(`/v1/payments/${id}`);
}

// ─── Relatório "Dinheiro em conta" / settlement_report (demanda 265) ───────
// `buscarPagamentos` (`/v1/payments/search`, acima) só mostra pagamentos
// RECEBIDOS — nunca taxa, saque, transferência ou qualquer saída de dinheiro
// da conta. Esse relatório é assíncrono (diferente de `/v1/payments/search`,
// que é síncrona) e documentado em
// https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/reports/account-money/api
// como cobrindo "pagamentos recebidos, saques, taxas, transferências e
// outras operações" — confirmado com dado real na demanda 265 (ver
// `scripts/investigacao-265-relatorio-dinheiro-conta.ts`).
export interface RelatorioDinheiroEmConta {
  id: number;
  userId: string;
  beginDate: string;
  endDate: string;
  fileName: string;
  createdFrom: string;
  dateCreated: string;
  // Achado real (demanda 265, a doc pública não menciona este campo na
  // resposta de criação/listagem, mas ele vem de verdade): 'pending' até o
  // relatório ficar pronto — só então `fileName` vem preenchido e dá pra
  // baixar. É o campo certo pra decidir "já era", não a mera presença na
  // lista (a linha já aparece em .../list com status 'pending' e
  // `file_name` vazio assim que criada).
  status: string;
}

function normalizarRelatorio(r: Record<string, unknown>): RelatorioDinheiroEmConta {
  return {
    id:          Number(r.id),
    userId:      String(r.user_id ?? ''),
    beginDate:   String(r.begin_date ?? ''),
    endDate:     String(r.end_date ?? ''),
    fileName:    String(r.file_name ?? ''),
    createdFrom: String(r.created_from ?? ''),
    dateCreated: String(r.date_created ?? r.generation_date ?? ''),
    status:      String(r.status ?? ''),
  };
}

// Achado real (demanda 265, não documentado na página consultada): a conta
// da gráfica nunca tinha gerado nenhum relatório "Dinheiro em conta" antes —
// `POST /v1/account/settlement_report` falhava com 404 (corpo vazio) até
// existir uma configuração de conta (`GET /v1/account/settlement_report/config`
// também dava 404, `config_not_found_for_user`). Provisiona uma config
// mínima com as colunas relevantes pra conciliação (inclui `TRANSACTION_TYPE`,
// que é a coluna que mostra taxa/saque/transferência) só se ainda não
// existir — idempotente, roda 1x na vida da conta, depois sempre acha
// `GET` e não mexe de novo.
async function garantirConfigRelatorioDinheiroEmConta(): Promise<void> {
  const cfg = await getConfigMercadoPago();
  const resGet = await fetch(`${MP_BASE_URL}/v1/account/settlement_report/config`, {
    headers: { 'Authorization': `Bearer ${cfg.accessToken}` },
    cache: 'no-store',
  });
  if (resGet.ok) return; // já configurada, nada a fazer

  const resPost = await fetch(`${MP_BASE_URL}/v1/account/settlement_report/config`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      file_name_prefix: 'jsgrafica-settlement',
      show_fee_prevision: false,
      show_chargeback_cancel: true,
      include_withdraw: true,
      display_timezone: 'GMT-03',
      header_language: 'pt',
      separator: ';',
      // `frequency` é obrigatório no POST (achado real — a doc consultada
      // listava como opcional) mesmo pra geração manual sob demanda; não
      // encontramos efeito prático dela no fluxo manual usado aqui.
      frequency: { hour: 0, type: 'monthly', value: 1 },
      columns: [
        { key: 'EXTERNAL_REFERENCE' }, { key: 'SOURCE_ID' }, { key: 'PAYMENT_METHOD_TYPE' },
        { key: 'PAYMENT_METHOD' }, { key: 'TRANSACTION_TYPE' }, { key: 'TRANSACTION_AMOUNT' },
        { key: 'TRANSACTION_CURRENCY' }, { key: 'TRANSACTION_DATE' }, { key: 'FEE_AMOUNT' },
        { key: 'SETTLEMENT_NET_AMOUNT' }, { key: 'SETTLEMENT_CURRENCY' }, { key: 'SETTLEMENT_DATE' },
        { key: 'REAL_AMOUNT' }, { key: 'ORDER_ID' },
      ],
    }),
  });
  if (!resPost.ok) {
    const err = await resPost.text();
    throw new Error(`Mercado Pago /v1/account/settlement_report/config (POST): ${resPost.status} ${err}`);
  }
}

// `POST /v1/account/settlement_report` — cria o relatório, responde 202
// (processamento em segundo plano no lado do Mercado Pago). `beginDate`/
// `endDate` em ISO 8601 (ex. "2026-07-24T00:00:00Z"), mesmo formato que
// `buscarPagamentos` já usa.
export async function criarRelatorioDinheiroEmConta(beginDate: string, endDate: string): Promise<RelatorioDinheiroEmConta> {
  await garantirConfigRelatorioDinheiroEmConta();
  const resp = await mpFetch('/v1/account/settlement_report', {
    method: 'POST',
    body: JSON.stringify({ begin_date: beginDate, end_date: endDate }),
  });
  return normalizarRelatorio(resp);
}

// `GET /v1/account/settlement_report/list` — relatórios já gerados (pra
// saber quando o que a função acima criou ficou pronto pra baixar — conferir
// `status`, ver comentário na interface acima).
// Defensivo quanto ao formato da resposta (array puro na doc, mas nunca
// testado antes desta demanda) — se vier paginado num objeto, ainda funciona.
export async function listarRelatoriosDinheiroEmConta(): Promise<RelatorioDinheiroEmConta[]> {
  const resp = await mpFetch('/v1/account/settlement_report/list');
  const lista = Array.isArray(resp) ? resp : (resp?.results ?? resp?.data ?? []);
  return (lista as Record<string, unknown>[]).map(normalizarRelatorio);
}

// `GET /v1/account/settlement_report/:file_name` — baixa o arquivo pronto.
// IMPORTANTE: a resposta é um CSV cru (ponto e vírgula), não JSON — por isso
// não reaproveita `mpFetch` (que sempre faz `res.json()`), chama a API
// direto com o mesmo token/cabeçalho.
export async function baixarRelatorioDinheiroEmConta(fileName: string): Promise<string> {
  const cfg = await getConfigMercadoPago();
  const res = await fetch(`${MP_BASE_URL}/v1/account/settlement_report/${encodeURIComponent(fileName)}`, {
    headers: { 'Authorization': `Bearer ${cfg.accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mercado Pago /v1/account/settlement_report/${fileName}: ${res.status} ${err}`);
  }
  return res.text();
}

// ─── Cobrança Pix por pedido (demanda 124) ──────────────────────────────────
// Criada via `POST /v1/orders` — único caminho de escrita possível pra esta
// app ("Checkout Transparente via Orders"; a API clássica de pagamentos
// devolve 401 pra escrita, confirmado na 084, seção 8 da base de
// conhecimento). A leitura de status usa `GET /v1/orders/{id}` — status de
// order paga é `processed` (terminologia da Orders API, não o `approved` da
// clássica).

export interface OrderMP {
  id?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  total_paid_amount?: string;
  transactions?: {
    payments?: {
      id?: string;
      status?: string;
      status_detail?: string;
      amount?: string;
      paid_amount?: string;
      date_of_expiration?: string;
      payment_method?: {
        id?: string;
        type?: string;
        qr_code?: string;
        qr_code_base64?: string;
        ticket_url?: string;
      };
    }[];
  };
}

export async function buscarOrderPorId(orderId: string): Promise<OrderMP> {
  return mpFetch(`/v1/orders/${orderId}`);
}

export interface CobrancaPix {
  orderId: string;
  qrCode: string; // copia-e-cola
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiraEm: string | null;
}

export async function criarCobrancaPix(opts: {
  valor: number;
  externalReference: string;
  telefone: string;
}): Promise<CobrancaPix> {
  const cfg = await getConfigMercadoPago();
  // O pagador de Pix não autentica em lugar nenhum — o e-mail é só metadado
  // obrigatório da cobrança. Cliente de WhatsApp não tem e-mail cadastrado,
  // então vai um sintético derivado do telefone. Sandbox rejeita qualquer
  // domínio que não seja @testuser.com (confirmado por teste real — o
  // local-part é livre), produção aceita domínio normal.
  const dominio = cfg.ambiente === 'teste' ? 'testuser.com' : 'jsgrafica.site';
  const telefoneLimpo = (opts.telefone || '').replace(/\D/g, '') || 'sem-telefone';
  const email = `cliente.${telefoneLimpo}@${dominio}`;

  const criada: OrderMP = await mpFetch('/v1/orders', {
    method: 'POST',
    // Idempotência por referência do pedido: se a chamada repetir (retry de
    // rede etc.), o Mercado Pago devolve a mesma cobrança em vez de criar 2.
    headers: { 'X-Idempotency-Key': `pix-${opts.externalReference}` },
    body: JSON.stringify({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: opts.valor.toFixed(2),
      external_reference: opts.externalReference,
      transactions: {
        payments: [{ amount: opts.valor.toFixed(2), payment_method: { id: 'pix', type: 'bank_transfer' } }],
      },
      payer: { email },
    }),
  });
  if (!criada.id) throw new Error('Mercado Pago não retornou id da cobrança Pix');

  // O QR nem sempre vem na resposta da criação — é gerado assíncrono
  // (confirmado em sandbox: o POST volta `processing` sem QR e um GET ~3s
  // depois já traz `qr_code`/`qr_code_base64`/`ticket_url`). Reconsulta com
  // limite pra não estourar o tempo da função serverless.
  //
  // Demanda 198 (achado real, 2026-07-16 — ped-1027/ped-1039): o orçamento
  // antigo (5 tentativas × 1,1s = ~5,5s de espera) estourou 2x quando o MP
  // demorou mais que isso pra gerar o QR — o pedido caía no fallback de erro
  // (chave estática) e a Order ficava ÓRFÃ no Mercado Pago (criada lá, mas
  // sem `mp_order_id` vinculado no pedido, porque o erro é lançado antes do
  // vínculo). Aumentar só a janela de espera (dobrando o tempo de sleep pra
  // ~11s, como pedido) reduz a chance de estourar sem mudar a mecânica —
  // resolver a órfã de vez (confirmar na hora, buscar QR depois em segundo
  // plano) ficou fora de escopo desta demanda por decisão explícita.
  // Também corrigido um desperdício do loop antigo: a ÚLTIMA consulta feita
  // (5ª) nunca era checada antes de desistir — agora toda consulta buscada
  // é verificada, inclusive a última.
  const MAX_TENTATIVAS = 8;
  const INTERVALO_MS = 1400; // 8 × 1,4s = 11,2s de espera (dobro do orçamento antigo)
  let order = criada;
  for (let tentativa = 0; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const pagamento = order.transactions?.payments?.[0];
    const pm = pagamento?.payment_method;
    if (pm?.qr_code) {
      return {
        orderId: criada.id,
        qrCode: pm.qr_code,
        qrCodeBase64: pm.qr_code_base64 ?? null,
        ticketUrl: pm.ticket_url ?? null,
        expiraEm: pagamento?.date_of_expiration ?? null,
      };
    }
    if (tentativa === MAX_TENTATIVAS) break; // já checou a última consulta — não busca mais uma à toa
    await new Promise(r => setTimeout(r, INTERVALO_MS));
    order = await buscarOrderPorId(criada.id);
  }
  throw new Error(`Cobrança Pix criada (${criada.id}) mas o QR não ficou pronto a tempo`);
}

// ─── Confirmação automática de pagamento (demanda 124) ─────────────────────
// Marca como pagos os pedidos vinculados a uma order do Mercado Pago que já
// consta como paga — MESMO resultado final da confirmação manual da 113
// (`pagamento_confirmado`, `forma_pagamento`, timestamp), só a origem muda.
// Regras de segurança:
// - Recebe a order JÁ REBUSCADA da API com o nosso token — nunca o payload
//   do webhook direto (a assinatura do tópico "order" não valida,
//   inconsistência do próprio Mercado Pago — seção 9 da base de
//   conhecimento; o webhook é só um aviso pra ir conferir na fonte).
// - Só atualiza pedidos cujo `mp_order_id` gravado bate com o id da order
//   paga — nunca por `external_reference` solto.
// - Idempotente: `pagamento_confirmado = false` no filtro — reprocessar o
//   mesmo aviso não tem efeito nenhum na 2ª vez.
export async function confirmarPedidosPagosPorOrder(order: OrderMP): Promise<number> {
  if (!order.id || order.status !== 'processed') return 0;

  const pm = order.transactions?.payments?.[0]?.payment_method;
  const forma = pm?.id === 'pix' ? 'Pix'
    : (pm?.type === 'credit_card' || pm?.type === 'debit_card') ? 'Cartão'
    : (pm?.id || 'Mercado Pago');

  const { data, error } = await supabaseAdmin
    .from('jsgrafica_pedidos')
    .update({
      pagamento_confirmado:        true,
      pagamento_confirmado_at:     new Date().toISOString(),
      pagamento_confirmado_origem: 'mercadopago',
      forma_pagamento:             forma,
      updated_at:                  new Date().toISOString(),
    })
    .eq('mp_order_id', order.id)
    .eq('pagamento_confirmado', false)
    .neq('status', 'cancelado')
    .select('id, telefone, servico_nome, valor_final, quantidade, venda_id');
  if (error) throw error;

  const confirmados = data ?? [];
  // Demanda 250: fecha a promessa que o texto do Pix já fazia — gera o
  // rascunho de confirmação assim que o pagamento é detectado, chamado dos 3
  // gatilhos que passam por esta função (webhook, polling de reforço, poll
  // do balcão). Nunca envia sozinho — só deixa pronto pro Admin mandar.
  // Best-effort: falha aqui nunca desfaz a confirmação de pagamento em si.
  try {
    await gerarRascunhosPagamentoConfirmado(confirmados);
  } catch (e) {
    console.error('[250] Falha ao gerar rascunho de pagamento confirmado', e);
  }

  return confirmados.length;
}

// Demanda 250: agrupa por `venda_id` (múltiplos itens da mesma compra viram
// 1 rascunho só, mesmo padrão de "Criar pedido"/076 — pedidos sem venda_id
// viram 1 grupo cada) e gera 1 rascunho por grupo. Só quando o telefone é
// numérico de verdade — mesmo critério da demanda 238: venda de balcão sem
// contato vinculado grava `telefone='balcao'`, e um `@lid` ainda não
// resolvido não teria como receber mensagem nenhuma de qualquer forma.
async function gerarRascunhosPagamentoConfirmado(pedidosConfirmados: {
  id: string;
  telefone: string | null;
  servico_nome: string | null;
  valor_final: number | null;
  quantidade: number | null;
  venda_id: string | null;
}[]): Promise<void> {
  const comTelefoneValido = pedidosConfirmados.filter(p => p.telefone && /^\d+$/.test(p.telefone));
  if (comTelefoneValido.length === 0) return;

  const grupos = new Map<string, typeof comTelefoneValido>();
  for (const p of comTelefoneValido) {
    const chave = p.venda_id ?? p.id;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(p);
  }

  for (const itensGrupo of grupos.values()) {
    const telefone = itensGrupo[0].telefone as string;
    const itens = itensGrupo.map(p => ({
      servicoNome: p.servico_nome ?? 'Serviço',
      quantidade:  Number(p.quantidade) || 1,
      valorFinal:  Number(p.valor_final) || 0,
    }));
    const mensagem = montarMensagemPagamentoConfirmado(itens);
    await gravarRascunhosPedido(telefone, [mensagem]);
  }
}

// ─── Estorno depois da confirmação (demanda 178) ────────────────────────────
// Order que JÁ confirmou pagamento e depois aparece na API como estornada/
// cancelada/chargeback: SINALIZA pro time revisar, nunca reverte sozinho.
// Decisão documentada no relato da 178: reverter `pagamento_confirmado`
// automaticamente mexeria em data_entrada_caixa/fechamentos históricos sem
// ninguém ver (régua da 164 conta pelo pagamento) — o caminho seguro é o
// alerta + revisão humana, que cancela o pedido pelo fluxo da 157 se o
// estorno for real (aí sim sai da contagem, com motivo e rastro).
// Idempotente: só marca quem ainda não tem `pagamento_estornado_at`.
// `expired`/`canceled` de order NUNCA PAGA é ciclo normal do Pix (24h) — o
// filtro `pagamento_confirmado = true` deixa esses casos de fora sozinho.
const STATUS_ORDER_ESTORNO = new Set(['refunded', 'partially_refunded', 'canceled', 'cancelled', 'charged_back', 'chargeback']);

export async function marcarPedidosEstornadosPorOrder(order: OrderMP): Promise<number> {
  if (!order.id || !order.status || !STATUS_ORDER_ESTORNO.has(order.status)) return 0;

  const detalhe = `Order ${order.id} apareceu como "${order.status}"` +
    `${order.status_detail ? ` (${order.status_detail})` : ''} na API do Mercado Pago depois do pagamento já confirmado.`;

  const { data, error } = await supabaseAdmin
    .from('jsgrafica_pedidos')
    .update({
      pagamento_estornado_at:    new Date().toISOString(),
      pagamento_estorno_detalhe: detalhe,
      updated_at:                new Date().toISOString(),
    })
    .eq('mp_order_id', order.id)
    .eq('pagamento_confirmado', true)
    .eq('pagamento_confirmado_origem', 'mercadopago')
    .is('pagamento_estornado_at', null)
    .select('id');
  if (error) throw error;
  if ((data ?? []).length > 0) {
    console.error(`[178] ESTORNO detectado: ${detalhe} Pedidos sinalizados: ${(data ?? []).map(p => p.id).join(', ')}`);
  }
  return (data ?? []).length;
}

// Fallback da confirmação automática (exigência da demanda 124, por causa do
// bug de assinatura do tópico "order"): mesmo que o webhook falhe ou nem
// chegue, os pedidos com cobrança Pix pendente são conferidos direto na API
// (síncrona, autoritativa) quando a lista de pedidos é carregada — com trava
// de 60s por cobrança pra não virar chamada externa em todo reload. Cobrança
// expirada há mais de 24h sai da conferência (o Pix expira em 24h; depois
// disso o pedido volta pro fluxo manual da 113).
export async function conferirCobrancasPixPendentes(): Promise<number> {
  const agora = Date.now();
  const limiteConferencia = new Date(agora - 60_000).toISOString();
  const { data: pendentes } = await supabaseAdmin
    .from('jsgrafica_pedidos')
    .select('id, mp_order_id, mp_pix_expira_at')
    .not('mp_order_id', 'is', null)
    .eq('pagamento_confirmado', false)
    .neq('status', 'cancelado')
    .or(`mp_ultima_conferencia.is.null,mp_ultima_conferencia.lt.${limiteConferencia}`);

  const candidatos = (pendentes ?? []).filter(p =>
    !p.mp_pix_expira_at || new Date(p.mp_pix_expira_at).getTime() > agora - 24 * 60 * 60 * 1000
  );
  if (candidatos.length === 0) return 0;

  const orderIds = [...new Set(candidatos.map(p => p.mp_order_id as string))];
  let confirmados = 0;
  for (const orderId of orderIds) {
    // Marca a conferência ANTES de consultar — mesmo se a consulta falhar,
    // não repete a cada reload dentro da janela de 60s.
    await supabaseAdmin
      .from('jsgrafica_pedidos')
      .update({ mp_ultima_conferencia: new Date().toISOString() })
      .eq('mp_order_id', orderId);
    try {
      const order = await buscarOrderPorId(orderId);
      confirmados += await confirmarPedidosPagosPorOrder(order);
    } catch (e) {
      console.error(`[124] Falha ao conferir cobrança ${orderId}`, e);
    }
  }
  return confirmados;
}

// ─── Saldo Mercado Pago do dia do caixa (demanda 127) ───────────────────────
// Quanto DE FATO entrou na conta MP no dia do caixa (líquido, após as taxas
// — é o número que o Edvam lia no app e digitava no antigo campo "Bancos").
// Mesma fonte da tela "💳 Mercado Pago" (`buscarPagamentos`, síncrona), só
// que na janela do dia do caixa (fuso Recife, mesmo recorte de
// `getResumoDia`) em vez de 7/30/90 dias. Soma só pagamentos aprovados;
// estorno/cancelado sai sozinho (muda de status).
export async function saldoMercadoPagoDoDia(dataDia: string): Promise<number> {
  const limites = limitesDiaCaixaUTC(dataDia);
  if (!limites) throw new Error(`data_dia inválida: ${dataDia}`);
  const busca = await buscarPagamentos({ dataInicio: limites.inicio, dataFim: limites.fim, limit: 50 });
  const total = busca.results
    .filter(p => p.status === 'approved')
    .reduce((acc, p) => acc + (p.transaction_details?.net_received_amount ?? p.transaction_amount), 0);
  return Math.round(total * 100) / 100;
}

// ─── Lembrete de expiração do token (seção 6 da base de conhecimento) ──────
// Token estático do painel não renova sozinho — expira em ~180 dias.
export function diasParaExpirarToken(tokenCriadoEm: string): number {
  const criado = new Date(tokenCriadoEm + 'T00:00:00');
  const expira = new Date(criado.getTime() + 180 * 24 * 60 * 60 * 1000);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((expira.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
}

// ─── Validação da assinatura do webhook (x-signature) ──────────────────────
// Algoritmo confirmado direto no código-fonte + testes unitários do SDK
// oficial (mercadopago/sdk-nodejs, src/utils/webhook) — não só a
// documentação (que a base de conhecimento já avisa ser confusa). Manifesto:
// `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (pares ausentes são
// omitidos), HMAC-SHA256 com o segredo do webhook, comparação em tempo
// constante.
export function validarAssinaturaWebhook(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!opts.xSignature) return false;

  let ts: string | undefined;
  const hashes: Record<string, string> = {};
  for (const part of opts.xSignature.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (!key || !value) continue;
    if (key === 'ts') ts = value;
    else if (/^v\d+$/.test(key)) hashes[key] = value;
  }
  if (!ts || !hashes.v1) return false;

  const parts: string[] = [];
  if (opts.dataId) parts.push(`id:${opts.dataId}`);
  if (opts.xRequestId) parts.push(`request-id:${opts.xRequestId}`);
  parts.push(`ts:${ts}`);
  const manifest = parts.join(';') + ';';

  const computed = crypto.createHmac('sha256', opts.secret).update(manifest).digest('hex');
  const received = hashes.v1;
  if (computed.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(received));
}

export async function registrarEventoWebhook(evento: {
  tipo: string | null;
  acao: string | null;
  recursoId: string | null;
  assinaturaValida: boolean;
  payload: unknown;
  erro?: string;
  // Campos de diagnóstico (achado real, 2026-07-08): a 1ª tentativa de
  // validar contra um aviso genuíno do Mercado Pago falhou
  // ("Assinatura inválida") sem esses dados brutos não dava pra saber se o
  // problema era o segredo, o `data.id` (query string vs. corpo) ou outra
  // coisa — gravar sempre, não só quando falha.
  xSignature?: string | null;
  xRequestId?: string | null;
  queryString?: string | null;
  headersBrutos?: Record<string, string>;
}) {
  await supabaseAdmin.from('jsgrafica_mercadopago_eventos').insert({
    tipo:              evento.tipo,
    acao:               evento.acao,
    recurso_id:        evento.recursoId,
    assinatura_valida: evento.assinaturaValida,
    payload:           evento.payload,
    erro:              evento.erro ?? null,
    headers_brutos:    evento.headersBrutos ?? null,
    x_signature:       evento.xSignature ?? null,
    x_request_id:      evento.xRequestId ?? null,
    query_string:      evento.queryString ?? null,
  });
}
