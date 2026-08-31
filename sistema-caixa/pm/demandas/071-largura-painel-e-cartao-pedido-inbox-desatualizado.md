# 071 — Largura da barra lateral não é salva + cartão de pedido no Inbox sem "Aguardando retirada"

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achados pelo PM durante a rodada de testes reais.

**1.** Edvam pediu pra largura da barra lateral do Inbox ficar fixa no tamanho que ele ajustar.
Confirmado no código (`components/TelaInbox.tsx:151-152`): `leftWidth`/`rightWidth` são
`useState(256)`/`useState(300)` sem nenhuma persistência — toda vez que a página recarrega, volta
pro padrão, perdendo o ajuste manual (arrastar a borda) que o usuário fez.

**2.** No cartão "📦 Pedido desta conversa" (painel direito do Inbox, dentro de uma conversa),
o indicador de progresso do pedido **não reflete o status real** depois da demanda 065. Causa
confirmada: existe uma cópia própria e desatualizada da lista de status dentro do
`TelaInbox.tsx` (`STATUS_ORDER_PEDIDO`, linha 60: `["confirmado", "em_producao", "pronto",
"entregue"]` — sem `aguardando_retirada`), diferente da lista que a 065 já corrigiu em
`components/TelaPedidos.tsx`. Como `"aguardando_retirada"` não existe nessa lista,
`STATUS_ORDER_PEDIDO.indexOf(pedidoAtivo.status)` retorna `-1`, quebrando o cálculo de qual passo
está "atual"/"feito" — o cartão mostra o pedido preso em "Confirmado" mesmo ele já estando em
"Aguardando retirada" de verdade (confirmado comparando com a aba Pedidos, que mostra certo).
Mesmo padrão de bug já visto antes no projeto: lógica de status duplicada em 2 lugares, um
corrigido e o outro não.

## Objetivo
Barra lateral do Inbox mantém a largura ajustada pelo usuário entre sessões. Cartão de pedido
dentro da conversa mostra o status real, incluindo "Aguardando retirada".

## Escopo
- Incluído:
  1. Persistir `leftWidth`/`rightWidth` em `localStorage` (salvar ao soltar o arraste, ler ao
     carregar o componente, com os valores atuais como padrão se não houver nada salvo).
  2. Em `components/TelaInbox.tsx`, trocar `STATUS_ORDER_PEDIDO`/`STATUS_LABEL_PEDIDO` (e
     `PROXIMO_STATUS_PEDIDO`, se também estiver desatualizado) pra incluir `aguardando_retirada`
     entre "pronto" e "entregue" — idealmente reaproveitando a mesma fonte de verdade que
     `TelaPedidos.tsx` já usa (`STATUS_CFG`), em vez de manter 2 cópias que podem desalinhar nas
     próximas mudanças de status.
- Fora de escopo: mudar o layout/desenho do cartão em si.

## Critérios de aceite
- [ ] Ajustar a largura de uma barra lateral, recarregar a página — largura continua a mesma
- [ ] Pedido em "Aguardando retirada" aparece assim no cartão da conversa, não travado em
      "Confirmado"
- [ ] Testado com o pedido real de teste usado nesta rodada (contato "Edvan Filho",
      XEROX COLORIDA A4)

## Riscos e cuidados
Ao unificar as duas fontes de status (se for esse o caminho escolhido), confirmar que não quebra
nada que dependa especificamente da lista local do `TelaInbox.tsx`.

## Referências
`components/TelaInbox.tsx` (linhas 60-63, 151-152, 1152-1171). `components/TelaPedidos.tsx`
(fonte de verdade já corrigida na 065). Demanda 065 (status "Aguardando retirada").

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. **Largura da barra lateral**: `leftWidth`/`rightWidth` agora usam `useState(() =>
     lerLarguraSalva(chave, padrao))` — lê `localStorage` (`inbox_left_width`/`inbox_right_width`)
     na montagem, caindo pro padrão (256/300) se não houver nada salvo ou em SSR (sem `window`).
     `startDrag` grava o valor final no `localStorage` só no `mouseup` (não a cada pixel movido).
  2. **Cartão de pedido desatualizado**: `STATUS_CFG` (já existia em `components/TelaPedidos.tsx`,
     corrigido na demanda 065) foi **exportado** e virou a única fonte de verdade. Em
     `TelaInbox.tsx`, `STATUS_ORDER_PEDIDO` passou a incluir `aguardando_retirada` (entre "pronto"
     e "entregue") e `STATUS_LABEL_PEDIDO` é derivado direto de `STATUS_CFG[s].label` em vez de ser
     uma cópia hardcoded — não tem mais 2 listas que podem desalinhar de novo numa próxima mudança
     de status. `PROXIMO_STATUS_PEDIDO` ganhou `aguardando_retirada: "entregue"` (faltava esse
     avanço); o passo de "pronto" continua indo direto pra "entregue" nesse cartão — não dá pra
     oferecer as 2 opções (Entregue / Aguardando retirada) num botão só sem redesenhar o cartão,
     que é explicitamente fora de escopo desta demanda.
- Testes realizados e resultado:
  Usado o pedido real já existente da rodada de testes do PM (`ped-0030`, contato "Edvan Filho",
  "XEROX COLORIDA A4", `status: aguardando_retirada`) — sem precisar criar dado sintético.
  Playwright local (`admin.localhost:3000`): abrindo a conversa "Edvan Filho", o cartão "📦 Pedido
  desta conversa" mostrou a trilha de progresso correta — Confirmado/Em produção/Pronto marcados
  como feitos (✓ verde), "📦 Aguardando retirada" marcado como passo atual (roxo), "Entregue" como
  próximo — e o botão "Avançar → Entregue" apareceu (confirmado por screenshot). Antes do fix,
  ficaria travado mostrando "Confirmado" como atual. Testado também o arraste da borda esquerda:
  `localStorage.inbox_left_width` vazio antes, gravado com o valor novo ao soltar o mouse, e
  mantido depois de recarregar a página (`page.reload()`).
  `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy. Deploy em produção:
  `npx vercel --prod --yes` → `dpl_AMs64fRJQnWU6TRr8xarj6c8Cb8i`, smoke-test de `admin.jsgrafica.site`
  e `pdv.jsgrafica.site` (200 OK) depois do deploy. Nenhum dado de teste criado, nada pra limpar.
- Achados fora do escopo: nenhum.
- Status final: concluída.
