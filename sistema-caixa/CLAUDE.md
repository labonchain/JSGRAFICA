# CLAUDE.md — Caixa JS Gráfica

Sistema principal da JS Gráfica. Roda em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
Para contexto completo do cliente e stack, ver `../CLAUDE.md`.

🎯 **Objetivos macro de longo prazo** (fechamento de caixa assistido por agente de WhatsApp +
automação gradual do atendimento no Inbox): ver `pm/OBJETIVOS-MACRO.md`. Toda demanda nova de
fechamento de caixa ou Inbox/atendimento deve considerar se serve um desses objetivos.

---

## Roteamento por subdomínio

O `proxy.ts` roteia assim (renomeado de `middleware.ts` na demanda 333 — convenção nova do
Next.js 16, mesma lógica, função `middleware` virou `proxy`):
- `pdv.jsgrafica.site` → `/pdv` — PDV para Zu e Gabi, login por seleção de nome
- `admin.jsgrafica.site` → `/` — Admin completo, login com senha (só Edvam)

---

## Usuários e sessão — sessão real desde 2026-08-27 (demanda 329, Caminho A)

Usuários definidos em `lib/usuarios.ts` (só `id`/`nome`/`papel`, sem segredo nenhum — ver por quê
logo abaixo): **Edvam** (admin, senha), **Zu** e **Gabi** (atendente, só PDV, sem senha).

**Login é sessão real por cookie assinado, não mais localStorage.** `POST /api/auth/login-admin`
(senha) e `POST /api/auth/login-pdv` (nome, sem senha — Zu/Gabi) gravam um cookie `jsgrafica_
sessao` (`HttpOnly`/`Secure`/`SameSite=Lax`, 24h) assinado com `SESSION_SECRET`
(`lib/auth-token.ts`, usa Web Crypto — funciona tanto no runtime do `proxy.ts` (Node desde a
demanda 333, era Edge antes) quanto nas rotas em Node). `GET /api/auth/me` é a única fonte de
verdade de "quem está logado" pro front (cookie `HttpOnly` não é legível por JS). `POST /api/
auth/logout` limpa o cookie. `proxy.ts` exige esse cookie válido (ou a credencial de serviço
interno, ver abaixo) em TODA rota `/api/*`, sem exceção além do webhook do Mercado Pago e das
próprias rotas de auth.

**Sessão que cai vira aviso, não tela vazia (demanda 334)**: qualquer 401 numa rota protegida
(fora `/api/auth/*`) faz o front (Admin e PDV, `lib/useDeslogarEm401.ts`) forçar a volta pra tela
de login com "Sua sessão caiu — faça login de novo", em vez de deixar a tela mostrar "vazio"
silenciosamente.

**Login do Admin tem rate limit (demanda 332)**: 5 senhas erradas seguidas por IP bloqueia
`POST /api/auth/login-admin` por 15min (mesmo pra senha certa durante o bloqueio, comportamento
padrão de rate limit), contador em `jsgrafica_login_tentativas` no Supabase. `login-pdv` não tem
(Zu/Gabi não usam senha).

🔴 **A senha do Admin TROCOU na 329** — o valor antigo (`075644js2026`) já estava exposto
publicamente havia semanas (achado da demanda 302, ver histórico abaixo) e foi invalidado de
propósito, não só relocado. Valor novo em `ADMIN_PASSWORD` (Vercel + `.env.local`, nunca em
código/arquivo client) — comunicado ao Edvam fora deste arquivo; ele pode trocar de novo quando
quiser, só atualizando essa env var.

**Correção do buraco descoberto construindo a 329**: antes, clicar em QUALQUER nome na tela do
PDV (inclusive "Edvam") logava direto, sem senha nenhuma — dava pra virar uma sessão "admin" sem
saber a senha, só selecionando o nome dele no PDV. Corrigido: `/api/auth/login-pdv` recusa
explicitamente qualquer usuário `papel === 'admin'`; a tela do PDV (`app/pdv/page.tsx`) agora pede
senha de verdade (mesma rota `/api/auth/login-admin` da tela de Admin) quando o nome clicado é o
do Edvam, em vez de logar na hora.

