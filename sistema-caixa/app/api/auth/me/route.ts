export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verificarTokenSessao, CONFIG_COOKIE_SESSAO } from '@/lib/auth-token';

// Demanda 329 — única fonte de verdade de "quem está logado agora": lida ao
// montar as páginas / e /pdv, substitui o antigo `lerSessao()` (localStorage,
// nunca validado no servidor). Cookie HttpOnly não é legível por JS, então
// isto é a única forma do front saber o estado real da sessão.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(CONFIG_COOKIE_SESSAO.nome)?.value;
  const usuario = await verificarTokenSessao(token);
  if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json({ usuario });
}
