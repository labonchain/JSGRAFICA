# 186 — Redesenho das sub-abas do Financeiro (layout confuso)

Status: em andamento — levantamento entregue, aguardando validação do Edvam
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam reportou (2026-07-15) que **todas as sub-abas do Financeiro** (Entradas, Saídas, Fechar
Caixa, Movimento, Contas a Pagar/Receber, Mercado Pago) têm "layouts mal acabados, poucos
facilitadores e confusos" — não fica claro onde ficam e como ficam as informações. Feedback geral,
sem lista item a item — precisa de um levantamento antes de redesenhar.

## Objetivo
As sub-abas do Financeiro ficam mais claras, organizadas e fáceis de entender onde está cada
informação.

## Escopo
- Incluído: primeiro passo é levantar, tela por tela (Entradas, Saídas, Fechar Caixa, Movimento,
  Contas a Pagar/Receber, Mercado Pago), o que está confuso especificamente — tirar print de cada
  uma, listar problemas concretos (ex. "essa informação X não fica claro que é sobre Y", "esses 2
  números parecem a mesma coisa mas são diferentes", inconsistência visual entre abas, etc.) e
  levar pro Edvam validar antes de redesenhar tudo de uma vez.
- Depois da validação, redesenhar com prioridade nas telas mais usadas no dia a dia (Fechar Caixa
  e Entradas, dado o volume de uso visto nesta sessão).
- Explicitamente fora de escopo: mudar lógica de cálculo/dado (isso é outras demandas, ex. 164) —
  só organização visual e clareza.

## Critérios de aceite
- [ ] Levantamento tela por tela, com prints e problemas concretos, validado pelo Edvam antes de
      redesenhar
- [ ] Pelo menos Fechar Caixa e Entradas redesenhadas nesta rodada
- [ ] Testado visualmente com dado real (não só sintético) pra ver se a clareza melhorou de fato

## Riscos e cuidados
Escopo grande e vago de propósito — não tentar resolver tudo de uma vez sem antes validar o
levantamento concreto com o Edvam. Considerar quebrar em demandas menores por tela depois do
levantamento.

## Referências
Todas as sub-abas de `Financeiro` (`app/page.tsx`, componentes `TelaFechamento.tsx`,
`TelaEntradas`/equivalente, etc.). Feedback do Edvam, 2026-07-15.

## Relato de execução
Levantamento executado em 2026-07-15 (03 - APP JS GRAFICA, Fable 5) — **prints + problemas
concretos abaixo, aguardando validação do Edvam ANTES de redesenhar** (como o escopo mandou).
Prints (dado real, 1600×900) em `pm/demandas/186-prints/` — 2 versões por tela (dobra +
página inteira).

### Problemas TRANSVERSAIS (aparecem em todas — resolver 1x resolve as 6)
- **T1. Cabeçalho sem padrão**: Entradas nem tem título; Saídas tem um "Saídas" solto;
  Fechar Caixa tem título+status; Contas tem título+frase; MP tem título+frase+badge. Cada
  tela "começa" de um jeito.
- **T2. Escolher período: 4 padrões diferentes** pra mesma tarefa — Entradas (botão Hoje +
  date picker à esquerda), Saídas (date picker à direita dentro do card), Movimento (8
  controles: 6 atalhos + range + Visualizar), MP (7/30/90 à direita). Quem aprende uma tela
  não sabe usar a outra.
- **T3. Datas em 3 formatos**: header 15-07-26, listas 15/07/2026, inputs nativos em
  **mm/dd/yyyy americano** (07/15/2026) — o input americano é o pior ofensor (Contas, Saídas,
  Entradas).
- **T4. Números sem rótulo do que incluem**: "R$ 50,05" (Entradas), "Saldo acumulado
  R$ 927,16" (Fechar Caixa), "Resultado do período R$ 32,55" (Movimento), "792 movimentações"
  (MP) — nenhum diz o critério na tela; quem não decorou a régua fica em dúvida.

### Por tela (problemas concretos)
**Entradas** — (1) sem quebra por forma de pagamento (pra saber Pix vs Dinheiro do dia tem que
ir a Movimento); (2) venda com N itens vira N linhas soltas repetindo cliente (sem agrupamento
por venda como a aba Pedidos faz); (3) "Abertura de caixa"/"Fechamento" são EVENTOS misturados
com dinheiro no mesmo filtro/lista — e o contador "16 lançamentos" não diz se inclui eventos;
(4) ícones 🧾/💬 sem legenda.
**Saídas** — (1) coluna esquerda vira um vazio enorme (mesma doença que a 175 tratou em
Pedidos); (2) "Lançamentos" SEM total do dia; (3) "Saídas previstas" é uma lista única com
"R$ 6.481,87 pendentes" misturando atrasado/hoje/mês que vem — sem blocos "vence hoje/semana";
(4) Editar/Cancelar visíveis em todo card o tempo todo (ruído).
**Fechar Caixa** (prioridade 1 de uso) — (1) a Contagem física é uma coluna longa de campos
(MP, Caixa Econômica, Stone, RecargaPay, cédulas, moedas...) sem dizer o que é obrigatório vs
ajuste fino; (2) o card "JÁ FECHADO POR OPERADOR HOJE" mostrando "ainda não fechou" — o título
afirma o contrário do conteúdo; (3) "Saldo acumulado" sem dizer desde quando/o que entra;
(4) coluna DIVERGÊNCIA do histórico sem legenda do sinal (+R$ 39,57 é sobra ou falta?) e sem
marcar dia fechado vs não fechado (dias faltando na sequência: 14, 13, 10...).
**Movimento** — (1) 3 relatórios dentro da aba = 3º nível de navegação (Financeiro > Movimento
> Fluxo de Caixa) e os cards de escolha parecem conteúdo, não menu; (2) "Controle de Caixa"
convive com "Fechar Caixa" — nomes quase iguais, funções diferentes; (3) gráfico de 1 dia vira
2 blocos gigantes sem valores nos eixos; (4) T2 no pior grau (8 controles).
**Contas a Pagar/Receber** — (1) formulário "Nova conta" permanentemente aberto ocupando o
1º terço da tela (o dia a dia é a LISTA — criar conta é raro); (2) "Cancelar" vermelho colado
em "Marcar pago" azul em toda linha (clique errado caro); (3) sem total do filtro atual
(quanto devo dos pendentes que estou vendo?); (4) recorrência ("semanal") como linkzinho
discreto no meio do nome; (5) input de data americano (T3).
**Mercado Pago** — (1) "Movimentações no período: 792" não bate com nada visível e não diz o
que conta (parece bug de rótulo — provavelmente é o total bruto da API, incluindo eventos que
a lista não mostra); (2) coluna REFERÊNCIA crua (venda-1784117..., ped-0927, "—") sem
cliente/produto e sem link pro pedido (a 171 já fez navegação cruzada em Pedidos — mesmo
padrão caberia aqui); (3) sem aviso na tela de que "Pendente" é cobrança não paga que expira
(vira ruído).

### Proposta de sequência pro PM validar
1ª rodada (depois do OK do Edvam): **Fechar Caixa + Entradas** (mais usadas) + T1-T4
transversais; 2ª rodada: Saídas + Contas; 3ª: Movimento + MP. Sugiro quebrar em demandas
menores por tela, como a própria 186 antecipou.
