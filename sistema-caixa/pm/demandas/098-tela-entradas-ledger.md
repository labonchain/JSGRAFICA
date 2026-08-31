# 098 — Tela nova "📥 Entradas" (ledger de lançamentos)

Status: concluída
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Item A5 do checklist e item 1 da IA de 5 abas (`pm/conhecimento/proposta-fluxo-financeiro.md`).
Hoje não existe nenhuma tela assim: `TelaFinanceiro.tsx` só mostra agregado (soma por período),
nunca lançamento por lançamento. É o equivalente, do lado das entradas, ao que "Lançar Saídas" já
tem pro lado das saídas desde a demanda 091 (painel "Lançamentos de hoje").

## Objetivo
Uma lista cronológica de tudo que é entrada de dinheiro — venda de balcão, pedido do WhatsApp
pago, abertura de caixa, fechamento (geral e por operador) — pra quem quiser conferir "o que
aconteceu hoje" sem esperar o agregado do Financeiro.

## Escopo
- Incluído:
  1. Tela nova no menu (grupo Financeiro), acessível ao Admin. PDV: confirmar com o Edvam se
     Zu/Gabi veem só os próprios lançamentos (mesma regra de acesso que "Financeiro" já usa hoje,
     que é visível pro PDV filtrado por operador) — não presumir, seguir o mesmo padrão de
     visibilidade da tela mais parecida (`TelaFinanceiro.tsx`) se não houver instrução em
     contrário.
  2. Lista com: hora, tipo de evento (venda balcão / pedido pago / abertura de caixa /
     fechamento), operador, valor. Ordenada mais recente primeiro.
  3. Fonte de dados: juntar `jsgrafica_vendas`, `jsgrafica_pedidos` (status entregue/pago),
     `jsgrafica_abertura_caixa` e `jsgrafica_fechamento` do dia — reaproveitar os helpers que já
     existem (`getResumoDia`, `limitesDiaCaixaUTC`) em vez de escrever novas queries de zero,
     mesmo cuidado de paginação que as demandas 041/043 já corrigiram (não buscar tabela inteira
     sem filtro de dia).
  4. Filtro por data e por operador, mesmo padrão visual das outras telas do sistema.
- Fora de escopo: qualquer edição/lançamento manual aqui — é só leitura, entradas continuam sendo
  geradas pelos fluxos que já existem (venda, pedido, abertura, fechamento). Contas a receber
  futuras (previsto) não aparecem aqui — só o que já é fato.

## Critérios de aceite
- [x] Lista mostra vendas de balcão, pedidos pagos, aberturas e fechamentos do dia, em ordem
- [x] Filtro por data funciona (não só hoje)
- [x] Nenhuma query sem filtro de dia direto no banco (evitar o bug das demandas 041/043)
- [x] Visual usa os mesmos componentes/classes já usados no resto do admin (não recriar estilo do
      zero — mesmo cuidado que motivou a correção da demanda 094)

## Riscos e cuidados
Mudança aditiva (tela nova) — pode ir a qualquer momento, sem esperar horário seguro. Único
cuidado técnico: reaproveitar os helpers de agregação já existentes em vez de duplicar lógica de
soma que já existe em `lib/supabase-admin.ts`.

## Referências
`components/TelaFinanceiro.tsx` (tela mais parecida, mesma visibilidade de acesso), `lib/
supabase-admin.ts` (`getResumoDia`, `limitesDiaCaixaUTC`), `jsgrafica_vendas`,
`jsgrafica_pedidos`, `jsgrafica_abertura_caixa`, `jsgrafica_fechamento`. Demanda 091 (mesmo
conceito do lado das saídas).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
1. **`app/api/entradas/route.ts`** (novo) — `GET ?dia=DD-MM-AA&operador=Nome`. Junta 4 fontes,
   cada uma filtrada por dia (nunca tabela inteira):
   - `jsgrafica_vendas` — filtro direto `eq('data_dia', dia)` (legado, pré-demanda 054, ainda
     tem dado real em dias antigos).
   - `jsgrafica_pedidos` (`status='entregue'`) — filtro por `data_entregue_at` numa janela UTC
     do dia via `limitesDiaCaixaUTC` (mesma função que `getResumoDia` já usa), distinguindo
     "venda balcão" (`telefone === 'balcao'`) de "pedido pago" (telefone real) só na exibição.
   - `jsgrafica_abertura_caixa` — filtro `eq('data_dia', dia)`.
   - `jsgrafica_fechamento` — filtro `eq('data_dia', dia)`, distinguindo geral vs. por operador
     com `ehFechamentoGeral()` (já exportado de `lib/supabase-admin.ts`, mesma regra da 092).
   Tudo ordenado por horário decrescente no fim. Filtro `operador` aplicado em cada fonte
   individualmente (exclui fechamento geral quando filtrando por 1 operador específico).
