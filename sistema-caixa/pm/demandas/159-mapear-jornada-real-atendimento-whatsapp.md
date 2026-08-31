# 159 — Mapear a jornada real de atendimento no WhatsApp (investigação, sem código)

Status: aprovada — liberada
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto — objetivo macro
Serve o objetivo 2 de `pm/OBJETIVOS-MACRO.md` (automação gradual do atendimento no Inbox) —
mas é maior que o objetivo 1 (fechamento assistido) em prioridade real, segundo o Edvam
(2026-07-10): "a outra dor que é mais importante que esse fluxo de fechamento pelo agente no zap
é o atendimento do público no zap."

**O problema, nas palavras do Edvam**: mais de 500 atendimentos numa semana (confirmado pelo PM
via SQL: 463 contatos distintos / 3.778 mensagens recebidas nos últimos 7 dias em
`jsgrafica_log_msgs_privadas`, privado, não-grupo). Gabi é a principal atendente, o próprio
Edvam também atende bastante, Zu é auxiliar (trabalha em outros lugares, nem sempre está na
gráfica). Isso deixa o Edvam dividido entre atendimento, produção e financeiro o dia todo.
Objetivo: atendimento automatizado que funcione de verdade, liberando Gabi e Edvam pra balcão e
pro resto — principalmente alimentando a fila de pedidos automaticamente quando o pagamento é
Pix antecipado ("paga e retira depois", padrão muito comum).

**Antes de desenhar qualquer automação, o Edvam quer entender a jornada real de hoje** — não
supor. Esta demanda é só isso: mapear com dado real, sem tocar em código nem propor solução
ainda.

**Achado do PM que confirma um risco real, não hipotético**: existe confusão real e ATUAL (não
histórica) com outro cliente da agência LabOnchain, a Dizu Refeições — clientes mandam pedido de
comida (quentinha/marmita) pro número da JS Gráfica por engano. Confirmado por amostra: 12
mensagens com "quentinha" e 2 com "marmita" nos últimos 30 dias, incluindo mensagens de hoje
(10/07) — ex. "Boa tarde, um almoço 2 opção de lombo e bolinho de frango quentinha grande
feijão", "Quero a quentinha de 14 reais". Qualquer agente automatizado precisa saber lidar com
isso (não responder como se fosse pedido de gráfica, e idealmente indicar o número certo).

## Objetivo
Um relatório, com dado real (não amostra pequena, não suposição), que descreva como é a jornada
de atendimento hoje — o suficiente pra embasar o desenho de uma automação depois, sem precisar
adivinhar.

## Escopo
- Incluído, tudo só-leitura sobre `jsgrafica_log_msgs_privadas` (e `jsgrafica_contatos`/
  `jsgrafica_pedidos` quando precisar cruzar):
  1. **Categorizar os tipos de interação recebida** — pedido direto de serviço, dúvida (preço/
     prazo/like "vocês fazem X?"), pergunta sobre status de pedido já feito, agradecimento/
     encerramento, mensagem de teste/engano, **mensagem claramente destinada a outro negócio**
     (Dizu Refeições confirmada — verificar se há outros padrões parecidos), spam/propaganda.
     Método fica a critério do executor (amostragem manual categorizada + validação, ou
     classificação por regra/keyword com amostra de validação) — o que importa é o resultado
     ser confiável, não uma technique específica.
  2. **Quantificar e caracterizar a confusão com a Dizu Refeições**: quantos contatos/mensagens
     por semana, se são sempre os mesmos números ou gente nova toda vez, se esses contatos
     eventualmente também mandam mensagem relacionada à gráfica (ou é 100% comida), se dá pra
     identificar um padrão simples (palavras-chave, horário, etc.).
  3. **Quantificar o padrão "Pix antecipado, paga e retira depois"**: quantos pedidos reais
     (`jsgrafica_pedidos`) seguem esse padrão especificamente (cruzando com
     `forma_pagamento_escolhida`/`pagamento_momento`, campos das demandas 137/139), que fração
     do total de pedidos isso representa, e como é o texto que o cliente manda quando já
     inicia esse padrão (pra saber se dá pra reconhecer automaticamente).
  4. **Volume e distribuição**: mensagens por dia da semana e por hora — onde estão os picos de
     sobrecarga de verdade (não achismo).
  5. **Taxa de conversão**: quantas conversas/contatos novos numa janela viram pedido real
     (`jsgrafica_pedidos` vinculado) vs terminam sem pedido — indicativo de quanto atendimento é
     "dúvida que não vira venda" vs "pedido direto".
  6. **Como as pessoas formulam pedido hoje**: nas conversas que viram pedido, o texto inicial
     do cliente já é estruturado o bastante (produto+quantidade claros) pra reconhecer por
     regra simples, ou é sempre ambíguo/precisa de pergunta de volta? Isso importa pra decisão
     futura entre automação por regra (mais previsível) vs LLM (mais flexível, mais risco).
