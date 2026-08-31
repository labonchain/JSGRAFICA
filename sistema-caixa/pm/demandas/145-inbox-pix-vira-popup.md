# 145 — Inbox: código Pix vira popup (igual balcão), em vez de só rascunho de mensagem

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto
A Fase 3 (demanda 141) gera a cobrança Pix no Inbox e coloca o copia-e-cola dentro de um
rascunho de mensagem (caixa de resposta da conversa) — funciona, mas o Edvam achou confuso (não
viu, achou que não tinha gerado nada) e prefere consistência com o balcão: uma tela/popup que
mostra o código, o atendente copia e manda pro cliente manualmente. Decisão registrada
(2026-07-09): "podemos colocar envio automático depois, mas podemos começar assim [manual]."

## Objetivo
Ao confirmar um pedido do Inbox com Pix escolhido, abre um popup mostrando QR/copia-e-cola
(mesmo visual do balcão, demanda 141), com botão de copiar — o atendente copia e cola na
conversa manualmente. O rascunho de mensagem automático deixa de incluir o trecho de Pix (ou
continua como fallback, a critério do executor — documentar a decisão).

## Escopo
- Incluído:
  1. `components/TelaInbox.tsx`: depois de confirmar pedido com Pix, mostrar um modal com QR
     code + copia-e-cola + botão "Copiar código" — reaproveitar o componente/estilo já criado
     pro balcão na 141 (não duplicar do zero).
  2. Não mexer na geração da cobrança em si (141) — só a apresentação.
  3. Definir e documentar: o rascunho de mensagem automático continua sendo criado (como
     fallback/histórico) ou só o popup passa a existir? Registrar a decisão no relato.
- Fora de escopo: envio automático da mensagem (fica pra depois, decisão já registrada). Qualquer
  mudança na Fase 4/5.

## Critérios de aceite
- [ ] Popup com QR/copia-e-cola aparece ao confirmar pedido Pix no Inbox
- [ ] Botão de copiar funciona
- [ ] Visual consistente com o popup do balcão
- [ ] Decisão sobre o rascunho automático documentada e implementada

## Referências
Demanda 141 (geração da cobrança + popup original do balcão, reaproveitar visual). Esta conversa
(2026-07-09) — feedback do Edvam testando ao vivo.

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_5XTKSzhHUM8wnNhK5UyZMaMExJb4`
(junto com a 146), verificado em produção.

### O que foi feito
1. **Componente compartilhado `components/ModalQrPix.tsx` (novo):** o modal de QR da 141 vivia
   DUPLICADO nos 2 balcões — foi extraído pra um componente único (visual idêntico: QR, copia-e-cola,
   "📋 Copiar código", "Aguardando pagamento..." com poll de 5s no endpoint da 141, estados
   pago/erro, botões da 142). Props: `onCancelarVenda` opcional (só balcões — Inbox não tem esse
   conceito) e `textoErro` opcional (o texto âmbar padrão fala da aba Pedidos; o Inbox passa um
   que aponta pro rascunho). Os 2 balcões foram refatorados pra usá-lo — zero duplicação nova.
2. **API `POST /api/pedidos` (branch Inbox):** quando a cobrança Pix real é criada, a resposta
   agora traz `cobrancaPix: {orderId, qrCode, qrCodeBase64, valor}`. Se a criação FALHAR e o Pix
   tiver sido escolha explícita, volta `{erro: true, valor}` (popup âmbar avisando que o rascunho
   saiu com a chave estática). Geração da cobrança em si (141): intocada.
3. **`components/TelaInbox.tsx`:** ao confirmar pedido, se a resposta trouxer `cobrancaPix`, abre
   o ModalQrPix — o atendente copia e cola na conversa manualmente (decisão registrada de
   2026-07-09: envio manual por ora).

### Decisão documentada: o rascunho automático CONTINUA (fallback/histórico)
A mensagem de confirmação + trecho de Pix continua sendo gravada como rascunho exatamente igual
(zero mudança em `lib/pedidos.ts` — regressão da 124/141 intacta, verificado por SQL nos
rascunhos gerados). Racional: (1) se o atendente fechar o popup sem copiar, nada se perde;
(2) o rascunho já é a mensagem pronta pro cliente — o popup resolve a visibilidade, o rascunho
continua sendo o caminho completo; (3) mexer no texto da mensagem seria risco de regressão sem
ganho. O popup aparece sempre que uma cobrança real é criada — tanto na escolha explícita de Pix
quanto no fallback legado (pre_producao sem escolha), porque o problema de visibilidade é o mesmo.
Popup de ERRO só na escolha explícita (no fallback legado, falha silenciosa continua caindo na
chave estática do rascunho, comportamento de sempre).

### Testes (sandbox, tudo limpo depois)
- **API local:** Pix explícito → `cobrancaPix` completo na resposta (QR base64 presente);
  regressão 124 (pre_producao sem escolha) → cobrança idêntica + resposta com popup; dinheiro
  explícito → sem cobrança, sem popup. Rascunhos conferidos por SQL: idênticos ao comportamento
  anterior nos 3 casos (copia-e-cola nos 2 primeiros, sem Pix no terceiro).
- **UI local (Playwright):** pedido Pix real na conversa do Edvan Filho → popup com QR, botão
  copiar funcionando (clipboard verificado: payload `000201...` válido), SEM botão "Cancelar
  venda", Fechar ok; regressão balcão pós-refatoração → mesmo modal, "Cancelar venda" da 142
  cancelando de verdade no banco.
- **Produção (admin.jsgrafica.site):** pedido Pix real no Inbox → popup com QR/copiar (screenshot).
- Limpeza: 5 pedidos de teste + rascunhos (só os da janela de teste) apagados, 5 orders sandbox
  canceladas. `ped-0592` (teste ao vivo do próprio Edvam, 21:28) identificado e NÃO tocado.

### Critérios de aceite
- [x] Popup com QR/copia-e-cola ao confirmar pedido Pix no Inbox
- [x] Botão de copiar funciona (clipboard verificado)
- [x] Visual consistente com o balcão (é literalmente o mesmo componente agora)
- [x] Decisão sobre o rascunho documentada (continua, como fallback/histórico) e implementada
