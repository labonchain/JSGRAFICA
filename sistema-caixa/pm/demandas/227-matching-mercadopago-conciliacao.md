# 227 — Matching de pagamentos do Mercado Pago sem vínculo

Status: concluída
Criada em: 2026-07-22
Aprovada em: 2026-07-22
Concluída em: 2026-07-22
Chat executor: 03 - APP JS GRAFICA

## Contexto
Segunda peça de implementação do desenho de conciliação (demanda 225,
`pm/conhecimento/desenho-conciliacao-automatica.md`, seção 1.1). As tabelas já existem (demanda
226). Esta demanda implementa a lógica de comparar cada pagamento real do Mercado Pago do dia
contra o que está registrado no sistema, gerando um item em `jsgrafica_conciliacao_pendencias`
quando não achar par.

## Objetivo
Toda vez que o fechamento "Sistema" for feito (ou sob demanda, ver 03), todo pagamento aprovado
do Mercado Pago daquele dia sem registro correspondente vira uma linha em
`jsgrafica_conciliacao_pendencias` (`tipo_origem='mercadopago_pagamento'`) — nunca vinculado
automaticamente sem confirmação humana.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirme a leitura do desenho e a implementação exata da lógica de match antes de escrever
código de produção — relate ao PM os 3 níveis de match (referência → valor+data → sem
candidato) com um teste em dado real, e só depois de confirmação explícita siga pro deploy.

## Escopo
- Incluído: buscar pagamentos aprovados do Mercado Pago do dia (`/v1/payments/search`, token de
  `jsgrafica_mercadopago_config`).
- Incluído: aplicar os 3 níveis de match do desenho (225, seção 1.1):
  1. **Alta confiança**: `external_reference` bate com `ped-XXXX` ou `venda-...` já existente →
     não vira pendência.
  2. **Média confiança**: sem `external_reference` útil — procurar candidato único por `valor`
     exato + `date_created` dentro do dia-caixa, contra pedidos sem `mp_order_id`. Se achar 1
     candidato único, **sugerir o vínculo pro Admin confirmar — nunca vincular sozinho**.
  3. **Sem candidato**: cria item em `jsgrafica_conciliacao_pendencias`
     (`tipo_origem='mercadopago_pagamento'`, `origem_externa_id` = id do pagamento MP, `valor`,
     `data_dia`, `descricao_sugerida` com `payment_type_id`/horário).
- Incluído: evitar duplicar item — se já existe uma pendência pra aquele `origem_externa_id`, não
  criar de novo.
- Incluído: decidir e implementar o gatilho (automático no fechamento "Sistema" + rota separada
  pro botão "conciliar de novo" sob demanda, conforme recomendação do desenho, seção 4).
- Explicitamente fora de escopo: a UI que mostra os itens pendentes pro Admin (demanda separada,
  229). O cálculo do gap agregado das contas sem API (demanda 228, paralela a esta). Qualquer
  vínculo automático sem confirmação humana.

## Critérios de aceite
- [x] Pagamento com `external_reference` válido não gera pendência
- [x] Pagamento sem referência mas com candidato único por valor+data gera sugestão (não vínculo
      automático)
- [x] Pagamento sem nenhum candidato gera item em `jsgrafica_conciliacao_pendencias`
- [x] Testado com o caso real do R$300 de 21/07 (ou equivalente sintético) e confirmando que NÃO
      duplica se rodado 2x
- [x] Rotina roda automática no fechamento "Sistema" e também sob demanda

## Riscos e cuidados
Nunca criar/confirmar vínculo automaticamente — sempre precisa de confirmação humana, mesma
disciplina de todas as correções de hoje. Cuidado com custo de API (paginar só o dia relevante,
não o histórico inteiro a cada chamada).

