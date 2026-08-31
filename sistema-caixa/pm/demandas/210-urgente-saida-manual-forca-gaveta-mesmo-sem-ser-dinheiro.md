# 210 — URGENTE: saída manual força escolha de gaveta mesmo quando não é dinheiro físico

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-07-17
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real do Edvam (2026-07-17, urgente): a demanda 207 corrigiu o caso de saída em dinheiro
físico sem gaveta própria, mas o executor da 207 concluiu (sem confirmar com o PM) que "toda
saída manual já é tratada implicitamente como dinheiro físico" — por isso o bloco "Essa saída
saiu da gaveta de quem?" (Zu/Gabi) passou a aparecer **sempre**, pra qualquer saída lançada pelo
Admin, mesmo quando o pagamento real foi por Pix da conta do Mercado Pago (ou poderia ser Stone,
Caixa Econômica, RecargaPay). Isso está forçando o Edvam a escolher uma gaveta física errada pra
despesas que não têm nada a ver com dinheiro em espécie — quebra o `operador`/`conta_origem` de
saídas que não são de gaveta nenhuma, o oposto do que a 200/201/207 foram construídas pra
resolver.

## Objetivo
Lançar uma saída pergunta **de qual das 6 contas reais o dinheiro saiu** (Dinheiro Zu, Dinheiro
Gabi, Mercado Pago, Stone, Caixa Econômica, RecargaPay) — não só as 2 gavetas físicas — e grava
`operador`/`conta_origem` corretamente conforme a escolha.

## Escopo
- Incluído: no formulário "+ Adicionar saída" (`lancarSaida()`, `app/page.tsx`, alterado pela
  207), trocar o seletor binário Zu/Gabi pelo seletor completo das 6 contas — reaproveitar a
  MESMA lista (`CONTAS_ORIGEM`, `lib/dados.ts`, criada na demanda 200) já usada em "Transferir
  entre contas" (201) e na correção de `conta_origem` (200). Não inventar uma terceira lista.
- Gravação por tipo de conta escolhida:
  - **Dinheiro Zu / Dinheiro Gabi**: mesmo comportamento que a 207 já construiu — `operador` vira
    o nome de quem tem a gaveta.
  - **Mercado Pago / Stone / Caixa Econômica / RecargaPay**: `operador` continua sendo quem
    lançou (Edvam — não afeta divergência de gaveta física de ninguém, correto), `conta_origem`
    grava a conta digital escolhida (mesmo campo/mecanismo da 200).
- Pergunta continua obrigatória pro Admin (sem gaveta/conta "padrão" própria) — critério de quem
  vê a pergunta não muda, só as opções dentro dela.
- Zu/Gabi lançando saída própria: continuam sem ver nada disso (mesmo critério de sempre — essa
  tela só existe no Admin, confirmado pela 207).
- Conferir e corrigir, se necessário, qualquer saída JÁ lançada hoje (desde o deploy da 207) que
  tenha sido forçada erroneamente pra Zu/Gabi mas na real não era dinheiro físico — levantar a
  lista pro PM decidir as correções manuais caso a caso, não corrigir sozinho sem mostrar.

## Critérios de aceite
- [x] Seletor de "Adicionar saída" mostra as 6 contas, não só 2
- [x] Escolher conta digital grava `conta_origem` certo, sem mexer na gaveta de ninguém
- [x] Escolher gaveta física continua funcionando como a 207 já entregou
- [x] Testado com pelo menos 1 saída sintética de cada tipo (gaveta física e conta digital)
- [x] Levantamento de saídas reais lançadas erroneamente desde a 207, entregue ao PM (não corrigido sozinho)

## Riscos e cuidados
Isso é urgente porque toda saída lançada pelo Admin desde o deploy da 207 pode estar com
`operador` errado (Zu ou Gabi por padrão, mesmo quando não era dinheiro físico) — levantar o
alcance real antes de fechar a demanda, não presumir que é só o caso relatado.

## Referências
Demanda 207 (o formulário que introduziu o problema). Demanda 200 (`CONTAS_ORIGEM`,
`conta_origem`). Demanda 201 (mesmo seletor de 6 contas já usado em "Transferir entre contas").

