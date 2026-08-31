# 196 — Perguntar qual gaveta recebe o dinheiro quando quem vende não tem gaveta própria

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Investigação do PM (2026-07-16), a partir da pergunta do Edvam sobre por que o caixa físico de
Zu e Gabi quase sempre fecha com dinheiro A MAIS do que o sistema esperava (11 de 12 dias
fechados, sempre positivo — nunca negativo, sinal de algo sistemático, não erro de contagem
aleatório). Achado: `pedido_criado_por` decide de qual gaveta é o dinheiro esperado
(`getTotalDinheiroRecebidoOperador`, filtra por operador), mas o **Edvam não tem gaveta física
própria** — quando ele atende no balcão (não fica lá, mas atende quando precisa), o dinheiro que
ele recebe fisicamente vai pra gaveta de quem está lá (normalmente a mesa da Zu, que é no
balcão), mas o sistema atribui a venda a "Edvam" — esse dinheiro nunca entra no "esperado" de
ninguém, e sobra na contagem física de quem realmente guardou. Confirmado com dado real: hoje
(15/07) o Edvam criou R$484,30 em vendas de Dinheiro; a Zu sozinha bateu exatamente o esperado
dela nos PRÓPRIOS pedidos (R$50,05 = R$50,05), mas fechou com R$96,60 a mais fisicamente — a
suspeita é dinheiro do Edvam caindo na gaveta dela sem ser contado.

## Objetivo
Quando alguém sem gaveta física própria (hoje, só o Edvam) confirma uma venda em Dinheiro, o
sistema pergunta pra qual gaveta esse dinheiro está indo — e esse valor passa a contar no
"esperado" da gaveta certa.

## Escopo
- Incluído: no fluxo de confirmar venda/pagamento em Dinheiro, quando o operador logado for
  alguém sem `jsgrafica_abertura_caixa` do dia (hoje, só Edvam) — perguntar explicitamente "essa
  venda em dinheiro vai pra gaveta de: Zu / Gabi" antes de finalizar. O valor escolhido determina
  pra qual operador esse dinheiro conta em `getTotalDinheiroRecebidoOperador` (campo novo, ex.
  `gaveta_destino`, separado de `pedido_criado_por` — não trocar quem criou o pedido, só pra
  quem é o dinheiro).
- **Zu e Gabi continuam exatamente como hoje** — zero pergunta nova, zero clique a mais, quando
  são elas que estão vendendo (elas têm gaveta própria, não tem ambiguidade).
- Só se aplica a pagamento em **Dinheiro** — Pix/Cartão não têm gaveta física, sem mudança.
- Explicitamente fora de escopo: mudar a lógica de quem pode ver/editar cada tela, ou dar ao
  Edvam uma "gaveta própria" (ele não tem uma fisicamente, não faz sentido criar uma fictícia).

## Critérios de aceite
- [ ] Zu/Gabi vendendo em Dinheiro: nenhuma mudança visível, mesmo fluxo de hoje
- [ ] Edvam vendendo em Dinheiro: pergunta "vai pra gaveta de: Zu / Gabi" antes de confirmar
- [ ] O valor escolhido entra no "esperado" (`getTotalDinheiroRecebidoOperador`) da gaveta certa
- [ ] Testado com pedido sintético do Edvam escolhendo cada uma das 2 gavetas

## Riscos e cuidados
Não confundir `pedido_criado_por` (quem lançou/atendeu) com o campo novo (pra quem é o
dinheiro) — são conceitos diferentes agora.

## Referências
`lib/supabase-admin.ts` (`getTotalDinheiroRecebidoOperador`). Achado real: pedidos de hoje
(15/07) do Edvam em Dinheiro somando R$484,30, e o padrão histórico de divergência sempre
positiva nas gavetas de Zu/Gabi (12 fechamentos conferidos, 11 positivos).

## Relato de execução
Implementada e testada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_C5ZvohQzgtZeub9k66nHa8baqQxy`.

### O que foi feito
1. **Coluna nova `gaveta_destino`** em jsgrafica_pedidos (migration
   `add_gaveta_destino_pedidos_196` — JÁ APLICADA no banco; inofensiva antes do deploy, é
   nullable e nada a lê em produção ainda). Conceito separado de `pedido_criado_por`, como a
   demanda exigiu: quem atendeu ≠ de quem é o físico.
2. **`getTotalDinheiroRecebidoOperador`**: o dinheiro conta pra
   `COALESCE(gaveta_destino, pedido_criado_por)` — com destino escolhido vale a gaveta; sem
   (Zu/Gabi e todo o histórico) vale o criador, comportamento de sempre.
3. **POST do balcão** aceita `gavetaDestino` e valida de novo no servidor: só 'Zu'/'Gabi' e SÓ
   quando a forma é Dinheiro (Pix/Cartão ignoram mesmo que a UI mande).
4. **UI nos 2 balcões** (admin e PDV — o Edvam consegue logar nos dois): quando o operador é
   papel admin (= não tem gaveta física própria) e a forma é Dinheiro, aparece o bloco âmbar
   obrigatório "💵 Esse dinheiro vai pra gaveta de quem? Zu / Gabi" e o ✓ Confirmar fica
   TRAVADO até escolher. Zu/Gabi (papel atendente): zero mudança, zero clique (critério 1).
   Decisão documentada: o critério é o PAPEL (admin = sem gaveta própria), não "sem abertura
   do dia" — determinístico, sem fetch extra, e cobre exatamente o caso real; se um dia surgir
   outro operador sem gaveta, é 1 linha.

### Testes (sintéticos com centavos únicos; tudo apagado)
- Venda do Edvam Dinheiro R$0,37 → gaveta Zu: o esperado da Zu (/api/fechamento?operador=Zu)
  subiu de 50,05 pra **50,42**, e o do Edvam ficou em **exatamente os R$484,30 citados na
  demanda** (sem os 0,37) — a prova do mecanismo inteiro, com os números reais do achado.
- Gaveta Gabi: 120,80 → **121,21** (+0,41) ✓ (critério 4, as duas gavetas).
- Regressões: venda da Zu → `gaveta_destino` null e conta pra ela como sempre; venda
  Cartão com gavetaDestino mandado → null (servidor ignora).
- UI (Playwright, balcão admin): seletor âmbar visível com Dinheiro, ✓ Confirmar travado até
  escolher, liberado após, venda gravada com gaveta_destino='Gabi' no banco (screenshot).

### Achados fora de escopo (registrados pro PM)
1. **Confirmação POSTERIOR de pagamento em Dinheiro** (aba Pedidos/Atendimento — o modal da
   113) feita pelo Edvam ainda cai no limbo antigo: o dinheiro conta pra ele. É o mesmo
   conceito, outro ponto de entrada — candidata a demanda irmã.
2. **Histórico não corrigido de propósito**: os R$484,30 de hoje (e dias anteriores) do Edvam
   continuam atribuídos a ele — reatribuir gaveta retroativamente é decisão do Edvam (não dá
   pra saber de qual gaveta cada venda antiga saiu). A partir do deploy, o problema para de
   crescer.

### Deploy
Feito e confirmado no ar em 2026-07-15 — `dpl_C5ZvohQzgtZeub9k66nHa8baqQxy` (aliases admin.jsgrafica.site e pdv.jsgrafica.site apontando pra ele). A 193 foi revertida pelo PM antes deste deploy (ver relato da 193 — trabalho preservado em backup), então este deploy sobe SÓ 195+196.