**Credencial de serviço interno** (`INTERNAL_SERVICE_SECRET`, header `X-Internal-Secret`) — NÃO é
`NEXT_PUBLIC`, nunca vai pro navegador, serve só pra chamada de servidor-pra-servidor sem nenhum
usuário por trás: hoje só o trigger `jsgrafica_retentar_pix_apos_telefone_corrigido` no Supabase
(chama `/api/pedidos/retentar-pix` via `pg_net`, demanda 300). Se rotacionar esse segredo, trocar
nos 2 lugares juntos (env var + valor hardcoded dentro do trigger).

**Histórico** (contexto de por que isso existe): demanda 302 (auditoria, 2026-08-17) confirmou AO
VIVO que nenhuma das 74 combinações rota+método de `/api/*` validava sessão no servidor — um
`curl` sem login em `admin.jsgrafica.site/api/pedidos` devolvia dado real de cliente. 21 rotas
mexiam em dinheiro real, 16 em dado de negócio (inclusive mandar WhatsApp real pra qualquer
telefone sem login), 27 liam dado sensível. A mesma auditoria achou a senha do Edvam em texto
puro no bundle JS público (`lib/usuarios.ts` era importado por `app/page.tsx`, `"use client"`).
Demanda 304 (mesmo dia) aplicou uma ponte temporária (1 segredo público único, `X-App-Secret`/
`NEXT_PUBLIC_APP_SHARED_SECRET`, igual pra todo mundo, documentada desde então como "não é a
correção definitiva"). Demanda 329 é essa correção definitiva — a ponte foi DESATIVADA (segredo
antigo removido da Vercel, não funciona mais) e substituída pelo mecanismo descrito acima.

---

## Estado atual da base de dados

**Em migração de Google Sheets para Supabase.**

- Atualmente: todas as rotas de API usam `lib/sheets.ts` que chama Google Sheets API
- Meta: trocar por cliente Supabase, Google Sheets vira backup
- `lib/dados.ts` (produtos hardcoded) será substituído por leitura de `jsgrafica_produtos` no Supabase

Variáveis de ambiente atuais (Sheets):
```
GOOGLE_SHEETS_ID=1KZty9lghh8eehectdnd2xxIlvBznqV-6
GOOGLE_SERVICE_ACCOUNT_JSON=...
```

Variáveis que entrarão (Supabase):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Estrutura atual

```
app/
├── page.tsx              ← Admin completo (login senha + tabs PDV/Saidas/Fechamento/Dashboard/Movimento)
├── pdv/page.tsx          ← PDV simplificado (login botão + carrinho)
└── api/
    ├── vendas/route.ts
    ├── saidas/route.ts
    ├── fechamento/route.ts
    ├── dashboard/route.ts
    ├── movimento/route.ts
    └── log/route.ts

lib/
├── dados.ts      ← produtos e categorias hardcoded (a descontinuar)
├── sheets.ts     ← integração Google Sheets (a substituir por supabase.ts)
└── usuarios.ts   ← usuários do sistema
```

---

## Backlog deste projeto (ordem)

1. Criar `lib/supabase.ts` com cliente Supabase
2. Criar migrations: `jsgrafica_vendas`, `jsgrafica_saidas`, `jsgrafica_fechamento`
3. Importar histórico do Sheets
4. Migrar todas as rotas de API para Supabase
5. Remover `lib/sheets.ts` e `lib/dados.ts`
6. **Aba Produtos** no admin — tabela editável (nome, preço, categoria, ativo/inativo) lendo de `jsgrafica_produtos`
7. **Inbox** — lista de conversas do WhatsApp, thread, campo de resposta → envia via Z-API
8. **Controle de atendimento** — estado por conversa: aberto / em atendimento (por quem) / resolvido
9. **Toggle PDV/Inbox** no painel esquerdo da mesma tela
10. **Sugestão de IA** — botão na thread que chama LLM com contexto e sugere resposta
11. **Pedidos** — aba com pedidos de `jsgrafica_pedidos` + fila de impressão
12. **Venda de balcão com contato** — ao confirmar venda, busca ou cria contato opcional
13. **Import/export CSV** no admin
14. **Fila de impressão local** — script separado rodando na máquina da gráfica (fase futura)

