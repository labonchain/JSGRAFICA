# 327 - Revisão completa de RLS/grants nas tabelas jsgrafica_* (varredura de 27/08)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 02 - DADOS JS GRAFICA

Achado na varredura completa pedida pelo Edvam em 27/08. Nada aqui é explorável HOJE (RLS nega
tudo por padrão sem política), mas são portas destrancadas esperando alguém trancar de verdade.
Nada foi alterado até aqui, só documentado.

## Objetivo
Revogar o grant amplo (`anon`/`authenticated`) das 28 tabelas `jsgrafica_*` que não precisam de
acesso direto por essas roles, criar política de leitura pra `jsgrafica_log_msgs_privadas` se
fizer sentido pro uso futuro do painel LabON, e corrigir `jsgrafica_agente_teste_append_mensagem`
pra `SECURITY INVOKER` ou com checagem explícita de dono.

## Contexto

Recebemos um relatório de segurança de outra sessão (lado LabOnchain/segurança compartilhada)
sobre RLS no banco Supabase compartilhado (`arqkdnexpederquztegn`), nas tabelas `jsgrafica_*`.
Cada achado abaixo foi **reconferido de forma independente**, com SQL real rodado agora, não só
aceito da fonte original.

## 1. `jsgrafica_log_msgs_privadas` sem política de leitura — CONFIRMADO

RLS ligado (`relrowsecurity=true`), zero linhas em `pg_policies` pra essa tabela. Confirmado por
mim com SQL direto agora (`policies_log_msgs: 0, rls_log_msgs: true`) e batendo com o advisor de
segurança do próprio Supabase (`rls_enabled_no_policy`).

**Efeito prático**: qualquer leitura via PostgREST com chave `anon`/`authenticated` (ex: painel
LabON usando login do tutor) volta sempre vazio, mesmo com mensagem real gravada. Não é
urgente hoje (JS Gráfica não usa esse caminho), mas se um dia quiserem usar a tela "Conversas" do
painel LabON pro WhatsApp de vocês, precisa de política nova (mesmo padrão já aplicado em outros
tenants).

## 2. Tabelas financeiras com permissão ampla concedida às roles públicas, sem nenhuma política — CONFIRMADO

Confirmado com SQL direto agora: `jsgrafica_pedidos` tem RLS ligado, zero políticas, e grant
completo (`SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER`) pras roles `anon` e
`authenticated`. Mesmo padrão nas outras 27 tabelas `jsgrafica_*` (levantamento completo abaixo).

| Tabela | RLS | Políticas | Grants anon/authenticated |
|---|---|---|---|
| `jsgrafica_pedidos` | ligado | 0 | CRUD completo |
| `jsgrafica_vendas` | ligado | 0 | CRUD completo |
| `jsgrafica_saidas` | ligado | 0 | CRUD completo |
| `jsgrafica_transferencias` | ligado | 0 | CRUD completo |
| `jsgrafica_fechamento` | ligado | 0 | CRUD completo |
| `jsgrafica_contas_bancarias` | ligado | 0 | CRUD completo |
| `jsgrafica_contas_pagar_receber` | ligado | 0 | CRUD completo |
| `jsgrafica_entradas_avulsas` | ligado | 0 | CRUD completo |
| `jsgrafica_conciliacao_pendencias` | ligado | 0 | CRUD completo |
| `jsgrafica_mercadopago_config` | ligado | 0 | CRUD completo |
| `jsgrafica_mercadopago_eventos` | ligado | 0 | CRUD completo |
| `jsgrafica_mercadopago_falhas_cobranca` | ligado | 0 | CRUD completo |

Mesmo padrão (RLS ligado, zero política, grant completo) também em `jsgrafica_produtos`,
`jsgrafica_rascunhos_pedido`, `jsgrafica_categorias_saida`, `jsgrafica_telefones_autorizados`,
`jsgrafica_log_msgs_grupos`, `jsgrafica_log_eventos_instancias`, `jsgrafica_memoria_conversas`,
`jsgrafica_n8n_chat_histories_`, `jsgrafica_agent_rag`, `jsgrafica_abertura_caixa`,
`jsgrafica_backfill_telefone_lid_log`, `jsgrafica_catalogo_assets/modalidades/publicacao`,
`jsgrafica_agente_teste_sessoes` — 28 tabelas ao todo.

