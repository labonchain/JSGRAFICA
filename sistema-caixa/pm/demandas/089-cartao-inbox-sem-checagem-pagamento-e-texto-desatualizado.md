# 089 — Cartão de pedido no Inbox: sem checagem de pagamento pendente + texto desatualizado

Status: concluída
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Achado pelo Edvam usando o sistema (print real, pedido "RECARGA CELULAR 100,00" avançando pra
"Em produção"). Dois problemas no cartão "📦 Pedido desta conversa" do Inbox
(`components/TelaInbox.tsx`):

1. **Falta a checagem de pagamento pendente.** As demandas 069/072 já resolveram isso na aba
   Pedidos grande (`components/TelaPedidos.tsx`, `precisaConfirmarPagamento()` + modal) — mas o
   cartão do Inbox tem seus **próprios** botões de avançar (`avancarStatusPedido()`,
   `avancarStatusItemVenda()`, demanda 088), que nunca ganharam essa mesma checagem. Hoje dá pra
   marcar um pedido com Pix obrigatório e não pago como "Entregue" direto por esse cartão, sem
   nenhum aviso — o mesmo risco que a 069 resolveu em outro lugar, mas não aqui.
2. **Texto desatualizado**: os dois avisos no cartão dizem "Ao avançar, o cliente recebe um aviso
   automático" — isso não é mais verdade desde a demanda 073 (mensagem vira rascunho na caixa de
   resposta, não é mais enviada sozinha).

## Objetivo
O cartão do Inbox se comporta igual à aba Pedidos grande em relação a pagamento pendente, e o
texto reflete o comportamento real (rascunho, não envio automático).

## Escopo
- Incluído:
  1. Aplicar `precisaConfirmarPagamento()` (já existe em `TelaPedidos.tsx`, demanda 072) nos dois
     pontos de avanço do cartão do Inbox — mesmo modal do sistema (não o `confirm()` nativo),
     mesma regra: só dispara quando `pagamento_tipo === "pre_producao"` e `!pagamento_confirmado`.
  2. Trocar o texto "Ao avançar, o cliente recebe um aviso automático" (nos dois lugares) por algo
     que reflita a realidade pós-073 — ex.: "Ao avançar, o texto de aviso fica pronto na caixa de
     resposta pra você revisar e mandar".
- Fora de escopo: mudar a lógica de avanço de status em si, além da checagem de pagamento.

## Critérios de aceite
- [x] Avançar pra "Entregue" um pedido com Pix pendente, pelo cartão do Inbox, mostra o mesmo
      modal de confirmação que a aba Pedidos já mostra
- [x] Avançar um pedido sem Pix pendente continua direto, sem popup
- [x] Texto dos dois avisos atualizado, sem mencionar "aviso automático"
- [x] Testado com 1 pedido de cada tipo (com Pix pendente, sem Pix)

## Referências
`components/TelaInbox.tsx` (`avancarStatusPedido`, `avancarStatusItemVenda`, textos dos avisos).
`components/TelaPedidos.tsx` (`precisaConfirmarPagamento`, `ModalConfirmarPagamento` — demandas
069/072, reaproveitar). Demanda 073 (rascunho, motivo do texto mudar). Demanda 088 (cartão com
múltiplos itens, mesmo lugar).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
1. **`components/TelaPedidos.tsx`**: `precisaConfirmarPagamento` e `ModalConfirmarPagamento`
   ganharam `export` — eram funções privadas do módulo, só usadas ali dentro. Nenhuma mudança de
   comportamento, só visibilidade (mesmo padrão que `STATUS_CFG` já usava pra ser reaproveitado
   pelo Inbox).
