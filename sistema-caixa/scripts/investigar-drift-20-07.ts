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
  const { limitesDiaCaixaUTC } = await import('../lib/supabase');

  const limites = limitesDiaCaixaUTC('20-07-26')!;
  const { data: vendas } = await supabaseAdmin.from('jsgrafica_vendas').select('total').eq('data_dia', '20-07-26');
  console.log('jsgrafica_vendas 20-07-26:', vendas?.length, 'linhas, soma:', (vendas ?? []).reduce((a, r) => a + Number(r.total), 0));

  const { data: pedidos } = await supabaseAdmin.from('jsgrafica_pedidos')
    .select('id, valor_final, pagamento_confirmado, status, cancelado_em, updated_at, data_entrada_caixa, pagamento_confirmado_at')
    .eq('pagamento_confirmado', true).neq('status', 'cancelado')
    .gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
  console.log('pedidos confirmados (pagamento_confirmado=true, não cancelado) na janela de 20-07-26:', pedidos?.length,
    'soma valor_final:', (pedidos ?? []).reduce((a, r) => a + Number(r.valor_final || 0), 0));

  // Pedidos CANCELADOS que ainda estão na janela de data_entrada_caixa (pra ver se algum foi cancelado DEPOIS do fechamento)
  const { data: cancelados } = await supabaseAdmin.from('jsgrafica_pedidos')
    .select('id, valor_final, status, cancelado_em, updated_at, data_entrada_caixa')
    .eq('status', 'cancelado')
    .gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
  console.log('\nPedidos CANCELADOS mas com data_entrada_caixa dentro de 20-07-26:', cancelados?.length);
  for (const c of cancelados ?? []) {
    console.log(`  ${c.id}: valor_final=${c.valor_final}, cancelado_em=${c.cancelado_em}, updated_at=${c.updated_at}`);
  }

  // fechamento original foi feito quando? pra comparar com updated_at dos cancelados
  const { data: fechamento } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select('fechado_em, total_entradas').eq('data_dia', '20-07-26').eq('fechado_por', 'Sistema').single();
  console.log('\nFechamento "Sistema" de 20-07-26 foi feito em:', fechamento?.fechado_em, '(total_entradas original:', fechamento?.total_entradas, ')');
}
main();
