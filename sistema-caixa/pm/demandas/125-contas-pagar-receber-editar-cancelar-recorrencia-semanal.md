# 125 — Contas a Pagar/Receber: editar, cancelar e recorrência semanal

Status: concluída — incluindo o ponto 5 (Edvam escolheu ajuste direto no banco, aplicado)
Criada em: 2026-07-08
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 096 construiu a tela "📋 Contas a Pagar/Receber" (Financeiro, só Admin), mas só cobre
criar, listar e marcar como pago/recebido (`app/api/contas-pagar-receber/route.ts`: GET, POST,
PATCH de baixa). Usando a tela no dia a dia, o Edvam encontrou 3 lacunas reais:

1. **Não dá pra editar** uma conta já lançada — se o nome, valor, categoria ou vencimento
   estiverem errados, não tem como corrigir pela tela.
2. **Não dá pra cancelar/excluir** uma conta a pagar ou a receber — se foi lançada por engano ou
   o compromisso deixou de existir, ela fica pendente/atrasada pra sempre, sem saída.
3. **Recorrência só existe como mensal fixo**: `criarContaPagarReceber` grava sempre
   `frequencia: 'mensal'` quando `recorrente: true`, e `proximoVencimentoMensal()`
   (`lib/supabase-admin.ts:538-548`) só sabe somar 1 mês. Só que tem pagamento real que é
   **semanal** (ex.: "Gabi - Colaboradora", paga toda semana) — hoje isso é contornado lançando
   manualmente 4 entradas separadas por mês, uma pra cada semana (visível na tela: 4 linhas
   "Gabi - Colaboradora" com vencimentos 10/07, 17/07, 24/07, 31/07).

## Objetivo
A tela "Contas a Pagar/Receber" passa a permitir editar uma conta pendente, cancelar uma conta
pendente, e escolher frequência **semanal** (além de mensal) na hora de cadastrar uma recorrente.

## Escopo
- Incluído:
  1. Endpoint pra **editar** (nome, valor, categoria, vencimento) uma conta com status `pendente`
     ou `atrasado`. Não permitir editar conta já `pago` — evita divergir do valor da
     Saída/Entrada real já gerada na baixa (`saida_vinculada_id`/`pedido_vinculado_id`).
  2. Endpoint pra **cancelar** uma conta com status `pendente` ou `atrasado`. Também não permitir
     cancelar conta já paga por essa via. Decidir (e registrar no relato) se vira um DELETE de
     verdade ou um novo status tipo `cancelado` — conferir o que for mais consistente com o resto
     do projeto antes de escolher.
  3. Campo de frequência deixa de ser fixo: no cadastro, o "Repete todo mês?" vira um seletor com
     3 opções — "Não repete" / "Toda semana" / "Todo mês". Criar `proximoVencimentoSemanal()`
     (soma 7 dias, mesmo padrão de `proximoVencimentoMensal()`) e fazer `darBaixaContaPagarReceber`
     usar a `frequencia` salva na conta (não assumir mais que é sempre mensal) pra decidir qual
     função chamar ao gerar a próxima instância.
  4. UI (`components/TelaContasPagarReceber.tsx`): botões "Editar" e "Cancelar" ao lado do
     "Marcar pago"/"Marcar recebido" já existente (linha ~224), visíveis só quando a conta ainda
     não foi paga.
  5. As 4 linhas da "Gabi - Colaboradora" já lançadas manualmente (semanais) — perguntar ao Edvam
     se prefere refazer na mão pela tela nova (cancelar as futuras e recriar como uma recorrente
     semanal) ou se quer que o executor ajuste direto no banco. Não fazer sem essa confirmação.
- Fora de escopo: frequência customizada/livre (ex. "a cada 10 dias", quinzenal) — só semanal e
  mensal, os dois únicos casos reais até agora.

## Critérios de aceite
- [x] Dá pra editar nome/valor/categoria/vencimento de uma conta pendente ou atrasada
- [x] Dá pra cancelar uma conta pendente ou atrasada
- [x] Conta já paga não aparece como editável nem cancelável nessa tela
- [x] Cadastro oferece "Não repete" / "Toda semana" / "Todo mês"
- [x] Dar baixa numa conta semanal gera a próxima 7 dias depois (não 1 mês)
- [x] Dar baixa numa conta mensal continua gerando a próxima 1 mês depois — sem regressão
- [x] As 4 entradas da Gabi resolvidas do jeito que o Edvam confirmar (manual ou via banco) —
      Edvam escolheu ajuste via banco, aplicado e conferido (ver relato)

## Riscos e cuidados
Mexe em contas reais, algumas já com Saída/Entrada vinculada gerada a partir delas — por isso
edição e cancelamento não podem alcançar conta já paga, sob risco do valor lançado divergir do
rastro real do caixa. Confirmar com o Edvam antes de tocar nas 4 linhas reais da Gabi (ponto 5).

