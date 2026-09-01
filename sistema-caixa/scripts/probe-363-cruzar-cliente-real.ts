// Sonda pontual (demanda 363): cruzamento direto do telefone real do cliente
// do print do Edvam (+55 81 9849-5607) contra a lista sincronizada real da
// Z-API e contra jsgrafica_contatos, pra confirmar ou descartar a hipótese
// de gap de sincronização. Só leitura.
//   npx tsx scripts/probe-363-cruzar-cliente-real.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

const TELEFONE_ALVO = '558198495607'; // +55 81 9849-5607

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: cfg } = await admin.from('jsgrafica_agent_config')
    .select('instance_id, token, client_token').eq('ativo', true).single();
  const base = `https://api.z-api.io/instances/${cfg!.instance_id}/token/${cfg!.token}`;
  const headers: Record<string, string> = { 'Client-Token': cfg!.client_token };

  const sincronizados: Array<{ phone: string; name?: string; vname?: string; lid?: string }> = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${base}/contacts?page=${page}&pageSize=100`, { headers });
    const j = await res.json();
    if (!Array.isArray(j) || j.length === 0) break;
    sincronizados.push(...j);
    if (j.length < 100) break;
    page++;
    if (page > 200) break;
  }
  console.log(`Total sincronizado na Z-API: ${sincronizados.length}`);

  const encontradoZapi = sincronizados.find(c => c.phone === TELEFONE_ALVO);
  console.log(`\nTelefone ${TELEFONE_ALVO} está na lista SINCRONIZADA da Z-API?`, encontradoZapi ? 'SIM' : 'NÃO');
  if (encontradoZapi) console.log('Registro encontrado:', JSON.stringify(encontradoZapi));

  const { data: contatoReal } = await admin.from('jsgrafica_contatos')
    .select('*').eq('phone', TELEFONE_ALVO);
  console.log(`\nRegistro(s) em jsgrafica_contatos pra esse telefone:`, contatoReal?.length ?? 0);
  console.log(JSON.stringify(contatoReal, null, 2));

  // também tenta achar por telefone parecido (variação de formatação), caso
  // o número real esteja gravado diferente.
  const { data: parecidos } = await admin.from('jsgrafica_contatos')
    .select('phone, lead_name, instance_id, data_primeiro_contato, total_interacoes')
    .like('phone', '%98495607%');
  console.log(`\nBusca por variação (contém "98495607"):`, JSON.stringify(parecidos, null, 2));
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
