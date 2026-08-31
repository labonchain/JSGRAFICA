# 321 — Status de atendimento compartilhado humano/IA (4 estados) + correção do bug real de escalonamento travado pra sempre

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27 (pedido direto do Edvam, seguindo o desenho já fechado em
`pm/conhecimento/caminho-c-mapa-decisoes-completo.md` seção 3)
Concluída em: 2026-08-27
Chat executor: sessão SITE V2 (fora do fluxo normal dos chats especialistas, a pedido direto do
Edvam)

## Contexto

Bug real confirmado ao vivo: `jsgrafica_agente_teste_sessoes.status`, uma vez setado pra
`'escalada'`, nunca era limpo por nada — nem pelo humano resolvendo manualmente no Admin. O
telefone `5521965185667` ficou com `status='escalada'` desde 2026-08-19 (motivo real:
`ambiguo_nao_resolvido`), e toda mensagem nova desse telefone (até um "oi" simples) recebia
resposta automática de "Chamando a equipe" em vez de processamento real pela IA, mesmo o Admin
tendo marcado `jsgrafica_contatos.status_atendimento='resolvido'` várias vezes desde então (sem
nenhum efeito na trava da IA, porque são 2 tabelas diferentes e nada sincronizava as duas).

Implementado o desenho completo já fechado com o Edvam (`caminho-c-mapa-decisoes-completo.md`
seção 3): 4 estados de atendimento compartilhados entre humano e IA em
`jsgrafica_contatos.status_atendimento` (+`atendente`), com 2 guardas de corrida.

## Os 4 estados

| Estado | Significado | Quem marca |
|---|---|---|
| `aberto` | Ninguém tocou, ou foi liberado de volta | Padrão / liberação após escalar |
| `em_atendimento` | Alguém (humano OU IA) respondendo agora | Humano (manual) ou IA (`atendente='Agente Atendimento'`) |
| `escalado` (**novo**) | IA tentou e não conseguiu — precisa de humano com prioridade | Só a IA |
| `resolvido` | Atendimento encerrado, bookkeeping manual | Só humano |

Campo `text` livre, sem CHECK constraint — não precisou de migração de schema.

## Ordem de deploy (seguida à risca, conforme o desenho)

Piece 1 (gate) → Piece 4 (resolve limpa a trava) → Piece 3 (release ao escalar) → Piece 2 (claim
ao responder) → Piece 5 (UI). Garante que nunca existe uma janela em que a IA pode reivindicar
atendimento sem o gate já estar protegendo.

---

## Piece 1 — novo gate no workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (`lcFEt1kbyqNfTS89`)

### Estrutura real encontrada (lida fresca antes de mexer, JSON completo via GET)

`AJUSTAR DESTINO AGENTE FASE B` decide `_destino` (`agente_fase_b`/`pedidos`/`ignorar`/etc.) →
`E Destino Pedidos?` → `Verificar 06-PEDIDOS Vivo`/direto → `Contar Envios Automaticos Recentes` →
`Buscar Mensagens Cliente Recentes` → `Detectar Loop Resposta Automatica` → `Loop Automatico
Estourou?` (IF) → **ambas as saídas (true via `Marcar Sessao Para Revisao Humana` →
`Restaurar Entrada Apos Marcar`, e false direto) convergiam pra `Switch Destino`**, que roteia por
`_destino`: `ignorar` (dead-end, sem conexão de saída) / `pedidos` → `HTTP 06-PEDIDOS` /
`agente_fase_b` → `Preparar Payload Agente Caminho C` (entra no Caminho C) / fallback → `HTTP
Request`.

### O que foi adicionado

2 nodes novos, inseridos exatamente no ponto de convergência (antes de `Switch Destino`, depois
da detecção de loop, como o desenho pedia):

1. **`Contatos: Buscar Status Atendimento (raw)`** (`httpRequest`, GET, `alwaysOutputData: true`,
   `authentication: predefinedCredentialType`/`supabaseApi`, credential `Supabase account 2`
   (`PxQdXsvBxo3M5H8I`) — mesma credencial já usada no resto do workflow, nenhuma chave em texto
   puro):
   ```
   https://arqkdnexpederquztegn.supabase.co/rest/v1/jsgrafica_contatos
     ?phone=eq.{{ $json.phone }}&select=phone,atendente,status_atendimento&limit=1
   ```
