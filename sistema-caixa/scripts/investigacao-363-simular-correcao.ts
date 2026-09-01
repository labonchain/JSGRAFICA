// Investigação (demanda 363, parte 2): simular o resultado da correção
// proposta (gravar só 1 id por evento, em vez do array inteiro) ANTES de
// mexer em qualquer workflow de verdade. 2 versões de simulação, porque não
// sei qual é a semântica real da ordem do array `ids` vindo da Z-API:
//   A) usa sempre o PRIMEIRO id do array (ids[0])
//   B) usa o id, dentre os do array, cujo post correspondente foi publicado
//      mais PRÓXIMO no tempo do momento do evento (`momment`) — heurística
//      de "provavelmente é esse que a pessoa estava vendo"
// Compara as 2 contra o número real do WhatsApp (print do Edvam) e contra o
// número atual do painel (bugado). Só leitura, nenhuma escrita, nenhuma
// mudança em workflow.
//   npx tsx scripts/investigacao-363-simular-correcao.ts
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

  // 1. Baixa TODOS os posts reais da JS Gráfica (qualquer status, qualquer
  // data) com published_at, pra ter o universo de "quando cada message_id
  // foi publicado" (a heurística B precisa disso).
  const { data: posts } = await admin.from('labon_status_queue')
    .select('published_at, response_zapi')
    .eq('agent_slug', 'jsgrafica')
    .eq('status', 'published');
  const publicadoEm = new Map<string, number>();
  for (const p of posts ?? []) {
    const mid = (p.response_zapi as { messageId?: string } | null)?.messageId;
    if (mid && p.published_at) publicadoEm.set(mid, new Date(p.published_at as string).getTime());
  }
  console.log(`Universo de message_id -> published_at conhecidos: ${publicadoEm.size}`);

  // 2. Baixa toda a tabela de views.
  const todasLinhas: Array<{ participant: string; ids: string[]; momment: number }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin.from('jsgrafica_status_visualizacoes').select('participant, ids, momment').range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    todasLinhas.push(...(data as typeof todasLinhas));
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Total de linhas de view: ${todasLinhas.length}\n`);

  // 3. Pra cada linha, calcula simA (primeiro id) e simB (id mais próximo no
  // tempo, só entre os ids que a gente CONHECE o published_at).
  const contagemAtual = new Map<string, Set<string>>(); // como está hoje (qualquer id no array conta)
  const contagemSimA = new Map<string, Set<string>>();
  const contagemSimB = new Map<string, Set<string>>();

  function addTo(mapa: Map<string, Set<string>>, id: string, participant: string) {
    if (!mapa.has(id)) mapa.set(id, new Set());
    mapa.get(id)!.add(participant);
  }

  for (const linha of todasLinhas) {
    const ids = linha.ids ?? [];
    if (ids.length === 0) continue;

    // atual: conta em TODOS os ids (comportamento de hoje)
    for (const id of ids) addTo(contagemAtual, id, linha.participant);

    // simA: só o primeiro
    addTo(contagemSimA, ids[0], linha.participant);

    // simB: o id cujo published_at está mais perto do momment do evento,
    // entre os ids do array que a gente conhece a data de publicação.
    const candidatos = ids.filter(id => publicadoEm.has(id));
    if (candidatos.length > 0) {
      let melhor = candidatos[0];
      let menorDiff = Math.abs(publicadoEm.get(melhor)! - linha.momment);
      for (const id of candidatos.slice(1)) {
        const diff = Math.abs(publicadoEm.get(id)! - linha.momment);
        if (diff < menorDiff) { menorDiff = diff; melhor = id; }
      }
      addTo(contagemSimB, melhor, linha.participant);
    } else {
      // se não conhece nenhum, cai pro primeiro id mesmo (fallback)
      addTo(contagemSimB, ids[0], linha.participant);
    }
  }

  console.log('--- Comparação: real (WhatsApp) vs atual (painel hoje) vs simulação A (1º id) vs simulação B (id mais próximo no tempo) ---\n');
  for (const r of REAIS) {
    const atual = contagemAtual.get(r.messageId)?.size ?? 0;
    const simA = contagemSimA.get(r.messageId)?.size ?? 0;
    const simB = contagemSimB.get(r.messageId)?.size ?? 0;
    console.log(`${r.horario} messageId=${r.messageId}`);
    console.log(`  real WhatsApp   = ${r.views}`);
    console.log(`  atual (painel)  = ${atual}  (${(atual / r.views).toFixed(1)}x)`);
    console.log(`  sim A (1º id)   = ${simA}  (${(simA / r.views).toFixed(1)}x)`);
    console.log(`  sim B (+próximo)= ${simB}  (${(simB / r.views).toFixed(1)}x)`);
    console.log('');
  }

  // soma total (sanity check: soma de A deveria ficar perto do total de
  // linhas de view, já que cada linha só é contada 1x agora)
  const totalLinhasComId = todasLinhas.filter(l => (l.ids?.length ?? 0) > 0).length;
  const somaSimA = [...contagemSimA.values()].reduce((s, set) => s + set.size, 0);
  console.log(`Sanity check: total de linhas com id = ${totalLinhasComId}, soma de (participants distintos por post) na sim A = ${somaSimA} (esperado ser MENOR que o total de linhas, por causa da deduplicação por participant dentro de cada post, mas não muito maior)`);
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
