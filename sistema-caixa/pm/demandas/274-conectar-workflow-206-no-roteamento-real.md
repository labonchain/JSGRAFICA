# 274 — Conectar o agente Fase B (206) no roteamento real do workflow 01

Status: concluída
Criada em: 2026-08-15
Aprovada em: 2026-08-15
Concluída em: 2026-08-15
Chat executor: 01 - N8N JS GRAFICA

## Desbloqueio final (2026-08-15, PM)
Edvam abriu o workflow `206` no editor do n8n e alternou o toggle ativo/inativo pela UI (desligar
e ligar de novo), exatamente a ação pedida no relato abaixo. Confirmado pelo PM logo em seguida:
`POST https://n8n.labonchain.xyz/webhook/jsgrafica-agente-fase-b` com número não autorizado
retornou `200 {"message":"Workflow was started"}` (antes retornava 404 "not registered"), e
`jsgrafica_agente_teste_sessoes` confirma `0` sessões criadas pra esse número — webhook
registrado de verdade E a trava de autorização funcionando. Falta só o teste com mensagem REAL do
WhatsApp do Edvam (critério de aceite que ficou pendente no relato original).

## Contexto
O workflow `206 - JSGRAFICA | AGENTE FASE B (TESTE ISOLADO)` está pronto tecnicamente (demandas
206/208/272) mas nunca recebe mensagem real de cliente — só dispara quando alguém aciona
manualmente (`execute_workflow`). O workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (o que recebe
toda mensagem real via Z-API) não tem, hoje, nenhuma ligação com o `206` — confirmado direto no
código em 2026-08-14/15 (zero referência ao `206` ou ao seu webhook em qualquer node do `01`).

O Edvam pediu pra ligar isso de verdade, com foco em funcionar corretamente — essa demanda é
exatamente essa ligação, seguindo a Proposta 1 já desenhada pela demanda 243 (nunca implementada
até agora): reaproveitar o padrão que o próprio `01` já usa pra chamar outros workflows (`Switch
Destino` → `HTTP 06-PEDIDOS`, mesmo mecanismo), sem inventar nada novo.

**Por que isso é seguro de fazer agora, mesmo sendo produção real**: o mecanismo só dispara pra
telefone que estiver na tabela `jsgrafica_telefones_autorizados` com `ativo=true`. Hoje essa
tabela só tem os 5 números internos/teste de sempre (conferido em 2026-08-14) — nenhum cliente
real. Ligar o `206` agora não expõe nenhum cliente a nada; só passa a responder de verdade pros
números que já são de teste. Quem decide quais telefones entram nessa lista, daqui pra frente, é
a tela nova do Admin (demanda 275, despachada junto) — não mais SQL direto.

## Objetivo
Quando uma mensagem real chegar no `01` de um telefone autorizado, sendo mídia sem legenda
começando uma sessão nova (sem sessão de pedido ativa), o `01` chama o `206` de verdade (mesmo
padrão HTTP já usado pro `06-PEDIDOS`). Qualquer outra condição continua exatamente como hoje —
zero mudança de comportamento pra quem não está na whitelist ou não bate o padrão de mídia.

## Escopo
- Incluído: no node `Switch Destino` do workflow `01`, adicionar 1 branch novo: telefone
  autorizado (`jsgrafica_telefones_autorizados`, `ativo=true`) **E** mensagem de mídia sem
  legenda **E** sem sessão de pedido ativa (`CHECK SESSAO PEDIDO` já calcula isso, reaproveitar) →
  chama `HTTP 206` (novo node, mesmo padrão do `HTTP 06-PEDIDOS`: POST pro webhook de produção do
  `206`, não o de teste). Se qualquer condição falhar, cai no fallback de sempre (hoje é o
  `ATENDIMENTO_AI`, sem mudança).
- Incluído: o webhook do `206` que vai receber isso precisa ser o de produção, não o path de teste
  (`jsgrafica-agente-fase-b-teste-206`) — avaliar se cria um path novo de produção pro `206` ou
  reaproveita o mesmo (documentar a decisão).
- Incluído: o próprio `206` continua com o nó `Só Número Edvam?` que hoje só deixa passar
  `5521965185667` — **isso precisa ser trocado** pra também checar a tabela
  `jsgrafica_telefones_autorizados` (mesma lógica de autorização do `01`), senão a ligação nova
  não serve pra nada além do seu próprio número mesmo depois de autorizar outros. Ajustar esse nó
  do `206` faz parte desta demanda.
- Incluído: testar com o próprio número do Edvam primeiro (já autorizado), confirmando que uma
  mensagem REAL enviada por ele (não `execute_workflow` manual) agora dispara o `206` de ponta a
  ponta, incluindo receber resposta de volta no WhatsApp dele.
