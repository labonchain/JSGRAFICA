# 173 — Varredura completa: pedidos entregues sem pagamento confirmado, todo o histórico

Status: concluída
Criada em: 2026-07-14
Aprovada em: 2026-07-14
Concluída em: 2026-07-15
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
No fechamento de caixa de 14/07 (PM + admin), foi achado um padrão real em 10/07: **12 pedidos**
de balcão (`telefone = 'balcao'`, `forma_pagamento = 'Pix'`), todos marcados `status = 'entregue'`
mas nunca com `pagamento_confirmado = true` — R$132,15 de venda real (confirmado pelo Edvam) que
nunca tinha entrado em nenhum fechamento. Corrigido manualmente pelo PM só pra 10/07, porque foi o
único dia que entrou na cadeia de reconciliação daquele fechamento. **Não foi verificado nenhum
outro dia** — o mesmo padrão pode existir em qualquer data desde que `jsgrafica_pedidos` tem dado
real (2026-07-06 em diante).

## Objetivo
Encontrar TODOS os pedidos de qualquer dia com o mesmo padrão (entregue, sem pagamento
confirmado, sinal de venda real) e levar a lista pro Edvam confirmar antes de corrigir — mesmo
processo que o PM fez pra 10/07, mas sistemático, dia por dia, não reativo.

## Escopo
- Incluído: buscar em `jsgrafica_pedidos`, desde 2026-07-06, todo pedido com `status = 'entregue'`
  e `pagamento_confirmado = false` (mesmo filtro usado na descoberta dos 12 de 10/07). Agrupar por
  dia (`data_entregue_at`), somar valor por dia, listar pedido a pedido dentro de cada dia
  (id, telefone, serviço, valor, forma de pagamento) — sinalizar especialmente o padrão
  `telefone = 'balcao'` + `forma_pagamento = 'Pix'` que foi o achado real, mas reportar qualquer
  outro padrão que aparecer.
- Levar a lista completa (por dia) pro Edvam confirmar quais são venda real (aí o PM ou o próprio
  02-DADOS confirma o pagamento com a data retroativa certa, usando o campo novo da demanda 165)
  e quais não são.
- Explicitamente fora de escopo: confirmar pagamento sem essa validação humana antes — mesmo
  processo cauteloso que os 12 de 10/07 tiveram (o PM só corrigiu depois do Edvam confirmar que
  eram reais).

## Critérios de aceite
- [ ] Lista completa, por dia, de todo pedido "entregue sem pagamento confirmado" desde 06/07
- [ ] Achados levados pro Edvam/PM confirmar antes de qualquer correção
- [ ] Se aprovado, pedidos confirmados com a data retroativa certa (não a data de hoje)
- [ ] Se algum dia já tem fechamento gravado e a correção mudar o total, reportar pro PM decidir
      se propaga a correção pra frente na cadeia de saldo (como foi feito em 10→13→14/07)

## Riscos e cuidados
Não confirmar pagamento sem validação humana — o objetivo é ACHAR e LISTAR, não decidir sozinho o
que é venda real. Fechamentos já gravados não devem ser reescritos sem essa confirmação e sem
avisar o PM (a correção pode precisar propagar pela cadeia de saldo_anterior de dias seguintes).

## Referências
Fechamento de 10/07/13/07/14/07 (conversa com o PM, 2026-07-14) onde o padrão foi achado. Demanda
164 (coluna `data_entrada_caixa`) e 165 (confirmação com data retroativa) — usar as duas.

## Relato de execução

