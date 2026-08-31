# 014 — Consertar entrega de resposta do atendimento IA (fila nunca lida)

Status: parcial — conserto implementado, teste ponta a ponta bloqueado por achado novo (ver relato)
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado nas demandas 004/010: mesmo para os 5 números autorizados na whitelist, a resposta do
`JSGRAFICA_ATENDIMENTO_AI` nunca é entregue — cai em `jsgrafica_send_queue` (0 linhas desde
sempre) e não tem nada que leia essa fila e mande via Z-API. Causa (demanda 011): o nó
`10 – Responder Webhook1` só é alimentado por um nó (`09 – HTTP ZAPI - cliente`) que não
existe no workflow — conexão órfã (isso já foi contornado na 011 para não travar o log; aqui
o objetivo é consertar de vez o envio, não só destravar o log).

**Não é urgente**: o atendimento automático a cliente real está travado por decisão de
produto (whitelist), então ninguém real está esperando resposta. Isso só afeta o Edvam
testando com o próprio número autorizado.

## Objetivo
Fazer a resposta do agente (quando autorizado) realmente chegar ao cliente via Z-API, em vez
de parar em `jsgrafica_send_queue`.

## Escopo
- Incluído: entender o que deveria consumir `jsgrafica_send_queue` (parece ter sido pensado
  pra isso, dado o nome) — criar esse consumidor (novo nó/workflow que lê `status=pending` e
  chama `/send-text` da Z-API), OU religar `08 –Preparar envio cliente` direto pra uma chamada
  Z-API + `10 – Responder Webhook1`, sem depender da fila. Escolher a opção mais simples depois
  de entender a intenção original do design.
- Fora de escopo: mudar a whitelist ou quem recebe resposta automática.

## Critérios de aceite
- [ ] Testar com o número autorizado do Edvam: mensagem enviada, resposta da IA chega de
      volta no WhatsApp dele

## Referências
`pm/demandas/004-*.md`, `pm/demandas/010-*.md`, `pm/demandas/011-*.md`.

## Relato de execução

**Status final: parcial** — conserto implementado e a causa original do problema (conexão
órfã) confirmada resolvida, mas o teste ponta a ponta completo (critério de aceite) está
bloqueado por um problema de infraestrutura **diferente**, descoberto durante o teste.

### O que foi feito
1. Backup do workflow `JSGRAFICA_ATENDIMENTO_AI` via API antes de mexer (primeira vez tocando
   nele).
2. Religuei `08 – Preparar envio cliente` → `09 - INSERT FILA JSGRAFICA` (mantido, serve como
   trilha de auditoria) → **novo nó `09b - ENVIAR Z-API REAL`** (POST de verdade pro `/send-text`
   do Z-API, usando `zapi_url`/`client_token`/`phone`/`message` que já vêm prontos da própria
   linha inserida na fila) → **novo nó `09c - UPDATE FILA ENVIADA`** (marca `status: 'sent'`,
   `sent_at: now()` na mesma linha) → `10 – Responder Webhook1` (finalmente respondendo o
   webhook, o que também resolve a conexão órfã que a demanda 011 tinha encontrado e só
   contornado, não consertado).

### Confirmação parcial: a conexão órfã foi resolvida
Testei o webhook do `JSGRAFICA_ATENDIMENTO_AI` diretamente (POST simulando o payload que o
workflow `01` manda) e ele **respondeu rápido** (`HTTP 200` em segundos), ao contrário do
comportamento antigo (ficava pendurado esperando uma resposta que nunca vinha, por causa do nó
`09 – HTTP ZAPI - cliente` que não existia). Isso já é uma melhoria real, independente do resto.

### Bloqueio encontrado: Postgres Chat Memory sem conectividade (achado novo, fora do escopo)
Duas tentativas de teste ponta a ponta (mandando mensagem de um número autorizado sem sessão
ativa) pararam **antes** de chegar nos meus nós novos — erro consistente nas duas tentativas:

```
connect ENETUNREACH 2600:1f18:2e13:9d44:e385:a16d:1eb0:d8e:5432 - Local (:::0)
```

no nó **`Postgres Chat Memory / supabase /rag`** (credential `Postgres account`,
id `5IuZQ6YbK8NCzlSB`) — conexão direta Postgres (não é a API REST do Supabase usada nos outros
nós desse workflow) tentando um endereço IPv6 inalcançável. Isso significa que **o AI Agent não
consegue rodar de jeito nenhum agora**, nem pros 5 números autorizados — trava antes de gerar
qualquer resposta, então nem chega a ser um problema da fila. Não tentei consertar isso: é uma
credential/conexão diferente (Postgres direto, não Supabase REST), pode ser um problema de
configuração de host (palpite, não confirmado: hostname de conexão direta do Supabase às vezes
resolve só em IPv6 dependendo da região — o fix comum nesse caso é trocar pro host do connection
pooler, porta 6543, que também aceita IPv4 — mas não tenho acesso ao valor da credential pra
confirmar isso, só o erro).

**Isso é mais grave que o escopo original desta demanda** (que era só "a fila nunca é lida") —
agora sabemos que mesmo destravando a fila, o agente não roda mesmo. Não é urgente pro produto
(atendimento real está log-only por decisão do Edvam, ninguém real depende disso agora), mas
precisa virar demanda própria antes de qualquer plano de reativar atendimento automático no
futuro.

### O que não pude confirmar
O critério de aceite ("mensagem enviada, resposta da IA chega de volta no WhatsApp") não pôde
ser testado de ponta a ponta por causa do bloqueio acima — o código que escrevi (`09b`/`09c`)
nunca chegou a executar nos meus testes, então não tenho confirmação de que o envio real
funciona, só que a lógica está corretamente encadeada (revisei o payload e os nomes de campo
com cuidado, seguindo o mesmo padrão já usado em outros nós deste mesmo workflow e do `05 -
GESTAO PRODUTOS`).

### Critérios de aceite
- [ ] Testar com o número autorizado do Edvam: mensagem enviada, resposta da IA chega de volta
      no WhatsApp dele — **não confirmado**, bloqueado pelo achado acima

### Testes feitos
Dois testes diretos no webhook `jsgraficaatendimentoai` com o número autorizado
`5521965185667` sem sessão de pedido ativa — ambos pararam no mesmo nó com o mesmo erro antes
de chegar nos nós que eu adicionei. Confirmei que o backup existe e que nenhuma alteração além
da religação `08→09→09b→09c→10` foi feita neste workflow.
