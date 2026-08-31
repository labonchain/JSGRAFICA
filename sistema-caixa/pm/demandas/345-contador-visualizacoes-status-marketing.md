# 345 - Contador de visualizações de Status na aba Marketing → Conteúdo (terceira peça, depois da 344)

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: 2026-08-28
Chat executor: 03 - APP JS GRAFICA

Terceira de 3 peças sequenciais (342 → 344 → 345). **Bloqueada até a demanda 344 (01-N8N,
workflow gravando o log) estar concluída e ter dado real acumulando** — não começar antes disso.

## Objetivo
Exibir contador simples de "quantas pessoas viram" ao lado de cada post na aba Marketing →
Conteúdo (Plano de conteúdo / Como vai ficar), somando linhas de
`jsgrafica_status_visualizacoes` pelo Status correspondente.

## Escopo
- Incluído: só o contador agregado (número), integrado na tela que já existe.
- Explicitamente fora de escopo: lista detalhada de QUEM visualizou (só o agregado por agora —
  se quiser a lista individual depois, decide com o Edvam como demanda própria).

## Riscos e cuidados
Só leitura da tabela nova, sem risco pro resto da tela.

## Referências
Demanda 340 (investigação original), demanda 342 (tabela), demanda 344 (workflow gravando o
dado).

## Relato de execução

### Investigação antes de implementar
`jsgrafica_status_visualizacoes` (344) guarda `participant` (LID do espectador) e `ids` (jsonb,
array de `messageId` da Z-API), sem referência direta a QUAL post do `labon_status_queue` foi
visto. Confirmado por cruzamento real: `labon_status_queue.response_zapi->>'messageId'` (gravado
quando o Status é publicado) bate exatamente com o valor dentro de `ids` — é a chave de
correlação. Achado também que a mesma pessoa gera linha duplicada às vezes (mesmo `participant`+
`ids`+`status`, a Z-API reenvia o callback) — contagem precisa ser `count(distinct participant)`,
não linha crua, senão infla o número.

### O que foi feito
Função nova no Postgres, `jsgrafica_contar_visualizacoes_status(message_ids text[])` — recebe uma
lista de `messageId` e devolve `(message_id, visualizacoes)` já deduplicado por participante via
`count(distinct v.participant)`, usando o operador jsonb `?` (existência de elemento no array) pra
casar com `ids`. `security invoker` (não `definer` — lição da 327) + `EXECUTE` revogado de
`public`/`anon`/`authenticated`, só chamada via `service_role`.

`app/api/marketing/conteudo/route.ts` (GET): depois de buscar os posts do webhook compartilhado
(que não expõe `response_zapi`, é genérico pra todos os clientes do LabOnchain), busca direto em
`labon_status_queue` (mesmo projeto Supabase, via `supabaseAdmin`) só o `messageId` de cada post
`published`, chama a função nova com a lista de `messageId` únicos, e anexa `visualizacoes` em
cada post (só nos publicados — post agendado/pendente nunca teve `messageId`, não tem visualização
por definição). `lib/labonStatus.ts`: campo `visualizacoes?: number` novo no tipo `PostStatus`.

UI (`TelaMarketingConteudo.tsx`): coluna "👁️ Viram" na tabela do Plano de conteúdo (mostra `—` pra
post não publicado, número real pro publicado); selo "👁️ N" no canto de cada card da sequência em
"Como vai ficar", só nos publicados.

### Testes realizados e resultado
- Função testada direto no SQL com os `messageId` reais de hoje: números batendo com o esperado,
  `messageId` inexistente devolve 0 (não null/erro).
- `curl` real contra `admin.jsgrafica.site/api/marketing/conteudo` (autenticado via
  `X-Internal-Secret`) confirma `visualizacoes` presente e crescendo em posts recentes (post mais
  novo: 213 visualizações reais no momento do teste) e **0 nos posts publicados ANTES da 344 subir
  hoje** — esperado e correto: o mecanismo de log só existe desde hoje, posts antigos nunca tiveram
  visualização registrada (não é bug, é ausência real de dado histórico).
- Playwright real contra produção, logado como Edvam: coluna "Viram" visível e populada no Plano
  de conteúdo; selo "👁️ N" visível nos cards publicados de "Como vai ficar" (12/22/213 nos 3
  publicados da tela, nenhum selo nos agendados) — print confirma.
- `npx tsc --noEmit` e `npm run build` limpos antes do deploy.

### Status final: concluída
