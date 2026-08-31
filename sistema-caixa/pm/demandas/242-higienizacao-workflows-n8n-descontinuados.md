# 242 — Higienização dos workflows n8n: sinalizar de vez o que está descontinuado

Status: concluída (parcial — 1 item bloqueado, ver relato)
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam: workflows sem sinalização de descontinuados geram alerta falso
toda vez que alguém investiga — problema recorrente, precisa de solução definitiva, não caso a
caso)
Concluída em: 2026-07-29/30
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A demanda 241 (investigar o gatilho do workflow `02 - LOG MSG ENVIADAS`) só existiu porque um
workflow ativo no n8n (`active: true`) estava, na prática, sem nenhum chamador real há 87 dias —
e nada na configuração dele sinalizava isso. A mesma investigação achou de quebra o
`JSGRAFICA_envio_de_msg`: existe, está inativo, mas a documentação do projeto dizia "removido de
vez" — outra fonte de confusão evitável.

Padrão identificado pelo Edvam: isso não é um caso isolado, é sintoma de falta de higiene no n8n
— workflows que pararam de ser usados continuam ligados ou sem nenhuma marca de "isso aqui é
legado", fazendo qualquer investigação futura ter que redescobrir o mesmo tipo de coisa do zero
(como a 241 teve que fazer). O objetivo agora é resolver a causa, não só o sintoma pontual do
`02`.

## Objetivo
Levantar todos os workflows do projeto JS Gráfica no n8n, confirmar com evidência real (não só a
flag `active`) quais estão de fato em uso hoje, e sinalizar claramente os que não estão — de um
jeito que nenhuma investigação futura precise redescobrir isso do zero.

## ⚠️ Checkpoint obrigatório antes de mexer em qualquer workflow
Antes de desativar, renomear ou alterar qualquer workflow, apresentar ao PM a lista completa
levantada (workflow por workflow: ativo real, dormente, ou claramente descontinuado, com a
evidência de cada classificação) e a proposta de como sinalizar cada categoria (ex.: prefixo no
nome tipo `[DESCONTINUADO]`, desativação formal, tag do n8n, nota dentro do workflow). Só agir
depois de confirmação — desativar algo em produção por engano é risco real.

## Escopo
- Incluído: listar TODOS os workflows relacionados à JS Gráfica no n8n (busca ampla, não só os
  ~9 já catalogados em `pm/conhecimento/mapa-workflows-n8n.md` — confirmar se essa lista está
  completa ou se tem mais algum esquecido, do mesmo jeito que o `envio_de_msg` "sumiu" da
  documentação sem sumir de verdade).
- Incluído: pra cada um, confirmar com evidência real (não presumir pela flag `active`): execuções
  recentes reais (agora que `02`/`03` já têm logging de execução habilitado, os demais também
  devem ser conferidos/corrigidos se tiverem a mesma lacuna de `settings` achada na 241),
  correlação com dado real no Supabase quando fizer sentido, e config da Z-API (quais campos
  ainda apontam pra cada webhook).
- Incluído: pra cada workflow confirmado dormente/descontinuado, aplicar uma sinalização clara e
  padronizada (a proposta exata fica pro checkpoint) — não deixar nenhum "ativo mas morto" sem
  marca.
- Incluído: atualizar `pm/conhecimento/mapa-workflows-n8n.md` e `CLAUDE.md` (raiz) com o estado
  real e definitivo de cada workflow, pra virar a fonte de verdade única daqui pra frente.
- Incluído: revisitar a decisão sobre o achado do `from_me` não gravado no `02` (demanda 241) à
  luz da classificação final desse workflow — se ele for marcado como descontinuado/desativado
  formalmente, reportar que o bug fica sem efeito prático; se for reclassificado como "pode
  voltar a ser usado", reportar como pendência real.
- Incluído (achado da demanda 243): o node `HTTP Request1` do workflow `01` ainda aponta pro
  webhook `jsgraficagestaoprodutos`, do antigo `05 - GESTAO PRODUTOS` — que o `CLAUDE.md`
  documenta como removido de vez (demanda 010). Confirmar se é referência morta (risco de erro
  HTTP silencioso se algum fluxo passar por ali) e corrigir/remover.
- Explicitamente fora de escopo: qualquer workflow de outro cliente da mesma instância n8n
  (ex.: BIOBOTS) — só JS Gráfica.

## Critérios de aceite
- [ ] Lista completa de workflows da JS Gráfica no n8n, cada um classificado com evidência (ativo
      real / dormente / descontinuado), apresentada ao PM antes de qualquer ação
- [ ] Sinalização aplicada de forma consistente pra todos os dormentes/descontinuados, com
      confirmação do PM antes de cada mudança
- [ ] `mapa-workflows-n8n.md` e `CLAUDE.md` atualizados como fonte de verdade única, sem
      contradição entre eles
