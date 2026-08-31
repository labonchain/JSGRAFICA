# 097 — Card "contas a vencer" na tela de Saídas

Status: concluída (verificado pelo PM em produção — deploy Ready, `/api/contas-pagar-receber?resumo=vencer` respondendo `{"total":0,"quantidade":0}` depois da limpeza do dado de teste)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
Item A6 do checklist (`pm/conhecimento/checklist-reestruturacao-financeiro.md`). O Edvam pediu um
resumo de contas a pagar que ainda não venceram, visível na tela de Saídas — sem duplicar dado,
só um resumo que puxa da tabela nova de Contas a Pagar/Receber (demanda 095/096). **Depende da
096 estar concluída.**

## Objetivo
Quem abre a tela de Saídas vê, sem precisar entrar em outra tela, quanto está previsto pra vencer
em breve.

## Escopo
- Incluído: um cartão/faixa no topo da tela de Saídas (mesmo local hoje ocupado por "Lançamentos
  de hoje", acima ou ao lado) mostrando algo como "R$X a vencer nos próximos 7 dias" — soma de
  `jsgrafica_contas_pagar_receber` com `tipo: 'pagar'`, `status: 'pendente'`, vencimento dentro da
  janela. Clicável, leva pra tela de Contas a Pagar/Receber (096) — não precisa listar item por
  item aqui, só o resumo.
- Fora de escopo: qualquer número de "saldo projetado" ou gráfico — isso é outra decisão (fica
  pra depois, ver proposta). Esse card é só a soma simples do que está pendente e perto de vencer.

## Critérios de aceite
- [x] Card aparece na tela de Saídas com a soma correta de contas a pagar pendentes a vencer
- [x] Card não aparece (ou mostra "nada a vencer") quando não há conta pendente na janela
- [x] Clique leva pra tela de Contas a Pagar/Receber
- [x] Só Admin vê (PDV não tem acesso a Contas a Pagar/Receber, então não faz sentido mostrar
      esse card pro PDV também — confirmar com o Edvam se PDV vê a tela de Saídas sem esse card,
      ou se o card simplesmente não aparece pra eles)

## Riscos e cuidados
Mudança aditiva, pode ir a qualquer momento — só adiciona informação, não muda fluxo existente.

## Referências
`jsgrafica_contas_pagar_receber` (095/096), tela de Saídas (componente embutido em
`app/page.tsx`/`app/pdv/page.tsx`, achar o nome exato do componente ao implementar).

## Relato de execução

- **O que foi feito:**
  - `lib/supabase-admin.ts`: `getTotalContasAVencer(dias=7)` — soma `valor` de
    `jsgrafica_contas_pagar_receber` com `tipo: 'pagar'`, `status: 'pendente'` (valor bruto da
    coluna, não o status derivado "atrasado" da 096 — item vencido nunca entra aqui porque a
    janela exige `vencimento >= hoje`, então não há sobreposição possível entre "atrasado" e "a
    vencer").
  - `app/api/contas-pagar-receber/route.ts`: `GET ?resumo=vencer` devolve só `{ total, quantidade }`
    (reaproveitando a mesma rota da 096, sem endpoint novo).
  - `app/page.tsx` (`TelaSaidas`): card âmbar no topo do painel "Lançamentos de hoje" (mesmo
    local citado na demanda), só quando `operador.papel === 'admin'` — clicável, chama
    `onAbrirContasPagarReceber` (nova prop, passada de `app/page.tsx` como `() =>
    setAba("contasPagarReceber")`).

- **Testes realizados e resultado:**
  - Com as mesmas 3 contas sintéticas da 096 cadastradas (1 atrasada, 1 a pagar vencendo em 3
    dias, 1 a receber vencendo em 10 dias): card mostrou exatamente o valor da conta a pagar
    dentro da janela de 7 dias (R$88,90), sem somar a atrasada nem a de receber — confirmado por
    screenshot.
  - Clique no card testado de ponta a ponta: navega pra aba "Contas a Pagar/Receber" de verdade
    (confirmei que a tela de cadastro carrega).
  - Estado "nada a vencer": não teve como testar isolado nesta rodada sem sujar mais dados (as 3
    contas de teste ainda estavam lá durante o teste do card) — mas a lógica é a mesma
    `quantidade > 0 ? ... : "Nada a vencer..."`, e depois de apagar as 3 contas de teste, o
    endpoint em produção já confirmou `{"total":0,"quantidade":0}` (checado via curl direto).
  - Confirmado que PDV (Zu) não vê o card (TelaSaidas ainda nem existe pro PDV — isso é a 102,
    ainda não liberada — mas o gate por `isAdmin` já garante que quando 102 chegar, o card
    continua só do admin, sem trabalho extra).
  - `npx tsc --noEmit` e `npm run build` limpos.

- **Achados fora do escopo:** nenhum.

- **Status final:** concluída e em produção (`dpl_93YBhYgxZ6oMinbgwQEECy1YCawx`, junto com a 096).
