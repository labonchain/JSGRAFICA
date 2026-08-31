# 264 — Tela Mercado Pago (Financeiro): período diário e total de taxas pagas

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-14
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
Achado durante a conciliação de julho (2026-08-01) — o Edvam estava usando a tela "💳 Mercado
Pago" (Financeiro, `components/TelaMercadoPago.tsx`, API
`app/api/mercadopago/movimentacoes/route.ts`, demanda 084) pra tentar conferir o extrato de dias
específicos e sentiu falta de 2 coisas.

## Objetivo
Adicionar 2 melhorias na tela: filtro de período diário (ver as movimentações de 1 dia
específico) e um total de taxas pagas no período selecionado.

## Escopo
- Incluído: hoje o filtro só tem "7 dias / 30 dias / 90 dias" (janela relativa a agora,
  `app/api/mercadopago/movimentacoes/route.ts`, parâmetro `dias`). Adicionar opção de período
  **diário** — ver as movimentações de um dia específico (passado ou hoje), não só janelas
  relativas fixas.
- Incluído: calcular e mostrar o **total de taxas pagas** no período selecionado — a API já traz
  `valorBruto` e `valorLiquido` por movimentação (`transaction_details.net_received_amount`), a
  taxa é a diferença bruto−líquido de cada uma; somar isso e exibir como um número novo na tela
  (ao lado de "Saldo bruto"/"Saldo líquido").
- Explicitamente fora de escopo: qualquer mudança na lógica de conciliação (227/228) — essa tela
  é só visualização/consulta, não altera nenhum registro do sistema.

## Critérios de aceite
- [ ] Dá pra escolher um dia específico e ver só as movimentações daquele dia
- [ ] Total de taxas pagas no período selecionado aparece na tela, calculado a partir da
      diferença bruto/líquido de cada movimentação aprovada
- [ ] Filtros antigos (7/30/90 dias) continuam funcionando

## Referências
`components/TelaMercadoPago.tsx`, `app/api/mercadopago/movimentacoes/route.ts` (demanda 084).
Achado em 2026-08-01, durante a conciliação de julho.

## Relato de execução

- **O que foi feito**: `app/api/mercadopago/movimentacoes/route.ts` ganhou o parâmetro `dataDia`
  (DD-MM-AA, mesma convenção usada em todo o resto do sistema), com prioridade sobre `dias` quando
  informado — usa `limitesDiaCaixaUTC` (mesma função que o fechamento/conciliação já usam) pra
  cortar exatamente o dia-caixa em horário de Recife, não um recorte aproximado. Limite de busca
  sobe de 50 pra 100 quando é dia específico (janela bem menor que 7/30/90 dias, mas usei o mesmo
  teto dos scripts de investigação por segurança). `totalTaxas` calculado como
  `Σ(valorBruto − valorLiquido)` das movimentações aprovadas — só quando `valorLiquido` realmente
  veio da API (`!== null`), pra não contar taxa zero quando o dado simplesmente não veio (o código
  antigo já tinha um fallback `?? m.valorBruto` pro saldo líquido que esconderia isso se eu somasse
  ingenuamente). `components/TelaMercadoPago.tsx`: botões de 7/30/90 dias ganharam um `<input
  type="date">` ao lado (mesmo padrão de conversão DD-MM-AA↔AAAA-MM-DD já usado em
  TelaEntradas.tsx/TelaConciliacao.tsx) que sobrepõe a janela relativa quando uma data é escolhida;
  card novo "Total de taxas pagas" na grade de estatísticas (que virou 4 colunas); label do "Saldo
  bruto" passa a dizer "dia DD-MM-AA" em vez de "últimos N dias" quando um dia específico está
  selecionado.
- **Testes realizados e resultado**: em produção, `GET /api/mercadopago/movimentacoes?dataDia=24-07-26`
  → `periodo.dataDia: "24-07-26"`, janela exata `2026-07-24T03:00:00.000Z` a
  `2026-07-25T03:00:00.000Z` (bate com o dia-caixa certo), `totalTaxas: 5.12` conferido manualmente
  contra `saldoBruto (2203,20) − saldoLiquido (2198,08) = 5,12` — bate exato. Filtros antigos
  (7/30/90 dias) não tiveram a lógica tocada, só o `if/else` novo que decide qual janela usar.
  `npx tsc --noEmit` e `npm run build` limpos.
- **Achados fora do escopo**: nenhum.
- **Status final**: concluída. Deploy em produção junto com 261/269 (mesmo lote), aliases
  confirmados em `pdv.jsgrafica.site`/`admin.jsgrafica.site`. Nota pro PM: o valor de
  `saldoBruto`/`totalTaxas` desta tela vem de `/v1/payments/search` (só pagamentos recebidos, igual
  sempre foi desde a 084) — é normal não bater exatamente com o total "SETTLEMENT" do relatório
  "Dinheiro em conta" da demanda 265 pro mesmo dia (fontes/escopos de dado diferentes, ambas
  corretas dentro do que cada uma se propõe a mostrar).
