# 299 - Caminho C, passo 5 e 6: conectar o agente novo no roteamento real, piloto de 4 dias, decidir o corte

Status: aprovada (decisão final tomada, execução do desligamento despachada)
Criada em: 2026-08-16
Aprovada em: 2026-08-18
Decisão final do Edvam em: 2026-08-29 - desligar o `206` definitivamente, não vai mais voltar a
ser usado como fallback. Execução do desligamento despachada ao 01-N8N na mesma data.
Concluída em: -
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Itens 5 e 6 da sequência da demanda 292 (seção 7.7). A demanda 298 concluiu o teste adversarial do
agente novo (workflow `297 - JSGRAFICA | CAMINHO C AGENTE`) sem vazamento restante (1 achado
crítico real corrigido e retestado, guardrails de valor/Dizu/Alto Toque/telefone confirmados
determinísticos). Esta demanda estava deliberadamente pouco especificada até este ponto (decisão
consciente, não esquecimento) - agora, com o Edvam, ficou definida:

- **Como**: o agente novo é conectado no roteamento real do workflow `01`, no MESMO ponto onde o
  `206` é chamado hoje (demanda 274), controlado pela MESMA tabela de whitelist
  (`jsgrafica_telefones_autorizados`) e pelo MESMO painel de autosserviço (demandas 275/276) - sem
  UI nova, o toggle que já existe passa a valer pro agente novo em vez do `206`. Decisão explícita
  do Edvam: "já coloca o novo no fluxo quando ligar o botão do painel".
- **Período**: 4 dias corridos, nesta semana (a partir de quando esta demanda for concluída e
  conectada).
- **Escopo**: quem estiver na whitelist hoje (números internos/teste) passa a ser atendido pelo
  agente novo, não pelo `206`. Não é decisão automática desta demanda adicionar cliente real -
  isso continua sendo decisão separada do Edvam, pelo mesmo painel, quando ele quiser.

## Objetivo
O agente novo atende de verdade quem estiver na whitelist, por 4 dias, com dado real suficiente
pro Edvam decidir ao final desse período se desliga o `206`, mantém os dois, ou volta atrás.

## Escopo
- Incluído: no workflow `01`, trocar o destino que hoje chama o `206` (branch de telefone
  autorizado + mídia/texto de sessão nova, mesma condição da demanda 274) pra chamar o webhook do
  agente novo (`297`) em vez disso. Não duplicar a checagem de whitelist - reaproveitar a mesma
  lógica que já existe.
- Incluído: `206` continua existindo, intacto, congelado - não é desligado nem apagado nesta
  demanda, só para de RECEBER tráfego da whitelist. Se algo der muito errado com o agente novo
  durante o piloto, precisa ser trivial reverter o roteamento de volta pro `206` (mesma troca, no
  sentido contrário).
- Incluído: teste real de ponta a ponta imediatamente depois de conectar (nome/telefone reais,
  nunca fake, disciplina 283/291), confirmando que uma mensagem de um número da whitelist chega no
  agente novo e não mais no `206`.
- Incluído: acompanhar os 4 dias do piloto - taxa de resposta sem intervenção, taxa de escalação
  correta vs. desnecessária, qualquer sinal de vazamento de guardrail em uso real (mesmo raro),
  qualquer erro/queda registrado no log de execução do n8n.
- Incluído: ao final dos 4 dias (ou antes, se o Edvam pedir), relatório com o dado observado pro
  Edvam decidir o corte - a decisão em si (desligar `206`, manter os dois, voltar atrás) é do
  Edvam, registrada aqui quando tomada, não presumida pela demanda.
- Explicitamente fora de escopo: adicionar cliente real novo na whitelist (decisão separada,
  sempre do Edvam, pelo painel, quando ele quiser - esta demanda não muda quem está na lista hoje).

## Critérios de aceite
- [ ] Agente novo conectado no roteamento real do `01`, mesmo ponto/condição que o `206` usava
- [ ] Testado com mensagem real de número da whitelist, confirmando chegada no agente novo
- [ ] Caminho de reversão pro `206` confirmado simples (documentado, testável se precisar)
- [ ] Dado dos 4 dias de piloto registrado (taxa de resposta, escalação, qualquer vazamento,
      qualquer erro) - relatório pronto pro Edvam decidir, mesmo que a decisão em si venha depois

## Riscos e cuidados
É a primeira vez que o agente novo atende alguém de verdade, fora de teste sintético. Mesmo sendo
só a whitelist de hoje (não cliente real novo), qualquer comportamento inesperado deve ser
registrado, não normalizado - é exatamente o que o piloto existe pra descobrir antes de decidir o
corte definitivo.

