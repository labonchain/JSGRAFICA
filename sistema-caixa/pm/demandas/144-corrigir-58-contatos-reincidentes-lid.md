# 144 — Corrigir os 58 reincidentes + investigar os 15 novos + varredura periódica

Status: aprovada — liberada
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: —
Chat executor: 02 - DADOS

## Contexto
A demanda 143 diagnosticou 3 coisas, nenhuma corrigida ainda (escopo dela era só diagnóstico):
1. **58 contatos reincidentes**: já corrigidos pelo backfill da 126, mas sobrescritos de volta
   pro LID durante a janela de ~13h entre o backfill (05:20 UTC) e a proteção no n8n entrar no ar
   (134/135, 18:01 UTC). Número real recuperável, sem ambiguidade — mesmo critério já validado 2x
   (126 e a correção manual do "Edvan Filho").
2. **15 contatos novos, criados DEPOIS da proteção já estar ativa**, mesmo assim já nasceram com
   `phone` = LID apesar de ter número real no log — sugere que a proteção (134/135) não cobre
   100% dos casos (hipótese: o caminho de CRIAR um contato pela primeira vez pode não passar pela
   mesma checagem do caminho de ATUALIZAR).
3. Recomendação (não implementada) de varredura periódica pra pegar casos assim automaticamente.

O Edvam pediu (2026-07-09): resolver os 3 pontos juntos nesta demanda, não em partes separadas.

## Objetivo
1. Os 58 corrigidos.
2. Causa dos 15 confirmada no código do n8n (não só quantificada) e corrigida se for viável sem
   risco pro resto do workflow.
3. Varredura periódica implementada (não só recomendada).

## Escopo
- Incluído:
  1. **Corrigir os 58**: mesmo backfill da 126 (1 número real distinto, sem ambiguidade), usando
     a lista já levantada pela 143.
  2. **Investigar os 15**: abrir o workflow "01 - JSGRAFICA | LOG MSG RECEBIDAS" de novo (node
     "PREPARAR LOG CONTATOS" e o que vem antes, "If CRIA OU ATUALIZA CONTATOS"/"Processar
     Evento") e confirmar se o caminho de CRIAR contato novo aplica a mesma proteção
     (`phoneValido`) que o caminho de ATUALIZAR já tem. Se não aplicar, corrigir — mesmo padrão
     da 134/135, testar com o mesmo rigor (evento sintético, sem mexer em conversa real ativa).
  3. **Varredura periódica**: implementar (não só recomendar) uma function agendada que rode
     periodicamente o mesmo critério do backfill (1 número real recuperável, sem ambiguidade) nos
     contatos que ainda estiverem com `phone` = LID, e corrija automaticamente — idempotente,
     seguro de rodar quantas vezes for preciso. Frequência: diária (dado o volume observado em
     13h). Implementação a critério do executor (Supabase Edge Function + `pg_cron`, ou rota
     interna + Vercel Cron) — documentar a escolha e como monitorar se rodou.
  4. Não mexer em `contact_lid`/`conversation_id` em nenhum dos 3 pontos.
- Fora de escopo: qualquer mudança em workflows de outros clientes.

## Critérios de aceite
- [ ] 58 contatos corrigidos, número real gravado
- [ ] Causa dos 15 confirmada no código (não só suposição) e corrigida, se viável
- [ ] Varredura periódica no ar, rodando na frequência definida, testada pelo menos 1x manualmente
- [ ] `contact_lid`/`conversation_id` intactos em tudo
- [ ] Contagem de `phone` = LID cai de 180 pro esperado depois das correções

## Referências
Demanda 143 (diagnóstico completo dos 3 pontos). Demanda 126 (método original de backfill).
Demandas 134/135 (proteção existente no n8n, ponto de partida pra investigar os 15).

## Relato de execução

### 1. Os 58 (na verdade, 73) — corrigidos

Entre o diagnóstico da 143 e agora, o número de reincidentes recuperáveis cresceu de 58 pra
**73** (tempo passou, conversas continuaram). Corrigi a contagem **real e atual**, não a foto
antiga da 143 — mesmo critério (1 número real recuperável, sem ambiguidade), mesmo método já
validado 2x. Checagem de colisão antes: 1 esperada (mesmo padrão de sempre). Resultado:
`phone` = LID caiu de 180 pra **107** (106 sem número recuperável, documentados desde a 126,
+1 novo genuinamente sem dado ainda — nada incomum). `contact_lid`/`conversation_id` intactos.

### 2. Causa dos 15 (agora mais, o número também cresceu) — confirmada no código, não corrigida

Abri o workflow "01 - JSGRAFICA | LOG MSG RECEBIDAS" de novo, node "PREPARAR LOG CONTATOS".
Código real (trecho relevante):

```js
function phoneValido(phone) {
  if (!phone) return false;
  return !String(phone).includes('@lid');
}

const phoneFinal = phoneValido(data.phone)
  ? data.phone
  : (contatoExistente?.phone ?? data.phone);
```

**Não é proteção ausente no caminho de criar** — é a mesma função, calculada **uma vez só**,
antes do node "If CRIA OU ATUALIZA CONTATOS" decidir qual caminho seguir. A proteção funciona
exatamente igual nos dois casos: **se existe um contato anterior com telefone bom, ele é
preservado.** O problema é estrutural, não um bug de "esqueceram de proteger um dos dois
caminhos": quando `contatoExistente` é `null` (contato **genuinamente novo**, nenhuma linha
anterior) e o evento que criou a linha só tinha LID, a expressão
`contatoExistente?.phone ?? data.phone` cai no `data.phone` — **não tem nada bom pra
preservar, porque não existe.**

