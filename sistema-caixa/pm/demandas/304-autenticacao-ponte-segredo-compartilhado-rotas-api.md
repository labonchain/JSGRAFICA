# 304 - Ponte de segurança rápida: segredo compartilhado nas rotas /api/*

Status: concluída
Criada em: 2026-08-17
Aprovada em: 2026-08-17
Concluída em: 2026-08-17
Chat executor: 03 - APP JS GRAFICA

## Contexto
Demanda 302 (auditoria) confirmou ao vivo que nenhuma das 74 combinações rota+método de `/api/*`
valida sessão no servidor - incluindo rotas que mexem em dinheiro real, mandam WhatsApp real, e
confirmam pagamento sem pagamento ter ocorrido. Também achou a senha do Admin exposta em texto
puro no bundle JS público (achado à parte, ação do Edvam trocar a senha, não é código desta
demanda).

A 302 propôs 3 caminhos. O caminho A (sessão real via cookie assinado + middleware) é a correção
correta, mas é esforço de dias, não horas. Esta demanda é o **caminho B**, a ponte rápida: fecha o
buraco de "qualquer um na internet, sem saber nada do sistema" hoje, enquanto o caminho A é
escopado e construído com calma numa demanda própria depois.

## Objetivo
Nenhuma rota `/api/*` que mexe em dinheiro, mensagem real ou dado sensível aceita chamada sem um
segredo compartilhado válido, fechando o acesso anônimo de fora hoje - sabendo que isto é ponte,
não solução definitiva (não distingue Edvam/Zu/Gabi entre si, um vazamento do segredo expõe tudo
de novo até trocar).

## Escopo
- Incluído: 1 valor secreto novo (env var, nunca no bundle client, gerado forte), guardado como
  segredo de servidor (Vercel env var) e também usado pelo front (variável pública OK aqui, é o
  mesmo nível de exposição que já existe hoje sem ela - ver riscos).
- Incluído: todo `fetch` do front pras rotas `write-money`/`admin-action`/`write-business-data`
  (classificação da 302, priorizar essas 3 categorias primeiro) passa a mandar o segredo num
  header (ex. `X-App-Secret`); cada rota valida esse header antes de agir, recusa com 401 se
  ausente/errado.
- Incluído: rotas `read-sensitive` entram na mesma proteção se o esforço permitir no mesmo ciclo,
  sem travar a entrega das rotas de dinheiro esperando isso.
- Incluído: testar que uma chamada sem o header é recusada (mesmas rotas que a 302 provou
  exploráveis, ex. `GET /api/pedidos`) e que o sistema continua funcionando normal logado.
- Explicitamente fora de escopo: sessão real por usuário (Edvam/Zu/Gabi distintos), cookie
  assinado, middleware de página - isso é a demanda do caminho A, feita depois, com calma.
- Explicitamente fora de escopo: trocar a senha do Admin (ação do Edvam, fora de código).

## Critérios de aceite
- [x] Rotas `write-money`/`admin-action`/`write-business-data` (lista da 302) recusam chamada sem
      o segredo correto
- [x] Testado que chamada sem header é recusada nas rotas antes exploráveis (prova real, mesma
      forma que a 302 provou o problema)
- [x] PDV/Admin/Inbox continuam funcionando normal pra quem está logado, sem regressão
- [x] Documentado com clareza, no relato e no `CLAUDE.md`, que isto é ponte (caminho B), não
      solução definitiva - pra não ninguém achar que o assunto está fechado

## Riscos e cuidados
Esta camada é mais fraca que sessão real por desenho - inspecionar o navegador ainda revela o
segredo (é enviado pelo front). Aceito como ponte temporária, não como solução final. Trocar o
valor do segredo se algum dia houver suspeita de vazamento é ação rápida (troca de env var), mas
não é automática - registrar isso como processo, não só código.

## Referências
Demanda 302 (auditoria original, tabela de 74 rotas, 3 caminhos propostos). Caminho A (sessão
real) fica pra demanda futura, ainda não escopada em detalhe.

## Relato de execução

### O que foi feito

