// Sonda pontual (demanda 363): tentar achar endpoint de "forçar resync de
// contatos" na Z-API, agora que o gap de sincronização foi confirmado com
// caso real. Só GET (leitura/descoberta), nenhum POST que altere estado.
//   npx tsx scripts/probe-363-endpoints-resync.ts
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

  const candidatos = [
    '/contacts/sync', '/sync-contacts', '/sync', '/contacts/update',
    '/contacts/refresh', '/refresh-contacts', '/update-contacts',
    '/phone-code', '/restore-session', '/reconnect',
  ];
  for (const c of candidatos) {
    try {
      const res = await fetch(`${base}${c}`, { headers });
      const texto = await res.text();
      console.log(`GET ${c} -> ${res.status}: ${texto.slice(0, 150)}`);
    } catch (e) {
      console.log(`GET ${c} -> ERRO: ${e instanceof Error ? e.message : e}`);
    }
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
