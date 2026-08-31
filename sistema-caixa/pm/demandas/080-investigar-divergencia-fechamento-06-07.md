# 080 — Investigar divergência do fechamento de 06/07/2026 (R$18,62) e o fechamento parcial da Gabi

Status: concluída
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Edvam está fechando o caixa agora (print real, 06/07/2026 22:16) e pediu análise do dia. Números
conferidos pelo PM direto no banco, usando o dia-caixa correto (03:00 UTC de hoje → 03:00 UTC de
amanhã, ver `limitesDiaCaixaUTC()` em `lib/supabase.ts`):

**Entradas (pedidos entregues hoje) — bate exato com o print:**
- Total: R$998,49 (107 pedidos)
- Por operador: Gabi R$536,49 · Edvam R$400,50 · Zu R$61,50
- Por forma de pagamento: Dinheiro R$219,25 · Pix R$302,15 · Cartão R$71,70 ·
  **"(sem forma)" R$405,39** (quase metade do total sem forma de pagamento registrada — pedidos
  não pagos/`pagamento_confirmado: false`, provavelmente do Inbox sem confirmação ainda)

**Saídas — NÃO bate com o print:** o PM somou `jsgrafica_saidas` do dia (`data_dia = '06-07-26'`)
e achou **R$387,57** (7 linhas), mas o print mostra **R$368,65** de saídas no resumo. Diferença de
R$18,92 entre a soma real da tabela e o que a tela mostra — **precisa investigar por que o
resumo não bate com a soma da própria tabela** (pode ser um filtro de categoria excluindo algo,
ou um bug de exibição).

As 7 saídas de hoje, pra referência:
| Operador | Categoria | Valor | Descrição |
|---|---|---|---|
| Edvam | Retiradas Sócios | R$50,00 | — |
| Edvam | Retiradas Sócios | R$10,00 | Pão |
| Edvam | Repasse Recarga Celular | R$48,40 | — |
| Edvam | Taxas de cartões | R$1,75 | — |
| Edvam | Fornecedores | R$258,50 | repasse recarga vem |
| Edvam | Fornecedores | R$16,62 | **diferença de caixa** |
| Edvam | Fornecedores | R$2,30 | **diferença de caixa** |

**Achado que pode ser a causa raiz de tudo:** já existe um registro em `jsgrafica_fechamento`
pra hoje (`data_dia: '06-07-26'`), **fechado pela Gabi sozinha** às 21:16 (horário Recife), ANTES
do fechamento que o Edvam está tentando fazer agora:
```
saldo_anterior: 0, total_entradas: 536.49 (só o valor da Gabi!), total_saidas: 0,
saldo_acumulado: 536.49, dinheiro: 132, moedas: 30.75, total_fisico: 162.75,
divergencia: -373.74 (!), fechado_por: "Gabi"
```
Isso mostra que a Gabi fechou **só a parte dela** (R$536,49 esperado, mas só R$162,75 contado —
divergência enorme), possivelmente sem saber que o fechamento é pra ser um só por dia (hoje o
sistema ainda não separa por operador — isso é exatamente o problema que motivou a demanda 074).
As duas saídas de "diferença de caixa" (R$16,62 + R$2,30) parecem ter sido lançadas manualmente
depois, talvez numa tentativa de ajustar essa divergência.

## Objetivo
Entender exatamente o que aconteceu no fechamento de hoje: por que a Gabi tem um registro de
fechamento parcial e com divergência enorme, por que o resumo de saídas na tela não bate com a
soma real da tabela, e se a divergência de R$18,62 que o Edvam está vendo agora é real ou um
efeito colateral desses dois problemas.

## Escopo
- Incluído:
  1. Confirmar por que `total_saidas` no resumo (R$368,65) não bate com a soma real de
     `jsgrafica_saidas` do dia (R$387,57) — checar a query/lógica exata usada no resumo.
  2. Entender o registro de fechamento da Gabi (id `bfb084f3-6404-4f0f-be2f-fd74a426dedd`) — foi
     um fechamento de teste, um engano, ou ela realmente fechou só a parte dela sem saber que
     afeta o dia inteiro? Perguntar à Gabi se necessário.
  3. Recalcular a divergência real do dia inteiro (todos os operadores, saídas corretas) e
     comparar com os R$18,62 que aparecem pro Edvam agora.
  4. Reportar pro PM/Edvam antes de qualquer correção no banco — não ajustar nada sem confirmar o
     entendimento primeiro.
