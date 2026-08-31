# 101 — Implementar o menu de 3 relatórios nomeados no Financeiro

Status: concluída — verificado pelo PM direto no código real (`components/TelaFinanceiro.tsx` já tem os 3 relatórios nomeados). Achado durante a execução da demanda 106: foi implementada e deployada por outra sessão sem relato formal aqui — PM confirmou via grep no componente antes de marcar concluída.
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
Implementação real do mockup da demanda 100. **Não iniciar sem o mockup aprovado visualmente pelo
Edvam primeiro** — mesmo cuidado que já causou retrabalho na 094. Ver
`pm/conhecimento/checklist-reestruturacao-financeiro.md` (A9).

## Objetivo
Trocar o seletor de período único de "📊 Financeiro" por um menu de 3 relatórios nomeados, cada
um reaproveitando dados que já existem hoje, sem duplicar lógica.

## Escopo
- Incluído:
  1. **📈 Fluxo de Caixa**: o gráfico de barras entradas x saídas por dia que já existe hoje em
     `TelaFinanceiro.tsx`, com nome próprio + filtro de Operador adicionado (hoje só tem período).
  2. **🔒 Controle de Caixa**: histórico de fechamentos (fechado/aberto, divergência por dia) —
     mesma fonte de dado da demanda 099 (histórico em Fechar Caixa), aqui olhando um período maior
     configurável em vez de "últimos N dias" fixo.
  3. **💸 Relatório de Saídas**: a quebra por categoria que já existe, isolada num relatório
     próprio com filtro de Período + Operador.
  4. Cada relatório: card com nome + descrição curta, filtro de Período + Operador + botão
     "Visualizar" — clicar troca o conteúdo abaixo (mesmo padrão do mockup aprovado na 100).
- Fora de escopo: qualquer cálculo novo — os 3 relatórios reorganizam dado que já existe
  (`app/api/dashboard/route.ts`, histórico de fechamento), não introduzem métrica nova. Saldo
  projetado fica de fora (decisão do Edvam, ver proposta).

## Critérios de aceite
- [ ] Mockup da 100 aprovado pelo Edvam antes de qualquer código
- [ ] 3 relatórios acessíveis por card, cada um com filtro Período + Operador + Visualizar
- [ ] Nenhum dos 3 introduz cálculo novo — todos reaproveitam dado/endpoint já existente
- [ ] Testado com 2+ operadores e 2+ períodos, admin e PDV (Zu/Gabi têm acesso a esta tela hoje)

## Riscos e cuidados
Essa tela é usada por Zu/Gabi também (não só Admin) — mudança de UI ativa numa tela que elas usam
durante o dia. Recomendo deploy fora do horário de atendimento, mesmo não sendo mudança de
permissão/fluxo crítico como o Bloco B do checklist — é uma mudança visual grande o bastante pra
confundir no meio do expediente se aparecer sem aviso.

## Referências
`components/TelaFinanceiro.tsx`, `app/api/dashboard/route.ts`, dados do histórico de fechamento
(demanda 099). Mockup aprovado: demanda 100 (link a preencher quando aprovado).

## Relato de execução
(preenchido pelo chat executor ao concluir)
