# 030 — Persistir login por 24h (Admin e PDV)

Status: aprovada
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Decisão do Edvam (2026-07-02): hoje, toda vez que a página recarrega/atualiza, pede a senha
do Admin de novo ou obriga reselecionar o usuário no PDV. Isso é incômodo no dia a dia — quer
logar uma vez por dia, não a cada atualização de página.

## Objetivo
Login (Admin por senha, PDV por seleção de nome) persiste por até 24h — refresh de página não
pede login de novo dentro desse período. Depois de 24h (ou virada de dia), pede login de novo.

## Escopo
- Incluído: guardar o estado de login (autenticado ou não, e qual usuário no caso do PDV) em
  armazenamento persistente no navegador (ex.: `localStorage`) com um timestamp de expiração
  de 24h; ao carregar a página, checar esse estado antes de pedir login; se válido, pular
  direto pra tela principal; se expirado ou ausente, pedir login normalmente.
- **Cuidado de segurança:** guardar só um indicador de sessão válida + expiração — nunca a
  senha do Admin em texto no `localStorage`.
- Fora de escopo: sistema de sessão server-side robusto (JWT, cookie httpOnly, etc.) — dado
  que é uso interno da gráfica em rede local/confiável, uma persistência simples client-side
  já resolve o incômodo relatado. Se o Edvam quiser algo mais forte depois, vira demanda
  separada.

## Critérios de aceite
- [ ] Recarregar a página dentro de 24h não pede login de novo (Admin e PDV)
- [ ] Depois de 24h (ou simulando expiração), pede login normalmente
- [ ] Senha do Admin não fica salva em texto no navegador

## Referências
`lib/usuarios.ts`, telas de login do Admin (`app/page.tsx`) e do PDV (`app/pdv/page.tsx`).

## Relato de execução

### O que foi feito
- `lib/sessao.ts` (novo): `salvarSessao(usuarioId)`, `lerSessao()`, `limparSessao()` — guardam
  só `{ usuarioId, expiraEm }` (timestamp, 24h a partir do login) em `localStorage`, nunca a
  senha. `lerSessao()` já limpa a entrada sozinha se estiver expirada ou corrompida.
- `app/page.tsx` (Admin) e `app/pdv/page.tsx` (PDV): os dois ganharam o mesmo padrão —
  - Um `useEffect` na montagem que chama `lerSessao()`, procura o usuário correspondente em
    `USUARIOS` e, se achar, restaura o login automaticamente (`setOperador`).
  - Um estado `verificandoSessao` (true até o efeito rodar) — enquanto isso, a página não
    renderiza nem a tela de login nem o app (evita mostrar a tela de login por uma fração de
    segundo antes de restaurar a sessão).
  - `onLogin` do componente de login passou a chamar `salvarSessao(usuario.id)` antes de
    `setOperador`.
  - O botão "Sair" dos dois passou a chamar `limparSessao()`.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Testado de ponta a ponta com Playwright** (`npm run dev` local), PDV e Admin:
  - Login no PDV (seleção "Zu") → confirmei via `localStorage.getItem` que a sessão salva é
    só `{"usuarioId":"atend1","expiraEm":...}` — **sem senha nenhuma** (não tem sentido pro
    PDV, que não usa senha, mas confirmei que nada sensível vai parar lá).
    Recarreguei a página → **não pediu login de novo**, foi direto pro app.
  - Simulei expiração (forcei `expiraEm` pro passado) e recarreguei → **pediu login de novo**,
    e a entrada no `localStorage` foi limpa sozinha.
  - Login no Admin (senha real) → confirmei que a sessão salva é
    `{"usuarioId":"admin1","expiraEm":...}` — **a senha `075644js2026` não aparece em lugar
    nenhum do `localStorage`** (testei isso explicitamente, o script quebra de propósito se
    achar a senha ali). Recarreguei → não pediu senha de novo.
  - Clicar em "Sair" (Admin) limpou a sessão do `localStorage` — confirmado.
  - `console --errors`: só os 403 esperados de fotos expiradas do WhatsApp (achado da demanda
    029, não relacionado a esta), nenhum erro de JS/React.
- Screenshot confirma o PDV renderizando normal (Inbox com contatos e fotos reais) depois do
  reload com sessão restaurada, sem tela de login no meio do caminho.

### Critérios de aceite
- [x] Recarregar a página dentro de 24h não pede login de novo (Admin e PDV) — testado nos
      dois
- [x] Depois de 24h (simulado), pede login normalmente — testado
- [x] Senha do Admin não fica salva em texto no navegador — testado explicitamente

### Deploy
`npx vercel --prod --yes` — deployment `dpl_4JiyWWpvbYAFoeaYma5x5sQt56Sg` (bundlado com
018/026/029, a pedido do Edvam). Confirmado em produção: `admin.jsgrafica.site` e
`pdv.jsgrafica.site` respondendo 200.

### Status final
Concluída.
