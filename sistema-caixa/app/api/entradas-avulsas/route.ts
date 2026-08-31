export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { criarEntradaAvulsa, supabaseAdmin } from '@/lib/supabase-admin';
import { CONTAS_ORIGEM } from '@/lib/dados';

// Demanda 269 — lançamento manual de entrada avulsa direto (botão
// "+ Adicionar entrada" em Entradas), sem passar por pendência de
// conciliação. Reaproveita `criarEntradaAvulsa` (lib/supabase-admin.ts,
// mesma função já usada por `app/api/conciliacao/pendencias/route.ts` na
// ação 'entrada') — `pendenciaId` fica `null` por não vir de nenhuma
// pendência, exatamente o caso que a função já previa desde a criação.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contaDestino, valor, descricao, operador, dataDia } = body;
    if (!contaDestino) return NextResponse.json({ error: 'contaDestino é obrigatório' }, { status: 400 });
    if (!valor || Number(valor) <= 0) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });

    const entrada = await criarEntradaAvulsa({
      contaDestino, valor: Number(valor), descricao, operador, dataDia,
    });

    return NextResponse.json({ success: true, id: entrada.id });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao adicionar entrada';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// Demanda 271 — editar uma entrada avulsa já lançada (valor/conta destino/
// descrição/data). Mesmo espírito da 130 (saídas): o Admin manda o valor
// final que quer, sem recomputar nada; grava rastro `editado_em`/
// `editado_por` (colunas novas, mesmo padrão de `jsgrafica_saidas`).
// Explicitamente sem bloqueio por `pendencia_id` (diferente da saída
// vinculada a transferência, 232/233) — decisão do próprio escopo da 271:
// mexer numa entrada avulsa nascida de pendência classificada é um caso
// separado, não travado nem destravado aqui.
export async function PATCH(req: NextRequest) {
  try {
    const { id, valor, contaDestino, descricao, dataDia, operador } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const update: Record<string, unknown> = {
      editado_em:  new Date().toISOString(),
      editado_por: operador || 'Sistema',
    };

    if (valor !== undefined) {
      const v = Number(valor);
      if (!v || v <= 0) return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
      update.valor = v;
    }
    if (contaDestino !== undefined) {
      const contasValidas = CONTAS_ORIGEM.map(c => c.id) as string[];
      if (!contasValidas.includes(contaDestino)) return NextResponse.json({ error: 'Conta de destino inválida' }, { status: 400 });
      update.conta_destino = contaDestino;
    }
    if (descricao !== undefined) update.descricao = descricao || null;
    if (dataDia !== undefined) {
      if (!/^\d{2}-\d{2}-\d{2}$/.test(dataDia)) {
        return NextResponse.json({ error: 'Data inválida (use DD-MM-AA)' }, { status: 400 });
      }
      update.data_dia = dataDia;
    }

    const { data: entrada, error } = await supabaseAdmin
      .from('jsgrafica_entradas_avulsas')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error || !entrada) return NextResponse.json({ error: 'Entrada avulsa não encontrada' }, { status: 404 });

    return NextResponse.json({ success: true, entrada });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao editar entrada' }, { status: 500 });
  }
}

// Demanda 271 — cancelar uma entrada avulsa já lançada. Mesma decisão da 130
// (DELETE real, não flag `cancelado`) — todas as agregações que somam
// `jsgrafica_entradas_avulsas` (só o `GET /api/entradas` até agora, 269) não
// têm nenhum conceito de status; apagar de verdade evita ter que ensinar
// cada leitor futuro a filtrar por uma flag.
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    const { data: entrada } = await supabaseAdmin
      .from('jsgrafica_entradas_avulsas')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (!entrada) return NextResponse.json({ error: 'Entrada avulsa não encontrada' }, { status: 404 });

    const { error } = await supabaseAdmin
      .from('jsgrafica_entradas_avulsas')
      .delete()
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao cancelar entrada' }, { status: 500 });
  }
}
