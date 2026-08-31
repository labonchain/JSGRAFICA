export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { USUARIOS } from '@/lib/usuarios';
import { validarSenhaAdmin } from '@/lib/auth-senha';
import { criarTokenSessao, CONFIG_COOKIE_SESSAO } from '@/lib/auth-token';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Demanda 332: 5 tentativas erradas seguidas bloqueia por 15min, contado por
// IP (persistido no Supabase, não em memória — instância de função pode
// trocar a qualquer requisição na Vercel, um contador local não sobreviveria
// entre chamadas de verdade). `chave` volta a ser 'desconhecido' só se a
// Vercel não mandar `x-forwarded-for` (não deveria acontecer em produção).
const LIMITE_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

function chaveRequisicao(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'desconhecido';
}

// Demanda 329 (Caminho A) — único jeito de virar o usuário admin (Edvam),
// tanto na tela de Admin quanto ao clicar o nome dele na tela do PDV (antes
// da 329, clicar o nome na tela do PDV logava direto, sem senha nenhuma —
// isso "vazava" acesso de admin sem senha por ali; corrigido junto).
export async function POST(req: NextRequest) {
  const { senha } = await req.json().catch(() => ({}));
  if (typeof senha !== 'string' || !senha) {
    return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 });
  }

  const chave = chaveRequisicao(req);
  const { data: registro } = await supabaseAdmin
    .from('jsgrafica_login_tentativas')
    .select('tentativas, bloqueado_ate')
    .eq('chave', chave)
    .maybeSingle();

  if (registro?.bloqueado_ate && new Date(registro.bloqueado_ate) > new Date()) {
    return NextResponse.json({ error: `Muitas tentativas erradas — tenta de novo em ${BLOQUEIO_MINUTOS} minutos.` }, { status: 429 });
  }

  if (!validarSenhaAdmin(senha)) {
    const tentativas = (registro?.tentativas ?? 0) + 1;
    const bloqueado = tentativas >= LIMITE_TENTATIVAS;
    await supabaseAdmin.from('jsgrafica_login_tentativas').upsert({
      chave,
      tentativas: bloqueado ? 0 : tentativas,
      bloqueado_ate: bloqueado ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000).toISOString() : null,
      atualizado_em: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  }

  // Login certo — zera o contador dessa origem.
  if (registro) await supabaseAdmin.from('jsgrafica_login_tentativas').delete().eq('chave', chave);

  const admin = USUARIOS.find(u => u.papel === 'admin');
  if (!admin) return NextResponse.json({ error: 'Usuário admin não configurado' }, { status: 500 });

  const token = await criarTokenSessao(admin.id);
  const res = NextResponse.json({ usuario: admin });
  res.cookies.set(CONFIG_COOKIE_SESSAO.nome, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: CONFIG_COOKIE_SESSAO.duracaoSegundos,
  });
  return res;
}
