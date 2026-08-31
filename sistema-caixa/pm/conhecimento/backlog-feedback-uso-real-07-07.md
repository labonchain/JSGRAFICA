# Backlog — feedback do Edvam/Zu/Gabi usando o sistema ao vivo (2026-07-07, noite)

Depois do deploy do pacote 095-105 (reestruturação do Financeiro) e da 098 (Entradas), Zu e
Gabi testaram o sistema de verdade e o Edvam relatou uma lista grande de pontos. Organizado
abaixo por tipo, **nada foi implementado ainda** — isso é só o mapa, pra decidir prioridade
antes de virar demanda.

## 🔴 Correção urgente (erro do PM, já em produção)
1. **Entradas e Financeiro/Relatórios devem ser filtrados por operador no PDV** — Zu/Gabi só
   veem o próprio movimento (entradas, e no Financeiro/Relatórios só ranking de produtos e
   clientes que ela mesma atendeu), nunca o total geral. Hoje (098) está mostrando tudo pra
   todo mundo — decisão errada do PM, corrigida aqui. Financeiro (demanda 075, já existia antes
   desta sessão) tem o mesmo problema, nunca foi filtrado por operador no PDV.

## 🔴 Bugs reais (algo quebrado, não é feature nova)
2. **Inbox demorando pra carregar.**
3. **Mensagens do Inbox "atrasadas"/desalinhadas com o WhatsApp Web real** durante o
   atendimento — precisa investigar se é delay de sincronização ou perda de mensagem.
4. **Campo de data em "Entradas" não abre o calendário** ao clicar.
5. **Bot da Celpe (2ª via de conta via WhatsApp) — algumas mensagens não aparecem no Inbox**,
   time está usando WhatsApp Web direto por causa disso. Mesma família de problema já visto em
   outras demandas de log (001/011/037) — precisa investigar se é o mesmo tipo de mensagem
   (automatizada, formato diferente) escapando do pipeline de log.

## 🆕 Features que não existem hoje
6. **Cancelar pedido** — não existe em NENHUM lugar: Inbox (conversa), Fila de impressão, aba
   Pedidos, nem Financeiro. Confirma e amplia o gap já registrado antes (ver `STATUS.md`,
   "cancelamento de venda concluída" — decisão já tomada: cancelamento tira da soma total).
   Precisa decidir: 1 mecanismo central reaproveitado nas 4 telas, ou 4 botões separados que
   chamam a mesma função.
7. **Forma de pagamento + confirmação de pagamento no pedido feito pelo Inbox** — hoje só tem a
   timeline de status (confirmado → produção → pronto → aguardando retirada → entregue), sem
   nada de pagamento (diferente do Balcão, que já tem isso desde a 066).
8. **Fluxo de pagamento na retirada** (pedido feito no Inbox, cliente paga só quando retira):
   se pagar na hora do pedido (Pix, ex.), resolve ali; se for pagar na retirada (Pix/cartão/
   dinheiro presencial), o pedido fica sinalizado "pagamento pendente/a receber" até a entrega,
   e ao entregar, alguém dá entrada informando a forma de pagamento usada.
9. **Atendimento automático ao abrir conversa** + **histórico de quem assumiu as últimas 3-5
   conversas** — pra saber quem estava atendendo antes de alguém abrir sem querer (ex.: Zu
   clica sem querer numa conversa que o Edvam estava atendendo).
10. Renomear "Financeiro" pra **"Relatórios"** no submenu do PDV (rótulo, sem mudança de
    função).

## 🎨 Redesenho de tela (o que existe, mas o layout incomoda no uso real)
11. **Inbox**: tirar o painel de informações do contato, focar em pedidos — mais espaço pra
    tudo caber sem ficar apertado.
12. **Tela Clientes**: inverter o lado — painel de detalhe do contato na DIREITA, lista de
    contatos (lista ou grade) no centro/esquerda.
13. **Pedidos Balcão**: dividir a tela metade categorias / metade carrinho. Contexto real:
    atendimento usa monitor de 15", as duas atendentes usam óculos — letra/elemento pequeno
    demais atrapalha.

## Observação à parte
**Fechar Caixa**: "tá ok aparentemente" — sem problema relatado.
**Abertura de hoje da Zu**: valores 1/1 são só pra destravar, precisa corrigir pro valor físico
real depois (não é urgente, mas não esquecer antes do fechamento de hoje).
