# 329 - Caminho A: sessão real por usuário (fecha 302 e 304)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 03 - APP JS GRAFICA

Junta 2 achados de segurança antigos, nunca corrigidos de verdade, que o `caixa-js-grafica/
CLAUDE.md` já documenta como o mesmo caminho de correção:

- **Demanda 302** (confirmada ao vivo): a senha do Admin (`lib/usuarios.ts`) vai em texto puro
  pro bundle JS público, porque o arquivo é importado direto por um client component.
- **Demanda 304**: hoje o sistema não valida sessão real nenhuma nas rotas `/api/*`, só um
  segredo único compartilhado (`X-App-Secret`/`NEXT_PUBLIC_APP_SHARED_SECRET`), igual pra
  Edvam/Zu/Gabi, visível no devtools de qualquer sessão logada. Documentado desde a 304 como
  "ponte, não solução definitiva".

## Objetivo
Sessão real por usuário: cookie assinado + `middleware.ts` exigindo login válido em toda
rota/página, senha do Edvam saindo de `lib/usuarios.ts` pra um lugar server-only (env var ou
tabela). Resolve os dois achados de uma vez, como já estava desenhado.

## Escopo
- Incluído: login de Edvam (senha) e de Zu/Gabi (seleção de nome), as 3 sessões reais.
- Explicitamente fora de escopo: mudar qualquer fluxo de negócio (PDV, pedidos, financeiro) além
  do necessário pra sessão funcionar; o gatilho `jsgrafica_retentar_pix_apos_telefone_corrigido`
  no Supabase que hoje usa o mesmo `X-App-Secret` via `pg_net` precisa continuar funcionando (ou
  ser migrado junto, com cuidado, já que ele chama a API de fora de qualquer sessão de usuário).

## Riscos e cuidados
Mudança sensível, mexe no login das 3 pessoas que usam o sistema todo dia. `03-APP` já sinalizou
isso mesmo antes de eu formalizar (recusou executar sem demanda numerada) — pedir teste real de
login dos 3 usuários antes de considerar concluída, não só teste automatizado.

## Referências
`lib/usuarios.ts`, `middleware.ts`, `caixa-js-grafica/CLAUDE.md` (seções "Segurança das rotas" e
"Usuários"), demandas 302 e 304.

## Relato de execução

### O que foi feito

**Sessão real por cookie assinado.** `lib/auth-token.ts` cria/verifica o token de sessão usando
Web Crypto (`crypto.subtle`), não `node:crypto` — de propósito: este arquivo é importado por
`middleware.ts`, que roda no Edge Runtime (sem `node:crypto`, mas com `crypto.subtle`, igual ao
navegador), e também pelas rotas de API (Node) — mesma lógica nos dois lugares, sem duplicar.
`lib/auth-senha.ts` (comparação da senha do Admin com `crypto.timingSafeEqual` de verdade) fica
separado, importado só pela rota do Admin — nunca pelo middleware, pra não arriscar quebrar o
bundle do Edge com um import de `node:crypto`.

**4 rotas novas** (`app/api/auth/*`):
- `login-admin` (senha) — valida contra `ADMIN_PASSWORD`, grava o cookie.
- `login-pdv` (nome, sem senha) — **recusa explicitamente qualquer usuário `papel === 'admin'`**
  (ver achado abaixo).
- `logout` — limpa o cookie.
- `me` — única fonte de verdade de "quem está logado", usada pelo front pra restaurar sessão ao
  montar a página (substitui o antigo `lerSessao()` de localStorage, nunca validado no servidor).

**`lib/usuarios.ts`**: campo `senha` e as funções `autenticar`/`autenticarAdmin` removidos —
nunca mais nada neste arquivo pode ir pro bundle do navegador com um segredo dentro (era
importado direto por `app/page.tsx`, `"use client"` — causa raiz do vazamento da 302).

**`middleware.ts`**: substituída a checagem do segredo único da 304 por: sessão real (cookie) OU
credencial de serviço interno (`X-Internal-Secret`/`INTERNAL_SERVICE_SECRET`, não-pública, só pro
gatilho da 300). Exceções: webhook do MP (assinatura própria) e as 4 rotas de auth (senão vira
loop — pra logar, ainda não pode exigir estar logado).

**`app/page.tsx` e `app/pdv/page.tsx`**: login/logout/restauração de sessão trocados pra chamar as
rotas novas em vez de `autenticarAdmin`/localStorage. `app/layout.tsx`: removido o script
`beforeInteractive` da 304 (não precisa mais injetar segredo nenhum — o cookie vai sozinho em
toda requisição, é assim que cookie funciona). `lib/sessao.ts` apagado (localStorage não é mais a
fonte de verdade de sessão nenhuma).

