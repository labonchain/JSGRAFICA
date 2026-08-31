# 322 — `caption` de anexo tipo documento mapeado do `title` (nome do arquivo) em vez de `caption` real, desviava pro agente legado sem guardrails

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto

**Urgente, achado confirmado com execução real hoje** (`1576461`, ~12:52 local, 2026-08-27):
quando um cliente manda uma imagem como anexo tipo "documento" do WhatsApp (não foto comprimida —
enviada pelo seletor de arquivo, ex. `document.title: "WhatsApp Image 2026-08-25 at 18.36.45.jpeg"`)
SEM legenda real, `Processar Evento` (workflow `01`) fazia:

```js
caption   = rawZapi.document?.title       ?? null;
```

`document.title` SEMPRE vem preenchido com o nome de exibição do arquivo, mesmo sem legenda
nenhuma — no teste real de hoje, `document.caption` (a legenda de verdade digitada pelo cliente)
era `null` no payload cru da Z-API, mas `document.title` tinha o nome do arquivo. Isso fazia
QUALQUER documento-imagem sem legenda parecer, pra todo consumidor downstream, como se tivesse
legenda real.

## Duas consequências reais em cascata, confirmadas com evidência ao vivo hoje

1. **Bloqueava a análise de visão da demanda 319** (node `É Mídia Visual Sem Legenda?`, do mesmo
   dia): a condição checa `(message_text||'') + (caption||'')` vazio — com `caption` poluído pelo
   `title`, nunca dava vazio, então o branch novo de análise Gemini Vision nunca disparava pra
   documento-imagem, mesmo sendo exatamente o caso que a 319 foi construída pra cobrir.

