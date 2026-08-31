# 324 — Fix da 323 suprimia a confirmação "Chamando a equipe" quando a IA escala sozinha (Camada 2)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27 (achado na própria validação obrigatória da demanda 323, corrigido no
mesmo dia)
Concluída em: 2026-08-27
Chat executor: sessão fora do fluxo normal dos chats especialistas, a pedido direto do Edvam

## Contexto

Efeito colateral real descoberto durante a validação obrigatória do fix da demanda 323 (não uma
suposição — confirmado com investigação real do workflow `296` inteiro + a execução real
`1576879`).

A demanda 323 corrigiu `Contatos: Reivindicar Atendimento (raw)` (workflow `297`) pra nunca mais
reverter um `status_atendimento='escalado'` recém-gravado (adicionou `status_atendimento=neq.
escalado` no filtro do PATCH). Isso resolve o problema de corrupção de estado, mas o briefing
original desse fix presumia que a mensagem "Chamando a equipe" já era enviada por um node
DIFERENTE no caminho de escalação (workflow `296`) — presunção que a investigação real derrubou:

- Vasculhado o workflow `296` inteiro (`WH Escalar Para Humano` → `Validar Entrada Escalar` → ... →
  `Escalar: Montar Retorno` → `Resp Escalar Sucesso`): **não existe nenhum node de envio
  Z-API/WhatsApp nesse caminho**. Ele só grava `jsgrafica_agente_teste_sessoes` e responde a
  chamada da tool (retorno pro LLM, não pro cliente).
- Confirmado pela execução real `1576879`: o ÚNICO node que manda mensagem ao WhatsApp no turno
  inteiro é `Enviar Z-API` (workflow `297`), alcançado via `Preparar Envio Normal`, que só é
  alcançado se `Reivindicacao Falhou?` for falso (claim afetou 1 linha).

Consequência real: com o fix da 323 sozinho, quando a IA decide escalar via `escalar_para_humano`
no meio do raciocínio (Camada 2), o claim passa a afetar 0 linhas (porque `status_atendimento` já
é `'escalado'`, gravado segundos antes pela própria escalação) → `Reivindicacao Falhou?` = true →
`Preparar Resp Bloqueado Por Humano` → `Resp Agente Bloqueado Por Humano` → **a confirmação
"Chamando a equipe" nunca chega ao cliente.** O estado do banco fica correto, mas quem acabou de
ser escalado fica em silêncio total — pior experiência do que o bug original (que pelo menos
enviava a confirmação, mesmo corrompendo o estado).

Achado não ficou só documentado (regra do workspace: nenhum achado fica só relatado, sempre vira
demanda real) — corrigido na mesma passada, mesmo dia.

## Objetivo

Fazer a confirmação "Chamando a equipe" continuar sendo enviada quando a própria IA escala no meio
do turno, sem reabrir a corrupção de estado que a 323 corrigiu.

## Escopo

- Incluído: workflow `297` (`JeN7VMYMeQEJgd0b`), node `Contatos: Avaliar Reivindicacao`, lógica de
  cálculo de `_reivindicado`.
- Explicitamente fora de escopo: `Reivindicacao Falhou?` (não mudou — continua checando
  `_reivindicado === false`), `Preparar Envio Normal`, `Contatos: Reivindicar Atendimento (raw)`
  (o PATCH da 323 continua rodando exatamente igual, só o resultado dele passa a ser ignorado
  neste cenário específico), qualquer outro workflow, o telefone `5521965185667` (já corrigido na
  323, não mexido de novo aqui).

## Investigação antes de mudar

Lido o código real do node `Contatos: Avaliar Reivindicacao` via `GET` fresco antes de editar:

```js
const items = $input.all();
let rows = [];
for (const it of items) {
  const j = it.json;
  if (Array.isArray(j)) {
    rows = rows.concat(j);
  } else if (j && Object.keys(j).length > 0) {
    rows.push(j);
  }
}
const reivindicado = rows.length > 0;

const entrada = $('Guardrail Falhou?').first().json;
return [{ json: { ...entrada, _reivindicado: reivindicado } }];
```

Nomes reais confirmados (diferentes do pseudocódigo genérico do pedido original): a variável de
"linhas afetadas" já é um booleano chamado `reivindicado` (não uma contagem), e `entrada` já é
obtido via `$('Guardrail Falhou?').first().json` (não `$json` direto).

