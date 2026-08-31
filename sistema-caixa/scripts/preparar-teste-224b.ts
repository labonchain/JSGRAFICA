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

const acao = process.argv[2];
async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const id = 'teste-224b-sintetico';
  if (acao === 'apagar') {
    await supabaseAdmin.from('jsgrafica_pedidos').delete().eq('id', id);
    console.log('Apagado.');
    return;
  }
  await supabaseAdmin.from('jsgrafica_pedidos').delete().eq('id', id);
  const { error } = await supabaseAdmin.from('jsgrafica_pedidos').insert({
    id, telefone: 'teste-224b', servico_id: null, servico_nome: 'Teste 224b',
    quantidade: 1, valor_unitario: 10, valor_total: 10, valor_final: 10,
    pagamento_tipo: 'pos_producao', status: 'confirmado', pagamento_confirmado: false,
  });
  if (error) { console.error('Falha ao criar', error); process.exit(1); }
  console.log('Pedido sintético (não confirmado) criado:', id);
}
main();
