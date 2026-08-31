/**
 * Demanda 230 — teste sintético do novo texto de `saldo_dia_agregado`
 * (positivo, negativo, negativo-com-desconto) via `calcularGapContasSemApi`
 * real, num dia isolado (2099). Não testa `mercadopago_pagamento` aqui (não
 * dá pra sintetizar pagamento aprovado real na API do MP) — esse caminho é
 * validado pelo próprio backfill (scripts/backfill-230-descricao-amigavel.ts),
 * que rebusca pagamentos REAIS já em produção.
 *
 *   npx tsx scripts/teste-230-textos.ts
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

const DIA_ONTEM = '01-01-99';
const DIA_HOJE = '02-01-99';

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const { calcularGapContasSemApi } = await import('../lib/conciliacao');

  // Fechamento "ontem": saldos base.
  await supabaseAdmin.from('jsgrafica_fechamento').upsert({
    data_dia: DIA_ONTEM, fechado_por: 'Sistema', saldo_anterior: 0, total_entradas: 0, total_saidas: 0,
    resultado_dia: 0, saldo_acumulado: 0, bancos: 0, dinheiro: 0, moedas: 0, total_fisico: 0,
    divergencia: 0, saldo_stone: 100, saldo_caixa_economica: 50, saldo_mercadopago: 200, saldo_recargapay: 10,
    fechado_em: new Date().toISOString(),
  }, { onConflict: 'data_dia,fechado_por' });

  // Fechamento "hoje": Stone subiu sem explicação (+30, positivo, sem
  // dedup); Caixa Econômica caiu sem explicação (-20, negativo, sem dedup).
  await supabaseAdmin.from('jsgrafica_fechamento').upsert({
    data_dia: DIA_HOJE, fechado_por: 'Sistema', saldo_anterior: 0, total_entradas: 0, total_saidas: 0,
    resultado_dia: 0, saldo_acumulado: 0, bancos: 0, dinheiro: 0, moedas: 0, total_fisico: 0,
    divergencia: 0, saldo_stone: 130, saldo_caixa_economica: 30, saldo_mercadopago: 240, saldo_recargapay: 10,
    fechado_em: new Date().toISOString(),
  }, { onConflict: 'data_dia,fechado_por' });

  try {
    console.log('=== Sem dedup (Mercado Pago com somaPendenciasMPDoDia=0) ===');
    const semDedup = await calcularGapContasSemApi(DIA_HOJE, 0);
    for (const g of semDedup) {
      if (g.pendenciaCriada) {
        const { data } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
          .select('descricao_sugerida').eq('data_dia', DIA_HOJE).eq('conta', g.conta).eq('tipo_origem', 'saldo_dia_agregado').single();
        console.log(`[${g.conta}] ${data?.descricao_sugerida}`);
      }
    }
  } finally {
    console.log('\n=== Limpeza ===');
    await supabaseAdmin.from('jsgrafica_conciliacao_pendencias').delete().in('data_dia', [DIA_ONTEM, DIA_HOJE]);
    await supabaseAdmin.from('jsgrafica_fechamento').delete().in('data_dia', [DIA_ONTEM, DIA_HOJE]).eq('fechado_por', 'Sistema');
    console.log('Limpeza concluída.');
  }
}

main();
