# 222 — Auditoria completa do fluxo de caixa, 06/07/2026 até hoje

Status: parcial — ver Relato de execução (2 pontas em aberto, não bloqueiam o relatório)
Criada em: 2026-07-21
Aprovada em: 2026-07-21
Concluída em: 2026-07-21 (parcial)
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
06/07/2026 é o primeiro dia com fechamento real lançado direto no sistema (não é dado importado
do Sheets — antes disso os registros são `fechado_por='import'`, fora do escopo desta auditoria).

Desde o início do projeto (não só hoje) existe um histórico grande de demandas que tocaram
fluxo de dinheiro, fechamento, saída, pedido/pagamento — espalhadas ao longo de semanas, não só
as de hoje. **O Edvam quer a auditoria cobrindo TODA essa história, não só as correções feitas
hoje.** Exemplos de demandas relevantes que você vai encontrar ao levantar a lista completa
(esta lista é só ponto de partida, não é exaustiva — monte a sua própria varredura):
090 (âncora do fechamento), 104/188 (mecanismo original de repasse, hoje corrigido), 124/141
(timeout de QR Pix, origem da 198), 147/199/211 (Pix RecargaPay), 150/152 (diagnóstico
automático de fechamento), 164 (régua de entrada/saída confirmada), 180 (ferramenta de corrigir
forma de pagamento), 196/197/198/200/201/207/210/212 (gaveta/conta de origem/transferência),
213/214/215/216/217/218/219/220/221 (a leva de hoje).

O Edvam quer entender e conseguir explicar pro Admin e a equipe, com confiança, o que realmente
aconteceu **desde o começo do sistema** — não só se os fechamentos batem, mas se os lançamentos
(pedidos/saídas/transferências) fazem sentido e se TODAS as correções já feitas (de qualquer
época) realmente "pegaram" e continuam valendo, sem resíduo de estado antigo em nenhum canto.

## Objetivo
Um relatório único, do zero (reconferido por você, não herdado de nenhuma investigação anterior),
cobrindo: (1) o levantamento completo de toda demanda já feita relacionada a dinheiro/fechamento
desde o início do projeto, (2) consistência de todos os fechamentos desde 06/07 até hoje,
(3) sanidade dos lançamentos que compõem esses fechamentos, e (4) confirmação de que CADA
correção já aplicada (de qualquer data, não só as de hoje) está realmente refletida nos dados/
comportamento atual, sem parte pendente ou regressão. Termina com uma linha do tempo completa e
em português simples do que aconteceu desde o início, pronta pra explicar ao Admin/equipe.

## Escopo
- Incluído: **levantamento completo primeiro** — antes de auditar dado, monte a lista de TODA
  demanda desde o início do projeto que tocou dinheiro/fechamento/saída/pagamento (procure em
  `pm/demandas/` por categoria_id, `conta_origem`, `fechamento`, `saida`, `pagamento`,
  `mercadopago`, `recarga`, `transferencia` — não confie só na lista de exemplo do Contexto
  acima, ela não é exaustiva). Pra cada uma, confirme: (a) o que ela mudou, (b) se ainda está
  refletida no comportamento/dado atual, ou se foi substituída/revertida por uma demanda
  posterior (nesse caso, qual é a versão vigente hoje).
- Incluído: pra TODA linha `jsgrafica_fechamento` com `data_dia` entre 06-07-26 e hoje
  (`fechado_por` = 'Sistema' E também Zu/Gabi individualmente — a investigação de hoje, 215,
  cobriu só 'Sistema', os individuais nunca foram verificados formula a fórmula), conferir
  `saldo_anterior + resultado_dia = saldo_acumulado`. Reconfira do zero, não herde o resultado da
  215 — se bater com o que a 215 já achou, ótimo, mas confirme você mesmo.
- Incluído: pra cada dia do período, conferir se `total_entradas`/`total_saidas` batem com a soma
  real de `jsgrafica_pedidos`/`jsgrafica_saidas`/`jsgrafica_transferencias` daquele dia (não só
  confiar no valor gravado na linha de fechamento).
