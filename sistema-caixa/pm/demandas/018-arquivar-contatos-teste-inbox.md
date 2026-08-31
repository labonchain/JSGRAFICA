# 018 — Permitir arquivar/silenciar contato no Inbox

Status: desbloqueada — coluna `arquivado` criada pela demanda 023, pode retomar
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Demanda 002 propôs isso: contatos de teste/contaminados sobem ao topo do Inbox quando alguém
interage com eles (foi o que causou a confusão original — "Inbox não bate com a realidade").
Mesmo com a limpeza da demanda 008, o problema estrutural continua — qualquer teste futuro vai
empurrar contato de teste pro topo de novo.

## Objetivo
Dar ao operador uma forma de arquivar/silenciar um contato pra ele parar de aparecer na lista
principal do Inbox.

## Escopo
- Incluído: campo novo em `jsgrafica_contatos` (ex.: `arquivado boolean default false`);
  filtro na query de `conversas` pra excluir arquivados por padrão; botão na UI (thread ou
  lista) pra arquivar/desarquivar; toggle "mostrar arquivados" pra quem quiser ver.
- **Incluído também (decisão do Edvam, 2026-07-02):** depois da feature pronta, marcar como
  arquivados os contatos já confirmados como teste/não-cliente nas investigações anteriores:
  `5521965185667` "Edvan Filho" (número pessoal do Edvam), "Mada AI Agent" (bot de teste),
  "J S Gráfica" (autocontato, achado da demanda 008/016), `5511981889981` "Carol Marinoni"
  (teste do mini-PDV, achado da demanda 002). Não arquivar nenhum outro contato sem confirmação
  — a lista fica maior por causa de novos testes (ex.: mensagens "[teste 005 v2 - ignorar]" que
  apareceram no Inbox durante a demanda 005) — se aparecer contato de teste novo e óbvio
  (mensagem com "[teste" no texto, etc.), pode arquivar também, mas reportar quais.
- Fora de escopo: decidir sobre qualquer contato que não esteja claramente confirmado como
  teste — isso fica pro Edvam revisar depois, olhando a lista.

## Critérios de aceite
- [ ] Contato arquivado some da lista padrão do Inbox
- [ ] Dá pra desarquivar
- [ ] Testado com um contato de teste

## Referências
`pm/demandas/002-investigar-inbox-nao-reflete-log.md`.

## Relato de execução

**Sessão anterior:** bloqueada aguardando a coluna `arquivado` (schema, fora do meu domínio).
A demanda 023 (02-DADOS) já criou a coluna (`arquivado boolean not null default false`),
então retomei a implementação de ponta a ponta nesta sessão.

### O que foi feito
- `app/api/inbox/conversas/route.ts` (GET): novo parâmetro `arquivados` (`true`/ausente) —
  por padrão filtra `.eq('arquivado', false)`, escondendo contatos arquivados da lista normal;
  com `?arquivados=true` mostra só os arquivados. Campo `arquivado` incluído no `select` e na
  resposta.
- `app/api/inbox/arquivar/route.ts` (novo): `PATCH { phone, arquivado }` → atualiza a coluna
  via `supabaseAdmin`. Usa `.eq('phone', phone)`, então também cobre o caso de telefone com
  mais de uma linha em `jsgrafica_contatos` (achado da demanda 008/029) — arquiva as duas de
  uma vez.
- `components/TelaInbox.tsx`:
  - Estado `mostrarArquivados` + chip "🗄 Arquivados" na barra de filtros (ao lado de
    Todos/Aberto/Em atend./Resolvido) — alterna entre lista normal e lista de arquivados.
  - Botão "🗄 Arquivar" / "Desarquivar" no header da conversa aberta (ao lado de
    Assumir/Resolver/Reabrir).
  - `arquivarContato(phone, arquivado)` — chama a rota nova e remove a conversa da lista local
    imediatamente (não espera o próximo poll de 5s).

### Contatos arquivados (decisão do Edvam, executado nesta demanda)
Confirmei cada um no banco antes de arquivar e depois de arquivar (via SQL direto, já que
testar isso pela UI clicando em cada um seria mais lento que confirmar por query):
- `5521965185667` "Edvan Filho" — **tinha 2 linhas** em `jsgrafica_contatos` pro mesmo
  telefone (achado da demanda 008/029, "contact_lid instável") — as duas foram arquivadas
  (a atualização por `phone` cobre ambas).
- `5511992980671` "Mada AI Agent"
- `558186108547` "J S Gráfica" (autocontato)
- `5511981889981` "Carol Marinoni"

**Busca por contato de teste novo e óbvio** (mensagens contendo "[teste", conforme pedido):
só encontrei `5521965185667` (Edvan Filho, já arquivado acima) — nenhum contato novo de teste
além dos 4 já confirmados.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- `npm run dev` local com dado real:
  - `GET /api/inbox/conversas` (padrão) — não trouxe nenhum dos 4 contatos arquivados.
  - `GET /api/inbox/conversas?arquivados=true` — antes de arquivar veio vazio; depois de
    arquivar Carol Marinoni via `PATCH /api/inbox/arquivar`, ela apareceu só nessa lista e
    sumiu da lista padrão (confirmado via `curl` + `grep` no nome).
  - Arquivei os outros 3 contatos confirmados e validei direto no banco (`arquivado: true`
    nos 5 registros, incluindo as 2 linhas do Edvan Filho).
- Não cliquei na UI num navegador real (sem ferramenta de browser nesta sessão) — testei a
  API que a UI consome, que é onde está toda a lógica nova.

### Critérios de aceite
- [x] Contato arquivado some da lista padrão do Inbox
- [x] Dá pra desarquivar (`PATCH` com `arquivado:false`, mesmo botão vira "Desarquivar" na UI)
- [x] Testado com um contato de teste (Carol Marinoni, ver acima)

### Deploy
`npx vercel --prod --yes` — deployment `dpl_4JiyWWpvbYAFoeaYma5x5sQt56Sg` (bundlado com
026/029/030, a pedido do Edvam). Confirmado em produção: `admin.jsgrafica.site` e
`pdv.jsgrafica.site` respondendo 200, `PATCH /api/inbox/arquivar` presente e validando entrada.

### Status final
Concluída.
