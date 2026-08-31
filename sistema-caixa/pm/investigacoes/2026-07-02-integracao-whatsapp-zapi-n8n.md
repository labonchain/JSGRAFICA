# Investigação — 2026-07-02 — Integração WhatsApp / Z-API / n8n / Supabase

Investigação somente leitura. Nenhuma alteração feita em código, n8n ou configuração.

## Arquitetura confirmada (lendo código)

```
Cliente WhatsApp → Z-API → webhook → n8n (toda a lógica) → Supabase (fonte de verdade)
                                                                  │
                                                     Next.js "caixa-js-grafica" lê
                                                     e escreve de volta no Supabase;
                                                     chama Z-API diretamente só para
                                                     resposta manual do operador no Inbox
```

O Next.js não recebe webhook nenhum do Z-API — não existe rota `app/api/webhook*` no projeto.
Confirmado por listagem de `app/api/*`: `dashboard, fechamento, inbox, log, movimento, pedidos,
produtos, saidas, vendas, zapi`. Toda entrada de mensagem passa pelo n8n.

Arquivos revisados: `lib/zapi.ts`, `lib/supabase.ts`, `app/api/inbox/{conversas,mensagens,
responder,enviar-midia,atendimento}/route.ts`, `app/api/zapi/status/route.ts`.

## n8n — 8 workflows (via MCP `search_workflows`)

| ID | Nome | active |
|---|---|---|
| lcFEt1kbyqNfTS89 | 01 - LOG MSG RECEBIDAS | true |
| e0hz8JrWRM4XTLEM | 02 - LOG MSG ENVIADAS | true |
| hg12ud3yo5mTu3XI | 03 - STATUS MSG | true |
| qgsRciU2jkdmNh3H | 05 - GESTAO PRODUTOS | true |
| WDOixH8LKyh0DDGq | 06 - PEDIDOS | true |
| oaDvxiH71P2mDY5e | jsgrafica_envio_de_msg | true |
| KofIBAIFmZgPNCSc | JSGRAFICA \| REPORT SHEETS | true |
| TCbbF5z5dvAOhWsS | JSGRAFICA_ATENDIMENTO_AI | true |

`active: true` no n8n só diz que o workflow está pronto para rodar se for chamado — não diz
se ele efetivamente recebe tráfego. Isso foi checado à parte para o workflow `01`.

## Roteamento do workflow `01 - LOG MSG RECEBIDAS` (lido nó a nó via `get_workflow_details`)

Cadeia até o atendimento por IA:
`Switch Redirect` (fallback) → `If enviar llm` (valida só forma da mensagem: tipo evento,
`from_me=false`, não é grupo, não é broadcast/newsletter — **nenhum campo de telefone**) →
`ENVIAR PARA LLM` → `CHECK SESSAO PEDIDO` (default → `_destino:'atendimento'`, a menos que
`status_atendimento==='assumido_humano'` ou haja pedido em sessão ativa) → `Switch Destino`
(fallback) → nó `HTTP Request` → POST para
`https://n8n.labonchain.xyz/webhook/jsgraficaatendimentoai` com o payload inteiro.

O nó `IDENTIFICAR AUTORIZAÇÃO` tem um allowlist hardcoded de um único telefone
(`AUTORIZADOS = ['5521965185667']`), mas essa allowlist alimenta só os ramos de comando de
gestão de produto e pedido em grupo — **não** o caminho do atendimento por IA.

**Leitura correta desse achado (revisada):** isso é um risco estrutural de roteamento,
verificado no código do workflow — é fato, não suposição. O que **não** é fato é a hipótese
anterior de que isso já estaria causando dano hoje: a única coisa observada é que o Z-API
oscilou entre desconectado e (aparentemente) reconectado na mesma janela de hoje, então não
dá para afirmar se mensagens de clientes reais já passaram por esse caminho recentemente.
Isso é uma pergunta em aberto, não uma conclusão.

Achado secundário: nó `Flag Sessao CONFIG Ativa` tem um JWT `service_role` do Supabase em
texto puro no código do nó, em vez de credential do n8n.

