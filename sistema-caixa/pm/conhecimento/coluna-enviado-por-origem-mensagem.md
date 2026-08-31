# Coluna `enviado_por` em `jsgrafica_log_msgs_privadas` (demanda 294)

## O que existe agora

Migration aditiva aplicada (`add_enviado_por_log_msgs_privadas`): coluna `enviado_por` (text,
nullable, sem default), `CHECK (enviado_por is null or enviado_por in ('ia','equipe','sistema'))`.
73.022 linhas históricas confirmadas intocadas (todas `enviado_por IS NULL` depois da migration —
critério explícito da demanda, não precisa reconstruir retroativamente).

## Arquitetura real descoberta (não estava documentada antes desta demanda)

**Todo `from_me=true` desta tabela passa, mais cedo ou mais tarde, pelo workflow `01 - JSGRAFICA |
LOG MSG RECEBIDAS`** — a Z-API relay qualquer mensagem enviada (manual, automática ou de agente)
de volta como um evento `ReceivedCallback` com `from_me=true`, e o `01` é quem processa esse
evento (nó "If Mensagem Enviada Por Nos"). Isso é verdade **mesmo quando outro caminho já logou a
mensagem primeiro** (app ou um workflow futuro) — o `01` faz `Get row(s) MSG PRIVADA` por
`message_id` e decide entre `MSG PRIVADA` (create) ou `MSG PRIVADA1` (update).

**Achado crítico que torna a solução segura**: os nós `MSG PRIVADA`/`MSG PRIVADA1` usam
`dataToSend: "autoMapInputData"` — só escrevem as chaves que existem no JSON de entrada. Como o
pipeline do `01` (`Processar Evento` → `PREPARAR LOG MSG PRIVADA`) **nunca produz uma chave
`enviado_por`**, o `01` **nunca inclui essa coluna no payload de UPDATE nem CREATE** — ou seja,
não existe risco de o `01` sobrescrever um `enviado_por` já gravado por quem realmente mandou a
mensagem. **Testado ao vivo, não só deduzido**: mandei mensagem real pelo `responder` (teste
abaixo), o `01` processou o eco da Z-API alguns segundos depois (confirmado: `status` mudou de
`'sent'` pra `null` nesse processo, prova de que o UPDATE do `01` rodou), e `enviado_por`
permaneceu `'equipe'`, intocado.

**Consequência prática**: a coluna só fica preenchida corretamente se **quem realmente manda a
mensagem também grava a linha (ou faz upsert) com `enviado_por` explícito, direto**, ANTES ou
independente do eco do `01`. Não tem como o `01` "adivinhar" a origem sozinho — ele só vê o eco
genérico da Z-API, sem esse contexto.

## Status por caminho

### ✅ `equipe` — implementado, testado com mensagem real, em produção

- `lib/inboxLog.ts` (`registrarMensagemEnviada`, usado por `app/api/inbox/responder/route.ts` —
  único caller hoje) → `enviado_por: 'equipe'`.
- `app/api/inbox/enviar-midia/route.ts` (insert direto, mesmo padrão) → `enviado_por: 'equipe'`.
- Nenhum outro caminho no app escreve `from_me=true` nesta tabela — conferido com grep completo do
  repo (`app/api/inbox/apagar-mensagem` e `transcrever-audio` só fazem SELECT/UPDATE em campos que
  não são de criação de linha; `app/api/inbox/mensagens` e `lib/inboxContexto.ts` são só leitura).
- **Testado com mensagem real**: `POST /api/inbox/responder` pro número de teste
  `5521965185667`, `message_id 43D184A8F8E1F442FA33` — `enviado_por='equipe'` confirmado no banco,
  inclusive depois do eco do `01` já ter rodado por cima (ver seção anterior).
- Deploy em produção: `dpl_8z1t4CNz5X5R4LgGiTDvrjfwJDRR`.

### ✅ `sistema`: implementado, testado com mensagem real (01-N8N, 2026-08-16)

Node novo `LOG Sistema - Lembrete Pix` em `13 - JSGRAFICA | LEMBRETE PIX PENDENTE`, entre
`Enviar Lembrete Z-API` e `Marcar Lembrete Enviado`. Referencia `$('Montar Lembrete').item` (não
`.first()`, porque o workflow pode processar vários pedidos aguardando Pix na mesma execução,
1 item por pedido). Testado com pedido de teste real: `enviado_por: 'sistema'` confirmado direto
no banco, sobrevivendo ao eco do `01` (mesma garantia comprovada abaixo pro `equipe`). Detalhe
completo do teste no relato do 01-N8N em `pm/demandas/294-*.md`.

### (histórico, já resolvido acima) `sistema`: mapeamento original

`13 - JSGRAFICA | LEMBRETE PIX PENDENTE` (único exemplo citado na demanda) foi lido nó a nó: **6
nós, nenhum escreve em `jsgrafica_log_msgs_privadas`** — ele só manda a mensagem direto pra Z-API
(`Enviar Lembrete Z-API`) e marca `jsgrafica_pedidos.lembrete_pix_enviado_at`. **Hoje, a mensagem
do lembrete só entra no log via o eco genérico do `01`** — ou seja, cai com `enviado_por = NULL`
(não classificado), não `'sistema'` como a demanda pede.

