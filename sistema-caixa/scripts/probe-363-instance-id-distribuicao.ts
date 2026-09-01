// Sonda pontual (demanda 363): achado real, jsgrafica_contatos tem MAIS de
// um instance_id distinto (achado ao inspecionar amostra crua). Checar
// distribuição completa e comparar contra o instance_id ativo hoje em
// jsgrafica_agent_config. Se houver troca de instância no passado (reconexão
// da Z-API), isso pode explicar por que o dispositivo vinculado atual só
// "conhece" uma fração dos contatos reais. Só leitura.
//   npx tsx scripts/probe-363-instance-id-distribuicao.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  const { data: cfg } = await admin.from('jsgrafica_agent_config')
    .select('instance_id, token, client_token, canal_whatsapp_id').eq('ativo', true).single();
  console.log('instance_id ATIVO hoje (jsgrafica_agent_config):', cfg?.instance_id);

  // Supabase não tem GROUP BY simples via client, então pagina e agrega em memória.
  const contagemPorInstancia: Record<string, number> = {};
  const dataMinMaxPorInstancia: Record<string, { min: string; max: string }> = {};
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin.from('jsgrafica_contatos')
      .select('instance_id, data_primeiro_contato, data_ultimo_contato')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const inst = row.instance_id ?? '(null)';
      contagemPorInstancia[inst] = (contagemPorInstancia[inst] ?? 0) + 1;
      const d1 = row.data_primeiro_contato ?? '';
      if (!dataMinMaxPorInstancia[inst]) dataMinMaxPorInstancia[inst] = { min: d1, max: d1 };
      else {
        if (d1 && d1 < dataMinMaxPorInstancia[inst].min) dataMinMaxPorInstancia[inst].min = d1;
        if (d1 && d1 > dataMinMaxPorInstancia[inst].max) dataMinMaxPorInstancia[inst].max = d1;
      }
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log('\nDistribuição de instance_id em jsgrafica_contatos:');
  for (const [inst, n] of Object.entries(contagemPorInstancia)) {
    console.log(`  ${inst}: ${n} contatos, primeiro contato entre ${dataMinMaxPorInstancia[inst].min} e ${dataMinMaxPorInstancia[inst].max}`);
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
