// Investigação (demanda 363, parte 2, reaberta): match correto por horário
// UTC->Recife (-3h). Os 6 posts automatizados de hoje (10:05 a 15:05 local)
// batem com 6 dos 9 números do print do Edvam; os 3 de 08:18/08:19 com view
// bem mais alta (360/381/513) NÃO existem em labon_status_queue pra
// jsgrafica hoje, hipótese: são posts MANUAIS (postados direto do celular,
// fora do nosso sistema), o que seria consistente com o achado original da
// 363 (manual alcança mais). Cruzar só os 6 automatizados reais. Só leitura.
//   npx tsx scripts/investigacao-363-bater-numero-real-v3.ts
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

  const { data: contagens, error } = await admin.rpc('jsgrafica_contar_visualizacoes_status', {
    message_ids: REAIS.map(r => r.messageId),
  });
  if (error) throw error;
  const mapa = new Map<string, number>((contagens ?? []).map((c: { message_id: string; visualizacoes: number }) => [c.message_id, c.visualizacoes]));

  console.log('--- Real (WhatsApp nativo) vs Painel (RPC) ---');
  for (const r of REAIS) {
    const painel = mapa.get(r.messageId);
    console.log(`${r.horario} | real=${r.views} | painel=${painel} | diferença=${painel !== undefined ? painel - r.views : 'n/a'} | proporção=${painel !== undefined ? (painel / r.views).toFixed(1) + 'x' : 'n/a'}`);
  }
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
