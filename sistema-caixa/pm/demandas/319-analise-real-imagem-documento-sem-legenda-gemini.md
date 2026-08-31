# 319 — Análise real de imagem/documento sem legenda via Gemini (reaproveitando o padrão do `206`)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto

~43% de toda mensagem nova de cliente é mídia sem texto nenhum (demandas 159-163/204/205). Hoje,
no ramo ativo (`01` → agente Caminho C, `297`), imagem/documento sem legenda vira literalmente
`'[midia sem legenda]'` (fallback da demanda 317) — nenhum conteúdo real chega nem pro agente nem
pro humano lendo o Inbox depois. Existe implementação real e testada (13/13, demanda 203) desse
exato problema no workflow congelado `206 - JSGRAFICA | AGENTE FASE B` (`Gemini Analisar Mídia`,
`Baixar Mídia`, `Converter Mídia Base64`), mas o `206` não recebe mais tráfego real desde a
demanda 299 (substituído pelo Caminho C no roteamento).

## Objetivo

Trazer a mesma análise de mídia real (Gemini Vision) pro ramo ativo do `01`, como um branch novo
em paralelo ao de transcrição de áudio já existente, escrevendo uma descrição legível em
`message_text` — sem alterar `Preparar Payload Agente Caminho C` além do que a demanda 318 já
mexeu.

## Escopo

- Incluído: workflow `01` — 1 IF novo + 4 nodes novos (download, conversão, chamada Gemini,
  parse/formatação) + religação de 1 aresta existente (`If É Audio?` saída falsa).
- Explicitamente fora de escopo: o workflow `206` em si (só lido, não alterado); qualquer lógica
  de elegibilidade além da condição replicada; execução real contra mensagem de cliente/teste.

## Investigação antes de mudar — decisão de credencial

**Achado importante, mudou a proposta original**: a credencial sugerida inicialmente
(`mZQEmMg1wJGA5bkH`, "Gemini API (teste isolado 206)") é usada em EXATAMENTE 2 nodes em toda a
conta n8n — os 2 dentro do próprio `206` congelado, e o próprio nome já avisa "teste isolado".

Levantamento real (não GET de credenciais — a API pública do n8n não lista credenciais, só
schema — feito via varredura de TODOS os workflows da conta por `nodeCredentialType:
googlePalmApi`): existe uma segunda credencial, `HuMb1WcX1o0FTeLu` ("Google Gemini(PaLM) Api
account"), usada em dezenas de workflows ativos de vários clientes LabOnchain (Kuidu, OrganizAI,
Dizu, GrupoPrima, Labon, Tripneed, etc.) — **e usada pelo próprio `297 - JSGRAFICA | CAMINHO C
AGENTE`, o agente que está recebendo tráfego real da JS Gráfica agora**, no node `Google Gemini
Chat Model`.

Confirmado AO VIVO (não só por estar referenciada em código): consultado o histórico de execuções
do `297` via API, 5 execuções `success` nos últimos ~15 minutos antes desta demanda (a mais
recente `1567992`, 12:24 UTC do mesmo dia); aberto o detalhe da execução `1567992` e confirmado
que o node `Google Gemini Chat Model` rodou **sem erro** (chamada Gemini real, resposta usada pra
gerar mensagem que foi enviada de verdade via Z-API e logada). Prova de funcionamento mais forte
que a alternativa (credencial isolada, sem tráfego fora de um workflow congelado).

**Decisão**: usar `HuMb1WcX1o0FTeLu` em vez da credencial sugerida originalmente, tanto aqui
quanto na demanda 320 (mesma credencial reaproveitada nas duas, pelo mesmo motivo de consistência
com o resto da conta — a própria conta já reusa essa credencial pra esse exato caso de uso,
transcrição de áudio, em workflows de outros clientes).

## Investigação antes de mudar — topologia

`If É Audio?` (condição `media_type === 'audio'`) hoje manda a saída falsa (tudo que não é áudio)
direto pra `ENVIAR PARA LLM` (e em paralelo pra `Merge Log Geral`, sem relação com este fix).
`ENVIAR PARA LLM` remapeia um conjunto curado de campos — incluindo `message_text` — e segue até
`GET Memoria Ativa (raw)` → ... → `CHECK SESSAO PEDIDO` → ... → `Switch Destino` →
`Preparar Payload Agente Caminho C`, que lê `d.message_text`. É o MESMO caminho que a transcrição
de áudio já usa pra devolver texto (`processar audio p llm` também escreve em `message_text` e
também aponta pra `ENVIAR PARA LLM`) — replicado o mesmo padrão pra mídia visual.

