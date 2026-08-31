# 189 — "Corrigir forma de pagamento" aparece sempre, mesmo quando já está certo

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 180 criou o botão "✏️ Corrigir forma de pagamento" (visível pro Admin em pedido pago).
Edvam reportou (print, 2026-07-15) confusão real: abriu um pedido com forma de pagamento já
correta (Dinheiro) e o link apareceu do mesmo jeito, parecendo um aviso de que algo está errado
quando não está.

## Objetivo
O link/botão de corrigir forma de pagamento não dá a impressão de que existe um problema quando
não existe.

## Escopo
- Incluído: revisar a apresentação visual do botão da 180 — decisão do executor (ex.: deixar mais
  discreto/neutro visualmente, mover pra dentro de um menu de ações em vez de link solto perto do
  "Pagamento confirmado", ou adicionar um rótulo que deixe claro que é uma ferramenta de correção
  opcional, não um alerta).
- Explicitamente fora de escopo: mudar a lógica de correção em si (já funciona, demanda 180).

## Critérios de aceite
- [ ] Botão de corrigir forma de pagamento não parece um alerta de erro
- [ ] Continua acessível e funcional pro Admin quando precisar corrigir de verdade
- [ ] Testado visualmente (screenshot antes/depois)

## Riscos e cuidados
Nenhum — é só apresentação visual.

## Referências
Demanda 180 (`ModalDetalhe`/botão de correção). Print do Edvam, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_GyM2xKir25rfkKgzRn9DcN3qRwPV`.

### Abordagem escolhida (decisão do executor)
O link deixou de parecer alerta por 3 mudanças de apresentação (zero mudança de lógica):
- **Cor/peso**: azul (`text-blue-500`) → cinza claro (`text-gray-400`), fonte menor (11px) —
  visualmente "ferramenta de rodapé", não chamada de ação.
- **Texto condicional**: "✏️ Corrigir forma de pagamento" → "🔧 Forma registrada errada? Dá pra
  corrigir" — deixa explícito que só serve SE o registro estiver errado.
- **Tooltip**: "Ferramenta do Admin: só se a forma registrada acima estiver errada — a antiga
  fica no histórico, nada se perde".
Mover pra um menu de ações foi descartado: criaria um menu novo só pra 1 item.

### Testes
Screenshot antes (prints da 177/178, link azul) vs depois (cinza discreto abaixo do
"✓ Pagamento confirmado"); funcional intacto: clicar abre o seletor de formas normalmente
(critério 2). Testado em pedido pago sintético, apagado.
