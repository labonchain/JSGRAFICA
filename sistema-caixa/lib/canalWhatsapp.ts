// Canal do WhatsApp, integração direta (demanda 354). Diferente do Status
// (que passa pelo webhook compartilhado do LabOnchain, lib/labonStatus.ts),
// o Canal fala direto com a Z-API (lib/zapi.ts) e guarda os posts numa
// tabela própria (`jsgrafica_canal_posts`), porque não existe fila
// compartilhada equivalente pra canal. Coluna `canal_whatsapp_id` em
// `jsgrafica_agent_config` e a tabela `jsgrafica_canal_posts` propostas ao
// 02-DADOS (não criadas por este chat, ver pm/demandas/354-*.md) — este
// arquivo assume que já existem.
//
// "Aprovar" publica NA HORA (chama a Z-API de verdade nesse instante). Não
// existe ainda um robô de disparo agendado (demanda pedida à parte ao
// 01-N8N, pedido do Edvam em 29/08, roda a cada 30min) — `scheduled_at`
// fica só como registro de planejamento até esse robô existir.

import { supabaseAdmin } from './supabase-admin';
import { enviarMensagem, enviarImagem, enviarVideo } from './zapi';

export type TipoCanalPost = 'text' | 'image' | 'video';
export type StatusCanalPost = 'pending' | 'approved' | 'published' | 'cancelled' | 'error';

export interface CanalPost {
  id: number;
  tipo: TipoCanalPost;
  texto: string | null;
  image_url: string | null;
  video_url: string | null;
  caption_image: string | null;
  caption_video: string | null;
  status: StatusCanalPost;
  scheduled_at: string;
  published_at: string | null;
  message_id: string | null;
  erro_detalhe: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanalPostInput {
  tipo: TipoCanalPost;
  texto?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  caption_image?: string | null;
  caption_video?: string | null;
  scheduled_at: string;
}

function camposPorTipo(input: CanalPostInput) {
  return {
    tipo: input.tipo,
    texto: input.tipo === 'text' ? (input.texto || null) : null,
    image_url: input.tipo === 'image' ? (input.image_url || null) : null,
    video_url: input.tipo === 'video' ? (input.video_url || null) : null,
    caption_image: input.tipo === 'image' ? (input.caption_image || null) : null,
    caption_video: input.tipo === 'video' ? (input.caption_video || null) : null,
    scheduled_at: input.scheduled_at,
  };
}

export async function buscarCanalId(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_agent_config')
    .select('canal_whatsapp_id')
    .eq('ativo', true)
    .single();
  if (error || !data?.canal_whatsapp_id) {
    throw new Error('canal_whatsapp_id não configurado em jsgrafica_agent_config (coluna proposta ao 02-DADOS, demanda 354)');
  }
  return data.canal_whatsapp_id;
}

export async function listarPostsCanal(): Promise<CanalPost[]> {
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_canal_posts')
    .select('*')
    .order('scheduled_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function criarPostCanal(input: CanalPostInput, criadoPor?: string | null): Promise<CanalPost> {
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_canal_posts')
    .insert({ ...camposPorTipo(input), status: 'pending', created_by: criadoPor ?? null })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Falha ao criar post do Canal');
  return data;
}

async function buscarPost(id: number): Promise<CanalPost> {
  const { data, error } = await supabaseAdmin.from('jsgrafica_canal_posts').select('*').eq('id', id).single();
  if (error || !data) throw error ?? new Error('Post não encontrado');
  return data;
}

export async function editarPostCanal(id: number, input: CanalPostInput): Promise<CanalPost> {
  const atual = await buscarPost(id);
  if (!['pending', 'approved'].includes(atual.status)) {
    throw new Error('Só dá pra editar post pendente ou agendado, ainda não publicado');
  }
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_canal_posts')
    .update({ ...camposPorTipo(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Falha ao editar post do Canal');
  return data;
}

export async function cancelarPostCanal(id: number): Promise<void> {
  const atual = await buscarPost(id);
  if (!['pending', 'approved'].includes(atual.status)) {
    throw new Error('Só dá pra cancelar post pendente ou aprovado ainda não publicado');
  }
  const { error } = await supabaseAdmin
    .from('jsgrafica_canal_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Publica de verdade agora, chamando a Z-API (reusa enviarMensagem/
// enviarImagem/enviarVideo de lib/zapi.ts, mesmos endpoints normais de
// envio, `phone` = id do canal — confirmado real na demanda 352). Só marca
// `published` se a chamada realmente responder sucesso; erro real vira
// status `error` com o detalhe, nunca fica "pending" travado sem explicação.
export async function aprovarEPublicarPostCanal(id: number): Promise<CanalPost> {
  const post = await buscarPost(id);
  if (post.status !== 'pending') throw new Error('Só dá pra aprovar post pendente');

  const canalId = await buscarCanalId();

  try {
    let resposta: { messageId?: string; zaapId?: string };
    if (post.tipo === 'text') {
      resposta = await enviarMensagem(canalId, post.texto ?? '');
    } else if (post.tipo === 'image') {
      resposta = await enviarImagem(canalId, post.image_url ?? '', post.caption_image ?? undefined);
    } else {
      resposta = await enviarVideo(canalId, post.video_url ?? '', post.caption_video ?? undefined);
    }

    const { data: atualizado, error } = await supabaseAdmin
      .from('jsgrafica_canal_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        message_id: resposta.messageId ?? resposta.zaapId ?? null,
        erro_detalhe: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error || !atualizado) throw error ?? new Error('Falha ao gravar post publicado');
    return atualizado;
  } catch (e) {
    const mensagemErro = e instanceof Error ? e.message : 'Erro desconhecido ao publicar no Canal';
    await supabaseAdmin
      .from('jsgrafica_canal_posts')
      .update({ status: 'error', erro_detalhe: mensagemErro, updated_at: new Date().toISOString() })
      .eq('id', id);
    throw new Error(mensagemErro);
  }
}
