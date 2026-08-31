# 307 - Proteção contra loop com resposta automática/away-message do cliente

Status: concluída
Criada em: 2026-08-18
Aprovada em: 2026-08-18
Concluída em: 2026-08-18
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado ao vivo (Edvam + PM), investigando com dado real, não suposição: existe registro histórico
real de números que mandaram resposta automática/away-message pro número da JS Gráfica (achados
reais no log: "Agradecemos sua mensagem. Não estamos disponíveis nosso horário de atendimento",
bot da Solfácil, bot do "Renegocie Bradesco", bot do Telesefaz). Nenhum desses casos formou loop
até hoje pelo motivo certo: nunca existiu, até a demanda 299, um agente respondendo de verdade e
automaticamente no roteamento real do `01` (o `206` mal teve tráfego real, o `ATENDIMENTO_AI`
está pausado). Agora existe (Caminho C, conectado desde a 299). Sem proteção nenhuma, se o agente
novo mandar uma mensagem pra um número com resposta automática ligada, a resposta automática vai
parecer uma mensagem nova de cliente, o agente vai responder de novo, e isso pode continuar sem
parar - gasto de API, spam, risco de sinalização de abuso pela Meta/Z-API, tudo isso sem nenhum
humano perceber até o estrago estar feito.

## Objetivo
O sistema nunca entra num ciclo de resposta automática indefinido com um número que tem
autorresposta/away-message do lado do cliente, em nenhum dos caminhos que respondem automático
hoje (206, ATENDIMENTO_AI se algum dia religar, agente novo Caminho C).

## Escopo
- Incluído: **Camada 1, padrão de conteúdo** - pré-passo de código no workflow `01`, ANTES de
  rotear pra qualquer agente, testando a mensagem recebida contra um conjunto de padrões reais de
  away-message/resposta automática (baseado nos casos reais achados: "fora do horário de
  atendimento", "não estamos disponíveis", "mensagem automática", "resposta automática",
  "retornaremos", "agradecemos sua mensagem" combinado com horário, etc. - lista inicial a partir
  dos casos reais, não inventada do zero). Se bater, a mensagem NÃO aciona nenhum agente
  automático - só loga (pro Inbox, se a equipe quiser olhar depois) e para, sem gerar resposta.
- Incluído: **Camada 2, contador de segurança** - mesmo que a Camada 1 não pegue um padrão novo,
  contar quantas respostas automáticas seguidas o sistema já mandou pro mesmo telefone numa janela
  curta (ex. 3 respostas automáticas em menos de 10 minutos, sem nenhum sinal de intenção humana
  real tipo confirmação de pedido, escolha de produto, resposta específica a uma pergunta feita).
  Se estourar, parar de responder automático e marcar a sessão pra revisão humana, sem mandar mais
  nenhuma mensagem sozinho.
- Incluído: aplicar num ponto do `01` que proteja qualquer agente que rotear por ali (não só o
  Caminho C) - mesmo padrão de "defesa em profundidade" já usado pra Dizu (295/296).
- Incluído: testar com pelo menos 1 caso real reconstruído a partir dos achados desta investigação
  (ex. simular a mensagem de away-message real da Solfácil/Renegocie Bradesco chegando) e 1 caso de
  estouro de contador (várias respostas automáticas seguidas simuladas).
- Explicitamente fora de escopo: qualquer mudança de conteúdo/tom das respostas do agente - é só a
  trava de quando ele para de responder sozinho.

## Critérios de aceite
- [x] Camada 1 (padrão de conteúdo) implementada, testada com pelo menos 1 caso real da
      investigação (texto de away-message real, não inventado)
- [x] Camada 2 (contador de segurança) implementada, testada forçando o estouro
- [x] Confirmado que mensagem de cliente real comum (sem nenhum padrão de away-message) continua
      funcionando normal, sem regressão
- [x] Protege qualquer caminho que responda automático hoje no `01`, não só o Caminho C
- [x] `206` e `jsgrafica_contatos` conferidos intactos ao final