- Incluído: confirmar que o comportamento de qualquer OUTRO telefone (não autorizado, ou
  autorizado mas mensagem de texto) continua idêntico ao de antes desta demanda — nenhuma
  regressão no fluxo normal (`ATENDIMENTO_AI`, `06-PEDIDOS` por sessão ativa, etc.).
- Explicitamente fora de escopo: adicionar qualquer telefone de cliente real na whitelist (isso é
  decisão separada, futura, do Edvam — ver demanda 243); mudar a régua de quando escalar; mexer em
  qualquer outra parte do `01` ou do `206` além do estritamente necessário pra essa ligação.

## Critérios de aceite
- [x] Novo branch no `Switch Destino` do `01`, testado
- [x] `206` ajustado pra checar `jsgrafica_telefones_autorizados` em vez do número hardcoded
- [ ] **BLOQUEADO**: testado com mensagem REAL (não `execute_workflow`) do número do Edvam, ponta
      a ponta, resposta recebida de volta no WhatsApp dele (ver "Bloqueio encontrado" no relato)
- [x] Confirmado sem regressão: telefone não autorizado / mensagem de texto seguem exatamente
      como antes (testado com webhook real do `01`, não `execute_workflow`)
- [x] Diff final mostrando exatamente o que mudou em cada workflow, nada além do previsto

## Riscos e cuidados
Isso toca o workflow `01` de produção de verdade — mesma disciplina extra já usada na demanda 245
(diff antes/depois, backup obrigatório antes de qualquer mudança, nenhuma alteração fora do
escopo). Testar sempre primeiro com o próprio número do Edvam antes de considerar concluído.

## Referências
Demanda 243 (Proposta 1, desenho original desta ligação). Demandas 206/208/272 (estado atual do
`206`). `pm/OBJETIVOS-MACRO.md`. Demanda 275 (painel de controle da whitelist, despachada junto,
é o que vai controlar quem entra nessa lista daqui pra frente).

## Relato de execução

Executado em 2026-08-15. Backup dos dois workflows antes de mexer:
`pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda274_2026-08-15.json` (49 nodes) e
`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda274_2026-08-15.json` (75 nodes).

### O que foi implementado e testado com sucesso

**No workflow `206`** (id `M5WZ6zHAe625XyJm`): o node `Só Número Edvam?` (IF hardcoded pro número
do Edvam) foi substituído por `GET Telefone Autorizado` (Supabase, filtro `telefone eq
{{$json.telefone}} AND ativo eq true`, limit 1), depois `Consolidar Autorização` (Code), depois
`Telefone Autorizado?` (IF). É o mesmo padrão exato já usado pelo workflow
`JSGRAFICA_ATENDIMENTO_AI` (node `GET Telefone Autorizado` + `FILTRAR TELEFONES AUTORIZADOS`), não
inventei mecanismo novo. Testado via `execute_workflow` em 3 cenários: (1) número do Edvam,
autorizado, fluxo completo até salvar proposta pendente, igual ao comportamento antigo; (2) outro
número da whitelist (`5581982574944`, "Cliente Teste"), autorizado corretamente, provando que a
checagem generaliza além do número hardcoded, testado só com mensagem de texto pra terminar em
"Stop Fora de Escopo" sem nenhum envio real de WhatsApp; (3) número fora da whitelist, rejeitado
direto na consulta ao banco (zero linhas), execução para ali mesmo, nenhum risco de envio.

Também renomeei o path do webhook, de `jsgrafica-agente-fase-b-teste-206` para
`jsgrafica-agente-fase-b`, e o nome do próprio workflow, removendo "TESTE ISOLADO" do nome (virou
"206 - JSGRAFICA | AGENTE FASE B (conectado, whitelist)"). Decisão documentada aqui: a segurança
agora vem 100% da whitelist real (`jsgrafica_telefones_autorizados`), não mais do isolamento por
número hardcoded, e manter o rótulo "TESTE ISOLADO" depois desta demanda estaria simplesmente
errado pra quem for ler o workflow depois.

**No workflow `01`**: 3 nodes novos entre `CHECK SESSAO PEDIDO` e `Switch Destino`. `GET Telefone
Autorizado (Fase B)` (mesmo padrão Supabase), depois `AJUSTAR DESTINO AGENTE FASE B` (Code: só
troca `_destino` pra `'agente_fase_b'` quando as 3 condições da demanda batem ao mesmo tempo: já
era `'atendimento'`, ou seja, sem sessão de pedido ativa e sem palavra-chave de serviço, exatamente
o que `CHECK SESSAO PEDIDO` já calculava; e telefone autorizado; e mídia sem legenda, mesma
definição usada em `É Mídia Sem Legenda?` do 206), depois nova regra no `Switch Destino`
(`_destino === 'agente_fase_b'`) chamando o novo node `HTTP 206` (POST, mesmo padrão do `HTTP
06-PEDIDOS`/`HTTP Request` do `ATENDIMENTO_AI`, `onError: continueRegularOutput` pra não abortar a
execução do `01` se o `206` estiver fora do ar, lição da demanda 245).

