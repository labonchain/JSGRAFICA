# 154 — Jornada do pedido — Fase 4/5: travar avanço sem pagamento confirmado (unificado, sem exceção por forma)

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA (Fable 5 — mesmo padrão das fases 3/141-148, risco financeiro real)

## Contexto — plano geral (Fases 1-3 concluídas e validadas)
1. Forma de pagamento vira escolha do pedido — 137/138 ✅
2. Tipo de entrega vira escolha explícita — 139/140 ✅
3. Cobrança Pix real generalizada (qualquer canal/momento) + QR no balcão + RecargaPay pro
   Recarga (VEM/celular) — 141/142/145/146/147/148 ✅

O Edvam confirmou em 2026-07-09: mesmo pagamento em dinheiro deve passar pela mesma confirmação
explícita das outras formas, sem caso especial — "acho que unifica vai facilitar dar mais
garantia pra todo fluxo".

**Achado real que motiva o escopo desta fase** (documentado no relato da 141): pedido de balcão
"retira depois" + Pix **não gera cobrança nenhuma** (sem canal pro QR ainda) — hoje esse pedido
pode ser marcado "entregue" sem NENHUMA checagem de pagamento, porque a função que trava isso,
`precisaConfirmarPagamento` (`components/TelaPedidos.tsx:123`), **exclui de propósito todo pedido
`pos_producao`** (balcão) da checagem — a exclusão fazia sentido quando balcão só existia
dinheiro/cartão pago na hora (066), mas ficou obsoleta desde que a 141 abriu a possibilidade de
Pix sem cobrança gerada nesse fluxo.

Hoje a checagem (`precisaConfirmarPagamento(status, pagamentoTipo, pagamentoConfirmado)`) só
dispara em UM ponto: a transição pra `entregue` — e só pra `pre_producao`/`flexivel`. A transição
`confirmado → em_producao` (início da produção) **não tem nenhuma checagem**, nem no frontend nem
no backend (`PATCH /api/pedidos` grava o status sem validar `pagamento_confirmado` nunca — só
grava a confirmação SE `formaPagamento` vier no corpo, mas não exige isso pra avançar).

## Objetivo
Uma regra só, sem exceção por forma de pagamento nem por canal: nenhum pedido avança de
"confirmado" pra "em produção" — nem chega a "entregue"/"aguardando retirada→entregue" — com
`pagamento_confirmado = false`. Quem já pagou (dinheiro/cartão na hora do balcão, Pix já
confirmado por MP/RecargaPay) não sente fricção nenhuma — o gate só age quando NADA confirmou
ainda, e a confirmação na hora usa o mesmo modal que já existe.

## Escopo
- Incluído:
  1. **Simplificar `precisaConfirmarPagamento`**: remover a condição de `pagamentoTipo`
     (hoje só `pre_producao`/`flexivel`) — passa a checar **só** `!pagamentoConfirmado`, pra
     qualquer pedido. Documentar no código por que a exclusão de `pos_producao` saiu (fechava mal
     o caso real do parágrafo acima).
  2. **Novo gatilho**: a mesma checagem/modal (`ModalConfirmarPagamento`, já existe, não recriar)
     passa a disparar também na transição `confirmado → em_producao` — hoje só disparava em
     `→ entregue`. Aplicar nos dois lugares que já chamam essa função (`TelaPedidos.tsx` e
     `TelaInbox.tsx`, reaproveitando a exportação da 089).
  3. **Reforço no backend** (`PATCH /api/pedidos`): rejeitar (400, mensagem clara) uma transição
     de status pra `em_producao`/`pronto`/`aguardando_retirada`/`entregue` quando
     `pagamento_confirmado = false` **e** a requisição não vier com `formaPagamento` (que já
     confirma e avança atomicamente, mecanismo da 113 reaproveitado sem mudança). Hoje esse PATCH
     não valida nada — só a UI avisa; um PATCH direto passa batido.
  4. **Não mexer no que já funciona**: dinheiro/cartão do balcão continuam confirmando na hora da
     venda (066) — chegam em qualquer transição já com `pagamento_confirmado = true`, o gate não
     interrompe esse fluxo. Pix com cobrança real (Mercado Pago ou RecargaPay, 141-148) continua
     confirmando pela via própria (poll ou confirmação manual do popup) — o gate só entra em ação
     quando nada confirmou ainda.
  5. **Pedidos já em andamento não são travados retroativamente**: o gate vale só pra transição
     nova a partir do deploy — pedido que já está em `em_producao`/`pronto` hoje não precisa
     "voltar" pra ser confirmado.
