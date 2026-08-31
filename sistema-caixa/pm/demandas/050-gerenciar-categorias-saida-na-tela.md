# 050 — Adicionar/editar categorias na tela de Lançar Saídas

Status: aprovada — depende da 049 (tabela precisa existir primeiro)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Continuação da 049. Pedido do Edvam: a tela de "Lançar Saídas" (aba do admin) precisa permitir
adicionar categoria nova e editar as existentes, não só escolher entre as 11 fixas.

## Objetivo
Atendente/admin consegue criar e editar categoria de saída direto na tela, sem precisar de
deploy de código.

## Escopo
- Incluído:
  1. Trocar `CATEGORIAS_SAIDA` (import de `lib/dados.ts`) por uma busca em
     `jsgrafica_categorias_saida` (só `ativo = true` pro grid de seleção normal).
  2. Botão simples de "+ Nova categoria" na mesma tela — abre um campo pra digitar o nome, gera
     o `id`/slug automaticamente (ex. normalizar acentos/espaços), grava na tabela.
  3. Opção de editar nome de categoria existente e marcar como inativa (soft delete — não
     apagar, só desativar, pra não perder o vínculo com saídas históricas que já usam aquele
     `categoria_id`). Seguir o mesmo padrão visual/interação já usado na aba "Produtos" do
     admin (tabela editável inline, toggle ativo/inativo) — não inventar um padrão de UI novo.
  4. Reaproveitar o mesmo cuidado de usabilidade das outras telas construídas hoje (equipe tem
     pouca familiaridade com sistema): poucos cliques, nada de arrastar/gestos complexos.
- Fora de escopo: mudar a estrutura de `jsgrafica_saidas` em si; qualquer categoria de venda
  (isso é só saídas).

## Critérios de aceite
- [ ] Grid de categorias na tela de Lançar Saídas vem do banco, não do código
- [ ] Consegue criar categoria nova pela tela e ela aparece disponível pra lançar saída na hora
- [ ] Consegue editar nome de categoria existente
- [ ] Consegue desativar categoria sem apagar (histórico de saídas antigas continua íntegro)
- [ ] Testado criando, editando e desativando uma categoria de teste

## Riscos e cuidados
Desativar categoria não pode quebrar a exibição de saídas antigas que já usam aquele
`categoria_id` (dashboard, relatórios) — só esconder do grid de seleção pra lançamento novo.

## Referências
Demanda 049 (dependência, tabela `jsgrafica_categorias_saida`). `lib/dados.ts`
(`CATEGORIAS_SAIDA`, a remover/parar de usar). `app/page.tsx` (seção "Selecione a categoria de
saída"). Aba "Produtos" do admin — referência de padrão de tabela editável já existente.

## Relato de execução

### O que foi feito
- Criada `app/api/categorias-saida/route.ts`: `GET` (com `?all=true` opcional pra incluir
  inativas), `POST` (gera slug a partir do nome, resolve colisão de `id` com sufixo `_2`, `_3`...),
  `PATCH` (edita nome e/ou `ativo`) — mesmo padrão de `app/api/produtos/route.ts`.
- `TelaSaidas` (`app/page.tsx`): grid de categorias agora vem de `/api/categorias-saida` (só
  ativas), não mais de `CATEGORIAS_SAIDA` hardcoded. Botão "⚙️ Gerenciar categorias" abre um
  modal com tabela editável inline + toggle ativo/inativo — mesmo padrão visual da aba Produtos,
  nenhuma interação nova. Categoria criada já aparece no grid de lançamento imediatamente (mesmo
  fetch reaproveitado após criar/editar/desativar).
- Removido `CATEGORIAS_SAIDA`/`CategoriaSaida` de `lib/dados.ts` (dead code depois da migração).

### Achado fora do escopo — corrigido no mesmo processo
`app/api/saidas/route.ts` (POST) tinha **seu próprio mapa hardcoded** de categorias, duplicado e
desatualizado em relação a `lib/dados.ts` (mesmas 2 divergências que a 049 achou: "Energia
Elétrica / Água" vs. o nome real "Energia Elétrica"; "Repasse Recarga VEM" vs.
"Repasse Recarga VEM/Celular") — e **sem nenhuma entrada pra `recargas_dinheiro_pix`**, então
mesmo com a tela corrigida, lançar essa categoria daria 400 "Categoria não encontrada". Troquei
esse mapa por uma consulta ao vivo em `jsgrafica_categorias_saida` (mesma fonte da tela agora) —
resolve os 3 problemas de uma vez e elimina a duplicação de fonte de verdade entre tela e rota.
Não estava no texto original da demanda, mas sem esse fix a demanda não funcionaria de ponta a
ponta (a tela mostraria categorias que a API de gravação rejeitaria).

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` — limpos.
- Local (`npm run dev`): testado via `curl` — `GET /api/categorias-saida` retorna as 12
  categorias ativas (incluindo `recargas_dinheiro_pix`, que não aparecia antes da 049/050); criar
  categoria de teste, editar nome, desativar — todos via API, confirmados no banco via SQL
  (`quantidade`/`ativo`/`nome` batendo).
- Playwright local (`admin.localhost:3000`, login real): fluxo completo na UI —
  1. Grid de categorias mostra as 12 do banco, incluindo "Recargas Dinheiro e Pix" (confirmado
     visível).
  2. Modal "Gerenciar categorias" abre, cria categoria de teste ("Categoria Playwright Teste") —
     aparece na lista.
  3. Edita nome pra "Categoria Playwright Editada" — salva e reflete.
  4. Desativa via toggle — categoria some do grid de lançamento (fechei o modal e confirmei
     `0` ocorrências do botão no grid), mas continua visível (opaca) no modal de gerenciamento
     pra poder reativar depois.
  5. Categoria de teste apagada do banco ao final (não fica lixo em produção).
- Achado de processo (não é bug de produto): minha primeira tentativa de teste automatizado
  encontrou 2 categorias com o mesmo nome — mas era resíduo de testes anteriores meus sem limpar
  entre execuções (o slug/id fica diferente, `categoria_teste_050_2`), não duplicação real vinda
  de duplo-clique ou race condition. Confirmado lendo o próprio banco antes de reportar como bug.
- Verificado em produção após deploy: `GET https://admin.jsgrafica.site/api/categorias-saida`
  retorna as 12 categorias corretas.

### Status final
**Concluída e deployada** (junto com a 052, `dpl_9UYNQa3pPmpcof3HuvUaLbVtbK7h`).
