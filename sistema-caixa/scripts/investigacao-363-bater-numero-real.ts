// Investigação (demanda 363, parte 2, REABERTA): cruzar os números REAIS do
// WhatsApp nativo do Edvam (print de 31/08) contra o que a RPC do painel
// devolve pros mesmos posts, casando por horário de publicação. Só leitura.
//   npx tsx scripts/investigacao-363-bater-numero-real.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

// números reais do print do WhatsApp do Edvam (31/08), na ordem que ele mandou.
const NUMEROS_REAIS_WHATSAPP = [
  { horario: '15:06', views: 45 },
  { horario: '14:06', views: 58 },
  { horario: '13:06', views: 74 },
  { horario: '12:06', views: 93 },
  { horario: '11:05', views: 107 },
  { horario: '10:05', views: 114 },
  { horario: '08:19', views: 360 },
  { horario: '08:18', views: 381 },
  { horario: '08:18', views: 513 },
];

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  const { data: posts, error } = await admin.from('labon_status_queue')
    .select('id, texto_status, tipo_status, published_at, response_zapi')
    .eq('agent_slug', 'jsgrafica')
    .eq('status', 'published')
    .gte('published_at', '2026-08-31T00:00:00-03:00')
    .lte('published_at', '2026-08-31T23:59:59-03:00')
    .order('published_at', { ascending: false });
  if (error) throw error;
  console.log(`Posts JS Gráfica publicados hoje (31/08): ${posts?.length ?? 0}\n`);

  const comId = (posts ?? []).map(p => ({
    ...p,
    messageId: (p.response_zapi as { messageId?: string } | null)?.messageId,
    horaLocal: new Date(p.published_at as string).toLocaleTimeString('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit' }),
  }));

  console.log('Todos os posts de hoje, com horário local (America/Recife):');
  for (const p of comId) console.log(`  id=${p.id} ${p.horaLocal} tipo=${p.tipo_status} messageId=${p.messageId} texto="${(p.texto_status ?? '').slice(0, 30)}"`);

  const { data: contagens } = await admin.rpc('jsgrafica_contar_visualizacoes_status', {
    message_ids: comId.map(p => p.messageId).filter(Boolean),
  });
  const mapaRpc = new Map<string, number>((contagens ?? []).map((c: { message_id: string; visualizacoes: number }) => [c.message_id, c.visualizacoes]));

  console.log('\n--- Cruzamento por horário (real do WhatsApp vs painel) ---');
  for (const real of NUMEROS_REAIS_WHATSAPP) {
    const candidatos = comId.filter(p => p.horaLocal === real.horario);
    if (candidatos.length === 0) {
      console.log(`${real.horario} (real=${real.views}): NENHUM post encontrado nesse horário exato`);
      continue;
    }
    for (const c of candidatos) {
      const rpcValor = c.messageId ? mapaRpc.get(c.messageId) : undefined;
      console.log(`${real.horario} (real=${real.views}) <-> id=${c.id} messageId=${c.messageId} painel=${rpcValor} | diferença=${rpcValor !== undefined ? rpcValor - real.views : 'n/a'}`);
    }
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
