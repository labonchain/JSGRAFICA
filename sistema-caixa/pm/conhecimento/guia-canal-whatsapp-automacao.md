# Guia: Canal do WhatsApp (Newsletter) via Z-API, o que é possível hoje

Pesquisa feita pelo PM em 2026-08-29, a pedido direto do Edvam, depois de confirmar que **não
existia nenhuma pesquisa anterior documentada** sobre esse recurso especificamente (achado
anterior: só existe análise de WhatsApp Status, que é um recurso diferente, ver
`pm/equipe/07-marketing.md` e demandas 310/311). Nível de confiança misto: a existência do recurso
e como usá-lo (`send-text`/`send-message-image`/`send-message-video` com o ID do canal como
`phone`) está **confirmada pelo suporte oficial da Z-API** (resposta direta ao Edvam, 2026-08-29),
não é mais hipótese de documentação pública. O que **ainda não foi testado** é o funcionamento na
prática dentro da conta real da JS Gráfica, isso é trabalho do 01-N8N antes de virar produto.

## O que é um Canal do WhatsApp (diferente de Status, Grupo e Lista de Transmissão)

- **Canal (Channel/Newsletter)**: página de transmissão pública, um-para-muitos, estilo "canal do
  Telegram" ou página do Facebook. Tem seguidores (não "contatos"/"membros"), o conteúdo postado
  fica permanente no histórico do canal (diferente do Status, que expira em 24h). Quem segue não
  aparece pro dono como contato individual, é seguidor anônimo em massa.
- **Status**: o que a JS Gráfica já usa hoje (Marketing → Conteúdo, demandas 310/311). Aparece na
  aba Status do WhatsApp de quem já é contato salvo, expira em 24h, não pode ser apagado depois
  de postado.
- **Lista de Transmissão**: envia a mesma mensagem individualmente pra vários contatos ao mesmo
  tempo (cada um recebe como DM normal). Usado manualmente pela Dizu Refeições hoje (achado da
  demanda 258), não é automação, é o Admin mandando na mão pelo app do celular.
- **Grupo**: já conhecido, todos os membros veem a mensagem de todos.

O Canal é o único desses 4 que funciona como "página pública que qualquer um pode seguir sem
precisar ter o número salvo antes", o que o torna interessante pra divulgação de marca (mais
parecido com um Instagram/Telegram do que com WhatsApp tradicional).

## O que a Z-API confirma suportar (documentação oficial, `developer.z-api.io/newsletter/*`)

Endpoint base: `POST /instances/{instanceId}/token/{token}/create-newsletter`, autenticado pelo
mesmo `Client-Token` que a JS Gráfica já usa hoje pra tudo (Status, Inbox, etc). A Z-API tem uma
seção inteira de "newsletter" (nome técnico do WhatsApp pra Canal) com estes endpoints, todos de
**gestão do canal**, não de postar conteúdo nele:

| Endpoint | Função |
|---|---|
| `create-newsletter` | Cria o canal (`name` obrigatório, `description` opcional). Não dá pra criar já com imagem. |
| `update-newsletter-picture` | Define/troca a imagem do canal depois de criado (`pictureUrl` ou base64). |
| `update-newsletter-name` / `update-newsletter-description` | Edita nome/descrição depois de criado. |
| `update-newsletter-config` | Configurações do canal. |
| `follow-newsletter` / `unfollow-newsletter` | Seguir/deixar de seguir um canal (inclusive de terceiros). |
| `mute-newsletter` / `unmute-newsletter` | Silenciar notificação de um canal. |
| `delete-newsletter` | Apagar o canal. |
| `newsletter-metadata` | Metadados do canal (info geral). |
| `newsletter-subscribers` | Lista de seguidores. |
| `newsletter-list` / `search-newsletter` | Listar/buscar canais. |
| `newsletter-remove-admin`, `accept-newsletter-admin-invite`, `revoke-newsletter-admin-invite`, `transfer-newsletter-ownership` | Gestão de administradores do canal (múltiplas pessoas podem postar). |