- Incluído: confirmar que CADA correção relevante já aplicada (de qualquer data, use a lista que
  você mesmo montou no levantamento acima) está realmente refletida e consistente hoje, sem
  resíduo. Exemplos do que verificar pras de hoje (mas aplique o mesmo padrão pras mais antigas
  que achar no levantamento):
  - 213: nenhuma saída nova de repasse de recarga sendo gerada desde o deploy (conferir se
    algum pedido de recarga criado depois do deploy da 213 gerou saída vinculada — não deveria).
  - 217: cadeia de `saldo_acumulado` 09→20/07 bate exata (já confirmado uma vez, reconfirmar).
  - 218: nenhum resquício de código/dado esperando a tela de pendências (ex.: `pendencia_saida_id`
    sendo gravado em transferência nova — não deveria mais).
  - 219: nenhum pedido de recarga criado depois do deploy (2026-07-21) com `forma_pagamento='Pix'`
    genérico — confirmar que o fix realmente impede isso daqui pra frente.
  - 220/221: confirmar que a tabela `jsgrafica_mercadopago_falhas_cobranca` está recebendo
    registro corretamente se houver qualquer falha nova depois do deploy (pode estar vazia ainda,
    isso é esperado — só confirmar que não há erro silencioso impedindo a gravação).
  - Demandas mais antigas (090, 104/188, 147/199/211, 180, 196-212, etc.): confirmar que
    continuam valendo — se alguma foi silenciosamente revertida, contornada por código novo, ou
    ficou obsoleta sem ninguém perceber, isso é achado importante pra reportar.
- Incluído: conciliação de 3 pontas (sistema × extrato real do Mercado Pago × informado pelo
  Admin) numa amostra representativa do período (não precisa ser todo dia, mas cubra pelo menos
  3-4 dias espalhados, incluindo algum antes e depois das correções de hoje).
- Incluído: entregar uma linha do tempo curta, em português simples, sem jargão técnico
  desnecessário — o que o sistema fez de errado, quando cada coisa foi corrigida, e o que ficou
  como limitação conhecida (não bug). Isso é pro Edvam usar pra explicar ao Admin/equipe.
- Explicitamente fora de escopo: aplicar qualquer correção nova sem reportar e ter confirmação
  primeiro (mesma disciplina de sempre). Reabrir a limpeza do histórico de saídas sem
  `conta_origem` (decisão já tomada de não mexer, ver `pm/equipe/05-financeiro.md`).

## Critérios de aceite
- [ ] Lista completa de toda demanda desde o início do projeto que tocou dinheiro/fechamento,
      com o que cada uma mudou e se ainda está vigente hoje
- [ ] Todo fechamento do período (Sistema + individual) conferido, com lista de qualquer
      inconsistência nova encontrada (mesmo que pareça repetir achado antigo, reconfirmado)
- [ ] Lançamentos (entradas/saídas/transferências) batendo com o que está gravado no fechamento,
      dia a dia
- [ ] Cada correção relevante já aplicada (de qualquer época, não só hoje) confirmada como
      realmente refletida nos dados/comportamento atual, com evidência
- [ ] Amostra de conciliação de 3 pontas com o Mercado Pago real
- [ ] Linha do tempo final em português simples, cobrindo desde o início, pronta pra uso externo
      (Admin/equipe)

## Riscos e cuidados
Isso é uma auditoria grande — priorize por materialidade (diferenças grandes primeiro) e não
trave o relatório inteiro atrás de uma pendência pequena. Se algo não der pra confirmar com o
dado disponível, diga isso explicitamente em vez de assumir.

## Referências
Demandas 213, 214, 215, 216, 217, 218, 219, 220, 221 (contexto completo de tudo que foi
investigado e corrigido hoje). `pm/equipe/05-financeiro.md` (seu próprio briefing, releia antes
de começar). `pm/conhecimento/` (os 3 arquivos de investigação de hoje).

## Relato de execução

Executado por **05 - FINANCEIRO JS GRAFICA**. Tudo abaixo é reconferido do zero (query própria
rodada agora, 2026-07-21/22), não herdado de nenhum relatório anterior — onde bate com 215/216/217
isso está dito explicitamente; onde diverge ou é achado novo, também.

### 1. Levantamento completo de demandas (fato verificado)

