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

  const { data: peds } = await supabaseAdmin.from('jsgrafica_pedidos')
    .select('id, servico_id, servico_nome, forma_pagamento, pagamento_confirmado, pagamento_confirmado_origem, pagamento_confirmado_at, created_at, venda_id, status, data_producao_at, data_pronto_at, data_entregue_at, pagamento_confirmacoes_historico')
    .in('id', ['ped-1367', 'ped-1368']);
  for (const p of peds ?? []) {
    console.log(`\n=== ${p.id} ===`);
    console.log(JSON.stringify(p, null, 2));
  }

  // Confere se ped-1367 é venda de item único ou mista.
  const p1367 = (peds ?? []).find(p => p.id === 'ped-1367');
  if (p1367?.venda_id) {
    const { data: doGrupo } = await supabaseAdmin.from('jsgrafica_pedidos')
      .select('id, servico_id, servico_nome').eq('venda_id', p1367.venda_id);
    console.log(`\nItens da mesma venda (${p1367.venda_id}):`, doGrupo);
  } else {
    console.log('\nped-1367 não tem venda_id — item único (não é carrinho agrupado).');
  }

  // categoria do produto (recarga ou não)
  if (p1367?.servico_id) {
    const { data: prod } = await supabaseAdmin.from('jsgrafica_produtos').select('id, nome, categoria').eq('id', p1367.servico_id).maybeSingle();
    console.log('\nProduto de ped-1367:', prod);
  }
}

main();
