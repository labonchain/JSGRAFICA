# 281 — `GET Memoria Ativa` não ordena por recência, pode ler memória desatualizada

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado colateral da demanda 279: o node `GET Memoria Ativa` (workflow `01`, Supabase `getAll`,
`limit: 1`, filtro só por `telefone`) **não tem nenhum `sort` configurado**. Testado de propósito
pelo 01-N8N ao simular uma sessão de pedido real: inseriu uma linha nova em
`jsgrafica_memoria_conversas` pro telefone de teste e o node devolveu a linha `id: 1`
(2026-02-05, a mais antiga de todas) em vez da recém-inserida. Sem `sort` explícito, o
Supabase/PostgREST não garante "mais recente primeiro" — o comportamento observado (pegar a mais
antiga) pode não ser nem consistente, dependendo de como os dados estão fisicamente armazenados.

**Por que isso importa de verdade**: `GET Memoria Ativa` alimenta diretamente `CHECK SESSAO
PEDIDO`, que decide se existe uma "sessão de pedido já ativa" pro telefone (`fasesAtivas`:
`coleta_specs_pedido`, `perguntar_pagamento`, `aguardando_confirmacao_pedido`, `aguardando_pix`).
Se esse node está lendo uma linha desatualizada em vez da mais recente, a decisão de roteamento
pode estar errada pra **qualquer cliente com mais de 1 linha de histórico em
`jsgrafica_memoria_conversas`** — não é limitado ao telefone de teste, é estrutural.

## Objetivo
`GET Memoria Ativa` sempre lê a linha mais recente de verdade pro telefone, não uma linha
arbitrária.

## Escopo
- Incluído: adicionar `sort` explícito por timestamp descendente (o campo certo — `timestamp` é o
  candidato mais óbvio, confirmar qual coluna reflete "mais recente" de verdade nessa tabela antes
  de aplicar) no node `GET Memoria Ativa`.
- Incluído: investigar se esse mesmo padrão (`getAll` com `limit` pequeno, sem `sort`) aparece em
  outro node do `01` ou do `206` que dependa de "pegar a linha mais recente" — reportar cada
  ocorrência achada, mesmo que a correção de cada uma vire escopo à parte.
- Incluído: testar de novo o cenário que revelou o bug (inserir uma linha nova de propósito pro
  telefone de teste, confirmar que agora vem ela, não a mais antiga).
- Explicitamente fora de escopo: qualquer mudança na lógica de `CHECK SESSAO PEDIDO` em si — só a
  fonte de dado que ela usa.

## Critérios de aceite
- [x] `GET Memoria Ativa` com ordenação explícita, testado trazendo a linha mais recente de
      verdade (não foi via o parâmetro `sort` da UI do node Supabase, ver relato)
- [x] Levantamento de outros nodes com o mesmo padrão de risco (`getAll`/`limit` sem `sort`),
      reportado mesmo que não corrigido nesta demanda
- [x] Nenhuma regressão no roteamento normal (sessão de pedido ativa continua sendo detectada
      certo pros casos que já funcionavam, e agora com evidência real, não só por leitura de
      código: ver relato)

## Riscos e cuidados
Mesma disciplina de sempre — isso é o coração da decisão de roteamento do `01`, testar com
cuidado antes de considerar concluído.

## Referências
Demanda 279 (achado original, `pm/demandas/279-*.md`, seção final do relato). `CHECK SESSAO
PEDIDO` (consumidor direto do resultado deste node).

## Relato de execução

Executado em 2026-08-16, no workflow `01` (produção real). Backup antes de mexer:
`pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda281_2026-08-16.json` (52 nodes).

### Coluna certa pra "mais recente": `timestamp`, não `created_at`
Comparei as duas colunas de data da tabela pra várias linhas reais do telefone de teste: na
maioria dos casos ficam a poucos milissegundos uma da outra, mas achei pelo menos 1 caso onde
divergem de verdade (a linha `id: 1`, `created_at: 2026-02-05`, `timestamp: 2026-01-28`, quase
uma semana de diferença, provável dado migrado/importado com data original preservada). `created_at`
é só "quando a linha foi gravada no banco"; `timestamp` (coluna `NOT NULL`, sempre preenchida) é
"quando a interação de verdade aconteceu", que é o conceito certo pra decidir "sessão mais
recente". Usei `timestamp` descendente.

### 3 tentativas até funcionar de verdade
1. **Primeira tentativa**: adicionar `sort: { values: [{ field: 'timestamp', direction: 'desc' }] }`
   no parâmetro do próprio node Supabase (formato copiado de um node real já existente noutro
   workflow da conta, `Buscar Pending` do `JSGRAFICA_QUEUE_SENDER`, que usa exatamente essa
   estrutura). Deployado, retestado com uma linha nova inserida de propósito: **continuou
   trazendo a linha `id: 1` de fevereiro**, o sort não teve efeito nenhum.
2. **Segunda tentativa**: troquei `field` por `keyName` (nome usado pelos filtros desse mesmo
   node), pensando que talvez essa versão do node espere essa chave. Mesmo resultado: **ainda
   trazia a linha antiga**.
