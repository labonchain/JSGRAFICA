# 220 — Persistir falha de geração de cobrança Pix (hoje é ponto cego)

Status: concluída
Criada em: 2026-07-21
Aprovada em: 2026-07-21
Concluída em: 2026-07-21
Chat executor: 03 - APP JS GRAFICA

## Contexto
O 05-FINANCEIRO confirmou na prática (não só relatou de ouvido) que hoje é impossível auditar
retroativamente uma falha de geração de cobrança Pix: tentou buscar o log da Vercel na janela
exata da criação do `ped-1251` (20-07-26, 18h10-18h20 UTC) e recebeu `ExceedsBillingLimitError` —
o plano atual nem permite consultar essa janela. Mesmo quando o log está disponível, ele expira
depois de um tempo. `criarCobrancaPix` (`lib/mercadopago.ts`) só usa `console.error` quando falha
— não existe nenhuma tabela guardando isso.

Isso já causou dois problemas concretos nesta mesma semana: (1) não dá pra saber, depois do
fato, se uma falha foi timeout, erro de API do Mercado Pago, rate limit ou outra coisa; (2) o
caso do `ped-1251` (recarga, R$50, pagamento nunca confirmado) não tem nenhum registro de
tentativa, sucesso ou falha pra investigar.

## Objetivo
Toda vez que a criação de cobrança Pix (`criarCobrancaPix`, os 2 pontos de chamada:
`app/api/pedidos/route.ts` e `app/api/mercadopago/cobranca/route.ts`) falhar, isso fica
registrado de forma permanente e consultável — não só no `console.error` que se perde.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Proponha primeiro o formato exato da tabela/registro (campos, onde grava, se precisa de
migration nova via 02-DADOS) e relate ao PM antes de implementar qualquer coisa. **Não crie
tabela, não altere `criarCobrancaPix`, não faça deploy até ter confirmação explícita** do PM ou
do Edvam sobre o formato proposto.

**Atualização 2026-07-21**: schema proposto aprovado. Tabela `jsgrafica_mercadopago_falhas_cobranca`
será criada pelo 02-DADOS na demanda 221 (schema é domínio dele, não seu). Aguarde a 221 ser
concluída antes de implementar o helper `registrarFalhaCobrancaPix` e os 2 pontos de chamada.

## Escopo
- Incluído: criar uma tabela nova (ex. `jsgrafica_mercadopago_falhas_cobranca` ou nome
  equivalente que o 02-DADOS achar melhor — esta parte de schema é domínio do 02-DADOS, não do
  03-APP; se a criação de tabela for necessária, o 03-APP deve propor o formato e pedir uma
  demanda separada pro 02-DADOS antes de seguir, ou coordenar via PM) guardando, no mínimo:
  `pedido_id` (quando existir), `data_dia`, `created_at`, erro/mensagem retornado pela API do
  Mercado Pago, tempo de espera decorrido até desistir, `payload` resumido da tentativa.
- Incluído: `criarCobrancaPix` (ou quem a chama) passa a gravar essa falha antes de propagar o
  erro pro caller, nos 2 pontos de chamada existentes.
- Incluído: não mudar o comportamento visível pro atendente (o aviso de erro no popup continua
  igual) — isso é só sobre persistir o rastro, não sobre mudar o fluxo de venda.
- Explicitamente fora de escopo: mudar a lógica de timeout/retry (198, já ajustada). Criar
  qualquer tela nova pra visualizar essas falhas — por ora só precisa existir o registro,
  consulta é via SQL direto pelo 05-FINANCEIRO quando precisar auditar.

## Critérios de aceite
- [x] Falha de `criarCobrancaPix` gera um registro permanente e consultável, nos 2 pontos de
      chamada
- [x] Testado forçando uma falha sintética (ex. token inválido temporário ou mock) e confirmando
      que o registro aparece
- [x] Nenhuma mudança no comportamento visível pro atendente

