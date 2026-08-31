# 316 — Dizu: regex flat gerava falso positivo real em cliente pagante pedindo cardápio IMPRESSO

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27 (urgência: risco de redirecionar cliente pagante real pro número da Dizu)
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto

Achado urgente e crítico de negócio: o regex flat de detecção de confusão com a Dizu Refeições
(`Dizu: Verificar Padrao`, gate 1 do workflow `296 - JSGRAFICA | CAMINHO C FERRAMENTAS`, e a cópia
dele dentro de `Contexto: Buscar Log Recente`, criada na demanda 315) usava palavras como
`cardápio`/`almoço` sem nenhuma distinção de contexto. Confirmado com dado real que isso redirecionaria
clientes pagantes de verdade pra Dizu por engano:

- **Thalita Leal** (`558195023030`): 8 pedidos reais pagos de arte de cardápio IMPRESSO (PDF,
  impressão frente e verso em papel cartão, plastificação, QR code, modificação de arte). Mensagens
  como "Gostaria de imprimir 5 cardápios... vão ser plastificados" bateriam o regex antigo.
- **Cliente da placa "vende-se picolé"** (`558195693976`): pedido real pago de uma placa com nome de
  comida na arte. "Queria que vc fizesse uma placa... vende se picolé 2 reais" também bateria.

## Objetivo

Substituir o regex flat único por uma lógica em 2 níveis: nível 1 (palavras que nunca apareceram em
pedido real de gráfica, dispara direto) e nível 2 (palavras ambíguas — cardápio/almoço/marmita/
refeição/prato/comida — que só contam como Dizu se tiver sinal real de intenção de pedir/perguntar
disponibilidade E não tiver nenhum vocabulário de trabalho gráfico junto), aplicada IDENTICAMENTE
nos 2 lugares que hoje compartilham o regex antigo (mesmo requisito de sincronia manual já registrado
na demanda 315).

## Escopo

- Incluído: `Dizu: Verificar Padrao` (gate 1, mensagem atual) e a cópia dentro de `Contexto: Buscar
  Log Recente` (filtro de histórico, demanda 315) — ambos ganham a MESMA função `isDizuMessage`,
  copiada literal em cada node (2 execuções JS separadas no n8n, sem como compartilhar definição de
  função entre nodes).
- Explicitamente fora de escopo: `Contexto: Montar Retorno` (intocado); qualquer outro node do
  `296`; execução real do workflow contra mensagem de cliente/teste.

## Lógica final validada (verbatim, idêntica nos 2 nodes)

```js
function isDizuMessage(texto) {
  const altaPrecisao = /quentinha|bolinho de frango|\blombo\b|farofa|vinagrete|panqueca de carne|frango pizzaiolo|peixe frito|bife ao molho|cupim molho|prato feito|prato do dia|pre[çc]o d[ao] marmita/;
  if (altaPrecisao.test(texto)) return true;

  const ambigua = /card[áa]pio|almo[çc]o|marmita|refei[çc][ãa]o|\bprato\b|\bcomida\b/;
  if (!ambigua.test(texto)) return false;

  const temIntencaoPedido = /quero (um|uma)|vou querer|tem\s.{0,15}ainda|ainda tem|faz entrega|vcs? entreg|voc[êe]s? entreg|qual\s.{0,15}card[áa]pio|card[áa]pio\s.{0,10}hoje|hoje\s.{0,10}tem/;
  if (!temIntencaoPedido.test(texto)) return false;

  const temVocabGrafico = /imprim|papel\s*(cart[ãa]o|foto|of[íi]cio|couch[eê])|plastific|frente e verso|\barte\b|\bdesign\b|\bpdf\b|qr\s*code|adesivo|cart[ãa]o de visita|or[çc]amento|vende[- ]se/;
  if (temVocabGrafico.test(texto)) return false;

  return true;
}
```

`Dizu: Verificar Padrao` (mesma estrutura de antes: extrai `texto` de `body.message_text`/
`body.caption` minúsculo, chama a função, devolve `{ is_dizu }`):

