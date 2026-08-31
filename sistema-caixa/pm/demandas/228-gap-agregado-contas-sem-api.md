# 228 — Gap agregado de saldo nas contas sem API (RecargaPay/Stone/Caixa Econômica)

Status: concluída
Criada em: 2026-07-22
Aprovada em: 2026-07-22
Concluída em: 2026-07-22
Chat executor: 03 - APP JS GRAFICA

## Contexto
Terceira peça de implementação do desenho de conciliação (demanda 225,
`pm/conhecimento/desenho-conciliacao-automatica.md`, seção 1.2), em paralelo à 227. RecargaPay,
Stone e Caixa Econômica não têm API própria — só o saldo que o Admin informa a cada fechamento
"Sistema". Esta demanda persiste e automatiza um cálculo que a demanda 216 já fez manualmente
uma vez.

## Objetivo
Pra cada uma dessas 3 contas, toda vez que o fechamento "Sistema" for feito, calcular a
diferença entre a variação de saldo informada e a variação calculada pelos lançamentos do dia —
se passar do limiar de materialidade (R$2,00), vira um item em
`jsgrafica_conciliacao_pendencias` (`tipo_origem='saldo_dia_agregado'`).

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirme o cálculo exato com um dia real antes de escrever código de produção — relate ao PM o
resultado batendo com o que a 216 já achou manualmente, e só depois de confirmação explícita
siga pro deploy.

**Atualização 2026-07-22 (ajuste aprovado pelo Edvam junto com a liberação pra implementar)**:
estender o cálculo de gap agregado pro **Mercado Pago também**, além das 3 contas sem API — mas
com uma regra de dedup obrigatória: a diferença do Mercado Pago é calculada normalmente e depois
**descontada da soma do que a 227 já encontrou item a item naquele dia** (`somaPendenciasDoDia`
de `conciliarMercadoPagoDoDia`), antes de decidir se cria pendência agregada. Objetivo: nunca
duplicar o mesmo caso como 2 itens (ex. o R$300 de 21/07 não pode virar 1 pendência da 227 + mais
uma pendência agregada da 228 cobrindo o mesmo valor). Ver detalhe exato da regra e teste real no
relato.

## Escopo
- Incluído: pra cada conta em `{recargapay, stone, caixa_economica}`, calcular:
  ```
  variação informada = saldo_informado_hoje − saldo_informado_ontem
  variação calculada  = Σ entradas dessa conta no dia − Σ saídas dessa conta no dia
                        (jsgrafica_pedidos por forma_pagamento + jsgrafica_saidas/transferencias
                        por conta_origem/conta_destino)
  diferença = variação informada − variação calculada
  ```
- Incluído: se `|diferença| > 2.00`, criar item em `jsgrafica_conciliacao_pendencias`
  (`tipo_origem='saldo_dia_agregado'`, `conta`, `valor=diferença`, `data_dia`,
  `descricao_sugerida` explicando o cálculo) — 1 item por conta por dia, sem duplicar se já
  existir pendência não resolvida daquele dia/conta.
- Incluído: mesmo gatilho da 227 (automático no fechamento "Sistema" + sob demanda).
- Incluído: testar contra pelo menos 1 dia real já auditado manualmente (ex. algum dos dias que
  a 216/222 já analisaram) e confirmar que o valor calculado bate com o que já foi encontrado
  manualmente.
- Explicitamente fora de escopo: Dinheiro (Zu/Gabi) — já tem mecanismo equivalente
  (`divergencia` do fechamento por operador), fora do escopo do desenho 225. UI (229).

## Critérios de aceite
- [x] Cálculo implementado pras 3 contas (+ Mercado Pago, ajuste pedido pelo Edvam — ver relato),
      rodando no fechamento "Sistema"
- [x] Testado contra pelo menos 1 dia real, batendo com auditoria manual anterior (216/222)
- [x] Diferença abaixo de R$2,00 não gera item (materialidade respeitada)
- [x] Sem duplicar item se rodado 2x pro mesmo dia/conta

## Riscos e cuidados
Não confundir com o `divergencia` do fechamento por operador (Zu/Gabi) — são cálculos
diferentes, por conta digital vs por gaveta física.

