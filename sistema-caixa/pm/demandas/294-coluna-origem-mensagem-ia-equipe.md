# 294 — Coluna real de origem da mensagem (IA / equipe / sistema) no log

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 02 - DADOS JS GRAFICA (schema + caminho equipe) / 01 - N8N JS GRAFICA (caminhos sistema + ia)

## Contexto
A demanda 293 (desenho da fronteira IA/automação/equipe) achou um problema real: hoje
`jsgrafica_log_msgs_privadas` **não distingue** se uma mensagem enviada (`from_me=true`) foi
escrita pela IA, digitada manualmente por um atendente no Inbox, ou é uma mensagem automática do
sistema (lembrete de Pix, confirmação de pagamento). O Edvam reforçou depois do relato: o agente
**precisa saber com certeza** quando uma mensagem foi mandada pela equipe, não é opcional.

A 293 propôs um contorno (o agente mantém o próprio histórico de envio e infere por eliminação o
que sobra é de humano) — funciona, mas é frágil por natureza: qualquer mensagem que o agente
mandar e não conseguir registrar no próprio histórico (falha de rede, reinício do workflow, bug
novo) vira um falso positivo "isso foi a equipe que mandou". Uma coluna real, marcada na hora que
cada caminho grava a mensagem, é mais simples e não depende de inferência.

## Objetivo
`jsgrafica_log_msgs_privadas` tem um campo confiável que diz quem gerou cada mensagem enviada
(`from_me=true`) — IA, equipe (humano digitando), ou sistema (automação tipo lembrete/
confirmação automática de pagamento) — sem precisar adivinhar.

## Escopo
- Incluído: migration aditiva, coluna nova (ex. `enviado_por` ou `origem_envio`, tipo texto/enum
  com valores `ia` / `equipe` / `sistema`), nullable ou com default seguro pra não quebrar linha
  histórica.
- Incluído: mapear TODOS os caminhos que hoje escrevem `from_me=true` nesta tabela e marcar cada
  um corretamente na origem:
  - `app/api/inbox/responder/route.ts` (equipe digitando manualmente no Inbox) → `equipe`
  - Workflows n8n que mandam mensagem automática hoje (`13-LEMBRETE PIX`, confirmação de
    pagamento, etc.) → `sistema`
  - O workflow do agente de atendimento (hoje `206`, ou o que vier a substituí-lo pelo Caminho C
    da demanda 292) → `ia`
- Incluído: confirmar com o 01-N8N e o 03-APP quais caminhos exatos escrevem nessa tabela hoje
  (não presumir a lista completa sozinho) antes de considerar o levantamento fechado.
- Incluído: testar com mensagem real de cada origem, confirmando que a coluna vem preenchida
  certo nos 3 casos.
- Explicitamente fora de escopo: mudar a lógica de quem pode responder o quê (isso é decisão de
  produto já coberta por outras demandas) — é só marcar a origem corretamente, sem julgar.

## Critérios de aceite
- [x] Coluna nova criada, migration aditiva, sem quebrar linha histórica
- [x] Todos os caminhos que escrevem `from_me=true` identificados e corrigidos pra marcar a
      origem certa (equipe: 02-DADOS; sistema/ia: 01-N8N, ver relato)
- [x] Testado com mensagem real de cada origem (equipe, sistema, e a IA quando existir)
- [x] Linha histórica (antes desta demanda) pode ficar sem valor/com valor "desconhecido", não
      precisa reconstruir retroativamente, só marcar certo daqui pra frente

## Riscos e cuidados
Migration aditiva, baixo risco. Cuidado real é não deixar nenhum caminho de escrita esquecido —
um caminho não marcado quebra a garantia que a demanda 293 pede.

## Referências
Demanda 293 (`pm/conhecimento/caminho-c-fronteira-ia-automacao-equipe.md`, achado original e
contorno proposto, esta demanda substitui o contorno por solução de dado real). Demanda 292
(Caminho C, contexto de por que isso importa agora).

## Relato de execução

**Status: parcial.** Schema + caminho `equipe` implementados, testados com mensagem real e em
produção. Caminhos `sistema` e `ia` **mapeados com precisão, spec pronta**, mas não implementados
— são domínio 01-N8N (edição de workflow), e o candidato a workflow `ia` (`206`) não foi
localizado. Detalhe completo em `pm/conhecimento/coluna-enviado-por-origem-mensagem.md`.

### O que foi feito

