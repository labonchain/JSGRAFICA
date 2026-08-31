# 195 — Aviso de duplicidade (166) confunde contas recorrentes de meses diferentes

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real (Edvam, 2026-07-15): ao dar baixa na conta a pagar "Aluguel (casa)" (vencimento
15/07/2026, R$1.300), o aviso de duplicidade da demanda 166 encontrou a saída de **15/06/2026**
(mesmo valor R$1.300, categoria Aluguel, lançada por import histórico) e perguntou "é esse
pagamento?" — quase levou o Edvam a reaproveitar o pagamento do MÊS PASSADO como se fosse o de
hoje. O motivo: o aviso compara por valor+categoria numa janela de dias, sem considerar que uma
conta **recorrente** (aluguel, empréstimos parcelados, folha de pagamento) tem o MESMO valor todo
ciclo por design — vai continuar confundindo com o ciclo anterior toda vez que alguém der baixa
numa conta recorrente. Resolvido manualmente pelo PM desta vez (saída nova criada, vinculada
corretamente à conta de julho).

## Objetivo
O aviso de duplicidade não confunde mais pagamentos de ciclos diferentes de uma conta recorrente
— continua funcionando normal pra saída avulsa não-recorrente (o caso que a 166 resolveu).

## Escopo
- Incluído: em `darBaixaContaPagarReceber` (a lógica da 166), quando a conta que está recebendo
  baixa é `recorrente = true`, a comparação de possível duplicata deve considerar a
  **proximidade com o `vencimento` desta conta especificamente** (ex. só alertar se a saída
  candidata for de perto do vencimento ATUAL, não de qualquer ciclo anterior) — ou, alternativa
  mais simples: para conta recorrente, ignorar candidatas cuja data seja de um ciclo anterior
  (mês diferente pra frequência mensal, semana diferente pra semanal, etc.).
- Contas NÃO recorrentes continuam com a lógica atual da 166, sem mudança.
- Explicitamente fora de escopo: mudar a lógica de detecção pra saída avulsa (já funciona bem,
  foi o que preveniu a duplicidade real da Gabi antes).

## Critérios de aceite
- [ ] Dar baixa numa conta recorrente (ex. aluguel mensal) não mostra mais aviso de duplicidade
      contra o pagamento de um ciclo anterior
- [ ] Dar baixa numa conta recorrente ainda avisa se houver uma saída candidata do MESMO ciclo
      (ex. alguém já lançou manualmente o aluguel deste mês antes de dar baixa)
- [ ] Conta não-recorrente continua com o comportamento da 166, sem regressão
- [ ] Testado com caso equivalente ao real (conta recorrente mensal, saída de mês anterior com
      mesmo valor)

## Riscos e cuidados
Não perder a proteção original da 166 pra saída avulsa real — só refinar o caso recorrente.

## Referências
Demanda 166 (mecanismo original). Caso real: conta a pagar "Aluguel (casa)"
(`7e3316b5-ff2b-4798-86b8-f05ca27e5a62`), saída de junho `8b942b93-0045-48e5-9aff-875d5b464a91`
(import, mês diferente), saída de julho correta `7e01f307-d1ed-4198-b013-f028374a5a17`.

## Relato de execução
Implementada e testada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_C5ZvohQzgtZeub9k66nHa8baqQxy`.

### Correção (a alternativa por proximidade do vencimento — mais precisa que "mês diferente")
Em `darBaixaContaPagarReceber`: quando a conta tem `frequencia` (recorrente), a candidata a
duplicata só é suspeita se o **dia do caixa dela estiver perto do vencimento ATUAL da conta**
— meia janela do ciclo: mensal ±15 dias, semanal ±3. A saída do ciclo anterior (o aluguel de
15/06 contra o vencimento de 15/07: 30 dias de distância) sai da lista; "alguém já lançou o
aluguel DESTE mês na mão" continua sendo pega. Escolhi proximidade-do-vencimento em vez de
"mês-calendário diferente" porque cobre pagamento adiantado na virada (aluguel do dia 1 pago
em 30/06) e serve igual pra semanal (a folha da Gabi é semanal com valor fixo — mesma armadilha
que o aluguel, já coberta). Sem como comparar (saída sem data, conta sem vencimento) → mantém
o aviso, nunca perde a proteção. Conta NÃO recorrente: zero mudança (166 intacta).

### Testes (sintéticos equivalentes ao caso real; tudo apagado, incl. a instância de agosto
que a baixa recorrente cria)
1. **O caso do aluguel**: conta recorrente mensal venc. 15/07 + saída idêntica com dia do
   caixa 15/06 (criada AGORA, como o import real) → baixa **sem aviso nenhum**, saída nova
   criada e vinculada certa (antes: 409 apontando o pagamento do mês passado).
2. Mesmo ciclo: saída idêntica lançada HOJE → baixa deu **409 com a candidata** ✓.
3. Regressão 166: conta não-recorrente + saída recente igual → **409** ✓.

### Deploy
Feito e confirmado no ar em 2026-07-15 — `dpl_C5ZvohQzgtZeub9k66nHa8baqQxy` (aliases admin.jsgrafica.site e pdv.jsgrafica.site apontando pra ele). A 193 foi revertida pelo PM antes deste deploy (ver relato da 193 — trabalho preservado em backup), então este deploy sobe SÓ 195+196.