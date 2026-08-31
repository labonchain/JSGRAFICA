# 268 — Mostrar quem está atendendo na lista lateral do Inbox

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-14
Chat executor: 03-APP

## Contexto
Pedido do Edvam (2026-08-01): a lista lateral de conversas do Inbox, quando uma conversa está "Em
atendimento", não mostra quem (qual operador) está atendendo.

Investigação confirmou que **não é feature nova, é omissão simples de exibição** — o dado já
existe e já trafega ponta a ponta:
- Coluna `jsgrafica_contatos.atendente`, gravada por `app/api/inbox/atendimento/route.ts`.
- Já vem na resposta de `GET /api/inbox/conversas` (select e objeto de resposta).
- Já está tipado no estado do componente (`components/TelaInbox.tsx`, interface `Conversa {
  atendente: string | null }`).
- Já é exibido no cabeçalho da conversa aberta (`components/TelaInbox.tsx:1404`,
  `<span>Atendendo: <strong>{conversaAtiva.atendente}</strong></span>`) e na ficha do cliente
  (`components/TelaClientes.tsx:261`).
- **Só falta** no `.map` que renderiza cada item da lista lateral (`components/TelaInbox.tsx:
  1334-1370`) — mostra avatar, nome, hora, última mensagem e `badgeStatus(c.statusAtendimento)`
  (linha 1364), mas nunca lê `c.atendente`.

## Objetivo
Cada item da lista lateral com status "em atendimento" mostra quem está atendendo.

## Escopo
- Incluído: no `.map` da lista (`components/TelaInbox.tsx:1334-1370`), exibir `c.atendente`
  quando `c.statusAtendimento === "em_atendimento"` — próximo ao badge de status já existente
  (linha 1364), formato curto (ex. "Zu" ou "Atendendo: Zu", texto pequeno).
- Explicitamente fora de escopo: qualquer mudança no schema ou na gravação de `atendente` — já
  funciona certo, é só exibição.

## Critérios de aceite
- [x] Lista lateral mostra o nome do atendente em conversas "em atendimento"
- [x] Sem atendente definido, não quebra (mostra só o badge de status, como hoje)

## Referências
`components/TelaInbox.tsx` (linhas 1334-1370 lista, 1404 cabeçalho já funcionando).
`app/api/inbox/conversas/route.ts`, `app/api/inbox/atendimento/route.ts`. Achado 2026-08-01.

## Relato de execução

### O que foi feito
- **`components/TelaInbox.tsx`** (dentro do `.map` da lista lateral, linha ~1364): adicionado
  `{c.statusAtendimento === "em_atendimento" && c.atendente && (<span>...</span>)}` logo antes do
  `badgeStatus(c.statusAtendimento)` já existente — texto pequeno cinza, truncado (`max-w-[4.5rem]`)
  com `title` mostrando "Atendendo: Nome" completo no hover. Nenhuma outra mudança — confirmado
  que o dado já vinha certo (`GET /api/inbox/conversas`, tipagem já existia na interface
  `Conversa`), era mesmo só falta de exibição, como a investigação da própria demanda já apontava.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Visual, contra dado real de produção** (Playwright, dev server local): a query direta no
  Supabase confirmou várias conversas reais com `status_atendimento='em_atendimento'` e
  `atendente` preenchido — print da lista lateral confirma exatamente o comportamento esperado:
  "Mary Santos"/"Cristiane"/"Celpe Zap"/"Felipe Andrade" etc. mostram o nome do atendente (Gabi/
  Edvam) ao lado do badge "Em atend.", sem quebrar layout; "Nathalia Jackson" (status
  "Resolvido", sem atendimento ativo) mostra só o badge, sem nenhum atendente — confirma que o
  critério de "sem atendente não quebra" já vem coberto pela própria condição
  `c.statusAtendimento === "em_atendimento" && c.atendente`, que é falsy nesses casos.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum — confirmado exatamente como a investigação original da demanda já tinha descrito, sem
achado novo durante a execução.

### Status final: concluída