1. **Migration aditiva aplicada** (`add_enviado_por_log_msgs_privadas`): coluna `enviado_por`
   (text, nullable, sem default) + `CHECK (enviado_por is null or enviado_por in
   ('ia','equipe','sistema'))`. Confirmado: as 73.022 linhas históricas ficaram todas `NULL`
   (critério explícito da demanda, sem reconstrução retroativa).
2. **Descoberta de arquitetura não documentada antes** (necessária pra saber ONDE marcar a
   origem com segurança): todo `from_me=true` desta tabela passa, cedo ou tarde, pelo workflow
   `01 - JSGRAFICA | LOG MSG RECEBIDAS` (a Z-API ecoa de volta qualquer mensagem enviada, de
   qualquer origem, como evento `ReceivedCallback`). Os nós de escrita do `01`
   (`MSG PRIVADA`/`MSG PRIVADA1`) usam `autoMapInputData` — só escrevem as chaves que o pipeline
   dele produz, e esse pipeline **nunca gera uma chave `enviado_por`**. Ou seja: o `01` nunca
   sobrescreve essa coluna, o que torna seguro qualquer caminho gravar a origem direto, sem risco
   de o eco genérico apagar depois.
3. **Mapeei os caminhos reais que escrevem `from_me=true`** (grep completo do app +
   leitura completa de cada workflow n8n relevante, não presumido):
   - App: só 2 caminhos — `lib/inboxLog.ts` (usado por `app/api/inbox/responder/route.ts`,
     único caller) e `app/api/inbox/enviar-midia/route.ts`. Os outros arquivos que tocam a
     tabela (`apagar-mensagem`, `transcrever-audio`, `mensagens`, `inboxContexto.ts`) só
     fazem SELECT/UPDATE em campo que não cria linha — confirmado lendo cada um.
   - n8n `sistema`: li `13 - JSGRAFICA | LEMBRETE PIX PENDENTE` nó a nó (6 nós) — **não escreve
     em `jsgrafica_log_msgs_privadas` hoje**, só manda via Z-API direto e marca
     `jsgrafica_pedidos.lembrete_pix_enviado_at`. Não achei nenhuma outra automação de mensagem
     "sistema" além desta (o exemplo "confirmação de pagamento" citado na demanda não tem
     workflow/rota correspondente encontrado — sinalizo, não presumo que existe).
   - n8n `ia`: o workflow `206 - JSGRAFICA | AGENTE FASE B` citado na própria demanda **não foi
     localizado nem por nome, nem pelo ID exato registrado em
     `pm/conhecimento/mapa-workflows-n8n.md` (`M5WZ6zHAe625XyJm`)** — busca por ID direto também
     devolveu "Workflow not found". Não é mistério novo: bate com o mesmo padrão já aberto e não
     resolvido na demanda 273 (19 dos 20 workflows `[DESCONTINUADO]` também "not found" por ID
     direto via este MCP, causa não confirmada). Muito provavelmente é o mesmo problema, agora
     afetando um workflow que deveria estar ativo — não presumo a causa, recomendo o 01-N8N
     confirmar via API REST direta (mesma recomendação já registrada na 273). Localizei e li por
     completo o outro candidato ativo, `JSGRAFICA_ATENDIMENTO_AI` (agente Gemini "Dizu" mais
     antigo, gated pela mesma whitelist) — ele também não grava em `jsgrafica_log_msgs_privadas`
     (loga em `jsgrafica_memoria_conversas`, tabela própria).
4. **Implementei e marquei corretamente o único caminho que consegui fechar com certeza**:
   `enviado_por: 'equipe'` em `lib/inboxLog.ts` e `app/api/inbox/enviar-midia/route.ts`.
   `npx tsc --noEmit` limpo. Deploy em produção: `dpl_8z1t4CNz5X5R4LgGiTDvrjfwJDRR`.
5. **Não implementei os caminhos `sistema`/`ia`** — são edição de workflow n8n, fora do meu
   acesso de escrita (MCP n8n desta sessão é só leitura/execução, sem ferramenta de edição) e,
   mesmo se tivesse acesso via API, é domínio do 01-N8N por prática já estabelecida neste
   projeto. Deixei a spec exata do que precisa ser adicionado em cada um (1 nó de INSERT em
   `jsgrafica_log_msgs_privadas` logo após o envio via Z-API, mesmo formato do `lib/inboxLog.ts`)
   documentada em `pm/conhecimento/coluna-enviado-por-origem-mensagem.md`.

### Testes realizados e resultado

