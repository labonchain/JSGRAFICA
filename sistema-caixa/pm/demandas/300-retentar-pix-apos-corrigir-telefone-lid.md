# 300 - Retentar Pix automaticamente quando o telefone LID de um pedido é corrigido

Status: concluída
Criada em: 2026-08-17
Aprovada em: 2026-08-17
Concluída em: 2026-08-17
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado ao vivo investigando reclamação real do Edvam ("não está gerando o QR code no PDV/Admin").
4 pedidos hoje (`ped-3065`, `ped-3066`, `ped-3073`, `ped-3074`) tiveram Pix pulado porque o
telefone do contato ainda estava em formato `@lid` no momento da criação (mesmo comportamento já
documentado na demanda 238/151). O Edvam apontou 2 problemas reais que a 151 não cobria:

1. **A correção do telefone (`jsgrafica_backfill_telefone_lid`) rodava só 1x por dia (cron `0 4
   * * *`)** - tempo demais pra um pedido do dia. Corrigido na hora, fora desta demanda: PM alterou
   o `cron.job` pra `*/15 * * * *` (a cada 15 min), confirmado ativo. Isso sozinho já reduz o
   atraso de até 24h pra até 15 min.
2. **Mesmo com o telefone corrigido, o pedido nunca ganha o Pix de verdade.** Confirmado ao vivo:
   depois de rodar a correção manualmente, `ped-3066` ficou com `telefone` certo
   (`558194230263`), mas `mp_order_id`/`mp_pix_qr_code` continuam `null` - a correção de telefone
   só resolve o dado do contato, nunca volta pra tentar `criarCobrancaPix` de novo (o próprio
   código já avisava isso: comentário da demanda 238 em `app/api/pedidos/route.ts`, "não retroage
   pra tentar o Pix depois"). Confirmado também: não existe HOJE nenhum botão/ação manual em
   `TelaPedidos.tsx` pra gerar Pix de um pedido já criado - a única saída pro atendente hoje é
   combinar o Pix manualmente por fora do sistema.

Um 2º caso do mesmo incidente (`RJ Refrigeração`, `ped-3073`/`ped-3074`) mostra que nem sempre a
correção de telefone tem solução: nenhum número real foi recuperável no log pra esse contato,
mesmo rodando a correção na hora. Isso é limite estrutural (sem dado recuperável, não tem o que
corrigir), fica fora do escopo desta demanda, registrado aqui pra não ser esquecido.

## Objetivo
Pedido que teve o Pix pulado por telefone `@lid` recebe uma tentativa real de Pix assim que o
telefone é corrigido (automático) ou o atendente consegue gerar manualmente pela tela (se o
automático não cobrir todos os casos), sem precisar recriar o pedido do zero.

## Escopo
- Incluído: quando `jsgrafica_backfill_telefone_lid()` corrige `jsgrafica_pedidos.telefone` de um
  pedido que (a) tem `forma_pagamento_escolhida = 'pix'`, (b) `mp_order_id is null`, (c)
  `pagamento_confirmado = false`, (d) `status != 'cancelado'` - disparar a criação real da cobrança
  Pix (`criarCobrancaPix`, mesma função de sempre) pra esse pedido, sem esperar o atendente notar.
  Decidir com o Edvam se isso roda dentro da própria function do Postgres (via `pg_net`/webhook
  chamando a rota da app) ou se um job/rota da app assume esse papel (rodando também a cada 15 min,
  ou reagindo a um sinal da correção) - decisão técnica de implementação, não travada aqui.
- Incluído: mesmo se o automático cobrir a maioria dos casos, adicionar um botão manual "Gerar
  Pix" em `TelaPedidos.tsx` pra pedido com Pix escolhido e ainda sem `mp_order_id` (cobre o caso
  residual: telefone sem solução automática, tipo `RJ Refrigeração`, onde alguém vai precisar
  confirmar o número por fora e digitar/corrigir manualmente antes de tentar de novo).
- Incluído: gerar o rascunho de aviso pro cliente (mesmo padrão da 124/141) quando o Pix
  finalmente for gerado depois do atraso, avisando que a cobrança está pronta.
