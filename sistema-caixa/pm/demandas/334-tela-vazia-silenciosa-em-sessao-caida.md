# 334 - Tela mostrava "vazio" em silêncio quando a sessão caía no meio do uso

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 03 - APP JS GRAFICA

Incidente ao vivo relatado pelo 01-N8N logo após o deploy da 329 (sessão real por cookie): aba
Atendimento → Clientes no Admin mostrou "Nenhum cliente encontrado" (vazio) com dado real
existindo, e o Edvam foi deslogado uma segunda vez, rápido, logo depois de já ter entrado com a
senha nova. Pedido explícito: (1) confirmar se o cookie está caindo antes das 24h esperadas, e
(2) a tela deveria avisar "sua sessão caiu" em vez de mostrar vazio silenciosamente.

## Investigação

**Cookie/token não têm bug de duração.** `curl` direto em produção depois do incidente confirmou
`Set-Cookie: jsgrafica_sessao=...; Max-Age=86400; Expires=<+24h exato>`, e o payload assinado
carrega o mesmo `exp` (24h à frente) — sem erro de unidade (segundos vs milissegundos) em
`lib/auth-token.ts`. Confirmado também que o deploy da 329 (21:33:06 UTC) continuava sendo o
único deployment de produção na hora do incidente (22:15-22:17 UTC) — descarta a hipótese de dois
deployments concorrentes com `SESSION_SECRET` diferente causando uma verificação inconsistente.

**Os logs reais da Vercel (janela 22:02-22:17 UTC) mostram, na mesma janela de tempo, `401` em
`/api/inbox/mensagens`/`/api/inbox/conversas` E `200` simultâneo em outras rotas
(`/api/inbox/escalados-count`, `/api/saidas`, `/api/transferencias`, `/api/contas-pagar-receber`)**
— uma sessão única não pode estar válida e inválida ao mesmo tempo. Isso indica duas abas/
contextos de navegador diferentes (uma com sessão válida, outra sem) em vez de uma expiração
genuína e prematura do cookie. Consistente com: uma aba ficou aberta desde antes do re-login (ou
de antes do próprio deploy da 329, quando o mecanismo de sessão mudou de localStorage pra
cookie) e continuou fazendo polling do Inbox (a cada ~10s) sem sessão válida, enquanto outra aba/
sessão seguia funcionando.

**Achado real, independente da causa exata**: nenhuma tela do sistema tratava um `401` de forma
visível. Cada `fetch` que falhava com 401 só deixava o estado local como estava antes (lista
vazia, spinner parado) — o que faz uma sessão caída parecer literalmente "não tem cliente
nenhum", sem nenhum aviso. Esse era o gatilho real do sintoma relatado, independente de qual aba/
contexto especificamente estava com sessão ruim.

## O que foi feito
`lib/useDeslogarEm401.ts` (novo, compartilhado entre Admin e PDV): um hook que intercepta toda
resposta da própria `window.fetch` e, se qualquer chamada a `/api/*` (fora as 4 rotas de
`/api/auth/*`, que legitimamente respondem 401 em senha errada) vier com 401, força o app de
volta pra tela de login (`setOperador(null)`) — que por sua vez desmonta a árvore inteira
(inclusive todas as abas com `AbaKeepAlive`, que hoje nunca remontam sozinhas) e mostra um aviso
explícito: "Sua sessão caiu — faça login de novo." em vez de deixar cada tela mostrar "vazio" por
conta própria. Ligado em `app/page.tsx` (Admin) e `app/pdv/page.tsx` (PDV) — mesmo hook,
`setOperador(null)` + `setSessaoExpirada(true)` nos dois lugares; o aviso limpa sozinho no
próximo login bem-sucedido.

Não resolve (nem seria possível resolver com certeza sem reproduzir ao vivo) a causa exata de
qual aba ficou com sessão ruim — mas fecha o buraco real: a partir de agora, qualquer sessão
inválida em qualquer tela força a volta explícita pro login, nunca mais um "vazio" enganoso.

## Testes realizados e resultado
Teste real em produção (`admin.jsgrafica.site` e `pdv.jsgrafica.site`), via Playwright, simulando
uma sessão caindo NO MEIO DO USO (login real, depois `context.clearCookies()` sem recarregar a
página — reproduz fielmente uma invalidação de sessão em segundo plano, sem precisar esperar 24h
de verdade):
- **Admin**: logado como Edvam → cookies apagados → clicar em Atendimento → Clientes dispara o
  401 → app volta sozinho pra tela de login com o aviso "Sua sessão caiu" visível → logar de novo
  funciona normalmente.
- **PDV**: logado como Zu → cookies apagados → clicar em Clientes dispara o 401 → mesmo
  comportamento confirmado (tela "Quem está no caixa?" + aviso).
- `npx tsc --noEmit` e `npm run build` limpos antes do deploy.

### Status final: concluída