2. **`Contatos: Avaliar Atendimento (Gate IA)`** (Code): desembrulha a resposta do PostgREST
   tratando os DOIS formatos conhecidos de resposta do `httpRequest` nesta instância n8n (array
   bruto num item só, ou auto-split em itens com item único de `json={}` quando 0 linhas batem —
   achado documentado ao vivo hoje mesmo em `Detectar Loop Resposta Automatica`, demanda 307/309),
   sem presumir qual está ativo. Recupera a entrada original (telefone + `_destino` já calculado,
   incluindo eventual override de `_destino='ignorar'` do loop-detector) via a MESMA técnica de
   dupla tentativa já usada em `Detectar Loop Resposta Automatica`
   (`$('Restaurar Entrada Apos Marcar')` ou, se não rodou, `$('Loop Automatico Estourou?')`).
   Bloqueia (força `_destino='ignorar'`, reaproveitando o dead-end já existente e comprovado) só
   quando `_destino === 'agente_fase_b'` **e** (`status_atendimento === 'em_atendimento'` com
   `atendente` real, não nulo e diferente de `'Agente Atendimento'`) **ou**
   (`status_atendimento === 'escalado'`). Qualquer outro caso (contato novo/sem linha,
   `aberto`, `resolvido`, `em_atendimento` com a própria IA) passa intocado.

Rewire: `Restaurar Entrada Apos Marcar` → node 1 (antes ia direto pro `Switch Destino`);
`Loop Automatico Estourou?` saída falsa (index 1) → node 1 (idem); node 1 → node 2 → `Switch
Destino`.

### Por que só bloqueia o Caminho C, não `pedidos`

O desenho pede bloquear especificamente a entrada no Caminho C, não o roteamento inteiro — a
checagem só age quando `_destino` já é `agente_fase_b`, deixando `pedidos`/`ignorar`/fallback
como estavam (irrelevante na prática hoje: `06-PEDIDOS` está com todo envio desabilitado).

### Validação (antes do deploy, com dado real)

- Telefone `5521965185667` (o travado): `jsgrafica_contatos` real tinha
  `atendente='Edvam', status_atendimento='em_atendimento'` → `humanoAtendendo=true` → se
  `_destino` fosse `agente_fase_b`, seria bloqueado corretamente.
- Telefone sintético sem linha (`5599999999999`): PostgREST devolve `[]` → `contato=null` → não
  bloqueia, segue normal. Confirma o caminho "contato novíssimo = aberto".

### Persistência

`PUT /api/v1/workflows/lcFEt1kbyqNfTS89` → HTTP 200. **GET fresco separado** confirmou: 72 nodes
(70 originais + 2 novos), `active: true`. Diff nó-a-nó contra o backup pré-mudança
(`pm/backups/01-log-msg-recebidas_pre-demanda321_2026-08-27.json`) mostrou **0 nodes removidos, 0
nodes existentes alterados**, só os 2 nodes novos adicionados e exatamente as 2 conexões
rewireadas (`Restaurar Entrada Apos Marcar`, `Loop Automatico Estourou?`) mais as 2 novas — ou
seja, **demandas 314-320 confirmadas intocadas**.

---

## Piece 2 — claim no workflow `297 - JSGRAFICA | CAMINHO C AGENTE` (`JeN7VMYMeQEJgd0b`)

### Estrutura real encontrada

`Guardrail Falhou?` (IF) → saída falsa (index 1, "guardrail passou, resposta normal") ia direto
pra `Preparar Envio Normal` → `Montar Envio Z-API` (nó compartilhado por TODOS os caminhos de
envio: normal, Dizu, Alto Toque, bloqueado) → `Enviar Z-API` → `Preparar Log IA` → `LOG IA -
Agente Caminho C` → `Resp Agente Sucesso`.

### O que foi adicionado

5 nodes novos, entre `Guardrail Falhou?` (saída falsa) e `Preparar Envio Normal` — só nesse ramo,
não toca Dizu/Alto Toque/Bloqueado (que já escalam por caminho próprio, não "respondem normal"):

1. **`Contatos: Reivindicar Atendimento (raw)`** (`httpRequest`, PATCH, `Prefer:
   return=representation`):
   ```
   PATCH .../jsgrafica_contatos?phone=eq.{{telefone}}&or=(atendente.is.null,atendente.eq.{{encodeURIComponent('Agente Atendimento')}})
   body: { atendente: 'Agente Atendimento', status_atendimento: 'em_atendimento' }
   ```
   UPDATE condicional: só grava se ninguém tem o telefone, ou se já é a própria IA.
2. **`Contatos: Avaliar Reivindicacao`** (Code): mesmo desembrulho defensivo dos 2 formatos de
   resposta do Piece 1, calcula `_reivindicado = rows.length > 0`, recompõe a entrada original via
   `$('Guardrail Falhou?').first().json`.
