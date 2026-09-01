// Investigação (demanda 363, parte 2): achado gravíssimo em potencial —
// 800-1000+ "distintos" estáveis (88,7% overlap hora a hora) é implausível
// pra base real da JS Gráfica. Hipótese: `jsgrafica_status_visualizacoes`
// pode estar recebendo eventos de visualização de OUTROS clientes
// LabOnchain (pipeline compartilhado), com o campo `ids` (array) permitindo
// 1 view real virar "visualização" de vários message_id ao mesmo tempo, ou
// simplesmente sem nenhum isolamento por conta/instância. Checar: quantos
// ids distintos por linha, e se message_ids de OUTROS clientes (ex. `labon`,
// tabela labon_status_queue agent_slug != jsgrafica) aparecem nessa mesma
// tabela "jsgrafica_status_visualizacoes". Só leitura.
//   npx tsx scripts/investigacao-363-fanout.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

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
  console.log(`Total de linhas: ${todasLinhas.length}`);

  const distribuicaoTamanhoIds: Record<number, number> = {};
  for (const l of todasLinhas) {
    const n = (l.ids ?? []).length;
    distribuicaoTamanhoIds[n] = (distribuicaoTamanhoIds[n] ?? 0) + 1;
  }
  console.log('Distribuição do tamanho do array `ids` por linha:', JSON.stringify(distribuicaoTamanhoIds));

  const todosIdsNaTabela = new Set<string>();
  for (const l of todasLinhas) for (const id of l.ids ?? []) todosIdsNaTabela.add(id);
  console.log(`Message IDs distintos no total: ${todosIdsNaTabela.size}`);

  // pega TODOS os message_ids reais de TODOS os agent_slug na fila
  // compartilhada, não só jsgrafica, pra ver se algum dos ids "extras" bate
  // com outro cliente.
  const { data: todosPosts } = await admin.from('labon_status_queue')
    .select('agent_slug, response_zapi')
    .not('response_zapi', 'is', null);
  const porAgentSlug = new Map<string, Set<string>>();
  for (const p of todosPosts ?? []) {
    const mid = (p.response_zapi as { messageId?: string } | null)?.messageId;
    if (!mid) continue;
    if (!porAgentSlug.has(p.agent_slug)) porAgentSlug.set(p.agent_slug, new Set());
    porAgentSlug.get(p.agent_slug)!.add(mid);
  }
  console.log('\nAgent slugs na fila compartilhada e quantos message_ids cada um tem:');
  for (const [slug, ids] of porAgentSlug) console.log(`  ${slug}: ${ids.size} message_ids`);

  console.log('\nCruzamento: quantos ids da tabela jsgrafica_status_visualizacoes pertencem a CADA agent_slug:');
  for (const [slug, idsDoSlug] of porAgentSlug) {
    const bateAqui = [...todosIdsNaTabela].filter(id => idsDoSlug.has(id));
    console.log(`  pertence a "${slug}": ${bateAqui.length} de ${todosIdsNaTabela.size} ids únicos da tabela`);
  }

  const idsSemDono = [...todosIdsNaTabela].filter(id => ![...porAgentSlug.values()].some(s => s.has(id)));
  console.log(`\nIds na tabela que NÃO batem com NENHUM agent_slug conhecido: ${idsSemDono.length}`);
  console.log('Amostra:', JSON.stringify(idsSemDono.slice(0, 10)));
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
