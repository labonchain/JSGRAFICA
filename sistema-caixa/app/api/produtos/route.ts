export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true';

  let query = supabaseAdmin
    .from('jsgrafica_produtos')
    .select('id, nome, preco, categoria, descricao, ativo, controla_estoque, estoque_atual')
    .order('categoria')
    .order('nome');

  if (!all) query = query.eq('ativo', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  return NextResponse.json({ produtos: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...campos } = body;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('jsgrafica_produtos')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, preco, categoria, descricao } = body;
  if (!nome || !categoria) {
    return NextResponse.json({ error: 'nome e categoria são obrigatórios' }, { status: 400 });
  }

  const { data: last } = await supabaseAdmin
    .from('jsgrafica_produtos')
    .select('id')
    .like('id', 'prod-%')
    .order('id', { ascending: false })
    .limit(1);

  const lastNum = last?.length ? parseInt(last[0].id.replace('prod-', ''), 10) : 0;
  const newId = `prod-${String(lastNum + 1).padStart(3, '0')}`;

  const { error } = await supabaseAdmin
    .from('jsgrafica_produtos')
    .insert({ id: newId, nome, preco: preco !== undefined && preco !== '' ? Number(preco) : null, categoria, descricao: descricao || null, ativo: true });

  if (error) return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 });
  return NextResponse.json({ success: true, id: newId });
}