## Relato de execução
**Autocrítica**: a conclusão da 207 ("toda saída manual é dinheiro físico, porque o formulário
não distingue forma de pagamento") estava errada — confundi "o formulário não pergunta a forma"
com "logo só existe uma forma possível". A ausência de campo só significa que ninguém tinha
construído a distinção ainda, não que ela não existe na realidade (a saída pode sim ter sido
paga com Mercado Pago/Stone/Caixa Econômica/RecargaPay, como qualquer saída da 200 já previa).
Devia ter confirmado com o PM antes de assumir, como a própria demanda 210 aponta.

**Correção**: trocado o seletor binário Zu/Gabi (âmbar, 207) pelo seletor completo das 6 contas
reais — reaproveita 100% a lista `CONTAS_ORIGEM` (`lib/dados.ts`, criada na 200, já usada em
"Transferir entre contas" da 201), sem criar uma terceira lista. Gravação por tipo de conta:
- **Dinheiro Zu / Dinheiro Gabi**: `operador` vira o nome de quem tem a gaveta, `conta_origem`
  fica `null` (mesmo comportamento que a 207 já tinha entregue certo pra este caso — não mudou).
- **Mercado Pago / Stone / Caixa Econômica / RecargaPay**: `operador` continua sendo quem lançou
  (Edvam — correto, essa escolha não mexe na gaveta física de ninguém), `conta_origem` grava a
  conta escolhida (mesmo campo da 200).
- Backend (`POST /api/saidas`) passou a aceitar e validar `contaOrigem` na CRIAÇÃO da saída
  (antes só existia a correção posterior via `PATCH corrigirContaOrigem` da 200) — valida contra
  a mesma lista fixa de 6 contas, rejeita valor fora dela.
- Pergunta continua obrigatória só pro Admin (mesmo critério de sempre — Zu/Gabi não veem nada
  disso, confirmado de novo: só existe em `app/page.tsx`).

**Levantamento das saídas reais lançadas desde o deploy da 207** (`dpl_HRFN7mUVUtDJ5jMv3yqvZYbq6Dxb`,
17/07 11:17:20 -03) até agora — 3 saídas no total, revisadas uma a uma:
1. `30037322-d42e-4aa8-9db7-5808d7bc8549` — R$6,50, "Material de expediente", "01 lâmpada para
   aquecer papel", `operador: Zu`, 17/07 13:18. **É o próprio caso real que motivou a 207** — a
   lâmpada foi paga mesmo com dinheiro físico da gaveta da Zu. Correto, nenhuma ação necessária.
2. `74c46dee-583c-4231-8323-753560d464b7` — R$12,50, "Repasse Recarga VEM", `operador: Gabi`,
   17/07 17:00. **Não passou pelo formulário afetado** — é o repasse AUTOMÁTICO
   (`gerarSaidaAutomaticaNaVenda`, disparado quando o pedido vira entregue, grava
   `pedido_criado_por` direto, nunca passa por `lancarSaida()`). Gabi realmente vendeu esse
   pedido — correto, fora do alcance do bug da 207.
3. **`84a3546c-9e8e-4909-8d05-b17c61818809` — R$45,00, "Retiradas Sócios", "coca - reserva",
   `operador: Zu`, 17/07 18:22 — CANDIDATO A CORREÇÃO, sinalizado pro PM/Edvam decidir.** Passou
   pelo formulário afetado pela 207 (categoria manual, não automática). A descrição "coca -
   reserva" não deixa claro se o dinheiro realmente saiu fisicamente da gaveta da Zu ou se foi
   uma retirada de sócio por outra via (conta digital) — não tenho como confirmar sozinho qual é
   a realidade, e a demanda pede explicitamente pra levantar, não corrigir por conta própria. Se
   NÃO foi dinheiro físico da Zu, a correção é via botão "Conta" (mecanismo da 200, já no ar) —
   não precisa de deploy novo, só o PM/Edvam confirmar a conta certa e um clique.

Teste (sintético, apagado depois): saída R$9,90 "Mercado Pago" → gravou `operador: 'Edvam'` +
`conta_origem: 'mercadopago'` (não mexeu em gaveta nenhuma); saída R$4,20 "Dinheiro (Zu)" →
gravou `operador: 'Zu'` + `conta_origem: null` (mesmo comportamento da 207, intacto). Testado
via Playwright: as 6 contas aparecem no seletor, rótulo mudou pra "De qual conta esse dinheiro
saiu de verdade?".

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção: `dpl_48vcJUsSbGhDRzFQ7EQuCJudNQyJ`,
aliases confirmados via `vercel inspect` em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
