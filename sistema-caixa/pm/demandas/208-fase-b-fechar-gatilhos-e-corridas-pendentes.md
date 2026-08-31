# 208 — Fase B: fechar os gatilhos e corridas que ficaram de fora da 206

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-08-14
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A demanda 206 construiu e testou o workflow isolado da Fase B, cobrindo os caminhos principais
(documento óbvio, ambíguo com lista, cancelar, rajada fragmentada). Ficaram de fora, registrados
no próprio relato da 206, 3 pontos que o Edvam decidiu fechar antes de considerar conectar
qualquer cliente real: os gatilhos de escalonamento que faltam, a corrida de escrita concorrente
no buffer de rajada, e a heurística que sempre cai em Impressão P&B A4 por padrão quando a
análise do Gemini não é conclusiva.

## Objetivo
O workflow isolado (206) cobre todos os gatilhos de escalonamento do desenho original, não tem
corrida de escrita conhecida no buffer, e nunca propõe um produto por padrão sem confiança real
na análise — continua 100% isolado, sem tocar no roteamento real.

## Escopo
- Incluído:
  1. **Gatilhos de escalonamento que faltam** — conferir contra a lista completa da jornada
     (`pm/OBJETIVOS-MACRO.md`, passo 6) e das 8 causas reais da demanda 204
     (`mapa-jornada-atendimento-whatsapp.md`, seção 10.3): negociação de pagamento fora do padrão,
     arquivo com senha/erro técnico ao abrir, cliente sem vocabulário técnico (correções
     repetidas na mesma especificação), sessão passando do p90 do tipo de serviço identificado
     (tabela da seção 10.2). Implementar os que a 206 não cobriu — o próprio relato da 206 sabe
     exatamente quais ficaram de fora, conferir lá antes de começar pra não duplicar o que já
     existe (cancelar já está pronto).
  2. **Corrida de escrita concorrente no buffer de rajada** — a 206 identificou o problema mas não
     corrigiu (só evitou duplicar pedido por sorte de timestamp, conforme o teste registrado).
     Corrigir de verdade — decisão do executor sobre o mecanismo (lock, fila, idempotência mais
     forte), documentar o raciocínio.
  3. **Heurística de produto default (sempre P&B A4)** — quando a análise do Gemini não é
     conclusiva o suficiente pra propor um produto com confiança, o comportamento correto é
     escalar pro humano (mesmo caminho do "ambíguo total"), nunca assumir P&B A4 só porque é o
     mais comum. Corrigir o fallback.
  4. **(Adicionado 2026-08-14) Reincorporar a detecção permanente de padrão Dizu Refeições** —
     removida do blueprint pela demanda 259 por engano (tratada como situação temporária, que
     desapareceria quando a Dizu ganhasse número próprio). Revisto: o número da JS Gráfica
     continua sendo o que já está salvo na agenda de muita gente e ligado ao mesmo espaço
     físico/grupo — o padrão nunca desaparece de fato, só muda de volume. Reincorporar no workflow
     `206` como passo permanente (não condicional a nenhuma decisão futura sobre a Dizu):
     reconhece o padrão (comida/prato/cardápio/valor de refeição), nunca decide sozinho, nunca
     afirma "número errado" (mantendo a correção da demanda 246 — às vezes é a própria equipe
     atendendo Dizu de propósito), sempre escala pro humano. Ver Exemplo 8 de
     `blueprint-conversas-exemplo-agente.md` (já atualizado) pro texto de referência. Adicionar
     também a trava de dado: nenhum pedido nasce de mensagem classificada como Dizu.
  5. **(Adicionado 2026-08-14) Atualizar a lista de categorias do workflow `206`** — achado da
     demanda 243, nunca fechado: falta Recarga Celular/Recarga VEM na lista de categorias que o
     agente reconhece, e sobram "Empréstimo"/"Fechamento caixa" contaminando a lista (categorias
     internas que não fazem sentido como resposta de atendimento).
  6. Testar cada correção isoladamente, mesmo critério de segurança da 206: só com o número do
     Edvam, sem tocar no roteamento real do workflow 01.
- Explicitamente fora de escopo: conectar em cliente real (decisão futura separada, ainda não
  tomada, ver demanda 243); qualquer regra de expansão; a divulgação de cardápio da Dizu via Lista
  de Transmissão manual do Admin (isso é decisão de negócio temporária, distinta desta demanda,
  ver `project_contaminacao_dizu_refeicoes.md`).