---

## UI planejada — Inbox + PDV

```
┌────────────────┬──────────────────────┬──────────────────────┐
│ [Inbox] [PDV]  │   CONVERSA / VENDA   │  Contato / Pedido /  │
│ ─────────────  │                      │  Histórico           │
│ lista de       │  thread de msgs      │                      │
│ contatos  ou   │  ou                  │  (tabs)              │
│ categorias de  │  grade de produtos   │                      │
│ produto        │  + carrinho          │                      │
│                │                      │                      │
│                │  [campo resposta]    │                      │
│                │  [IA] [arquivo] [➤] │                      │
└────────────────┴──────────────────────┴──────────────────────┘
```

- Painel esquerdo: toggle entre Inbox (lista de contatos) e PDV (categorias de produto)
- Painel central: muda conforme o modo — thread de conversa ou grade de produtos
- Painel direito: sempre contextual — info do contato com abas (Contato / Pedido / Histórico) ou carrinho no modo PDV

---

## Venda de balcão — fluxo

1. Operadora seleciona produtos no PDV
2. Ao confirmar: opção de buscar contato por telefone
3. Se encontrado → venda vinculada ao contato
4. Se não encontrado → opção de criar contato rápido ou continuar anônimo
5. Anônimo → vai para `jsgrafica_vendas` sem `contato_id`

---

## Fluxo financeiro (modelo corrigido em 2026-07-18, ver demandas 213-230)

- Dinheiro físico de qualquer venda segue só 1 de 2 caminhos: vira depósito no banco (Caixa
  Econômica) no dia seguinte, ou paga uma saída real lançada no sistema no mesmo dia. Nunca
  "precisa" virar saldo digital vinculado a uma venda específica.
- As 4 contas digitais (Mercado Pago, Stone, Caixa Econômica, RecargaPay) são compartilhadas
  entre Admin/Zu/Gabi, não são "de" um operador.
- Recarga (VEM/celular) paga em Dinheiro, Cartão ou Pix normal **nunca gera saída automática**
  vinculada à venda (demanda 213) — reabastecer o RecargaPay é sempre um evento manual e
  periódico (Transferência entre Contas, demanda 201), sem ligação com nenhuma venda específica.
  Exceção: Pix direto na chave do RecargaPay é autossuficiente (demanda 199/211).
- A tela "Pendências entre contas" foi **removida** (demanda 218) — a premissa dela (toda venda
  "precisa" virar uma transferência resolvendo uma pendência) não batia com a operação real.
- **Conciliação automática** (demandas 225-230): o sistema compara o que está registrado contra
  o extrato real do Mercado Pago (API) e o saldo informado das contas sem API
  (RecargaPay/Stone/Caixa Econômica), isolando cada diferença como um item que o Admin classifica
  na aba "🔎 Conciliação" — em vez de a divergência do fechamento ficar sendo um número agregado
  sem explicação. Falta ainda: mecanismo de recalcular um fechamento já fechado quando um item
  antigo é classificado tarde (desenhado, decisão consciente de deixar pra depois, ver
  `pm/conhecimento/desenho-conciliacao-automatica.md` seção 3.4).
- Especialista financeiro dedicado: chat **"05 - FINANCEIRO JS GRAFICA"**
  (`pm/equipe/05-financeiro.md`) — controller/auditor de fluxo de caixa, não é um PM genérico.