## Riscos e cuidados
Cuidado real de calibração: a Camada 1 não pode ser tão ampla que bloqueie mensagem legítima de
cliente que por acaso mencione palavra parecida (ex. cliente perguntando "qual o horário de
atendimento" é pergunta real, não away-message - já apareceu no log real, `558188603659`/
`558193748247`). Diferença: away-message real vem sem pergunta, é declarativo/informativo; pergunta
de cliente termina em "?" ou pede a informação. Testar esse caso especificamente pra não criar
falso positivo.

## Referências
Achado ao vivo desta investigação (2026-08-18): números reais com away-message no log
(`558130327272`, `558191070806`, `558199708970`, `5511930900121` Solfácil, `551123574120`
Renegocie Bradesco, `558184941555` Telesefaz). Demanda 299 (agente novo conectado no roteamento
real, motivo pelo qual esse risco passou a ser real agora). Demandas 295/296 (padrão de defesa em
profundidade já usado pra Dizu, reaproveitar a mesma disciplina).

## Relato de execução

- O que foi feito: no workflow `01`, inserido um ponto único de proteção logo antes do `Switch
  Destino` (protege TODO caminho que rotear por ali: pedidos, agente Caminho C, atendimento),
  reaproveitando as 2 convergências já existentes da demanda 306. 5 nodes novos: `Contar Envios
  Automaticos Recentes` (HTTP GET real na API do Supabase/PostgREST, conta quantas mensagens
  `enviado_por` em ('ia','sistema') foram mandadas pro telefone nos últimos 10 minutos) →
  `Detectar Loop Resposta Automatica` (Code, as 2 camadas) → `Loop Automatico Estourou?` (IF) →
  `Marcar Sessao Para Revisao Humana` (HTTP POST, só no estouro) → `Restaurar Entrada Apos Marcar`
  (Code) → `Switch Destino`. 1 linha mudada em `CHECK SESSAO PEDIDO` (existente): o early-exit que
  já existia pra `status_atendimento==='assumido_humano'` passou a cobrir também
  `'aguardando_equipe'` (valor já existente no schema, nunca usado antes - conferido antes de
  adotar, sem colisão de significado), pra a sessão continuar silenciada em toda mensagem seguinte
  até um humano resolver, não só na que estourou o contador.
  - Camada 1 (padrão de conteúdo): 7 regex tirados literalmente do log real (Solfácil, Renegocie
    Bradesco, Telesefaz e outros bots achados na investigação) - "fora do horário de atendimento",
    "não estamos disponíveis", "mensagem automática", "resposta automática", "retornaremos sua
    mensagem", "agradecemos sua mensagem" + sinal de horário por perto, "sua sessão foi
    finalizada". Qualquer "?" no texto desarma a Camada 1 inteira (pergunta real de cliente nunca
    é declarativa como away-message).
  - Camada 2 (contador de segurança): se o sistema já mandou 2+ respostas automáticas pro mesmo
    telefone nos últimos 10 minutos, a próxima seria a 3ª seguida - trava e marca a sessão
    (`status_atendimento='aguardando_equipe'`, `origem='protecao_loop_307'`) em vez de mandar mais
    uma. Simplificação deliberada de "sem sinal de intenção humana real": o número concreto que a
    própria demanda propôs como exemplo (3 em 10min) foi adotado como critério testável, não a
    versão mais nuançada (confirmação de pedido/escolha de produto), que seria difícil de definir
    com precisão sem inventar heurística nova não pedida.
- Testes realizados e resultado: 3 casos reais, cada um confirmado pelo log de execução, todos no
  telefone de teste de sempre (nunca nome fake). (1) Away-message real reconstruída
  ("Agradecemos sua mensagem. Não estamos disponíveis nosso horário de atendimento...", texto
  idêntico ao achado real de `558191070806`): `_destino` virou `ignorar`, nenhum agente rodou. (2)
  Contador: 2 envios sintéticos `enviado_por='ia'` inseridos nos últimos 10min + 1 mensagem normal
  → 3ª detectada, `_destino` virou `ignorar`, sessão marcada `aguardando_equipe`, nenhum agente
  rodou. (3) Regressão, o caso de calibração que a própria demanda pediu pra não quebrar: "Qual
  horário de atendimento de vocês?" (texto real do achado `558193748247`) passou normal, chegou no
  agente novo, resposta real enviada (zaapId confirmado) - a Camada 1 não bloqueou por causa do "?".
