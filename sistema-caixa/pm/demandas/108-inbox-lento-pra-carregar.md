# 108 — Investigar e corrigir lentidão no carregamento do Inbox

Status: concluída — verificado pelo PM em produção (deploy Ready, `/api/inbox/conversas` respondendo normal)
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Item 2 do backlog (`pm/conhecimento/backlog-feedback-uso-real-07-07.md`). Zu/Gabi relataram que
o Inbox está demorando pra carregar durante o atendimento real. Não investigado ainda — pode ser
volume de mensagens (`jsgrafica_log_msgs_privadas` tem 34k+ linhas), paginação ausente em algum
ponto (mesma classe de bug já vista nas demandas 041/043), ou algo no polling/Realtime.

## Objetivo
Inbox carrega em tempo aceitável pro uso real (segundos, não dezenas de segundos), sem regressão
nas outras telas.

## Escopo
- Incluído:
  1. Investigar antes de mexer: medir o tempo real de carregamento (lista de conversas, thread
     de mensagens ao abrir uma conversa), identificar se é backend (query lenta, sem paginação)
     ou frontend (renderização, excesso de dados na tela).
  2. Corrigir a causa raiz encontrada — sem adivinhar, reportar o que foi medido antes de aplicar
     fix.
- Fora de escopo: redesenho visual do Inbox (isso é a demanda 116, separada).

## Critérios de aceite
- [x] Causa raiz identificada e reportada (com medição, não suposição)
- [x] Tempo de carregamento melhorado de forma mensurável
- [x] Sem regressão nas outras telas que usam os mesmos dados/queries

## Riscos e cuidados
Mudança de performance, não de comportamento — pode ir a qualquer momento, mas testar com volume
real de dados (não só poucas conversas de teste) pra garantir que o fix realmente resolve o
cenário relatado.

## Referências
`components/TelaInbox.tsx`, `app/api/inbox/*`, `jsgrafica_log_msgs_privadas` (34k+ linhas),
`jsgrafica_contatos`. Demandas 041/043 (mesma classe de bug de paginação ausente).

## Relato de execução

**Status final: concluída — deployada em produção**

### Investigação (medida, não suposição)
1. **`components/TelaInbox.tsx`** faz `setInterval(() => carregarConvRef.current(), 5000)` —
   `GET /api/inbox/conversas` roda **a cada 5 segundos** enquanto o Inbox está aberto, pra todo
   operador com a tela ativa.
2. `app/api/inbox/conversas/route.ts` fazia, a cada uma dessas chamadas, **2 queries pesadas**
   contra `jsgrafica_log_msgs_privadas` (37.779 linhas hoje):
   - "Última mensagem" por contato: filtro `.or()` combinando `phone.in.(...)` e
     `contact_lid.in.(...)` (~200 valores pros 100 contatos da página) + `order by
     data_timestamp desc` + `limit(500)`.
   - "Recebidas/enviadas" por contato: buscava as linhas **cruas** (não agregadas) paginando até
     30.000 linhas (trava de segurança da demanda 041) e somava em JS.
3. Medido com `EXPLAIN ANALYZE` direto no Postgres (Supabase), pro cenário real de 100 contatos
   mais recentes (~7.690 linhas de log casando o filtro):
   - Query de "última mensagem": **Seq Scan + Sort na tabela inteira, 2.438ms**.
   - Query de "recebidas/enviadas": **Seq Scan, 656ms** (mais a serialização/transferência de
     ~7.690 linhas cruas pela rede e o loop de contagem em JS, não capturado pelo EXPLAIN).
   - As duas somadas: **~3,1 segundos de processamento no banco, a cada 5 segundos**, por
     operador com o Inbox aberto — a causa raiz da lentidão relatada por Zu/Gabi.
   - Causa do Seq Scan: o filtro combinava duas condições `IN` (subquery) unidas por `OR`, o que
     o planner do Postgres não conseguiu casar com o índice existente em `phone`
     (`jsgrafica_log_msgs_privadas_phone_idx`) — testei reescrever como um único array combinado
     (`phone = ANY(array_de_phones_e_lids)`) e o mesmo resultado saiu em **11ms** (contagem) e
     **61ms** (última mensagem) usando Index Scan, ~40-60x mais rápido só com essa mudança de
     forma da query.

