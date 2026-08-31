// Sonda pontual (demanda 354): descobrir o endpoint real de "listar
// seguidores do canal" — doc (guia-canal-whatsapp-automacao.md) e llms.txt
// da Z-API discordam entre si, e a doc já errou 2x nesta integração antes
// (achados reais da 352). Só leitura, nenhuma escrita.
//   npx tsx scripts/probe-354-endpoint-seguidores.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: cfg } = await admin.from('jsgrafica_agent_config')
    .select('instance_id, token, client_token, canal_whatsapp_id').eq('ativo', true).single();
  if (!cfg) throw new Error('config não encontrada');

  const base = `https://api.z-api.io/instances/${cfg.instance_id}/token/${cfg.token}`;
  const canalId = cfg.canal_whatsapp_id as string;
  const candidatos = [
    `/newsletter-subscribers?phone=${encodeURIComponent(canalId)}`,
    `/newsletter/subscribers?phone=${encodeURIComponent(canalId)}`,
    `/newsletter/${encodeURIComponent(canalId)}/subscribers`,
    `/newsletter-followers?phone=${encodeURIComponent(canalId)}`,
    `/newsletter/followers?phone=${encodeURIComponent(canalId)}`,
    `/newsletter/${encodeURIComponent(canalId)}/followers`,
    `/newsletter-subscribers/${encodeURIComponent(canalId)}`,
    `/newsletter-subscribers-count?phone=${encodeURIComponent(canalId)}`,
  ];

  for (const path of candidatos) {
    const res = await fetch(`${base}${path}`, { headers: { 'client-token': cfg.client_token } });
    const corpo = await res.text();
    console.log(`\n${path}\n  status=${res.status}\n  body=${corpo.slice(0, 300)}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
