# 217 — Corrigir saldo_acumulado travado de 10/07 e propagação até 16/07

Status: concluída
Criada em: 2026-07-18
Aprovada em: 2026-07-18
Concluída em: 2026-07-18
Chat executor: 03 - APP JS GRAFICA

## Contexto
As demandas 215 e 216 confirmaram, de forma independente e cruzada com dado real do Mercado
Pago, que existe exatamente 1 erro de cálculo real em todo o histórico de fechamento "Sistema":
o dia 10-07-26 (linha `id cdb0acd4-09a4-4b23-ac48-824d937d6135`) teve `saldo_acumulado` gravado
como 424,41, mas a fórmula (`saldo_anterior + resultado_dia`) dá 306,84 — diferença de R$117,57.

Causa confirmada: a saída de R$1.915 (`id 485fd0e1-2193-4522-adbb-41ae19989301`, pagamento de
cartão do Mercado Pago) foi lançada retroativamente em 2026-07-12 18:09:22, **11 segundos depois**
do fechamento daquele dia já ter sido gravado (`fechado_em` 2026-07-12 18:09:11). O
`total_saidas`/`resultado_dia` da linha já foram atualizados corretamente pra refletir essa
saída, mas o `saldo_acumulado` nunca foi recalculado em cima do `resultado_dia` novo — ficou
congelado no valor de antes.

Como `saldo_acumulado` de um dia vira `saldo_anterior` do dia seguinte, esse erro de R$117,57 já
se propagou, sem mudar de valor, pelos fechamentos de 13, 14, 15 e 16/07 (confirmado por cálculo
direto nas 4 linhas). 06/07 e 08/07 também têm dessincronia entre `saldo_anterior+resultado_dia` e
`saldo_acumulado`, mas são casos **já conhecidos e explicados** (demandas 090 e 131 — 06/07 é um
ponto de ancoragem intencional, 08/07 já bate com o físico contado por 4 contas reais) — não
tocar nesses dois.

Único bug real confirmado, com causa raiz identificada e verificada de duas formas
independentes (215 e 216). Nenhuma outra linha de fechamento "Sistema" em todo o histórico tem
esse tipo de dessincronia.

## Objetivo
`saldo_acumulado` de 10, 13, 14, 15 e 16/07 volta a bater com a fórmula
(`saldo_anterior + resultado_dia`), corrigindo a divergência de cada uma dessas 5 linhas em
cascata (nenhum outro campo muda — `total_entradas`, `total_saidas`, `resultado_dia` e
`total_fisico` de cada linha permanecem exatamente como estão).

## Escopo
- Incluído: `UPDATE` em `jsgrafica_fechamento`, só nos campos `saldo_anterior`,
  `saldo_acumulado` e `divergencia` (recalculado como `total_fisico - saldo_acumulado` novo),
  nas 5 linhas abaixo, exatamente com estes valores:

| id | data_dia | saldo_anterior novo | saldo_acumulado novo | divergencia nova |
|---|---|---|---|---|
| `cdb0acd4-09a4-4b23-ac48-824d937d6135` | 10-07-26 | 2213.89 (sem mudança) | 306.84 | 126.76 |
| `2d1aa50b-366a-4693-934f-dfc1fdb0c766` | 13-07-26 | 306.84 | 731.75 | 97.15 |
| `0b374e50-38b7-40b5-a726-d94fc34eb5e0` | 14-07-26 | 731.75 | 777.04 | 157.14 |
| `ece0ae78-29d5-40cc-8128-e978b1296a06` | 15-07-26 | 777.04 | 128.08 | 253.29 |
| `6465453d-52b9-48b1-bec4-c7ddd09a7ae2` | 16-07-26 | 128.08 | 260.75 | 168.40 |

  Antes de aplicar, recalcular cada linha ao vivo direto da tabela (`saldo_anterior + resultado_dia`,
  e `divergencia = total_fisico - saldo_acumulado`) e conferir que bate exatamente com a tabela
  acima — se não bater, PARAR e reportar a diferença antes de aplicar qualquer UPDATE.
- Incluído: confirmar que 09-07-26 (antes da cadeia) e 17-07-26 (sem fechamento "Sistema" gravado
  ainda) não precisam de nenhuma alteração.