**Achado real durante a implementação, corrigido junto (mesmo escopo — "sessão funcionar"
inclui não ter um jeito de contornar a senha)**: a tela do PDV (`app/pdv/page.tsx`) mostrava
TODOS os usuários como botão, incluindo Edvam — clicar nele chamava `onLogin(u)` direto, **sem
senha nenhuma**. Se eu tivesse só trocado o mecanismo de sessão sem mexer nisso, `POST /api/auth/
login-pdv {"nome":"Edvam"}` teria virado um jeito remoto de conseguir uma sessão "admin" válida
sem conhecer a senha — um buraco nesta própria demanda, não pré-existente do mesmo jeito (antes a
senha em si vazava; esse caminho aqui seria pior, nem precisaria da senha vazada). Corrigido:
`login-pdv` rejeita qualquer `papel === 'admin'` no servidor (não é só UI — testado direto via
`curl`), e a tela do PDV agora abre um prompt de senha (reaproveitando `/api/auth/login-admin`)
quando o nome clicado é do Edvam, em vez de logar na hora.

**Senha do Admin trocada, não só relocada.** Se eu tivesse movido a MESMA senha vazada
("075644js2026") pra `ADMIN_PASSWORD`, o vazamento de meses continuaria válido — qualquer um que
já tivesse capturado o valor do bundle antigo ainda conseguiria entrar. Gerei um valor novo
(`ADMIN_PASSWORD` na Vercel + `.env.local`) — comunicado ao Edvam separadamente deste arquivo
(dado sensível, não replicado aqui). Ele pode trocar de novo por outra de sua escolha quando
quiser, só atualizando a env var.

**Segredo de serviço interno rotacionado também.** `NEXT_PUBLIC_APP_SHARED_SECRET` (304) foi
REMOVIDO da Vercel (não funciona mais, testado). Trigger `jsgrafica_retentar_pix_apos_telefone_
corrigido` (300) atualizado pra mandar `X-Internal-Secret` com um valor novo, não-público
(`INTERNAL_SERVICE_SECRET`) — o gatilho automático de Pix continua funcionando, mas o segredo que
ele usa nunca mais aparece em lugar nenhum acessível pelo navegador.

**`CLAUDE.md`** atualizado — seção da "ponte" (304) substituída pela descrição da sessão real,
histórico preservado pra contexto.

### Testes realizados e resultado
Tudo testado com dado/ação real, em produção de verdade, depois do deploy (`npx vercel --prod
--yes`):
- `npx tsc --noEmit` e `npm run build` limpos (1 ajuste de tipo: `Uint8Array` vs `BufferSource`
  no `crypto.subtle.verify`, cast direto, sem mudar comportamento).
- **Exploração da 302 continua fechada**: `curl` sem login em `admin.`/`pdv.jsgrafica.site`
  ainda dá 401.
- **Senha antiga vazada não funciona mais**: `curl` com `"075644js2026"` direto em produção → 401
  "Senha incorreta" — confirma que o vazamento foi neutralizado, não só escondido.
- **Senha nova funciona**: login real, cookie gravado, confirmado com `/api/auth/me`.
- **Segredo antigo da 304 (`X-App-Secret`) não funciona mais**; **segredo novo de serviço
  (`X-Internal-Secret`) funciona**.
- **Gatilho automático de Pix da 300 sobreviveu à troca de segredo**: pedido sintético com
  telefone `@lid` corrigido via `UPDATE` → `mp_order_id` apareceu sozinho em produção, sem
  chamada manual. Pedido de teste apagado depois.
- **Admin, Playwright contra `admin.jsgrafica.site` real**: senha errada mostra erro; senha nova
  loga; 0 chamadas `/api/` (fora `/auth/`) com 401 navegando por Vendas/Pedidos, Atendimento/
  Inbox, Financeiro; sessão sobrevive a um reload (cookie real, não localStorage); "Sair" volta
  pra tela de login e um reload depois disso NÃO restaura a sessão (logout de verdade, não só
  local).
- **PDV, Playwright contra `pdv.jsgrafica.site` real**: Zu loga com 1 clique, sem senha, sessão
  sobrevive a reload; clicar "Edvam" agora mostra o prompt "Senha de Edvam" em vez de logar
  direto (print confirma); senha errada mostra erro; senha certa loga Edvam de verdade.
- Teste local (antes do deploy) com `Host` forjado pra simular subdomínio de PDV não funcionou
  (Chromium bloqueia sobrescrever o header `Host` de propósito, `net::ERR_INVALID_ARGUMENT`) —
  contornado testando direto contra o domínio real depois do deploy, que é uma prova mais forte
  de qualquer forma.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- Nenhuma rota `/api/*` tem limite de tentativas (rate limit) no login — `POST /api/auth/login-
  admin` aceita quantas tentativas de senha alguém quiser mandar, sem trava nenhuma. Não é
  regressão desta demanda (nunca existiu limite, nem no mecanismo antigo), mas agora que o login
  é uma rota de verdade remotamente chamável, é um candidato real a endurecimento futuro (precisa
  de estado persistente — tabela ou similar — pra contar tentativas, fora do escopo "sessão
  funcionar" desta demanda).
- `middleware.ts` está com aviso de depreciação do próprio Next.js 16 ("use 'proxy' instead") —
  não migrado agora: mudar a convenção do arquivo sem entender o contrato novo de verdade seria
  arriscado numa demanda que já mexe em autenticação; ainda funciona normalmente (é aviso, não
  erro), candidato a demanda própria de manutenção depois.

### Status final: concluída
