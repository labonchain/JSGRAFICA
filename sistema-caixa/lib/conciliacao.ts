// Demandas 227/228 — conciliação automática (desenho 225,
// pm/conhecimento/desenho-conciliacao-automatica.md). Tabela criada na 226
// (`jsgrafica_conciliacao_pendencias`), schema fixo, não alterado aqui.
//
// 227 — matching item a item dos pagamentos do Mercado Pago do dia (a única
// conta com API real). 228 — gap agregado (variação informada − calculada)
// pras 4 contas sem granularidade item-a-item real: RecargaPay, Stone, Caixa
// Econômica (nunca têm API) e também Mercado Pago (tem API, mas usada aqui só
// pra medir o que SOBRA depois da 227 já ter explicado o que dava pra
// explicar item a item — ver `calcularGapContasSemApi` abaixo pra a regra de
// dedup exata, pedida explicitamente pelo Edvam pra não duplicar o mesmo caso
// como 2 pendências).
//
// Nunca cria vínculo/classificação automática — só registra pendência ou
// sugestão pro Admin confirmar (mesma disciplina de todas as correções
// manuais já feitas no projeto).

import { supabaseAdmin } from './supabase-admin';
import { buscarPagamentos } from './mercadopago';
import { limitesDiaCaixaUTC, timestampParaDiaCaixa, parseDiaCaixa } from './supabase';
import { CONTAS_ORIGEM } from './dados';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function moeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const LABEL_CONTA: Record<string, string> = Object.fromEntries(CONTAS_ORIGEM.map(c => [c.id, c.label]));

// Demanda 230 (Edvam pediu linguagem simples, não fórmula/jargão técnico —
// print real com os textos antigos motivou a demanda): traduz o
// `payment_type_id` da API do Mercado Pago pra uma frase que faz sentido pra
// quem não conhece a API. Pesquisado o significado real de cada tipo (não é
// suposição) — `account_money` é pagamento feito com o saldo que já estava
// na própria conta/carteira do Mercado Pago (não é jargão, é literalmente
// isso). Tipo desconhecido cai num texto genérico em vez de quebrar.
function fraseTipoPagamentoMP(paymentTypeId: string): string {
  const MAPA: Record<string, string> = {
    bank_transfer: 'via Pix no Mercado Pago',
    account_money: 'do saldo que já estava na conta do Mercado Pago',
    ticket: 'via boleto no Mercado Pago',
    credit_card: 'no cartão de crédito via Mercado Pago',
    debit_card: 'no cartão de débito via Mercado Pago',
    prepaid_card: 'no cartão pré-pago via Mercado Pago',
    atm: 'em caixa eletrônico via Mercado Pago',
    digital_wallet: 'por carteira digital via Mercado Pago',
    digital_currency: 'em moeda digital via Mercado Pago',
    crypto_transfer: 'em cripto via Mercado Pago',
  };
  return MAPA[paymentTypeId] ?? `no Mercado Pago (tipo "${paymentTypeId}")`;
}

// ─── 227 — Matching de pagamentos do Mercado Pago do dia ────────────────────

export interface ResultadoMatchingMP {
  totalPagamentosAprovados: number;
  nivel1RefValida: number;
  nivel2CandidatoUnico: number;
  nivel3SemCandidato: number;
  pendenciasCriadasAgora: number;
  pendenciasJaExistentes: number;
  // Soma de TODAS as pendências (novas + já existentes) do tipo
  // 'mercadopago_pagamento' criadas pra este dia — usado pela 228 pra não
  // contar a mesma diferença 2x (item a item aqui + agregado lá).
  somaPendenciasDoDia: number;
}

