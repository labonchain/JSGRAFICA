# 168 — Corrigir contatos com lead_name errado (nome da empresa ou vazio)

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-15
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Investigando por que a cliente "Laura Isabel" não aparecia na busca de Clientes/Inbox (achado do
PM em 13/07), foi confirmado que o telefone dela já existia como contato de WhatsApp real e
ativo (27 mensagens recebidas, 26 enviadas, `classificacao: RECORRENTE`, sendo atendida pela Gabi
agora) — só que gravado com `lead_name: "J S Gráfica"` (o nome da própria empresa, claramente
errado pra uma pessoa). Levantamento no mesmo dia encontrou **29 contatos reais** (`tipo_registro
= 'INDIVIDUAL'`, com histórico de mensagens de verdade, de 3 a 121 interações) na mesma situação,
e outros **35 contatos com `lead_name` vazio** (`null`). Isso é bug de pipeline (ver demanda 169
pra causa raiz no n8n), não caso isolado — a busca por nome não encontra pelo menos 64 clientes
reais hoje.

## Objetivo
Os 29 contatos com nome errado ("J S Gráfica") ficam com um nome utilizável (ou claramente
marcados como "sem nome capturado", nunca com o nome da empresa) — e mapear os 35 com nome vazio
pra decisão do Edvam sobre como tratá-los.

## Escopo
- Incluído:
  1. Levantar de novo (a lista pode ter mudado) todos os contatos `tipo_registro = 'INDIVIDUAL'`
     com `lead_name = 'J S Gráfica'` (ou qualquer variação do nome da empresa/`empresa_nome` de
     `jsgrafica_agent_config`) — reconfirmar quantidade e reunir contexto de cada um (telefone,
     `total_interacoes`, última mensagem, se possível uma pista do nome real numa mensagem
     recebida).
  2. Para os que tiverem pista de nome real capturável (ex. cliente se apresentou numa mensagem,
     ou tem pedido vinculado com `nome_cliente` preenchido — ver demanda 167 mesmo raciocínio),
     propor a correção e aplicar após validação do Edvam (não aplicar em massa sem checagem —
     nome de gente é sensível, format errado pode piorar).
  3. Contatos sem nenhuma pista de nome real: reportar como "sem nome capturável, considerar
     limpar pra null em vez do nome da empresa" e perguntar ao Edvam se aplica.
  4. Mapear os 35 com `lead_name` nulo (contagem atual, perfil — a maioria já cai corretamente
     como "Contato privado" na exibição, então não é urgente do mesmo jeito, mas documentar).
- Explicitamente fora de escopo: mudar o pipeline do n8n que causa o problema (demanda 169,
  01-N8N). Mudar o código do app que também contribui pro problema (demanda 167, 03-APP).

## Critérios de aceite
- [ ] Lista revalidada dos 29 (ou quantos existirem agora) com contexto reunido
- [ ] Proposta de correção por contato (nome real encontrado vs. sem pista) levada ao Edvam antes
      de qualquer UPDATE em massa
- [ ] Aplicado só o que o Edvam aprovar, com relato claro de quantos foram corrigidos e como
- [ ] Contagem final dos 35 com nome vazio documentada (sem necessidade de correção imediata)

## Riscos e cuidados
Não aplicar correção de nome em massa sem confirmação — errar o nome de um cliente real é pior
que deixar como está. Preferir perguntar caso a caso ou em lote pequeno.

## Referências
`jsgrafica_contatos` (`lead_name`, `tipo_registro`, `total_interacoes`). Achado original: Laura
Isabel, `9324776665254@lid`. Demandas 167 (código) e 169 (causa raiz n8n) tratam do mesmo
problema por ângulos diferentes.

## Relato de execução

**Status: concluída.** Decisões do Edvam (2026-07-14) aplicadas em 2026-07-15.

### 1. Revalidação: 32 contatos (não 29 — cresceu desde 13/07, como esperado)

`tipo_registro='INDIVIDUAL' AND lead_name='J S Gráfica'` (variações de nome de empresa como
"Maggrafica"/"Flávio José Gráfica"/"Gráfica Matriz Visual" são empresas reais de terceiros que só
contêm a palavra "gráfica" — excluídas, não são o bug).

### 2. Proposta de correção — 11 contatos com nome real recuperável via pedido vinculado

Cruzando cada um dos 32 com `jsgrafica_pedidos.nome_cliente` (excluindo nomes que também
contenham "gráfica", pra não reintroduzir o mesmo erro):

| Telefone | Nome proposto | Interações | Atendente | Origem da pista |
|---|---|---|---|---|
| 558199744479 | Laura Isabel | 52 | Gabi | pedido vinculado (caso original) |
| 558187613253 | Otto Silva | 21 | Gabi | pedido vinculado |
| 558195871022 | Vera Menezes 🍃🌻 | 12 | Edvam | pedido vinculado |
| 558186294739 | Helizama Alves | 4 | Edvam | pedido vinculado |
| 558197378606 | Josenildo | 4 | Gabi | pedido vinculado |
| 558199098314 | Giselia | 4 | Gabi | pedido vinculado |
| 558191959185 | Luciana | 3 | Gabi | pedido vinculado |
| 558196829305 | Maria Jovencleide | 3 | Gabi | pedido vinculado |
| 558185841475 | ~ helena | 3 | Gabi | pedido vinculado (nome como o cliente digitou, com "~") |
| 558195326320 | Ester Costa | 3 | — | pedido vinculado |
| 558182007707 | sthe | 3 | Gabi | pedido vinculado (nome curto/apelido, é o que existe) |