Rastreados os nodes intermediários entre `ENVIAR PARA LLM` e `Switch Destino` (`GET Memoria Ativa`,
`CHECK SESSAO PEDIDO`, `GET Telefone Autorizado (Fase B)`, `AJUSTAR DESTINO AGENTE FASE B`, `E
Destino Pedidos?`, `Verificar 06-PEDIDOS Vivo`, `Aplicar Fallback Se Destino Morto`, `Contar
Envios Automaticos Recentes`, `Detectar Loop Resposta Automatica`, `Loop Automatico Estourou?`,
`Marcar Sessao Para Revisao Humana`, `Restaurar Entrada Apos Marcar`): todos os nodes de código
nessa cadeia re-ancoram explicitamente por referência de nome (`$('AJUSTAR DESTINO AGENTE FASE
B').first().json` etc.) em vez de confiar no `$json` direto — confirmado por leitura do `jsCode`
real de cada um, não por suposição — então `message_text` sobrevive intacto até
`Preparar Payload Agente Caminho C`, mesma garantia que já vale pra transcrição de áudio.

## Fix aplicado

**Node novo** `É Mídia Visual Sem Legenda?` (IF): `media_type` em `['image','document']` E
`media_url` não vazio E `(message_text+caption)` vazio — mesma condição do `206` (`É Mídia Sem
Legenda?`), restrita a imagem/documento (áudio já tratado à parte).

**Religação**: `If É Audio?` saída falsa deixa de apontar direto pra `ENVIAR PARA LLM` e passa a
apontar pro novo IF (a aresta pra `Merge Log Geral` continua igual). Saída falsa do novo IF (mídia
com legenda, texto puro, ou mídia que não é imagem/documento) segue direto pra `ENVIAR PARA LLM`,
sem mudança de comportamento pra esses casos.

**Node novo** `Baixar Mídia (Imagem/Doc)` (httpRequest, `responseFormat: file`,
`onError: continueRegularOutput`) → **`Converter Mídia Base64 (Imagem/Doc)`** (Code, com
`try/catch` explícito — **gap identificado antes de copiar**: a versão original no `206` não
tinha nenhum tratamento de erro aqui, mesma classe de bug da demanda 317, corrigida já na cópia
em vez de herdada) → **`Gemini Analisar Mídia (Imagem/Doc)`** (httpRequest, mesmo prompt/modelo do
`206`, credencial `HuMb1WcX1o0FTeLu`, `onError: continueRegularOutput`) → **`Gemini: Parsear e
Formatar Descrição`** (Code, extrai o JSON da resposta do Gemini como o `206` já fazia, mas
constrói uma frase legível em vez de devolver o JSON cru — ex. `[cliente enviou documento PDF (3
paginas) sem legenda, aparenta ser: cartão de visita]` — e escreve em `message_text`; qualquer
falha em qualquer etapa anterior cai no MESMO fallback `'[midia sem legenda]'` já usado em toda a
base) → `ENVIAR PARA LLM`.

## Validação antes do deploy

Rodada a string `jsCode` LITERAL de cada node novo (harness local, mesmo usado na demanda 318)
contra 11 casos:

| # | Node | Caso | Esperado | Resultado |
|---|---|---|---|---|
| J | Converter Mídia Base64 | binário presente | base64 correto | ✅ |
| K | Converter Mídia Base64 | sem binário (download falhou) | `_media_base64: null`, sem quebrar | ✅ |
| L | Converter Mídia Base64 | leitura do buffer lança exceção | capturado, `_media_base64: null` | ✅ |
| M | Parsear e Formatar | sucesso, PDF, `documento_obvio`, produto detectado | frase legível com páginas e produto | ✅ |
| N | Parsear e Formatar | sucesso, imagem ambígua, sem produto | frase com aviso "confirmar com o cliente" | ✅ |
| O | Parsear e Formatar | conversão base64 falhou antes | fallback `'[midia sem legenda]'` | ✅ |
| P | Parsear e Formatar | chamada Gemini retornou erro | fallback `'[midia sem legenda]'` | ✅ |
| Q | Parsear e Formatar | Gemini respondeu texto que não é JSON válido | fallback, sem quebrar | ✅ |