- Fora de escopo: implementar a separação de fechamento por operador (isso é a demanda 074, já em
  execução pelo 03-APP) — aqui é só diagnóstico do dia de hoje.

## Critérios de aceite
- [ ] Explicação clara da diferença entre R$387,57 (soma real) e R$368,65 (mostrado na tela)
- [ ] Explicação do fechamento parcial da Gabi e se ele deve ser corrigido/removido
- [ ] Divergência real do dia recalculada e reportada ao PM

## Riscos e cuidados
Não mexer em nenhum registro de `jsgrafica_fechamento` ou `jsgrafica_saidas` sem confirmar com o
PM antes — é dado financeiro real do dia, sendo fechado ao vivo.

## Referências
`jsgrafica_fechamento`, `jsgrafica_saidas`, `jsgrafica_pedidos`. `lib/supabase.ts`
(`limitesDiaCaixaUTC`). Demanda 074 (fechamento por operador, correção estrutural relacionada).

## Atualização do PM (2026-07-06, ao vivo)
Enquanto o Edvam tentava fechar o caixa dele agora, apareceu erro novo: "Divergência detectada...
R$ NaN... Fechado às Invalid Date". Causa raiz confirmada pelo PM reproduzindo a chamada exata:
a constraint do banco era `UNIQUE(data_dia)` sozinha, mas o código de `app/api/fechamento/route.ts`
já fazia upsert com `onConflict: 'data_dia,fechado_por'` — como a constraint não batia com esse
alvo, o Postgres não conseguia resolver o conflito e caía no erro real
`duplicate key value violates unique constraint "jsgrafica_fechamento_data_dia_unique"`
(a Gabi já tinha uma linha pra hoje). O frontend não trata erro da API, só exibe os campos que
esperava — daí o NaN/Invalid Date.

**Corrigido pelo PM diretamente**: migration aplicada trocando a constraint pra
`UNIQUE(data_dia, fechado_por)` — confirmado com upsert de teste reproduzindo exatamente a
chamada da API, funcionou e foi limpo depois. Edvam já pode tentar fechar de novo.

**Ainda falta pro 02-DADOS**: os outros 3 itens do escopo original (diferença de R$18,92 nas
saídas mostradas vs. somadas, entender o fechamento parcial da Gabi, recalcular a divergência
real do dia) — isso continua em aberto, o fix acima só destravou o erro técnico de agora.

## Relato de execução

**Nenhum registro alterado** — investigação pura, como pedido. Os 3 itens abaixo.

### 1. Por que R$368,65 ≠ R$387,57 — não é bug, é timing

Puxei as 7 saídas de hoje com `created_at`:

| Hora (Recife) | Categoria | Valor | Descrição |
|---|---|---|---|
| 21:34:10 | Retiradas Sócios | 50,00 | — |
| 21:34:40 | Retiradas Sócios | 10,00 | Pão |
| 21:37:20 | Repasse Recarga Celular | 48,40 | — |
| 22:07:44 | Taxas de cartões | 1,75 | — |
| 22:08:10 | Fornecedores | 258,50 | repasse recarga vem |
| **22:18:24** | Fornecedores | **16,62** | **diferença de caixa** |
| **22:20:03** | Fornecedores | **2,30** | **diferença de caixa** |

Soma das 5 primeiras (até 22:08:10): **R$ 368,65** — bate exato com o que apareceu na tela.
As duas últimas ("diferença de caixa", R$ 16,62 + R$ 2,30 = **R$ 18,92**) foram lançadas
**depois**, às 22:18 e 22:20 — durante a mesma janela em que o Edvam estava tentando fechar o
caixa e caiu no erro do NaN (22:16). Soma das 7 = R$ 387,57.

**Conclusão: não existe bug na query do resumo.** O R$368,65 era a soma real e correta *até
aquele momento*; o R$387,57 é a soma real e correta *depois* de duas saídas terem sido
lançadas manualmente (aparentemente uma tentativa de ajustar a divergência que ele estava
vendo). O "resumo" sempre soma `jsgrafica_saidas` inteiro pro dia, sem filtro nenhum — os dois
números só chegaram em momentos diferentes.

### 2. O fechamento parcial da Gabi — não foi engano dela, é falha de lógica da 074

Row completa: `total_entradas=536.49` (bate com "Gabi R$536,49" do resumo do dia),
`total_saidas=0` (esperado — fechamento por operador nunca soma saídas, é assim que o código
já funciona), `total_fisico=162.75` (dinheiro 132 + moedas 30.75), `divergencia=-373.74`.

Cruzei os pedidos dela por forma de pagamento:

| Forma | Qtd | Valor |
|---|---|---|
| Cartão | 5 | 71,70 |
| Dinheiro | 20 | 153,45 |
| Pix | 10 | 123,40 |
| (sem forma / não confirmado) | 22 | 187,94 |
| **Total** | 57 | **536,49** ✓ bate com `total_entradas` |

**A causa raiz:** o fechamento por operador (demanda 074) compara o **físico contado**
(dinheiro+moedas+bancos) contra o **total_entradas geral** (536,49, todas as formas de
pagamento somadas) — mas só R$153,45 daquilo era dinheiro de verdade. Contra esse valor, o
que a Gabi contou (R$162,75) está **bem próximo** (diferença de +R$9,30, plausível de ser
troco/fundo de caixa) — ou seja, **não há divergência real de caixa da Gabi**. A "divergência
de -R$373,74" é um artefato: o sistema está comparando dinheiro físico contra um total que
inclui Cartão (71,70) + Pix (123,40) + pedidos nem confirmados como pagos (187,94) — dinheiro
que nunca deveria estar na gaveta dela.

**Não é erro da Gabi.** É a lógica do fechamento por operador (demanda 074, 03-APP) que ainda
não distingue forma de pagamento — precisa comparar físico contra **só a parte em dinheiro**
das vendas daquele operador, não contra o total geral. Reportando como achado pra 03-APP
(dentro do escopo da própria 074, que já está em execução) — não é uma correção de dado, é
lógica de cálculo.

### 3. Divergência real do dia inteiro

Números corretos, considerando os dois pontos acima:

| Campo | Valor |
|---|---|
| Saldo anterior (03-07-26, sexta — 04 e 05/07 são sáb/dom, zero atividade confirmada, gráfica fechada) | R$ 557,67 |
| Total entradas (dia inteiro, 107 pedidos, bate com o print) | R$ 998,49 |
| Total saídas (real, as 7 linhas, incluindo as 2 de "diferença de caixa") | R$ 387,57 |
| Resultado do dia | R$ 610,92 |
| **Saldo acumulado esperado** | **R$ 1.168,59** |

Esse é o número que o fechamento geral (sem operador, `fechado_por: 'Sistema'`) deveria achar
como "saldo esperado" agora. A divergência de R$18,62 que o Edvam está vendo na tela é
`total_fisico (o que ele contou agora) − 1.168,59` — não tenho o valor físico que ele digitou,
então não dá pra confirmar se R$18,62 é exatamente isso ou se ainda carrega algum resquício,
mas os dois pontos acima (1 e 2) não deveriam mais estar contaminando esse número: a linha da
Gabi é um fechamento por operador separado (não entra no cálculo do fechamento geral, que soma
tudo direto de `jsgrafica_pedidos`/`jsgrafica_saidas`, sem olhar pra `jsgrafica_fechamento`).

**Achado relevante pra interpretar qualquer divergência hoje:** R$405,39 dos R$998,49 de
entradas do dia (~40%) são pedidos entregues mas **não confirmados como pagos**
(`pagamento_confirmado: false`) — e `getResumoDia()` conta esse valor no `total_entradas` do
mesmo jeito que conta pedido pago. Se algum desses R$405,39 realmente não foi recebido ainda,
o caixa físico vai legitimamente ficar abaixo do saldo esperado por essa diferença — isso pode
ser uma causa real (não erro) de divergência ao fechar. Não decidi se `total_entradas` deveria
excluir pedidos não confirmados — é decisão de produto/negócio, reportando como achado.

### Achados fora do escopo
- Lógica do fechamento por operador (demanda 074) compara físico contra total geral em vez de
  só dinheiro — ver item 2. Fica pro 03-APP resolver dentro da própria 074.
- ~40% das entradas do dia são de pedidos não confirmados como pagos, mas contam pro total —
  ver item 3. Decisão de produto, não decidi sozinho.
- As 2 saídas "diferença de caixa" (R$16,62 + R$2,30) lançadas pelo Edvam parecem ter sido uma
  tentativa manual de ajustar a divergência que ele via na hora — não decidi se devem
  permanecer ou ser revertidas depois que ele entender a causa raiz real (itens 1 e 2). Fica
  pra ele decidir com esse contexto em mãos.

### Status final
**Concluída** (diagnóstico completo, nada alterado no banco). Os 3 itens do escopo têm
explicação com evidência (timestamps, breakdown por forma de pagamento). Reportando pro
PM/Edvam antes de qualquer ajuste, como pedido.
