# 331 - Auditar branches de mídia irmãos do bug da demanda 322

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

Achado na varredura de hoje (330, relatado pelo 06-Atendimento e confirmado pelo 01-N8N na 328).
A demanda 322 corrigiu um bug real: `Processar Evento` (workflow `01`) mapeava `caption` do
branch `document` a partir de `document.title` em vez de `document.caption`, fazendo documento
sem legenda parecer "com legenda" e cair no agente legado sem guardrail (cotou R$9,00 num item
de R$2,50 real). Só o branch `document` foi corrigido e validado. Os branches irmãos de mídia
(`image`, `video`, `audio`) nunca foram auditados pra confirmar se têm o mesmo padrão de bug.

## Objetivo
Ler cada branch de mídia (`image`, `video`, `audio`) em `Processar Evento` e confirmar se algum
mapeia `caption`/campo equivalente a partir de um campo que não seja a legenda real do
WhatsApp (mesmo padrão do bug da 322). Corrigir qualquer ocorrência encontrada, com a mesma
validação usada na 322 (caso real antes/depois, branch irmão confirmado intocado).

## Escopo
- Incluído: só o node `Processar Evento` do workflow `01`, branches `image`/`video`/`audio`.
- Explicitamente fora de escopo: qualquer outro node ou workflow, mesmo que relacionado.

## Riscos e cuidados
Mesmo workflow que roteia o Caminho C em produção — backup antes de qualquer mudança, mesmo
padrão de verificação (PUT + GET fresco + diff) já usado nas demandas 314-325.

## Referências
Demanda 322, `Processar Evento` (workflow `01`, `lcFEt1kbyqNfTS89`).

## Relato de execução

**O que foi feito**: `GET` fresco do workflow `01` (não por memória, dado que 8 dias se passaram
desde a última vez que este chat tocou este workflow) - confirmado 80 nodes, `Processar Evento`
com os mesmos 419 linhas de código que a demanda 322 deixou (nenhuma outra sessão mexeu neste node
desde então). Lido cada um dos 3 branches pedidos (`image`, `video`, `audio`), linha a linha,
comparando com o padrão do bug da 322 (`caption` mapeado de um campo que não é a legenda real).

**Achados**:
- **`image`** (linha 120): `caption = rawZapi.image?.caption ?? null` - correto, usa o campo real
  de legenda. Sem bug (já era a referência de estilo usada pela própria 322 pro fix dela).
- **`video`** (linha 128): `caption = rawZapi.video?.caption ?? null` - correto, mesmo padrão,
  usa o campo real de legenda do vídeo. Sem bug.
- **`audio`** (linhas 132-138): não mapeia `caption` nenhum - o branch só lê `audioUrl`/
  `mimeType`/`ptt`/`seconds`, e `caption` permanece no valor inicial (`null`, linha 110) pra
  qualquer mensagem de áudio. **Isso é correto por desenho, não descuido**: áudio/nota de voz do
  WhatsApp não tem campo de legenda no protocolo (a própria interface do WhatsApp não oferece
  opção de legendar áudio ao enviar) - não existe, do lado da Z-API, nenhum campo tipo
  `audio.title`/`audio.fileName` que pudesse ter sido confundido com legenda real (a causa raiz
  do bug da 322 era justamente essa confusão existir no branch `document`, que tem `title` E
  `caption` como campos distintos). Sem bug, e sem candidato a bug possível nesse branch.

**Conclusão**: nenhuma ocorrência do padrão da 322 encontrada em `image`/`video`/`audio`. Achado
descartado com motivo real (não "não reproduzi"): os 2 branches com campo de legenda real
(`image`/`video`) já usam o campo certo; o branch sem campo de legenda no protocolo (`audio`)
corretamente não mapeia nada. Não precisou de teste com execução real - a ausência/presença do
mapeamento certo é visível direto no código, sem ambiguidade que exigisse dado real pra resolver
(diferente do caso `document` da 322, onde `title` vinha preenchido na maioria dos casos reais e
só um teste real revelou o problema).

**Status final**: concluída, nenhuma correção necessária. Nenhuma mudança feita no workflow `01`
(nenhum `PUT`, nenhum backup necessário, nenhuma execução real disparada) - achado é de leitura,
não de escrita. `versionId` do workflow (`e8473800-a89f-453d-99cd-a8208e2e8d6a`) confirmado
inalterado do início ao fim desta demanda.