## Referências
Demanda 225 (desenho completo). Demanda 226 (tabelas). Demanda 216 (planilha manual que
originou esse cálculo, `pm/conhecimento/planilha-entradas-saidas-saldo-por-conta.md`).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - Implementado `calcularGapContasSemApi(dataDia, somaPendenciasMPDoDia)` em `lib/conciliacao.ts`
    (mesmo arquivo da 227) — calcula entrada/saída/resultado pras 4 contas
    (`mercadopago`/`stone`/`recargapay`/`caixa_economica`) com a fórmula exata validada no
    checkpoint (pedidos por `forma_pagamento` + `jsgrafica_transferencias` por
    `conta_origem`/`conta_destino` − `jsgrafica_saidas`/transferências por `conta_origem`).
  - **"Saldo de ontem" não é "dia calendário − 1"**: implementado `fechamentoSistemaAnterior`, que
    busca o fechamento "Sistema" imediatamente anterior por ordem real (`parseDiaCaixa` em
    memória, não subtração de data nem comparação de string — `data_dia` é texto DD-MM-AA e quebra
    ao cruzar mês/ano, mesmo cuidado já documentado em `lib/supabase.ts`). Isso cobre corretamente
    os dias sem fechamento (ex. 11-12/07, achado da 216) — pega o último fechamento real anterior,
    não um dia vazio.
  - **Regra de dedup MP → 227 (ajuste do Edvam)**: `diferencaAjustada = diferença -
    somaPendenciasMPDoDia` só pra `conta==='mercadopago'` (as outras 3 contas não têm um "227"
    equivalente, ficam com a diferença bruta). `somaPendenciasMPDoDia` vem de
    `conciliarMercadoPagoDoDia` (227) — inclui tanto pendências criadas NESSA rodada quanto as já
    existentes de rodadas anteriores (pra continuar descontando certo mesmo rodando a 228 em dias
    diferentes). `conciliarDia` (orquestração) sempre roda 227 **antes** de 228 e passa o valor —
    documentado explicitamente no código que nunca se deve chamar
    `calcularGapContasSemApi('mercadopago', ...)` sem passar por `conciliarMercadoPagoDoDia`
    antes, senão duplica.
  - Materialidade R$2,00 aplicada em `diferencaAjustada` (não na diferença bruta) — é o valor
    ajustado que decide se cria pendência `saldo_dia_agregado`.
  - Dedup por dia/conta: 1 item `saldo_dia_agregado` por `(conta, data_dia)`, pra sempre — não
    recria mesmo que o item já exista com outro status (`classificado`/`ignorado`), seguindo
    literalmente "1 item por conta por dia" do desenho 225.
- Testes realizados e resultado:
  - `npx tsc --noEmit`/`npm run build` limpos.
  - Checkpoint: reconferi do zero (query própria, não herdada da planilha) 3 casos já auditados
    manualmente pela 216 — Mercado Pago 16/07, RecargaPay 14/07, Caixa Econômica 13/07 — via
    `scripts/investigacao-228-gap-agregado.ts` (mantido no repo): os 3 bateram exatamente
    (entrada, saída, resultado, variação informada, diferença, e o gatilho de materialidade) com
    os valores da planilha da 216.
  - Teste fim a fim de produção contra 21-07-26 (mesmo dia do R$300, `conciliarDia` real, 2
    rodadas — ver detalhe completo no relato da 227): **Mercado Pago** — diferença bruta
    R$36,92 (abaixo do limiar sozinha), mas depois de descontar R$327,50 (soma das 8 pendências
    que a 227 achou no mesmo dia) vira **diferença ajustada de -R$290,58** — acima do limiar,
    gerou pendência `saldo_dia_agregado`. Interpretação confirmada matematicamente (não só
    aceita por inspeção): esse resíduo negativo representa dinheiro que SAIU da conta e não está
    explicado nem pelos lançamentos conhecidos nem pelos pagamentos não vinculados que a 227 já
    encontrou — achado NOVO e DIFERENTE do R$300 (não é o mesmo caso reaparecendo). **Stone**:
    diferença R$0,00 (sem pendência). **RecargaPay**: diferença R$0,01 (abaixo do limiar, sem
    pendência). **Caixa Econômica**: diferença R$87,00 (pendência criada, conta sem nenhuma
    atividade calculável no dia, mesmo padrão já documentado pela 216/222).
  - 2ª rodada do mesmo dia (idempotência): as 4 contas voltaram `pendenciaCriada: false` — nenhuma
    duplicata.
- Achados fora do escopo:
  - Nenhum novo além do já registrado no relato da 227 (padrão recorrente de créditos
    `account_money`/"cofrinho").
- Status final: concluída, testada contra dado real (batendo com a auditoria manual da 216) e em
  produção — mesmo deploy da 227, `dpl_23JrKpG4kf8NDhsyhjLRtwf4Uxv5`, alias confirmado em
  `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
