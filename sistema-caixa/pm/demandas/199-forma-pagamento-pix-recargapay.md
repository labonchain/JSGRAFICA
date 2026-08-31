# 199 — Criar forma de pagamento própria pro Pix estático do RecargaPay

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: 2026-07-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real (Edvam, 2026-07-16): o RecargaPay tem um QR de Pix ÚNICO, estático, gerado
manualmente com a chave Pix do sistema — quando o cliente paga uma recarga por ele, o dinheiro
cai direto na conta digital do RecargaPay, nunca vira dinheiro físico. Só que o sistema não tem
nenhuma forma de pagamento própria pra isso — as opções são só Dinheiro/Cartão/Pix (Mercado
Pago)/Paga na retirada. Resultado: a equipe registra esses pedidos como "Dinheiro" e escolhe uma
gaveta (mecanismo da 196/197) — só que essa gaveta NUNCA vai ter esse dinheiro fisicamente no
fechamento, porque ele nunca existiu em espécie. Isso cria uma divergência NEGATIVA fantasma pra
quem levar a gaveta escolhida (achado real: `ped-1065`, RECARGA CELULAR R$20, Willams
Cavalcanti, registrado como Dinheiro→gaveta Zu, corrigido manualmente pelo PM pra Pix sem gaveta
— ver `pagamento_confirmacoes_historico` do pedido). É o mesmo tipo de problema estrutural que a
196 resolveu pro lado contrário (sobra), agora do lado da falta.

## Objetivo
Existe uma forma de pagamento própria pro Pix estático do RecargaPay — não conta como dinheiro
físico de gaveta nenhuma, mas entra na conciliação do saldo do RecargaPay no fechamento de caixa.

## Escopo
- Incluído: nova opção de forma de pagamento (ex. "Pix RecargaPay", nome sujeito a ajuste na
  implementação) nos lugares onde hoje só existe Dinheiro/Cartão/Pix/Paga na retirada — pelo
  menos no fluxo de recarga (VEM e Celular), que é onde o Pix estático do RecargaPay é usado.
- Essa forma NUNCA aciona a pergunta de gaveta (não é dinheiro físico) — `gaveta_destino` sempre
  null pra ela, independente de quem confirma.
- `getTotalDinheiroRecebidoOperador` continua filtrando só por `forma_pagamento = 'Dinheiro'`
  (não muda) — a nova forma já fica de fora automaticamente, sem precisar tocar nessa função.
- Conferir se o Fechar Caixa / saldo do RecargaPay (campo já existe no fechamento,
  `saldo_recargapay`) precisa de algum ajuste pra refletir esses valores na conciliação, ou se já
  cobre por ser um saldo consultado direto na conta — decisão do executor, documentar o
  raciocínio.
- Explicitamente fora de escopo: qualquer automação de conciliação com a API do RecargaPay (não
  existe API pra isso, confirmado em investigação anterior — confirmação continua manual).

## Critérios de aceite
- [x] Nova forma de pagamento disponível no fluxo de recarga (pelo menos)
- [x] Escolher essa forma nunca pergunta gaveta, pra ninguém
- [x] Pedido com essa forma não conta no "esperado" de dinheiro físico de nenhum operador
- [x] Decisão sobre `saldo_recargapay` no fechamento documentada
- [x] Testado com pedido sintético de recarga usando a nova forma

## Riscos e cuidados
Não confundir com o "Pix" normal (Mercado Pago) — são contas e fluxos de confirmação
completamente diferentes, mesmo tendo "Pix" no nome.

## Referências
`lib/supabase-admin.ts` (`getTotalDinheiroRecebidoOperador`). Demanda 196/197 (mecanismo de
gaveta). Achado real: `ped-1065` (corrigido manualmente pelo PM, 2026-07-16).

## Relato de execução
Investigação: rastreei os 2 lugares onde `forma_pagamento` de um pedido de recarga fica
mal-rotulado hoje:
1. **`ModalConfirmarPagamento`** (`components/TelaPedidos.tsx`, compartilhado por
   `TelaPedidos.tsx` e `TelaInbox.tsx`) — confirmação POSTERIOR de pagamento, usada quando um
   pedido criado pelo Inbox precisa avançar de status sem pagamento confirmado ainda. Só tinha
   Dinheiro/Cartão/Pix — sem opção própria, forçava escolher uma das 3, e é exatamente aqui que
   o `ped-1065` (achado real) foi confirmado errado como "Dinheiro".
2. **`confirmarPagamentoRecarga`/`confirmarRecargaMista`** (`app/page.tsx` e `app/pdv/page.tsx`,
   duplicado nos 2 balcões) — os botões "✓ Confirmar pagamento"/"✓ Recarga paga" do popup
   `ModalQrPix` (venda 100% recarga ou mista, criada no balcão) mandavam
   `formaPagamento: "Pix"` HARDCODED pro PATCH — todo pedido de recarga confirmado pelo balcão
   virava genericamente "Pix", indistinguível do Pix real do Mercado Pago em qualquer relatório.

Mudanças:
- **`ModalConfirmarPagamento`** ganhou o 4º botão "Pix RecargaPay" (grid mudou de 3 pra 2
  colunas — 2x2 — pro rótulo mais longo caber bem). Cobre tanto a aba Pedidos quanto o
  Atendimento (Inbox), já que é o mesmo componente reaproveitado nos dois.
