# 279 — Bug real: palavra-chave antiga (021) desvia mensagem do agente novo pra caminho morto

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16): mandou "QUANTO É A XEROX?" pro número de teste (já
conectado ao agente Fase B desde a 274/278) e não recebeu nenhuma resposta. Investigação do PM
confirmou a causa raiz.

`CHECK SESSAO PEDIDO` (workflow `01`) tem uma lógica bem mais antiga que a Fase B (demanda 021,
2026-07-02) que reconhece palavras-chave de serviço (`xerox`, `copia`, `imprimir`, `plastificar`,
`encadernar`, `banner`, `faixa`, `adesivo`, `recarga`, `consulta cpf`, `segunda via`, `2 via`,
entre outras) **antes** de qualquer checagem do agente novo, e quando bate manda `_destino =
'pedidos'` — indo direto pro workflow `06-PEDIDOS`. O node `AJUSTAR DESTINO AGENTE FASE B`
(demanda 274) só intercepta quando `_destino === 'atendimento'`, então nunca chega a rodar nesse
caso.

**O problema real**: os nós que mandam mensagem de verdade pro cliente dentro do `06-PEDIDOS`
estão `disabled: true` há semanas (achado de 2026-07-10, nunca revertido — o fluxo real de pedido
hoje é o app Next.js, não esse workflow). Então toda mensagem que bate uma dessas palavras-chave,
sem sessão de pedido já aberta, é roteada pra um caminho que grava estado mas **nunca responde
nada** — confirmado com evidência real: `jsgrafica_memoria_conversas` registrou
`fase_jornada: 'coleta_specs_pedido'` pro teste do Edvam, sem nenhuma mensagem saindo.

**Achado grave, mais amplo que o teste de hoje**: isso não é específico do agente novo — **qualquer
cliente real** (autorizado ou não pro agente Fase B) que mande uma dessas palavras-chave como
primeira mensagem, sem sessão de pedido ativa, cai no mesmo buraco. A mensagem continua aparecendo
no Inbox pra atendimento manual (o log não passa por esse caminho, é gravado à parte), mas o
sistema automático nunca teria respondido — isso é assim desde que os nós do `06-PEDIDOS` foram
desabilitados, não é regressão desta sessão.

## Objetivo
Nenhuma mensagem real (com ou sem palavra-chave reconhecida) fica sem resposta em silêncio.
Especificamente: telefone autorizado pro agente Fase B, mandando texto que bate uma palavra-chave
antiga, deve ir pro `206` (que já sabe responder texto, desde a 278), não pro `06-PEDIDOS` morto.

## Escopo
- Incluído: investigar e decidir a ordem certa entre a lógica de palavra-chave (021) e a checagem
  do agente Fase B (`AJUSTAR DESTINO AGENTE FASE B`) — a recomendação natural é checar telefone
  autorizado + Fase B ANTES da palavra-chave antiga, não depois, já que o `206` cobre esse caso
  melhor hoje (com toda a triagem/escalonamento construído). Documentar a decisão tomada.
- Incluído: para telefone NÃO autorizado no Fase B, decidir o que fazer com a lógica de
  palavra-chave — reativar os nós de envio do `06-PEDIDOS` está fora de escopo (mudaria muito mais
  coisa), mas pelo menos não deixar a mensagem silenciosamente sem resposta nenhuma é o mínimo:
  avaliar se cai pro `ATENDIMENTO_AI` como qualquer outra mensagem sem sessão, em vez de pro
  `06-PEDIDOS` morto.
- Incluído: investigar por que "OI" (mensagem de texto simples, sem palavra-chave, mesma sessão de
  teste) também não teve nenhuma resposta nem deixou rastro em `jsgrafica_memoria_conversas` —
  achado ainda não explicado pelo PM, pode ser causa diferente do caso do "xerox" (ver nota do PM
  no fim deste arquivo com o que já foi investigado, pra não repetir do zero).
- Incluído: testar com os 2 casos reais que já falharam ("QUANTO É A XEROX?" e "OI"), confirmando
  resposta de verdade depois da correção.
- Explicitamente fora de escopo: reativar o `06-PEDIDOS` como caminho de envio de verdade (decisão
  arquitetural maior, não é isso que está sendo pedido); mudar a lista de telefones autorizados.

