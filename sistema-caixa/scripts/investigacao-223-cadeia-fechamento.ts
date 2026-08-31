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
  const { parseDiaCaixa } = await import('../lib/supabase');

  const { data } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select('data_dia, fechado_por, saldo_anterior, total_entradas, total_saidas, resultado_dia, saldo_acumulado, created_at')
    .eq('fechado_por', 'Sistema');

  const ordenado = (data ?? [])
    .map(r => ({ ...r, _d: parseDiaCaixa(r.data_dia) }))
    .sort((a, b) => a._d!.getTime() - b._d!.getTime());

  console.log('=== Cadeia completa de fechamento "Sistema" (ordenada por data real) ===');
  for (const r of ordenado) {
    const bate = Math.abs(Number(r.saldo_anterior) + Number(r.resultado_dia) - Number(r.saldo_acumulado)) < 0.01;
    console.log(`${r.data_dia}: saldo_anterior=${r.saldo_anterior}, entradas=${r.total_entradas}, saidas=${r.total_saidas}, resultado=${r.resultado_dia}, acumulado=${r.saldo_acumulado} ${bate ? '' : '<< FORMULA NAO BATE'}`);
  }
}

main();