```js
const b = ($json.body !== undefined) ? $json.body : $json;
const texto = (((b.message_text || '') + ' ' + (b.caption || '')).toLowerCase());

// Deteccao Dizu em 2 niveis (demanda 316) - regex flat anterior dava falso positivo real
// em clientes pagantes da grafica pedindo cardapio IMPRESSO (Thalita, 8 pedidos reais) e
// placa com nome de comida (picole, 1 pedido real). MESMA logica replicada em 'Contexto:
// Buscar Log Recente' (comentario la deixa isso explicito) - manter as 2 em sincronia manual.
function isDizuMessage(texto) {
  const altaPrecisao = /quentinha|bolinho de frango|\blombo\b|farofa|vinagrete|panqueca de carne|frango pizzaiolo|peixe frito|bife ao molho|cupim molho|prato feito|prato do dia|pre[çc]o d[ao] marmita/;
  if (altaPrecisao.test(texto)) return true;

  const ambigua = /card[áa]pio|almo[çc]o|marmita|refei[çc][ãa]o|\bprato\b|\bcomida\b/;
  if (!ambigua.test(texto)) return false;

  const temIntencaoPedido = /quero (um|uma)|vou querer|tem\s.{0,15}ainda|ainda tem|faz entrega|vcs? entreg|voc[êe]s? entreg|qual\s.{0,15}card[áa]pio|card[áa]pio\s.{0,10}hoje|hoje\s.{0,10}tem/;
  if (!temIntencaoPedido.test(texto)) return false;

  const temVocabGrafico = /imprim|papel\s*(cart[ãa]o|foto|of[íi]cio|couch[eê])|plastific|frente e verso|\barte\b|\bdesign\b|\bpdf\b|qr\s*code|adesivo|cart[ãa]o de visita|or[çc]amento|vende[- ]se/;
  if (temVocabGrafico.test(texto)) return false;

  return true;
}

return [{ json: { is_dizu: isDizuMessage(texto) } }];
```

`Contexto: Buscar Log Recente` (mesma estrutura de antes: pega o array de linhas, filtra usando a
mesma lógica em `texto = message_text + caption` de cada linha):

```js
const body = $input.first().json;
const rows = Array.isArray(body) ? body : (body ? [body] : []);

// Deteccao Dizu em 2 niveis, MESMA logica de 'Dizu: Verificar Padrao' (demanda 316) - mantida
// IDENTICA de proposito, nao criar copia que pode divergir com o tempo. Regex flat anterior
// (demanda 315) dava falso positivo em clientes pagantes pedindo cardapio IMPRESSO; ver 316.
function isDizuMessage(texto) {
  const altaPrecisao = /quentinha|bolinho de frango|\blombo\b|farofa|vinagrete|panqueca de carne|frango pizzaiolo|peixe frito|bife ao molho|cupim molho|prato feito|prato do dia|pre[çc]o d[ao] marmita/;
  if (altaPrecisao.test(texto)) return true;

  const ambigua = /card[áa]pio|almo[çc]o|marmita|refei[çc][ãa]o|\bprato\b|\bcomida\b/;
  if (!ambigua.test(texto)) return false;

  const temIntencaoPedido = /quero (um|uma)|vou querer|tem\s.{0,15}ainda|ainda tem|faz entrega|vcs? entreg|voc[êe]s? entreg|qual\s.{0,15}card[áa]pio|card[áa]pio\s.{0,10}hoje|hoje\s.{0,10}tem/;
  if (!temIntencaoPedido.test(texto)) return false;

  const temVocabGrafico = /imprim|papel\s*(cart[ãa]o|foto|of[íi]cio|couch[eê])|plastific|frente e verso|\barte\b|\bdesign\b|\bpdf\b|qr\s*code|adesivo|cart[ãa]o de visita|or[çc]amento|vende[- ]se/;
  if (temVocabGrafico.test(texto)) return false;

  return true;
}

const semDizu = rows.filter(r => {
  const texto = (((r.message_text || '') + ' ' + (r.caption || '')).toLowerCase());
  return !isDizuMessage(texto);
});

return semDizu.map(r => ({ json: r }));
```

## Critérios de aceite

- [x] As 12 frases reais fornecidas (6 devem dar `true`, 6 devem dar `false`) testadas ANTES do
      deploy, contra a string literal `jsCode` que seria enviada — não só a função isolada
- [x] Lógica idêntica nos 2 nodes (`Dizu: Verificar Padrao` e `Contexto: Buscar Log Recente`)
- [x] `Contexto: Montar Retorno` sem nenhuma alteração
- [x] Fix persistido de verdade no n8n (GET pós-PUT conferido, não só a resposta do PUT)
- [x] Diff node-a-node contra o backup confirma exatamente 2 nodes com conteúdo alterado, 0
      adicionados/removidos, conexões idênticas
- [x] Nenhuma execução real do workflow disparada

## Validação (12/12 casos, testados contra o `jsCode` literal de cada node antes do deploy)

