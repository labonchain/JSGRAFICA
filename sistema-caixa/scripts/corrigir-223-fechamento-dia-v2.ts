/**
 * Demanda 223 — versão CORRIGIDA do script de correção retroativa.
 *
 * Achado durante a aplicação do 20-07-26 (v1, corrigir-223-fechamento-dia.ts):
 * usar `getResumoDia` (live) pra recalcular o dia inteiro traz junto um
 * drift NÃO relacionado à 223 — o componente vendas+pedidos mudou entre o
 * momento em que o fechamento foi salvo e agora (mesmo fenômeno já
 * flagrado na demanda 222, seção 3.2, pro dia 21/07 — só que maior aqui,
 * R$51,20). Aplicar isso junto teria misturado uma correção NÃO PEDIDA
 * dentro da correção da 223.
 *
 * Esta versão só soma o delta exato da 223 (transferências recebidas no
 * dia) ao `total_entradas` ORIGINAL (congelado, passado explicitamente),
 * sem recalcular mais nada ao vivo — exatamente e só o que a 223 pediu.
 *
 *   npx tsx scripts/corrigir-223-fechamento-dia-v2.ts <dia> <dia anterior> <total_entradas ORIGINAL> <total_saidas ORIGINAL>
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

const [dataDia, dataDiaAnterior, totalEntradasOriginalStr, totalSaidasOriginalStr] = process.argv.slice(2);
function round2(v: number) { return Math.round(v * 100) / 100; }

async function main() {
  if (!dataDia || !dataDiaAnterior || !totalEntradasOriginalStr || !totalSaidasOriginalStr) {
    console.error('Uso: corrigir-223-fechamento-dia-v2.ts <dia> <dia anterior> <total_entradas ORIGINAL> <total_saidas ORIGINAL>');
    process.exit(1);
  }
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const totalEntradasOriginal = Number(totalEntradasOriginalStr);
  const totalSaidasOriginal = Number(totalSaidasOriginalStr);

  const { data: anterior } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select('data_dia, saldo_acumulado').eq('data_dia', dataDiaAnterior).eq('fechado_por', 'Sistema').single();
  if (!anterior) { console.error(`Fechamento "Sistema" de ${dataDiaAnterior} não encontrado.`); process.exit(1); }

  const { data: transferencias } = await supabaseAdmin.from('jsgrafica_transferencias')
    .select('valor, conta_origem, conta_destino').eq('data_dia', dataDia);
  const somaTransferencias = round2((transferencias ?? []).reduce((acc, t) => acc + Number(t.valor || 0), 0));
  console.log(`Transferências de ${dataDia}:`, transferencias);
  console.log(`Soma: R$${somaTransferencias.toFixed(2)}`);

  const { data: atual } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select('*').eq('data_dia', dataDia).eq('fechado_por', 'Sistema').single();
  if (!atual) { console.error(`Fechamento "Sistema" de ${dataDia} não encontrado.`); process.exit(1); }

  const saldoAnteriorNovo = Number(anterior.saldo_acumulado);
  const totalEntradasNovo = round2(totalEntradasOriginal + somaTransferencias);
  const resultadoDiaNovo = round2(totalEntradasNovo - totalSaidasOriginal);
  const saldoAcumuladoNovo = round2(saldoAnteriorNovo + resultadoDiaNovo);

  console.log(`\n=== ${dataDia} (delta-only: só soma transferência ao total_entradas ORIGINAL) ===`);
  console.log('Estado ATUAL da linha (pode já estar errado se uma correção anterior falhou):', {
    saldo_anterior: atual.saldo_anterior, total_entradas: atual.total_entradas,
    total_saidas: atual.total_saidas, resultado_dia: atual.resultado_dia, saldo_acumulado: atual.saldo_acumulado,
  });
  console.log('NOVO valor a aplicar:', {
    saldo_anterior: saldoAnteriorNovo, total_entradas: totalEntradasNovo,
    total_saidas: totalSaidasOriginal, resultado_dia: resultadoDiaNovo, saldo_acumulado: saldoAcumuladoNovo,
  });

  const bateFormula = Math.abs((saldoAnteriorNovo + resultadoDiaNovo) - saldoAcumuladoNovo) < 0.005;
  if (!bateFormula) { console.error('FÓRMULA NÃO BATE — abortando, nada foi alterado.'); process.exit(1); }

  const { error } = await supabaseAdmin.from('jsgrafica_fechamento').update({
    saldo_anterior: saldoAnteriorNovo,
    total_entradas: totalEntradasNovo,
    total_saidas: totalSaidasOriginal,
    resultado_dia: resultadoDiaNovo,
    saldo_acumulado: saldoAcumuladoNovo,
  }).eq('data_dia', dataDia).eq('fechado_por', 'Sistema');
  if (error) { console.error('Falha ao aplicar UPDATE', error); process.exit(1); }

  const { data: confirmado } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select('saldo_anterior, total_entradas, total_saidas, resultado_dia, saldo_acumulado')
    .eq('data_dia', dataDia).eq('fechado_por', 'Sistema').single();
  console.log('\nAPLICADO E RECONFERIDO NO BANCO:', confirmado);
  const bateNoBanco = Math.abs((Number(confirmado!.saldo_anterior) + Number(confirmado!.resultado_dia)) - Number(confirmado!.saldo_acumulado)) < 0.005;
  console.log(`Fórmula bate no banco depois do UPDATE: ${bateNoBanco ? 'OK' : 'FALHOU — investigar imediatamente'}`);
}

main();
