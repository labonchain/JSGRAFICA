# Desenho — Conciliação automática de entradas/saídas não registradas (demanda 225)

Documento de **desenho**, não implementação. Nenhum código, tabela ou dado de produção foi tocado
pra produzir isto. Objetivo: transformar a divergência diária do fechamento "Sistema" — hoje um
número agregado sem explicação — numa lista de itens específicos que o Admin pode nomear/
classificar, e que essa classificação passe a contar de verdade no fechamento dali pra frente.

Casos reais usados como exemplo (achados na demanda 222, 2026-07-21):
- **R$300,00** aprovado no Mercado Pago hoje (21/07, `bank_transfer`, sem `external_reference`),
  sem nenhum pedido/venda/transferência correspondente no sistema.
- **"Cofrinho do Mercado Pago"** — padrão já documentado de dinheiro real existente numa conta
  digital que nunca foi digitado como entrada/saída em lugar nenhum.

---

## 1. O que é tecnicamente possível, conta por conta

As 6 contas de `CONTAS_ORIGEM` (`lib/dados.ts`) se dividem em 2 grupos bem diferentes pra efeito
de conciliação — isso muda a granularidade do que dá pra construir em cada uma:

### 1.1 — Mercado Pago: tem API real, conciliação item a item é possível

`GET /v1/payments/search` (token em `jsgrafica_mercadopago_config`) devolve cada pagamento
individual: `id`, `date_created`, `transaction_amount`, `status`, `payment_type_id`,
`external_reference`. Isso permite comparar **transação por transação**, não só saldo agregado.

**Lógica de match proposta (por confiança decrescente):**
1. **Alta confiança — por referência**: `external_reference` bate com `ped-XXXX` (id de
   `jsgrafica_pedidos`) ou `venda-...` (id de venda agrupada) → já existe registro, não vira
   pendência. Esse é o caso normal, a maioria dos pagamentos.
2. **Média confiança — por valor + janela de data, sem referência**: quando `external_reference`
   vem vazio (caso do R$300 de hoje) ou não bate com nada, procurar candidato por
   `valor` exato + `date_created` dentro do dia-caixa correspondente, contra pedidos SEM
   `mp_order_id` ainda (ex.: uma Order que nunca foi vinculada por falha de rede, caso que a
   demanda 220 já passou a registrar em `jsgrafica_mercadopago_falhas_cobranca`). Se achar 1
   candidato único, sugerir o vínculo pro Admin confirmar (não vincular sozinho sem confirmação —
   mesma disciplina de nunca aplicar correção automática sem humano no meio).
3. **Sem candidato nenhum** (caso do R$300): vira **item pendente do tipo "pagamento não
   vinculado"** — a unidade é a transação individual do Mercado Pago, com todos os dados que a API
   já devolve prontos (valor, data/hora exata, tipo de pagamento).

### 1.2 — RecargaPay, Stone, Caixa Econômica: sem API, só saldo diário informado — conciliação só por agregado do dia

Essas 3 contas não têm nenhuma API própria hoje (confirmado nas investigações anteriores) — o
único dado real é o saldo que o Admin digita a cada fechamento "Sistema"
(`saldo_recargapay`/`saldo_stone`/`saldo_caixa_economica`). Não dá pra isolar "qual transação
específica" causou uma diferença — só dá pra isolar **"esta conta, neste dia, teve uma variação de
saldo que o sistema não consegue explicar com o que está lançado"**.

