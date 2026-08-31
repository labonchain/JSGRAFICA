# 120 — Financeiro: selecionar "Esta semana" (ou outro período) não atualiza os dados mostrados

Status: concluída — deployada em produção (bug principal do seletor de período). ⚠️ O "achado extra" investigado dentro desta demanda teve uma conclusão errada do executor, corrigida pelo PM em 2026-07-08 — ver seção "🔴 CORREÇÃO DO PM" no relato.
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Edvam relatou (com print) que na tela "📊 Relatórios" (Fluxo de Caixa), clicando "Esta semana"
(botão fica destacado, visualmente selecionado), os números mostrados continuam sendo só os de
hoje — R$20,00, "1 dia com movimento" — em vez da semana inteira.

**PM já investigou e confirmou onde NÃO está o bug**: testei `GET /api/dashboard?periodo=semana`
direto e a API retorna os dados certos da semana inteira:
```
resumo.totalEntradas: 689,25 (crescendo em tempo real, sistema em uso)
resumo.diasRegistrados: 3, diasComMovimento: 2
resumo.melhorDia: 07-07-26, R$624,25
historico: 06-07-26 (R$0, âncora), 07-07-26 (R$624,25), 08-07-26 (parcial, hoje)
```
Isso bate exatamente com o que a tela **deveria** mostrar, mas não mostra. O valor que a tela
mostra (R$20,00, 1 dia) bate **exatamente** com `GET /api/dashboard?periodo=hoje` — ou seja, o
botão "Esta semana" fica visualmente selecionado mas os dados continuam sendo os de "Hoje".

