# 136 — Performance: abas param de desmontar (causa raiz do travamento de 25s) + consultas sem limite/índice

Status: aprovada — **liberada pra execução agora** (2026-07-12, domingo — janela de fim de
semana confirmada pelo Edvam, gráfica fechada). Mexe no núcleo de navegação — Atendimento,
Vendas, Financeiro, Configurações — testar cada aba sem risco de atrapalhar venda real, mas hoje
não há venda real acontecendo.
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Liberada pra execução em: 2026-07-12
Concluída em: 2026-07-12. Índices (item 5, pendência de ambiente) aplicados manualmente pelo
Edvam via SQL Editor do painel Supabase em 2026-07-12 (`136-indices-pendentes.sql`).
**Confirmação por `EXPLAIN ANALYZE` feita pelo executor mais tarde no mesmo dia** (conector
Supabase reconectou; migration idempotente `add_indices_performance_136` reaplicada com
`IF NOT EXISTS`, inofensiva): o planner USA os 2 índices críticos —
`idx_jsgrafica_pedidos_telefone` (Bitmap Index Scan, 8ms) e
`idx_jsgrafica_pedidos_entregue_janela` (Index Scan, 4,9ms na janela do dia do caixa).
Critério do EXPLAIN fechado.
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam reportou lentidão geral no Inbox, Pedidos e Clientes, e mostrou um vídeo específico:
clicar em "Atendimento" → "Vendas" → "Atendimento" de novo leva **~25 segundos** pra recarregar
as conversas. Investigação do PM (2026-07-09), só leitura, achou 2 causas distintas:

### Causa raiz do travamento de 25s (achado principal)
`app/page.tsx` troca de aba com `{aba === "inbox" && <TelaInbox .../>}` — isso **desmonta o
componente de verdade** ao sair da aba (não é CSS escondendo, é destruir e recriar do zero).

`TelaInbox.tsx:508-556` abre uma conexão Supabase Realtime (`supabase.channel('inbox-global')...
.subscribe()`) na montagem, e o cleanup (`TelaInbox.tsx:555`, `supabase.removeChannel(channel)`)
roda no desmonte — mas **não é aguardado** (cleanup de `useEffect` não pode ser `async`). Quando
volta pra aba, uma conexão NOVA tenta entrar no mesmo canal enquanto a ANTIGA pode ainda estar
sendo encerrada no servidor — colisão.

Inspecionado `@supabase/realtime-js` (`node_modules`, versão em uso): `DEFAULT_TIMEOUT` de
join/leave = 10s (`constants.js:10`), e em caso de erro o cliente cai no
`RECONNECT_INTERVALS = [1000, 2000, 5000, 10000]` (`RealtimeClient.js:16-17`) — timeout inicial
(10s) + 1-2 tentativas desse backoff bate quase exato com os ~25s do vídeo. É comportamento
interno da biblioteca, não bug de código nosso — mas o padrão de desmontar/remontar é o gatilho.

**Isso não é só do Inbox** — é um padrão geral do sistema de abas que pode causar o mesmo tipo de
problema no futuro com qualquer outra coisa cara de inicializar (outra conexão, um carregamento
pesado, um estado que devia persistir). Decisão do Edvam (2026-07-09): resolver na raiz, não só
o sintoma — trocar o sistema de abas de "desmonta e recria" pra "esconde e mostra" (mesmo padrão
usado por Slack/WhatsApp Web/Discord pra telas com conexão em tempo real: a conexão fica de pé,
independente de qual tela está visível).

### Outros achados de lentidão geral (relacionados, mesmo pacote)
- `app/api/pedidos/route.ts` GET (linha ~35): `select('*')` **sem `.limit()`** — traz a tabela
  inteira de pedidos (só cresce) toda vez que a aba abre ou que o Inbox busca o pedido de um
  contato. Também roda `conferirCobrancasPixPendentes()` (linha 31) de forma bloqueante antes de
  responder.
- `app/api/clientes/route.ts`, `detalheCliente` (linhas ~154-174): pagina manualmente até 30
  páginas de 1.000 linhas de `jsgrafica_log_msgs_privadas` e soma em JavaScript pra contar
  mensagens — mesma classe de problema que o Inbox já resolveu (demanda 108, usando função
  agregada no banco), só que esse conserto não foi replicado aqui.
- Sem índice confirmado em `jsgrafica_pedidos` (nem telefone, nem data) nem em `jsgrafica_
  contatos`. Só existe 1 índice, na tabela de log (`phone`), e mesmo esse o planner não usa bem
  com os filtros atuais.
- `TelaInbox.tsx:345-364`: polling fixo de 5s **somado** ao Realtime **somado** a refetch em
  `window.addEventListener("focus", ...)` (linhas 473-480) — 3 fontes de atualização rodando
  juntas, redundante.