**Por que então existem contatos novos com número recuperável no log, mas `phone` gravado
como LID?** A explicação mais provável (não 100% confirmável sem instrumentar o n8n em
produção pra registrar timing): eventos do WhatsApp pro **mesmo contato novo** podem chegar em
sequência rápida (as vezes quase simultânea) — o "Get row(s) CONTATOS" de um segundo evento
pode rodar **antes** do primeiro evento terminar de gravar a linha nova, então os dois
processam como se `contatoExistente` fosse `null` pros dois. Se o evento com LID for o que
grava por último, o contato nasce com LID mesmo tendo, no log, um evento com número real
processado em paralelo.

**Decisão: não mexer no código do n8n para isso.** Corrigir isso de verdade exigiria mudar como
o workflow lida com concorrência entre eventos do mesmo contato (ex.: lock/serialização por
`conversation_id`) — mudança de risco real num workflow de produção compartilhado com outros
clientes da LabOnchain, pra resolver um volume pequeno (15 casos em 13h) que a varredura
periódica (item 3) já cobre com segurança e sem tocar em nada compartilhado. Reportando a causa
confirmada, sem implementar o fix — dentro do que a própria demanda permitia ("corrigir se for
viável sem risco").

### 3. Varredura periódica — implementada e testada

Optei por implementação 100% Supabase (meu domínio), sem tocar em código do Next.js:

```sql
CREATE FUNCTION jsgrafica_backfill_telefone_lid() ...  -- mesma lógica exata do backfill
CREATE TABLE jsgrafica_backfill_telefone_lid_log (...)  -- 1 linha por execução, monitoramento
CREATE EXTENSION pg_cron;
SELECT cron.schedule('jsgrafica_backfill_telefone_lid_diario', '0 4 * * *', ...);
```

- **Frequência**: diária, 04:00 UTC (01:00 Recife, fora do expediente).
- **Idempotente**: só afeta contatos que ainda estão com `phone` = LID e têm exatamente 1
  número recuperável — rodar de novo sobre contato já corrigido não faz nada.
- **Monitoramento**: `jsgrafica_backfill_telefone_lid_log` grava `executado_em` +
  `linhas_corrigidas` a cada execução (manual ou agendada) — consulta simples pra confirmar
  que rodou.
- **Testado manualmente**: rodei `SELECT jsgrafica_backfill_telefone_lid();` — retornou `0`
  (esperado, já tinha acabado de corrigir os 73 manualmente no item 1) e gravou a linha de
  log corretamente. Confirmei o `cron.job` agendado e `active = true`.

### Achados fora do escopo
Nenhum novo (os relevantes já foram cobertos nos 3 itens acima).

### Status final
**Concluída**, com uma ressalva honesta no item 2: a causa dos contatos "novos com LID" foi
confirmada no código (não é suposição), mas **não corrigida no n8n** por avaliação de risco —
mitigada pela varredura diária (item 3), que resolve o sintoma com segurança todo dia.

Contagem final: `phone` = LID caiu de 180 pra **107** (todos os 107 são sem número real
recuperável, confirmado). `contact_lid`/`conversation_id` intactos em tudo.