- [ ] Achado do `from_me` do `02` (241) revisitado e resolvido (corrigido ou formalmente
      descartado por decisão explícita, não deixado solto)

## Riscos e cuidados
Mudar `active`/nome de workflow em produção é reversível mas visível — sempre com backup antes
(mesmo padrão já usado nas demandas 236/237/239/241) e confirmação explícita antes de cada
mudança, não só no início da demanda.

## Referências
Demanda 241 (origem do achado). `pm/conhecimento/mapa-workflows-n8n.md`. `CLAUDE.md` (raiz,
tabela de workflows, já corrigida pontualmente pelo PM em 2026-07-29 — esta demanda deve
consolidar de vez).

## Relato de execução

**Status final: parcial** — tudo concluído exceto 1 item de escopo (achado da "demanda 243",
adicionado ao arquivo desta demanda) que contradiz uma instrução explícita mais recente do Edvam
("NÃO tocar: 01") — bloqueado por conflito, não decidido por conta própria. Ver seção final.

### Levantamento completo (checkpoint apresentado e confirmado pelo Edvam antes de qualquer ação)
Busca ampla na API do n8n (`GET /workflows`, toda a conta — 370 workflows de ~11 clientes),
filtrado por `grafica`/`jsg` no nome: **29 workflows da JS Gráfica**, não os ~9 já catalogados.
Cada um confirmado com evidência real (execução recente via `/executions`, `settings`, nós/
triggers) antes de classificar — não só pela flag `active`. Checkpoint apresentado ao Edvam com a
lista completa + achado urgente (abaixo) antes de qualquer mudança; ele confirmou as 3 decisões
por escrito antes de eu agir.

### 🔧 Achado urgente resolvido primeiro (bug ao vivo, fora do escopo original mas prioridade
confirmada pelo Edvam)
Duas workflows `REPORT SHEETS` (`JS GRAFICA | REPORT SHEETS` e `JSGRAFICA | REPORT SHEETS` —
confirmado: são 2 workflows DIFERENTES, não duplicata, nomes quase iguais por acidente) estavam
**ativas e quebradas**:
1. `KofIBAIFmZgPNCSc`: node `Atualizar repor_leads_grupos1` falhando em toda execução do ciclo de
   30 min havia 4h+ seguidas (10 falhas consecutivas confirmadas via `/executions`). Causa:
   colunas `participant_name`/`group_id` trocaram de posição na planilha real, schema cacheado no
   node ficou desatualizado (n8n bloqueia a escrita nesse cenário por segurança, em vez de gravar
   na coluna errada). Corrigido trocando a ordem dessas 2 entradas no `columns.schema` do node
   (`columns.value` já mapeia por nome, não precisou mudar nada ali).
