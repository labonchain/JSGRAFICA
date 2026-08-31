# 188 — Repasse de recarga VEM não gera saída quando o pedido tem mais de uma recarga

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam reportou (print, 2026-07-15): um pedido com 2 itens de recarga (Celular + VEM) — a recarga
Celular gerou a saída "Repasse Recarga Celular" normalmente, a recarga VEM **não** gerou "Repasse
Recarga VEM". Segundo caso reportado no mesmo dia: pedido só de Recarga VEM (R$70, Dinheiro,
pagamento confirmado) também sem saída de repasse. Dinheiro real que deveria sair do caixa (repasse
pro RecargaPay) não está sendo registrado — subestima saídas, superestima resultado do dia.

## Objetivo
Toda recarga VEM entregue e paga gera a saída de repasse correspondente, sozinha ou combinada com
outros itens no mesmo pedido/venda.

## Escopo
- Incluído: investigar o gatilho automático de "Repasse Recarga VEM" (mencionado em demandas
  anteriores como automático "na hora da venda") — por que falha especificamente quando: (a) tem
  mais de um item de recarga no mesmo pedido, e/ou (b) em pedidos avulsos como o segundo caso
  reportado (R$70, Dinheiro). Usar os 2 casos reais do Edvam como referência pra reproduzir antes
  de corrigir.
- Depois de corrigir o gatilho, conferir se algum pedido recente já ficou sem o repasse por causa
  desse bug (levantamento, não correção retroativa sem aprovação — mesmo processo cauteloso de
  sempre).

## Critérios de aceite
- [ ] Reproduzido com um pedido sintético equivalente a cada um dos 2 casos reais
- [ ] Corrigido: recarga VEM sempre gera o repasse, sozinha ou combinada
- [ ] Levantamento de pedidos recentes que podem ter ficado sem repasse por esse bug, reportado
      ao PM antes de qualquer correção retroativa

## Riscos e cuidados
Dinheiro real — não corrigir retroativamente sem aprovação do Edvam, só levantar.

## Referências
Print do Edvam, 2026-07-15 (pedido com Celular+VEM; pedido avulso R$70 Dinheiro). Demanda 147
(repasse automático original).

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_GyM2xKir25rfkKgzRn9DcN3qRwPV`.

### Causa raiz (confirmada com os 2 casos reais do print — não é o "mais de uma recarga")
Os 2 pedidos sem repasse são **ped-0966** (R$70, Edvam, 13:56 — o "avulso R$70 Dinheiro") e
**ped-0971** (R$12, Zu, venda junto com celular — o caso "Celular+VEM"). Os dois usam produtos
"RECARGA VEM" **genéricos criados recentemente no catálogo** (`prod-105` "RECARGA VEM " e
`prod-106` "RECARGA VEM") — e produto novo criado pela aba Produtos nasce com
`gera_saida_automatica = false` (o formulário nem pergunta isso). O gatilho da 104/128 exigia a
flag ANTES de olhar a categoria; os 19 produtos VEM antigos ("RECARGA VEM 10,00"..."102,50")
têm true porque o 02-DADOS marcou um a um na 107 — todos os pedidos deles geraram repasse
normalmente, inclusive hoje. Combinar itens não influencia: cada item é um pedido e dispara o
próprio repasse. Obs.: a saída de "Repasse Recarga Celular" que o Edvam viu não foi automática
— celular é 100% manual desde a 128 (não existe nenhuma automática de celular hoje no banco).

### Correção
1. **Gatilho por CATEGORIA** (`gerarSaidaAutomaticaNaVenda`): 'Recarga vem' gera repasse SEMPRE,
   sem depender da flag do produto — a taxa do VEM é fixa por design (052), não existe VEM "sem
   repasse"; condicionar à flag só rearmava a armadilha a cada produto novo. A flag continua
   mandando no ramo genérico (preco_custo) e o guard do celular (128) continua absoluto.
2. **Dados**: `gera_saida_automatica = true` nos prod-105/106 (coerência com os outros 19 —
   redundante com o fix 1, de propósito).

### Testes (sintéticos, tudo apagado — incl. as 2 saídas de repasse geradas)
- Caso (b) equivalente: venda balcão só VEM (prod-105), R$3, Dinheiro/levou agora → saída
  "Repasse Recarga VEM" de **R$0,50** (3,00−2,50) criada e vinculada.
- Caso (a) equivalente + prova de classe: flag do prod-106 desligada DE PROPÓSITO + venda mista
  celular+VEM → VEM gerou R$1,50 **mesmo com a flag false** (o fix mata a classe), celular NÃO
  gerou nada (regressão da 128 intacta). Flag restaurada depois.

### Levantamento retroativo (critério 3 — SÓ levantado, nada corrigido)
Varredura completa (todo o histórico): **exatamente os 2 casos do Edvam**, ambos de 15/07:
- ped-0966 · RECARGA VEM R$70,00 · repasse devido **R$67,50**
- ped-0971 · RECARGA VEM R$12,00 · repasse devido **R$9,50**
Total: **R$77,00 de repasse não lançado no caixa de 15/07**. Aguarda aprovação do Edvam pra
lançar (pode ser manualmente na aba Saídas, categoria Repasse Recarga VEM, ou o executor lança
retroativo se o PM autorizar). Nenhum caso em dias anteriores.
