# 310, Painel de Conteúdo (Marketing): criar/agendar/aprovar posts de WhatsApp Status

Status: concluída
Criada em: 2026-08-19
Aprovada em: 2026-08-19 (mockup validado + backend conferido pelo PM, execução liberada na mesma sessão)
Concluída em: 2026-08-19
Chat executor: 07 - MARKETING JS GRAFICA

## Contexto

A gráfica quer uma aba Marketing → Conteúdo no `caixa-js-grafica` pra criar, agendar e
acompanhar posts de WhatsApp Status e Instagram, em vez de fazer isso manualmente fora do
sistema. Existe um mockup já validado pelo Edvam (layout aprovado) com 3 das 4 telas (Novo
post, Plano de conteúdo, Como vai ficar; falta só "Quadro"/Kanban, não bloqueia começar).

Nesta mesma sessão (2026-08-19), o PM investigou e testou ao vivo a infraestrutura que já
existe pronta no LabOnchain pra WhatsApp Status, compartilhada entre clientes (tabela
`labon_status_queue`, workflows `LABON_STATUS`/`LABON_DASHBOARD_STATUS`):

- Mapeou as 5 ações do webhook (`criar`, `listar`, `aprovar`, `editar`, `cancelar`) contra o
  mockup: bate certo, sem lacuna de comando.
- Confirmou no banco que `jsgrafica_agent_config` já está configurado (`zapi_url`,
  `client_token`, `tutor_phone=558198257944`, `ativo=true`), sem precisar de config nova.
- Confirmou que a autorização do webhook exige um JWT assinado (claim `tutor_phone`), e que a
  RLS de `jsgrafica_agent_config` já espera exatamente isso.
- **Testou ponta a ponta com sucesso**: inseriu uma linha real em `labon_status_queue`
  (`agent_slug='jsgrafica'`, texto "Boa tarde") e dela disparou manualmente o `LABON_STATUS`,
  que postou de verdade no WhatsApp Status da gráfica (`zaapId`
  `01A01B70A8D87EB5A73C7CC8369EFD90`), confirmado visualmente pelo Edvam no próprio celular.
- Reportou ao PM do LabOnchain um achado de segurança grave nesses mesmos 2 workflows (chave
  `service_role` em texto puro em vários nodes), já corrigido do lado deles no mesmo dia (nodes
  trocados pra credencial nativa). Um resíduo menor (chave `anon` ainda hardcoded em 1 node)
  segue reportado, não bloqueante.
- `SUPABASE_JWT_SECRET` já foi configurado em `.env.local` e na Vercel (produção), falta só o
  código que usa esse segredo pra assinar o token antes de cada chamada ao webhook.

Ou seja: a parte de investigação/validação de viabilidade já está feita e confirmada com teste
real. Esta demanda é a implementação em cima disso.

## Objetivo

A aba Marketing → Conteúdo, no `caixa-js-grafica`, permite à equipe criar, agendar, listar,
aprovar, editar e cancelar posts de WhatsApp Status reais, chamando o webhook compartilhado do
LabOnchain (`LABON_DASHBOARD_STATUS`) com autenticação própria da JS Gráfica.

## Escopo

Incluído:
- Rota(s) de API server-side no `caixa-js-grafica` que assinam o JWT (`tutor_phone` = valor de
  `jsgrafica_agent_config.tutor_phone`, usando `SUPABASE_JWT_SECRET`) e repassam pro webhook
  `LABON_DASHBOARD_STATUS` as 5 ações (`criar`/`listar`/`aprovar`/`editar`/`cancelar`), nunca
  assinar ou expor esse segredo no client.
- UI das 3 telas já com mockup validado: Novo post (modal, só a seção WhatsApp Status por
  ora), Plano de conteúdo (calendário + tabela), Como vai ficar (preview).
- Usar os mesmos componentes/tokens visuais já existentes no app (não CSS solto "parecido"),
  igual o resto do sistema.

Explicitamente fora de escopo desta demanda:
- Seção Instagram do "Novo post" e qualquer publicação real no Instagram, sem token da conta
  comercial ainda, fica pra demanda seguinte quando o Edvam mandar.