## Critérios de aceite
- [x] Todos os gatilhos de escalonamento do desenho original implementados e testados
- [x] Corrida de escrita do buffer corrigida (não só evitada por coincidência)
- [x] Heurística de produto default escala em vez de assumir P&B A4 sem confiança
- [x] Detecção de padrão Dizu reincorporada como comportamento permanente (Exemplo 8), com a trava
      de dado (nenhum pedido nasce de mensagem classificada como Dizu) testada
- [x] Lista de categorias do `206` atualizada (Recarga Celular/VEM incluídas — "Empréstimo"/
      "Fechamento caixa" já não estavam na lista curada do `206`, ver achado abaixo)
- [x] Testado 100% isolado, workflow 01 real confirmado intocado ao final
- [x] Nenhum dado de teste esquecido em produção

## Riscos e cuidados
Mesmo risco da 206: não pode, de jeito nenhum, mandar mensagem pra número que não seja o do
próprio Edvam, nem alterar o roteamento real.

## Referências
Demanda 206 (base, relato lista exatamente o que ficou de fora). Demanda 204 (8 causas reais de
debate, seção 10.3). `pm/OBJETIVOS-MACRO.md` (jornada completa, passo 6).

## Relato de execução

Executado em 2026-08-14, 100% isolado no workflow `206 - JSGRAFICA | AGENTE FASE B (TESTE
ISOLADO)` (id `M5WZ6zHAe625XyJm`, inativo), sem tocar no roteamento real (`01 - LOG MSG
RECEBIDAS`). Backup completo do `206` antes de qualquer mudança em
`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda208_2026-08-14.json` (62 nodes). Cada estágio
foi implementado, deployado via API (`PUT /workflows/M5WZ6zHAe625XyJm`) e testado isoladamente
antes do próximo, sempre com o número do Edvam (5521965185667) e limpeza de dado de teste logo
depois. Ao final, workflow tinha 75 nodes (14 adicionados, 1 removido — `Stop Dizu`, substituído).

### Estágio A — corrida de escrita no buffer de rajada
A 206 registrou o problema mas não corrigiu: `Anexar ao Buffer` fazia leitura-modificação-escrita
em JS (lia `sessao.mensagens`, dava `push`, reescrevia o array inteiro), o que perde mensagem se
duas execuções concorrentes lerem antes de qualquer uma escrever. Corrigido com uma função
Postgres atômica (`jsgrafica_agente_anexar_buffer`, `update ... set mensagens = coalesce(...) ||
jsonb_build_array(p_fragmento) ... returning *`), chamada via RPC do PostgREST a partir de um
node `httpRequest` (o node `Atualizar Buffer` mudou de tipo `supabase`→`httpRequest`, nome
preservado pra não quebrar as 2 referências nomeadas que dependiam dele). Um `UPDATE` atômico do
Postgres elimina a janela de corrida por definição — não é mitigação, é eliminação. Testado
disparando 2 fragmentos sequenciais numa sessão de teste: os 2 chegaram no array final sem perda.

### Estágio B — heurística de produto default
Antes: quando a análise do Gemini não classificava como `documento_obvio` + `ambiguo`→P&B A4 por
padrão mesmo sem confiança real. Adicionado o node `Produto Detectado Tem Sinal?`: só segue pra
propor P&B A4 se `gemini_produto_detectado` for não-vazio E não bater um filtro de produtos
claramente incompatíveis (caneca, camisa, caneta, chaveiro, squeeze, boné, quadro, adesivo,
brinde, topo de bolo, convite, colorido, plastificação, encadernação, banner, lona) — senão,
escala pelo mesmo caminho do "ambíguo não identificado". A primeira versão só checava "não
vazio", o que ainda deixava passar falso positivo: testando com uma imagem real de "caneca"
puxada do log de mensagens (`jsgrafica_log_msgs_privadas`), o Gemini classificou
`gemini_produto_detectado: "caneca"` e a lógica fraca ainda propunha P&B A4. Corrigido com o
filtro de exclusão e reconfirmado com a mesma imagem real: agora escala corretamente.

