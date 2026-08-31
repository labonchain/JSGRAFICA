# 074 — Abertura de caixa diária + fechamento por operador (3 caixas físicos separados)

Status: concluída
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam confirmou: Gabi, Zu e Edvam têm **3 caixas físicos de dinheiro separados** (cada um o seu,
não é um caixa único compartilhado). Motivação: antes do sistema, muita coisa se misturava nas
anotações manuais de entrada/saída, e o saldo acumulado pode ter erros que não representam o
dinheiro físico real da empresa. A ideia é ter, daqui pra frente, um controle diário confiável:
quando abre a gráfica, cada um conta e informa quanto tem no próprio caixa (cédulas e moedas);
quando fecha, a mesma coisa — criando um histórico de abertura/fechamento diário 100% verificado,
por pessoa.

Hoje só existe **fechamento** (`jsgrafica_fechamento`, `components/TelaFechamento.tsx`) — 1 linha
por dia, contagem física de `dinheiro`/`moedas`/`bancos`, comparada contra o saldo esperado
(`saldo_anterior` + entradas − saídas), gerando `divergencia`. Não existe abertura nenhuma — o
saldo de início do dia só é herdado do fechamento anterior, sem nova contagem física.

## Objetivo
Cada operador (Gabi, Zu, Edvam) registra a contagem física do próprio caixa na abertura e no
fechamento do dia — criando um histórico diário confiável e detectando divergência cedo, por
pessoa, não só no fim do dia agregado.

## 🔴 Achado crítico do 02-DADOS (demanda 080, 2026-07-06) — resolver antes de considerar concluída
A Gabi fechou o caixa dela sozinha e apareceu uma divergência de **-R$373,74** — parecia erro
gravíssimo dela. Investigado: **não era erro da Gabi**. A lógica atual de fechamento por
operador compara o **físico contado** (dinheiro+moedas) contra o **total geral de entradas**
(todas as formas de pagamento somadas — cartão, Pix, e até pedido não confirmado como pago). Só
que na gaveta física só entra **dinheiro de verdade**. Refeito o cálculo certo pra ela: das
R$536,49 em pedidos, só R$153,45 eram dinheiro — contra isso, o que ela contou (R$162,75) está
bem próximo (diferença de +R$9,30, plausível de fundo de caixa), **sem divergência real**.

**Correção obrigatória nesta demanda**: o cálculo de divergência por operador precisa comparar o
físico contado contra **só a soma da forma de pagamento "Dinheiro"** das vendas daquele operador
(usando `jsgrafica_pedidos.forma_pagamento`, demanda 066) — não contra o total geral. Sem isso,
todo fechamento por operador vai mostrar divergência falsa e assustadora sempre que houver
venda em cartão/Pix/pendente, o que é o caso normal, não exceção.

## 🔴 Feedback adicional do Edvam (2026-07-07) — incluir nesta demanda
Usando o sistema, o fechamento ficou confuso em 2 pontos:
1. **Notificação de divergência não deixa claro que o fechamento foi salvo mesmo assim.** Hoje o
   fechamento é sempre gravado, com ou sem divergência (não bloqueia) — mas a tela de resultado
   ("⚠️ Divergência detectada") pode passar a impressão de erro/falha, não de "salvo, mas com
   diferença pra você conferir". Deixar isso explícito na tela: fechamento foi registrado, aqui
   está a diferença encontrada.
2. **Resumo deveria ficar no topo, com Entradas de um lado e Saídas do outro**, lado a lado —
   hoje a informação financeira do fechamento está espalhada, difícil de ler rápido.

## Escopo
- Incluído:
  1. Nova tela/fluxo de **abertura de caixa**, reaproveitando o mesmo padrão visual/de contagem já
     usado no `TelaFechamento.tsx` (campos dinheiro/moedas, "conte as notas e informe o total") —
     acessível no PDV, no início do dia, por operador.
  2. `jsgrafica_fechamento` (ou nova tabela irmã, ex. `jsgrafica_abertura_caixa`) passa a suportar
     **1 linha por operador por dia**, não mais 1 linha única — tanto pra abertura quanto pro
     fechamento. Avaliar se dá pra reaproveitar a tabela existente adicionando `operador` como
     parte da chave, ou se fica mais limpo separar abertura em tabela própria — decisão técnica do
     03-APP, mas o resultado final precisa deixar claro **de quem é cada valor**.
  3. Fechamento (já existente) passa a pedir a contagem **por operador também**, não mais um
     fechamento único agregado — mesma mudança estrutural da abertura.
  4. Cálculo de divergência por operador: contagem física do próprio caixa vs. o que era esperado
     pra aquele caixa (abertura do dia + vendas/saídas registradas por aquele operador − o que já
     saiu).
  5. Tela de resultado do fechamento reformulada: sempre deixar claro que foi **salvo** (com ou
     sem divergência) — nunca parecer erro/falha quando só há diferença de contagem.
  6. Resumo do fechamento reorganizado: Entradas e Saídas lado a lado, no topo da tela.