- Falha silenciosa de geração de Pix corrigida (demanda 238, 2026-07-29): quando o contato ainda
  está em formato `@lid` (WhatsApp não resolveu o telefone real, janela de poucos minutos), o
  sistema agora loga em `jsgrafica_mercadopago_falhas_cobranca` e avisa na tela, em vez de pular
  o Pix em silêncio.

## Automação de atendimento (Inbox)

Especialista dedicado: chat **"06 - AUTOMAÇÃO ATENDIMENTO INBOX"** (`pm/equipe/06-atendimento.md`,
criado 2026-07-29) — design de conversação e automação, ver `pm/OBJETIVOS-MACRO.md` (Objetivo 2)
pro estado completo. Manual de resposta da IA com regras reais (texto vs. botão, cobrança
antecipada vs. na retirada) em `pm/conhecimento/manual-resposta-ia-100-clientes.md` (demanda 234).

**🤖 Caminho C (agente de IA com ferramentas travadas) conectado no roteamento real desde
2026-08-18 (demanda 299), no lugar do `206`.** O `206 - JSGRAFICA | AGENTE FASE B` (árvore de 19
IFs) foi congelado a partir da demanda 292 (fragilidade estrutural real, 6 bugs em 1 dia só,
279-289) e, desde a 299, parou de RECEBER tráfego da whitelist — continua existindo intacto,
ativo, só sem conexão de entrada, e é o caminho de reversão rápida (trocar 1 conexão de volta) se
o piloto do agente novo mostrar problema real. Quem recebe as mensagens hoje é o workflow
`297 - JSGRAFICA | CAMINHO C AGENTE`: `@n8n/n8n-nodes-langchain.agent` de verdade, raciocinando
sobre a conversa e chamando ferramentas de código puro (preço, Pix, criar pedido, cancelar,
escalar) que sempre recalculam o dado da fonte real, nunca aceitam o que a IA tenta passar como
valor. Testado adversarialmente (demanda 298, 13 tentativas reais de quebra) - achou e corrigiu 1
vazamento crítico real (prompt de sistema saindo pro cliente por pedido de "tradução/resumo"), e
fechou guardrails determinísticos de valor, Dizu, Alto Toque (demanda 305) e telefone divergente.
**Piloto de 4 dias, 2026-08-18 a ~22/08** (demanda 299) - ao final, dado real decide se o `206` é
desligado de vez, mantido em paralelo, ou se volta atrás.

Continua **100% dependente da whitelist** (`jsgrafica_telefones_autorizados`) - só responde quem
estiver ativo nessa lista, hoje só os números internos/teste de sempre, nenhum cliente real ainda.
**Controle de quem entra na lista continua autosserviço no Admin** (demandas 275/276): dentro de
Configurações → Conectar API, ou direto no painel da conversa no Inbox - toggle de 1 clique, sem
SQL, agora controlando o agente novo em vez do `206`. `JSGRAFICA_ATENDIMENTO_AI` (Gemini+RAG mais
antigo, persona "Dizu") continua pausado por decisão de produto, sem tráfego.

**3 correções urgentes achadas e fechadas no mesmo dia da conexão (2026-08-18/19), a mesma
categoria de bug de plataforma n8n (`alwaysOutputData` ausente faz node seguinte não rodar quando
a consulta devolve 0 linhas) apareceu 6 vezes**: (306) roteamento de sessão de pedido travava
qualquer telefone com sessão antiga apontando pro `06-PEDIDOS` (desativado desde a demanda 303) -
441 telefones reais afetados, 112 com atividade recente, sem resposta nenhuma; corrigido pra
checar se o destino está vivo antes de rotear. (307) proteção nova contra loop de resposta
automática com away-message/bot do lado do cliente (achados reais de números com autorresposta
batendo no número da gráfica) - risco que só passou a existir de verdade com o agente novo
respondendo automático. (308) pior caso da categoria: a 1ª mensagem de um cliente GENUINAMENTE
NOVO (zero histórico) não recebia avaliação de roteamento nenhuma, confirmado com teste real e
corrigido.

