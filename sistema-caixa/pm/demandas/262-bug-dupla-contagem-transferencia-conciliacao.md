# 262 — Corrigir dupla contagem de transferência na conciliação automática (gap agregado)

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-01
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
Achado real durante o fechamento/conciliação de julho (2026-08-01, PM + Edvam). A função
`calcularEntradaSaidaConta` em `lib/conciliacao.ts` (usada pela conciliação automática 227/228
pra calcular o "gap agregado" de cada conta) conta a saída de uma transferência **2 vezes**:

```ts
const [{ data: transfEntrada }, { data: saidasConta }, { data: transfSaida }] = await Promise.all([
  supabaseAdmin.from('jsgrafica_transferencias').select('valor').eq('data_dia', dataDia).eq('conta_destino', conta),
  supabaseAdmin.from('jsgrafica_saidas').select('valor').eq('data_dia', dataDia).eq('conta_origem', conta),
  supabaseAdmin.from('jsgrafica_transferencias').select('valor').eq('data_dia', dataDia).eq('conta_origem', conta),
]);
...
const saida = round2((saidasConta ?? []).reduce(...) + (transfSaida ?? []).reduce(...));
```

`criarTransferencia` (mesmo arquivo) grava a mesma movimentação em 2 lugares: uma linha espelho
em `jsgrafica_saidas` (categoria `transferencia_entre_contas`, pra aparecer na lista de saídas da
conta de origem) **e** uma linha em `jsgrafica_transferencias`. `saidasConta` já inclui a linha
espelho; `transfSaida` soma a mesma movimentação de novo — a saída calculada da conta de origem
fica sistematicamente inflada em 100% do valor de cada transferência que sai dela.

**Prova concreta, dado real (29-07-26, conta mercadopago)**: transferência de R$245,00 pro
RecargaPay. Saída calculada pelo sistema naquele dia: R$492,64. Conferido: linha espelho em
`jsgrafica_saidas` = R$247,64 (inclui R$2,64 de taxa Pix separada) + R$245,00 de novo em
`jsgrafica_transferencias` = R$492,64. Bate exato — confirma a duplicação.

**Impacto real**: todo dia em que uma conta teve transferência de saída, o "gap" calculado pela
227/228 (e a pendência `saldo_dia_agregado` gerada) fica maior do que a diferença real — em
alguns casos por dezenas ou centenas de reais (ex. 21-07-26, conta mercadopago: R$30 dos R$290,58
de gap são só esse efeito de duplicação, não dinheiro real sem explicação). Isso derruba a
confiança nos números de gap já usados pra classificar pendências ao longo de julho — qualquer
pendência `saldo_dia_agregado` numa conta que teve transferência de saída naquele dia pode estar
inflada.

## Objetivo
Corrigir `calcularEntradaSaidaConta` pra contar a saída de cada transferência só uma vez, e
avaliar se as pendências `saldo_dia_agregado` já criadas (e ainda `pendente`) precisam ser
recalculadas com a fórmula corrigida antes do Edvam terminar de classificar o mês de julho.

## Escopo
- Incluído: corrigir a query de `saidasConta` (ou de `transfSaida`) pra não contar a mesma
  movimentação 2 vezes — provavelmente excluir da busca em `jsgrafica_saidas` as linhas com
  `categoria_id = 'transferencia_entre_contas'` (já cobertas por `transfSaida`), já que
  `criarTransferencia` sempre grava essa categoria específica pra linha espelho.
- Incluído: conferir se o lado de entrada (`transfEntrada`) tem o mesmo problema — investigar se
  existe alguma linha espelho de entrada equivalente em outra tabela (`jsgrafica_entradas_avulsas`
  ou semelhante) que também duplicaria `transfEntrada`. Suspeita do PM é que não, mas confirmar
  com dado real antes de assumir.
- Incluído: depois da correção, identificar quais pendências `saldo_dia_agregado` ainda
  `pendente` (não classificadas) foram calculadas com a fórmula errada (qualquer dia/conta que
  teve transferência de saída) e recalcular via `/api/conciliacao/rodar` — sem apagar
  pendências já `classificado` (o Edvam já tomou decisão em cima delas, não desfazer).
- Explicitamente fora de escopo: revisar transferências já criadas — o problema é só no cálculo
  do gap, não na transferência em si, que está correta.

## Critérios de aceite
- [ ] `calcularEntradaSaidaConta` corrigida, sem dupla contagem, testada contra o caso real do
      29-07-26 (deve dar saída calculada de R$247,64, não R$492,64)
