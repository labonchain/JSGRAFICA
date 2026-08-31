import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf-8');
const campo = (n: string) => env.match(new RegExp(`${n}=(.*)`))![1].trim();

async function main() {
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: cfg } = await admin.from('jsgrafica_agent_config')
    .select('instance_id, token, client_token, canal_whatsapp_id').eq('ativo', true).single();
  if (!cfg) throw new Error('config não encontrada');
  const base = `https://api.z-api.io/instances/${cfg.instance_id}/token/${cfg.token}`;
  const res = await fetch(`${base}/newsletter?phone=${encodeURIComponent(cfg.canal_whatsapp_id)}`, {
    headers: { 'client-token': cfg.client_token },
  });
  console.log(await res.text());
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
