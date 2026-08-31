# 250 — Mensagem de Pix promete confirmação automática que não existe

Status: concluída
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: 2026-07-30
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado durante a revisão do blueprint da automação de atendimento (demandas 244-247), confirmado
por investigação de código: a mensagem real que o sistema já manda hoje quando gera um Pix pro
cliente (`montarTrechoPix()` em `lib/pedidos.ts`) diz literalmente:

> "Assim que o pagamento cair, a gente já confirma por aqui automaticamente 😊"

Isso é uma promessa que **não é cumprida**. Confirmado: o sistema detecta o pagamento
automaticamente (webhook do Mercado Pago em `app/api/mercadopago/webhook/route.ts` +
verificação de reforço em `conferirCobrancasPixPendentes`, `lib/mercadopago.ts`), grava
`pagamento_confirmado=true` no banco — mas **nenhuma mensagem é enviada ao cliente
automaticamente** confirmando isso. O cliente paga, o sistema sabe que pagou, e ninguém avisa o
cliente — fica em silêncio até um humano perceber e decidir agir. `TEMPLATE_POR_STATUS`
(`app/api/pedidos/route.ts`) só cobre mudança de status de produção, não confirmação de
pagamento, e mesmo esses templates viram rascunho pro Inbox, não são enviados sozinhos.

Isso é independente de qualquer automação de atendimento nova — é uma mensagem que já sai hoje,
pra cliente real, prometendo algo que o sistema não faz.

## Objetivo
Resolver a divergência entre o que a mensagem promete e o que o sistema faz — seja cumprindo a
promessa (gerar um rascunho de confirmação assim que o pagamento for detectado, pro Admin
mandar), seja ajustando o texto pra não prometer algo que não acontece.

## ⚠️ Checkpoint obrigatório antes de mexer
Investigar e confirmar com o PM qual caminho faz mais sentido antes de implementar:
1. **Cumprir a promessa (mínimo)**: quando `confirmarPedidosPagosPorOrder` confirma um pagamento,
   gerar automaticamente um rascunho de mensagem de confirmação no Inbox (mesmo padrão dos
   templates de status hoje) — o cliente ainda não recebe nada sozinho, mas fica pronto pra um
   humano mandar com 1 clique, em vez de precisar lembrar de fazer isso manualmente.
