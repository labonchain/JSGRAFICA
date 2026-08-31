# 214 — URGENTE: repasse de recarga do RecargaPay vira pendência que nunca resolve

Status: concluída
Criada em: 2026-07-18
Aprovada em: 2026-07-18
Concluída em: 2026-07-18
Chat executor: 03 - APP JS GRAFICA

## Contexto
Efeito colateral da demanda 213 (entendimento corrigido: repasse de recarga vem do saldo já
acumulado no RecargaPay, nunca da gaveta de quem vendeu) somado à correção manual do PM de hoje
(9 saídas históricas recriadas com `conta_origem='recargapay'`, pra continuarem contando certo
no fechamento geral em vez de descontar errado da gaveta física). `listarPendenciasContaOrigem`
(`lib/supabase-admin.ts`) marca QUALQUER saída com `conta_origem` diferente da conta própria do
`operador` como pendência aguardando uma transferência que "resolve" — regra criada pensando no
caso de dinheiro físico em trânsito (ex. R$100/R$18 esperando virar depósito ou repor outra
conta). Repasse de recarga saindo do RecargaPay **nunca vai ter essa transferência**, porque não
existe nada a resolver — o RecargaPay gastou o próprio saldo dele, ponto final. Resultado: a
tela "⚠️ Pendências entre contas" ficou poluída com todo repasse de recarga histórico e vai
continuar acumulando um item novo a cada venda de recarga em Dinheiro/Cartão dali pra frente,
pra sempre, sem nenhuma ação possível pra "resolver".

## Objetivo
A tela de pendências só mostra dinheiro de verdade esperando ser movido — repasse de recarga
saindo do RecargaPay nunca aparece lá.

## Escopo
- Incluído: `listarPendenciasContaOrigem` (`lib/supabase-admin.ts`) passa a excluir saídas cuja
  `categoria_id` seja `recarga_vem` ou `recarga_cel` (mesma lista de categorias que a 213 já usa)
  — essas nunca são pendência, por definição, desde a 213.
- Confirmar que isso não esconde nenhum caso legítimo: se algum dia existir repasse de recarga
  saindo de uma conta que NÃO seja RecargaPay (cenário não previsto hoje), documentar a decisão
  de mesmo assim excluir, já que o conceito "repasse de recarga = sempre RecargaPay" é o que a
  213 estabeleceu.
- Explicitamente fora de escopo: qualquer outra categoria de saída com `conta_origem` diferente
  continua aparecendo normalmente (esses SÃO pendências de verdade, ex. taxas de cartão saindo
  de Stone/MP, transferências manuais).

## Critérios de aceite
- [x] Repasse de recarga (VEM ou celular) nunca aparece na lista de pendências
- [x] Outras saídas com conta_origem diferente continuam aparecendo normalmente (sem regressão)
- [x] Testado com os 9 lançamentos reais recriados hoje pelo PM — confirmar que somem da lista

## Riscos e cuidados
Urgente porque está poluindo a tela AGORA, em produção, com itens que nunca vão poder ser
resolvidos — o Edvam já reagiu mal ao ver a lista crescer sem explicação.

## Referências
Demanda 213 (entendimento: repasse de recarga sempre vem do RecargaPay, nunca é pendência de
verdade). Demanda 201 (`listarPendenciasContaOrigem`, mecanismo original). Correção manual do PM
em 2026-07-18 (9 saídas recriadas com `conta_origem='recargapay'`, que expuseram este problema).

## Relato de execução
Implementado em `listarPendenciasContaOrigem` (`lib/supabase-admin.ts`): nova constante local
`CATEGORIAS_SAIDA_RECARGA = ['recarga_vem', 'recarga_cel']` (os `categoria_id` reais das saídas
de repasse — diferente de `CATEGORIAS_RECARGA` da 199/213, que são nomes de CATEGORIA DE PRODUTO
tipo `'Recarga vem'`; são namespaces diferentes, por isso uma constante nova em vez de
reaproveitar). O `select` da função passou a buscar `categoria_id` também (antes só trazia
`categoria_nome`), e o `.filter()` ganhou mais uma condição excluindo qualquer saída cujo
`categoria_id` esteja nessa lista — repasse de recarga nunca é pendência, ponto, desde a 213.

**Confirmação do risco levantado no escopo** ("se algum dia existir repasse de recarga saindo de
conta que não seja RecargaPay"): a exclusão é por CATEGORIA da saída (`recarga_vem`/`recarga_cel`),
não por `conta_origem='recargapay'` especificamente — ou seja, exclui QUALQUER saída de repasse
de recarga, mesmo que hipoteticamente tivesse `conta_origem` diferente. Decisão consciente: o
conceito "repasse de recarga = sempre RecargaPay" é exatamente o que a 213 estabeleceu (repasse
de recarga NUNCA mais vem de dinheiro físico nem de outra conta digital — só existe repasse de
recarga vindo do saldo do RecargaPay, ou não existe repasse nenhum). Filtrar por categoria é mais
robusto que filtrar por `conta_origem` (cobre o caso mesmo se alguém digitasse a conta errada na
correção manual).

Teste com dado real (não sintético — a própria demanda pedia pra usar os lançamentos reais do
PM): consultei `jsgrafica_saidas` com `conta_origem = 'recargapay'` — encontrei **10** linhas
(não 9 como o texto da demanda mencionava; a 10ª é um repasse de Recarga Celular de R$57,60 em
17/07, também com `conta_origem='recargapay'` — mesma natureza, corretamente excluído também).
Consultei `GET /api/transferencias` antes e depois do deploy: as 10 linhas de repasse de recarga
sumiram da lista de pendências; as 4 pendências legítimas que restaram (2 "Taxas de cartões"
saindo de Stone/Mercado Pago, 2 "Transferência entre contas") continuam aparecendo normalmente —
confirma que a exclusão é específica pra recarga, sem regressão nas pendências de verdade.
Verificado direto em produção depois do deploy (`GET https://admin.jsgrafica.site/api/transferencias`).

**Achado incidental, fora do escopo desta demanda (registrado, não corrigido)**: uma das 4
pendências restantes é a própria saída gerada pela Transferência entre Contas "Mercado Pago →
Dinheiro (Gabi)" (R$18, caso real da demanda 212) — ela mesma aparece como pendência, sem nunca
poder ser "resolvida" (o mesmo padrão estrutural desta demanda, mas pra saída gerada por
transferência em vez de repasse de recarga). Não é regressão desta mudança — já acontecia antes
(observado também durante o teste da demanda 207, com a transferência Caixa Econômica →
RecargaPay). Não corrigi por estar fora do escopo específico (recarga) desta demanda — registrado
pro PM avaliar se merece tratamento futuro, mesmo raciocínio aplicado a outro tipo de saída.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_Akjm83aqwTUN22uZVbQhybQihGfL`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.
