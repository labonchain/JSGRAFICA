# Proposta de schema pro Canal do WhatsApp (demanda 354)

Proposta do 07-Marketing pro 02-DADOS, não aplicada por este chat (regra de sempre: schema/coluna
nova no Supabase é do 02-DADOS). O código da aplicação (`lib/canalWhatsapp.ts`,
`app/api/marketing/canal/*`) já está escrito contra este schema, só falta ele existir de verdade
pra testar ponta a ponta.

## 1. Coluna nova em `jsgrafica_agent_config`

Guarda o `id` do canal (`...@newsletter`), mesmo padrão já usado pro `tutor_phone` (config única
por instância, não por post).

```sql
alter table jsgrafica_agent_config add column canal_whatsapp_id text;
update jsgrafica_agent_config set canal_whatsapp_id = '120363412925013708@newsletter' where ativo = true;
```

O valor já existe de verdade (canal real criado na demanda 352, confirmado `state: ACTIVE`).

## 2. Tabela nova `jsgrafica_canal_posts`

Diferente do Status (`labon_status_queue`, fila compartilhada do LabOnchain), o Canal não tem fila
equivalente — precisa de tabela própria. Schema espelha `PostStatus`
(`lib/labonStatus.ts`) pra manter os dois modelos consistentes, com 2 campos a mais
(`message_id`, pra guardar o retorno da Z-API — útil se um dia quisermos contador de
visualização como o Status ganhou na 345):

```sql
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

RLS ligada + revoke de `anon`/`authenticated` de cara (lição da 327/342 aplicada desde o desenho,
não deixada pra depois) — só `service_role` acessa, mesmo padrão de toda tabela `jsgrafica_*`
criada desde a 327.

## Por que não uso `labon_status_queue`

Aquela tabela é compartilhada entre todos os clientes do LabOnchain (`agent_slug`) e o consumidor
(`LABON_STATUS`) processa 1 item por hora, globalmente — desenhada especificamente pro fluxo de
Status via webhook `LABON_DASHBOARD_STATUS`. O Canal fala direto com a Z-API (sem webhook
intermediário, sem `agent_slug`), então reaproveitar essa tabela misturaria dois contratos
diferentes sem necessidade.

## Nota sobre o robô de disparo agendado

Pedido à parte do Edvam (29/08): um robô rodando a cada 30min (`status='approved'` +
`scheduled_at` já passado → publica de verdade), equivalente ao `LABON_STATUS` do Status. Fica fora
desta proposta de schema (é workflow/cron, não tabela), mas vai LER desta tabela quando existir —
mencionando aqui pro 02-DADOS/01-N8N terem o contexto completo.
