// ── Demanda 149 — Diagnóstico de Fechamento, Camada A/4: COLETA ──
// Reúne, pra qualquer dia (data_dia DD-MM-AA), tudo que é preciso pra
// reconciliar o fechamento, num JSON estruturado. SÓ coleta e organiza —
// nenhuma regra de detecção (Camada B) nem narrativa de IA (Camada C) aqui;
// formaliza a matéria-prima das investigações manuais 131/143.
// Reaproveita as MESMAS funções do fechamento real (getResumoDia,
// getSaldoAnterior, getFechamentosOperadoresHoje, saldoMercadoPagoDoDia) —
// zero lógica de cálculo duplicada.

import { limitesDiaCaixaUTC } from '@/lib/supabase';
import {
  supabaseAdmin, getResumoDia, getSaldoAnterior,
  getFechamentosOperadoresHoje, ehFechamentoGeral,
} from '@/lib/supabase-admin';
import { saldoMercadoPagoDoDia } from '@/lib/mercadopago';

// Demanda 152 (Camada C): a coleta saiu do route handler pra cá pra ser
// reaproveitada pelo endpoint de resumo narrativo — o GET do diagnóstico
// virou casca fina em volta desta função. `dataDia` já chega validado.
export async function montarDiagnosticoDia(dataDia: string) {
  {
    const limites = limitesDiaCaixaUTC(dataDia);

    const CAMPOS_PEDIDO_DIAG = 'id, servico_id, servico_nome, quantidade, valor_final, forma_pagamento, forma_pagamento_escolhida, pagamento_confirmado, pagamento_confirmado_origem, mp_order_id, telefone, nome_cliente, pedido_criado_por, venda_id, saida_vinculada_id, data_entregue_at, data_entrada_caixa';
    const [pedidosRes, pedidosEntreguesNaoPagosRes, vendasRes, saidasRes, fechamentosRes, totais, saldoAnterior, fechamentosOperadores, saldoMercadoPago] = await Promise.all([
      // Pedidos que CONTAM no dia — demanda 164: mesma régua nova do
      // getResumoDia (pagamento confirmado, janela por data_entrada_caixa),
      // senão os totais recalculados divergiriam da lista mostrada.
      (() => {
        let q = supabaseAdmin
          .from('jsgrafica_pedidos')
          .select(CAMPOS_PEDIDO_DIAG)
          .eq('pagamento_confirmado', true)
          .neq('status', 'cancelado')
          .order('data_entrada_caixa', { ascending: true });
        if (limites) q = q.gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
        return q;
      })(),
      // ...MAIS os entregues no dia ainda NÃO pagos — não contam no total,
      // mas são exatamente o que os sinais da Camada B (150) precisam ver
      // (teste esquecido, Pix pendente etc.). União deduplicada abaixo.
      (() => {
        let q = supabaseAdmin
          .from('jsgrafica_pedidos')
          .select(CAMPOS_PEDIDO_DIAG)
          .eq('status', 'entregue')
          .eq('pagamento_confirmado', false)
          .order('data_entregue_at', { ascending: true });
        if (limites) q = q.gte('data_entregue_at', limites.inicio).lt('data_entregue_at', limites.fim);
        return q;
      })(),
      // Vendas legadas (jsgrafica_vendas) — a tabela parou de receber linha
      // nova na 054, mas getResumoDia ainda soma; sem listar aqui, um dia
      // antigo teria total que "não fecha" com a lista de pedidos.
      supabaseAdmin.from('jsgrafica_vendas').select('id, produto, quantidade, total, operador, forma_pagamento').eq('data_dia', dataDia),
      supabaseAdmin
        .from('jsgrafica_saidas')
        .select('id, categoria_id, categoria_nome, valor, operador, descricao, quantidade, editado_em, editado_por, created_at')
        .eq('data_dia', dataDia)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('jsgrafica_fechamento')
        .select('*')
        .eq('data_dia', dataDia),
      getResumoDia(dataDia),
      getSaldoAnterior(dataDia),
      getFechamentosOperadoresHoje(dataDia),
      // Saldo real da conta MP no dia (127) — null quando a integração falha
      // (token expirado, MP fora do ar), nunca derruba o diagnóstico.
      saldoMercadoPagoDoDia(dataDia).catch(e => {
        console.error('[149] Falha ao buscar saldo Mercado Pago do dia', e);
        return null;
      }),
    ]);

    // União: pagos-no-dia + entregues-não-pagos-no-dia (sem duplicar id).
    const idsVistos = new Set((pedidosRes.data ?? []).map(p => p.id));
    const pedidos = [
      ...(pedidosRes.data ?? []),
      ...(pedidosEntreguesNaoPagosRes.data ?? []).filter(p => !idsVistos.has(p.id)),
    ];
    const saidas = saidasRes.data ?? [];

    // "Vinculada a pedido ou não": o vínculo mora no pedido
    // (saida_vinculada_id, demandas 104/112) — invertido aqui pra cada saída
    // saber de qual pedido ela é o repasse automático.
    const saidaParaPedido = new Map<string, string>();
    for (const p of pedidos) {
      if (p.saida_vinculada_id) saidaParaPedido.set(p.saida_vinculada_id, p.id);
    }
    // Pedido vinculado pode ter sido entregue noutro dia (ex.: repasse lançado
    // hoje de pedido antigo) — completa o mapa consultando fora da janela.
    const idsSaidasSemDono = saidas.filter(s => !saidaParaPedido.has(s.id)).map(s => s.id);
    if (idsSaidasSemDono.length > 0) {
      const { data: donosForaDoDia } = await supabaseAdmin
        .from('jsgrafica_pedidos')
        .select('id, saida_vinculada_id')
        .in('saida_vinculada_id', idsSaidasSemDono);
      for (const p of donosForaDoDia ?? []) {
        if (p.saida_vinculada_id) saidaParaPedido.set(p.saida_vinculada_id, p.id);
      }
    }

    // Fechamento geral vs por operador — mesmo critério do resto do sistema
    // (ehFechamentoGeral, 092/075).
    const fechamentoGeral = (fechamentosRes.data ?? []).find(f => ehFechamentoGeral(f.fechado_por)) ?? null;

    const resultadoDia = Math.round((totais.totalEntradas - totais.totalSaidas) * 100) / 100;
    const saldoAcumulado = Math.round((resultadoDia + saldoAnterior) * 100) / 100;

    const pedidosEntregues = pedidos.map(p => ({
      id: p.id,
      servicoId: p.servico_id,
      servicoNome: p.servico_nome,
      quantidade: p.quantidade,
      valorFinal: Number(p.valor_final) || 0,
      formaPagamento: p.forma_pagamento,
      formaPagamentoEscolhida: p.forma_pagamento_escolhida,
      pagamentoConfirmado: p.pagamento_confirmado,
      pagamentoConfirmadoOrigem: p.pagamento_confirmado_origem,
      mpOrderId: p.mp_order_id,
      telefone: p.telefone,
      nomeCliente: p.nome_cliente,
      operador: p.pedido_criado_por,
      vendaId: p.venda_id,
      saidaVinculadaId: p.saida_vinculada_id,
      entregueEm: p.data_entregue_at,
    }));

    const saidasDia = saidas.map(s => ({
      id: s.id,
      categoriaId: s.categoria_id,
      categoriaNome: s.categoria_nome,
      valor: Number(s.valor) || 0,
      operador: s.operador,
      descricao: s.descricao,
      quantidade: s.quantidade,
      editadaEm: s.editado_em,
      editadaPor: s.editado_por,
      criadaEm: s.created_at,
      pedidoVinculado: saidaParaPedido.get(s.id) ?? null,
    }));

    // Demanda 150 (Camada B): categoria de produto dos pedidos do dia — as
    // regras de recarga distinguem VEM (repasse automático, 104) de celular
    // (repasse manual desde a 128).
    const servicoIds = [...new Set(pedidosEntregues.map(p => p.servicoId).filter((x): x is string => !!x))];
    const categoriaPorProduto = new Map<string, string>();
    if (servicoIds.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from('jsgrafica_produtos')
        .select('id, categoria')
        .in('id', servicoIds);
      for (const pr of prods ?? []) categoriaPorProduto.set(pr.id, pr.categoria);
    }

    const sinais = montarSinais(pedidosEntregues, saidasDia, fechamentosRes.data ?? [], categoriaPorProduto, dataDia);

    return {
      dataDia,
      // Demanda 150 (Camada B): padrões conhecidos detectados por regra
      // determinística — cada sinal cita o(s) registro(s) exato(s). Só
      // sinaliza; corrigir continua sendo decisão humana.
      sinais,
      // O que entrou: pedidos entregues no dia (com forma de pagamento
      // escolhida x usada, confirmação e vínculo MP) + vendas legadas.
      pedidosEntregues,
      vendasLegado: vendasRes.data ?? [],
      // O que saiu: saídas do dia, cada uma dizendo se é repasse automático
      // de um pedido (e de qual) ou lançamento manual.
      saidas: saidasDia,
      // Conta real: líquido aprovado no Mercado Pago no dia (127).
      saldoMercadoPago,
      // O que foi DIGITADO no fechamento geral (se o dia já foi fechado) —
      // contas nomeadas da 127, dinheiro/moedas contados, divergência gravada.
      fechamentoGeral,
      // Gavetas físicas de Zu/Gabi (121).
      fechamentosOperadores,
      // Demanda 152: as linhas de fechamento POR OPERADOR completas — a
      // narrativa precisa da divergência real de cada gaveta (o resumo do
      // getFechamentosOperadoresHoje só traz dinheiro/moedas), senão a IA
      // "deduz" divergência zero onde só faltava o dado.
      fechamentosOperadoresDetalhe: (fechamentosRes.data ?? [])
        .filter(f => !ehFechamentoGeral(f.fechado_por))
        .map(f => ({
          operador: f.fechado_por,
          totalFisico: Number(f.total_fisico) || 0,
          esperado: Number(f.saldo_acumulado) || 0,
          divergencia: Number(f.divergencia) || 0,
          fechadoEm: f.fechado_em,
        })),
      // Totais calculados AGORA, pela mesma lógica do fechamento real — pra
      // comparar com o que foi gravado na época (mudou = alguém mexeu em
      // pedido/saída depois do fechamento).
      totais: {
        totalEntradas: Math.round(totais.totalEntradas * 100) / 100,
        totalSaidas: Math.round(totais.totalSaidas * 100) / 100,
        resultadoDia,
        saldoAnterior,
        saldoAcumulado,
      },
    };
  }
}