- Incluído: rodar a correção agora mesmo (já feita pelo PM fora desta demanda) não substitui
  testar o mecanismo novo com um caso real ou simulado de ponta a ponta.
- Explicitamente fora de escopo: resolver o caso sem número recuperável no log (`RJ Refrigeração`)
  - isso não tem solução automática possível, fica registrado como limite conhecido, não bug.
- Explicitamente fora de escopo: mudar a frequência do cron de novo (já ajustada, 15 min)
  ou renomear o job (`_diario` ficou desatualizado no nome, cosmético, não urgente).

## Critérios de aceite
- [x] Pedido com Pix pulado por telefone LID recebe tentativa real de Pix assim que o telefone é
      corrigido, sem exigir recriação do pedido
- [x] Botão manual de gerar Pix existe em `TelaPedidos.tsx` pra pedido com Pix escolhido e sem
      `mp_order_id`, cobrindo o caso sem correção automática possível
- [x] Testado com pelo menos 1 caso real ou simulado de ponta a ponta (telefone corrigido → Pix
      gerado → rascunho de aviso criado)
- [x] `ped-3066` (caso real de hoje, telefone já corrigido, ainda sem Pix) resolvido como parte do
      teste desta demanda, não deixado pra trás

## Riscos e cuidados
Cuidado de idempotência: se o mecanismo novo rodar mais de uma vez pro mesmo pedido (ex. cron de
15 min mais botão manual sendo clicado junto), não pode gerar 2 cobranças - `criarCobrancaPix` já
é idempotente por `externalReference` (`X-Idempotency-Key`), mas o vínculo em `jsgrafica_pedidos`
(gravar `mp_order_id`) precisa checar de novo se já existe antes de tentar, mesmo padrão que
`app/api/mercadopago/cobranca/route.ts` já usa (`existente`, linha ~96).

## Referências
Demanda 238 (achado original, telefone LID pula Pix sem log). Demanda 151 (varredura periódica,
frequência corrigida hoje fora desta demanda). `app/api/pedidos/route.ts` (ponto onde o Pix é
pulado hoje). `lib/mercadopago.ts` (`criarCobrancaPix`, reaproveitar sem duplicar).
`app/api/mercadopago/cobranca/route.ts` (padrão de idempotência já usado no fluxo de balcão,
mesmo cuidado aqui). Casos reais desta demanda: `ped-3065`, `ped-3066` (telefone corrigido, Pix
pendente), `ped-3073`, `ped-3074` (telefone sem solução automática, caso `RJ Refrigeração`).

## Relato de execução

### O que foi feito

**Rota nova, único ponto de retry** — `app/api/pedidos/retentar-pix/route.ts` (POST, `{pedidoId}`):
revalida as 4 condições sempre (nunca confia em quem chamou), chama `criarCobrancaPix`
(`lib/mercadopago.ts`, mesma função de sempre, nada duplicado), vincula `mp_order_id`/
`mp_pix_qr_code`/`mp_pix_expira_at` com guarda atômica (`UPDATE ... WHERE mp_order_id IS NULL`) e
grava o rascunho de aviso (mesmo padrão 124/141, reaproveitando `montarTrechoPix` — exportada de
`lib/pedidos.ts` pra isso) só quando este processo realmente venceu a corrida de gravação.
`criarCobrancaPix` já é idempotente do lado do Mercado Pago (`X-Idempotency-Key` por `pedido.id`)
— a guarda aqui só evita rascunho duplicado, nunca cobrança duplicada.

**Automático** — trigger `jsgrafica_trg_retentar_pix_telefone` (`AFTER UPDATE OF telefone ON
jsgrafica_pedidos`) dispara sempre que um telefone sai de `@lid` pra um número real E o pedido
continua elegível (Pix escolhido, sem `mp_order_id`, não pago, não cancelado, sem `venda_id`) —
chama a mesma rota acima via `pg_net.http_post` pra `https://admin.jsgrafica.site/api/pedidos/
retentar-pix`. Cobre qualquer caminho que corrija `telefone` (não só a função da 151), e dispara
na hora — não espera o próximo ciclo de 15min do cron.

