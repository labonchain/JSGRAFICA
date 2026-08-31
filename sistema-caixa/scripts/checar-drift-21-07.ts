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

  const { data: atual } = await supabaseAdmin.from('jsgrafica_fechamento')
    .select('total_entradas, total_saidas, fechado_em').eq('data_dia', '21-07-26').eq('fechado_por', 'Sistema').single();
  console.log('Fechamento 21-07-26 (original, ainda intocado):', atual);

  const limites = limitesDiaCaixaUTC('21-07-26')!;
  const { data: vendas } = await supabaseAdmin.from('jsgrafica_vendas').select('total').eq('data_dia', '21-07-26');
  const { data: pedidos } = await supabaseAdmin.from('jsgrafica_pedidos').select('valor_final')
    .eq('pagamento_confirmado', true).neq('status', 'cancelado')
    .gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
  const somaVendasPedidos = (vendas ?? []).reduce((a, r) => a + Number(r.total), 0)
    + (pedidos ?? []).reduce((a, r) => a + Number(r.valor_final || 0), 0);
  console.log('vendas+pedidos recalculado AGORA (sem transferência):', somaVendasPedidos);
  console.log('Diferença vs original:', Math.round((somaVendasPedidos - Number(atual!.total_entradas)) * 100) / 100);

  const { data: saidas } = await supabaseAdmin.from('jsgrafica_saidas').select('valor').eq('data_dia', '21-07-26');
  const somaSaidas = (saidas ?? []).reduce((a, r) => a + Number(r.valor), 0);
  console.log('saidas recalculado AGORA:', somaSaidas, '| original:', atual!.total_saidas,
    '| diferença:', Math.round((somaSaidas - Number(atual!.total_saidas)) * 100) / 100);
}
main();
