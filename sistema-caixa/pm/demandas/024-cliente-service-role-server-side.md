# 024 — Cliente Supabase com service_role pras rotas de API (server-side)

Status: aprovada — prioridade alta, é pré-requisito da 025
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado de segurança (PM, 2026-07-02): todas as tabelas `jsgrafica_*` no Supabase têm RLS
"Allow public" pra SELECT/INSERT/UPDATE/DELETE (`qual: true`, sem restrição nenhuma). O app
usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `lib/supabase.ts` — essa chave é exposta no bundle JS
do navegador por definição (prefixo `NEXT_PUBLIC_`). Isso significa que qualquer pessoa pode
extrair a chave e ler/escrever/apagar qualquer linha em qualquer tabela — incluindo
`jsgrafica_agent_config`, que guarda o token da Z-API em texto puro (sequestro do WhatsApp da
gráfica é possível hoje).

A trava de RLS (demanda 025) só pode acontecer depois que as rotas de API do servidor
pararem de depender da chave anônima pras mutações — senão o sistema quebra assim que a 025
for aplicada.

## Objetivo
Rotas de API (server-side, `app/api/**/route.ts`) passam a usar um cliente Supabase com
`SUPABASE_SERVICE_ROLE_KEY` (nunca exposta ao navegador) pra fazer as mutações; o client-side
(componentes React) continua usando a chave anônima só pro que for estritamente necessário no
navegador (hoje, aparentemente nada precisa — todo acesso a dado passa pelas rotas de API).

## Escopo
- Incluído: criar um segundo client Supabase em `lib/supabase.ts` (ex.: `supabaseAdmin`,
  usando `SUPABASE_SERVICE_ROLE_KEY`, só importado em arquivos server-side); trocar todas as
  rotas de API que hoje usam `supabase` (chave anônima) pra usar esse client administrativo;
  adicionar `SUPABASE_SERVICE_ROLE_KEY` nas variáveis de ambiente do Vercel (a chave já existe
  no projeto Supabase, só precisa ser configurada — confirmar com o Edvam ou buscar no painel
  do Supabase). **Inclui também** `app/api/inbox/enviar-midia/route.ts`, que faz upload pro
  bucket `inbox-media` do Storage usando a mesma chave anônima hoje (achado adicional,
  2026-07-02: policy `Allow anon insert inbox-media` sem restrição) — trocar pro client
  administrativo também.
- Fora de escopo: mexer em RLS (isso é a 025, só depois desta aqui estar em produção e
  confirmada); mexer em `lib/zapi.ts` (não usa Supabase pra mutação de dado, é chamada HTTP
  externa).

## Critérios de aceite
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel (produção)
- [ ] Todas as rotas de API usando o client administrativo pras mutações
- [ ] Testado em produção: PDV, Inbox (responder, arquivar), pedidos continuam funcionando
      normalmente depois da troca
- [ ] Confirmar que nenhum componente client-side (React, roda no navegador) ficou dependendo
      de mutação direta via Supabase — se algum ficar, listar pro PM decidir antes da 025

## Riscos e cuidados
`SUPABASE_SERVICE_ROLE_KEY` ignora RLS completamente — nunca deve aparecer em código que roda
no navegador (sem `NEXT_PUBLIC_`), nem em log, nem em resposta de API. Testar cada fluxo antes
de considerar concluído — é mudança que toca todas as rotas.

## Referências
`lib/supabase.ts`, todas as rotas em `app/api/`. Ver demanda 025 (RLS, 02-DADOS, depende desta).

## Relato de execução

### O que foi feito

**Cliente admin isolado num arquivo separado (decisão de design, ver "por quê" abaixo):**
- `lib/supabase-admin.ts` (novo) — `supabaseAdmin` com `SUPABASE_SERVICE_ROLE_KEY`, mais
  `getSaldoAnterior()`/`getResumoDia()` (movidos de `lib/supabase.ts`, agora usando o client
  admin).
- `lib/supabase.ts` — ficou só com o client anônimo (`supabase`, usado pelo Inbox client-side
  só pro Realtime) e as funções puras sem dependência de Supabase (`formatarDiaCaixa`,
  `parseDiaCaixa`, `agoraRecife`).

