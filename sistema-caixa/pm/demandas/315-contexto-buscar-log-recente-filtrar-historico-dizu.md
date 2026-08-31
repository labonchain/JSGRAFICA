# 315 — Contexto: Buscar Log Recente (workflow 296) passa a filtrar histórico Dizu, sem tocar no gate ao vivo

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27 (continuação direta da correção de ordenação da mesma demanda 314, mesmo dia)
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Continuação da 314 no mesmo pré-passo `carregar_contexto_atendimento` do workflow
`296 - JSGRAFICA | CAMINHO C FERRAMENTAS (TESTE ISOLADO)` (id `aO6iktSzcYtVZ6B5`).

Existem 2 mecanismos estruturalmente separados no `296`, que precisavam continuar separados:
1. `Chamar Gate Dizu` / `Dizu: Verificar Padrao` (webhook `caminho-c-verificar-dizu`) — roda contra
   a mensagem ATUAL recebida (`body.message_text`/`body.caption`), antes de qualquer
   processamento do agente, pra detectar e redirecionar confusão com a Dizu Refeições (já
   corrigido hoje pro número novo (81) 9107-0806) — **não mexido nesta demanda**.
2. `Contexto: Buscar Log Recente` (corrigido na 314 pra ordenação) → `Contexto: Montar Retorno` —
   carrega as últimas 8 mensagens (janela de 7 dias, os 2 lados da conversa) pra dar contexto ao
   agente antes de responder a uma mensagem NOVA e sem relação.

Achado real confirmado: se uma conversa antiga sobre comida da Dizu (já resolvida/redirecionada
em outro dia) ainda está dentro da janela de 7 dias, ela volta a entrar no contexto do agente
numa mensagem completamente diferente e sem relação, confundindo o agente.

## Objetivo
Filtrar do `contexto_recente` qualquer mensagem histórica (de qualquer lado da conversa) que bata
o MESMO padrão Dizu do gate 1, sem alterar o gate 1 em nada.

## Escopo
- Incluído: modificar `Contexto: Buscar Log Recente` (o Code node de unwrap, id
  `c8e83c51-e088-4bed-b2f9-0428c2e4c700`, já convertido de Supabase-node pra Code na 314) pra
  filtrar o array de linhas antes de devolvê-las, usando o MESMO literal de regex de
  `Dizu: Verificar Padrao` (copiado byte a byte, com comentário deixando explícito que deve ficar
  em sincronia manual com aquele node).
- Explicitamente fora de escopo: `Dizu: Verificar Padrao` (gate 1, mensagem atual) — intocado.
  `Contexto: Montar Retorno` — intocado (o filtro entra antes, no unwrap, exatamente com os
  mesmos campos que aquele node já lê: `message_text`/`caption`). Nenhuma execução real do
  workflow contra mensagem de cliente/teste.

## Regex reutilizado (verbatim, de `Dizu: Verificar Padrao`)
```
/quentinha|marmita|prato feito|card[áa]pio|bolinho de frango|lombo|farofa|vinagrete|panqueca de carne|frango pizzaiolo|peixe frito|bife ao molho|cupim molho|almo[çc]o|refei[çc][ãa]o|prato do dia|pre[çc]o d[ao] marmita|tem comida|vcs? vendem? comida/i
```

## Critérios de aceite
- [x] `Contexto: Buscar Log Recente` filtra do resultado qualquer linha cujo texto
      (`message_text`/`caption`, minúsculo, mesma construção do gate 1) bata o regex acima
- [x] Regex idêntico ao de `Dizu: Verificar Padrao`, com comentário de sincronia manual
- [x] `Dizu: Verificar Padrao` e `Contexto: Montar Retorno` sem nenhuma alteração
- [x] Confirmado que a mensagem atual/disparadora não passa por este caminho (o webhook
      `caminho-c-carregar-contexto-atendimento` só recebe `{telefone}`, ver
      `Validar Entrada Contexto`; a mensagem atual chega ao agente por outro caminho, fora do
      `296`)