## Marketing → Conteúdo (demandas 310/311, 2026-08-20, concluídas)

Nova aba no Admin, WhatsApp Status funcionando de ponta a ponta em produção: criar, agendar,
listar, aprovar, editar, cancelar e duplicar post. Não é infraestrutura própria da JS Gráfica,
reaproveita a fila compartilhada do LabOnchain (tabela `labon_status_queue`, workflows n8n
`LABON_STATUS`/`LABON_DASHBOARD_STATUS`), o mesmo sistema que o Kuidu já usa, com isolamento por
`agent_slug`. `lib/labonStatus.ts` assina um JWT curto (`SUPABASE_JWT_SECRET`, nova env var em
`.env.local` e na Vercel, produção) com a claim `tutor_phone` pra autenticar como JS Gráfica
nesse webhook compartilhado, nunca client-side.

Chat especialista dedicado: **"07 - MARKETING JS GRAFICA"** (`pm/equipe/07-marketing.md`).
Instagram (seção do modal + preview "Como vai ficar") e a visão "Quadro" ficam visíveis mas
desabilitados, sem token da conta comercial e sem mockup, respectivamente. Guia completo de como
configurar o Instagram quando o token chegar: `pm/conhecimento/guia-instagram-api-automacao.md`.

**Limitação real da fila compartilhada**: processa 1 post por hora, globalmente, entre todos os
clientes do LabOnchain que a usam, não só a JS Gráfica. Não é problema hoje (fila normalmente
vazia), mas não prometer horário exato de publicação pra equipe.

**🆕 Canal do WhatsApp, 3º destino real (demandas 352-356, 2026-08-29)**: Canal do WhatsApp
("JS Gráfica", `120363412925013708@newsletter`) criado e integrado de verdade em Marketing →
Conteúdo, ao lado de Status e Instagram. Diferente do Status, é conteúdo permanente tipo feed
(não expira em 24h) e **não usa a fila compartilhada do LabOnchain** — fala direto com a Z-API
(`lib/canalWhatsapp.ts`, `lib/zapi.ts` estendido), schema próprio (`jsgrafica_canal_posts`, RLS +
revoke desde a criação). Post real (criar/editar/cancelar/aprovar, aprovar publica na hora) e
tela "⚙️ Configurações" (identidade, seguidores, exclusão) funcionando em produção. Documentação
técnica completa (endpoints reais confirmados por teste, a doc pública da Z-API já divergiu 4
vezes na mesma integração) em `pm/conhecimento/guia-canal-whatsapp-automacao.md`.