**Status: concluída.** Confirmação retroativa dos 105 pedidos de 06/07 e 07/07 aplicada em
2026-07-15, depois de verificação numérica que confirmou a hipótese do Edvam (ver "Verificação
antes de aplicar" abaixo).

### Varredura (desde 2026-07-06, `status='entregue' AND pagamento_confirmado=false`)

666 pedidos têm `status='entregue'` no total; **105 (15,8%) estão sem pagamento confirmado**.
Confirmei que não há outro status equivalente a "entregue" sendo deixado de fora (`cancelado`,
`pronto`, `aguardando_retirada`, `confirmado`, `em_producao` são os únicos outros valores — nenhum
deles é "entregue").

| Dia | Qtd pedidos | Soma valor_final | Padrão `balcao`+`Pix` (achado original) |
|---|---|---|---|
| 06-07-2026 | 50 | R$ 405,39 | 0 |
| 07-07-2026 | 55 | R$ 339,55 | 0 |
| 08 a 14-07-2026 | 0 | — | 0 |

**Achado principal: o padrão da demanda (balcão + Pix) NÃO se repete em nenhum outro dia — os 12
de 10/07 já corrigidos pelo PM foram (aparentemente) um caso isolado**, não recorrente. Zero
ocorrências de `telefone='balcao' AND forma_pagamento ilike '%pix%'` sem confirmação em qualquer
dia desde 06/07.

**Mas existe um padrão DIFERENTE e bem maior, concentrado só nos 2 primeiros dias**: os 105
pedidos de 06/07 e 07/07 são todos de **telefone real de WhatsApp** (não `'balcao'`) e têm
`forma_pagamento = null` em 100% dos casos (não é especificamente Pix) — cobrem o expediente
inteiro (07h às 20h), valores típicos do catálogo normal (impressão P&B A4, xerox, recarga,
encadernação, etc., não parecem outliers/teste). A partir de 08/07 esse padrão desaparece por
completo.

**Leitura, sem confirmar nada**: a explicação mais provável é que, nos 2 primeiros dias reais do
sistema (06/07 e 07/07, ver achado da demanda 159 sobre a reconexão da Z-API), a equipe ainda
não tinha o hábito consolidado de clicar "confirmar pagamento" ao entregar — não necessariamente
significa que esse dinheiro nunca entrou no caixa fisicamente, mas sim que o sistema não registrou
a confirmação. É diferente do caso de 10/07 (que parecia um problema pontual de fluxo Pix/balcão).
**Não dá pra saber, só com o dado, se isso é dinheiro que já foi contado por fora (ex. fechamento
manual daqueles 2 dias, antes do sistema de fechamento ficar maduro) ou se é receita real ainda
não contabilizada** — por isso não confirmei nada, como pedido.

Lista completa pedido a pedido (id, telefone, nome_cliente, serviço, quantidade, valor, hora de
entrega) foi levantada e está disponível para consulta via SQL (`status='entregue' AND
pagamento_confirmado=false AND data_entregue_at >= '2026-07-06'`) — não reproduzida linha a linha
aqui por tamanho (105 linhas), mas todos os 105 IDs foram revisados individualmente antes deste
resumo. Nenhum concentra valor desproporcional (maior item: R$114,84, ped-0040, 58 cópias
coloridas ofício; a maioria é R$1,20-R$10).

### Decisão do Edvam (2026-07-14)
Confirmado: os 105 pedidos de 06/07 e 07/07 provavelmente já estavam contados nos fechamentos
daqueles dias (regra antiga, baseada em `status='entregue'`, anterior à demanda 164). Autorizado
confirmar o pagamento retroativamente (data real, campo da demanda 165) só pra deixar o dado
consistente — **regra explícita: não mudar nenhum total já fechado, e parar se a diferença não
for zero.**

### Verificação antes de aplicar (lida direto no código, não por suposição)

Li `getResumoDia()` (`lib/supabase-admin.ts`) pra saber exatamente o que compõe `total_entradas`:
soma de `jsgrafica_vendas.total` (por `data_dia`) + soma de `jsgrafica_pedidos.valor_final` onde
`pagamento_confirmado=true AND status<>'cancelado'`, na janela do dia por `data_entrada_caixa`
(`limitesDiaCaixaUTC()`: 03:00 UTC do dia até 03:00 UTC do dia seguinte = 00h-24h Recife).

Calculei o total pós-correção (vendas + pedidos já confirmados + os 105 a confirmar, simulando
como se já estivessem com `pagamento_confirmado_at` no mesmo dia da entrega) e comparei com o
`total_entradas` já **gravado** em `jsgrafica_fechamento` (linha `fechado_por='Sistema'`, a que
representa o dia inteiro):

| Dia | Gravado (fechamento) | Recalculado pós-correção | Diferença |
|---|---|---|---|
| 06-07-26 | R$ 998,49 | R$ 998,49 | R$ 0,00 |
| 07-07-26 | R$ 624,25 | R$ 624,25 | R$ 0,00 |

**Diferença zero nos dois dias — confirma exatamente a hipótese do Edvam.** O dinheiro já estava
contado; faltava só a "prova" (`pagamento_confirmado`) bater com o total que já existia.

### Correção aplicada

```sql
update jsgrafica_pedidos
set pagamento_confirmado = true,
    pagamento_confirmado_at = (to_char(data_entregue_at at time zone 'America/Recife', 'YYYY-MM-DD') || 'T15:00:00.000Z')::timestamptz,
    pagamento_confirmado_origem = 'manual',
    updated_at = now()
where status = 'entregue' and pagamento_confirmado = false
  and data_entregue_at >= '2026-07-06T03:00:00Z'::timestamptz
  and data_entregue_at < '2026-07-08T03:00:00Z'::timestamptz;
-- 105 linhas atualizadas
```

`pagamento_confirmado_at` gravado como meio-dia (15:00 UTC) do dia real da entrega, no fuso de
Recife — mesma convenção exata usada pelo `resolverDataPagamento()` da demanda 165 (não inventei
formato novo, só repliquei em SQL). **Não toquei em `forma_pagamento`** (segue `null` — não tenho
como saber se era Pix, dinheiro ou cartão, e o Edvam não pediu pra preencher isso, só a
confirmação de pagamento).

### Confirmação final
```
Pedidos "entregue sem pagamento confirmado" restantes desde 06/07: 0
jsgrafica_fechamento (06-07-26 e 07-07-26): valores intactos, idênticos aos gravados antes
  (nenhum UPDATE tocou a tabela jsgrafica_fechamento)
```

### Achados fora do escopo
Nenhum novo além do já registrado (a ausência de recorrência do padrão balcão+Pix nos outros dias
segue válida — só 06/07 e 07/07 tinham o problema, e agora estão corrigidos).

### Critérios de aceite
- [x] Lista completa, por dia, de todo pedido "entregue sem pagamento confirmado" desde 06/07
- [x] Achados levados pro Edvam/PM confirmar antes de qualquer correção
- [x] Pedidos confirmados com a data retroativa certa (data real da entrega, não hoje)
- [x] Nenhum fechamento já gravado foi alterado — verificado antes (diferença zero) e depois
      (valores idênticos) de aplicar a correção