- `CHECK` testado: insert com `enviado_por='robo'` rejeitado (`violates check constraint`).
- **Teste real de ponta a ponta pro caminho `equipe`**: mandei mensagem real via
  `POST /api/inbox/responder` pro número de teste já estabelecido no projeto
  (`5521965185667`), `message_id 43D184A8F8E1F442FA33` — confirmei no banco
  `enviado_por='equipe'`. Mais importante: **confirmei que isso sobrevive ao eco do `01`** — o
  `status` da linha mudou de `'sent'` pra `null` entre o insert do app e minha consulta (prova de
  que o `01` processou o eco e rodou o UPDATE por cima), e `enviado_por` continuou `'equipe'`,
  intocado. Não testei `enviar-midia` com envio real (mesma estrutura de insert, mesma garantia
  de `autoMapInputData` já provada — risco residual muito baixo, mas fica registrado que não foi
  testado ponta a ponta, só por paridade de código).
- `sistema`/`ia`: **não testados** — o mecanismo de escrita ainda não existe em nenhum dos dois,
  não tem o que testar até 01-N8N implementar a spec.
- 100% das mudanças de dado desta demanda foram a migration (aditiva) + 1 mensagem de teste real
  (rotulada "[teste demanda 294]" no texto, pro número de teste já estabelecido no projeto).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- O workflow `206 - JSGRAFICA | AGENTE FASE B`, citado como ativo em produção no
  `CLAUDE.md` do projeto (`caixa-js-grafica/CLAUDE.md`, seção "Automação de atendimento"), não
  foi encontrado no n8n hoje — pode estar desatualizado, ou o workflow pode ter sido
  arquivado/renomeado. Recomendo o PM confirmar com o 01-N8N antes de próxima demanda que
  presuma esse workflow existir.

  **Correção do PM (2026-08-16, mesmo dia)**: reconferido na hora — o workflow está funcionando
  normal em produção, confirmado com chamada HTTP real ao webhook (`200 "Workflow was started"`)
  e whitelist funcionando (telefone não autorizado, `0` sessões criadas). Era só a ferramenta MCP
  sem visibilidade transitória, não o workflow em si (detalhe em `project_n8n_workflows.md`,
  memória do projeto). A spec do caminho `ia` desta demanda continua válida e pronta pro 01-N8N,
  o workflow-alvo existe e está acessível por eles normalmente.
- Não existe hoje nenhum mecanismo de "confirmação automática de pagamento" enviando mensagem
  (citado como exemplo de `sistema` na própria demanda) — se isso é uma automação real em algum
  lugar que eu não encontrei, ou se é uma automação ainda não construída, precisa de confirmação
  do 01-N8N/03-APP antes de generalizar a spec do `sistema` além do Lembrete Pix.

### Status final
**Parcial.** Critérios de aceite 1 (coluna) e 4 (linha histórica sem valor) batidos e testados.
Critério 2 (todos os caminhos identificados e corrigidos) — identificados com precisão, mas só
`equipe` foi corrigido; `sistema` e `ia` têm spec pronta, aguardando 01-N8N. Critério 3 (testado
com mensagem real de cada origem) — só `equipe` testado ponta a ponta; a própria demanda já
hedgeava "a IA quando existir", o que se confirmou ser o caso real hoje. Nada bloqueado por minha
parte — o próximo passo é o PM decidir se abre demanda separada pro 01-N8N com a spec já pronta,
ou se confirma primeiro onde está o workflow `206`/Caminho C antes de prosseguir.

### Critérios de aceite
- [x] Coluna nova criada, migration aditiva, sem quebrar linha histórica
- [x] Todos os caminhos que escrevem `from_me=true` identificados e corrigidos pra marcar a
      origem certa (`equipe`, `sistema`, `ia` — os 3 implementados, ver relato do 01-N8N abaixo)
- [x] Testado com mensagem real de cada origem (equipe, sistema e ia — ver relato do 01-N8N)
- [x] Linha histórica pode ficar sem valor — confirmado, 73.022 linhas antigas todas `NULL`

## Relato de execução (01-N8N, 2026-08-16): caminhos `sistema` e `ia`

Implementados os 2 caminhos que faltavam, seguindo exatamente a spec deixada pelo 02-DADOS em
`pm/conhecimento/coluna-enviado-por-origem-mensagem.md` (mesmo formato de `lib/inboxLog.ts`, 1
node de INSERT logo após cada envio real via Z-API).

### `sistema`: workflow `13 - JSGRAFICA | LEMBRETE PIX PENDENTE`
Backup: `pm/backups/13-jsgrafica-lembrete-pix_pre-demanda294_2026-08-16.json` (6 nodes). Único
node novo: `LOG Sistema - Lembrete Pix`, inserido entre `Enviar Lembrete Z-API` e `Marcar
Lembrete Enviado` (que já referenciava `$('Montar Lembrete').item`, nunca `$json` direto: seguro
inserir sem quebrar nada). Usei `.item` (não `.first()`) igual ao node vizinho, porque este
workflow pode processar vários pedidos aguardando Pix na mesma execução (1 item por pedido);
`.first()` sempre pegaria o primeiro e logaria telefone/mensagem errados quando há mais de um.

