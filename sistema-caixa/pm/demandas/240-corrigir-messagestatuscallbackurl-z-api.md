# 240 — Corrigir `messageStatusCallbackUrl` da Z-API da JS Gráfica (apontando pro cliente errado)

Status: concluída
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam: corrigir só o lado da JS Gráfica, sem mexer no BIOBOTS)
Concluída em: 2026-07-29
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 239, confirmado com a própria API da Z-API (não presumido): a instância da JS
Gráfica tem `messageStatusCallbackUrl` apontando pra
`https://n8n.labonchain.xyz/webhook/biobotsstatusmsg` — o webhook de outro cliente da mesma
infraestrutura (BIOBOTS), não o da própria JS Gráfica
(`https://n8n.labonchain.xyz/webhook/jsgraficastatusmsg`, que é o mesmo webhook do workflow
`03 - STATUS MSG`, já confirmado correto no campo `deliveryCallbackUrl`). Isso explica por que
`read_at` nunca foi preenchido em nenhuma das 16.474 mensagens enviadas na tabela
`jsgrafica_log_msgs_privadas` — o evento de "mensagem lida" nunca chega em nenhum workflow da JS
Gráfica.

**Decisão do Edvam (2026-07-29)**: corrigir só o lado da JS Gráfica agora. Não investigar nem
mexer na configuração do BIOBOTS (fora do escopo deste projeto).

## Objetivo
`messageStatusCallbackUrl` da instância Z-API da JS Gráfica passa a apontar pro webhook correto
da própria gráfica, e `read_at` volta a ser preenchido em mensagens novas.

## Escopo
- Incluído: atualizar `messageStatusCallbackUrl` na configuração da instância Z-API da JS Gráfica
  pra `https://n8n.labonchain.xyz/webhook/jsgraficastatusmsg` (mesmo endpoint do
  `deliveryCallbackUrl`, que já está correto — o workflow `03` já trata os dois tipos de evento,
  `DeliveryCallback` e `ReadCallback`, confirmado na 239).
- Incluído: confirmar a mudança direto na API da Z-API (`GET .../me`) depois de aplicar, não só
  assumir que a chamada de update funcionou.
- Incluído: validar com um evento real (mandar mensagem de teste e aguardar ser lida, ou evento
  sintético de `ReadCallback` contra o webhook do `03`, mesma técnica da 239) que `read_at` passa
  a ser preenchido.
- Explicitamente fora de escopo: qualquer alteração na configuração ou nos workflows do cliente
  BIOBOTS. Explicitamente fora de escopo: backfill de `read_at` para as 16.474 mensagens
  históricas (não há como recuperar o dado nunca recebido).

## Critérios de aceite
- [ ] `messageStatusCallbackUrl` confirmado apontando pro webhook correto da JS Gráfica (verificado
      via API da Z-API depois da mudança, não só assumido)
- [ ] Nenhuma configuração do BIOBOTS tocada
- [ ] Confirmado (teste real ou sintético) que `read_at` passa a ser preenchido em mensagens novas

## Riscos e cuidados
Mudança em configuração de conta ativa (Z-API), efeito imediato pra todo o tráfego real da JS
Gráfica — não é reversível "de graça" se algo der errado (mas o valor antigo já está documentado
na demanda 239, então dá pra reverter se necessário). Confirmar antes de aplicar que o valor novo
está exatamente certo (sem erro de digitação na URL).

## Referências
Demanda 239 (achado original, `deliveryCallbackUrl` como referência do valor correto). Workflow
`03 - JSGRAFICA | STATUS MSG` (id `hg12ud3yo5mTu3XI`).

## Relato de execução

**Status final: concluída**

### O que foi feito
1. Confirmado o valor atual antes de mexer (`GET .../me` com header `client-token`, obrigatório
   nesse endpoint — sem ele dá 400 "your client-token is not configured"):
   `messageStatusCallbackUrl` = `.../webhook/biobotsstatusmsg`, exatamente como a 239 relatou,
   sem mudança desde então.
2. Achado o endpoint exato de atualização (não estava documentado ainda no projeto): `PUT
   https://api.z-api.io/instances/{id}/token/{token}/update-webhook-message-status`, corpo
   `{"value": "<url>"}` — mesmo padrão já usado pra `update-webhook-received`/
   `update-webhook-delivery`, só o nome do endpoint que faltava descobrir.
3. Aplicado só esse campo, só na instância da JS Gráfica: novo valor
   `https://n8n.labonchain.xyz/webhook/jsgraficastatusmsg` (mesmo endpoint já correto do
   `deliveryCallbackUrl`, que o workflow `03` já trata pros dois tipos de evento — confirmado na
   239). Resposta da Z-API: `{"value":true}`.
4. **Não assumi que funcionou** — reconsultei `GET .../me` depois da mudança e confirmei o novo
   valor de fato salvo. Todos os outros campos (`receivedCallbackUrl`,
   `receivedAndDeliveryCallbackUrl`, `disconnectedCallbackUrl`, `connectedCallbackUrl`,
   `deliveryCallbackUrl`) continuaram exatamente iguais — mudança cirúrgica, só o campo pedido.

### Testes realizados e resultado
Ciclo sintético contra os webhooks reais de produção (mesma técnica da 236/237/239), telefone do
Edvam:
1. `SENT` no webhook do `02` (`jsgraficamsgenviadas`) — cria a linha de teste.
2. `ReadCallback` sintético direto no webhook do `03` (`jsgraficastatusmsg`) — **`read_at`
   preenchido corretamente** (`2026-07-29T18:31:52-03:00`), `status` → `READ`, `sent_at`
   preservado (graças ao fix da 237). Não incluí o passo `DeliveryCallback` neste teste
   específico (o objetivo era validar só o roteamento do evento de leitura, que é o que estava
   quebrado) — `delivered_at` ficou `null`, como esperado nesse cenário.
Linha de teste apagada depois (`DELETE ... where message_id = 'teste240-read-...'`, 1 linha).

**Não testei com mensagem real esperando leitura de verdade** (levaria minutos/horas e depende
de alguém realmente ler a mensagem no WhatsApp) — o teste sintético já prova que o roteamento
está correto e que o workflow `03` processa o evento certo; a partir de agora, qualquer leitura
real de mensagem enviada pela JS Gráfica deve popular `read_at` normalmente, sem necessidade de
esperar/validar isso manualmente.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- Nenhuma configuração do BIOBOTS foi tocada ou sequer consultada — conforme decisão do Edvam,
  fiquei só no campo da instância da JS Gráfica.
- O achado da 239 sobre não saber o que aciona o workflow `02` de fato em produção continua em
  aberto — não fazia parte do escopo desta demanda.

### Critérios de aceite
- [x] `messageStatusCallbackUrl` confirmado apontando pro webhook correto da JS Gráfica
      (verificado via API da Z-API depois da mudança, não só assumido)
- [x] Nenhuma configuração do BIOBOTS tocada
- [x] Confirmado (evento sintético) que `read_at` passa a ser preenchido em mensagens novas
