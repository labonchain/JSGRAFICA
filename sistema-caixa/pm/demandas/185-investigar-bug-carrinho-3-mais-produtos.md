# 185 — Investigar bug com 3 ou mais produtos no carrinho do balcão

Status: encerrada — respondida pela demanda 190 (o bug era no card do Atendimento, não no balcão)
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15 (via demanda 190)
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam relatou (2026-07-15, e já tinha reportado antes informalmente) que quando o carrinho do
balcão tem mais de 2 produtos, "dá algum bug" — sem detalhe exato do sintoma. Não investigado
ainda.

## Objetivo
Reproduzir o problema, identificar exatamente o que quebra com 3+ produtos no carrinho, e
corrigir.

## Escopo
- Incluído: reproduzir uma venda de balcão com 3+ produtos diferentes no carrinho (combinações
  variadas: mesma categoria, categorias diferentes, com/sem recarga, com/sem contato vinculado,
  pagamento em cada uma das formas) e observar onde quebra — pode ser no cálculo do total, na
  criação dos pedidos (um por item, ver `POST /api/pedidos` em loop), no QR de Pix, na
  confirmação de pagamento em lote (`venda_id` agrupando vários pedidos), etc.
- Depois de reproduzir e identificar a causa exata, corrigir.
- **Antes de corrigir sem saber o sintoma exato**: se não conseguir reproduzir nada com 3+
  produtos, voltar pro PM com o que foi testado, pra pedir mais detalhe do Edvam (que produtos
  especificamente, que tipo de erro apareceu).

## Critérios de aceite
- [ ] Sintoma exato identificado e documentado (não só "bugou")
- [ ] Reproduzido de propósito com pedido sintético antes de corrigir
- [ ] Corrigido e testado de novo pra confirmar que não quebra mais com 3+ produtos
- [ ] Se não conseguir reproduzir, reportar claramente o que foi tentado

## Riscos e cuidados
Não adivinhar a causa sem reproduzir — o sintoma não está claro ainda.

## Referências
Relato informal do Edvam, 2026-07-15 (já mencionado antes, sem registro formal até agora).

## Relato de execução
Investigação em 2026-07-15 (03 - APP JS GRAFICA, Fable 5) — **não reproduzido**; volta pro PM
pedir o sintoma exato ao Edvam, como a própria demanda instruiu.

### O que foi testado (balcão admin local, dev server com o banco real; tudo sintético e apagado)
- **Combo A** — 3 produtos de catálogo (2× Papel Ofício, 1× Papel Pautado, 3× Xerox P&B),
  Dinheiro + levou agora: total da tela R$ 1,95 EXATO, 3 pedidos gravados com o mesmo
  venda_id, entregues/pagos.
- **Combo B** — 5 itens (3 de catálogo + 2 Entradas Avulsas) com desconto de R$0,10 num item:
  total R$ 2,70 exato (2,80 − 0,10), 5 pedidos gravados certos, desconto na linha certa,
  carrinho renderizando os 5 sem quebra visual (screenshot).
- **Combo C** — 3 itens, "Paga na retirada" + "vai buscar depois" com nome: 3 pedidos
  `confirmado`/não-pagos (esteira da 156 correta).
- **Venda mista com 2+ itens e Pix** (recarga + comum) coberta nos testes da 179 — inclusive
  pela UI.
- Console do navegador monitorado o tempo todo: **zero erro** de página/console nos 3 combos.

### O que NÃO foi coberto (pistas pro Edvam detalhar)
- PDV de produção com rede lenta: a gravação é 1 POST por item, sequencial — com 3+ itens e
  conexão ruim, o "Gravando..." demora mais e uma falha no meio gravaria SÓ parte dos itens
  (candidato plausível se o sintoma for "venda pela metade" ou "demorou/travou").
- Combinações específicas de produto que só a equipe usa (qual produto? qual forma? levou
  agora ou retirada? deu erro na tela ou o pedido saiu errado depois?).

### Pergunta objetiva pro Edvam (via PM)
O que aparece quando "dá bug": mensagem de erro, tela travada, total errado, itens faltando na
aba Pedidos, ou outra coisa? Em qual balcão (admin ou PDV) e com quais produtos?

### Adendo (2026-07-15, depois da demanda 190)
O detalhe que faltava veio: o sintoma era no **card de pedido do Atendimento/Inbox**, não no
balcão — por isso os 3 combos daqui (todos no balcão, onde os itens nascem juntos no mesmo
status) nunca reproduziram nada. A demanda 190 reproduziu e corrigiu: (1) entregar o item mais
recente escondia a venda do Atendimento com os demais itens presos; (2) o avanço era item a
item. Ver o relato da 190 pra correção completa (venda parcial continua visível + botão
"Avançar os N itens" com gate de pagamento único).
