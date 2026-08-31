# 090 — Zerar o saldo acumulado histórico, ancorando em 06/07/2026 (correção de dado)

Status: concluída (destravada pela demanda 092, verificado pelo PM em produção — saldoAnterior retorna R$1.168,89)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Edvam: o saldo acumulado carrega erros da migração da planilha antiga — não é erro de cálculo ou
input, é conta mal feita historicamente que nunca vai bater exato com a realidade. Decisão dele:
**parar de tentar reconciliar o histórico** e ancorar o saldo a partir de 06/07/2026 (ontem),
usando o valor físico real que ele mesmo contou naquele dia — confirmado com o print original da
sessão de fechamento:
```
Banco/Pix:  R$   836,59
Dinheiro:   R$   258,00
Moedas:     R$    74,30
Total físico contado: R$ 1.168,89
```
Esse é o número real, contado fisicamente — vira o novo ponto de partida confiável.

**Achado do PM**: hoje **não existe nenhum fechamento geral completo salvo pra 06-07-26** — só
existe o fechamento parcial que a Gabi fez sozinha (`id bfb084f3-...`, `fechado_por: "Gabi"`,
por operador). A tentativa geral do Edvam (a tela que travou com erro NaN, já corrigida na
demanda 080) nunca chegou a salvar.

## Objetivo
A partir de 07/07/2026 em diante, o cálculo de saldo (`saldo_anterior` do dia seguinte) usa
R$1.168,89 como base — não a soma histórica anterior, que tem erro conhecido de migração.

## Escopo
- Incluído:
  1. Criar (não editar, já que não existe) um registro em `jsgrafica_fechamento` pra
     `data_dia: '06-07-26'`, `fechado_por: 'Sistema'` (ou o valor usado pra fechamento geral,
     conferir o padrão em `app/api/fechamento/route.ts`), com:
     - `bancos: 836.59`, `dinheiro: 258.00`, `moedas: 74.30`, `total_fisico: 1168.89`
     - `saldo_acumulado: 1168.89` (o valor que passa a valer, ignorando a cadeia histórica)
     - `divergencia: 0` (esse registro *é* a fonte da verdade, não há "esperado" pra comparar)
     - Marcar de alguma forma (campo de observação, se existir, ou só pelo valor em si) que este é
       um registro de **ancoragem manual**, não um fechamento operacional normal do dia.
  2. Confirmar que `getSaldoAnterior()` (usado por `app/api/fechamento/route.ts` no fechamento
     geral, sem operador) vai ler esse registro novo como o `saldo_anterior` de 07-07-26 em
     diante, automaticamente — sem precisar de mudança de código, só o dado novo.
  3. **Não apagar nem alterar** nenhum dado histórico anterior a 06-07-26 — ele continua existindo
     pra consulta, só deixa de influenciar o cálculo de saldo daqui pra frente.
- Fora de escopo: reconciliar ou "consertar" o histórico anterior a 06-07-26 (decisão explícita do
  Edvam de não tentar isso).

## Critérios de aceite
- [ ] Registro de 06-07-26 criado com os valores exatos acima
- [ ] Confirmado que o próximo fechamento geral (07-07-26 em diante) usa R$1.168,89 como
      `saldo_anterior`, não o valor antigo da cadeia histórica
- [ ] Nenhum dado histórico anterior apagado ou alterado

## Riscos e cuidados
Esta é uma correção direta em dado financeiro real — conferir 2x os valores antes de gravar
(836.59 / 258.00 / 74.30 / 1168.89) e reportar o registro criado (id, valores) pro PM confirmar
antes de considerar concluído.

## Referências
`jsgrafica_fechamento`. `app/api/fechamento/route.ts` (`getSaldoAnterior()`). Demanda 080
(investigação que originou este achado, mesmo print/contexto).

## Relato de execução

**Status: PARCIAL — o registro foi criado certo, mas o critério de aceite #2 falha
empiricamente. Achado crítico abaixo, não é decisão minha resolver (é código, 03-APP).**

### 1. Registro criado — valores conferidos 2x antes de gravar

```sql
INSERT INTO jsgrafica_fechamento
  (data_dia, fechado_por, saldo_anterior, total_entradas, total_saidas, resultado_dia,
   saldo_acumulado, bancos, dinheiro, moedas, total_fisico, divergencia, fechado_em)
VALUES
  ('06-07-26', 'Sistema', 0, 0, 0, 0, 1168.89, 836.59, 258.00, 74.30, 1168.89, 0, now());
```

Conferência antes de gravar: `836,59 + 258,00 + 74,30 = 1.168,89` ✓ (bate com `total_fisico`),
`divergencia = 1.168,89 − 1.168,89 = 0` ✓.

