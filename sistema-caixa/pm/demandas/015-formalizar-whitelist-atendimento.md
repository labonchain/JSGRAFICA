# 015 — Formalizar whitelist do atendimento como config editável

Status: concluída
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-03
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A whitelist que hoje protege o atendimento IA (`FILTRAR TELEFONES AUTORIZADOS`) está hardcoded
em código dentro do nó, no workflow `JSGRAFICA_ATENDIMENTO_AI`. Funciona, mas exige editar
código pra mudar um número autorizado.

## Objetivo
Mover a whitelist pra uma tabela do Supabase (ex.: `jsgrafica_telefones_autorizados`) editável
sem mexer em workflow.

## Escopo
- Incluído: criar a tabela (telefone, ativo, descrição), trocar o Code node por uma consulta a
  ela, popular com os 5 números atuais, testar que continua bloqueando quem não está na lista.
- Fora de escopo: mudar quem está autorizado hoje.

## Critérios de aceite
- [ ] Tabela criada e populada com os 5 números atuais
- [ ] Workflow consulta a tabela em vez de lista hardcoded
- [ ] Testado: número não autorizado continua bloqueado, autorizado continua passando

## Referências
`pm/demandas/004-*.md`, `pm/demandas/009-*.md`.

## Relato de execução

**Status final: concluída**

### O que foi feito
1. Criei a tabela `jsgrafica_telefones_autorizados` (`telefone` unique, `ativo`, `descricao`,
   `created_at`, `updated_at`) via migration, populada com os 5 números atuais e a descrição de
   cada um (número pessoal do Edvam, "Cliente Teste", número de outro cliente da agência usado
   como teste, bot de teste de outro projeto, e um sem histórico).
2. Backup do workflow `JSGRAFICA_ATENDIMENTO_AI` antes de mexer.
3. Troquei o Code node `FILTRAR TELEFONES AUTORIZADOS` (array hardcoded) por: nó nativo
   `GET Telefone Autorizado` (Supabase, filtro `telefone eq` + `ativo eq true`, credential
   reaproveitada) → Code node (mesmo nome de antes, sem segredo nenhum) que só verifica se veio
   alguma linha e mantém a mesma lógica de barrar silenciosamente.

### Dois bugs pegos e corrigidos durante o teste (antes de marcar como concluído)
1. **`Multiple matches` ao referenciar `$('MERGE GERAK').item.json`** — esse nó de merge tem 3
   entradas, então `.item` fica ambíguo pra nós mais à frente. Troquei pra `.first()` (padrão
   mais seguro, já usado nas outras demandas de hoje).
2. **Mais sério — a checagem deixava QUALQUER telefone passar.** `alwaysOutputData: true` no
   node de leitura, quando não acha nenhuma linha, ainda assim emite 1 item com `json: {}`
   (vazio) — então `.all().length > 0` dava sempre verdadeiro, autorizado ou não. Encontrei isso
   testando com um número de fora da whitelist e vendo ele passar direto. Corrigido checando se
   o item retornado realmente tem um `id` (só existe se achou linha de verdade), não só a
   quantidade de itens.

### Teste final (depois da correção)
- Telefone autorizado (`5581982574944`, "Cliente Teste"): passou pelo filtro, seguiu até o
  `AI Agent1` (parou depois por causa do problema de Postgres já registrado na demanda 014 —
  não relacionado a este conserto).
- Telefone não autorizado: bloqueado no `FILTRAR TELEFONES AUTORIZADOS`, execução terminou
  limpa (sem erro), exatamente como o comportamento original.

Também precisei desativar/reativar o workflow uma vez no meio do processo porque o webhook de
produção ficou "não registrado" por alguns segundos depois de um PUT — parece ser um atraso
normal de propagação desta instância de n8n (mesma coisa aconteceu ao testar a demanda 013),
não um problema meu.

### Critérios de aceite
- [x] Tabela criada e populada com os 5 números atuais
- [x] Workflow consulta a tabela em vez de lista hardcoded
- [x] Testado: número não autorizado continua bloqueado, autorizado continua passando

### Testes feitos
Chamadas diretas ao webhook `jsgraficaatendimentoai` com telefone autorizado e não autorizado,
inspeção detalhada das execuções via `GET /api/v1/executions/{id}?includeData=true`. Nenhuma
alteração em `jsgrafica_produtos`, `jsgrafica_pedidos` ou qualquer outro dado real.
