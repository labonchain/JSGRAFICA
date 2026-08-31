export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { USUARIOS } from '@/lib/usuarios';
import { criarTokenSessao, CONFIG_COOKIE_SESSAO } from '@/lib/auth-token';

// Demanda 329 (Caminho A) — login por seleção de nome (Zu/Gabi), sem senha,
// mesmo padrão de sempre do PDV (atendimento físico no balcão — a "senha" é
// estar presente na loja). NUNCA resolve pra usuário `papel === 'admin'`
// aqui de propósito — antes da 329, clicar "Edvam" na tela do PDV logava
// direto sem senha nenhuma; essa rota existir separada da de admin é o que
// fecha esse buraco (Edvam só vira sessão de verdade via /api/auth/login-
// admin, com senha, não importa a tela). Sem isso, dava pra conseguir um
// cookie de sessão "admin" só chamando esta rota direto com {nome:"Edvam"}.
export async function POST(req: NextRequest) {
  const { nome } = await req.json().catch(() => ({}));
  if (typeof nome !== 'string' || !nome) {
    return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });
  }
  const usuario = USUARIOS.find(u => u.nome === nome && u.papel !== 'admin');
  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado (admin precisa de senha, use /api/auth/login-admin)' }, { status: 401 });
  }

  const token = await criarTokenSessao(usuario.id);
  const res = NextResponse.json({ usuario });
  res.cookies.set(CONFIG_COOKIE_SESSAO.nome, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: CONFIG_COOKIE_SESSAO.duracaoSegundos,
  });
  return res;
}