- **`confirmarPagamentoRecarga`/`confirmarRecargaMista`** (nas 2 telas de balcão) trocaram o
  `formaPagamento: "Pix"` hardcoded por `"Pix RecargaPay"` — essas confirmações NUNCA são Pix do
  Mercado Pago (é sempre o Pix estático do RecargaPay, por definição de quando esses botões
  aparecem), então a correção é uma rotulagem mais correta, não uma mudança de comportamento.
- Gaveta: **nunca perguntada nem gravada** pra esta forma — garantido estruturalmente (o
  seletor de gaveta só aparece com `forma === "Dinheiro"`, e o backend só grava
  `gaveta_destino` quando `formaPagamento === 'Dinheiro'`, tanto no PATCH de avanço de status
  quanto na criação do pedido). Nenhuma mudança extra foi necessária aqui — só verificação.
- **`getTotalDinheiroRecebidoOperador`** (`lib/supabase-admin.ts`) já filtra estritamente por
  `forma_pagamento = 'Dinheiro'` — a nova forma fica de fora automaticamente, sem tocar na
  função (conforme o próprio escopo da demanda antecipava).
- Achado adicional durante a investigação (dentro do escopo — "conferir se precisa de algum
  ajuste pra refletir esses valores na conciliação"): `getResumoPorFormaPagamento`
  (`lib/supabase-admin.ts`, discriminação por forma no Fechamento) e `ORDEM_FORMAS`
  (`app/api/dashboard/route.ts`, "Entradas por forma de pagamento" do Dashboard) são
  whitelists FIXAS de forma_pagamento — sem entrar nelas, pedidos com a forma nova cairiam
  silenciosamente fora do `totalLiquido` da discriminação (Fechamento) ou dentro de "Não
  informado" (Dashboard, rótulo que devia significar só "dado ausente/histórico", não "forma
  real esquecida"). Adicionei "Pix RecargaPay" como bucket próprio nas duas — sem isso, o
  `totalEntradas` do fechamento geral (que soma TODOS os pedidos confirmados, sem filtrar por
  forma) divergiria silenciosamente do `totalLiquido` da tela de discriminação por forma.
- **`saldo_recargapay`** (campo do Fechamento): decisão — **não precisa de nenhum ajuste**. É um
  campo 100% manual (`components/TelaFechamento.tsx`), onde o Admin digita o saldo que vê
  DIRETO no app do RecargaPay na hora de fechar o caixa — não é calculado a partir de
  `jsgrafica_pedidos`. Como o Pix RecargaPay de qualquer pedido (com essa forma nova ou não)
  sempre caiu fisicamente na conta digital do RecargaPay, esse saldo manual já reflete o
  dinheiro certo automaticamente, sem depender de nenhuma soma por forma de pagamento no nosso
  sistema — é a "opção B" que a própria demanda cogitava.
- Decisão consciente de **não mexer** no seletor de pagamento da tela "Finalizar Venda"
  (criação da venda no balcão, `app/page.tsx`/`app/pdv/page.tsx`) — ali, escolher "Pix" já
  aciona a detecção automática de recarga 100%/mista existente (147/179) e não gera nenhum
  problema de contagem (pagamento ainda não confirmado, forma provisória, igual "Paga na
  retirada"). O rótulo correto e definitivo ("Pix RecargaPay") passa a ser gravado no momento
  real da CONFIRMAÇÃO (via `ModalConfirmarPagamento` ou os botões do popup), que é onde o bug
  de fato acontecia — manter o seletor de criação enxuto evitou complexidade de detectar "carrinho
  tem item de recarga" só pra escolher entre rótulos provisórios equivalentes.

Teste: criei 2 pedidos sintéticos de recarga (categoria "Recarga celular", produto `prod-077`)
direto no Supabase, sempre limpos depois:
- `teste-199-recarga`: simulei via curl o PATCH que o `ModalConfirmarPagamento` manda
  (`status: em_producao, formaPagamento: "Pix RecargaPay"`) — resposta confirmou
  `forma_pagamento: "Pix RecargaPay"`, `pagamento_confirmado: true`, `gaveta_destino: null`.
- Consultei `/api/fechamento` (geral) e vi o bucket novo "Pix RecargaPay" (R$30, taxa 0%,
  conta null) aparecer isolado na discriminação por forma, sem se misturar com "Pix".
  Consultei `/api/dashboard` e vi a mesma forma aparecer como linha própria em
  "entradasPorFormaPagamento", não em "Não informado".
  Consultei `/api/fechamento?operador=Edvam` (dinheiro físico esperado do operador que criou o
  pedido) e confirmei R$0 — o pedido de recarga não conta no esperado de ninguém.
- `teste-199-modal-ui`: teste de UI com Playwright (login Edvam admin → aba Pedidos → "Iniciar
  produção" → modal "Pagamento pendente") — confirmou visualmente o botão "Pix RecargaPay" no
  grid 2x2, que escolhê-lo NÃO abre a pergunta de gaveta, que o "Confirmar" fica liberado na
  hora, e que o pedido avança pra "Em produção" normalmente. Print em anexo ao chat.
- Os 2 pedidos sintéticos foram apagados do banco ao final (`delete ... where id in (...)`).

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_J7g4pjgnYyY7KASPGwLxJ3ooaCFJ`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.

Nenhum achado fora de escopo pendente — a única extensão feita (os 2 buckets de conciliação)
está dentro do que a própria demanda pediu pra conferir.
