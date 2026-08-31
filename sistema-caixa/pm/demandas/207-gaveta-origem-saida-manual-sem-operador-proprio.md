# 207 — Perguntar qual gaveta pagou quando o Admin lança uma saída em dinheiro

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-07-17
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real do Edvam (2026-07-17): pegou R$6,50 em dinheiro na gaveta da Zu pra comprar uma
lâmpada e perguntou como lançar isso e o que acontece no fechamento do dia com esse dinheiro.
Investigação do PM: `lancarSaida()` (`app/page.tsx`) sempre grava `operador: operador.nome`, ou
seja, quem está logado no momento (sempre Edvam, único com acesso ao admin) — não existe campo
pra escolher "essa saída saiu da gaveta de outra pessoa". `getTotalSaidasOperador`
(`lib/supabase-admin.ts`, mecanismo da 200) só desconta uma saída do esperado de alguém quando
`operador` bate exatamente com o nome dela — uma saída lançada como `operador: Edvam` nunca
desconta do esperado da Zu, mesmo que o dinheiro tenha saído fisicamente da gaveta dela. Resultado:
no fechamento, a Zu fecharia com menos dinheiro físico do que o sistema espera, sem nenhuma
explicação visível — é a mesma raiz da 196 (Edvam não tem gaveta própria), agora do lado da
saída em vez da entrada.

## Objetivo
Quando o Admin lança uma saída em Dinheiro, o sistema pergunta de qual gaveta física o dinheiro
saiu de verdade — e o esperado dessa gaveta cai corretamente, igual já acontece do lado da
entrada (196/197).

## Escopo
- Incluído: no formulário "+ Adicionar saída" (`lancarSaida()`, `app/page.tsx`), quando quem está
  lançando é o Admin (papel sem gaveta própria, mesmo critério da 196) e a saída é paga em
  Dinheiro, perguntar "essa saída saiu da gaveta de: Zu / Gabi" antes de confirmar — obrigatório
  nesse caso, igual o bloco âmbar já usado na 196.
- O valor escolhido grava `operador` da saída como o nome de quem tem a gaveta (Zu ou Gabi), não
  Edvam — mesmo padrão que a 201 já usa pra transferência entre contas (reaproveitar a lógica, não
  duplicar).
- Zu e Gabi lançando a própria saída continuam exatamente como hoje — zero pergunta nova, zero
  clique a mais (elas têm gaveta própria, sem ambiguidade).
- Só se aplica quando a saída é em Dinheiro. Saída que não envolve dinheiro físico (ex. saída
  ligada a conta digital) não pergunta nada — decisão do executor confirmar se o formulário atual
  distingue forma de pagamento da saída ou se toda saída manual é sempre tratada como dinheiro
  físico por padrão (documentar o que encontrar).
- Explicitamente fora de escopo: mudar a saída automática de repasse de recarga (essa já é
  resolvida pela 200/201, mecanismo diferente).

## Critérios de aceite
- [x] Zu/Gabi lançando saída: nenhuma mudança visível
- [x] Admin lançando saída em Dinheiro: pergunta obrigatória "saiu da gaveta de quem"
- [x] `operador` da saída grava com o nome de quem tem a gaveta escolhida
- [x] `getTotalSaidasOperador` já desconta certo sem mudança adicional (mesma lógica de sempre)
- [x] Testado com saída sintética do Edvam escolhendo cada uma das 2 gavetas

## Riscos e cuidados
Reaproveitar a mesma lógica de atribuição de `operador` que a 201 já usa (transferência com
origem em gaveta física) — não inventar um segundo mecanismo paralelo pro mesmo problema.

## Referências
Demanda 196/197 (mesmo problema, lado da entrada). Demanda 200/201 (`conta_origem`,
`getTotalSaidasOperador`, atribuição de `operador` na transferência). `app/page.tsx`
(`lancarSaida()`). Caso real: R$6,50, lâmpada, gaveta da Zu, 2026-07-17.

