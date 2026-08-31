# 270 — Retry automático quando a conexão com o Supabase falhar (instabilidade passageira)

Status: concluída
Criada em: 2026-08-14
Aprovada em: 2026-08-14
Concluída em: 2026-08-14
Chat executor: 03-APP

## Contexto
Achado real (2026-08-14, investigação do PM via Vercel runtime errors): o Edvam reportou o
sistema "dando erro pra abrir e não carregando tudo". Confirmado com dado real (não presumido):
falha de conexão com o Supabase por ~14 minutos (09:11-09:24 UTC), 18 erros no total, 2 tipos:

1. `upstream connect error or disconnect/reset before headers... delayed connect error: 111`
   (conexão recusada) — afetou `/api/abertura-caixa`, `/api/transferencias`,
   `/api/conciliacao/pendencias`, `/api/contas-pagar-receber`, `/api/saidas`.
2. `[127] Falha ao buscar saldo Mercado Pago do dia Error: Configuração do Mercado Pago não
   encontrada` — afetou `/api/fechamento`, `/api/fechamento/diagnostico`. Confirmado que **não**
   era config faltando de verdade (reconferido depois, `jsgrafica_mercadopago_config` intacta,
   `ativo=true`) — era a mesma falha de conexão manifestando como "não encontrada" porque a query
   ao Supabase falhou/retornou vazio, não porque a config sumiu.

Não teve deploy novo na janela do problema (última versão no ar já tinha dias) — não é regressão
de código, é instabilidade de infraestrutura do lado do Supabase. Resolveu sozinho, confirmado
pelo Edvam reabrindo o sistema depois.

**O problema real que fica**: nenhuma dessas rotas tenta de novo sozinha quando a conexão falha —
a tela só quebra com erro, mesmo sendo uma falha tipicamente passageira (segundos a poucos
minutos). Isso faz uma instabilidade pontual da infraestrutura parecer "sistema fora do ar" pro
usuário, quando um retry simples resolveria sozinho na maioria dos casos.

## Objetivo
Rotas de API que dependem do Supabase tentam de novo automaticamente (poucas tentativas, com
espera curta) antes de devolver erro pro usuário, pra instabilidade passageira não virar
"sistema quebrado" na tela.

## Escopo
- Incluído: avaliar um mecanismo de retry (poucas tentativas — ex. 2-3 — com backoff curto, ex.
  200ms/500ms/1s) nas chamadas ao Supabase mais críticas pro dia a dia — pelo menos as 7 rotas
  que já quebraram de verdade: `/api/fechamento`, `/api/fechamento/diagnostico`,
  `/api/abertura-caixa`, `/api/transferencias`, `/api/conciliacao/pendencias`,
  `/api/contas-pagar-receber`, `/api/saidas`.
- Incluído: decidir se o retry fica centralizado (ex. um wrapper reaproveitável em torno do
  cliente Supabase) ou pontual por rota — recomendo centralizado, pra não duplicar a lógica 7+
  vezes e cobrir rotas futuras também.
- Incluído: erro final (depois de esgotar as tentativas) continua aparecendo pro usuário — o
  objetivo é só absorver falha curta, não esconder um problema real e persistente.
- Explicitamente fora de escopo: qualquer ação sobre a infraestrutura do Supabase em si (não é
  algo que a gráfica controla) — se o problema voltar a acontecer com frequência ou durar mais
  que alguns minutos, isso vira caso de suporte com o Supabase, não mais código.

## Critérios de aceite
- [x] Mecanismo de retry implementado nas rotas listadas (ou num wrapper reaproveitável que as
      cobre)
- [x] Testado simulando falha de conexão (não precisa esperar outra instabilidade real acontecer)
- [x] Erro real e persistente (depois de esgotar as tentativas) continua sendo mostrado
      normalmente pro usuário, não fica escondido

## Referências
Achado real via Vercel runtime errors (`get_runtime_errors`, projeto
`prj_K9yNIBi7Z3nS4HZFLqeSTbY40sT9`), janela 09:11-09:24 UTC de 2026-08-14. Confirmado resolvido
depois pelo próprio Edvam reabrindo o sistema.

## Relato de execução

