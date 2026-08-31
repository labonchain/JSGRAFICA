# 245 — Desativar 2 chamadas HTTP mortas dentro do workflow "01 - LOG MSG RECEBIDAS"

Status: concluída (parcial — ver achado novo no branch de grupo)
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam, com pedido explícito de cuidado extra por ser infraestrutura
crítica)
Concluída em: 2026-07-30
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 242, diagnosticado mas explicitamente não corrigido (contradizia a instrução
de não tocar no `01` naquela demanda) — 2 referências mortas em nós **habilitados e alcançáveis**
dentro do workflow `01 - LOG MSG RECEBIDAS`:
- `HTTP Request1` (branches 0 e 1 do `Switch`) → chama `jsgraficagestaoprodutos`, webhook do
  `05 - GESTAO PRODUTOS`, confirmado descontinuado (demanda 242). Sem nó depois — a chamada só
  desperdiça uma requisição e provavelmente recebe 404 silencioso.
- `HTTP 07-GRUPO-PEDIDOS` (branch 4 do `Switch Redirect`) → chama `jsgraficagrupopedidos`,
  webhook do `07 - GRUPO-PEDIDOS`, confirmado descontinuado (mesma demanda 242, achado novo,
  nunca catalogado antes). Segue pro node `PREPARAR LOG MSG GRUPOS`, que roda independente do
  resultado dessa chamada morta.

O `01` é o workflow mais crítico do projeto — todo log de mensagem recebida passa por ele. Por
isso esta demanda existe separada da 242, com disciplina de cuidado extra.

## Objetivo
As 2 chamadas HTTP mortas param de rodar, sem qualquer efeito colateral no restante do
roteamento do workflow `01`.

## ⚠️ Checkpoint obrigatório antes de mexer
Confirmar mais uma vez, ao vivo (não confiar só no diagnóstico da 242, que já é de ontem/hoje),
que os 2 webhooks de destino continuam mortos (405/404 ou equivalente) antes de desativar
qualquer coisa. Backup completo do workflow `01` antes de qualquer mudança — sem exceção.

## Escopo
- Incluído: aplicar `disabled: true` nos 2 nodes (`HTTP Request1` e `HTTP 07-GRUPO-PEDIDOS`) —
  preserva o grafo/conexões inteiro, é reversível, não desconecta nada.
- Incluído: confirmar que `PREPARAR LOG MSG GRUPOS` (que vem depois de `HTTP 07-GRUPO-PEDIDOS`)
  continua rodando normalmente com o node anterior desativado — n8n pula nodes `disabled` e segue
  o fluxo, mas confirmar isso com teste real, não presumir.
- Incluído: testar com evento sintético (mesma técnica já usada nas demandas 236/237/239/241)
  cobrindo pelo menos: uma mensagem que passaria pelo branch do `HTTP Request1`, e uma mensagem de
  grupo que passaria pelo branch do `HTTP 07-GRUPO-PEDIDOS` — confirmar que o log continua
  acontecendo normalmente nos dois casos, sem erro novo.
- Explicitamente fora de escopo: qualquer outra mudança no `01` além desses 2 nodes. Explicitamente
  fora de escopo: reativar ou investigar mais os workflows `05`/`07` em si (já confirmados
  descontinuados na 242).

## Critérios de aceite
- [ ] Confirmado ao vivo, antes de mexer, que os 2 destinos seguem mortos
- [ ] Backup do workflow `01` feito antes de qualquer mudança
- [ ] Os 2 nodes desativados (`disabled: true`), sem remover nem desconectar nada
- [ ] Testado com evento sintético: mensagem privada normal E mensagem de grupo continuam sendo
      logadas corretamente depois da mudança
- [ ] Nenhuma regressão em qualquer outro comportamento do `01` (roteamento pro `06-PEDIDOS`,
      atendimento IA, etc. — todos continuam intocados)

## Riscos e cuidados
Workflow mais crítico do projeto — qualquer erro aqui pode quebrar o log de TODA mensagem
recebida pela gráfica. Backup obrigatório, teste ponta a ponta obrigatório antes de considerar
concluído, e se qualquer coisa parecer estranha durante o teste, reverter pro backup e reportar
ao PM antes de tentar de novo.

## Referências
Demanda 242 (achado original e diagnóstico completo, seção "Item bloqueado"). Workflow
`01 - JSGRAFICA | LOG MSG RECEBIDAS`.

## Relato de execução

