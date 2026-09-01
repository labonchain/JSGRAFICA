// Investigação (demanda 363, parte 2, reaberta de verdade): a teoria de
// "acumulo de backlog" foi REFUTADA pelo cruzamento com os números reais do
// Edvam — painel mostra 8-20x mais que o WhatsApp real, e o valor do painel
// fica quase constante (~800-980) INDEPENDENTE de o post ser de 5h atrás ou
// de poucos minutos atrás, o que não bateria com acumulo real ao longo do
// tempo. Isso indica um bug de correlação de verdade: a contagem pode estar
// pegando um pool muito mais amplo de participants do que deveria (talvez
// por causa das linhas "fan-out" com vários ids na mesma linha, achadas
// antes). Testar: contar SÓ as linhas onde o array `ids` tem exatamente 1
// elemento e esse elemento é o message_id exato (sem fan-out nenhum),
// comparar com o valor da RPC. Só leitura.
//   npx tsx scripts/investigacao-363-isolar-bug-real.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

const REAIS = [
  { horario: '15:06', views: 45, messageId: '3EB0B81CB55C307BB68152' },
  { horario: '14:06', views: 58, messageId: '33235FB6CD5287BD69DE' },
  { horario: '13:06', views: 74, messageId: '3EB060FE78DF88F994CDC4' },
  { horario: '12:06', views: 93, messageId: '3EB09F84FC5547680C0783' },
  { horario: '11:05', views: 107, messageId: '717FC5CE6C19164CD35F' },
  { horario: '10:05', views: 114, messageId: '3EB03519AE9C56ED46672C' },
];

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  console.log('Baixando toda a tabela jsgrafica_status_visualizacoes...');
  const todasLinhas: Array<{ participant: string; ids: string[] }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin.from('jsgrafica_status_visualizacoes').select('participant, ids').range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    todasLinhas.push(...(data as typeof todasLinhas));
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Total: ${todasLinhas.length} linhas\n`);

  const { data: contagens } = await admin.rpc('jsgrafica_contar_visualizacoes_status', { message_ids: REAIS.map(r => r.messageId) });
  const mapaRpc = new Map<string, number>((contagens ?? []).map((c: { message_id: string; visualizacoes: number }) => [c.message_id, c.visualizacoes]));

  console.log('--- Real vs RPC (painel) vs contagem LIMPA (só linhas com ids.length===1 e igual ao alvo) ---');
  for (const r of REAIS) {
    const linhasExatas = todasLinhas.filter(l => (l.ids?.length ?? 0) === 1 && l.ids[0] === r.messageId);
    const distintosLimpo = new Set(linhasExatas.map(l => l.participant)).size;

    const linhasQualquerFanOut = todasLinhas.filter(l => (l.ids ?? []).includes(r.messageId));
    const distintosComFanOut = new Set(linhasQualquerFanOut.map(l => l.participant)).size;

    console.log(`${r.horario} messageId=${r.messageId}`);
    console.log(`  real WhatsApp = ${r.views}`);
    console.log(`  RPC painel = ${mapaRpc.get(r.messageId)}`);
    console.log(`  contagem limpa (só linha com 1 id exato) = ${distintosLimpo} (${linhasExatas.length} linhas)`);
    console.log(`  contagem com fan-out (linha contém o id, não importa quantos outros ids junto) = ${distintosComFanOut} (${linhasQualquerFanOut.length} linhas)`);
    console.log('');
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