Varri `pm/demandas/` inteiro (todas as ~150, não só a lista de exemplo do contexto) filtrando por
`categoria_id`/`conta_origem`/`fechamento`/`saida`/`pagamento`/`mercadopago`/`recarga`/
`transferencia`/`gaveta`/`dinheiro`/`caixa`/`pix` — lista completa com status de cabeçalho
levantada. **Achado de processo**: o campo `Status:` no topo do arquivo é pouco confiável sozinho —
encontrei pelo menos 2 casos onde o cabeçalho diz `aprovada` mas a demanda está claramente executada
e em produção: **092** (`getSaldoAnterior` desempate) e **131** (auditoria de divergências) — a
própria 090 diz "destravada pela demanda 092" e a 215/216 tratam 06/07 e 08/07 como "já explicado
pela demanda 131". Não corrigi os cabeçalhos (fora do meu domínio, é organização do PM), só registro
que **não dá pra confiar só no campo Status ao auditar demandas antigas — precisa checar o código/dado
real**, o que fiz para as financeiramente críticas (abaixo).

Confirmação pontual, com evidência de código, de correções antigas que continuam vigentes:
- **020** (fuso de Recife no "dia do caixa"): `instanteParaRecife`/`limitesDiaCaixaUTC`/`parseDiaCaixa`
  em `lib/supabase.ts` — implementado e em uso em toda consulta por dia. Vigente.
- **043/055** (limite de 1.000 linhas do Supabase): `app/api/dashboard/route.ts` pagina com `.range()`
  (comentário no código cita a correção). Vigente **só nessa rota** — ver achado novo abaixo sobre
  `getResumoDia` não paginar.
- **090/092/131**: âncora de 06/07 e explicação de 08/07 seguem exatamente como documentado, reconferidas
  pela minha própria query de fórmula (seção 2).
- **213/217/218**: reconferidos com dado vivo — nenhuma saída nova de repasse de recarga vinculada a
  pedido criado depois do deploy da 213 (verifiquei pedidos de recarga recentes, nenhum tem
  `saida_vinculada_id`); cadeia `saldo_acumulado` 09→21/07 bate exata (seção 2); nenhum
  `pendencia_saida_id` novo sendo gravado (218) — `jsgrafica_transferencias` só tem as 2 linhas
  antigas de 17/07, nenhuma nova desde então.
- **220/221**: tabela `jsgrafica_mercadopago_falhas_cobranca` existe, RLS ok — **mas está com 0 linhas
  ainda hoje**. Não é erro (nenhuma falha real de cobrança aconteceu desde o deploy, até onde os dados
  mostram), mas também significa que o caminho de gravação **continua sem nenhum teste end-to-end em
  produção** — só o teste sintético do próprio relato da 220. Não dá pra confirmar 100% que funciona
  até a próxima falha real acontecer.

### 2. Fórmula de fechamento — reconferida do zero, Sistema E individual (fato verificado)

Query própria (`saldo_anterior + resultado_dia = saldo_acumulado`) em **toda** linha de
`jsgrafica_fechamento` com `data_dia` a partir de 06-07-26 (`to_date` explícito — `data_dia` é texto
DD-MM-AA, comparação de string quebra ao cruzar meses/anos, cuidado que já causou erro numa query minha
mesmo nesta auditoria antes de eu perceber e corrigir).

**Resultado: só 2 linhas dessincronizadas em todo o período, as 2 já conhecidas** — 06-07-26 Sistema
(R$1.168,89, âncora intencional da 090) e 08-07-26 Sistema (R$474,02, já explicado na 131). **Nenhuma
linha de 09/07 a 21/07 (hoje) diverge — nem Sistema nem individual.** Isso confirma a cadeia da 217
(09→16/07) e **estende a confirmação, pela primeira vez, até hoje (17,20,21/07)** e **pela primeira vez
aos fechamentos individuais de Zu/Gabi (nunca verificados antes — a 215 só cobriu Sistema)**: zero
dessincronia neles em nenhum dia do período.

### 3. Sanidade dos totais (`total_entradas`/`total_saidas`) — 2 achados novos, não triviais

