# 104 — Recarga gera saída na hora da venda (substitui a 079) + generaliza pra qualquer produto com repasse real

Status: concluída (verificado pelo PM em produção — venda real de teste em RECARGA CELULAR 30,00 gerou saída de R$27,50 na hora, categoria "Recarga Celular", vínculo automático confirmado; teste apagado depois)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA

## Contexto
Itens B4/B5 do checklist. Hoje `gerarSaidaRecargaVemAutomatica()` (`lib/supabase-admin.ts`, demanda
079) soma todas as recargas do dia e lança **1 saída agregada só no fechamento geral**. O Edvam
decidiu mudar isso pra **por-transação, na hora**: toda venda de recarga já gera a saída de
repasse correspondente imediatamente, sem esperar o fechamento.

Além disso, generaliza o mecanismo: com `preco_custo` agora existindo em todos os produtos
(demanda 095), qualquer produto marcado como tendo repasse real na hora da venda (recarga,
"Seviço terceirizado") passa a gerar saída automática — não só recarga, que era hardcoded.
Produção própria (impressão, xerox) **não gera saída automática** mesmo tendo `preco_custo`
cadastrado — o custo dela serve só pra métrica de margem nos relatórios, porque o dinheiro do
papel/tinta não sai por venda, sai quando a gráfica compra em lote.

**🔴 Cuidado explícito do Edvam: o caixa de hoje roda sob o mecanismo antigo (agregado). Trocar o
mecanismo no meio do dia misturaria: parte das recargas geradas na hora e a outra parte ainda
esperando o fechamento — risco real de duplicar ou perder saída.** Horário mínimo: loja e PDV
fecham às 18h, Admin fecha o caixa geral por volta das 19h, assim o fechamento geral do dia (que
ainda roda o mecanismo antigo pela última vez) já aconteceu antes da troca. **Mas isso não é
regra automática** — o Edvam confirmou que quer aprovar cada deploy de risco individualmente.
Não fazer deploy sem confirmação explícita pra esse deploy específico, mesmo depois das 19h —
esse é o maior risco do pacote todo, então vale ainda mais aqui.

## Objetivo
Vendeu recarga (ou qualquer produto com repasse real configurado) → já existe a saída
correspondente no sistema, sem esperar o fechamento do dia.

## Escopo
- Incluído:
  1. Novo campo no produto (ou reaproveitar `preco_custo` + um flag, ex. `gera_saida_automatica
     boolean`) marcando quais produtos disparam saída na hora — não é automático só por ter
     `preco_custo` preenchido, precisa do flag explícito (evita que produção própria dispare por
     engano só por ter custo cadastrado pra métrica de margem).
  2. Ao confirmar uma venda/pedido com produto marcado `gera_saida_automatica`, criar a saída
     real imediatamente (categoria do produto, valor = `preco_custo` × quantidade, ou a lógica de
     taxa já usada em Recarga VEM se o produto for especificamente essa — reaproveitar o cálculo
     existente da 052, não reinventar), vinculando via `saida_vinculada_id` no pedido/venda
     (mesmo padrão da 079).
  3. **Desativar/substituir** `gerarSaidaRecargaVemAutomatica()` no fechamento geral (demanda
     079) — não pode continuar rodando junto, senão duplica (a saída já foi gerada na venda).
     Confirmar que pedidos antigos (antes do deploy, ainda sem vínculo) não geram duplicata —
     mesmo cuidado que a 079 já teve que resolver na época.
  4. Migrar os produtos Recarga Celular/VEM pra usar o flag novo, como primeiro caso real.
- Fora de escopo: mudar a UI de venda — só o que acontece nos bastidores ao confirmar.

## Critérios de aceite
- [x] Venda de recarga gera a saída de repasse na hora, com o valor certo (mesma matemática da
      052)
- [x] Fechamento geral não gera mais saída agregada de recarga (mecanismo antigo desativado, sem
      duplicar com o novo)
- [x] Produto de produção própria com `preco_custo` cadastrado mas sem o flag NÃO gera saída
      automática nenhuma
