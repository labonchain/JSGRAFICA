export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { apagarMensagem } from '@/lib/zapi';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Demanda 191: apagar (pra todos) uma mensagem ENVIADA pelo Inbox.
// Regras de segurança:
// - Só mensagem que existe no log E é `from_me` — nunca apaga mensagem do
//   cliente (a Z-API até permite, mas ficou explicitamente fora de escopo).
// - A Z-API é chamada ANTES de marcar o log: se ela recusar (mensagem fora
//   da janela de "apagar pra todos" do WhatsApp), nada muda no banco e o
//   atendente recebe um erro claro.
// - A linha do log nunca é deletada — ganha `apagada_em`/`apagada_por` e a
//   tela mostra "🚫 apagada" (histórico preservado; é o que aconteceu de
//   verdade no WhatsApp).
export async function POST(req: NextRequest) {
  const { phone, messageId, operador } = await req.json();
  if (!phone || !messageId) {
    return NextResponse.json({ error: 'phone e messageId obrigatórios' }, { status: 400 });
  }

  // A mensagem pode ter sido logada com `phone` no formato @lid (demanda
  // 038) — busca só por message_id (é a PK da tabela) e valida o resto.
  const { data: msg, error: erroBusca } = await supabaseAdmin
    .from('jsgrafica_log_msgs_privadas')
    .select('message_id, phone, from_me, apagada_em')
    .eq('message_id', messageId)
    .maybeSingle();
  if (erroBusca) return NextResponse.json({ error: erroBusca.message }, { status: 500 });
  if (!msg) return NextResponse.json({ error: 'Mensagem não encontrada no log' }, { status: 404 });
  if (!msg.from_me) {
    return NextResponse.json({ error: 'Só dá pra apagar mensagens enviadas pela equipe' }, { status: 400 });
  }
  if (msg.apagada_em) {
    return NextResponse.json({ error: 'Essa mensagem já foi apagada' }, { status: 400 });
  }

  try {
    // O destinatário na Z-API é o telefone da CONVERSA (o front manda o
    // phone da conversa aberta — pro caso de o log ter registrado @lid).
    await apagarMensagem(phone, messageId);
  } catch (e) {
    console.error('[191] Z-API recusou apagar mensagem', e);
    // A janela de "apagar pra todos" do WhatsApp é limitada — mensagem
    // antiga demais volta erro; o atendente recebe o motivo em português.
    return NextResponse.json(
      { error: 'O WhatsApp não deixou apagar — provavelmente a mensagem é antiga demais pra "apagar pra todos".' },
      { status: 502 },
    );
  }

  const { error: erroMarca } = await supabaseAdmin
    .from('jsgrafica_log_msgs_privadas')
    .update({ apagada_em: new Date().toISOString(), apagada_por: operador || null })
    .eq('message_id', messageId);
  // Já apagou no WhatsApp — falha ao marcar o log não desfaz nada, só loga.
  if (erroMarca) console.error('[191] Mensagem apagada na Z-API mas falhou ao marcar o log', erroMarca);

  return NextResponse.json({ success: true });
}