O ID do canal sempre tem o formato `NÚMERO@newsletter` (equivalente ao `NÚMERO@g.us` de grupo ou
ao telefone puro de contato individual).

## Atualização real (teste de verdade do 01-N8N, demanda 352, 2026-08-29)

Canal real criado (`id: 120363412925013708@newsletter`). 3 achados que corrigem/contradizem o
que está documentado abaixo, todos verificados por chamada de API real (HTTP 200 + zaapId/
messageId reais), não suposição:

1. **Nome do endpoint errado nesta pesquisa**: os endpoints certos são `send-image`/`send-video`,
   não `send-message-image`/`send-message-video` (esses retornam 404). Documentação da Z-API usa
   nomes de página diferentes dos nomes de endpoint reais em alguns casos, conferir sempre o
   endpoint de verdade, não só o nome da página de doc.
2. **A limitação de conteúdo informada pelo suporte da Z-API (sem áudio/documento) não bateu no
   teste real**: tanto áudio quanto documento retornaram sucesso (200 + ID real) ao enviar pro
   canal. Só `send-location` deu erro (400), esse sim consistente com "não suportado".
3. ~~Não existe endpoint de leitura/confirmação nesta conta~~ **Corrigido**: o endpoint de
   metadados documentado como `newsletter-metadata` (path) está errado, o real é
   `GET .../newsletter?phone={id}` (query param, não path). Retorna metadados reais (`state`,
   `name`, `description`, `role`, `picture`), confirmado de forma independente que o canal existe
   (`state: ACTIVE`). **Ainda não confirma se o CONTEÚDO postado (texto/imagem/vídeo/áudio/
   documento) realmente aparece no canal**, só confirma que o canal em si existe. Checagem visual
   manual (ou o dono seguindo pelo link de convite, formato
   `https://www.whatsapp.com/channel/<código>`) continua sendo a forma de confirmar o conteúdo.

**Conclusão prática**: o suporte da Z-API deu uma resposta que não é 100% confiável sozinha (achou
que áudio/documento não funcionam, teste real diz que funcionam via API, mas sem confirmação
visual não dá pra afirmar que chega mesmo no canal). Tratar a lista de limitações abaixo como
"o que o suporte disse", não como fato confirmado, até alguém confirmar visualmente no canal real.

## Atualização real (implementação de verdade, demanda 354, 2026-08-29)

Mais 2 achados reais (teste contra a API, não leitura de doc), que fecham a lista de divergências
entre a documentação pública/`llms.txt` da Z-API e o comportamento real (já são 4 no total nesta
integração, ver 352 acima):

1. **`GET .../newsletter?phone={id}` (metadata) devolve um ARRAY, não objeto**, mesmo passando
   1 `phone` só. Quem chamar precisa desempacotar o primeiro item.
2. **Os endpoints `update-newsletter-*` (nome/descrição/foto) usam `id` no corpo, não `phone`**
   (a correção 3 desta pesquisa, feita na 352, estava errada nesse detalhe específico). Confirmado
   com erro real da Z-API (`400 Newsletter id is empty`) até corrigir. Mesma lógica vale por
   consistência pro `delete-newsletter` (usa `id`, não `phone`, não testado de verdade por ser
   destrutivo).
3. **Não existe endpoint funcional de listar seguidores** em nenhuma das 3 variações testadas
   contra a API real (`/newsletter-subscribers`, `/newsletter/subscribers`,
   `/newsletter/{id}/subscribers`). Achado não resolvido, não bloqueia o resto, só a tela de
   seguidores mostra "—".

**Regra prática que vale a partir de agora pra qualquer endpoint novo de canal**: nunca confiar só
na documentação pública ou no `llms.txt`, sempre testar de verdade antes. Já divergiu 4 vezes
nesta única integração (nome de endpoint de imagem/vídeo, path de metadata, campo do corpo de
update, endpoint de seguidores).