3. **Terceira tentativa, funcionou**: em vez de depender do parâmetro `sort` da UI do node
   Supabase (que nas 2 tentativas acima simplesmente não teve efeito nenhum na consulta real,
   possível limitação da versão deste node), troquei por uma chamada REST direta ao PostgREST via
   `httpRequest` (mesma técnica já usada com sucesso na demanda 208 pra RPC atômica), com
   `order=timestamp.desc&limit=1` explícito na query string, controlado por mim, sem depender de
   nenhuma abstração do node. Como a resposta do PostgREST vem como array JSON (não como itens do
   n8n automaticamente), acrescentei um node de Code logo depois que desembrulha o array em itens
   do n8n, no formato exato que `CHECK SESSAO PEDIDO` já espera (`$('GET Memoria Ativa').all()`).
   **Esse node de Code manteve o nome original `GET Memoria Ativa`** (só o node novo antes dele
   se chama `GET Memoria Ativa (raw)`), pra não precisar tocar em `CHECK SESSAO PEDIDO` nem em
   nenhum outro lugar que referencia esse nome.

### Testes realizados, via webhook real, número do Edvam
- **Linha nova, fase não-ativa** (`fase_jornada: 'teste281_recente'`, inserida na hora): antes do
  fix, `GET Memoria Ativa` trazia a linha `id: 1` (fevereiro). Depois do fix, trouxe a linha nova
  de verdade (`id: 6064`, `timestamp` batendo com o insert), `CHECK SESSAO PEDIDO` corretamente
  decidiu `_destino: 'atendimento'` (fase não é de pedido ativo).
- **Linha nova, fase ativa de verdade** (`fase_jornada: 'coleta_specs_pedido'`, `origem:
  '06-pedidos'`, inserida na hora): `GET Memoria Ativa` trouxe essa linha, `CHECK SESSAO PEDIDO`
  corretamente decidiu `_destino: 'pedidos'`, roteou pro `HTTP 06-PEDIDOS` (não pro `206`) e não
  ativou o agente Fase B. **Esse teste só ficou possível de fazer de verdade depois do fix**: na
  demanda 279 eu tinha tentado simular isso e não deu, porque o bug desta demanda fazia até uma
  sessão de pedido real inserida na hora ser ignorada em favor da linha de fevereiro. Fecha, com
  evidência real (não só leitura de código), a preocupação de regressão que tinha ficado em aberto
  na 279.

Todas as linhas de teste em `jsgrafica_memoria_conversas` (`id 6064`, `id 6065`), sessões de
teste e log de mensagens de teste apagados ao final, `0` linhas restantes confirmado.

### Levantamento de outros nodes com o mesmo padrão de risco (`getAll`/`limit` sem `sort`)
Varri todos os nodes Supabase `getAll` dos workflows `01` e `206`:

| Node | Workflow | Tabela | Filtro | Risco real |
|---|---|---|---|---|
| `GET Onboarding Sessao` | `01` | `labon_onboarding_sessao` | só `phone` | **Real, latente**: mesmo padrão exato desta demanda (filtra só por telefone, sem status, sem sort). Hoje nenhum telefone tem mais de 1 linha nessa tabela (`0` casos confirmados por SQL), então não está causando bug observável agora, mas é o mesmo risco estrutural se algum dia um telefone tiver 2+ linhas (ex. onboarding reiniciado) |
| `GET Sessão Ativa` | `206` | `jsgrafica_agente_teste_sessoes` | `telefone` + `status='ativa'` | **Real, mais raro**: só vira problema se existirem 2 sessões `'ativa'` pro mesmo telefone ao mesmo tempo (janela de corrida na criação, não na escrita do buffer que já foi corrigida na 208). Hoje `0` casos confirmados por SQL, mas é uma janela de corrida estruturalmente possível |
| `GET Telefone Autorizado` (`01` e `206`, 2 ocorrências) | ambos | `jsgrafica_telefones_autorizados` | `telefone` + `ativo` | Baixo/nenhum: tabela tem no máximo 1 linha por telefone hoje (whitelist), e mesmo que houvesse 2, "existe alguma linha ativa" não depende de qual é "mais recente" |
| `GET Config (...)` (6 ocorrências no `206`) | `206` | `jsgrafica_agent_config` | `ativo=true` | Baixo/nenhum: config única da instância Z-API, não é dado que muda por "mais recente vence" |
| `GET Produto P&B A4` | `206` | `jsgrafica_produtos` | `nome` + `ativo` | Baixo/nenhum: espera-se exatamente 1 produto com esse nome, não é caso de "mais recente" |
| `Reconsultar Sessão Pós-Espera` | `206` | `jsgrafica_agente_teste_sessoes` | `id` (chave primária) | **Nenhum**: filtro por `id` só pode bater 0 ou 1 linha, `sort` é irrelevante aqui |

**Não corrigidos nesta demanda** (fora do escopo explícito): `GET Onboarding Sessao` e `GET
Sessão Ativa`. Ambos merecem a mesma correção (REST direto com `order` explícito) se algum dia
virarem problema observável, ou preventivamente numa demanda própria.

### Diff final
Contra o backup pré-281: `1` node adicionado (`GET Memoria Ativa (raw)`), `0` removidos, `1` node
existente com mudança de tipo (`GET Memoria Ativa`, de Supabase pra Code, nome preservado), `2`
conexões alteradas (`ENVIAR PARA LLM` agora aponta pro node raw; o node raw aponta pro node de
unwrap). A conexão de saída de `GET Memoria Ativa` pra `CHECK SESSAO PEDIDO` **não mudou**.
Nenhuma outra parte do `01` foi tocada.
