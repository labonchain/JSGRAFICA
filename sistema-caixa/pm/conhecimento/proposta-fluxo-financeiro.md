# Proposta — organização do módulo financeiro (antes de continuar 074/075/084)

Criado pelo PM em 2026-07-07, a pedido do Edvam: "o que tá na fila depende de trazer uma proposta
de fluxo financeiro, senão vira remendo em cima de remendo". Baseado na pesquisa de referência
(`pm/conhecimento/referencia-financeiro-e-pdv.md`) cruzada com o que já existe no sistema.

## O problema de fundo
Hoje o dinheiro da gráfica está espalhado em 4 telas que não se conversam como um conceito só:
**Lançar Saídas**, **Fechar Caixa**, **Movimento**, **Dashboard**. Cada demanda recente (067, 074,
075, 077, 079) mexeu numa dessas telas isoladamente, corrigindo cálculo — mas nenhuma parou pra
perguntar "essas 4 telas deveriam ser a mesma coisa, organizada diferente?". Resultado: forma de
pagamento foi pedida pro Fechamento (077, já feito) e separadamente pro Dashboard/Movimento (075,
ainda não feito) — mesma informação, dois lugares, dois esforços.

## Proposta: 3 conceitos, não 4 telas soltas

### 1. 💵 Caixa (operacional, diário, por pessoa)
**O que é**: dinheiro físico que Gabi/Zu/Edvam têm na mão, contado na abertura e no fechamento do
próprio turno. Já é a demanda 074 — mantém como está desenhada, **com a correção que o 02-DADOS
já achou**: comparar o físico contado só contra a parte em **dinheiro** das vendas daquele
operador, nunca contra o total (cartão/Pix não passam pela mão de ninguém fisicamente).
**Não muda nada do que já foi decidido pra 074** — só reforça que esse é o "andar de baixo",
puramente físico, sem se preocupar com cartão/Pix/conciliação bancária.

### 2. 📊 Financeiro (visão gerencial, por período — substitui Movimento + Dashboard)
**O que é**: hoje "Movimento" (dia) e "Dashboard" (período) mostram basicamente a mesma coisa —
entradas, saídas, resultado — só com filtro de tempo diferente. Proposta: **virar uma tela só**,
com um seletor de período (Hoje / Semana / Mês / Personalizado — o Dashboard já tem isso), e
dentro dela:
- Total de entradas, saídas, resultado (já existe)
- **Quebra por forma de pagamento** (dinheiro/cartão/Pix) — isso fecha a demanda 075, mas
  implementado **uma vez só**, não em duas telas separadas
- Produtos mais vendidos, saídas por categoria (já existe no Dashboard)

**Por que isso muda o escopo da 075**: em vez de "adicionar forma de pagamento no Dashboard E no
Movimento" (076 duplicando esforço), a demanda vira "unificar as duas telas numa só, com forma de
pagamento desde o início". Menos código, menos telas pra manter, sem números que podem divergir
entre uma tela e outra no futuro.

### 3. 🏦 Contas & Conciliação (visão das contas digitais/bancárias)
**O que é**: onde mora a configuração de conta bancária + taxa (que a 077 já construiu, mas ficou
sem lugar certo — por isso saiu do menu na 085) e a integração com Mercado Pago (demanda 084,
futuramente Nu/Itaú/BB). Aqui, e só aqui, faz sentido ter:
- Lista de contas (Mercado Pago, e no futuro os bancos), com saldo e taxa de cada uma
- Conciliação: o que o sistema esperava receber em cada conta (baseado no `forma_pagamento` dos
  pedidos) vs. o que a conta realmente mostra (via 084/Open Finance)

**Por que isso resolve a confusão da 077/085**: a aba "Contas Bancárias" não fazia sentido como
tela solta porque ela é, na verdade, metade dessa peça nova — falta a outra metade (conciliação
de verdade, que só a 084 traz). Juntas, viram uma tela com propósito claro.

## Como isso muda a fila (074/075/084)
| Demanda | Antes | Proposta |
|---|---|---|
| 074 | Abertura/fechamento por operador | **Sem mudança** — é o módulo "Caixa", já bem desenhado, só aplicar a correção da 080 |
| 075 | Forma de pagamento no Dashboard e Movimento (2 telas) | **Vira**: unificar Movimento+Dashboard numa tela "Financeiro" só, forma de pagamento nascendo unificada |
| 084 | Mercado Pago solto | **Vira**: primeira peça da tela "Contas & Conciliação" — reaproveita a config de conta/taxa que a 077 já fez |
| 077 (concluída) | Contas bancárias + taxa | Config em si não muda — só o **lugar** dela muda pra dentro de "Contas & Conciliação" quando essa tela existir |