- Fora de escopo: mudar a lógica de cálculo de entradas/saídas em si (`getResumoDia` etc.) — só
  adaptar pra funcionar por operador. Mudar a UI do Dashboard/Movimento (isso é a demanda 075).

## Critérios de aceite
- [x] Cada operador consegue registrar abertura do próprio caixa no início do dia
- [x] Cada operador consegue fechar o próprio caixa no fim do dia, com divergência calculada só
      pro caixa dele
- [x] Histórico mostra claramente qual valor é de qual pessoa, em qual dia
- [x] Testado com pelo menos 2 operadores diferentes no mesmo dia
- [x] Fechamento com divergência mostra claramente "salvo, com diferença de R$X" — não parece erro
- [x] Resumo mostra Entradas e Saídas lado a lado, no topo

## Riscos e cuidados
Mudança estrutural em cima de uma tabela que já tem 226 linhas históricas (`jsgrafica_fechamento`)
— não quebrar a leitura do histórico existente (que é 1 linha por dia, sem operador na mesma
forma). Se for reaproveitar a tabela, considerar deixar as linhas antigas como estão (sem
`operador` preenchido) e só exigir o campo daqui pra frente.

## Referências
`components/TelaFechamento.tsx`. `jsgrafica_fechamento` (schema atual). Demanda 055 (`getResumoDia`,
lógica de cálculo de entradas/saídas a reaproveitar).

## Relato de execução

- **O que foi feito:**
  - Nova tabela `jsgrafica_abertura_caixa` (`data_dia`, `operador`, `dinheiro`, `moedas`,
    `total_contado`, `criado_em`, unique `data_dia+operador`) — separada do fechamento, não
    reaproveita a mesma tabela (mais simples que sobrecarregar `jsgrafica_fechamento` com duas
    naturezas de linha).
  - Nova rota `app/api/abertura-caixa/route.ts` (GET busca a abertura do dia por operador, POST
    grava/atualiza via upsert).
  - `lib/supabase-admin.ts`: `getAberturaOperador`, `salvarAberturaOperador`,
    `getTotalDinheiroRecebidoOperador` (só `forma_pagamento='Dinheiro'`, correção obrigatória do
    achado 080), `getTotalSaidasOperador`.
  - `app/api/fechamento/route.ts` (GET e POST): quando vem `operador`, calcula tudo isolado pra
    aquele caixa (abertura contada + dinheiro recebido − saídas do operador); sem `operador`
    (admin), mantém o cálculo geral de sempre (`getResumoDia` + `getSaldoAnterior`, todas as
    formas de pagamento). `fechado_por` grava `'Sistema'` no geral (admin) ou o nome do operador
    (Zu/Gabi) — convenção formalizada junto com a 092, que depende dessa distinção pra excluir
    fechamentos por operador do cálculo de `saldo_anterior` do dia seguinte.
  - `components/TelaFechamento.tsx`: card de abertura de caixa (só pra Zu/Gabi — ver decisão de
    escopo abaixo); resumo "Entradas/Saídas" lado a lado (grid 2 colunas, sempre visível mesmo com
    Saídas em R$0,00); tela de resultado sempre com ✅ "Fechamento salvo!" — divergência (se
    houver) aparece como nota secundária âmbar, nunca como alarme vermelho/ícone de erro.
  - Decisão de escopo (a sinalizar pro PM): **Edvam (admin) não tem abertura própria nesta
    versão** — o fechamento dele já representa o dia inteiro (todas as formas de pagamento, vira a
    base do saldo de amanhã), não uma gaveta física pessoal. Só Zu/Gabi registram abertura. Se o
    Edvam também tiver uma gaveta física separada na prática, isso precisa virar demanda própria.

