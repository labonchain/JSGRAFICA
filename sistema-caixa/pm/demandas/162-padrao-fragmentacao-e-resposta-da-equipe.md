# 162 — Padrão de mensagens fragmentadas e como a equipe realmente responde (investigação)

Status: concluída
Criada em: 2026-07-12
Aprovada em: 2026-07-12
Concluída em: 2026-07-12
Chat executor: 02 - DADOS JS GRAFICA (executado via REST direto no Supabase com service_role key —
MCP Supabase indisponível na sessão; mesma metodologia, sem alteração de dado, ver nota no relato)

## Contexto — objetivo macro
Continuação de 159/160/161 (objetivo 2, `pm/OBJETIVOS-MACRO.md`). O Edvam está desenhando o
primeiro passo real da automação: agente recebe arquivo → confirma recebimento → pergunta o que
o cliente quer → **acumula o que ele responder (pode vir em várias mensagens seguidas, não uma
só)** → em paralelo lê o arquivo com LLM → gera um **pedido pendente de aprovação** (padrão
"iFood": agente prepara, humano aprova antes de entrar na esteira).

**Achado que motiva esta demanda**: no caso da Ana Paula (achado da 161), a negociação inteira
(preço + forma de pagamento + retirada) aconteceu em várias mensagens seguidas, não numa resposta
única e completa. Se o agente tentasse responder a CADA mensagem recebida individualmente, ia
responder de forma fragmentada/precipitada, sem esperar o cliente terminar de explicar. Precisa
entender, com mais exemplos reais (não só 1 caso), como esse padrão de fragmentação se comporta
de verdade, pra decidir quando o agente deve esperar antes de responder.

**Segunda pergunta do Edvam**: será que, em vez de só perguntar "o que você deseja fazer?", o
agente consegue **direcionar o cliente com base no que já recebeu do arquivo** (ex.: documento
de 5 páginas → já anuncia direto "isso vai ser R$X de impressão P&B, confirma?" em vez de
perguntar em aberto)? Precisa ver se a equipe já faz isso hoje (inferir a partir do arquivo sem
perguntar tudo) ou se sempre pergunta em aberto.

## Objetivo
Entender, com pelo menos 10-15 exemplos reais concretos (não estatística agregada só — a
124/161 já cobrem volume, isto aqui é sobre *comportamento* e *conteúdo*), como a equipe lida com
mensagens fragmentadas e como formula as respostas — pra servir de referência de comportamento
pro agente, antes de escrever qualquer prompt.

## Escopo
- Incluído, só-leitura sobre `jsgrafica_log_msgs_privadas`:
  1. **Padrão de fragmentação do cliente**: pra uma amostra de sessões que começam com mídia sem
     texto (mesma base da 159/161), medir o intervalo de tempo entre mensagens SEGUIDAS do mesmo
     cliente (sem resposta da equipe no meio) — existe um padrão claro de "pausa" que separa um
     pensamento completo do próximo (ex. a maioria das rajadas termina em X segundos/minutos)?
     Mostrar pelo menos 10 exemplos reais de conversas com esse padrão de rajada, com o texto
     real de cada mensagem em sequência (como fizemos com Wilson Reis/Ana Paula).
  2. **Quando a equipe responde**: nesses mesmos casos, a Gabi/Edvam esperam a rajada terminar
     antes de responder, ou às vezes respondem no meio (interrompendo)? Se esperam, quanto tempo
     de silêncio do cliente costuma passar antes da equipe entrar? Isso define o "tempo de espera"
     que o agente deveria usar antes de considerar que o cliente terminou de explicar.
  3. **Conteúdo/tom das respostas da equipe**: nos casos de mídia sem legenda, o que a equipe
     realmente escreve pra confirmar recebimento e perguntar o que o cliente quer? Colecionar as
     frases reais usadas (não resumir/parafrasear — copiar o texto exato) pra servir de
     referência de tom/vocabulário.
  4. **Direcionamento a partir do arquivo, sem perguntar em aberto**: existe caso real onde a
     equipe já inferiu o que fazer só olhando o arquivo (sem perguntar "o que você quer?"),
     porque o contexto já era óbvio (ex. documento óbvio de X páginas, mesma pergunta que sempre
     fazem pro mesmo tipo de arquivo)? Quantificar quantos dos casos analisados seguem esse
     padrão vs quantos realmente precisam de pergunta aberta.
- Fora de escopo: propor o prompt do agente ou qualquer texto final de resposta — isso é só
  levantamento de padrão real, a escrita do comportamento do agente vem depois.

## Critérios de aceite
- [x] Pelo menos 10-15 exemplos concretos de conversas com rajada de mensagens fragmentadas,
      texto real citado (não resumido)
- [x] Padrão de tempo de espera da equipe caracterizado (com número, não "parece que")
- [x] Coleção de frases reais que a equipe usa pra confirmar mídia recebida + perguntar o que o
      cliente quer
- [x] Resposta clara pra "dá pra direcionar só pelo arquivo, sem perguntar?" — com contagem de
      quantos casos reais sustentam isso
- [x] Nenhuma alteração em nenhuma tabela — investigação 100% só-leitura

## Referências
Demandas 159/160/161 (`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`, base desta
continuação). Caso Ana Paula (achado item 3 da 161) e Wilson Reis (achado da 160) — exemplos já
conhecidos, não repetir, buscar novos.