- Fora de escopo (fica pra Fase 5, próxima demanda, só depois desta validada): fazer o balcão
  passar pelos status `confirmado`/`em_producao`/`pronto` (hoje ele nasce direto em
  `entregue`/`aguardando_retirada`, pulando a esteira) — esta fase só garante que a REGRA já
  esteja unificada e genérica, pronta pra cobrir o balcão automaticamente assim que a Fase 5 o
  colocar na mesma esteira, sem precisar de lógica nova de gate nessa hora.

## Critérios de aceite
- [ ] Pedido Inbox `pre_producao`/`flexivel` sem pagamento confirmado não avança pra
      `em_producao` sem passar pelo modal (mesmo comportamento que já existia em `→entregue`,
      agora também aqui)
- [ ] Pedido balcão "retira depois" + Pix sem cobrança/confirmação não vira "entregue" sem passar
      pelo modal (fecha o gap real documentado na 141)
- [ ] Pedido balcão dinheiro/cartão pago na hora continua avançando sem nenhuma fricção nova
      (regressão)
- [ ] Pix com cobrança real (MP ou RecargaPay) confirmado automaticamente continua avançando sem
      pedir confirmação manual redundante (regressão)
- [ ] `PATCH` direto tentando avançar pedido não confirmado é rejeitado (400); com `formaPagamento`
      junto, confirma e avança na mesma chamada (mesmo mecanismo da 113)
- [ ] Testado nos dois canais com pelo menos 1 caso real de cada situação acima

## Riscos e cuidados
- Dinheiro real, fluxo de produção real — testar exaustivamente com dado sintético antes de
  qualquer teste em produção real; produção só depois de validação completa em ambiente local.
- Cuidado pra não travar pedido legado em andamento (ver item 5 do escopo) — testar
  especificamente contra pedido criado antes do deploy, já em `em_producao`/`pronto`.
- Simplificar `precisaConfirmarPagamento` é uma mudança de regra, não só de gatilho — confirmar
  que nenhum outro chamador dependia da exclusão de `pos_producao` antes de tirar (grep completo).

