# 333 - middleware.ts com aviso de depreciação do Next.js 16

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 03 - APP JS GRAFICA

Achado fora do escopo, relatado na demanda 329: `middleware.ts` está com aviso de depreciação
do próprio Next.js 16 ("use 'proxy' instead"). Não foi migrado na 329 de propósito, pra não
misturar mudança de convenção de arquivo com uma demanda que já mexia em autenticação. Ainda
funciona normalmente hoje, é aviso, não erro.

## Objetivo
Migrar `middleware.ts` pra convenção nova (`proxy`) recomendada pelo Next.js 16, preservando
exatamente o mesmo comportamento de sessão/segurança implementado na 329.

## Escopo
- Incluído: só a convenção do arquivo (nome/estrutura esperada pelo Next.js).
- Explicitamente fora de escopo: qualquer mudança de lógica de autenticação/sessão em si (isso
  é a 329, já concluída e testada — esta demanda não deve alterar comportamento, só a forma).

## Riscos e cuidados
Mudar a convenção de um arquivo que acabou de ser revisado a fundo (329) pede o mesmo nível de
teste real (Playwright contra os 2 subdomínios, os 3 usuários) antes de considerar concluída,
pra garantir que nada de autenticação regrediu.

## Referências
`middleware.ts`, demanda 329.

## Relato de execução

### O que foi feito
Confirmado na documentação oficial (`nextjs.org/docs/messages/middleware-to-proxy` e a página do
próprio `proxy.js`) exatamente o que muda: arquivo `middleware.ts` → `proxy.ts` (mesma raiz do
projeto), função exportada `middleware` → `proxy`, `export const config`/`matcher` sem nenhuma
mudança de forma. **Achado relevante pra decisão, não uma correção**: a partir da v16, Proxy roda
por padrão no runtime **Node.js** (Middleware rodava Edge por padrão) — sem risco aqui porque
`lib/auth-token.ts` (criado na 329) já usa Web Crypto (`crypto.subtle`) de propósito, que funciona
igual nos dois runtimes; nada na lógica de sessão dependia de rodar especificamente no Edge.

Migração feita: `proxy.ts` novo com o EXATO mesmo corpo de `middleware.ts` (roteamento de
subdomínio, checagem de sessão/segredo de serviço nas rotas `/api/*`), só a função renomeada;
`middleware.ts` antigo apagado (evita os dois arquivos coexistindo). Nenhuma linha de lógica
alterada, só nome de arquivo e de função — exatamente o que o escopo da demanda pedia.

### Testes realizados e resultado
Mesmo nível de teste real da 329, como o "Riscos e cuidados" desta demanda pedia, tudo depois do
deploy, contra produção real:
- `npx tsc --noEmit` e `npm run build` limpos — **o aviso de depreciação sumiu do build**
  (confirmado rodando o build antes, com o aviso presente, e depois, sem ele).
- **Admin (Edvam)**: login com senha funciona, zero chamadas `/api/` com 401 navegando pelo app
  logado, sessão sobrevive a reload, logout é de verdade.
- **PDV (Zu)**: login com 1 clique sem senha funciona, sessão sobrevive a reload.
- **PDV (Edvam)**: clicar no nome ainda pede senha (buraco fechado na 329 continua fechado), senha
  errada mostra erro, senha certa loga. (Gabi usa o mesmo caminho de código de Zu — atendente sem
  senha — não testado em separado, mesmo critério já aceito na própria 329.)
- **Roteamento de subdomínio**: `pdv.jsgrafica.site` continua servindo `/pdv`, `admin.jsgrafica.site`
  continua servindo a raiz — confirmado indiretamente pelos 2 testes acima terem funcionado nos 2
  domínios.
- **Segredo de serviço interno (gatilho de Pix da 300)**: `POST /api/pedidos/retentar-pix` sem
  `X-Internal-Secret` → 401 (bloqueado); com o segredo certo → passa da checagem de auth (some o
  401, sobra só um 400 de corpo inválido no teste, esperado por mandar `{}` vazio) — confirma que
  o `proxy.ts` novo continua liberando esse caminho.

Nenhuma regressão encontrada em nenhum dos pontos que a 329 já tinha testado a fundo.

### Status final: concluída
