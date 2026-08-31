# 147 — Recarga VEM/Celular com Pix mostra QR/chave do RecargaPay, não do Mercado Pago

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto
A Fase 3 (demanda 141) generalizou a geração de cobrança Pix (Mercado Pago) pra qualquer produto
com Pix escolhido — mas pra **Recarga VEM** e **Recarga Celular** (categorias `Recarga vem` e
`Recarga celular`, confirmado nos produtos: prod-004/005/076-100), isso está errado: o dinheiro
da recarga precisa entrar no **RecargaPay** (conta usada de verdade pra fazer as recargas), não
no Mercado Pago. Gerar cobrança MP pra esses produtos suja o saldo do MP com dinheiro que nunca
deveria estar lá.

O RecargaPay não tem API (confirmado, pesquisa + inspeção do link de cobrança que o Edvam usa —
é só uma tela de pagamento Pix pontual, sem menção a integração). O pagamento é sempre: **chave
Pix estática** (CNPJ da sócia Zuzeide, `39.148.916/0001-29`), **cliente digita o valor no próprio
banco**, **confirmação manual pela equipe** — não muda, nunca vai ter confirmação automática
aqui.

Desenho acordado com o Edvam (2026-07-10):
- **Balcão**: mostra um QR code, visualmente igual ao popup do Mercado Pago (141) — mas **sempre
  o mesmo QR** (estático, gerado 1 vez a partir da chave fixa), não um novo por venda.
  **Confirmação manual continua sendo o único caminho** — o botão de "Copiar código"/QR fica ali
  só pra facilitar mostrar pro cliente, sem gerar cobrança nenhuma via API.
- **Inbox**: mostra a chave Pix pra copiar, no MESMO popup criado na demanda 145 (reaproveitar o
  componente, não duplicar) — só que com a chave estática do RecargaPay em vez do copia-e-cola
  dinâmico do MP.

## Objetivo
Recarga VEM/Celular com Pix escolhido nunca gera cobrança no Mercado Pago — mostra sempre o
mesmo QR/chave do RecargaPay, nos 2 canais, reaproveitando os popups já construídos (141/145).

## Escopo
- Incluído:
  1. Gerar (ou receber do Edvam, se ele preferir fornecer a imagem já pronta) o QR code estático
     da chave Pix `39.148.916/0001-29` uma única vez, guardado em `jsgrafica_agent_config` ou
     tabela equivalente (novo campo, ex. `chave_pix_recargapay`/`qr_recargapay_base64`).
  2. No gatilho de cobrança generalizado (141, `app/api/pedidos/route.ts` e
     `app/api/mercadopago/cobranca`): se o produto for da categoria `Recarga vem` ou
     `Recarga celular` **E** a forma de pagamento escolhida for Pix, **não chamar
     `criarCobrancaPix`** — usar o QR/chave estática do RecargaPay em vez disso.
  3. Balcão: popup mostra o QR estático + "Aguardando confirmação manual" (sem poll — não tem
     API pra checar sozinho) + botão pra Admin/atendente marcar "Confirmar pagamento" quando
     verificar no app do RecargaPay.
  4. Inbox: popup (145) mostra a chave/QR estático, atendente copia e manda, confirmação
     continua manual (mesmo fluxo já existente da 113 pra pagamento não-MP).
- Fora de escopo: qualquer automação de confirmação pro RecargaPay (não existe API). Categoria de
  saída pra "transferência pro RecargaPay" (fica pra demanda separada, 148).

## Critérios de aceite
- [ ] Recarga VEM/Celular com Pix nunca gera `mp_order_id`/cobrança no Mercado Pago
- [ ] Balcão mostra QR estático do RecargaPay pra esses produtos, visual igual ao popup do MP
- [ ] Inbox mostra a chave pra copiar no mesmo popup da 145
- [ ] Confirmação continua manual nos 2 canais, sem tentativa de automação
- [ ] Outros produtos (não-recarga) continuam gerando cobrança MP normalmente — sem regressão

