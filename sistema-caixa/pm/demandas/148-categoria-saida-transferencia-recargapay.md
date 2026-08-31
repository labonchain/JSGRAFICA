# 148 — Nova categoria de saída: transferência de saldo pro RecargaPay

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto
Confirmado nos dados (2026-07-10): não existe hoje nenhuma categoria/registro pra "transferir
dinheiro do Mercado Pago ou Caixa Econômica pro RecargaPay" (abastecer o saldo usado pra fazer
recargas de clientes de balcão que pagam a gráfica, não o RecargaPay diretamente). A única
categoria existente ligada a isso é "Repasse Recarga VEM/Celular" (`categoria_id: recarga_vem`),
que representa o **custo da recarga em si** por pedido — coisa diferente de "colocar dinheiro no
RecargaPay pra ter saldo disponível".

## Objetivo
Existe uma categoria de saída própria pra registrar quando dinheiro é transferido de uma conta
nossa (MP ou Caixa Econômica) pro saldo do RecargaPay — separada do repasse por pedido.

## Escopo
- Incluído:
  1. Nova categoria de saída (ex. `categoria_id: transferencia_recargapay`, nome "Transferência
     pra RecargaPay") disponível na tela de Saídas, ao lado das demais categorias.
  2. Sem automação — é lançamento manual, mesmo padrão de qualquer outra saída hoje (o Admin
     lança quando faz a transferência de verdade).
- Fora de escopo: qualquer mudança na categoria "Repasse Recarga VEM/Celular" existente, ou no
  fluxo da 147.

## Critérios de aceite
- [ ] Categoria nova aparece na tela de Saídas
- [ ] Lançamento funciona normal, sem afetar outras categorias

## Referências
Esta conversa (2026-07-10) — achado do PM ao investigar o pedido do Edvam.

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_Bn5JRTK3cuJ14EsTx3ZyNrDHWN6t`
(junto com a 147 — nenhuma mudança de código nesta demanda).

### O que foi feito
Zero código: as categorias de saída são data-driven desde as demandas 049/050 (tabela
`jsgrafica_categorias_saida` que a tela de Saídas lê). Foi 1 INSERT:
`id: 'transferencia_recargapay'`, `nome: 'Transferência pra RecargaPay'`, `ativo: true`,
`visivel_pdv: false` (mesmo padrão de TODAS as categorias existentes — lançamento é do Admin,
igual às demais; se o Edvam quiser no PDV, é 1 flag na tela de gerenciamento de categorias).
A categoria "Repasse Recarga VEM/Celular" (`recarga_vem`/`recarga_cel`) não foi tocada.

### Testes
- Local: `POST /api/saidas` com a categoria nova → sucesso; tela de Saídas mostrando a categoria
  no formulário e o lançamento de teste na lista "Lançamentos" (screenshot). Lançamento de teste
  (R$0,01) apagado depois.
- Produção: formulário "+ Adicionar saída" do admin exibindo "Transferência pra RecargaPay"
  (screenshot), nada criado.

### Critérios de aceite
- [x] Categoria nova aparece na tela de Saídas (local e produção)
- [x] Lançamento funciona normal, sem afetar outras categorias (nenhuma alterada)