3. **`Reivindicacao Falhou?`** (IF): `_reivindicado === false` → bloqueado.
4. **`Preparar Resp Bloqueado Por Humano`** (Code): monta `{ok:false, texto_enviado:null,
   motivo_bloqueio:'reivindicado_por_humano'}`.
5. **`Resp Agente Bloqueado Por Humano`** (`respondToWebhook`, 200): responde o webhook (que usa
   `responseMode: "responseNode"` — sem isso a chamada de `HTTP Agente Caminho C` no workflow `01`
   ficaria pendurada até timeout) sem mandar nada ao cliente.

Se a reivindicação afeta 1 linha (`_reivindicado=true`), segue normal pro `Preparar Envio Normal`
existente — mensagem enviada como sempre. **Se afeta 0 linhas, a IA NÃO manda a resposta que já
tinha composto** — decisão deliberada do dono do negócio, não é bug.

### Validação

- Caso "ninguém tem": `atendente IS NULL` → UPDATE afeta 1 linha → `_reivindicado=true` → envia.
- Caso "já é a IA" (turno seguinte da mesma conversa): `atendente='Agente Atendimento'` → UPDATE
  afeta 1 linha → envia.
- Caso "humano assumiu no meio do caminho" (corrida real, janela = tempo de resposta do LLM):
  `atendente='Edvam'` (por exemplo) → WHERE não bate nenhuma linha → `_reivindicado=false` →
  resposta NÃO enviada, IA responde ao webhook com `ok:false` em vez de silêncio/hang.

### Persistência

`PUT /api/v1/workflows/JeN7VMYMeQEJgd0b` → HTTP 200. GET fresco: 44 nodes (39 + 5 novos), `active:
true`. Diff contra `pm/backups/297-caminho-c-agente_pre-demanda321_2026-08-27.json`: **0 nodes
removidos, 0 nodes existentes alterados**, só os 5 novos + as conexões esperadas
(`Guardrail Falhou?` e as 4 novas).

---

## Piece 3 — release no workflow `296 - JSGRAFICA | CAMINHO C FERRAMENTAS` (`aO6iktSzcYtVZ6B5`)

### Estrutura real encontrada

`WH Escalar Para Humano` (ponto de convergência ÚNICO pra todo motivo de escalação — Dizu, Alto
Toque, guardrail, decisão da própria IA, cancelamento — todos chamam este mesmo webhook) →
`Validar Entrada Escalar` → ... → `Escalar: Tem Sessao?` (IF) → `Escalar: Atualizar Sessao` OU
`Escalar: Criar Sessao` (ambos escrevem `jsgrafica_agente_teste_sessoes.status='escalada'` — parte
que fica intocada, é o diário interno da IA) → **ambos convergiam pra** `Escalar: Montar Retorno`
→ `Resp Escalar Sucesso`.

### O que foi adicionado

1 node novo, em FAN-OUT (paralelo, não bloqueia a resposta do webhook) a partir dos 2 nodes de
convergência:

**`Contatos: Liberar Atendimento (Escalado)`** (`httpRequest`, PATCH, `onError:
continueRegularOutput` — nunca derruba o caminho principal de resposta):
```
PATCH .../jsgrafica_contatos?phone=eq.{{telefone}}&atendente=eq.{{encodeURIComponent('Agente Atendimento')}}
body: { atendente: null, status_atendimento: 'escalado' }
```
Guarda: só libera/marca escalado se `atendente` ainda for a própria IA — nunca sobrescreve um
humano que tenha assumido no meio do caminho.

Rewire: `Escalar: Atualizar Sessao` e `Escalar: Criar Sessao` ganharam uma 2ª saída (fan-out) pro
node novo, mantendo a conexão original pra `Escalar: Montar Retorno` intacta (timing da resposta
do webhook não muda).

### Validação

- Turno em que a IA escalou de verdade (era ela quem tinha `atendente`): WHERE bate, UPDATE
  libera → `status_atendimento='escalado'`, `atendente=null`.
- Corrida (humano já tinha assumido antes da IA terminar de escalar): `atendente` já é outro nome
  → WHERE não bate nenhuma linha → nada é sobrescrito, o humano continua marcado.

### Persistência

`PUT /api/v1/workflows/aO6iktSzcYtVZ6B5` → HTTP 200. GET fresco: 100 nodes (99 + 1 novo), `active:
true`. Diff contra `pm/backups/296-caminho-c-ferramentas_pre-demanda321_2026-08-27.json`: **0
nodes removidos, 0 nodes existentes alterados**, só o node novo + as 2 conexões de fan-out
esperadas (`Escalar: Atualizar Sessao`, `Escalar: Criar Sessao`). Confirma que a correção da
demanda 314 (`Contexto: Buscar Log Recente (raw)`), que vive neste mesmo workflow, ficou intocada.

