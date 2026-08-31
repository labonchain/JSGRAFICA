export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Arquiva/desarquiva um contato — ele deixa de (ou volta a) aparecer na lista
// padrão do Inbox. Ver demanda 018.
export async function PATCH(req: NextRequest) {
  const { phone, arquivado } = await req.json();
  if (!phone || typeof arquivado !== 'boolean') {
    return NextResponse.json({ error: 'phone e arquivado (boolean) obrigatórios' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .update({ arquivado })
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