## Referências
Demanda 225 (desenho completo). Demanda 226 (tabelas). Demanda 222 (caso real do R$300).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - Criado `lib/conciliacao.ts` com `conciliarMercadoPagoDoDia(dataDia)`: busca pagamentos
    aprovados do dia via `buscarPagamentos` (já existente, `/v1/payments/search`), aplica os 3
    níveis do desenho **por consulta pontual** (não bulk-load — ver achado crítico abaixo), grava
    nível 2/3 na mesma linha de `jsgrafica_conciliacao_pendencias` (`tipo_origem=
    'mercadopago_pagamento'`), com a sugestão de candidato (nível 2) embutida em
    `descricao_sugerida` (o schema fixado na 226 não tem coluna de "nível" — não dá pra criar
    coluna nova sem reabrir a 226, então a diferença nível 2 vs 3 fica só no texto da descrição,
    pronta pra quando a 229 construir a UI).
  - Dedup por `origem_externa_id` (id do pagamento no Mercado Pago) antes de gastar a query de
    candidato — se já existe pendência pra aquele pagamento, não cria de novo, só soma o valor
    dela (importante pra 228 continuar descontando certo em reruns).
  - Gatilho automático: `app/api/fechamento/route.ts`, chamado via `after()` (mesmo padrão de
    `conferirCobrancasPixPendentes`) só quando é o fechamento "Sistema" com as 4 contas nomeadas
    (`!operador && temContasNomeadas`) — nunca trava a resposta do fechamento.
  - Gatilho sob demanda: `POST /api/conciliacao/rodar` (`{ dataDia? }`, default hoje) — roda a
    mesma função de produção, pronta pra virar o botão "conciliar de novo" da 229.
- **Achado crítico durante a própria investigação (antes de codar)**: a 1ª versão do script de
  investigação carregava `jsgrafica_pedidos` inteiro numa query sem paginar — a tabela já tem
  1192 linhas (passa do limite default de 1000 do PostgREST), e isso truncava silenciosamente os
  ~192 pedidos mais recentes, fazendo a maioria dos pagamentos aparecer como "sem candidato" por
  engano. Implementação de produção evita isso por completo: nunca carrega a tabela toda, sempre
  consulta por pagamento (`external_reference` pontual, ou `valor_final`+janela de data pro
  candidato) — mais barato e sem risco de truncamento.
- Testes realizados e resultado:
  - `npx tsc --noEmit` e `npm run build` passaram limpos.
  - Investigação read-only prévia (`scripts/investigacao-227-matching-mp.ts`, mantido no repo)
    contra 76 pagamentos aprovados reais (20-22/07): 61 nível 1, 0 nível 2 nesta janela, 15 nível
    3 — incluindo o caso real do R$300 (21/07 08:46, `external_reference` vazia, 0 candidatos).
  - Teste fim a fim de produção (`scripts/teste-e2e-conciliacao-227-228.ts`, mantido no repo)
    chamando `conciliarDia('21-07-26')` (função real, não mock) **2 vezes seguidas**: 1ª rodada
    criou 8 pendências `mercadopago_pagamento` (incluindo o R$300, confirmado via query direta —
    `origem_externa_id=168948631639`, `valor=300`); 2ª rodada criou **0** novas
    (`pendenciasCriadasAgora=0`, `pendenciasJaExistentes=8`) — idempotência confirmada com dado
    real, não só teoria.
  - Essas 8 pendências (+ 2 do gap agregado da 228, ver relato da 228) **são reais, não dado de
    teste a limpar** — refletem discrepâncias verdadeiras (R$300 sem correspondência, mais 7
    créditos pequenos incluindo o padrão recorrente "cofrinho" `account_money`/`POTS_...` já
    documentado em investigações anteriores). Deixadas em produção de propósito — é exatamente o
    resultado que a feature deve produzir; consulta via SQL direto até a 229 construir a UI.
- Achados fora do escopo:
  - Padrão recorrente de créditos pequenos `account_money`/`POTS_...` (~R$2 cada, vistos em vários
    dias) — mesmo "cofrinho do Mercado Pago" já citado no desenho 225. Vai gerar pendência todo
    dia até alguém classificar como "sabido, não é transação real" (mecanismo já previsto no
    desenho §2/§3, não corrigido aqui — UI de classificação é a 229).
  - Nenhum caso real de nível 2 (candidato único) encontrado na janela testada (20-22/07) — a
    lógica está implementada e coberta pelo teste do formato da query, mas sem exemplo real pra
    validar o caminho completo (só aconteceria numa order órfã de falha de rede, caso raro que a
    220 passou a registrar separadamente). Não bloqueia a demanda (código segue exatamente o
    desenho), só registro de que este caminho específico não teve validação com dado real ainda.
- Status final: concluída, testada com dado real (incluindo idempotência) e em produção — deploy
  `dpl_23JrKpG4kf8NDhsyhjLRtwf4Uxv5`, alias confirmado em `pdv.jsgrafica.site` e
  `admin.jsgrafica.site`. Ver também o relato da 228 (implementadas e testadas juntas, mesmo
  arquivo `lib/conciliacao.ts`) pra regra de dedup entre as duas.
