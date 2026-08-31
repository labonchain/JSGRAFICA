# 212 — Transferência pra gaveta física não aumenta o esperado de quem recebeu

Status: concluída
Criada em: 2026-07-18
Aprovada em: 2026-07-18
Concluída em: 2026-07-18
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real do Edvam (2026-07-18): é operação recorrente na gráfica trocar saldo digital por
dinheiro físico — alguém (funcionária, às vezes outra pessoa) tem cédulas/moedas e precisa desse
valor em Pix; o negócio manda o Pix (do Mercado Pago ou Caixa Econômica) e fica com o dinheiro
físico correspondente, que passa a integrar o saldo de cédulas/moedas da gráfica. Não é custo,
é só o mesmo saldo mudando de forma (digital → físico). Investigação do PM confirmou no código:
`getTotalDinheiroRecebidoOperador` (`lib/supabase-admin.ts`) só soma `jsgrafica_pedidos` — nunca
olha `jsgrafica_transferencias`. E `POST /api/transferencias` (demanda 201) só sabe atribuir o
lado da SAÍDA a uma gaveta física quando ela é a ORIGEM (`OPERADOR_POR_CONTA_DINHEIRO`) — quando
a gaveta física é o DESTINO (conta digital → dinheiro de alguém), nada aumenta o esperado de
quem recebeu. O sistema sabe modelar dinheiro físico virando saldo digital, mas não o caminho
contrário — a mesma lacuna da 196/207/210, agora num terceiro lugar.

## Objetivo
Uma transferência com destino numa gaveta física (Dinheiro Zu / Dinheiro Gabi) aumenta
corretamente o esperado de dinheiro físico de quem recebeu — simétrico ao que já acontece
quando a gaveta física é a origem.

## Escopo
- Incluído: `getTotalDinheiroRecebidoOperador` (`lib/supabase-admin.ts`) passa a somar também
  transferências (`jsgrafica_transferencias`) cujo `conta_destino` seja a gaveta do operador
  (mesmo mapa `dinheiro_zu`→Zu, `dinheiro_gabi`→Gabi já usado do lado da saída) — dentro da
  mesma janela de dia de caixa já usada pra pedidos.
- Testar o caso real: transferência Mercado Pago → Dinheiro (Gabi) aumenta o esperado dela pelo
  valor certo.
- Conferir e corrigir simetricamente qualquer outro lugar que dependa do mesmo cálculo de
  "esperado de dinheiro físico" (ex. diagnóstico de fechamento, se ele recalcula por conta
  própria em vez de reaproveitar a função) — documentar o que encontrar.
- Explicitamente fora de escopo: mudar a lógica de quando uma transferência resolve pendência
  (201) — isso já funciona, não mexer.

## Critérios de aceite
- [x] Transferência com destino em gaveta física aumenta o esperado de quem recebeu
- [x] Transferência com origem em gaveta física continua funcionando como já estava (sem
      regressão)
- [x] Testado com transferência sintética Mercado Pago → Dinheiro (Zu ou Gabi)
- [x] Conferido se outros lugares que calculam "esperado" precisam do mesmo ajuste

## Riscos e cuidados
Não duplicar contagem — uma transferência não pode contar duas vezes (uma vez como saída de
outra conta, outra vez inflando alguém errado). Testar os dois lados da mesma transferência
juntos, não isolado.

## Referências
`lib/supabase-admin.ts` (`getTotalDinheiroRecebidoOperador`). `app/api/transferencias/route.ts`
(`OPERADOR_POR_CONTA_DINHEIRO`). Demanda 196/207/210 (mesma família de lacuna: gaveta física sem
dono direto no lançamento). Demanda 201 (mecanismo original de transferência). Caso real: R$18,
Mercado Pago → Dinheiro (Gabi), 17/07/2026.

## Relato de execução
Implementado em `getTotalDinheiroRecebidoOperador` (`lib/supabase-admin.ts`): além da soma
existente de `jsgrafica_pedidos` (Dinheiro), passou a somar também `jsgrafica_transferencias`
cujo `conta_destino` seja a gaveta física do operador (`dinheiro_zu`/`dinheiro_gabi`), na mesma
`data_dia` da transferência. Reaproveitado o mapa `CONTA_ORIGEM_POR_OPERADOR` (criado na 200,
usado do lado da saída) — movido pra cima de `getTotalDinheiroRecebidoOperador` no arquivo (era
declarado só depois, perto de `getTotalSaidasOperador`) pra os dois lados (saída que sai da
gaveta, entrada que entra nela) compartilharem a MESMA fonte de verdade, sem duplicar a lista.
As duas somas (pedidos + transferências) são de tabelas diferentes e nunca se sobrepõem — uma
transferência não tem como aparecer nos dois lados da mesma soma.

**Outros lugares que calculam "esperado"**: conferido `app/api/fechamento/route.ts` (GET e POST,
caminho por operador) — os DOIS já chamam `getTotalDinheiroRecebidoOperador` diretamente, nenhum
recalcula por conta própria; o fix vale pra eles automaticamente, sem tocar em nada lá. Conferido
também `lib/diagnostico.ts` (Camadas 149/150, usado pelo resumo da IA da 152) — o "esperado" que
aparece ali (`saldo_acumulado`) vem de uma LEITURA da linha já salva em `jsgrafica_fechamento`
(snapshot histórico gravado no momento em que o fechamento daquele dia foi feito, via o mesmo
`POST /api/fechamento` que já usa a função corrigida) — não é um recálculo paralelo, então nada
a corrigir ali: fechamentos NOVOS (a partir de agora) já saem certos; fechamentos ANTIGOS
continuam mostrando o valor histórico que foi realmente calculado/salvo naquele dia (correto —
não é papel desta demanda reescrever o passado, só o cálculo daqui pra frente).

Teste (sintético, apagado depois, os 2 lados da mesma vez conforme pedido no risco da demanda):
- `Mercado Pago → Dinheiro (Gabi)`, R$18 (mesmo valor do caso real) — `totalEntradas` da Gabi foi
  de 0 pra 18, `totalSaidas` dela ficou em 0 (não mexeu no lado errado).
- `Dinheiro (Zu) → Caixa Econômica`, R$7, lançada JUNTO (mesmo teste, pra provar que os 2 lados
  não se contaminam) — `totalSaidas` da Zu foi de 0 pra 7, `totalEntradas` dela ficou em 0.
- Cancelei as 2 transferências (`DELETE /api/transferencias`, remove os 2 lados/saída junto) —
  confirmado que ambos os operadores voltaram a 0 em tudo, sem sobra.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_8vPUyTtwLTZUi9vWheyMVQgufkTZ`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.