**Caso especial, não incluir na correção em massa**: `558198257944` também está com
`lead_name='J S Gráfica'`, mas é o **próprio telefone do Edvam** (`tutor_phone` em
`jsgrafica_agent_config`) — não é cliente. Aparece como contato porque ele mesmo mandou mensagem
pro número da gráfica em algum momento. Sugestão: não "corrigir" pra um nome de cliente (não é
um) — perguntar ao Edvam se prefere deixar `null`, marcar como "Edvam (interno)", ou remover a
linha (se for só ruído de teste).

**Caso especial, resolvido pela demanda 170** (mesma linha, telefone/`contact_lid` trocados):
`phone='250899775631523@lid'` / `contact_lid='558186108547'` — a 170 concluiu que era linha órfã
(zero mensagem recebida própria, histórico real da cliente já preservado em outro contato correto,
`Emilly ❤️💕`/`558189349068`) e **removeu a linha**. Não precisa de decisão de nome aqui — some da
contagem dos 32.

### 3. Sem nenhuma pista de nome — 19 contatos

Os 32 menos os 11 do item 2, menos os 2 casos especiais = **19 contatos sem nenhuma pista de nome
real**: nem pedido vinculado com nome real, nem mensagem de auto-apresentação (testei padrão
`meu nome é / me chamo / aqui é o(a) / sou o(a)` nas mensagens recebidas desses 19 — zero
ocorrências). Variam de 1 a 105 interações (o de 105, `558196210801`, é `RECORRENTE` com atendente
não atribuído — cliente ativo, só nunca disse o nome nem teve pedido com nome capturado).

**Proposta**: limpar `lead_name` pra `null` nesses 19 (em vez de manter o nome da empresa, que é
enganoso), consistente com o que a demanda já cogitava — mas só aplicar com aprovação do Edvam,
já que "sem nome nenhum" também é uma escolha visível na tela (aparece como "Contato privado" ou
o telefone, dependendo de como o Inbox/Clientes tratam `lead_name IS NULL`).

### 4. Contatos com `lead_name` nulo — 35 (contagem confirmada, igual ao já reportado)

`tipo_registro='INDIVIDUAL' AND lead_name IS NULL`: **35 contatos** — 13 `classificacao=
'RECORRENTE'`, 22 sem classificação ainda. Não é urgente corrigir (a demanda 168 already nota que
a maioria cai corretamente como "Contato privado" na exibição) — só documentando a contagem atual
como pedido, sem ação proposta.

### Decisão do Edvam e aplicação (2026-07-14/15)

1. **Os 11 nomes propostos, aplicados.**
2. **`558198257944` (telefone do próprio Edvam) nomeado "Edvam Filho"** (decisão explícita, não
   ficou sem nome nem foi removido — passa a aparecer como um contato normal, identificável).
3. **Os 19 sem nenhuma pista: `lead_name` limpo pra `null`.**

```sql
-- 12 nomes (11 propostos + Edvam Filho), via VALUES + join por telefone
update jsgrafica_contatos c set lead_name = n.nome_novo, atualizado_em = now()
from (values ('558199744479','Laura Isabel'), ('558187613253','Otto Silva'),
  ('558195871022','Vera Menezes 🍃🌻'), ('558186294739','Helizama Alves'),
  ('558197378606','Josenildo'), ('558199098314','Giselia'), ('558191959185','Luciana'),
  ('558196829305','Maria Jovencleide'), ('558185841475','~ helena'),
  ('558195326320','Ester Costa'), ('558182007707','sthe'), ('558198257944','Edvam Filho')
) as n(telefone, nome_novo)
where c.phone = n.telefone and c.tipo_registro='INDIVIDUAL' and c.lead_name='J S Gráfica';
-- 12 linhas

update jsgrafica_contatos set lead_name = null, atualizado_em = now()
where tipo_registro='INDIVIDUAL' and lead_name = 'J S Gráfica';
-- 19 linhas (tudo que sobrou depois do UPDATE acima)
```

**Confirmação final**: `SELECT COUNT(*) WHERE tipo_registro='INDIVIDUAL' AND lead_name='J S
Gráfica'` → **0** — nenhum contato individual segue com o nome da empresa.

O caso ligado à demanda 170 (linha telefone/`contact_lid` trocados) já tinha sido removido
naquela demanda, nada a fazer aqui — confirmado que não sobrou no universo dos 32.

### Achados fora do escopo
Nenhum novo.

### Critérios de aceite
- [x] Lista revalidada dos 32 (não mais 29) com contexto reunido
- [x] Proposta de correção por contato levada ao Edvam e aprovada
- [x] Aplicado exatamente o que o Edvam aprovou: 12 nomes corrigidos, 19 limpos pra `null`
- [x] Contagem final dos 35 com nome vazio documentada (13 recorrentes, 22 sem classificação —
      esses continuam como estavam, fora do escopo desta correção)
