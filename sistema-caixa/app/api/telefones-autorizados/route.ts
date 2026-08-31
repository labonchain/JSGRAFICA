export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Demanda 275 — painel simples no Admin pra controlar
// `jsgrafica_telefones_autorizados` (lista de números que o agente de
// atendimento pode responder, demanda 274) sem precisar de SQL direto.
// Mesma régua de acesso das outras telas sensíveis: sem checagem de auth
// nesta rota (igual todo o resto do app, service_role já é o limite real —
// RLS trava a tabela pra `anon`/`authenticated`), gate de Admin é só no
// front (`soAdmin`), consistente com o padrão já usado em todo o projeto.
export async function GET() {
  try {
    const { data: telefones, error } = await supabaseAdmin
      .from('jsgrafica_telefones_autorizados')
      .select('id, telefone, ativo, descricao, created_at, updated_at')
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Nome do contato quando existir vínculo — só pra ficar legível
    // ("5521965185667 (Edvam)" em vez do número cru), não é join no banco
    // porque `jsgrafica_contatos.phone` não tem FK formal com essa tabela.
    const numeros = (telefones ?? []).map(t => t.telefone);
    let nomesPorTelefone: Record<string, string> = {};
    if (numeros.length > 0) {
      const { data: contatos } = await supabaseAdmin
        .from('jsgrafica_contatos')
        .select('phone, lead_name')
        .in('phone', numeros);
      nomesPorTelefone = Object.fromEntries(
        (contatos ?? []).filter(c => c.lead_name).map(c => [c.phone, c.lead_name as string])
      );
    }

    const comNome = (telefones ?? []).map(t => ({ ...t, nomeContato: nomesPorTelefone[t.telefone] ?? null }));
    return NextResponse.json({ telefones: comNome });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar telefones autorizados' }, { status: 500 });
  }
}

// Adiciona um telefone novo — sempre nasce `ativo=true` (demanda 275).
export async function POST(req: NextRequest) {
  try {
    const { telefone, descricao } = await req.json();
    const limpo = String(telefone || '').replace(/\D/g, '');
    if (!limpo) return NextResponse.json({ error: 'Informe um telefone válido (só números)' }, { status: 400 });

    const { data: existente } = await supabaseAdmin
      .from('jsgrafica_telefones_autorizados')
      .select('id, ativo')
      .eq('telefone', limpo)
      .maybeSingle();
    if (existente) {
      return NextResponse.json({
        error: existente.ativo
          ? 'Esse telefone já está na lista e ativo'
          : 'Esse telefone já está na lista, mas inativo — ative pelo toggle em vez de adicionar de novo',
      }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('jsgrafica_telefones_autorizados')
      .insert({ telefone: limpo, ativo: true, descricao: descricao || null })
      .select('id, telefone, ativo, descricao, created_at, updated_at')
      .single();
    if (error) throw error;

    return NextResponse.json({ telefone: { ...data, nomeContato: null } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao adicionar telefone' }, { status: 500 });
  }
}

// Alterna ativo/inativo — nunca exclui (soft-delete, mesmo padrão do resto
// do sistema, demanda 275 explícita sobre isso).
export async function PATCH(req: NextRequest) {
  try {
    const { id, ativo } = await req.json();
    if (!id || typeof ativo !== 'boolean') {
      return NextResponse.json({ error: 'id e ativo (boolean) são obrigatórios' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('jsgrafica_telefones_autorizados')
      .update({ ativo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, telefone, ativo, descricao, created_at, updated_at')
      .single();
    if (error || !data) return NextResponse.json({ error: 'Telefone não encontrado' }, { status: 404 });

    return NextResponse.json({ telefone: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar telefone' }, { status: 500 });
  }
}
