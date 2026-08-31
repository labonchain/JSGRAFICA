export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, ehFechamentoGeral } from '@/lib/supabase-admin';
import { limitesDiaCaixaUTC, formatarDiaCaixa } from '@/lib/supabase';
import { CONTAS_ORIGEM } from '@/lib/dados';

interface Lancamento {
  id: string;
  tipo: 'venda_balcao' | 'pedido_pago' | 'abertura' | 'fechamento' | 'entrada_avulsa';
  horario: string;
  operador: string | null;
  valor: number;
  descricao: string;
  // Demanda 271: só preenchidos pra `entrada_avulsa` — o modal de editar/
  // cancelar precisa do id cru (sem o prefixo `entrada-avulsa-`) e da conta
  // pra pré-preencher o formulário.
  entradaAvulsaId?: string;
  contaDestino?: string;
}

const LABEL_CONTA: Record<string, string> = Object.fromEntries(CONTAS_ORIGEM.map(c => [c.id, c.label]));

// GET /api/entradas?dia=DD-MM-AA&operador=Nome — demanda 098 (ledger de
// entradas). Junta as mesmas fontes que `getResumoDia` já soma agregado
// (jsgrafica_vendas legado + jsgrafica_pedidos entregues) com os eventos de
// abertura/fechamento de caixa, mas linha a linha em vez de só o total.
// Toda query é filtrada por `data_dia` (texto, igualdade direta) ou por
// `data_entregue_at` numa janela UTC do dia — nunca busca a tabela inteira
// sem filtro (mesmo cuidado das demandas 041/043/055).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dataDia = searchParams.get('dia') || formatarDiaCaixa();
  const operadorFiltro = searchParams.get('operador') || '';

  const limites = limitesDiaCaixaUTC(dataDia);
  if (!limites) return NextResponse.json({ error: 'dia inválido, use DD-MM-AA' }, { status: 400 });

  const lancamentos: Lancamento[] = [];

  // Vendas legadas (jsgrafica_vendas) — venda de balcão parou de gravar aqui
  // na demanda 054, mas dias antigos ainda têm dado real só nesta tabela.
  let vendasQuery = supabaseAdmin
    .from('jsgrafica_vendas')
    .select('id, operador, total, produto_nome, quantidade, created_at')
    .eq('data_dia', dataDia);
  if (operadorFiltro) vendasQuery = vendasQuery.eq('operador', operadorFiltro);
  const { data: vendas, error: erroVendas } = await vendasQuery;
  if (erroVendas) return NextResponse.json({ error: erroVendas.message }, { status: 500 });
  for (const v of vendas ?? []) {
    lancamentos.push({
      id: `venda-${v.id}`,
      tipo: 'venda_balcao',
      horario: v.created_at,
      operador: v.operador,
      valor: Number(v.total ?? 0),
      descricao: `${v.produto_nome ?? '—'}${Number(v.quantidade) > 1 ? ` (${v.quantidade}x)` : ''}`,
    });
  }

  // Pedidos PAGOS no dia — demanda 164: entrada conta pelo pagamento
  // confirmado (data_entrada_caixa), não pelo status de entrega. Pedido em
  // produção/pronto já pago é dinheiro real em caixa e aparece aqui.
  let pedidosQuery = supabaseAdmin
    .from('jsgrafica_pedidos')
    .select('id, telefone, nome_cliente, servico_nome, valor_final, pedido_criado_por, data_entrada_caixa')
    .eq('pagamento_confirmado', true)
    .neq('status', 'cancelado')
    .gte('data_entrada_caixa', limites.inicio)
    .lt('data_entrada_caixa', limites.fim);
  if (operadorFiltro) pedidosQuery = pedidosQuery.eq('pedido_criado_por', operadorFiltro);
  const { data: pedidos, error: erroPedidos } = await pedidosQuery;
  if (erroPedidos) return NextResponse.json({ error: erroPedidos.message }, { status: 500 });
  for (const p of pedidos ?? []) {
    const balcao = p.telefone === 'balcao';
    lancamentos.push({
      id: `pedido-${p.id}`,
      tipo: balcao ? 'venda_balcao' : 'pedido_pago',
      horario: p.data_entrada_caixa!,
      operador: p.pedido_criado_por,
      valor: Number(p.valor_final ?? 0),
      descricao: balcao ? (p.servico_nome ?? '—') : `${p.servico_nome ?? '—'} · ${p.nome_cliente || p.telefone}`,
    });
  }

  // Abertura de caixa por operador
  let aberturaQuery = supabaseAdmin
    .from('jsgrafica_abertura_caixa')
    .select('id, operador, total_contado, criado_em')
    .eq('data_dia', dataDia);
  if (operadorFiltro) aberturaQuery = aberturaQuery.eq('operador', operadorFiltro);
  const { data: aberturas, error: erroAbertura } = await aberturaQuery;
  if (erroAbertura) return NextResponse.json({ error: erroAbertura.message }, { status: 500 });
  for (const a of aberturas ?? []) {
    lancamentos.push({
      id: `abertura-${a.id}`,
      tipo: 'abertura',
      horario: a.criado_em,
      operador: a.operador,
      valor: Number(a.total_contado ?? 0),
      descricao: 'Abertura de caixa',
    });
  }

  // Entrada avulsa (demanda 269) — depósito/recebimento manual, sem pedido
  // nem venda, lançado direto (botão "+ Adicionar entrada") ou via
  // classificação de pendência de conciliação (229). Achado ao implementar a
  // 269: esta fonte nunca tinha sido somada aqui — a lista de Entradas
  // simplesmente não mostrava nenhuma entrada avulsa até agora, apesar da
  // tabela já existir desde a 226.
  let entradasAvulsasQuery = supabaseAdmin
    .from('jsgrafica_entradas_avulsas')
    .select('id, valor, conta_destino, operador, descricao, created_at')
    .eq('data_dia', dataDia);
  if (operadorFiltro) entradasAvulsasQuery = entradasAvulsasQuery.eq('operador', operadorFiltro);
  const { data: entradasAvulsas, error: erroEntradasAvulsas } = await entradasAvulsasQuery;
  if (erroEntradasAvulsas) return NextResponse.json({ error: erroEntradasAvulsas.message }, { status: 500 });
  for (const e of entradasAvulsas ?? []) {
    lancamentos.push({
      id: `entrada-avulsa-${e.id}`,
      tipo: 'entrada_avulsa',
      horario: e.created_at,
      operador: e.operador,
      valor: Number(e.valor ?? 0),
      descricao: e.descricao || `Entrada avulsa · ${LABEL_CONTA[e.conta_destino] ?? e.conta_destino}`,
      entradaAvulsaId: e.id,
      contaDestino: e.conta_destino,
    });
  }

  // Fechamento (geral do dia + por operador) — mesmo critério de distinção
  // já usado em lib/supabase-admin.ts (ehFechamentoGeral).
  const { data: fechamentos, error: erroFechamento } = await supabaseAdmin
    .from('jsgrafica_fechamento')
    .select('id, fechado_por, total_entradas, fechado_em')
    .eq('data_dia', dataDia);
  if (erroFechamento) return NextResponse.json({ error: erroFechamento.message }, { status: 500 });
  for (const f of fechamentos ?? []) {
    const geral = ehFechamentoGeral(f.fechado_por);
    if (operadorFiltro && (geral || f.fechado_por !== operadorFiltro)) continue;
    if (!f.fechado_em) continue;
    lancamentos.push({
      id: `fechamento-${f.id}`,
      tipo: 'fechamento',
      horario: f.fechado_em,
      operador: geral ? null : f.fechado_por,
      valor: Number(f.total_entradas ?? 0),
      descricao: geral ? 'Fechamento geral do dia' : `Fechamento de ${f.fechado_por}`,
    });
  }

  lancamentos.sort((a, b) => new Date(b.horario).getTime() - new Date(a.horario).getTime());

  return NextResponse.json({ dia: dataDia, lancamentos });
}
