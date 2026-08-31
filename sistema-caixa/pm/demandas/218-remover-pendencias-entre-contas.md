# 218 — Remover a tela/feature "Pendências entre contas"

Status: concluída
Criada em: 2026-07-18
Aprovada em: 2026-07-18
Concluída em: 2026-07-18
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 201 criou o conceito de "pendência entre contas": toda saída lançada com `conta_origem`
diferente da conta própria de quem a lançou vira um alerta na tela do Admin, esperando uma
"Transferência entre Contas" que resolva. A premissa era: dinheiro físico às vezes precisa virar
saldo digital (ou o contrário), e o sistema deveria lembrar o Admin de fazer esse movimento.

Entendimento corrigido hoje (2026-07-18), depois de mapear o fluxo de dinheiro real da gráfica a
fundo: essa premissa não bate com a operação real.
1. Dinheiro físico de qualquer venda segue só 1 de 2 caminhos — vira depósito no banco no dia
   seguinte, ou paga uma saída real lançada no sistema no mesmo dia. Nunca "precisa" virar saldo
   digital de forma vinculada a uma venda específica.
2. Reabastecer uma conta digital (RecargaPay, ou qualquer outra) é sempre um evento isolado e
   periódico, decidido pelo Admin quando o saldo real fica baixo — nunca amarrado a uma venda ou
   saída específica.
3. A demanda 214 já teve que excluir repasse de recarga da lista de pendências (essas nunca vão
   ter uma transferência resolvendo, porque não existe nada a resolver — o RecargaPay gasta o
   próprio saldo dele). O relato da 214 já registrou, como achado incidental, que **outro tipo de
   saída também vira pendência eterna sem solução**: a própria saída gerada pela "Transferência
   entre Contas" (201) aparece na lista de pendências dela mesma, sem nunca poder ser "resolvida"
   de novo. Isso confirma que o problema não é só recarga — é a premissa da feature inteira.
4. Investigação de hoje também confirmou, com dado real (extrato do Mercado Pago + tabelas
   internas), que movimentações grandes e reais entre contas (ex.: Admin concentrando saldo de
   Stone/Caixa Econômica no Mercado Pago pra pagar aluguel ou fatura de cartão) **nunca passam
   pelo mecanismo de Transferência entre Contas** — acontecem direto no banco/app de fora, sem
   nenhum reflexo no sistema. A tela de pendências nunca vai conseguir cobrir esse tipo de
   movimento de qualquer forma.

Decisão: em vez de continuar remendando categoria por categoria (como a 214 já fez uma vez), a
feature inteira sai do ar. O que ela tentava resolver não existe do jeito que a gráfica opera.

## Objetivo
A tela "⚠️ Pendências entre contas" some do Admin. Nenhuma saída, não importa a `conta_origem`,
gera mais alerta de pendência.

## Escopo
- Incluído: remover (ou comentar de forma clara, à critério de quem executa, mas sem deixar
  código morto chamando a função em produção) o uso de `listarPendenciasContaOrigem`
  (`lib/supabase-admin.ts`) na tela do Admin (`app/page.tsx`) e em qualquer rota de API que a
  exponha (ex.: `app/api/transferencias/route.ts`, se for o caso de expor pendências no GET).
- Incluído: remover o bloco de UI "⚠️ Pendências entre contas" do Admin (`app/page.tsx`).
- Incluído: manter intacto tudo o mais relacionado a `conta_origem`:
  - O seletor de conta de origem na saída manual (demanda 210) continua funcionando normal —
    lançar saída ainda pede a conta, isso não muda.
  - A "Transferência entre Contas" (demanda 201) continua funcionando normal — mover saldo entre
    contas continua um recurso ativo, só o painel de "pendência" que monitorava isso é que sai.
  - `getTotalSaidasOperador`/`getTotalDinheiroRecebidoOperador` (demandas 200/212) continuam
    intactos — não têm relação com a tela de pendências, calculam o esperado de cada operador.
- Explicitamente fora de escopo: qualquer mudança em `gerarSaidaAutomaticaNaVenda` (213, já
  correto) ou no cálculo de fechamento (217, tratada em demanda separada).

## Critérios de aceite
- [x] Tela "Pendências entre contas" não aparece mais em nenhum lugar do Admin
- [x] `listarPendenciasContaOrigem` não é mais chamada em nenhum caminho ativo (removida ou
      código morto explicitamente marcado, sem rota de API expondo o resultado)
- [x] Saída manual continua pedindo a conta de origem normalmente (sem regressão da 210)
- [x] Transferência entre Contas continua funcionando normalmente (sem regressão da 201)
- [x] `npx tsc --noEmit` e `npm run build` limpos, deploy em produção confirmado

