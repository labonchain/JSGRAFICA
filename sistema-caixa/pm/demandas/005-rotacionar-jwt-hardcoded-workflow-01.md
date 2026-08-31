# 005 — Mover JWT service_role hardcoded para credential do n8n

Status: concluída
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado de segurança em `pm/investigacoes/2026-07-02-*.md`: o nó `Flag Sessao CONFIG Ativa` do
workflow `01 - LOG MSG RECEBIDAS` tem um JWT `service_role` do Supabase em texto puro dentro
do código do nó, em vez de usar uma credential do n8n.

## Objetivo
Mover o JWT para uma credential do n8n, sem alterar o comportamento do workflow.

## Escopo
- Incluído: criar credential no n8n com o valor atual do JWT; substituir a referência dentro
  do nó `Flag Sessao CONFIG Ativa`; testar que o workflow continua funcionando igual.
- Fora de escopo: gerar um JWT novo (rotação de fato) — mencionar no relato se achar que vale
  a pena como passo seguinte, mas não é obrigatório aqui.

## Critérios de aceite
- [ ] Nenhum JWT/token em texto puro no código do nó
- [ ] Workflow testado e funcionando como antes

## Riscos e cuidados
Risco baixo, mas qualquer engano na credential pode quebrar o workflow `01` inteiro (crítico,
processa toda mensagem recebida) — testar com cuidado antes de marcar como concluída.

## Referências
Workflow `01 - LOG MSG RECEBIDAS`, nó `Flag Sessao CONFIG Ativa`.

## Relato de execução

---
## Continuação (2026-07-02, com acesso de escrita via API do n8n) — CONCLUÍDA

**Status final: concluída**

### O que foi feito
Segui a Opção 1 já recomendada abaixo (substituir por nós nativos do Supabase), reaproveitando
a credential `Supabase account 2` (id `PxQdXsvBxo3M5H8I`) que este mesmo workflow já usa em
outros 10 nós nativos (`Get row(s) MSG PRIVADA`, `CONTATOS`, `GET Memoria Ativa`, etc.).

1. **Backup**: baixei o workflow `01` completo via `GET /api/v1/workflows/{id}` antes de
   qualquer mudança (guardado localmente).
2. **Removido**: nó de código `Flag Sessao CONFIG Ativa` (JWT hardcoded).
3. **Adicionados**:
   - `GET Onboarding Sessao` (nó nativo Supabase, `getAll` em `labon_onboarding_sessao`,
     filtro `phone eq`, `limit 1`, `alwaysOutputData: true`, credential `Supabase account 2`).
   - `Consolidar Flag Sessao` (nó de código, **sem nenhum segredo**) — reconstrói o item
     original (`$('IDENTIFICAR AUTORIZAÇÃO').item.json`) e adiciona `_has_session`/
     `_em_onboarding`, exatamente como o nó antigo produzia.
4. **Rewire**: `IDENTIFICAR AUTORIZAÇÃO` → `GET Onboarding Sessao` → `Consolidar Flag Sessao` →
   `Switch Redirect` (mesmo destino final de antes).

### Achado no meio do caminho (não era esperado, mas travou o primeiro teste)
A primeira tentativa incluía também um nó `GET Config Sessions` (equivalente Supabase nativo
da segunda chamada REST do código antigo, tabela `jsgrafica_config_sessions`). O teste
sintético falhou com erro do Postgres: **a tabela `jsgrafica_config_sessions` não existe** no
banco (nem nunca existiu, aparentemente — o erro do Postgres sugeriu `dizurefeicoes_config_sessions`,
de outro cliente da agência). Investigando o código antigo, esse `try/catch` vazio **sempre**
engolia esse erro 404 em silêncio e `_has_session` **sempre resultava `false`** — ou seja, esse
branch (`Switch Redirect` → saída `CONFIG`) nunca foi usado na história deste workflow, mesmo
antes da minha mudança. Não é um bug que eu causei — só ficou visível porque o node nativo do
Supabase não engole erro do jeito que o `try/catch` fazia.

**Correção aplicada, preservando o comportamento original exatamente:** removi o nó `GET
Config Sessions` (consulta a uma tabela inexistente não faz sentido manter) e deixei
`_has_session` fixo em `false` no `Consolidar Flag Sessao`, com comentário no código explicando
o motivo. Isso reproduz fielmente o comportamento de sempre (nunca era `true` de verdade) sem
inventar uma tabela nova ou mudar pra outra por conta própria.

**Achado fora do escopo, registrado para o Edvam/PM decidir:** o branch `CONFIG` do `Switch
Redirect` (`HTTP ReDIRECT CONFIG`) é código morto há muito tempo — nunca foi alcançado. Vale
decidir se esse recurso (o que quer que fosse) ainda é necessário; se não for, dá pra limpar
esse branch inteiro numa demanda futura.

