// Demanda 329 (Caminho A) — checagem da senha do Admin, movida pra cá pra
// sair de vez de qualquer arquivo importável por componente cliente
// (`lib/usuarios.ts` era importado direto por `app/page.tsx`, `"use
// client"`, e o Next.js empacotava a senha inteira pro navegador de
// qualquer visitante — achado real da demanda 302, confirmado baixando o
// bundle de produção).
//
// Usa `node:crypto` de propósito (comparação em tempo constante de
// verdade) — por isso este arquivo só pode ser importado pela rota de login
// do Admin (roda em Node), NUNCA pelo middleware (Edge Runtime, sem
// `node:crypto`). Verificação de sessão (token/cookie) fica em
// `lib/auth-token.ts`, que usa só Web Crypto e por isso pode ser importado
// dos dois lugares.
import { timingSafeEqual } from 'crypto';

export function validarSenhaAdmin(senha: string): boolean {
  const correta = process.env.ADMIN_PASSWORD;
  if (!correta || !senha) return false;
  const a = Buffer.from(senha);
  const b = Buffer.from(correta);
  // Tamanhos diferentes: timingSafeEqual lançaria erro — trata como senha
  // errada direto (vaza só o comprimento, não o conteúdo, mesmo padrão já
  // usado em validarAssinaturaWebhook).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
