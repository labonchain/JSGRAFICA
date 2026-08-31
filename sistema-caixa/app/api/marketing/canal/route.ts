export const dynamic = 'force-dynamic';

// Demanda 354: CRUD de posts do Canal do WhatsApp, integração direta (não
// passa pelo webhook compartilhado do LabOnchain, ver lib/canalWhatsapp.ts).
// Mesmo formato de rota do Status (app/api/marketing/conteudo/route.ts):
// GET lista, POST cria rascunho, PATCH aplica ação (aprovar/editar/cancelar).

import { NextRequest, NextResponse } from 'next/server';
import {
  listarPostsCanal, criarPostCanal, editarPostCanal, cancelarPostCanal, aprovarEPublicarPostCanal,
  type TipoCanalPost,
} from '@/lib/canalWhatsapp';

export async function GET() {
  try {
    const posts = await listarPostsCanal();
    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao listar posts do Canal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tipo, texto, image_url, video_url, caption_image, caption_video, scheduled_at, criado_por } = body;

    if (!['text', 'image', 'video'].includes(tipo)) {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
    }
    if (tipo === 'text' && !texto) {
      return NextResponse.json({ error: 'texto obrigatório' }, { status: 400 });
    }
    if (tipo === 'image' && !image_url) {
      return NextResponse.json({ error: 'image_url obrigatório' }, { status: 400 });
    }
    if (tipo === 'video' && !video_url) {
      return NextResponse.json({ error: 'video_url obrigatório' }, { status: 400 });
    }
    if (!scheduled_at) {
      return NextResponse.json({ error: 'scheduled_at obrigatório' }, { status: 400 });
    }

    const post = await criarPostCanal(
      { tipo: tipo as TipoCanalPost, texto, image_url, video_url, caption_image, caption_video, scheduled_at },
      criado_por ?? null,
    );
    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao criar post do Canal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, acao, ...campos } = body as { id?: number; acao?: 'aprovar' | 'editar' | 'cancelar'; [k: string]: unknown };

    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    if (!acao || !['aprovar', 'editar', 'cancelar'].includes(acao)) {
      return NextResponse.json({ error: 'acao inválida' }, { status: 400 });
    }

    if (acao === 'aprovar') {
      const post = await aprovarEPublicarPostCanal(id);
      return NextResponse.json({ post });
    }
    if (acao === 'cancelar') {
      await cancelarPostCanal(id);
      return NextResponse.json({ id });
    }
    // editar
    const { tipo, texto, image_url, video_url, caption_image, caption_video, scheduled_at } = campos as Record<string, unknown>;
    if (!['text', 'image', 'video'].includes(tipo as string)) {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
    }
    const post = await editarPostCanal(id, {
      tipo: tipo as TipoCanalPost,
      texto: texto as string | undefined,
      image_url: image_url as string | undefined,
      video_url: video_url as string | undefined,
      caption_image: caption_image as string | undefined,
      caption_video: caption_video as string | undefined,
      scheduled_at: scheduled_at as string,
    });
    return NextResponse.json({ post });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao atualizar post do Canal' }, { status: 500 });
  }
}
