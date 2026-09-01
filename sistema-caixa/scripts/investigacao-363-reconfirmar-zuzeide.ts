// Investigação (demanda 363, parte 1, reaberta de novo): o Edvam confirmou
// que a Zuzeide ESTÁ salva na agenda do telefone, o que quebra a
// interpretação "/contacts = WhatsApp + agenda". Reconfirmar com cuidado
// redobrado: buscar por telefone exato, variações de formato, e por nome,
// em TODAS as páginas baixadas de novo (fresh, não reaproveitar nada em
// memória de rodada anterior). Só leitura.
//   npx tsx scripts/investigacao-363-reconfirmar-zuzeide.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: cfg } = await admin.from('jsgrafica_agent_config')
    .select('instance_id, token, client_token').eq('ativo', true).single();
  const base = `https://api.z-api.io/instances/${cfg!.instance_id}/token/${cfg!.token}`;
  const headers: Record<string, string> = { 'Client-Token': cfg!.client_token };

  const todos: Array<{ phone: string; name?: string; vname?: string; short?: string; lid?: string; notify?: string }> = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${base}/contacts?page=${page}&pageSize=100`, { headers });
    const j = await res.json();
    if (!Array.isArray(j) || j.length === 0) { console.log(`página ${page}: vazia, parando`); break; }
    todos.push(...j);
    console.log(`página ${page}: ${j.length} contatos`);
    if (j.length < 100) break;
    page++;
    if (page > 300) { console.log('parou em 300 páginas por segurança'); break; }
  }
  console.log(`\nTotal baixado fresh: ${todos.length}`);

  const alvoExato = '558198495607';
  const variacoes = ['558198495607', '5581998495607', '81998495607', '8198495607', '5581984956075', '558198495607'];

  console.log('\n--- Busca por telefone exato e variações ---');
  for (const v of [...new Set(variacoes)]) {
    const achado = todos.find(c => c.phone === v);
    console.log(`phone === "${v}": ${achado ? 'ACHOU ' + JSON.stringify(achado) : 'não achou'}`);
  }

  console.log('\n--- Busca por substring "8495607" em qualquer campo ---');
  const porSubstring = todos.filter(c =>
    (c.phone ?? '').includes('8495607') ||
    (c.name ?? '').includes('8495607') ||
    (c.vname ?? '').includes('8495607'));
  console.log(JSON.stringify(porSubstring, null, 2));

  console.log('\n--- Busca por nome "Zuzeide" (case insensitive, qualquer campo de nome) ---');
  const porNome = todos.filter(c =>
    (c.name ?? '').toLowerCase().includes('zuzeide') ||
    (c.vname ?? '').toLowerCase().includes('zuzeide') ||
    (c.short ?? '').toLowerCase().includes('zuzeide'));
  console.log(JSON.stringify(porNome, null, 2));

  console.log(`\nTotal de phones distintos na lista: ${new Set(todos.map(c => c.phone)).size} (baixados: ${todos.length}, diferença indica duplicata)`);
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
