export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { enviarMensagem } from '@/lib/zapi';
import { registrarMensagemEnviada } from '@/lib/inboxLog';
import { limparRascunhoPedido, supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const { phone, message, operador } = await req.json();
  if (!phone || !message) {
    return NextResponse.json({ error: 'phone e message obrigatórios' }, { status: 400 });
  }

  try {
    // Demanda 126: endereça pelo contact_lid quando existir — é o que a Meta
    // usa de verdade pra identificar a conversa quando o recurso de
    // privacidade "LID" está ativo (ver pm/conhecimento/mapa-dados-contato.md).
    // `phone` continua sendo a chave de exibição/CRM/log abaixo — só a
    // chamada ao Z-API muda de destinatário. `.limit(1)` + filtro por
    // contact_lid não-nulo em vez de `.single()`: telefone pode ter mais de
    // uma linha (contact_lid instável, demanda 008/029/053) — pega qualquer
    // uma que já tenha o lid, não quebra se a primeira encontrada não tiver.
    const { data: contatoRows } = await supabaseAdmin
      .from('jsgrafica_contatos')
      .select('contact_lid')
      .eq('phone', phone)
      .not('contact_lid', 'is', null)
      .limit(1);
    const destinatarioZapi = contatoRows?.[0]?.contact_lid || phone;

    const resultado = await enviarMensagem(destinatarioZapi, message);
    // messageId/id é o ID real da mensagem no WhatsApp — é esse que o webhook
    // do n8n usa como message_id ao logar o envio automaticamente. zaapId é
    // só o ID interno de rastreio do Z-API, sempre presente mas nunca bate
    // com o que o webhook grava — usá-lo primeiro gerava 2 linhas pra mesma
    // mensagem sempre (demanda 070, message_id é chave primária da tabela).
    const msgId = resultado?.messageId || resultado?.id || resultado?.zaapId || `sent-${Date.now()}`;

    await registrarMensagemEnviada(phone, message, msgId, operador);

    // Demanda 073: qualquer envio pela caixa de resposta limpa o(s)
    // rascunho(s) de pedido pendente(s) desse contato — a equipe já revisou
    // (e possivelmente editou) o texto, o rascunho cumpriu seu papel
    // independente de o texto enviado bater exatamente com o rascunho.
    await limparRascunhoPedido(phone);

    return NextResponse.json({ success: true, zapiResponse: resultado });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao enviar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
