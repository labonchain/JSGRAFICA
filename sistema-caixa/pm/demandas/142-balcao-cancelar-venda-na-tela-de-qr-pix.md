# 142 — Balcão: tela de QR Pix precisa de "Cancelar" de verdade, não só "Fechar"

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam testou a tela de QR code do balcão (demanda 141, Fase 3) ao vivo (2026-07-09) e notou:
só existe o botão **"Fechar (confirmação continua automática)"** — que só esconde o modal, mas a
venda (já criada em `jsgrafica_pedidos`, `pagamento_confirmado: false`, com `mp_order_id`
vinculado) continua pendente pra sempre, esperando confirmação automática. Não existe nenhum
"Cancelar" que desfaça a venda de verdade — se o operador abriu por engano, ou o cliente desistiu
de pagar, não tem como voltar atrás pela tela.

## Objetivo
A tela de QR Pix do balcão ganha um botão "Cancelar" que cancela a venda de verdade (mesmo
padrão já usado em outros lugares do sistema — demanda 112, `cancelarPedido`), ao lado de
"Fechar" (que continua existindo, pra quem só quer minimizar sem cancelar).

## Escopo
- Incluído:
  1. Nos 2 balcões (`app/page.tsx` e `app/pdv/page.tsx`), adicionar botão **"Cancelar venda"** no
     modal de QR Pix, com confirmação (`confirm()`, mesmo padrão simples já usado em outros
     cancelamentos do projeto).
  2. Cancelar chama o mesmo mecanismo de `cancelarPedido` (`lib/supabase-admin.ts`, demanda 112)
     pro(s) pedido(s) da venda — reverte qualquer saída vinculada, mesma lógica já testada.
  3. Não precisa (nem deve) chamar nenhuma API do Mercado Pago pra "cancelar" a cobrança em si —
     um Pix não pago simplesmente expira sozinho lá; cancelar aqui é só sobre o nosso pedido.
  4. Depois de cancelar, fechar o modal e voltar a tela de venda pro estado inicial (carrinho
     vazio, like um "Cancelar" normal de venda).
- Fora de escopo: qualquer mudança na lógica de geração de cobrança ou confirmação automática
  (141) — intocadas.

## Critérios de aceite
- [ ] Botão "Cancelar venda" aparece no modal de QR Pix, ao lado de "Fechar"
- [ ] Cancelar marca o(s) pedido(s) como cancelado, reverte saída vinculada se houver
- [ ] Depois de cancelar, a tela volta pro estado de venda vazia
- [ ] "Fechar" continua funcionando igual (só esconde, não cancela) — sem regressão

## Referências
Esta conversa (2026-07-09) — teste ao vivo do Edvam na Fase 3 (demanda 141). `lib/supabase-admin.ts`
(`cancelarPedido`, demanda 112) — reaproveitar, não duplicar lógica.

## Relato de execução
Executada em 2026-07-09 (03 - APP JS GRAFICA, Fable 5). Deploy em produção verificado
(`dpl_Ak6vbBAT5cG3CmgkkuurJZ4gDTe5`).

### O que foi feito
1. **API — `app/api/pedidos/route.ts` (PATCH):** o branch de cancelamento agora aceita
   `{ vendaId, status: 'cancelado', operador }` além do `id` unitário que já existia.
   Com `vendaId`, busca todos os pedidos da venda com `status != 'cancelado'` e roda
   `cancelarPedido()` (demanda 112, reaproveitada — reverte saída vinculada) em cada um.
   Responde `{ success: true, cancelados: N }`; 404 se a venda não existe ou já está toda
   cancelada; 400 se faltar id/vendaId. Nenhuma chamada ao Mercado Pago — o QR não pago
   expira sozinho lá, conforme o escopo.
2. **Balcões — `app/page.tsx` e `app/pdv/page.tsx` (mudanças idênticas):**
   - Estado `cobrancaPix` ganhou `vendaId` (gravado nos 2 pontos que abrem o modal,
     inclusive no estado de erro de geração do QR).
   - Nova função `cancelarVendaPix()`: `confirm()` ("Cancelar esta venda? O pedido será
     cancelado (o QR não pago expira sozinho).") → PATCH por vendaId → fecha o modal e
     mostra feedback "Venda cancelada." (a tela de venda já volta vazia porque o carrinho
     é limpo na confirmação da venda, antes do QR).
   - Botão **"Cancelar venda"** (vermelho) ao lado de **"Fechar"** nos estados
     *aguardando pagamento* e *QR indisponível* (a venda também fica pendente nesse caso).
     O texto longo do Fechar virou uma legenda: "Fechar só esconde — a confirmação
     automática continua valendo." No estado *pago* não há Cancelar (não faz sentido).

### Testes
- **API (local, dados sintéticos, limpos depois):** venda com 2 pedidos, um com saída
  vinculada → cancelou os 2, `cancelado_por` gravado, saída vinculada revertida (deletada);
  repetir na mesma venda → 404; vendaId inexistente → 404; sem id/vendaId → 400; PATCH de
  status normal sem id → 400 (guarda nova, sem regressão no fluxo unitário).
- **UI local (admin, Playwright, sandbox):** 3 vendas Pix reais no balcão —
  (1) "Fechar" só esconde: pedido continuou ativo no banco ✓ (regressão);
  (2) "Cancelar venda" com confirm aceito: modal fechou, feedback exibido, pedido
  `cancelado` no banco ✓; (3) confirm recusado: nada acontece, modal continua ✓.
- **UI produção (pdv.jsgrafica.site, Playwright, sandbox):** venda Pix real no PDV →
  QR gerado, botões lado a lado (screenshot), cancelamento confirmado no banco
  (`cancelado_por: Edvam`) ✓.
- `npx tsc --noEmit` e `npm run build` limpos. Deploy `npx vercel --prod --yes` → Ready.
- Limpeza: 4 pedidos sintéticos deletados, 4 orders sandbox canceladas no MP,
  saída sintética revertida pelo próprio fluxo. Nenhum dado real tocado.

### Critérios de aceite
- [x] Botão "Cancelar venda" no modal de QR Pix, ao lado de "Fechar" (nos 2 balcões)
- [x] Cancela o(s) pedido(s) da venda e reverte saída vinculada (via `cancelarPedido`, 112)
- [x] Depois de cancelar, a tela volta pro estado de venda vazia
- [x] "Fechar" continua só escondendo — sem regressão (testado explicitamente)