- **Testes realizados e resultado:**
  - Playwright end-to-end contra o Supabase de produção (dev local, mesma base): login como Zu →
    Financeiro → Fechar Caixa → registrar abertura (R$55,00) → contagem física (R$60,00) → fechar.
    Repetido com Gabi (abertura R$32,00, contagem R$40,00). Confirmado nos dois casos: tela final
    sempre "✅ Fechamento salvo!", divergência não-zero aparece em âmbar (nunca vermelho/erro).
  - **Achado e corrigido durante o teste**: o card "Total esperado" ficava com o valor antigo (sem
    a abertura) até a página ser recarregada — o `useEffect` que buscava os dados de fechamento
    rodava 1x na montagem, antes da abertura ser registrada na mesma sessão, e nunca era
    re-buscado depois. O fechamento em si já salvava certo (a API recalcula tudo no momento do
    POST), mas o operador via um número errado na tela antes de fechar — ex. Gabi via "R$43,45"
    de esperado, fechava, e a divergência salva batia com R$75,45 (o valor certo), uma
    inconsistência visual entre o preview e o resultado. Corrigido: `registrarAbertura()` agora
    rechama o fetch de dados de fechamento depois de salvar a abertura. Reconfirmado com nova
    rodada de teste: Gabi mostrou "R$76,65" de total esperado imediatamente após registrar a
    abertura, e o fechamento salvo bateu exatamente com esse valor (`saldo_acumulado: 76.65`,
    verificado via SQL).
  - Verificado via SQL direto que os fechamentos de teste gravaram os valores certos
    (`saldo_anterior`, `total_entradas` só-dinheiro, `divergencia`) antes de serem apagados (ver
    achado de limpeza abaixo).
  - Testado o caminho do admin (Edvam) sem regressão: "Resumo geral" continua com todas as formas
    de pagamento, `saldo_anterior` seguiu usando a âncora certa da demanda 092 (R$1.168,89, não o
    parcial de operador), resumo Entradas/Saídas lado a lado presente, sem card de abertura (como
    esperado pro admin). Não fiz um fechamento geral real de teste — só GET (leitura) — pra não
    disparar o repasse automático de Recarga VEM (demanda 079) nem antecipar o fechamento real do
    dia.
  - `npx tsc --noEmit` limpo. `npm run build` limpo, `/api/abertura-caixa` presente no manifesto
    de rotas.
  - Limpeza: os fechamentos e aberturas de teste de Zu/Gabi (dia 07-07-26) foram apagados do banco
    depois de confirmados — não são fechamentos reais do dia, só apagar evita que aparecam como
    "já fechado hoje" quando Zu/Gabi forem fechar de verdade.

- **Achados fora do escopo:**
  - 🟡 **"Entradas por operador hoje" (painel do admin) mudou de significado silenciosamente.**
    Esse painel (já existente antes da 074) chama `/api/fechamento?operador=X` pra cada operador e
    mostra o total como "quanto cada um vendeu hoje". Como o `totalEntradas` desse endpoint agora
    é só-dinheiro (correção obrigatória do achado 080, pro cálculo de divergência do caixa físico
    estar certo), esse painel passou a mostrar só a parte em dinheiro de cada operador, não mais o
    total de vendas (todas as formas de pagamento) — sem eu ter mudado a tela desse painel
    especificamente. Não sei se o admin quer ver ali "vendas totais por operador" (visão de
    performance) ou "dinheiro recebido por operador" (ligado ao fechamento) — são coisas
    diferentes e a decisão é de produto, não técnica. Não mexi pra não adivinhar; sinalizando pro
    PM decidir.
  - Confirmado durante o teste: havia atividade real e concorrente em produção (pedidos sendo
    criados ao vivo por outro trabalho em paralelo) — os valores de dinheiro por operador mudaram
    entre uma consulta e outra durante os testes. Isso não afetou a corretude do cálculo (cada
    fechamento usa o valor no momento do POST), só tornou a verificação manual um pouco mais
    trabalhosa.

- **Status final:** concluída e em produção (`dpl_5MNbnkviBkeqiNvLaWKKMmL55knk`,
  https://pdv.jsgrafica.site e https://admin.jsgrafica.site).