export async function conciliarMercadoPagoDoDia(dataDia: string): Promise<ResultadoMatchingMP> {
  const limites = limitesDiaCaixaUTC(dataDia);
  if (!limites) throw new Error(`data_dia inválida: ${dataDia}`);

  const busca = await buscarPagamentos({ dataInicio: limites.inicio, dataFim: limites.fim, limit: 100 });
  const aprovados = busca.results.filter(p => p.status === 'approved');

  let nivel1 = 0, nivel2 = 0, nivel3 = 0, criadasAgora = 0, jaExistentes = 0, soma = 0;

  for (const pag of aprovados) {
    const ref = pag.external_reference;

    // Nível 1 — alta confiança: referência bate com um pedido/venda já
    // existente. Query pontual (não bulk-load — achado da própria
    // investigação: jsgrafica_pedidos já passa de 1000 linhas, uma query sem
    // filtro trunca silenciosamente no limite default do PostgREST).
    let refValida = false;
    if (ref) {
      const { data } = await supabaseAdmin.from('jsgrafica_pedidos')
        .select('id').or(`id.eq.${ref},venda_id.eq.${ref}`).limit(1);
      refValida = (data ?? []).length > 0;
    }
    if (refValida) { nivel1++; continue; }

    const origemExternaId = String(pag.id);

    // Dedup: já existe pendência pra este pagamento (de uma rodada anterior,
    // automática ou sob demanda)? Não cria de novo, só soma o valor dela pra
    // a 228 continuar descontando certo — EXCETO quando já foi classificado
    // como transferência (demanda 263, achado real, dia 20-07-26 R$611,26):
    // `criarTransferencia` grava uma linha real em `jsgrafica_transferencias`
    // que `calcularEntradaSaidaConta` já soma como entrada de verdade
    // (`transfEntrada`) — se a gente também descontar esse valor aqui, ele
    // conta 2x e o gap piora em vez de melhorar depois de um item explicado.
    // Outros desfechos ('sabido'/'entrada'/'saida'/'ignorado'/'pendente')
    // continuam descontando normalmente — nenhum deles tem esse segundo
    // lugar onde o valor já entraria de novo no cálculo.
    const { data: existente } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
      .select('valor, status, classificacao').eq('tipo_origem', 'mercadopago_pagamento').eq('origem_externa_id', origemExternaId)
      .maybeSingle();
    if (existente) {
      jaExistentes++;
      const classificadoComoTransferencia = existente.status === 'classificado'
        && (existente.classificacao as { tipo?: string } | null)?.tipo === 'transferencia';
      if (!classificadoComoTransferencia) soma += Number(existente.valor);
      continue;
    }

    // Nível 2 (candidato único por valor+data, contra pedido sem
    // mp_order_id) vs nível 3 (sem candidato, ou candidatos ambíguos) — os
    // dois viram a MESMA linha em jsgrafica_conciliacao_pendencias (o schema
    // não tem coluna de "nível"; a diferença é só a sugestão dentro de
    // `descricao_sugerida`, pronta pra quando a 229 construir a UI).
    const diaCaixaPagamento = timestampParaDiaCaixa(pag.date_created);
    const limitesPagamento = limitesDiaCaixaUTC(diaCaixaPagamento);
    const { data: candidatosData } = limitesPagamento
      ? await supabaseAdmin.from('jsgrafica_pedidos')
          .select('id')
          .is('mp_order_id', null)
          .eq('valor_final', pag.transaction_amount)
          .gte('created_at', limitesPagamento.inicio).lt('created_at', limitesPagamento.fim)
      : { data: [] };
    const candidatos = candidatosData ?? [];

    // Demanda 230: linguagem simples, sem expor `payment_type_id` cru nem
    // fórmula — diz o que aconteceu e que decisão o Admin precisa tomar.
    const hora = new Date(pag.date_created).toLocaleTimeString('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' });
    const dataFmt = new Date(pag.date_created).toLocaleDateString('pt-BR', { timeZone: 'America/Recife', day: '2-digit', month: '2-digit' });
    const descricaoBase = `Você recebeu ${moeda(pag.transaction_amount)} ${fraseTipoPagamentoMP(pag.payment_type_id)} às ${hora} do dia ${dataFmt}, sem nenhum pedido ou venda correspondente no sistema. Você sabe o que foi esse pagamento?`;
    const descricaoSugerida = candidatos.length === 1
      ? `${descricaoBase} (Candidato pra vincular: pedido ${candidatos[0].id}, mesmo valor e dia — confirme antes, nunca vincula sozinho.)`
      : descricaoBase;

    const { error: erroInsert } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias').insert({
      conta: 'mercadopago',
      data_dia: dataDia,
      tipo_origem: 'mercadopago_pagamento',
      valor: pag.transaction_amount,
      origem_externa_id: origemExternaId,
      descricao_sugerida: descricaoSugerida,
    });
    if (erroInsert) throw erroInsert;

    criadasAgora++;
    soma += pag.transaction_amount;
    if (candidatos.length === 1) nivel2++; else nivel3++;
  }

  return {
    totalPagamentosAprovados: aprovados.length,
    nivel1RefValida: nivel1,
    nivel2CandidatoUnico: nivel2,
    nivel3SemCandidato: nivel3,
    pendenciasCriadasAgora: criadasAgora,
    pendenciasJaExistentes: jaExistentes,
    somaPendenciasDoDia: round2(soma),
  };
}

