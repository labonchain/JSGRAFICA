# 352 - Criar e testar o Canal do WhatsApp oficial da JS Gráfica via Z-API

Status: parcial (ver Relato de execução - falta confirmação visual real e foto de perfil)
Criada em: 2026-08-29
Aprovada em: 2026-08-29
Concluída em: (parcial em 2026-08-29, falta fechar 2 pendências abaixo)
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Pesquisa do PM (2026-08-29, `pm/conhecimento/guia-canal-whatsapp-automacao.md`) confirmou com o
suporte oficial da Z-API que dá pra postar conteúdo (texto, imagem, vídeo comum) num Canal do
WhatsApp reaproveitando os endpoints normais de envio (`send-text`, `send-message-image`,
`send-message-video`), só usando o ID do canal (`...@newsletter`) como `phone`. A JS Gráfica
ainda não tem nenhum canal criado, então esta demanda cobre criar do zero, não só testar.

**Canal do WhatsApp não é Status**: é uma página pública com seguidores, conteúdo permanente (não
expira em 24h), mais parecido com uma página de marca. Trate com o mesmo cuidado que o
07-Marketing já trata Status (nunca postar teste com conteúdo que pareceria estranho pra um
seguidor real, mesmo sendo canal novo sem seguidor nenhum ainda).

## Objetivo
Canal oficial "JS Gráfica" criado de verdade na conta Z-API da gráfica, com nome, descrição e
foto de perfil definidos, e confirmação real de que dá pra postar texto/imagem/vídeo nele.

## Escopo
Incluído:
1. Criar o canal via `POST /create-newsletter`:
   - `name`: "JS Gráfica"
   - `description`: "Gráfica rápida no Ibura, Recife-PE. Impressões, produtos digitais e
     novidades."
2. Guardar o `id` retornado (formato `...@newsletter`) em lugar seguro/documentado (sugestão:
   `jsgrafica_agent_config`, propor coluna nova ao 02-DADOS se fizer sentido, ou pelo menos
   registrar no relato desta demanda).
3. **Foto de perfil**: aguardar o ativo vindo do 07-MARKETING (pedido em paralelo, ver
   comunicação separada), depois aplicar via `POST /update-newsletter-picture`. Não bloquear os
   passos 1, 2 e 4 esperando a foto, ela pode ser aplicada depois.