**Testado com envio real**: inserido pedido de teste (`id: 'teste294-pix-1'`, telefone
5521965185667, `status: 'aguardando_pix'`, `confirmado_cliente_at` 4h atrás pra bater o filtro de
"mais de 3h"), workflow disparado via `execute_workflow`. Confirmado na execução real e depois
direto no banco: `enviado_por: 'sistema'`, mensagem exata do lembrete (com a chave Pix real da
config), `zaapId` real confirmando o envio. **Confirmação do achado crítico da spec**: o `status`
da linha virou `null` entre o insert e minha consulta seguinte (prova de que o eco do `01` já
processou e rodou o UPDATE por cima) e `enviado_por` continuou `'sistema'`, intocado, mesma
garantia já provada pro caminho `equipe`, agora confirmada de novo pro `sistema`.

### `ia`: workflow `206 - JSGRAFICA | AGENTE FASE B`
Backup: `pm/backups/206-jsgrafica-agente-fase-b_pre-demanda294_2026-08-16.json` (84 nodes). O
achado da 294 de que o `206` "não foi localizado" já tinha sido corrigido pelo PM no mesmo dia
(era instabilidade pontual do MCP, workflow sempre esteve ativo e acessível via API, ver
`CLAUDE.md`/memória do projeto). Mapeei os 7 pontos reais de envio (todo `httpRequest` cuja URL
aponta pro `_zapi_url`/Z-API): `POST Confirmação Z-API`, `Enviar Proposta Botões`, `Enviar Lista
Categorias`, `POST Confirmação Pedido Criado`, `POST Aviso Negada`, `POST Confirmação Categoria`,
`POST Aviso Dizu`. 1 node novo de INSERT (`LOG IA - ...`) logo depois de cada um, referenciando o
node "Montar Envio X" correspondente pra `telefone`/`message` (6 casos) ou, no caso de `Enviar
Lista Categorias` (que monta a mensagem inline, sem node "Montar" separado), o texto literal
exato já usado no `jsonBody` desse node. Conferido antes que os 3 nodes que já tinham sucessor
(`Baixar Mídia`, `Salvar Proposta Pendente`, `Salvar Lista Enviada`) usam só referência nomeada
(`$('Nome').first()`), nunca `$json` do predecessor imediato: seguro inserir um node no meio sem
quebrar nada.

**Testado com mensagem real, 4 dos 7 pontos** (payload seguro da demanda 283, `chatLid` real):
- Texto puro → proposta: `enviado_por: 'ia'`, mensagem "Recebi seu pedido! Pelo que entendi,..."
  (confirma que a correção da demanda 289 continua funcionando junto com o log novo).
- Mídia real → confirmação de recebimento + proposta: os 2 `enviado_por: 'ia'`, proposta com
  "Recebi seu arquivo! Pelo que vi,..." (mesma confirmação de não-regressão da 289 pro caminho de
  mídia).
- Texto ambíguo → lista de categorias: `enviado_por: 'ia'`, mensagem exata confirmada.
Todos os 4 confirmados direto no banco (não só na execução), incluindo a mesma prova de
sobrevivência ao eco do `01` (`status` virou `null`, `enviado_por` permaneceu).
**Não testados com disparo real nesta rodada** (`Pedido Criado`, `Negada`, `Categoria Escolhida`,
`Dizu`, exigiriam simular fluxo de conversa de múltiplas etapas: confirmar/negar proposta,
escolher categoria, ou o gatilho específico do Dizu): estrutura idêntica aos 4 já testados (mesmo
padrão de node, mesma garantia de referência nomeada), conferida por leitura de código, não por
execução ao vivo, registrado honestamente, não fica escondido.

### Diff final
Workflow `13`: `1` node adicionado, `0` removidos, `0` nodes existentes alterados, `2` conexões
mudadas. Workflow `206`: `7` nodes adicionados, `0` removidos, `0` nodes existentes alterados
(só as conexões dos 7 pontos de envio + as 3 novas arestas de saída dos LOG que têm sucessor), `10`
conexões mudadas. `jsgrafica_contatos` conferido intacto (checklist da demanda 283). Todo dado de
teste (pedido sintético, sessões, linhas de log) apagado ao final.