## Referências
Demanda 298 (teste adversarial, pré-requisito direto, sem vazamento restante). Demanda 274 (mesmo
ponto de roteamento no `01`, agora reaproveitado pro agente novo em vez do `206`). Demandas 275/276
(painel de whitelist, sem mudança de UI necessária). Demanda 292 (seção 7.7, itens 5 e 6,
sequência original).

## Relato de execução

- O que foi feito: no workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (`lcFEt1kbyqNfTS89`), 2 nodes
  novos (`Preparar Payload Agente Caminho C`, `HTTP Agente Caminho C`) e a troca de 1 única
  conexão (a branch "agente_fase_b" do `Switch Destino`, que antes ia pro `HTTP 206`, agora vai
  pro par de nodes novo). Nenhum node existente foi alterado, incluindo o próprio `HTTP 206`, que
  continua no workflow, intacto, só sem nenhuma conexão de entrada - reversão é trocar essa 1
  conexão de volta pro `HTTP 206`, nada mais. Backup do workflow antes da mudança guardado em
  `pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda299_2026-08-18.json`. Diff conferido antes
  do deploy: 53→55 nodes, 0 parâmetros de node existente mudados, 1 conexão mudada.
- Testes realizados e resultado: 1ª tentativa (telefone de teste de sempre, `5521965185667`)
  falhou - a execução real deu erro, `lastNodeExecuted: HTTP 06-PEDIDOS`, `"webhook
  jsgraficapedidos não está registrado"`. Investigando, achei a causa: esse telefone tinha 40
  linhas antigas em `jsgrafica_memoria_conversas` com `origem='06-pedidos'` e fase de pedido
  "ativa", resíduo de testes de sessões anteriores (parte deles da própria investigação da
  demanda 303, mesmo dia) - o node `CHECK SESSAO PEDIDO` do `01` usa a ÚLTIMA linha desse
  telefone pra decidir se a mensagem é "sessão de pedido em andamento", e mandava tudo pro
  `06-PEDIDOS` (morto desde a 303) ANTES de a mensagem chegar no `Switch Destino` onde a mudança
  desta demanda vive. Apaguei as 40 linhas contaminadas (telefone de teste, sem impacto em
  cliente real) e reenviei a mesma mensagem real. 2ª tentativa: sucesso confirmado pelo log de
  execução real (não só pelo texto) - `CHECK SESSAO PEDIDO` decidiu `_destino: "atendimento"`,
  passou por `AJUSTAR DESTINO AGENTE FASE B` → `Switch Destino` → `Preparar Payload Agente Caminho
  C` → `HTTP Agente Caminho C` (nem `HTTP 206` nem `HTTP 06-PEDIDOS` rodaram). O agente novo
  (workflow `297`) processou de verdade, guardrail não bloqueou (`guardrail_bloqueou:false`),
  respondeu com o horário de funcionamento correto e mandou a mensagem real por Z-API (`zaapId`
  confirmado na resposta).
- Achados fora do escopo (relatados, não resolvidos por conta própria): o mecanismo que causou a
  falha do 1º teste não é exclusivo do telefone de teste - é o comportamento padrão do `01` pra
  qualquer telefone cuja última sessão registrada ficou numa fase de pedido "ativa" sem nunca ser
  fechada, combinado com o `06-PEDIDOS` estar morto desde a demanda 303. Medido em produção: 441
  telefones reais nessa condição hoje, 112 deles com atividade nos últimos 7 dias - qualquer
  mensagem nova desses números cai no mesmo erro silencioso que travou meu teste, sem receber
  resposta nenhuma. Isso é anterior a esta demanda (existe desde que a 303 desativou o
  `06-PEDIDOS`, ontem), não foi causado por ela, mas apareceu durante o teste desta. Registrado
  como demanda 306, urgente, aguardando decisão do Edvam sobre o caminho de correção.
- Status final: parcial - conectividade feita e testada com sucesso, caminho de reversão simples
  e documentado (não executado, não precisou). Falta o dado dos 4 dias de piloto (período corrido
  começou em 2026-08-18, vai até ~2026-08-22) e o relatório final pro Edvam decidir o corte do
  `206` - isso só pode ser compilado depois que o período real passar, consultando o histórico de
  execução do n8n (workflows `01` e `297`) e as tabelas do Supabase (`jsgrafica_memoria_conversas`,
  log de mensagens com a coluna `enviado_por` da demanda 294), não depende de nenhum monitoramento
  automático rodando durante esse tempo.