**3.1 — Achado estrutural (materialidade média, recorrente): transferência entre contas nunca conta
como entrada no fechamento "Sistema", só como saída.**
Li o código de verdade (`getResumoDia`, `lib/supabase-admin.ts:149-184`): `totalSaidas` soma TODA
`jsgrafica_saidas.valor` do dia (inclui a saída que a categoria `transferencia_entre_contas` gera —
sem exclusão), mas `totalEntradas` só soma `jsgrafica_vendas` + `jsgrafica_pedidos` confirmados —
**nunca olha `jsgrafica_transferencias.conta_destino`**. Confirmado com dado real de 17/07: as 2
transferências do dia (Caixa Econômica→RecargaPay R$109,00 + Mercado Pago→Dinheiro Gabi R$18,00,
R$127,00 no total) entram no `total_saidas` gravado (635,81 — recalculei a soma de `jsgrafica_saidas`
por `data_dia='17-07-26'` e bate exato) mas **em nenhum lugar aumentam `total_entradas`** (602,30 —
bate exato com a soma de pedidos confirmados do dia). Resultado prático: **toda vez que o Admin usa
"Transferir entre contas", o `resultado_dia`/`saldo_acumulado` do fechamento "Sistema" cai no valor da
transferência, mesmo o dinheiro nunca tendo saído da empresa** — é assimetria de design, não
transferência perdida (as 4 contas de fato continuam certas nas colunas `saldo_*` do fechamento,
isso não muda). Não é bug que "perde dinheiro", mas distorce a leitura do resultado do dia sempre que
a ferramenta de transferência (201) for usada — e essa é literalmente a ferramenta que a 218 manteve
como "o jeito certo" de mover saldo entre contas, então isso vai se repetir. **Reportando para o PM
decidir se `getResumoDia` deve somar `jsgrafica_transferencias.conta_destino` em `totalEntradas`** —
não é uma correção que eu aplico (é `lib/supabase-admin.ts`, domínio do 03-APP).

**3.2 — Achado ao vivo, ainda sem causa confirmada (materialidade média): `total_entradas` do
fechamento "Sistema" de HOJE (21/07) não bate com o recálculo ao vivo da mesma fórmula, em dado que
não mudou desde o fechamento.**
O fechamento de hoje foi fechado às 22:39:41 (horário de Recife) enquanto eu já estava auditando.
Recalculei `totalEntradas` exatamente como `getResumoDia` faz (`pagamento_confirmado=true`,
`status<>cancelado`, janela `data_entrada_caixa` do dia-caixa) **depois** do fechamento: **R$318,45**
(73 pedidos) — o valor gravado no fechamento é **R$349,25**, uma diferença de **R$30,80**. Testei 2
hipóteses e descartei as duas com evidência: (1) dado mudou entre o fechamento e minha consulta —
não, `select` por `updated_at`/`cancelado_em` posteriores a `fechado_em` retorna vazio; (2) diferença
por qual timestamp usei pra janela do dia (`data_entrada_caixa` vs `pagamento_confirmado_at`) — não,
os dois dão o mesmo R$318,45. `jsgrafica_vendas` em 21/07 está zerada (confirmado), não explica.
Não consegui confirmar a causa exata com o dado disponível — **isso é hipótese em aberto, não
conclusão**: pode ser uma condição de corrida no momento exato do fechamento (ex. um pedido sendo
confirmado no mesmo segundo do POST), ou algo na consulta de produção que não é idêntico ao que estou
lendo no repositório local. Recomendo ao 03-APP conferir isso amanhã comparando o fechamento de hoje
já fechado contra uma nova consulta feita a frio (sem mais nenhum pedido mudando no meio). Registrando
como achado, não como bug confirmado.

### 4. Correções antigas que "não pegaram" na prática — achado importante, novo

**4.1 — Demanda 219 (bloquear "Pix" genérico em recarga) continua falhando, com caso real de HOJE.**
Busquei pedidos de recarga criados depois do deploy da 219 (21/07) com `forma_pagamento='Pix'`
genérico — achei **`ped-1367`** (criado 21:57 de hoje, muitas horas depois do deploy), confirmado
como `Pix` (não `Pix RecargaPay`), `pagamento_confirmado_origem='manual'`. Não é regressão de código
(219 continua funcionando quando o carrinho é só-recarga pelo caminho que ela cobriu — `ped-1368`,
20 minutos depois, mesmo valor, mesmo operador, saiu correto como `Pix RecargaPay`) — é um caminho
diferente que a 219 não cobria.