**Status final: parcial** — os 2 nodes pedidos foram desativados com sucesso e o objetivo
principal (parar as chamadas mortas sem quebrar o roteamento) foi alcançado e testado pro
cenário privado. No teste do cenário de grupo apareceram **2 bugs pré-existentes e não
relacionados entre si**, nenhum causado por esta mudança — reportados, não corrigidos (fora do
escopo explícito desta demanda).

### Checkpoint feito antes de mexer
Confirmado ao vivo (não só pelo diagnóstico da 242): `POST` direto nos dois webhooks —
`jsgraficagestaoprodutos` e `jsgraficagrupopedidos` — retornaram `404 "not registered"` nos dois,
confirmando que continuam mortos agora, não só ontem.

### O que foi feito
1. Backup completo do workflow `01` antes de qualquer mudança:
   `pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda245_2026-07-29.json`.
2. **Teste de baseline (antes de mexer)** com evento sintético — feito por precaução extra, não
   estava no escopo pedido, mas revelou algo importante (ver achado abaixo) antes de eu tocar em
   qualquer coisa.
3. Aplicado `disabled: true` só nos 2 nodes (`HTTP Request1`, `HTTP 07-GRUPO-PEDIDOS`). Deploy via
   API, confirmado por `GET` depois: 48 nodes antes e depois, todas as `connections` idênticas,
   `active: true` mantido — o diff automatizado confirmou que **só esses 2 campos `disabled`
   mudaram**, nada mais no workflow foi tocado.

### Achado importante — o bug era mais grave do que a 242 diagnosticou
A 242 tinha diagnosticado "a chamada só desperdiça uma requisição, provavelmente 404 silencioso,
não quebra nada visível". **Isso estava errado, e o teste de baseline provou**: quando o node
`HTTP Request1`/`HTTP 07-GRUPO-PEDIDOS` falha (destino morto), **o n8n aborta a execução inteira
do workflow**, não só aquele branch. Testado com evento sintético privado
(`/teste245-produtos-baseline`, telefone do Edvam) ANTES da correção: execução com
`status: error`, parou em `HTTP Request1`, e **o branch normal de log (`Switch Log Geral` → ...
→ `MSG PRIVADA`) nunca chegou a rodar** — confirmado zero linha em
`jsgrafica_log_msgs_privadas` pra esse `message_id`. Mesmo padrão confirmado no cenário de grupo
(execução parou em `HTTP 07-GRUPO-PEDIDOS`, zero linha em `jsgrafica_log_msgs_grupos`). Ou seja:
**toda mensagem do tipo "/comando" (privada ou de grupo) vinda do número autorizado do Edvam
estava silenciosamente deixando de ser logada**, não só desperdiçando uma chamada morta — achado
mais sério do que o registrado na 242.

### Testes realizados e resultado

**Cenário privado (branch do `HTTP Request1`) — ✅ sucesso total, sem regressão**
Evento sintético `/teste245-produtos-postfix` (telefone do Edvam) depois da correção: execução
`status: success`, sem erro. Rodou o roteamento inteiro (`Switch Redirect` → `If — TUTOR?` →
`Switch` → `HTTP Request1` [agora pulado, desabilitado] em paralelo com `Switch Log Geral` → `Get
row(s) MSG PRIVADA` → `PREPARAR LOG MSG PRIVADA` → `MSG PRIVADA`, e também o branch de contatos
até `CONTATOS`). Confirmado com o banco: a linha foi criada em `jsgrafica_log_msgs_privadas` com
o texto certo. **Este critério de aceite está 100% cumprido.**

**Cenário de grupo (branch do `HTTP 07-GRUPO-PEDIDOS`) — ⚠️ parcial, achado novo bloqueante**
Evento sintético de grupo `/teste245-grupopedido-postfix` (participante = telefone do Edvam)
depois da correção: execução ainda deu `status: error`, mas **por um motivo completamente
diferente e pré-existente**, não relacionado à minha mudança: o node `HTTP 07-GRUPO-PEDIDOS`
agora é pulado corretamente (a chamada morta parou), mas o node seguinte,
`PREPARAR LOG MSG GRUPOS`, tem na primeira linha do código
`const data = $('Switch Log Geral').first().json;` — uma referência direta a outro node por
nome. Esse node só funciona quando é alcançado pelo caminho normal (via `If2`), onde
`Switch Log Geral` já rodou antes na mesma execução. Vindo pelo caminho do `GRUPO_PEDIDOS`
(depois do `HTTP 07-GRUPO-PEDIDOS`), `Switch Log Geral` nunca roda nesse ramo — e o código
quebra com `ExpressionError: Node 'Switch Log Geral' hasn't been executed`.
**Esse bug já existia antes da minha mudança** — só nunca tinha aparecido porque a execução
sempre abortava antes, no próprio `HTTP 07-GRUPO-PEDIDOS` (achado do baseline, acima). Minha
correção não criou esse problema, só descobriu ele ao deixar a execução avançar mais um passo.
**Não corrigi** — mexer em `PREPARAR LOG MSG GRUPOS` está fora do escopo explícito desta demanda
("qualquer outra mudança no `01` além desses 2 nodes"), e o cenário que ele atende
(`is_grupo_pedido`: comando de pedido vindo de dentro do grupo de equipe) já é órfão mesmo — o
destino real dessa lógica (`07 - GRUPO-PEDIDOS`) está confirmado descontinuado desde a 242.

