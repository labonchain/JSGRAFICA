export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Demanda 325: contagem de conversas escaladas (a IA tentou atender e
// desistiu, jsgrafica_contatos.status_atendimento='escalado') sem ninguém do
// Admin ter resolvido ainda, alimenta o banner persistente do shell do
// Admin (app/page.tsx). Só a contagem, não a lista: a lista já existe no
// Inbox (filtro "Escalado", demanda 321), o banner só leva pra lá.
//
// Conta por telefone ÚNICO, não por linha crua: o mesmo phone pode ter mais
// de uma linha em jsgrafica_contatos (contact_lid instável, demanda 008/029,
// mesmo dedup já aplicado em app/api/inbox/conversas/route.ts). Como o
// volume esperado aqui é sempre pequeno ("normalmente poucos", nota da
// demanda 321), busca só a coluna phone em vez de um count(*) agregado, mais
// simples que replicar a RPC de dedup só pra esta contagem.
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .select('phone')
    .eq('status_atendimento', 'escalado');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const count = new Set((data ?? []).map(r => r.phone)).size;
  return NextResponse.json({ count });
}
