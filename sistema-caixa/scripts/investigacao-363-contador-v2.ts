// Investigação (demanda 363, parte 2): validar contador de views de Status
// da JS Gráfica. Achado do schema real: `message_id` fica dentro de
// `response_zapi->>messageId` (jsonb), não é coluna direta; a fila é
// compartilhada (`agent_slug`). Só leitura.
//   npx tsx scripts/investigacao-363-contador-v2.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  const { data: posts, error } = await admin.from('labon_status_queue')
    .select('id, texto_status, scheduled_at, published_at, response_zapi')
    .eq('agent_slug', 'jsgrafica')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  console.log(`Posts JS Gráfica publicados: ${posts?.length ?? 0}`);

  const comMessageId = (posts ?? [])
    .map(p => ({ ...p, messageId: (p.response_zapi as { messageId?: string } | null)?.messageId }))
    .filter(p => !!p.messageId);
  console.log(`Com messageId real: ${comMessageId.length}\n`);

  const { data: contagens, error: eRpc } = await admin.rpc('jsgrafica_contar_visualizacoes_status', {
    message_ids: comMessageId.map(p => p.messageId),
  });
  if (eRpc) console.log('erro RPC:', eRpc);
  const mapaRpc = new Map<string, number>((contagens ?? []).map((c: { message_id: string; visualizacoes: number }) => [c.message_id, c.visualizacoes]));

  for (const p of comMessageId.slice(0, 15)) {
    const { data: linhas } = await admin.from('jsgrafica_status_visualizacoes')
      .select('participant, momment, status')
      .contains('ids', [p.messageId]);
    const totalLinhas = linhas?.length ?? 0;
    const distintosReal = new Set((linhas ?? []).map(l => l.participant)).size;
    const rpcValor = mapaRpc.get(p.messageId!) ?? '(sem valor)';
    console.log(`id=${p.id} messageId=${p.messageId} publicado=${p.published_at}`);
    console.log(`  texto: "${(p.texto_status ?? '').slice(0, 60)}"`);
    console.log(`  RPC painel = ${rpcValor} | linhas cruas = ${totalLinhas} | participant distintos (JS) = ${distintosReal}`);
    if (totalLinhas > 0 && totalLinhas <= 30) {
      console.log(`  participants: ${JSON.stringify((linhas ?? []).map(l => l.participant))}`);
    }
    console.log('');
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