### Estágio C — lista de categorias
Achado da demanda 243 nunca fechado. Confirmado via SQL (`select distinct categoria from
jsgrafica_produtos where ativo=true`) que "Recarga celular" e "Recarga vem" são categorias reais
ativas — adicionadas ao `Enviar Lista Categorias` (2 novos itens antes de "Outro"). "Empréstimo"/
"Fechamento caixa" existem na coluna bruta `categoria` do catálogo (contaminação real, achado
original da 243), mas **já não estavam** na lista curada de 13 itens do `206` — nada pra remover
aqui. Lista final: 15 itens. Testado com uma imagem real ambígua via `execute_workflow`: Z-API
aceitou o envio (`zaapId` real confirmado).

**Achado fora do escopo, sinalizado e não resolvido unilateralmente**: 15 itens excede o limite
de 10 linhas totais que a Meta documenta pra listas interativas do WhatsApp (confirmado na
demanda 260, `developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages`).
A Z-API aceita o payload sem rejeitar (testado), mas não documenta esse limite — o comportamento
real de renderização no WhatsApp (se trunca silenciosamente as últimas linhas) não foi verificado
visualmente. **Decisão de quais categorias cortar/consolidar pra caber em 10 é de produto, não
técnica — precisa da decisão do Edvam antes de qualquer conexão com cliente real.**

### Estágio D — reposicionamento da detecção de padrão Dizu
A demanda 259 tinha removido a lógica do blueprint por engano (tratando como temporária). Antes
da 208: `Filtro Dizu` → `É Dizu?` → (true) `Stop Dizu` (silencioso, sem escalar, sem sessão).
Reincorporado como comportamento permanente, seguindo o Exemplo 8 do blueprint:
- `Filtro Dizu` passou a ir direto pra `GET Sessão Ativa` (antes de checar `É Dizu?`), porque o
  desenho novo precisa saber se já existe sessão ativa pra decidir entre atualizar ou criar.
- `Consolidar Sessão` → `É Dizu?` (era → `Contém Cancelar?`).
- `É Dizu?` (true) → `Sessão Dizu Já Existe?` → `Escalar Dizu - Atualizar Sessão` (sessão
  existente, preserva `dados_extra` e adiciona `motivo_escalonamento: 'dizu'`) ou `Escalar Dizu -
  Criar Sessão` (sessão nova, já nasce com `status: 'escalada'`) → `GET Config (Dizu)` → `Montar
  Envio Dizu` (mensagem fixa "Chamando a equipe", único caso de escalonamento no `206` que envia
  mensagem — os demais são silenciosos por design) → `POST Aviso Dizu`.
- `Filtro Dizu` também ganhou termos mais genéricos na regex (`almoço`, `refeição`, `prato do
  dia`, `preço da marmita`, `tem comida`), além dos nomes de prato específicos já existentes.
- `Stop Dizu` removido (órfão, substituído).
- **Trava de dado** ("nenhum pedido nasce de mensagem classificada como Dizu"): garantida pela
  própria topologia do grafo — os dois caminhos de escalonamento Dizu terminam em `POST Aviso
  Dizu`, sem nenhuma aresta em direção a `Preparar Criação Pedido`/`Criar Pedido Aguardando
  Aprovação`. Não é regra de código que pode ser esquecida numa condição — é estrutural.