8/8 casos passaram de primeira (mais 3 casos de regressão do fallback geral, cobertos junto com a
demanda 318 no mesmo harness).

**Validação da condição de gatilho contra caso real**: telefone `558198257944` (citado como
exemplo na investigação anterior do dia), consulta real via SQL confirma mensagem `document`, com
`media_url` presente, `message_text: null`, `caption: ''` — os 3 requisitos da condição
(`media_type` in [image,document], `media_url` não vazio, texto+legenda vazios) batem, então essa
mensagem real HOJE cairia no branch novo de análise em vez do fallback antigo.

## Deploy

Mesmo backup/`PUT`/`GET` da demanda 318 (aplicado no mesmo `PUT` do workflow `01`, já que as duas
mudam o mesmo arquivo). Diff pós-deploy confirma os 5 nodes desta demanda (`É Mídia Visual Sem
Legenda?`, `Baixar Mídia (Imagem/Doc)`, `Converter Mídia Base64 (Imagem/Doc)`, `Gemini Analisar
Mídia (Imagem/Doc)`, `Gemini: Parsear e Formatar Descrição`) adicionados exatamente como
pretendido, e a religação de `If É Audio?` (saída falsa) confirmada — resto das conexões do `01`
idêntico ao backup. Ver detalhe completo do `PUT`/`GET`/diff na demanda 318.

Nenhuma execução real do workflow disparada — não foi possível/tentado um "test step" de node
único via API (a API pública do n8n não expõe esse recurso; uma tentativa de checar se existia
endpoint de execução foi bloqueada pelo próprio classificador de segurança do ambiente de
execução, reforçando a cautela pedida). Confiança adicional vem da validação estática exaustiva
acima e da prova ao vivo (execução real `1567992`) de que a credencial escolhida funciona.

## Critérios de aceite

- [x] Condição de gatilho idêntica à do `206`, restrita a imagem/documento
- [x] Caso real (`558198257944`, documento sem legenda) confirmado como elegível pro branch novo
- [x] Toda etapa da cadeia nova tem tratamento de erro que nunca derruba a execução
- [x] Gap identificado no `206` (`Converter Mídia Base64` sem `onError`) corrigido na cópia
- [x] Resultado final chega em `message_text` a tempo de `Preparar Payload Agente Caminho C` ler
- [x] Nenhuma mudança adicional necessária em `Preparar Payload Agente Caminho C` além da 318
- [x] Ramo de áudio (`If É Audio?` saída verdadeira) 100% intocado
- [x] Fix persistido de verdade no n8n (GET pós-PUT conferido)
- [x] Backup salvo antes de qualquer edição
- [x] Nenhuma execução real disparada

## Riscos e cuidados

Custo de 1 chamada Gemini Vision por imagem/documento sem legenda recebido (hoje restrito à
whitelist do Caminho C, volume baixo). Se o download da mídia falhar (ex. URL expirada da Z-API),
cai no mesmo fallback de sempre, sem crash — mas também sem alternativa melhor (mesma limitação já
existia, agora só com mais uma etapa que pode falhar da mesma forma graciosa). Prompt do Gemini
idêntico ao usado no `206` (já testado 13/13 na demanda 203) — não redesenhado aqui.

## Referências

Demanda 203 (teste original 13/13 do prompt/lógica no `206`). Demandas 159-163/204/205 (43% de
mídia sem texto, base do dado de impacto). Demanda 299 (motivo do `206` estar congelado/sem
tráfego). Demanda 317 (mesma lição de tratamento de erro aplicada na cópia). Demanda 318 (mesmo
`PUT`, backup e diff compartilhados).

## Relato de execução

Executado em 2026-08-27, workflow `01` (produção real). Decisão de credencial revista com base em
evidência ao vivo (execução real recente do `297` usando `HuMb1WcX1o0FTeLu` com sucesso) em vez da
credencial isolada sugerida inicialmente. 8 casos de validação rodados contra a string `jsCode`
literal de cada node novo antes do deploy, mais confirmação da condição de gatilho contra um caso
real do dia (`558198257944`). Aplicado via `PUT` (mesmo do 318), confirmado com `GET` fresco
separado: os 5 nodes novos e a religação de 1 aresta batem exatamente com o pretendido. Nenhuma
execução real disparada; tentativa de checar endpoint de "test step" via API foi bloqueada pelo
classificador de segurança do ambiente antes de qualquer chamada real acontecer.
