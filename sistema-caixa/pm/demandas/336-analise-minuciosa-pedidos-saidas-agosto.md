# 336 - Análise minuciosa de pedidos e saídas de agosto/2026 (aprofunda a 335)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 05 - FINANCEIRO JS GRAFICA

A 335 respondeu entrada/saída/lucro agregado do mês e achou a causa raiz da divergência (tela
desatualizada, não dinheiro sumido). O Edvam viu os números e disse que ainda não é o bastante
pra entender o negócio de verdade — precisa de granularidade por pedido/produto e por tipo de
saída, não só o agregado.

## Objetivo
Produzir uma análise minuciosa, com dado real (mesma disciplina da 335: SQL direto contra as
tabelas fonte, nada herdado de tela), respondendo:

1. **Quantos pedidos foram gerados em agosto/2026** (01-27/08), contagem real.
2. **Receita total dos pedidos**, quebrada por produto/categoria (não só o agregado que a 335 já
   deu).
3. **Custo dos pedidos**, especialmente itens de **alto volume e baixo lucro** — nomeadamente
   recargas (VEM/celular): quanto foi vendido em volume de recarga, qual a margem real por
   recarga (preço de venda menos custo de recarregar), e como isso pesa no total comparado com
   serviços de impressão de margem maior.
4. **Saídas do dia a dia**, agrupadas: quais se repetem (mesma categoria/descrição recorrente,
   ex. aluguel, energia, liquidação de cartão) e a soma de cada grupo recorrente no mês, separado
   de saídas pontuais/não recorrentes.
5. Qualquer outro corte de dado relevante que emergir da investigação (o Edvam pediu "tudo que
   puder ser gerado de dados em relação a isso").

## Escopo
- Incluído: agosto/2026 até 27/08, quebra por pedido/produto/categoria e por saída
  recorrente/pontual.
- Explicitamente fora de escopo: corrigir qualquer coisa (é levantamento, igual a 335); a
  reconciliação linha a linha do extrato do Mercado Pago (já descartada como fora de escopo na
  335, continua assim).

## Riscos e cuidados
Não alterar nenhum dado. Toda conclusão numérica com a query/evidência que a sustenta, mesmo
padrão rigoroso da 335.

## Referências
`pm/demandas/335-auditoria-financeira-agosto-2026.md` (base desta), `jsgrafica_pedidos`
(`produto_id`/`quantidade`/`valor_total`/`forma_pagamento`), `jsgrafica_produtos` (custo/preço se
existir campo de custo), `jsgrafica_saidas` (`categoria_id`/`descricao`/`valor`).

## Relato de execução

Mesma disciplina da 335: SQL direto contra `jsgrafica_pedidos`/`_produtos`/`_saidas`, nada
herdado de tela pronta. Período: 01-27/08/2026.

### 1. Quantos pedidos foram gerados

| Situação | Qtd | Valor |
|---|---|---|
| Total criados no período | **1.854** | — |
| Confirmados (pagos, não cancelados) | 1.758 | R$14.175,14 (bate com a 335) |
| Cancelados | 75 (4,0% do total) | R$2.271,25 em pedidos que não viraram venda |
| Aguardando pagamento (ainda em aberto) | 21 | R$399,00 |

### 2. Receita por categoria (join real `jsgrafica_pedidos.servico_id` → `jsgrafica_produtos.id`,
não por nome de texto livre)

| Categoria | Pedidos | Receita | % da receita |
|---|---|---|---|
| Impressão papel ofício (P&B, colorida, jato/laser) | 1.021 | R$3.975,30 | 28,0% |
| Venda avulsa/balcão sem produto vinculado ("Entrada diversa") | 80 | R$3.636,49 | 25,7% |
| Recarga VEM | 63 | R$2.230,00 | 15,7% |
| Recarga celular | 29 | R$825,00 | 5,8% |
| Consulta Online (currículo, antecedentes, digitação) | 107 | R$651,10 | 4,6% |
| Impressão papel foto | 90 | R$650,00 | 4,6% |
| Serviço terceirizado | 11 | R$440,00 | 3,1% |
| Xerox | 204 | R$436,35 | 3,1% |
| Impressão papel adesivo | 32 | R$384,50 | 2,7% |
| Impressão papel couchê | 18 | R$346,50 | 2,4% |
| Plastificação | 43 | R$253,00 | 1,8% |
| Impressão papel cartão | 13 | R$135,00 | 1,0% |
| Personalizados / Escritório / Encadernação | 53 | R$211,90 | 1,5% |

