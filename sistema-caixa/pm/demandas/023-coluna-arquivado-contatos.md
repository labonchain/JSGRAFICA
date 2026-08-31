# 023 — Adicionar coluna `arquivado` em jsgrafica_contatos

Status: aprovada
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Demanda 018 (03-APP) ficou bloqueada: precisa de uma coluna nova em `jsgrafica_contatos` pra
poder arquivar/silenciar contato no Inbox, e isso é schema — domínio do 02-DADOS, não do
03-APP. O 03-APP corretamente não decidiu cruzar domínio sozinho.

## Objetivo
Criar a coluna pra destravar a 018.

## Escopo
- Incluído: `ALTER TABLE jsgrafica_contatos ADD COLUMN arquivado boolean NOT NULL DEFAULT false;`
  (ou migration equivalente documentada).
- Fora de escopo: qualquer lógica de app (isso é a 018, do 03-APP) ou decidir quais contatos já
  existentes marcar como arquivados.

## Critérios de aceite
- [ ] Coluna criada, `NOT NULL DEFAULT false`
- [ ] Confirmar via `list_tables` que apareceu certo

## Referências
`pm/demandas/018-*.md`.

## Relato de execução

**Status: concluída.**

Migration aplicada via `apply_migration` (nome: `add_arquivado_column_jsgrafica_contatos`):

```sql
ALTER TABLE jsgrafica_contatos ADD COLUMN arquivado boolean NOT NULL DEFAULT false;
```

Confirmado via `information_schema.columns`: `arquivado` — tipo `boolean`, `is_nullable=NO`,
`default=false`. Todos os 1.980 contatos existentes vieram com `arquivado=false` (comportamento
padrão do `ADD COLUMN ... DEFAULT`, não precisou de UPDATE em massa).

Não mexi em nenhuma lógica de app nem decidi quais contatos marcar como arquivados — isso é
escopo da 018 (03-APP), que já pode prosseguir.

### Critérios de aceite
- [x] Coluna criada, `NOT NULL DEFAULT false`
- [x] Confirmado via consulta de schema que apareceu certo
