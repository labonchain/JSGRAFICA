# 342 - Criar tabela de log de visualização de Status

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: 2026-08-28
Chat executor: 02 - DADOS JS GRAFICA

Primeira peça de 3 sequenciais (342 → 344 → 345) pra resolver o achado da demanda 340: o
callback de visualização de Status (`phone: "status@broadcast"`, 95% dos casos reais no pico
descrito na 340) roda um fluxo pesado no n8n sem produzir nenhum resultado útil hoje. O `01-N8N`
confirmou com payload real que cada callback traz o campo `participant` com o LID numérico de
quem visualizou (mesmo espaço de `jsgrafica_contatos.contact_lid`, 6 de 10 testados já batem com
contato cadastrado) — dá pra guardar isso como dado real de alcance do Status, útil pro
Marketing, em vez de só descartar.

## Objetivo
Criar tabela leve de log: `jsgrafica_status_visualizacoes` (`participant`/LID do espectador,
referência do Status visualizado, timestamp), RLS ligado + grant restrito ao `service_role`
(mesmo padrão da demanda 327), sem política pública.

## Escopo
- Incluído: só a tabela nova (schema, RLS, grants).
- Explicitamente fora de escopo: mudança no workflow n8n (isso é a 344, depois desta) e a tela de
  exibição (isso é a 345, depois da 344) — sequência intencional, não mandar em paralelo.

## Riscos e cuidados
Mesmo padrão de segurança já estabelecido hoje (327/332): RLS ligado, sem grant público, só
`service_role` acessa.

## Referências
Demanda 340 (investigação original, payload real dos 44 callbacks inspecionados).

## Relato de execução

**Status: concluída.** Tabela `jsgrafica_status_visualizacoes` criada, RLS travada, testada com
linha real (não só configuração), pronta pra 344 escrever nela.

### O que foi feito

Schema exatamente no formato já acordado no relato da 340 (`participant`, `ids`, `status`,
`momment`), sem inventar campo novo — só adicionei `id` (PK) e `created_at` (padrão de toda tabela
`jsgrafica_*`):

```sql
create table jsgrafica_status_visualizacoes (
  id uuid primary key default gen_random_uuid(),
  participant text not null,
  ids jsonb,
  status text,
  momment bigint,
  created_at timestamptz not null default now()
);
```

- `participant`: LID numérico do espectador (mesmo espaço de `jsgrafica_contatos.contact_lid`,
  confirmado na 340), `not null` — é a razão de existir da tabela, uma linha sem isso não serve.
- `ids`: `jsonb` (não array de `text` simples) pra preservar a estrutura bruta do campo `ids` do
  callback Z-API sem forçar conversão — a 344 decide como consumir.
- `status`/`momment`: tipos nullable, `momment` como `bigint` (não `timestamptz`) pra bater com o
  mesmo padrão já usado em todo o resto do projeto pro campo bruto da Z-API (epoch ms, conversão
  fica pra quem consome, mesmo motivo já documentado na demanda 235 sobre `data_timestamp`).

**RLS + grants, aplicando a lição da própria demanda 327 (2026-08-27, achado meu de que "RLS
ligada" sozinha não bastava, faltava revogar o grant de base)**: desta vez já criei revogando de
cara, não deixei pra depois —

```sql
alter table jsgrafica_status_visualizacoes enable row level security;
revoke all on jsgrafica_status_visualizacoes from anon, authenticated;
```

### Testes realizados e resultado

- Colunas conferidas via `information_schema.columns` — batem exatamente com o desenho acima.
- **Teste real, não só configuração** (mesmo rigor das demandas 221/226/327): inseri 1 linha
  sintética (`participant` fake, `ids`/`status`/`momment` de teste), `set role anon` →
  `permission denied for table` (bloqueio de GRANT, nem chega a avaliar RLS — mais forte que só
  RLS negando); `set role authenticated` → mesmo bloqueio; conexão normal (`service_role`) → linha
  visível normalmente. Linha sintética apagada depois, confirmado 0 linhas restantes — tabela
  limpa, pronta pra primeira escrita real da 344.

### Achados fora do escopo
Nenhum — escopo desta demanda era só a tabela, conforme pedido ("explicitamente fora de escopo:
mudança no workflow n8n e a tela de exibição").

### Status final
Concluída. Tabela no ar, RLS + grant travados e testados com linha real, mesmo padrão de segurança
da 327/332. Nenhuma mudança em workflow n8n ou tela — fora de escopo desta peça, conforme
combinado. Liberado pra 344 seguir.
