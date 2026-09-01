// Sonda pontual (demanda 363, achado urgente): tentar achar endpoint real da
// Z-API pra (a) lista de contatos sincronizados na instância, (b)
// configuração de privacidade de Status, tentando validar/refutar a hipótese
// de dessincronia do dispositivo vinculado. Só leitura, nenhuma escrita.
//   npx tsx scripts/probe-363-contatos-privacidade-status.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: cfg } = await admin.from('jsgrafica_agent_config')
    .select('instance_id, token, client_token').eq('ativo', true).single();
  if (!cfg) throw new Error('config não encontrada');

  const base = `https://api.z-api.io/instances/${cfg.instance_id}/token/${cfg.token}`;
  const headers: Record<string, string> = { 'Client-Token': cfg.client_token };

  const candidatos = [
    '/contacts',
    '/contacts/list',
    '/phone-exists',
    '/device',
    '/device-info',
    '/status-privacy',
    '/privacy',
    '/status/privacy',
    '/whatsapp-privacy',
    '/connection-status',
    '/instance-status',
    '/me',
  ];

  for (const c of candidatos) {
    try {
      const res = await fetch(`${base}${c}`, { headers });
      const texto = await res.text();
      console.log(`${c} -> ${res.status}: ${texto.slice(0, 200)}`);
    } catch (e) {
      console.log(`${c} -> ERRO: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main().catch(e => { console.error('ERRO GERAL:', e); process.exit(1); });
