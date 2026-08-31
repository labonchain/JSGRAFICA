export type Papel = "admin" | "atendente";

export interface Usuario {
  id: string;
  nome: string;
  papel: Papel;
}

// Demanda 329 (Caminho A): a senha do Admin SAIU deste arquivo — antes
// ficava aqui com o campo `senha`, e como este arquivo é importado direto
// por componentes `"use client"` (app/page.tsx, app/pdv/page.tsx), o
// Next.js empacotava a senha inteira pro bundle JS público (achado real da
// demanda 302, confirmado baixando o bundle de produção). Agora mora só em
// `process.env.ADMIN_PASSWORD` (servidor), checada em
// `lib/auth-senha.ts`/`app/api/auth/login-admin`. Login (Admin com senha,
// PDV por seleção de nome) virou sessão real por cookie assinado — ver
// `lib/auth-token.ts` e `app/api/auth/*`. Nunca reintroduzir um campo de
// senha aqui — qualquer coisa neste arquivo pode ir pro bundle do navegador.
export const USUARIOS: Usuario[] = [
  { id: "admin1",  nome: "Edvam", papel: "admin" },
  { id: "atend1",  nome: "Zu",    papel: "atendente" },
  { id: "atend2",  nome: "Gabi",  papel: "atendente" },
];
