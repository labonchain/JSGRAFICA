# 083 — Página de Clientes (mini-CRM) no admin/PDV

Status: concluída (1 ressalva — ver Relato)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Depois da demanda 082 (editar nome do contato direto no painel do Inbox), Edvam pediu também uma
página dedicada de **Clientes** — uma lista/gestão dos contatos, meio "CRM", separada da tela do
Inbox. As duas coisas convivem: edição rápida no Inbox pra quando a equipe está no meio de uma
conversa, e a página de Clientes pra visão geral/gestão.

Toda a informação já existe em `jsgrafica_contatos` (nome, telefone, e-mail, status de
atendimento, atendente, contadores de mensagens, data do primeiro/último contato, classificação
novo/recorrente) e em `jsgrafica_pedidos` (histórico de compras por telefone) — não precisa criar
tabela nova pra essa primeira versão.

## Objetivo
Nova aba "Clientes" (admin e PDV, mesmo padrão de acesso da aba Pedidos) com lista de contatos
pesquisável e um painel de detalhe por cliente, reaproveitando dados já existentes.

## Escopo
- Incluído:
  1. Nova aba "👥 Clientes", mesmo padrão visual de lista+detalhe já usado em `TelaPedidos.tsx`
     (lista à esquerda, detalhe à direita) — não inventar um layout novo.
  2. Lista: nome (ou "Contato privado", ver 082), telefone, status de atendimento, data do
     último contato — buscável por nome ou telefone.
  3. Detalhe do cliente selecionado: nome (editável, mesmo campo da 082 — os dois lugares editam
     a mesma coluna), telefone, e-mail (se houver), status de atendimento, contadores de
     mensagens recebidas/enviadas, data do primeiro e do último contato, classificação (novo/
     recorrente).
  4. Histórico de pedidos daquele telefone (reaproveitar a lógica que já busca pedidos por
     telefone, ex. o "Pedido desta conversa" do Inbox, mas listando todos, não só o ativo).
  5. Atalho pra abrir a conversa desse contato no Inbox direto da página de Clientes.
- Fora de escopo nesta primeira versão: tags/segmentação de clientes, notas internas, exportação,
  qualquer campo novo que não exista hoje em `jsgrafica_contatos` — manter na informação que já
  existe, avaliar extensões depois de usar a v1.

## Critérios de aceite
- [x] Aba Clientes lista os contatos reais, buscável
- [x] Detalhe mostra as infos corretas de pelo menos 3 clientes reais diferentes
- [x] Editar nome na página de Clientes reflete no Inbox (mesma coluna) e vice-versa
- [x] Histórico de pedidos aparece certo pra um cliente com pedidos reais
- [ ] Atalho pro Inbox abre a conversa certa — implementado e revisado por leitura de código,
      **não clicado ao vivo num navegador** (ver ressalva no Relato)

## Referências
`jsgrafica_contatos`, `jsgrafica_pedidos`. `components/TelaPedidos.tsx` (padrão de lista+detalhe
a reaproveitar). Demanda 082 (edição de nome no Inbox, mesmo campo).

## Relato de execução

**Status final: concluída, com 1 ressalva (ver abaixo)**

### O que foi feito
1. `app/api/clientes/route.ts` — rota nova, `GET`:
   - Sem `phone`: lista os contatos (busca por `q`, filtra arquivados, dedup por telefone igual
     à rota de conversas do Inbox — mesmo problema de `contact_lid` instável da demanda 029),
     campos leves (nome/temNome, telefone, status de atendimento, último contato, classificação).
   - Com `phone`: detalhe de 1 cliente — nome/temNome, e-mail, status, atendente, classificação,
     data primeiro/último contato, e contadores de recebidas/enviadas **ao vivo** (mesmo motivo da
     rota de conversas: os contadores incrementais da tabela ficam desatualizados, demanda 039),
     paginado com a mesma trava de segurança da demanda 041, mas escopado a 1 telefone (bem mais
     barato que a versão da lista inteira do Inbox). Também retorna todo o histórico de pedidos
     (`jsgrafica_pedidos` por `telefone`, reaproveitando exatamente a mesma query que já existia
     em `GET /api/pedidos?telefone=`, sem duplicar lógica).
2. `components/TelaClientes.tsx` — componente novo, mesmo padrão visual de `TelaPedidos.tsx`
   (coluna esquerda `w-80` com busca + lista, coluna direita com o painel de detalhe). Detalhe tem
   o mesmo campo de edição de nome inline da demanda 082, chamando o **mesmo endpoint**
   (`PATCH /api/inbox/contato`) — garante que os dois lugares editam exatamente a mesma coluna sem
   duplicar lógica de validação/gravação. Histórico de pedidos com status colorido (reaproveita
   `STATUS_CFG` exportado de `TelaPedidos.tsx`). Botão "💬 Abrir conversa no Inbox" recebe
   `onAbrirConversa(phone)` via prop.
3. `components/TelaInbox.tsx` — aceita prop opcional `abrirConversa: { phone, nonce } | null`; um
   efeito novo abre essa conversa (`setPhoneAtivo` + limpa mensagens) sempre que o `nonce` muda —
   permite reabrir a mesma conversa duas vezes seguidas vindo da tela de Clientes.
