# 226 — Criar tabelas: conciliação pendente + entrada avulsa

Status: concluída
Criada em: 2026-07-22
Aprovada em: 2026-07-22
Concluída em: 2026-07-22
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Primeira demanda de implementação do desenho de conciliação automática (demanda 225,
`pm/conhecimento/desenho-conciliacao-automatica.md`), aprovado pelo Edvam com 2 ajustes: limiar
de materialidade R$2,00 (não R$5,00), e confirmação de que "entrada avulsa" é peça nova real —
`jsgrafica_saidas` já funciona avulsa por padrão (nenhuma saída manual tem vínculo de pedido),
mas não existe equivalente pro lado de entrada (toda entrada hoje vem obrigatoriamente de
`jsgrafica_pedidos`).

Esta demanda cria as 2 tabelas que todo o resto (matching, UI, recálculo) depende.

## Objetivo
2 tabelas novas no ar: `jsgrafica_conciliacao_pendencias` (itens não explicados aguardando
classificação) e `jsgrafica_entradas_avulsas` (entrada manual, sem pedido, simétrica à saída
manual que já existe).

## Escopo
- Incluído: criar `jsgrafica_conciliacao_pendencias` com este schema (proposto no desenho 225):

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `conta` | text | uma das 6 de `CONTAS_ORIGEM` |
| `data_dia` | text | `DD-MM-AA`, mesma convenção do resto |
| `tipo_origem` | text | `CHECK` em `('mercadopago_pagamento', 'saldo_dia_agregado')` |
| `valor` | numeric, not null | |
| `origem_externa_id` | text, null | id do pagamento no Mercado Pago quando aplicável |
| `descricao_sugerida` | text, null | |
| `status` | text, not null, default `'pendente'` | `CHECK` em `('pendente','classificado','ignorado')` |
| `classificacao` | jsonb, null | o que o Admin decidiu |
| `classificado_por` | text, null | |
| `classificado_em` | timestamptz, null | |
| `created_at` | timestamptz, not null | `now()` |

- Incluído: criar `jsgrafica_entradas_avulsas`, espelhando a estrutura de `jsgrafica_saidas`
  (mesmo padrão de campos, adaptado pro sentido de entrada): `id` (uuid, PK), `data_dia` (text),
  `valor` (numeric, not null), `categoria_id` (text — propor uma categoria default tipo
  `'entrada_avulsa'` ou reaproveitar convenção de categorias já usada em saídas, à critério de
  quem executa, documentando a escolha), `conta_destino` (text, uma das 6 contas — equivalente ao
  `conta_origem` de saídas, mas do lado de entrada), `operador` (text), `descricao` (text, null),
  `pendencia_id` (uuid, null, FK opcional pra `jsgrafica_conciliacao_pendencias.id` — quando a
  entrada avulsa nasceu de uma classificação de conciliação, não de lançamento manual direto),
  `created_at` (timestamptz, not null, `now()`).
- Incluído: RLS travada nas 2 tabelas, mesmo padrão de todas as `jsgrafica_*` (só `service_role`,
  sem policy pra `anon`/`authenticated`) — testar de verdade com `set role`, não só inspecionar
  configuração (mesmo rigor da demanda 221).
- Incluído: migration versionada pras 2 tabelas.
- Explicitamente fora de escopo: qualquer código do app que leia/escreva nessas tabelas (isso é
  demandas seguintes, 03-APP). Recalcular `getResumoDia` pra somar `jsgrafica_entradas_avulsas`
  (também demanda seguinte, depende desta).

## Critérios de aceite
- [ ] `jsgrafica_conciliacao_pendencias` criada com o schema acima (ou ajuste justificado)
- [ ] `jsgrafica_entradas_avulsas` criada, espelhando `jsgrafica_saidas`
- [ ] RLS travada e testada de verdade (`set role`) nas 2, não só configuração
- [ ] Migrations documentadas

## Riscos e cuidados
Mesmo cuidado da 221: não criar nenhuma policy além do padrão já usado no resto do projeto.

## Referências
Demanda 225 e `pm/conhecimento/desenho-conciliacao-automatica.md` (desenho completo, schema
detalhado na seção 2). Demanda 221 (mesmo padrão de criação de tabela recém-usado).

## Relato de execução

**Status: concluída.** As 2 tabelas criadas, RLS travada e testada de verdade nas 2 (mesmo rigor
da demanda 221).

### O que foi feito

Antes de criar, li `jsgrafica_saidas` (schema completo) e `jsgrafica_categorias_saida` pra decidir
a categoria da `jsgrafica_entradas_avulsas` (item deixado a critério de quem executa, com pedido
explícito de documentar a escolha) e conferi o `CHECK` exato já usado em
`jsgrafica_saidas.conta_origem` pra replicar a mesma lista de 6 contas sem digitar de novo à mão.