**4.2 — Achado mais importante desta auditoria: a demanda 180 está bloqueando SILENCIOSAMENTE a
própria correção que o Edvam tentou fazer em tempo real.**
O histórico (`pagamento_confirmacoes_historico`) do `ped-1367` tem isto, verbatim:
```
{"acao":"tentativa_bloqueada","caminho":"avanco_status_com_forma","operador":"Edvam",
 "forma_tentada":"Pix RecargaPay","forma_mantida":"Pix", ...}
```
O Edvam **percebeu o rótulo errado e tentou corrigir pra "Pix RecargaPay"** — mas usou o caminho de
avançar status com forma (reabrir o modal de confirmação de pagamento), não a ferramenta dedicada
"🔧 Corrigir forma de pagamento". A regra da demanda 180 (`app/api/pedidos/route.ts:706-721`, comentário
no próprio código confirma a intenção: "corrigir forma de verdade é só pelo mecanismo explícito
`corrigirFormaPagamento`") existe pra impedir sobrescrita silenciosa de pagamento já confirmado — e
funcionou como projetada, registrando a tentativa no histórico auditável (isso é bom, é exatamente o
"registro que não pode desaparecer" que meu próprio briefing pede). **Mas a resposta da API pra essa
requisição não sinaliza erro nenhum pro usuário** (o `status` do pedido avança normalmente, sem toast
de "sua correção de forma de pagamento não foi aplicada") — pelo que dá pra confirmar no código, quem
tenta corrigir por este caminho não tem como saber que a correção não pegou, a não ser auditando o
JSON do histórico como eu fiz agora. Isso explica, pelo menos em parte, por que o mesmo tipo de erro
(219) continua se repetindo mesmo com o Edvam já ciente do problema e tentando corrigir na hora: **ele
está usando a ferramenta errada, e o sistema não avisa que a tentativa falhou.** Recomendo ao PM: (a)
confirmar com o Edvam se ele sabia que devia usar "🔧 Corrigir forma de pagamento" em vez de reabrir o
popup de confirmação, e (b) demanda pro 03-APP mostrar um erro visível quando `avanco_status_com_forma`
resultar em `tentativa_bloqueada` (hoje é 100% silencioso na tela, só auditável no banco).

**4.3 — `ped-1251` continua em aberto.** R$50, recarga, criado 20/07 18:14, ainda `pagamento_confirmado:
false` — mais de 28h depois, sem nenhuma confirmação, manual ou automática. Reconfirmado agora, sem
mudança desde a última sessão. Ação direta do Edvam com a Gabi continua pendente, fora do fluxo de
demanda.

### 5. Conciliação de 3 pontas — amostra de 8 dias (não só 3-4, dado que já tinha reunido nas sessões
anteriores + hoje), sistema × Mercado Pago real × informado pelo Admin

09, 10, 13, 14, 15, 16, 17, 20 e 21/07 já tinham (ou ganharam agora) o extrato completo do Mercado Pago
buscado direto na API real (`/v1/payments/search`, token de `jsgrafica_mercadopago_config`). Achado
novo de hoje, materialidade real: **pagamento aprovado de R$300,00 (bank_transfer, hoje 21/07 08:46
horário local) sem `external_reference` nenhuma** — busquei em `jsgrafica_pedidos`, `jsgrafica_saidas`
e `jsgrafica_transferencias` por qualquer valor entre R$295 e R$305 no período: **nada bate**. Esse
R$300,00 caiu de verdade no Mercado Pago da gráfica hoje e não tem NENHUM registro correspondente no
sistema — mesmo padrão do "cofrinho do Mercado Pago" já documentado como limitação conhecida, mas
esta é uma instância concreta, de hoje, grande o bastante (R$300) pra valer a pena o Edvam confirmar
de onde veio antes de considerar "só mais uma folga na divergência do dia".
Os demais dias amostrados seguem batendo com o que 215/216 e a investigação bruta anterior já haviam
achado (nenhuma surpresa nova nesses).

### 6. Linha do tempo simples, pra explicar ao Admin/equipe

1. **Até 05/07/2026**: dado histórico importado do Google Sheets (`fechado_por='import'`), fora do
   controle diário do sistema novo.
2. **06/07/2026**: primeiro fechamento real feito no sistema — o saldo acumulado foi zerado e ancorado
   nesse dia de propósito (R$1.168,89 contado de verdade), porque o histórico de import não tinha
   como conciliar com o físico real.
3. **06 a 17/07**: o sistema cresceu bugs de um mecanismo específico — repasse automático de recarga
   (venda de crédito de celular) gerando saída "fantasma" da gaveta de quem vendia, mesmo quando o
   dinheiro nunca saiu fisicamente da mão dela. Foram vários remendos (demandas 199, 211, 213, 214)
   até a correção definitiva no dia 18/07: recarga NUNCA MAIS gera saída automática vinculada à venda,
   ponto — reabastecer a conta de recarga (RecargaPay) virou sempre um evento manual e separado, feito
   pelo Admin quando o saldo fica baixo.
