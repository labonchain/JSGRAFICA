// Sonda pontual (demanda 363): paginar /contacts até esgotar, pra achar o
// TOTAL real de contatos sincronizados na instância Z-API (achado anterior,
// 10, era só o tamanho de página padrão sem parâmetro). Cruza depois contra
// jsgrafica_contatos real. Só leitura.
//   npx tsx scripts/probe-363-contatos-completo.ts
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

  const todos: Array<{ phone: string; name?: string; vname?: string }> = [];
  let page = 1;
  const pageSize = 100;
  while (true) {
    const res = await fetch(`${base}/contacts?page=${page}&pageSize=${pageSize}`, { headers });
    const j = await res.json();
    if (!Array.isArray(j) || j.length === 0) break;
    todos.push(...j);
    console.log(`página ${page}: ${j.length} contatos (acumulado ${todos.length})`);
    if (j.length < pageSize) break;
    page++;
    if (page > 200) { console.log('parando em 200 páginas por segurança'); break; }
  }

  console.log(`\nTotal real de contatos sincronizados na instância Z-API: ${todos.length}`);

  const { count } = await admin.from('jsgrafica_contatos').select('*', { count: 'exact', head: true });
  console.log('Total de contatos na tabela jsgrafica_contatos (Supabase):', count);

  const { data: contatosReais } = await admin.from('jsgrafica_contatos').select('telefone, nome, lead_name, created_at, updated_at').limit(5000);
  const telefonesZapi = new Set(todos.map(c => c.phone));
  const semSync = (contatosReais ?? []).filter(c => c.telefone && !telefonesZapi.has(c.telefone));
  console.log(`\nContatos reais SEM correspondência na lista sincronizada da Z-API: ${semSync.length} de ${contatosReais?.length ?? 0}`);
  console.log('Amostra dos 15 mais recentes sem sync:', JSON.stringify(
    semSync.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 15)
      .map(c => ({ telefone: c.telefone, nome: c.nome ?? c.lead_name, created_at: c.created_at })),
    null, 2,
  ));
  console.log('Amostra dos 15 mais ANTIGOS sem sync:', JSON.stringify(
    semSync.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')).slice(0, 15)
      .map(c => ({ telefone: c.telefone, nome: c.nome ?? c.lead_name, created_at: c.created_at })),
    null, 2,
  ));
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