- [x] Sanity check com dado real: telefone real com Dizu + não-Dizu misturados nos últimos 7 dias
- [x] Fix persistido de verdade no n8n (GET pós-PUT conferido, não só a resposta do PUT)
- [x] Nenhuma execução real do workflow disparada

## Riscos e cuidados
Mesmo workflow em produção, mesma restrição de whitelist de teste, nenhum cliente real. Backup
completo antes de mexer.

## Referências
Demanda 314 (correção de ordenação no mesmo node, mesmo dia — pré-requisito direto). Gate Dizu
original construído/corrigido nas demandas 296/305 (achado de referência quebrada) e ajustado hoje
pro novo número da Dizu Refeições.

## Relato de execução

Executado em 2026-08-27, workflow `296` (produção real, restrito à whitelist de teste). Backup
antes de mexer: `pm/backups/296-caminho-c-ferramentas_pre-demanda315_2026-08-27.json` (99 nodes,
já incluindo a correção da 314).

### Regex confirmado verbatim no node `Dizu: Verificar Padrao` (GET ao vivo, não por memória)
```js
const b = ($json.body !== undefined) ? $json.body : $json;
const texto = (((b.message_text || '') + ' ' + (b.caption || '')).toLowerCase());
const re = /quentinha|marmita|prato feito|card[áa]pio|bolinho de frango|lombo|farofa|vinagrete|panqueca de carne|frango pizzaiolo|peixe frito|bife ao molho|cupim molho|almo[çc]o|refei[çc][ãa]o|prato do dia|pre[çc]o d[ao] marmita|tem comida|vcs? vendem? comida/i;
return [{ json: { is_dizu: re.test(texto) } }];
```

### Confirmação do caminho da mensagem atual (não afetada)
O webhook deste pré-passo (`WH Carregar Contexto Atendimento`, path
`caminho-c-carregar-contexto-atendimento`) alimenta `Validar Entrada Contexto`, cujo código só lê
`b.telefone` do corpo recebido — nenhum campo de texto de mensagem entra nesta chamada. A janela
de busca (`desde_ms`) é calculada a partir de `$now` menos 7 dias, sem depender do conteúdo da
mensagem atual. Ou seja, este pré-passo estruturalmente só pode enxergar HISTÓRICO já gravado em
`jsgrafica_log_msgs_privadas`, nunca a mensagem que está dentro do próprio turno em processamento
— essa chega ao agente por outro caminho, dentro do workflow `297`/`01`, fora do `296`. Filtrar o
array de histórico aqui não tem como mudar como a mensagem atual é tratada.

### Correção aplicada
`Contexto: Buscar Log Recente` (Code node, id `c8e83c51-e088-4bed-b2f9-0428c2e4c700`, o mesmo
convertido na 314) ganhou um filtro antes do `return`, reaproveitando o MESMO literal de regex do
gate 1 (comentário no código deixa explícito que precisa ficar em sincronia manual se o gate 1
mudar) e a mesma construção de texto (`message_text` + espaço + `caption`, minúsculo) — os 2
únicos campos de texto que `Contexto: Montar Retorno` já lê pra montar `contexto_recente`.

**Antes:**
```js
const body = $input.first().json;
const rows = Array.isArray(body) ? body : (body ? [body] : []);
return rows.map(r => ({ json: r }));
```

**Depois:**
```js
const body = $input.first().json;
const rows = Array.isArray(body) ? body : (body ? [body] : []);

// Mesmo regex de 'Dizu: Verificar Padrao' (demanda 315) - mantido IDENTICO de proposito,
// nao criar uma copia que pode divergir com o tempo. Filtra do contexto historico qualquer
// mensagem (de qualquer lado da conversa) que ja bateu o padrao de confusao com a Dizu
// Refeicoes, pra nao poluir o contexto de um atendimento novo sem relacao com aquele
// assunto antigo/ja resolvido. NAO afeta a mensagem atual/disparadora: este webhook so
// recebe {telefone} (ver 'Validar Entrada Contexto'), a mensagem atual chega pro agente
// por outro caminho, fora desta busca de historico.
const RE_DIZU = /quentinha|marmita|prato feito|card[áa]pio|bolinho de frango|lombo|farofa|vinagrete|panqueca de carne|frango pizzaiolo|peixe frito|bife ao molho|cupim molho|almo[çc]o|refei[çc][ãa]o|prato do dia|pre[çc]o d[ao] marmita|tem comida|vcs? vendem? comida/i;

const semDizu = rows.filter(r => {
  const texto = (((r.message_text || '') + ' ' + (r.caption || '')).toLowerCase());
  return !RE_DIZU.test(texto);
});

return semDizu.map(r => ({ json: r }));
```

