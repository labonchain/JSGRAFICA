export const dynamic = 'force-dynamic';

// Demanda 310: Painel de Conteúdo (Marketing), ponte pro webhook
// compartilhado LABON_DASHBOARD_STATUS. Uma rota só, ação no body/query,
// porque as 5 ações do webhook já vêm nesse formato (agent_slug + acao).

import { NextRequest, NextResponse } from 'next/server';
import { chamarLabonDashboardStatus, type AcaoStatus, type PostStatus } from '@/lib/labonStatus';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Demanda 345: anexa "quantas pessoas viram" em cada post publicado. O
// webhook compartilhado (`chamarLabonDashboardStatus`) não expõe
// `response_zapi` (é genérico pra todos os clientes do LabOnchain), então
// busca-se direto na tabela (mesmo projeto Supabase, via supabaseAdmin) só
// pra pegar o `messageId` de cada post — o agregado em si vem da função
// `jsgrafica_contar_visualizacoes_status` (criada na 345), que já deduplica
// por participante (Z-API reenvia o mesmo callback de visualização).
async function anexarVisualizacoes(posts: PostStatus[]): Promise<PostStatus[]> {
  const publicados = posts.filter(p => p.status === 'published');
  if (publicados.length === 0) return posts;

  const { data: linhas } = await supabaseAdmin
    .from('labon_status_queue')
    .select('id, response_zapi')
    .in('id', publicados.map(p => p.id));

  const messageIdPorPostId = new Map<number, string>();
  for (const linha of linhas ?? []) {
    const messageId = (linha.response_zapi as { messageId?: string } | null)?.messageId;
    if (messageId) messageIdPorPostId.set(linha.id, messageId);
  }

  const messageIds = [...new Set(messageIdPorPostId.values())];
  if (messageIds.length === 0) return posts;

  const { data: contagens } = await supabaseAdmin.rpc('jsgrafica_contar_visualizacoes_status', { message_ids: messageIds });
  const visualizacoesPorMessageId = new Map<string, number>((contagens ?? []).map((c: { message_id: string; visualizacoes: number }) => [c.message_id, c.visualizacoes]));

  return posts.map(p => {
    const messageId = messageIdPorPostId.get(p.id);
    if (!messageId) return p;
    return { ...p, visualizacoes: visualizacoesPorMessageId.get(messageId) ?? 0 };
  });
}

export async function GET() {
  try {
    const resultado = await chamarLabonDashboardStatus('listar');
    const posts = await anexarVisualizacoes(resultado.posts ?? []);
    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao listar posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipo_status, texto_status, image_url, video_url, caption_image, caption_video, scheduled_at } = body;

    if (!['text', 'image', 'video'].includes(tipo_status)) {
      return NextResponse.json({ error: 'tipo_status inválido' }, { status: 400 });
    }
    if (tipo_status === 'text' && !texto_status) {
      return NextResponse.json({ error: 'texto_status obrigatório' }, { status: 400 });
    }
    if (tipo_status === 'image' && !image_url) {
      return NextResponse.json({ error: 'image_url obrigatório' }, { status: 400 });
    }
    if (tipo_status === 'video' && !video_url) {
      return NextResponse.json({ error: 'video_url obrigatório' }, { status: 400 });
    }

    const resultado = await chamarLabonDashboardStatus('criar', {
      tipo_status, texto_status, image_url, video_url, caption_image, caption_video, scheduled_at,
    });
    return NextResponse.json({ post: resultado.post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao criar post' }, { status: 500 });
  }
}

// aprovar/editar/cancelar: todas recebem {id, acao, ...campos} e repassam
// direto pro webhook, que já confere status/dono antes de aplicar.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, acao, ...campos } = body as { id?: number; acao?: AcaoStatus; [k: string]: unknown };

    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    if (!acao || !['aprovar', 'editar', 'cancelar'].includes(acao)) {
      return NextResponse.json({ error: 'acao inválida' }, { status: 400 });
    }

    const resultado = await chamarLabonDashboardStatus(acao, { id, ...campos });
    return NextResponse.json({ id: resultado.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao atualizar post' }, { status: 500 });
  }
}
