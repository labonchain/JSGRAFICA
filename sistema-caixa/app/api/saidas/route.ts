export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa } from '@/lib/supabase';
import { supabaseAdmin, criarSaida } from '@/lib/supabase-admin';
import { CONTAS_ORIGEM } from '@/lib/dados';

export async function GET(req: NextRequest) {
  try {
    // Demanda 129: `?data=DD-MM-AA` opcional pra ver lançamentos de qualquer
    // dia — sem o parâmetro, continua "hoje" (comportamento original da 091).
    const dataParam = req.nextUrl.searchParams.get('data');
    if (dataParam && !/^\d{2}-\d{2}-\d{2}$/.test(dataParam)) {
      return NextResponse.json({ error: 'Data inválida (use DD-MM-AA)' }, { status: 400 });
    }
    const dataDia = dataParam || formatarDiaCaixa();

    // Demanda 130: `id` (alvo de editar/cancelar) + campos que o modal de
    // edição pré-preenche, e o rastro de edição pra exibição.
    const { data, error } = await supabaseAdmin
      .from('jsgrafica_saidas')
      .select('id, categoria_id, categoria_nome, valor, operador, descricao, data_dia, created_at, editado_em, editado_por, conta_origem')
      .eq('data_dia', dataDia)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalSaidas = (data ?? []).reduce((acc, s) => acc + Number(s.valor), 0);

    return NextResponse.json({
      nomeAba: dataDia,
      saidas: data ?? [],
      totalSaidas,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar saídas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { categoriaId, valor, quantidade, valorCarga, descricao, operador, contaOrigem } = await req.json();
    // Demanda 229: lógica de criação extraída pra `criarSaida`
    // (lib/supabase-admin.ts) — reaproveitada pela classificação de
    // pendência de conciliação, que precisa gravar em dias passados (essa
    // rota continua sem `dataDia` no corpo, sempre hoje, comportamento
    // idêntico ao de sempre).
    const resultado = await criarSaida({ categoriaId, valor, quantidade, valorCarga, descricao, operador, contaOrigem });
    return NextResponse.json({ success: true, ...resultado });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao registrar saída';
    const status = ['Conta de origem inválida', 'Categoria não encontrada ou inativa',
      'Quantidade de recargas e valor da carga são obrigatórios', 'Valor inválido'].includes(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// Demanda 130 — editar uma saída já lançada (valor/categoria/descrição/data).
// Sem recomputar a matemática de Recarga VEM aqui de propósito: editar é
// justamente o caminho de CORREÇÃO de um valor que saiu errado (automático ou
// não) — o Admin manda o valor final que quer, e fica o rastro
// `editado_em`/`editado_por` de que a linha mudou depois do lançamento.
export async function PATCH(req: NextRequest) {
  try {
    const { id, valor, categoriaId, descricao, dataDia, operador, corrigirContaOrigem, contaOrigem } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    // Demanda 200: correção AUDITÁVEL de conta_origem — mesmo padrão da 180
    // (`corrigirFormaPagamento` em app/api/pedidos/route.ts): ação separada
    // do edit genérico abaixo (valor/categoria/descrição/data), Admin-only
    // (gate na UI), sempre grava rastro de→para em `conta_origem_historico`,
    // nunca sobrescreve em silêncio.
    if (corrigirContaOrigem === true) {
      const contasValidas = CONTAS_ORIGEM.map(c => c.id) as string[];
      if (contaOrigem !== null && contaOrigem !== undefined && !contasValidas.includes(contaOrigem)) {
        return NextResponse.json({ error: 'Conta de origem inválida' }, { status: 400 });
      }
      const contaFinal: string | null = contaOrigem ?? null;
      const { data: saidaAtual } = await supabaseAdmin
        .from('jsgrafica_saidas')
        .select('conta_origem, conta_origem_historico')
        .eq('id', id)
        .single();
      if (!saidaAtual) return NextResponse.json({ error: 'Saída não encontrada' }, { status: 404 });
      if (saidaAtual.conta_origem === contaFinal) {
        return NextResponse.json({ error: 'A conta de origem já é essa' }, { status: 400 });
      }
      const historico = Array.isArray(saidaAtual.conta_origem_historico) ? saidaAtual.conta_origem_historico : [];
      const { data: corrigida, error: erroCorrigir } = await supabaseAdmin
        .from('jsgrafica_saidas')
        .update({
          conta_origem: contaFinal,
          conta_origem_historico: [...historico, {
            em:       new Date().toISOString(),
            operador: operador || 'Sistema',
            de:       saidaAtual.conta_origem,
            para:     contaFinal,
          }],
        })
        .eq('id', id)
        .select()
        .single();
      if (erroCorrigir) throw erroCorrigir;
      return NextResponse.json({ success: true, saida: corrigida });
    }

    // Demanda 232: se essa saída for o lado de origem de uma transferência
    // (201) — vinculada por `saida_id`, sempre 1:1, confirmado com dado real
    // — valor e data_dia precisam ficar sincronizados nos 2 lados sempre.
    // Achado real (checkpoint da 231): editar só a saída aqui, sem propagar,
    // deixou os 2 lados divergentes silenciosamente (24-07-26, R$55).
    const { data: transferenciaVinculada } = await supabaseAdmin
      .from('jsgrafica_transferencias')
      .select('id, valor, data_dia')
      .eq('saida_id', id)
      .maybeSingle();

    if (transferenciaVinculada && categoriaId !== undefined) {
      return NextResponse.json(
        { error: 'Essa saída é o lado de uma transferência entre contas — não dá pra mudar a categoria dela.' },
        { status: 400 },
      );
    }

    const update: Record<string, unknown> = {
      editado_em:  new Date().toISOString(),
      editado_por: operador || 'Sistema',
    };

    if (valor !== undefined) {
      const v = Number(valor);
      if (!v || v <= 0) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
      update.valor = v;
    }
    if (descricao !== undefined) update.descricao = descricao || null;
    if (dataDia !== undefined) {
      if (!/^\d{2}-\d{2}-\d{2}$/.test(dataDia)) {
        return NextResponse.json({ error: 'Data inválida (use DD-MM-AA)' }, { status: 400 });
      }
      update.data_dia = dataDia;
    }
    if (categoriaId !== undefined) {
      // Mesma validação do POST: categoria precisa existir e estar ativa —
      // nome sempre re-derivado da tabela, nunca vindo pronto do cliente.
      const { data: categoria } = await supabaseAdmin
        .from('jsgrafica_categorias_saida')
        .select('nome')
        .eq('id', categoriaId)
        .eq('ativo', true)
        .maybeSingle();
      if (!categoria) return NextResponse.json({ error: 'Categoria não encontrada ou inativa' }, { status: 400 });
      update.categoria_id   = categoriaId;
      update.categoria_nome = categoria.nome;
    }

    const { data: saida, error } = await supabaseAdmin
      .from('jsgrafica_saidas')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error || !saida) return NextResponse.json({ error: 'Saída não encontrada' }, { status: 404 });

    // Propaga valor/data pro outro lado da transferência, na mesma chamada —
    // nunca 2 passos separados que possam ficar dessincronizados no meio.
    if (transferenciaVinculada && (valor !== undefined || dataDia !== undefined)) {
      const updateTransferencia: Record<string, unknown> = {};
      if (valor !== undefined) updateTransferencia.valor = update.valor;
      if (dataDia !== undefined) updateTransferencia.data_dia = update.data_dia;

      const { error: erroTransf } = await supabaseAdmin
        .from('jsgrafica_transferencias')
        .update(updateTransferencia)
        .eq('id', transferenciaVinculada.id);
      if (erroTransf) {
        console.error('[232] Saída atualizada mas falhou sincronizar a transferência vinculada', erroTransf);
        return NextResponse.json({
          error: 'A saída foi salva, mas a transferência vinculada NÃO foi sincronizada — corrija manualmente antes de confiar nesse valor.',
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, saida });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao editar saída' }, { status: 500 });
  }
}

// Demanda 130 — cancelar uma saída lançada. **Decisão documentada: DELETE
// real, não flag `cancelado`** — todas as agregações (getResumoDia,
// dashboard, fechamento, Financeiro) somam as linhas de jsgrafica_saidas sem
// nenhum conceito de status; uma flag exigiria mexer em todos os leitores, e
// as 3 correções manuais desta semana (que motivaram a demanda) foram
// exatamente DELETEs. Se a saída estiver vinculada a um pedido
// (`saida_vinculada_id`, demandas 104/124), o vínculo é desfeito ANTES de
// apagar — mesma ordem de `cancelarPedido` (112): a FK não tem `ON DELETE`,
// apagar primeiro violaria a constraint. O pedido em si fica intacto.
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const { data: saida } = await supabaseAdmin
      .from('jsgrafica_saidas')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!saida) return NextResponse.json({ error: 'Saída não encontrada' }, { status: 404 });

    // Demanda 233: se essa saída for o lado de origem de uma transferência
    // (201), cancelar só ela (sem a linha de `jsgrafica_transferencias`)
    // deixaria o outro lado órfão — hoje isso já falha no banco (FK sem
    // `ON DELETE`), mas com um erro 500 genérico, sem explicar o motivo.
    // Bloqueio intencional, com mensagem clara: a ação certa é cancelar a
    // TRANSFERÊNCIA (`DELETE /api/transferencias`, já existe desde a 201 e
    // já apaga os 2 lados na ordem certa), não a saída isolada.
    const { data: transferenciaVinculada } = await supabaseAdmin
      .from('jsgrafica_transferencias')
      .select('id')
      .eq('saida_id', id)
      .maybeSingle();
    if (transferenciaVinculada) {
      return NextResponse.json({
        error: 'Essa saída é o lado de uma transferência entre contas — cancele a transferência (não a saída) pra desfazer os 2 lados juntos.',
      }, { status: 400 });
    }

    const { error: erroVinculo } = await supabaseAdmin
      .from('jsgrafica_pedidos')
      .update({ saida_vinculada_id: null })
      .eq('saida_vinculada_id', id);
    if (erroVinculo) throw erroVinculo;

    const { error } = await supabaseAdmin
      .from('jsgrafica_saidas')
      .delete()
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao cancelar saída' }, { status: 500 });
  }
}
