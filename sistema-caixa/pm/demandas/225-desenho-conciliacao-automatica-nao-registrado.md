# 225 — Desenho de conciliação automática: separar entradas/saídas não registradas

Status: concluída
Criada em: 2026-07-21
Aprovada em: 2026-07-21
Concluída em: 2026-07-21
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
A auditoria completa (demanda 222) e o dia inteiro de investigação de hoje mostraram um padrão
que se repete: a divergência diária do fechamento "Sistema" cresce, dia após dia, porque o saldo
esperado nunca "sabe" de dinheiro real que existe mas nunca foi digitado como entrada/saída/
transferência (cofrinho do Mercado Pago, depósitos, movimentações de consolidação que o Admin
faz fora do sistema). O `saldo_acumulado` carrega o valor calculado do dia anterior pro seguinte
— nunca o físico real contado — então esse tipo de gap nunca é absorvido de volta, só se
acumula.

O Edvam rejeitou a ideia de resetar o saldo periodicamente (reancorar, como foi feito uma vez em
06/07) como solução de verdade — corretamente: isso escondia o problema em vez de resolver.
A proposta dele, que faz sentido e é o que se espera de um sistema com IA/dado disponível: já
temos acesso real ao extrato do Mercado Pago via API (provado hoje, usado em várias
investigações) e já sabemos os saldos informados de RecargaPay/Stone/Caixa Econômica a cada
fechamento. O sistema devia **comparar automaticamente o que está registrado contra o que existe
de verdade**, separar isso numa lista específica ("isso aqui não bate com nenhum registro"), e
deixar o Admin **nomear/classificar cada item** — em vez de a divergência ficar sendo um número
grande sem explicação nenhuma.

## Objetivo
Um desenho concreto (não é código ainda) de como funcionaria uma conciliação automática que:
1. Compara o que está registrado no sistema contra o que existe de verdade em cada conta.
2. Isola cada diferença como um item específico, não um número agregado.
3. Deixa o Admin classificar/nomear cada item — e essa classificação vira registro de verdade,
   contando certo no fechamento dali pra frente.

## Escopo — isto é uma demanda de DESENHO, não implementação
- Incluído: mapear, conta por conta, o que é tecnicamente possível hoje:
  - **Mercado Pago**: tem API real (`/v1/payments/search`), já usada várias vezes hoje. Desenhar
    a lógica de matching — como comparar cada pagamento real (por valor + data + `external_reference`
    quando existir) contra `jsgrafica_pedidos`/`jsgrafica_saidas`/`jsgrafica_transferencias`, e o
    que fazer quando não achar par (é exatamente o caso do R$300 de hoje, achado na 222).
  - **RecargaPay, Stone, Caixa Econômica**: sem API própria hoje — só o saldo informado
    manualmente pelo Admin a cada fechamento. Desenhar como isolar "diferença não explicada" por
    conta mesmo sem transação individual (ex.: comparar a variação do saldo informado dia a dia
    contra o que o sistema calculou naquele dia pra aquela conta especificamente — hoje isso nem
    é calculado por conta, só agregado).
- Incluído: desenhar o modelo de dado pra representar um "item não registrado pendente de
  classificação" — proposta de schema (campos, não é pra criar tabela ainda), incluindo no
  mínimo: conta, valor, data, origem (ex. `id` do pagamento real do MP quando aplicável),
  status (pendente/classificado), e o que a classificação do Admin gera (ex.: vira uma saída/
  entrada/transferência de verdade? Fica só rotulado como "sabido, não é despesa/receita real"?).
- Incluído: desenhar o fluxo de UX em alto nível (não protótipo visual, só o fluxo) — quando/onde
  o Admin veria esses itens pendentes (no fechamento diário? numa tela separada?), como seria
  classificar um item, o que acontece com o fechamento já fechado quando um item antigo é
  classificado depois.