## Critérios de aceite
- [x] Telefone autorizado Fase B + texto com palavra-chave antiga → vai pro `206`, recebe resposta
      real (testado com o caso real "xerox")
- [x] "OI" investigado até a causa raiz, corrigido ou explicado com evidência real (não suposição)
- [x] Telefone NÃO autorizado + palavra-chave: comportamento decidido e documentado (não fica
      pior do que já estava, idealmente não fica mais em silêncio total)
- [x] Nenhuma regressão nos caminhos já testados (mídia, texto objetivo/ambíguo/dado pessoal das
      demandas 274/278)

## Riscos e cuidados
Mexer em `CHECK SESSAO PEDIDO`/`Switch Destino` toca o coração do roteamento do `01` — mesma
disciplina de sempre (backup, diff final, testar isolado com o número do Edvam antes de considerar
concluído). Esse achado já existia antes de hoje pra clientes reais fora da whitelist — não é uma
regressão desta sessão, mas precisa ser corrigido com o mesmo cuidado de qualquer mudança em
produção real.

## Nota do PM — investigação já feita, não repetir do zero
Confirmado via SQL: `jsgrafica_agente_teste_sessoes` está com 0 linhas pro telefone de teste (nem
"oi" nem "xerox" criaram sessão no `206`) — nenhum dos dois chegou no `206`. `xerox` deixou rastro
em `jsgrafica_memoria_conversas` (`fase_jornada: 'coleta_specs_pedido'`, timestamp batendo com o
teste) — confirma que foi pro `06-PEDIDOS`. `oi` não deixou rastro em `jsgrafica_memoria_conversas`
nem em nenhum outro lugar checado.

**Mapa completo do grafo do `01` refeito em 2026-08-16 (JSON completo, não suposição)**, pra achar
qualquer outro caminho que possa "engolir" mensagem: confirmado que só existem os 2 nós desligados
de propósito desde a demanda 245 (chamadas mortas do `05`/`07`, intencional, não é problema) mais
o `06-PEDIDOS` (causa do bug do "xerox" acima). **Candidato forte pro "oi", achado nesse mapeamento**:
antes de chegar em `CHECK SESSAO PEDIDO`, toda mensagem passa pelo node `If enviar llm`, que exige
**8 condições simultâneas** (`tipo_evento==='RECEBIDA'`, `operation==='CREATE'`,
`event_type==='ReceivedCallback'`, `is_group_notification===false`, `from_me===false`, `roteamento`
não-vazio, `broadcast===false`, `is_newsletter===false`) — a saída `false` desse IF **não vai pra
lugar nenhum** (array vazio nas conexões, confirmado no JSON), ou seja, se qualquer uma dessas 8
condições falhar, a mensagem é descartada ali, em silêncio total, sem log de erro nem rastro em
lugar nenhum (o registro no Inbox é um caminho separado, `Switch Log Geral`, não afetado). Isso
bate exatamente com o sintoma do "oi" (zero rastro em qualquer lugar). **Não confirmado com 100%
de certeza** sem ver o payload bruto real dessa mensagem específica (execução real do n8n, que o
PM não tem acesso) — pedido explícito pro 01-N8N: puxar a execução real do `01` pro horário do
"oi" (2026-08-16 02:42:23 UTC) e confirmar qual dessas 8 condições falhou, se foi essa a causa.

## Relato de execução

Executado em 2026-08-16, no workflow `01` (produção real). Backup antes de mexer:
`pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda279_2026-08-16.json` (52 nodes).

### Causa raiz do "OI": investigada até o fim, não é o que o PM suspeitava

O PM tinha um candidato forte (`If enviar llm`, 8 condições, saída falsa sem destino). Puxei a
execução real do `01` mais próxima de 2026-08-16 02:42:23 UTC (`id 1228413`, `first_event_at`
bate exato com `message_text: "OI"`, `phone: 5521965185667`) e confirmei com o JSON completo da
execução: **`If enviar llm` passou normalmente** (`roteamento: 'llm'` estava preenchido, a
hipótese do PM não se confirmou). A mensagem seguiu até `CHECK SESSAO PEDIDO` (`_destino:
'atendimento'`, correto, "oi" não bate nenhuma palavra-chave), passou por `AJUSTAR DESTINO AGENTE
FASE B` mas **não foi redirecionada pro `206`** porque esse node só considerava mídia sem legenda
como caminho elegível, nunca texto puro (gap deixado pela própria demanda 274, nunca atualizado
quando a 278 ensinou o `206` a atender texto). Seguiu pro `HTTP Request` (chamada real pro
webhook do `JSGRAFICA_ATENDIMENTO_AI`), que retornou sucesso do lado do `01` (HTTP 200, `995ms`).