## Relato de execução
Achado confirmado (pedido explicitamente pela demanda pra documentar): o formulário
"+ Adicionar saída" (`lancarSaida()`, `app/page.tsx`) **não tem nenhum campo de forma de
pagamento** — só categoria, valor/quantidade e descrição. Ou seja, toda saída lançada por esse
formulário já é tratada implicitamente como dinheiro físico saindo de uma gaveta (não existe
"saída em Cartão/Pix" nesse fluxo manual pra excluir). Por isso a pergunta obrigatória de gaveta
vale pra QUALQUER categoria escolhida pelo Admin, sem condicional de forma de pagamento (a
demanda cogitava essa possibilidade, mas não existe distinção pra aplicar).

Implementação (`app/page.tsx`, `TelaSaidas`):
- Novo estado `gavetaSaida` + `precisaGavetaSaida = isAdmin` (mesmo critério da 196/197 — quem
  lança não tem gaveta física própria).
- Bloco âmbar idêntico visualmente ao da 196/197/201 ("💵 Essa saída saiu da gaveta de quem?
  (obrigatório...)"), inserido logo abaixo do nome da categoria escolhida — aparece pras DUAS
  variantes do formulário (recarga VEM e genérica), já que a pergunta não depende da categoria.
- Botão "Lançar" trava (`disabled`) em ambas as variantes enquanto `precisaGavetaSaida &&
  !gavetaSaida`.
- `lancarSaida()`: `operador` do POST passa a ser `gavetaSaida` (Zu/Gabi) quando aplicável, em
  vez de sempre `operador.nome` (Edvam) — mesmo padrão que a 201 já usa na saída gerada pela
  transferência entre contas (`OPERADOR_POR_CONTA_DINHEIRO`), reaproveitado, não duplicado.
  `conta_origem` não é tocado (fica `null`, padrão) — não é um caso de "conta diferente da
  gaveta de quem vendeu" (200), é simplesmente registrar CORRETAMENTE de qual gaveta física o
  dinheiro saiu, que é exatamente o dado que faltava.
- `gavetaSaida` reseta ao trocar de categoria, fechar o painel ou após lançar com sucesso —
  evita uma escolha antiga vazar pro próximo lançamento.
- `getTotalSaidasOperador` (200) não precisou de NENHUMA mudança — já filtra por `operador`
  exato, e agora `operador` chega correto (Zu/Gabi) desde a origem.
- Zu/Gabi: nenhuma mudança de código foi feita a mais que pudesse afetá-las — o formulário
  "Adicionar saída" só existe em `app/page.tsx` (Admin), nunca montado em `app/pdv/page.tsx`
  (confirmado por busca — Zu/Gabi não têm acesso a esta tela hoje, então nem chegam a ver o
  bloco novo).

Teste: reproduzi o caso real do Edvam — lancei (via UI, Playwright) uma saída de R$6,50,
categoria "Material de expediente", descrição "Lâmpada (teste 207)", escolhendo "Gaveta da Zu".
Confirmei: bloco âmbar aparece, "Lançar" trava sem escolher gaveta e libera ao escolher (prints
em anexo); a saída gravou `operador: 'Zu'` (confirmado via API `/api/saidas`, não `'Edvam'`);
`GET /api/fechamento?operador=Zu` foi de `totalSaidas: 40 → 46,5` e `saldoAcumulado: 61,90 →
55,40` (queda de exatamente R$6,50 — o dinheiro sai do esperado dela corretamente, resolvendo o
caso real relatado). Testei também a gaveta da Gabi (via API, mesmo corpo que a UI manda):
`operador: 'Gabi'` gravado certo, `totalSaidas` foi de 0 → 3,25, `saldoAcumulado` caiu
exatamente R$3,25. Os 2 lançamentos sintéticos foram apagados do banco ao final.

Observação sem relação com esta demanda: a tela já mostra, no card "⚠️ Pendências entre contas"
(201), uma transferência real Caixa Econômica → RecargaPay (R$109, lançada pelo próprio Edvam em
produção, fora desta sessão) ainda sem resolução — confirma que o mecanismo da 200/201 já está
em uso real, nada a fazer aqui.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_HRFN7mUVUtDJ5jMv3yqvZYbq6Dxb`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.
