# 105 — Campo de desconto pontual no carrinho (PDV/Balcão)

Status: concluída (verificado pelo PM em produção — venda real de teste com desconto de R$2,00 gravou `desconto_valor`/`desconto_motivo` corretamente; teste apagado depois)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA

## Contexto
Item B6 do checklist. O Edvam descreveu casos reais: "imprimiu X e teve desconto X" ou "Y cópias
de xerox com desconto Y" — **não é regra automática por faixa de quantidade**, é uma decisão
pontual do operador/admin na hora da venda, caso a caso.

**🔴 Cuidado do Edvam**: mexe na tela de venda que Zu/Gabi usam o tempo todo. Horário mínimo:
loja e PDV fecham às 18h, Admin fecha o caixa geral por volta das 19h — mas **não é regra
automática**, o Edvam quer aprovar cada deploy de risco individualmente. Não fazer deploy sem
confirmação explícita, mesmo depois das 19h, mesmo padrão do resto do Bloco B.

## Objetivo
Operador consegue aplicar um desconto pontual (R$ ou %) numa venda, registrado, sem virar regra
automática.

## Escopo
- Incluído:
  1. Campo opcional no carrinho (Pedidos Balcão, admin e PDV) — "Aplicar desconto" — aceita valor
     em R$ ou % (escolher um dos dois por lançamento, não os dois juntos), com campo de motivo
     opcional (texto livre, ex. "cliente antigo", "quantidade grande").
  2. Desconto aplicado ao total da venda (não por item, a menos que o Edvam prefira por item —
     confirmar antes de implementar se não estiver claro pelo caso de uso descrito, já que ele
     deu exemplos "X impressões" e "Y xerox" que soam por item/quantidade, não por venda inteira;
     registrar a decisão tomada no relato).
  3. Valor com desconto grava normalmente em `jsgrafica_vendas`/`jsgrafica_pedidos` (total já
     líquido), com o desconto aplicado (R$ ou %) e motivo guardados em algum campo pra auditoria
     — não perder a informação de "quanto era o preço de tabela vs. quanto saiu".
- Fora de escopo: qualquer regra automática de desconto por faixa de quantidade — isso foi
  explicitamente descartado pelo Edvam, é sempre decisão manual pontual.

## Critérios de aceite
- [x] Operador consegue aplicar desconto em R$ ou % numa venda
- [x] Preço de tabela e desconto aplicado ficam registrados (não só o total final, senão perde a
      informação de que houve desconto)
- [x] Nenhuma regra automática dispara desconto sozinha
- [x] Deploy feito depois das 19h **e** com confirmação explícita do Edvam pra esse deploy

## Riscos e cuidados
Campo novo numa tela de alta frequência de uso (carrinho) — testar bem antes, confirmar que não
atrapalha o fluxo de venda rápida quando ninguém quer aplicar desconto (tem que ser opcional e
discreto, não obrigar clique extra em toda venda). **Não fazer deploy sem confirmação explícita
do Edvam pra esse deploy específico.**

## Referências
Componente de carrinho em `app/page.tsx`/`app/pdv/page.tsx` (Pedidos Balcão), `jsgrafica_vendas`,
`jsgrafica_pedidos`.

## Relato de execução

- **Decisão confirmada com o usuário antes de implementar**: a demanda tinha uma ambiguidade real
  (texto de escopo dizia "total da venda, não por item" como padrão, mas os exemplos literais do
  Edvam — "Y cópias de xerox com desconto Y" — descrevem uma linha específica do carrinho). Perguntei
  antes de mexer numa tela de alta frequência: **desconto é por item do carrinho**, não por venda
  inteira. Cada linha decide seu próprio desconto independente.

