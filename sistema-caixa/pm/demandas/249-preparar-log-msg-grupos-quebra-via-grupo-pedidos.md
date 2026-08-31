# 249 — Desligar de vez o caminho "comando de pedido pelo grupo da equipe" no workflow 01

Status: concluída (parcial — ver nota sobre a 248 no relato)
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam: melhor desligar de vez do que remendar caminho morto)
Concluída em: 2026-07-30
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 245: dentro do workflow `01 - LOG MSG RECEBIDAS`, existe uma lógica específica
pra quando alguém digita um **comando de pedido dentro do grupo interno da equipe no WhatsApp**
(não é cliente — é a própria equipe usando o grupo deles pra criar pedido por comando de texto,
sinalizado internamente como `is_grupo_pedido`). Esse caminho (`Switch Redirect`, branch do
`is_grupo_pedido`) chamava o webhook `jsgraficagrupopedidos`, do workflow `07 - GRUPO-PEDIDOS` —
já confirmado descontinuado desde a demanda 242 (prefixo `[DESCONTINUADO]` aplicado,
provavelmente já `active: false`).

A demanda 245 já desativou a chamada HTTP morta desse caminho (`disabled: true` no node
`HTTP 07-GRUPO-PEDIDOS`), mas revelou que o node seguinte no mesmo caminho
(`PREPARAR LOG MSG GRUPOS`) também quebra quando alcançado por ele (referência a
`$('Switch Log Geral')`, que não roda nesse ramo).

**Decisão do Edvam**: em vez de corrigir esse node pra funcionar nesse caminho morto, desligar o
caminho inteiro de vez — ninguém usa "comando de pedido pelo grupo da equipe" hoje, não faz
sentido manter/consertar código pra uma função inativa.

## Objetivo
O caminho `is_grupo_pedido` (comando de pedido digitado no grupo da equipe) deixa de existir como
rota especial dentro do workflow `01` — uma mensagem desse tipo passa a ser tratada como mensagem
de grupo normal (só log), sem tentar processar como comando de pedido.

## ⚠️ Checkpoint obrigatório antes de mexer
Confirmar exatamente onde a detecção de `is_grupo_pedido` acontece no workflow `01` (provavelmente
o `Switch Redirect` ou um node anterior que a alimenta) e mapear tudo que depende dela antes de
desligar — não presumir que é só 1 ponto. Reportar o mapeamento completo ao PM antes de mudar
qualquer coisa. Backup do workflow `01` obrigatório (mesmo padrão da 245).

## Escopo
- Incluído: mapear todos os nodes envolvidos no caminho `is_grupo_pedido` (detecção +
  roteamento + os 2 nodes já tocados na 245).
- Incluído: desligar esse caminho — a forma exata (remover o branch do `Switch Redirect` e ligar
  direto pro fluxo de log normal, ou desabilitar os nodes envolvidos preservando o grafo) fica a
  critério do 01-N8N, desde que o resultado final seja: mensagem de grupo com padrão de comando
  de pedido é logada normalmente, sem tentar rotear pra lugar nenhum especial.
- Incluído: testar com evento sintético reproduzindo o padrão `is_grupo_pedido` (mesmo tipo de
  mensagem que a 245 usou pra achar o bug), confirmando que agora só loga, sem erro.
- Incluído: confirmar que mensagem de grupo NORMAL (sem padrão de comando de pedido) continua
  funcionando exatamente igual — nenhuma regressão fora do caminho sendo desligado.
- Explicitamente fora de escopo: qualquer decisão sobre o workflow `07-GRUPO-PEDIDOS` em si (já
  resolvida na 242) ou sobre `jsgrafica_log_msgs_grupos` (resolvida na 248, encerrada sem ação).

## Critérios de aceite
- [ ] Mapeamento completo do caminho `is_grupo_pedido` apresentado antes de mexer
- [ ] Caminho desligado — mensagem desse padrão vira log normal, não tenta rotear especial
- [ ] Testado com evento sintético do padrão `is_grupo_pedido` — loga sem erro
- [ ] Confirmado sem regressão em mensagem de grupo normal (fora desse padrão)
- [ ] Backup do workflow `01` feito antes de mexer

## Riscos e cuidados
Mesmo workflow crítico da 245 — mesma disciplina: backup, teste antes/depois, reverter se algo
parecer estranho.

## Referências
Demanda 245 (achado original). Demanda 242 (confirma `07-GRUPO-PEDIDOS` descontinuado).

## Relato de execução

**Status final: parcial** — o objetivo específico desta demanda (o caminho `is_grupo_pedido`
deixar de ser uma rota especial quebrada e virar log normal) foi **alcançado e confirmado com
evidência**. Mas a mensagem ainda não gera linha real em `jsgrafica_log_msgs_grupos` hoje — não
por causa de nada desta demanda, e sim porque a tabela ainda tem o problema de schema da 248
(`request_method` faltando), que o Edvam decidiu conscientemente não corrigir naquela demanda.
Reportando essa tensão com clareza, não escondendo.

