# 211 — Repasse automático não pode gerar saída fantasma quando o pagamento é Pix RecargaPay

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-07-17
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real do Edvam (2026-07-17): quando o pagamento de uma recarga VEM é Pix direto pro
RecargaPay (forma criada na demanda 199), o valor pago pelo cliente já cobre a recarga inteira,
e o que sobra é lucro que já fica sentado na própria conta do RecargaPay — não existe dinheiro
nenhum passando pela mão de quem vendeu, e não existe repasse nenhum a fazer. Só que
`gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`) gera a saída automática de repasse pra
QUALQUER venda de VEM, sem olhar a forma de pagamento — criando uma saída fantasma atribuída a
quem vendeu (`operador`), que desconta do esperado de dinheiro físico dela um valor que nunca
saiu de lá de verdade. Achado com caso real: `ped-1173` (Gabi, R$15, Pix RecargaPay) gerou
repasse de R$12,50 vinculado à gaveta dela, apagado manualmente pelo PM — provável parte real da
divergência de R$31,05 do fechamento de hoje.

## Objetivo
Venda de recarga VEM paga por Pix RecargaPay nunca gera saída automática de repasse — o dinheiro
já está no lugar certo (conta do RecargaPay) no momento do pagamento, sem nenhum movimento
adicional necessário.

## Escopo
- Incluído: em `gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`), quando
  `forma_pagamento === 'Pix RecargaPay'`, não gerar saída nenhuma — pedido nasce/confirma sem
  `saida_vinculada_id`. Mesmo tratamento pra Recarga Celular, se o mesmo caminho de código for
  compartilhado (confirmar se há um gatilho equivalente pra celular e se o mesmo problema existe
  lá — hoje o repasse de celular é 100% manual, então pode já não ter esse risco, documentar o
  que encontrar).
- Qualquer outra forma de pagamento (Dinheiro, Cartão, Pix normal/Mercado Pago) continua gerando
  o repasse automático normalmente — o problema é específico do Pix RecargaPay, onde o dinheiro
  nunca passa pela gráfica.
- Levantar (não corrigir sozinho, trazer pro PM) qualquer outra saída de repasse já existente no
  histórico vinculada a pedido com `forma_pagamento = 'Pix RecargaPay'` — pode haver mais casos
  além do `ped-1173` já corrigido manualmente.

## Critérios de aceite
- [x] Venda de VEM por Pix RecargaPay não gera saída de repasse
- [x] Outras formas de pagamento continuam gerando repasse normalmente (sem regressão)
- [x] Levantamento de casos históricos afetados entregue ao PM
- [x] Testado com pedido sintético de recarga VEM em Pix RecargaPay

## Riscos e cuidados
Não confundir com o Pix normal (Mercado Pago) — esse SIM pode precisar de repasse, dependendo de
como o dinheiro do Mercado Pago é usado depois (decisão já tomada antes, não mexer). O problema é
só a forma "Pix RecargaPay" especificamente.

## Referências
Demanda 199 (criação da forma "Pix RecargaPay"). `lib/supabase-admin.ts`
(`gerarSaidaAutomaticaNaVenda`). Caso real: `ped-1173` (R$15, repasse fantasma de R$12,50
apagado pelo PM), `ped-1183` (R$22,50, lançado corretamente sem repasse, referência de como deve
ficar).

## Relato de execução
Implementado em `gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`): novo parâmetro
`forma_pagamento` (já vinha disponível de graça — os 2 pontos de chamada em
`app/api/pedidos/route.ts` sempre passam o pedido inteiro, `select()` sem restrição de colunas,
então `forma_pagamento` já estava no objeto, só não era usado). Checagem adicionada BEM no topo
da função, antes até de olhar produto/categoria: `if (pedido.forma_pagamento === 'Pix
RecargaPay') return { criada: false, motivo: 'pago_direto_recargapay' }`. Vale pra qualquer
produto que algum dia seja pago com essa forma, não só recarga VEM — mais robusto que checar por
categoria, e sem risco de generalizar demais (essa forma só existe pro contexto de recarga, 199).

**Recarga Celular**: confirmado que já NÃO tinha esse risco — o repasse automático de celular já
é bloqueado incondicionalmente mais abaixo na mesma função (`CATEGORIA_PRODUTO_REPASSE_MANUAL`,
demanda 128), antes de qualquer saída ser gerada, independente da forma de pagamento. A checagem
nova da 211 nem chega a ser relevante pra celular (o bloqueio de categoria já resolve primeiro),
mas não conflita — é uma segunda razão independente pra não gerar, sem sobreposição de risco.
Achado observado, fora do escopo desta demanda: o repasse de celular é 100% MANUAL (via
"Adicionar saída"), então um humano ainda poderia lançar esse repasse por engano pra uma venda de
celular paga em Pix RecargaPay — esse risco é de lançamento manual, não desta função automática,
registrado aqui só pra visibilidade do PM, não corrigido (fora do escopo pedido).

**Levantamento histórico** (pedido explícito da demanda — "trazer pro PM", não corrigir
sozinho): busquei TODOS os pedidos que já tiveram `forma_pagamento = 'Pix RecargaPay'` na
história do sistema. Resultado: **só existem 2, e nenhum precisa de correção**:
- `ped-1173` (R$15, Gabi) — o caso real que motivou esta demanda. `saida_vinculada_id` já está
  `null` (o PM já apagou manualmente a saída fantasma de R$12,50 antes de abrir esta demanda).
- `ped-1183` (R$22,50, Gabi) — o próprio caso de referência citado na demanda ("lançado
  corretamente sem repasse"), `saida_vinculada_id` já `null`, nunca teve o problema.
Não há mais nenhum pedido histórico com essa forma de pagamento — **levantamento fechado, zero
correções pendentes pro PM**. (Busquei também saídas `recarga_vem` órfãs — sem nenhum pedido
vinculado — só achei entradas do import histórico do Google Sheets (pré-existentes, sem vínculo
por natureza, não relacionadas a este bug) e 2 lançamentos manuais antigos de 15/07 sem vínculo,
também anteriores a qualquer pedido pago em Pix RecargaPay — nenhum candidato adicional.)

Teste: criei pedido sintético de recarga VEM (`prod-083`, R$12,50) com `forma_pagamento: 'Pix
RecargaPay'`, avancei pra "entregue" via `PATCH /api/pedidos` real (mesmo caminho de produção) —
confirmado via SQL: nenhuma saída criada, `saida_vinculada_id` permanece `null`. Teste de
regressão: mesmo pedido, mesma recarga, `forma_pagamento: 'Dinheiro'` — repasse gerado
normalmente (R$10,00 = R$12,50 − R$2,50 de taxa, `operador: Gabi`, categoria "Repasse Recarga
VEM"), confirmando que só o caso Pix RecargaPay foi afetado, sem regressão nas outras formas.
Os 2 pedidos sintéticos e a saída de regressão foram apagados do banco ao final.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_3yhoUveVLUQbESaKLKGKpCcZ6MXV`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.