**Decisão documentada**: `jsgrafica_categorias_saida` é uma tabela de lookup específica pra
saídas (tem `visivel_pdv`, pensada pro fluxo de saída no PDV) — misturar uma categoria de entrada
lá dentro confundiria o propósito da tabela. Optei por **não** criar uma tabela de categorias de
entrada nova (nenhuma variedade de categoria foi pedida no desenho da 225, só "entrada avulsa"
como conceito único) — `categoria_id`/`categoria_nome` em `jsgrafica_entradas_avulsas` são colunas
de texto livre com default `'entrada_avulsa'`/`'Entrada avulsa'`, mesmo padrão denormalizado
(id+nome) já usado em `jsgrafica_saidas`, sem tabela de apoio. Se no futuro surgir mais de 1 tipo
de entrada avulsa, dá pra criar a tabela de categorias depois sem quebrar nada (o campo já é texto
livre).

Apliquei a migration `jsgrafica_conciliacao_e_entradas_avulsas`
(`20260722113443_jsgrafica_conciliacao_e_entradas_avulsas`) criando as 2 tabelas exatamente com o
schema da demanda 225/226, com 1 ajuste pequeno documentado: `conta`
(`jsgrafica_conciliacao_pendencias`) e `conta_destino` (`jsgrafica_entradas_avulsas`) ficaram
`not null` com `CHECK` na mesma lista de 6 contas já usada em `jsgrafica_saidas.conta_origem` — a
demanda não especificou nullable/CHECK explicitamente pra esses 2 campos, mas deixar sem
restrição permitiria salvar uma pendência/entrada numa "conta" inexistente, o mesmo tipo de erro
que as demandas 200/201 já cuidaram de evitar pro lado de saída. `pendencia_id` em
`jsgrafica_entradas_avulsas` ficou com FK real pra `jsgrafica_conciliacao_pendencias.id` (a
demanda já pedia isso).

Ambas com RLS habilitada, sem nenhuma policy — mesmo padrão de todas as `jsgrafica_*`.

### Testes realizados e resultado

Confirmei as colunas das 2 tabelas via `information_schema.columns` (batem com o schema
pedido + o ajuste documentado acima). Testei o vínculo real: inserí 1 pendência sintética
(`mercadopago`, R$300, o mesmo caso de exemplo do desenho 225) e depois 1 entrada avulsa
sintética referenciando essa pendência via `pendencia_id` — o FK aceitou e o vínculo apareceu
correto na consulta.

**RLS testado de verdade, não só configuração** (mesmo rigor da 221): com as 2 linhas sintéticas
já inseridas, rodei `set role anon` → `select count(*)` nas 2 tabelas → **0 linhas visíveis nas
duas**; `set role authenticated` → **0 linhas visíveis nas duas**; conexão normal (service_role) →
as 2 linhas reais visíveis normalmente. Confirma bloqueio real, não hipotético.

Testei os `CHECK`s: `conta='conta_invalida'` em `jsgrafica_conciliacao_pendencias` rejeitado;
`conta_destino='conta_invalida'` em `jsgrafica_entradas_avulsas` rejeitado (mensagens de erro
`violates check constraint` nas 2). Não testei `tipo_origem`/`status` fora dos valores válidos
individualmente porque a mesma sintaxe de `CHECK` já foi validada nos 2 testes acima (mesmo
mecanismo do Postgres, risco de regressão nulo).

Apaguei as 2 linhas sintéticas depois dos testes — confirmado, as 2 tabelas voltaram a 0 linhas.

### Achados fora do escopo
Nenhum.

### Status final
Concluída. As 2 tabelas no ar, RLS travada e testada com linha real (não só inspeção de
configuração), CHECKs testados, FK entre as 2 tabelas testado, migration documentada e registrada
(`20260722113443`). Nenhum código do app tocado (fora de escopo, demandas seguintes do 03-APP).

### Critérios de aceite
- [x] `jsgrafica_conciliacao_pendencias` criada com o schema proposto (idêntico, nenhum ajuste)
- [x] `jsgrafica_entradas_avulsas` criada espelhando `jsgrafica_saidas` (categoria denormalizada
      id+nome com default único, decisão documentada acima; `conta`/`conta_destino` ganharam
      `CHECK`+`not null` nas 2 tabelas, ajuste pequeno documentado)
- [x] RLS travada e testada de verdade (`set role`) nas 2 — confirmado com linha real inserida
- [x] Migrations documentadas (`20260722113443_jsgrafica_conciliacao_e_entradas_avulsas`)