### Testes feitos
Dois testes sintéticos via POST direto no webhook `jsgraficamsgrecebidas` (número de teste
autorizado `5521965185667`):
- 1ª tentativa: erro confirmado (`GET Config Sessions`, tabela inexistente) — via
  `GET /api/v1/executions`, execução parou nesse nó.
- 2ª tentativa (depois da correção): execução com `status: success`, e a mensagem de teste
  apareceu em `jsgrafica_log_msgs_privadas` com `from_me:false`, confirmando que o pipeline
  completo (log + roteamento) continua funcionando igual.

Confirmado por leitura direta do workflow ao vivo depois da mudança: nenhum JWT/token em texto
puro em nenhum nó; 46 nós no total; nó antigo removido; novos nós presentes; `active: true`
mantido.

### Critérios de aceite
- [x] Nenhum JWT/token em texto puro no código do nó
- [x] Workflow testado e funcionando como antes (com uma correção de um bug pré-existente que
      não estava no escopo, mas que o teste expôs)

---
## Tentativa anterior (bloqueada por falta de acesso de escrita — contexto histórico)

**Status final: bloqueada**

### Motivo do bloqueio
Confirmei o achado lendo o nó (`get_workflow_details`, workflow `01 - JSGRAFICA | LOG MSG
RECEBIDAS`, id `lcFEt1kbyqNfTS89`): o nó de código `Flag Sessao CONFIG Ativa` tem o JWT
`service_role` do Supabase hardcoded numa constante `SBK` dentro do `jsCode`, usado em duas
chamadas `this.helpers.httpRequest` (headers `apikey` e `Authorization: Bearer`) contra as
tabelas `jsgrafica_config_sessions` e `labon_onboarding_sessao` via REST direto (PostgREST) —
não usa o node nativo do Supabase, por isso não tem um seletor de credential na UI hoje.

As únicas ferramentas de n8n que tenho disponíveis via MCP são `search_workflows`,
`get_workflow_details` e `execute_workflow` — todas de **leitura/execução**, nenhuma de
**escrita** (não existe `create_credential`, `update_workflow` ou equivalente no meu acesso
atual). Não tenho acesso à UI do n8n para criar a credential e editar o nó manualmente. Por
isso não posso concluir esta demanda com as ferramentas que tenho agora — não é uma questão de
risco técnico, é ausência de permissão/ferramenta de escrita.

### O que falta fazer (para quem tiver acesso de escrita ao n8n — UI ou credencial de API)
Duas formas possíveis, em ordem de preferência:

1. **Recomendada — substituir por nós nativos do Supabase.** Trocar o Code node por dois nós
   `n8n-nodes-base.supabase` (operação "Get Many Rows", filtro `phone eq {{ $json.phone }}`,
   limit 1) apontando para `jsgrafica_config_sessions` e `labon_onboarding_sessao`,
   reaproveitando a credential Supabase que este mesmo workflow já usa em outros nós nativos
   (`Get row(s) MSG PRIVADA`, `CONTATOS`, etc. — não consegui ler qual credential é essa via
   MCP, só que existe). Depois, um pequeno Code node (sem segredo nenhum) só para montar
   `_has_session` / `_em_onboarding` a partir dos dois resultados, igual à lógica atual.
   Vantagem: usa o mecanismo padrão de credential do n8n, sem depender de suporte a
   `getCredentials()` dentro de Code node.
2. **Alternativa — manter Code node, usar credential vinculada ao nó.** Criar uma credential
   tipo "Header Auth" (ou reaproveitar a Supabase API já usada no workflow, se o n8n permitir
   acessá-la via `this.getCredentials(...)` dentro do Code node — depende da versão/configuração
   da instância). Trocar `const SBK = '...'` por uma leitura da credential, mantendo o resto do
   código igual.

Em ambos os casos: testar com uma mensagem de teste real (número de teste autorizado) antes de
marcar como concluída, exatamente como pede o critério de aceite, porque este workflow é
crítico (processa toda mensagem recebida).

### Achado de segurança relacionado (registro, não resolvido)
O mesmo JWT `service_role` também dá acesso de escrita a `labon_onboarding_sessao` — uma tabela
com prefixo `labon`, não `jsgrafica`. Ou seja, esse token tem escopo além do projeto JS Gráfica
(faz sentido, é o `service_role` do projeto Supabase inteiro "LabON", que hospeda múltiplos
clientes). Vale o Edvam saber que rotacionar esse JWT no futuro (fora do escopo desta demanda,
mas mencionado como possível próximo passo) afeta mais de um projeto, não só a JS Gráfica.

### Testes feitos
Nenhum — nenhuma alteração foi feita no workflow, nenhuma credential foi criada. Apenas leitura
do nó via MCP.
