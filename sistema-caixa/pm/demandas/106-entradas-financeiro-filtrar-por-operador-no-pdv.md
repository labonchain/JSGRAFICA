# 106 — Entradas e Financeiro/Relatórios: PDV só vê o próprio movimento

Status: concluída — deployada em produção
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA (mesmo chat da 098, mesmo arquivo)

## Contexto
Erro de decisão do PM: na demanda 098 (tela "Entradas"), perguntei ao executor se deveria seguir
a mesma visibilidade de "Financeiro" (sem filtro por operador no PDV) e recomendei manter assim
"por consistência". O Edvam testou ao vivo com Zu/Gabi e corrigiu: **está errado nas duas
telas.** No PDV, cada operador só deve ver o próprio movimento — nunca o total de todo mundo.

Isso já está em produção mostrando dado errado (Zu vendo entradas/financeiro da Gabi e do
Edvam) — prioridade alta.

## Objetivo
No PDV (Zu/Gabi), "Entradas" mostra só os lançamentos da própria operadora; "Financeiro"
(que vira "Relatórios", ver item 10 do backlog) mostra só o resumo/ranking de produtos e
clientes que ela mesma atendeu — nunca o agregado geral. No Admin, nada muda (continua vendo
tudo).

## Escopo
- Incluído:
  1. `TelaEntradas.tsx` / `app/api/entradas`: quando quem pede é PDV (Zu/Gabi), filtrar
     automaticamente por `operador = <nome de quem está logado>` — sem seletor manual pra essas
     duas (elas não devem conseguir escolher "ver de todo mundo"). Admin continua com o seletor
     "Todos os operadores" disponível.
  2. `TelaFinanceiro.tsx` / `app/api/dashboard`: mesmo filtro — PDV vê só resumo + ranking de
     produtos/clientes do próprio operador. Confirmar se a rota já suporta filtro por operador
     (a 074/077 já usam padrão parecido em outros lugares) antes de criar lógica nova.
- Fora de escopo: renomear "Financeiro" pra "Relatórios" (isso é outro item do backlog,
  cosmético, pode ir junto ou separado).

## Critérios de aceite
- [x] Zu logada: "Entradas" mostra só lançamentos dela, sem seletor de operador
- [x] Gabi logada: mesma coisa, só os lançamentos dela
- [x] PDV: "Financeiro" mostra resumo/ranking só do operador logado
- [x] Admin: nada muda, continua vendo tudo com seletor de operador disponível

## Riscos e cuidados
Correção de bug real em produção — não precisa esperar horário seguro (não muda fluxo de venda,
só filtro de visualização), mas testar com Zu e Gabi antes de considerar concluído, já que foi
exatamente o cenário que expôs o erro.

## Referências
`components/TelaEntradas.tsx`, `app/api/entradas`, `components/TelaFinanceiro.tsx`,
`app/api/dashboard`. `pm/conhecimento/backlog-feedback-uso-real-07-07.md` (item 1).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
Investigação prévia confirmou que **nenhuma das duas rotas de API precisava de lógica nova** —
`app/api/entradas` (demanda 098) já aceitava `?operador=` desde que eu mesmo criei; `app/api/
dashboard` já aceitava `?operador=` também, implementado pela demanda 101 (o menu de 3
relatórios, que já tinha sido liberado pela aprovação do mockup 100) enquanto eu trabalhava nas
demandas anteriores desta fila. O bug inteiro era **só de fiação no frontend**: os dois
componentes sempre chamavam a API sem passar `operador`, e sempre renderizavam o seletor livre
"Todos os operadores" pra qualquer um, PDV incluído.

1. **`components/TelaEntradas.tsx`**: nova prop `operadorFixo?: string`. Quando presente, o
   estado `operador` já nasce travado nesse valor (`useState(operadorFixo ?? "")`) e o `<select>`
   de operador some, substituído por um rótulo fixo ("Seu movimento: **Nome**") — informa quem
   está vendo o quê, sem opção de trocar.
2. **`components/TelaFinanceiro.tsx`**: mesmo padrão — nova prop `operadorFixo?: string`, estado
   `operador` nasce travado, `<select>` vira uma `<div>` fixa mostrando o nome quando
   `operadorFixo` está presente.
3. **`app/pdv/page.tsx`**: as duas telas passam a receber
   `operadorFixo={operador.papel === "admin" ? undefined : operador.nome}` — **decisão baseada em
   papel, não em qual app/domínio a pessoa está usando**: se o Edvam entrar no PDV (ele pode, é um
   dos 3 botões de login), continua vendo tudo sem restrição, exatamente como no Admin; só
   Zu/Gabi (papel "atendente") ficam travadas no próprio nome. Mesmo critério que
   `PortaoAberturaCaixa.tsx` (demanda 103) já usa pra decidir quem passa pelo portão de abertura
   de caixa (`operador.papel === "admin"`), reaproveitado em vez de inventar um critério novo.
4. **`app/page.tsx`** (Admin): nenhuma mudança — continua chamando `<TelaEntradas />` e
   `<TelaFinanceiro />` sem a prop, então `operadorFixo` fica `undefined` e o comportamento é
   idêntico ao de antes (seletor livre, "todos" por padrão).

### Testes realizados e resultado
1. `npx tsc --noEmit` limpo, `npm run build` sem erro, `npx eslint` sem classe de erro nova além
   do baseline já existente no projeto.
2. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_DFu64EgGQBj4DuySQpc3nHWAWDjE`**.
3. **Teste real com Zu e Gabi em produção** (exatamente o cenário que expôs o bug, por instrução
   explícita da demanda): criei 1 linha sintética de abertura de caixa pra cada uma (Zu e Gabi,
   R$0,00, só pra passar pelo portão obrigatório da demanda 103 sem impedir o teste), logando de
   verdade em `pdv.jsgrafica.site`:
   - **Zu**: aba Entradas → "Seu movimento: Zu" no lugar do seletor, **23 lançamentos, R$93,40**
     (antes do fix: 109 lançamentos, R$624,25 — o total de todo mundo). Aba Financeiro → campo
     Operador travado em "Zu" (não é mais `<select>`), relatório "Fluxo de Caixa" mostrando
     R$93,40 — bate exatamente com o total da aba Entradas dela.
   - **Gabi**: mesmo padrão — "Seu movimento: Gabi", campo Operador travado. Confirmado por API
     direta (`GET /api/dashboard?operador=Gabi` → R$279,80) contra o total geral sem filtro
     (R$624,25) — valor bem menor, confirmando o filtro de verdade.
   - Registros sintéticos de abertura de caixa apagados do Supabase depois do teste.
4. **Admin**: confirmado que `admin.jsgrafica.site` continua respondendo `GET /api/dashboard`
   (sem `operador`) com o total geral (R$624,25), sem nenhuma restrição — comportamento
   inalterado.

### Achados fora do escopo
- Ao investigar, descobri que a demanda 101 (menu de 3 relatórios nomeados) **já tinha sido
  implementada e deployada** por outro chat enquanto eu trabalhava nas demandas anteriores desta
  fila (094/100/098) — o mockup aprovado na 100 já virou código de verdade. Não precisei desenhar
  nada novo pra esta correção, só travar o filtro que a 101 já tinha construído certo.
- Não mexi na renomeação "Financeiro" → "Relatórios" (item 10 do backlog, citado como fora de
  escopo aqui).

### Status final
Concluída e deployada em produção (`dpl_DFu64EgGQBj4DuySQpc3nHWAWDjE`). Todos os 4 critérios de
aceite confirmados com Zu e Gabi de verdade, mais o Admin sem regressão.
