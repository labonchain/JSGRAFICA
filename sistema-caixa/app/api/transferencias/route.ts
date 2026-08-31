export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa } from '@/lib/supabase';
import { supabaseAdmin, criarTransferencia } from '@/lib/supabase-admin';

// Demanda 201 — GET: transferências já lançadas no dia (histórico visível,
// mesmo padrão de "Lançamentos" da aba Saídas). Demanda 218: não expõe mais
// "pendências" — a tela/conceito de pendência entre contas saiu do ar (a
// premissa não batia com a operação real; ver relato da 218).
export async function GET(req: NextRequest) {
  try {
    const dataParam = req.nextUrl.searchParams.get('data');
    if (dataParam && !/^\d{2}-\d{2}-\d{2}$/.test(dataParam)) {
      return NextResponse.json({ error: 'Data inválida (use DD-MM-AA)' }, { status: 400 });
    }
    const dataDia = dataParam || formatarDiaCaixa();

    const { data: transferencias, error } = await supabaseAdmin
      .from('jsgrafica_transferencias')
      .select('id, data_dia, conta_origem, conta_destino, valor, descricao, operador, created_at')
      .eq('data_dia', dataDia)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ nomeAba: dataDia, transferencias: transferencias ?? [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar transferências' }, { status: 500 });
  }
}

// Demanda 201 — cria a transferência: 1 saída em `jsgrafica_saidas`
// (categoria "Transferência entre contas", `conta_origem` = a conta
// escolhida — reaproveita TODA a agregação/exibição que já existe pra
// saídas, incluindo o desconto correto de `getTotalSaidasOperador`, 200) +
// 1 linha em `jsgrafica_transferencias` que registra os 2 lados (De/Para) e
// linka a saída gerada — não é possível existir um lado sem o outro porque
// nascem na mesma transação de escrita.
export async function POST(req: NextRequest) {
  try {
    const { contaOrigem, contaDestino, valor, descricao, dataDia, operador } = await req.json();
    if (dataDia !== undefined && dataDia !== null && !/^\d{2}-\d{2}-\d{2}$/.test(dataDia)) {
      return NextResponse.json({ error: 'Data inválida (use DD-MM-AA)' }, { status: 400 });
    }
    // Demanda 229: lógica de criação extraída pra `criarTransferencia`
    // (lib/supabase-admin.ts) — reaproveitada pela classificação de
    // pendência de conciliação (mesmo mecanismo: 1 saída + 1 linha em
    // jsgrafica_transferencias, nascem juntas). `pendencia_saida_id` fica
    // null aqui, como sempre (218).
    const transferencia = await criarTransferencia({ contaOrigem, contaDestino, valor: Number(valor), descricao, operador, dataDia });
    return NextResponse.json({ success: true, transferencia });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao lançar transferência';
    const status = ['Conta de origem/destino inválida', 'Origem e destino não podem ser a mesma conta', 'Valor inválido'].includes(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// Demanda 201: cancela os 2 lados juntos — nunca dá pra apagar só a
// transferência sem a saída (ou vice-versa) por essa rota; a saída
// vinculada é removida sempre, mesmo padrão de "nunca deixar órfão" do
// `saida_vinculada_id` (104/DELETE de jsgrafica_pedidos).
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const { data: transferencia } = await supabaseAdmin
      .from('jsgrafica_transferencias')
      .select('id, saida_id')
      .eq('id', id)
      .maybeSingle();
    if (!transferencia) return NextResponse.json({ error: 'Transferência não encontrada' }, { status: 404 });

    const { error: erroDelTransf } = await supabaseAdmin
      .from('jsgrafica_transferencias')
      .delete()
      .eq('id', id);
    if (erroDelTransf) throw erroDelTransf;

    const { error: erroDelSaida } = await supabaseAdmin
      .from('jsgrafica_saidas')
      .delete()
      .eq('id', transferencia.saida_id);
    if (erroDelSaida) throw erroDelSaida;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao cancelar transferência' }, { status: 500 });
  }
}
