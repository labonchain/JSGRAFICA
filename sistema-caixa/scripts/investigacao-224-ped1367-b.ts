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
  const { data: p } = await supabaseAdmin.from('jsgrafica_pedidos')
    .select('id, telefone, nome_cliente, quem_vai_buscar, jornada_tipo, pedido_criado_por, mp_order_id, requer_comprovante, chave_pix, pagamento_tipo, forma_pagamento_escolhida, pagamento_momento, tipo_entrega_escolhido, confirmado_cliente_at, gaveta_destino')
    .eq('id', 'ped-1367').single();
  console.log(JSON.stringify(p, null, 2));
}
main();