**Por que é seguro hoje mas é risco real**: sem política, o Postgres nega tudo por padrão pras
roles `anon`/`authenticated`, mesmo com o grant amplo concedido na base. Mas se qualquer política
nova for criada numa dessas tabelas no futuro (mesmo pra outro propósito, por engano) sem revisar
esse grant de base antes, ela abre acesso público sem ninguém perceber — foi exatamente esse
padrão que já causou 2 incidentes reais em outros tenants do LabOnchain este mês (não da JS
Gráfica, mas mesmo molde de banco).

**Nuance que o relatório original não mencionou**: 3 tabelas (não financeiras) já têm política de
leitura de verdade, restrita por `tutor_phone` do JWT: `jsgrafica_agent_config`,
`jsgrafica_contatos`, `jsgrafica_send_queue`. Essas seguem outro padrão, correto.

## 3. Função `jsgrafica_agente_teste_append_mensagem` sem checagem de dono — CONFIRMADO, achado novo

Não estava no relatório original, achado durante a varredura e **conferido por mim com SQL
direto**:

```sql
CREATE OR REPLACE FUNCTION public.jsgrafica_agente_teste_append_mensagem(p_sessao_id uuid, p_item jsonb)
 RETURNS jsgrafica_agente_teste_sessoes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r jsgrafica_agente_teste_sessoes;
begin
  update jsgrafica_agente_teste_sessoes
  set mensagens = coalesce(mensagens, '[]'::jsonb) || jsonb_build_array(p_item),
      ultima_mensagem_at = now(), updated_at = now()
  where id = p_sessao_id
  returning * into r;
  return r;
end;
$function$
```

`EXECUTE` concedido a `anon` E `authenticated` (confirmado via `information_schema.
role_routine_grants`). Como é `SECURITY DEFINER`, ela roda com o dono da função, **ignorando RLS
por completo**. O corpo não faz NENHUMA checagem de quem está chamando — qualquer um com a chave
`anon` pública (que é client-visível por design em qualquer app Supabase) pode chamar essa RPC com
qualquer `p_sessao_id` e injetar JSON arbitrário em `mensagens` de qualquer sessão de teste.

**Impacto real hoje**: baixo — `jsgrafica_agente_teste_sessoes` é declaradamente "sessão de teste
isolado, não é fonte de verdade de produção" (comentário da própria tabela), com poucas linhas.
Mas é um padrão arquitetural real que precisa de correção (`SECURITY INVOKER` em vez de
`DEFINER`, ou checagem explícita dentro da função) antes de esse padrão ser reaproveitado pra
alguma coisa que já valha dinheiro/dado real.

## 4. Achado do relatório original NÃO reproduzido: `jsgrafica_agent_config` com 0 linhas

A investigação inicial (agente) reportou `jsgrafica_agent_config` com 0 linhas, diferente de
todo tenant irmão (labon/oa/dizurefeicoes/kuidu/etc, todos com 1 linha) — e levantou isso como
possível anomalia. **Reconferido por mim agora, com SQL direto, contagem real: 1 linha.** Não
bate com o relatado. Pode ter sido erro de leitura do agente ou mudança de estado entre as duas
checagens (poucos minutos de diferença) — não estou tratando isso como achado confirmado, só
registrando a divergência pra não virar suposição errada no radar de ninguém.

## Recomendação

Nada urgente hoje (tudo protegido pelo default-deny), mas os itens 1-3 merecem ficar no radar de
segurança antes de qualquer política nova ser criada nessas tabelas, e o item 3 merece correção
própria (é código real, não config). Prioridade e ordem ficam com o Edvam.

## Relato de execução

**Status: concluída.** Reconferi os 3 achados de novo com SQL direto antes de mexer em qualquer
coisa (não confiei só no que já estava escrito no arquivo) — todos bateram exatamente.

### O que foi feito

1. **Revogado o grant amplo de `anon`/`authenticated`** (`REVOKE ALL`) nas **25 das 28 tabelas**
   listadas (as 28 menos as 3 que já têm política própria funcionando de verdade —
   `jsgrafica_agent_config`, `jsgrafica_contatos`, `jsgrafica_send_queue` — essas eu NÃO toquei,
   revogar o grant base delas quebraria a política real que já usa). Migration
   `demanda_327_revogar_grants_anon_authenticated`.
