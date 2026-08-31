# 317 — Anexo sem legenda derrubava a execução inteira do `01` quando o Caminho C está ativo

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27 (urgência: mensagem real do cliente não fica visível em lugar nenhum)
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto

Achado urgente e crítico de negócio, confirmado hoje via traces reais de execução do workflow
`01 - JSGRAFICA | LOG MSG RECEBIDAS` (`lcFEt1kbyqNfTS89`, dedicado à JS Gráfica, não compartilhado
com outro cliente): execuções `1567692`, `1567862` e mais 2 recorrências no mesmo dia. Sempre que
um cliente manda um anexo (documento/imagem/figurinha/etc.) SEM legenda, E o agente Caminho C está
ativo pra aquele contato (roteamento real desde a demanda 299), a execução inteira do `01` aborta
e a mensagem nunca chega a ser gravada em `jsgrafica_log_msgs_privadas` — nem como fallback, fica
invisível pra equipe em qualquer lugar do sistema. Achado mensurável relevante: ~43% de toda
mensagem nova de cliente é mídia sem texto nenhum (demandas 159-163/204/205), então o caso não é
raro.

## Causa raiz (confirmada por leitura do código real, não por suposição)

1. `Preparar Payload Agente Caminho C` (Code node) monta o payload do agente assim:
   `mensagem_texto: d.message_text || d.caption || ''`. Num anexo sem legenda, `message_text` e
   `caption` são ambos nulos/vazios, então `mensagem_texto` vira string vazia literal.
2. `HTTP Agente Caminho C` faz `POST` desse payload pro webhook do agente
   (`https://n8n.labonchain.xyz/webhook/caminho-c-agente`). A validação de entrada do agente
   rejeita texto vazio com `400 {"ok":false,"erro":"parametros_invalidos"}`.
3. `HTTP Agente Caminho C` não tinha `onError` configurado (default do n8n é abortar em erro), e
   esse 400 vira um `NodeApiError` não tratado que derruba a execução INTEIRA do `01` — incluindo
   o ramo irmão de log (`Switch Log Geral` → ... → `PREPARAR LOG MSG PRIVADA` → `MSG PRIVADA`, o
   INSERT no Supabase), que é estruturalmente independente (os 2 ramos saem de `Processar Evento`,
   confirmado nas `connections` do workflow) mas nunca chega a rodar porque o comportamento padrão
   do n8n é parar a execução inteira em erro não tratado de qualquer node, não só o ramo onde
   ocorreu.

## Objetivo

Corrigir os 2 lados do problema (defesa em profundidade, mesmo princípio já usado noutro lugar
deste projeto, ex. a trava Dizu vivendo em 2 pontos):

- **Parte A (causa raiz)**: `mensagem_texto` nunca mais pode virar string vazia pro Caminho C.
- **Parte B (rede de segurança)**: erro em `HTTP Agente Caminho C` nunca mais pode derrubar o ramo
  de log, mesmo que apareça uma causa de erro nova no futuro.

## Escopo