---

## Piece 4 — humano resolvendo limpa a trava da IA (a correção real do bug relatado)

`caixa-js-grafica/app/api/inbox/atendimento/route.ts`, branch `status === 'resolvido'`: além do
UPDATE já existente em `jsgrafica_contatos`, agora também roda:
```ts
if (status === 'resolvido') {
  const { error: erroSessao } = await supabaseAdmin
    .from('jsgrafica_agente_teste_sessoes')
    .update({ status: 'concluida' })
    .eq('telefone', phone);
  if (erroSessao) console.error('Falha ao limpar jsgrafica_agente_teste_sessoes ao resolver', phone, erroSessao.message);
}
```
`'concluida'` (não `'escalada'`) é valor de enum já existente e correto semanticamente, e —
ponto crítico — como é diferente de `'escalada'`, a flag consultiva
`ultima_interacao_foi_escalada` (lida por `Contexto: Buscar Sessao`/`Preparar Prompt Sistema` nos
workflows `296`/`297`) também para de acusar escalonamento. Best-effort: erro nessa parte não
derruba a resolução principal (`status_atendimento` é o que a tela depende de verdade).

Confirmado por consulta real que `jsgrafica_agente_teste_sessoes.telefone` é único (1 linha por
telefone nesta tabela) — o `UPDATE ... WHERE telefone=phone` nunca afeta linha de outro contato.

### Deploy