- Fora de escopo: propor a automação em si, desenhar fluxo, mexer em qualquer workflow ou
  código. Isso é só o mapa — a proposta vem depois, com o Edvam revisando este relatório
  primeiro.

## Critérios de aceite
- [ ] Relatório com as 6 análises do escopo, baseado em dado real (últimos 30 dias como janela
      padrão, ajustar se fizer sentido pra alguma análise específica — documentar a janela usada
      em cada uma)
- [ ] Confusão com a Dizu Refeições quantificada com números reais, não só a amostra pequena
      que o PM já confirmou
- [ ] Nenhuma alteração em nenhuma tabela — investigação 100% só-leitura

## Referências
`pm/OBJETIVOS-MACRO.md` (objetivo 2). Demandas 137/139 (campos de forma de pagamento/tipo de
entrega, pra cruzar o padrão Pix antecipado). `pm/project_log_dados_contaminados` (achado
histórico relacionado, mas esta demanda é sobre o problema ATUAL, não o antigo).

## Relato de execução

**Status: concluída.** Relatório completo em
`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`, com as 6 análises baseadas em dado real.
Investigação 100% só-leitura — nenhuma tabela alterada.

### Resumo por item

1. **Categorização**: categorizar mensagem a mensagem deu 58% de resíduo "não categorizado"
   (inconfiável) — a maioria era continuação de conversa, não interação nova. Reformulei para
   categorizar **início de sessão** (primeira mensagem após lacuna de +4h): 706 sessões / 483
   contatos em 30 dias, resíduo caiu pra 7,9% (amostrado manualmente, sem padrão sistemático
   relevante restante). Achado principal: **43,3% de toda interação nova começa com mídia sem
   texto** (foto/PDF/áudio) — automação de texto puro fica cega pra quase metade da entrada.
2. **Confusão Dizu Refeições**: 28 contatos/374 mensagens em 30 dias (~8,6% do tráfego), 79%
   concentrado no horário de almoço (10h-13h). Confirmado por amostra de texto real que a
   contagem por palavra-chave direta **subestima** o problema — muitos pedidos de comida usam só
   nome de prato + acompanhamento + preço fixo, sem as palavras originais. Zero mistura com
   assunto de gráfica em qualquer um dos 28 contatos.
3. **Pix antecipado "paga e retira depois"**: a premissa da demanda **não se confirma** nos dados
   disponíveis (pedidos só tem histórico desde 06/07). Descontando ruído (vendas de balcão e um
   número de teste fora da área), há 60 pedidos reais de WhatsApp pagos via Pix em 30 dias, mas
   só 13 mostram pagamento antes da entrega — e mesmo esses têm intervalo de segundos a no máximo
   35 minutos entre pagar e entregar. 59 dos 60 já estão `entregue`. Ou seja: hoje é
   "paga na hora, retira quase junto", não "paga de manhã, busca à tarde". Acho importante o
   Edvam confirmar se está pensando nesse padrão a partir de outra experiência antes de desenhar
   automação em cima dele.
4. **Volume/distribuição** (janela estável 06 a 10/07, único período com Z-API ativa e volume
   real): 677-764 msgs/dia, pico de horário às 13h (453 msgs); 11h-13h parcialmente inflado pela
   confusão da Dizu (item 2).
5. **Conversão**: ~44-49% dos contatos novos (medido em duas janelas, convergente) terminam em
   pedido real vinculado — atendimento não é majoritariamente "dúvida sem venda".
6. **Estrutura do pedido inicial**: amostra de 20 pedidos reais mostrou que a mensagem
   imediatamente anterior ao pedido quase nunca é a especificação em si (é confirmação/logística
   tipo "Ok"/"já vou pegar"), e muitas vezes não há texto algum — o pedido nasce de mídia sem
   legenda interpretada manualmente. Pesa contra automação por regra pura de "produto+quantidade
   no texto".

### Achados fora do escopo original
Nenhum que exigisse ação — todos os achados relevantes (contradição da premissa do Pix
antecipado, subestimativa da confusão Dizu por palavra-chave, volume de mídia sem texto) já estão
registrados no relatório e no resumo acima, para embasar a proposta de automação que vem depois
(fora de escopo desta demanda).

### Critérios de aceite
- [x] Relatório com as 6 análises, baseado em dado real (30 dias padrão; item 3 documentado com
      janela menor, única disponível; item 4 documentado com janela estável menor)
- [x] Confusão Dizu Refeições quantificada com números reais (28 contatos, 374 msgs, 8,6% do
      tráfego) — maior que a amostra pequena original do PM (12+2 mensagens)
- [x] Nenhuma alteração em nenhuma tabela — investigação 100% só-leitura