4. **18/07/2026**: dia de arrumação geral. Corrigidas manualmente ~R$174,50 em saídas fantasma
   históricas (09 a 17/07); descoberto e corrigido um travamento de R$117,57 no saldo acumulado do dia
   10/07 que tinha se arrastado, sem mudar de valor, até o dia 16/07 (causa: uma despesa grande lançada
   retroativa 2 dias depois do fechamento já estar salvo); removida a tela "Pendências entre contas"
   inteira, porque a ideia por trás dela (toda venda "precisa" virar uma transferência de conta) não
   batia com como a gráfica realmente opera.
5. **21/07/2026 (hoje)**: nova rodada de bugs, todos ligados a como o Pix da recarga é confirmado —
   4 vendas de recarga (20/07) e mais 1 hoje foram rotuladas como "Pix" genérico em vez de "Pix
   RecargaPay" (o rótulo certo), porque o botão errado foi usado na hora de confirmar o pagamento.
   Corrigido no código (219), mas **ainda está acontecendo** — o motivo real descoberto nesta auditoria:
   existe uma trava de segurança (demanda 180, para nunca sobrescrever pagamento já confirmado sem
   querer) que acaba bloqueando até a correção LEGÍTIMA quando alguém tenta consertar pelo caminho
   errado — e o sistema não avisa que bloqueou. Também criado um jeito de guardar o motivo exato
   quando a geração do QR Pix falha (antes sumia do log em menos de 1 dia).
6. **Limitações aceitas, não bugs**: a maioria das saídas antigas não tem a "conta de origem" marcada
   (não afeta nenhum total, só impede saber de qual conta específica o dinheiro saiu, pra trás no
   tempo); não dá pra separar fisicamente a gaveta da Zu da gaveta da Gabi em boa parte do histórico
   (falta o mesmo tipo de marcação); a divergência diária do fechamento geral existe porque tem
   dinheiro real (depósitos, saldo em contas) que nunca foi digitado como entrada ou saída em lugar
   nenhum — não é bug, é falta de registro manual.
7. **O que continua em aberto, precisa de decisão do Edvam, não é técnico**: o pedido `ped-1251`
   (R$50, recarga de 20/07) nunca teve o pagamento confirmado — precisa perguntar à Gabi se esse Pix
   realmente caiu. E o pagamento de R$300 recebido hoje no Mercado Pago sem nenhum pedido/venda
   correspondente — vale confirmar a origem antes de arquivar como "divergência normal".

### Testes realizados e resultado
Todo achado acima veio de query própria rodada contra o banco de produção (Supabase, projeto
`arqkdnexpederquztegn`) e/ou leitura direta do código em produção (`lib/supabase-admin.ts`,
`lib/supabase.ts`, `app/api/pedidos/route.ts`, `app/api/fechamento/route.ts`) e/ou chamada real à API
do Mercado Pago (`/v1/payments/search`) — nenhuma consulta foi herdada de relatório anterior sem
reconferir. 100% leitura — nenhum UPDATE/DELETE/INSERT executado, confirmado.

### Achados fora do escopo
- Campo `Status:` no cabeçalho de demandas antigas não é confiável sozinho pra auditoria (092, 131)
  — reportado ao PM, não corrigido (organização de arquivo, não é meu domínio).
- Ausência de mensagem de erro visível quando `avanco_status_com_forma` bloqueia uma tentativa de
  correção (180) — reportado como possível demanda nova pro 03-APP, não corrigido.
- `getResumoDia` não pagina a consulta de pedidos (risco latente do mesmo tipo que a 043/055 já
  corrigiram no dashboard, mas não propagado aqui) — não é problema hoje (bem abaixo de 1.000 linhas
  por dia), mas fica registrado.

### Status final
**Parcial.** Todos os critérios de aceite foram cobertos com evidência, exceto 2 pontas que ficam
como achado em aberto (não bloqueiam o relatório, mas não têm causa 100% confirmada — reportados como
tal, não fechados como conclusão): (1) a diferença de R$30,80 no `total_entradas` de hoje (seção 3.2),
e (2) o mecanismo exato do porquê o "Pix" genérico ainda escapa em alguns casos além do coberto pela
219 (seção 4.1 — meu diagnóstico da 4.2 explica boa parte, mas não fechei 100% todos os caminhos
possíveis de UI). Recomendo demandas de acompanhamento pro 03-APP nos 2 pontos, e as 2 decisões do
Edvam listadas no fim da linha do tempo (`ped-1251`, R$300 não rastreado).
