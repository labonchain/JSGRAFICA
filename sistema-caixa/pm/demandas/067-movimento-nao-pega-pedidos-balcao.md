# 067 — Aba Movimento não soma pedidos de Balcão (regressão da demanda 054)

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam reportou, com print real: a aba "Movimento do dia" mostrava tudo zerado ("Nenhuma venda
registrada ainda hoje") mesmo com 5 pedidos reais de balcão lançados no dia. Investigado pelo PM:
`app/api/movimento/route.ts` só consulta a tabela `jsgrafica_vendas`. Desde a demanda 054, venda
de balcão parou de gravar em `jsgrafica_vendas` e passou a gravar só em `jsgrafica_pedidos` — o
Movimento nunca foi atualizado pra acompanhar essa mudança. É uma regressão real, não um
comportamento esperado.

Achado à parte (não é bug): a aba "Dashboard" já está correta — `getResumoDia()` em
`lib/supabase-admin.ts` já soma as duas tabelas (`jsgrafica_vendas` + `jsgrafica_pedidos` com
`status='entregue'`). O valor de R$7,40 que apareceu no print bate exatamente com a soma dos
pedidos de balcão daquele dia — não é um resíduo de dado antigo, o Dashboard está certo.

## Objetivo
Aba Movimento mostra o total real do dia, incluindo pedidos de balcão, igual o Dashboard já faz.

## Escopo
- Incluído: em `app/api/movimento/route.ts`, somar também `jsgrafica_pedidos` (status entregue,
  filtrando por `data_entregue_at` dentro dos limites do dia-caixa) — reaproveitar exatamente a
  mesma lógica que `getResumoDia()` já usa em `lib/supabase-admin.ts`, não inventar uma nova.
- Fora de escopo: mudar o Dashboard (já está certo).

## Critérios de aceite
- [ ] Aba Movimento mostra os pedidos de balcão do dia, com valores batendo com a aba Pedidos
- [ ] Total da aba Movimento bate com o total "Entradas hoje" do Dashboard, no mesmo dia
- [ ] Testado em produção com pedidos reais do dia

## Riscos e cuidados
Nenhum específico — é reaproveitar lógica já existente e testada no Dashboard.

## Referências
`app/api/movimento/route.ts`. `lib/supabase-admin.ts` (`getResumoDia()`, lógica de referência).
Demanda 054 (mudança que causou a regressão).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Em `app/api/movimento/route.ts`, além da query já existente em `jsgrafica_vendas`, adicionada
  uma segunda query em `jsgrafica_pedidos` (`status='entregue'`, filtrado por `data_entregue_at`
  dentro dos limites do dia-caixa via `limitesDiaCaixaUTC()`, importado de `lib/supabase.ts` — a
  mesma função que `getResumoDia()` já usa em `lib/supabase-admin.ts`, não inventei lógica nova).
  As duas fontes são somadas no mesmo mapa de itens (por nome de serviço/produto) e no mesmo total,
  `pedido_criado_por` conta como "operador" nos pedidos de balcão, igual `operador` já fazia nas
  vendas.
- Testes realizados e resultado:
  Comparado direto por SQL: soma de `jsgrafica_vendas` de hoje = R$0 (nenhuma venda no dia, já
  migrado pra pedidos desde a 054) + soma de `jsgrafica_pedidos` entregues hoje = R$7,40 — o mesmo
  valor exato que o Dashboard já mostrava corretamente e que aparecia no print original do Edvam.
  Local (`/api/movimento`): `totalEntradas: 7.4`, `totalTransacoes: 4`, 3 itens (Plastificação
  Pequena, Xerox A3, Xerox Preto e Branco A4 ×2) — batendo com os pedidos reais de balcão do dia.
  Comparado com `/api/dashboard?periodo=hoje`: `totalEntradas` idêntico (7.4). Depois do deploy,
  reconfirmado em produção (`pdv.jsgrafica.site/api/movimento`): mesmo resultado (`7.4` / 4
  transações). `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy.
  Deploy em produção: `npx vercel --prod --yes` → `dpl_7GeSSC3cY8sUNyEAomD6gtrK1tBX` (junto com a
  068).
- Achados fora do escopo: nenhum.
- Status final: concluída.