`Contexto: Montar Retorno` — nenhuma linha mudada. `Dizu: Verificar Padrao` — nenhuma linha
mudada.

### Sanity check com dado real (Supabase, somente leitura)
Consulta nos últimos 7 dias em `jsgrafica_log_msgs_privadas` (regex Postgres equivalente ao regex
JS acima, `~*`) achou vários telefones reais com mistura de Dizu + não-Dizu na janela. Escolhido
`558197366449` (26 mensagens na janela, 3 batendo o regex, 23 não), porque é telefone real (não
`@lid`) com histórico misto de verdade nos últimos dias — os exemplos antigos citados na abertura
da demanda (`5521965185667`/`558195023030`) não têm mais essa mistura na janela atual, dado que já
se moveu, como esperado.

Reproduzindo exatamente a consulta do node (mesmo filtro de telefone + janela de 7 dias, `order by
data_timestamp desc limit 8`, as 8 linhas que o `296` de fato carregaria hoje):

| horário (America/Recife) | quem | bate Dizu? | texto |
|---|---|---|---|
| 25/08 15:18:50 | cliente | não | "Peço obrigada a gente é amor viu seu trabalho e mais umas coisas..." |
| 25/08 13:52:34 | equipe | não | "Obrigado." |
| 25/08 10:37:29 | cliente | **sim** | "Tira o nome **almoço** repetir e colocar organizadora e o nome em baixa 30 dia e 20 " |
| 25/08 10:36:26 | cliente | não | (mídia sem legenda) |
| 25/08 10:36:14 | cliente | não | "Aí quando pode pega" |
| 25/08 10:35:53 | cliente | não | "Desse jeito" |
| 25/08 10:35:48 | cliente | não | (mídia sem legenda) |
| 25/08 10:35:27 | cliente | não | "Esse" |

Com o filtro novo, a linha das 10:37:29 (falso positivo real do regex herdado do gate 1 — assunto
é arte gráfica, não comida da Dizu, mas contém a palavra "almoço" e o regex é amplo de propósito)
sai do `contexto_recente`; as outras 7 permanecem, exatamente como esperado. Confirma que o filtro
usa os mesmos campos que `Contexto: Montar Retorno` já lê e produz o resultado esperado contra
dado real, não hipotético. Achado de precisão do regex (não desta demanda, herdado do gate 1,
mesma categoria já registrada como "fora de escopo" na 298): "almoço" sozinho, sem outro sinal de
comida, é falso positivo conhecido — não corrigido aqui porque mexer no regex do gate 1 está fora
do escopo aprovado (mudaria o comportamento AO VIVO do gate 1, que a instrução desta demanda
proíbe explicitamente).

### Aplicado e verificado
PUT via API do n8n (`PUT /workflows/aO6iktSzcYtVZ6B5`, corpo mínimo `name`/`nodes`/`connections`/
`settings`), HTTP 200. GET imediatamente depois (leitura fresca separada, não a resposta do PUT)
confirmou o código persistido exatamente como pretendido, `Dizu: Verificar Padrao` e
`Contexto: Montar Retorno` bit a bit idênticos ao backup pré-mudança.

### Diff final
Contra o backup pré-315: `0` nodes adicionados, `0` removidos, exatamente `1` node com conteúdo
alterado (`Contexto: Buscar Log Recente`, mesmo id, mesmo tipo Code, só o `jsCode`), conexões
(`connections`) idênticas byte a byte ao backup. 99 → 99 nodes. Nenhuma execução real do workflow
disparada.
