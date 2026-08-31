# 072 — Aviso de pagamento pendente: só quando exige Pix + virar modal do sistema

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Testado ao vivo pelo Edvam na rodada de testes: o popup da demanda 069 apareceu ao marcar
"Entregue" um pedido **sem Pix obrigatório** (`XEROX COLORIDA A4`, `pagamento_tipo: flexivel`) —
confirmado por print. Isso está errado: `confirmarEntregaSePendente()`
(`components/TelaPedidos.tsx:92-97`) só checa `pagamento_confirmado`, sem olhar
`pagamento_tipo`. Pra produto flexível (paga na hora — dinheiro/cartão na retirada), o pagamento
só acontece exatamente na entrega — não existe "confirmar antes" de verdade, e não existe hoje
nenhum botão pra marcar isso como pago antes de entregar. Resultado: o aviso vai aparecer em
**todo** pedido do Inbox marcado como entregue, sempre, virando ruído em vez de alerta útil.

O aviso só faz sentido pra pedido que **exige Pix antecipado** (`pagamento_tipo: pre_producao`)
e ainda não foi confirmado — esse é o caso real de risco (cliente pode retirar sem ter pago).

Segundo ponto, também do print do Edvam: o popup é o `confirm()` nativo do navegador (caixinha
preta, canto superior, letra pequena) — pediu pra virar um modal no estilo do sistema, centralizado
na tela, com letra maior.

## Objetivo
Aviso de pagamento pendente só aparece quando o pedido realmente exige Pix antecipado e ainda não
foi pago — e tem a cara do resto do sistema, não a caixinha padrão do navegador.

## Escopo
- Incluído:
  1. Em `confirmarEntregaSePendente()` (`components/TelaPedidos.tsx`), só disparar a confirmação
     quando `pagamento_tipo === "pre_producao"` **e** `!pagamento_confirmado` — não pra todo
     pedido não confirmado. Ajustar a assinatura da função pra receber `pagamentoTipo` também
     (hoje só recebe `status` e `pagamentoConfirmado`).
  2. Trocar o `confirm()` nativo por um modal no estilo do sistema (reaproveitar o padrão visual já
     usado no modal de "Finalizar Venda" da demanda 066) — centralizado na tela, fonte maior,
     botões "Confirmar"/"Cancelar" com a mesma cara dos outros botões do app. Como modal customizado
     não é síncrono feito o `confirm()`, vai precisar reestruturar os 3 pontos que chamam essa
     função (`PainelDetalhe`, `CardFila`, `PainelDetalheVenda`) pra abrir o modal e só executar a
     mudança de status se o usuário confirmar (guardar a ação pendente em estado, executar no
     "Confirmar" do modal).
- Fora de escopo: mudar o texto do aviso em si, além do necessário pra caber no novo modal.

## Critérios de aceite
- [ ] Marcar "Entregue" um pedido flexível (sem Pix) não mostra nenhum aviso
- [ ] Marcar "Entregue" um pedido com Pix obrigatório e pagamento não confirmado mostra o modal
      novo (não o `confirm()` do navegador)
- [ ] Modal aparece centralizado, com o visual do resto do sistema, letra maior
- [ ] Testado com pelo menos 1 pedido de cada tipo (flexível e pré-produção não pago)

## Riscos e cuidados
Nenhum específico — é reduzir o alcance de uma checagem existente + trocar a aparência de um
popup, sem mudar a lógica de status em si.

## Referências
`components/TelaPedidos.tsx` (`confirmarEntregaSePendente`, linhas 89-97, e os 3 pontos que a
chamam). Demanda 069 (implementação original). Demanda 066 (modal de referência visual).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. `confirmarEntregaSePendente()` virou `precisaConfirmarPagamento(status, pagamentoTipo,
     pagamentoConfirmado)` — predicado puro, sem `confirm()` dentro (o modal novo não é síncrono).
     Só retorna `true` quando `status === "entregue" && pagamentoTipo === "pre_producao" &&
     !pagamentoConfirmado` — produto flexível/pós-produção não dispara mais nada.
  2. Novo componente `ModalConfirmarPagamento` (mesmo padrão visual do modal "Finalizar Venda" da
     066: `rounded-2xl shadow-2xl p-7 w-96`, centralizado, botões "Cancelar"/"Confirmar").
  3. Os 3 pontos que avançavam status pra "entregue" (`PainelDetalhe`, `CardFila`,
     `PainelDetalheVenda`) foram reestruturados: `avancarPara`/`avancarItem` deixaram de ser
     `async` diretos — agora só checam `precisaConfirmarPagamento()` e, se `true`, guardam a ação
     pendente em estado (`acaoPendente`) e abrem o modal; a mudança de status de fato
     (`executarAvanco`) só roda no "Confirmar" do modal. Cada componente guarda seu próprio
     `acaoPendente` (padrão já usado no arquivo pra `salvando`/`salvandoId`, não introduzi estado
     compartilhado novo).
- Testes realizados e resultado:
  Criados 2 pedidos de teste reais via SQL (`status: pronto`): 1 flexível
  (`pagamento_tipo: flexivel`) e 1 com Pix obrigatório pendente (`pagamento_tipo: pre_producao`,
  `pagamento_confirmado: false`). Playwright local com listener de `dialog` do navegador (pra
  garantir que o `confirm()` nativo não dispara mais):
  - Pedido flexível → "Entregue (levou agora)": nenhum modal apareceu (nem o novo, nem o nativo),
    status foi direto pra "Entregue".
  - Pedido com Pix pendente → "Entregue (levou agora)": modal novo apareceu (confirmado por
    screenshot — centralizado, título "Pagamento pendente", texto maior, botões no padrão do
    app), nenhum `confirm()` nativo disparou. Testado "Cancelar" (pedido continuou em "Pronto",
    nada gravado) e "Confirmar" (status virou "Entregue" de verdade).
  `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy. Deploy em produção:
  `npx vercel --prod --yes` → `dpl_EcesytYmcxan3gbPQo6dq9ngQ8xB`. Registros de teste apagados do
  Supabase depois da rodada.
- Achados fora do escopo: nenhum.
- Status final: concluída.