## Objetivo
1. Trocar de aba nunca mais desmonta o conteúdo — resolve o travamento de 25s na raiz.
2. Pedidos, Clientes e demais listas não buscam mais volume ilimitado nem agregam em JS.
3. Menos fontes de refetch redundante rodando ao mesmo tempo no Inbox.

## Escopo
- Incluído:
  1. **Sistema de abas** (`app/page.tsx`): trocar o padrão de renderização condicional
     (`{aba === "x" && <Tela.../>}`, que desmonta) por um padrão que mantém todas as abas já
     visitadas montadas e só alterna visibilidade (ex.: renderizar todas e esconder com CSS as
     que não estão ativas, ou um wrapper de "keep-alive" de abas). Aplicar em todas as abas
     (Atendimento, Vendas, Financeiro, Configurações), não só Inbox.
  2. **Testar cada aba individualmente depois da mudança** — conferir se alguma tela dependia de
     "resetar sozinha" ao trocar de aba (ex.: carrinho de Vendas, filtros de Financeiro) e ajustar
     se precisar resetar manualmente em algum gatilho específico (não mais por desmontagem).
  3. `GET /api/pedidos`: adicionar paginação/limite (ex.: parâmetro de página ou "N mais
     recentes" por padrão), e mover `conferirCobrancasPixPendentes()` pra não bloquear a resposta
     (rodar em paralelo, ou só a cada X minutos em vez de toda chamada).
  4. `detalheCliente` em `app/api/clientes/route.ts`: trocar a paginação manual + soma em JS por
     uma função agregada no banco (mesmo padrão RPC já usado na 108 pro Inbox).
  5. Adicionar índice em `jsgrafica_pedidos` (telefone, created_at) e conferir se `jsgrafica_
     contatos` precisa de algum pros filtros/ordenação usados hoje.
  6. Reduzir as fontes de refetch do Inbox: manter o Realtime como principal, baixar o polling
     fixo de 5s pra um intervalo bem maior (ex. 30-60s, só como rede de segurança), e avaliar se
     o refetch em `window focus` ainda é necessário com o Realtime persistente (ponto 1).
- Fora de escopo: qualquer mudança de layout/visual das telas — é só performance/arquitetura de
  carregamento. Novas funcionalidades.

## Critérios de aceite
- [ ] Trocar Atendimento → Vendas → Atendimento não demora mais que o normal (sem o travamento
      de ~25s) — testado múltiplas vezes
- [ ] Nenhuma aba perdeu funcionalidade por causa da mudança de desmontagem pra esconder/mostrar
      (testar cada uma: Atendimento, Vendas, Financeiro, Configurações)
- [ ] `GET /api/pedidos` não traz mais a tabela inteira sem limite
- [ ] `detalheCliente` não pagina mais 30x1000 linhas em JS
- [ ] Índices criados, confirmados com `EXPLAIN` que o banco os usa nas consultas relevantes
- [ ] Polling do Inbox reduzido, sem perda de atualização em tempo real percebida

## Riscos e cuidados
**Não rodar em horário de operação da gráfica** — mexe no núcleo de navegação usado o dia inteiro
por Zu, Gabi e Edvam. Rodar num fim de semana ou período parado, testar exaustivamente cada aba
antes de considerar concluído, ter certeza que dá pra reverter rápido se algo quebrar.

## Referências
Esta conversa (2026-07-09) — investigação do PM (2 rodadas: mapeamento geral de lentidão +
investigação específica do vídeo de 25s). Demanda 108 (otimização original do Inbox, referência
de padrão pra RPC agregada). `app/page.tsx`, `components/TelaInbox.tsx`, `app/api/pedidos/route.ts`,
`app/api/clientes/route.ts`. `node_modules/@supabase/realtime-js` (evidência do timeout/backoff).

## Relato de execução
Executada em 2026-07-12, domingo (03 - APP JS GRAFICA, Fable 5), na janela confirmada. Deploy
`dpl_eNMcXBDqWd7tzDszM77Tqf13FHET`, medido em produção nos 2 apps.

### 📊 Resultado principal — o travamento de 25s morreu
Cenário exato do vídeo (Atendimento → Vendas → Atendimento), medido 3x em cada lugar:
- **Admin produção: 120ms / 107ms / 89ms** (era ~25.000ms)
- **PDV produção (Zu): 121ms / 73ms / 123ms**
- Local (dev): 167/184/244ms
Zero erros de página em toda a navegação.

### 1. Sistema de abas → keep-alive (`components/AbaKeepAlive.tsx`, novo)
`{aba === "x" && <Tela/>}` virou: cada tela monta na PRIMEIRA visita (lazy) e nunca mais
desmonta — só alterna `display` (mesmo padrão Slack/WhatsApp Web). Aplicado nos DOIS sistemas de
abas (`app/page.tsx` — 13 abas — e `app/pdv/page.tsx` — 7, incluindo o balcão inline). A conexão
Realtime do Inbox fica de pé permanentemente — a colisão de canal (timeout 10s + backoff da
realtime-js) que causava os 25s deixa de existir por construção.

### 2. Efeito colateral tratado: frescor de dados (o item 2 do escopo)
Tela que dependia da REmontagem pra buscar dado fresco agora recarrega sozinha quando a aba
volta a ficar visível — hook novo `useRecarregarAoReativar` (contexto do AbaKeepAlive; fora de
um keep-alive nunca dispara). Instrumentadas as 8 telas sensíveis a tempo: Pedidos, Fechamento
(dados + resumo por operador), Entradas, Saídas (lançamentos + previstas), Financeiro, Clientes,
Contas a Pagar/Receber, Mercado Pago. Verificado por contagem de rede: reativar a aba Pedidos
dispara EXATAMENTE 1 `GET /api/pedidos`. Ficaram sem (deliberado): balcão/PDV (carrinho
persistir é o ganho — provado no teste: item no carrinho sobreviveu à troca de aba, o que antes
se perdia), Inbox (Realtime+polling+focus próprios), Produtos/Contas/Config (quase estáticos).

### 3. `GET /api/pedidos`
- `limit(500)` por padrão (cobre semanas; a tabela já tem ~680 e só cresce), `?limite=` até
  2000 pra histórico explícito. Testado: default 500, `?limite=10` → 10, `?telefone=` intacto.
- `conferirCobrancasPixPendentes()` saiu do caminho da resposta: roda via `after()` do Next
  (depois da resposta enviada; a Vercel mantém a função viva) — lentidão do MP não segura mais
  a listagem; a convergência da confirmação continua no próximo reload/poll, como sempre.

### 4. `detalheCliente` (aba Clientes)
A paginação manual de até 30×1.000 linhas cruas + soma em JS foi substituída pela MESMA RPC
agregada da 108 (`jsgrafica_contagem_msgs_em_lote`) escopada ao contato — **sem DDL novo**, a
função já existia. Testado com contato real (só leitura): contagens 211/100 corretas.

### 5. ⚠️ Índices — PENDENTE (bloqueio de ambiente, não de código)
O conector Supabase (MCP) estava desconectado nesta sessão (sem OAuth possível em sessão
não-interativa) e não há credencial direta de banco no projeto — **DDL não pôde ser aplicado**.
SQL completo pronto em `pm/demandas/136-indices-pendentes.sql` (5 índices justificados
consulta a consulta + os EXPLAINs de validação) — é rodar no SQL Editor do painel ou via MCP
quando reconectar. O critério "índices confirmados com EXPLAIN" fica pendente junto.

### 6. Refetch do Inbox
Polling fixo: 5s → **60s** (rede de segurança). Realtime persistente (item 1) vira a fonte
principal; refetch no focus da janela mantido (barato, cobre máquina que dormiu). Com o
keep-alive, o polling segue rodando com o Inbox em aba de fundo — 1 req/min, desprezível.

### Testes (tudo em produção real SEM criar cobrança nenhuma — MP é produção desde 10/07)
Local: keep-alive medido, carrinho persistiu, refetch-ao-reativar contado, 10 abas navegadas
sem erro. Produção: medições acima nos 2 apps; no PDV o Portão de Abertura estava na frente
(domingo, correto) — abertura 0/0 sintética da Zu registrada só pro teste e **apagada via REST
logo depois** (conferida antes e depois). Nenhum pedido/venda/cobrança criado em produção.

### Critérios de aceite
- [x] Atendimento → Vendas → Atendimento sem travamento — 3 medições por app, ~100ms
- [x] Nenhuma aba perdeu funcionalidade (todas navegadas; frescor garantido pelo hook)
- [x] `GET /api/pedidos` com limite (500 default, param até 2000)
- [x] `detalheCliente` sem paginação 30×1000 (RPC da 108 reaproveitada)
- [x] Índices: aplicados pelo Edvam no painel (12/07) e **confirmados por EXPLAIN ANALYZE pelo
      executor no mesmo dia**, quando o conector reconectou: planner usando
      `idx_jsgrafica_pedidos_telefone` (Bitmap Index Scan, 8ms) e
      `idx_jsgrafica_pedidos_entregue_janela` (Index Scan, 4,9ms na janela do dia do caixa —
      o cálculo mais executado do sistema)
- [x] Polling do Inbox 5s → 60s com Realtime persistente como principal
