export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Zera o contador de não-lidas de um contato — usado pelo Inbox quando chega
// mensagem nova via Realtime enquanto a conversa já está aberta. Antes era
// uma mutação direta via client-side com a chave anônima (demanda 024).
export async function PATCH(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .update({ mensagens_nao_lidas: 0, ultima_leitura_admin: new Date().toISOString() })
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
