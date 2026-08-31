export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const MARCAS_DIACRITICAS = new RegExp('[̀-ͯ]', 'g');

function gerarSlug(nome: string): string {
  return nome
    .normalize('NFD').replace(MARCAS_DIACRITICAS, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'categoria';
}

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === 'true';

  let query = supabaseAdmin.from('jsgrafica_categorias_saida').select('id, nome, ativo').order('nome');
  if (!all) query = query.eq('ativo', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  return NextResponse.json({ categorias: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { nome } = await req.json();
  if (!nome || !nome.trim()) {
    return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });
  }

  const base = gerarSlug(nome);
  let id = base;
  for (let i = 2; i <= 50; i++) {
    const { data: existente } = await supabaseAdmin.from('jsgrafica_categorias_saida').select('id').eq('id', id).maybeSingle();
    if (!existente) break;
    id = `${base}_${i}`;
  }

  const { data, error } = await supabaseAdmin.from('jsgrafica_categorias_saida')
    .insert({ id, nome: nome.trim(), ativo: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  return NextResponse.json({ categoria: data });
}

export async function PATCH(req: NextRequest) {
  const { id, ...campos } = await req.json();
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { error } = await supabaseAdmin.from('jsgrafica_categorias_saida')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  return NextResponse.json({ success: true });
}