**Registro gravado** (retornado pelo `INSERT ... RETURNING *`):
```
id:              dc119243-e08b-442f-b1a5-da2180246fb9
data_dia:        06-07-26
fechado_por:     Sistema
saldo_anterior:  0.00
total_entradas:  0.00
total_saidas:    0.00
resultado_dia:   0.00
saldo_acumulado: 1168.89
bancos:          836.59
dinheiro:        258.00
moedas:          74.30
total_fisico:    1168.89
divergencia:     0.00
fechado_em:      2026-07-07 06:15:22 UTC
```

Zerei `saldo_anterior`/`total_entradas`/`total_saidas`/`resultado_dia` de propósito (em vez de
tentar reconstituir algo que "bata" com o dia real) — esse registro não representa fluxo do
dia, é só o ponto de ancoragem. Não existe campo de observação/nota na tabela (confirmei o
schema completo antes de decidir) — a marca de "é ancoragem manual" fica pelo próprio padrão
(saldo_anterior/entradas/saídas zerados, divergência exatamente 0, o que um fechamento real
raramente produz) e por este relato.

### 2. 🔴 Achado crítico — o critério de aceite #2 NÃO se confirma como está agora

Testei `getSaldoAnterior()` de verdade — não só pelo SQL, rodei a **função exata** (mesma
query, mesmo `parseDiaCaixa`, mesmo `.sort()`) contra o banco real:

```
Top do ranking (ambos empatados em data_dia=06-07-26):
  06-07-26  Gabi      536.49
  06-07-26  Sistema  1168.89   ← meu registro novo
  03-07-26  null      557.67
  ...

RESULTADO getSaldoAnterior() simulado pra 07-07-26: saldo_acumulado = 536.49 (Gabi!)
```

**Causa:** `getSaldoAnterior()` (`lib/supabase-admin.ts`) ordena só por `data_dia` convertida
em `Date` — não tem nenhum desempate por `created_at`/`fechado_em`, e não distingue
fechamento geral de fechamento por operador. Como o registro da Gabi e o meu têm a **mesma**
`data_dia`, os dois empatam no sort. O `Array.sort` do JS é estável, então quem "ganha" o
empate é só quem o Postgres devolveu primeiro na consulta sem `ORDER BY` — que por acaso hoje
é a linha da Gabi (criada primeiro, `created_at` mais antigo). Isso **não é garantido, pode
mudar sozinho** (reindex, vacuum, etc.) — mas hoje, na prática, dá errado: pega R$536,49, não
R$1.168,89.

**Não corrigi isso** — é lógica de código (`getSaldoAnterior()`, `lib/supabase-admin.ts`),
fora do meu domínio. Mas é bloqueante pro objetivo desta própria demanda: sem esse fix, o
fechamento de amanhã (07-07-26) vai puxar o número errado da Gabi, não a âncora.

**Recomendação urgente pro 03-APP** (sugiro nova demanda, prioridade alta — antes do próximo
fechamento real): `getSaldoAnterior()` precisa de desempate explícito quando duas linhas têm a
mesma `data_dia` — as duas opções mais diretas:
1. Ordenar por `fechado_em`/`created_at` desc como critério secundário (pega sempre o mais
   recente), ou
2. Excluir fechamentos por operador (parciais) do cálculo de `saldo_anterior` — só considerar
   fechamento geral (`fechado_por: 'Sistema'` ou equivalente) como fonte de saldo acumulado do
   dia. Essa opção parece mais correta conceitualmente (um fechamento parcial de operador nunca
   deveria valer como "o saldo do dia"), e resolveria de raiz o mesmo tipo de confusão da
   demanda 080 (item 2).

### 3. Não mexi em nada anterior a 06-07-26
Confirmado: nenhum UPDATE/DELETE em nenhum outro registro. Só o INSERT acima.

### Achados fora do escopo
- O achado crítico do item 2 (mesmo sendo bloqueante pro objetivo desta demanda, a correção em
  si é código, não dado — registrando aqui e recomendando nova demanda urgente pro 03-APP).

### Status final
**Parcial.** Critério de aceite #1 e #3: ✅ atendidos (registro criado com os valores exatos,
nada histórico alterado). Critério #2: ❌ **não confirmado** — testei de verdade e o sistema
hoje pegaria R$536,49 (Gabi), não R$1.168,89, ao calcular o saldo de amanhã. Precisa do fix de
código acima antes do próximo fechamento geral pra essa demanda valer de verdade na prática.
Reportando pro PM antes de considerar concluído, como pedido.
