// Sonda pontual (demanda 363): testar se /contacts da Z-API está paginado
// por padrão (10 pode ser um limite de página, não o total real). Só
// leitura.
//   npx tsx scripts/probe-363-paginacao-contatos.ts
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

  for (const qs of ['', '?page=1&pageSize=100', '?page=1&limit=100', '?limit=5000', '?page=2&pageSize=10']) {
    const res = await fetch(`${base}/contacts${qs}`, { headers });
    const j = await res.json();
    console.log(`/contacts${qs} -> length=${Array.isArray(j) ? j.length : 'n/a'}`);
  }

  const res2 = await fetch(`${base}/contacts`, { headers });
  const todos = await res2.json();
  console.log('Lista completa:', JSON.stringify(todos, null, 2));
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
