# 194 — Movimento vira o dashboard geral de resumo do Financeiro

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-28
Chat executor: 03 - APP JS GRAFICA

## Contexto
Demanda 186 listou problemas de layout em "Movimento" (3 relatórios dentro da aba, confusão de
nome com "Fechar Caixa", navegação de 3º nível). O Edvam foi além do ajuste visual: decidiu que
**Movimento deveria ser o dashboard geral** — resumo de entradas, saídas, produtos e métricas do
negócio, não só mais um relatório entre outros. Isso é maior que redesenho de layout — é redefinir
a função da tela.

## Objetivo
Movimento vira a visão geral do Financeiro — o lugar que resume o que está acontecendo no negócio
(entradas, saídas, produtos mais vendidos, métricas-chave), não só gráficos de fluxo de caixa.

## Escopo
- Incluído:
  1. Propor o que entra no resumo geral antes de construir — decisão do executor sobre o
     conteúdo exato, mas cobrindo no mínimo: entradas x saídas do período (o que já existe, os
     "3 relatórios" atuais podem virar seções dessa visão em vez de telas separadas), produtos/
     serviços mais vendidos (dado já existe em outras análises deste projeto, ex. demanda 161),
     alguma métrica de saúde do caixa (ex. divergência recorrente, dias sem fechar).
  2. Levar a proposta de conteúdo (esboço, sem precisar ser visual ainda) pro PM/Edvam validar
     ANTES de construir a tela de verdade — esse é um escopo grande o suficiente pra merecer
     alinhamento de conteúdo primeiro, layout depois.
  3. Depois de aprovado o conteúdo, construir e mandar print pra validação final (mesmo processo
     da 193).
- Explicitamente fora de escopo: mexer nos dados/cálculos que já existem em outras telas (essa
  demanda é sobre reunir e apresentar, não recalcular do zero).

## Critérios de aceite
- [x] Proposta de conteúdo do dashboard validada pelo Edvam antes de construir
- [x] Dashboard construído reunindo entradas/saídas/produtos/métricas
- [x] Print mandado pro PM/Edvam antes do deploy final
- [x] Testado com dado real

## Riscos e cuidados
Escopo grande de propósito — não pular a validação de conteúdo antes de construir, evita retrabalho
grande se a visão não bater com o que o Edvam imaginava.

## Referências
Demanda 186 (achado original sobre Movimento). Demanda 161 (produtos mais pedidos, métricas já
levantadas antes, reaproveitar se fizer sentido).

## Relato de execução
**Etapa 1 (2026-07-15): proposta de conteúdo — aguardando validação do Edvam antes de construir**
(como o escopo exige; nada foi construído ainda).

### Proposta: "Movimento" vira "📊 Visão Geral" do negócio
Aba renomeada (resolve de vez a confusão com "Fechar Caixa"); os 3 relatórios atuais deixam de
ser um menu de 3º nível e viram SEÇÕES de uma página só, com um único seletor de período no
topo (Hoje / 7 dias / 30 dias / personalizado — o mesmo padrão visual da 193). Conteúdo, de
cima pra baixo:

1. **Números do período** (cards): Entradas · Saídas · Resultado (entradas − saídas) ·
   nº de vendas/pedidos · ticket médio. Cada card com rótulo do que inclui (T4 da 186).
2. **Saúde do caixa** (a métrica nova que a demanda pede): dias sem fechamento geral (alerta
   se > 1), divergência dos últimos 7 fechamentos (soma e pior dia), pagamentos pendentes
   (qtd + R$, mesma conta do panorama da 175) e estornos MP detectados (178). É o "algo está
   errado?" de relance.
3. **Entradas × Saídas por dia** — o gráfico que já existe no Fluxo de Caixa, agora como seção.
4. **Formas de pagamento no período** — Dinheiro/Pix/Cartão (dado que já existe no dashboard).
5. **Produtos/serviços mais vendidos** — top 10 por quantidade e por valor (reaproveita o
   `topProdutos` que o balcão já usa; mesma linha da 161).
6. **Saídas por categoria** — o "Relatório de Saídas" atual vira seção compacta.
7. **Fechamentos recentes** — o "Controle de Caixa" vira uma tabela curta (últimos 7, por
   operador) com atalho pra aba Fechar Caixa.

**Fora**: nenhum recálculo novo — tudo acima já existe em APIs do projeto (dashboard,
fechamento, saídas, diagnóstico); a tela só reúne. O rótulo "Relatórios" do PDV continua (115).

### 3 perguntas pro Edvam decidir junto com a validação
1. Período padrão ao abrir: **Hoje** ou **últimos 7 dias**? (sugestão: 7 dias — "visão geral"
   de 1 dia só fica pobre; "hoje" já existe nas outras telas)
2. Ok renomear a aba "Movimento" → "Visão Geral"?
3. Alguma métrica que você olha hoje em outro lugar (papel, planilha, cabeça) que deveria
   estar aqui?

