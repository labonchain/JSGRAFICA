/**
 * Demanda 230 — script de UMA VEZ SÓ: reescreve `descricao_sugerida` dos
 * itens de conciliação (227/228) que já estavam em produção ANTES da 230,
 * ainda `status='pendente'` (nunca toca item já classificado/ignorado — a
 * decisão daquele item já foi tomada com o texto antigo, mexer agora não
 * muda nada e só arrisca inconsistência com o `classificacao` gravado).
 *
 * - `saldo_dia_agregado`: recalcula o texto novo com os campos já salvos na
 *   própria linha (conta, valor, data_dia) + a mesma soma de pendências de
 *   Mercado Pago do dia (recomputada por query direta, mesmo critério de
 *   `conciliarMercadoPagoDoDia`).
 * - `mercadopago_pagamento`: rebusca o pagamento na API do Mercado Pago
 *   (`origem_externa_id`) só pra pegar `payment_type_id`/horário de novo —
 *   não recalcula nem toca em valor/conta/status, só o texto.
 *
 *   npx tsx scripts/backfill-230-descricao-amigavel.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const text = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
    for (const line of text.split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 0 || line.trim().startsWith('#')) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = v;
    }
  } catch { /* ignorar */ }
}
loadEnv();

function moeda(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const { buscarPagamentoPorId } = await import('../lib/mercadopago');
  const { CONTAS_ORIGEM } = await import('../lib/dados');
  const LABEL_CONTA: Record<string, string> = Object.fromEntries(CONTAS_ORIGEM.map(c => [c.id, c.label]));

  const { data: pendentes, error } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
    .select('id, conta, data_dia, tipo_origem, valor, origem_externa_id, descricao_sugerida')
    .eq('status', 'pendente');
  if (error) throw error;
  console.log(`Encontradas ${pendentes?.length ?? 0} pendências (status='pendente') pra atualizar.\n`);

  for (const p of pendentes ?? []) {
    let novaDescricao: string | null = null;

    if (p.tipo_origem === 'mercadopago_pagamento' && p.origem_externa_id) {
      try {
        const pagamento = await buscarPagamentoPorId(p.origem_externa_id);
        const hora = new Date(pagamento.date_created).toLocaleTimeString('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' });
        const dataFmt = new Date(pagamento.date_created).toLocaleDateString('pt-BR', { timeZone: 'America/Recife', day: '2-digit', month: '2-digit' });
        novaDescricao = `Você recebeu ${moeda(Number(p.valor))} ${fraseTipoPagamentoMP(pagamento.payment_type_id)} às ${hora} do dia ${dataFmt}, sem nenhum pedido ou venda correspondente no sistema. Você sabe o que foi esse pagamento?`;
      } catch (e) {
        console.error(`Falha ao rebuscar pagamento ${p.origem_externa_id} (${p.id}) — mantendo texto antigo`, e);
        continue;
      }
    } else if (p.tipo_origem === 'saldo_dia_agregado') {
      const nomeConta = LABEL_CONTA[p.conta] ?? p.conta;
      let somaPendenciasMPDoDia = 0;
      if (p.conta === 'mercadopago') {
        const { data: outrasDoMesmoDia } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
          .select('valor').eq('tipo_origem', 'mercadopago_pagamento').eq('data_dia', p.data_dia);
        somaPendenciasMPDoDia = (outrasDoMesmoDia ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);
      }
      const valor = Number(p.valor);
      const jaDescontou = p.conta === 'mercadopago' && somaPendenciasMPDoDia > 0;
      const descontoTexto = jaDescontou
        ? ' — esse valor já não conta os pagamentos individuais do Mercado Pago listados separadamente nesta tela'
        : '';
      novaDescricao = valor > 0
        ? `O saldo que você informou de ${nomeConta} subiu ${moeda(valor)} no dia ${p.data_dia}, mas o sistema não tem nenhuma venda, despesa ou transferência registrada que explique isso${jaDescontou ? ', além do que já está listado separadamente nesta tela' : ''}. De onde veio esse dinheiro?`
        : `O saldo que você informou de ${nomeConta} ficou ${moeda(Math.abs(valor))} menor do que o sistema esperava no dia ${p.data_dia}${descontoTexto}. Pra onde foi esse dinheiro?`;
    }

    if (!novaDescricao) { console.log(`Pulado (tipo desconhecido): ${p.id}`); continue; }

    console.log(`--- ${p.id} (${p.tipo_origem}, ${p.conta}, ${moeda(Number(p.valor))}) ---`);
    console.log('ANTES:', p.descricao_sugerida);
    console.log('DEPOIS:', novaDescricao);
    const { error: erroUpdate } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
      .update({ descricao_sugerida: novaDescricao }).eq('id', p.id);
    if (erroUpdate) console.error('Falha ao atualizar', p.id, erroUpdate);
    console.log('');
  }

  console.log('Backfill concluído.');
}

main();