## Riscos e cuidados
Não remover `conta_origem` de `jsgrafica_saidas` nem o formulário que pergunta a conta na saída
manual — só a tela/lista de "pendência" que interpreta esses dados como algo a resolver. Testar
que lançar uma saída com conta de origem diferente da própria não gera mais nenhum alerta em
lugar nenhum do Admin.

## Referências
Demanda 201 (criação da feature). Demanda 214 (primeiro remendo, achado incidental de que o
problema é mais amplo). Investigação de hoje (`pm/conhecimento/mapeamento-repasses-fantasma-e-
fechamentos-dessincronizados.md`, `pm/conhecimento/planilha-entradas-saidas-saldo-por-conta.md`,
`pm/conhecimento/investigacao-bruta-isolada-09-18-07.md`) — confirma com dado real que
movimentações grandes entre contas acontecem fora do sistema, sem nenhuma ligação com o mecanismo
de pendência.

## Relato de execução

- **O que foi feito**: removida a feature "Pendências entre contas" de ponta a ponta, não só a
  UI:
  - `app/page.tsx` (`TelaSaidas`): removido o bloco JSX inteiro "⚠️ Pendências entre contas"
    (card âmbar), o estado `pendencias`/`setPendencias`, a busca de `d.pendencias` em
    `carregarTransferencias`, e o `alert()` de "resolveu a pendência" em `salvarTransferencia`.
    Também removido o badge "✓ resolveu pendência" do card "Transferências entre contas hoje" e
    o campo `pendencia_saida_id` do tipo local `transferenciasHoje` (não é mais consumido em
    lugar nenhum da tela).
  - `app/api/transferencias/route.ts`: GET parou de chamar `listarPendenciasContaOrigem` e de
    retornar `pendencias` no JSON (só `transferencias` continua); POST parou de buscar/marcar
    `pendencia_saida_id` (a transferência nova nasce sem tentar "resolver" nada — o campo fica
    `null` por padrão) e parou de devolver `pendenciaResolvida` na resposta.
  - `lib/supabase-admin.ts`: `listarPendenciasContaOrigem` removida por completo (função,
    interface `PendenciaContaOrigem`, e a constante `CATEGORIAS_SAIDA_RECARGA` que só existia
    pra ela, criada na 214) — não ficou como código morto, foi de fato apagada, conforme uma das
    opções que o escopo permitia.
  - **Mantido intacto, conforme pedido**: `conta_origem` na saída manual (seletor das 6 contas,
    210) — testado, continua obrigatório pro Admin e gravando certo. A "Transferência entre
    Contas" (201) em si — testado, continua gerando os 2 lados (saída + registro da
    transferência) normalmente, só sem mais nenhuma tentativa de vincular a uma "pendência".
    `getTotalSaidasOperador`/`getTotalDinheiroRecebidoOperador` (200/212) — não foram tocados,
    não tinham relação com a tela removida. A coluna `pendencia_saida_id` em
    `jsgrafica_transferencias` foi preservada no banco (rastro histórico das resoluções
    passadas), só parou de ser escrita/lida ativamente — nenhuma migration aplicada, não fazia
    parte do escopo.
- **Testes realizados e resultado**: Playwright (Admin, aba Financeiro → Saídas) confirmou: (1)
  nenhum texto "Pendências entre contas" aparece em lugar nenhum da tela; (2) abrir
  "+ Adicionar saída" → escolher categoria ainda mostra o seletor "De qual conta esse dinheiro
  saiu de verdade?" (210 sem regressão); (3) o botão "🔁 Transferir entre contas" ainda abre o
  modal, lancei uma transferência sintética (Stone → Caixa Econômica, R$9,10) e ela apareceu
  corretamente em "Transferências entre contas hoje", sem nenhum badge "resolveu pendência".
  Cancelei a transferência sintética depois (`DELETE /api/transferencias`, remove os 2 lados) —
  confirmado via SQL que sumiu de `jsgrafica_transferencias` e `jsgrafica_saidas`, zero sobra.
  `GET /api/transferencias` confirmado retornando só `{nomeAba, transferencias}`, sem `pendencias`.
- **Achados fora do escopo**: nenhum novo. A investigação que embasou esta demanda (215/216/217,
  mais o achado incidental da 214) já tinha sido feita antes de eu começar a execução.
- **Status final**: concluída, `npx tsc --noEmit` e `npm run build` limpos. Deploy em produção:
  `dpl_AoobM84ZejWftCkYUvuXwvsJpfYc`, aliases confirmados via `vercel inspect` em
  `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