- Incluído: propor, com justificativa, se isso deve rodar automático (ex. toda vez que o
  fechamento "Sistema" é feito, dispara a comparação) ou sob demanda (Admin clica "conciliar
  agora").
- Incluído: estimar o esforço/complexidade de cada parte pro PM decidir prioridade e sequência de
  demandas de implementação (provavelmente uma pro 02-DADOS de schema, uma ou mais pro 03-APP).
- Explicitamente fora de escopo: escrever qualquer código, criar qualquer tabela, mexer em
  qualquer dado de produção. Resolver o `ped-1251` ou o R$300 de hoje manualmente (isso continua
  sendo ação direta do Edvam, esses casos servem só de exemplo real pro desenho).

## Critérios de aceite
- [ ] Mapeamento claro do que é possível por conta (API real vs só saldo informado)
- [ ] Proposta de modelo de dado pro "item não registrado pendente"
- [ ] Fluxo de UX em alto nível, com os casos reais de hoje (R$300, cofrinho do MP) como exemplo
      concreto de como ficariam nesse novo modelo
- [ ] Recomendação de automático vs sob demanda, com justificativa
- [ ] Estimativa de esforço/sequência de demandas de implementação

## Riscos e cuidados
Isto é desenho, não decisão final — o PM e o Edvam revisam antes de qualquer demanda de
implementação nascer. Não superdimensionar: o objetivo é algo que o Admin realmente vai usar no
dia a dia, não uma ferramenta de auditoria complexa demais pra ser prática.

## Referências
Demanda 222 (auditoria completa, achado do R$300 sem registro e do cofrinho do MP repetido).
`pm/equipe/05-financeiro.md` (seu briefing — releia a seção de metodologia, conciliação de 3
pontas é exatamente a base conceitual disto).

## Relato de execução

Desenho completo entregue em `pm/conhecimento/desenho-conciliacao-automatica.md`. Isto é uma
demanda de desenho — nenhum código, tabela ou dado de produção foi tocado, conforme escopo.

- **O que foi feito**: mapeei as 6 contas em 2 grupos com granularidade de conciliação diferente —
  Mercado Pago tem API real (`/v1/payments/search`), permite comparar transação a transação, com
  3 níveis de confiança de match (por `external_reference` → por valor+data quando a referência
  falta, caso real do R$300 de hoje → sem candidato, vira pendência); RecargaPay/Stone/Caixa
  Econômica não têm API, só saldo diário informado — só dá pra isolar a diferença AGREGADA por
  conta por dia (variação informada vs calculada), reaproveitando a mesma lógica que a demanda 216
  já rodou manualmente uma vez. Propus schema de `jsgrafica_conciliacao_pendencias` (campos, não
  criei tabela), com a decisão central de que classificar um item deve gerar o registro real
  correspondente (saída/transferência/entrada), não só rotular — e registrei que "entrada avulsa"
  é uma peça que não existe hoje no sistema e precisa de decisão de produto antes de virar código.
  Desenhei o fluxo de UX (card no Fechar Caixa + tela "Conciliação" separada + modal de
  classificação) e, o ponto mais delicado, o que fazer quando um item de um dia JÁ FECHADO é
  classificado depois: **não recalcular automaticamente** o fechamento antigo (a mesma lição cara
  da demanda 217, cadeia de correção manual que já deu errado 2x nesta investigação) — só sinalizar
  "fechamento desatualizado" e exigir recálculo manual confirmado, um dia de cada vez. Recomendei
  automático (matching + gap agregado rodando na hora do fechamento "Sistema", já que o dado já
  está sendo consultado/digitado ali mesmo) + on-demand complementar (botão "conciliar de novo").
  Sequência de demandas de implementação proposta: 1) tabela (02-DADOS) → 2/3) matching MP + gap
  agregado em paralelo (03-APP) → 4) UI (03-APP) → 5) recálculo de fechamento antigo por último,
  por ser o mais delicado.
- **Testes realizados e resultado**: não aplicável (demanda de desenho, sem código pra testar) — a
  lógica de matching proposta pro Mercado Pago já foi validada na prática nas investigações da
  demanda 222 (usei exatamente esse raciocínio pra achar o R$300 sem vínculo).
- **Achados fora do escopo**: nenhum novo — os 2 casos reais usados como exemplo (R$300, cofrinho
  do MP) já vinham da demanda 222, não são achados novos desta demanda.
- **Status final**: concluída. Aguarda revisão do PM/Edvam antes de qualquer demanda de
  implementação nascer (conforme o próprio escopo pede) — em especial a decisão sobre "entrada
  avulsa" e o limiar de materialidade proposto (R$5) pro gap agregado.