Maior volume de pedidos (1.021, 58% de todos os pedidos confirmados) é impressão de ofício —
ticket médio baixo (R$3,89/pedido), volume altíssimo. Segunda maior receita ("venda avulsa/
balcão") é venda de balcão sem produto do catálogo vinculado (`servico_id` nulo) — inclui as 2
vendas de balcão grandes de cartão (R$1.437,49+R$900,00) já identificadas na 335.

### 3. Custo dos pedidos — recarga (item específico pedido pelo Edvam)

**Achado de controle relevante primeiro**: `jsgrafica_produtos.preco_custo` **existe como coluna
mas está 100% vazio** — nenhum dos 100+ produtos cadastrados (nenhuma categoria) tem custo
lançado. Não existe hoje NENHUM jeito de calcular margem real por produto direto do sistema — a
única fonte de custo real disponível é a saída "Repasse Recarga VEM/Celular" (o valor que a
gráfica realmente paga pra reabastecer o RecargaPay), e só serve pra recarga, nenhum outro
serviço tem um proxy de custo equivalente.

**Margem real de recarga (mês inteiro, agregado — não é margem por transação individual, porque o
repasse é feito em lote periódico, não 1 por venda, conforme o próprio desenho do sistema)**:

| | Valor |
|---|---|
| Receita de recarga (VEM + celular, 92 pedidos) | R$3.055,00 |
| Custo real (Repasse Recarga VEM R$2.136,96 + Celular R$790,10) | R$2.927,06 |
| **Margem do mês** | **R$127,94 (≈4,2% da receita)** |

**Confirma a suspeita do Edvam com número real**: recarga é alto volume de trabalho operacional
(92 pedidos == 92 atendimentos completos: confirmar pagamento, executar a recarga manualmente,
confirmar pro cliente) pra **R$127,94 de lucro no mês inteiro** — essencialmente repasse de valor
com margem simbólica, não um produto lucrativo. Em contraste, impressão de ofício (1.021 pedidos,
R$3.975,30) não tem custo cadastrado nenhum, mas o custo real de papel+tinta por página é
centavos — mesmo sem número exato, é qualitativamente a categoria de maior margem real da
gráfica, não a de maior receita bruta.

### 4. Saídas do dia a dia — recorrente vs. pontual

| Categoria | Lançamentos | Dias distintos | Total | Natureza |
|---|---|---|---|---|
| Repasse Recarga VEM | 66 | 19 | R$2.136,96 | recorrente (quase todo dia útil) |
| Retiradas Sócios | 25 | 19 | R$1.344,89 | recorrente (quase todo dia útil) |
| Repasse Recarga Celular | 17 | 17 | R$790,10 | recorrente |
| Taxas de cartões | 38 | 19 | R$69,15 | recorrente, valor baixo |
| **Subtotal recorrente do dia a dia** | | | **R$4.341,10** | |
| Pagamento Cartões (liquidação de lote) | 3 | 3 | R$3.146,84 | periódico, mas irregular |
| Fornecedores | 18 | 12 | R$947,58 | semi-recorrente, valor variável |
| Transporte | 5 | 4 | R$103,96 | recorrente, valor baixo |
| **Subtotal periódico/semi-recorrente** | | | **R$4.198,38** | |
| Aluguéis (casa + impressora) | 2 | 2 | R$1.900,00 | fixo mensal |
| Folha de pagamento | 3 | 3 | R$1.050,00 | fixo mensal |
| Energia/Água | 1 | 1 | R$611,26 | fixo mensal |
| Telefone/Internet | 2 | 2 | R$212,68 | fixo mensal |
| MEI | 2 | 1 | R$181,76 | fixo mensal |
| **Subtotal fixo mensal** | | | **R$3.955,70** | |
| Empréstimo, Cartão Crédito, Material de expediente | 3 | 3 | R$363,67 | pontual |
| **Total (bate com a 335)** | | | **R$12.858,85** | |

Leitura: **só 1/3 da saída do mês (R$3.955,70) é custo fixo estrutural** (aluguel/folha/energia/
telefone/MEI). O maior bloco real é o giro de recarga+retirada de sócio+taxa de cartão
(R$4.341,10) — dinheiro que entra e sai quase no mesmo fluxo, não é "gasto" no sentido de custo
operacional, é repasse/distribuição. Isso é coerente com o achado do item 3: recarga move bastante
dinheiro (R$2.927,06 de saída, R$3.055,00 de entrada) sem gerar lucro relevante.

### 5. Outros cortes que apareceram

- **Taxa de cancelamento real: 4,0%** (75 de 1.854 pedidos), R$2.271,25 em pedidos que não
  viraram venda — não investigado o motivo nesta demanda (fora do escopo, é levantamento).
- **R$399,00 ainda em aberto** (21 pedidos aguardando pagamento) — não é receita perdida
  necessariamente, mas é dinheiro que pode ou não confirmar.
- **Risco de controle nomeado**: catálogo inteiro sem custo cadastrado (`preco_custo` sempre
  null) é uma lacuna real de controle — a gráfica não tem como saber a margem de nenhum produto
  além do proxy manual que fiz aqui pra recarga. Vale como sugestão de melhoria futura ao PM,
  fora do escopo de correção desta demanda.

## Fica pro PM

1. Já reportado na 335: recalcular fechamento quando conciliação classifica tarde; investigar
   fechamento "Sistema" ausente em 10/11/21-08.
2. Novo desta demanda: considerar cadastrar `preco_custo` pelo menos nas categorias de maior
   volume (impressão ofício, xerox) pra permitir cálculo de margem real por produto no futuro —
   hoje só dá pra estimar isso pra recarga, porque é a única categoria com um proxy de custo real
   (repasse) disponível no sistema.
3. Nenhum dado alterado (levantamento).
