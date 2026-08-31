# 077 — Fechar Caixa discrimina forma de pagamento + contas bancárias com taxas configuráveis

Status: aprovada — 🔴 PRIORIDADE MÁXIMA (Edvam pediu foco total no financeiro)
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Feedback direto do Edvam, fechando caixa agora: "Fechar Caixa" precisa discriminar os pagamentos
por forma (dinheiro, moeda, cartão, Pix) — hoje só tem os campos genéricos
`dinheiro`/`moedas`/`bancos` (ver `jsgrafica_fechamento`). Além disso, **a gráfica tem mais de
uma conta bancária**, e cada conta/banco tem sua própria taxa que desconta direto dos pagamentos
em cartão e Pix — essas taxas precisam ser configuráveis por conta, não fixas no código.

## Objetivo
Fechamento de caixa mostra o valor líquido real esperado por forma de pagamento e por conta
bancária, já descontando a taxa de cada uma — batendo com o que realmente cai na conta, não só o
valor bruto vendido.

## Escopo
- Incluído:
  1. Nova tabela/config de **contas bancárias** (nome da conta/banco, taxa cartão %, taxa Pix %) —
     editável pelo Edvam, não hardcoded.
  2. Vincular cada pagamento em cartão/Pix (de `jsgrafica_pedidos.forma_pagamento`, demanda 066)
     a uma conta bancária — decidir com o Edvam se isso é escolhido no momento da venda ou
     configurado como "conta padrão" por forma de pagamento.
  3. Fechar Caixa (`components/TelaFechamento.tsx`) passa a mostrar: total bruto por forma de
     pagamento, taxa descontada por conta, e valor líquido esperado — usado no cálculo de
     divergência.
- Fora de escopo: integração bancária de verdade (extrato automático) — é só cálculo/registro
  manual da taxa configurada, não conciliação com o banco real.

## Critérios de aceite
- [ ] Dá pra cadastrar/editar conta bancária com taxa de cartão e taxa de Pix
- [ ] Fechamento mostra valor líquido esperado por forma de pagamento, descontando a taxa certa
- [ ] Testado com pelo menos 2 contas com taxas diferentes

## Riscos e cuidados
Antes de implementar o vínculo pagamento→conta, confirmar com o Edvam **onde** essa escolha
acontece (na hora da venda, ou é sempre a mesma conta por forma de pagamento) — não assumir.

**Achado ao vivo do PM (2026-07-06)**: `components/TelaFechamento.tsx` não trata erro da API —
se `POST /api/fechamento` falhar (ex.: conflito de constraint, já aconteceu de verdade hoje com o
Edvam), o frontend chama `setResultado(data)` sem checar se `data.error` existe, e acaba
mostrando "Divergência detectada... R$ NaN... Fechado às Invalid Date" em vez de uma mensagem de
erro decente. **Incluir nesta demanda**: checar `res.ok`/`data.error` antes de `setResultado`, e
mostrar uma mensagem de erro clara (ex.: "Erro ao fechar caixa, tente de novo ou chame o suporte")
nesse caso.

