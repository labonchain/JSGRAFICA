# 223 — Transferência entre contas conta como saída mas nunca como entrada no fechamento

Status: concluída
Criada em: 2026-07-21
Aprovada em: 2026-07-21
Concluída em: 2026-07-22
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado da auditoria completa (demanda 222, 05-FINANCEIRO), confirmado com dado real: em
`getResumoDia` (`lib/supabase-admin.ts:149-184`), `totalSaidas` soma toda `jsgrafica_saidas.valor`
do dia (inclui a saída que a categoria `transferencia_entre_contas` gera, sem exclusão), mas
`totalEntradas` só soma `jsgrafica_vendas` + `jsgrafica_pedidos` confirmados — **nunca olha
`jsgrafica_transferencias.conta_destino`**.

Confirmado com dado real de 17/07: as 2 transferências do dia (Caixa Econômica→RecargaPay R$109 +
Mercado Pago→Dinheiro Gabi R$18, R$127 no total) entraram no `total_saidas` gravado, mas em
nenhum lugar aumentaram `total_entradas`. Resultado: toda vez que a ferramenta "Transferir entre
contas" (201) é usada, o `resultado_dia`/`saldo_acumulado` do fechamento "Sistema" cai no valor
da transferência, mesmo o dinheiro nunca tendo saído da empresa — as colunas `saldo_*` (por
conta) continuam certas, só o resultado agregado do dia fica distorcido. Essa ferramenta é
literalmente o "jeito certo" de mover saldo entre contas (mantido pela 218), então essa distorção
vai se repetir toda vez que for usada.

## Objetivo
Usar "Transferir entre contas" não deve distorcer `total_entradas`/`resultado_dia`/
`saldo_acumulado` do fechamento "Sistema" — o dinheiro que chega numa conta via transferência
precisa contar como entrada, do mesmo jeito que já conta como saída na conta de origem.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirme a leitura do código e o cálculo exato da correção proposta, relate ao PM, e só depois de
confirmação explícita implemente e faça deploy.

## Escopo
- Incluído: `getResumoDia` (`lib/supabase-admin.ts`) passa a somar
  `jsgrafica_transferencias.valor` (filtrando pela mesma janela de dia-caixa já usada) em
  `totalEntradas` quando a transferência tiver `conta_destino` preenchido.
- Incluído: recalcular e propor a correção retroativa dos dias que já têm transferência lançada
  (hoje: só 17/07, as 2 transferências já conhecidas) — mas **não aplicar a correção retroativa
  sem antes reportar o valor exato ao PM** (mesmo cuidado de sempre com fechamento já fechado).
- Incluído: conferir se `app/api/fechamento/route.ts` (GET e POST) usa `getResumoDia` diretamente
  ou recalcula por conta própria — se recalcular, aplicar o mesmo ajuste lá também.
- Explicitamente fora de escopo: mudar a lógica de `totalSaidas` (já está correta, a saída de
  transferência deve continuar contando como saída na conta de origem). Mudar qualquer coisa da
  demanda 201 (mecanismo de transferência em si).

## Critérios de aceite
- [x] `totalEntradas` passa a incluir transferências recebidas na janela do dia
- [x] Testado com transferência sintética (criar, conferir `totalEntradas` antes/depois, apagar)
- [x] Confirmado que `totalSaidas`/saldo por conta não mudam (só a leitura de entradas)
- [x] Proposta de correção retroativa relatada com valor exato, aplicada só após confirmação
      (escopo cresceu de 1 pra 3 dias entre o relato e a aprovação — 20/07 e 21/07 ganharam
      transferência nova nesse meio-tempo; ver relato)

## Riscos e cuidados
Não contar a mesma transferência duas vezes (uma como entrada, outra ainda pesando como saída de
menos) — o efeito esperado é `resultado_dia` do dia da transferência subir pelo valor dela, nada
mais.

## Referências
Demanda 222 (`pm/demandas/222-...md`, seção 3.1). Demanda 201 (mecanismo de transferência).
Demanda 218 (removeu a tela de pendências, manteve a transferência como mecanismo correto).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - `getResumoDia` (`lib/supabase-admin.ts`) passou a somar `jsgrafica_transferencias.valor` do
    dia em `totalEntradas`, com o mesmo filtro por `operador` já aplicado a `jsgrafica_saidas`
    (a coluna `operador` existe em `jsgrafica_transferencias` desde a 201). `totalSaidas` e o
    cálculo por conta digital (`saldo_*`) não foram tocados — a saída da transferência na conta
    de origem continua contando exatamente como antes.
  - Confirmado: `app/api/fechamento/route.ts` (GET e POST, branch `!operador`) chama
    `getResumoDia` diretamente — o fix em um lugar só já cobre os dois, sem precisar duplicar
    lógica lá.
