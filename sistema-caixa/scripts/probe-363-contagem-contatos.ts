// Sonda pontual (demanda 363): comparar total de contatos sincronizados na
// instância Z-API (dispositivo vinculado) contra o total real na tabela
// jsgrafica_contatos, pra checar se há sinal de dessincronia agregada. Só
// leitura, nenhuma escrita.
//   npx tsx scripts/probe-363-contagem-contatos.ts
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
  const res = await fetch(`${base}/contacts`, { headers });
  const contatosZapi = await res.json();
  console.log('Total de contatos sincronizados na instância Z-API:', contatosZapi.length);
  console.log('Shape de 1 contato:', JSON.stringify(contatosZapi[0], null, 2));

  const { count } = await admin.from('jsgrafica_contatos').select('*', { count: 'exact', head: true });
  console.log('Total de contatos na tabela jsgrafica_contatos (Supabase):', count);

  // cruza: quantos contatos reais (jsgrafica_contatos) NÃO aparecem na lista
  // sincronizada da Z-API, por telefone.
  const { data: contatosReais } = await admin.from('jsgrafica_contatos').select('telefone, nome, lead_name, created_at').limit(5000);
  const telefonesZapi = new Set((contatosZapi as Array<{ phone: string }>).map(c => c.phone));
  const semSync = (contatosReais ?? []).filter(c => c.telefone && !telefonesZapi.has(c.telefone));
  console.log(`Contatos reais SEM correspondência na lista sincronizada da Z-API: ${semSync.length} de ${contatosReais?.length ?? 0}`);
  console.log('Amostra (até 10):', JSON.stringify(semSync.slice(0, 10).map(c => ({ telefone: c.telefone, nome: c.nome ?? c.lead_name, created_at: c.created_at })), null, 2));
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
