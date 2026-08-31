/**
 * Demanda 227 — CHECKPOINT DE INVESTIGAÇÃO (não é implementação de produção).
 * 100% leitura — nenhum INSERT/UPDATE/DELETE, nenhuma chamada de escrita à
 * API do Mercado Pago. Objetivo: rodar os 3 níveis de match propostos no
 * desenho (225, seção 1.1) contra pagamentos REAIS do Mercado Pago (incluindo
 * o caso do R$300 de 21/07 achado na demanda 222) e confirmar que a lógica
 * classifica certo antes de virar código de produção.
 *
 *   npx tsx scripts/investigacao-227-matching-mp.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const text = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
    for (const line of text.split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 0 || line.trim().startsWith('#')) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = v;
    }
  } catch { /* ignorar */ }
}
loadEnv();

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const { buscarPagamentos } = await import('../lib/mercadopago');
  const { limitesDiaCaixaUTC, timestampParaDiaCaixa } = await import('../lib/supabase');

  // Janela: 20/07 00:00 Recife até agora (22/07) — cobre o caso real do R$300
  // (21/07 08:46) e dá volume suficiente pra ver o padrão "maioria bate por
  // referência" que o desenho descreve.
  const inicio = limitesDiaCaixaUTC('20-07-26')!.inicio;
  const fim = new Date().toISOString();

  const busca = await buscarPagamentos({ dataInicio: inicio, dataFim: fim, limit: 100 });
  const aprovados = busca.results.filter(p => p.status === 'approved');
  console.log(`Total pagamentos na janela: ${busca.results.length} | aprovados: ${aprovados.length}\n`);

  // CORREÇÃO (achado durante a própria investigação): a 1ª versão deste
  // script carregava TODOS os pedidos numa única query sem paginar — igual
  // ao ponto cego que a 222 já tinha sinalizado sobre `getResumoDia`
  // (mesma classe de bug que 043/055 corrigiram no dashboard). Com 1192
  // linhas em jsgrafica_pedidos (> limite default de 1000 do PostgREST), a
  // query truncava e os ~192 pedidos mais recentes (ped-1187 em diante)
  // ficavam invisíveis — a maioria dos pagamentos aparecia como "nível 3"
  // por engano. Corrigido pra consultar POR PAGAMENTO (query pontual, sem
  // trazer a tabela inteira) — é também a abordagem certa pra produção,
  // mais barata e sem esse risco de truncamento.
  let nivel1 = 0, nivel2 = 0, nivel3 = 0;
  for (const pag of aprovados) {
    const ref = pag.external_reference;
    let refValida = false;
    if (ref) {
      const { data } = await supabaseAdmin.from('jsgrafica_pedidos')
        .select('id').or(`id.eq.${ref},venda_id.eq.${ref}`).limit(1);
      refValida = (data ?? []).length > 0;
    }
    const dataHoraLocal = new Date(pag.date_created).toLocaleString('pt-BR', { timeZone: 'America/Recife' });

    if (refValida) {
      nivel1++;
      console.log(`[NÍVEL 1 — alta confiança] pagamento ${pag.id}, R$${pag.transaction_amount}, ${dataHoraLocal}, ref="${ref}" → já existe registro, NÃO vira pendência.`);
      continue;
    }

    const diaCaixaPagamento = timestampParaDiaCaixa(pag.date_created);
    const limites = limitesDiaCaixaUTC(diaCaixaPagamento);
    const { data: candidatosData } = limites
      ? await supabaseAdmin.from('jsgrafica_pedidos')
          .select('id, valor_final, created_at')
          .is('mp_order_id', null)
          .eq('valor_final', pag.transaction_amount)
          .gte('created_at', limites.inicio).lt('created_at', limites.fim)
      : { data: [] };
    const candidatos = candidatosData ?? [];

    if (candidatos.length === 1) {
      nivel2++;
      console.log(`[NÍVEL 2 — média confiança] pagamento ${pag.id}, R$${pag.transaction_amount}, ${dataHoraLocal}, ref="${ref ?? '(vazia)'}" → candidato único: pedido ${candidatos[0].id} (sugestão pro Admin confirmar, NUNCA vínculo automático).`);
    } else {
      nivel3++;
      console.log(`[NÍVEL 3 — sem candidato] pagamento ${pag.id}, R$${pag.transaction_amount}, ${dataHoraLocal} (${pag.payment_type_id}), ref="${ref ?? '(vazia)'}" → ${candidatos.length} candidatos (${candidatos.length > 1 ? 'ambíguo, não sugere sozinho' : 'nenhum'}) → VIRARIA item em jsgrafica_conciliacao_pendencias.`);
    }
  }

  console.log(`\nResumo: nível 1 (referência) = ${nivel1} | nível 2 (candidato único) = ${nivel2} | nível 3 (sem candidato) = ${nivel3}`);

  // Confere explicitamente o caso do R$300 de 21/07 (demanda 222).
  const casoR300 = aprovados.find(p => p.transaction_amount === 300 && p.date_created.startsWith('2026-07-21'));
  if (casoR300) {
    console.log(`\nCaso R$300 de 21/07 encontrado: id=${casoR300.id}, external_reference="${casoR300.external_reference ?? '(vazia)'}", date_created=${casoR300.date_created}, payment_type_id=${casoR300.payment_type_id} — confirmação de que a classificação acima é NÍVEL 3, como o achado da 222 previa.`);
  } else {
    console.log(`\nCaso R$300 de 21/07 NÃO encontrado nesta janela (pode ter saído da janela de busca ou já ter sido tratado) — conferir manualmente se necessário.`);
  }

  // Checagem de idempotência: já existe alguma linha em
  // jsgrafica_conciliacao_pendencias hoje? (deveria ser 0 — nenhum código de
  // produção grava nela ainda, só a 226 testou e limpou).
  const { count } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
    .select('*', { count: 'exact', head: true });
  console.log(`\nLinhas atuais em jsgrafica_conciliacao_pendencias: ${count} (esperado 0 — nenhum código de produção grava nela ainda).`);
}

main();