- Incluído: `Preparar Payload Agente Caminho C` (jsCode) e `HTTP Agente Caminho C` (`onError`) —
  ambos no workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS`.
- Explicitamente fora de escopo: qualquer outro node do `01`; o agente `297`/ferramentas `296`;
  execução real do workflow contra mensagem de cliente/teste.

## Investigação antes de mudar

Confirmado via `GET` fresco (não por memória) que o código real dos 2 nodes batia exatamente com
o suspeitado. Rastreamento de onde `d.media_type` vem e se sobrevive até este ponto do pipeline:
`Processar Evento` (early no `01`) monta `media_type` a partir do payload real da Z-API (`image`/
`video`/`audio`/`document`/`sticker`/`gif`/`ptv`/`contact`/`location`/`hydratedTemplate.header.*`).
Esse campo atravessa `CHECK SESSAO PEDIDO` → `AJUSTAR DESTINO AGENTE FASE B` →
`Aplicar Fallback Se Destino Morto` → `Switch Destino` (node `switch` puro, não transforma
`$json`) → `Preparar Payload Agente Caminho C`, sempre via spread (`{...original, ...}`), então
`d.media_type` está confiável neste ponto — mas o fallback final escolhido (ver abaixo) nem
depende disso, por robustez.

Checado o padrão já usado NESTE MESMO CÓDIGO pra exatamente essa situação (texto ou legenda
ausente): `Contexto: Montar Retorno`, workflow `296 - JSGRAFICA | CAMINHO C FERRAMENTAS` (lido
`verbatim` via GET, não por paráfrase — a descrição inicial do problema citava um fallback com
`transcription_text` e interpolação de `media_type` que **não bateu** com o código real; o código
real é mais simples):
```js
texto: l.message_text || l.caption || '[midia sem legenda]',
```
Adotada a MESMA string fixa `'[midia sem legenda]'`, por consistência com o que já existe em
produção e por ser mais robusta (não depende de `media_type` estar preenchido em todo caso, ex.
`contact`/`location`).

Checado também o padrão de `onError` já usado neste workflow em nodes HTTP irmãos praticamente
idênticos (mesmo formato de chamada, `POST` pro webhook de um agente): `HTTP 206`, `HTTP Request` e
`Verificar 06-PEDIDOS Vivo` já usam `onError: "continueRegularOutput"` (campo moderno de nível de
node, não o `continueOnFail` booleano antigo — confirmado que esta instância de n8n usa a forma
moderna). `HTTP Agente Caminho C` não tem NENHUM node consumindo sua saída (`connections` confirma
que ele não tem `main` de saída no workflow) — ou seja, não existe risco de quebrar algo que espera
o formato de resposta dele; `onError: "continueRegularOutput"` é seguro de aplicar sem efeito
colateral.

## Fix aplicado

**Parte A** — `Preparar Payload Agente Caminho C`, único trecho alterado:
```js
// antes
mensagem_texto: d.message_text || d.caption || '',
// depois
mensagem_texto: d.message_text || d.caption || '[midia sem legenda]',
```
(comentário de cabeçalho do node também ganhou 1 parágrafo novo citando a demanda 317, resto do
código idêntico).

**Parte B** — `HTTP Agente Caminho C` ganhou `onError: "continueRegularOutput"` (chave de nível de
node, `parameters` intocados).

## Validação antes do deploy

Rodada a string `jsCode` LITERAL do node modificado (não a lógica isolada) contra 5 casos,
incluindo os 2 reais da causa (documento com `caption:''`, imagem com `caption:null`), mais
regressão de texto puro e de mídia COM legenda:

| Caso | Entrada relevante | `mensagem_texto` resultante | Vazio? |
|---|---|---|---|
| Documento sem legenda (perfil da execução `1567692`) | `caption: ''`, `media_type: 'document'` | `[midia sem legenda]` | não |
| Imagem sem legenda | `caption: null`, `media_type: 'image'` | `[midia sem legenda]` | não |
| Texto normal | `message_text: "Oi, quanto custa um banner?"` | `Oi, quanto custa um banner?` (inalterado) | não |
| Imagem COM legenda | `caption: "segue a arte"` | `segue a arte` (inalterado) | não |
| Figurinha sem legenda | `caption: null`, `media_type: 'sticker'` | `[midia sem legenda]` | não |

5/5 casos passaram, incluindo confirmação de que mensagem de texto normal segue 100% inalterada.

Parte B: `onError: "continueRegularOutput"` só faz a execução do `01` continuar depois de qualquer
erro (400, timeout, 5xx) na chamada ao agente Caminho C, em vez de abortar tudo — não muda o
comportamento de sucesso, e como nada consome a saída desse node hoje, não há formato de resposta
esperado que possa quebrar. O erro em si (ex. um 400 futuro por outro motivo) deixa de aparecer
como falha de execução do `01` no painel do n8n; não foi adicionado nenhum ramo de tratamento de
erro dedicado (nenhum node consome hoje a saída de erro), aceito como suficiente porque a Parte A
já fecha a única causa conhecida de 400 aqui, e a Parte B existe só como rede de segurança contra
causas futuras desconhecidas, não como substituto de monitoramento.

## Deploy

Backup pré-mudança: `pm/backups/01-log-msg-recebidas_pre-demanda317_2026-08-27.json` (64 nodes,
`GET` fresco direto da API, antes de qualquer edição).

`PUT /workflows/lcFEt1kbyqNfTS89` (corpo mínimo `name`/`nodes`/`connections`/`settings`, mesmo
padrão das demandas 314/315/316), HTTP 200. `GET` imediatamente depois (leitura fresca separada,
não a resposta do PUT) confirmou:
- 64 → 64 nodes, 0 adicionados, 0 removidos.
- Exatamente 2 nodes com conteúdo alterado (`Preparar Payload Agente Caminho C` e
  `HTTP Agente Caminho C`), mesmos `id`/`type`/`typeVersion`/`position` de cada um preservados.
- `connections` idêntico byte a byte ao backup.
- `jsCode` do 1º node e `onError` do 2º confirmados exatamente como pretendido na leitura fresca.

Nenhuma execução real do workflow disparada.

## Critérios de aceite

- [x] Documento com `caption:''` e imagem com `caption:null` produzem `mensagem_texto` não-vazio
- [x] Mensagem de texto normal (`message_text` preenchido) segue 100% inalterada
- [x] `HTTP Agente Caminho C` ganha `onError: continueRegularOutput`, mesmo padrão já usado em
      `HTTP 206`/`HTTP Request`/`Verificar 06-PEDIDOS Vivo` neste workflow
- [x] Confirmado que nenhum node consome a saída de `HTTP Agente Caminho C` hoje (rede de
      segurança não quebra nada downstream)
- [x] Fix persistido de verdade no n8n (`GET` pós-`PUT` conferido, não só a resposta do `PUT`)
- [x] Diff node-a-node contra o backup confirma exatamente 2 nodes com conteúdo alterado, 0
      adicionados/removidos, conexões idênticas
- [x] Backup pré-mudança salvo antes de qualquer edição
- [x] Nenhuma execução real do workflow disparada

## Riscos e cuidados

Workflow em produção real, atendendo tráfego real restrito à whitelist do Caminho C (piloto desde
a demanda 299). A Parte B intencionalmente não adiciona ramo de tratamento de erro dedicado — se
o agente Caminho C começar a falhar por outro motivo no futuro (fora do escopo desta demanda), a
falha deixa de abortar a execução do `01`, mas também deixa de aparecer como execução com erro no
painel do n8n; monitoramento futuro do Caminho C, se necessário, é assunto separado.

## Referências

Demanda 299 (conectou o Caminho C no roteamento real do `01`). Demandas 159-163/204/205 (43% de
mensagem nova é mídia sem texto, base do dado de impacto). Demanda 296 (origem do fallback
`'[midia sem legenda]'` reaproveitado aqui, em `Contexto: Montar Retorno`).

## Relato de execução

Executado em 2026-08-27, workflow `01` (produção real).

Confirmado via `GET` ao vivo que o código de `Preparar Payload Agente Caminho C` e
`HTTP Agente Caminho C` batia exatamente com o suspeitado nos traces das execuções `1567692`/
`1567862` e as 2 recorrências seguintes. Backup salvo
(`pm/backups/01-log-msg-recebidas_pre-demanda317_2026-08-27.json`, 64 nodes). Rastreada a origem e
sobrevivência de `media_type` no pipeline (confirmando que o fallback poderia até ter usado
interpolação de tipo, mas optado pela string fixa `'[midia sem legenda]'` por já ser o padrão
idêntico usado em `Contexto: Montar Retorno` do workflow `296`, mais simples e mais robusto).
5/5 casos de validação (incluindo os 2 reais da causa) passaram contra o `jsCode` literal antes do
deploy. Aplicado via `PUT`, confirmado com `GET` fresco separado: diff final é exatamente 2 nodes
com conteúdo alterado (0 adicionados/removidos), tudo exceto o campo pretendido idêntico ao backup
em cada um, conexões idênticas byte a byte. Nenhuma execução real do workflow disparada.
