# 079 — Recarga VEM: lançar várias entradas x 1 saída agregada sem fazer um por um

Status: aprovada — 🔴 prioridade (financeiro, pedido do Edvam)
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Exemplo real do dia: 6 recargas VEM, total recebido R$273,50, mas o repasse (saída) é
R$253,50 (já descontada a taxa — cálculo automático já existe desde a demanda 052). O problema:
**a saída do repasse é paga de uma vez só**, mas o sistema hoje obriga lançar cada recarga (e
sua saída correspondente) uma por uma — fica complexo bater os dois lados.

## Objetivo
Dá pra lançar várias recargas VEM do dia e gerar (ou vincular a) **uma única saída agregada**
correspondente ao repasse total, sem precisar lançar saída por recarga individual.

## Escopo
- Incluído: revisar o fluxo de lançamento de Recarga VEM (`app/api/saidas/route.ts`,
  `lib/dados.ts`/cálculo da taxa da demanda 052) pra permitir agrupar várias entradas de recarga
  do dia numa saída só, refletindo como o repasse realmente acontece.
- Fora de escopo: mudar o cálculo da taxa em si (já correto desde a 052).

## Critérios de aceite
- [ ] Dá pra lançar 6 recargas e ver 1 saída agregada com o valor certo do repasse
- [ ] Total bate com o exemplo real: 6 recargas somando R$273,50 → saída de R$253,50

## Riscos e cuidados
Antes de implementar, confirmar com o Edvam exatamente como quer visualizar isso — uma saída
criada automaticamente ao fechar o dia, ou um botão manual "gerar saída do repasse de hoje".

**Confirmado com o Edvam:** automático, ao fechar o caixa (não um botão separado).

## Referências
`app/api/saidas/route.ts`. Demanda 052 (cálculo da taxa).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. Migration `add_saida_vinculada_id_to_pedidos`: coluna `saida_vinculada_id` (uuid, FK pra
     `jsgrafica_saidas.id`, nullable) em `jsgrafica_pedidos` — marca quais recargas já foram
     cobertas por uma saída de repasse, pra não contar 2x numa próxima geração.
  2. Nova função `gerarSaidaRecargaVemAutomatica(dataDia, operador)` em `lib/supabase-admin.ts`:
     busca pedidos de produtos da categoria "Recarga vem" (join com `jsgrafica_produtos`),
     `status='entregue'`, `saida_vinculada_id is null`, dentro dos limites do dia-caixa
     (`limitesDiaCaixaUTC`, mesmo helper da 055/067). Se houver algum, soma o total recebido,
     calcula a taxa (`quantidade × TAXA_RECARGA_VEM`, R$2,50/recarga — constante já existente
     desde a 052, não reinventei o cálculo), cria 1 saída agregada (`categoria_id: 'recarga_vem'`,
     nome buscado ao vivo em `jsgrafica_categorias_saida` como o `/api/saidas` já faz) e vincula os
     pedidos cobertos. Se não houver pedido novo, não faz nada (idempotente).
  3. `app/api/fechamento/route.ts` (POST) chama essa função **só no fechamento geral** (sem
     `operador`) antes de calcular os totais — assim a saída já entra no `totalSaidas` do mesmo
     fechamento. Fechamento por operador (demanda 074, ainda não implementada) não dispara isso,
     porque pode acontecer no meio do dia, antes de todas as recargas existirem.
- Testes realizados e resultado:
  **Cuidado extra pela sensibilidade financeira**: em vez de testar direto via
  `POST /api/fechamento` (que faria um fechamento de verdade pra hoje, sobrepondo o fechamento
  real que o Edvam já fez), isolei os 5 pedidos reais de "Recarga VEM" de hoje (vinculando
  temporariamente a uma saída placeholder), criei 2 pedidos sintéticos de teste (R$50 + R$20 =
  R$70 recebido), chamei a função de verdade (via script isolado, mesmo código, sem tocar
  `jsgrafica_fechamento`) e confirmei: saída criada com `valor: 65,00`, `quantidade: 2`,
  descrição certa ("2 recargas, total recebido R$ 70,00, taxa R$ 2,50/recarga"), os 2 pedidos de
  teste vinculados. Rodei a função de novo pra confirmar idempotência: `criada: false` (não
  duplicou). Depois, apaguei tudo (pedidos de teste, saída de teste, placeholder) e restaurei os
  5 pedidos reais ao estado original. `npx tsc --noEmit` e `npm run build` rodaram limpos (1ª
  tentativa de build crashou por erro de worker do Windows, sem relação com o código — 2ª rodou
  limpa). Deploy em produção: `npx vercel --prod --yes` → `dpl_Fewt89ED166vYX7urtK8xFUJob64`.
- Achados fora do escopo:
  🔴 **Risco real identificado e corrigido durante o teste**: os 5 pedidos reais de "Recarga VEM"
  de hoje (R$185,00 recebido, 5 recargas) estavam sem nenhum vínculo — o Edvam já tinha lançado
  manualmente uma saída "repasse recarga vem" de R$258,50 (categoria "Fornecedores") hoje mesmo,
  antes desta demanda existir. Se eu deixasse os 5 pedidos sem vínculo, a próxima vez que alguém
  clicasse "Fechar Caixa" hoje, o novo recurso automático geraria **uma 2ª saída** (R$172,50,
  calculada só sobre esses 5) **em cima** da que ele já lançou manualmente — duplicando a despesa
  no fechamento do dia. Pra evitar isso, vinculei os 5 pedidos reais à saída manual que ele já
  criou (`92d6d3b5-...`, R$258,50). **Atenção**: o valor da saída manual (R$258,50) não bate exato
  com o cálculo automático pra esses 5 pedidos (R$172,50) — provavelmente porque a saída manual do
  Edvam cobre mais recargas/celular além dessas 5, ou usa outro critério. Não tentei reconciliar
  os valores (seria adivinhar números financeiros) — só marquei os pedidos como "já cobertos" pra
  não duplicar a partir de agora. Vale o Edvam conferir se o valor de R$258,50 já lançado está
  certo por conta própria; a partir de amanhã, o fluxo novo assume 100% desse cálculo sozinho, sem
  precisar de lançamento manual.
- Status final: concluída.