**Causa raiz de verdade**: a própria execução do `JSGRAFICA_ATENDIMENTO_AI` (`id 1228414`,
disparada 1s depois) terminou em erro: o node `Postgres Chat Memory / supabase /rag`
(`@n8n/n8n-nodes-langchain.memoryPostgresChat`, conexão Postgres direta, não REST) falhou com
`connect ENETUNREACH 2600:1f18:2e13:9d44:e385:a16d:1eb0:d8e:5432`: falha de rede tentando
alcançar o Postgres por IPv6, derrubando o AI Agent inteiro antes de gerar qualquer resposta.
**Isso é um problema de infraestrutura de rede dentro do `JSGRAFICA_ATENDIMENTO_AI`** (conexão
direta Postgres por IPv6 instável), completamente fora do roteamento do `01`/`206` e fora do
escopo desta demanda (workflow diferente, credencial compartilhada "Postgres account" que pode
afetar outros clientes da mesma infra LabOnchain se eu mexer nela sem autorização). Não tentei
corrigir a credencial/conexão Postgres, isso precisa de decisão própria, registrado como achado
separado (ver abaixo).

**Por que a correção desta demanda resolve o sintoma mesmo sem tocar no `ATENDIMENTO_AI`**: com o
gatilho de texto puro agregado em `AJUSTAR DESTINO AGENTE FASE B` (mesma correção do bug do
"xerox", ver abaixo), "oi" de um telefone autorizado **para de chegar no `ATENDIMENTO_AI` de
qualquer jeito**: vai direto pro `206`, que já sabe lidar com texto (278) e não depende da
conexão Postgres direta que está falhando. Retestado depois da correção: "OI" agora recebe
resposta real (`zaapId: 01A008A003B274FFA1E50F6B89B34C7C`, lista de categorias, classificado
`ambiguo` pelo Gemini). Nota: em teste anterior (278) "Bom dia" sozinho tinha classificado
`fora_de_escopo`; "OI" sozinho desta vez classificou `ambiguo`, variação normal do julgamento do
Gemini entre frases parecidas mas não idênticas, não é inconsistência de código.

### Correção do bug do "xerox" (021 desviando pro `06-PEDIDOS` morto)

Único node alterado: `AJUSTAR DESTINO AGENTE FASE B` (workflow `01`). Antes, a condição só
reconsiderava `_destino` quando `CHECK SESSAO PEDIDO` já tinha decidido `'atendimento'`, nunca
quando a lógica de palavra-chave da demanda 021 (`xerox`, `imprimir`, `recarga`, `2 via` etc.)
já tinha decidido `'pedidos'` primeiro. Como `CHECK SESSAO PEDIDO` roda a checagem de
palavra-chave ANTES de qualquer coisa relacionada ao `206`, uma mensagem tipo "quanto é a xerox"
nunca tinha chance de ser reavaliada.

**Correção**: `CHECK SESSAO PEDIDO` marca a mensagem redirecionada pela palavra-chave antiga com
`_origem_pedido: 'palavra_chave_021'` (achado confirmado direto no código, não presumido); esse
campo NUNCA é setado no caminho de sessão de pedido real (`temSessaoPedido`), só no da 021. Usei
essa marca como discriminador seguro: `AJUSTAR DESTINO AGENTE FASE B` agora reconsidera o destino
quando `_destino === 'pedidos' && _origem_pedido === 'palavra_chave_021'` (a palavra-chave antiga)
**ou** quando `_destino === 'atendimento'` (fallback padrão, caso de sempre). Numa sessão de
pedido real (`_destino === 'pedidos'` sem essa marca), nenhuma das duas condições bate, o node
devolve o evento sem tocar em nada, exatamente como antes.

