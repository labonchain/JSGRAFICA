# 197 — Perguntar gaveta de destino também na confirmação posterior de pagamento em Dinheiro

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: 2026-07-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 196 resolveu o caso da venda nova no balcão: quando o Edvam (sem gaveta própria) vende
em Dinheiro, o sistema pergunta pra qual gaveta (Zu/Gabi) esse dinheiro vai, e isso conta certo
no "esperado" de cada uma. Achado registrado no relato da 196: existe um SEGUNDO caminho pelo
mesmo problema — a confirmação POSTERIOR de pagamento em Dinheiro (aba Pedidos/Atendimento, o
modal da demanda 113, usado quando um pedido nasce com pagamento pendente e alguém confirma
depois) ainda não pergunta nada — se for o Edvam confirmando, o dinheiro continua caindo no
mesmo limbo que a 196 resolveu pro outro caminho.

## Objetivo
Confirmar pagamento em Dinheiro pela aba Pedidos/Atendimento também pergunta pra qual gaveta o
dinheiro vai, quando quem confirma não tem gaveta própria — mesmo comportamento da 196, outro
ponto de entrada.

## Escopo
- Incluído: no modal de confirmação de pagamento (demanda 113, usado em `TelaPedidos.tsx` e no
  Inbox) — quando a forma escolhida for Dinheiro e o operador logado não tiver gaveta própria
  (mesmo critério da 196: papel admin), perguntar "vai pra gaveta de quem?" antes de confirmar,
  e gravar em `gaveta_destino` (mesma coluna e mesma lógica já criadas na 196 — reaproveitar,
  não duplicar).
- Zu/Gabi confirmando pagamento: zero mudança, mesmo critério da 196.
- Explicitamente fora de escopo: qualquer outro caminho de confirmação além deste e do já
  coberto pela 196 — se aparecer um terceiro, registrar achado, não resolver aqui.

## Critérios de aceite
- [ ] Confirmar pagamento em Dinheiro pela aba Pedidos, sendo Edvam, pergunta a gaveta
- [ ] Zu/Gabi confirmando: sem mudança
- [ ] `gaveta_destino` gravado corretamente, mesma coluna da 196
- [ ] `getTotalDinheiroRecebidoOperador` já conta certo sem mudança adicional (reaproveita o
      COALESCE da 196)
- [ ] Testado com pedido sintético confirmado pelo Edvam por este caminho

## Riscos e cuidados
Reaproveitar a coluna/lógica da 196 — não criar um segundo mecanismo paralelo.

## Referências
Demanda 196 (mecanismo original, achado registrado no relato). Demanda 113 (modal de confirmação
de pagamento original).

## Relato de execução
Executada em 2026-07-16 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_AtkvLquAHLGdXeLQKzeju7TpgN4h`.

### O que foi feito (reaproveitando 100% a coluna/lógica da 196, como pedido)
O `ModalConfirmarPagamento` (`components/TelaPedidos.tsx`) é o ÚNICO ponto de entrada da
confirmação posterior (demanda 113) — usado em `PainelDetalhe`, `PainelDetalheVenda` (item
único e o lote da 192), `CardFila` (TelaPedidos.tsx) e nos dois fluxos do Atendimento
(`TelaInbox.tsx`, item único e a venda inteira da 190). Corrigir o modal em UM lugar já cobre
todos os call sites — nenhum mecanismo paralelo foi criado.
1. **`ModalConfirmarPagamento` ganhou `perguntarGaveta?: boolean`**: quando true e a forma
   escolhida é Dinheiro, mostra o mesmo bloco âmbar "vai pra gaveta de quem?" da 196 (Zu/Gabi);
   `onConfirmar` ganhou o 3º parâmetro opcional `gavetaDestino`; Confirmar trava até escolher.
2. **Todos os 6 call sites** passaram a passar `perguntarGaveta={isAdmin}` (TelaPedidos.tsx,
   mesmo critério já usado pra outras coisas nesta tela) ou `perguntarGaveta={operador.papel
   === "admin"}` (TelaInbox.tsx) e a repassar `gavetaDestino` adiante (`executarAvanco` /
   `executarAvancoLote` / `executarAvancoPedido` / `executarAvancoItemVenda` /
   `executarAvancoVendaInteira` → `onMudar`/`onMudarLote` → PATCH).
3. **Backend** (`app/api/pedidos/route.ts`, PATCH, caminho "113" via `formaPagamento`): grava
   `gaveta_destino` na MESMA coluna da 196, só no ramo que confirma pagamento pela 1ª vez
   (`pagamento_confirmado` ainda false) — revalidado no servidor (nunca confia só na UI): só
   grava com `formaPagamento === 'Dinheiro'` e valor `'Zu'`/`'Gabi'`, senão fica null. Pedido já
   confirmado (proteção da 180) nunca tem `gaveta_destino` tocado — mesma regra da forma.
4. **`getTotalDinheiroRecebidoOperador` não mudou nada** (critério 4) — já lê pela mesma coluna
   desde a 196 (`COALESCE(gaveta_destino, pedido_criado_por)`), reaproveitada tal e qual.
5. Nos avanços em LOTE (192 e o da 190 no Atendimento), `gavetaDestino` segue a MESMA regra que
   já existia pra `formaPagamento`: só vai pros itens sendo confirmados AGORA (item já pago não
   recebe nada disso).

### Testes
**API** (pedido sintético do Edvam, não pago, avançando por este caminho — o "113"):
- `PATCH {status, formaPagamento:'Dinheiro', gavetaDestino:'Gabi'}` → `gaveta_destino: 'Gabi'`
  gravado; `/api/fechamento?operador=Gabi` passou a incluir o valor, `?operador=Edvam` não.
- Regressão Zu: confirma sem `gavetaDestino` → `gaveta_destino: null`, comportamento idêntico
  ao de antes da 197.
- Proteção 180 intacta: tentativa de reconfirmar (forma E gaveta diferentes) em pedido JÁ pago
  não muda nada — nem a forma nem a gaveta ficam como estavam (Dinheiro/Gabi preservados).

**UI (Playwright, aba Pedidos, pedido sintético do Edvam)**: avançar status de pedido não pago
→ modal "Pagamento pendente" → escolher Dinheiro → seletor de gaveta aparece (Edvam é admin) →
Confirmar trava sem escolha → libera ao escolher "Gaveta da Zu" → confirma → avança pra "Em
produção". Banco conferido no fim: `forma_pagamento: Dinheiro`, `gaveta_destino: Zu`.

Todos os 3 pedidos sintéticos apagados depois.

### Achado fora de escopo (registrado, não resolvido)
Nenhum terceiro caminho de confirmação apareceu durante a implementação — os únicos dois
existentes (venda nova, 196; confirmação posterior via modal 113, aqui) estão cobertos.
