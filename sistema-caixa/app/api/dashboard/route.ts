export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa, parseDiaCaixa, agoraRecife, timestampParaDiaCaixa } from '@/lib/supabase';
import { supabaseAdmin, getSaldoAnterior, getResumoDia, ehFechamentoGeral } from '@/lib/supabase-admin';

// ─── Helpers de data ──────────────────────────────────────────
// Todos ancorados em agoraRecife() — "hoje" precisa ser o dia em Recife, não
// o dia UTC do servidor (Vercel), senão os limites de período (semana/mês/
// etc.) ficam 3h adiantados perto da meia-noite local.
function inicioSemana(): Date {
  const d = agoraRecife(); d.setHours(0,0,0,0);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff); return d;
}
function inicioMes():   Date { const d = agoraRecife(); d.setDate(1);       d.setHours(0,0,0,0); return d; }
function inicio3Meses():Date { const d = agoraRecife(); d.setMonth(d.getMonth()-3); d.setHours(0,0,0,0); return d; }
function inicioAno():   Date { const d = agoraRecife(); d.setMonth(0,1);    d.setHours(0,0,0,0); return d; }

// Busca uma tabela inteira, ignorando o limite de 1.000 linhas por
// requisição que o Supabase aplica mesmo sem `.limit()` explícito (achado da
// demanda 041, agora também na 043 — `jsgrafica_vendas` já tem 3.700 linhas e
// vinha trazendo só uma fatia). Pega o total exato primeiro (query de
// `count`, sem trazer linha nenhuma) e pagina em paralelo — `.order('id')`
// garante ordem estável entre páginas.
// `filtro` (opcional, demanda 055) aplica a mesma condição na contagem e em
// cada página — ex. restringir a jsgrafica_pedidos só aos "entregue" antes
// de paginar, em vez de paginar a tabela inteira pra filtrar depois.
async function buscarTodasLinhas<T>(
  tabela: string,
  colunas: string,
  filtro?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T[]> {
  const TAMANHO_PAGINA = 1000;
  const MAX_PAGINAS = 30; // trava de segurança (30.000 linhas)
  let contagem = supabaseAdmin.from(tabela).select('id', { count: 'exact', head: true });
  if (filtro) contagem = filtro(contagem);
  const { count } = await contagem;
  const totalPaginas = Math.min(MAX_PAGINAS, Math.max(1, Math.ceil((count ?? 0) / TAMANHO_PAGINA)));
  const resultados = await Promise.all(
    Array.from({ length: totalPaginas }, (_, pagina) => {
      let q = supabaseAdmin.from(tabela).select(colunas)
        .order('id', { ascending: true })
        .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);
      if (filtro) q = filtro(q);
      return q;
    })
  );
  return resultados.flatMap(r => (r.data ?? []) as T[]);
}

