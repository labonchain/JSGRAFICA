# 068 — PDV (Zu/Gabi) não tem acesso à aba Pedidos

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Confirmado pelo PM: a aba "Pedidos" (`components/TelaPedidos.tsx`) só é renderizada em
`app/page.tsx` (admin, só Edvam). O PDV (`app/pdv/page.tsx`, usado por Zu e Gabi) não tem essa
aba — elas não conseguem ver os pedidos gerados (nem os de balcão que elas mesmas lançam, nem os
do Inbox).

## Objetivo
Zu e Gabi conseguem ver a lista de pedidos (e seu status) a partir do PDV.

## Escopo
- Incluído: adicionar a aba "Pedidos" (reaproveitando `TelaPedidos.tsx` como já existe no admin)
  na navegação do PDV (`app/pdv/page.tsx`).
- Fora de escopo: decidir permissões diferentes por usuário (ex.: Zu/Gabi não poderem editar algo
  que só Edvam pode) — a menos que o Edvam sinalize que precisa disso, tratar igual ao admin por
  enquanto.

## Critérios de aceite
- [ ] Zu e Gabi enxergam a aba Pedidos no PDV, com a mesma lista/detalhe que o admin já mostra
- [ ] Testado logando como Zu ou Gabi (seleção de usuário no PDV)

## Riscos e cuidados
Nenhum específico — é reaproveitar um componente já pronto, só adicionar à navegação de outra
tela.

## Referências
`app/pdv/page.tsx` (navegação do PDV). `components/TelaPedidos.tsx` (componente a reaproveitar).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Em `app/pdv/page.tsx`: importado `TelaPedidos` (mesmo componente já usado no admin, sem
  alteração), adicionado `"pedidos"` ao tipo `AbaPDV`, nova aba "🗂️ Pedidos" na navegação (entre
  "Pedidos Balcão" e "Fechar Caixa") e o render condicional `{aba === "pedidos" && <TelaPedidos
  operador={operador} />}`. Sem diferenciação de permissão entre Zu/Gabi e Edvam, como pedido
  (mesma tela, mesmo acesso).
- Testes realizados e resultado:
  Playwright local (`pdv.localhost:3000/pdv`), login selecionando o usuário "Zu": a aba "🗂️
  Pedidos" aparece na navegação, o clique abre a `TelaPedidos` normalmente (view "📋 Todos os
  pedidos" renderiza, lista carrega sem erro). `npx tsc --noEmit` e `npm run build` rodaram limpos
  antes do deploy. Deploy em produção: `npx vercel --prod --yes` → `dpl_7GeSSC3cY8sUNyEAomD6gtrK1tBX`
  (junto com a 067).
- Achados fora do escopo: nenhum.
- Status final: concluída.
