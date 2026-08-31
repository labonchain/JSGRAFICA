// Monta o contexto de uma conversa (últimas mensagens + pedido vinculado, se
// existir) pra alimentar os prompts da demanda 048 — busca no servidor em
// vez de confiar no transcript que o cliente manda, mais seguro e mais leve.

import { supabaseAdmin } from './supabase-admin';

const QTD_MENSAGENS_CONTEXTO = 15;

interface MensagemLog {
  from_me: boolean;
  message_text: string | null;
  caption: string | null;
  transcription_text: string | null;
  media_type: string | null;
  data_timestamp: number;
}

export async function buscarContextoConversa(phone: string) {
  const { data: mensagens } = await supabaseAdmin
    .from('jsgrafica_log_msgs_privadas')
    .select('from_me, message_text, caption, transcription_text, media_type, data_timestamp')
    .eq('phone', phone)
    .order('data_timestamp', { ascending: false, nullsFirst: false })
    .limit(QTD_MENSAGENS_CONTEXTO);

  const ordenadas = (mensagens ?? []).slice().reverse() as MensagemLog[];

  const linhas = ordenadas.map(m => {
    const texto = m.message_text || m.transcription_text || m.caption
      || (m.media_type ? `[${m.media_type}]` : '[mensagem sem texto]');
    return `${m.from_me ? '[nós]' : '[cliente]'} ${texto}`;
  });

  const { data: pedido } = await supabaseAdmin
    .from('jsgrafica_pedidos')
    .select('servico_nome, quantidade, valor_final, status')
    .eq('telefone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { linhasConversa: linhas, pedido };
}