## O que isso NÃO é
Não é pedido pra reescrever tudo agora. É uma decisão de **onde cada coisa nova vai morar daqui
pra frente**, pra 075/084 não virarem mais 2 remendos em telas que deveriam nem existir separadas.
074 pode seguir imediatamente como está. 075 e 084 esperam essa decisão antes de começar.

## Pergunta pro Edvam
Confirma a direção (3 conceitos: Caixa / Financeiro / Contas & Conciliação) antes de eu despachar
075 e 084 reformuladas nesse formato?

---

## Atualização (2026-07-07) — pesquisa em sistemas reais, nomeados, sem invenção
Pedido do Edvam: ver como sistemas financeiros de verdade organizam abas/funções/abertura e
fechamento de caixa, com referência real, não genérica. Pesquisei 3 sistemas usados por pequenas
empresas no Brasil — nome, fonte, estrutura real de cada um.

### ContaAzul — módulo Financeiro
- **Abas**: Visão de Competência (todos os lançamentos consolidados) · Contas a pagar · Contas a
  receber · Fluxo de caixa (diário e mensal) · Conciliação bancária.
- **Tela de conciliação bancária**: 2 colunas lado a lado — à esquerda os lançamentos que vieram
  do banco (importados), à direita os lançamentos que já existem no sistema. Uma tela separada
  ("Movimentações") mostra o que já foi conciliado + o saldo bancário do período.
- **Valida direto o conceito 3 (Contas & Conciliação) desta proposta**: é exatamente esse padrão
  de 2 colunas (esperado do sistema vs. realidade do banco) que a integração com Mercado Pago
  (demanda 084) deveria seguir quando tiver dado de banco de verdade pra comparar.