2. `taL2rh7MO2qujYEc`: node `GET Config Resumo` (busca `tutor_phone`/`tutor_name` — é o node do
   resumo diário pro "Tutor" às 19h, achado já registrado como "confiabilidade não confirmada" no
   mapa de 2026-07-10) falhando com `Credentials not found` — nunca teve credencial Supabase
   anexada. Corrigido anexando a mesma credencial (`supabaseApi` id `PxQdXsvBxo3M5H8I`, "Supabase
   account 2") já usada por outro node (`Query RPC Summary1`) no MESMO workflow.

Backup de cada um antes de mexer: `pm/backups/report-sheets-JS-GRAFICA-espaco_pre-demanda242_
2026-07-29.json` e `pm/backups/report-sheets-JSGRAFICA_pre-demanda242_2026-07-29.json`.

**Testes**: `KofIBAIFmZgPNCSc` — reexecução manual via `mcp__n8n__execute_workflow` completou o
ciclo inteiro, node `Atualizar repor_leads_grupos1` com `executionStatus: success`, sem erro.
Confirmado ponta a ponta. `taL2rh7MO2qujYEc` — reexecução manual confirmou que o ramo "a cada
30m" continua funcionando (`success: true`), mas **não foi possível testar o ramo corrigido
(`GET Config Resumo`) ponta a ponta hoje** — ele só roda no gatilho agendado das 6h/19h, e o
`manualTrigger` do workflow não está conectado a esse ramo (confirmado nas `connections`). A
correção em si é de alta confiança (reusa credencial já validada em uso no mesmo workflow), mas a
primeira confirmação real será a próxima execução natural (19h de hoje ou 6h de amanhã) — vale
conferir depois, não fechado como 100% validado.

### Classificação final e sinalização aplicada (as 3 decisões do Edvam)
- **20 workflows** renomeados com prefixo `[DESCONTINUADO]` (19 nunca usados de verdade + o `02`,
  por decisão explícita do Edvam formalizando o achado da 241): backup individual de cada um em
  `pm/backups/*_pre-demanda242_2026-07-29.json` antes da mudança, `PUT` só no campo `name`
  (nodes/connections/settings intactos), confirmado via `GET` depois que todos os 20 saíram com o
  novo nome e nada mais mudou. Nenhum foi desativado (`active` mantido como estava — a maioria já
  inativa; o `02` continua `active:true`, só sinalizado, por não ter sido pedido desligar o
  webhook).
- **Não tocados, conforme instrução explícita**: `01`, `03`, `06-PEDIDOS`, `12`, `13`,
  `ATENDIMENTO_AI` (confirmados ativos de verdade por execução real) e `206-AGENTE FASE B`
  (aguardando decisão, não é descontinuado).
- Lista completa com evidência de cada classificação: `pm/conhecimento/mapa-workflows-n8n.md`
  (reescrito por completo) e tabela resumida no `CLAUDE.md` raiz — os dois batem entre si agora.

### Achado do `from_me` do `02` (241) — revisitado e resolvido
Por decisão explícita do Edvam: o `02` foi formalizado como descontinuado (prefixo aplicado), o
que fecha a pendência do jeito previsto no critério de aceite — **o bug de `from_me` não gravado
no `CREATE MSG` do `02` fica documentado como conhecido e sem efeito prático** (o workflow não
deve mais gravar linha nenhuma, então o bug nunca mais dispara). Não foi corrigido (não precisa
— não é comportamento que ainda importa).

### 🛑 Item bloqueado — conflito entre o escopo do arquivo e instrução direta do Edvam
O arquivo desta demanda tem um item de escopo (linhas 55-58) citando um achado da "demanda 243"
(que eu não tenho contexto/arquivo dela nesta sessão): o node `HTTP Request1` do workflow `01`
aponta pro webhook morto `jsgraficagestaoprodutos` (do `05-GESTAO PRODUTOS`, confirmado
descontinuado nesta mesma demanda), pedindo pra "confirmar se é referência morta e corrigir/
remover". Investigando, achei que não é 1, são **2 referências mortas em nós habilitados do
workflow `01`**, ambas alimentadas por branches reais do roteamento (`Switch` e `Switch
Redirect`), não código morto inalcançável:
- `HTTP Request1` (branches 0 e 1 do `Switch`) → `jsgraficagestaoprodutos` (morto, `05`
  descontinuado) — sem nó depois, uma chamada HTTP que hoje só desperdiça uma requisição e
  provavelmente recebe 404 silencioso.
- `HTTP 07-GRUPO-PEDIDOS` (branch 4 do `Switch Redirect`) → `jsgraficagrupopedidos` (morto, `07`
  confirmado descontinuado nesta mesma demanda — achado novo, nunca catalogado antes) → segue
  pro node `PREPARAR LOG MSG GRUPOS`, que roda independente do resultado dessa chamada morta.

A correção mais segura seria `disabled: true` nos dois nodes (preserva o grafo/conexões, reversível,
para as chamadas mortas sem quebrar o fluxo do `PREPARAR LOG MSG GRUPOS`) — **mas isso significa
editar o workflow `01`**, e a sua instrução mais recente no chat foi explícita: "NÃO tocar: 01, ...
(confirmados ativos de verdade)". Como isso contradiz diretamente o item de escopo do arquivo,
**não mexi em nada no `01`** — não decido esse tipo de conflito por conta própria. Precisa de uma
confirmação sua específica pra esse ponto antes de eu (ou quem pegar a "demanda 243") tocar no
`01`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- Os 2 REPORT SHEETS, apesar de nomes quase idênticos, não são duplicata — cada um tem seu
  próprio propósito (schedules levemente diferentes: um só tem gatilho "19h", o outro "6h e
  19h"). Merecem nomes mais distintos no futuro pra evitar confusão (não renomeei, fora do pedido
  específico das 3 decisões).
- `07 - JSGRAFICA | GRUPO-PEDIDOS` nunca tinha sido catalogado em nenhuma documentação anterior
  do projeto — achado novo desta demanda, já incluído no mapa atualizado.

### Critérios de aceite
- [x] Lista completa de 29 workflows, cada um classificado com evidência, apresentada e
      confirmada pelo Edvam antes de qualquer ação
- [x] Sinalização `[DESCONTINUADO]` aplicada nos 20 confirmados, com confirmação prévia do Edvam
- [x] `mapa-workflows-n8n.md` e `CLAUDE.md` atualizados como fonte de verdade única, sem
      contradição entre eles
- [x] Achado do `from_me` do `02` revisitado e formalmente descartado (decisão explícita do
      Edvam: sem efeito prático, workflow descontinuado)
- [ ] Item de escopo das referências mortas em `01` (`gestaoprodutos`/`grupopedidos`) — investigado
      e diagnosticado, mas **bloqueado**: contradiz a instrução "não tocar em 01", aguardando
      decisão explícita antes de agir
