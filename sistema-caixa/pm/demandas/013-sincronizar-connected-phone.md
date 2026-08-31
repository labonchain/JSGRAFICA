# 013 — Implementar sincronização automática do connected_phone

Status: concluída
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Demanda 003 propôs (não implementou) a Opção B: workflow agendado que chama `GET /device` da
Z-API a cada 15-30min e atualiza `jsgrafica_agent_config.connected_phone` só se mudou. Já
aprovada como abordagem (menor risco que mexer no workflow `01`).

## Objetivo
Criar esse workflow agendado e confirmar que ele mantém `connected_phone` sincronizado.

## Escopo
- Incluído: novo workflow n8n, `scheduleTrigger` (15-30min), chama `GET /device`, compara com
  o valor salvo, faz `UPDATE` só se mudou.
- Fora de escopo: mexer no workflow `01`.

## Critérios de aceite
- [ ] Workflow criado e ativo
- [ ] Testado manualmente uma vez (executar e confirmar que não quebra nem grava lixo)

## Referências
`pm/demandas/003-confirmar-status-zapi-sync.md`.

## Relato de execução

**Status final: concluída**

### O que foi feito
Criei um workflow novo via API do n8n: **`12 - JSGRAFICA | SYNC CONNECTED_PHONE`**
(id `zfxfDZPQyHnOa4a1`), separado do workflow `01` (não mexi nele), com:

1. `Schedule Trigger` — a cada 20 minutos.
2. `GET Config` (Supabase, credential reaproveitada `Supabase account 2`) — lê
   `jsgrafica_agent_config` (`ativo=true`).
3. `GET Device Z-API` — chama `GET /device` da instância Z-API configurada
   (`onError: continueRegularOutput`, pra uma falha de rede não quebrar o workflow).
4. `Comparar e Decidir` (código simples, sem segredo nenhum) — normaliza os dois telefones (só
   dígitos) e decide se mudou.
5. `If Mudou` → `UPDATE connected_phone` (Supabase, atualiza `connected_phone` e `updated_at`
   só quando há diferença real).

### Teste feito
Testei em duas camadas:
1. **Manual**, via `execute_workflow` (MCP): rodei sob demanda e confirmei o fluxo completo
   funcionando (`GET Config` → `GET Device Z-API` → decisão → `If Mudou`).
2. **Real, automático**: o workflow ficou ativo por ~20 minutos durante os testes de outras
   demandas, e **o próprio agendamento disparou sozinho** (execução `853582`, `mode: trigger`,
   03:00:49 UTC) — e corrigiu de verdade o valor no banco: `connected_phone` saiu do valor
   antigo (`5511992980671`, parado desde abril) para o correto **`558186108547`**,
   `updated_at` atualizado para `2026-07-03 03:00:50`. Confirmei direto no Supabase.
3. O teste manual seguinte (`853608`) corretamente reportou `_motivo: "sem_mudanca"`, já que o
   valor já estava certo — comportamento esperado (não fica escrevendo à toa).

Usei um webhook temporário pra forçar um teste manual antes de descobrir que `execute_workflow`
via MCP funciona direto (bastou marcar `availableInMCP: true` nas settings) — removi esse
webhook temporário do workflow antes de finalizar; a versão final tem só os nós da lista acima
(6 nós), sem nenhum artefato de teste.

### Critérios de aceite
- [x] Workflow criado e ativo
- [x] Testado manualmente uma vez — e confirmado funcionando de verdade via disparo automático

### Testes feitos
`execute_workflow` (MCP, manual), verificação da execução agendada real via
`GET /api/v1/executions`, consulta SQL direta em `jsgrafica_agent_config` confirmando o valor
corrigido. Nenhuma alteração no workflow `01` nem em qualquer outro workflow existente.