Confirmado que `_intermediateSteps` chega intacto até este node: `Extrair Resposta Agent` grava
`_intermediateSteps: $json.intermediateSteps || null` a partir da saída do `AI Agent Caminho C`
(que tem `returnIntermediateSteps: true` nas `options`); `Guardrail Validacao Saida` já lê e
propaga esse campo via `...entrada` em todos os `return`s (é a mesma técnica usada ali pro
guardrail de telefone divergente e pro guardrail "promessa de escalar sem chamada real", demanda
297/298); `Guardrail Falhou?` é um node IF, não descarta campos. Confirmado também o nome exato da
tool dentro de `_intermediateSteps.action.tool`: `'Tool_Escalar_Para_Humano'` (com underscore,
nome interno do node, não `escalar_para_humano` que é o nome exposto ao LLM) — mesma string já
usada em `Guardrail Validacao Saida`.

**Confirmado com a execução real `1576879`** (a mesma da demanda 323): a saída de
`Extrair Resposta Agent` tinha `resposta_agente: "Chamando a equipe"` e
`_intermediateSteps: [{ action: { tool: "Tool_Escalar_Para_Humano", toolInput: { telefone:
"5521965185667", motivo: "proposta_negada" }, ... } }]` — bate exatamente com o cenário que este
fix precisa tratar.

## Fix aplicado

```js
// ANTES (linha final):
const entrada = $('Guardrail Falhou?').first().json;
return [{ json: { ...entrada, _reivindicado: reivindicado } }];

// DEPOIS:
const entrada = $('Guardrail Falhou?').first().json;

// Demanda 324: quando a IA chamou escalar_para_humano neste turno, o PATCH
// anterior falha DE PROPOSITO (guarda da demanda 323 - nao pode reverter o
// status_atendimento='escalado' que a escalacao real acabou de gravar). Isso
// NAO e o mesmo caso de 'humano assumiu no meio do caminho' - e o resultado
// esperado da escalacao, e a confirmacao 'Chamando a equipe' ainda precisa
// ser enviada. Detecta via _intermediateSteps (mesma tecnica ja usada em
// 'Guardrail Validacao Saida', mesmo nome de tool 'Tool_Escalar_Para_Humano')
// e forca _reivindicado=true so pra efeito de liberar o envio - o PATCH
// acima continua rodando e continua sem sobrescrever o status escalado real,
// so o resultado dele passa a ser ignorado aqui quando a propria IA escalou
// neste turno.
const chamouEscalar = (entrada._intermediateSteps || [])
  .some(s => s && s.action && s.action.tool === 'Tool_Escalar_Para_Humano');
const _reivindicado = chamouEscalar ? true : reivindicado;

return [{ json: { ...entrada, _reivindicado } }];
```

`Reivindicacao Falhou?` não precisou mudar — já checa `_reivindicado === false`, e agora recebe
`true` incondicionalmente quando a IA escalou neste turno.

## Validação (antes do deploy)

1. **Reasoning contra a execução real `1576879`** (conferência de lógica, sem reexecutar): a saída
   real de `Extrair Resposta Agent` tinha `_intermediateSteps` com uma entrada
   `action.tool === 'Tool_Escalar_Para_Humano'` → `chamouEscalar = true` → `_reivindicado = true`
   incondicionalmente → `Reivindicacao Falhou?` = falso → `Preparar Envio Normal` →
   `Montar Envio Z-API` → `Enviar Z-API` envia "Chamando a equipe" de verdade. Confirma exatamente
   o que o fix precisa fazer com este input real.
2. **Estado do banco continua protegido**: o PATCH de `Contatos: Reivindicar Atendimento (raw)`
   (fix da 323) continua rodando sem nenhuma mudança — neste cenário ele afeta 0 linhas (porque
   `status_atendimento` já é `'escalado'`) e esse resultado real (`reivindicado=false`) é
   simplesmente ignorado pelo novo código quando `chamouEscalar=true`. A linha nunca é
   sobrescrita — não há reintrodução da corrupção que a 323 corrigiu.
3. **Caminho normal (sem escalonamento) idêntico ao de produção hoje**: quando a IA não chamou
   `escalar_para_humano` neste turno, `_intermediateSteps` não tem essa entrada (ou é vazio/nulo),
   `chamouEscalar = false`, então `_reivindicado = reivindicado` — exatamente o valor que o código
   original já calculava. Nenhuma mudança de comportamento no caso comum.