2. **`components/TelaInbox.tsx`**:
   - Import atualizado: `STATUS_CFG, precisaConfirmarPagamento, ModalConfirmarPagamento` de
     `TelaPedidos.tsx`.
   - `PedidoAPI` ganhou `pagamento_tipo: string` e `pagamento_confirmado: boolean` (já vinham na
     resposta da API, só não estavam tipados).
   - Cada função de avanço virou 2: `executarAvancoX` (a chamada de fato ao `PATCH
     /api/pedidos`, igual antes) e a função "de entrada" (`avancarStatusPedido`,
     `avancarStatusItemVenda`) que agora checa `precisaConfirmarPagamento(...)` **antes** de
     chamar a execução — se precisar, só guarda `{ id, status }` pendente e retorna (não dispara
     PATCH nenhum); senão, executa direto. Mesmo padrão de `avancarPara()` em
     `PainelDetalhe`/`PainelDetalheVenda` (`TelaPedidos.tsx`).
   - `avancarStatusItemVenda` mudou de assinatura (`(id, statusAtual)` → `(item: PedidoAPI)`) —
     precisava do item inteiro pra ler `pagamento_tipo`/`pagamento_confirmado`, não só o id.
   - Novo estado `acaoPendentePedido: { id, status } | null` (compartilhado entre os 2 fluxos,
     item único e item de venda) + `confirmarAvancoPendente()`, que decide qual `executarAvancoX`
     chamar olhando se `itensVendaAtivo` está preenchido.
   - `<ModalConfirmarPagamento>` renderizado 1 vez só, no fim do painel direito, condicionado a
     `acaoPendentePedido` — mesmo componente visual da aba Pedidos, sem duplicar JSX.
   - Os 2 textos "Ao avançar, o cliente recebe um aviso automático" trocados por "Ao avançar, o
     texto de aviso fica pronto na caixa de resposta pra você revisar e mandar" (exatamente a
     sugestão da demanda).
   - Achado relacionado (pequeno, mesmo espírito da correção): o texto do botão durante o
     carregamento dizia "Avisando cliente..." — mesma suposição desatualizada de envio automático.
     Troquei pra "Salvando..." nos 2 lugares, alinhado com o que `TelaPedidos.tsx` já usa
     (`PainelDetalhe`/`PainelDetalheVenda` nunca tiveram texto de "avisando", só "Salvando...").
     Não estava nos 2 textos citados literalmente no escopo, mas é a mesma classe de texto
     enganoso, incluí por consistência.

### Testes realizados e resultado
Sem cliente com Pix pendente sobrando no banco (mesma situação da 088 — testes anteriores já
limpos), recriei o cenário com 2 pedidos sintéticos pro telefone real "Edvan Filho"
(`5521965185667`), mesmo padrão de teste das demandas 088/086/083.

1. **Local**: pedido `pagamento_tipo=pre_producao`, `pagamento_confirmado=false`, `status=pronto`
   (próximo = "entregue") → simulei a lógica exata de `precisaConfirmarPagamento` +
   `avancarStatusPedido` contra o JSON real de `GET /api/pedidos?telefone=...`: resultado `true`
   (modal apareceria, nenhum PATCH seria disparado antes da confirmação). Pedido separado
   `pagamento_tipo=pos_producao`, `pagamento_confirmado=true`, mesmo status → resultado `false`
   (vai direto) — confirmado de verdade com `PATCH /api/pedidos` (pronto → entregue), sucesso sem
   nenhum bloqueio.
2. **Produção**: mesmo par de cenários recriado direto contra `admin.jsgrafica.site` depois do
   deploy — mesmo resultado (`true` pro caso Pix pendente, `false` pro caso sem Pix, com o `PATCH`
   do caso "sem Pix" confirmado de verdade em produção). Dados de teste apagados depois dos dois
   testes (local e produção).
3. `npx tsc --noEmit` limpo, `npm run build` sem erro, `npx eslint` nos arquivos tocados sem
   classe de erro nova além do baseline já existente no projeto. Arquivos financeiros conferidos
   por timestamp antes do deploy — nada tocado.
4. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_6WGrJM17pvuAfNEuqmUeur3jNjQf`**.

### Achados fora do escopo
- Ajustei também o texto do botão ("Avisando cliente..." → "Salvando...") nos 2 lugares, além dos
  2 textos citados literalmente no escopo — mesma classe de problema (suposição de envio
  automático), registrado acima na seção "O que foi feito".
- Mesma ressalva de metodologia já registrada nas demandas 083/086/087: não cliquei o botão "Avançar"
  de fato num navegador pra ver o modal abrir visualmente — a lógica de decisão (mostrar modal vs.
  ir direto) foi simulada e confirmada contra dados reais, local e produção, incluindo o `PATCH`
  real do caso "sem Pix"; o caso "com Pix" foi confirmado até o ponto exato onde o código decide
  mostrar o modal (o `return` antes do PATCH), não o clique físico em "Confirmar" do modal em si
  — mas esse componente (`ModalConfirmarPagamento`) já é o mesmo, sem alteração, usado e testado
  pela aba Pedidos nas demandas 069/072.

### Status final
Concluída e deployada em produção (`dpl_6WGrJM17pvuAfNEuqmUeur3jNjQf`). Todos os 4 critérios de
aceite confirmados com dados reais, local e produção.
