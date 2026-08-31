export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calcularValorPedido } from '@/lib/pedidos';
import { CATEGORIA_PARA_GRUPO } from '@/lib/dados';

// Preview de valor pro fluxo "Criar pedido" do Inbox (demanda 045) — mesma
// função de cálculo usada na gravação final em POST /api/pedidos, pra não
// duplicar a regra de desconto por volume.
export async function POST(req: NextRequest) {
  try {
    const { produtoId, quantidade } = await req.json();
    if (!produtoId || !quantidade) {
      return NextResponse.json({ error: 'produtoId e quantidade são obrigatórios' }, { status: 400 });
    }

    const { data: produto } = await supabaseAdmin
      .from('jsgrafica_produtos')
      .select('id, nome, categoria, preco')
      .eq('id', produtoId)
      .eq('ativo', true)
      .single();

    if (!produto) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }
    if (produto.preco == null) {
      return NextResponse.json({ error: 'Produto requer orçamento manual — sem preço de tabela', requerOrcamento: true }, { status: 422 });
    }

    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
    }

    const grupo = CATEGORIA_PARA_GRUPO[produto.categoria] || produto.categoria;
    const calculo = calcularValorPedido(Number(produto.preco), qtd, grupo);

    return NextResponse.json({
      produto: { id: produto.id, nome: produto.nome, categoria: produto.categoria },
      calculo,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao calcular valor' }, { status: 500 });
  }
}