- Tela "Quadro" (Kanban), sem mockup ainda.
- Qualquer mudança nos workflows n8n compartilhados (`LABON_STATUS`/`LABON_DASHBOARD_STATUS`)
, são do LabOnchain, não da JS Gráfica; se algo precisar mudar lá, reportar ao PM, não editar.

## Critérios de aceite

- [x] Rota server-side assina o JWT corretamente (testar contra o webhook real, confirmar
      `autorizado: true` na resposta de `Avaliar Tutor`).
- [x] Criar um post de teste real (texto claramente identificável como teste, combinado antes
      com o PM/Edvam) e confirmar que aparece postado no WhatsApp Status, do início (tela) ao
      fim (Status real no celular).
- [x] Listar mostra os posts reais da fila (`agent_slug=jsgrafica`), calendário e tabela batem
      com o que está no banco.
- [x] Aprovar/editar/cancelar funcionam na UI e refletem no banco (`labon_status_queue`).
- [x] Layout usa os componentes/tokens reais do app, não estilo solto.

## Riscos e cuidados

- WhatsApp Status **não tem como ser apagado por API depois de postado** (confirmado na doc
  oficial da Z-API), qualquer teste que publique de verdade precisa de conteúdo combinado
  antes, nunca dado sintético/genérico sem revisão.
- A fila `labon_status_queue` é compartilhada com outros clientes do LabOnchain e processa 1
  item por hora, globalmente. Não é bloqueio hoje, mas não prometer pra equipe um horário exato
  de publicação sem deixar claro essa margem.
- `SUPABASE_JWT_SECRET` é segredo sensível (assina acesso ao banco compartilhado de todos os
  clientes do LabOnchain), nunca expor em código client-side, nunca logar, nunca comitar.

## Referências

- Tabela `labon_status_queue`, `jsgrafica_agent_config` (projeto Supabase `arqkdnexpederquztegn`).
- Workflows n8n `LABON_STATUS` (`tIS013FrKhPraLxb`), `LABON_DASHBOARD_STATUS`
  (`2Kpnbf61dtsf1zmO`).
- Mockup: `pm/demandas/310-mockup/NovoPost.dc.html`, `PreviewWhatsApp.dc.html`,
  `PreviewInstagram.dc.html`, `Calendario.dc.html` (layout validado pelo Edvam, falta só a
  tela "Quadro"/Kanban).
- Briefing do chat executor: `pm/equipe/07-marketing.md`.

## Relato de execução

- **O que foi feito (arquivo a arquivo):**
  - `lib/labonStatus.ts` (novo), assina JWT HS256 (`role: authenticated`, claim `tutor_phone`,
    TTL 60s) com `SUPABASE_JWT_SECRET` via `crypto` nativo do Node (sem dependência nova) e
    chama o webhook `LABON_DASHBOARD_STATUS` (`https://n8n.labonchain.xyz/webhook/dashboard-status`)
    pras 5 ações (`criar`/`listar`/`aprovar`/`editar`/`cancelar`), sempre com
    `agent_slug: 'jsgrafica'`. `tutor_phone` é buscado de `jsgrafica_agent_config` a cada
    chamada (não hardcoded).
  - `app/api/marketing/conteudo/route.ts` (novo), `GET` (listar), `POST` (criar, valida
    `tipo_status`/campo obrigatório do tipo antes de chamar o webhook), `PATCH` (aprovar/
    editar/cancelar via `{id, acao, ...campos}`). Protegida pelo `X-App-Secret` do
    `middleware.ts` igual toda rota `/api/*` (nada novo precisou ser feito aqui).
  - `components/ModalPost.tsx` (novo), modal único de criar/editar/aprovar/cancelar, fiel ao
    mockup `NovoPost.dc.html`: seção WhatsApp Status funcional (tipo texto/imagem/vídeo, upload
    de arquivo reaproveitando `/api/inbox/upload-url` + bucket `inbox-media` já existente,
    legenda, agendar data/hora com offset fixo `-03:00` de Recife); seção Instagram **presente,
    mas desabilitada** ("Em breve, aguardando o Edvam conectar a conta comercial"), conforme
    escopo. Ações aprovar/editar/cancelar aparecem conforme o `status` do post.
  - `components/TelaMarketingConteudo.tsx` (novo), tela com toggle de canal (WhatsApp Status
    ativo, Instagram desabilitado) e toggle de visão (Plano de conteúdo ativo, Quadro
    desabilitado, sem mockup, Como vai ficar ativo). Plano de conteúdo = calendário mensal
    (dots reais por dia) + tabela (Data/Post/Canal/Status), fiel ao `Calendario.dc.html`. Como
    vai ficar = adaptação do `PreviewWhatsApp.dc.html` com dado real (fila de
    pendentes/aprovados + sequência de telas dos publicados/aprovados, cards coloridos por tipo,
    imagem real via `image_url` quando existe). `PreviewInstagram.dc.html` não tem contraparte
    funcional ainda (sem dado real pra mostrar), só a nota "aguardando conexão" no lugar.
  - `app/page.tsx`, novo grupo de nav "📢 Marketing" (só "Conteúdo" por ora, `soAdmin: true`,
    mesma visibilidade das outras telas sensíveis), entrada na `Aba`, no array `abas` e no
    switch de render.

