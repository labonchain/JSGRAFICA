/**
 * Demandas 227/228 — teste fim a fim contra dado real (21-07-26, o dia com o
 * caso concreto do R$300 achado na demanda 222). Chama a função de PRODUÇÃO
 * (`conciliarDia`, lib/conciliacao.ts) diretamente — não é mock, é o mesmo
 * código que a rota automática/sob demanda chama. Roda 2x de propósito pra
 * confirmar idempotência (critério de aceite explícito das 2 demandas: não
 * duplicar item se rodado 2x pro mesmo dia).
 *
 * As pendências criadas são reais (refletem discrepâncias reais — não são
 * dado sintético a limpar depois, são exatamente o resultado que a feature
 * deve produzir em produção).
 *
 *   npx tsx scripts/teste-e2e-conciliacao-227-228.ts
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
  const { conciliarDia } = await import('../lib/conciliacao');
  const { supabaseAdmin } = await import('../lib/supabase-admin');

  const DIA = '21-07-26';

  console.log(`=== 1ª rodada — conciliarDia('${DIA}') ===`);
  const r1 = await conciliarDia(DIA);
  console.log(JSON.stringify(r1, null, 2));

  console.log(`\n=== 2ª rodada (mesma data, idempotência) — conciliarDia('${DIA}') ===`);
  const r2 = await conciliarDia(DIA);
  console.log(JSON.stringify(r2, null, 2));

  const okIdempotenciaMP = r2.matchingMercadoPago.pendenciasCriadasAgora === 0
    && r2.matchingMercadoPago.pendenciasJaExistentes === (r1.matchingMercadoPago.pendenciasCriadasAgora + r1.matchingMercadoPago.pendenciasJaExistentes);
  const okIdempotenciaGaps = r2.gaps.every(g => g.pendenciaCriada === false);

  console.log(`\nIdempotência matching MP (2ª rodada não criou nada novo): ${okIdempotenciaMP ? 'OK' : 'FALHOU'}`);
  console.log(`Idempotência gaps agregados (2ª rodada não criou nada novo): ${okIdempotenciaGaps ? 'OK' : 'FALHOU'}`);

  const casoR300 = true; // conferido abaixo via query direta
  const { data: pendenciasHoje } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
    .select('conta, tipo_origem, valor, origem_externa_id, descricao_sugerida, status')
    .eq('data_dia', DIA).order('tipo_origem');
  console.log(`\n=== Estado final em jsgrafica_conciliacao_pendencias pra ${DIA} (${(pendenciasHoje ?? []).length} linhas) ===`);
  for (const p of pendenciasHoje ?? []) {
    console.log(`- ${p.tipo_origem} / ${p.conta} / R$${p.valor} / ${p.origem_externa_id ?? '(sem id externo)'} / ${p.status} — ${p.descricao_sugerida}`);
  }

  const temR300 = (pendenciasHoje ?? []).some(p => Number(p.valor) === 300 && p.tipo_origem === 'mercadopago_pagamento');
  console.log(`\nCaso R$300 de 21/07 presente como pendência 'mercadopago_pagamento': ${temR300 ? 'OK' : 'NÃO ENCONTRADO — investigar'}`);

  const gapMP = r2.gaps.find(g => g.conta === 'mercadopago');
  console.log(`\nGap agregado do Mercado Pago em ${DIA}: diferença bruta=${gapMP?.diferenca}, ajustada (pós-desconto da 227)=${gapMP?.diferencaAjustada}, pendência criada=${gapMP?.pendenciaCriada}`);
}

main();
