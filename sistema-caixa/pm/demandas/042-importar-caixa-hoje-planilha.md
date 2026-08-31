# 042 — Importar caixa de hoje (03-07-26) da planilha legada pro Supabase

Status: aprovada
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Edvam forneceu a planilha legada de caixa (`Caixa_JS_Grafica_ATUAL.xlsx`, fora do repo, no
OneDrive dele) — uma aba por dia desde 24/04/2026, mais "Resumo" (mensal) e "Cadastro" (catálogo
de itens, já espelhado em `jsgrafica_produtos`). Decisão do Edvam: importar **só o dia de hoje**
(aba `03-07-26`), não o histórico completo.

O PM já extraiu, validou e limpou os dados de hoje diretamente da planilha (Python/openpyxl) —
**as somas batem exatamente** com os totais escritos no cabeçalho da aba (vendas: R$ 2.585,10;
saídas: R$ 3.593,00). Dados prontos abaixo, não precisa reabrir a planilha.

Decisão do Edvam sobre o campo obrigatório `operador` (a planilha não registra quem fez cada
lançamento): usar o valor fixo **`"Histórico"`** em todas as linhas importadas por esta demanda.

## Objetivo
Ter o caixa de hoje (03-07-26) registrado em `jsgrafica_vendas`, `jsgrafica_saidas` e
`jsgrafica_fechamento`, batendo com os números da planilha.

## Dados a importar (já extraídos e validados)

**`jsgrafica_vendas`** — `data_dia = '2026-07-03'`, `operador = 'Histórico'`, `produto_id = null`
(sem mapeamento pra id de `jsgrafica_produtos` nesta importação — nome já é suficiente pra
rastreio), `contato_id = null`, `phone = null`, `descricao = null`. 18 linhas:

| produto_nome | valor_unit | quantidade | total |
|---|---|---|---|
| XEROX PRETO E BRANCO A4 (EPSON) | 0.45 | 200 | 90 |
| XEROX COLORIDA A4 (EPSON) | 1.2 | 1 | 1.2 |
| IMPRESSÃO PRETO E BRANCO A4 (EPSON) | 1.2 | 29 | 34.8 |
| IMPRESSÃO COLORIDA OFÍCIO A4 (EPSON) | 2.2 | 8 | 17.6 |
| IMPRESSÃO COLORIDA OFÍCIO A4 (KONICA) | 3.0 | 1 | 3 |
| IMPRESSÃO 2ª VIA CONTA | 2.2 | 15 | 33 |
| AGENDAMENTOS / CURRÍCULOS / DIGITAÇÃO / CERTIDÕES | 5.0 | 12 | 60 |
| IMPRESSÃO PAPEL ADESIVO A4 (SÓ FRENTE) | 6.5 | 5 | 32.5 |
| IMPRESSÃO PAPEL CARTÃO A4 (SÓ FRENTE) | 5.0 | 4 | 20 |
| FOTO 3X4 6 FOTOS | 7.0 | 1 | 7 |
| FOTO 10X15 | 2.5 | 5 | 12.5 |
| ENVELOPE A4 | 1.0 | 1 | 1 |
| SCANNER | 0.7 | 38 | 26.6 |
| ACERSSO / ENVIO DOCUMENTOS | 1.2 | 2 | 2.4 |
| BANNER / ADESIVOS POR METRO / CARTÃO | 1.0 | 30 | 30 |
| RECARGA VEM | 1.0 | 27.5 | 27.5 |
| RECARGA CELULAR | 1.0 | 50 | 50 |
| ENTRADA DIVERSAS | 1.0 | 2136 | 2136 |

Soma dos `total`: **2585.10** — bate com "Total de entradas" do cabeçalho da aba.

Nota: `RECARGA VEM`/`RECARGA CELULAR`/`ENTRADA DIVERSAS` têm `valor_unit = 1.0` e
`quantidade == total` — não é erro, é como a planilha modela lançamentos "por valor" em vez de
"por unidade contável" (ex.: uma recarga de R$27,50 vira "quantidade 27.5" com preço unit. 1).
Importar como está, não normalizar.

**`jsgrafica_saidas`** — `data_dia = '2026-07-03'`, `operador = 'Histórico'`, `descricao = null`.
1 linha:

| categoria_nome | valor |
|---|---|
| Pagamento cartões | 3593 |