| # | Entrada | Esperado | `Dizu: Verificar Padrao` (`is_dizu`) | `Contexto: Buscar Log Recente` (sobrevive ao filtro?) |
|---|---|---|---|---|
| T1 | "Quero um almoço" | Dizu (true) | `true` ✅ | filtrado (não sobrevive) ✅ |
| T2 | "Vou querer uma quentinha média por favor de frango crocante" | Dizu (true) | `true` ✅ | filtrado ✅ |
| T3 | "Tem almoço ainda" | Dizu (true) | `true` ✅ | filtrado ✅ |
| T4 | "Qual o cardápio de hoje?" | Dizu (true) | `true` ✅ | filtrado ✅ |
| T5 | "Ainda tem almoço" | Dizu (true) | `true` ✅ | filtrado ✅ |
| T6 | "Bom dia, cardápio dia 15/08/26 *CARNES*... Quentinha (M) 14,00" | Dizu (true) | `true` ✅ | filtrado ✅ |
| F1 | "Quero que vc faça um PDF... 2 cardápio standart / 3 cardápio essencial / 4 cardápio Premium" (Thalita) | não-Dizu (false) | `false` ✅ | sobrevive ✅ |
| F2 | "Gostaria de imprimir 5 cardápios / Frente e verso / Em papel cartão A4 ... vão ser plastificados" (Thalita) | não-Dizu (false) | `false` ✅ | sobrevive ✅ |
| F3 | "Você sabe como faço pra colocar o QR code do Instagram impresso no cardápio?" (Thalita) | não-Dizu (false) | `false` ✅ | sobrevive ✅ |
| F4 | "No cardápio essencial precisa fazer uma pequena modificação..." (Thalita) | não-Dizu (false) | `false` ✅ | sobrevive ✅ |
| F5 | "Queria que vc fizesse uma placa pra mim com o nome vende se picolé 2 reais" (picolé) | não-Dizu (false) | `false` ✅ | sobrevive ✅ |
| F6 | "Um banner vcs entregam com que prazo?" | não-Dizu (false) | `false` ✅ | sobrevive ✅ |

**12/12 PASS nos 2 nodes (24/24 asserções)** — nenhum ajuste de regex foi necessário, a lógica
proposta bateu de primeira contra todos os casos reais fornecidos.

## Riscos e cuidados

Mesmo workflow em produção, mesma restrição de whitelist de teste, nenhum cliente real. Backup
completo antes de mexer. Achado de precisão herdado (não desta demanda, não corrigido): o regex
`temIntencaoPedido` ainda pode ter falsos positivos/negativos não cobertos pelos 12 casos reais
fornecidos aqui — se aparecer caso real novo de confusão, tratar como demanda própria.

## Referências

Demanda 315 (criou a cópia do regex em `Contexto: Buscar Log Recente`, mesmo requisito de
sincronia manual). Demandas 296/305/298 (histórico do regex Dizu original, achados de falso
positivo/negativo já registrados e não corrigidos até agora).

## Relato de execução

Executado em 2026-08-27, workflow `296` (produção real, restrito à whitelist de teste).

### Confirmação do código atual (GET ao vivo, não por memória)

`Dizu: Verificar Padrao` (id `79ad8c0e-adbc-4662-987a-128d37ee43b0`) e `Contexto: Buscar Log
Recente` (id `c8e83c51-e088-4bed-b2f9-0428c2e4c700`) confirmados bit a bit idênticos ao
documentado na demanda 315 antes de qualquer mudança.

### Backup pré-mudança

`pm/backups/296-caminho-c-ferramentas_pre-demanda316_2026-08-27.json` (99 nodes, GET fresco
direto da API, antes de qualquer edição).

### Validação local antes do deploy

Rodado localmente (Node.js) contra a string `jsCode` LITERAL que seria enviada a cada node (não
contra a função isolada) — os 12 casos reais fornecidos, nos 2 nodes: 24/24 asserções passaram de
primeira, sem precisar ajustar a lógica proposta.

### Aplicado e verificado

`PUT /workflows/aO6iktSzcYtVZ6B5` (corpo mínimo `name`/`nodes`/`connections`/`settings`, mesmo
padrão das demandas 314/315), HTTP 200. `GET` imediatamente depois (leitura fresca separada, não a
resposta do PUT) confirmou:
- `Dizu: Verificar Padrao.parameters.jsCode` e `Contexto: Buscar Log Recente.parameters.jsCode`
  idênticos, byte a byte, ao que foi pretendido.
- 99 → 99 nodes, 0 adicionados, 0 removidos.
- Exatamente 2 nodes com conteúdo alterado (os 2 pretendidos), e em cada um, tudo exceto `jsCode`
  permaneceu idêntico ao backup (mesmo `id`, `type`, `typeVersion`, `position`, `name`).
- `connections` idêntico byte a byte ao backup.

Nenhuma execução real do workflow disparada.

### Diff final

Contra o backup pré-316: `0` nodes adicionados, `0` removidos, exatamente `2` nodes com conteúdo
alterado (`Dizu: Verificar Padrao` e `Contexto: Buscar Log Recente`, mesmos ids, mesmos tipos, só o
`jsCode`), conexões idênticas byte a byte ao backup. 99 → 99 nodes.