// ─── 228 — Gap agregado por conta sem granularidade item-a-item ────────────

const LIMIAR_MATERIALIDADE = 2.00;

interface ContaGapCfg {
  conta: 'mercadopago' | 'stone' | 'recargapay' | 'caixa_economica';
  formaPagamentoEntrada: string | null; // forma_pagamento de jsgrafica_pedidos que conta como entrada dessa conta
}
const CONTAS_GAP: ContaGapCfg[] = [
  { conta: 'mercadopago',     formaPagamentoEntrada: 'Pix' },
  { conta: 'stone',           formaPagamentoEntrada: 'Cartão' },
  { conta: 'recargapay',      formaPagamentoEntrada: 'Pix RecargaPay' },
  { conta: 'caixa_economica', formaPagamentoEntrada: null },
];

export interface ResultadoGapConta {
  conta: string;
  entradaCalculada: number;
  saidaCalculada: number;
  resultadoCalculado: number;
  saldoInformadoHoje: number | null;
  saldoInformadoOntem: number | null;
  dataDiaAnterior: string | null;
  variacaoInformada: number | null;
  diferenca: number | null;
  // Só preenchido pra 'mercadopago' — diferença depois de descontar o que a
  // 227 já encontrou item a item nesse dia (ver conciliarDia).
  diferencaAjustada: number | null;
  pendenciaCriada: boolean;
}

async function calcularEntradaSaidaConta(
  conta: string, formaPagamentoEntrada: string | null, dataDia: string,
): Promise<{ entrada: number; saida: number; resultado: number }> {
  const limites = limitesDiaCaixaUTC(dataDia);
  if (!limites) throw new Error(`data_dia inválida: ${dataDia}`);

  let entradaPedidos = 0;
  if (formaPagamentoEntrada) {
    const { data } = await supabaseAdmin.from('jsgrafica_pedidos')
      .select('valor_final')
      .eq('pagamento_confirmado', true).neq('status', 'cancelado')
      .eq('forma_pagamento', formaPagamentoEntrada)
      .gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
    entradaPedidos = (data ?? []).reduce((acc, r) => acc + Number(r.valor_final || 0), 0);
  }

  const [{ data: transfEntrada }, { data: saidasConta }, { data: transfSaida }] = await Promise.all([
    supabaseAdmin.from('jsgrafica_transferencias').select('valor').eq('data_dia', dataDia).eq('conta_destino', conta),
    // Demanda 262: exclui a linha-espelho que `criarTransferencia`
    // (lib/supabase-admin.ts) grava aqui com `categoria_id =
    // 'transferencia_entre_contas'` pra toda transferência de saída — sem
    // isso, a mesma movimentação era somada 2x (aqui + em `transfSaida`
    // abaixo, que já cobre o valor real via `jsgrafica_transferencias`).
    // Lado de entrada (`transfEntrada`) não tem o mesmo problema: nenhuma
    // linha-espelho de entrada é gravada em lugar nenhum por
    // `criarTransferencia` (confirmado lendo a função inteira — só grava em
    // `jsgrafica_saidas` e `jsgrafica_transferencias`, nunca em
    // `jsgrafica_entradas_avulsas`/`jsgrafica_pedidos`).
    supabaseAdmin.from('jsgrafica_saidas').select('valor').eq('data_dia', dataDia).eq('conta_origem', conta)
      .neq('categoria_id', 'transferencia_entre_contas'),
    supabaseAdmin.from('jsgrafica_transferencias').select('valor').eq('data_dia', dataDia).eq('conta_origem', conta),
  ]);

  const entrada = round2(entradaPedidos + (transfEntrada ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0));
  const saida = round2((saidasConta ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0)
    + (transfSaida ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0));
  return { entrada, saida, resultado: round2(entrada - saida) };
}