2. **Ajustar o texto**: trocar a frase por algo que não prometa confirmação automática (ex.: "a
   equipe confirma o recebimento em breve"), sem mudar nenhum comportamento de sistema.
Relatar qual dos dois (ou outra alternativa) faz mais sentido, com prós/contras, antes de
implementar.

## Escopo
- Incluído: investigação completa de onde a mensagem é usada hoje (todos os fluxos que chamam
  `montarTrechoPix`/`montarMensagensConfirmacaoPedido`) — confirmar se a frase aparece em mais de
  um lugar.
- Incluído: implementar a solução escolhida no checkpoint.
- Incluído: se optar por gerar rascunho automático, testar que ele aparece corretamente no Inbox
  assim que um pagamento real (ou sintético) é confirmado.
- Explicitamente fora de escopo: qualquer envio automático de mensagem direto ao cliente sem
  humano no meio — mantém a convenção atual (`CLAUDE.md`: "sem auto-resposta ao cliente via
  WhatsApp").

## Critérios de aceite
- [x] Causa e alcance confirmados (todos os lugares que usam essa frase)
- [x] Solução escolhida e justificada no checkpoint, aprovada antes de implementar
- [x] Implementado e testado
- [x] Mensagem real que o cliente recebe não promete mais nada que o sistema não cumpre

## Riscos e cuidados
Mensagem já em produção, cliente real já recebe — qualquer mudança de texto é imediata pra
próximos pedidos. Não precisa reenviar nada pra pedidos antigos.

## Referências
`lib/pedidos.ts` (`montarTrechoPix`), `app/api/mercadopago/webhook/route.ts`,
`lib/mercadopago.ts` (`conferirCobrancasPixPendentes`, `confirmarPedidosPagosPorOrder`),
`app/api/pedidos/route.ts` (`TEMPLATE_POR_STATUS`). Achado durante revisão das demandas 244-247.

## Relato de execução

### Checkpoint (antes de codar) — alcance confirmado, recomendação relatada
Confirmado por busca no código: a frase problemática existe em **exatamente 1 lugar**
(`montarTrechoPix`, `lib/pedidos.ts:56`), chamada só por `montarMensagensConfirmacaoPedido(Multiplo)`,
por sua vez chamada só em `app/api/pedidos/route.ts:407` (fluxo "Criar pedido" do Inbox) — não
existe em nenhum outro ponto de geração de mensagem.

Confirmado também: `confirmarPedidosPagosPorOrder` (`lib/mercadopago.ts`) é o único ponto que
marca `pagamento_confirmado=true`, e é chamado por 3 gatilhos (webhook, `conferirCobrancasPixPendentes`
de reforço, poll do balcão) — só fazia `UPDATE...select('id')`, sem saber telefone/produto/valor
e sem gerar nenhuma mensagem.

**Recomendação relatada ao PM**: fazer os dois caminhos propostos, não escolher só um — ajustar
o texto imediatamente (trivial, zero risco, já estava saindo errado pra cliente real) E gerar o
rascunho automático (o próprio texto da demanda já chamava isso de "mínimo" pra resolver de
verdade, não só cosmético). Confirmado pelo PM.

### O que foi feito
- **`lib/pedidos.ts` — `montarTrechoPix`**: texto trocado de "a gente já confirma por aqui
  automaticamente" pra "a gente avisa por aqui" — deixa de prometer confirmação sem humano no
  meio (mantém a convenção do `CLAUDE.md`), mas ainda soa próximo/rápido, já que agora existe
  um rascunho pronto assim que o pagamento é detectado.
- **`lib/pedidos.ts`** — nova função `montarMensagemPagamentoConfirmado(itens)`: gera o texto de
  confirmação (1 item ou lista com total, mesmo padrão visual de
  `montarMensagensConfirmacaoPedidoMultiplo`), determinístico, sem IA.
- **`lib/mercadopago.ts` — `confirmarPedidosPagosPorOrder`**: `select` estendido de só `id` pra
  `id, telefone, servico_nome, valor_final, quantidade, venda_id`. Depois de confirmar, chama a
  nova função `gerarRascunhosPagamentoConfirmado` (best-effort, falha aqui nunca desfaz a
  confirmação de pagamento em si — só loga):
  - Agrupa os pedidos confirmados por `venda_id` (múltiplos itens da mesma compra viram 1
    rascunho só, mesmo padrão de "Criar pedido"/076; sem `venda_id`, 1 grupo por pedido).
  - Só gera rascunho quando o telefone é numérico de verdade (mesmo critério da demanda 238) —
    venda de balcão sem contato vinculado grava `telefone='balcao'` e não gera rascunho nenhum;
    um `@lid` ainda não resolvido também não geraria (não teria como entregar de qualquer forma).
  - `gravarRascunhosPedido` (mecanismo já existente, zero peça nova) grava o rascunho — nunca
    enviado sozinho, só fica pronto pro Admin mandar com 1 clique.
  - Como é o ÚNICO ponto de confirmação, os 3 gatilhos (webhook/polling/balcão) ganham o
    comportamento de graça, sem duplicar lógica em cada um.
- Nenhuma mudança no webhook, no `conferirCobrancasPixPendentes`, no poll do balcão ou no fluxo
  de confirmação manual — todos continuam chamando a mesma função, sem saber que ela agora
  também gera rascunho.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Sintético ponta a ponta** (`scripts/teste-250-rascunho-pagamento.ts`, mantido no repo) —
  chama `confirmarPedidosPagosPorOrder` DIRETO com uma `OrderMP` sintética (a função não faz
  nenhuma chamada à API do Mercado Pago sozinha, só recebe o objeto já pronto — testável 100%
  sem gerar cobrança real):
  - Pedido único: confirmado corretamente (`pagamento_confirmado`/`forma_pagamento`/`origem`),
    exatamente 1 rascunho gerado, citando o serviço e o valor certos.
  - Reprocessar a MESMA order (idempotência, já coberta pelo filtro `pagamento_confirmado=false`
    já existente): retorna 0, nenhum rascunho duplicado.
  - 2 pedidos com o mesmo `venda_id`: confirmados juntos, **1 rascunho combinado** (não 2
    separados), citando os 2 itens e o total certo (4,50+40,00=44,50).
  - Pedido de balcão (`telefone='balcao'`): confirmado normalmente, **nenhum rascunho gerado**.
  - Todo o dado sintético (pedidos + rascunhos) apagado ao final.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo — a investigação já tinha sido feita a fundo no checkpoint, sem achados adicionais
durante a implementação.

### Status final: concluída
Texto corrigido e rascunho automático em produção, testado sinteticamente sem gerar nenhuma
cobrança real. Mensagem que o cliente recebe não promete mais nada que o sistema não cumpre.