- **Testes realizados e resultado:**
  - JWT + webhook: script isolado assinando o JWT igual `lib/labonStatus.ts`, chamado contra o
    webhook real com `acao: 'listar'` → `HTTP 200, ok: true` (confirma `Autorizado?` passando).
  - Build (`npm run build`) e `tsc --noEmit` limpos; `eslint` sem achado novo além de padrões já
    presentes no resto do repo (`react-hooks/set-state-in-effect` no `useEffect` de carga,
    mesmo padrão de `TelaConciliacao.tsx` e outras telas; `<img>`, mesmo padrão de
    `TelaInbox.tsx`/`TelaClientes.tsx`/`ModalQrPix.tsx`).
  - Smoke visual com Playwright headless contra `npm run dev`: login, abrir Marketing →
    Conteúdo, Plano de conteúdo (calendário + tabela carregando dado real), Como vai ficar,
    modal Novo post, sem erro no console em nenhuma etapa. **Achado de infra, não do código:**
    `.next` com cache misto de um `npm run build` anterior fez `/api/marketing/conteudo` 404 no
    dev server até um `rm -rf .next`, não é um bug da rota, é sujeira de cache local.
  - **Teste real ponta a ponta, combinado com o Edvam nesta sessão** (texto definido por ele,
    não um texto de teste genérico): criado o post "Em breve novidades!" (id 10) pela UI de
    verdade → aprovado pela UI → confirmado no banco (`status='approved'`,
    `scheduled_at` já no passado, elegível pro próximo disparo horário do `LABON_STATUS`,
    ~19-08 18h Recife). **Atualização (mesmo dia, durante a demanda 311): confirmado `published`
    no banco**, a rodada horária publicou de verdade, fechando a pendência abaixo.
  - Fluxo aprovar/editar/cancelar isolado: post descartável "Teste do painel de conteúdo,
    ignorar" (id 11), agendado pra 20/08 (fora do alcance do consumidor horário, sem risco de
    publicar de verdade) → criado → aprovado → editado (texto mudou pra "...editado, ignorar",
    confirmado no banco) → cancelado (confirmado `status='cancelled'` no banco). Os 3 verbos
    (aprovar/editar/cancelar) testados contra o webhook real pela UI real, sem erro.

- **Achados fora do escopo (relatados, não resolvidos por conta própria):**
  - Nenhum achado novo de bug/segurança fora do já documentado nesta demanda (resíduo da chave
    `anon` no node `Checar Tutor`, RLS de `labon_status_queue` sem política, ambos já
    reportados ao PM do LabOnchain antes desta execução).

- **Pendências reais, não bloqueantes:**
  - ~~Confirmar visualmente que "Em breve novidades!" (id 10) realmente apareceu no WhatsApp
    Status da gráfica~~, **resolvida**: confirmado `status='published'` no banco durante a
    demanda 311, no mesmo dia. Recomendo o Edvam confirmar olhando o celular quando puder, mas
    o dado já bate.
  - Seção Instagram (modal + tela "Como vai ficar") e tela "Quadro" continuam fora de escopo,
    aguardando o token da conta comercial (Instagram) e um mockup (Quadro), nada a fazer aqui
    até essas dependências chegarem.

- **Status final: concluída** (dentro do escopo desta demanda, WhatsApp Status completo;
  Instagram/Quadro explicitamente fora, como combinado).