## Referências
Demanda 096 (construção original da tela). `app/api/contas-pagar-receber/route.ts`.
`lib/supabase-admin.ts` (linhas 474-632: `ContaPagarReceber`, `criarContaPagarReceber`,
`proximoVencimentoMensal`, `darBaixaContaPagarReceber`). `components/TelaContasPagarReceber.tsx`.

## Relato de execução

### O que foi feito
- **Sem migration** — a coluna `frequencia` já existia (096 gravava sempre `'mensal'`).
- **`lib/supabase-admin.ts`**: `proximoVencimentoSemanal()` (soma 7 dias, mesmo padrão da mensal);
  `criarContaPagarReceber` aceita `frequencia: 'semanal'|'mensal'` (default mensal — chamadas
  antigas intactas); `darBaixaContaPagarReceber` passou a usar a `frequencia` salva na conta pra
  gerar a próxima instância (linha antiga sem frequência segue mensal); novas
  `editarContaPagarReceber` (nome/valor/categoria/vencimento) e `cancelarContaPagarReceber` —
  as duas bloqueiam conta já `pago` (o valor dela já virou Saída/Entrada real na baixa).
- **Rota** (`app/api/contas-pagar-receber/route.ts`): `POST` aceita `frequencia` (validada);
  **`PUT` = editar** e **`DELETE` = cancelar** — verbos separados porque o `PATCH` desta rota já
  é a baixa (096), evita discriminador implícito no corpo.
- **Decisão documentada (item 2 do escopo): cancelar = DELETE real, não status `cancelado`** —
  um status novo vazaria em todo leitor que filtra `status !== 'pago'` (o card "Saídas previstas"
  da 123 mostraria conta cancelada como pendente) e nos filtros da própria tela; mesmo racional
  da 130 pra saídas. Conta pendente não tem vínculo nenhum ainda (saida/pedido só nascem na
  baixa), então apagar não deixa órfão.
- **UI** (`components/TelaContasPagarReceber.tsx`): o checkbox "Repete todo mês?" virou seletor
  "Não repete" / "Toda semana" / "Todo mês"; botões **Editar** (modal com nome/valor/categoria/
  vencimento pré-preenchidos) e **Cancelar** (confirm) ao lado do "Marcar pago"/"Marcar recebido",
  **só em conta não paga** (mesma condição `status !== 'pago'` do botão de baixa); badge de
  recorrência agora mostra "🔁 semanal" e o tooltip reflete a frequência real.

### Testes realizados (sintéticos, tudo limpo no fim — inclusive as 2 Saídas reais que as baixas
### de teste geraram no caixa de hoje, apagadas junto)
- **Editar**: os 4 campos de uma vez via PUT — todos gravados certos.
- **Baixa semanal**: conta semanal venc. 10/07 → baixa → próxima instância nasceu em **17/07
  (+7 dias)**, `frequencia: 'semanal'` propagada.
- **Regressão mensal**: conta mensal venc. 15/07 → baixa → próxima em **15/08 (+1 mês)**.
- **Proteção de conta paga**: PUT e DELETE numa conta paga → bloqueados com mensagem clara.
- **Cancelar pendente**: DELETE → removida.
- **UI (Playwright)**: seletor com as 3 opções confirmado; linha pendente com badge "🔁 semanal"
  + botões Editar/Cancelar; **linha paga sem botão nenhum** (0 botões, verificado); modal abrindo
  pré-preenchido.
- `npx tsc --noEmit` e `npm run build` limpos.

### Ponto 5 — as 4 linhas reais da "Gabi - Colaboradora" (RESOLVIDO, escolha do Edvam)
Estado encontrado: 4 contas pendentes de R$350 (venc. 10/07, 17/07, 24/07, 31/07), todas
`recorrente: false`, uma com a categoria grafada diferente ("Folha Pagamento" vs "Folha de
pagamento"). Perguntado ao Edvam com 3 opções (ajuste no banco / refazer pela tela / deixar este
mês) — **ele escolheu o ajuste direto no banco**. Aplicado e conferido: a conta de **10/07 virou
recorrente semanal** (`recorrente: true, frequencia: 'semanal'`, categoria normalizada pra
"Folha de pagamento") e as 3 futuras (17/07, 24/07, 31/07) foram apagadas. Na baixa da de 10/07,
a de 17/07 nasce sozinha (+7 dias) — mesmo cronograma de antes, sem lançamento manual nunca mais.

### Status final
Concluída e em produção (`dpl_GXp1rEgGcMSJoyceAYxCZHLvtBwW`), ponto 5 incluído.