## Referências
`components/TelaFechamento.tsx`. `jsgrafica_fechamento`. `jsgrafica_pedidos.forma_pagamento`
(demanda 066). Demanda 074 (fechamento por operador — essa demanda deve considerar as duas
mudanças juntas, coordenar ordem de implementação com o 03-APP).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  **Decisão confirmada com o Edvam antes de implementar** (per "Riscos e cuidados" desta demanda):
  o vínculo pagamento→conta é configurado pelo admin como "conta padrão por forma de pagamento"
  (cartão sempre cai numa conta configurada, Pix sempre em outra) — não é escolhido pelo operador
  na hora da venda.
  1. Nova tabela `jsgrafica_contas_bancarias` (nome, `taxa_cartao_pct`, `taxa_pix_pct`,
     `padrao_cartao`, `padrao_pix`, `ativo`).
  2. `app/api/contas-bancarias/route.ts` (GET/POST/PATCH) — o PATCH garante exclusividade: marcar
     uma conta como padrão de cartão/Pix desmarca automaticamente as outras da mesma forma, nunca
     ficando 2 contas padrão ao mesmo tempo.
  3. Nova aba "🏦 Contas Bancárias" no admin (`TelaContasBancarias`, só Edvam) — cadastro/edição de
     conta, taxas, toggle ativo/inativo, botão "Marcar" pra definir o padrão de cada forma.
  4. `getResumoPorFormaPagamento()` (`lib/supabase-admin.ts`) — soma `jsgrafica_pedidos.forma_pagamento`
     (dinheiro/cartão/Pix/"paga na retirada", campo da demanda 066) por bucket, aplica a taxa da
     conta padrão de cada forma e calcula o líquido esperado. Vendas históricas (`jsgrafica_vendas`,
     nunca tiveram `forma_pagamento`) entram num bucket à parte ("Histórico sem forma registrada")
     em vez de contaminar "Dinheiro". "Paga na retirada" fica sem taxa calculada — o método real só
     se confirma na retirada, ainda sem essa etapa no fluxo (fora do escopo desta demanda).
  5. `components/TelaFechamento.tsx` ganhou a seção "Discriminação por forma de pagamento" (só
     admin) — tabela com forma, conta, bruto, taxa descontada e líquido esperado por bucket, mais
     o total líquido geral.
  6. **Achado ao vivo do PM, incluído nesta demanda**: `fecharCaixa()` em `TelaFechamento.tsx`
     chamava `setResultado(data)` sem checar `res.ok`/`data.error` — quando a API falhava (já
     tinha acontecido de verdade com o Edvam), a tela mostrava "Divergência detectada... R$ NaN...
     Fechado às Invalid Date" em vez de um erro claro. Corrigido: agora checa erro antes de
     `setResultado` e mostra uma mensagem própria ("Erro ao fechar caixa, tente de novo ou chame o
     suporte") num banner vermelho, sem tocar no fluxo de sucesso.
- Testes realizados e resultado:
  Criadas 2 contas de teste reais via UI (Playwright) com taxas diferentes: "Conta Teste A" (taxa
  cartão 4,5%, Pix 1%, padrão de cartão) e "Conta Teste B" (taxa cartão 5%, Pix 2%, padrão de Pix).
  Testado marcar/desmarcar padrão (trocar o padrão de cartão pra Conta B e depois de volta pra
  Conta A — confirmado que a outra sempre perde o padrão automaticamente) e editar taxa via UI.
  Criados 2 pedidos reais (R$100 em Cartão, R$200 em Pix) e conferido `/api/fechamento`: bucket
  Cartão = bruto R$100, taxa 4,5% = R$4,50, líquido R$95,50, conta "Conta Teste A"; bucket Pix =
  bruto R$200, taxa 2% = R$4,00, líquido R$196,00, conta "Conta Teste B" — matemática exata,
  confirmado também visualmente na tela "Fechar Caixa" (screenshot). Correção do erro testada com
  Playwright interceptando a API pra simular a falha real reportada (`route.fulfill` com status
  500) — confirmado que a tela mostra o banner de erro e não mais "NaN"/"Invalid Date" (screenshot).
  `npx tsc --noEmit` e `npm run build` rodaram limpos antes de cada deploy. Deploy em produção:
  `npx vercel --prod --yes` → `dpl_7L6HEHyEX4puxw8K8AVyFBD8BnuS` (contas bancárias + discriminação)
  e `dpl_5XS3Zd7jHi75dHCrj3sRL7LPowkE` (correção do erro), reconfirmado com `/api/contas-bancarias`
  respondendo em produção. Todos os dados de teste (2 contas, 2 pedidos, 1 fechamento de teste)
  apagados do Supabase depois.
- Achados fora do escopo:
  Esta demanda foi coordenada com a 074 (fechamento por operador) e a 079 (repasse agregado de
  Recarga VEM) — as três mexem em `app/api/fechamento/route.ts` e `lib/supabase-admin.ts`. A
  discriminação por forma de pagamento só aparece na visão geral (admin, sem operador) — por
  operador ainda não dá pra separar forma de pagamento de forma confiável (fica registrado como
  próximo passo natural se a 074 evoluir nessa direção).
- Status final: concluída.
