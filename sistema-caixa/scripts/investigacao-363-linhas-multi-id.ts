// Investigação (demanda 363, parte 2): inspecionar de perto as linhas onde
// `ids` tem mais de 1 message_id (achado do fan-out). Objetivo: confirmar se
// 1 view real está sendo atribuída a message_ids que não deveriam ter
// relação nenhuma entre si (prova direta de inflação). Só leitura.
//   npx tsx scripts/investigacao-363-linhas-multi-id.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  const todasLinhas: Array<{ id: string; participant: string; ids: string[]; momment: number; created_at: string }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin.from('jsgrafica_status_visualizacoes').select('id, participant, ids, momment, created_at').range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    todasLinhas.push(...(data as typeof todasLinhas));
    if (data.length < 1000) break;
    from += 1000;
  }

  const multiId = todasLinhas.filter(l => (l.ids?.length ?? 0) >= 5).sort((a, b) => (b.ids?.length ?? 0) - (a.ids?.length ?? 0));
  console.log(`Linhas com 5+ ids no array: ${multiId.length}\n`);
  for (const l of multiId.slice(0, 5)) {
    console.log(`linha id=${l.id} participant=${l.participant} momment=${new Date(l.momment).toISOString()} criado=${l.created_at}`);
    console.log(`  ids (${l.ids.length}): ${JSON.stringify(l.ids)}\n`);
  }

  // pega os message_ids reais da JS Gráfica de novo pra cruzar
  const { data: postsJs } = await admin.from('labon_status_queue')
    .select('id, published_at, response_zapi')
    .eq('agent_slug', 'jsgrafica').eq('status', 'published');
  const idsJsComData = new Map<string, string>();
  for (const p of postsJs ?? []) {
    const mid = (p.response_zapi as { messageId?: string } | null)?.messageId;
    if (mid) idsJsComData.set(mid, p.published_at as string);
  }

  console.log('--- Nas 5 linhas multi-id acima, quais ids pertencem a posts REAIS da JS Gráfica, e a que horário cada um foi publicado ---');
  for (const l of multiId.slice(0, 5)) {
    for (const id of l.ids) {
      if (idsJsComData.has(id)) console.log(`  linha ${l.id}: id ${id} = post JS Gráfica publicado em ${idsJsComData.get(id)}`);
    }
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
