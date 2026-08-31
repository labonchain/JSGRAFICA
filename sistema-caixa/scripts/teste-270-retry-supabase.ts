/**
 * Demanda 270 — teste sintético do retry em `supabaseAdmin` (lib/supabase-admin.ts).
 * Mocka `globalThis.fetch` ANTES de importar o módulo (a função interna
 * resolve `fetch` em tempo de chamada, então o mock é capturado normalmente)
 * — nenhuma chamada real ao Supabase acontece, tudo é resposta/exceção
 * fake, sem tocar rede.
 *
 * Desenho confirmado no checkpoint: GET/HEAD/OPTIONS passam DIRETO pro
 * fetch nativo (o @supabase/postgrest-js instalado já retry sozinho essas —
 * 3 tentativas, backoff 1s/2s/4s, ver node_modules/@supabase/postgrest-js).
 * Só ESCRITA (POST/PATCH/DELETE) ganha retry aqui, e só em exceção de rede
 * genuína (nunca em resposta HTTP recebida, mesmo 5xx — risco de duplicar).
 *
 *   npx tsx scripts/teste-270-retry-supabase.ts
 */
import { readFileSync } from 'fs';
const envFile = readFileSync('.env.local', 'utf-8');
for (const linha of envFile.split('\n')) {
  const m = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

type Comportamento = () => Response;
let chamadas = 0;
let script: Comportamento[] = [];

function respostaFake(status: number, corpo: unknown = []): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}
function falhaDeRede(): never {
  throw new TypeError('fetch failed: upstream connect error or disconnect/reset before headers... delayed connect error: 111');
}

const fetchOriginal = globalThis.fetch;
globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
  chamadas++;
  const metodo = (args[1] as RequestInit | undefined)?.method ?? 'GET';
  console.log(`  [mock fetch chamada ${chamadas}] método=${metodo}`);
  const passo = script[chamadas - 1];
  if (!passo) return respostaFake(503, 'mock esgotado — indica retry além do esperado');
  return passo();
}) as typeof fetch;

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');

  console.log('--- Cenário 1: GET com exceção de rede — passa direto pro retry NATIVO do postgrest-js (não duplica) ---');
  chamadas = 0;
  script = [() => falhaDeRede(), () => respostaFake(200, [])];
  const r1 = await supabaseAdmin.from('jsgrafica_pedidos').select('id').limit(1);
  assert(chamadas === 2, `retry nativo recuperou em 2 chamadas (não passou pelo meu wrapper de escrita), veio ${chamadas}`);
  assert(r1.error === null, `sem erro depois de recuperar, veio ${JSON.stringify(r1.error)}`);

  console.log('\n--- Cenário 2: ESCRITA (insert) com 2 exceções de rede seguidas de sucesso — meu retry recupera ---');
  chamadas = 0;
  script = [() => falhaDeRede(), () => falhaDeRede(), () => respostaFake(201, [{ id: 'fake' }])];
  const r2 = await supabaseAdmin.from('jsgrafica_pedidos').insert({ telefone: '0', servico_nome: 'x', valor_final: 0 }).select();
  assert(chamadas === 3, `usou as 3 tentativas (1 original + 2 retry), veio ${chamadas}`);
  assert(r2.error === null, `sem erro depois de recuperar, veio ${JSON.stringify(r2.error)}`);

  console.log('\n--- Cenário 3: ESCRITA com exceção de rede PERSISTENTE — esgota tentativas, erro real sobe ---');
  chamadas = 0;
  script = [() => falhaDeRede(), () => falhaDeRede(), () => falhaDeRede()];
  const r3 = await supabaseAdmin.from('jsgrafica_pedidos').insert({ telefone: '0', servico_nome: 'x', valor_final: 0 }).select();
  assert(chamadas === 3, `esgotou as 3 tentativas, veio ${chamadas}`);
  assert(r3.error !== null, 'erro real aparece pro chamador depois de esgotar as tentativas (não fica escondido)');

  console.log('\n--- Cenário 4: ESCRITA com resposta HTTP 503 (não exceção) — NUNCA tenta de novo (evita duplicar) ---');
  chamadas = 0;
  script = [() => respostaFake(503, 'upstream connect error')];
  const r4 = await supabaseAdmin.from('jsgrafica_pedidos').insert({ telefone: '0', servico_nome: 'x', valor_final: 0 }).select();
  assert(chamadas === 1, `só 1 tentativa numa escrita com 503 recebido (nunca arrisca duplicar), veio ${chamadas}`);
  assert(r4.error !== null, 'erro sobe imediato, sem retry mascarar');

  console.log('\n--- Cenário 5: ESCRITA bem-sucedida de primeira — sem retry nenhum, sem atraso ---');
  chamadas = 0;
  script = [() => respostaFake(201, [{ id: 'fake' }])];
  const r5 = await supabaseAdmin.from('jsgrafica_pedidos').insert({ telefone: '0', servico_nome: 'x', valor_final: 0 }).select();
  assert(chamadas === 1, `1 única chamada no caminho feliz, veio ${chamadas}`);
  assert(r5.error === null, 'sucesso de primeira, sem erro');

  console.log('\n✅ TODOS OS TESTES PASSARAM (nenhuma chamada real ao Supabase — tudo mockado)');
}

main()
  .catch(e => { console.error('\n❌ ERRO:', e); process.exitCode = 1; })
  .finally(() => { globalThis.fetch = fetchOriginal; });
