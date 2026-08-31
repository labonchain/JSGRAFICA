# 151 — Corrigir `telefone` = LID em pedidos já criados (contato já se autocorrigiu, pedido não)

Status: aprovada — liberada
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: —
Chat executor: 02 - DADOS

## Contexto
A Camada B do diagnóstico de fechamento (demanda 150) achou 28 pedidos (16 em 09-07, 12 em 08-07)
com `telefone` em formato `@lid`. Investigação do PM: o contato por trás de um desses pedidos
(`ped-0456`, "Francisca Pitombeira") **já está com o telefone certo hoje** — o pedido capturou o
valor no exato momento em que o contato ainda estava com LID (mesma janela de concorrência de
contato novo já mapeada na demanda 144, que corrigiu `jsgrafica_contatos` mas não tinha como saber
que pedidos já criados também precisavam de correção).

Ou seja: a varredura periódica (144) já resolve o contato, mas **o pedido fica preso com o
telefone errado pra sempre**, mesmo depois do contato se autocorrigir — bloqueando mensagem/Pix
pra esse pedido especificamente (mesmo problema da trava em `pedidos/route.ts` já documentado).

## Objetivo
Os pedidos com `telefone` = LID passam a ter o número real, usando o mesmo critério já validado
(126/144). Pedidos novos que caírem nessa janela no futuro são corrigidos automaticamente pela
mesma varredura periódica, estendida.

## Escopo
- Incluído:
  1. **Correção pontual agora**: pra cada pedido com `telefone` = LID, buscar o número real —
     preferencialmente o `phone` atual do contato (`contact_lid` = mesmo valor do `telefone` do
     pedido), já que na maioria dos casos o contato já se autocorrigiu sozinho (como o
     `ped-0456`). Se o contato ainda estiver com LID também, usar o mesmo critério da 126/144
     (1 número real recuperável no log, sem ambiguidade).
  2. **Estender a varredura periódica (144)**: além de corrigir `jsgrafica_contatos`, a mesma
     function/job diária passa a corrigir `jsgrafica_pedidos.telefone` pros pedidos que
     estiverem com LID e tiverem correção disponível (mesmo critério).
  3. Não mexer em `contact_lid`/`conversation_id` de pedido nenhum (não existe esse campo em
     pedido, é só o `telefone`).
- Fora de escopo: mexer no n8n de novo (decisão já tomada na 144 — risco não compensa o volume).

## Critérios de aceite
- [ ] Os 28 pedidos identificados pela 150 corrigidos (ou documentado quais não têm número
      recuperável, mesmo critério da 126)
- [ ] Varredura periódica (144) estendida pra cobrir pedidos também, testada manualmente 1x
- [ ] Rodar o diagnóstico (149/150) de novo em 08-07 e 09-07 confirma zero sinal `telefone_
      formato_lid` restante (ou só os genuinamente sem solução, documentados)

## Referências
Demanda 150 (achado original, Camada B). Demanda 144 (varredura periódica original, a estender).
Demanda 126 (critério de recuperação do número real).

## Relato de execução

### 1. Correção pontual — 70 pedidos (não 28, número cresceu desde a 150), todos via phone do contato

Confirmei ao vivo antes de corrigir: **os 70 batiam 100% pela prioridade pedida** (phone atual
do contato, via `contact_lid = telefone` do pedido) — nenhum precisou cair pro critério do log.
Confirma a hipótese da demanda: o contato já tinha se autocorrigido sozinho (varredura 144) em
todos os casos, só o pedido tinha ficado preso.

```sql
UPDATE jsgrafica_pedidos p
SET telefone = c.phone
FROM jsgrafica_contatos c
WHERE p.telefone = c.contact_lid AND p.telefone LIKE '%@lid' AND c.phone NOT LIKE '%@lid';
```

Resultado: **0 pedidos restantes com `telefone` = LID** (confirmado depois, contagem geral e
também filtrado só pra 08-07/09-07 especificamente, como pedia o critério de aceite).

### 2. Varredura periódica (144) estendida pra cobrir pedidos

Atualizei `jsgrafica_backfill_telefone_lid()` (mesma function, `CREATE OR REPLACE` — o
`cron.job` da 144 aponta pro nome da function, não precisou reagendar nada) pra rodar, na
mesma execução diária:
1. Contatos (lógica original da 144, sem mudança).
2. Pedidos via `phone` atual do contato (prioridade, caso mais comum).
3. Pedidos restantes via critério do log (1 número real recuperável, sem ambiguidade — mesmo
   padrão da 126/144), só pros que sobrarem depois do passo 2.

Adicionei colunas `linhas_contatos`/`linhas_pedidos` em
`jsgrafica_backfill_telefone_lid_log` pra separar o que foi corrigido em cada tabela por
execução (só "total" não seria suficiente pra monitorar as duas frentes).

**Testado manualmente**: rodei `SELECT jsgrafica_backfill_telefone_lid();` depois da extensão —
retornou `0` (esperado, acabei de corrigir tudo manualmente no item 1) e gravou a linha de log
com `linhas_contatos=0, linhas_pedidos=0`. Confirmei o `cron.job` (`jsgrafica_backfill_telefone_
lid_diario`) continua `active=true`, mesmo schedule (`0 4 * * *`), agora rodando a versão
estendida automaticamente.

### 3. Confirmação final (critério de aceite)
```
jsgrafica_pedidos com telefone = LID (geral): 0
jsgrafica_pedidos com telefone = LID, 08-07 e 09-07 especificamente: 0
```

### Achados fora do escopo
Nenhum novo.

### Status final
**Concluída.** 70 pedidos corrigidos (todos via phone do contato, nenhum precisou do log).
Varredura periódica estendida, testada manualmente, cron confirmado ativo. Zero sinal
`telefone` = LID restante em pedidos, geral e especificamente em 08-07/09-07.
`contact_lid`/`conversation_id` não existem em pedido — não havia nada a preservar além do
próprio `telefone`, que foi a única coluna tocada.