**Robô de disparo agendado concluído (demanda 355, 2026-08-31)**: workflow n8n
`355 - JSGRAFICA | CANAL DISPARO AGENDADO`, roda a cada 30min, publica sozinho post que estava
agendado. Ação real "📅 Agendar pra esse horário" (demanda 362, distinta de "Aprovar e publicar
agora") marca `status='approved'` sem chamar a Z-API na hora, testada de ponta a ponta. Contador
de seguidores não disponível via API nesta conta/plano da Z-API (confirmado, não é bug). "Seguir
outros canais" ainda não implementado, decisão de negócio pendente.

**🔴 Contador de visualizações de Status, causa raiz encontrada e corrigida (demanda 367,
2026-08-31)**: a função `jsgrafica_contar_visualizacoes_status` somava eventos `RECEIVED`
(entrega automática, 82,5% da base, ninguém abriu de verdade) junto com `READ` (visualização
real, 18,9%), inflando o painel em 8x a 20x sobre o número real do WhatsApp nativo. Corrigido com
`and v.status = 'READ'` no LEFT JOIN da função (backup salvo em
`pm/backups/jsgrafica_contar_visualizacoes_status_pre-demanda367_2026-08-31.sql`), testado contra
5 posts reais, painel já mostra o número certo. **Ainda em aberto (demanda 363, parte 1)**:
Status postado via API não alcança todo cliente real (achado da Zuzeide, 72 interações reais,
nunca vê Status via API, só o manual), causa exata ainda não confirmada (hipóteses de
sincronização/agenda de contato já testadas e derrubadas com dado real), aguardando o Edvam
seguir com o suporte da Z-API.

**🎨 Geração de imagem via IA pra peças de Marketing, em teste (demandas 361/364/366)**: workflow
n8n gera foto realista de produto via Gemini gratuito (`364`), 3 tipos de fundo testados no mesmo
produto (`366`): produto isolado, painel de cor complementar dentro da própria foto (recomendado,
mockup real com título/CTA sobre o painel, foto e tipografia como peça só), e cena lifestyle
ambientada (opção pontual, não padrão). **Aguardando aprovação do Edvam** da variação recomendada
antes de virar padrão de produção.

## Log de mensagens (`jsgrafica_log_msgs_privadas`/`_grupos`)

`data_timestamp` está em milissegundos desde epoch (confirmado, sem bug real em produção,
demanda 235). `sent_at`/`delivered_at`/`read_at` agora são preservados corretamente entre eventos
de status (corrigido demandas 237/239, workflows `02 - LOG MSG ENVIADAS` e `03 - STATUS MSG`
sobrescreviam com `null`). `read_at` só passou a ser confiável a partir de 2026-07-29 (demanda
240) — antes disso a Z-API mandava esse evento pro webhook de outro cliente (BIOBOTS) por engano
na configuração da conta; mensagens antigas nunca tiveram `read_at` de verdade.

## Importante

- **Sem imagens de produto**
- **Sem auto-resposta ao cliente via WhatsApp** — inbox é só leitura + resposta manual
- Sugestão de IA é um botão, não automático. **Corrigido (demanda 368, 2026-08-31)**: a rota
  (`app/api/inbox/sugestao-resposta/route.ts`) não consultava `jsgrafica_produtos`, só o
  histórico da conversa, e a IA negava por suposição genérica serviços que a gráfica presta de
  verdade. Agora injeta a lista real de serviços ativos no prompt (`buscarCatalogoServicos()` em
  `lib/inboxContexto.ts`), com regra explícita de nunca negar o que está na lista. O contexto de
  conversa (`buscarContextoConversa`) usa as últimas 15 mensagens (`QTD_MENSAGENS_CONTEXTO`, sem
  filtro de tempo), bidirecional (cliente e equipe, marcado `[cliente]`/`[nós]` no prompt).
- Z-API **está conectado** (verificado ao vivo em 2026-07-08 — a nota antiga de "deslogado
  temporariamente" ficou desatualizada). O agente de atendimento automático continua pausado por
  decisão separada (risco de banimento) — reconectar Z-API não reativa isso sozinho.
- ✅ **Mercado Pago em PRODUÇÃO desde 2026-07-10** (`jsgrafica_mercadopago_config` id=3 `ativo`,
  id=1/teste desativado) — chave Pix aleatória confirmada no painel, testado com Pix real de
  R$0,45 (`ORD01KX74CMCDT44H0MQ0V5BCKNF3`, `status: processed`, verificado direto na API do MP).
  Qualquer Pix gerado pelo sistema agora é dinheiro real.
- 🔴 **Access Token do Mercado Pago expira em ~180 dias** (gerado em 2026-07-08) — não renova
  sozinho. A aba "💳 Mercado Pago" (Financeiro, só Admin) avisa
  visualmente quando faltar ≤30 dias, mas isso só aparece pra quem abrir a tela — se ninguém
  acessar por meses, o aviso não é visto. Reativar no [painel do desenvolvedor](https://www.mercadopago.com.br/developers/panel)
  (App "Pagamentos JS Grafica") antes de expirar, e atualizar `access_token`/`token_criado_em`
  em `jsgrafica_mercadopago_config` (RLS travada, só service_role lê/escreve).
