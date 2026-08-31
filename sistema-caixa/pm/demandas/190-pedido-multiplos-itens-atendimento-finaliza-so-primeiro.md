# 190 — Pedido com múltiplos itens criado no Atendimento: finalizar avança só o primeiro item

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam reportou (2026-07-15): ao criar um pedido com mais de 1 item pelo Atendimento (Inbox) e
"finalizar", só o primeiro item avança de status — os outros ficam presos, aparecendo na aba
Pedidos como "Vários status" na venda agrupada, exigindo abrir o pedido e finalizar os outros
itens manualmente um por um. **Provável resposta à demanda 185** (bug de 3+ produtos que não foi
reproduzido) — os testes da 185 cobriram só o balcão; este relato descreve o caminho do
Atendimento/Inbox especificamente, que não tinha sido testado.

## Objetivo
Finalizar um pedido com múltiplos itens criado pelo Atendimento avança todos os itens juntos, não
só o primeiro.

## Escopo
- Incluído: reproduzir criando um pedido com 2+ itens pelo "Criar pedido" do Inbox e "finalizar" —
  identificar exatamente onde a ação para de propagar pros demais itens (provável: loop que
  deveria atualizar todos os itens do `venda_id` mas só processa o primeiro, ou uma race condition
  entre POSTs sequenciais, mesma suspeita já registrada no relato da 185).
- Corrigir pra avançar todos os itens da mesma venda juntos.
- Verificar se a demanda 185 pode ser fechada como duplicata desta, ou se o bug do balcão (3+
  produtos) é uma causa diferente — reportar ao PM.

## Critérios de aceite
- [ ] Reproduzido com pedido sintético de 2+ itens pelo Atendimento
- [ ] Finalizar avança todos os itens da venda, não só o primeiro
- [ ] Testado também no balcão (contra-prova, ver se o mesmo teste ali reproduz o que a 185 não
      conseguiu)

## Riscos e cuidados
Nenhum risco de dado além do já conhecido — cuidado ao testar em produção com pedido real.

## Referências
Relato do Edvam, 2026-07-15. Demanda 185 (mesma suspeita, não reproduzida no balcão).

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_GyM2xKir25rfkKgzRn9DcN3qRwPV`.

### Reproduzido (critério 1) — eram DOIS problemas somados no card do Atendimento
Venda sintética de 2 itens pelo "Criar pedido" do Inbox:
1. **A venda sumia do Atendimento no meio do caminho**: `carregarPedidoAtivo` só olhava
   `pedidos[0]` (o item mais recente) — entregar ESSE item fazia o card voltar pra "Criar
   pedido" com os outros itens ainda abertos, presos e invisíveis no Atendimento (reproduzido:
   item mais recente entregue → card computava ativo = null). Na aba Pedidos viravam o "Vários
   status" do relato do Edvam.
2. **Avançar era por item** (design da 088): finalizar uma venda de N itens exigia N cliques por
   etapa — clicou num só, os outros ficavam.
Não é race condition entre os POSTs (a criação grava todos os itens certinho — conferido).

### Correção
1. `carregarPedidoAtivo`: venda parcialmente finalizada continua sendo o pedido ativo — se o
   item mais recente fechou mas OUTROS itens da mesma venda estão abertos, o card mostra a
   venda (provado pela UI: entreguei só o item mais recente e o card seguiu mostrando a venda
   com o item restante — antes virava "Criar pedido").
2. **Botão "Avançar os N itens → <etapa>"** no topo do card da venda: avança TODOS os itens
   abertos de uma vez quando estão na mesma etapa. Gate de pagamento de sempre: abre o
   ModalConfirmarPagamento UMA vez e a forma vale pra todos os itens não pagos (item já pago
   avança sem receber forma — a 180 nem deixaria sobrescrever). Itens em etapas diferentes →
   aviso "avance um a um" e os botões por item da 088 continuam lá (flexibilidade preservada).

### Testes (sintéticos, tudo apagado)
Pela UI (Playwright): venda de 2 itens → "Avançar os 2 itens → Em produção" → gate abriu 1 vez
(Dinheiro) → os 2 confirmados+avançados JUNTOS; próxima etapa sem modal (já pagos) → os 2 em
"Pronto" juntos; prova do item 1 acima (venda parcial visível). Banco conferido em cada passo.

### Relação com a 185 (critério 3 — contra-prova no balcão)
**A 190 responde a 185.** O sintoma era específico do card do Atendimento: no balcão os itens
nascem TODOS juntos no mesmo status (levou-agora → tudo entregue; retira-depois → tudo
confirmado — os 3 combos da 185 provaram isso com 3-5 itens) e por isso a 185 nunca reproduziu
nada lá. Status da 185 atualizado apontando pra cá.

### Achado fora de escopo (registrado)
O painel de venda agrupada da **aba Pedidos** (PainelDetalheVenda) continua avançando por item
— mesmo racional de "avançar todos" caberia lá; fica pro PM decidir se vira demanda.
