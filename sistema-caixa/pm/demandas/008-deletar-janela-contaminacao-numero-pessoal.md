# 008 — Deletar dados da janela de contaminação (número pessoal do Edvam)

Status: concluída
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Demanda 001 identificou e o Edvam confirmou: entre 2026-05-03 03:58 e 2026-05-04 12:58 UTC, a
instância Z-API da gráfica ficou conectada ao número pessoal do Edvam (`5521965185667`) em
vez do número real. Nessa janela, o log capturou conversas pessoais dele, sem relação com a
gráfica. O Edvam autorizou apagar esses registros do log da JS Gráfica.

## Objetivo
Remover de `jsgrafica_log_msgs_privadas` (e `jsgrafica_contatos` quando fizer sentido) os
dados que vieram exclusivamente dessa janela de reconexão indevida.

## Escopo
- Incluído:
  1. Antes de apagar, rodar um `SELECT` de verificação reconstruindo a lista exata (mensagens
     e contatos) da janela 2026-05-03 03:58 a 2026-05-04 12:58 UTC associada a
     `connected_phone = 5521965185667`, e reportar a contagem final antes de excluir.
  2. Apagar as mensagens dessa janela em `jsgrafica_log_msgs_privadas`.
  3. Para os contatos em `jsgrafica_contatos` que só têm origem nessa janela (sem nenhuma
     mensagem fora dela), apagar o contato também. Se um contato tiver mensagens de fora
     dessa janela também, **não apagar o contato**, só as mensagens da janela.
  4. Verificar se o próprio número `5521965185667` tem mensagens/contato fora dessa janela
     (ex.: as mensagens de teste de hoje, 2026-07-02) — se tiver, **não apagar o contato**,
     só confirmar que ele não deveria contar como "cliente" (é uso interno/teste); reportar
     em vez de decidir sozinho se isso é esperado ficar.
- Fora de escopo: mexer em qualquer dado fora dessa janela específica — isso é demanda 007
  (long tail / DDD malformado) ou outra futura, não esta.

## Critérios de aceite
- [ ] Contagem exata (mensagens + contatos) reportada antes da exclusão
- [ ] Exclusão executada, restrita à janela confirmada
- [ ] Confirmação de que contatos com mensagens fora da janela não foram apagados
- [ ] Contagem final pós-exclusão reportada

## Riscos e cuidados
Exclusão é irreversível — seguir a ordem (SELECT de verificação → reportar → DELETE) do
briefing do 02-DADOS à risca. Se a contagem encontrada for muito diferente da esperada (106
mensagens / 12 contatos da amostra original, 8 contatos "puros" da janela), reportar antes de
excluir em vez de seguir direto.

## Referências
`jsgrafica_log_msgs_privadas`, `jsgrafica_contatos`. Ver
`pm/demandas/001-investigar-contaminacao-log.md` (números originais da investigação).

## Relato de execução

**Status: concluída.** Exclusão executada, restrita à janela confirmada.

### 1. Reconstrução da janela (SELECT antes de apagar)

Confirmado via `(instance_id, connected_phone)`: **106 mensagens**, **12 telefones distintos**
tocados, todas dentro de 2026-05-03 03:58:40 UTC a 2026-05-04 12:58:01 UTC — bate com a
demanda 001.

Cruzei cada um dos 12 telefones contra o histórico completo dele (não só pelo `contact_lid` —
achei casos em que o mesmo telefone tem mais de um `contact_lid` ou registros com
`contact_lid` nulo, então recontei por `phone` pra não sub-contar mensagens fora da janela):

| Telefone | DDD | Msgs na janela | Msgs **fora** da janela | Decisão |
|---|---|---|---|---|
| 558192778804 | 81 | 28 | 76 (jan–mai) | Manter contato |
| 5511992980671 | 11 | 13 | 11 | Manter contato |
| 558198257944 | 81 | 3 | 6 | Manter contato |
| 5511981889981 | 11 | 8 | 2 (segue até 02/07 hoje) | Manter contato |
| 558186108547 (número **da própria gráfica**) | 81 | 3 | 1 (março) | Manter contato — ver nota abaixo |
| 5521979349728 | 21 | 4 | 0 | **Apagar contato** |
| 555599195947 | "55" (DDD inválido/malformado) | 15 | 0 | **Apagar contato** |
| 5521965914328 | 21 | 5 | 0 | **Apagar contato** |
| 5511949714311 | 11 | 18 | 0 | **Apagar contato** |
| 5516981023577 | 16 | 1 | 0 | **Apagar contato** |
| 5521965168780 | 21 | 3 | 0 | **Apagar contato** |
| 5511940773366 | 11 | 5 | 0 | **Apagar contato** |

7 contatos qualificaram para exclusão total (zero mensagem fora da janela). Os outros 5 têm
histórico fora da janela — mantidos, só as mensagens da janela deles foram removidas junto com
o resto.

### 2. Verificação do próprio número pessoal (item 4 do escopo)

`5521965185667` aparece como **contato** (não como `connected_phone`) em **227 mensagens**,
de 2026-01-11 a 2026-07-02 (hoje) — **zero delas dentro da janela**. Ou seja, esse número tem
uso legítimo e contínuo como contato dentro do sistema da gráfica (bate com o hardcoded
`AUTORIZADOS` do workflow n8n `01` — é o Edvam mandando comando de gestão de produto/pedido
pro bot, não é cliente). **Não apaguei esse contato** — reportando conforme pedido, não decidi
sozinho. Recomendo manter como está; se quiser marcar esse contato como "interno/admin" de
alguma forma (campo `classificacao`?), é decisão à parte, não fiz aqui.

**Achado extra não previsto no escopo:** o número da própria gráfica (`558186108547`) aparece
como **contato** de si mesmo dentro da janela (3 mensagens, mais 1 de março) — provavelmente
um artefato de log (o número pessoal mencionando/referenciando o número oficial durante o
teste). Não apaguei esse contato (tem mensagem fora da janela), só as 3 mensagens da janela.
Reportando como achado, não investiguei a fundo a causa exata — fora do escopo desta demanda.

### 3. Exclusão executada

```sql
delete from jsgrafica_log_msgs_privadas
where instance_id = '3EFA4C62C755F07164E46237BF5854B6' and connected_phone = '5521965185667';
-- 106 linhas

delete from jsgrafica_contatos
where contact_lid in (
  '46016279613452@lid', '48919828557981@lid', '81578743037988@lid',
  '233775170642108@lid', '201627340394610@lid', '185199023382728@lid',
  '13538559004758@lid'
);
-- 7 linhas
```

### 4. Contagem antes/depois

| Tabela | Antes | Depois | Delta |
|---|---|---|---|
| `jsgrafica_log_msgs_privadas` | 34.291 | 34.185 | −106 ✓ |
| `jsgrafica_contatos` | 1.987 | 1.980 | −7 ✓ |

Verificação final: `select count(*) from jsgrafica_log_msgs_privadas where instance_id=... and connected_phone=...` → **0** — nenhum registro da janela restante.

`jsgrafica_log_msgs_grupos` não precisou de nenhuma alteração — nenhuma mensagem daquele
instance_id+connected_phone existe nessa tabela (já confirmado na demanda 001).

### Confirmação dos critérios de aceite
- [x] Contagem exata reportada antes da exclusão (106 msgs / 12 telefones)
- [x] Exclusão executada, restrita à janela confirmada
- [x] Contatos com mensagens fora da janela não foram apagados (5 preservados, incluindo o
      próprio número da gráfica e o número pessoal do Edvam)
- [x] Contagem final pós-exclusão reportada (34.185 msgs / 1.980 contatos)
