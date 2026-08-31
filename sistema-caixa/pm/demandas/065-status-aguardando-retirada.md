# 065 — Novo status "Aguardando retirada" na jornada de pedidos (Inbox e Balcão)

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Hoje a jornada de um pedido é: aguardando → confirmado → em_producao → pronto → entregue
(+ cancelado). "Pronto" significa "a equipe terminou" — mas na prática, nem todo pedido é
retirado na hora que fica pronto (Inbox: cliente combina de vir buscar depois; Balcão: às vezes
a pessoa deixa algo pra fazer — ex.: um livro pra tirar xerox — e volta mais tarde). Hoje não
existe um jeito de marcar "tá pronto, mas ainda não veio buscar" — só existe "pronto" ou
"entregue", sem meio-termo.

Definição confirmada com o Edvam: **"Pronto" = a equipe terminou o serviço. Se o cliente já levou
na hora, marca "Entregue" direto. Se não levou ainda e vai vir buscar depois, marca "Aguardando
retirada"** — ou seja, ao terminar um pedido, o próximo passo é escolher entre "Entregue" (levou
na hora) ou "Aguardando retirada" (vai buscar depois), e só de "Aguardando retirada" passa pra
"Entregue" quando a pessoa realmente vier.

## Objetivo
Pedido pronto mas ainda não retirado tem um status próprio, visível na aba Pedidos, tanto pra
jornada do Inbox quanto pra jornada do Balcão (demanda 066 depende deste status já existir).

## Escopo
- Incluído:
  1. Adicionar o valor `aguardando_retirada` como status válido de `jsgrafica_pedidos` (ajustar a
     constraint do banco que hoje só aceita os valores atuais).
  2. Em `components/TelaPedidos.tsx`, incluir `aguardando_retirada` no `STATUS_CFG` (cor/rótulo
     — ex.: "📦 Aguardando retirada"), no filtro por status, e na progressão do botão de avançar:
     ao clicar "avançar" num pedido "Pronto", oferecer as duas opções (não avançar direto sem
     perguntar) — "Entregue" ou "Aguardando retirada". De "Aguardando retirada", avançar vai
     direto pra "Entregue".
  3. Conferir se a mensagem automática ao cliente (demanda 046, disparada ao mudar status) precisa
     de ajuste — hoje dispara em "pronto"/"em_producao" conforme o texto já existente; decidir se
     "aguardando_retirada" dispara mensagem nova ou não dispara nada (não é obrigatório disparar,
     avaliar o que já existe antes de adicionar).
- Fora de escopo: mudar a jornada do Balcão em si (isso é a demanda 066, que usa este status).

## Critérios de aceite
- [ ] Dá pra marcar um pedido como "Aguardando retirada" a partir de "Pronto"
- [ ] Dá pra marcar um pedido "Aguardando retirada" como "Entregue" depois
- [ ] Filtro por status na aba Pedidos inclui "Aguardando retirada"
- [ ] Testado com pelo menos 1 pedido real passando pelos dois caminhos (Pronto→Entregue direto,
      e Pronto→Aguardando retirada→Entregue)

## Riscos e cuidados
Mudar a constraint do banco em produção com pedidos já existentes — conferir que nenhum pedido
atual fica em estado inválido depois da mudança.

## Referências
`components/TelaPedidos.tsx` (STATUS_CFG, função de avançar status). Tabela `jsgrafica_pedidos`
(constraint de status). Demanda 046 (mensagem automática por mudança de status). Demanda 066
(Balcão, depende deste status).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. Migration `add_aguardando_retirada_status` na tabela `jsgrafica_pedidos`: constraint
     `status_valido` recriada incluindo `'aguardando_retirada'` entre `'pronto'` e `'entregue'`.
     Verificado que os 5 pedidos já existentes (todos `status='entregue'`) continuaram válidos.
  2. `components/TelaPedidos.tsx`: adicionado `aguardando_retirada` no `STATUS_CFG` (rótulo
     "📦 Aguardando retirada", cor laranja) e no array `FILTROS`.
  3. `PROXIMO` deixou de mapear "1 próximo status" pra "lista de opções": de "Pronto" agora saem 2
     botões — "✓ Entregue (levou agora)" e "📦 Aguardando retirada"; de "Aguardando retirada" sai só
     "Marcar entregue". `PainelDetalhe` e `CardFila` foram ajustados pra renderizar os botões via
     `.map()` (antes só existia 1 botão fixo).
  4. Mensagem automática (demanda 046): conferido `app/api/pedidos/route.ts` — `TIMESTAMP_POR_STATUS`
     e `TEMPLATE_POR_STATUS` só têm entradas pra `em_producao`/`pronto`/`entregue`. Decisão: não
     adicionar mensagem nova pra `aguardando_retirada` (não é obrigatório, e evita mais um disparo
     automático pro cliente sem necessidade clara agora) — o guard existente já pula o envio
     silenciosamente pra esse status, sem precisar mudar código.
- Testes realizados e resultado:
  Criados 2 pedidos de teste reais via SQL direto (`ped-0019` e `ped-0020`, status inicial
  `pronto`, telefone `balcao` pra garantir zero risco de disparo de WhatsApp). Testado via
  Playwright contra `admin.localhost:3000` (dev server local, mesmo Supabase de produção):
  - Pedido A: Pronto → Aguardando retirada → Entregue — os 2 botões apareceram em "Pronto", o
    status mudou corretamente pra "Aguardando retirada", o botão virou "Marcar entregue", e o
    status final foi "Entregue". Confirmado.
  - Pedido B: Pronto → Entregue direto (sem passar por Aguardando retirada). Confirmado.
  - Filtro "📦 Aguardando retirada" aparece na lista de filtros da aba Pedidos. Confirmado.
  Depois do teste, os 2 registros de teste foram apagados do Supabase (`delete ... where id in
  ('ped-0019','ped-0020')`). `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy.
  Deploy em produção: `npx vercel --prod --yes` → `dpl_DEwSbzZJ1TNzMUUYcxqgfzjrKbW4`, aliased em
  `pdv.jsgrafica.site`/`admin.jsgrafica.site`. Constraint conferida diretamente em produção via SQL
  após o deploy.
- Achados fora do escopo: nenhum.
- Status final: concluída.
