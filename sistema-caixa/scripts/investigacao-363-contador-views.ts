// Investigação (demanda 363, parte 2): validar o contador de visualizações
// de Status do painel (`jsgrafica_contar_visualizacoes_status`, criada na
// 345) contra a tabela real, procurando duplicação/inflação (participant
// com variação de formato escapando o count(distinct)). Só leitura.
//   npx tsx scripts/investigacao-363-contador-views.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  // pega os posts publicados recentes com mais views registradas, pra achar
  // um caso rico pra investigar de perto.
  const { data: posts } = await admin.from('labon_status_queue')
    .select('id, message_id, texto, scheduled_at, published_at')
    .eq('status', 'published')
    .not('message_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(30);
  console.log(`Posts publicados recentes com message_id: ${posts?.length ?? 0}`);

  if (!posts || posts.length === 0) { console.log('Nenhum post encontrado, abortando.'); return; }

  for (const p of posts) {
    const { count } = await admin.from('jsgrafica_status_visualizacoes')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', p.message_id);
    console.log(`  message_id=${p.message_id} | publicado=${p.published_at} | linhas de view=${count} | texto="${(p.texto ?? '').slice(0, 40)}"`);
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