2. **Pior: `AJUSTAR DESTINO AGENTE FASE B` também via esse `caption` poluído** no cálculo de
   `semLegenda = !(original.caption && ...trim())` — resultado: contato avaliado como NÃO
   elegível pro Caminho C (`297`), `_destino` caindo no fallback padrão do `Switch Destino`, que
   aponta pro workflow legado `JSGRAFICA_ATENDIMENTO_AI` (`TCbbF5z5dvAOhWsS`, webhook
   `jsgraficaatendimentoai`). Esse agente legado **não tem nenhum guardrail de preço** (improvisa
   livre via Gemini+RAG, nenhuma ferramenta força recálculo contra `jsgrafica_produtos`) e **cotou
   errado pra um cliente real hoje**: disse "R$ 9,00" pra uma foto 10x15 que custa R$ 2,50 no
   catálogo real, além de emoji sem restrição nenhuma. Esse agente está supostamente 100% pausado
   por decisão explícita de produto (`caixa-js-grafica/CLAUDE.md`: "`JSGRAFICA_ATENDIMENTO_AI`...
   continua pausado por decisão de produto, sem tráfego") — este bug estava violando essa decisão
   ativamente, não é só um inconveniente menor.

## Objetivo

Corrigir o mapeamento de `caption` no branch `document` de `Processar Evento` pra usar o campo
real (`document.caption`), igual ao padrão já usado corretamente no branch `image` irmão
(`rawZapi.image?.caption`).

## Escopo

- Incluído: workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS`, nó `Processar Evento`, 1 linha no
  branch `document` da seção MÍDIA.
- Explicitamente fora de escopo: qualquer outro branch de mídia (`image`, `video`, `audio`,
  `sticker`, `gif`, `ptv`, `hydratedTemplate.header.*`); `fileName` (já mapeado corretamente e
  separadamente de `caption`, não mexido); qualquer outro node; execução real do workflow contra
  mensagem de cliente/teste.

## Investigação antes de mudar

Confirmado via `GET` fresco (não por memória) que o código atual de `Processar Evento` bate
EXATAMENTE com a paráfrase do achado — linha 145 do `jsCode`:

```js
else if (rawZapi.document) {
  mediaType = 'document';
  mediaUrl  = rawZapi.document?.documentUrl ?? null;
  mimeType  = rawZapi.document?.mimeType    ?? null;
  fileName  = rawZapi.document?.fileName    ?? null;
  caption   = rawZapi.document?.title       ?? null;   // <- linha com o bug
  pageCount = rawZapi.document?.pageCount   ?? null;
}
```

Branch `image` irmão (linha 116-122), já correto, usado como referência de estilo pro fix:

```js
if (rawZapi.image) {
  mediaType    = 'image';
  mediaUrl     = rawZapi.image?.imageUrl     ?? null;
  mimeType     = rawZapi.image?.mimeType     ?? null;
  caption      = rawZapi.image?.caption      ?? null;
  thumbnailUrl = rawZapi.image?.thumbnailUrl ?? null;
}
```

Achado a mais confirmando o padrão certo já existe em outro lugar do próprio arquivo: o branch
`hydratedTemplate.header.document` (linha ~170-176) já usa `.caption` corretamente, não `.title`
— reforça que `.title` no branch `document` normal era mesmo um desvio pontual, não convenção do
arquivo.

Rastreados os 2 consumidores downstream do achado, confirmando que ambos leem `caption` de
`Processar Evento` (via `$json.caption` / `original.caption`, sem transformação no meio):
- `É Mídia Visual Sem Legenda?` (IF, demanda 319): condição
  `(($json.message_text||'')+($json.caption||'')) === ''`.
- `AJUSTAR DESTINO AGENTE FASE B` (Code): `semLegenda = !(original.caption && String(original.caption).trim())`,
  onde `original = $('CHECK SESSAO PEDIDO').first().json` — `caption` sobrevive intacto por spread
  desde `Processar Evento` até aqui, mesma garantia já documentada nas demandas 314/318/319.

## Fix aplicado

```js
caption   = rawZapi.document?.caption      ?? null;
```

## Validação antes do deploy

1. **Confirmado o código atual bate com o achado**: leitura literal do `GET` fresco, linha 145,
   idêntica à paráfrase do relato (branch `document`, `.title` em vez de `.caption`).
2. **Caso real de hoje (execução `1576461`)**: `document.title: "WhatsApp Image 2026-08-25 at
   18.36.45.jpeg"`, `document.caption: null`. Com o fix, `caption` passa a ser `null` (em vez do
   nome do arquivo) → `É Mídia Visual Sem Legenda?` passa a avaliar `true` (dispara a análise
   Gemini Vision da 319) → `AJUSTAR DESTINO AGENTE FASE B` calcula `semLegenda = true` corretamente,
   deixando o contato elegível pro Caminho C (`297`) em vez de cair no fallback pro agente legado.
3. **Documento com legenda real** (`document.caption` genuinamente preenchido): antes do fix,
   `caption` já vinha não-vazio (mas com o texto ERRADO — o nome do arquivo, não a legenda real) —
   os 2 consumidores downstream (que só checam vazio/não-vazio) já tratavam como "tem legenda" por
   coincidência. Depois do fix, `caption` continua não-vazio, mas agora com o texto CORRETO (a
   legenda real digitada pelo cliente) — roteamento como mensagem legendada normal permanece
   idêntico, e como bônus o conteúdo gravado/exibido passa a ser o real em vez do nome do arquivo.
4. **Branch `image` confirmado intocado**: diff pós-deploy (ver seção Deploy) mostra que a única
   linha alterada no `jsCode` inteiro (419 linhas) foi a 145, dentro do branch `document` — linha
   120 (`caption = rawZapi.image?.caption ?? null`) idêntica ao backup.
5. **`fileName` não conflita**: `fileName` (linha 144, `rawZapi.document?.fileName ?? null`) é uma
   atribuição totalmente separada da linha 145 (`caption`), escrita num campo de saída diferente
   (`file_name` vs `caption`, ver bloco `CONTEÚDO` do `return`). O fix não toca essa linha, e os 2
   campos continuam populados de fontes distintas (`title`/`fileName` do lado do arquivo,
   `caption` agora do campo de legenda real) — nenhuma duplicação ou conflito introduzido.

