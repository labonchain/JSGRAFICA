# 344 - Workflow STATUS MSG: gravar log leve em vez do fluxo pesado (segunda peça, depois da 342)

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: 2026-08-28
Chat executor: 01 - N8N JS GRAFICA

Segunda de 3 peças sequenciais (342 → 344 → 345). **Bloqueada até a demanda 342 (02-DADOS,
tabela `jsgrafica_status_visualizacoes`) estar concluída** — não começar antes disso.

## Objetivo
No workflow `03 - JSGRAFICA | STATUS MSG` (`hg12ud3yo5mTu3XI`), callback com
`phone === "status@broadcast"` passa a gravar 1 linha na tabela nova da 342 (INSERT direto, sem
consulta condicional antes) em vez de rodar `GET MSG PRIVADA`/`GET MSG GRUPOS`/`UPDATE` (fluxo
hoje sempre retorna zero linhas afetadas pra esse tipo de callback, confirmado na 340). Callback
de conversa 1:1 real continua no fluxo atual, intocado.

## Escopo
- Incluído: só o ramo `status@broadcast` do workflow `03 - STATUS MSG`.
- Explicitamente fora de escopo: a tela de exibição (345, depois desta).

## Riscos e cuidados
Risco baixo — muda só o ramo que hoje não produz resultado útil nenhum. Backup do workflow
antes. Confirmar com um caso real de callback `status@broadcast` que a linha é gravada certa, e
com um caso real de conversa 1:1 que o fluxo normal continua intacto.

## Referências
Demanda 340 (investigação original), demanda 342 (tabela), workflow
`03 - JSGRAFICA | STATUS MSG`.

## Relato de execução

**Backup**: `pm/backups/03-status-msg_pre-demanda344_2026-08-28.json` (11 nodes, estado antes de
qualquer mudança).

**O que foi feito**: adicionado 1 node IF (`É Visualização de Status?`) logo depois do
`Webhook STATUS MSG`, checando `phone === "status@broadcast"`. Ramo verdadeiro vai direto pro
node novo `Gravar Visualização Status` (Supabase INSERT em `jsgrafica_status_visualizacoes`,
campos `participant`/`ids`/`status`/`momment`, sem nenhuma consulta condicional antes). Ramo
falso segue pro fluxo existente (`PROCESSAR STATUS` → `GET`/`UPDATE`), intocado.

**2 bugs reais cometidos e corrigidos na mesma demanda, antes de fechar**:

1. `operation: "insert"` não é valor válido pro node Supabase desta versão do n8n (é
   `"create"`) - toda tentativa de gravar falhava com "Could not get parameter: tableId".
   Confirmado em execução real (erro real, não suposição), corrigido pra `"create"`, retestado
   com sucesso (linha real gravada, `ids` preservado como array jsonb de verdade, não string).

2. **Mais sério**: o node IF novo foi criado com `typeVersion: 2` mas com o formato de operador
   da versão 2.2 (`{"type":"string","operation":"equals"}` sem os campos extras que essa versão
   exige) - isso fazia a condição avaliar SEMPRE verdadeiro, não só pra `status@broadcast`.
   Confirmado com execução real: um callback de conversa 1:1 de verdade (`phone` com sufixo
   `@lid`, não `status@broadcast`) foi parar no ramo errado (`Gravar Visualização Status`) em vez
   de atualizar `jsgrafica_log_msgs_privadas`. Corrigido copiando a estrutura exata do node IF
   já funcional no mesmo workflow (`If É PRIVADA OU GRUPO?`, `typeVersion: 2.2` com `options`/
   `combinator`/`id` completos). Retestado com tráfego real: 0 erros em 80 execuções numa janela
   de 5min pós-correção, e confirmado direto no Supabase que `jsgrafica_log_msgs_privadas`
   recebeu atualizações reais de `last_update_at` nesse mesmo período (7 linhas), confirmando que
   o ramo de conversa 1:1 continua funcionando.

**Correção do efeito colateral do bug 2** (achado, não escondido): durante a janela de ~2min em
que o IF estava quebrado, 2 mensagens reais de conversa 1:1 (`3EB01C16910D0899AFC4D3` e
`3EB0616FD61831DD9537E5`) foram desviadas pro caminho errado (6 linhas gravadas em
`jsgrafica_status_visualizacoes` com `participant` terminando em `@lid`, formato que não deveria
aparecer ali). Corrigido: as 6 linhas mal roteadas foram removidas de
`jsgrafica_status_visualizacoes` (não são visualização de Status de verdade), e `last_update_at`
das 2 mensagens reais foi ajustado em `jsgrafica_log_msgs_privadas` pro valor que o fluxo normal
teria gravado. Impacto real limitado: `status`/`delivered_at`/`read_at` dessas 2 mensagens já
estavam `null` mesmo antes do bug (ver achado separado abaixo) - o único dado perdido foi o
toque em `last_update_at`, já corrigido.

**Achado novo, fora de escopo desta demanda (reportado ao PM, não corrigido aqui)**: o código de
`PROCESSAR STATUS` (não tocado nesta demanda) só define `status`/`delivered_at`/`read_at` quando
`raw.type` é `'DeliveryCallback'` ou `'ReadCallback'` - mas todo payload real de callback de
status observado (broadcast ou 1:1) chega com `type: "MessageStatusCallback"` (o evento real fica
em `raw.status`: `SENT`/`RECEIVED`/`READ`/`READ_BY_ME`). Ou seja, esse código NUNCA bate essa
condição pra nenhum payload real - o ramo de conversa 1:1 do `03 - STATUS MSG` só atualiza
`last_update_at`, nunca `status`/`delivered_at`/`read_at`, pra mensagem nenhuma, há muito tempo.
Não é regressão desta demanda (comportamento pré-existente, confirmado nos 2 casos acima e
plausivelmente geral). Fora de escopo da 344 (só o ramo `status@broadcast`) - reportado ao PM
como achado novo, candidato a virar demanda própria.

**Testes finais**: 80 execuções reais consecutivas pós-correção, 0 erro. `status@broadcast`
grava em `jsgrafica_status_visualizacoes` (193 linhas reais no fim, 0 com sufixo `@lid`
remanescente). Conversa 1:1 real confirmada intacta via `last_update_at` atualizado no Supabase.
