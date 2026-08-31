/**
 * Demanda 229 — regressão: confirma que app/api/saidas (POST) e
 * app/api/transferencias (POST), depois da extração pra
 * criarSaida/criarTransferencia (lib/supabase-admin.ts), continuam se
 * comportando EXATAMENTE como antes quando chamadas sem `dataDia` (uso
 * normal das telas existentes — sempre grava hoje).
 *
 *   npx tsx scripts/teste-229-regressao-rotas.ts
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

const BASE = 'http://localhost:3000';

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const { formatarDiaCaixa } = await import('../lib/supabase');
  const hoje = formatarDiaCaixa();

  const { data: categorias } = await supabaseAdmin.from('jsgrafica_categorias_saida').select('id').eq('ativo', true).limit(1);
  const categoriaId = categorias?.[0]?.id;

  console.log('=== POST /api/saidas (sem dataDia — deve gravar hoje, como sempre) ===');
  const resSaida = await fetch(`${BASE}/api/saidas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoriaId, valor: 7.77, descricao: 'teste regressão 229', operador: 'teste-229-regressao' }),
  });
  const dataSaida = await resSaida.json();
  console.log(resSaida.status, dataSaida);
  const okSaida = resSaida.status === 200 && dataSaida.success && dataSaida.nomeAba === hoje && dataSaida.valor === 7.77;
  console.log(okSaida ? 'OK' : 'FALHOU');

  console.log('\n=== POST /api/saidas com categoriaId inválido (deve dar 400, não 500) ===');
  const resSaidaErro = await fetch(`${BASE}/api/saidas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoriaId: 'categoria-que-nao-existe-999', valor: 5, operador: 'teste-229' }),
  });
  console.log(resSaidaErro.status, await resSaidaErro.json(), resSaidaErro.status === 400 ? 'OK' : 'FALHOU');

  console.log('\n=== POST /api/transferencias (sem dataDia — deve gravar hoje, como sempre) ===');
  const resTransf = await fetch(`${BASE}/api/transferencias`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contaOrigem: 'stone', contaDestino: 'recargapay', valor: 3.33, descricao: 'teste regressão 229', operador: 'teste-229-regressao' }),
  });
  const dataTransf = await resTransf.json();
  console.log(resTransf.status, dataTransf);
  const okTransf = resTransf.status === 200 && dataTransf.success && dataTransf.transferencia?.data_dia === hoje;
  console.log(okTransf ? 'OK' : 'FALHOU');

  console.log('\n=== POST /api/transferencias com mesma conta origem/destino (deve dar 400) ===');
  const resTransfErro = await fetch(`${BASE}/api/transferencias`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contaOrigem: 'stone', contaDestino: 'stone', valor: 5, operador: 'teste-229' }),
  });
  console.log(resTransfErro.status, await resTransfErro.json(), resTransfErro.status === 400 ? 'OK' : 'FALHOU');

  // Limpeza
  console.log('\n=== Limpeza ===');
  await supabaseAdmin.from('jsgrafica_saidas').delete().eq('operador', 'teste-229-regressao');
  const { data: transfsLimpar } = await supabaseAdmin.from('jsgrafica_transferencias').select('id, saida_id').eq('operador', 'teste-229-regressao');
  for (const t of transfsLimpar ?? []) {
    await supabaseAdmin.from('jsgrafica_transferencias').delete().eq('id', t.id);
    if (t.saida_id) await supabaseAdmin.from('jsgrafica_saidas').delete().eq('id', t.saida_id);
  }
  console.log('Limpeza concluída.');
}

main();
