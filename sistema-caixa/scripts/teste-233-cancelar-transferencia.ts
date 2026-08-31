/**
 * Demanda 233 — teste sintético ponta a ponta:
 * 1) DELETE /api/saidas numa saída vinculada a transferência é bloqueado
 *    com mensagem clara (não mais o 500 genérico de antes).
 * 2) DELETE /api/transferencias cancela os 2 lados juntos (mecanismo já
 *    existia desde a 201, só sem UI — não muda nesta demanda).
 * 3) Cancelar uma saída NORMAL (sem transferência) continua funcionando
 *    sem nenhuma regressão.
 * Isolado em dia fictício de 2099.
 *
 *   npx tsx scripts/teste-233-cancelar-transferencia.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)![1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)![1].trim();
const supabase = createClient(url, key);
const BASE = 'http://127.0.0.1:3002';
const DIA = '06-01-99';

const criados: { tabela: string; id: string }[] = [];
async function inserir(tabela: string, linha: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.from(tabela).insert(linha).select().single();
  if (error) throw new Error(`Erro ao inserir em ${tabela}: ${error.message}`);
  criados.push({ tabela, id: data.id });
  return data;
}
async function limpar() {
  for (const { tabela, id } of criados.reverse()) {
    const { data } = await supabase.from(tabela).select('id').eq('id', id).maybeSingle();
    if (data) await supabase.from(tabela).delete().eq('id', id);
  }
  console.log(`Limpeza: verificado ${criados.length} linha(s) sintética(s).`);
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function main() {
  console.log('--- Cenário 1: bloquear DELETE /api/saidas numa saída vinculada ---');
  const saida = await inserir('jsgrafica_saidas', {
    data_dia: DIA, categoria_id: 'transferencia_entre_contas', categoria_nome: 'Transferência entre contas',
    valor: 400, operador: 'Teste',
  });
  const transferencia = await inserir('jsgrafica_transferencias', {
    data_dia: DIA, conta_origem: 'stone', conta_destino: 'caixa_economica', valor: 400,
    operador: 'Teste', saida_id: saida.id,
  });

  const resBloqueio = await fetch(`${BASE}/api/saidas`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: saida.id }),
  });
  const dataBloqueio = await resBloqueio.json();
  assert(resBloqueio.status === 400, `DELETE /api/saidas retorna 400 (não mais 500 genérico), veio ${resBloqueio.status}`);
  assert(dataBloqueio.error?.includes('transferência'), `mensagem clara mencionando transferência: "${dataBloqueio.error}"`);

  const { data: saidaAindaExiste } = await supabase.from('jsgrafica_saidas').select('id').eq('id', saida.id).maybeSingle();
  const { data: transfAindaExiste } = await supabase.from('jsgrafica_transferencias').select('id').eq('id', transferencia.id).maybeSingle();
  assert(!!saidaAindaExiste, 'saída continua existindo depois do bloqueio');
  assert(!!transfAindaExiste, 'transferência continua existindo depois do bloqueio (nada órfão, nada perdido)');

  console.log('\n--- Cenário 2: cancelar pela transferência (mecanismo da 201) cancela os 2 lados ---');
  const resCancelar = await fetch(`${BASE}/api/transferencias`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: transferencia.id }),
  });
  const dataCancelar = await resCancelar.json();
  assert(resCancelar.ok, `DELETE /api/transferencias respondeu ok: ${JSON.stringify(dataCancelar)}`);

  const { data: saidaDepois } = await supabase.from('jsgrafica_saidas').select('id').eq('id', saida.id).maybeSingle();
  const { data: transfDepois } = await supabase.from('jsgrafica_transferencias').select('id').eq('id', transferencia.id).maybeSingle();
  assert(!saidaDepois, 'saída foi removida junto');
  assert(!transfDepois, 'transferência foi removida');

  console.log('\n--- Cenário 3: cancelar saída NORMAL (sem transferência) — sem regressão ---');
  const saidaNormal = await inserir('jsgrafica_saidas', {
    data_dia: DIA, categoria_id: 'fornecedores', categoria_nome: 'Fornecedores', valor: 90, operador: 'Teste',
  });
  const resNormal = await fetch(`${BASE}/api/saidas`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: saidaNormal.id }),
  });
  const dataNormal = await resNormal.json();
  assert(resNormal.ok, `cancelar saída normal respondeu ok: ${JSON.stringify(dataNormal)}`);
  const { data: saidaNormalDepois } = await supabase.from('jsgrafica_saidas').select('id').eq('id', saidaNormal.id).maybeSingle();
  assert(!saidaNormalDepois, 'saída normal foi removida sem nenhum bloqueio');

  console.log('\n--- Sanity check: GET /api/transferencias?data= filtra por dia ---');
  const resGet = await fetch(`${BASE}/api/transferencias?data=${DIA}`);
  const dataGet = await resGet.json();
  assert(resGet.ok, 'GET com filtro de data respondeu ok');
  assert(Array.isArray(dataGet.transferencias), 'retornou lista de transferências');

  console.log('\n✅ TODOS OS TESTES PASSARAM');
}

main()
  .catch(e => { console.error('\n❌ ERRO:', e); process.exitCode = 1; })
  .finally(async () => { await limpar(); });
