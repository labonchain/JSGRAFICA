# 201 — Tela "Transferir entre contas" (Admin)

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: 2026-07-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Continuação da 200 (`conta_origem` nas saídas), mesmo mapeamento
(`pm/conhecimento/mapa-fluxo-dinheiro-entre-contas.md`). Caso real: R$100 em dinheiro físico na
gaveta da Zu vão ser depositados na Caixa Econômica amanhã, pra repor o que o Mercado Pago
adiantou numa recarga VEM hoje. Esse tipo de movimento (dinheiro sai de uma conta, entra em
outra, sem ser venda nem saída de despesa) não tem NENHUM lugar pra ser registrado hoje — fica só
de cabeça/WhatsApp do Edvam, e é exatamente o tipo de coisa que gera pendência invisível.

## Objetivo
Existe uma ação simples (só Admin) pra registrar "peguei dinheiro de uma conta e botei em
outra" — o sistema grava os dois lados automaticamente, linkados, sem precisar lançar saída e
entrada manualmente à parte.

## Escopo
- Incluído: tela/ação "🔁 Transferir entre contas" (Admin-only, mesmo critério de acesso das
  outras telas financeiras avançadas) com campos: De (lista das 7 contas do mapa — Dinheiro Zu,
  Dinheiro Gabi, Mercado Pago, Stone, Caixa Econômica, RecargaPay), Para (mesma lista), Valor,
  Data (hoje por padrão, editável pra lançar retroativo).
- Ao confirmar, gera **automaticamente 2 lançamentos linkados** (mesmo padrão de vínculo já usado
  em `saida_vinculada_id`): uma saída na conta de origem (`conta_origem` = a conta escolhida,
  categoria própria "Transferência entre contas") + uma entrada equivalente na conta de destino.
  Não deve ser possível editar/cancelar um lado sem afetar o outro.
- Se existir uma pendência aberta (da 200: saída com `conta_origem` diferente da gaveta que
  vendeu, ainda sem transferência correspondente) que bata com a transferência lançada (mesmo
  valor, contas compatíveis), marcar essa pendência como resolvida — decisão do executor sobre o
  critério exato de "bater" (documentar o raciocínio).
- Explicitamente fora de escopo: qualquer conciliação automática com extrato real dessas contas
  (não existe API pra nenhuma delas, confirmado em investigação anterior) — o valor lançado é
  sempre o que o Admin digitar, confiando na palavra dele.

## Critérios de aceite
- [x] Tela/ação nova, só visível pro Admin
- [x] Transferência gera os 2 lados (saída + entrada) linkados corretamente
- [x] Lançar retroativo (data passada) funciona
- [x] Pendência da 200 correspondente é resolvida quando a transferência bate com ela
- [x] Testado reproduzindo o caso real (transferência de R$100, Dinheiro Zu → Mercado Pago,
      resolvendo a pendência da demanda 200)

## Riscos e cuidados
Depende da 200 estar concluída primeiro (usa a mesma lista de contas e o mecanismo de
`conta_origem`) — não começar sem a 200 no ar.

## Referências
`pm/conhecimento/mapa-fluxo-dinheiro-entre-contas.md`. Demanda 200 (pré-requisito). Caso real:
saída `55c45c7e-dbd0-49f7-a12f-95192e12b1e2` (R$100, corrigida manualmente pelo PM hoje) — a
transferência real que o Edvam vai fazer amanhã é o primeiro caso de uso de verdade.

## Relato de execução
Depende da 200 (concluída antes desta, mesma sessão) — reaproveita `CONTAS_ORIGEM`
(`lib/dados.ts`) e o mecanismo de `conta_origem`/`getTotalSaidasOperador` dela.

**DB** (`transferencias_entre_contas`, migration aplicada): nova categoria de saída
`transferencia_entre_contas` ("Transferência entre contas", em `jsgrafica_categorias_saida`,
`visivel_pdv: false`) + tabela `jsgrafica_transferencias` (`conta_origem`, `conta_destino`,
valor, descrição, operador, `saida_id` FK obrigatória, `pendencia_saida_id` FK opcional,
`data_dia`). Check constraints: contas dentro da lista fixa de 6 + `conta_origem <>
conta_destino`. RLS habilitada sem policy (mesmo padrão de todas as `jsgrafica_*` — só
`service_role`/`supabaseAdmin` lê/escreve, confirmado via `pg_class`/`pg_policies` antes de
criar).

**Mecânica escolhida** (documentando o raciocínio pedido pelo escopo): em vez de inventar uma
tabela de "entradas" nova (não existe nenhuma tabela de entradas GENÉRICA e gravável hoje — o
"ledger de entradas" da 098 é 100% derivado de vendas/pedidos/abertura/fechamento, não um lugar
pra inserir), a transferência grava:
1. Uma linha normal em `jsgrafica_saidas` (categoria "Transferência entre contas",
   `conta_origem` = a conta de origem escolhida) — reaproveita TODA a agregação que já existe
   (Dashboard, Financeiro, Fechamento, `getTotalSaidasOperador` da 200) sem precisar tocar em
   nenhuma delas. Quando a origem é uma gaveta física (`dinheiro_zu`/`dinheiro_gabi`), o
   `operador` da saída vira o dono dela (Zu/Gabi) — é ela que fisicamente perde o dinheiro,
   então o esperado dela cai corretamente; quando a origem é uma conta digital, o operador vira
   quem lançou (Admin), sem efeito no físico de ninguém (correto, nada saiu de gaveta nenhuma).