Cálculo proposto (a demanda 216 já fez isso manualmente uma vez — a mudança aqui é persistir e
automatizar, não inventar a lógica):
```
variação informada  = saldo_informado_hoje − saldo_informado_ontem   (2 fechamentos "Sistema" consecutivos)
variação calculada  = Σ entradas dessa conta no dia − Σ saídas dessa conta no dia
                       (jsgrafica_pedidos por forma_pagamento + jsgrafica_saidas/transferencias por conta_origem/destino)
diferença           = variação informada − variação calculada
```
Se `|diferença| > limiar de materialidade` (ajustado com o Edvam: R$2,00, mesmo espírito de "não
perseguir centavos" do meu briefing) → vira **item pendente do tipo "diferença de saldo
agregada"**, 1 item por conta por dia (não granular, porque o dado de origem não é granular).

### 1.3 — Dinheiro (Zu/Gabi): já tem um mecanismo equivalente, não precisa de nada novo

`total_fisico` (contado) vs `saldo_acumulado` (calculado) já existe e já vira `divergencia` no
próprio fechamento por operador — é conceitualmente o mesmo tipo de gap do item 1.2, só que já
implementado. Fora de escopo desta demanda mexer nisso; só reaproveitar o mesmo padrão de
"item pendente" pra ele também, se o PM decidir estender depois.

---

## 2. Modelo de dado proposto — `jsgrafica_conciliacao_pendencias` (nome sujeito a ajuste)

Proposta de schema (campos, não é criação de tabela — isso é demanda futura do 02-DADOS):

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `conta` | text | uma de `CONTAS_ORIGEM` |
| `data_dia` | text (DD-MM-AA) | mesmo formato usado em todo o resto do sistema |
| `tipo_origem` | text | `'mercadopago_pagamento'` \| `'saldo_dia_agregado'` (extensível pro futuro) |
| `valor` | numeric | valor do item (ou da diferença, se agregado) |
| `origem_externa_id` | text, nullable | `id` do pagamento no Mercado Pago quando `tipo_origem='mercadopago_pagamento'`; null pro tipo agregado |
| `descricao_sugerida` | text, nullable | ex.: `payment_type_id`/horário do MP, ou "diferença de saldo informado vs calculado" |
| `status` | text | `'pendente'` \| `'classificado'` \| `'ignorado'` |
| `classificacao` | jsonb, nullable | o que o Admin decidiu (ver §3) |
| `classificado_por` | text, nullable | |
| `classificado_em` | timestamptz, nullable | |
| `created_at` | timestamptz | quando o item foi detectado |

**Decisão de design mais importante**: classificar um item não é só "rotular" — o próprio Edvam
pediu que a classificação "conte certo no fechamento dali pra frente". Isso significa que
classificar deve, na maioria dos casos, **gerar o registro real correspondente**:
- Classificado como **Entrada** → precisa de um mecanismo de "entrada avulsa" (hoje o sistema só
  tem entrada via `jsgrafica_pedidos`; não existe uma tabela de entrada solta — isso é uma peça
  nova que teria que ser desenhada/decidida junto com o PM, possivelmente uma tabela leve
  `jsgrafica_entradas_avulsas` ou reaproveitar algo já existente. Registrando como ponto em aberto
  do desenho, não resolvido aqui).
- Classificado como **Saída** → cria uma linha real em `jsgrafica_saidas` (mecanismo já existe).
- Classificado como **Transferência** → cria uma linha real em `jsgrafica_transferencias`
  (mecanismo já existe, demanda 201).
- Classificado como **"Sabido, não é transação real do negócio"** (ex.: um Pix pessoal do Edvam
  caindo por engano na conta da empresa) → não gera nenhum registro financeiro novo, só marca
  `status='classificado'` com esse motivo — serve pra parar de aparecer como pendência, sem
  inflar nenhum total.

---

## 3. Fluxo de UX, em alto nível

1. **No momento do fechamento "Sistema"** (mesma tela onde o Admin já digita
   `saldo_mercadopago`/`saldo_stone`/etc. hoje): antes de finalizar, mostrar um card novo
   **"🔍 Itens não explicados hoje"** — junta (a) pagamentos do Mercado Pago do dia sem vínculo
   achado (§1.1) e (b) a diferença agregada de cada conta sem API (§1.2), calculada com o saldo
   que o Admin acabou de digitar. O Admin pode: classificar ali mesmo, ou deixar pendente e
   fechar o dia mesmo assim (não deve travar o fechamento — o objetivo é visibilidade, não
   burocracia).
2. **Tela separada "🔎 Conciliação"** (nova aba, ou sub-aba do Financeiro): lista TODOS os itens
   `pendente` de qualquer dia, não só hoje — pra resolver depois, no ritmo do Admin, sem precisar
   lembrar disso na hora do fechamento. Mesma tela mostra o histórico de itens já `classificado`,
   pra auditoria.
3. **Classificar um item**: modal simples — tipo (Entrada/Saída/Transferência/Sabido, não é
   transação), categoria (se saída), conta de contraparte (se transferência), data (default = data
   do item). Salvar cria o registro real correspondente (§2) e marca o item como `classificado`.
4. **O que acontece com um fechamento JÁ FECHADO quando um item antigo é classificado depois** —
   ponto mais delicado do desenho, e onde a lição da demanda 217 (cadeia de correção manual que já
   deu errado 2x nesta mesma investigação) tem que ser aplicada: **não recalcular
   `saldo_acumulado` do dia antigo automaticamente**. Em vez disso:
   - O registro real (saída/transferência/entrada) nasce datado pro dia correto — isso já entra
     em qualquer recálculo AO VIVO daquele dia (`getResumoDia`), mas não nos campos já GRAVADOS na
     linha de fechamento antiga.
   - O sistema sinaliza, de forma visível (ex. banner "🔴 fechamento de DD/MM ficou desatualizado,
     precisa recalcular"), que aquele fechamento específico está desatualizado.
   - Recalcular exige uma ação explícita e confirmada do Admin/executor — um dia de cada vez,
     conferindo antes de aplicar, exatamente como a demanda 217 fez manualmente. **Não
     automatizar esse recálculo em cascata** — é o mesmo tipo de correção que já causou 2 rodadas
     de erro nesta investigação quando foi feita às pressas.

---

## 4. Automático ou sob demanda? — recomendação: híbrido

- **Automático, no momento do fechamento "Sistema"**: tanto o matching do Mercado Pago (§1.1)
  quanto o cálculo do gap agregado (§1.2) devem rodar **sem o Admin precisar pedir** — o dado já
  está sendo consultado/digitado nesse momento mesmo (saldo informado, API do MP), então rodar a
  comparação ali custa pouco a mais e ataca direto o problema que motivou esta demanda: a
  divergência crescendo porque ninguém olha pra ela no dia a dia. Deixar isso manual arrisca virar
  "mais uma tela que ninguém abre", repetindo o próprio problema que o desenho tenta resolver.
- **Sob demanda, complementar**: um botão "🔄 conciliar de novo" pra um dia específico ou período —
  útil quando o Admin quer reconferir depois de fazer alguma anotação fora do fluxo diário (ex.:
  descobriu a origem do R$300 dias depois e quer rodar a comparação de novo pra ver se some da
  lista).

---

## 5. Estimativa de esforço e sequência sugerida pro PM

| # | Demanda proposta | Time | Tamanho | Depende de |
|---|---|---|---|---|
| 1 | Criar tabela `jsgrafica_conciliacao_pendencias` (schema §2) | 02-DADOS | Pequeno (mesmo padrão da 221) | — |
| 2 | Matching de pagamentos do Mercado Pago sem vínculo (§1.1), rodando na hora do fechamento "Sistema" | 03-APP | Médio (a lógica de match já foi feita manualmente várias vezes nesta auditoria — é mais organizar que inventar) | 1 |
| 3 | Cálculo do gap agregado por conta sem API (§1.2) | 03-APP | Pequeno-médio (reaproveita a lógica da planilha da demanda 216, só persistida em vez de relatório avulso) | 1 |
| 4 | UI de itens pendentes: card no Fechar Caixa + tela "Conciliação" + fluxo de classificação (§3.1-3.3) | 03-APP | Médio-grande (é a parte mais trabalhosa/visível) | 1, 2, 3 |
| 5 | Mecanismo de "fechamento desatualizado" + recálculo manual confirmado (§3.4) | 03-APP | Pequeno em código, mas exige cuidado de desenho — é o ponto mais delicado | 4 |
| — | Mecanismo de "entrada avulsa" (peça em aberto do §2, classificar como Entrada) | 02-DADOS + 03-APP | A decidir com o PM — pode nascer junto com a 1, ou depois | 1 |

Sequência recomendada: **1 → 2 e 3 em paralelo → 4 → 5 por último**, quando o resto já estiver
estável em produção (5 é o que mexe com fechamento já fechado, o tipo de mudança que mais gerou
retrabalho nesta investigação — melhor não empilhar risco em cima de peças ainda não testadas).

---

## Riscos e decisões — confirmadas com o Edvam em 2026-07-22

- **Mecanismo de "entrada avulsa" (§2): confirmado, precisa ser construído.** `jsgrafica_saidas`
  já funciona avulsa por padrão (nenhuma saída manual lançada até hoje tem vínculo de pedido) —
  o lado de entrada é que não tem equivalente (toda entrada hoje obrigatoriamente vem de
  `jsgrafica_pedidos`). Essa é a peça nova real do desenho, não um detalhe pequeno.
- Limiar de materialidade ajustado pra **R$2,00** (era R$5,00 na proposta inicial).
- Este desenho não cobre Dinheiro (Zu/Gabi) — já tem mecanismo equivalente (`total_fisico` vs
  `divergencia`), fora do escopo pedido pela 225.