## Referências
Esta conversa (2026-07-10) — decisão do Edvam sobre o fluxo. Demanda 141 (gatilho generalizado a
ajustar), 145 (popup do Inbox a reaproveitar). Link de cobrança do RecargaPay usado como
referência visual: fornecido pelo Edvam.

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_Bn5JRTK3cuJ14EsTx3ZyNrDHWN6t`
(junto com a 148), verificado em produção.

### O que foi feito
1. **QR estático gerado 1x** (script próprio, não usa serviço externo): BR Code EMV da chave CNPJ
   `39148916000129`, **sem valor** (cliente digita no banco), txid `***` (padrão de QR estático),
   CRC16-CCITT validado contra vetor de teste conhecido (`123456789` → `29B1`) e contra o próprio
   payload. Payload + PNG base64 (400px) gravados em `jsgrafica_agent_config` (migration
   `add_pix_recargapay_agent_config`: `chave_pix_recargapay`, `titular_pix_recargapay`,
   `pix_recargapay_payload`, `pix_recargapay_qr_base64` — linha ativa id=1). Helpers novos em
   `lib/supabase-admin.ts`: `getPixRecargaPay()`, `idsProdutosRecarga()` e `CATEGORIAS_RECARGA`
   (`Recarga vem`/`Recarga celular` — identificação por categoria do produto, cobre os 27
   produtos de recarga).
2. **Gatilho Inbox** (`POST /api/pedidos`): com Pix escolhido —
   - venda **100% recarga** → NENHUMA chamada ao MP; resposta traz o popup estático
     (`estatico: true` + chave/titular/QR) e o rascunho sai com a **chave do RecargaPay** no
     texto de chave estática (que já pede comprovante — exatamente o fluxo manual; o texto do
     copia-e-cola do MP promete confirmação automática, por isso não é usado);
   - venda **mista** (recarga + outros) → cobrança MP cobre SÓ os itens não-recarga, com
     **vínculo por id** (`mp_order_id` nunca encosta em item de recarga); a parte de recarga
     segue combinada manualmente (decisão do executor: 2 QRs num popup só confundiria — caso
     raro, documentado);
   - venda sem recarga → comportamento da 141, intocado.
3. **Gatilho balcão** (`POST /api/mercadopago/cobranca`): mesma regra — 100% recarga devolve
   `recargaPay: true` + dados estáticos sem criar order; mista soma/vincula só os não-recarga.
4. **Popup** (`ModalQrPix`, modo `estatico` — mesmo componente da 141/145, não duplicado):
   título "Pagamento Pix — RecargaPay", chave CNPJ + titular visíveis, aviso de que o QR não
   carrega valor, QR + copia-e-cola + copiar, **sem poll** (não tem API), faixa "⏳ Confirmação
   manual — confira no app do RecargaPay", botão verde **"✓ Confirmar pagamento"** (só balcões;
   Inbox segue o fluxo manual da 113, como pedido) + Cancelar venda (142) + Fechar.
5. **Confirmação manual**: `PATCH /api/pedidos` ganhou o modo `confirmarPagamento: true` (por
   vendaId ou id) — grava `pagamento_confirmado`/`_at`/origem `'manual'`/forma sem mexer no
   status (a confirmação da 113 exige transição de status; a venda de recarga do balcão já
   nasce entregue). 404 se nada pendente, ignora cancelados.

### Testes (sandbox + estático, tudo limpo depois)
- API Inbox: recarga+pix → estático, **zero `mp_order_id`**, rascunho com chave/titular RP (SQL);
  não-recarga+pix → MP normal (regressão 141); **mista** → order MP de R$4,50 (não R$14,50) e
  `mp_order_id` SÓ no item não-recarga (SQL); fallback 124 (pre_producao sem escolha) → idêntico;
  recarga+dinheiro → nada.
- API balcão: venda 100% recarga → `recargaPay: true` com valor/chave/QR certos; PATCH
  `confirmarPagamento` → 2 pedidos confirmados origem manual, status intocado; repetir → 404.
- UI local (Playwright): balcão → popup estático completo (screenshot), sem spinner de
  "aguardando", "✓ Confirmar pagamento" com confirm() gravando no banco; Inbox → mesmo popup SEM
  o botão de confirmar e SEM "Cancelar venda".
- Produção (pdv.jsgrafica.site): venda recarga Pix real → popup estático (screenshot) →
  "Cancelar venda" limpou tudo (pedido cancelado + saída automática de repasse revertida).
- Limpeza total: 10 pedidos sintéticos + rascunhos apagados, 3 orders sandbox canceladas, e a
  **saída automática de repasse (R$7,50)** que o teste de UI gerou no caixa real foi removida.

### Critérios de aceite
- [x] Recarga VEM/Celular com Pix nunca gera `mp_order_id`/cobrança MP (verificado por SQL,
      inclusive no caso misto)
- [x] Balcão mostra QR estático do RecargaPay, visual igual ao popup do MP (mesmo componente)
- [x] Inbox mostra a chave pra copiar no mesmo popup da 145
- [x] Confirmação manual nos 2 canais (botão no balcão grava origem 'manual'; Inbox via 113)
- [x] Produtos não-recarga seguem gerando cobrança MP normalmente (regressões 141 e 124 testadas)