2. Uma linha em `jsgrafica_transferencias` com os 2 lados (origem/destino) + link pra saída
   gerada (`saida_id`) — é o registro que documenta visualmente "isso entrou em X" (não existe
   ledger de entrada por conta pra alimentar, então essa linha É a prova da entrada — sem ela,
   um leitor só veria uma saída misteriosa categorizada "Transferência" sem saber pra onde foi).
Cancelar (`DELETE /api/transferencias`) sempre apaga os 2 juntos — nunca dá pra sobrar um órfão
(testado).

**Critério de "bater com a pendência"** (decisão do executor, documentada conforme pedido):
`transferência.contaDestino === pendência.contaOrigem` E `valor` exatamente igual. Raciocínio:
a pendência registra "conta X adiantou esse dinheiro"; a transferência resolve quando o dinheiro
volta a entrar NESSA MESMA conta X. Testado com o caso real (abaixo) — Dinheiro Zu → Mercado
Pago bate exatamente com a pendência `conta_origem='mercadopago'` da 200. Achado documentado:
o contexto da demanda também menciona um plano informal de 2 etapas (Zu → Caixa Econômica, e só
depois considerar o MP "reposto" indiretamente) — esse caso NÃO bateria automaticamente com o
critério escolhido (contaDestino seria 'caixa_economica', não 'mercadopago'), e fica assim de
propósito: resolver uma pendência com base numa conexão indireta seria mais arriscado que deixar
pendente até uma transferência realmente ir pra conta certa (o Admin sempre pode fazer um 2º
lançamento Caixa Econômica → Mercado Pago depois, que aí sim resolveria). Critério de aceite da
própria demanda já cita exatamente o caso direto (Zu → Mercado Pago) como o teste esperado.

**UI** (`app/page.tsx`, `TelaSaidas`): botão "🔁 Transferir entre contas" (Admin-only) ao lado de
"+ Adicionar saída"; modal com De/Para (selects que se excluem mutuamente)/Valor/Data (padrão
hoje, editável pra retroativo); card "⚠️ Pendências entre contas" (só aparece quando existe
alguma, lista todas — não é ruído no dia a dia comum); card "Transferências entre contas hoje"
mostrando De→Para (a saída em si já aparece em "Lançamentos" com o badge da 200, mas esse card
mostra o lado "Para" que a lista de saídas não tem como mostrar).

**Teste com o caso real** (mesma saída pendente da 200, `55c45c7e...`, R$100,
`conta_origem='mercadopago'`, ainda sem transferência): lancei via API a transferência real
Dinheiro Zu → Mercado Pago, R$100 — resposta confirmou os 2 lados criados linkados
(`saida_id`, `pendencia_saida_id` apontando pra pendência certa) e `pendenciaResolvida`
preenchida. Confirmado: `GET /api/transferencias` não lista mais nenhuma pendência aberta;
fechamento da Zu foi de `totalSaidas: 0 / saldoAcumulado: 155,50` (estado pós-200) pra
`totalSaidas: 100 / saldoAcumulado: 55,50` — o R$100 volta a sair corretamente do esperado dela
no exato momento em que o dinheiro físico realmente sai da gaveta (agora sim, de verdade, com a
transferência real), fechando o ciclo completo do caso investigado pelo PM.

Testes adicionais: rejeição de mesma conta origem/destino, conta inválida, valor inválido
(todos com mensagem clara); criação + cancelamento (`DELETE`) de uma transferência sintética
(Stone → Caixa Econômica, R$5, sem pendência associada) confirmando que os 2 lados somem juntos
(0 linhas restantes em `jsgrafica_saidas`/`jsgrafica_transferencias`) — sintético limpo depois.
Teste de UI (Playwright, Admin): botão abre o modal, campos obrigatórios travam "Transferir",
selects De/Para se excluem mutuamente, "Cancelar" fecha sem lançar nada, card "Transferências
entre contas hoje" mostra a transferência real corretamente rotulada com "✓ resolveu pendência".
Prints em anexo ao chat.

`npx tsc --noEmit` limpo. `npm run build` limpo (rota `/api/transferencias` nova reconhecida).
Deploy em produção: `dpl_4zHdgJhb3QexwNB2Dg6k3dtFS58C`, aliases confirmados via `vercel inspect`
em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

Nenhum dado sintético restante — a transferência de teste Stone→Caixa Econômica (R$5) foi
criada e cancelada (removida) na mesma sessão; a transferência real (Dinheiro Zu → Mercado Pago,
R$100) permanece no banco por ser genuína (resolve a pendência real do caso do PM).
