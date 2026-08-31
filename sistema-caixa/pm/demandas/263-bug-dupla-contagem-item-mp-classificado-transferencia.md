# 263 — Bug relacionado à 262: pagamento MP classificado como transferência conta 2x no gap agregado

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-14
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
Achado durante a mesma sessão de fechamento/conciliação de julho que gerou a demanda 262 (bug de
dupla contagem de transferência já corrigido). Esse aqui é parecido, mas em outro lugar do código:
quando um item `mercadopago_pagamento` (Pix recebido sem pedido correspondente) é classificado
como **"Transferência"** na tela de Conciliação, o valor dele acaba contando 2 vezes no gap
agregado do Mercado Pago — pra pior, não pra melhor.

**Como acontece**: `conciliarMercadoPagoDoDia` (`lib/conciliacao.ts`) sempre subtrai o valor de
todo item `mercadopago_pagamento` já existente de `somaPendenciasMPDoDia`, **independente do
status** (`pendente`, `classificado` ou `ignorado` — o código só olha `tipo_origem` +
`origem_externa_id`, nunca `status`). Isso é correto pra itens resolvidos como "Sabido"/"Entrada"/
"Saída" (não tocam no cálculo de `resultadoCalculado`). Mas quando o item é classificado como
**"Transferência"**, `criarTransferencia` grava uma linha real em `jsgrafica_transferencias`, que
`calcularEntradaSaidaConta` conta como entrada de verdade (`transfEntrada`) — ou seja, o mesmo
valor entra no cálculo pela `resultadoCalculado` **e** continua sendo subtraído de novo em
`somaPendenciasMPDoDia`. O item explicado faz o "buraco" parecer maior, não menor.

**Prova concreta, dado real (20-07-26)**: item de R$611,26 (Pix "recebido do saldo que já estava
na conta") foi classificado como transferência vinda da Caixa Econômica (explicação real,
confirmada pelo Edvam — financiou o pagamento da conta da Placa Solar). Antes da classificação, a
diferença ajustada do Mercado Pago era −R$731,18. Depois de classificar (dado real, já explicado,
deveria ter ficado menor) o número **piorou** pra −R$1.342,44 — uma diferença de exatamente
R$611,26 (2x o valor do item), confirma o dobro.

## Objetivo
Corrigir pra que um item `mercadopago_pagamento` classificado como "Transferência" pare de ser
subtraído em `somaPendenciasMPDoDia` (já que o valor dele passa a estar corretamente refletido via
`transfEntrada`/`transfSaida` em `calcularEntradaSaidaConta` — contar só uma vez).

## Escopo
- Incluído: em `conciliarMercadoPagoDoDia`, ao encontrar um item já existente
  (`origem_externa_id` bate), só somar em `soma` (e por consequência em `somaPendenciasDoDia`) se
  o `status` **não** for `classificado` com `classificacao.tipo === 'transferencia'` — nesse caso
  específico, não subtrai (o valor já está contado do outro lado da fórmula).
- Incluído: mesma lógica pros outros tipos de item (`saldo_dia_agregado` não tem esse problema
  hoje porque não passa por essa dedução — confirmar se realmente não precisa de ajuste também).
- Incluído: recalcular (via `/api/conciliacao/rodar`) os dias/contas que já têm item
  `mercadopago_pagamento` classificado como transferência e que ainda têm pendência
  `saldo_dia_agregado` `pendente` na mesma conta/dia — casos conhecidos até agora: 20-07-26 e
  21-07-26 (Mercado Pago, ambos por causa da correção do R$611,26/R$300 feita nesta sessão).
- Explicitamente fora de escopo: revisar as classificações já feitas — estão certas, só o número
  do gap agregado que fica temporariamente distorcido até essa correção.

## Critérios de aceite
- [ ] `conciliarMercadoPagoDoDia` corrigida — item classificado como transferência não conta 2x
- [ ] Testado contra o caso real do 20-07-26 (R$611,26): depois da correção, o gap ajustado do
      Mercado Pago deve refletir só a diferença real, sem o dobro do valor do item
- [ ] Pendências `saldo_dia_agregado` afetadas recalculadas (mesma disciplina da 262: só as
      `pendente`, nunca mexer nas `classificado`)

## Referências
Relacionado a `pm/demandas/262-bug-dupla-contagem-transferencia-conciliacao.md` (mesma sessão,
bug parecido em outra função). `lib/conciliacao.ts` (`conciliarMercadoPagoDoDia`,
`calcularEntradaSaidaConta`).

## Relato de execução

