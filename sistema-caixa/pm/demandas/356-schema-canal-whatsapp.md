# 356 - Schema do Canal do WhatsApp (coluna + tabela nova)

Status: concluída
Criada em: 2026-08-29
Aprovada em: 2026-08-29 (segue diretamente da 354, já aprovada pelo Edvam; proposta técnica
pronta do 07-Marketing, só falta o 02-DADOS aplicar)
Concluída em: 2026-08-29
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Proposta completa (SQL + justificativa) já escrita pelo 07-Marketing em
`pm/conhecimento/proposta-schema-canal-whatsapp-354.md`, parte da demanda 354 (implementação real
do Canal do WhatsApp em Marketing → Conteúdo). O código da aplicação (`lib/canalWhatsapp.ts`,
`app/api/marketing/canal/*`) já está escrito contra esse schema, só falta ele existir de verdade.
Também é pré-requisito da demanda 355 (robô de disparo agendado, 01-N8N), que vai ler a tabela
`jsgrafica_canal_posts` quando existir.

## Objetivo
Schema criado de verdade no Supabase, exatamente como proposto (ou com ajuste justificado, se o
02-DADOS achar algo a corrigir na proposta).

## Escopo
Incluído, ver SQL completo em `pm/conhecimento/proposta-schema-canal-whatsapp-354.md`:
1. Coluna `canal_whatsapp_id text` em `jsgrafica_agent_config`, preenchida com o `id` real do
   canal (`120363412925013708@newsletter`, canal já existe de verdade desde a 352).
2. Tabela nova `jsgrafica_canal_posts` (espelha o modelo `PostStatus` do Status, com `message_id`
   extra), RLS habilitada e `revoke all... from anon, authenticated` desde a criação (lição da
   327/342, não deixar pra depois).

Explicitamente fora de escopo: qualquer mudança de schema fora do que está na proposta, mudar
lógica de aplicação (isso é do 07-Marketing).

## Critérios de aceite
- [x] Coluna `canal_whatsapp_id` criada e preenchida.
- [x] Tabela `jsgrafica_canal_posts` criada, RLS ligada, `anon`/`authenticated` sem grant.
- [ ] Confirmado com o 07-Marketing que o schema bate com o que o código espera (pendente, ver
      relato abaixo).

## Referências
`pm/conhecimento/proposta-schema-canal-whatsapp-354.md` (proposta completa),
`pm/demandas/354-implementar-canal-whatsapp-marketing-conteudo.md`,
`pm/demandas/355-robo-disparo-agendado-canal-whatsapp.md` (consumidor futuro da tabela).

## Relato de execução

Verificação antes de aplicar: `jsgrafica_agent_config` ainda sem `canal_whatsapp_id`,
`jsgrafica_canal_posts` ainda não existia, e só 1 linha em `jsgrafica_agent_config` com
`ativo = true` (id=1) — igual ao que a proposta assumia, sem risco de o `update` atingir mais
de 1 linha.

Migration aplicada (`apply_migration`, nome `canal_whatsapp_schema_356`), SQL exatamente igual
ao de `pm/conhecimento/proposta-schema-canal-whatsapp-354.md`, sem nenhum ajuste:
```sql
alter table jsgrafica_agent_config add column canal_whatsapp_id text;
update jsgrafica_agent_config set canal_whatsapp_id = '120363412925013708@newsletter' where ativo = true;

create table jsgrafica_canal_posts (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('text', 'image', 'video')),
  texto text,
  image_url text,
  video_url text,
  caption_image text,
  caption_video text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'published', 'cancelled', 'error')),
  scheduled_at timestamptz not null,
  published_at timestamptz,
  message_id text,
  erro_detalhe text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table jsgrafica_canal_posts enable row level security;
revoke all on jsgrafica_canal_posts from anon, authenticated;
```

Confirmado depois de aplicar:
- `jsgrafica_agent_config` id=1: `canal_whatsapp_id = '120363412925013708@newsletter'` (1 linha
  afetada, a única com `ativo = true`, como esperado).
- `jsgrafica_canal_posts` criada, `relrowsecurity = true`.
- `information_schema.role_table_grants` pra `jsgrafica_canal_posts` retorna vazio pra
  `anon`/`authenticated` — revoke confirmado, só `service_role` acessa.
- `get_advisors` (security) rodado depois da migration: único achado novo é
  `rls_enabled_no_policy` em `public.jsgrafica_canal_posts`, nível **INFO** — esperado e
  intencional (mesmo padrão de toda tabela `jsgrafica_*` desde a 327/342: RLS ligada sem
  policy nenhuma, só `service_role` passa por cima do RLS). Nenhum achado de segurança novo
  fora desse.

Achados fora do escopo: nenhum.

Pendência real: item 3 do critério de aceite (confirmar com o 07-Marketing que o schema bate
com o código já escrito em `lib/canalWhatsapp.ts`/`app/api/marketing/canal/*`) depende do
07-Marketing testar ponta a ponta, não é algo que o 02-DADOS valida sozinho — reportando ao PM
pra decidir se despacha essa confirmação pro 07-Marketing agora ou deixa pra quando ele for
rodar a 354.

Status final: **concluída** (schema em si), com a ressalva acima sobre a confirmação cruzada
com o 07-Marketing.

PRONTO PRA CLEAR.