## Como postar conteúdo no canal (versão original desta pesquisa, ver correções acima)

A documentação pública não deixa isso claro (achado original desta pesquisa), mas o Edvam
confirmou diretamente com o suporte da Z-API e a resposta oficial deles resolve a lacuna:

- **Não existe endpoint dedicado.** Reaproveita o mesmo endpoint normal de envio (`/send-text`,
  e por extensão `/send-message-image` e `/send-message-video`), só que no campo `phone` você
  coloca o **ID do canal** (`999999999999999@newsletter`) em vez de telefone ou ID de grupo.
- **Como pegar o ID do canal**: endpoint `GET /newsletter-list` (ou o `id` retornado na criação
  via `create-newsletter`).
- **Limitação real confirmada pelo suporte**: canal **não aceita todo tipo de mensagem** que um
  chat normal aceita. **Funciona**: texto, imagem, vídeo comum. **Não funciona**: áudio,
  documento, vídeo PTV (o formato "nota de vídeo" circular), localização, contato, botões (ação/
  link/lista), pagamento, chamada.

Isso muda a recomendação da seção anterior: **a capacidade técnica existe e está confirmada pela
Z-API**, não é mais hipótese. O que falta é só testar na prática dentro da conta da JS Gráfica
(nunca testado até agora) antes de prometer como funcionalidade pronta.

## O que falta confirmar antes de prometer isso como produto

1. **Testar na prática** (canal de teste, nunca o canal real da gráfica se já existir um):
   `create-newsletter` → pegar o `id` retornado → `send-text` usando esse `id` como `phone` →
   confirmar que a mensagem aparece de verdade no canal. Isso é trabalho técnico, domínio do
   01-N8N (é quem já mexe na integração Z-API de verdade).
2. Confirmar se **um canal por número de WhatsApp é o limite**, ou se dá pra ter mais de um canal
   na mesma instância (não confirmado ainda, nem pela documentação nem pelo suporte).
3. Confirmar custo: a Z-API já é paga pelo plano que a JS Gráfica tem hoje, sem menção de custo
   adicional específico pra canais até agora, mas vale confirmar antes de divulgar pro cliente.
4. Se a JS Gráfica quiser usar isso pra marketing (mesmo domínio da aba Marketing → Conteúdo),
   decidir se o formato certo é texto+imagem simples ou se video comum também entra no plano de
   conteúdo, já que só esses 3 tipos funcionam em canal.

## Recomendação

A capacidade técnica está confirmada (texto/imagem/vídeo comum via `send-text`/`send-message-
image`/`send-message-video` com o ID do canal como `phone`), só falta testar dentro da conta da
JS Gráfica antes de virar funcionalidade real do Marketing → Conteúdo. Próximo passo: demanda pro
**01-N8N** (teste isolado, canal de teste, nunca produção real de cliente ainda) confirmando que
funciona na prática, seguido de uma proposta pro 07-MARKETING de como isso se encaixa na aba já
existente (canal seria um 3º destino de post, ao lado de Status e Instagram).

## Referências
- [Criando canais, Z-API Docs](https://developer.z-api.io/newsletter/create-newsletter)
- [Introdução a Canais, Z-API Docs](https://developer.z-api.io/newsletter/introduction)
- [Como criar e personalizar canais no WhatsApp via API, Z-API blog](https://z-api.io/blog/criar-personalizar-canais-whatsapp/)
- [Índice completo de endpoints newsletter, Z-API](https://developer.z-api.io/llms.txt)
- [Enviar texto simples, Z-API Docs](https://developer.z-api.io/message/send-text)
- [WhatsApp Channel API: Automate All 7 Post Types, Whapi.Cloud (referência de concorrente que suporta postagem)](https://whapi.cloud/blog/whatsapp-channel-api-automation)