**O que falta implementar (spec pro 01-N8N)**: adicionar 1 nó Supabase de INSERT em
`13 - LEMBRETE PIX PENDENTE`, logo depois de `Enviar Lembrete Z-API`, escrevendo
`jsgrafica_log_msgs_privadas` com `phone`, `message_id` (do retorno da Z-API), `from_me: true`,
`message_text`, `enviado_por: 'sistema'`, `sent_at`, `data_timestamp` — mesmo formato que
`lib/inboxLog.ts` já usa no app (copiar o padrão, não inventar um novo). Não precisa se preocupar
com o `01` sobrescrever depois (mesma garantia de `autoMapInputData` já comprovada acima).
**Nenhuma outra automação de mensagem "sistema" foi encontrada além desta** — se existir outra
(ex. "confirmação de pagamento" citada no exemplo da demanda), não achei workflow nem rota que
mande isso automaticamente hoje; se existir, precisa de outra rodada de mapeamento junto ao
01-N8N/03-APP antes de fechar esse ponto.

### ✅ `ia`: implementado, testado com mensagem real (01-N8N, 2026-08-16)

O bloqueio abaixo (workflow `206` "not found") já tinha sido resolvido pelo PM no mesmo dia da
294, instabilidade pontual do MCP, o workflow sempre esteve ativo e acessível via API REST (ver
`CLAUDE.md`). Mapeados os 7 pontos reais de envio no `206` (todo `httpRequest` que posta pro
`_zapi_url`): `POST Confirmação Z-API`, `Enviar Proposta Botões`, `Enviar Lista Categorias`,
`POST Confirmação Pedido Criado`, `POST Aviso Negada`, `POST Confirmação Categoria`, `POST Aviso
Dizu`. 1 node de INSERT novo (`LOG IA - ...`) depois de cada um, `enviado_por: 'ia'`. Testado com
mensagem real em 4 dos 7 pontos (texto e mídia), confirmado direto no banco, sobrevivendo ao eco
do `01`. Detalhe completo do teste no relato do 01-N8N em `pm/demandas/294-*.md`.

### (histórico, já resolvido acima) `ia`: mapeamento original, bloqueio já superado

Investiguei os 2 candidatos possíveis:
1. **`206 - JSGRAFICA | AGENTE FASE B`** (o nome citado na própria demanda 294): não encontrado em
   nenhuma busca por nome no n8n — mas a memória do projeto já documenta que **isso sozinho não
   prova nada** (achado da demanda 274/242: a busca por nome do MCP só retorna workflow *ativo*,
   nunca inativo). Fui direto na fonte de verdade (`pm/conhecimento/mapa-workflows-n8n.md`), achei
   o ID exato registrado (`M5WZ6zHAe625XyJm`), e busquei por ID direto — **também "Workflow not
   found"**. Isso não é mistério novo: bate exatamente com o padrão já aberto e não resolvido na
   demanda 273 (19 dos 20 workflows `[DESCONTINUADO]` também retornam "not found" por ID direto,
   causa ainda não confirmada — pode ser exclusão real ou os workflows estarem num escopo/projeto
   que esta credencial MCP não alcança). **Muito provavelmente é o mesmo problema da 273, agora
   afetando um workflow que deveria estar ATIVO**, não um caso novo — mas não presumo a causa,
   fica pro 01-N8N confirmar via API REST direta (mesma recomendação já registrada na 273).
2. **`JSGRAFICA_ATENDIMENTO_AI`** (o agente Gemini "Dizu" mais antigo, gated pela mesma whitelist,
   "pausado pro cliente" mas tecnicamente ativo): **este eu localizei e li completo**. Envia via
   `09b - ENVIAR Z-API REAL` e loga a conversa numa tabela PRÓPRIA (`jsgrafica_memoria_conversas`),
   **não em `jsgrafica_log_msgs_privadas`** — ou seja, mesmo problema do Lembrete: a mensagem só
   entra no log compartilhado via eco do `01`, sem `enviado_por='ia'`.

**O que falta implementar (spec, quando o workflow certo for confirmado)**: mesmo padrão do
`sistema` — 1 nó de INSERT em `jsgrafica_log_msgs_privadas` logo depois de mandar a mensagem via
Z-API, com `enviado_por: 'ia'`. Não implementei porque não sei com certeza qual workflow é o alvo
real hoje (o antigo `JSGRAFICA_ATENDIMENTO_AI`, que está de fato ativo mas pausado pro cliente
final, ou um workflow novo do Caminho C que talvez nem exista ainda em n8n).

## Referências
Demanda 293/294. Workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (confluência universal de
`from_me=true`). `lib/inboxLog.ts`, `app/api/inbox/enviar-midia/route.ts` (implementados).
