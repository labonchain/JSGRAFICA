export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('jsgrafica_contas_bancarias')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ contas: data ?? [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar contas bancárias' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { nome, taxaCartaoPct, taxaPixPct } = await req.json();
    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('jsgrafica_contas_bancarias')
      .insert({
        nome,
        taxa_cartao_pct: Number(taxaCartaoPct) || 0,
        taxa_pix_pct:    Number(taxaPixPct) || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ conta: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar conta bancária' }, { status: 500 });
  }
}

// Demanda 077: só 1 conta pode ser "padrão" por forma de pagamento (cartão/Pix)
// — ao marcar uma como padrão, desmarca as outras da mesma forma antes,
// pra nunca ficar com 2 contas padrão ao mesmo tempo (ambiguidade no cálculo
// de taxa do fechamento).
export async function PATCH(req: NextRequest) {
  try {
    const { id, nome, taxaCartaoPct, taxaPixPct, ativo, padraoCartao, padraoPix } = await req.json();
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });

    if (padraoCartao === true) {
      await supabaseAdmin.from('jsgrafica_contas_bancarias').update({ padrao_cartao: false }).neq('id', id);
    }
    if (padraoPix === true) {
      await supabaseAdmin.from('jsgrafica_contas_bancarias').update({ padrao_pix: false }).neq('id', id);
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (nome !== undefined)          update.nome = nome;
    if (taxaCartaoPct !== undefined) update.taxa_cartao_pct = Number(taxaCartaoPct) || 0;
    if (taxaPixPct !== undefined)    update.taxa_pix_pct = Number(taxaPixPct) || 0;
    if (ativo !== undefined)         update.ativo = ativo;
    if (padraoCartao !== undefined)  update.padrao_cartao = padraoCartao;
    if (padraoPix !== undefined)     update.padrao_pix = padraoPix;

    const { data, error } = await supabaseAdmin
      .from('jsgrafica_contas_bancarias')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ conta: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar conta bancária' }, { status: 500 });
  }
}
