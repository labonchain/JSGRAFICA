// Sonda pontual (demanda 363): cruzamento correto (coluna certa é `phone`,
// não `telefone`, achado no probe anterior) entre contatos reais
// (jsgrafica_contatos) e a lista sincronizada de verdade da Z-API
// (/contacts paginado). Objetivo: confirmar se contato SEM sync tende a ser
// mais recente (sinal de que sync do dispositivo vinculado ficou pra trás),
// e dar uma amostra de telefones reais sem sync pra cruzar com o caso do
// print do Edvam. Só leitura.
//   npx tsx scripts/probe-363-cruzamento-sync.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: cfg } = await admin.from('jsgrafica_agent_config')
    .select('instance_id, token, client_token').eq('ativo', true).single();
  const instanciaAtiva = cfg!.instance_id;
  const base = `https://api.z-api.io/instances/${cfg!.instance_id}/token/${cfg!.token}`;
  const headers: Record<string, string> = { 'Client-Token': cfg!.client_token };

  const sincronizados: Array<{ phone: string }> = [];
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
  const telefonesSincronizados = new Set(sincronizados.map(c => c.phone));
  console.log(`Total sincronizado na Z-API: ${telefonesSincronizados.size}`);

  // Só contatos REAIS (não grupo), da instância ATIVA hoje, pra comparação justa.
  const { data: contatosAtivos } = await admin.from('jsgrafica_contatos')
    .select('phone, lead_name, data_primeiro_contato, data_ultimo_contato, total_interacoes')
    .eq('instance_id', instanciaAtiva)
    .eq('is_group', false)
    .limit(5000);

  const semSync = (contatosAtivos ?? []).filter(c => c.phone && !telefonesSincronizados.has(c.phone));
  const comSync = (contatosAtivos ?? []).filter(c => c.phone && telefonesSincronizados.has(c.phone));
  console.log(`\nDa instância ATIVA (${instanciaAtiva}), contatos individuais reais: ${contatosAtivos?.length ?? 0}`);
  console.log(`  SEM sync na Z-API: ${semSync.length}`);
  console.log(`  COM sync na Z-API: ${comSync.length}`);

  const dataMedia = (arr: typeof semSync) => {
    const datas = arr.map(c => c.data_primeiro_contato).filter(Boolean).sort();
    return datas.length ? { primeiro: datas[0], ultimo: datas[datas.length - 1], mediana: datas[Math.floor(datas.length / 2)] } : null;
  };
  console.log('\nJanela de data_primeiro_contato, SEM sync:', JSON.stringify(dataMedia(semSync)));
  console.log('Janela de data_primeiro_contato, COM sync:', JSON.stringify(dataMedia(comSync)));

  console.log('\nAmostra de 15 telefones reais SEM sync (candidatos a cruzar com o print do Edvam):');
  console.log(JSON.stringify(semSync.slice(0, 15).map(c => ({ phone: c.phone, nome: c.lead_name, primeiro_contato: c.data_primeiro_contato, interacoes: c.total_interacoes })), null, 2));
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