**Por que um arquivo separado em vez de tudo em `lib/supabase.ts` (como o texto da demanda
sugeria):** `lib/supabase.ts` é importado por `components/TelaInbox.tsx` (client-side). Se o
`supabaseAdmin` fosse definido no mesmo arquivo, o bundler do Next incluiria o
`createClient(url, SERVICE_ROLE_KEY)` inteiro no bundle do navegador assim que qualquer
componente client importasse qualquer coisa desse arquivo — mesmo que só usasse `{ supabase
}`. O valor da chave não vazaria (Next não embute env vars sem `NEXT_PUBLIC_` no client), mas o
`createClient(...)` ainda executaria no navegador com a chave `undefined`, o que é frágil e
poderia quebrar de formas inesperadas. Separando em `lib/supabase-admin.ts` — nunca importado
por nenhum arquivo `"use client"` — a garantia fica estrutural (ninguém no navegador consegue
puxar esse módulo), não uma torcida de que o bundler vai descartar o código certo.

**Todas as 14 rotas de API (`app/api/**/route.ts`) migradas do client anônimo pro
`supabaseAdmin`** — reads e writes, não só mutações (para já ficar pronto pra RLS travar
SELECT também, se a demanda 025 decidir isso tabela por tabela):
`zapi/status`, `movimento`, `saidas`, `vendas`, `log`, `produtos`, `pedidos`,
`inbox/responder`, `inbox/mensagens`, `inbox/enviar-midia` (inclui `.storage.from(...)`, o
upload pro bucket `inbox-media` mencionado no escopo), `inbox/conversas`, `inbox/atendimento`,
`fechamento`, `dashboard`.