4. Testar de verdade, nesta ordem: enviar o texto de teste ("Canal oficial da JS Gráfica no
   WhatsApp! Aqui você acompanha novidades, promoções e lançamentos direto da gráfica.") via
   `send-text` usando o `id` do canal como `phone`; depois testar `send-message-image` e
   `send-message-video` com qualquer mídia de teste apropriada (nada constrangedor, é canal
   público desde já).
5. Confirmar e documentar a limitação real (canal não aceita áudio, documento, vídeo PTV,
   localização, contato, botões, pagamento, chamada), já levantada na pesquisa mas nunca testada
   na prática.

Explicitamente fora de escopo:
- Divulgar/anunciar o canal pra clientes reais (isso é decisão de marketing separada, depois que
  o canal estiver testado e com foto).
- Desenhar estratégia de conteúdo recorrente pro canal (isso vira demanda própria do
  07-MARKETING, depois que a viabilidade técnica estiver confirmada aqui).

## Critérios de aceite
- [ ] Canal criado de verdade na conta Z-API da gráfica, `id` documentado no relato.
- [ ] Texto de teste postado com sucesso, confirmado por log de execução real (não só pelo
      retorno HTTP 200).
- [ ] Imagem e vídeo comum testados com sucesso.
- [ ] Limitações de tipo de conteúdo confirmadas na prática (o que funciona e o que não funciona).
- [ ] Foto de perfil aplicada, se o 07-Marketing já tiver entregue o ativo até a conclusão desta
      demanda (se não, relatar como pendência separada, não bloquear o resto).

## Riscos e cuidados
Canal é público e permanente desde a criação (diferente de Status). Não usar nome fake nem
conteúdo de teste que pareceria estranho se alguém encontrar o canal antes da divulgação oficial.

## Referências
`pm/conhecimento/guia-canal-whatsapp-automacao.md` (pesquisa completa, endpoints, confirmação do
suporte Z-API), `pm/equipe/07-marketing.md`.

## Relato de execução

**Canal criado de verdade**: `POST /instances/{instanceId}/token/{token}/create-newsletter` com
`name: "JS Gráfica"` e a descrição do escopo, respondeu `200` com
`id: "120363412925013708@newsletter"`. Esse endpoint bateu exatamente como documentado (path
literal, sem prefixo extra). Credenciais usadas: as reais da instância da gráfica, lidas de
`jsgrafica_agent_config` (id=1, `instance_id`/`token`/`client_token`), nenhuma hardcoded em
arquivo, só em variável de ambiente temporária da própria sessão.

**Testes de conteúdo, todos usando o `id` do canal como `phone`:**
- `send-text`: `200`, `zaapId`/`messageId` reais retornados. Endpoint bateu como documentado.
- Imagem: **achado de processo** - o endpoint documentado na pesquisa (`send-message-image`)
  devolveu `404 NOT_FOUND` (a Z-API aceitou a chamada com `200` HTTP mas o corpo era erro de rota
  inexistente). O endpoint real é `/send-image` (sem "message" no meio) - achei testando
  variações, confirmado funcionando (`200`, `zaapId`/`messageId` reais). Testado com uma foto real
  da fachada da gráfica (`FOTOS FACHADA/`), autorizado explicitamente pelo Edvam antes de usar
  (é conteúdo real da marca, não fake, mas publicar no canal é ação permanente e pública).
- Vídeo: mesmo achado - o endpoint real é `/send-video`, não `/send-message-video`. Testado com
  um vídeo de amostra pública neutro (w3schools, clipe curto tipo "Big Buck Bunny", conteúdo
  genérico e apropriado, não é da marca). `200`, `zaapId`/`messageId` reais.

**Limitações de tipo de conteúdo - achado importante, contradiz o que o suporte da Z-API informou
ao Edvam:**
- `send-audio`: retornou `200` com `zaapId`/`messageId` reais (não o erro esperado).
- `send-document/pdf`: retornou `200` com `zaapId`/`messageId` reais (idem).
- `send-location`: retornou `400 Bad Request` - esse sim consistente com "não suportado", mas o
  erro é genérico (não diz explicitamente "canal não aceita localização"), e não testei o mesmo
  payload contra um chat normal pra confirmar que o formato em si estava certo.
- Não testei botões/pagamento/chamada/PTV (fora do tempo desta rodada, e a validação de
  áudio/documento já mudou a prioridade - ver abaixo).

**Limitação real de confirmação, achado que afeta o critério de aceite "confirmado por log de
execução real"**: esse fluxo não passa pelo `01`/`03` nem por nenhum workflow n8n - é chamada
direta na API da Z-API a partir desta sessão, então não existe execução de n8n pra conferir.
Tentei achar um jeito independente de confirmar que o conteúdo realmente aparece no canal
(`newsletter-metadata`, `newsletter-list`, variações de path incluindo o formato documentado
`/newsletter/{id}`) - todos retornaram `404 NOT_FOUND` nesta conta/plano, mesmo batendo o path
exato que a documentação oficial descreve. Não existe endpoint de leitura de histórico de
mensagens documentado na Z-API. **Ou seja, a única confirmação disponível hoje é a resposta HTTP
da própria Z-API (`200` + `zaapId`/`messageId` reais) - não uma segunda fonte independente.** Isso
é especialmente importante pro achado de áudio/documento acima: a API aceitou e devolveu ID real,
mas não dá pra garantir 100% que o WhatsApp não descartou silenciosamente depois, sem checagem
visual direta no app.

**Foto de perfil**: o 07-Marketing entregou o base64 (PNG puro, sem prefixo) via arquivo local.
Antes de aplicar via `update-newsletter-picture` (campos `id`/`pictureUrl`, confirmados na
documentação), parei porque eu mesmo não tinha visto o conteúdo da imagem - ia publicar como
avatar permanente e público de um canal real sem ter verificado o que é. Perguntei ao Edvam se
posso aplicar sem essa verificação visual prévia; aguardando resposta dele.

**Link público do canal - achado, corrige o parágrafo anterior desta mesma sessão**: o Edvam
perguntou o link (`whatsapp.com/channel/...`) durante a execução; inicialmente respondi que não
existia endpoint pra isso (testei `newsletter-metadata` e `/newsletter/{id}`, ambos `404`), mas
achei o endpoint certo insistindo: `GET /instances/{instanceId}/token/{token}/newsletter?phone=
{id}` (query param `phone`, não path, nome do endpoint é só `newsletter`, não `newsletter-
metadata`). Retornou os metadados completos:
`{"id":"120363412925013708@newsletter","creationTime":"1788016646","state":"ACTIVE","name":"JS
Gráfica","description":"...","inviteLink":"https://www.whatsapp.com/channel/
0029Vb8lhcLHFxOtPvwUDz3M","verification":"UNVERIFIED","picture":null,"viewMetadata":{"mute":"ON",
"role":"OWNER"}}`. Isso também serve como **confirmação independente real** de que o canal existe
(não só a resposta do `create-newsletter`) - `state: ACTIVE`, nome/descrição batendo,
`role: OWNER`. Link repassado direto ao Edvam pra ele seguir e conferir visualmente pelo WhatsApp
pessoal dele (não está conectado no número da gráfica).

**Achados fora do escopo, não corrigidos, só relatados:**
- Os nomes de endpoint documentados na pesquisa (`send-message-image`/`send-message-video`) estão
  errados - os reais são `send-image`/`send-video`. Vale corrigir
  `pm/conhecimento/guia-canal-whatsapp-automacao.md` se o PM achar que isso vira demanda.
- A limitação de conteúdo informada pelo suporte oficial da Z-API (áudio/documento não funcionam
  em canal) não bateu com o teste real - os dois retornaram sucesso na API. Pode ser que a Z-API
  esteja errada, desatualizada, ou que "sucesso na API" não signifique "aparece no canal de
  verdade" (sem como confirmar isso sem checagem visual).

**Critérios de aceite, status real:**
- [x] Canal criado de verdade, `id` documentado acima.
- [~] Texto/imagem/vídeo testados com sucesso na API (`200` + IDs reais) - mas sem uma segunda
      fonte de confirmação independente (log de execução n8n não existe pra esse fluxo, API de
      leitura de histórico não existe na Z-API). Recomendo checagem visual manual no WhatsApp.
- [~] Limitações testadas na prática - testado, mas o resultado contradiz a expectativa (áudio e
      documento "funcionaram" na API), precisa de checagem visual pra confirmar o que é real.
- [ ] Foto de perfil - arquivo pronto, aplicação parada aguardando confirmação do Edvam (não
      travou o resto, conforme a demanda já previa).

**Status final: parcial.** Falta: (1) confirmação do Edvam sobre aplicar a foto sem checagem
visual prévia minha, (2) aplicar a foto depois de confirmado, (3) fortemente recomendado -
alguém (Edvam ou 07-Marketing) abrir o canal de verdade no WhatsApp e confirmar visualmente o que
realmente apareceu, especialmente pros casos de áudio/documento que contradisseram a informação
do suporte da Z-API antes de tratar isso como fato pra qualquer decisão de produto.