## Deploy

Backup pré-mudança (`GET` fresco direto da API antes de qualquer edição, 72 nodes):
`pm/backups/01-log-msg-recebidas_pre-demanda322_2026-08-27.json`.

`PUT /workflows/lcFEt1kbyqNfTS89` (corpo mínimo `name`/`nodes`/`connections`/`settings`), HTTP 200.
`GET` imediatamente depois (leitura fresca separada, não a resposta do `PUT`) confirmou
persistência real. Diff node-a-node contra o backup:
- 72 → 72 nodes (0 adicionados/removidos).
- Exatamente **1 node alterado**: `Processar Evento`, só a chave `parameters` (`id`/`type`/
  `typeVersion`/`position`/`name` preservados byte a byte).
- Dentro de `parameters`, só `jsCode` mudou; comparando linha a linha (419 linhas antes e depois),
  a ÚNICA linha diferente é a 145:
  - antes: `  caption   = rawZapi.document?.title       ?? null;`
  - depois: `  caption   = rawZapi.document?.caption      ?? null;`
- `connections` idêntico byte a byte ao backup.

Nenhuma execução real ou sintética disparada contra o workflow, conforme instruído.

## Critérios de aceite

- [x] Código atual confirmado idêntico à paráfrase do achado antes de aplicar o fix
- [x] Fix reasoning validado contra o caso real de hoje (execução `1576461`): `caption` passa a
      `null`, dispara `É Mídia Visual Sem Legenda?` e `AJUSTAR DESTINO AGENTE FASE B` corretamente
- [x] Caso de documento COM legenda real confirmado não regredir (continua roteando como
      legendado, com o bônus de gravar o texto certo em vez do nome do arquivo)
- [x] Branch `image` confirmado 100% intocado (diff de 1 linha só, fora do branch `image`)
- [x] `fileName` confirmado não conflitar/duplicar com o fix de `caption`
- [x] Backup salvo antes de qualquer edição
- [x] Fix persistido de verdade no n8n (`GET` pós-`PUT` confirmado, separado da resposta do `PUT`)
- [x] Diff node-a-node confirma exatamente 1 node alterado, 1 linha dentro dele, nada mais
- [x] Nenhuma execução real disparada

## Riscos e cuidados

Nenhum risco novo introduzido — é uma correção de mapeamento de campo, reduz superfície de bug
(faz `caption` refletir o dado real da Z-API em vez de um substituto errado). Workflow em produção
real; efeito prático (elegibilidade correta pro Caminho C, disparo da análise Gemini Vision da
319) só aparece organicamente na próxima mensagem real de documento-imagem sem legenda de um
telefone autorizado.

## Referências

Demanda 319 (`É Mídia Visual Sem Legenda?`, consumidor nº 1 do `caption` poluído). Demandas
305/306/307/308/309 (histórico de `AJUSTAR DESTINO AGENTE FASE B` e do roteamento pro Caminho C).
Demanda 299 (piloto do Caminho C no lugar do `206`). `caixa-js-grafica/CLAUDE.md` (decisão de
produto: `JSGRAFICA_ATENDIMENTO_AI` pausado, sem tráfego — violada ativamente por este bug).
Execução real `1576461` (evidência original do achado, 2026-08-27 ~12:52 local).

## Relato de execução

Executado em 2026-08-27, workflow `01` (produção real). Código atual confirmado via `GET` fresco
idêntico à paráfrase do relato antes de qualquer edição. Fix de 1 linha aplicado
(`rawZapi.document?.title` → `rawZapi.document?.caption`), reasoning validado contra os 5 pontos
pedidos (caso real de hoje, caso com legenda real, branch `image` intocado, `fileName` sem
conflito, persistência). Aplicado via `PUT`, confirmado com `GET` fresco separado: diff final é
exatamente 1 node alterado (`Processar Evento`), 1 linha dentro do `jsCode` (de 419), conexões
idênticas byte a byte ao backup. Nenhuma execução real disparada.
