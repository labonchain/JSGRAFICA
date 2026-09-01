# Mapa dos workflows n8n da JS Gráfica

## ✅ Reconferência 2026-08-31 (demanda 351) — fonte de verdade atual, revalidada item a item

Levantamento completo e direto: `GET /workflows` (API REST, paginado, 380 workflows na conta
inteira, todos os clientes da infra LabOnchain), filtrado por nome `grafica`/`jsg`. **31
workflows relacionados à JS Gráfica no n8n hoje.**

**Achado da reconferência de 2026-08-15 (demanda 273) - RESOLVIDO nesta revalidação**: os 19
workflows `[DESCONTINUADO]` que pareciam ter sumido nunca estiveram perdidos - a causa era a
ferramenta usada naquela sessão (`search_workflows`/`get_workflow_details` via MCP), que só
enxerga workflow **ativo**, nunca inativo, então buscar por ID ou por nome não encontrava nenhum
dos 19 (todos `active:false`). `GET /workflows` direto na API REST traz todos, ativos e inativos,
sem exceção - todos os 19 (mais o `206`, descontinuado agora na demanda 299) estão lá, intactos,
com o conteúdo original preservado. Nada foi perdido, a demanda 242 estava certa desde o início.
Não precisa mais reverificar isso - a lição fica registrada: pra listar workflow inativo, sempre
usar a API REST direto (`GET /workflows`), nunca `search_workflows` do MCP.

## ✅ Ativos de verdade (`active:true`, confirmado via API REST em 2026-08-31)

| Workflow | ID | Gatilho | Confirmação |
|---|---|---|---|
| `01 - JSGRAFICA \| LOG MSG RECEBIDAS` | `lcFEt1kbyqNfTS89` | Webhook (Z-API) | Roteia sessão real, inclusive pro `297` (ver linha abaixo) |
| `03 - JSGRAFICA \| STATUS MSG` | `hg12ud3yo5mTu3XI` | Webhook (Z-API `deliveryCallbackUrl` + `messageStatusCallbackUrl`, mesmo endpoint) | Corrigido de vez na demanda 349 (30-31/08): agora trata `MessageStatusCallback`/`READ`/`READ_BY_ME`/`SENT`/`RECEIVED`, não só os tipos literais `DeliveryCallback`/`ReadCallback`. `read_at` nunca tinha funcionado antes, testado de ponta a ponta em produção |
| `296 - JSGRAFICA \| CAMINHO C FERRAMENTAS (TESTE ISOLADO)` | `aO6iktSzcYtVZ6B5` | Sub-workflow (chamado pelo `297`) | Ferramentas de código puro do agente Caminho C (preço, Pix, criar pedido, cancelar, escalar) - sempre recalculam da fonte real. Nome ainda diz "TESTE ISOLADO" mas está em produção real desde 18/08 (demanda 299) |
| `297 - JSGRAFICA \| CAMINHO C AGENTE (TESTE ISOLADO)` | `JeN7VMYMeQEJgd0b` | Webhook (chamado pelo `01`) | Agente de IA real (`@n8n/n8n-nodes-langchain.agent`) que responde ao cliente hoje, dentro da whitelist - substituiu o `206` no roteamento real desde 18/08 (demanda 299), decisão final de manter e desligar o `206` de vez tomada em 29/08. Nome ainda diz "TESTE ISOLADO", desatualizado, considerar renomear numa próxima demanda |
| `12 - JSGRAFICA \| SYNC CONNECTED_PHONE` | `zfxfDZPQyHnOa4a1` | Schedule, 20 em 20min | Sem mudança |
| `13 - JSGRAFICA \| LEMBRETE PIX PENDENTE` | `17o7HPeASEqoqqnZ` | Schedule, de hora em hora | Sem mudança |
| `JSGRAFICA_ATENDIMENTO_AI` | `TCbbF5z5dvAOhWsS` | Webhook | Ativo no n8n, mas pausado pro cliente por decisão de produto (risco de banimento) - não confundir com o `297`, que é quem responde de verdade hoje |
| `JS GRAFICA \| REPORT SHEETS` | `taL2rh7MO2qujYEc` | Schedule (30min + 6h/19h) | Sem mudança desde a correção da 242 |
| `JSGRAFICA \| REPORT SHEETS` | `KofIBAIFmZgPNCSc` | Schedule (30min + 19h) | Sem mudança desde a correção da 242 |
| `[DESCONTINUADO] 02 - JSGRAFICA \| LOG MSG ENVIADAS` | `e0hz8JrWRM4XTLEM` | Webhook | Continua tecnicamente `active:true`, mas sem chamador real (quem loga envio hoje é o app) - ver tabela de descontinuados abaixo |

**Atenção**: `JS GRAFICA \| REPORT SHEETS` e `JSGRAFICA \| REPORT SHEETS` são DOIS workflows
diferentes, não duplicata um do outro — nomes quase idênticos por acidente/histórico, mas com
schedules e nós próprios (compartilham estrutura por terem sido clonados um do outro em algum
momento, mas cada um roda de forma independente). Cuidado ao editar um pra não mexer no outro
sem querer.

## 🟡 Awaiting decisão (não é "ativo" nem "descontinuado")

Vazio hoje - o único item que estava aqui (`206`) teve decisão final tomada pelo Edvam em
2026-08-29 (desligar de vez, não usar mais como fallback) e foi formalmente descontinuado na
demanda 299 (31/08). Ver tabela de descontinuados abaixo.

## 🔵 Inativo por decisão de produto, mas NÃO renomeado `[DESCONTINUADO]`

| Workflow | ID | Situação |
|---|---|---|
| `06 - JSGRAFICA \| PEDIDOS` | `WDOixH8LKyh0DDGq` | `active:false` de verdade (não é só "nós de envio desabilitados" como versões antigas deste mapa diziam - o workflow inteiro foi desativado na demanda 303, 27/08, depois de um bug real de dado em produção). Quem cria pedido de verdade hoje é o "Criar pedido" do Inbox no app Next.js. Não tem o prefixo `[DESCONTINUADO]` porque a lógica de negócio ainda pode servir de referência futura, mas não confundir com "ativo" |

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
| `[DESCONTINUADO] 206 - JSGRAFICA \| AGENTE FASE B` | `M5WZ6zHAe625XyJm` | **Novo, demanda 299/31-08**: piloto do agente novo (`297`) rodou 18 a 27/08, decisão final do Edvam em 29/08 foi desligar o `206` de vez, não usar mais como fallback de reversão. Desativado (`active:false`) e renomeado nesta demanda, seguindo o mesmo padrão dos outros 19. Nada apagado, backup em `pm/backups/206-jsgrafica-agente-fase-b_pre-desligamento-definitivo_2026-08-31.json` |

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

## Achado 2 (2026-07-10, atualizado em 2026-08-31) — o workflow de PEDIDOS (06) não roda mais

Descrição antiga (até a revalidação de 31/08): "a lógica de negócio inteira existe no workflow,
mas os nós que chamam a Z-API estão `disabled: true`" - isso ficou desatualizado. Confirmado via
API REST: o workflow inteiro está `active:false` desde a demanda 303 (27/08, bug real de dado em
produção, ver `HISTORICO.md`), não é mais "só os nós de envio desligados". Fluxo real de pedido
hoje é o "Criar pedido" do Inbox no app Next.js, não mais este workflow n8n.

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
