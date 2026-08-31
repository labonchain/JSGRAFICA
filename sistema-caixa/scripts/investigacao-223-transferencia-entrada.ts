/**
 * Demanda 223 — CHECKPOINT DE INVESTIGAÇÃO (não é implementação de produção).
 * 100% leitura. Objetivo: confirmar o valor exato da correção retroativa de
 * 17-07-26 (única data com transferência lançada até agora) antes de propor
 * a mudança em getResumoDia, e conferir que app/api/fechamento/route.ts usa
 * getResumoDia diretamente (não recalcula por conta própria).
 *
 *   npx tsx scripts/investigacao-223-transferencia-entrada.ts
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

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');

  const { data: todasTransferencias } = await supabaseAdmin.from('jsgrafica_transferencias')
    .select('id, data_dia, conta_origem, conta_destino, valor, operador, created_at')
    .order('data_dia');
  console.log(`=== TODAS as transferências já lançadas (${(todasTransferencias ?? []).length}) ===`);
  for (const t of todasTransferencias ?? []) {
    console.log(`- ${t.data_dia}: ${t.conta_origem} → ${t.conta_destino}, R$${t.valor}, operador=${t.operador}`);
  }

  const porDia: Record<string, number> = {};
  for (const t of todasTransferencias ?? []) {
    porDia[t.data_dia] = (porDia[t.data_dia] ?? 0) + Number(t.valor);
  }
  console.log('\n=== Soma por dia (valor a somar em totalEntradas, se a correção for aplicada) ===');
  for (const [dia, soma] of Object.entries(porDia)) {
    console.log(`- ${dia}: +R$${soma.toFixed(2)}`);
  }

  // Estado atual do fechamento "Sistema" nesses dias, pra saber o impacto exato.
  const dias = Object.keys(porDia);
  if (dias.length > 0) {
    const { data: fechamentos } = await supabaseAdmin.from('jsgrafica_fechamento')
      .select('data_dia, fechado_por, total_entradas, total_saidas, resultado_dia, saldo_anterior, saldo_acumulado')
      .in('data_dia', dias).eq('fechado_por', 'Sistema');
    console.log('\n=== Fechamento "Sistema" atual desses dias (ANTES da correção) ===');
    for (const f of fechamentos ?? []) {
      const somaTransf = porDia[f.data_dia] ?? 0;
      console.log(`- ${f.data_dia}: total_entradas=${f.total_entradas}, total_saidas=${f.total_saidas}, resultado_dia=${f.resultado_dia}, saldo_acumulado=${f.saldo_acumulado}`);
      console.log(`  → SE corrigido: total_entradas=${(Number(f.total_entradas) + somaTransf).toFixed(2)}, resultado_dia=${(Number(f.resultado_dia) + somaTransf).toFixed(2)}, saldo_acumulado=${(Number(f.saldo_acumulado) + somaTransf).toFixed(2)} (+R$${somaTransf.toFixed(2)})`);
    }
    if ((fechamentos ?? []).length === 0) {
      console.log('Nenhum fechamento "Sistema" encontrado pra esses dias — nada a corrigir retroativamente ainda (ficaria certo automaticamente quando for fechado).');
    }
  }
}

main();
