export const dynamic = 'force-dynamic';

// Demanda 354: gestão do Canal do WhatsApp (identidade/seguidores/admins/
// exclusão) — endpoints próprios da seção "newsletter" da Z-API, separados
// do fluxo de postar conteúdo (app/api/marketing/canal/route.ts).
//
// Achado registrado (guia-canal-whatsapp-automacao.md): não existe endpoint
// documentado de "convidar admin", só aceitar/remover/anular convite e
// transferir propriedade — por isso não há ação "convidar" aqui.

import { NextRequest, NextResponse } from 'next/server';
import {
  atualizarFotoCanal, atualizarNomeCanal, atualizarDescricaoCanal,
  metadataCanal, seguidoresCanal, excluirCanal,
  removerAdminCanal, anularConviteAdminCanal, transferirPropriedadeCanal,
} from '@/lib/zapi';
import { buscarCanalId } from '@/lib/canalWhatsapp';

export async function GET() {
  try {
    const canalId = await buscarCanalId();
    const [metadata, seguidores] = await Promise.all([
      metadataCanal(canalId),
      seguidoresCanal(canalId).catch(() => null), // endpoint novo, sem uso real ainda — não derruba a tela se falhar
    ]);
    return NextResponse.json({ canalId, metadata, seguidores });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao buscar configurações do Canal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, descricao, fotoUrl } = body as { nome?: string; descricao?: string; fotoUrl?: string };
    if (!nome && !descricao && !fotoUrl) {
      return NextResponse.json({ error: 'nada pra atualizar (nome, descricao ou fotoUrl)' }, { status: 400 });
    }
    const canalId = await buscarCanalId();
    if (nome) await atualizarNomeCanal(canalId, nome);
    if (descricao) await atualizarDescricaoCanal(canalId, descricao);
    if (fotoUrl) await atualizarFotoCanal(canalId, fotoUrl);
    const metadata = await metadataCanal(canalId);
    return NextResponse.json({ metadata });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao atualizar identidade do Canal' }, { status: 500 });
  }
}

// Ações de administração (remover/anular convite/transferir). Corpo:
// {acao, telefone}. Cada uma chama o endpoint Z-API correspondente.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { acao, telefone } = body as { acao?: string; telefone?: string };
    if (!telefone) return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 });
    const canalId = await buscarCanalId();

    if (acao === 'remover_admin') {
      await removerAdminCanal(canalId, telefone);
    } else if (acao === 'anular_convite') {
      await anularConviteAdminCanal(canalId, telefone);
    } else if (acao === 'transferir_propriedade') {
      await transferirPropriedadeCanal(canalId, telefone);
    } else {
      return NextResponse.json({ error: 'acao inválida' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao atualizar administração do Canal' }, { status: 500 });
  }
}

// Exclusão do canal — destrutivo e permanente, mesmo cuidado já documentado
// no mockup (353): exige `confirmar: true` explícito no corpo, não só a
// chamada da rota, pra reduzir chance de disparo acidental por engano de UI.
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirmar !== true) {
      return NextResponse.json({ error: 'confirmação obrigatória (confirmar: true)' }, { status: 400 });
    }
    const canalId = await buscarCanalId();
    await excluirCanal(canalId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao excluir o Canal' }, { status: 500 });
  }
}