2. **`components/TelaEntradas.tsx`** (novo) — reaproveita classes reais já catalogadas na
   correção da demanda 100 (mesmo wrapper `overflow-y-auto h-full bg-gray-50`, cards `bg-white
   rounded-xl border border-gray-200 p-5`, seletor de período custom de `TelaFinanceiro.tsx`).
   Lista de lançamentos usa o mesmo padrão de card tingido do painel "Lançamentos de hoje" de
   Lançar Saídas (demanda 091), com cor por tipo de evento (verde = venda/pedido, azul =
   abertura, cinza = fechamento) em vez de só vermelho.
3. **Acesso PDV**: sem instrução em contrário, segui o padrão real de `TelaFinanceiro.tsx` — que,
   ao conferir o código (não supor), **não filtra por operador nem restringe acesso** pro PDV
   (mesmo componente, sem props, usado idêntico no admin e no PDV). Adicionei "Entradas" com a
   mesma visibilidade (visível a Zu/Gabi no PDV também), com filtro de operador manual disponível
   pra qualquer um usar, não como restrição de acesso. **Decisão registrada aqui pra fácil
   reversão** caso o Edvam prefira restringir só ao Admin.
4. Aba adicionada ao grupo "💰 Financeiro" em `app/page.tsx` e `app/pdv/page.tsx` (antes de
   "Lançar Saídas"), seguindo o padrão de navegação em 2 fileiras da demanda 087.

### Testes realizados e resultado
1. **API isolada**: `GET /api/entradas` (hoje) retornou 109 lançamentos reais (vendas balcão +
   pedidos pagos), corretamente ordenados por horário. Testado dia `06-07-26` (com fechamento
   real registrado) — confirmado que aparecem **tanto** "Fechamento geral do dia" (Sistema) quanto
   "Fechamento de Gabi" quando sem filtro, e **só** "Fechamento de Gabi" quando filtrando
   `operador=Gabi` (exclui o geral corretamente).
2. **UI real via Playwright** (login de verdade, não simulação): admin (`admin.jsgrafica.site`
   local) — tela renderizando certo, total R$624,25, 109 lançamentos, filtro por operador (Zu:
   22 lançamentos; Gabi: 56 lançamentos, R$279,80) funcionando ao vivo. Durante o teste apareceu
   um lançamento real de "Abertura de caixa" (Zu, R$50) — confirmado depois com o Edvam que foi
   um teste real dele minutos antes (não um bug); o registro já tinha sido removido quando
   reconferi.
3. **PDV em produção**: logando como Edvam (admin — pula o novo portão de abertura de caixa,
   demanda 103, que só se aplica a Zu/Gabi), confirmei a aba "Entradas" aparecendo dentro do
   grupo Financeiro com os mesmos 109 lançamentos/R$624,25. Evitei deliberadamente logar como
   Zu/Gabi em produção pra não disparar o portão de abertura de caixa de verdade (criaria um
   registro real de abertura pra essas pessoas só pra testar navegação) — o componente em si é
   idêntico ao já validado no admin, só a navegação muda entre os dois apps.
4. `npx tsc --noEmit` limpo, `npm run build` sem erro, `npx eslint` sem classe de erro nova além
   do baseline já existente no projeto.
5. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_1H2FJ3vpWPSkeTsSaMjnYLZqsXAS`**.

### Achados fora do escopo
- **Decisão de acesso PDV documentada, não presumida às cegas**: o texto da própria demanda
  afirma que "Financeiro... é visível pro PDV filtrado por operador", mas conferindo
  `components/TelaFinanceiro.tsx` diretamente, ele **não recebe nenhuma prop de operador** e
  mostra o mesmo agregado pra qualquer um, sem filtro nenhum — a premissa da demanda não bate com
  o código atual. Segui a instrução de fallback explícita ("seguir o mesmo padrão... se não
  houver instrução em contrário") e apliquei visibilidade igual, sem restrição. Fácil de mudar
  pra admin-only se o Edvam preferir (é só mover `id: "entradas"` pra dentro do `soAdmin` — já
  está marcado assim no array do admin, só falta removê-la do array do PDV).
- `jsgrafica_abertura_caixa` estava vazia antes do teste do Edvam de minutos atrás — é uma tabela
  nova (demanda 074/103), ainda sem uso real consistente; o ledger já está pronto pra mostrar
  esses eventos assim que a rotina pegar.

### Status final
Concluída e deployada em produção (`dpl_1H2FJ3vpWPSkeTsSaMjnYLZqsXAS`). Todos os 4 critérios de
aceite confirmados com dados reais, admin e PDV, local e produção.