export type DiagnosticoDia = Awaited<ReturnType<typeof montarDiagnosticoDia>>;

// ── Demanda 150 (Camada B): regras determinísticas de detecção ──
// Formaliza os padrões que o PM detectava lendo o JSON da Camada A na mão.
// Sem IA, sem heurística vaga: cada regra nasceu de um caso real desta base
// e SEMPRE cita o(s) registro(s) exato(s). Calibradas contra dias reais
// (08-07-26 e 09-07-26) pra não gritar em rotina legítima de balcão.

type Severidade = 'info' | 'atencao' | 'critico';
interface RegistroSinal { tabela: 'pedido' | 'saida' | 'fechamento'; id: string }
interface Sinal { tipo: string; severidade: Severidade; descricao: string; registros: RegistroSinal[] }

interface PedidoDiag {
  id: string; servicoId: string | null; servicoNome: string | null;
  valorFinal: number; formaPagamentoEscolhida: string | null;
  pagamentoConfirmado: boolean | null; telefone: string | null;
  nomeCliente: string | null; operador: string | null;
  saidaVinculadaId: string | null; entregueEm: string | null;
}
interface SaidaDiag {
  id: string; categoriaId: string; categoriaNome: string; valor: number;
  operador: string; pedidoVinculado: string | null;
}
interface FechamentoDiag { fechado_por: string | null; divergencia: number | string | null }