## Referências
Demandas 137-148 (plano completo da jornada). Demandas 072/089/113 (origem do modal e da
checagem que esta fase generaliza). Demanda 141 (achado documentado do gap balcão retirada+Pix
que motiva a simplificação do item 1).

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_7D18smyTifsteZVYZ5VcLS9qKWYT`,
gate do backend provado em produção com PATCH real (400 → com forma → avançou).

### O que foi feito
1. **`precisaConfirmarPagamento` unificada** (`components/TelaPedidos.tsx`): a exclusão de
   `pos_producao` (066/113) saiu — ela assumia balcão sempre pago na hora, obsoleto desde o gap
   real da 141 (retira depois + Pix sem cobrança). Grep completo antes de tirar (exigência da
   demanda): 5 chamadores, todos com o mesmo padrão "abre modal ou executa" — nenhum dependia da
   exclusão. Assinatura simplificada pra `(status, pagamentoConfirmado)`; os 5 call sites
   (3 na TelaPedidos, 2 na TelaInbox via exportação da 089) atualizados.
2. **Gate em TODAS as transições de avanço** — `STATUS_AVANCO_COM_GATE = em_producao / pronto /
   aguardando_retirada / entregue` (exportado). **Decisão do executor além do mínimo do escopo**
   (que citava `confirmado → em_producao`): o conjunto do front é o MESMO que o backend rejeita —
   se divergissem, um avanço legítimo (ex. legado não pago em `em_producao → pronto`) viraria 400
   seco na tela em vez de modal. Com o conjunto igual, o modal SEMPRE intercepta antes.
3. **Reforço no servidor** (`PATCH /api/pedidos`): transição pra qualquer status do conjunto com
   `pagamento_confirmado = false` e SEM `formaPagamento` → 400 com mensagem clara. Com
   `formaPagamento`, confirma e avança atomicamente — mecanismo da 113, zero mudança nele.
   Cancelamento e transições sem avanço (ex. `aguardando_confirmacao → confirmado`) fora do gate.
4. **Item 5 (legado)**: pedido em andamento não regride nem trava — ao AVANÇAR, passa pelo mesmo
   modal e confirma na hora (T5/U-fluxos). Impacto real medido antes do deploy: 40 pedidos não
   pagos em andamento, todos `pronto`/`aguardando_retirada` + `flexivel` — **esses já passavam
   pelo modal no `→entregue` de hoje** (gate antigo cobria flexivel); nenhum pedido real atual
   muda de comportamento, e não existe nenhum não pago em `confirmado`/`em_producao` agora.

### Testes (sintéticos, todos apagados; nenhum dado real tocado)
**API (7 casos):** não pago → `em_producao` sem forma → 400; com `formaPagamento: Pix` → avançou
E confirmou (origem `manual`) na mesma chamada; pago → avança sem fricção e SEM sobrescrever
forma; **o gap real da 141** (balcão `pos_producao` retira-depois+pix não pago → `entregue`) →
400 sem forma / entregue+pago com forma; legado `em_producao` não pago → `pronto` → 400/ok;
transição sem gate passa; cancelamento de não pago passa (branch próprio).
**UI (Playwright, 4 cenários + banco):** modal "Pagamento pendente" abrindo em "Iniciar
produção" (gatilho NOVO — antes só em entregue) e avançando+pagando ao confirmar; modal no
"Marcar entregue" do caso do gap (screenshot — pedido pós-produção de balcão, antes passava
batido); **regressão**: pedido pago avançou pra entregue SEM modal nenhum; card do Inbox
("Avançar → Em produção") abrindo o mesmo modal e Cancelar deixando o pedido intacto.
**Regressão Pix automático:** o gate lê SÓ `pagamento_confirmado` — pedido confirmado por
MP/RecargaPay chega `true` e cai no mesmo caminho do teste "pago → sem fricção" (provado em T3/U3).
**Produção:** PATCH direto na API real sem forma → 400; com forma → entregue+pago origem manual
(pedido sintético, apagado em seguida).

### Critérios de aceite
- [x] Inbox `pre_producao`/`flexivel` não pago não inicia produção sem modal (U1/U4)
- [x] Balcão retira-depois+Pix sem cobrança não vira entregue sem modal (T4/U2 — gap da 141 fechado)
- [x] Balcão dinheiro/cartão pago na hora avança sem fricção nova (T3/U3)
- [x] Pix confirmado automaticamente avança sem confirmação redundante (mesmo caminho de T3/U3)
- [x] PATCH direto rejeitado (400); com `formaPagamento` confirma e avança atômico (T1/T2 + produção)
- [x] Testado nos 2 canais com casos reais de cada situação (7 de API + 4 de UI)

**Fase 5 (balcão na mesma esteira) NÃO iniciada — aguardando validação do PM desta fase.** A
regra já está genérica: quando a Fase 5 puser o balcão em `confirmado → em_producao → ...`, o
gate cobre automaticamente, sem lógica nova.