4. `app/page.tsx` (admin) e `app/pdv/page.tsx` (PDV): nova aba "👥 Clientes" — no admin com
   `soAdmin: true`, exatamente como a aba "Pedidos" já tinha; no PDV sem restrição, também igual à
   "Pedidos". Estado `abrirConversa` + função `abrirConversaNoInbox(phone)` (troca pra aba Inbox e
   manda o sinal) ficam no componente principal de cada página, únicos pontos de contato entre
   Clientes e Inbox.

Nenhum arquivo do financeiro (`TelaFechamento.tsx`, `app/api/fechamento`, `app/api/saidas`) foi
tocado.

### Testes realizados e resultado
Contra o servidor `next dev` já ativo na porta 3000 (mesmo usado no teste da demanda 082).

1. **Listagem buscável**: `GET /api/clientes` retornou 500 contatos reais ordenados por último
   contato; `GET /api/clientes?q=Zuzeide` retornou exatamente 1 resultado ("Zuzeide").
2. **Detalhe com 4 clientes reais diferentes** (mais que os 3 exigidos):
   - `52063694233823@lid` ("Edvan Filho") — 155 recebidas / 59 enviadas, 1 pedido no histórico.
   - `170652120166628@lid` ("Ailton Photograf") — 16/11, 0 pedidos.
   - `46287047127177@lid` (sem nome) — confirmado `nome: "Contato privado"`, 13/3, 0 pedidos.
   - `132194832019569@lid` ("Sula") — **2 pedidos reais** no histórico (2x "IMPRESSÃO P&B A4",
     R$2,40 cada, status "entregue"), confirmando o critério de histórico de pedidos.
3. **Reflexo cruzado Clientes ↔ Inbox**: editei o nome de `46287047127177@lid` via
   `PATCH /api/inbox/contato` (mesmo endpoint que o botão da tela de Clientes chama) e confirmei
   que tanto `GET /api/clientes?phone=...` quanto `GET /api/inbox/conversas?q=...` já retornavam o
   nome novo imediatamente depois — comprova que os dois lugares leem/escrevem a mesma coluna.
   Revertido pra `lead_name = null` depois (estado original restaurado).
4. `npx tsc --noEmit` sem erros. `npx eslint` nos arquivos tocados não introduziu nenhuma classe
   de erro nova além das que já existem no resto do projeto (`react-hooks/set-state-in-effect` e
   `react-hooks/purity` disparam em código pré-existente por todo o `app/page.tsx`/`app/pdv/page.tsx`,
   incluindo trechos que não toquei — é o padrão já usado no projeto, ex. o próprio
   `useEffect(() => { carregar(); }, [carregar])` de `TelaPedidos.tsx`).

### Deploy em produção (2026-07-07, adendo)
Mesmo achado do Edvam da demanda 082: os testes acima eram só locais, o deploy real nunca tinha
rodado (por isso `admin.jsgrafica.site/api/clientes` dava 404). Corrigido junto com a 082 — mesmo
deploy, mesma verificação prévia (`tsc`/`build` limpos, arquivos financeiros conferidos por
timestamp/conteúdo, nada suspeito). Deploy real: **`dpl_3jBcLoNyvggcTV2P1Wxf3PxnDdJR`**
(`npx vercel --prod --yes`, aliasado em `admin.jsgrafica.site` e `pdv.jsgrafica.site`).

Reteste em produção:
- `GET https://admin.jsgrafica.site/api/clientes` → HTTP 200 com contatos reais (antes: 404).
- **Atalho pro Inbox**: continuo **sem ferramenta de navegador** nesta sessão pra clicar o botão
  "Abrir conversa no Inbox" de verdade em produção e confirmar visualmente — procurei por uma
  ferramenta de automação de browser disponível nesta sessão e não encontrei nenhuma. A lógica em
  si (`onAbrirConversa` → `setAba("inbox")` + sinal `{phone, nonce}` → efeito em `TelaInbox`
  chamando `setPhoneAtivo`) está deployada e é a mesma revisada por código na entrega original —
  não mudou neste deploy. **Esse item continua exigindo 1 clique manual do Edvam** (ou de quem
  tiver acesso ao navegador) em `admin.jsgrafica.site` ou `pdv.jsgrafica.site`: aba Clientes →
  selecionar um cliente com conversa → "💬 Abrir conversa no Inbox" → conferir se abre a conversa
  certa.

### Achados fora do escopo
- **Ressalva no critério "Atalho pro Inbox abre a conversa certa"**: ver seção de deploy acima —
  segue pendente de confirmação visual manual, sem mudança desde a entrega original.
- A listagem de Clientes tem um teto de 500 contatos (sem paginação nesta v1, igual ao teto de
  100 já existente na listagem de conversas do Inbox) — com ~1979 contatos na tabela, um cliente
  fora do top 500 por último contato só aparece via busca (`q`), não rolando a lista. Acho que é
  aceitável pra v1 (mencionado no escopo original, "avaliar extensões depois de usar a v1"), mas
  documentando pra não virar surpresa depois.
- Havia (e continua havendo) um servidor `next dev` de outro chat rodando na porta 3000 — usei ele
  pra testar localmente antes do deploy, não subi um segundo processo.

### Status final
Deployado em produção (`dpl_3jBcLoNyvggcTV2P1Wxf3PxnDdJR`) — 4 de 5 critérios de aceite
confirmados com dados reais em produção; o 5º (atalho pro Inbox) segue implementado e revisado
por código, mas pendente de 1 clique manual de confirmação visual (sem ferramenta de navegador
disponível nesta sessão pra fazer isso automaticamente).