- Incluído: quando o fechamento "Sistema" de 17-07-26 for gravado no futuro (fora do escopo desta
  demanda, só um alerta pro executor confirmar), o `saldo_anterior` correto a usar é 260,75 (o
  `saldo_acumulado` novo de 16/07), não 378,32.
- Explicitamente fora de escopo: 06/07 e 08/07 (dessincronia conhecida, não é bug, não tocar).
  Qualquer saída, pedido, transferência ou fechamento por operador individual (Zu/Gabi) — não são
  afetados por esta correção, já estão corretos.

## Critérios de aceite
- [x] As 5 linhas recalculadas ao vivo batem exatamente com a tabela do escopo antes do UPDATE
- [x] `UPDATE` aplicado só nos 3 campos (`saldo_anterior`, `saldo_acumulado`, `divergencia`) das
      5 linhas, nenhum outro campo tocado
- [x] Conferido depois do UPDATE: `SELECT` das 5 linhas mostrando os valores novos gravados
- [x] Confirmado que 06/07, 08/07, 09/07 continuam com os valores originais (sem mudança)

## Riscos e cuidados
Aplicar os 5 UPDATEs em sequência (10→13→14→15→16), um de cada vez, conferindo o resultado antes
de seguir pro próximo — a cadeia depende do anterior estar certo. Não usar transação única sem
conferência intermediária, dado o histórico de erros em correções em cascata nesta mesma semana.

## Referências
Demandas 215 e 216 (`pm/conhecimento/mapeamento-repasses-fantasma-e-fechamentos-
dessincronizados.md`, `pm/conhecimento/planilha-entradas-saidas-saldo-por-conta.md`) e a
investigação bruta isolada (`pm/conhecimento/investigacao-bruta-isolada-09-18-07.md`), que
confirmam a mesma causa e o mesmo valor de forma independente. Demandas 090 e 131 (casos de 06/07
e 08/07, não tocar).

## Relato de execução

- **O que foi feito**: recalculei ao vivo, direto da tabela `jsgrafica_fechamento`, as 8 linhas
  "Sistema" de 06/07 a 16/07 (`saldo_anterior + resultado_dia` vs `saldo_acumulado` gravado). As 5
  linhas do escopo (10, 13, 14, 15, 16/07) bateram EXATAMENTE com a tabela fornecida na demanda,
  centavo a centavo, antes de qualquer UPDATE. Apliquei os 5 `UPDATE`s em sequência estrita
  (10→13→14→15→16), um de cada vez, conferindo o `RETURNING` de cada um contra o valor esperado
  antes de seguir pro próximo — nenhum apoiado em transação única, exatamente como o risco da
  demanda pedia. Cada UPDATE tocou só `saldo_anterior`, `saldo_acumulado` e `divergencia`;
  `total_entradas`, `total_saidas`, `resultado_dia` e `total_fisico` de todas as 5 linhas
  permaneceram intocados (nem apareceram no `SET`).
- **Testes realizados e resultado**: `SELECT` final das 8 linhas (06 a 16/07) com o cálculo
  `saldo_anterior + resultado_dia` ao lado do `saldo_acumulado` gravado — confirmado: 10, 13, 14,
  15 e 16/07 agora batem exatamente (diferença zero); 06/07 e 08/07 continuam com a mesma
  dessincronia conhecida de antes (090/131, não tocados, confirmado que os valores originais
  permanecem idênticos); 09/07 já batia antes e continua batendo, sem nenhuma mudança. Conferido
  também que 17-07-26 ainda não tem fechamento "Sistema" gravado (só Zu e Gabi fecharam a própria
  gaveta até agora) — nada a fazer ali agora; quando o fechamento geral desse dia for gravado, o
  mecanismo já existente de `saldo_anterior` (lê o `saldo_acumulado` da última linha "Sistema")
  vai puxar automaticamente o valor novo de 16/07 (260,75), sem precisar de nenhum código novo —
  só um alerta, como a própria demanda pedia, não uma tarefa de implementação.
- **Achados fora do escopo**: nenhum. A causa raiz já vinha identificada e confirmada por duas
  investigações independentes (215/216) antes desta demanda; não precisei investigar nada novo,
  só executar a correção com a conferência pedida.
- **Status final**: concluída. As 5 linhas corrigidas, cadeia 09→16/07 inteira consistente
  (`saldo_anterior + resultado_dia = saldo_acumulado` bate em todas), 06/07 e 08/07 preservados
  como estavam.
