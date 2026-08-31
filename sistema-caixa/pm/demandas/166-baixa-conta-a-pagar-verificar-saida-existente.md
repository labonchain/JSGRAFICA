# 166 — Baixa de conta a pagar: verificar se já existe saída lançada manualmente antes de criar duplicata

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-14
Chat executor: 03 - APP JS GRAFICA

## Contexto
No fechamento de 13/07, o Edvam pagou o salário semanal da Gabi (R$350) na sexta 10/07 e lançou
a saída manualmente naquele dia. Só hoje (13/07) ele deu baixa na conta a pagar recorrente
correspondente — e o sistema criou uma SEGUNDA saída de R$350 ("Baixa de conta a pagar: Gabi -
Colaboradora"), contando o mesmo pagamento duas vezes. Corrigido manualmente pelo PM (saída
duplicada apagada, conta a pagar religada à saída real de 10/07), mas o comportamento do sistema
que causou isso continua existindo e vai repetir toda vez que uma saída manual for lançada antes
da baixa formal na conta a pagar.

## Objetivo
Dar baixa numa conta a pagar não cria uma saída nova automaticamente sem antes checar se já
existe uma saída manual que corresponda ao mesmo pagamento.

## Escopo
- Incluído: no fluxo de "baixa" de `jsgrafica_contas_pagar_receber` (achar a rota/tela — provável
  candidata em `app/api/contas-pagar-receber` ou nome equivalente), antes de criar a saída
  automática, buscar por saídas já existentes com valor igual + categoria igual + data próxima
  ao vencimento (ou nome/descrição batendo) e, se achar candidata, perguntar ao operador se é o
  mesmo pagamento (oferecendo vincular à existente em vez de criar nova) em vez de criar direto.
- Decisão do executor: pode ser um aviso simples ("já existe uma saída parecida em tal data, é
  esse pagamento?") em vez de matching automático perfeito — o objetivo é parar de criar
  duplicata silenciosa, não adivinhar com 100% de certeza.
- Explicitamente fora de escopo: revisar/limpar duplicatas antigas que já possam existir por esse
  mesmo motivo (candidato a demanda separada de auditoria, se quiser).

## Critérios de aceite
- [ ] Dar baixa numa conta a pagar cujo pagamento já tem saída manual lançada (mesmo valor,
      categoria, data próxima) avisa antes de criar uma segunda saída
- [ ] Dar baixa numa conta a pagar sem saída correspondente continua funcionando normal (cria a
      saída, como hoje)
- [ ] Testado com um caso reproduzindo o cenário real (saída manual + baixa da mesma conta)

## Riscos e cuidados
Não travar a baixa — se o operador confirmar que é um pagamento novo mesmo (coincidência de
valor), deixar criar normalmente. O objetivo é avisar, não bloquear.

## Referências
`jsgrafica_contas_pagar_receber`, `jsgrafica_saidas`. Caso real: conta a pagar "Gabi -
Colaboradora" (vencimento 2026-07-10), saída original `74271400-ae78-42ad-89fd-71195732aa10`
(10/07), saída duplicada `78f228c7-85ca-46d0-a668-8a9aa7dd649a` (13/07, já apagada).

## Relato de execução
Executada em 2026-07-14 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_Dikvv1SRkuYKFAPTJzR3W98RU32q`.

### O que foi feito
1. **`darBaixaContaPagarReceber` ganhou o pré-check** (contas tipo 'pagar'): antes de criar a
   saída automática, procura saídas com o MESMO valor, lançadas nos últimos 15 dias e ainda não
   vinculadas a nenhuma outra conta. Achou → devolve conflito e a rota responde **409 com as
   candidatas** — nada é criado.
2. **Dois caminhos de resolução** (aviso, nunca bloqueio — como a demanda mandou):
   `vincularSaidaId` dá baixa SEM criar saída (vincula a existente — a mesma correção que o PM
   fez na mão no caso da Gabi); `ignorarSaidaExistente: true` cria a saída normalmente (valor
   coincidiu por acaso).
3. **UI (TelaContasPagarReceber)**: o 409 vira dois `confirm()` em sequência — "já existe uma
   saída de R$X em DD-MM (categoria — descrição, por operador). É ESSE pagamento?" → OK vincula;
   Cancelar → "criar uma saída NOVA mesmo assim?" → OK cria / Cancelar desiste.

### Testes (reproduzindo o cenário real da Gabi; sintéticos apagados)
Saída manual de R$77,77 lançada "na sexta" + conta a pagar de R$77,77 → baixa → **409** com a
saída certa; baixa com `vincularSaidaId` → conta paga vinculada à saída EXISTENTE e **contagem
por SQL: exatamente 1 saída de R$77,77 no banco (zero duplicata)**; conta de R$88,88 sem par →
baixa direta criou a saída normalmente (regressão); contas e saídas de teste apagadas.