## Riscos e cuidados
Se a criação de tabela nova for necessária, este 03-APP não deve rodar migration de schema
sozinho — isso é domínio do 02-DADOS. Coordenar via PM antes de aplicar qualquer DDL.

## Referências
Achado do 05-FINANCEIRO (2026-07-21) — ponto cego confirmado na prática, não hipótese. Caso real
motivador: `ped-1251` (20-07-26). `lib/mercadopago.ts` (`criarCobrancaPix`).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - Confirmado que a tabela `jsgrafica_mercadopago_falhas_cobranca` (criada pelo 02-DADOS na
    demanda 221) bate exatamente com o schema proposto: `id`, `created_at`, `data_dia`, `origem`
    (check `pedidos`/`mercadopago_cobranca`), `pedido_id`, `venda_id`, `telefone`, `valor`,
    `erro_mensagem`, `tempo_decorrido_ms`, `payload_tentativa` (jsonb). RLS travada, sem policy —
    só `service_role` (mesmo padrão de sempre).
  - Criada `registrarFalhaCobrancaPix` em `lib/supabase-admin.ts` — grava o registro; se a
    própria gravação falhar, cai num `console.error` (perda aceitável: só o rastro de auditoria
    se perde, nunca a venda). `criarCobrancaPix` (`lib/mercadopago.ts`) continua sem nenhuma
    dependência do Supabase, como pedido — quem grava é o caller.
  - Ponto de chamada 1 — `app/api/pedidos/route.ts`: adicionado `registrarFalhaCobrancaPix` dentro
    do `catch` já existente em torno de `criarCobrancaPix`. Detalhe importante: esse mesmo catch
    também cobre uma falha posterior de vínculo no banco (`erroVinculo`) — ou seja, se a cobrança
    for criada com sucesso no Mercado Pago mas o `update` do pedido falhar, isso TAMBÉM vira um
    registro de falha (mesmo a cobrança tendo sido criada de verdade, order MP órfã). Decisão:
    manter assim — é um caso real e útil de capturar, não um bug.
  - Ponto de chamada 2 — `app/api/mercadopago/cobranca/route.ts`: precisou de um try/catch NOVO,
    dedicado, só em volta da chamada de `criarCobrancaPix` — a rota inteira já vivia dentro de um
    try/catch único, e as variáveis (`valor`, `vendaId`, `pedidoId`, `telefone`) declaradas dentro
    do `try` não ficavam visíveis no `catch` geral (escopo de bloco do JS). O catch geral da rota
    continua intacto, cobrindo os outros modos de falha de sempre. Resposta pro atendente não
    mudou em nenhum dos dois pontos.
  - Criado `scripts/spike-220-teste-falha-cobranca.ts` (mesmo padrão do spike da 203) — script de
    teste isolado, decidido manter no repo (não é descartável, serve pra reteste futuro).
- Testes realizados e resultado:
  - `npx tsc --noEmit` e `npm run build` passaram limpos de primeira.
  - Teste ponta a ponta com falha REAL (não mock): chamada de `criarCobrancaPix` com `valor: 0` —
    o Mercado Pago rejeita de verdade com `400 invalid_total_amount` (não existe cobrança de
    R$0,00, zero risco de dinheiro real). Confirmado que o erro foi capturado e que
    `registrarFalhaCobrancaPix` gravou a linha corretamente na tabela (conferido via SQL direto).
  - Deploy em produção: `dpl_HKqvcxavdpywS3EEYQ3qzSn223au`, alias confirmado em
    `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
- Achados fora do escopo:
  - Assimetria pequena entre os 2 pontos de chamada: em `pedidos/route.ts` uma falha de vínculo
    pós-cobrança também gera registro de falha (achado útil); em `mercadopago/cobranca/route.ts`
    o `erroVinculo` equivalente sobe pro catch GERAL da rota, sem passar por
    `registrarFalhaCobrancaPix`. Não corrigido agora (fora do escopo desta demanda) — se for
    importante equalizar, precisa de demanda própria.
- Status final: concluída, testada e em produção.
