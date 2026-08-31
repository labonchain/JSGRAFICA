# 301 - Rota de cobrança do balcão não valida pedido/venda cancelada

Status: concluída
Criada em: 2026-08-17
Aprovada em: 2026-08-17
Concluída em: 2026-08-17
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado pelo 03-APP durante a demanda 300 (retry de Pix pós-correção de telefone), ao decidir se
reaproveitava `app/api/mercadopago/cobranca/route.ts` (rota de cobrança Pix do balcão) pro
mecanismo novo. Não reaproveitou (motivo documentado na 300), mas encontrou, lendo o código, que
essa rota **não valida `status !== 'cancelado'`** antes de gerar uma cobrança Pix real. Hoje, se
alguém chamar essa rota de novo depois de uma venda já ter sido cancelada, o sistema geraria um
Pix de verdade pra uma venda que não deveria mais existir.

Sem evidência de isso já ter acontecido de verdade (achado por leitura de código, não por
incidente real), mas é uma lacuna real de validação, no mesmo espírito da checagem que
`app/api/pedidos/route.ts` já faz e a demanda 300 replicou na rota nova.

## Objetivo
`POST /api/mercadopago/cobranca` recusa gerar cobrança pra venda/pedido já cancelado, mesmo padrão
de validação que já existe em `app/api/pedidos/route.ts` e na rota nova da demanda 300.

## Escopo
- Incluído: adicionar a checagem `status !== 'cancelado'` (ou equivalente pro conjunto de
  pedidos/venda) antes de chamar `criarCobrancaPix` nesta rota.
- Incluído: testar que uma venda cancelada não consegue mais gerar Pix depois da correção (caso
  sintético, não precisa de venda real).
- Explicitamente fora de escopo: qualquer outra revisão de validação desta rota além deste ponto
  específico.

## Critérios de aceite
- [x] `POST /api/mercadopago/cobranca` recusa gerar cobrança quando o pedido/venda está cancelado
- [x] Testado com caso sintético confirmando a rejeição

## Riscos e cuidados
Baixo risco, mudança pequena e isolada. Cuidado só de não quebrar o caminho normal (venda ativa
continua gerando Pix normalmente).

## Referências
Demanda 300 (achado original, relato "Achados fora do escopo"). `app/api/pedidos/route.ts` e
`app/api/pedidos/retentar-pix/route.ts` (mesmo padrão de validação já usado, reaproveitar).

## Relato de execução

### O que foi feito
`app/api/mercadopago/cobranca/route.ts`: nova checagem logo após o "não encontrado" e antes das
validações de forma/pagamento já existentes — `pedidos.some(p => p.status === 'cancelado')`
rejeita com 400 antes de chegar em `criarCobrancaPix`. `.some()` (não `.every()`) de propósito:
1 item cancelado já é motivo pra recusar a cobrança inteira, mesmo numa venda com múltiplos itens
— cancelar uma venda cancela todos os itens juntos no fluxo normal (PATCH `/api/pedidos`), então
"algum cancelado" já é sinal forte o bastante. `status` já vinha no `.select()` da rota, não
precisou mudar a query.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- 2 pedidos sintéticos (R$ 0,01, telefone de teste): um `status: 'cancelado'` e um `status:
  'confirmado'`, ambos com Pix escolhido. Chamado `POST /api/mercadopago/cobranca` pros dois:
  o cancelado voltou `{"error":"Este pedido/venda está cancelado"}` (400, sem chegar a chamar o
  Mercado Pago); o ativo gerou cobrança Pix real normalmente (`orderId` válido, QR/copia-e-cola),
  confirmando que o caminho normal não quebrou. Pedidos de teste apagados depois.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo.

### Status final: concluída