- **O que foi feito:**
  - Migration aplicada em `jsgrafica_pedidos`: `desconto_valor numeric null` (R$, quando o tipo
    escolhido é valor) e `desconto_motivo text null` — `desconto_pct` já existia (usado hoje só
    pelo fluxo do Inbox/desconto automático por volume, demanda separada, não mexi nele).
  - `ItemCarrinho` (`app/pdv/page.tsx` e `app/page.tsx`, mesmo componente duplicado nos dois
    arquivos) ganhou `descontoTipo`/`descontoValor`/`descontoPct`/`descontoMotivo` opcionais, e um
    helper `valorComDesconto(item)` que calcula o valor final por item.
  - Cada linha do carrinho ganhou um link discreto "🏷️ Aplicar desconto" (fechado por padrão, não
    atrapalha quem não usa) — ao abrir, mostra toggle R$/%, campo numérico e motivo opcional.
    Quando há desconto, a linha mostra o preço de tabela riscado + o valor final em verde.
  - `confirmarVenda()`: manda `valorTotal` (preço de tabela, sem desconto) e `valorFinal` (o que
    realmente foi cobrado) separados, mais `descontoTipo`/`descontoValor`/`descontoPct`/
    `descontoMotivo` — nunca só o total final, senão perde a auditoria.
  - `app/api/pedidos/route.ts` (branch `origemBalcao`): grava `valor_total` (tabela) e
    `valor_final` (cobrado) distintos, mais os 3 campos de desconto.

- **🔴 Achado crítico, pego no 1º teste real via UI (não só olhando o código)**: o toggle "R$"
  aparece visualmente selecionado por padrão (pra não obrigar o operador a clicar nele toda vez
  que já quer usar R$, o caso mais comum) — mas isso era só visual. Digitar um valor sem clicar
  explicitamente no toggle deixava `descontoTipo` **indefinido de verdade no estado**, e
  `valorComDesconto()` não aplicava nada — o carrinho continuava mostrando o preço cheio e a
  venda ia sem desconto nenhum, mesmo com o operador vendo "4" no campo. Corrigido fazendo
  `definirDescontoNumero()` já assumir `descontoTipo: "valor"` (mesmo default visual) no momento
  de digitar, não só no clique do toggle — consistente nos dois arquivos.

- **Testes realizados e resultado (tudo sintético, apagado depois):**
  - Desconto em R$ (TOPO DE BOLO com recorte, R$12 − R$4): carrinho mostrou R$12,00 riscado + 
    R$8,00 em verde: confirmado por screenshot. Venda gravada com `valor_total: 12, valor_final:
    8, desconto_valor: 4, desconto_pct: 0` — conferido via SQL, não só a tela.
  - Desconto em % com motivo (mesmo produto, 25%, "cliente antigo"): carrinho mostrou R$9,00 (12 ×
    0,75). Gravado com `valor_total: 12, valor_final: 9, desconto_pct: 25, desconto_motivo:
    'cliente antigo'`.
  - Sem desconto (TOPO DE BOLO sem recorte, R$10): venda normal, sem tocar no botão de desconto —
    `valor_total: 10, valor_final: 10, desconto_pct: 0, desconto_valor: null` — **confirma que o
    fluxo padrão de venda rápida não foi atrapalhado** (nenhum clique extra obrigatório).
  - Aplicar e depois remover desconto (RIFA): botão "Remover" voltou o carrinho pro preço cheio
    antes de confirmar — venda saiu sem desconto nenhum, como esperado.
  - Testado também no PDV (não só admin) — login como Zu, RIFA R$1,00 com 50% de desconto →
    `valor_final: 0.5, desconto_pct: 50`, confirmando que o componente duplicado
    (`app/pdv/page.tsx`) tem o mesmo comportamento do admin.
  - Todos os 5 pedidos de teste apagados depois via SQL.
  - `npx tsc --noEmit` e `npm run build` limpos (2x — antes e depois de corrigir o achado
    crítico).

- **Status final:** concluída e em produção (`dpl_FKDY9ty2Ry9uFjnW1Zovp7pY48UT`), deployada depois
  da confirmação explícita do Edvam. Última demanda do pacote 095-107 — o Bloco B (099/103/104/105)
  está completo. Fica a 101 (3 relatórios nomeados no Financeiro, já liberada, mockup 100 aprovado).
