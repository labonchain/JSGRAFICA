# 146 — Balcão: "retira depois" precisa vincular a um cliente

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam apontou (2026-07-09): hoje uma venda de balcão marcada "Paga na retirada"/"Retira depois"
não exige vincular a um cliente — fica sem nome/telefone associado. Quando o cliente voltar pra
buscar e/ou pagar, não tem como saber de quem é o pedido em aberto só olhando a lista.

## Objetivo
Venda de balcão marcada como "retira depois" exige (ou pelo menos oferece de forma destacada) um
cliente vinculado — nome e/ou telefone — pra identificar o dono do pedido em aberto depois.

## Escopo
- Incluído:
  1. No modal "Finalizar venda" dos 2 balcões, quando "Não, vai buscar depois" for escolhido,
     exigir (ou pedir com destaque, a decidir com o executor qual grau de obrigatoriedade faz
     sentido sem travar o operador numa correria) nome e/ou telefone do cliente.
  2. Gravar esse vínculo em `jsgrafica_pedidos` (campo já existe, `nome_cliente`/`telefone` — ou
     buscar/criar contato em `jsgrafica_contatos` se fizer sentido, a critério do executor).
  3. Exibir esse nome/telefone claramente na lista de pedidos aguardando retirada, pra facilitar
     identificar de quem é cada um.
- Fora de escopo: qualquer mudança na Fase 3 (cobrança Pix) ou Fase 4/5.

## Critérios de aceite
- [ ] "Retira depois" no balcão pede nome/telefone do cliente
- [ ] Pedido aguardando retirada mostra claramente de quem é na lista
- [ ] Venda "leva agora" continua sem exigir isso (sem regressão)

## Referências
Esta conversa (2026-07-09) — pedido do Edvam. Demanda 066 (fluxo original "Paga na retirada").

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_5XTKSzhHUM8wnNhK5UyZMaMExJb4`
(junto com a 145), verificado em produção.

### O que foi feito (nos 2 balcões, admin e PDV — mudanças idênticas)
1. **Modal "Finalizar venda":** ao escolher "Não, vai buscar depois":
   - com contato já vinculado (busca que sempre existiu) → caixa verde "👤 Retira: <nome> · <fone>",
     nada a preencher;
   - sem contato → caixa laranja destacada "👤 Quem vai retirar? (obrigatório)" com **Nome do
     cliente (obrigatório)** e **Telefone (opcional)**; o ✓ Confirmar fica desabilitado até ter
     nome ou contato.
   - **Grau de obrigatoriedade (decisão do executor, que a demanda deixou em aberto): nome
     obrigatório, telefone opcional** — digitar um nome leva 2 segundos e não trava a correria;
     sem nome o pedido em aberto é anônimo pra sempre, que é exatamente o problema relatado.
2. **Gravação:** nome digitado → `nome_cliente`; telefone digitado → `telefone` (normalizado pra
   só dígitos). Contato vinculado continua tendo prioridade (comportamento de sempre). Nenhuma
   mudança de API — os campos já existiam no branch de balcão. Sem criação automática em
   `jsgrafica_contatos` (decisão: contato formal continua sendo pela busca; um nome avulso de
   retirada não vira cadastro sujo).
3. **Lista de pedidos (`components/TelaPedidos.tsx`):** helper `nomeDono()` — pedido de balcão
   anônimo do histórico exibia o literal cru `balcao` como "dono"; agora mostra "Balcão (sem
   cliente)". Com a exigência nova, pedido aguardando retirada passa a ter o nome do cliente como
   título do card na lista (o campo já era o título — o problema era ele estar sempre vazio).

### Sem regressão
"Sim, levou agora" não mudou: sem seção nova, confirma sem nome, venda anônima (`telefone:
'balcao'`) como sempre — testado explicitamente.

### Testes
- **UI local (Playwright, admin):** "vai buscar depois" sem contato → seção laranja presente +
  ✓ Confirmar desabilitado (screenshot); preencheu nome+fone → liberou → venda gravada com
  `nome_cliente='Cliente Teste 146'`, `telefone='81912345678'` (só dígitos), status
  `aguardando_retirada` (SQL); filtro "📦 Aguardando retirada" na aba Pedidos mostrando o nome
  como título do card; regressão "levou agora" → sem seção, anônimo normal.
- **Produção (pdv.jsgrafica.site, operador Zu):** modal aberto com a seção obrigatória e o botão
  travado (screenshot) — modal CANCELADO em seguida, nenhum dado criado em produção.
- Limpeza: 2 pedidos sintéticos apagados. Nenhuma order MP envolvida (teste com Dinheiro).

### Critérios de aceite
- [x] "Retira depois" no balcão pede nome/telefone (nome obrigatório, telefone opcional)
- [x] Pedido aguardando retirada mostra claramente de quem é na lista
- [x] Venda "leva agora" continua sem exigir nada (testado, sem regressão)