`npx vercel --prod --yes` — deployment `dpl_78kxqgQxqiXSPwqqbyqvxcN1kPPN`, `readyState: READY`,
aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site` (mesmo projeto Vercel, roteamento por
subdomínio via `middleware.ts`).

---

## Piece 5 — "Assumir da IA" + motivo de escalação visível + varredura de código

### `components/TelaInbox.tsx`

- Tipo `Conversa.statusAtendimento` ganhou `"escalado"` (era só `"aberto" | "em_atendimento" |
  "resolvido"`), e campo novo `motivoEscalonamento: string | null`.
- `badgeStatus()`: novo caso `"escalado"` → badge vermelho "⚠ Escalado" (antes cairia
  silenciosamente no badge cinza "Aberto" — escondendo que a IA já tentou e falhou).
- Filtro de status da lista: `["", "aberto", "em_atendimento", "resolvido"]` →
  `["", "aberto", "em_atendimento", "escalado", "resolvido"]`.
- Painel da conversa (cabeçalho):
  - Quando `statusAtendimento === "em_atendimento"` **e** `atendente === "Agente Atendimento"`:
    botão novo "Assumir da IA" ao lado do "Resolver ✓" já existente.
  - Novo bloco pra `statusAtendimento === "escalado"`: texto "⚠ IA escalou: {motivo}" (lido de
    `motivoEscalonamento`) + botão "Assumir da IA".
  - Os 2 botões "Assumir da IA" chamam `mudarStatus("em_atendimento")` — **exatamente o mesmo
    mecanismo PATCH** (`{status: 'em_atendimento', atendente: operador.nome}`) já usado pelo botão
    "Assumir" original do caso `aberto`. Nenhuma mudança de backend precisou ser feita (a API já
    aceitava essa escrita sem checagem de dono, confirmado por leitura do `route.ts`).
  - `assumirAutomaticamente()` **não foi tocado** — continua com `if (statusAtual !== "aberto")
    return;`, então abrir uma conversa `em_atendimento` (IA ou humano) ou `escalado` nunca rouba o
    atendimento sozinho.

### `app/api/inbox/conversas/route.ts`

Nova busca em lote (só pros contatos que estão `status_atendimento === 'escalado'` — normalmente
poucos) em `jsgrafica_agente_teste_sessoes.dados_extra.motivo_escalonamento`, exposta como
`motivoEscalonamento` no payload de cada conversa.

### `components/TelaClientes.tsx`

`BadgeAtendimento()` ganhou o mesmo caso `"escalado"` (mesmo problema do `badgeStatus` do Inbox:
sem isso, caía silenciosamente em "Aberto").

### Varredura completa do codebase

`grep -rl "status_atendimento\|statusAtendimento"` sobre `app/`, `components/`, `lib/` (excluindo
`.next`/backups) devolveu exatamente 5 arquivos de código real:

| Arquivo | O que fazia | Ação |
|---|---|---|
| `components/TelaInbox.tsx` | Tipo union de 3 valores, badge, filtro, botões de ação | Atualizado (acima) |
| `components/TelaClientes.tsx` | Badge (`BadgeAtendimento`) | Atualizado (acima) |
| `app/api/inbox/conversas/route.ts` | Lista conversas, só passa o valor adiante (`\|\| 'aberto'`) | Atualizado pra incluir `motivoEscalonamento` |
| `app/api/inbox/atendimento/route.ts` | Grava o valor (branches por status conhecido) | Já robusto — branches checam valor específico, não teriam efeito colateral com `escalado` (que nunca é gravado por esta rota, só pelo n8n); ganhou a limpeza da Piece 4 |
| `app/api/clientes/route.ts` | Só passa o valor adiante (`\|\| 'aberto'`), sem branch | Nenhuma mudança necessária |

Nenhum outro arquivo do app (dashboard, relatórios, etc.) referencia esses campos — confirmado
pela mesma varredura.

Type-check (`npx tsc --noEmit`) rodou limpo depois de todas as mudanças.

### Deploy

`npx vercel --prod --yes` — deployment `dpl_CiQWpGLYAYodpF24in7CcwQfzyUN`, `readyState: READY`,
aliased em `pdv.jsgrafica.site`.

---

## Limpeza real do dado travado (aplicação real da correção, não teste isolado)

Depois de tudo deployado, aplicado o mesmo efeito que a Piece 4 vai aplicar automaticamente daqui
pra frente, direto no telefone travado real:

1. `UPDATE jsgrafica_agente_teste_sessoes SET status='concluida' WHERE telefone='5521965185667'`
   — confirmado via `Prefer: return=representation`: linha real, `motivo_escalonamento` no
   `dados_extra` era `"ambiguo_nao_resolvido"` (escalado em 2026-08-19).
2. `jsgrafica_contatos` desse telefone estava em `atendente='Edvam', status_atendimento=
   'em_atendimento'` (resquício de teste manual anterior do próprio Edvam, não uma conversa real
   em andamento) — resetado pra `atendente=null, status_atendimento='aberto'`, estado limpo pro
   próximo teste real.

**Nenhuma mensagem foi enviada pela execução desta demanda** — a confirmação viva final (mandar
"oi" de verdade pro número da gráfica e ver a IA responder normal) fica para o Edvam fazer, como
pedido.

---

## Critérios de aceite

- [x] Gate novo no `01` bloqueia Caminho C quando humano atende OU IA já escalou, sem quebrar
      contato novo/sem linha
- [x] Claim (`297`) só envia resposta se reivindicou de verdade; não sobrescreve humano na corrida
- [x] Release (`296`) marca `escalado` e libera `atendente`, sem sobrescrever humano que já assumiu
- [x] Resolver humano (`route.ts`) limpa a trava interna da IA (`concluida`, nunca `escalada`)
- [x] Botão "Assumir da IA" funcional, mecanismo PATCH reaproveitado, sem mudança de backend
- [x] Motivo de escalação visível na tela quando `escalado`
- [x] Varredura completa de `status_atendimento`/`statusAtendimento` no codebase, todo local
      tratado ou confirmado inofensivo
- [x] Backup de cada workflow tocado antes de mexer, diff pós-deploy confirma 0 alteração
      indesejada em node existente
- [x] Ordem de deploy seguida (gate → resolve → release → claim → UI)
- [x] Limpeza real do telefone travado (`5521965185667`) nas 2 tabelas
- [x] Documentação e `STATUS.md` atualizados

## Riscos residuais aceitos (do próprio desenho, não descoberta nova)

A janela exata entre "IA decidiu responder" e "IA de fato grava a reivindicação" (Piece 2) ainda
existe — é o tempo de resposta do LLM. Fechar isso por completo exigiria travamento distribuído
de verdade, desproporcional pro risco real (mesmo padrão de outras corridas já aceitas no sistema,
ex. telefone/lid na hora do Pix). Mitigado, não eliminado, pelo gate do Piece 1 + guarda do Piece
2 juntos.

## Referências

`pm/conhecimento/caminho-c-mapa-decisoes-completo.md` seção 3 (desenho completo, fonte da
verdade). Demandas 307/309/314 (achado e técnica do `httpRequest`+`alwaysOutputData` reaproveitada
aqui). Backups pré-mudança: `pm/backups/01-log-msg-recebidas_pre-demanda321_2026-08-27.json`,
`pm/backups/296-caminho-c-ferramentas_pre-demanda321_2026-08-27.json`,
`pm/backups/297-caminho-c-agente_pre-demanda321_2026-08-27.json`.