**Decisão de desenho**: em vez de duplicar a checagem do segredo em cada uma das 44 rotas (risco
real de esquecer alguma), a validação foi centralizada em `middleware.ts` — que já intercepta
toda requisição antes de chegar em qualquer `route.ts` (hoje só fazia roteamento de subdomínio).
Isso protege as 74 combinações rota+método da 302 de uma vez, incluindo `write-money`/
`admin-action`/`write-business-data` (prioridade do escopo) E `read-sensitive` no mesmo ciclo —
proteger tudo de uma vez foi MENOS trabalho do que proteger só um subconjunto (que exigiria uma
lista de rotas incluídas em vez de 1 lista pequena de exceções).
- `middleware.ts`: toda rota `/api/*` exige header `X-App-Secret` batendo com
  `NEXT_PUBLIC_APP_SHARED_SECRET`, recusa com 401 sem isso. Única exceção:
  `/api/mercadopago/webhook` (chamado pelos servidores do Mercado Pago, que não têm como carregar
  nosso segredo — já tem validação própria por assinatura HMAC, mecanismo diferente e já existia).
- `.env.local` + Vercel (produção, `vercel env add`): novo `NEXT_PUBLIC_APP_SHARED_SECRET`
  (segredo forte, 32 bytes aleatórios em hex).
- `app/layout.tsx`: script inline (`next/script`, `strategy="beforeInteractive"`) intercepta
  `fetch` e adiciona o header em toda chamada pra `/api/*`, automaticamente, sem precisar editar
  as dezenas de chamadas `fetch` espalhadas por `TelaPedidos.tsx`/`TelaInbox.tsx`/etc.
- **Achado no meio do caminho, mudou o desenho**: a 1ª tentativa foi um módulo comum importado em
  `app/layout.tsx` (`lib/protegerFetch.ts`, interceptando `window.fetch` no import). Testando de
  verdade com Playwright (navegação real pelas abas), apareceram 401 reais em `/api/produtos`,
  `/api/dashboard`, `/api/pedidos` etc. — corrida genuína: o chunk do interceptor às vezes carrega
  DEPOIS do primeiro `fetch` de montagem de alguma tela. Corrigido trocando pra script inline com
  `strategy="beforeInteractive"` (garantia real do Next.js de rodar antes de qualquer hidratação)
  — reduziu de 7-13 falhas por navegação pra 0, confirmado repetindo o mesmo teste.
- `jsgrafica_retentar_pix_apos_telefone_corrigido()` (trigger da demanda 300, chama
  `/api/pedidos/retentar-pix` via `pg_net` sempre que um telefone `@lid` é corrigido): atualizado
  pra mandar o mesmo segredo no header — sem isso, o retry automático de Pix quebraria em silêncio
  (401) assim que a ponte entrasse no ar. Confirmado que não existe nenhum outro gatilho no banco
  chamando rotas deste app (busca por `net.http_post`/`jsgrafica.site` em todas as funções —
  achados extras pertencem a OUTRO cliente no mesmo projeto Supabase compartilhado, não tocados).
- `CLAUDE.md`: seção nova "Segurança das rotas /api/* — ponte ativa..." deixando claro que isto é
  ponte (caminho B), não solução definitiva, com o caminho A (sessão real) descrito como pendente.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Prova de que a exploração da 302 fechou**: `curl` sem header em `admin.jsgrafica.site/api/
  pedidos` e `pdv.jsgrafica.site/api/pedidos` — ambos agora `401 {"error":"Não autorizado"}` (antes
  desta demanda, 200 com dado real de cliente, confirmado na própria 302). Com o header correto,
  200 normal. Com header errado, 401. Webhook do Mercado Pago sem header, 200 (chega no handler,
  como esperado).
- **Sem regressão, logado**: Playwright navegando por Vendas→Pedidos, Atendimento→Inbox,
  Financeiro (várias telas que disparam fetch ao montar) — 0 chamadas `/api/` com 401, tanto local
  quanto em produção real (`admin.jsgrafica.site`, sessão via localStorage).
- **Gatilho automático da 300 continua funcionando**: pedido sintético (telefone `@lid` → corrigido
  via `UPDATE`, mesmo teste da 300) — `mp_order_id` apareceu gravado sozinho em segundos, sem
  chamada manual, confirmando que o trigger atualizado carrega o segredo certo. Pedido de teste e
  rascunho apagados depois.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo — a senha do Admin exposta no bundle (achado da 302) segue como está, documentada de
novo aqui e no CLAUDE.md; trocar a senha continua sendo ação do Edvam, fora de código desta
demanda. O caminho A (sessão real) segue sem demanda própria ainda.

### Status final: concluída
