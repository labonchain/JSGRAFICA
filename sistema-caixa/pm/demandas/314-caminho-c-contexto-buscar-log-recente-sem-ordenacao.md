# 314 — `Contexto: Buscar Log Recente` (workflow 296) não ordenava por recência, IA lia contexto desatualizado

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27 (urgência: correção antes de férias de integrante da equipe)
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Mesma família de bug já corrigida na demanda 281 (`GET Memoria Ativa`, workflow `01`), agora achada
num node diferente que não existia na época da 281: `Contexto: Buscar Log Recente`, dentro do
workflow `296 - JSGRAFICA | CAMINHO C FERRAMENTAS (TESTE ISOLADO)` (id `aO6iktSzcYtVZ6B5`), parte
do pré-passo `carregar_contexto_atendimento` que alimenta o agente Caminho C (`297`) com as últimas
mensagens do cliente antes de responder.

O node é um Supabase `getAll` (`tableId: jsgrafica_log_msgs_privadas`, filtro `phone eq` +
`data_timestamp gte` (desde 7 dias), `limit: 8`) **sem nenhum `sort` configurado** — mesmo padrão
estrutural da 281: o node seguinte, `Contexto: Montar Retorno`, faz
`logs.sort((a,b) => b.data_timestamp - a.data_timestamp)` DEPOIS de já ter recebido as 8 linhas,
o que não recupera a seleção certa se as 8 escolhidas pelo `limit` já eram as erradas.

Confirmado com dado real (telefone `558191527005`, 95 mensagens no total, 54 nos últimos 7 dias —
bem acima do limite de 8, cenário onde o bug se manifesta): a mesma consulta sem `order by`
devolve 8 linhas todas de 2026-08-21 15:27–15:35, enquanto a conversa real mais recente
(2026-08-21 19:06–19:54, "Obgda!"/"Ok"/troca de contato) fica de fora inteiramente.

## Objetivo
`Contexto: Buscar Log Recente` sempre traz as 8 mensagens mais recentes de verdade pro telefone
dentro da janela de 7 dias, não uma amostra arbitrária.

## Escopo
- Incluído: aplicar a mesma técnica já validada na demanda 281 (Supabase `getAll` não obedece
  `sort` nesta versão do node nesta instância — já confirmado 2x, não retestado aqui) — trocar por
  chamada `httpRequest` direta ao PostgREST com `order=data_timestamp.desc.nullslast&limit=8`
  explícito na query string, usando a MESMA credential Supabase já usada pelo restante do
  workflow (`Supabase account 2`, id `PxQdXsvBxo3M5H8I`, `authentication: predefinedCredentialType`
  / `nodeCredentialType: supabaseApi` — nenhuma chave em texto puro no JSON do node).
- Incluído: preservar as expressões de entrada existentes (`$('Validar Entrada Contexto').first().
  json.telefone` e `.desde_ms`) e o nome/id do node original, convertendo-o em vez de apagá-lo (o
  node original virou um Code de "unwrap" do array de resposta do PostgREST em itens n8n, exatamente
  como a 281 fez com `GET Memoria Ativa`), pra não precisar tocar em `Contexto: Montar Retorno`
  nem em mais nada que referencie esse nome.
- Explicitamente fora de escopo: qualquer mudança em `Contexto: Montar Retorno`, no contrato das
  ferramentas (295), ou teste de conversa real via WhatsApp.

## Critérios de aceite
- [x] `Contexto: Buscar Log Recente` sempre lê as 8 mensagens mais recentes de verdade, testado com
      SQL real equivalente ao PostgREST (não só leitura de código)
- [x] Nenhuma mudança no formato de saída consumido por `Contexto: Montar Retorno` (mesmos campos:
      `phone`, `message_text`, `caption`, `from_me`, `data_timestamp`, `enviado_por`)
- [x] Fix persistido de verdade no n8n (GET pós-PUT conferido, não só a resposta do PUT)
- [x] Nenhuma chave/segredo em texto puro no JSON do node — credential referenciada por id, mesma
      já usada pelo resto do workflow

## Riscos e cuidados
Workflow em produção, mas hoje 100% dependente da whitelist de teste (`jsgrafica_telefones_
autorizados`) — nenhum cliente real ainda, só números internos. Ainda assim, backup completo antes
de mexer, e nenhuma execução real do workflow contra mensagem de cliente foi disparada nesta
demanda (só leitura estática do JSON + 1 consulta SQL somente-leitura de verificação).

## Referências
Demanda 281 (`pm/demandas/281-get-memoria-ativa-sem-ordenacao.md`) — precedente técnico exato,
mesma técnica, mesma credential. Demanda 296 (construção original do pré-passo `carregar_contexto_
atendimento`, onde este node nasceu, na época sem este achado específico).

## Relato de execução

Executado em 2026-08-27, no workflow `296` (produção real, ainda restrito à whitelist). Backup
antes de mexer: `pm/backups/296-caminho-c-ferramentas_pre-demanda314_2026-08-27.json` (98 nodes).