Dentro dessas duas situações: se o telefone está autorizado no Fase B e a mensagem é mídia sem
legenda OU texto puro (mesma definição do `206`, agora replicada aqui), vira `_destino:
'agente_fase_b'`. Se veio da palavra-chave antiga mas o telefone NÃO está autorizado (ou não é
elegível), o `_destino` vira `'atendimento'` em vez de ficar `'pedidos'`: não cai mais no
`06-PEDIDOS` morto, segue pro `ATENDIMENTO_AI` como qualquer mensagem sem sessão (sujeito à
whitelist própria dele, comportamento já existente, não uma trava nova).

### Testes realizados, via webhook real (`https://n8n.labonchain.xyz/webhook/jsgraficamsgrecebidas`),
número do Edvam, sessão de teste limpa antes de cada rodada:
- **"QUANTO É A XEROX?"**: antes gravava `fase_jornada: 'coleta_specs_pedido'` em
  `jsgrafica_memoria_conversas` e nunca respondia. Depois da correção: criou sessão real no `206`,
  classificou `ambiguo`, mandou a lista de categorias de verdade (`zaapId:
  01A0089ED8C17BD7A4F68DB74CA570CD`).
- **"OI"**: depois da correção, roteado direto pro `206` (nunca mais toca no `ATENDIMENTO_AI`
  quebrado), classificou `ambiguo`, mandou a lista de categorias (`zaapId:
  01A008A003B274FFA1E50F6B89B34C7C`).
- **Regressão de mídia**: imagem real do log, sem legenda, classificou `documento_obvio`, propôs
  P&B A4, mensagem real enviada (`zaapId: 01A008ACCF027CCEB18618E18D0F3BF5`), sem mudança.
- **Regressão de sessão de pedido real**: tentativa de simular via `INSERT` direto em
  `jsgrafica_memoria_conversas` esbarrou num achado novo (ver abaixo) que invalidou o teste ao
  vivo; a garantia de não-regressão aqui vem de leitura direta do código: o campo
  `_origem_pedido` só é setado no ramo da palavra-chave 021, nunca no ramo de sessão real, então
  os dois ramos que esta correção reconsidera (`eraKeywordAntiga`/`eraAtendimentoFallback`) são
  estruturalmente impossíveis de bater numa sessão de pedido real. Documentado com a ressalva
  honesta de que não foi confirmado ao vivo por causa do achado abaixo.

### Achado novo, fora do escopo desta demanda, não corrigido: `GET Memoria Ativa` nunca pega a
### memória mais recente
Ao tentar simular uma sessão de pedido real pra testar regressão, inseri uma linha nova em
`jsgrafica_memoria_conversas` pro telefone de teste com `fase_jornada: 'coleta_specs_pedido'`
(fase ativa de verdade). O node `GET Memoria Ativa` (workflow `01`) devolveu, em vez dela, a
linha `id: 1`, de **2026-02-05**, a mais antiga de todas pra esse telefone. Confirmado direto na
configuração do node: é um `getAll` com `limit: 1` filtrando só por `telefone`, **sem nenhum
`sort`/ordenação**. Sem ordenação explícita, o Supabase/PostgREST não garante "mais recente
primeiro": na prática está devolvendo a linha mais antiga (ou alguma ordem que não é por
recência) pra esse telefone, que já tem 48+ linhas históricas. Isso significa que a checagem de
"sessão de pedido já ativa" (`temSessaoPedido`) pode estar lendo memória desatualizada pra
qualquer telefone com mais de 1 linha de histórico, potencialmente relevante pra qualquer
cliente recorrente, não só o de teste. **Não corrigido aqui** (node compartilhado central de
roteamento, fora do escopo desta demanda, merece investigação e teste dedicados, não um fix de
lado). Registrado como achado grave pra virar demanda própria.

### Diff final
Contra o backup pré-279: `0` nodes adicionados, `0` removidos, exatamente `1` node com mudança
(`AJUSTAR DESTINO AGENTE FASE B`), `0` conexões alteradas. `CHECK SESSAO PEDIDO` não foi tocado.
Todos os dados de teste (sessões, log de mensagens, linha de memória sintética) apagados ao
final, `0` linhas restantes confirmado.