**Teste extra (não pedido no escopo, feito por rigor)**: mensagem de grupo NORMAL, sem comando
(não passa pelos 2 nodes desativados, vai só pelo caminho `Switch Log Geral` → `If2` →
`PREPARAR LOG MSG GRUPOS` → `MSG GRUPOS`) — **também deu erro**, e aqui é um **terceiro bug,
totalmente não relacionado aos 2 primeiros e mais sério**: o node `MSG GRUPOS` (insert no
Supabase, `autoMapInputData`) falhou com `"Could not find the 'request_method' column of
'jsgrafica_log_msgs_grupos' in the schema cache"`. Confirmado: a tabela
`jsgrafica_log_msgs_grupos` **não tem a coluna `request_method`**, que `Processar Evento` sempre
inclui no payload (a tabela irmã `jsgrafica_log_msgs_privadas` TEM essa coluna — schema
divergiu entre as duas em algum momento). Consultei a própria tabela: **a última linha real é de
2026-03-12** — ou seja, **o log de mensagens de grupo está completamente parado há quase 4 meses
e meio**, achado que não tem nenhuma relação com o escopo desta demanda, descoberto por acaso ao
testar o cenário de grupo com o devido rigor.

Todas as linhas de teste (`teste245-*`) foram apagadas de `jsgrafica_log_msgs_privadas` e
`jsgrafica_log_msgs_grupos` depois (nenhuma linha de grupo chegou a ser criada de fato, pelos
erros acima — só a privada precisou de limpeza real).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
1. **(Grave, urgente)** `jsgrafica_log_msgs_grupos` não recebe nenhuma linha real desde
   2026-03-12 — a coluna `request_method` falta na tabela, e todo insert de mensagem de grupo
   falha silenciosamente desde então (quase 4,5 meses). Isso é completamente independente dos 2
   nodes desta demanda — é a tabela/schema, não o roteamento. Recomendo demanda própria,
   prioridade alta: adicionar a coluna faltante (mesmo padrão da privada) e confirmar se algum
   dado real foi perdido de forma irrecuperável nesse período.
2. `PREPARAR LOG MSG GRUPOS` quebra quando alcançado via `HTTP 07-GRUPO-PEDIDOS` (referência
   `$('Switch Log Geral')` que não existe nesse caminho) — bug pré-existente, só descoberto
   porque esta demanda desbloqueou o passo anterior. Baixa prioridade prática (o caminho que leva
   até aqui, `is_grupo_pedido`, depende do `07-GRUPO-PEDIDOS`, já confirmado descontinuado — mas
   o código continua quebrado se alguém reativar esse fluxo no futuro sem saber disso).
3. O padrão `autoMapInputData` nos nodes `MSG PRIVADA`/`MSG GRUPOS` já tinha sido sinalizado como
   arriscado numa memória antiga do projeto ("colunas extras causam erro silencioso") — o achado
   1 acima é exatamente esse risco se concretizando, com uma tabela inteira parada.

### Critérios de aceite
- [x] Confirmado ao vivo, antes de mexer, que os 2 destinos seguem mortos (404 nos dois)
- [x] Backup do workflow `01` feito antes de qualquer mudança
- [x] Os 2 nodes desativados (`disabled: true`), sem remover nem desconectar nada — diff
      confirmado, só esse campo mudou nos 2 nodes, resto do workflow idêntico
- [x] Cenário privado: testado com evento sintético, log continua acontecendo corretamente, sem
      erro novo
- [ ] Cenário de grupo: node deixou de rodar a chamada morta, mas ainda não loga com sucesso —
      por um bug diferente e pré-existente (achado 2 acima), não corrigido nesta demanda
- [x] Nenhuma regressão em qualquer outro comportamento do `01` — diff de nodes/connections
      confirma que só os 2 nodes pedidos mudaram; o comportamento de erro no cenário de grupo já
      existia antes (só não era visível)
