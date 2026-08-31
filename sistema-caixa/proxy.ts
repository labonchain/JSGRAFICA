import { NextRequest, NextResponse } from 'next/server';
import { verificarTokenSessao, CONFIG_COOKIE_SESSAO } from '@/lib/auth-token';

// Roteia subdomínios para rotas internas do Next.js
// pdv.jsgrafica.site      → /pdv
// admin.jsgrafica.site    → / (raiz — painel completo)
// Qualquer outro host     → / (fallback)

// Demanda 333: arquivo renomeado de middleware.ts pra proxy.ts (convenção
// nova do Next.js 16, `middleware` virou aviso de depreciação), função
// renomeada de `middleware` pra `proxy` — mesma lógica, sem mudança de
// comportamento. Nota: a partir da 16, Proxy roda por padrão no runtime
// Node.js (Middleware rodava Edge por padrão) — sem impacto aqui porque
// `lib/auth-token.ts` já usa Web Crypto (`crypto.subtle`), disponível nos
// dois runtimes, de propósito desde a demanda 329.

// Demanda 329 (Caminho A — sessão real por usuário, fecha 302 e 304): toda
// rota /api/* agora exige uma sessão real (cookie assinado, verificado
// abaixo) OU a credencial de serviço interno (uso único: o gatilho
// `jsgrafica_retentar_pix_apos_telefone_corrigido` no Supabase, que chama
// `/api/pedidos/retentar-pix` via `pg_net` de FORA de qualquer navegador —
// nunca vai ter cookie de usuário nenhum). Substitui o segredo único e
// público da demanda 304 (documentado desde então como "ponte, não solução
// definitiva") — o front não manda mais segredo nenhum, o navegador manda o
// cookie sozinho. Exceção: o webhook do Mercado Pago (assinatura HMAC
// própria, mecanismo diferente) e as rotas de login/logout/me (senão vira
// loop — pra logar, ainda não pode exigir já estar logado).
const ROTAS_API_PUBLICAS = [
  '/api/mercadopago/webhook',
  '/api/auth/login-admin',
  '/api/auth/login-pdv',
  '/api/auth/logout',
  '/api/auth/me',
];

export async function proxy(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (ROTAS_API_PUBLICAS.includes(pathname)) {
      return NextResponse.next();
    }
    const segredoServico = req.headers.get('x-internal-secret');
    if (process.env.INTERNAL_SERVICE_SECRET && segredoServico === process.env.INTERNAL_SERVICE_SECRET) {
      return NextResponse.next();
    }
    const usuario = await verificarTokenSessao(req.cookies.get(CONFIG_COOKIE_SESSAO.nome)?.value);
    if (!usuario) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Ignora arquivos estáticos
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isPDV = host.startsWith('pdv.');

  if (isPDV) {
    // Se já está em /pdv, deixa passar
    if (pathname.startsWith('/pdv')) return NextResponse.next();
    // Caso contrário, reescreve para /pdv
    const url = req.nextUrl.clone();
    url.pathname = '/pdv' + (pathname === '/' ? '' : pathname);
    return NextResponse.rewrite(url);
  }

  // admin.jsgrafica.site ou qualquer outro host — raiz do app
  // Se alguém tentar acessar /pdv diretamente no admin, redireciona para /
  if (pathname.startsWith('/pdv')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