- [x] Testado com pedido sintético e conferido que não duplica em cima de dado real
- [x] Deploy feito depois das 19h **e** com confirmação explícita do Edvam pra esse deploy

## Riscos e cuidados
Mexe em dinheiro real automaticamente — testar exaustivamente com dado sintético antes, nunca
gerar saída de teste em cima de venda real. **Não fazer deploy sem confirmação explícita do
Edvam pra esse deploy específico** — trocar o mecanismo no meio do expediente é o cenário de
risco mais alto de todo este pacote de demandas.

## Referências
`lib/supabase-admin.ts` (`gerarSaidaRecargaVemAutomatica()`, demanda 079), demanda 052 (cálculo
de taxa), `jsgrafica_produtos` (`preco_custo`, demanda 095), `saida_vinculada_id`.

## Relato de execução

- **Bloqueio de schema, resolvido**: o MCP do Supabase caiu no meio da execução — sem acesso a
  SQL/DDL direto (sem CLI linkado, sem connection string, sem psql). A coluna nova precisava vir
  de outro caminho; abri a demanda 107 pro 02-DADOS aplicar `gera_saida_automatica boolean not
  null default false` em `jsgrafica_produtos`, marcando os 27 produtos de Recarga Celular/VEM
  como `true` (confirmado por SQL direto assim que o MCP reconectou: 8 Recarga celular + 19
  Recarga vem, resto do catálogo em `false`). Só depois disso comecei a lógica de app.

- **O que foi feito:**
  - `lib/supabase-admin.ts`: removida `gerarSaidaRecargaVemAutomatica()` (mecanismo agregado da
    079) por completo — substituída por `gerarSaidaAutomaticaNaVenda(pedido)`, chamada no
    instante em que um pedido vira "entregue" (não mais no fechamento). Lógica:
    1. Se já tem `saida_vinculada_id` ou não tem `servico_id` → não faz nada.
    2. Busca o produto; se não existe ou `gera_saida_automatica` é `false` → não faz nada.
    3. Se a categoria do produto é "Recarga vem" ou "Recarga celular" → usa a mesma matemática da
       052/079 (`valor_final − quantidade × TAXA_RECARGA_VEM`), com `categoria_id` certo pra cada
       uma (`recarga_vem` / `recarga_cel` — **achado**: o mecanismo antigo só cobria "Recarga vem"
       na query, nunca "Recarga celular"; a nova versão cobre as duas de verdade, primeira vez que
       celular gera repasse automático).
    4. Qualquer outro produto marcado `true` (generalização pra além de recarga, nenhum ainda
       hoje) → `preco_custo × quantidade`; sem `preco_custo` cadastrado, não gera saída de
       R$0,00 sem sentido, só não faz nada.
    5. Grava a saída, vincula `saida_vinculada_id` no pedido.
  - `app/api/pedidos/route.ts`: hook chamado em 2 pontos — (a) `POST` origemBalcao, quando o
    pedido já nasce "entregue" (balcão paga na hora); (b) `PATCH`, quando o status vira "entregue"
    (cobre balcão que nasceu "aguardando_retirada" e o fluxo do Inbox). Os dois num `try/catch`
    isolado — uma falha aqui nunca derruba a venda/atualização em si, só fica no log do servidor.
  - `app/pdv/page.tsx` e `app/page.tsx` (`confirmarVenda()`): passaram a mandar `produtoId` no
    corpo do `POST /api/pedidos` (antes só mandavam nome/preço/quantidade, sem link pro produto
    real) — sem isso, o backend não tinha como saber qual produto checar. "Entrada Avulsa" manda
    `servico_id: null` (produtoId sintético `avulso_...`, sem produto de catálogo de verdade).
  - `app/api/fechamento/route.ts`: removida a chamada a `gerarSaidaRecargaVemAutomatica` do
    fechamento geral — `totalSaidas` continua somando `jsgrafica_saidas` normalmente, e as saídas
    já foram geradas na hora da venda, não precisa de nenhum ajuste extra nessa soma.

