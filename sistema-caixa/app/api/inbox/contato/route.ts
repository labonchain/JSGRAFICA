export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Edita o nome do contato manualmente (demanda 082) — usado quando o WhatsApp
// nunca manda nome real (recurso de privacidade "LID") e a equipe já conhece
// a pessoa. Sobrescreve `lead_name`, que o n8n (demanda 081) já trata como
// "nome válido" e nunca apaga sozinho.
export async function PATCH(req: NextRequest) {
  const { phone, nome } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

  const nomeLimpo = typeof nome === 'string' ? nome.trim() : '';
  if (!nomeLimpo) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .update({ lead_name: nomeLimpo })
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, nome: nomeLimpo });
}