Testado nos 2 cenários que a própria 206 tinha deixado como gap ("só testado Dizu na primeira
mensagem"): (a) mensagem Dizu sem sessão ativa — criou sessão já `escalada`, mandou "Chamando a
equipe" real (`zaapId` confirmado); (b) mensagem Dizu no meio de uma sessão ativa com proposta
pendente — atualizou a sessão existente pra `escalada` preservando a proposta em `dados_extra`,
mandou a mesma mensagem. Confirmado por SQL: `0` pedidos criados pro telefone de teste nos dois
casos.

### Estágio E — 3 gatilhos de escalonamento novos
Referência: 8 causas reais de debate da demanda 204 (seção 10.3 do mapa da jornada) e o que a
206 deixou de fora.
- **Negociação de pagamento fora do padrão**: novo node `Negociação Pagamento Fora Padrão?`
  (regex sobre termos como "metade...metade", "fiado", "parcelar", "desconto", "na entrega eu
  pago", exige sessão ativa), encaixado entre `Contém Cancelar?`(false) e `Tem Sessão?`. Escala
  silenciosamente, mesmo padrão do `Escalar - Cancelar`. Testado com sessão ativa + proposta
  pendente: escalou corretamente (`motivo_escalonamento: 'negociacao_pagamento'`), sem mensagem.
- **Arquivo com senha/erro técnico ao abrir**: `onError: continueErrorOutput` adicionado nos
  nodes `Baixar Mídia` e `Gemini Analisar Mídia` (falha de transporte HTTP), roteando pro novo
  node `Escalar - Arquivo Com Problema`. Deliberadamente **não** mexeu no prompt/schema do
  Gemini (validado com 100% de acerto na demanda 203, risco desnecessário). Testado forçando uma
  URL de mídia inexistente (404 real): `Baixar Mídia` capturou o erro e escalou corretamente
  (`motivo_escalonamento: 'arquivo_com_problema'`), sessão referenciada corretamente via
  `$('Criar Sessão').first().json.id`.
- **Cliente sem vocabulário técnico (correções repetidas na mesma especificação)**: novo node
  `Muitas Correções Sem Resolver?`, encaixado em `Escolheu Categoria?`(false), conta quantos
  fragmentos (`tipo: 'fragmento'`) já existem no buffer da sessão — na 3ª tentativa sem resolução
  (2 fragmentos já registrados + a mensagem atual), escala em vez de continuar bufferizando.
  Testado com uma sessão já tendo 2 fragmentos anteriores: a 3ª mensagem ambígua escalou
  corretamente (`motivo_escalonamento: 'sem_vocabulario_tecnico'`).

### Estágio F — timeout p90 do tipo de serviço
Referência: tabela da seção 10.2 do mapa da jornada (p90 = 73min pra IMPRESSÃO P&B A4). Escopo
pragmático: o `206` só propõe esse produto hoje (trava do Estágio B), então o limite só se aplica
quando a proposta pendente é P&B A4. Novo node `Passou do P90 do Tipo de Serviço?`, encaixado em
`Buffer Confirma Proposta?`(false): se a sessão já passou de 73min desde `created_at` sem
confirmação, escala (`Escalar - Timeout P90`, `motivo_escalonamento: 'timeout_p90_pb_a4'`) em vez
de só concluir como timeout silencioso. Testado dos 2 lados: (a) sessão criada 80min atrás —
escalou corretamente após o Wait real de 90s resolver; (b) sessão criada 10min atrás (dentro do
p90, teste de regressão) — concluiu normalmente como antes (`status: 'concluida'`,
`motivo_conclusao: 'timeout_sem_resposta'`), confirmando que o comportamento original não quebrou
pro caso comum.

### Verificação final
- Diff completo entre o backup pré-208 e o estado final do `206`: 14 nodes adicionados, 1
  removido (`Stop Dizu`), 7 nodes existentes com mudança intencional (`Anexar ao Buffer`,
  `Atualizar Buffer` — tipo e parâmetros, `Baixar Mídia`/`Gemini Analisar Mídia` — `onError`,
  `Enviar Lista Categorias`, `Filtro Dizu`), 18 conexões alteradas — todas nos pontos de
  encaixe descritos acima, nada fora do escopo mudou.
- Workflow `01 - LOG MSG RECEBIDAS` confirmado intocado: `updatedAt` atual
  (`2026-08-14T14:57:58.021Z`) é o mesmo deixado pela demanda 266 (concluída antes desta), sem
  nenhuma chamada de escrita feita contra ele durante toda a execução da 208.
  `jsgrafica_agent_config` só foi lido (`GET`), nunca escrito.
  `jsgrafica_produtos`/`jsgrafica_log_msgs_privadas` só foram lidos via SQL pra investigação e
  pra puxar mídia real de teste, nunca escritos.
- Varredura final: `0` linhas em `jsgrafica_agente_teste_sessoes` e `0` pedidos criados pro
  telefone de teste nas últimas 24h.

### Achado fora do escopo (pendente de decisão do Edvam)
Lista de categorias do `206` agora tem 15 itens, acima do limite de 10 linhas totais que a Meta
documenta pra listas interativas do WhatsApp. Não cortei nada unilateralmente — decisão de quais
categorias consolidar/remover é de produto. Bloqueia qualquer conexão com cliente real até
resolvida (que já estava fora de escopo desta demanda de qualquer forma).