**Achado extra, investigar também**: comparando os campos da própria resposta de `periodo=semana`,
`entradasPorFormaPagamento` soma ~R$1.687 (Dinheiro 392,25 + Cartão 117,70 + Pix 432,85 + "Não
informado" 744,94) — bem mais que o `resumo.totalEntradas` (~689). Pode ser problema de escopo
diferente (ex. contando forma de pagamento de um período maior por engano), pode ser
coincidência de dado ainda mudando em tempo real (sistema em uso agora) — conferir com calma,
sem reaproveitar dado ao vivo pra não confundir causa real com flutuação normal.

## Objetivo
Selecionar qualquer período (Esta semana, Este mês, 3 meses, ano, todo histórico, ou datas
customizadas) atualiza de verdade os números mostrados na tela — bate com o que a API retorna
pra aquele período.

## Escopo
- Incluído:
  1. Investigar `components/TelaFinanceiro.tsx` (ou o componente do relatório "Fluxo de Caixa"
     dentro dela, construído pela demanda 101) — o clique no botão de período está de fato
     chamando a API com o `periodo` novo? O estado que guarda os dados está atualizando depois da
     resposta, ou fica preso no primeiro carregamento ("Hoje", que é o padrão inicial)?
  2. Corrigir a causa raiz encontrada.
  3. Investigar o achado extra (`entradasPorFormaPagamento` não bater com `resumo.totalEntradas`)
     — reportar o que encontrar, mesmo que decida que não é bug (ex. se for escopo diferente por
     design, explicar por quê).
- Fora de escopo: mudar o cálculo em si dos números — só garantir que a tela reflete o período
  selecionado corretamente.

## Critérios de aceite
- [x] Selecionar "Esta semana" mostra os valores reais da semana (conferir contra a API direta)
- [x] Mesmo teste com "Este mês" e "Todo histórico" — confirmar que não é só o botão "semana"
- [x] Causa raiz relatada (não só "corrigido", explicar o que estava errado)
- [x] Achado do `entradasPorFormaPagamento` investigado e reportado

## Riscos e cuidados
Tela usada por Admin e PDV (Zu/Gabi) — pode ir a qualquer momento, é correção de bug de
visualização, não muda nenhum dado gravado.

## Referências
`components/TelaFinanceiro.tsx`, `app/api/dashboard/route.ts`. Demanda 101 (construção do menu de
relatórios nomeados, onde isso deveria já funcionar).

## Relato de execução

**Status final: concluída — deployada em produção**

### Causa raiz do bug principal
`components/TelaFinanceiro.tsx` — cada botão de preset de período
(Hoje/Esta semana/Este mês/3 meses/ano/Todo histórico) só fazia
`setModoCustom(false); setPeriodo(p.id);` no `onClick`. Nunca chamava `buscar()`. O único
`useEffect` que chama `buscar()` roda 1 vez só, no mount (`[]` de dependências) — nada mais no
componente reage a `periodo` mudando. Resultado: o botão clicado ficava destacado (a classe CSS
lê `periodo` corretamente), mas `dados` (o estado que alimenta toda a tela) continuava sendo a
resposta do fetch inicial, sempre "Hoje". Só o botão "Visualizar" (usado pelo fluxo de período
customizado/operador) de fato chamava `buscar()` de novo.

### Correção aplicada
Cada botão de preset passou a chamar `buscar(p.id, operador)` diretamente no `onClick`, sem
depender do estado `periodo` (que ainda não teria atualizado no mesmo clique por causa do
batching do React):
```tsx
onClick={() => { setModoCustom(false); setPeriodo(p.id); buscar(p.id, operador); }}
```
Comentário adicionado acima do `useEffect` inicial explicando a causa raiz pra não se repetir.
Nenhuma outra lógica tocada — período customizado (datas digitadas) e filtro de operador
continuam exigindo "Visualizar" de propósito (usuário pode ainda estar ajustando antes de
aplicar; preset é 1 clique só e decisivo).

### Testes realizados
1. `npx tsc --noEmit` limpo. `npm run build` limpo. `npx eslint` aponta 1 erro pré-existente,
   não relacionado a esta mudança (`react-hooks/set-state-in-effect` no `useEffect` inicial, que
   já chamava `buscar()` de forma síncrona antes desta demanda — só o comentário acima dele
   mudou, o corpo do efeito não).
2. Arquivos financeiros (`TelaFechamento.tsx`, `api/fechamento/*`, `api/saidas/*`) conferidos por
   timestamp — nenhum tocado além de `TelaFinanceiro.tsx`.
3. Deploy em produção: `npx vercel --prod --yes` → `dpl_93jbEJVRCUZtnnRUytUSd8jEp4vi`.
4. **Teste com cliques reais (Playwright, `admin.jsgrafica.site`, aba Financeiro → sub-aba
   Financeiro → "Fluxo de Caixa")**, cobrindo mais de um período (pedido explícito do critério de
   aceite):
   - "Hoje" (carregamento inicial): R$ 46,65.
   - Clique em "Esta semana": R$ 670,90 — diferente de "Hoje", confirma que o clique disparou
     nova busca.
   - Clique em "Este mês": R$ 4.790,29 — diferente dos dois anteriores.
   - Clique em "Todo histórico": R$ 136.717,04 — 209 dias com movimento, valor claramente
     distinto dos demais.
   Os 3 valores mudando de forma consistente com o período selecionado (não só "semana") confirma
   a correção — antes da 120, os 4 cliques teriam mostrado sempre R$ 46,65.

### Achado extra investigado: `entradasPorFormaPagamento` × `resumo.totalEntradas`

**🔴 CORREÇÃO DO PM (2026-07-08) — a "correção" abaixo (do executor) está errada, revertendo de
volta pro achado original.** O executor desta reabertura não tinha visibilidade de uma correção
manual que eu (PM) já tinha feito horas antes, direto no Supabase — por isso concluiu (de boa fé,
mas incorretamente) que o bug nunca existiu.

**Linha do tempo real, com prova:**
1. A demanda 120 original achou, corretamente, que `06-07-26`/`fechado_por='Sistema'`
   (`id dc119243-...`, a âncora da demanda 090) tinha `total_entradas`/`total_saidas` zerados —
   isso **era real**, eu mesmo confirmei de forma independente antes de qualquer correção,
   consultando a linha direto via Supabase REST.
2. Rastreei a causa: não era bug de gravação nem workflow externo — era o registro-âncora da
   demanda 090 (que eu mesmo criei nesta sessão), com `total_entradas`/`total_saidas` zerados **de
   propósito** na hora (era só pra ancorar o `saldo_acumulado` físico contado, não representava o
   dia real). O gap já tinha sido sinalizado ao 02-DADOS desde a demanda 075 e nunca resolvido.
3. Apresentei os números reais (107 pedidos entregues = R$998,49; 7 saídas = R$387,57) ao Edvam,
   que aprovou o ajuste.
4. Apliquei a correção **direto via Supabase REST** (fora do código do app, sem passar por
   nenhuma demanda de app): `PATCH` só em `total_entradas` (→998.49) e `total_saidas` (→387.57) —
   **sem tocar** em `created_at`/`fechado_em`/`saldo_acumulado`/`saldo_anterior`. Confirmei o
   resultado com uma nova consulta antes de considerar concluído. Isso já estava documentado no
   topo do `STATUS.md` ("Correção direta de dados pelo PM, 2026-07-08") — o executor não
   cruzou essa entrada antes de reabrir a investigação.

**Por que a re-checagem do executor não viu nada de errado**: exatamente porque meu `PATCH` não
alterou `created_at`/`fechado_em`, não sobrou nenhum "rastro de edição" pra diferenciar "sempre
foi 998.49" de "foi corrigido pra 998.49 mais cedo hoje". Os testes que o executor rodou depois
(números batendo) **confirmam que a correção funcionou**, não que o bug nunca existiu.

**Conclusão certa**: o bug era real (âncora com valor zerado indevidamente pro efeito de
relatório), já foi corrigido (por mim, manualmente, com aprovação do Edvam), e os testes do
executor — batendo exatamente — são a confirmação de que a correção pegou, não uma prova de que
nunca houve problema. Não é necessário fazer mais nada aqui além de registrar a linha do tempo
certa.

---

*Texto original do executor abaixo, mantido para histórico — a conclusão dele estava errada pelo
motivo explicado acima, mas os testes técnicos em si (a API bate consigo mesma) continuam válidos
como confirmação pós-fix, não como refutação do achado original.*

**O que eu tinha escrito antes (texto do executor, conclusão errada):** que o fechamento geral
automático ("Sistema") de 06-07-26 tinha gravado `total_entradas = R$ 0,00` apesar de haver
R$ 998,49 em pedidos reais naquele dia, e que isso explicava a maior parte do gap que o Edvam viu.
Cheguei a essa conclusão com 2 consultas SQL diretas ao Supabase que, na hora, retornaram `0.00`
para essa linha.

**O que a re-checagem mostrou:** consultando a mesma linha de novo (`data_dia='06-07-26',
fechado_por='Sistema'`), o valor está, agora, em `total_entradas = 998.49` — batendo exatamente
com a soma dos pedidos entregues daquele dia (**isso é o resultado esperado da correção do PM**,
não evidência de que o valor "sempre esteve" assim). Testei direto na API de produção pra
confirmar sem depender só do banco:
```
GET /api/dashboard?de=06-07-26&ate=06-07-26
  resumo.totalEntradas: 998.49
  soma(entradasPorFormaPagamento): 219.25 + 71.70 + 302.15 + 405.39 = 998.49  ← bate exato

GET /api/dashboard?de=01-07-26&ate=06-07-26 (6 dias, período fechado, sem "hoje" no meio)
  resumo.totalEntradas: 5117.88
  soma(entradasPorFormaPagamento): 5117.88  ← bate exato

GET /api/dashboard?periodo=semana (dado corrente, incluindo hoje)
  resumo.totalEntradas: 1779.89
  soma(entradasPorFormaPagamento): 1779.89  ← bate exato
```
Ou seja: reproduzindo agora, com calma, os dois números **batem exatamente** em 3 cenários
diferentes (1 dia isolado, período fechado de 6 dias, semana corrente com "hoje" ao vivo). Não
encontrei nenhum caso reproduzível de divergência. A explicação mais provável pro `0.00` que vi
antes é leitura inconsistente/desatualizada na hora (réplica de leitura do Supabase ainda não
sincronizada, ou erro meu de cópia entre as duas consultas) — não um bug de gravação real. Não
consegui reproduzir de novo em nenhuma tentativa posterior.

**"Conclusão revisada" do executor (❌ superada, ver correção do PM no topo desta seção):** o
texto original concluía aqui que não havia bug real. **Isso está errado** — havia, sim, um bug de
dado real (a âncora da demanda 090 com `total_entradas`/`total_saidas` zerados), só que já tinha
sido corrigido pelo PM antes desse re-teste rodar, sem deixar rastro de edição visível nos
timestamps. Os números batendo "quando checados com calma" são a correção funcionando, não a
ausência de bug. Ver a seção "🔴 CORREÇÃO DO PM" no início deste bloco pra linha do tempo completa
e a fonte da verdade (`STATUS.md`, entrada "Correção direta de dados pelo PM, 2026-07-08").

Sobre o outro ponto já descartado antes (barras de Dinheiro/Cartão/Pix aparentemente "não
atualizando" entre período): confirmado que é falso alarme — poucas transações têm
`forma_pagamento` preenchido (campo existe só desde a demanda 066) e todas caem dentro de
qualquer janela testada; o grosso do valor histórico cai em "Não informado", que cresce
normalmente conforme o período aumenta. Comportamento esperado, não bug.

**Recomendação:** nada a corrigir por enquanto — sem bug reproduzível encontrado. Se o Edvam ver
o gap de novo, o mais útil é capturar print + horário exato pra eu conseguir comparar contra o
banco no mesmo instante, em vez de investigar depois com dado que já mudou.

### Status final
Concluída e deployada em produção (`dpl_93jbEJVRCUZtnnRUytUSd8jEp4vi`). Bug principal corrigido e
testado com cliques reais em 3 períodos diferentes (não só "semana"). Achado extra investigado a
fundo; a causa raiz reportada inicialmente (fechamento "Sistema" de 06-07-26 zerado) **não se
confirmou** numa re-checagem feita durante a demanda 122 — os números batem exatamente quando
testados com calma. Seção corrigida no próprio arquivo com a re-checagem completa, deixando
registrado o erro e o motivo dele não ter se sustentado.
