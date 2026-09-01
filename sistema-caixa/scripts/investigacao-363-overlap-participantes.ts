// Investigação (demanda 363, parte 2): RPC calcula count(distinct
// participant) corretamente, mas 800-1000+ "distintos" por post, de hora em
// hora, é implausível pra base real da JS Gráfica (achado anterior: só
// ~1.717 contatos sincronizados no total recebem Status via API). Hipótese
// nova: `participant` pode não ser identidade estável da mesma pessoa
// (rotação de LID, já visto antes neste projeto). Testar: comparar overlap
// de participants entre 2 posts consecutivos (1h de diferença) — se a
// audiência fosse real e estável, esperaria muita sobreposição. Só leitura.
//   npx tsx scripts/investigacao-363-overlap-participantes.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  const todasLinhas: Array<{ participant: string; ids: string[] }> = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin.from('jsgrafica_status_visualizacoes').select('participant, ids').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    todasLinhas.push(...(data as typeof todasLinhas));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const porMessageId = new Map<string, Set<string>>();
  for (const l of todasLinhas) for (const id of l.ids ?? []) {
    if (!porMessageId.has(id)) porMessageId.set(id, new Set());
    porMessageId.get(id)!.add(l.participant);
  }

  // id=57 (3EB0B6529F699D2E924791, 19:05) e id=56 (3EB0B81CB55C307BB68152, 18:05), 1h de diferença.
  const setA = porMessageId.get('3EB0B6529F699D2E924791') ?? new Set();
  const setB = porMessageId.get('3EB0B81CB55C307BB68152') ?? new Set();
  const intersecao = [...setA].filter(p => setB.has(p));
  console.log(`Post A (19:05): ${setA.size} participants distintos`);
  console.log(`Post B (18:05, 1h antes): ${setB.size} participants distintos`);
  console.log(`Interseção (mesma pessoa viu os 2): ${intersecao.length} (${((intersecao.length / setA.size) * 100).toFixed(1)}% de A)`);

  // amostra de participant reais, pra ver o formato (parece telefone,
  // parece LID longo, tamanho, etc).
  console.log('\nAmostra de 20 participants do post A:', JSON.stringify([...setA].slice(0, 20)));

  // checa se algum participant do post A tem MUITA semelhança textual com
  // algum do post B sem ser idêntico (indício de rotação de sufixo/LID).
  const listaB = [...setB];
  let candidatosParecidos = 0;
  for (const pa of [...setA].slice(0, 300)) {
    for (const pb of listaB) {
      if (pa !== pb && pa.length === pb.length && pa.length >= 8) {
        // conta quantos caracteres diferem
        let diffs = 0;
        for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) diffs++;
        if (diffs > 0 && diffs <= 2) { candidatosParecidos++; }
      }
    }
  }
  console.log(`\nPares (A x B, amostra 300 de A) com 1-2 caracteres de diferença (mesmo tamanho): ${candidatosParecidos}`);
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