**Testado com webhook real do `01` (não `execute_workflow`)**, número do Edvam, 2 cenários:
1. Mensagem de **texto simples** (`teste274-regressao-texto-1`): confirmado via execução real
   (`id 1224829`) que `_destino` ficou `'atendimento'` (sem mudança), `HTTP 206` **não** rodou,
   `HTTP Request` (ATENDIMENTO_AI) rodou normalmente. Zero regressão no caminho de texto.
2. Mensagem de **mídia sem legenda** (`teste274-e2e-plumbing-1`, imagem real puxada do log):
   confirmado via execução real (`id 1224866`) que `_destino` virou `'agente_fase_b'` corretamente
   e `HTTP 206` rodou. A lógica de decisão no `01` está certa.

Diff final contra os backups: workflow `01` teve 3 nodes adicionados, 0 removidos, só `Switch
Destino` mudou entre os existentes, 4 conexões alteradas, todas nos pontos previstos. Workflow
`206` teve 4 nodes novos (incluindo os 2 renomeados, que aparecem como remove+add por causa do
nome novo), 0 mudança de lógica nos nodes que sobraram. Nada fora do escopo foi tocado em nenhum
dos dois.

### Bloqueio encontrado, não resolvido, não contornado às pressas

O `HTTP 206` do `01` **falhou** ao chamar o webhook de produção do `206`
(`https://n8n.labonchain.xyz/webhook/jsgrafica-agente-fase-b`): erro 404, "The requested webhook
... is not registered". O workflow `206` está confirmado `active: true` (chequei via API depois
de cada tentativa) e o node do webhook tem o `path` certo, mas o n8n não registrou a rota de
produção de verdade.

Esta é a **primeira vez que o workflow `206` é ativado** desde que foi criado (demanda 206,
2026-07-17): sempre foi testado só via `execute_workflow`, nunca precisou de webhook de produção
registrado antes. Tentei destravar isso de 5 formas diferentes, todas sem sucesso:
1. Deploy do path novo enquanto inativo, depois `/activate`: 404.
2. `/deactivate`, depois `/activate` de novo, esperando 15s: 404.
3. Trocar o `id` interno do node do webhook, de `n1` (genérico) pra um UUID único (hipótese de
   colisão de `id` num n8n compartilhado por ~8 clientes), depois desativar, redeploy, ativar: 404.
4. Esperar mais (60s, 6 tentativas de 10 em 10s): 404 em todas.
5. `PUT` do workflow direto enquanto já estava `active: true`, sem alternar: 404.

O próprio erro do n8n dá a pista: *"You can activate the workflow using the toggle in the
top-right of the editor"*, sugerindo que a ativação feita pela UI passa por um caminho diferente
(e mais confiável) do que a ativação feita pela API REST (`/activate`), pelo menos pra um workflow
sendo ativado pela primeira vez. Não é um problema do código desta demanda: a lógica de roteamento
nos dois workflows está correta e testada (ver seção acima). É um problema de registro de webhook
na infraestrutura do n8n, fora do que consigo resolver só com a API.

**Estado atual é seguro pra deixar assim**: `HTTP 206` tem `onError: continueRegularOutput`, então
quando falha, o resto do `01` (log da mensagem, atualização de contato) continua funcionando
normalmente, confirmado nas duas execuções reais de teste, nada trava nem quebra. O único efeito
concreto do bloqueio: hoje, se um dos 5 números da whitelist mandar mídia sem legenda sem sessão
de pedido ativa, a mensagem deixa de cair no `ATENDIMENTO_AI` (comportamento de antes desta
demanda) e cai num `HTTP 206` que falha silenciosamente. Ou seja, esses 5 números específicos
(todos de teste/interno, nenhum cliente real) deixam de receber a resposta genérica do
ATENDIMENTO_AI nesse cenário específico até o bloqueio ser resolvido. Não tentei nenhum workaround
mais agressivo (recriar o workflow do zero, duplicar com outro ID), são mudanças bem mais
invasivas e não claramente dentro do escopo desta demanda.

**Pedido pro Edvam**: abrir o workflow `206` no editor do n8n (nome agora "206 - JSGRAFICA |
AGENTE FASE B (conectado, whitelist)") e alternar o toggle de ativo/inativo uma vez pela UI, não
precisa mudar mais nada. Isso costuma destravar registro de webhook travado exatamente nesse tipo
de caso. Depois disso, aviso e faço o teste real ponta a ponta com uma mensagem sua de verdade.

### Não feito ainda, por causa do bloqueio
Teste com mensagem REAL do WhatsApp do Edvam ponta a ponta (item explicitamente pedido, não dá pra
fingir que foi feito). Vou fazer assim que o registro do webhook for confirmado.