- **O que foi feito**: `conciliarMercadoPagoDoDia` (`lib/conciliacao.ts`) agora busca `status` e
  `classificacao` junto com `valor` ao checar se um item `mercadopago_pagamento` já existe — quando
  `status === 'classificado'` e `classificacao.tipo === 'transferencia'`, o valor **não** é somado
  em `soma`/`somaPendenciasDoDia` (o dinheiro já está contado do outro lado, via `transfEntrada` em
  `calcularEntradaSaidaConta`). Outros desfechos ('sabido'/'entrada'/'saida'/'ignorado'/'pendente')
  continuam descontando normalmente — nenhum deles duplica em nenhum outro lugar da fórmula.
- **Confirmado, não presumido**: `saldo_dia_agregado` realmente não tem o mesmo problema — o dedup
  em `calcularGapContasSemApi` só decide "cria ou não cria" por existência de linha (não soma/
  subtrai valor de pendências antigas), então não há segundo lugar onde o mesmo valor entraria de
  novo.
- **Levantamento de itens afetados**: busquei TODO item `mercadopago_pagamento` com
  `status='classificado'` e `classificacao->>'tipo'='transferencia'` — 5 no total (04-08-26 ×2,
  20-07-26, 21-07-26, 29-07-26). Cruzando com pendências `saldo_dia_agregado` da mesma conta/dia:
  **só 20-07-26 e 04-08-26 ainda estavam `pendente`** — 21-07-26 e 29-07-26 já tinham sido
  classificadas por outra via nesse meio-tempo (não mencionadas na demanda original, que citava só
  20/21-07 como "casos conhecidos até agora" — a lista mudou desde então), então **não toquei
  nelas**, conforme a própria disciplina da demanda.
- **Testado contra o caso real do 20-07-26 (R$611,26)**: recalculei isolando só o efeito do bug,
  com o dado de hoje — `somaPendenciasDoDia` fixo (correto) = R$11,60; se a query antiga (buggy)
  rodasse agora, seria R$11,60 + R$611,26 = R$622,86 (soma de novo o item já explicado). Rodando as
  duas contas: `diferencaAjustada` corrigida = -R$724,66; a hipotética com o bug ainda ativo seria
  -R$1.335,92 — diferença de **exatamente R$611,26**, confirma que o fix elimina a dupla contagem
  na medida certa. (Nota: o valor gravado antes da correção nesta pendência era -R$731,18, não o
  "dobro" citado no exemplo original da demanda — o número já tinha sofrido outros ajustes/drift
  desde que foi calculado a última vez, dias atrás; o que importa e foi verificado é que a fórmula
  em si está correta agora, não uma comparação direta contra um valor antigo já desatualizado por
  outros motivos.)
- **Pendências recalculadas**: apaguei só as 2 `pendente` afetadas (20-07-26 R$-731,18 e 04-08-26
  R$-170,58 — conferido `status='pendente'` nas 2 antes de apagar) e rodei
  `POST /api/conciliacao/rodar` pra cada dia, já em produção com o fix. Resultado: 20-07-26 →
  **-R$724,66** (novo id `bdd2f392`); 04-08-26 → **-R$170,58**, sem mudança de valor (o cálculo
  correto já dava esse número mesmo antes — plausível que essa pendência específica tenha sido
  criada antes das 2 classificações de transferência daquele dia acontecerem, então nunca chegou a
  ficar errada na prática). Nenhuma pendência `classificado` foi tocada.
- **Testes realizados e resultado**: `npx tsc --noEmit` e `npm run build` limpos. Deploy em
  produção: `dpl_4ai1rb784EcKhbaaePfsCairX8vq`, aliases confirmados via `vercel inspect` em
  `pdv.jsgrafica.site` e `admin.jsgrafica.site`. Recálculo dos 2 dias afetados feito via API real
  já em produção (não simulado), valores conferidos no banco depois.
- **Achados fora do escopo**: ao recalcular 20-07-26, notei que a conta `caixa_economica` também
  aparece com uma diferença de R$490,26 no resultado do `conciliarDia` (`pendenciaCriada: false` —
  já existe pendência prévia pra essa conta/dia, então nada novo foi criado) — é o lado ORIGEM da
  mesma transferência de R$611,26 (Caixa Econômica → Mercado Pago) aparecendo do outro lado do
  cálculo. Não investiguei mais fundo por estar fora do escopo específico desta demanda (que é só
  sobre o item Mercado Pago classificado como transferência) — registrando só como observação, sem
  evidência de que seja um bug (pode ser só falta de saldo informado da Caixa Econômica naquele
  dia, que já é limitação conhecida).
- **Status final**: concluída.
