# 359 - Revisar briefings do pipeline de conteúdo (GPT) e liberar produção de peças/copy

Status: concluída
Criada em: 2026-08-31
Aprovada em: 2026-08-31
Concluída em: 2026-08-31
Chat executor: 07 - MARKETING JS GRAFICA

## Contexto
O Edvam mantém um pipeline de conteúdo separado via GPT, que já está escrevendo e commitando
direto no repositório `labonchain/JSGRAFICA` (público, mesmo repo que o time está organizando pra
subir o código, ver demandas 357/358). Estrutura real, confirmada pelo PM via `gh api`:

```
conteudos/2026/08/BLOCO-NNN_PX-XX_PX-XX_PX-XX/
├── briefings/   ← briefing de cada pauta (ID tipo P1-01, P2-03 etc.)
├── copy/        ← texto final da peça
├── artes/       ← arquivo-fonte + PNG/JPG final
└── qa/          ← checagem final antes de aprovar
```

**152 blocos já criados como estrutura (pastas vazias com `.gitkeep`), 39 briefings já escritos
de verdade (cobrindo uns 13 blocos), mas só 1 bloco (`BLOCO-001`, itens P1-01/P1-02/P2-01) tem
arte+copy+QA completos.** O resto dos 38 briefings está parado esperando aprovação antes da
produção seguir — cada briefing tem o campo `Dependência para liberar a produção: aprovação
deste briefing.`

O processo completo (regras de marca, o que cada etapa deve conferir) está documentado no próprio
repo, em `docs/LEIA_PRIMEIRO.md`, `docs/operacao/ESPECIFICACAO_TECNICA_OPERACAO_CANAL_JS_GRAFICA.md`
e `docs/direcao/DIRECAO_ARTE_E_CONTEUDO_CANAL_JS_GRAFICA_v1.md` — leia os 3 antes de revisar
qualquer briefing, eles definem o mecanismo de aprovação/estado que você deve seguir.

## Objetivo
Todos os 39 briefings já escritos revisados um a um (aprovado, rejeitado ou marcado com pendência
real), e uma demanda/instrução clara organizada pro squad de produção seguir com arte+copy só
nos briefings que fazem sentido pro negócio.

## Escopo
Incluído:
- Ler os 3 documentos de processo do repo (`LEIA_PRIMEIRO.md`, especificação técnica, direção de
  arte) pra entender o mecanismo de aprovação real usado no pipeline (campo `Estado`, arquivo de
  aprovação, ou o que for), não inventar um mecanismo novo.
- Ler os 39 briefings existentes, um a um, cruzando com:
  - Manual de marca (339) e as regras visuais do `LEIA_PRIMEIRO.md` (paleta, fonte, uso da logo).
  - Dado real de negócio (catálogo de produtos/preço real em `jsgrafica_produtos`, decisões já
    tomadas, ex.: nada de preço/prazo/promoção inventado, campo "dados a confirmar" de cada
    briefing precisa ser resolvido com dado real antes de aprovar).
  - Consistência com decisões recentes do time (ex.: Canal do WhatsApp real, demandas 352-356).
- Pra cada briefing: aprovar (sinalizando do jeito que o processo do repo espera), rejeitar com
  motivo real, ou marcar como bloqueado por pendência específica (dizer qual).
- Organizar/registrar quais briefings aprovados estão liberados pra virar arte+copy de verdade,
  de um jeito que o pipeline de produção (GPT) ou o squad (348, se fizer sentido reaproveitar)
  consiga seguir sem ambiguidade.

Explicitamente fora de escopo:
- Produzir arte/copy você mesmo (isso é do squad/pipeline, aqui é só revisão e liberação).
- Mexer nos 152 blocos que ainda são só pasta vazia sem briefing (aguardam o GPT escrever).
- Aprovar qualquer preço/prazo/promoção que não esteja confirmado em dado real do sistema.

## Critérios de aceite
- [x] Os 3 documentos de processo lidos e referenciados no relato.
- [x] Os 39 briefings existentes revisados, cada um com decisão registrada (aprovado/rejeitado/
      pendência) e o motivo.
- [x] Squad/pipeline de produção com instrução clara de quais IDs estão liberados pra seguir.
- [x] Nenhum dado inventado (preço, prazo, disponibilidade) aprovado sem confirmação real.

## Riscos e cuidados
Não aprovar briefing só porque "parece bom", cruzar sempre com dado real do catálogo/negócio.
Se um briefing tiver informação que contradiz o que o sistema sabe (ex.: preço diferente do
`jsgrafica_produtos`), isso é rejeição/pendência, não aprovação com ressalva.

## Referências
`docs/LEIA_PRIMEIRO.md`, `docs/operacao/ESPECIFICACAO_TECNICA_OPERACAO_CANAL_JS_GRAFICA.md`,
`docs/direcao/DIRECAO_ARTE_E_CONTEUDO_CANAL_JS_GRAFICA_v1.md` (todos em `labonchain/JSGRAFICA`),
demanda 339 (manual de marca), demandas 352-356 (Canal do WhatsApp real).

## Relato de execução

**Concluída em 2026-08-31, executor 07-Marketing. Aprovada pelo Edvam nas 2 decisões que
exigiam humano.**