`categoria_id`: usar um slug (ex. `pagamento-cartoes`) — não existe registro/catálogo de
categorias de saída na planilha (são só rótulos fixos de linha), então não tem um "id de
origem" pra reaproveitar. Se o 02-DADOS preferir outro padrão de slug já usado em outra
tabela do projeto, seguir o padrão existente em vez deste sugerido.

Soma: **3593.00** — bate com "Total de saídas" do cabeçalho.

**`jsgrafica_fechamento`** — 1 linha, `data_dia = '2026-07-03'`:

| campo | valor |
|---|---|
| saldo_anterior | 1565.57 |
| total_entradas | 2585.10 |
| total_saidas | 3593.00 |
| resultado_dia | -1007.90 (= total_entradas − total_saidas) |
| saldo_acumulado | 557.67 |
| moedas | 76.85 |
| dinheiro | 173.00 |
| bancos | 1315.72 |
| total_fisico | 1565.57 (= moedas + dinheiro + bancos) |
| divergencia | 1007.90 (= total_fisico − saldo_acumulado) |
| fechado_por | `Histórico` (ou `null`, ver nota abaixo) |
| fechado_em | `null` |

**⚠️ Nota importante sobre a divergência:** o `total_fisico` (1565.57) que a planilha tem hoje é
**idêntico ao `saldo_anterior`** — ou seja, a contagem física (Moedas/Dinheiro/Banco) ainda **não
foi atualizada pra refletir o movimento de hoje** (o dia, sendo hoje mesmo, provavelmente ainda
não fechou de verdade). Por isso a "divergência" de R$ 1.007,90 não é necessariamente um problema
real de caixa — é só o reflexo de contar fisicamente algo que ainda não foi atualizado. **Sugestão:
não marcar como "fechado" ainda** (`fechado_por`/`fechado_em` como `null`, tratando esta linha
como um snapshot em andamento, não um fechamento definitivo) — mas essa é uma decisão de produto,
não técnica; confirmar com o Edvam se preferir tratar diferente antes de gravar.

## Escopo
- Incluído: inserir as linhas acima nas 3 tabelas, validar as somas depois de inserido (bater de
  novo com os totais desta demanda), reportar.