// "2 fechamentos Sistema consecutivos" (texto da demanda) — NÃO é "dia
// calendário - 1": há dias sem nenhum fechamento (ex. 11-12/07, fim de
// semana sem movimento). Busca o fechamento "Sistema" imediatamente anterior
// por ORDEM REAL (parseDiaCaixa em memória — data_dia é texto DD-MM-AA,
// comparação de string quebra ao cruzar mês/ano, mesmo cuidado documentado
// em lib/supabase.ts), nunca por subtração de data.
async function fechamentoSistemaAnterior(dataDia: string): Promise<{ dataDia: string; saldos: Record<string, number | null> } | null> {
  const alvo = parseDiaCaixa(dataDia);
  if (!alvo) return null;
  const { data } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select('data_dia, saldo_mercadopago, saldo_stone, saldo_caixa_economica, saldo_recargapay')
    .eq('fechado_por', 'Sistema')
    .limit(5000);
  const candidatos = (data ?? [])
    .map(r => ({ r, d: parseDiaCaixa(r.data_dia) }))
    .filter(x => x.d && x.d.getTime() < alvo.getTime())
    .sort((a, b) => b.d!.getTime() - a.d!.getTime());
  const escolhido = candidatos[0];
  if (!escolhido) return null;
  return {
    dataDia: escolhido.r.data_dia,
    saldos: {
      mercadopago:     escolhido.r.saldo_mercadopago,
      stone:           escolhido.r.saldo_stone,
      caixa_economica: escolhido.r.saldo_caixa_economica,
      recargapay:      escolhido.r.saldo_recargapay,
    },
  };
}

async function saldoInformadoHoje(conta: string, dataDia: string): Promise<number | null> {
  const coluna = `saldo_${conta}`;
  const { data } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select(coluna).eq('data_dia', dataDia).eq('fechado_por', 'Sistema').maybeSingle();
  if (!data) return null;
  const v = (data as unknown as Record<string, unknown>)[coluna];
  return v == null ? null : Number(v);
}

