/**
 * Demanda 232 — teste sintético ponta a ponta: editar o valor/data de uma
 * saída vinculada a uma transferência sincroniza os 2 lados; tentar mudar a
 * categoria é bloqueado; editar uma saída NORMAL (sem transferência) não
 * tem regressão nenhuma. Isolado num dia fictício de 2099, mesmo padrão da
 * 223/231 — nenhum dado real tocado.
 *
 *   npx tsx scripts/teste-232-sync-transferencia.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)![1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)![1].trim();
const supabase = createClient(url, key);
const BASE = 'http://127.0.0.1:3002';

const DIA = '03-01-99'; // 2099-01-03, isolado
const DIA_NOVO = '04-01-99';

const criados: { tabela: string; id: string }[] = [];
async function inserir(tabela: string, linha: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.from(tabela).insert(linha).select().single();
  if (error) throw new Error(`Erro ao inserir em ${tabela}: ${error.message}`);
  criados.push({ tabela, id: data.id });
  return data;
}
async function limpar() {
  for (const { tabela, id } of criados.reverse()) await supabase.from(tabela).delete().eq('id', id);
  console.log(`Limpeza: ${criados.length} linha(s) sintética(s) removida(s).`);
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function main() {
  console.log('--- Cenário 1: saída vinculada a transferência ---');
  const saida = await inserir('jsgrafica_saidas', {
    data_dia: DIA, categoria_id: 'transferencia_entre_contas', categoria_nome: 'Transferência entre contas',
    valor: 500, operador: 'Teste',
  });
  const transferencia = await inserir('jsgrafica_transferencias', {
    data_dia: DIA, conta_origem: 'dinheiro_zu', conta_destino: 'mercadopago', valor: 500,
    operador: 'Teste', saida_id: saida.id,
  });

  console.log('\n--- Editando valor da saída (500 -> 777) ---');
  const resValor = await fetch(`${BASE}/api/saidas`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: saida.id, valor: 777, operador: 'Teste' }),
  });
  const dataValor = await resValor.json();
  assert(resValor.ok, `PATCH valor respondeu ok: ${JSON.stringify(dataValor)}`);

  const { data: saidaConfere1 } = await supabase.from('jsgrafica_saidas').select('valor').eq('id', saida.id).single();
  const { data: transfConfere1 } = await supabase.from('jsgrafica_transferencias').select('valor').eq('id', transferencia.id).single();
  assert(Number(saidaConfere1!.valor) === 777, `saída ficou com valor=777, veio ${saidaConfere1!.valor}`);
  assert(Number(transfConfere1!.valor) === 777, `transferência SINCRONIZOU pra valor=777, veio ${transfConfere1!.valor}`);

  console.log('\n--- Editando data_dia da saída (também deve sincronizar) ---');
  const resData = await fetch(`${BASE}/api/saidas`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: saida.id, dataDia: DIA_NOVO, operador: 'Teste' }),
  });
  assert(resData.ok, 'PATCH dataDia respondeu ok');
  const { data: saidaConfere2 } = await supabase.from('jsgrafica_saidas').select('data_dia').eq('id', saida.id).single();
  const { data: transfConfere2 } = await supabase.from('jsgrafica_transferencias').select('data_dia').eq('id', transferencia.id).single();
  assert(saidaConfere2!.data_dia === DIA_NOVO, `saída ficou com data_dia=${DIA_NOVO}, veio ${saidaConfere2!.data_dia}`);
  assert(transfConfere2!.data_dia === DIA_NOVO, `transferência SINCRONIZOU data_dia, veio ${transfConfere2!.data_dia}`);

  console.log('\n--- Tentando mudar a categoria (deve ser BLOQUEADO) ---');
  const resCategoria = await fetch(`${BASE}/api/saidas`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: saida.id, categoriaId: 'fornecedores', operador: 'Teste' }),
  });
  const dataCategoria = await resCategoria.json();
  assert(resCategoria.status === 400, `mudar categoria retorna 400, veio ${resCategoria.status}`);
  assert(!!dataCategoria.error, `mensagem de erro clara: ${dataCategoria.error}`);
  const { data: saidaConfereCategoria } = await supabase.from('jsgrafica_saidas').select('categoria_id').eq('id', saida.id).single();
  assert(saidaConfereCategoria!.categoria_id === 'transferencia_entre_contas', 'categoria NÃO mudou depois do bloqueio');

  console.log('\n--- Cenário 2: saída NORMAL (sem transferência) — sem regressão ---');
  const saidaNormal = await inserir('jsgrafica_saidas', {
    data_dia: DIA, categoria_id: 'fornecedores', categoria_nome: 'Fornecedores', valor: 100, operador: 'Teste',
  });
  const resNormal = await fetch(`${BASE}/api/saidas`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: saidaNormal.id, valor: 150, categoriaId: 'socios', operador: 'Teste' }),
  });
  const dataNormal = await resNormal.json();
  assert(resNormal.ok, `PATCH em saída normal respondeu ok: ${JSON.stringify(dataNormal)}`);
  const { data: saidaNormalConfere } = await supabase.from('jsgrafica_saidas').select('valor, categoria_id').eq('id', saidaNormal.id).single();
  assert(Number(saidaNormalConfere!.valor) === 150, 'saída normal: valor editado normalmente');
  assert(saidaNormalConfere!.categoria_id === 'socios', 'saída normal: categoria editada normalmente (sem bloqueio)');

  console.log('\n✅ TODOS OS TESTES PASSARAM');
}

main()
  .catch(e => { console.error('\n❌ ERRO:', e); process.exitCode = 1; })
  .finally(async () => { await limpar(); });