### Achado confirmado com dado real
Telefone `558191527005`: 95 mensagens no total em `jsgrafica_log_msgs_privadas`, 54 dentro da
janela de 7 dias usada pelo node (`desde_ms`). A mesma consulta que o node fazia (`phone eq` +
`data_timestamp gte`, `limit 8`, sem `order`) devolve, via SQL direto sem `order by`, 8 linhas
todas entre 2026-08-21 15:27:07 e 15:35:37 ("Boa tarde", "É 6,50 a folha?", etc.). A consulta
certa (mesmo filtro, com `order by data_timestamp desc nulls last limit 8`) devolve as 8
mensagens de verdade mais recentes, entre 19:06:00 e 19:54:43 do mesmo dia ("Pode deixar a data
de início...", ..., "O outro contato permanece...", "Só falta incluir esse contato", "O restante
tá ok", "Ok", "Obgda!") — quase 4h de diferença, conversa completamente diferente.

### Correção aplicada
Mesma técnica da 281, sem reinventar: acrescentado o node `Contexto: Buscar Log Recente (raw)`
(`httpRequest`, `GET`, `authentication: predefinedCredentialType`, `nodeCredentialType:
supabaseApi`, credential `Supabase account 2` id `PxQdXsvBxo3M5H8I` — a mesma já usada pelos
outros nodes Supabase deste workflow, nenhuma chave nova/hardcoded) com a URL:
```
https://arqkdnexpederquztegn.supabase.co/rest/v1/jsgrafica_log_msgs_privadas
  ?phone=eq.{{ $('Validar Entrada Contexto').first().json.telefone }}
  &data_timestamp=gte.{{ $('Validar Entrada Contexto').first().json.desde_ms }}
  &order=data_timestamp.desc.nullslast&limit=8
```
O node original (`Contexto: Buscar Log Recente`, mesmo id `c8e83c51-...`) virou um Code node que
desembrulha o array JSON da resposta do PostgREST em itens n8n (`Array.isArray(body) ? body :
[body]`), mantendo nome e posição na conexão, exatamente como a 281 fez — `Contexto: Montar
Retorno` não precisou de nenhuma mudança. Conexões: `Contexto: Buscar Sessao` → `Contexto: Buscar
Log Recente (raw)` → `Contexto: Buscar Log Recente` (agora Code) → `Contexto: Montar Retorno`
(inalterado).

### Aplicado e verificado
PUT via API do n8n (`PUT /workflows/aO6iktSzcYtVZ6B5`, corpo mínimo `name`/`nodes`/`connections`/
`settings`), HTTP 200. GET imediatamente depois confirmou o node novo, o node convertido e as 3
conexões exatamente como pretendido — não só a resposta do PUT, uma leitura fresca separada.

### Verificação não-invasiva (sem disparar o workflow)
Rodei a query SQL equivalente à nova chamada PostgREST direto no Supabase (`execute_sql`,
somente leitura) pro telefone real `558191527005`: confirma que `order by data_timestamp desc
nulls last limit 8` agora traz a conversa de 19:06–19:54 (a mais recente de verdade), não mais a
de 15:27–15:35. Nenhuma execução real do workflow contra mensagem de cliente foi disparada —
verificação só estática (JSON persistido) + SQL direto, conforme escopo desta demanda.

### Achado fora de escopo, registrado (não corrigido aqui)
Se um telefone tiver **zero** mensagens na janela de 7 dias no momento em que
`carregar_contexto_atendimento` roda, o node `httpRequest` novo ainda assim produz 1 item de saída
(corpo `[]`), o node de unwrap produz 0 itens, e não foi confirmado se `Contexto: Montar Retorno`
roda de qualquer forma com 0 itens de entrada (mesma categoria de bug de plataforma já documentada
nas demandas 296/306/307/308, `alwaysOutputData` ausente). Na prática isso é bem improvável aqui
porque a própria mensagem que dispara o atendimento já foi logada em `jsgrafica_log_msgs_privadas`
antes deste pré-passo rodar — mas não foi testado de propósito nesta demanda (exigiria disparar o
workflow de verdade, fora do escopo aprovado). Recomendo confirmar/testar numa demanda própria se
algum dia virar sintoma observável.

### Diff final
Contra o backup pré-314: `1` node adicionado (`Contexto: Buscar Log Recente (raw)`), `0`
removidos, `1` node existente com mudança de tipo (`Contexto: Buscar Log Recente`, de Supabase pra
Code, nome e id preservados), `2` conexões alteradas (`Contexto: Buscar Sessao` agora aponta pro
node raw; o node raw aponta pro node convertido). A conexão de `Contexto: Buscar Log Recente` pra
`Contexto: Montar Retorno` **não mudou**. Nenhuma outra parte do `296` foi tocada (98 → 99 nodes).