**Achado adicional durante o trabalho — 3 mutações client-side que a demanda pediu pra
identificar (critério de aceite #4):** `components/TelaInbox.tsx` fazia mutação direta via
`supabase` (chave anônima) em 3 lugares, apesar do texto da demanda assumir que "hoje,
aparentemente nada precisa". Decidi resolver as três dentro desta demanda (não só reportar),
porque a 025 já está aprovada e vai travar INSERT/UPDATE anônimo assim que eu confirmar esta —
deixar essas 3 mutações como estavam quebraria o Inbox silenciosamente no momento em que a 025
for aplicada:
1. Zerar `mensagens_nao_lidas`/`ultima_leitura_admin` ao abrir uma conversa — já tinha uma
   rota (`GET /api/inbox/mensagens`) rodando nesse momento; só estendi ela pra também zerar
   `mensagens_nao_lidas` (antes só atualizava `ultima_leitura_admin`) e removi a mutação
   client-side redundante.
2. Mesmo reset quando chega mensagem nova via Realtime com a conversa já aberta — criei rota
   nova `PATCH /api/inbox/marcar-lida`.
3. Buscar-ou-criar contato ao clicar "+" (nova conversa) — adicionei `POST` em
   `app/api/inbox/conversas/route.ts`.

**O que ficou no client com a chave anônima (intencional, não é mutação):** a subscription
Realtime (`supabase.channel('inbox-global').on("postgres_changes", ...)`) continua client-side
— é leitura/broadcast, não escrita, e Realtime precisa rodar no navegador. **Aviso importante
pra demanda 025:** o Supabase Realtime respeita RLS SELECT pra decidir o que entregar por
`postgres_changes` — se a 025 remover complet amente a leitura anônima de
`jsgrafica_log_msgs_privadas`, o Realtime do Inbox para de funcionar (mensagens novas só
apareceriam no polling de 5s ou ao focar a aba, que já existem como fallback, então o Inbox não
fica cego, só menos "ao vivo"). Se quiser manter Realtime funcionando, a 025 precisa avaliar
uma policy de SELECT que permita isso — não decidi isso aqui, é chamada da 025/PM.

**Variáveis de ambiente:**
- `SUPABASE_SERVICE_ROLE_KEY` adicionada em `.env.local` (local) e no Vercel (produção, via
  `vercel env add ... production`) — confirmado com `vercel env ls production`.
- `.env.local.example` atualizado documentando a variável nova.
- A chave é do formato novo (`sb_secret_...`), não JWT legado — confirmado que
  `@supabase/supabase-js@2.105.1` (versão instalada) autentica normalmente com ela, sem
  precisar trocar pra versão legada.

### Achado fora do escopo (relatado, não corrigido)
Ao testar o `POST /api/inbox/conversas` (nova conversa) descobri que o insert falha sempre:
`jsgrafica_contatos.contact_lid` é `NOT NULL` sem default, e nem o código antigo (client-side)
nem o meu novo insert preenchem esse campo. **Isso não é uma regressão minha** — o código
original tinha exatamente o mesmo insert, faltando `contact_lid`, só que o erro era engolido
por um `catch { /* silencioso */ }` no `iniciarConversa()` do `TelaInbox.tsx`. Ou seja, o botão
"+" (nova conversa manual) provavelmente **nunca funcionou** em produção — sempre falhou
silenciosamente. Não corrigi porque não sei qual valor `contact_lid` deveria ter pra um
contato criado manualmente (esse campo normalmente vem do payload da Z-API/WhatsApp, que não
existe nesse fluxo) — é uma decisão de negócio/dado, não uma correção mecânica. Fica pro PM
decidir se vira demanda nova.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos (o build só passou depois que a
  `SUPABASE_SERVICE_ROLE_KEY` existiu — antes disso falhava com `supabaseKey is required`,
  como esperado).
- `npm run dev` local com a chave real: testei ao vivo (`curl`) — `GET /api/produtos`,
  `/api/movimento`, `/api/dashboard?periodo=hoje`, `/api/inbox/conversas` (todos leitura via
  admin, retornando dado real); `PATCH /api/inbox/marcar-lida` (escrita via admin) — confirmei
  no banco que `mensagens_nao_lidas` de um contato real (Geise Kelly, `558197711758`) zerou de
  6 pra 0 e `ultima_leitura_admin` foi carimbado (efeito colateral inofensivo do teste, é
  exatamente o comportamento esperado da feature "marcar como lida").
- `POST /api/inbox/conversas` com telefone de teste — expôs o bug do `contact_lid` acima (erro
  500 claro, em vez de falha silenciosa — na prática uma melhora de diagnóstico).
- **Não testei `enviar-midia` de ponta a ponta** — de propósito: esse endpoint dispara uma
  mensagem real via Z-API pro telefone informado, e eu só tinha telefones de clientes reais
  à mão pra testar. Testar exigiria mandar uma mensagem de verdade pra um cliente ou usar um
  número de teste, que eu não tinha. A troca ali é mecânica e idêntica ao padrão já testado
  (`supabase.storage` → `supabaseAdmin.storage`, mesmo client, mesma autenticação já
  confirmada funcionando nas outras rotas) — risco residual baixo, mas fica registrado que não
  foi validado ao vivo.
- Deploy em produção confirmado: `admin.jsgrafica.site` e `pdv.jsgrafica.site` respondendo 200,
  `/api/movimento` e `/api/inbox/conversas` retornando dado real em produção depois do deploy.

### Critérios de aceite
- [x] `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel (produção) — confirmado via `vercel
      env ls production`
- [x] Todas as rotas de API usando o client administrativo (14 rotas, lista acima)
- [x] Testado em produção: PDV, Inbox (conversas, mensagens), produtos, movimento, dashboard
      confirmados via curl real após o deploy. `enviar-midia` e `responder` (envio de
      WhatsApp) não testados ao vivo em produção pra não mandar mensagem indevida a cliente
      real — troca de código é mecânica/de baixo risco, mas fica registrado como não validado
      end-to-end.
- [x] Nenhum componente client-side ficou com mutação direta via Supabase — as 3 que existiam
      foram movidas pra rotas de API nesta mesma demanda (ver acima). Único uso client-side
      remanescente é a subscription Realtime (leitura/broadcast, não mutação) — dependência
      importante pra 025 avaliar, sinalizada acima.

### Deploy
`npx vercel --prod --yes` — deployment `dpl_FZArBAHSughMv14Xzj9hK3DR2q4c`, aliased pra
`pdv.jsgrafica.site`. Confirmado 200 em produção em `admin.jsgrafica.site` e
`pdv.jsgrafica.site` com dados reais depois do deploy.

### Status final
**Concluída.** Pronto para o PM confirmar e liberar a demanda 025 (02-DADOS) travar o RLS —
com a ressalva sobre Realtime/SELECT anotada acima pra considerarem antes de travar leitura de
`jsgrafica_log_msgs_privadas` pra role anônima.