export async function calcularGapContasSemApi(
  dataDia: string,
  // Demanda 228 (ajuste pedido pelo Edvam): o que a 227 já encontrou item a
  // item pro Mercado Pago nesse dia — descontado da diferença ANTES de
  // decidir se cria pendência agregada, pra nunca duplicar o mesmo caso como
  // 2 itens (ex. o R$300 de 21/07 não pode virar 1 pendência da 227 + mais
  // uma pendência agregada da 228 cobrindo o mesmo R$300).
  somaPendenciasMPDoDia = 0,
): Promise<ResultadoGapConta[]> {
  const anterior = await fechamentoSistemaAnterior(dataDia);
  const resultados: ResultadoGapConta[] = [];

  for (const cfg of CONTAS_GAP) {
    const { entrada, saida, resultado } = await calcularEntradaSaidaConta(cfg.conta, cfg.formaPagamentoEntrada, dataDia);
    const saldoHoje = await saldoInformadoHoje(cfg.conta, dataDia);
    const saldoOntem = anterior ? anterior.saldos[cfg.conta] : null;

    let variacaoInformada: number | null = null;
    let diferenca: number | null = null;
    if (saldoHoje != null && saldoOntem != null) {
      variacaoInformada = round2(saldoHoje - saldoOntem);
      diferenca = round2(variacaoInformada - resultado);
    }

    const diferencaAjustada = cfg.conta === 'mercadopago' && diferenca != null
      ? round2(diferenca - somaPendenciasMPDoDia)
      : diferenca;

    let pendenciaCriada = false;
    if (diferencaAjustada != null && Math.abs(diferencaAjustada) > LIMIAR_MATERIALIDADE) {
      // Dedup: 1 item por conta por dia, não importa o status atual (mesmo
      // se já foi classificado/ignorado — não recria pro mesmo dia/conta).
      const { data: existente } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
        .select('id').eq('tipo_origem', 'saldo_dia_agregado').eq('conta', cfg.conta).eq('data_dia', dataDia)
        .maybeSingle();
      if (!existente) {
        // Demanda 230: linguagem simples — nunca expõe "variação informada
        // vs calculada" nem o valor exato descontado pelo dedup 227↔228 (só
        // avisa QUE já foi descontado, quando aplicável, sem repetir o
        // mecanismo interno).
        const nomeConta = LABEL_CONTA[cfg.conta] ?? cfg.conta;
        const jaDescontou = cfg.conta === 'mercadopago' && somaPendenciasMPDoDia > 0;
        const descontoTexto = jaDescontou
          ? ' — esse valor já não conta os pagamentos individuais do Mercado Pago listados separadamente nesta tela'
          : '';
        const descricaoSugerida = diferencaAjustada > 0
          ? `O saldo que você informou de ${nomeConta} subiu ${moeda(diferencaAjustada)} no dia ${dataDia}, mas o sistema não tem nenhuma venda, despesa ou transferência registrada que explique isso${jaDescontou ? ', além do que já está listado separadamente nesta tela' : ''}. De onde veio esse dinheiro?`
          : `O saldo que você informou de ${nomeConta} ficou ${moeda(Math.abs(diferencaAjustada))} menor do que o sistema esperava no dia ${dataDia}${descontoTexto}. Pra onde foi esse dinheiro?`;
        const { error: erroInsert } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias').insert({
          conta: cfg.conta,
          data_dia: dataDia,
          tipo_origem: 'saldo_dia_agregado',
          valor: diferencaAjustada,
          origem_externa_id: null,
          descricao_sugerida: descricaoSugerida,
        });
        if (erroInsert) throw erroInsert;
        pendenciaCriada = true;
      }
    }

    resultados.push({
      conta: cfg.conta,
      entradaCalculada: entrada,
      saidaCalculada: saida,
      resultadoCalculado: resultado,
      saldoInformadoHoje: saldoHoje,
      saldoInformadoOntem: saldoOntem,
      dataDiaAnterior: anterior?.dataDia ?? null,
      variacaoInformada,
      diferenca,
      diferencaAjustada,
      pendenciaCriada,
    });
  }

  return resultados;
}

// ─── Orquestração — mesmo gatilho pras 2 demandas ──────────────────────────
// 227 roda PRIMEIRO sempre — 228 depende do resultado dela (soma das
// pendências do Mercado Pago do dia) pra descontar corretamente. Nunca
// chamar calcularGapContasSemApi direto pra 'mercadopago' sem passar por
// conciliarMercadoPagoDoDia antes, senão duplica.
export async function conciliarDia(dataDia: string): Promise<{
  matchingMercadoPago: ResultadoMatchingMP;
  gaps: ResultadoGapConta[];
}> {
  const matchingMercadoPago = await conciliarMercadoPagoDoDia(dataDia);
  const gaps = await calcularGapContasSemApi(dataDia, matchingMercadoPago.somaPendenciasDoDia);
  return { matchingMercadoPago, gaps };
}