- Testes realizados e resultado:
  - `npx tsc --noEmit`/`npm run build` limpos.
  - Teste sintético (`scripts/teste-223-transferencia-entrada.ts`, mantido no repo): criada 1
    transferência real (Stone→RecargaPay, R$42,50) num dia isolado (2099, sem dado real
    nenhum) — `totalEntradas` subiu exatamente R$42,50, `totalSaidas` subiu exatamente R$42,50
    (só a saída de sempre, sem duplicar), filtro por `operador` bateu certo (viu a transferência
    do operador dela, não viu a de outro operador). Apagado no final, dia voltou a 0/0.
  - **Correção retroativa aplicada, um dia de cada vez, mesma disciplina da 217** — escopo
    cresceu de 1 dia (17/07, único conhecido quando a demanda foi escrita) pra 3: 20/07 e 21/07
    ganharam transferência nova entre a investigação e a aprovação. Corrigidos em sequência
    (17→20→21, cada um usando o `saldo_acumulado` JÁ corrigido do dia anterior como
    `saldo_anterior`):
    - 17-07-26: `total_entradas` 602,30→729,30 (+127,00), `resultado_dia` -33,51→93,49,
      `saldo_acumulado` 227,24→**354,24**.
    - 20-07-26: `total_entradas` 1265,01→1315,01 (+50,00), `resultado_dia` 242,89→292,89,
      `saldo_acumulado` 470,13→**647,13** (herda o novo `saldo_anterior` de 354,24).
    - 21-07-26: `total_entradas` 349,25→379,25 (+30,00), `resultado_dia` 170,33→200,33,
      `saldo_acumulado` 640,46→**847,46** (herda o novo `saldo_anterior` de 647,13).
    - Cadeia inteira reconferida depois (`saldo_anterior + resultado_dia = saldo_acumulado` em
      toda linha "Sistema" de 09/07 a 21/07): bate exata. 06/07 e 08/07 permanecem com a
      dessincronia já conhecida e explicada (âncora intencional / demanda 131), intocados.
  - **Erro cometido e corrigido durante a própria aplicação, registrado com transparência**:
    a 1ª versão do script de correção recalculava o dia inteiro AO VIVO via `getResumoDia` (não
    só somava o delta da transferência) — ao aplicar em 20/07, isso silenciosamente absorveu
    um drift de **R$51,20 não relacionado à 223** (o componente vendas+pedidos mudou entre o
    momento em que o fechamento foi salvo, 22/07 de madrugada, e agora — mesmo fenômeno já
    achado e registrado como "em aberto" pela 222, seção 3.2, para o dia 21/07, só que maior
    aqui). Percebi o problema comparando o total_entradas recalculado contra o original antes de
    seguir pro 21/07, revertive a lógica: reescrevi o script (`corrigir-223-fechamento-dia-v2.ts`)
    pra somar o delta da transferência DIRETO no `total_entradas` ORIGINAL (congelado), sem
    recalcular mais nada ao vivo, corrigi 20/07 de novo com o valor certo, e confirmei que 21/07
    também tinha o mesmo tipo de drift (R$30,80 — o mesmo já flagrado pela 222) antes de aplicar
    lá do mesmo jeito seguro. Os valores finais aplicados (354,24 / 647,13 / 847,46) batem
    exatamente com os que eu tinha calculado à mão e relatado ANTES de implementar qualquer
    código — a versão final está correta, só o caminho até ela teve 1 correção no meio.
- Achados fora do escopo:
  - O drift de R$51,20 no total_entradas "vendas+pedidos" de 20/07 (mesma classe do R$30,80 já
    achado pela 222 no 21/07) não foi investigado a fundo — é o mesmo tipo de fenômeno "live vs
    congelado no fechamento" que a 222 já registrou como pendência em aberto, não uma causa nova.
    Reportando a ocorrência em 20/07 como um segundo caso do mesmo padrão, pro PM decidir se vale
    a pena investigar a causa raiz.
- Status final: concluída, testada e em produção — deploy `dpl_62K5Jx6kNo7zqXptKBegtwqvSDk9`,
  alias confirmado em `pdv.jsgrafica.site` e `admin.jsgrafica.site`. Correção retroativa aplicada
  e reconferida nos 3 dias (17, 20, 21/07).