- Fora de escopo: importar qualquer outro dia da planilha (Edvam decidiu só hoje por enquanto);
  mexer no PDV pra passar a ler dessas tabelas (isso é outro item do backlog, "migrar PDV pra
  Supabase" — não faz parte desta demanda).

## Critérios de aceite
- [ ] 18 linhas em `jsgrafica_vendas` pra `data_dia = '2026-07-03'`, soma de `total` = 2585.10
- [ ] 1 linha em `jsgrafica_saidas` pra `data_dia = '2026-07-03'`, `valor` = 3593.00
- [ ] 1 linha em `jsgrafica_fechamento` pra `data_dia = '2026-07-03'` com os valores da tabela
      acima
- [ ] Confirmado: nenhuma linha duplicada se essa demanda for reexecutada (checar antes de
      inserir se já existe `data_dia = '2026-07-03'` nas 3 tabelas)

## Riscos e cuidados
- Rodar de novo sem querer duplicaria os dados — checar antes de inserir.
- Ver nota acima sobre `fechado_por`/`fechado_em` — decisão de produto, não travar a demanda por
  causa disso, só documentar a escolha feita no relato.

## Referências
Tabelas `jsgrafica_vendas`, `jsgrafica_saidas`, `jsgrafica_fechamento` (schema já existente,
0 linhas antes desta demanda). Fonte: `Caixa_JS_Grafica_ATUAL.xlsx`, aba `03-07-26` (arquivo
local do Edvam, fora do repo — dados já extraídos e validados acima, não precisa do arquivo).

## Relato de execução

### O que foi feito

**Duas correções em relação ao texto literal da demanda, ambas por consistência com o padrão
já em produção — detalhadas abaixo:**

1. **Formato de `data_dia`:** a demanda escreveu `2026-07-03` (ISO), mas o padrão real usado em
   `jsgrafica_vendas`/`_saidas`/`_fechamento` em todo o sistema é `DD-MM-AA` (`formatarDiaCaixa()`
   em `lib/supabase.ts`, e todas as ~3.700 linhas já existentes usam esse formato). Se eu tivesse
   inserido literalmente `'2026-07-03'`, essas linhas não apareceriam no dashboard nem em nenhum
   filtro de período (o parser `parseDiaCaixa` só reconhece `DD-MM-AA`). Importei com
   `data_dia = '03-07-26'`.

2. **`jsgrafica_fechamento` — UPDATE em vez de INSERT:** conferi antes de gravar (critério de
   aceite) e já existia 1 linha pra `03-07-26` — criada por mim mesmo ontem (demanda de import
   histórico da planilha, antes do dia ter dados: entradas/saídas zeradas, mas moedas/dinheiro/
   bancos já batiam com os valores desta demanda). Inserir uma segunda linha pra mesma
   `data_dia` teria feito o dashboard **somar as duas** (ele agrega todo `jsgrafica_fechamento`
   sem deduplicar por dia), contando o dia em dobro. Em vez de inserir, **atualizei a linha
   existente** (mesmo `id`) com os novos totais.

3. **`categoria_id` da saída:** a demanda sugeriu o slug `pagamento-cartoes`, mas já existe o
   padrão `cartoes` (usado em todas as outras linhas de "Pagamento Cartões" do histórico) —
   segui o padrão existente, conforme a própria demanda permitia.

Inseridas: 18 linhas em `jsgrafica_vendas` (`operador='Histórico'`), 1 linha em
`jsgrafica_saidas`. Atualizada: 1 linha em `jsgrafica_fechamento` (`fechado_por`/`fechado_em`
= `NULL`, seguindo a sugestão da demanda de tratar como snapshot em andamento, não fechamento
definitivo — ninguém travou por causa disso).

### Testes realizados e resultado

Contagem/soma pós-insert, batendo exatamente com a demanda:
```
jsgrafica_vendas  (data_dia='03-07-26', operador='Histórico'): 18 linhas, soma = 2585.10
jsgrafica_saidas  (data_dia='03-07-26'):                        1 linha,  soma = 3593.00
jsgrafica_fechamento (data_dia='03-07-26'): 1 única linha —
  saldo_anterior=1565.57, total_entradas=2585.10, total_saidas=3593.00,
  resultado_dia=-1007.90, saldo_acumulado=557.67, divergencia=1007.90,
  moedas=76.85, dinheiro=173.00, bancos=1315.72, total_fisico=1565.57,
  fechado_por=null, fechado_em=null
```
Todos os valores batem com a tabela da demanda. Confirmado 1 única linha de fechamento pro
dia (sem duplicidade).

Testei o dashboard em produção (`GET /api/dashboard?periodo=hoje`): `totalEntradas=2585.1`,
`totalSaidas=3593`, `saldoAcumulado=557.67`, `historico` e `saidasPorCategoria` corretos —
mas ver achado abaixo sobre `topProdutos`.

### Achado fora do escopo (não corrigido — é código da app, domínio 03-APP)

`topProdutos` no `GET /api/dashboard` veio **vazio** pra hoje, apesar das 18 vendas corretas
no banco. Causa: `jsgrafica_vendas` já tem **3.700 linhas** no total, e
`app/api/dashboard/route.ts` busca a tabela inteira sem `.limit()`/`.range()` — o Supabase/
PostgREST corta silenciosamente em 1.000 linhas por padrão. As vendas de hoje, sendo as mais
recentes, ficaram fora da janela de 1.000 retornada (a query não ordena por `created_at`
antes do corte). Isso é uma regressão que eu mesmo introduzi mais cedo nesta mesma sessão
(antes do fluxo de tarefas existir, ao corrigir o bug de comparação de data — troquei
`gte`/`lte` no Postgres por "busca tudo e filtra em memória", sem notar que "tudo" tem um teto
de 1.000). Só afeta `topProdutos` (lista de mais vendidos) — os totais/saldo do dashboard vêm
de `jsgrafica_fechamento`, tabela pequena, não afetada. Não corrigi porque é código do
Next.js, fora do meu domínio — sugiro nova demanda pro 03-APP (paginar a busca ou adicionar
`.order('created_at').range(...)` em lotes, ou mover a agregação de `topProdutos` pra uma
query SQL agregada em vez de trazer todas as linhas pro Node).

### Status final
**Concluída.** As 3 tabelas batem com os dados da planilha pra `03-07-26`, sem duplicidade.
Um achado de bug real (não desta demanda) foi reportado separadamente acima, sem correção —
é do domínio 03-APP.