2. **`jsgrafica_agente_teste_append_mensagem`**: troquei `SECURITY DEFINER` → `SECURITY INVOKER`
   (migration `demanda_327_security_invoker_agente_teste_append`), mesmo corpo da função, só a
   cláusula de segurança mudou. Confirmei antes que nenhum caminho legítimo (app Next.js, n8n)
   depende de `anon`/`authenticated` chamando essa RPC — grep completo no `caixa-js-grafica`
   mostrou que todo acesso a `jsgrafica_agente_teste_sessoes` no app usa `supabaseAdmin`
   (service_role); a única chamada real da RPC é do n8n (Caminho C, workflows 296/297), que usa
   credencial service_role em todos os workflows já inspecionados neste projeto.
3. **Item 2 do objetivo (política de leitura pra `jsgrafica_log_msgs_privadas`) — decisão
   consciente de NÃO criar agora**: o próprio objetivo da demanda condiciona isso a "se fizer
   sentido pro uso futuro do painel LabON" — não existe uso real hoje (JS Gráfica não usa esse
   caminho), e criar uma política de leitura sem um caso de uso real pra validar contra é mais
   risco que benefício. Deixei essa tabela no mesmo tratamento do item 1 (grant revogado, RLS
   segue negando tudo) — se o painel LabON for usado de verdade no futuro, política e grant devem
   nascer juntos, na mesma demanda, não grant solto na frente.

### Testes realizados e resultado

- **Antes da mudança**: `has_table_privilege('anon', <tabela>, 'SELECT')` = `true` nas 25
  tabelas, confirmando o achado original.
- **Depois do REVOKE**: reconferido pra todas as 28 (as 25 revogadas + as 3 preservadas) —
  `anon_select`/`anon_insert`/`auth_select` = `false` exatamente nas 25 certas, `true` intocado
  nas 3 com política própria (`jsgrafica_agent_config`, `jsgrafica_contatos`,
  `jsgrafica_send_queue`). `service_role` confirmado com `SELECT`/`INSERT` = `true` em todas as
  28, sem exceção — o caminho real do app/n8n não foi afetado.
- **Smoke test da aplicação**: `GET /api/inbox/conversas` em produção depois do REVOKE — resposta
  401, investigada e confirmada como comportamento **não relacionado** a esta mudança (gate de
  segredo HMAC em `middleware.ts` pra toda rota `/api/*`, adicionado por outra demanda depois da
  última vez que rodei aqui; não existe em nenhuma rota checagem de RLS/grant que dependeria do
  que eu mudei, todas usam `supabaseAdmin`). A prova real de que nada quebrou é a checagem direta
  de `service_role` acima, não esse smoke test.
- **Teste real da função** (não só leitura do `security_type`): criei 1 sessão de teste sintética
  em `jsgrafica_agente_teste_sessoes`, chamei a RPC como `anon` — **bloqueada** (`permission
  denied for table jsgrafica_agente_teste_sessoes`, a vulnerabilidade está fechada de verdade, não
  só no papel); chamei de novo como `service_role` — **funcionou normal**, mensagem gravada
  corretamente (`mensagens: [{"de":"teste_demanda_327"}]`). Linha sintética apagada depois,
  confirmado 0 linhas restantes desse telefone de teste.
- 100% das alterações foram as 2 migrations acima + 1 sessão sintética criada e apagada pro teste
  da função — nenhum dado real de produção tocado.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo além do que já estava documentado no próprio arquivo (itens 1-4 do levantamento
original, já cobertos acima).

### Status final
Concluída. Itens 1 e 2 do objetivo (revogar grant amplo) resolvidos nas 25 tabelas que precisavam;
item 3 (função) corrigido e testado com bloqueio real confirmado; política nova pra
`jsgrafica_log_msgs_privadas` deliberadamente não criada agora (sem caso de uso real hoje, decisão
documentada acima, não esquecimento). Nenhuma regressão encontrada — `service_role` (o único
caminho que app/n8n realmente usam) confirmado intacto em todas as 28 tabelas.
