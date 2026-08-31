export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CONFIG_COOKIE_SESSAO } from '@/lib/auth-token';

// Demanda 329 — limpa o cookie de sessão. Sem checagem de sessão prévia
// (não faz sentido: chamar isso sem estar logado só limpa um cookie que já
// não existe, sem efeito nenhum).
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(CONFIG_COOKIE_SESSAO.nome, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
