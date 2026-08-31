# 221 — Criar tabela jsgrafica_mercadopago_falhas_cobranca

Status: concluída
Criada em: 2026-07-21
Aprovada em: 2026-07-21
Concluída em: 2026-07-21
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Pré-requisito da demanda 220 (03-APP): persistir falha de geração de cobrança Pix de forma
consultável, hoje é ponto cego (log da Vercel expira/tem limite de billing, `criarCobrancaPix`
só usa `console.error`). O 03-APP investigou e propôs o formato da tabela abaixo, mas criação de
schema é domínio do 02-DADOS, não dele — por isso esta demanda separada.

## Objetivo
Tabela `jsgrafica_mercadopago_falhas_cobranca` existe, com RLS travada (só service_role),
pronta pro 03-APP gravar nela na demanda 220.

## Escopo
- Incluído: criar a tabela com estas colunas (proposta do 03-APP, ajustar só se houver motivo
  técnico concreto, documentando o motivo):

| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `created_at` | timestamptz | `now()` |
| `data_dia` | text | formato `DD-MM-AA`, mesma convenção do resto do sistema |
| `origem` | text | `'pedidos'` ou `'mercadopago_cobranca'` — considerar `CHECK` restringindo a esses 2 valores |
| `pedido_id` | text, null | quando a referência é um pedido único |
| `venda_id` | text, null | quando a referência é uma venda (balcão/múltiplos itens) |
| `telefone` | text, null | ajuda a cruzar com a conversa no Inbox |
| `valor` | numeric | valor que se tentou cobrar |
| `erro_mensagem` | text | mensagem do erro capturado (truncada) |
| `tempo_decorrido_ms` | integer, null | medido no caller antes/depois do `await criarCobrancaPix` |
| `payload_tentativa` | jsonb, null | resumo da tentativa (valor, telefone, referência) |

- Incluído: RLS habilitada, sem policy pra `anon`/`authenticated` — mesmo padrão de todas as
  tabelas `jsgrafica_*` (só `service_role` acessa).
- Incluído: migration versionada (arquivo `.sql` documentado, mesmo sem git conectado ainda).
- Explicitamente fora de escopo: alterar `lib/mercadopago.ts` ou qualquer código do app (isso é
  a demanda 220, do 03-APP, depois que esta tabela existir).

## Critérios de aceite
- [ ] Tabela criada exatamente com as colunas acima (ou com ajuste justificado)
- [ ] RLS travada, confirmado que `anon`/`authenticated` não acessam
- [ ] Migration documentada

## Riscos e cuidados
Não criar policy nenhuma além do padrão já usado nas outras tabelas `jsgrafica_*` — service_role
só, mesmo esquema de segurança do resto do projeto.

## Referências
Demanda 220 (03-APP, persistir falha de cobrança — depende desta). Achado do 05-FINANCEIRO
(2026-07-21): log da Vercel deu `ExceedsBillingLimitError` pra janela do `ped-1251`, confirmando
que hoje não há como auditar falha passada.

## Relato de execução

**Status: concluída.** Tabela criada exatamente com as colunas propostas pelo 03-APP, sem
nenhum ajuste (nenhum motivo técnico exigiu mudança).

### O que foi feito

Antes de criar, conferi o padrão de RLS já usado nas outras tabelas `jsgrafica_*`
(`jsgrafica_transferencias`, `jsgrafica_saidas`, `jsgrafica_pedidos` via `pg_class`/`pg_policies`):
RLS habilitada, `relforcerowsecurity=false`, zero policies — nenhuma policy pra `anon`/
`authenticated`, só `service_role` (que faz bypass de RLS) acessa. Apliquei a migration
`jsgrafica_mercadopago_falhas_cobranca` (versionada, `supabase migrations`, nome
`20260721184706_jsgrafica_mercadopago_falhas_cobranca`) replicando exatamente esse padrão:

```sql
create table jsgrafica_mercadopago_falhas_cobranca (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  data_dia text not null,
  origem text not null check (origem in ('pedidos', 'mercadopago_cobranca')),
  pedido_id text,
  venda_id text,
  telefone text,
  valor numeric not null,
  erro_mensagem text not null,
  tempo_decorrido_ms integer,
  payload_tentativa jsonb
);

alter table jsgrafica_mercadopago_falhas_cobranca enable row level security;
```

`valor` e `erro_mensagem` ficaram `not null` (a demanda não pedia explicitamente, mas uma falha de
cobrança sem valor ou sem mensagem de erro não tem utilidade nenhuma pra consulta — decisão
pequena, documentando o motivo como pedido no escopo). Todo o resto ficou exatamente como
proposto.

### Testes realizados e resultado

Confirmei colunas via `information_schema.columns` (bate exatamente com a proposta). Testei RLS
de verdade, não só a leitura de `pg_class` (que só confirma configuração, não comportamento):
inseri 1 linha sintética, rodei `set role anon` → `select count(*)` → **0 linhas visíveis**;
`set role authenticated` → **0 linhas visíveis**; conexão normal (service_role) → 1 linha visível
— confirma que o bloqueio é real, não só "RLS ligada sem policy" na teoria. Testei também o
`CHECK` de `origem`: insert com valor fora de `'pedidos'`/`'mercadopago_cobranca'` foi rejeitado
(`violates check constraint`). Apaguei a linha sintética depois do teste — tabela vazia,
confirmado, pronta pro 03-APP usar na demanda 220.

### Achados fora do escopo
Nenhum.

### Status final
Concluída. Tabela no ar, RLS travada e testada (não só configurada), CHECK testado, migration
documentada e registrada (`20260721184706`). Nenhuma alteração em código do app (fora de escopo,
demanda 220).

### Critérios de aceite
- [x] Tabela criada exatamente com as colunas propostas (2 colunas viraram `not null` por motivo
      documentado acima, resto idêntico)
- [x] RLS travada, confirmado que `anon`/`authenticated` não acessam (testado com linha real, não
      só inspeção de configuração)
- [x] Migration documentada (`20260721184706_jsgrafica_mercadopago_falhas_cobranca`)