- Achados de processo, corrigidos na própria demanda (mesma classe de bug já vista antes nesta
  sessão, "$json implícito quebra quando o upstream muda" e "node com 0 resultado não roda o
  próximo"): (1) `Contar Envios Automaticos Recentes` sem `alwaysOutputData` fazia o node seguinte
  não rodar quando 0 linhas batiam - corrigido; (2) esse mesmo node faz auto-split de array JSON
  em múltiplos itens n8n (confirmado ao vivo, diferente do padrão de outro node PostgREST desta
  conta usado na demanda 281 - não presumido igual por semelhança), a contagem inicial baseada em
  `.first().json.length` sempre dava 0/undefined mesmo com dados reais - corrigido pra contar
  `.all().length` com tratamento do caso "0 linhas vira 1 item vazio"; (3) `Detectar Loop Resposta
  Automatica` lia `$json` implícito, mas seu upstream direto virou o node HTTP (cuja própria
  resposta substitui o `.json`), perdendo o telefone/texto da mensagem original - corrigido com
  referência nomeada a `Aplicar Fallback Se Destino Morto`/`AJUSTAR DESTINO AGENTE FASE B`; (4) o
  mesmo problema se repetiu em `Marcar Sessao Para Revisao Humana` → `Switch Destino` (a resposta
  do INSERT apagava o `_destino:'ignorar'`, fazendo a mensagem cair sem querer no atendimento
  normal mesmo depois de marcada pro estouro) - corrigido com o node `Restaurar Entrada Apos
  Marcar`, que busca de volta o payload correto por nome; (5) o valor `'loop_automatico_suspeito'`
  que eu tinha escolhido pra `status_atendimento` violava um `CHECK CONSTRAINT` real da coluna
  (só aceita `agent_ativo`/`aguardando_equipe`/`assumido_humano`) - descoberto pelo erro real do
  1º teste de estouro, trocado pro valor `aguardando_equipe` já existente e nunca usado antes
  (conferido antes de reaproveitar).
- Achados fora do escopo (relatados, não resolvidos por conta própria): durante a investigação da
  causa dos bugs acima, notei que `GET Memoria Ativa (raw)` (node que `CHECK SESSAO PEDIDO` usa
  pra saber se há sessão de pedido ativa) também não tem `alwaysOutputData` configurado - se um
  telefone completamente novo (zero histórico em `jsgrafica_memoria_conversas`) sofrer do mesmo
  comportamento agora confirmado 2x nesta demanda, a mensagem do PRIMEIRO CONTATO desse cliente
  poderia nem chegar em `CHECK SESSAO PEDIDO`. Não testado ao vivo (exigiria simular telefone
  genuinamente novo, fora do escopo desta demanda), não confirmado como bug real - é suspeita
  fundamentada, não fato medido, por isso não virou demanda própria ainda; registrado aqui e na
  memória pra investigação futura.
- Status final: concluída. Dado de teste limpo por completo: 8 linhas de
  `jsgrafica_log_msgs_privadas` (mensagens sintéticas + as 2 usadas pro contador) apagadas, 3
  linhas de `jsgrafica_memoria_conversas` (`aguardando_equipe` de teste) apagadas - conferido que
  o telefone de teste, que é o mesmo número do piloto da demanda 299, voltou ao estado normal
  (`status_atendimento: 'agent_ativo'`) e não ficou preso silenciado pelo teste. `206` (91 nodes,
  ativo) e `jsgrafica_contatos` (nome real "Ninho" intacto) conferidos no final.
