export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { formatarDiaCaixa } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const dataDia = formatarDiaCaixa();

    const { data, error } = await supabaseAdmin
      .from('jsgrafica_vendas')
      .select('produto_nome, quantidade, total')
      .eq('data_dia', dataDia)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const agrupado = new Map<string, { produto: string; quantidade: number; valor: number }>();
    for (const v of data ?? []) {
      const key = v.produto_nome;
      const atual = agrupado.get(key) ?? { produto: key, quantidade: 0, valor: 0 };
      atual.quantidade += Number(v.quantidade);
      atual.valor      += Number(v.total);
      agrupado.set(key, atual);
    }

    const totalEntradas = [...agrupado.values()].reduce((acc, v) => acc + v.valor, 0);

    return NextResponse.json({
      nomeAba: dataDia,
      vendas: [...agrupado.values()],
      totalEntradas,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { produtoId, quantidade, valorAvulso, descricaoAvulso, operador, phone } = await req.json();
    const dataDia = formatarDiaCaixa();

    if (valorAvulso !== undefined) {
      const { error } = await supabaseAdmin.from('jsgrafica_vendas').insert({
        data_dia:     dataDia,
        operador:     operador || 'Sistema',
        produto_nome: descricaoAvulso || 'Entrada diversa',
        quantidade:   1,
        valor_unit:   valorAvulso,
        total:        valorAvulso,
        descricao:    descricaoAvulso,
        phone:        phone || null,
      });
      if (error) throw error;
    } else {
      const { data: produto, error: errProd } = await supabaseAdmin
        .from('jsgrafica_produtos')
        .select('id, nome, preco, controla_estoque, estoque_atual')
        .eq('id', produtoId)
        .single();

      if (errProd || !produto) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 });
      }

      const { error } = await supabaseAdmin.from('jsgrafica_vendas').insert({
        data_dia:     dataDia,
        operador:     operador || 'Sistema',
        produto_id:   produto.id,
        produto_nome: produto.nome,
        quantidade,
        valor_unit:   produto.preco,
        total:        quantidade * produto.preco,
        phone:        phone || null,
      });
      if (error) throw error;

      if (produto.controla_estoque && produto.estoque_atual != null) {
        const novoEstoque = Math.max(0, Number(produto.estoque_atual) - Number(quantidade));
        await supabaseAdmin
          .from('jsgrafica_produtos')
          .update({ estoque_atual: novoEstoque, updated_at: new Date().toISOString() })
          .eq('id', produto.id);
      }
    }

    return NextResponse.json({ success: true, nomeAba: dataDia });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao registrar venda' }, { status: 500 });
  }
}
