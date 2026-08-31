export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get('mes'); // MM-AA

    let query = supabaseAdmin
      .from('jsgrafica_vendas')
      .select('data_dia, created_at, operador, produto_nome, quantidade, valor_unit, total')
      .order('created_at', { ascending: false });

    if (mes) {
      // MM-AA → filtra data_dia que começam com DD-MM-AA onde MM e AA batem
      const [mm, aa] = mes.split('-');
      query = query.like('data_dia', `%-${mm}-${aa}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const linhas = (data ?? []).map(r => ({
      data:      r.data_dia.split('-').join('/'),
      hora:      new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      operador:  r.operador,
      produto:   r.produto_nome,
      quantidade: Number(r.quantidade),
      valorUnit:  Number(r.valor_unit),
      total:      Number(r.total),
    }));

    return NextResponse.json({ linhas, total: linhas.length });
  } catch (error) {
    console.error('[LOG GET]', error);
    return NextResponse.json({ error: 'Erro ao ler log' }, { status: 500 });
  }
}