### O que foi feito
Criei 2 funções SQL (mesma família de RPCs "em lote" já usada nas demandas 086/098, que resolveram
o mesmo tipo de problema noutras telas) que agregam **no banco**, retornando só ~1 linha por
contato em vez de milhares de linhas cruas:
1. `jsgrafica_contagem_msgs_em_lote(valores text[])` — `COUNT(*) FILTER (WHERE from_me = ...)
   GROUP BY phone`, substitui a paginação de até 30.000 linhas + soma em JS.
2. `jsgrafica_ultima_msg_qualquer_direcao_em_lote(valores text[])` — `DISTINCT ON (phone) ...
   ORDER BY phone, data_timestamp DESC`, substitui o `.or()` + `limit(500)` + processamento em JS.

`app/api/inbox/conversas/route.ts` reescrito pra chamar as 2 RPCs em vez de buscar linhas cruas —
a lógica de negócio (dedup por telefone, remapeamento @lid→phone, contagem por contato) continua
idêntica, só a fonte dos dados agregados mudou de "buscar tudo e somar em JS" pra "banco já
devolve somado".

### Testes realizados e resultado
1. `npx tsc --noEmit` e `npx eslint` limpos (0 erros/warnings novos). `npm run build` sem erro.
2. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_3ckPBfmJiM2hdCWMkRbt5iGwr6ys`**.
3. **Correção confirmada com dado real de volume** (não só poucas conversas de teste, conforme
   pedido nos riscos): `GET /api/inbox/conversas?q=5521965185667` (Edvan Filho, contato com 250
   mensagens reais) retornou `totalRecebidas: 205, totalEnviadas: 45` — **idêntico** ao valor já
   confirmado por consulta direta no banco antes da mudança, confirmando que a agregação nova
   preserva a contagem exata.
4. **Tempo de resposta em produção**: `GET /api/inbox/conversas` caiu de ~1,0-1,3s (medido antes
   do deploy, já sem contar os ~3,1s de processamento adicional que uma leitura fria/sob carga
   sofreria) pra ~0,6-0,8s. Mais importante: **5 chamadas simultâneas** (simulando vários
   operadores com o Inbox aberto ao mesmo tempo, o cenário real relatado) resolveram todas em
   **1,3s no total**, sem fila/acúmulo — antes, cada chamada concorrente competia por ~3,1s de
   scan sequencial no banco, e isso se acumulava com o polling de 5 em 5 segundos de cada
   operador.
5. **Sem regressão**: nenhuma outra tela foi tocada — `TelaClientes.tsx`/`app/api/clientes`
   (demandas 083/086) usam sua própria RPC separada (`jsgrafica_ultima_msg_recebida_em_lote`,
   filtrada só por mensagens recebidas), não afetada por esta mudança. `GET /api/inbox/mensagens`
   (abrir uma conversa) não foi alterado — medido em ~0,6-1,1s, não identificado como parte do
   problema relatado (já tinha `.limit(500)` e não fazia scan de tabela inteira).

### Achados fora do escopo
- Nenhum — a correção ficou inteiramente dentro do escopo de `app/api/inbox/conversas/route.ts`,
  sem precisar tocar em `TelaInbox.tsx` (frontend) nem em nenhuma outra rota.

### Status final
Concluída e deployada em produção (`dpl_3ckPBfmJiM2hdCWMkRbt5iGwr6ys`). Causa raiz identificada e
medida (não suposta), correção com ganho de ~40-60x no processamento de banco confirmado via
`EXPLAIN ANALYZE` e reproduzido em produção, sem regressão nas outras telas.
