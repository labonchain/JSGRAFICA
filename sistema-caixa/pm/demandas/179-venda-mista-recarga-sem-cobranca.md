# 179 — Venda mista (recarga + produto comum) no Pix deixa a recarga sem cobrança

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Auditoria do PM (2026-07-15): numa venda com recarga (VEM/celular) **misturada** com item comum,
tudo pago no Pix, a parte da recarga fica sem qualquer instrução de pagamento e sem caminho de
confirmação. `app/api/mercadopago/cobranca/route.ts` e `app/api/pedidos/route.ts` só tratam "100%
recarga" (chave estática RecargaPay) e "sem recarga nenhuma" (cobrança MP cobre tudo) — o caso
misto cai num meio-termo onde `pixRecargaPay` nunca é populado e o item de recarga nunca recebe
`mp_order_id`. No balcão, o popup nem liga a instrução de pagamento da recarga
(`onConfirmarPagamento` só é usado quando é 100% recarga). Zero ocorrências no banco até agora —
bug de código real, ainda não bateu na prática.

## Objetivo
Venda mista com recarga e Pix escolhido cobra (ou instrui claramente) as duas partes — não deixa a
recarga "pendente" sem ninguém saber o motivo.

## Escopo
- Incluído: em `app/api/mercadopago/cobranca/route.ts` e `app/api/pedidos/route.ts`, tratar o
  terceiro caso (misto: recarga + item comum, Pix escolhido) — decisão do executor sobre a forma
  exata (duas cobranças separadas, uma tela com duas instruções, etc.), desde que o item de
  recarga fique com uma forma clara de ser confirmado como pago.
- Na UI do balcão (`app/page.tsx`/`app/pdv/page.tsx`), garantir que o popup de pagamento mostre a
  instrução da recarga também quando a venda for mista, não só quando for 100% recarga.
- Explicitamente fora de escopo: mudar os 2 casos que já funcionam (100% recarga, sem recarga).

## Critérios de aceite
- [ ] Venda mista com Pix escolhido dá instrução de pagamento clara pras duas partes
- [ ] O item de recarga tem um jeito de ser confirmado como pago (manual ou automático)
- [ ] Testado com uma venda sintética misturando recarga + produto comum, Pix

## Riscos e cuidados
Nenhum dado real afetado ainda (0 ocorrências) — testar bem antes de considerar concluído, já que
mexe em dinheiro (RecargaPay + Mercado Pago simultâneos).

## Referências
`app/api/mercadopago/cobranca/route.ts:39-60`, `app/api/pedidos/route.ts:260-272`,
`app/page.tsx:561,745`. Demanda 147 (RecargaPay original). Achado da auditoria de pagamento do PM,
2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### Forma escolhida (decisão do executor)
A cobrança MP continua cobrindo SÓ os itens comuns (comportamento da 147, intocado) e a
resposta ganha um bloco `recarga` (valor, ids dos itens de recarga ainda não pagos, chave/
titular/QR estáticos do RecargaPay) — **uma tela com as duas instruções**, e a recarga com
confirmação manual própria (por id, nunca a venda inteira — senão confirmaria o que o MP ainda
não cobrou).

### O que foi feito
1. `POST /api/mercadopago/cobranca` (balcão): no caso misto devolve `recarga` junto do QR do MP
   — inclusive no reaproveitamento idempotente de cobrança viva.
2. `POST /api/pedidos` (Criar pedido do Inbox, misto): popup (`cobrancaPix.recarga`) + o
   rascunho ganha uma 3ª mensagem com o Pix separado da recarga (chave CNPJ + valor +
   comprovante — o fluxo manual do RecargaPay).
3. `ModalQrPix`: seção laranja "➕ Recarga: R$X vai num Pix SEPARADO", com "não cobre a
   recarga" explícito, copiar o Pix estático e botão "✓ Recarga paga — conferi no RecargaPay"
   (só balcões; no Inbox o texto aponta pra confirmação depois na aba Pedidos). A seção
   persiste até na tela de "Pagamento confirmado!" do MP — o sucesso do Pix comum não esconde
   a recarga pendente.
4. Balcões (admin e PDV): `confirmarRecargaMista()` confirma item a item por id (PATCH
   `confirmarPagamento` da 147) e tira a seção da tela.

### Testes (sintéticos; as 3 cobranças MP de teste NUNCA foram pagas — expiram sozinhas em 24h, zero dinheiro movido)
- Balcão via API: venda mista R$0,50+R$0,50 → order MP de **R$0,50** (só o comum), `mp_order_id`
  gravado SÓ no item comum (SQL), bloco `recarga` com o id certo; 2ª chamada → `reaproveitada`
  com a recarga ainda presente; confirmação por id → `confirmados: 1` (só a recarga).
- Balcão via UI (Playwright): venda real mista (recarga R$20 + avulso R$0,30) → popup com QR do
  MP de R$0,30 + seção da recarga R$20 (screenshot no relato de testes), botão confirmou e a
  seção sumiu.
- Inbox via API: 2 itens (papel + recarga) → order MP de R$0,30, `cobrancaPix.recarga` na
  resposta e rascunho com as 3 mensagens (confirmação + Pix MP + Pix da recarga) — conferido no
  banco.
- Casos que já funcionavam: 100% recarga e sem recarga ficam nos mesmos branches, intocados.
Tudo apagado (pedidos, rascunhos); nenhum dado real afetado.