### Processo seguido (não inventado)
Li os 3 documentos do repo antes de revisar qualquer briefing: `docs/LEIA_PRIMEIRO.md`,
`docs/operacao/ESPECIFICACAO_TECNICA_OPERACAO_CANAL_JS_GRAFICA.md` (mecanismo de estados:
`PLANEJADO` → ... → `BRIEFING_APROVADO` → ... → `PUBLICADO`) e `docs/direcao/
DIRECAO_ARTE_E_CONTEUDO_CANAL_JS_GRAFICA_v1.md`. Achado importante logo na leitura: a
especificação técnica (seção 5, regra 3) diz explicitamente **"Nenhum chat pode marcar
`BRIEFING_APROVADO`... por conta própria"** — só "Coordenação/usuário" pode. Por isso não
aprovei nada sozinho: revisei os 39, recomendei, e levei as 2 decisões reais pro Edvam antes de
aplicar qualquer `BRIEFING_APROVADO` no registro mestre.

### O que a revisão encontrou
Baixei os 39 briefings reais do repo e o catálogo real (`jsgrafica_produtos`, 112 itens,
`scripts/dump-catalogo-359.ts`). O registro mestre já mostrava 15 dos 39 como `BRIEFING_APROVADO`/
`APROVADO_PARA_PUBLICAR` de decisões anteriores do Edvam (P1-01 a P4-06) — não mexi nesses.
Faltava decisão real em 20: 1 (`P6-01`) já corretamente em `EM_CHECAGEM` (formato de arquivo não
confirmado, sem mudança), e 19 em `EM_BRIEFING` aguardando primeira revisão (3 `BLOQUEADO`,
`P5-03/04/05`, aguardando foto real, também sem mudança de conteúdo).

Revisei os 19 restantes um a um contra o catálogo real e o manual de marca: 17 limpos (sem
preço/prazo/promoção inventado, categoria batendo com o catálogo real ou o manual de marca) — o
Edvam confirmou aprovação. **3 com achado real**: `P3-06` (Declarações MEI), `P3-07`
(Licenciamento/renovação de veículo), `P3-08` (Consulta CadÚnico) citam serviços específicos que
não têm nenhuma linha correspondente no catálogo real (só existe a categoria genérica "Consulta
Online" com itens tipo `CONTA GOV`/`CADASTRO E B.O.`/`ACESSO E ENVIO DOCUMENTOS`, nenhum
especificamente nomeado MEI/licenciamento de veículo/CadÚnico). Perguntei direto ao Edvam se a
gráfica presta esses 3 de verdade — ele respondeu que não sabe e precisa confirmar com a equipe.
**Não aprovei esses 3**, movi pra `EM_CHECAGEM` com o motivo real registrado, não travei a
decisão nem inventei confirmação.

Achado colateral, não bloqueante: `P4-06`/`P4-09`/`P4-10` citam almofada e cerâmica
personalizada, que não têm SKU específico no catálogo digital (diferente de caneca/camisa, que
aparecem como item combinado em "Serviço terceirizado") — mas o Manual da Marca (fonte de
verdade oficial) já lista os dois como parte real da operação, e os 3 briefings já são cautelosos
o bastante (não prometem disponibilidade, direcionam pra confirmação no atendimento). Registrado,
não bloqueado.

### O que foi aplicado no repo (com aprovação do Edvam)
- `docs/operacao/ESPECIFICACAO_TECNICA_OPERACAO_CANAL_JS_GRAFICA.md`: registro mestre atualizado,
  17 IDs (`P1-03`, `P1-04`, `P2-05` a `P2-10`, `P3-04`, `P3-05`, `P4-07` a `P4-11`, `P6-02`,
  `P6-03`) movidos pra `BRIEFING_APROVADO`/"Aprovado pelo usuário"; 3 IDs (`P3-06`, `P3-07`,
  `P3-08`) movidos pra `EM_CHECAGEM` com motivo real. Pull feito antes de editar (sha conferido,
  arquivo idêntico ao que eu tinha lido, sem conflito com o pipeline GPT que commita direto nesse
  repo o tempo todo).
- `docs/operacao/HANDOFF_359_revisao_briefings.md` (novo): handoff seguindo o formato do próprio
  protocolo do repo (seção 13), com a lista completa dos 32 IDs liberados pra produção, os 3 em
  pendência real e o motivo de cada decisão — pro squad de produção (ou qualquer chat) não ter
  ambiguidade.

### Resultado final
32 dos 39 IDs liberados pra produção (`BRIEFING_APROVADO`), 3 em pendência real aguardando
confirmação da equipe (`EM_CHECAGEM`), 4 sem mudança (1 `EM_CHECAGEM` + 3 `BLOQUEADO`,
pendências não relacionadas a conteúdo). Nenhum preço, prazo, promoção ou disponibilidade
inventado foi aprovado.

Ainda NÃO é "pronto pra clear" nesta janela: a demanda 348 (squad de produção de kits digitais)
segue aprovada no arquivo dela, mas sem confirmação direta do Edvam pra começar, ainda não
iniciada (mesma pendência já registrada nos relatos da 353/354).
