# 047 — Lembrete automático de Pix pendente

Status: concluída (teste real pendente da demanda 045)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: 2026-07-04
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Parte do conjunto de melhorias no fluxo de pedidos aprovado por Edvam (mockup:
`https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb`). Hoje, se um cliente
some depois de combinar pagar por Pix, não existe nenhum lembrete automático — depende de
alguém da equipe lembrar de cobrar de novo.

**Depende de dado real pra testar de ponta a ponta:** só existem pedidos com `status =
'aguardando_pix'` depois que a demanda 045 estiver rodando (hoje `jsgrafica_pedidos` tem 0
linhas). Pode ser construído em paralelo, mas o teste com pedido real só é possível depois da
045 gerar algum pedido nesse status.

## Objetivo
Pedido parado em "aguardando_pix" por muito tempo recebe um lembrete automático, sem precisar de
alguém da equipe lembrar manualmente.

## Escopo
- Incluído:
  1. Novo workflow n8n agendado (mesmo padrão do `12 - JSGRAFICA | SYNC CONNECTED_PHONE`, que já
     roda em intervalo fixo) — ex. a cada 1h — buscando em `jsgrafica_pedidos` linhas com
     `status = 'aguardando_pix'` e `confirmado_cliente_at` mais antigo que X horas (definir X —
     sugestão inicial: 3h, ajustável).
  2. Pra cada pedido elegível, mandar o lembrete (reaproveitar o texto de
     "ENVIAR PIX CLIENTE" do workflow `06-PEDIDOS` — chave Pix + titular + valor) e marcar um
     campo novo (`lembrete_pix_enviado_at`, precisa criar essa coluna em `jsgrafica_pedidos`) pra
     não mandar de novo no próximo ciclo.
  3. Limitar a **um lembrete só** por pedido (não repetir toda hora indefinidamente — evitar
     incomodar o cliente). Se quiser um segundo lembrete mais espaçado depois, registrar como
     ideia futura, não implementar já.
- Fora de escopo: cancelar pedido automaticamente se o cliente nunca pagar (decisão de produto
  separada, não tomar essa decisão aqui).

## Critérios de aceite
- [ ] Coluna `lembrete_pix_enviado_at` criada em `jsgrafica_pedidos`
- [ ] Workflow agendado roda e identifica corretamente pedidos elegíveis (testar com dado
      sintético se não houver pedido real ainda no momento do teste)
- [ ] Lembrete não é enviado duas vezes pro mesmo pedido
- [ ] Reportar se o teste foi feito com dado real (depois da 045) ou só sintético

## Riscos e cuidados
Não mandar lembrete pra pedido que já foi pago (checar `pagamento_confirmado`) nem pra pedido
cancelado — conferir esses filtros antes de disparar.

## Referências
Mockup: `https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb`. Workflow
`12 - JSGRAFICA | SYNC CONNECTED_PHONE` (padrão de agendamento). Nó "ENVIAR PIX CLIENTE" do
`06-PEDIDOS` (texto de referência). Tabela `jsgrafica_pedidos`.

## Relato de execução

**Status final: concluída (testado com dado sintético — depende da demanda 045 pra teste com
pedido real)**

### O que foi feito
1. Coluna `lembrete_pix_enviado_at` (timestamptz) criada em `jsgrafica_pedidos` via migration.
2. Novo workflow **`13 - JSGRAFICA | LEMBRETE PIX PENDENTE`** (id `17o7HPeASEqoqqnZ`), mesmo
   padrão do `12 - SYNC CONNECTED_PHONE`:
   - `Schedule Trigger` — a cada 1h.
   - `GET Config` — pega `zapi_url`/`client_token`/`chave_pix`/`titular_pix` de
     `jsgrafica_agent_config`.
   - `GET Pedidos Aguardando Pix` — `jsgrafica_pedidos` com `status = 'aguardando_pix'` AND
     `pagamento_confirmado = false` AND `confirmado_cliente_at < agora - 3h` (3h = sugestão
     inicial do escopo, fácil de ajustar trocando um número no nó).
   - `Montar Lembrete` (código) — filtra quem já tem `lembrete_pix_enviado_at` preenchido (não
     manda de novo) e monta a mensagem reaproveitando o texto do "ENVIAR PIX CLIENTE" do
     `06-PEDIDOS` (chave Pix do próprio pedido, com fallback pra chave da config; titular;
     valor). Define `pairedItem` explicitamente por item — detalhe técnico que evita um bug de
     ambiguidade de referência entre nós que já apareceu antes hoje (demanda 015).
   - `Enviar Lembrete Z-API` — envia de verdade via `/send-text`.
   - `Marcar Lembrete Enviado` — grava `lembrete_pix_enviado_at = now()` no pedido certo.
3. Workflow criado, testado e **ativado**.

### Testes realizados e resultado
Como `jsgrafica_pedidos` está vazia (depende da demanda 045), testei com **pedido sintético**:
1. Inserido 1 pedido de teste (`status: 'aguardando_pix'`, `confirmado_cliente_at` 4h atrás,
   telefone de teste autorizado `5521965185667`).
2. Rodei o workflow manualmente (1ª vez): encontrou o pedido, montou a mensagem, **enviou de
   verdade via Z-API** (`zaapId` real retornado) e marcou `lembrete_pix_enviado_at` no pedido
   certo — confirmado a mensagem chegou no WhatsApp de teste.
3. Rodei de novo (2ª vez, simulando o próximo ciclo de 1h): `Montar Lembrete` corretamente
   filtrou o pedido (já tinha `lembrete_pix_enviado_at`) e **não enviou nada** — 0 itens
   passaram adiante, sem duplicar.
4. Apaguei o pedido sintético depois de confirmar os dois testes.

### Achados fora do escopo
Nenhum novo — segui o padrão já estabelecido nos workflows agendados de hoje (`12`).

### Critérios de aceite
- [x] Coluna `lembrete_pix_enviado_at` criada
- [x] Workflow agendado roda e identifica pedidos elegíveis — testado com dado sintético
      (não havia pedido real disponível ainda; depende da demanda 045)
- [x] Lembrete não é enviado duas vezes pro mesmo pedido — confirmado no teste
- [x] Reportado: teste foi **só sintético**, não com dado real