## Relato de execução

**Ferramenta**: MCP Supabase estava indisponível nesta sessão de trabalho. Executei a mesma
investigação via chamadas REST diretas ao PostgREST do Supabase (`SUPABASE_SERVICE_ROLE_KEY` de
`.env.local`), com paginação manual (limit/offset) e todo o processamento de agregação/sessão em
JavaScript local — não há RPC de SQL arbitrário disponível. Investigação 100% só-leitura,
**nenhuma tabela foi alterada** (só `SELECT`, confirmado pelos métodos HTTP usados: só GET).

**Janela**: 2026-07-03 (reconexão Z-API, início do tráfego real) a 2026-07-12 (hoje), ~9,5 dias —
mais curta que o padrão de 30 dias porque só esse recorte tem volume relevante e o objetivo aqui
era achar exemplos concretos de comportamento, não medir tendência de longo prazo. Contato de
teste (`5521965185667`), `status@broadcast` e mensagens de grupo excluídos. Fuso local (Recife,
UTC-3) usado em todos os timestamps citados.

**Metodologia**: reaproveitei a definição de "início de sessão" das demandas 159/160/161
(primeira mensagem do contato após lacuna de +4h) e o critério de "mídia sem texto" da 159/161
(`media_type` preenchido e `message_text` vazio/nulo). Encontrei 301 sessões nessas condições.
Para cada uma, defini "rajada inicial" como a sequência de mensagens consecutivas do cliente
(`from_me=false`) até a primeira resposta da equipe (`from_me=true`) ou fim da sessão — e medi os
intervalos entre mensagens dentro dessa rajada, o silêncio antes da 1ª resposta da equipe, e se o
cliente continuava falando logo depois dessa resposta (proxy de "resposta prematura").

**Achados principais** (detalhe completo com todas as citações e números em
`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`, seção 9):

1. **Rajada é real e mensurável**: 60,1% das 301 sessões (181) têm o cliente mandando 2+
   mensagens seguidas antes de qualquer resposta da equipe; 38,2% (115) têm 3+. Intervalo entre
   mensagens da mesma rajada: mediana 22s, 67,8% ≤60s, 76,9% ≤120s — uma pausa de ~1-2 minutos é
   um bom sinal de "cliente terminou de explicar". 12 exemplos concretos documentados com texto
   exato e timestamp (nenhum repete Wilson Reis/Ana Paula/Luciano Araújo/Beronice Maria — a
   sessão de `558195287007`, que tem o mesmo padrão exato da Ana Paula da 161 — 50 cópias, corte,
   mãe paga em dinheiro, recibo pro Conjunto Musical Melodia Divina — foi identificada como o
   MESMO caso e excluída da lista de exemplos novos).
2. **A equipe não interrompe rajadas** (não pode, por construção — a 1ª resposta só existe depois
   que a rajada inicial já parou), mas **demora mais que o padrão geral pra responder** quando a
   sessão começa por mídia sem legenda: mediana de silêncio 229s (3,8min) contra os 42s medidos na
   161 pra qualquer tipo de mensagem. Só 1 caso na amostra (Ricardo do Dutra, `558188852989`)
   mostra evidência real de resposta prematura (pedido automático criado antes do cliente
   confirmar todos os arquivos, corrigido na sequência).
3. **Frases reais coletadas** (10+ citações exatas na seção 9.3) — padrão de tom: nome próprio +
   saudação + confirmação objetiva ("recebemos [o quê]"/"seu arquivo tem [n] folhas") antes da
   pergunta ou do valor.
4. **Direcionamento sem pergunta aberta: acontece, e é mais comum que perguntar** — mas
   majoritariamente via o fluxo de "Criar pedido" do Inbox (template automático "Pedido
   confirmado!"), não via texto livre. Olhando só sessões onde a rajada do cliente era 100% mídia
   sem nenhum texto: 21/33 (63,6%) dos pedidos automáticos nasceram assim, e 5/11 (45,5%) das
   respostas manuais em texto livre também já direcionam sem perguntar. Juntando os dois: **26 de
   44 casos de "mídia pura" (~59%) terminam com produto/preço decidido sem pergunta aberta,
   contra só 1 caso de pergunta genuinamente aberta**. Mas isso só acontece com documentos
   auto-explicativos de 1 página (boleto/fatura = impressão P&B simples) — não há nenhum exemplo
   na amostra de direcionamento sem pergunta pra arquivo ambíguo (foto de objeto, arte gráfica,
   documento multi-página de finalidade não óbvia); nesses casos o padrão é sempre pergunta.

**Limitações explícitas**: (a) não dá pra confirmar se o tempo de espera de ~3-4min é uma decisão
deliberada da equipe ("deixa o cliente terminar") ou só reflexo de carga de trabalho/fila — os
logs não permitem isolar as duas causas; (b) nos casos de "só agradecimento/saudação, sem
confirmar nada em texto" (5/11 do grupo de texto-livre), não dá pra saber se a equipe decidiu o
produto sem perguntar (fora do chat) ou se a conversa continuou por outro canal — o log não
mostra a decisão nesses casos; (c) a amostra de "mídia pura, zero texto" com resposta manual em
texto livre é pequena (11 casos) — suficiente pra um sinal qualitativo, não pra uma proporção
estatisticamente robusta.