- Fonte: [ajuda.contaazul.com — conciliação bancária](https://ajuda.contaazul.com/hc/pt-br/articles/32748375541005-Concilia%C3%A7%C3%A3o-banc%C3%A1ria-entendendo-os-campos-telas-e-processos)

### Bling — Frente de Caixa (PDV)
- **Abertura de caixa**: só admin ou usuário autorizado.
- **Suprimento**: registrar entrada de dinheiro na gaveta física (ex.: reforçar troco).
- **Sangria**: registrar retirada de dinheiro da gaveta física (ex.: levar excedente pro cofre) —
  os dois são ações **durante** o expediente, não só na abertura/fechamento.
- **Fechamento**: pede o valor recebido **separado por forma de pagamento** (dinheiro, cartão
  crédito, cartão débito, crediário, outras) — cada forma conta à parte, não misturada.
- Citação direta da documentação: *"Para a forma de pagamento Dinheiro, o valor informado deve
  ser o total em caixa (vendas + troco + suprimentos - sangrias)"* — **confirma exatamente a
  correção que já aplicamos na demanda 074/080**: o físico contado só compara contra a parte em
  dinheiro, nunca contra o total geral. Não inventamos isso, é como o mercado já faz.
- **Achado novo pra considerar**: hoje o sistema da JS Gráfica não tem sangria/suprimento durante
  o expediente — só abertura e fechamento. Se acontecer na prática (alguém tira dinheiro do caixa
  no meio do dia), vale um botão simples pra registrar isso, em vez de só aparecer como
  divergência no fechamento sem explicação.
- Fonte: [ajuda.bling.com.br — fechar caixa](https://ajuda.bling.com.br/hc/pt-br/articles/360035626574-Fechar-o-caixa-de-vendas-feitas-no-Frente-de-Caixa)

### TagPlus — Abertura e Fechamento de Caixa
- Pede "Valor de Abertura" e "Valor de Fechamento" diretamente.
- **Ideia interessante, diferente do que fizemos**: se o valor informado for diferente do valor
  calculado esperado, o sistema **registra automaticamente uma sangria ou suprimento** com essa
  diferença — em vez de só mostrar "divergência" como uma nota solta, ele transforma a diferença
  numa transação rastreável (o operador ainda pode anotar o motivo depois). É mais rico que só
  "salvo, com diferença de R$X" (o que a 074 fez agora) — vale considerar como próximo passo,
  não precisa ser agora.
- **"Fechamento Diário"**: tela de relatório separada — escolhe o dia, escolhe detalhado ou
  resumido, imprime em A4 ou cupom. Não existe hoje na JS Gráfica (o fechamento só mostra o
  resultado na hora, não gera um relatório revisável depois).
- Fonte: [ajuda.tagplus.com.br — abertura e fechamento de caixa](https://ajuda.tagplus.com.br/pt-BR/articles/88792-abertura-e-fechamento-do-caixa), [ajuda.tagplus.com.br — fechamento diário](https://ajuda.tagplus.com.br/pt-BR/articles/2700677-fechamento-diario)

### O que isso confirma e o que isso sugere de novo
- **Confirmado, não é invenção nossa**: comparar caixa físico só contra dinheiro (074/080), e
  ter forma de pagamento separada no fechamento (077) — são exatamente como Bling faz.
- **Confirmado**: a estrutura de 3 conceitos desta proposta (Caixa / Financeiro / Contas &
  Conciliação) bate com a divisão real do ContaAzul (Financeiro com sub-abas + Conciliação
  bancária separada).
- **Sugestões novas, pra avaliar depois, não urgente**:
  1. Sangria/suprimento durante o expediente (Bling) — hoje não existe na JS Gráfica.
  2. Divergência virar sangria/suprimento rastreável em vez de só nota (TagPlus) — mais completo
     que o que a 074 entregou agora.
  3. Relatório de "Fechamento Diário" separado, revisável/imprimível depois (TagPlus) — hoje o
     resultado do fechamento só aparece na hora, não vira um relatório consultável depois.

---

## Atualização (2026-07-07, depois de ver o mockup) — anotações do Edvam + IA final proposta

O Edvam viu o mockup da demanda 094 e anotou o que já tinha pensado antes. Achado importante
primeiro: **o mockup errou o alvo** — a "Proposta" de cada tela foi recriada com CSS própria
(tokens `--azul`, `--verde` etc.) em vez de usar as classes Tailwind reais do app
(`bg-blue-600`/`700`, `rounded-xl`, escala `text-xs`/`text-sm`, cards brancos com
`border-gray-200` — conferido direto em `components/TelaFinanceiro.tsx` e
`components/TelaFechamento.tsx`). Por mais que a paleta fosse parecida, não é o layout de hoje —
o Edvam rejeitou com razão ("BEM FORA DO ESCOPO. SE FOSSE PRA FAZER ASSIM VC TERIA FEITO"). Lição
pra próxima rodada de mockup: usar as classes/tokens reais (ou anotar em cima do print de verdade
com marcações, não recriar a tela do zero).

### Requisitos novos, em cima do que já existe

**📥 Entradas (aba nova, não existe hoje)**
- Lista as entradas — por PDV e por Admin — junto com aberturas e fechamentos de caixa, por
  operador e geral.
- Hoje não existe nenhuma tela assim: `TelaFinanceiro.tsx` só mostra agregado (soma por período),
  não um lançamento por lançamento. É o equivalente, do lado das entradas, ao que "Lançar Saídas"
  já tem pro lado das saídas desde a 091 (lista de lançamentos).

**💸 Saídas (evolução de "Lançar Saídas")**
- PDV passa a lançar saídas também — hoje é `soAdmin: true` em `app/page.tsx:1638`, Zu/Gabi não
  têm acesso nenhum. Confirmado com o Edvam: não é fornecedor, é crédito/recarga — serviço
  executado na hora pro cliente (Recarga Celular/VEM já existem como produto, mas a saída de
  repasse é lançada separada, ver 052/079). Edvam sinalizou que outros tipos de saída via PDV
  podem aparecer depois — não é lista fechada.
- Categorias de saída **configuráveis por perfil**: Admin vê a lista completa, mas só as
  marcadas por ele aparecem no PDV. Hoje `jsgrafica_categorias_saida` só tem
  `id, nome, ativo` (`app/api/categorias-saida/route.ts`) — não tem esse controle, precisa de
  coluna nova (ex. `visivel_pdv boolean`).
- A frase do Edvam sobre "a barra de histórico e lançamentos pode ficar meio..." ficou cortada
  nas anotações — não decidido, registrar pra confirmar com ele o que ele quis dizer antes de
  desenhar essa parte.
- Campo mostrando **contas a pagar que ainda não venceram** — mas ainda não existe tela de
  cadastro pra isso (ver item novo "Contas a Pagar/Receber" abaixo — proposta é esse campo em
  Saídas ser um resumo que puxa dali, não uma funcionalidade própria duplicada).

**🔒 Fechar Caixa (evolução da tela atual)**
- Resumo geral de entradas/saídas por operador (já existe parcialmente — bloco "Entradas por
  operador hoje" no admin, `TelaFechamento.tsx:262`, mas só mostra entradas, não saídas por
  operador).
- Selo indicando se o fechamento geral do dia está **fechado ou em aberto** (hoje não existe —
  a tela não informa se alguém já fechou o caixa geral hoje ou não).
- **Histórico dos dias anteriores**, abaixo do resumo do dia (hoje não existe em
  `TelaFechamento.tsx` — o histórico por dia só existe agregado dentro de "Financeiro").
- Confirmado (já é como está implementado desde a 074/092, só reforçando): Admin fecha o caixa
  geral (todas as formas de pagamento, `fechado_por: 'Sistema'`), PDV fecha só o caixa do próprio
  operador — os dois já são fluxos/telas distintos hoje.

**📊 Financeiro (relatórios)**
- As 3 telas nomeadas (Fluxo de Caixa / Controle de Caixa / Relatório de Saídas) precisam de
  mockup desenhado e aprovado **antes** de ir pra produção — não implementar direto em cima da
  ideia do artefato rejeitado.

**📋 Contas a Pagar e a Receber — pergunta do Edvam: onde encaixa?**
Resposta do PM: **não fica dentro de Controle de Caixa** — nos 3 sistemas reais pesquisados
acima, o ContaAzul trata "Contas a pagar" e "Contas a receber" como abas **irmãs** de "Fluxo de
caixa" e "Conciliação bancária" dentro do módulo Financeiro, não uma dentro da outra (ver
"ContaAzul — módulo Financeiro" acima). Proposta: **4º conceito**, no mesmo nível de Caixa /
Financeiro / Contas & Conciliação — uma aba própria com cadastro de obrigações futuras (nome,
valor, categoria, vencimento, pagar ou receber, status pendente/pago/atrasado). É o que alimenta
o campo-resumo pedido em Saídas ("contas a pagar que ainda não venceram"), sem duplicar o dado.

### IA final proposta pro grupo "💰 Financeiro" (5 abas, aguardando aprovação do Edvam)
1. 📥 **Entradas** — novo, ledger de entradas por PDV/Admin + histórico de abertura/fechamento
2. 💸 **Saídas** — evolução de "Lançar Saídas", agora com acesso PDV + categorias configuráveis
3. 🔒 **Fechar Caixa** — evolução, com selo aberto/fechado + histórico de dias anteriores
4. 📊 **Financeiro** — relatórios nomeados (precisa de mockup fiel antes de implementar)
5. 📋 **Contas a Pagar/Receber** — novo, cadastro de obrigações futuras

`🏦 Contas Bancárias` (077) continua fora do menu por enquanto (085) — só volta quando "Contas &
Conciliação" (item separado desta proposta, ligado à 084/Mercado Pago) tiver forma definida.

---

## Atualização (2026-07-07, fim da rodada) — arquitetura confirmada pelo Edvam

Depois da IA de 5 abas acima, o Edvam detalhou rotina de operação e mecanismo de integração em
conversa direta com o PM. Pontos abaixo já **confirmados por ele**, prontos pra virar demanda.

### 1. Abertura de caixa vira portão, não aba
Hoje abertura mora dentro da aba "Fechar Caixa" (`TelaFechamento.tsx`, bloco `!isAdmin`).
Confirmado: isso não faz sentido — deveria ser uma **tela de bloqueio antes do sistema**, só pra
quem tem gaveta física (Zu/Gabi). Fluxo do dia:
1. Zu/Gabi entra no PDV → se não abriu o caixa hoje, cai direto na tela de abertura, sem acesso
   ao resto do sistema até registrar.
2. Depois de abrir, cai na tela normal (vender/atender) — opera o dia lançando entrada/saída
   pelo fluxo que já existe.
3. Fim do dia, clica em "Fechar Caixa" (ação/aba própria, só com a função de fechar — sem a
   abertura misturada) → abre a tela de fechamento, soma os números do dia, grava.

**Renomear a aba 3 (antes "🔒 Fechar Caixa") pra refletir só o fechamento — abertura sai dela e
vira gate.** Admin (Edvam) não passa por esse portão — não tem gaveta física própria, mesma regra
de hoje.

### 2. Contas a Pagar/Receber é só do Admin
PDV nunca lança nem visualiza saída/entrada futura. Só lança saída de serviço executado na hora
(recarga e afins) — sem acesso à aba nova de Contas a Pagar/Receber.

### 3. Mecanismo de baixa (já confirmado antes, reforçado aqui)
Marcar uma conta a pagar/receber como paga/recebida gera automaticamente o lançamento real
(Saída/Entrada) correspondente — mesmo padrão da Recarga VEM (079, `saida_vinculada_id`). Não
duplica lançamento manual.

**Pendente de decisão** (Edvam ainda não respondeu): a automação de recarga (entrada de venda →
saída de repasse) hoje só roda **agregada, no fechamento geral** (079) — não por transação, na
hora. Confirmar se isso já resolve ou se precisa virar por-transação.

### 4. Preço de custo em todos os produtos — mas saída automática só onde há repasse real
`jsgrafica_produtos` ganha `preco_custo` em **todos** os produtos (confirmado, sem exceção) — usa
pra calcular margem/lucro real nos relatórios (Financeiro passa a mostrar lucro, não só receita
bruta).

**Distinção confirmada pelo Edvam** entre os dois usos do custo:
- **Custo pra margem/relatório**: vale pra todo produto, inclusive produção própria (impressão,
  xerox) — mesmo sem saída de caixa associada.
- **Custo virando saída automática no caixa**: só faz sentido nos produtos com repasse real *na
  hora da venda* (recarga, "Seviço terceirizado") — produção própria não gera saída automática
  por venda, porque o custo real (papel/tinta) é comprado em lote, não por transação; geraria
  saída de caixa em momento que não bate com quando o dinheiro saiu de verdade.

### 5. Desconto é pontual, não regra automática
Não é tabela de desconto por faixa de quantidade. É um campo livre no carrinho (PDV/Balcão),
aplicado pelo operador/admin caso a caso na hora da venda (R$ ou %, com ou sem motivo) — ex.:
"imprimiu X e ganhou desconto", "Y cópias de xerox com desconto Z" — não é regra do sistema,
é decisão pontual registrada por venda.

### Respostas finais do Edvam (2026-07-07, fecha a proposta)
- **Frase cortada** ("a barra de histórico e lançamentos pode ficar meio...") — não lembrava,
  descartado, não afeta o desenho de Saídas.
- **Saldo projetado no Financeiro** — fica pra depois. V1 do Financeiro/Contas a Pagar-Receber
  não mostra número de previsão, só cadastro + baixa manual. Projeção entra numa fase futura.
- **Recarga: entrada gera saída** — **muda de agregado (079) pra por-transação, na hora.** Toda
  venda de recarga passa a gerar a saída de repasse correspondente **imediatamente**, não mais
  só no fechamento geral do dia. **Isso substitui o mecanismo da demanda 079** (que somava tudo
  e lançava 1 saída agregada só no fechamento) — vai precisar de nova demanda pra mudar
  `gerarSaidaRecargaVemAutomatica()` (`lib/supabase-admin.ts`) de "roda 1x no fechamento" pra
  "roda a cada venda de recarga confirmada".

## Deploy — cuidado explícito do Edvam
O caixa de hoje já foi aberto pelo fluxo atual e vai fechar à noite normalmente — não mexe
retroativamente nele. Mudanças que **alteram comportamento em uso agora** (PDV ganhar acesso a
Saídas, abertura virar portão obrigatório, renomear/dividir "Fechar Caixa") esperam o fechamento
de hoje — mesmo padrão de texto já usado na demanda 073 ("aguardando horário seguro, fora do
atendimento"), só libera depois que o Edvam confirmar que o caixa de hoje fechou. Mudanças
**aditivas** (colunas novas, tabela nova de Contas a Pagar/Receber, `preco_custo`) não mexem no
que já está em uso — podem ir a qualquer momento, sem esperar.

**Proposta fechada — pronta pra virar demandas.**
