// Investigação (demanda 363, parte 2, reaberta): v1 achou só 7 posts hoje,
// mas o Edvam mandou 9 horários incluindo 3 de manhã cedo (08:18/08:19) que
// não apareceram. Ampliar range de data e checar published_at cru (sem
// arredondar), e também sem o filtro agent_slug pra garantir que não é isso
// que está cortando resultado. Só leitura.
//   npx tsx scripts/investigacao-363-bater-numero-real-v2.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  const { data: posts, error } = await admin.from('labon_status_queue')
    .select('id, agent_slug, texto_status, tipo_status, status, published_at, scheduled_at, response_zapi')
    .eq('agent_slug', 'jsgrafica')
    .gte('published_at', '2026-08-30T20:00:00-03:00')
    .order('published_at', { ascending: false });
  if (error) throw error;
  console.log(`Posts JS Gráfica (qualquer status) desde 30/08 20h: ${posts?.length ?? 0}\n`);
  for (const p of posts ?? []) {
    const mid = (p.response_zapi as { messageId?: string } | null)?.messageId;
    console.log(`id=${p.id} status=${p.status} published_at=${p.published_at} scheduled_at=${p.scheduled_at} tipo=${p.tipo_status} messageId=${mid}`);
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