- **🔴 Achado crítico, corrigido antes de qualquer teste**: adicionar `produtoId` ao corpo do
  balcão quebrou a distinção dos 2 fluxos de `POST /api/pedidos` — o branch do Inbox (demanda 045)
  é identificado só por `body.produtoId` presente, então **toda venda de balcão real teria caído
  no branch errado** (que exige `telefone`, ausente no balcão) assim que eu adicionei o campo.
  Pego no 1º teste (curl retornou "telefone e operador são obrigatórios" numa venda de balcão).
  Corrigido trocando a condição pra `body.produtoId && !body.origemBalcao` — `origemBalcao` sempre
  tem prioridade. Sem esse teste, isso teria ido pra produção quebrando toda venda de balcão.

- **Testes realizados e resultado (tudo sintético, apagado depois — nunca em cima de venda
  real):**
  - Confirmado antes de tudo: só existiam 2 pedidos reais de recarga no banco (1 Recarga vem,
    07-07-26; 1 Recarga vem, 06-07-26), ambos já com `saida_vinculada_id` preenchido pelo
    mecanismo antigo (079) — zero risco de duplicar em cima de dado real, e zero pedido de Recarga
    Celular já existia (confirma que essa categoria nunca foi coberta antes).
  - Recarga VEM 1x (R$12,50): saída gerada, valor R$10,00 (12,50 − 2,50), `categoria_id:
    'recarga_vem'`. ✓
  - Recarga Celular 1x (R$20,00): saída gerada, valor R$17,50, `categoria_id: 'recarga_cel'` —
    **primeira vez que essa categoria gera repasse automático**. ✓
  - Recarga VEM 2x (R$25,00 total): saída R$20,00 (25 − 2×2,50) — confirma a matemática por
    quantidade, não só por pedido. ✓
  - Produto sem o flag (SCANNER, R$0,70): `servico_id` gravado, `saida_vinculada_id` continua
    `null` — nenhuma saída gerada. ✓
  - "Entrada Avulsa" (produtoId sintético `avulso_...`): `servico_id: null`, sem erro, sem saída.
    ✓
  - Venda "aguardando retirada" → depois `PATCH` pra "entregue": saída só é gerada no momento do
    `PATCH`, não na criação — confirmado (`saida_vinculada_id` nulo logo após o `POST`, populado
    só depois do `PATCH`, com `data_dia` do dia real da entrega, não da criação). ✓
  - `PATCH` duplicado no mesmo pedido já entregue: **não gerou uma 2ª saída** (guarda de
    `saida_vinculada_id` já preenchido funcionou) — total de saídas de teste ficou em 4, exatamente
    o esperado (as 4 vendas que deveriam gerar, nenhuma a mais). ✓
  - **Teste real via UI** (não só `curl`): login admin, Pedidos Balcão → Recarga VEM 12,50 →
    Confirmar Venda → Confirmar — saída gerada certinha (R$10,00, `recarga_vem`), confirmando que
    o carrinho de verdade manda `produtoId` corretamente, não só chamadas diretas de API.
  - Fechamento geral: **não testado ao vivo** (rodar de verdade fecharia o caixa real de hoje,
    fora do escopo de um teste) — verificado por leitura de código que a chamada antiga foi
    removida e que `getResumoDia`/`totalSaidas` já soma `jsgrafica_saidas` direto da tabela, sem
    depender de nenhuma lógica adicional pras saídas novas (elas já estão na tabela quando o
    fechamento roda).
  - Todos os 6 pedidos e as 4 saídas de teste apagados depois — confirmado via SQL que não sobrou
    nenhum rastro (`count = 0` pros 2).
  - `npx tsc --noEmit` e `npm run build` limpos (2x — antes e depois da correção do achado
    crítico).

- **Status final:** concluída e em produção (`dpl_DdfWsV99AQMEDptvPL4hjGbeBLn3`), deployada depois
  da confirmação explícita do Edvam. Mecanismo agregado da 079 completamente removido (não só
  desativado) — não sobrou nenhum call site nem função morta. Próxima venda de recarga (ou
  qualquer produto futuro marcado `gera_saida_automatica`) já gera o repasse na hora.
