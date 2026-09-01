// Investigação (demanda 363, parte 2), retomada: a query .contains() da v2
// estava quebrada (coluna `ids` não aceitou o filtro jsonb do jeito que eu
// tentei, erro 22P02 "invalid input syntax for type json", descoberto
// agora), então os "0 linhas" anteriores eram erro de query, não achado
// real. Refeito buscando TODAS as linhas e filtrando em JS (25.344 linhas
// no total, cabe em memória). Só leitura.
//   npx tsx scripts/investigacao-363-contador-v3.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  console.log('Baixando todas as linhas de jsgrafica_status_visualizacoes...');
  const todasLinhas: Array<{ participant: string; ids: string[]; momment: number; status: string }> = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin.from('jsgrafica_status_visualizacoes')
      .select('participant, ids, momment, status')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    todasLinhas.push(...(data as typeof todasLinhas));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Total baixado: ${todasLinhas.length}`);

  // indexa por messageId (cada linha pode ter mais de 1 id no array, na
  // prática por enquanto sempre visto com 1).
  const porMessageId = new Map<string, typeof todasLinhas>();
  for (const l of todasLinhas) {
    for (const id of l.ids ?? []) {
      if (!porMessageId.has(id)) porMessageId.set(id, []);
      porMessageId.get(id)!.push(l);
    }
  }
  console.log(`Message IDs distintos na tabela: ${porMessageId.size}`);

  const idReal = 'C8A70EFAA40D1E1C86F6';
  const linhasReal = porMessageId.get(idReal) ?? [];
  console.log(`\nCaso conhecido ${idReal}: ${linhasReal.length} linhas reais, ${new Set(linhasReal.map(l => l.participant)).size} participant distintos`);

  // pega os 37 posts reais da JS Gráfica de novo e compara RPC vs contagem
  // real (agora correta) por messageId.
  const { data: posts } = await admin.from('labon_status_queue')
    .select('id, texto_status, published_at, response_zapi')
    .eq('agent_slug', 'jsgrafica')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10);
  const comId = (posts ?? []).map(p => ({ ...p, messageId: (p.response_zapi as { messageId?: string } | null)?.messageId })).filter(p => p.messageId);

  const { data: contagens } = await admin.rpc('jsgrafica_contar_visualizacoes_status', { message_ids: comId.map(p => p.messageId) });
  const mapaRpc = new Map<string, number>((contagens ?? []).map((c: { message_id: string; visualizacoes: number }) => [c.message_id, c.visualizacoes]));

  console.log('\n--- Comparação RPC vs contagem real (corrigida) pra 10 posts recentes da JS Gráfica ---');
  for (const p of comId) {
    const linhas = porMessageId.get(p.messageId!) ?? [];
    const distintos = new Set(linhas.map(l => l.participant)).size;
    console.log(`id=${p.id} messageId=${p.messageId} | RPC painel=${mapaRpc.get(p.messageId!)} | linhas reais=${linhas.length} | participant distintos=${distintos}`);
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