## Estado da conexão Z-API (Supabase, tabela `jsgrafica_log_eventos_instancias`)

Hoje, 2026-07-02, entre 21:47:45 e 21:52:00 UTC: sequência repetida de `DISCONNECTED`
("It was not possible to restore a session with the current token") → `RESTORE_FALHA` →
`CODIGO_RECONEXAO_ENVIADO` → `BOTAO_RENOVAR_CODIGO_ENVIADO` (`precisa_novo_codigo`).//
Evento anterior a esse: 2026-05-04 (mesmo padrão), depois silêncio até hoje — bate com a
pausa do projeto.

Mensagens enviadas (`from_me:true`) às 21:59:01, 21:59:33 e 22:27:02 de hoje (depois da
última tentativa de reconexão às 21:52) incluem dois "Pedido confirmado" reais (encadernação,
foto 10x15) — sugerindo que a reconexão teve sucesso pouco depois do último evento
registrado. **Edvam confirmou diretamente que o Z-API está conectado ao número real de
atendimento da gráfica neste momento** — tratar isso como a informação mais atual.

`jsgrafica_agent_config.connected_phone` = `5511992980671` (DDD 11, SP), `updated_at` parado
em 2026-04-15 — ou seja, **esse campo não se atualiza sozinho a cada reconexão** e não deve
ser usado como fonte de verdade do número conectado agora. Precisa verificação direta via
Z-API (`GET /status`) quando for relevante, não via essa tabela.

## Qualidade dos dados históricos do log

Volume mensal em `jsgrafica_log_msgs_privadas` (`data_timestamp`):

| Mês/2026 | Mensagens |
|---|---|
| Jan | 6.542 |
| Fev | 10.914 |
| Mar | 10.992 |
| Abr | 4.901 |
| Mai | 112 |
| Jun | 0 |
| Jul (até agora) | 3 |

Distribuição de DDD em `jsgrafica_contatos` (1.987 contatos): **1.522 (≈77%) são DDD 81
(Recife)**; o restante (≈23%, ~465 contatos) está espalhado por outros DDDs (11-SP, 21-RJ,
73, 42, 58, 44, 32, 51, 78, 53, 75, 61, e alguns códigos inválidos como "03"/"02" — prováveis
números malformados ou de grupo).

Amostra de conteúdo real de 04/05/2026 (contatos DDD 11) mostra conversas **sem relação
nenhuma com gráfica rápida** — ex.: um bot de controle de gastos pessoais ("Essa função de
resumo de gastos por categoria está disponível apenas nos planos pagos") e uma negociação de
produção/logística entre RJ e SP para "dia das mães" (estoque, frete, embalagem). Isso é
evidência concreta — não suposição — de que **parte do log histórico não é tráfego da JS
Gráfica**. A causa exata (reuso de instância Z-API, número de teste emprestado para outro
projeto, etc.) ainda não foi confirmada.

**Implicação prática, ainda sem solução proposta:** qualquer trabalho que trate
`jsgrafica_contatos` / `jsgrafica_log_msgs_privadas` como base 100% limpa de clientes da
gráfica (campanhas, relatórios, treinamento de IA com histórico) corre risco de incluir
contatos/conversas de outro contexto. Isso também pode explicar por que o Inbox "não bate"
com a percepção do Edvam sobre as conversas reais da gráfica.

## O que ainda não foi verificado (não investigado nesta sessão)

- Causa raiz da contaminação do log (qual instância/projeto gerou o tráfego não-gráfica).
- Por que o Inbox não reflete o log real hoje — não foi comparado lado a lado com o que o
  Edvam vê no WhatsApp de verdade.
- Detalhe do que travou a Fase 2 (tentativa de atendimento automático) — só temos o relato,
  não os logs de erro daquela época (se existirem).
- Status live do Z-API via `GET /status` direto (não foi chamado nesta sessão — só inferido
  pela tabela de eventos + relato do Edvam).