// ─── Agrupamentos ─────────────────────────────────────────────
function agruparPorSemana(historico: { aba: string; entradas: number; saidas: number }[]) {
  const mapa: Record<string, { label: string; entradas: number; saidas: number }> = {};
  for (const d of historico) {
    const dt = parseDiaCaixa(d.aba); if (!dt) continue;
    const diff = dt.getDay() === 0 ? -6 : 1 - dt.getDay();
    const seg = new Date(dt); seg.setDate(dt.getDate() + diff);
    const key = `${String(seg.getDate()).padStart(2,'0')}-${String(seg.getMonth()+1).padStart(2,'0')}-${String(seg.getFullYear()).slice(-2)}`;
    const label = `${String(seg.getDate()).padStart(2,'0')}/${String(seg.getMonth()+1).padStart(2,'0')}`;
    if (!mapa[key]) mapa[key] = { label, entradas: 0, saidas: 0 };
    mapa[key].entradas += d.entradas;
    mapa[key].saidas   += d.saidas;
  }
  return Object.entries(mapa).sort(([a],[b]) => a.localeCompare(b)).map(([,v]) => v);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodo  = searchParams.get('periodo') || 'mes';
    const deParam  = searchParams.get('de');
    const ateParam = searchParams.get('ate');
    // Demanda 101 — filtro de Operador nos 3 relatórios nomeados do
    // Financeiro. Reaproveita os mesmos campos que já existem (`operador` em
    // jsgrafica_vendas/saidas, `pedido_criado_por` em jsgrafica_pedidos,
    // `fechado_por` em jsgrafica_fechamento) — nenhum cálculo novo, só troca
    // o filtro de quais linhas entram em cada agregação já existente.
    const operador = searchParams.get('operador') || undefined;

    let de: Date | undefined;
    let ate: Date | undefined = agoraRecife(); ate.setHours(23,59,59,999);

    if (deParam && ateParam) {
      de  = parseDiaCaixa(deParam)  || undefined;
      ate = parseDiaCaixa(ateParam) || ate;
      if (ate) ate.setHours(23,59,59,999);
    } else {
      switch (periodo) {
        case 'hoje':   de = agoraRecife(); de.setHours(0,0,0,0); break;
        case 'semana': de = inicioSemana(); break;
        case '3meses': de = inicio3Meses(); break;
        case 'ano':    de = inicioAno();    break;
        case 'tudo':   de = undefined; ate = undefined; break;
        default:       de = inicioMes();    break;
      }
    }

    const dataDia = formatarDiaCaixa();

    // data_dia é texto "DD-MM-AA" — não dá pra filtrar por período com
    // gte/lte direto no Postgres (o dia vem antes do mês/ano, quebra ao
    // cruzar meses). Busca tudo e filtra em memória com Date de verdade.
    function dentroDoPeriodo(dataDiaStr: string): boolean {
      const dt = parseDiaCaixa(dataDiaStr);
      if (!dt) return false;
      if (de  && dt < de)  return false;
      if (ate && dt > ate) return false;
      return true;
    }

    const [
      fechamentosRaw,
      vendasRaw,
      saidasRaw,
      pedidosRaw,
      resumoHoje,
      saldoAnterior,
    ] = await Promise.all([
      buscarTodasLinhas<{ data_dia: string; total_entradas: number; total_saidas: number; saldo_acumulado: number; fechado_por: string | null; divergencia: number | null }>(
        'jsgrafica_fechamento', 'data_dia, total_entradas, total_saidas, saldo_acumulado, fechado_por, divergencia'),
      buscarTodasLinhas<{ data_dia: string; produto_nome: string; quantidade: number; total: number; operador: string | null }>(
        'jsgrafica_vendas', 'data_dia, produto_nome, quantidade, total, operador'),
      buscarTodasLinhas<{ data_dia: string; categoria_nome: string; valor: number; operador: string | null }>(
        'jsgrafica_saidas', 'data_dia, categoria_nome, valor, operador'),
      // Pedidos entregues (demanda 054/055) — desde que a venda de balcão
      // virou pedido, jsgrafica_vendas parou de crescer; isso soma o que
      // jsgrafica_vendas deixou de registrar. Filtra "entregue" já na
      // paginação (não traz pedido ainda em produção, que não é entrada).
      // Demanda 164: entrada conta pelo pagamento confirmado, não pela
      // entrega — mesma régua nova de getResumoDia (data_entrada_caixa).
      buscarTodasLinhas<{ servico_nome: string | null; quantidade: number | null; valor_final: number | null; data_entrada_caixa: string | null; forma_pagamento: string | null; pedido_criado_por: string | null }>(
        'jsgrafica_pedidos', 'servico_nome, quantidade, valor_final, data_entrada_caixa, forma_pagamento, pedido_criado_por',
        q => q.eq('pagamento_confirmado', true).neq('status', 'cancelado')),
      // Demanda 101: "hoje" ao vivo (linha injetada abaixo) já reflete o
      // operador filtrado — getResumoDia já aceita esse parâmetro opcional
      // desde sempre, só não era usado aqui.
      getResumoDia(dataDia, operador),
      getSaldoAnterior(),
    ]);

    // Histórico formatado (já filtrado e ordenado por data real) — demanda
    // 074 fez `jsgrafica_fechamento` ganhar 1 linha por operador além da
    // geral (mesma `data_dia`); sem excluir as linhas por operador aqui, um
    // dia com Zu/Gabi fechando o próprio caixa somava entradas em dobro e
    // gerava 2 barras/chaves duplicadas pro mesmo dia no gráfico.
    // Demanda 101 (Controle de Caixa/Fluxo de Caixa com filtro de Operador):
    // com operador selecionado, troca a fonte de "geral" pra só as linhas de
    // fechamento daquele operador (mesma tabela, mesmo formato — o
    // fechamento por operador da 074 já grava total_entradas/total_saidas
    // próprios, só nunca tinha sido exposto num relatório por período).
    const historico = fechamentosRaw
      .filter(f => dentroDoPeriodo(f.data_dia) && (operador ? f.fechado_por === operador : ehFechamentoGeral(f.fechado_por)))
      .map(f => ({
        aba:         f.data_dia,
        entradas:    Number(f.total_entradas),
        saidas:      Number(f.total_saidas),
        saldo:       Number(f.saldo_acumulado),
        // divergencia/fechadoPor: só usados pelo relatório "Controle de
        // Caixa" (demanda 101) — mesma linha de jsgrafica_fechamento já
        // buscada acima pro gráfico "Fluxo de Caixa", só expõe 2 campos que
        // já existiam na tabela e não eram retornados antes.
        divergencia: Number(f.divergencia ?? 0),
        fechadoPor:  f.fechado_por,
      }))
      .sort((a, b) => (parseDiaCaixa(a.aba)?.getTime() ?? 0) - (parseDiaCaixa(b.aba)?.getTime() ?? 0));

    // Hoje só vira 1 linha em `jsgrafica_fechamento` quando alguém fecha o
    // caixa (demanda 074/092) — antes disso, "hoje" não aparece no histórico
    // e some da tela (resumo, gráfico, "melhores dias") mesmo já tendo
    // entrada real no dia. Injeta uma linha "ao vivo" (getResumoDia, mesma
    // fonte que os pedidos/saídas usados na quebra por forma de pagamento e
    // categoria acima) sempre que hoje ainda não foi fechado — assim o
    // resumo nunca mostra R$0,00 com o dia já tendo movimento de verdade.
    const hojeJaFechado = historico.some(f => f.aba === dataDia);
    if (!hojeJaFechado && dentroDoPeriodo(dataDia)) {
      historico.push({
        aba: dataDia, entradas: resumoHoje.totalEntradas, saidas: resumoHoje.totalSaidas,
        saldo: saldoAnterior + resumoHoje.totalEntradas - resumoHoje.totalSaidas,
        // Hoje ainda em aberto — sem contagem física, sem divergência real
        // ainda (fica pro "Controle de Caixa" mostrar como "em aberto").
        divergencia: 0, fechadoPor: null,
      });
      historico.sort((a, b) => (parseDiaCaixa(a.aba)?.getTime() ?? 0) - (parseDiaCaixa(b.aba)?.getTime() ?? 0));
    }

    // Demanda 101: filtro de Operador reaproveita os campos que já existem
    // em cada tabela (`operador` em vendas/saídas, `pedido_criado_por` em
    // pedidos) — mesmo padrão do histórico acima.
    const vendas = vendasRaw.filter(v => dentroDoPeriodo(v.data_dia) && (!operador || v.operador === operador));
    const saidasPeriodo = saidasRaw.filter(s => dentroDoPeriodo(s.data_dia) && (!operador || s.operador === operador));
    const pedidosEntregues = pedidosRaw.filter(p =>
      p.data_entrada_caixa && dentroDoPeriodo(timestampParaDiaCaixa(p.data_entrada_caixa)) && (!operador || p.pedido_criado_por === operador));

    // Top produtos — soma jsgrafica_vendas (histórico, congelado desde a
    // demanda 054) + jsgrafica_pedidos entregues (dado novo, dali em diante).
    // Sem risco de contar em dobro: as duas tabelas nunca têm a mesma
    // transação (uma parou de crescer exatamente quando a outra começou).
    const prodMapa: Record<string, { nome: string; quantidade: number; valor: number }> = {};
    for (const v of vendas) {
      if (!prodMapa[v.produto_nome]) prodMapa[v.produto_nome] = { nome: v.produto_nome, quantidade: 0, valor: 0 };
      prodMapa[v.produto_nome].quantidade += Number(v.quantidade);
      prodMapa[v.produto_nome].valor      += Number(v.total);
    }
    for (const p of pedidosEntregues) {
      const nome = p.servico_nome || 'Serviço não especificado';
      if (!prodMapa[nome]) prodMapa[nome] = { nome, quantidade: 0, valor: 0 };
      prodMapa[nome].quantidade += Number(p.quantidade ?? 1);
      prodMapa[nome].valor      += Number(p.valor_final ?? 0);
    }
    const topProdutos = Object.values(prodMapa).sort((a,b) => b.valor - a.valor).slice(0, 15);

    // Saídas por categoria
    const catMapa: Record<string, number> = {};
    for (const s of saidasPeriodo) {
      catMapa[s.categoria_nome] = (catMapa[s.categoria_nome] || 0) + Number(s.valor);
    }
    const saidasPorCategoria = Object.entries(catMapa)
      .sort(([,a],[,b]) => b - a)
      .map(([categoria, valor]) => ({ categoria, valor }));

    // Entradas por forma de pagamento (demanda 075) — só `jsgrafica_pedidos`
    // tem `forma_pagamento` (campo criado na demanda 066); `jsgrafica_vendas`
    // (histórico anterior à 054) e pedidos sem a informação preenchida caem
    // juntos em "Não informado", visível, nunca somados em silêncio noutra
    // forma (regra explícita da demanda).
    // Demanda 199: forma própria pro Pix estático do RecargaPay — sem entrar
    // aqui, caía em "Não informado" (rótulo que devia significar só "dado
    // ausente/histórico", não "forma real que a gente esqueceu de listar").
    const ORDEM_FORMAS = ['Dinheiro', 'Cartão', 'Pix', 'Pix RecargaPay', 'Paga na retirada'];
    const formaMapa: Record<string, number> = {};
    for (const p of pedidosEntregues) {
      const forma = p.forma_pagamento && ORDEM_FORMAS.includes(p.forma_pagamento) ? p.forma_pagamento : 'Não informado';
      formaMapa[forma] = (formaMapa[forma] || 0) + Number(p.valor_final || 0);
    }
    formaMapa['Não informado'] = (formaMapa['Não informado'] || 0) + vendas.reduce((acc, v) => acc + Number(v.total), 0);
    const entradasPorFormaPagamento = [...ORDEM_FORMAS, 'Não informado']
      .filter(forma => formaMapa[forma] > 0)
      .map(forma => ({ forma, valor: formaMapa[forma] }));

    const totalEntradasPeriodo = historico.reduce((s,d) => s + d.entradas, 0);
    const totalSaidasPeriodo   = historico.reduce((s,d) => s + d.saidas, 0);
    const diasComMovimento     = historico.filter(d => d.entradas > 0).length;
    const mediaDiaria = diasComMovimento > 0 ? totalEntradasPeriodo / diasComMovimento : 0;
    const melhorDia   = historico.reduce((max,d) => d.entradas > max.entradas ? d : max, { aba:'', entradas:0, saidas:0, saldo:0 });

    const { totalEntradas, totalSaidas } = resumoHoje;
    const saldoAcumulado = saldoAnterior + totalEntradas - totalSaidas;

    // ─── Demanda 194 — "Saúde do caixa" (Visão Geral) ────────────────────
    // Reúne sinais que já existem em outro lugar (panorama da 175, estornos
    // da 178, histórico de fechamento), sem inventar cálculo novo — só
    // aplica o mesmo filtro dentro do período selecionado aqui.
    const [pendentesRes, estornadosRes, ultimosFechamentosRes] = await Promise.all([
      // Mesma regra do "panorama" de TelaPedidos.tsx (demanda 175):
      // pagamento_confirmado=false e não cancelado. Sem data_entrada_caixa
      // (só existe pra quem já foi pago), usa created_at pra escopar ao
      // período.
      (() => {
        let q = supabaseAdmin.from('jsgrafica_pedidos').select('valor_final')
          .eq('pagamento_confirmado', false).neq('status', 'cancelado').limit(2000);
        if (de)  q = q.gte('created_at', de.toISOString());
        if (ate) q = q.lte('created_at', ate.toISOString());
        if (operador) q = q.eq('pedido_criado_por', operador);
        return q;
      })(),
      // Mesma regra da demanda 178 (estorno detectado no MP depois da
      // confirmação) — escopado por quando o estorno foi detectado.
      (() => {
        let q = supabaseAdmin.from('jsgrafica_pedidos').select('valor_final')
          .not('pagamento_estornado_at', 'is', null).neq('status', 'cancelado').limit(2000);
        if (de)  q = q.gte('pagamento_estornado_at', de.toISOString());
        if (ate) q = q.lte('pagamento_estornado_at', ate.toISOString());
        if (operador) q = q.eq('pedido_criado_por', operador);
        return q;
      })(),
      // "Últimos 7 fechamentos" é sempre um pulso recente — independente do
      // período escolhido na tela (o Admin pode estar vendo "este mês" e
      // ainda assim querer saber se os fechamentos recentes bateram certo).
      supabaseAdmin.from('jsgrafica_fechamento')
        .select('data_dia, divergencia, fechado_em')
        .eq('fechado_por', 'Sistema')
        .not('divergencia', 'is', null)
        .order('fechado_em', { ascending: false })
        .limit(7),
    ]);
    const pendentes = { qtd: (pendentesRes.data ?? []).length, valor: (pendentesRes.data ?? []).reduce((a, p) => a + Number(p.valor_final || 0), 0) };
    const estornados = { qtd: (estornadosRes.data ?? []).length, valor: (estornadosRes.data ?? []).reduce((a, p) => a + Number(p.valor_final || 0), 0) };
    const ultimos7 = (ultimosFechamentosRes.data ?? [])
      .map(f => ({ aba: f.data_dia, divergencia: Number(f.divergencia ?? 0) }))
      .sort((a, b) => (parseDiaCaixa(a.aba)?.getTime() ?? 0) - (parseDiaCaixa(b.aba)?.getTime() ?? 0));
    const piorDiaUltimos7 = ultimos7.reduce((pior, d) => (pior == null || Math.abs(d.divergencia) > Math.abs(pior.divergencia)) ? d : pior, null as { aba: string; divergencia: number } | null);

    // Dias com movimento real (venda/saída/pedido pago) dentro do período,
    // mas sem nenhum fechamento "Sistema" — "esquecido de fechar", não um
    // dia de loja fechada (esses não têm movimento, não entram aqui). Hoje
    // fica de fora de propósito: ainda em andamento, não é uma lacuna.
    const diasComMovimentoSet = new Set<string>();
    for (const v of vendasRaw)  if (dentroDoPeriodo(v.data_dia)) diasComMovimentoSet.add(v.data_dia);
    for (const s of saidasRaw)  if (dentroDoPeriodo(s.data_dia)) diasComMovimentoSet.add(s.data_dia);
    for (const p of pedidosRaw) {
      if (!p.data_entrada_caixa) continue;
      const dd = timestampParaDiaCaixa(p.data_entrada_caixa);
      if (dentroDoPeriodo(dd)) diasComMovimentoSet.add(dd);
    }
    const diasFechadosSet = new Set(fechamentosRaw.filter(f => ehFechamentoGeral(f.fechado_por)).map(f => f.data_dia));
    const diasSemFechamento = [...diasComMovimentoSet]
      .filter(d => !diasFechadosSet.has(d) && d !== dataDia)
      .sort((a, b) => (parseDiaCaixa(a)?.getTime() ?? 0) - (parseDiaCaixa(b)?.getTime() ?? 0));

    return NextResponse.json({
      periodo,
      hoje: { nomeAba: dataDia, totalEntradas, totalSaidas, resultadoDia: totalEntradas - totalSaidas, saldoAnterior, saldoAcumulado },
      historico,
      porSemana:         agruparPorSemana(historico),
      saidasPorCategoria,
      entradasPorFormaPagamento,
      topDias:           [...historico].filter(d => d.entradas > 0).sort((a,b) => b.entradas - a.entradas).slice(0, 10),
      topProdutos,
      resumo: {
        totalEntradas:    totalEntradasPeriodo,
        totalSaidas:      totalSaidasPeriodo,
        resultado:        totalEntradasPeriodo - totalSaidasPeriodo,
        mediaDiaria,
        diasRegistrados:  historico.length,
        diasComMovimento,
        melhorDia:        melhorDia.aba ? melhorDia : null,
        // Itens vendidos no período (linhas de venda/pedido, não "carrinhos" —
        // não existe agrupamento por transação no schema). Usado pelo resumo
        // rápido da tela "Pedidos Balcão" (demanda 060), sem duplicar cálculo.
        itensVendidos:    vendas.length + pedidosEntregues.length,
      },
      // Demanda 194 (Visão Geral) — "Saúde do caixa": sinais de alerta, não
      // métrica de desempenho. `diasSemFechamento`/`pendentes`/`estornados`
      // são escopados ao período selecionado; `divergenciaUltimos7` é
      // sempre o pulso mais recente, independente do período.
      saudeCaixa: {
        diasSemFechamento,
        pendentes,
        estornados,
        divergenciaUltimos7: {
          soma: ultimos7.reduce((a, d) => a + d.divergencia, 0),
          piorDia: piorDiaUltimos7,
          dias: ultimos7,
        },
      },
    });
  } catch (error) {
    console.error('[DASHBOARD]', error);
    return NextResponse.json({ error: 'Erro ao buscar dashboard' }, { status: 500 });
  }
}
