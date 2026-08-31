// Demanda 329 (Caminho A — sessão real por usuário, fecha 302 e 304).
//
// Cria/verifica o token de sessão assinado que vira o cookie
// `jsgrafica_sessao`. Usa a Web Crypto API (`crypto.subtle`), não o módulo
// `node:crypto` — este arquivo é importado por `middleware.ts`, que roda no
// Edge Runtime (não tem `node:crypto`, mas tem `crypto.subtle` global, igual
// ao navegador). Rodar em Node (rotas de API) também funciona sem mudança —
// `crypto.subtle` existe nos dois ambientes, então o mesmo código serve pra
// assinar (na rota de login) e verificar (na rota de login, no `/me` e no
// middleware) sem duplicar lógica nem arriscar quebrar o bundle do Edge.
//
// A checagem de SENHA (que precisa de comparação em tempo constante de
// verdade, `crypto.timingSafeEqual`) fica em `lib/auth-senha.ts`, separado
// de propósito — aquele arquivo importa `node:crypto` e só pode ser usado
// pela rota de login do Admin (Node runtime), nunca pelo middleware.
import { USUARIOS, type Usuario } from './usuarios';

const DURACAO_SEGUNDOS = 24 * 60 * 60; // 24h — mesmo prazo que a sessão em localStorage já tinha (demanda 030)
const NOME_COOKIE = 'jsgrafica_sessao';

interface PayloadSessao {
  usuarioId: string;
  exp: number; // epoch em segundos
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binario = '';
  bytes.forEach(b => { binario += String.fromCharCode(b); });
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(valor: string): Uint8Array {
  const binario = atob(valor.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binario, c => c.charCodeAt(0));
}

async function chaveHmac(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET não configurado');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function criarTokenSessao(usuarioId: string): Promise<string> {
  const payload: PayloadSessao = { usuarioId, exp: Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS };
  const payloadBase64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const chave = await chaveHmac();
  const assinaturaBuf = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(payloadBase64));
  const assinatura = base64UrlEncode(new Uint8Array(assinaturaBuf));
  return `${payloadBase64}.${assinatura}`;
}

export async function verificarTokenSessao(token: string | undefined | null): Promise<Usuario | null> {
  if (!token) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [payloadBase64, assinatura] = partes;
  try {
    const chave = await chaveHmac();
    const valido = await crypto.subtle.verify(
      'HMAC', chave,
      base64UrlDecode(assinatura) as BufferSource,
      new TextEncoder().encode(payloadBase64),
    );
    if (!valido) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadBase64))) as Partial<PayloadSessao>;
    if (!payload.usuarioId || !payload.exp || Math.floor(Date.now() / 1000) > payload.exp) return null;
    return USUARIOS.find(u => u.id === payload.usuarioId) ?? null;
  } catch {
    return null;
  }
}

export const CONFIG_COOKIE_SESSAO = {
  nome: NOME_COOKIE,
  duracaoSegundos: DURACAO_SEGUNDOS,
} as const;