**Manual** — botão "💠 Gerar Pix" em `components/TelaPedidos.tsx` (`PainelDetalhe`, seção
Pagamento), visível quando `forma_pagamento_escolhida === 'pix'`, sem `mp_order_id`, não pago, não
cancelado. Chama a mesma rota, abre o `ModalQrPix` já existente (reaproveitado, mesmo componente
do balcão/Inbox) com o QR/copia-e-cola reais.

**Limite conhecido, documentado no código e aqui**: pedido com `venda_id` (parte de uma venda com
2+ itens) fica de fora do retry automático E do botão manual — a rota rejeita explicitamente com
mensagem clara. Os 4 casos reais que motivaram a demanda (`ped-3065/3066/3073/3074`) são todos
avulsos (`venda_id null`); replicar aqui a lógica de agrupamento/recarga de múltiplos itens
(demandas 076/147/179) sem nenhum caso real pra validar contra seria risco desnecessário pra uma
demanda urgente. Se aparecer um caso real de venda agrupada travada do mesmo jeito, é candidato a
demanda própria.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **`ped-3066` (caso real obrigatório do critério de aceite)**: chamado via `curl` local contra a
  rota nova — cobrança Pix REAL criada no Mercado Pago (`orderId ORD01M084V0KVYJSD27EDE9MV3ZM3`,
  R$ 7,00), confirmado gravado em `jsgrafica_pedidos` (`mp_order_id`/`mp_pix_qr_code`/
  `mp_pix_expira_at`) e rascunho de aviso gravado em `jsgrafica_rascunhos_pedido` pro telefone
  `558194230263`, pronto pra equipe revisar/mandar. **Idempotência confirmada**: chamada de novo
  devolveu o MESMO `orderId` (`jaExistia: true`), sem 2º rascunho.
- **`ped-3073` (cancelado) e `ped-3074` (forma "dinheiro")**: rejeitados com a mensagem certa em
  cada caso — confirma que as revalidações server-side funcionam com dado real, não só teoria.
- **Gatilho automático, ponta a ponta**: pedido sintético criado com telefone `@lid`, valor
  R$ 0,01 (mesmo padrão de teste com dinheiro real mínimo já usado neste projeto), depois
  `UPDATE telefone` simulando a correção da 151 — confirmado que o trigger disparou sozinho,
  `pg_net` entregou a chamada, e `mp_order_id` apareceu gravado no banco em poucos segundos, SEM
  eu chamar a rota manualmente. Pedido de teste e rascunho apagados depois.
- **Botão manual, na tela de verdade**: Playwright contra o dev server local — pedido sintético
  (telefone real, sem `venda_id`), botão "💠 Gerar Pix" aparece certo na seção Pagamento, clique
  abre o `ModalQrPix` com QR/copia-e-cola reais, "Aguardando pagamento..." ativo. Testado também
  que o botão **some** corretamente no `ped-3066` real (já tem `mp_order_id` agora) — sem
  regressão, gate funcionando nos dois sentidos. Pedido de teste e rascunho apagados depois.
- Deploy: `npx vercel --prod --yes` (1ª tentativa falhou com "Not authorized", transiente — retry
  funcionou), aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`. Trigger criado direto no
  banco de produção (aponta pra `admin.jsgrafica.site` real).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- `app/api/mercadopago/cobranca/route.ts` (rota do balcão, não tocada nesta demanda) não valida
  `status !== 'cancelado'` antes de gerar cobrança — hoje, tecnicamente, dá pra gerar um Pix real
  pra uma venda de balcão já cancelada se alguém chamar essa rota de novo depois do cancelamento.
  Não achei evidência de isso ter acontecido de verdade; reportando como gap encontrado ao ler o
  código pra decidir se reaproveitava essa rota (decidi não reaproveitar, ver acima), não como bug
  ativo confirmado.
- Nenhuma rota de `/api/*` deste sistema valida sessão/autenticação no servidor (login é 100%
  client-side, `lib/usuarios.ts`) — gap pré-existente, não introduzido por esta demanda (a rota
  nova `retentar-pix` está no mesmo nível de exposição que toda rota `/api/pedidos` já tem hoje).
  Registrado aqui pra não passar despercebido, não é desta demanda corrigir.

### Status final: concluída
