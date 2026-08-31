# 078 — Remover valor de "Entradas do dia" da barra azul superior

Status: aprovada — 🔴 prioridade (financeiro, pedido do Edvam)
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
O valor de "Entradas do dia" aparece na barra azul superior, visível em qualquer tela — inclusive
quando a tela pode estar virada pro cliente (ex.: PDV no balcão). Edvam pediu pra remover: esse
número não deveria ficar visível pro cliente.

## Objetivo
O valor de entradas do dia não aparece mais na barra superior — só dentro do Dashboard/Movimento,
telas que o cliente não vê.

## Escopo
- Incluído: remover (ou esconder atrás de um clique/toggle, se fizer mais sentido) o valor de
  "Entradas do dia" da barra superior azul, tanto no admin quanto no PDV.
- Fora de escopo: mudar o Dashboard/Movimento em si (o valor continua lá, só sai do topo).

## Critérios de aceite
- [ ] Barra superior não mostra mais o valor de entradas do dia
- [ ] Valor continua acessível no Dashboard/Movimento normalmente

## Referências
Componente da barra superior (admin e PDV).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Removido o bloco "Entradas do dia" da barra azul superior em `app/page.tsx` (admin) e
  `app/pdv/page.tsx` (PDV). No PDV, o estado `entradasHoje` e a função `carregarEntradas()`
  (fetch de `/api/fechamento`) ficaram sem nenhum outro consumidor depois da remoção — removidos
  também (limpeza direta, não código morto separado: era a única finalidade desse fetch). No
  admin, `resumoHeader.totalEntradas` parou de ser exibido, mas `resumoHeader` continua sendo
  buscado normalmente porque `resumoHeader.nomeAba` (label do dia-caixa ao lado da data) ainda
  depende do mesmo fetch.
- Testes realizados e resultado:
  Playwright local: confirmado que "Entradas do dia" não aparece mais na barra superior nem no
  admin nem no PDV (screenshot de ambos). Confirmado que `/api/dashboard?periodo=hoje` continua
  retornando o valor normalmente (R$998,49 no momento do teste) — o dado não sumiu, só saiu do
  topo, como pedido. `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy (1ª
  tentativa de build crashou com um erro de worker do Next.js no Windows, sem relação com o
  código — 2ª tentativa rodou limpa). Deploy em produção: `npx vercel --prod --yes` →
  `dpl_3aECHmpdZDkXRfZGfnbgMUDYKqq4`.
- Achados fora do escopo: nenhum.
- Status final: concluída.