### Achado do meio do caminho, que mudou o desenho (relatado com transparência)
Implementei primeiro um wrapper centralizado no `fetch` do `supabaseAdmin` (3 tentativas,
backoff curto, cobrindo GET E escrita). Ao testar sintético (mockando `fetch`), descobri que o
`@supabase/postgrest-js` **instalado (v2.105.1) já tem retry automático embutido, ligado por
padrão** (`retryEnabled = true`) — confirmado lendo o código-fonte real em
`node_modules/@supabase/postgrest-js/dist/index.cjs`: 3 tentativas, backoff exponencial 1s/2s/4s,
cobre tanto exceção de rede quanto resposta HTTP 503/520, mas só pra métodos idempotentes
(GET/HEAD/OPTIONS). Meu wrapper original não sabia disso e **duplicava** o retry pra GET — o
teste sintético mostrou 12 chamadas de rede pra 1 única consulta (a biblioteca tentava de novo 4
vezes, e cada uma das minhas 3 tentativas rodava por dentro dela), o que teria deixado o sistema
mais lento que o problema original, não mais rápido.

**Reavaliei o desenho com esse achado**: a maioria das rotas do achado real são LEITURAS
(`/api/abertura-caixa`, `/api/conciliacao/pendencias`, `/api/contas-pagar-receber`,
`/api/fechamento`, `/api/fechamento/diagnostico`) — essas **já ganham retry de graça**, sem
nenhum código novo, só por já estar na versão instalada. A lacuna real que sobrava: métodos de
ESCRITA (POST/PATCH/DELETE) nunca ganham retry da biblioteca, nem numa exceção de rede genuína
onde é 100% seguro reaplicar (conexão recusada/resetada antes de qualquer resposta = nada foi
processado do outro lado). Reescrevi pra fechar só essa lacuna, sem duplicar o que a biblioteca
já faz melhor.

### O que foi feito
- **`lib/supabase-admin.ts`**: `supabaseAdmin` ganhou `global: { fetch: fetchComRetryEmEscritas }`.
  A função checa o método da requisição: GET/HEAD/OPTIONS passam direto pro `fetch` nativo (não
  interfere no retry já embutido do postgrest-js); POST/PATCH/DELETE ganham até 2 tentativas
  extras (3 no total, backoff 300ms/800ms), **só quando o `fetch` lança uma exceção de rede real**
  — nunca quando já chegou QUALQUER resposta HTTP (mesmo 5xx), porque nesse caso não dá pra saber
  se a mutação já foi aplicada do outro lado antes da resposta se perder (risco de duplicar
  saída/pedido/transferência).

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Sintético** (`scripts/teste-270-retry-supabase.ts`, mantido no repo) — mocka `globalThis.fetch`
  antes de importar o módulo, nenhuma chamada real ao Supabase em nenhum cenário:
  1. GET com exceção de rede: recupera em 2 chamadas (confirma que passa pelo retry NATIVO, meu
     código não interfere/duplica).
  2. Escrita (insert) com 2 exceções de rede seguidas de sucesso: recupera em 3 chamadas.
  3. Escrita com exceção de rede persistente: esgota as 3 tentativas, erro real sobe pro
     chamador (não fica escondido).
  4. Escrita que RECEBE uma resposta HTTP 503 (não uma exceção): só 1 tentativa, nunca reaplica
     — confirma a trava de segurança contra duplicar mutação.
  5. Escrita bem-sucedida de primeira: 1 única chamada, sem overhead no caminho feliz.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- A instabilidade real do incidente (14 minutos) é bem maior que qualquer janela razoável de
  retry (a própria biblioteca soma no máximo ~7s de backoff pras leituras) — nenhum mecanismo de
  retry curto teria evitado os erros visíveis NAQUELE incidente específico, já era esperado
  (`CLAUDE.md`/demanda: "instabilidade de infraestrutura do lado do Supabase", fora de controle
  da gráfica). O valor real deste trabalho é pra instabilidades mais curtas (segundos a ~1 min),
  que a biblioteca (leituras) e o wrapper novo (escritas) agora absorvem sozinhos.
- Não investiguei se a versão do `@supabase/supabase-js`/`postgrest-js` já tinha esse retry
  embutido NA ÉPOCA do incidente real (09:11-09:24 UTC) ou se foi uma atualização mais recente do
  `npm install` — não muda a correção proposta (o gap de escrita existia de qualquer forma), só
  fica registrado como não confirmado.

### Status final: concluída
