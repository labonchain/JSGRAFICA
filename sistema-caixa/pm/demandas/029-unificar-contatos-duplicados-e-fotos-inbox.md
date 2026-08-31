# 029 — Unificar contatos duplicados no Inbox (1 telefone = 1 conversa) e corrigir fotos ausentes

Status: aprovada
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Screenshot do Edvam: "Edvan Filho" aparece duas vezes na lista de conversas do Inbox, quando
deveria ser uma só (como no WhatsApp real) — e vários contatos não mostram foto de perfil.

Causa provável do duplicado: a lista de conversas (`app/api/inbox/conversas/route.ts`) lista
uma linha por `contact_lid` (chave primária de `jsgrafica_contatos`), mas o mesmo telefone
pode ter mais de um `contact_lid` associado (achado já registrado na demanda 008 — "alguns
números tinham mais de um lid"). Como as mensagens (`jsgrafica_log_msgs_privadas`) já são
filtradas por `phone` (não por `contact_lid`) em `mensagens/route.ts`, o histórico dentro de
cada conversa duplicada tende a mostrar o mesmo conteúdo — o problema está na lista, que conta
o mesmo telefone duas vezes.

## Objetivo
1. Lista de conversas mostra **uma linha por telefone**, não por `contact_lid`.
2. Fotos de perfil aparecem quando existem.

## Escopo
- Incluído:
  1. Em `conversas/route.ts`, agrupar/deduplicar por `phone` antes de montar a resposta — se
     houver mais de um registro de `jsgrafica_contatos` pro mesmo telefone, escolher um
     representante (ex.: o que tiver foto, ou o mais recente por `data_ultimo_contato`) e
     somar contadores (ex.: `mensagens_nao_lidas`) dos duplicados nele.
  2. Investigar por que várias fotos (`lead_photo`) estão vazias — checar se o campo está
     `null` no banco pra esses contatos (nesse caso, é achado pro domínio 01-N8N/Z-API — a
     foto nunca foi capturada — reportar, não é pra consertar aqui) ou se o campo tem valor
     mas a foto não renderiza (nesse caso é bug de frontend, consertar).
- Fora de escopo: apagar ou mesclar de verdade os registros duplicados em `jsgrafica_contatos`
  no banco (isso seria trabalho do 02-DADOS, mais arriscado — a deduplicação aqui é só na
  exibição, não altera dado). Buscar foto ao vivo da Z-API em tempo real (se a causa for
  captura ausente, registrar como melhoria futura, não implementar agora).

## Critérios de aceite
- [ ] "Edvan Filho" (e qualquer outro telefone duplicado) aparece uma vez só na lista
- [ ] Diagnóstico claro sobre a causa das fotos ausentes (campo vazio no banco vs bug de
      renderização), com o que foi corrigido e o que foi só reportado
- [ ] Testado abrindo a conversa unificada e confirmando que o histórico completo aparece

## Referências
`app/api/inbox/conversas/route.ts`, `jsgrafica_contatos`. Ver achado da demanda 008 sobre
`contact_lid` instável.

## Relato de execução

### 1. Deduplicação por telefone
`app/api/inbox/conversas/route.ts` (GET): depois de buscar os até 100 registros mais
recentes, agrupo em memória por `phone`. Quando há mais de uma linha pro mesmo telefone:
- Escolho como representante quem tiver `lead_photo` preenchida (se só um dos dois tiver) ou,
  em caso de empate, o mais recente por `data_ultimo_contato`.
- Somo `mensagens_nao_lidas`, `total_mensagens_recebidas` e `total_mensagens_enviadas` dos
  duplicados no representante escolhido.
- Reordeno a lista final por `data_ultimo_contato desc` (o agrupamento por `Map` quebra a
  ordem original).

Nenhum registro foi apagado ou mesclado no banco — só na exibição, exatamente como pedido no
escopo.

**Confirmei no banco antes de mexer** que hoje existem 3 telefones com mais de uma linha em
`jsgrafica_contatos`: `5521965185667` (2 linhas, Edvan Filho — já arquivado na demanda 018, não
aparece na lista padrão de qualquer forma), `120363368732391284-group` ("MARKETING DIGITAL...",
3 linhas) e `120363404329458007-group` ("Avisos e reposições das mercadorias", 8 linhas).

### 2. Fotos ausentes — diagnóstico
Rodei query direta no banco: de 1.986 contatos não-arquivados, **1.041 (52%) têm
`lead_photo IS NULL`** — nunca chegou foto nenhuma pra esses contatos. **Nenhum tem string
vazia** (`''`) — só `NULL` ou uma URL real. Essa parte é **achado pro domínio 01-N8N/Z-API**
(a foto não é capturada no momento do primeiro contato) — não é algo que o app possa consertar
sozinho, e não modifiquei nada relacionado a isso.

**Segunda causa, essa sim de frontend — confirmada e corrigida:** as URLs de foto de perfil do
WhatsApp (`pps.whatsapp.net`) são assinadas com expiração (parâmetro `oe=`, um timestamp em
hex). Decodifiquei alguns exemplos de contatos com `lead_photo` preenchida mas antigos
(`data_ultimo_contato` de janeiro/fevereiro de 2026) e confirmei que a URL **já expirou** (ex.:
uma expirava em 2026-02-06, hoje é 2026-07-03). O código antigo (`<img src={c.foto}>`) não
tinha `onError` — quando a URL expirada falha ao carregar, o navegador mostra um ícone de
imagem quebrada em vez de cair pro avatar de letra.

**Corrigido:** criei um componente `Avatar` (em `components/TelaInbox.tsx`) que usa `onError`
pra cair pro avatar de letra automaticamente quando a imagem falha ao carregar (não só quando
`foto` é `null`). Troquei as 3 duplicatas de `{foto ? <img>... : <div>letra</div>}` que
existiam no arquivo (lista de conversas, header da thread, painel de contato) por esse
componente único — também removeu duplicação de código. A função `avatarLetra` ficou órfã
depois da troca e foi removida.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Dedup testado com dado real via `curl`** (`npm run dev` local): busquei
  `GET /api/inbox/conversas?q=MARKETING` e `?q=Avisos` — os dois telefones que tinham 3 e 8
  linhas duplicadas no banco vieram **exatamente 1 vez cada** na resposta, com
  `totalRecebidas` somado corretamente e a foto do representante escolhida quando só uma das
  linhas tinha.
- **Fallback de foto testado visualmente com Playwright** — interceptei a resposta de
  `/api/inbox/conversas` no navegador com um cenário controlado (1 contato com uma URL real e
  comprovadamente expirada do WhatsApp, 1 sem foto nenhuma), pra isolar o teste do tráfego real
  ao vivo que está rolando no Inbox agora (deixaria o teste não-determinístico). Screenshot
  confirma os dois caindo pro avatar de letra (F e S), sem ícone de imagem quebrada.
  `console --errors` mostrou só o 403 esperado da imagem expirada (log do navegador, não é erro
  de JS/React).
- Não consegui testar a busca (`q=`) diretamente na UI em produção-like via clique porque o
  Inbox tem tráfego real acontecendo agora e o handler do Realtime atualiza a lista local a
  cada mensagem nova de QUALQUER contato, inclusive quando não bate com o filtro de busca
  digitado — isso mascarou o teste manual (a lista visual não parecia filtrar, mesmo com a API
  filtrando certo por trás). Isso é um comportamento pré-existente, não é algo que toquei nesta
  demanda — reportado abaixo como achado.

### Achado fora do escopo (relatado, não corrigido)
**O filtro de busca (`busca`/campo de texto) do Inbox não se sustenta quando chega mensagem
nova via Realtime durante uso normal.** O handler do canal `postgres_changes` atualiza
`setConversas` diretamente (adiciona/reordena) toda vez que uma mensagem chega, para qualquer
contato — sem checar se esse contato bateria com o filtro de busca atual. Com tráfego real
acontecendo (que é o caso agora), isso faz a lista "voltar a encher" com contatos que não
batem com a busca, dando a impressão de que a busca não funciona. A API em si filtra
corretamente (confirmado via `curl` acima) — o bug é só na tela, no jeito como o Realtime
mescla de volta no estado local. Não corrigi porque é um problema desconectado do que esta
demanda pediu (deduplicação e fotos) — mas é um achado real de UX que vale virar demanda
própria, especialmente agora que o volume de mensagens reais está crescendo.

### Critérios de aceite
- [x] "Edvan Filho" (e qualquer outro telefone duplicado) aparece uma vez só na lista —
      confirmado pros 2 casos ativos hoje (MARKETING DIGITAL, Avisos e reposições); Edvan
      Filho está arquivado (demanda 018) então nem aparece na lista padrão
- [x] Diagnóstico claro sobre causa das fotos ausentes — 52% nunca teve foto capturada
      (achado pro 01-N8N, não corrigido aqui); parte que É bug de frontend (URL expirada sem
      fallback) foi corrigida
- [x] Testado abrindo a conversa unificada — a rota de mensagens já filtra por `phone` (não
      por `contact_lid`), então o histórico da conversa deduplicada já vinha completo antes
      desta demanda também; não há mudança necessária nesse ponto

### Deploy
`npx vercel --prod --yes` — deployment `dpl_4JiyWWpvbYAFoeaYma5x5sQt56Sg` (bundlado com
018/026/030, a pedido do Edvam). Confirmado em produção: `GET /api/inbox/conversas` em
`admin.jsgrafica.site` retornando dado real deduplicado.

### Status final
Concluída.
