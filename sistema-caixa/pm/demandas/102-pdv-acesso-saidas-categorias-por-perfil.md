# 102 — PDV ganha acesso à aba Saídas + categorias visíveis por perfil

Status: **CANCELADA** (2026-07-07) — o Edvam corrigiu a premissa: só Admin lança saída manualmente, PDV nunca acessa "Lançar Saídas". Custo de produto com pagamento imediato (recarga etc.) é automático via demanda 104, não manual pelo atendimento. Não executar.
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Item B1 do checklist (`pm/conhecimento/checklist-reestruturacao-financeiro.md`). Hoje "Lançar
Saídas" é `soAdmin: true` (`app/page.tsx:1638`) — Zu/Gabi não têm acesso nenhum. Edvam confirmou:
não é fornecedor, é crédito/recarga — serviço executado na hora pro cliente (ex. Recarga Celular/
VEM). Outros tipos de saída via PDV podem aparecer depois, não é lista fechada.

**🔴 Cuidado explícito do Edvam: essa demanda muda uma permissão que Zu/Gabi usam ativamente —
só pode ir pro ar depois que o caixa do dia fechar.** Horário mínimo: loja e PDV fecham às 18h,
Admin fecha o caixa geral por volta das 19h. **Mas isso não é regra automática de horário** — o
Edvam confirmou que quer aprovar **cada deploy de risco individualmente**, mesmo depois das 19h.
Não fazer deploy sem essa confirmação explícita, pra essa demanda especificamente, mesmo se já
passou das 19h. Mesmo padrão já usado na demanda 073 (segurou até horário combinado, fora do
atendimento).

## Objetivo
Zu/Gabi conseguem lançar saída de recarga/crédito direto no PDV, vendo só as categorias que o
Admin marcou como visíveis pra elas.

## Escopo
- Incluído:
  1. Remover `soAdmin: true` da aba "saidas" em `app/page.tsx` e adicionar a mesma aba em
     `app/pdv/page.tsx` (mesmo padrão já usado na demanda 068 pra liberar "Pedidos" no PDV).
  2. Tela de gerenciar categorias (admin) ganha um toggle por categoria: "aparece no PDV?" — lê/
     grava a coluna `visivel_pdv` (demanda 095).
  3. A rota que lista categorias pro formulário de lançar saída passa a filtrar por
     `visivel_pdv: true` quando quem está logado é Zu/Gabi; Admin continua vendo todas.
- Fora de escopo: mudar o formulário de lançar saída em si (continua igual, só muda quem acessa e
  quais categorias aparecem).

## Critérios de aceite
- [ ] Zu/Gabi veem a aba Saídas no PDV, só com as categorias marcadas como visíveis
- [ ] Admin continua vendo todas as categorias, com o toggle de visibilidade editável
- [ ] Saída lançada pelo PDV grava `operador` corretamente, mesmo padrão de toda saída hoje
- [ ] Deploy feito depois das 19h **e** com confirmação explícita do Edvam pra esse deploy

## Riscos e cuidados
**Não fazer deploy sem confirmação explícita do Edvam pra este deploy específico** (não é regra
automática de horário). Testar localmente/com dado sintético à vontade antes disso — só o deploy
em produção espera a confirmação.

## Referências
`app/page.tsx:1638`, `app/pdv/page.tsx`, `jsgrafica_categorias_saida` (demanda 095),
`app/api/categorias-saida/route.ts`. Demanda 068 (padrão de liberar aba nova pro PDV). Demanda
073 (padrão de segurar deploy até horário seguro).

## Relato de execução
(preenchido pelo chat executor ao concluir)
