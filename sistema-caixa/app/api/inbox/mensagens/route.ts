export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Demanda 282: o texto puro da mensagem não mostra que o cliente recebeu um
// botão ou uma lista de opção de verdade no WhatsApp — `raw_zapi` guarda o
// payload original enviado (Z-API ecoa de volta o que foi mandado), com
// `buttonsMessage`/`listMessage`. Extrai só o necessário pra exibir, não
// manda o raw completo (tem headers, foto do contato etc.) pro front.
type Interativo =
  | { tipo: 'botoes'; botoes: string[] }
  | { tipo: 'lista'; botaoTexto: string; opcoes: string[] };

function extrairInterativo(rawZapi: string | null): Interativo | null {
  if (!rawZapi) return null;
  try {
    const parsed = JSON.parse(rawZapi);
    if (parsed.buttonsMessage?.buttons?.length) {
      const botoes = parsed.buttonsMessage.buttons
        .map((b: any) => b?.buttonText?.displayText)
        .filter(Boolean);
      return botoes.length ? { tipo: 'botoes', botoes } : null;
    }
    if (parsed.listMessage?.sections?.length) {
      const opcoes = parsed.listMessage.sections.flatMap((s: any) =>
        (s.options ?? []).map((o: any) => o?.title).filter(Boolean)
      );
      return opcoes.length
        ? { tipo: 'lista', botaoTexto: parsed.listMessage.buttonText || 'Ver opções', opcoes }
        : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

  // Mensagens enviadas manualmente pela equipe às vezes chegam da Z-API com
  // `phone` no formato "@lid" (identificador de contato com número oculto,
  // ex. 123570571206890@lid) em vez do telefone normal — mesmo contato, outro
  // formato pro mesmo evento. Resolve o(s) contact_lid do contato pra também
  // buscar mensagens gravadas nesse formato (demanda 038).
  //
  // jsgrafica_contatos pode ter mais de uma linha pro mesmo telefone
  // (contact_lid instável, achado desde a demanda 008/029) — `.single()`
  // quebrava com erro nesse caso e o erro era descartado silenciosamente,
  // fazendo a busca cair pro comportamento anterior à 038 sem avisar
  // ninguém (achado real da demanda 053: mensagens de cliente de verdade
  // sumindo). Busca todas as linhas e junta todos os contact_lid não nulos
  // em vez de exigir uma única linha — não perde mensagem gravada sob
  // nenhuma das variantes duplicadas.
  const { data: contatosDoTelefone } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .select('contact_lid')
    .eq('phone', phone);

  const lids = Array.from(new Set(
    (contatosDoTelefone ?? []).map(c => c.contact_lid).filter((l): l is string => !!l)
  ));

  let query = supabaseAdmin
    .from('jsgrafica_log_msgs_privadas')
    .select(`
      message_id, from_me, message_text, media_type, media_url, caption,
      transcription_text, ptt, audio_duration, status, sent_at, data_timestamp,
      quoted_msg_id, quoted_msg_body, reaction_text, from_api, apagada_em, raw_zapi
    `);

  query = lids.length
    ? query.or([`phone.eq.${phone}`, ...lids.map(l => `contact_lid.eq.${l}`)].join(','))
    : query.eq('phone', phone);

  // Ordena decrescente pra pegar as 500 mais RECENTES antes de cortar — uma
  // conversa de teste com centenas de mensagens acumuladas (ex. número usado
  // em dezenas de demandas) passava de 500 linhas, e ordenar ascendente com
  // limit(500) pegava as 500 mais ANTIGAS, cortando fora as mensagens novas
  // de verdade (demanda 280). Reordenado pra ascendente de novo logo abaixo.
  const { data, error } = await query
    .order('data_timestamp', { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filtra bolhas vazias (sem conteúdo algum) e ordena usando sent_at como fallback
  const msgs = (data ?? [])
    .filter(m => m.message_text || m.media_type || m.reaction_text || m.from_me)
    .map(({ raw_zapi, ...resto }) => ({ ...resto, interativo: extrairInterativo(raw_zapi) }))
    .sort((a, b) => {
      const tsA = a.data_timestamp ?? (a.sent_at ? new Date(a.sent_at).getTime() : 0);
      const tsB = b.data_timestamp ?? (b.sent_at ? new Date(b.sent_at).getTime() : 0);
      return tsA - tsB;
    });

  // Zera não-lidas e marca leitura — cobre tanto o carregamento normal quanto
  // a chamada que o Inbox faz ao abrir a conversa (antes disso era uma
  // mutação direta via client-side, movida pra cá na demanda 024).
  await supabaseAdmin.from('jsgrafica_contatos')
    .update({ ultima_leitura_admin: new Date().toISOString(), mensagens_nao_lidas: 0 })
    .eq('phone', phone);

  return NextResponse.json({ mensagens: msgs });
}
