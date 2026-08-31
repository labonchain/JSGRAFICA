export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { transcreverAudioGemini } from '@/lib/gemini';

// Transcrição sob demanda de um áudio já logado (demanda 059) — complementa
// o pipeline automático do n8n, que às vezes falha (transcription_text
// vazio, "[áudio sem transcrição]"). Nunca dispara sozinho, só por clique
// explícito do atendente na thread.
export async function POST(req: NextRequest) {
  try {
    const { messageId } = await req.json();
    if (!messageId) return NextResponse.json({ error: 'messageId obrigatório' }, { status: 400 });

    const { data: mensagem, error: buscaErro } = await supabaseAdmin
      .from('jsgrafica_log_msgs_privadas')
      .select('media_type, media_url')
      .eq('message_id', messageId)
      .maybeSingle();

    if (buscaErro) throw buscaErro;
    if (!mensagem) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    if (mensagem.media_type !== 'audio') {
      return NextResponse.json({ error: 'Essa mensagem não é um áudio' }, { status: 400 });
    }
    if (!mensagem.media_url) {
      return NextResponse.json({ error: 'Áudio sem link de mídia salvo' }, { status: 422 });
    }

    const transcricao = await transcreverAudioGemini(mensagem.media_url);

    const { error: updateErro } = await supabaseAdmin
      .from('jsgrafica_log_msgs_privadas')
      .update({ transcription_text: transcricao })
      .eq('message_id', messageId);
    if (updateErro) throw updateErro;

    return NextResponse.json({ transcricao });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : 'Erro ao transcrever áudio';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