const LIMIAR_DIVERGENCIA = 20;            // R$ — acima disso, revisão (mesmo sabendo do padrão da 080)
const JANELA_DUPLICADOS_MS = 10 * 60 * 1000; // "criados em minutos um do outro"

function dinheiro(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function montarSinais(
  pedidos: PedidoDiag[],
  saidas: SaidaDiag[],
  fechamentos: FechamentoDiag[],
  categoriaPorProduto: Map<string, string>,
  dataDia: string,
): Sinal[] {
  const sinais: Sinal[] = [];

  // 1. Pix escolhido, nunca confirmado, sem cliente identificado — o padrão
  // exato dos 5 pedidos de teste que contaminaram o dia 09-07-26.
  for (const p of pedidos) {
    if (p.formaPagamentoEscolhida === 'pix' && !p.pagamentoConfirmado && p.telefone === 'balcao' && !p.nomeCliente) {
      sinais.push({
        tipo: 'pix_nao_confirmado_telefone_generico',
        severidade: 'atencao',
        descricao: `Pedido ${p.id} (${p.servicoNome}, ${dinheiro(p.valorFinal)}, operador ${p.operador}) entregue com Pix escolhido mas pagamento nunca confirmado e sem cliente identificado (telefone "balcao") — padrão de pedido de teste esquecido.`,
        registros: [{ tabela: 'pedido', id: p.id }],
      });
    }
  }

  // 2. Idênticos (serviço+valor+operador) em sequência rápida, considerando
  // SÓ os não confirmados. O recorte pelo pagamento é o que separa teste
  // repetido de rotina real de balcão — no dia limpo 08-07-26 a Gabi entregou
  // 5+ impressões idênticas em minutos, todas confirmadas em dinheiro
  // (cliente real imprimindo várias vezes): não é sinal. Agrupar só os
  // pendentes também evita que vendas reais confirmadas do mesmo produto
  // "diluam" um lote de testes pendentes (visto no teste contra 09-07-26).
  const grupos = new Map<string, PedidoDiag[]>();
  for (const p of pedidos) {
    if (p.pagamentoConfirmado) continue;
    const k = `${p.servicoNome}|${p.valorFinal}|${p.operador}`;
    const g = grupos.get(k); if (g) g.push(p); else grupos.set(k, [p]);
  }
  for (const itens of grupos.values()) {
    if (itens.length < 2) continue;
    const tempos = itens
      .map(i => (i.entregueEm ? Date.parse(i.entregueEm) : NaN))
      .filter(t => !Number.isNaN(t))
      .sort((a, b) => a - b);
    if (tempos.length !== itens.length) continue;
    const emSequenciaRapida = tempos.every((t, i) => i === 0 || t - tempos[i - 1] <= JANELA_DUPLICADOS_MS);
    if (!emSequenciaRapida) continue;
    const ex = itens[0];
    sinais.push({
      tipo: 'pedidos_identicos_em_sequencia',
      severidade: 'atencao',
      descricao: `${itens.length} pedidos idênticos (${ex.servicoNome}, ${dinheiro(ex.valorFinal)}, operador ${ex.operador}) entregues com poucos minutos entre si e nenhum com pagamento confirmado — padrão de teste repetido/duplicado.`,
      registros: itens.map(i => ({ tabela: 'pedido' as const, id: i.id })),
    });
  }

  // 3. Recargas — celular é repasse MANUAL (comissão variável, sem vínculo
  // desde a 128). VEM: a demanda 213 corrigiu o entendimento original da 104
  // — "repasse desta venda" nunca existiu de verdade pra VEM (Pix RecargaPay
  // já não gera desde a 199/211; Dinheiro/Cartão virou receita normal, sem
  // repasse nenhum a fazer — reabastecer o RecargaPay é manual e periódico,
  // Transferência entre Contas, 201). Os sinais antigos que esperavam TODA
  // venda de VEM vinculada a um repasse automático (`recarga_vem_sem_repasse`
  // / `saida_repasse_vem_sem_pedido`) foram REMOVIDOS aqui — com a 213 no ar
  // eles disparariam falso positivo em toda venda de VEM em Dinheiro/Cartão
  // dali pra frente (achado durante a própria 213, ao conferir "que outro
  // fluxo depende do repasse automático de recarga pra funcionar").
  const pedidosCel = pedidos.filter(p => p.servicoId && categoriaPorProduto.get(p.servicoId) === 'Recarga celular');
  const saidasCel = saidas.filter(s => s.categoriaId === 'recarga_cel');

  if (pedidosCel.length > 0 && saidasCel.length === 0) {
    sinais.push({
      tipo: 'recarga_celular_sem_repasse_manual',
      severidade: 'atencao',
      descricao: `${pedidosCel.length} recarga(s) de celular entregue(s) no dia e NENHUMA saída "Repasse Recarga Celular" lançada — desde a demanda 128 esse repasse é manual e precisa ser lançado antes do fechamento (foi exatamente o que faltou em 09-07 na venda da Gabi).`,
      registros: pedidosCel.map(p => ({ tabela: 'pedido' as const, id: p.id })),
    });
  }
  for (const s of saidasCel) {
    if (s.pedidoVinculado) {
      sinais.push({
        tipo: 'saida_repasse_celular_vinculada',
        severidade: 'atencao',
        descricao: `Saída "${s.categoriaNome}" de ${dinheiro(s.valor)} vinculada ao pedido ${s.pedidoVinculado} — repasse automático de celular foi DESLIGADO na demanda 128 (taxa fixa errada); vínculo novo não deveria existir.`,
        registros: [{ tabela: 'saida', id: s.id }],
      });
    }
  }
  if (pedidosCel.length === 0 && saidasCel.length > 0) {
    sinais.push({
      tipo: 'saida_repasse_celular_sem_pedido_no_dia',
      severidade: 'info',
      descricao: `Saída(s) "Repasse Recarga Celular" lançada(s) sem nenhuma recarga de celular entregue no mesmo dia — pode ser repasse (legítimo) de venda de dia anterior; conferir o valor.`,
      registros: saidasCel.map(s => ({ tabela: 'saida' as const, id: s.id })),
    });
  }

  // 4. Telefone em formato @lid — problema mapeado nas demandas 126/134/135;
  // não deveria mais acontecer, crítico se voltar.
  for (const p of pedidos) {
    if (p.telefone && p.telefone.includes('@')) {
      sinais.push({
        tipo: 'telefone_formato_lid',
        severidade: 'critico',
        descricao: `Pedido ${p.id} com telefone em formato LID ("${p.telefone}") em vez do número real — regressão do problema das demandas 126/134/135; bloqueia mensagem/Pix pra esse cliente.`,
        registros: [{ tabela: 'pedido', id: p.id }],
      });
    }
  }

  // 5. Divergência acima do limiar — sinaliza pra revisão mesmo sabendo que
  // no fechamento por operador o padrão da 080 (comparação contra o total
  // errado) já foi corrigido na 074; contagem ainda pode errar.
  for (const f of fechamentos) {
    const div = Number(f.divergencia) || 0;
    if (Math.abs(div) <= LIMIAR_DIVERGENCIA) continue;
    const geral = ehFechamentoGeral(f.fechado_por);
    sinais.push({
      tipo: geral ? 'divergencia_fechamento_geral' : 'divergencia_operador_acima_limiar',
      severidade: 'atencao',
      descricao: geral
        ? `Fechamento geral do dia com divergência de ${dinheiro(div)} entre o físico contado e o calculado (limiar: ${dinheiro(LIMIAR_DIVERGENCIA)}).`
        : `Fechamento de ${f.fechado_por} com divergência de ${dinheiro(div)} entre a gaveta contada e o esperado (limiar: ${dinheiro(LIMIAR_DIVERGENCIA)}) — possível erro de contagem, revisar.`,
      registros: [{ tabela: 'fechamento', id: `${dataDia}/${f.fechado_por ?? 'geral'}` }],
    });
  }

  return sinais;
}