4. **Caso "humano assumiu no meio do caminho" (a proteção original da 321) continua intacta**:
   nesse cenário `status_atendimento` seria algo como `em_atendimento` com `atendente` de um
   humano real (não `escalado`), o guard OR do PATCH já falha por conta própria (não bate
   `atendente.is.null` nem `atendente.eq.'Agente Atendimento'`) — 0 linhas, e como
   `_intermediateSteps` não teria uma chamada de `escalar_para_humano` nesse turno (a IA nem
   escalou, um humano só assumiu por fora), `chamouEscalar = false`, então
   `_reivindicado = reivindicado = false` — bloqueia o envio exatamente como antes. Nenhuma
   regressão na proteção original.

## Deploy

Backup pré-mudança (`GET` fresco antes de editar, já incorporando o fix da 323):
`pm/backups/297-caminho-c-agente_pre-demanda324_2026-08-27.json` (44 nodes).

`PUT /api/v1/workflows/JeN7VMYMeQEJgd0b` → HTTP 200. `GET` fresco separado confirmou persistência:
44→44 nodes, 0 adicionados/removidos, **exatamente 1 node alterado**
(`Contatos: Avaliar Reivindicacao`), `connections` idênticas byte a byte ao backup.

Nenhuma execução real ou sintética disparada contra o webhook — validação feita por conferência de
lógica contra a execução real `1576879` já existente, conforme instruído (o Edvam está testando ao
vivo e vai gerar tráfego real sozinho).

## Critérios de aceite

- [x] Código real do node lido antes de editar, nomes de variável confirmados (`entrada`,
      `reivindicado`), fix adaptado a eles (não a pseudocódigo genérico)
- [x] Detecção de escalonamento usa a mesma técnica e o mesmo nome de tool já validados em
      `Guardrail Validacao Saida` (`_intermediateSteps`, `'Tool_Escalar_Para_Humano'`)
- [x] Reasoning validado contra a execução real `1576879`: `_reivindicado` passa a `true` com o
      código novo, no mesmo input real que hoje bloqueava o envio
- [x] Confirmado que o PATCH da 323 continua intacto e continua protegendo o estado `escalado`
      (o resultado dele só passa a ser ignorado neste cenário específico)
- [x] Caminho normal (sem escalonamento) confirmado idêntico ao de produção
- [x] Proteção original "humano assumiu no meio do caminho" (demanda 321) confirmada intacta
- [x] `Reivindicacao Falhou?`, `Preparar Envio Normal`, `Contatos: Reivindicar Atendimento (raw)` e
      todo o resto do workflow confirmados intocados
- [x] Backup salvo antes da mudança
- [x] Persistência confirmada via `GET` fresco separado do `PUT`
- [x] Diff node-a-node confirma exatamente 1 node alterado, conexões intactas
- [x] Nenhuma execução real/sintética disparada contra o webhook
- [x] Telefone `5521965185667` não mexido de novo (já corrigido na 323)

## Riscos e cuidados

Nenhum risco novo introduzido — desacopla corretamente duas decisões que estavam amarradas no
mesmo IF (`reivindicar com sucesso` vs. `deve enviar a resposta`), sem tocar a proteção original
contra corrida com humano. Efeito prático (cliente volta a receber "Chamando a equipe" quando a IA
escala sozinha, sem reabrir a corrupção de estado) só aparece organicamente na próxima escalação
real via tool call — nenhuma execução forçada.

## Referências

Demanda 323 (o fix que introduziu esse efeito colateral, mesma investigação, mesmo dia). Demanda
321 (Piece 2, node original). Demandas 297/298 (técnica `_intermediateSteps` +
`returnIntermediateSteps: true`, guardrails que já liam esse campo). Execução real `1576879`
(evidência usada pra validar a lógica do fix sem reexecutar).
`pm/conhecimento/caminho-c-mapa-decisoes-completo.md` seção 3.4 (desenho final, atualizado).

## Relato de execução

Executado em 2026-08-27, workflow `297` (`JeN7VMYMeQEJgd0b`, produção real, piloto ativo), na
mesma sessão e no mesmo dia da demanda 323 que originou o achado. Código real do node lido via
`GET` fresco antes de editar; fix adaptado aos nomes reais de variável (`entrada`, `reivindicado`).
`PUT` HTTP 200, `GET` fresco separado confirmou persistência: diff final é exatamente 1 node
alterado, 0 adicionados/removidos, conexões idênticas byte a byte ao backup. Validação por
conferência de lógica contra a execução real `1576879`: com o código novo, o mesmo input real teria
dado `_reivindicado=true`, liberando o envio da confirmação sem reabrir a corrupção de estado que a
323 corrigiu. Nenhuma execução real ou sintética disparada. Telefone `5521965185667` não tocado de
novo (já corrigido na 323).