## Respostas do Edvam (2026-07-28) — conteúdo validado, liberado pra construir

1. **Período padrão: personalizável** — não travar num valor fixo (Hoje ou 7 dias); o Admin
   escolhe e o sistema deveria lembrar a última escolha dele, não resetar pro mesmo default
   toda vez que abre a tela.
2. **Confirmado**: renomear "Movimento" → "Visão Geral".
3. **Preocupação principal não é métrica nova, é layout**: o Edvam foi claro que o que mais
   importa aqui é COMO essas 7 seções vão ser organizadas na tela — risco real de ficar
   desproporcional/poluído se só empilhar tudo. **Isso vira critério de aceite explícito**:
   antes de considerar pronto, a hierarquia visual precisa deixar claro o que é mais importante
   (Números do período + Saúde do caixa, provavelmente no topo, mais destaque) vs. o que é
   consulta secundária (Formas de pagamento, Saídas por categoria, Fechamentos recentes — mais
   compacto, sem brigar por atenção com os cards principais). Mandar print ANTES do deploy final
   continua obrigatório (já era escopo), com atenção específica a isso, não só "ficou bonito".

## Etapa 2 (2026-07-28): construído, validado por print e deployado

### O que foi feito
- `components/TelaFinanceiro.tsx` reescrito: os 3 relatórios (Fluxo de Caixa / Controle de
  Caixa / Relatório de Saídas) deixaram de ser abas de 3º nível e viraram seções de uma página
  só, na ordem definida na proposta. Aba renomeada "Movimento" → "Visão Geral" em `app/page.tsx`
  e `app/pdv/page.tsx`.
- Período: `Hoje / 7 dias / 30 dias / Personalizado`, sem default fixo — a última escolha é
  salva em `localStorage` (`jsgrafica-visao-geral-periodo`) e restaurada na abertura seguinte.
  "7 dias"/"30 dias" reaproveitam o mecanismo de período customizado que a API já tinha
  (`de`/`ate`), sem criar preset novo no backend.
- `app/api/dashboard/route.ts` estendido (aditivo, nenhum campo existente mudou) com o bloco
  `saudeCaixa`: dias sem fechamento geral, divergência dos últimos 7 fechamentos (soma + pior
  dia), pagamentos pendentes (reaproveitando o filtro do panorama da 175, re-escopado por
  período) e estornos MP (178).
- Hierarquia visual (critério de aceite explícito do Edvam): Números do período + Saúde do
  caixa no topo, em cards de destaque; gráfico/formas de pagamento/saídas por categoria/produtos/
  fechamentos recentes abaixo, em blocos compactos. "Fechamentos recentes" tem atalho "Ver
  histórico completo →" que abre a aba Fechar Caixa.
- Nenhum recálculo novo, conforme o "fora de escopo" da demanda — toda a seção reaproveita dado
  que já vinha de `/api/dashboard` (inclusive `topProdutos`, pré-existente).

### Testes realizados
- `npx tsc --noEmit` e `npm run build` limpos.
- `/api/dashboard` chamado direto com dado real de produção (`periodo=hoje` e período
  customizado de 4 semanas) — números conferidos manualmente.
- Prints via Playwright (login por bypass de sessão local, sem afetar produção) contra o dev
  server: hierarquia visual, seção "Fechamentos recentes" (exige rolar um container interno,
  não o documento) e troca de período "30 dias" — os 3 prints ficam em `pm/demandas/194-prints/`.
- Persistência de período testada explicitamente (pedido do Edvam ao revisar os prints):
  selecionado "30 dias", confirmado no `localStorage`, e reaberto com navegação nova (não SPA)
  — voltou direto em "30 dias" com os dados recarregados, sem resetar pro default.
- Print revisado e aprovado pelo Edvam (2026-07-28) antes do deploy final.
- Deploy: `npx vercel --prod --yes` (aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`).

### Achados fora do escopo (não corrigidos aqui)
- "Dizu Refeições (pagamento cartão)" aparece no top produtos — contaminação cruzada de log já
  conhecida (ver `project_log_dados_contaminados.md`), não é dado real da JS Gráfica.
- Em "Formas de pagamento" (30 dias), uma fatia grande "Não informado" (R$6.080,63) — volume
  relevante de vendas sem forma de pagamento registrada no período. Achado do próprio Edvam ao
  revisar o print; vale investigar como demanda separada, não bloqueou este deploy.
- "ENTRADA DIVERSAS" aparece com quantidade igual ao valor em R$ (ex.: "2975,89 un" pra 30
  dias) — dado legado em `jsgrafica_vendas` onde `quantidade` foi gravado igual a `total` em
  alguns lançamentos antigos (confirmado direto na tabela, não é bug desta tela). Fora de escopo
  (demanda explicitamente não recalcula dado existente).

### Status final: concluída

