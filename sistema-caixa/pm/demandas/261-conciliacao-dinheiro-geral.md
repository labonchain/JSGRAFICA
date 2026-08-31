# 261 — Adicionar opção "Dinheiro (Geral)" na classificação de conciliação

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-14
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
Achado real durante o fechamento/conciliação do mês de julho (2026-08-01, revisão conjunta com
o Edvam). Na tela "🔎 Conciliação", ao classificar uma pendência como "Transferência", a lista de
contas contraparte só oferece "Dinheiro (Zu)" e "Dinheiro (Gabi)" separados
(`CONTAS_ORIGEM` em `lib/dados.ts`) — não existe uma opção "Dinheiro (Geral)".

Caso real que expôs o gap: um Pix de R$300,00 recebido no Mercado Pago em 21-07-26 era o
resultado de um depósito que juntou dinheiro físico dos caixas de Zu **e** Gabi antes de virar
transferência digital — não veio de um caixa só. Não havia opção pra isso; classificado como
"Dinheiro (Zu)" com a descrição deixando claro que é o valor combinado, como solução temporária
pra não travar o fechamento do dia.

## Objetivo
Adicionar "Dinheiro (Geral)" como opção de conta contraparte na classificação de transferência da
tela de Conciliação, pros casos em que o depósito/transferência combina caixas físicos de mais de
um operador (ou não dá pra saber a origem exata).

## Escopo
- Incluído: nova opção `dinheiro_geral` em `CONTAS_ORIGEM` (`lib/dados.ts`) — ou equivalente,
  usado só no fluxo de conciliação/transferência, não precisa aparecer em todo lugar que usa essa
  lista (ex. avaliar se faz sentido no PDV/Saídas também ou só na Conciliação).
- Incluído: `criarTransferencia` (`lib/supabase-admin.ts`) já aceita qualquer `contaOrigem`
  string livre — confirmar que não precisa de mudança de schema, só a nova opção na UI/lista.
- Incluído: revisar se faz sentido oferecer "Dinheiro (Geral)" também nas outras telas que usam
  `CONTAS_ORIGEM` como conta de origem de saída (ex. tela de Saídas) — mesma lógica de "não sei/
  não separei entre os operadores" pode aparecer lá também.
- Explicitamente fora de escopo: reclassificar retroativamente pendências já resolvidas com
  Dinheiro (Zu)/(Gabi) que na real eram combinadas — não é necessário, o efeito financeiro
  agregado já está correto, só a atribuição por operador que fica aproximada nesses casos raros.

## Critérios de aceite
- [ ] Opção "Dinheiro (Geral)" disponível na classificação de transferência da tela de Conciliação
- [ ] Transferência criada com essa opção funciona igual às outras (mesmo fluxo de
      `criarTransferencia`, sem exigir mudança de schema)
- [ ] Confirmado com o Edvam se a opção deve aparecer também em outras telas (Saídas) ou só na
      Conciliação

## Riscos e cuidados
Não precisa reclassificar nada retroativo — é só uma opção nova pra frente.

## Referências
Achado em 2026-08-01, durante o fechamento/conciliação de julho. `lib/dados.ts` (CONTAS_ORIGEM),
`lib/supabase-admin.ts` (`criarTransferencia`), `app/api/conciliacao/pendencias/route.ts` (PATCH,
ação 'transferencia').

## Relato de execução

- **O que foi feito**: adicionado `{ id: 'dinheiro_geral', label: 'Dinheiro (Geral)' }` em
  `CONTAS_ORIGEM` (`lib/dados.ts`). Como essa lista é global e usada por `.map()` direto em toda
  tela que a consome (`ModalClassificarPendencia.tsx`, `TelaConciliacao.tsx`, `app/page.tsx` —
  Lançar Saída, Corrigir conta, Transferir entre contas), a opção nova apareceu automaticamente em
  **todas elas**, não só na Conciliação — decisão tomada: não vale a complexidade de filtrar por
  tela pra esconder em alguns lugares, o mesmo "não sei separar entre os operadores" que motivou a
  demanda em Conciliação pode legitimamente acontecer numa saída manual ou transferência direta
  também. **Fica pro Edvam confirmar se é isso mesmo que ele queria** (critério de aceite pede essa
  confirmação explicitamente).
- **Achado real, corrigindo a premissa da própria demanda**: o contexto afirma que
  "`criarTransferencia` já aceita qualquer `contaOrigem` string livre... não precisa de mudança de
  schema" — **isso está errado**. Conferido no banco: existem 3 `CHECK constraints` reais
  (`jsgrafica_saidas_conta_origem_check`, `jsgrafica_transferencias_conta_origem_check`,
  `jsgrafica_transferencias_conta_destino_check`, mais `jsgrafica_entradas_avulsas_conta_destino_check`
  — 4 no total) travando essas colunas numa lista fixa das 6 contas antigas. Sem migration, a opção
  nova quebraria em runtime com erro de constraint na primeira tentativa de uso real. Confirmado com
  o Edvam/PM antes de agir fora do meu domínio de costume (schema é do 02-DADOS) — autorizada
  exceção explícita pra esta migration pequena e de baixo risco (só amplia a lista de valores
  aceitos, não toca em nenhum dado existente). Migration aplicada:
  `demanda_261_add_dinheiro_geral_conta` — os 4 constraints recriados incluindo `'dinheiro_geral'`,
  conferido via `pg_get_constraintdef` antes e depois.
- **Testes realizados e resultado**: em produção, com dado sintético real (apagado depois): (1)
  `POST /api/entradas-avulsas` com `contaDestino: 'dinheiro_geral'` → sucesso, sem erro de
  constraint; (2) `POST /api/transferencias` com `contaOrigem: 'dinheiro_geral'`,
  `contaDestino: 'mercadopago'` → sucesso, gerou os 2 lados normalmente (linha em
  `jsgrafica_transferencias` + linha espelho em `jsgrafica_saidas`, `saida_id` vinculado); (3)
  `DELETE /api/transferencias` removeu os 2 lados de volta, confirmado via `SELECT` (0 linhas nas
  2 tabelas depois). `npx tsc --noEmit` e `npm run build` limpos.
- **Achados fora do escopo**: nenhum novo.
- **Status final**: concluída. Deploy em produção junto com as demandas 264/269 (mesmo lote):
  aliases confirmados via `vercel inspect` em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
  Pendente só a confirmação do Edvam se "aparecer em todas as telas" (não só Conciliação) é o
  comportamento desejado — se ele preferir restringir, é um ajuste pequeno e localizado (adicionar
  um filtro específico em vez de reaproveitar a lista global direto).
