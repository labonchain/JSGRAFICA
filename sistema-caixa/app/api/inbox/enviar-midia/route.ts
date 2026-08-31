export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enviarImagem, enviarDocumento, enviarVideo } from '@/lib/zapi';

// Demanda 093: o arquivo em si não passa mais por aqui — o navegador já
// subiu direto pro Supabase Storage via signed URL (rota /api/inbox/
// upload-url) antes de chamar esta rota. Aqui só chega o `path` resultante
// (payload pequeno, só texto), evitando o limite de ~4,5MB de payload de
// função serverless da Vercel (arquivo de 8MB, tamanho normal de foto de
// celular, sempre falhava com 413 FUNCTION_PAYLOAD_TOO_LARGE). A lógica de
// mandar pro Z-API e logar continua igual — só mudou quem faz o upload.
export async function POST(req: NextRequest) {
  const { phone, caption, path, fileName, contentType } = await req.json();

  if (!phone || !path) {
    return NextResponse.json({ error: 'phone e path obrigatórios' }, { status: 400 });
  }

  try {
    // Demanda 126: mesmo raciocínio de app/api/inbox/responder/route.ts —
    // endereça pelo contact_lid quando existir, `phone` continua sendo a
    // chave de exibição/CRM/log abaixo.
    const { data: contatoRows } = await supabaseAdmin
      .from('jsgrafica_contatos')
      .select('contact_lid')
      .eq('phone', phone)
      .not('contact_lid', 'is', null)
      .limit(1);
    const destinatarioZapi = contatoRows?.[0]?.contact_lid || phone;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('inbox-media')
      .getPublicUrl(path);

    const tipo = (contentType || '').startsWith('image/') ? 'image'
               : (contentType || '').startsWith('video/') ? 'video'
               : 'document';

    let resultado;
    if (tipo === 'image')      resultado = await enviarImagem(destinatarioZapi, publicUrl, caption || '');
    else if (tipo === 'video') resultado = await enviarVideo(destinatarioZapi, publicUrl, caption || '');
    else                       resultado = await enviarDocumento(destinatarioZapi, publicUrl, fileName || 'arquivo', caption || '');

    // messageId/id é o ID real da mensagem no WhatsApp — é esse que o webhook
    // do n8n usa como message_id ao logar o envio automaticamente. zaapId é
    // só o ID interno de rastreio do Z-API, sempre presente mas nunca bate
    // com o que o webhook grava — usá-lo primeiro gerava 2 linhas pra mesma
    // mensagem sempre (demanda 070, message_id é chave primária da tabela).
    const msgId = resultado?.messageId || resultado?.id || resultado?.zaapId || `sent-${Date.now()}`;
    const agora = new Date().toISOString();

    await supabaseAdmin.from('jsgrafica_log_msgs_privadas').insert({
      phone, message_id: msgId, from_me: true,
      message_text: caption || null,
      media_type: tipo, media_url: publicUrl,
      sent_at: agora, data_timestamp: Date.now(),
      from_api: true, status: 'sent',
      // Demanda 294: envio de mídia só acontece pela equipe, pelo Inbox.
      enviado_por: 'equipe',
    });

    await supabaseAdmin.from('jsgrafica_contatos')
      .update({ data_ultimo_contato: agora })
      .eq('phone', phone);

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro' }, { status: 500 });
  }
}