- [ ] Confirmado se o lado de entrada tem ou não o mesmo problema, com evidência
- [ ] Pendências `saldo_dia_agregado` ainda pendentes recalculadas com a fórmula corrigida,
      pendências já classificadas preservadas sem alteração
- [ ] Relato indica exatamente quais dias/contas tiveram o valor do gap alterado pela correção

## Riscos e cuidados
Urgente — está em uso ativo agora mesmo pelo Edvam pra fechar o mês de julho. Não apagar nenhuma
pendência já `classificado`. Coordenar com o PM antes de rodar qualquer recálculo em massa, pra
não conflitar com classificações acontecendo ao vivo na mesma tarde.

## Referências
`lib/conciliacao.ts` (`calcularEntradaSaidaConta`, `criarTransferencia`). Achado em 2026-08-01,
durante fechamento/conciliação de julho, dia 21-07-26 (conta mercadopago, gap R$290,58) e
confirmado com dado real do dia 29-07-26.

## Relato de execução

**Status final: concluída.** Correção no ar, pendências recalculadas, nenhuma `classificado` tocada.

### 1. Bug reproduzido com dado real antes de qualquer mudança
Confirmei em `jsgrafica_saidas` (29-07-26, `conta_origem='mercadopago'`): linha espelho
`categoria_id='transferencia_entre_contas'`, valor R$245,00 (a mesma transferência) + linha real
`categoria_id='diversas'`, valor R$2,64 (taxa Pix) = R$247,64. Em paralelo, `jsgrafica_transferencias`
tem 1 linha (`conta_origem='mercadopago'`, `conta_destino='recargapay'`, valor R$245,00,
`saida_id` apontando pra a própria linha espelho acima). Código antigo somava as duas fontes sem
excluir a espelho: R$247,64 + R$245,00 = **R$492,64** — bate exatamente com o que a demanda
descreveu. Bug confirmado com dado, não só lendo código.

### 2. Lado de entrada — confirmado que NÃO tem o mesmo problema (não assumido)
Li `criarTransferencia` inteira (`lib/supabase-admin.ts:1120-1168`, é onde a função mora de
verdade — não em `lib/conciliacao.ts` como o texto da demanda sugeria, achado incidental sem
impacto): ela grava exatamente 2 linhas (`jsgrafica_saidas` espelho na origem + `jsgrafica_transferencias`),
nunca nada do lado do destino. `grep` por todo o repo confirmou que `criarEntradaAvulsa` (a única
função que escreve algo parecido com "entrada solta") só é chamada por
`app/api/conciliacao/pendencias/route.ts` (classificação manual de pendência) — nunca por
`criarTransferencia`. `transfEntrada` (`jsgrafica_transferencias.conta_destino`) é a única fonte do
lado de entrada, sem duplicata em lugar nenhum. Confirmado com código, não é suposição.

### 3. Correção aplicada
`lib/conciliacao.ts`, `calcularEntradaSaidaConta`: a query de `saidasConta` ganhou
`.neq('categoria_id', 'transferencia_entre_contas')` — exclui a linha espelho, que já está coberta
por `transfSaida`. Conferido que `categoria_id` nunca é `null` em `jsgrafica_saidas` (0 de 1.137
linhas), então o `.neq()` do PostgREST (que excluiria silenciosamente linhas `NULL` também) não
introduz nenhum efeito colateral. `npx tsc --noEmit` e `npm run build` limpos. Deploy em produção:
`dpl_9WZiM98y7xAPCmvQVCjWvJF96VGw`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.

Reconferido com o caso do 29-07-26 direto no `POST /api/conciliacao/rodar` já em produção: saída
calculada da conta `mercadopago` naquele dia caiu de R$492,64 pra **R$247,64** — exatamente o valor
esperado.

### 4. Pendências `saldo_dia_agregado` afetadas — identificadas, apagadas (só as `pendente`) e recalculadas
Critério: toda pendência `tipo_origem='saldo_dia_agregado'` com `status='pendente'` numa conta/dia
que teve pelo menos 1 transferência de SAÍDA naquele `data_dia` (`jsgrafica_transferencias.conta_origem`)
— são exatamente as que o cálculo antigo inflava. **12 pendências pendentes afetadas, em 8 dias
distintos** (nenhuma `classificado` estava entre elas — conferido antes de apagar, com `SELECT`
específico pelos 12 ids). Apaguei só essas 12 (não as outras 16 pendências `saldo_dia_agregado` do
período, que não tinham transferência de saída no dia e por isso não eram afetadas) e chamei
`POST /api/conciliacao/rodar` pra cada um dos 8 dias, já com o código corrigido — o próprio
mecanismo de dedup da 228 preservou intactas todas as pendências não apagadas (`pendenciaCriada:false`
nelas, "já existe") e recriou do zero só as 12 removidas, com o valor certo.

