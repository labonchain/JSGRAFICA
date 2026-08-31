export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, criarSaida, criarTransferencia, criarEntradaAvulsa } from '@/lib/supabase-admin';
import { CONTAS_ORIGEM } from '@/lib/dados';

const CONTAS_VALIDAS = CONTAS_ORIGEM.map(c => c.id) as string[];

// Demanda 229 — lista as pendências de conciliação (227/228 já alimentam a
// tabela desde 21/07). `dataDia` opcional filtra 1 dia (usado pelo card
// "Itens não explicados hoje" do Fechamento); sem o parâmetro, traz tudo
// (usado pela aba "🔎 Conciliação").
export async function GET(req: NextRequest) {
  try {
    const dataDia = req.nextUrl.searchParams.get('dataDia');

    let query = supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
      .select('id, conta, data_dia, tipo_origem, valor, origem_externa_id, descricao_sugerida, status, classificacao, classificado_por, classificado_em, recalculo_aplicado_em, created_at')
      .order('data_dia', { ascending: false }).order('created_at', { ascending: false });
    if (dataDia) query = query.eq('data_dia', dataDia);

    const { data, error } = await query;
    if (error) throw error;
    const pendencias = data ?? [];

    // Demanda 229 (escopo original) + 231 (recálculo): aviso de "fechamento
    // desatualizado" — só se aplica a item CLASSIFICADO como Entrada/Saída
    // (não Transferência: confirmado com dado real na 231 que ela é sempre
    // líquida zero no agregado "Sistema" por construção — criarTransferencia
    // grava o mesmo valor nos 2 lados — então nunca precisa de recálculo,
    // nunca deveria pedir ação) NUM DIA que já tinha fechamento "Sistema"
    // ANTES da classificação, e que ainda não teve seu delta aplicado
    // (`recalculo_aplicado_em is null` — some da lista depois que a 231
    // aplica o recálculo daquele dia). Calculado ao vivo.
    const diasComRegistroFinanceiro = [...new Set(
      pendencias
        .filter(p => p.status === 'classificado' && !p.recalculo_aplicado_em
          && ['entrada', 'saida'].includes((p.classificacao as { tipo?: string } | null)?.tipo ?? ''))
        .map(p => p.data_dia)
    )];
    let fechamentosPorDia: Record<string, string> = {};
    if (diasComRegistroFinanceiro.length > 0) {
      const { data: fechamentos } = await supabaseAdmin.from('jsgrafica_fechamento')
        .select('data_dia, fechado_em').eq('fechado_por', 'Sistema').in('data_dia', diasComRegistroFinanceiro);
      fechamentosPorDia = Object.fromEntries((fechamentos ?? []).map(f => [f.data_dia, f.fechado_em]));
    }

    const comAviso = pendencias.map(p => {
      const tipo = (p.classificacao as { tipo?: string } | null)?.tipo;
      const fechadoEm = fechamentosPorDia[p.data_dia];
      const fechamentoDesatualizado = !!(
        p.status === 'classificado' && !p.recalculo_aplicado_em && tipo && ['entrada', 'saida'].includes(tipo)
        && fechadoEm && p.classificado_em && new Date(p.classificado_em) > new Date(fechadoEm)
      );
      return { ...p, fechamentoDesatualizado };
    });

    return NextResponse.json({ pendencias: comAviso });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar pendências de conciliação' }, { status: 500 });
  }
}

// Demanda 229 — classifica 1 pendência. `acao` decide o que acontece:
// - 'entrada'/'saida'/'transferencia': cria o registro real correspondente
//   (reaproveitando os mesmos mecanismos já existentes, extraídos pra
//   lib/supabase-admin.ts na própria 229) e marca a pendência como
//   'classificado', com o vínculo (`pendencia_id` na entrada avulsa; a
//   pendência guarda o id do registro criado em `classificacao`).
// - 'sabido': marca 'classificado' sem criar nenhum registro financeiro —
//   `classificacao` guarda só o motivo.
// - 'ignorar': marca 'ignorado', sem registro nenhum.
// Nunca vincula/classifica automaticamente — sempre uma ação explícita do
// Admin, sempre com `operador` gravado.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, acao, operador } = body;
    if (!id || !acao) return NextResponse.json({ error: 'id e acao são obrigatórios' }, { status: 400 });

    const { data: pendencia } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
      .select('*').eq('id', id).maybeSingle();
    if (!pendencia) return NextResponse.json({ error: 'Pendência não encontrada' }, { status: 404 });
    if (pendencia.status !== 'pendente') {
      return NextResponse.json({ error: `Esta pendência já está "${pendencia.status}"` }, { status: 400 });
    }

    const agora = new Date().toISOString();
    let classificacao: Record<string, unknown>;

    if (acao === 'ignorar') {
      const { error } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias').update({
        status: 'ignorado', classificado_por: operador || 'Sistema', classificado_em: agora,
      }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (acao === 'sabido') {
      const { motivo } = body;
      if (!motivo || !String(motivo).trim()) {
        return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 });
      }
      classificacao = { tipo: 'sabido', motivo: String(motivo).trim() };
    } else if (acao === 'entrada') {
      const { valor, descricao } = body;
      const entrada = await criarEntradaAvulsa({
        contaDestino: pendencia.conta, valor: Number(valor), descricao, operador,
        dataDia: pendencia.data_dia, pendenciaId: pendencia.id,
      });
      classificacao = { tipo: 'entrada', entradaAvulsaId: entrada.id };
    } else if (acao === 'saida') {
      const { categoriaId, valor, descricao } = body;
      if (!categoriaId) return NextResponse.json({ error: 'categoriaId é obrigatório' }, { status: 400 });
      const saida = await criarSaida({
        categoriaId, valor: Number(valor), descricao, operador,
        contaOrigem: pendencia.conta, dataDia: pendencia.data_dia,
      });
      classificacao = { tipo: 'saida', ...saida };
    } else if (acao === 'transferencia') {
      // O sinal do valor da pendência decide a direção: positivo = dinheiro
      // CHEGOU nessa conta (ela é destino, escolhe de onde veio); negativo =
      // dinheiro SAIU (ela é origem, escolhe pra onde foi).
      const { contaContraparte, descricao } = body;
      if (!contaContraparte || !CONTAS_VALIDAS.includes(contaContraparte)) {
        return NextResponse.json({ error: 'Conta contraparte inválida' }, { status: 400 });
      }
      const valorAbs = Math.abs(Number(pendencia.valor));
      const ehEntrada = Number(pendencia.valor) >= 0;
      const transferencia = await criarTransferencia({
        contaOrigem:  ehEntrada ? contaContraparte : pendencia.conta,
        contaDestino: ehEntrada ? pendencia.conta : contaContraparte,
        valor: valorAbs, descricao, operador, dataDia: pendencia.data_dia,
      });
      classificacao = { tipo: 'transferencia', transferenciaId: transferencia.id };
    } else {
      return NextResponse.json({ error: 'acao inválida' }, { status: 400 });
    }

    const { error: erroClassificar } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias').update({
      status: 'classificado', classificacao, classificado_por: operador || 'Sistema', classificado_em: agora,
    }).eq('id', id);
    if (erroClassificar) throw erroClassificar;

    return NextResponse.json({ success: true, classificacao });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao classificar pendência';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
