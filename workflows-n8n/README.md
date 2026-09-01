# Workflows n8n — JS Gráfica

Backup em JSON dos workflows n8n ativos de verdade da JS Gráfica (exportados via API REST do
n8n, `GET /workflows/{id}`), mantido pelo chat especialista **01 - N8N JS GRAFICA**. Referência
técnica completa e sempre atualizada de qual workflow faz o quê:
`sistema-caixa/pm/conhecimento/mapa-workflows-n8n.md`.

## O que tem aqui

Só os workflows classificados como "ativos de verdade" no mapa técnico acima, mais os 2 mais
recentes (355, 364). Não inclui os workflows `[DESCONTINUADO]` nem o `206` (desligado
definitivamente) — esses continuam intactos no n8n, só não fazem parte deste backup.

| Arquivo | Workflow | ID no n8n |
|---|---|---|
| `01-log-msg-recebidas.json` | `01 - JSGRAFICA \| LOG MSG RECEBIDAS` | `lcFEt1kbyqNfTS89` |
| `03-status-msg.json` | `03 - JSGRAFICA \| STATUS MSG` | `hg12ud3yo5mTu3XI` |
| `12-sync-connected-phone.json` | `12 - JSGRAFICA \| SYNC CONNECTED_PHONE` | `zfxfDZPQyHnOa4a1` |
| `13-lembrete-pix-pendente.json` | `13 - JSGRAFICA \| LEMBRETE PIX PENDENTE` | `17o7HPeASEqoqqnZ` |
| `296-caminho-c-ferramentas.json` | `296 - JSGRAFICA \| CAMINHO C FERRAMENTAS` | `aO6iktSzcYtVZ6B5` |
| `297-caminho-c-agente.json` | `297 - JSGRAFICA \| CAMINHO C AGENTE` | `JeN7VMYMeQEJgd0b` |
| `355-canal-disparo-agendado.json` | `355 - JSGRAFICA \| CANAL DISPARO AGENDADO` | `N6MNCiQvNUicwvHR` |
| `364-geracao-imagem-ia.json` | `364 - JSGRAFICA \| GERACAO IMAGEM IA` | `Zrjw2XrJEahpwJzd` |
| `atendimento-ai.json` | `JSGRAFICA_ATENDIMENTO_AI` (pausado pro cliente) | `TCbbF5z5dvAOhWsS` |
| `report-sheets-a.json` | `JS GRAFICA \| REPORT SHEETS` | `taL2rh7MO2qujYEc` |
| `report-sheets-b.json` | `JSGRAFICA \| REPORT SHEETS` | `KofIBAIFmZgPNCSc` |

## Segurança — leia antes de reexportar

Este é um repositório **público**. Antes de gerar um novo export destes workflows:

- **Nunca** inclua o campo `pinData` — ele guarda exemplos reais de webhook capturados durante o
  desenvolvimento, que já continham token real da Z-API e até dado de cliente real (telefone,
  texto de mensagem) quando auditado em 2026-08-31. Removido deliberadamente deste backup.
- O campo `credentials` de cada node só deve conter `{id, name}` (referência à credencial nativa
  do n8n) — nunca o valor real do segredo. Se algum node tiver header/body com token, chave ou
  senha em texto puro em vez de usar `credentials`, é bug de configuração (já achado e corrigido
  1 caso real, node "RPC Histórico Supabase" em `report-sheets-a.json`, demanda 367/GitHub,
  31/08/2026) — corrigir antes de exportar de novo, nunca só remover do JSON e deixar o node
  quebrado em produção.
- Auditoria mínima antes de qualquer commit: buscar por `token`, `secret`, `password`, `apikey`,
  `Bearer`, e pelo formato de JWT (`eyJ...`) em texto puro no JSON inteiro.