**Tabela: valor antes (com bug) → valor depois (corrigido), pelo dado real recalculado em produção**
(não é conta de cabeça — é o valor que o próprio `/api/conciliacao/rodar` gravou):

| Dia | Conta | Antes | Depois | Observação |
|---|---|---|---|---|
| 20-07-26 | mercadopago | -681,18 | **-731,18** | |
| 21-07-26 | mercadopago | -290,58 | **-620,58** | variação maior que só o efeito da duplicação — o cruzamento item a item do Mercado Pago (227) pra esse dia também tinha mudado de estado entre a criação original da pendência e hoje (mais pendências item-a-item acumuladas desde então); não é um efeito novo desta correção |
| 22-07-26 | mercadopago | 45,18 | **-4,82** | inverteu de sinal — parecia sobra inexplicada, é uma falta pequena |
| 23-07-26 | mercadopago | 91,76 | **-8,24** | inverteu de sinal |
| 24-07-26 | mercadopago | -2.166,89 | **-2.216,89** | |
| 24-07-26 | stone | 202,20 | **2,20** | |
| 24-07-26 | caixa_econômica | 803,00 | **250,00** | |
| 27-07-26 | caixa_econômica | 150,00 | **100,00** | |
| 29-07-26 | mercadopago | 237,57 | **-7,43** | inverteu de sinal — é o caso citado no contexto desta demanda |
| 31-07-26 | mercadopago | -405,89 | **-495,89** | |
| 31-07-26 | stone | 189,80 | **removida** | ficou abaixo do limiar de materialidade (R$2,00) — não é mais uma pendência real, não foi recriada |
| 31-07-26 | caixa_econômica | 420,00 | **142,00** | |

Todas as outras pendências `saldo_dia_agregado` do período (as que não tiveram transferência de
saída no dia) foram conferidas como intocadas — `SELECT` final na tabela mostra os mesmos ids e
valores de antes pra elas. A pendência `classificado` de 21-07-26 (`caixa_economica`, R$87,00,
2a76c178) segue exatamente como estava, confirmado.

### 5. Achado colateral, transparente (não é bug, é esperado)
Rodar `conciliarDia` de novo pra 27-07-26 também re-rodou o matching item a item do Mercado Pago
(227, sempre roda junto — mecânica documentada no próprio código) e achou **1 pagamento novo sem
vínculo** que não existia como pendência antes (R$3,24, `account_money`, 15h41 de 27/07) — não tem
relação com o bug desta demanda, é só o cruzamento normal encontrando algo que ainda não tinha sido
matched. Registrado aqui pra não aparecer como surpresa pro Edvam na tela de conciliação.

### Testes realizados e resultado
Reprodução do bug com dado real antes da correção (§1); leitura completa de `criarTransferencia` +
grep de todos os chamadores de `criarEntradaAvulsa` pra confirmar ausência do mesmo problema do
lado de entrada (§2); `tsc`/`build` limpos; teste em produção do caso real 29-07-26 confirmando
R$247,64 (§3); recálculo das 12 pendências afetadas direto via `/api/conciliacao/rodar` em produção,
valores conferidos linha a linha no banco depois (§4); conferido que nenhuma pendência `classificado`
foi tocada, nem nenhuma pendência não-afetada mudou de id/valor.

### Achados fora do escopo
- `criarTransferencia` mora em `lib/supabase-admin.ts`, não em `lib/conciliacao.ts` — imprecisão no
  texto da demanda, sem nenhum impacto na correção. Registrado só por precisão.
- 1 pendência nova de item Mercado Pago (R$3,24, 27-07-26) surgiu como efeito colateral esperado de
  rodar a conciliação de novo — não é bug, mas o Edvam vai ver 1 item a mais na tela hoje que não
  tinha ontem, por esse motivo.

### Status final
Concluída. Correção no ar em produção, 12 pendências recalculadas (11 com valor novo + 1 removida
por materialidade), nenhuma pendência `classificado` alterada. Sinalizando ao PM agora pra
continuar a classificação de julho com o Edvam com os números corrigidos.
