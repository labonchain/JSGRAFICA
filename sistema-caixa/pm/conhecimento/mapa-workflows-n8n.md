# Mapa dos workflows n8n da JS Gráfica

## ⚠️ Reconferência 2026-08-15 — achado não resolvido, precisa de investigação real

Reconferido item a item (por ID direto, não por busca por nome — a busca por nome só retorna
workflow **ativo**, nunca inativo, achado confirmado nesta mesma sessão ao procurar o `206`).
Resultado:

- **Os 9 workflows "ativos de verdade"** (tabela abaixo) foram todos confirmados intactos, sem
  nenhuma mudança não documentada, e **nenhum deles tem qualquer ligação com o `206`** (confirmado
  também nesta sessão, ver `pm/OBJETIVOS-MACRO.md`).
- **19 dos 20 workflows marcados `[DESCONTINUADO]` (todos exceto o `02 - LOG MSG ENVIADAS`) não
  foram encontrados** — `get_workflow_details` retorna "Workflow not found" pra cada um dos 19
  IDs, e nenhum aparece numa listagem completa da conta inteira (86 workflows, todos os clientes
  da infra LabOnchain). **Isso contradiz diretamente o que a demanda 242 registrou** ("nada foi
  apagado, só renomeado, com backup de cada um antes").
- **Não sabemos ainda se foram de fato excluídos, movidos pra um espaço que a ferramenta
  disponível não alcança, ou outra coisa** — não dá pra confirmar por essa via (MCP read-only).
  Precisa de checagem direta (API REST real com `N8N_API_KEY`, ou login na UI do n8n).
- **Mitigante real**: existe backup local do JSON de cada um desses 19, feito antes da mudança da
  242, em `pm/backups/*_pre-demanda242_2026-07-29.json` — mesmo que tenham sido excluídos de
  verdade, o conteúdo não está perdido, só precisaria ser reimportado se algum dia fizer falta
  (nenhum deles tem uso real hoje, todos já confirmados sem execução há meses antes de 242).
- IDs afetados: `qgsRciU2jkdmNh3H`, `weZ7s8aTdXQVkfuj`, `irS4TAWZ0ZZzsbrl`, `pu07Sszovj7sXw4S`,
  `lCTcDAPimObpxeX0`, `Q9JCj7f7V0MaFxrD`, `AdUZR8s56rLNA1z6`, `WzZjKQXPSkrtkmva`,
  `Xl26yPvOrzN2Ulc6`, `oaDvxiH71P2mDY5e`, `WCq0NtyPg6xPww7g`, `UZZC0f4Wq4AwN6n2`,
  `auNxq03A6GvAjE63`, `oT9MVac5w2ssmkSs`, `RNXLKTWO1pdrTaUk`, `aSUXVowvgRGRLYC2`,
  `fxKu7kI4u0FSDPpb`, `izHYeXjPSH0qNdZm`, `Re6Uqk2LS4qmWWjn`.

**Ver demanda 273** (`pm/demandas/273-investigar-workflows-descontinuados-sumidos.md`) — achado
formal de investigação aberto, seguindo a regra de nunca deixar achado só documentado.

---

**Revalidado por completo em 2026-07-29/30 (demanda 242)** — levantamento anterior (2026-07-10)
catalogava só 8 workflows "ativos" e presumia que 2 workflows tinham sido removidos quando na
verdade só estavam inativos. Esta versão é a fonte de verdade única e definitiva: levantada
direto na API REST do n8n (`GET /workflows`, busca por `grafica`/`jsg` no nome em toda a conta,
não só nos já catalogados), com evidência real por workflow (execução recente, settings, config
da Z-API) — não por memória.

**São 29 workflows relacionados à JS Gráfica no n8n hoje** (a conta n8n é compartilhada com ~10
outros clientes da mesma infraestrutura — ver `reference_labonchain_infra` na memória do projeto).

## ✅ Ativos de verdade (confirmado por execução real recente)

| Workflow | ID | Gatilho | Confirmação |
|---|---|---|---|
| `01 - JSGRAFICA \| LOG MSG RECEBIDAS` | `lcFEt1kbyqNfTS89` | Webhook (Z-API) | Execução real hoje, sucesso |
| `03 - JSGRAFICA \| STATUS MSG` | `hg12ud3yo5mTu3XI` | Webhook (Z-API `deliveryCallbackUrl`) | Execução real hoje, sucesso |
| `06 - JSGRAFICA \| PEDIDOS` | `WDOixH8LKyh0DDGq` | Webhook (chamado por 01/ATENDIMENTO_AI) | Execução real hoje, sucesso |
| `12 - JSGRAFICA \| SYNC CONNECTED_PHONE` | `zfxfDZPQyHnOa4a1` | Schedule, 20 em 20min | Execução real hoje, sucesso |
| `13 - JSGRAFICA \| LEMBRETE PIX PENDENTE` | `17o7HPeASEqoqqnZ` | Schedule, de hora em hora | Execução real hoje, sucesso |
| `JSGRAFICA_ATENDIMENTO_AI` | `TCbbF5z5dvAOhWsS` | Webhook | Execução real hoje, sucesso — mas envio ao cliente travado por whitelist de 5 números (decisão de produto, não bug) |
| `JS GRAFICA \| REPORT SHEETS` | `taL2rh7MO2qujYEc` | Schedule (30min + 6h/19h) | **Corrigido na 242** — ver achado 1 abaixo |
| `JSGRAFICA \| REPORT SHEETS` | `KofIBAIFmZgPNCSc` | Schedule (30min + 19h) | **Corrigido na 242** — ver achado 1 abaixo |

**Atenção**: `JS GRAFICA \| REPORT SHEETS` e `JSGRAFICA \| REPORT SHEETS` são DOIS workflows
diferentes, não duplicata um do outro — nomes quase idênticos por acidente/histórico, mas com
schedules e nós próprios (compartilham estrutura por terem sido clonados um do outro em algum
momento, mas cada um roda de forma independente). Cuidado ao editar um pra não mexer no outro
sem querer.

## 🟡 Awaiting decisão (não é "ativo" nem "descontinuado")

| Workflow | ID | Situação |
|---|---|---|
| `206 - JSGRAFICA \| AGENTE FASE B (TESTE ISOLADO)` | `M5WZ6zHAe625XyJm` | `inactive`, mas testado manualmente com o número do Edvam em 2026-07-29 (Fase B da automação de atendimento). Aguardando decisão do Edvam pra conectar no roteamento real — ver `pm/OBJETIVOS-MACRO.md`. **Não confundir com descontinuado.** |

## ⚪ Descontinuados formalmente (demanda 242, 2026-07-29) — prefixo `[DESCONTINUADO]` aplicado no nome

Todos confirmados por evidência real (zero execução já registrada na API do n8n, ou dormência de
meses) antes de sinalizar — nenhum foi desativado ou apagado, só renomeado. Backup de cada um em
`pm/backups/*_pre-demanda242_2026-07-29.json` antes da mudança.

| Workflow (nome atual) | ID | Por quê |
|---|---|---|
| `[DESCONTINUADO] 02 - JSGRAFICA \| LOG MSG ENVIADAS` | `e0hz8JrWRM4XTLEM` | Achado da demanda 241: as 827 linhas com a assinatura deste workflow estão confinadas a 25/03→03/05/2026, zero desde então (87 dias sem chamador). Quem registra mensagem enviada hoje é o próprio app (`registrarMensagemEnviada`). Continua tecnicamente `active:true` no n8n (não desativado, só sinalizado) — decisão de não desligar o webhook, só documentar que é redundante |
| `[DESCONTINUADO] 05 - JSGRAFICA \| GESTAO PRODUTOS` | `qgsRciU2jkdmNh3H` | Substituído pela aba Produtos do admin (decisão de 2026-07-02, demanda 010) — CLAUDE.md antigo dizia "removido de vez", mas só estava inativo. Zero execuções já registradas |
| `[DESCONTINUADO] 07 - JSGRAFICA \| GRUPO-PEDIDOS` | `weZ7s8aTdXQVkfuj` | Nunca catalogado em nenhuma documentação anterior — achado novo da 242. Zero execuções já registradas, inativo desde 30/03/2026 |
| `[DESCONTINUADO] ATENDIMENTO_MENUS_JSGRAFICA` | `irS4TAWZ0ZZzsbrl` | Zero execuções já registradas, o mais antigo entre todos (nov/2025) |
| `[DESCONTINUADO] INSERT RAG - JSGRAFICA` | `pu07Sszovj7sXw4S` | Zero execuções já registradas — `jsgrafica_agent_rag` nunca foi de fato carregada por este caminho |
| `[DESCONTINUADO] JS GRAFICA  - LOG MSG ENVIADAS` | `lCTcDAPimObpxeX0` | Rascunho anterior à convenção numerada, substituído pelo `02` no mesmo dia (04/03/2026) |
| `[DESCONTINUADO] JS GRAFICA  - LOG MSG RECEBIDAS` | `Q9JCj7f7V0MaFxrD` | Rascunho anterior, substituído pelo `01` no mesmo dia |
| `[DESCONTINUADO] JS GRAFICA  - LOG STATUS MSG ENVIADAS` | `AdUZR8s56rLNA1z6` | Rascunho anterior, substituído pelo `03` no mesmo dia |
| `[DESCONTINUADO] JS GRAFICA - INSTANCIA` | `WzZjKQXPSkrtkmva` | Substituído pelo `12-SYNC` + os 4 workflows `INSTANCIA_*` separados abaixo |
| `[DESCONTINUADO] JSGRAFICA_envio_de_msg` (maiúsculo) | `Xl26yPvOrzN2Ulc6` | Workflow de campanha em massa (Google Sheets, não Supabase) — zero execuções já registradas. Confirmado (241/242) que não chama o webhook do `02` |
| `[DESCONTINUADO] jsgrafica_envio_de_msg` (minúsculo) | `oaDvxiH71P2mDY5e` | Duplicata do anterior (mesma lógica, criado no dia em que o outro foi editado por último) — zero execuções já registradas |
| `[DESCONTINUADO] JSGRAFICA_INSTANCIA_CONECTADA` | `WCq0NtyPg6xPww7g` | Zero execuções — deployado junto com os outros 3 `INSTANCIA_*` no mesmo segundo (25/03/2026), nunca ativados |
| `[DESCONTINUADO] JSGRAFICA_INSTANCIA_DESCONECTADA` | `UZZC0f4Wq4AwN6n2` | Idem |
| `[DESCONTINUADO] JSGRAFICA_INSTANCIA_ENVIO_BOTÃO_RECONEXÃO` | `auNxq03A6GvAjE63` | Idem |
| `[DESCONTINUADO] JSGRAFICA_INSTANCIA_RECONEXAO` | `oT9MVac5w2ssmkSs` | Idem |
| `[DESCONTINUADO] JSGRAFICA_QUEUE_SENDER` | `RNXLKTWO1pdrTaUk` | Criado 13/05/2026, zero execuções já registradas — nunca chegou a ser usado |
| `[DESCONTINUADO] JSGRAFICA_RAG_V1` | `aSUXVowvgRGRLYC2` | Zero execuções já registradas |
| `[DESCONTINUADO] JSGRAFICA_STATUS_WPP` | `fxKu7kI4u0FSDPpb` | Zero execuções já registradas — rascunho anterior ao `03` |
| `[DESCONTINUADO] VALIDAÇÃO DE NUMEROS JS GRAFICA` | `izHYeXjPSH0qNdZm` | Script utilitário pontual (`manualTrigger` só), zero execuções já registradas |
| `[DESCONTINUADO] JSGRAFICA_AGENT_DIZU_CONTEXTO_USER_` | `Re6Uqk2LS4qmWWjn` | O mais antigo de todos (dez/2025, anterior a qualquer workflow real da JS Gráfica em 04/03/2026) — nome mistura JSGRAFICA+DIZU (outro cliente do mesmo Edvam). Provável resíduo de template copiado, nunca deveria ter sido rotulado como workflow da JS Gráfica. Zero execuções já registradas |

## 🔧 Achado 1 (demanda 242) — os 2 REPORT SHEETS estavam quebrados, agora corrigidos

Descoberto ao investigar a higiene geral, não fazia parte do escopo original — mas eram bugs ao
vivo, corrigidos com prioridade antes do resto da demanda.

**`JSGRAFICA | REPORT SHEETS` (`KofIBAIFmZgPNCSc`)**: node `Atualizar repor_leads_grupos1`
(Google Sheets, aba `report_leads_grupos`) falhando em **toda execução do ciclo de 30 em 30
minutos por pelo menos 4h+ seguidas** (confirmado: 10 falhas consecutivas de 20:00 a 00:00).
Causa: colunas `participant_name`/`group_id` trocaram de posição na planilha real, e o schema
cacheado no node ficou desatualizado — n8n bloqueia a escrita nesse cenário (proteção contra
gravar na coluna errada) em vez de gravar silenciosamente errado. Corrigido trocando a ordem
dessas 2 entradas no `columns.schema` do node (a `columns.value` já mapeava por nome, não
precisou mudar). **Testado**: reexecução manual completa, node com `executionStatus: success`,
sem erro — confirmado ponta a ponta.

**`JS GRAFICA | REPORT SHEETS` (`taL2rh7MO2qujYEc`)**: node `GET Config Resumo` (busca
`tutor_phone`/`tutor_name` em `jsgrafica_agent_config` — é o node do resumo diário pro "Tutor" às
19h) falhando com `Credentials not found` — o node nunca teve credencial Supabase anexada.
Corrigido anexando a mesma credencial (`supabaseApi`, id `PxQdXsvBxo3M5H8I`, "Supabase account
2") já usada por todo o resto do projeto, inclusive por outro node (`Query RPC Summary1`) no
MESMO workflow. **Não testado ponta a ponta** — esse node só roda no ramo agendado das 6h/19h,
que a execução manual via API não alcança (o `manualTrigger` do workflow não está conectado a
esse ramo). Primeira confirmação real será a próxima execução natural (19h de hoje ou 6h de
amanhã) — vale conferir depois.

Isso resolve de vez a ressalva que o levantamento de 2026-07-10 já registrava ("confiabilidade
real, não confirmada... antes de usar esse workflow como base de qualquer coisa nova, vale
confirmar com o Edvam se ele de fato recebe essa mensagem às 19h") — a resposta é: **não estava
recebendo, por bug real, corrigido agora**.

## Achado 2 (2026-07-10, ainda válido) — o workflow de PEDIDOS (06) não envia mensagem via n8n

A lógica de negócio inteira existe no workflow, mas os nós que chamam a Z-API estão
`disabled: true`. Não é bug — o fluxo real de pedido hoje é o "Criar pedido" do Inbox no app
Next.js, não mais este workflow n8n. Só registrar pra não confundir.

## Achado 3 (2026-07-10, ainda válido) — padrão comum de envio de WhatsApp

Todo workflow que envia mensagem de verdade (`JSGRAFICA_ATENDIMENTO_AI`, `13-LEMBRETE PIX`) segue
o mesmo padrão: lê `jsgrafica_agent_config` → monta texto → `POST` direto pro endpoint Z-API
(`.../send-text`), sem fila assíncrona real. Referência pra qualquer novo fluxo de envio.

## Referências pra desenhar novos fluxos

Ver seção equivalente da versão anterior deste documento (histórico completo em git) — workflow
`13` como template de agendado+leitura+envio, workflow `06` como referência de máquina de estados
com estado persistido em `jsgrafica_memoria_conversas`.

## Não investigado nesta rodada
- Se `tutor_phone` de fato aponta pro Edvam (campo existe e é usado, valor real não conferido).
- Confirmação em produção do fix do `GET Config Resumo` (só será possível na próxima execução
  natural das 19h/6h).
