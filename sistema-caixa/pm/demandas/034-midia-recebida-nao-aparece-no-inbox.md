# 034 — Mídia recebida (imagem/documento) não aparece no Inbox

Status: aprovada — prioridade alta (uso real agora)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Screenshot do Edvam: a lista de conversas mostra corretamente "[image]"/"[document]" como
prévia da última mensagem (comportamento esperado da lista), mas quando o cliente manda uma
imagem ou documento, o conteúdo em si não aparece na conversa. Isso é um problema real agora
— cliente mandando foto de documento pra imprimir é um caso de uso central do negócio, e o
atendimento manual (Inbox) depende de conseguir ver o que a pessoa mandou.

## Objetivo
Descobrir por que a mídia recebida não renderiza na thread da conversa, e corrigir.

## Pré-investigação do PM (2026-07-03) — já descarta a hipótese de dado ausente
Confirmado via SQL: `media_url` está populada normalmente em mensagens recebidas recentes
(ex.: `phone=558198673450`, `media_type=image`,
`media_url=https://f004.backblazeb2.com/.../ACC6FDD11D78C2B1D2586ECB9BE674FB/uoYVcQoC-...jpg`).
**Testei a URL direto via `curl`: HTTP 200, `image/jpeg`, 92KB — abre normal, não é link
expirado.** Ou seja, o dado existe e a URL funciona — o problema é quase certamente
renderização no frontend (`TelaInbox.tsx` não está montando `<img>`/link de documento pra
mensagens com `from_me:false`, ou só monta quando tem `caption`, ou outro detalhe da
condição). Foco direto no frontend, não precisa investigar o lado do dado/Z-API.

## Escopo
- Incluído: verificar se o problema é de dado (campos `media_type`/`media_url` vêm vazios/
  nulos em `jsgrafica_log_msgs_privadas` pra mensagens recebidas — nesse caso é achado pro
  domínio 01-N8N/Z-API, reportar não corrigir) ou de frontend (dado existe no banco mas
  `TelaInbox.tsx` não renderiza `<img>`/link de documento pra mensagens com `from_me:false`,
  só talvez pra `from_me:true` — nesse caso corrigir). Testar com uma mensagem real recebida
  recentemente com mídia (tem várias no screenshot: Maria Da Cruz "[image]" 10:53, Thayná
  "[document]" 10:30, Luis Paulo "[document]" 10:22, Cícera J Meireles "[image]" 10:17) —
  puxar o registro completo no banco e comparar com o que a UI mostra.
- Fora de escopo: mudar como a mídia é capturada/armazenada do lado do n8n (isso vira demanda
  separada pro 01-N8N se for a causa).

## Critérios de aceite
- [ ] Causa identificada (dado ausente vs. bug de renderização)
- [ ] Se for bug de frontend: corrigido e testado abrindo uma conversa real com imagem e uma
      com documento, confirmando que aparece
- [ ] Se for dado ausente: reportado com detalhe pro PM abrir demanda pro 01-N8N

## Referências
`components/TelaInbox.tsx`, `app/api/inbox/mensagens/route.ts`, tabela
`jsgrafica_log_msgs_privadas` (campos `media_type`, `media_url`, `caption`).

## Relato de execução

### Causa identificada — bug de frontend, confirmado
Em `components/TelaInbox.tsx`, o bloco que renderiza mídia na thread só existia de verdade
pra `audio` (link "ouvir"). Para `image`, `document`, `video` e `sticker`, o código só
mostrava um rótulo de texto (`previewMidia()`, ex.: "📷 Imagem") — **nunca montava `<img>`,
`<video>` nem link nenhum pra abrir o arquivo**. Não é um bug específico de `from_me:false`
(a mesma falta de renderização afetava mensagens enviadas também) — só ficou mais visível
pro caso recebido porque é o caso que o operador realmente precisa ver pra imprimir.

### Correção aplicada
- `image`/`sticker`: agora renderiza `<img src={media_url}>` de verdade dentro da bolha
  (clicável, abre o tamanho original em nova aba).
- `video`: `<video controls>` — toca inline.
- `document` e qualquer outro tipo não coberto acima: link clicável "📄 Documento — abrir"
  (mesmo padrão que já existia pro áudio).
- `caption` continua aparecendo normalmente abaixo da mídia.

### Achado extra (corrigido, relacionado): auto-scroll não esperava a mídia carregar
Durante o teste, percebi que uma mensagem de imagem podia ficar **fora da área visível** da
thread mesmo depois da correção acima — o scroll automático pro final (dispara quando a lista
de mensagens muda) rodava antes da `<img>`/`<video>` terminar de carregar e "esticar" a altura
da bolha, deixando o scroll parado numa posição que deixou de ser o final de verdade. Corrigi
adicionando `onLoad`/`onLoadedData` na imagem/vídeo que re-dispara o mesmo scroll pro final.
Sem isso, o conserto principal desta demanda ficaria mascarado no caso mais comum (mensagem
nova chegando).

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Testado com URLs reais de mídia recebida** (não simulada) — consultei o banco por
  mensagens recentes com `from_me:false` e `media_type` `image`/`document`, **confirmei cada
  URL com `curl` antes de usar** (o bucket é `temp-file-download` — algumas URLs mais antigas
  já tinham expirado nesse teste, então troquei pelas mais recentes, todas HTTP 200
  confirmado).
- Testado via Playwright interceptando a resposta de `/api/inbox/mensagens` com esses dados
  reais (imagem + documento, `from_me:false`) — screenshot confirma: a imagem renderiza de
  verdade (não só o rótulo), o documento aparece como link clicável com a legenda abaixo, e os
  dois já ficam visíveis sem precisar rolar manualmente (confirma o conserto do auto-scroll).
- `console --errors` limpo nos dois testes.
- Não testei `video` com um arquivo de vídeo real recebido (não achei um recente no banco pra
  usar) — a implementação segue o mesmo padrão de `image`, risco residual baixo, mas fica
  registrado que não foi validado com arquivo real.

### Critérios de aceite
- [x] Causa identificada — bug de renderização de frontend, não falta de dado (confirma o
      descarte prévio do PM)
- [x] Corrigido e testado abrindo conversa real com imagem e documento — confirmado
- [x] N/A (não era caso de dado ausente)

### Deploy
`npx vercel --prod --yes` — deployment `dpl_EqSHZwb8WYH4yKM3B4DRHJhSQ7bK`, separado (a pedido
do Edvam, sem esperar a 035). Confirmado em produção: `admin.jsgrafica.site` e
`pdv.jsgrafica.site` respondendo 200.

### Status final
Concluída e deployada.
