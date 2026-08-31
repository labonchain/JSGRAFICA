export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { buscarRascunhoPedido } from '@/lib/supabase-admin';

// Demanda 073: rascunho(s) de mensagem de pedido pendente(s) pra um
// telefone — TelaInbox.tsx consulta isso ao abrir a conversa pra
// pré-preencher a caixa de resposta (mesmo padrão da sugestão de IA, 048).
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

  try {
    const rascunho = await buscarRascunhoPedido(phone);
    return NextResponse.json({ rascunho });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar rascunho' }, { status: 500 });
  }
}