### Mapeamento (apresentado e confirmado pelo Edvam antes de qualquer mudança)
3 nodes envolvidos, confirmado por busca no workflow inteiro (não presumido que fosse só 1
ponto): `IDENTIFICAR AUTORIZAÇÃO` (calcula a flag `is_grupo_pedido`) → `Switch Redirect` (branch
4, `GRUPO_PEDIDOS`, único lugar que lê a flag) → `HTTP 07-GRUPO-PEDIDOS` (já `disabled: true`
desde a 245). Achado extra que explicou por que a 245 não resolveu de vez: `PREPARAR LOG MSG
GRUPOS` tem 2 entradas diferentes — uma de `If2` (caminho normal, funcional) e outra de `HTTP
07-GRUPO-PEDIDOS` (o caminho quebrado, que sendo `disabled` só repassa o dado adiante sem rodar a
chamada morta). Quando a mensagem batia no padrão `is_grupo_pedido`, o erro em `PREPARAR LOG MSG
GRUPOS` (alcançado pelo caminho morto) abortava a execução ANTES do caminho normal (`Switch Log
Geral`) rodar — por isso a mensagem nem log normal recebia.

### O que foi feito
1. Backup do workflow `01` antes de mexer:
   `pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda249_2026-07-29.json`.
2. Correção mínima e cirúrgica, exatamente como proposto no checkpoint: removida só a conexão
   `HTTP 07-GRUPO-PEDIDOS → PREPARAR LOG MSG GRUPOS` (vira beco sem saída, mesmo padrão já usado
   pro `HTTP Request1` na 245). Nenhum node foi tocado — nem parâmetros, nem `disabled`, nem a
   flag `is_grupo_pedido`, nem `Switch Redirect`.
3. Deploy via API, **diff completo confirmado**: dos 48 nodes, zero mudou (comparação campo a
   campo); das conexões, só a de `HTTP 07-GRUPO-PEDIDOS` mudou, de
   `[[{"node":"PREPARAR LOG MSG GRUPOS",...}]]` pra `[[]]`. Nada mais no workflow foi alterado.

### Testes realizados e resultado
**Mensagem no padrão `is_grupo_pedido`** (grupo + telefone autorizado + comando `/...`): a
execução **passou a rodar o caminho normal de log** (`Switch Log Geral` → `Get row(s) MSG GRUPO`
→ `If2` → `PREPARAR LOG MSG GRUPOS`) — confirmado nos nodes executados. `PREPARAR LOG MSG
GRUPOS` **não quebrou mais** (a referência `$('Switch Log Geral')` funcionou, porque agora só é
alcançado pelo caminho onde esse node de fato rodou antes). **Isso é exatamente o que a demanda
pedia**: a mensagem deixou de tentar rotear especial e passou a ser tratada como grupo normal.

**Mas a execução ainda terminou em erro** — agora no node seguinte, `MSG GRUPOS` (insert no
Supabase), com o mesmíssimo erro já documentado na 248: `"Could not find the 'request_method'
column of 'jsgrafica_log_msgs_grupos' in the schema cache"`. **Nenhuma linha real foi criada**
(confirmado por SQL: 0 linhas com o `message_id` de teste).

**Teste de controle (mensagem de grupo NORMAL, sem padrão de comando)**: rodou exatamente pelo
mesmo caminho (`Switch Log Geral` → ... → `PREPARAR LOG MSG GRUPOS` → `MSG GRUPOS`) e **falhou
no mesmo node, com o mesmíssimo erro**. Ou seja: depois da correção, uma mensagem
`is_grupo_pedido` se comporta **exatamente igual** a uma mensagem de grupo normal — nem melhor,
nem pior. **Confirma sem ambiguidade que esta demanda não introduziu nenhuma regressão nova**: o
que trava hoje é 100% o problema já conhecido e conscientemente não corrigido na 248, não algo
causado aqui.

Nenhuma linha de teste ficou pra trás em `jsgrafica_log_msgs_grupos` (os 2 testes falharam antes
do insert) nem em `jsgrafica_contatos` (confirmado por SQL, 0 linhas).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo. O único ponto de atenção é a interação com a 248 (acima) — não é um achado novo, é a
mesma pendência já avaliada e conscientemente deixada em aberto por decisão do Edvam.

### Critérios de aceite
- [x] Mapeamento completo do caminho `is_grupo_pedido` apresentado antes de mexer
- [x] Caminho desligado — mensagem desse padrão não tenta mais rotear especial, cai no log normal
      (confirmado pelos nodes que rodaram: idêntico ao caminho de uma mensagem de grupo comum)
- [ ] Testado com evento sintético do padrão `is_grupo_pedido` — **não loga sem erro** ainda,
      mas pelo motivo já conhecido e fora de escopo (248, decisão consciente de não corrigir);
      dentro do que esta demanda controla, o resultado é o melhor possível
- [x] Confirmado sem regressão em mensagem de grupo normal (fora desse padrão) — comportamento
      idêntico ao da mensagem `is_grupo_pedido` depois da correção, mesmo ponto de falha, mesma
      causa (248), nenhuma diferença introduzida por esta demanda
- [x] Backup do workflow `01` feito antes de mexer
