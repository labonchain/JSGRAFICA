# Mapa da jornada real de atendimento no WhatsApp (demanda 159)

Investigação 100% só-leitura, `jsgrafica_log_msgs_privadas` + `jsgrafica_contatos` + `jsgrafica_pedidos`.
Janela padrão: 30 dias (02026-06-10 a 2026-07-10). Cada análise documenta a janela usada quando
diferente do padrão — **atenção**: o tráfego real só começa em 2026-07-03 (reconexão da Z-API);
antes disso o volume é quase zero, então análises de volume/distribuição usam a janela estável
(2026-07-06 em diante).

**Correção (achada na demanda 161, 2026-07-10)**: os itens 2 e 4 originais extraíam hora do dia
com `extract(hour from to_timestamp(...))` **sem conversão de fuso** — a sessão do Postgres roda
em UTC, então os "horários" reportados abaixo eram hora UTC, não hora local de Recife (UTC-3).
Refiz as duas análises com `AT TIME ZONE 'America/Recife'` e corrigi os números diretamente nos
itens 2 e 4 abaixo (marcados com nota). A conclusão qualitativa de ambos os itens sobrevive (pico
continua em horário comercial/almoço), só os números e o rótulo de hora exato mudaram.

## 1. Categorização dos tipos de interação recebida

**Método**: classificar mensagem a mensagem gerou um resíduo "não categorizado" de 58% — inútil.
Motivo: a maior parte das mensagens de uma conversa é **continuação** (resposta a pergunta,
confirmação), não o início de uma interação nova. Reformulei para categorizar **início de sessão**:
primeira mensagem do contato após uma lacuna de +4h (ou primeira mensagem já na janela). Isso deu
706 inícios de sessão / 483 contatos distintos em 30 dias — uma unidade muito mais fiel ao que
"tipo de atendimento" realmente significa.

| Categoria | Qtd | % |
|---|---|---|
| Mídia sem texto (imagem/áudio/documento, sem legenda) | 306 | 43,3% |
| Saudação curta ("bom dia", variações/erros de digitação) | 206 | 29,2% |
| Outro / não categorizado (resíduo, amostrado manualmente — ver abaixo) | 56 | 7,9% |
| Ambíguo/curto demais (emoji, ponto, 1 palavra solta) | 52 | 7,4% |
| Confusão Dizu Refeições | 39 | 5,5% |
| Spam/propaganda/phishing externo | 24 | 3,4% |
| Serviço documental/burocrático (Detran, CNH, identidade, boletim de ocorrência — não é gráfica pura) | 7 | 1,0% |
| Pedido/menção direta a serviço da gráfica | 7 | 1,0% |
| Agradecimento/encerramento curto | 4 | 0,6% |
| Dúvida (preço/prazo/vocês fazem/horário) | 2 | 0,3% |
| Status de pedido já feito | 2 | 0,3% |
| Teste interno/diagnóstico (PM) | 1 | 0,1% |

**Achado mais importante deste item**: 43,3% de todas as novas interações começam com **mídia sem
texto** — provavelmente a foto/PDF do documento a imprimir, ou um áudio. Qualquer automação
baseada só em texto (regra ou LLM) fica cega pra quase metade do volume de entrada logo na
primeira mensagem, a não ser que também processe a mídia (OCR/transcrição) ou peça uma legenda.

O resíduo de 7,9% (56 mensagens), amostrado manualmente, é majoritariamente: respostas
contextuais a uma pergunta feita antes fora da janela de 4h considerada início de sessão (números
soltos, "sim"/"não"), mais alguns casos residuais de confusão Dizu/spam que a regra de palavra-chave
não pegou, e 1 mensagem de teste interno explícita. Não há um padrão sistemático relevante restante.

## 2. Confusão com a Dizu Refeições — quantificada

- **Contagem por palavra-chave direta** (quentinha, marmita, almoço, prato feito, bolinho de
  frango, lombo, cardápio): 28 contatos distintos, 374 mensagens em 30 dias (~8,6% de todo o
  tráfego recebido). 79% dessas mensagens (294/374) concentradas no horário de almoço (10h-13h,
  pico às 12h com 132 mensagens). **[Correção 161]** esse horário estava em UTC, não local. Em
  hora real de Recife, o pico é **11h local** (29 mensagens no recorte reamostrado), com a maior
  concentração entre 11h-13h local — a conclusão qualitativa ("concentrado no horário de almoço")
  se confirma, só o rótulo "pico às 12h" estava a 3h de diferença do horário real.
- **Confirmado por amostragem de texto real**: muitos pedidos de comida **não usam nenhuma das
  palavras-chave originais** — usam nomes de pratos específicos ("peixe frito", "bife ao molho",
  "cupim molho", "panqueca de carne", "frango pizzaiolo") + o padrão de acompanhamento
  ("arroz, feijão macassar/mulatinho, farofa e vinagrete") + preço fixo ("de 14"/"R$14"). Ou seja,
  a confusão real é **maior** do que a contagem por palavra-chave direta sugere — o padrão mais
  confiável pra reconhecer automaticamente não é uma palavra isolada, é a combinação
  prato+acompanhamento+preço fixo de marmita.
- **São sempre os mesmos números ou gente nova?** Mistura dos dois: os 3 números mais recorrentes
  (`CLIENTE-101`, `CLIENTE-102`, `CLIENTE-103`) mandam pedido de almoço quase todo dia — parecem
  clientes fiéis da Dizu que erram o número recorrentemente. Mas o total de 28 contatos distintos
  em 30 dias (vs. só 3 recorrentes) mostra que também há gente nova cometendo o mesmo engano.
- **Esses contatos também mandam mensagem de gráfica?** Não. Confirmado por SQL: **zero** dos 28
  contatos menciona qualquer palavra relacionada a gráfica (xerox, impressão, encadernação,
  plastificação, recarga, foto, currículo) — é 100% confusão pura, nunca mistura com negócio real.
  Uma exceção histórica: um dos 3 recorrentes foi cliente real da gráfica em abril/2026
  ("imprimir só primeira página"), mas de julho em diante só manda pedido de comida.
- **Padrão simples pra reconhecer automaticamente?** Sim — concentração de horário (10h-13h) +
  vocabulário de prato/acompanhamento/preço fixo de marmita é um sinal forte e barato de checar
  antes de tratar como pedido de gráfica.

## 3. Padrão "Pix antecipado, paga e retira depois" — quantificado (e a premissa não se confirma)

`jsgrafica_pedidos` só tem histórico real desde 2026-07-06 (552 pedidos no total até 10/07) —
janela bem menor que os 30 dias padrão, documentando aqui por ser a única disponível.

- Campos `forma_pagamento_escolhida`/`pagamento_momento` (demandas 137/139) só estão preenchidos
  em 89 dos 552 pedidos (16% — são campos novos, pedidos antigos/outros fluxos não passam por eles).
- Da combinação literal `pix` + `agora`: 33 pedidos — mas ao investigar, a maioria é ruído: 24 são
  vendas de **balcão** (`telefone='balcao'`, não é WhatsApp) e mais alguns de um número com DDD do
  Rio de Janeiro (`5521...`) repetindo o mesmo item de teste (xerox R$0,45) várias vezes no mesmo
  dia — claramente não é cliente real da gráfica (Recife-PE, DDD 81/87/91/95...). **Descontando
  isso, restam só 8 pedidos reais de WhatsApp** com essa combinação exata de campos.
- Usando o campo mais antigo e mais preenchido (`forma_pagamento` contendo "pix"), filtrando fora
  balcão e o número suspeito: **60 pedidos reais de WhatsApp pagos via Pix** em 30 dias — bem mais
  representativo (18,75% dos 320 pedidos reais de WhatsApp no período).
- **Mas o padrão "paga agora, retira DEPOIS" (com espera de verdade) quase não aparece**: dos 60,
  só 13 têm `pagamento_confirmado_at` antes de `data_entregue_at` — e olhando o intervalo real
  entre pagamento e entrega desses 13, o maior é 35 minutos, a maioria é menos de 1 minuto. **59 dos
  60 já estão com status `entregue`**, nenhum ficando pendente de retirada por horas ou dias.
  Isso indica que, na prática hoje, "Pix" quase sempre significa "cliente paga e já leva na hora"
  (ou já está esperando no balcão/perto), não o fluxo descrito de "paga de manhã, busca à tarde".
  **Esse achado contradiz a premissa da demanda** de que esse padrão de espera é "muito comum" —
  pelo menos nos dados capturados até agora (5 dias de pedidos reais é pouco tempo pra ter certeza
  absoluta, mas o sinal disponível não sustenta a premissa).
- **Texto inicial do cliente nesse padrão**: ver item 6 — é o mesmo padrão geral (raramente
  estruturado, geralmente vem de mídia/arquivo, não de uma frase pronta).

## 4. Volume e distribuição (janela estável 2026-07-06 a 2026-07-10, 5 dias úteis)

- Volume por dia: 677 a 764 mensagens recebidas/dia, 91-131 contatos distintos/dia — estável, sem
  grande variação entre os dias disponíveis (ainda não há dado de fim de semana na janela estável).
- Pico de horário: 9h (377 msgs), 11h (413), **13h é o pico absoluto (453)**, 15h (378) — atividade
  concentrada 07h-18h, praticamente zero fora desse intervalo. **[Correção 161]**: esses horários
  estavam em UTC. Refeito com hora local de Recife (mesma janela, excluindo o contato de teste):
  volume real por hora local é 7h (152), 8h (231), 9h (265), 10h (281), 11h (326), 12h (282),
  **13h local é o pico real (373)**, 14h (256), 15h (269), 16h (245), 17h (120) — cai quase a zero
  fora de 07h-17h local. Coincidência: o pico ainda cai no valor "13h", mas é uma hora local
  diferente da hora UTC "13h" do número antigo (453) — o pico real e correto é maior (373 no
  recorte sem o contato de teste; a diferença de magnitude vem também da exclusão desse contato).
- Cruzando com o achado do item 2: o pico de 11h-13h é parcialmente "contaminado" pelo horário de
  almoço da confusão com a Dizu (79% das mensagens de comida caem exatamente nesse intervalo) — ou
  seja, parte da sensação de sobrecarga ao meio-dia é tráfego que nem é da gráfica.

## 5. Taxa de conversão (contato novo → pedido real)

- Contatos genuinamente novos (`data_primeiro_contato`) na janela estável (2026-07-06 a 2026-07-09,
  com folga de pelo menos 1 dia pra dar tempo de gerar pedido): **179 contatos novos, 88 com pedido
  vinculado em `jsgrafica_pedidos` → 49,2% de conversão.**
- Mesma métrica nos 30 dias completos (com viés: boa parte da janela é o período quase morto
  antes da reconexão Z-API, então contatos "novos" de 3 semanas atrás não tiveram como gerar
  pedido num sistema que só passou a registrar pedidos a partir de 06/07): 232 contatos novos, 103
  com pedido → 44,4%. Os dois números convergem (~44-49%), o que dá confiança na faixa.
- **Leitura**: quase metade de quem manda a primeira mensagem termina em pedido real — o
  atendimento não é majoritariamente "dúvida que não vira venda"; é bem dividido entre pedido
  direto e atendimento que não converte.

## 6. Como as pessoas formulam pedido hoje

Amostrei 20 pedidos reais de WhatsApp (fora balcão/teste) e busquei a mensagem de texto do cliente
mais próxima antes da criação do pedido. Resultado, de forma consistente:

- **A mensagem imediatamente anterior ao pedido quase nunca é a especificação do pedido em si** —
  é confirmação/logística: "Simmm", "Ok", "Pode sim, já já passo aí pra pegar", "Brigado", "Vai
  meu neto buscar", "Irei por volta das 14hs".
- Em muitos casos **não existe nenhuma mensagem de texto na janela de 30 minutos antes do
  pedido** — o pedido nasceu de uma **mídia sem legenda** (foto do documento, PDF, boleto) que o
  operador (Gabi/Edvam) interpretou e cadastrou manualmente no sistema, sem que o "produto +
  quantidade" tenha sido dito em texto claro em nenhum momento.
- Quando há negociação em texto, ela é sobre **detalhes que dependem de contexto visual ou
  pergunta de volta** ("quantos por folha", "pode ser recortado", tamanho de papel, cor) — não
  vem pronta como "2 impressões P&B A4".

**Conclusão pro item 6**: o texto inicial do cliente **raramente é estruturado o bastante pra
reconhecer por regra simples** (produto+quantidade explícitos). Na prática, a maior parte dos
pedidos reais depende de (a) interpretar um arquivo/imagem enviado sem texto, ou (b) uma
pergunta de volta feita por um humano pra fechar a especificação. Isso pesa a favor de uma
automação que **use LLM com leitura de mídia/contexto** (ou que, no mínimo, sempre faça 1
pergunta de confirmação) em vez de um motor de regras que espera receber produto+quantidade
prontos na primeira mensagem — o risco de regra pura é ficar cego pra quase metade da demanda de
entrada logo de cara (item 1: 43% já chega como mídia sem texto).

## 7. Complemento (demanda 160) — conversão cruzada Inbox→balcão

O Edvam trouxe 2 correções de perspectiva depois de revisar a 159, antes de qualquer desenho de
automação. Investiguei as duas, ainda 100% só-leitura.

### 7.1 Conversão cruzada: conversa no Inbox sem pedido em 48h, depois vira pedido de balcão

**Método**: reaproveitei a base de "início de sessão" da 159 (primeira msg após lacuna de 4h),
janela 2026-07-01 a 2026-07-06 (janela em que `jsgrafica_pedidos` já tem histórico real, com pelo
menos alguns dias de folga pra observar conversão tardia até hoje 10/07). Excluí 1 contato de
teste óbvio (`5521965185667`/`52063694233823@lid`, DDD do Rio de Janeiro, repete o mesmo item de
teste dezenas de vezes — não é cliente real) e 1 nome genérico (`J S Gráfica`) que gerava falso
match por nome.

- **152 sessões de Inbox sem pedido vinculado em 48h** (contatos distintos, no período).
- Dessas, **21 (13,8%) eventualmente aparecem com algum pedido depois das 48h** — usando telefone
  ou nome do contato pra cruzar com `jsgrafica_pedidos`.
- Das 21, separei por "teve mensagem de WhatsApp perto da criação do pedido" (até 2h antes) —
  proxy pra distinguir "só continuou a mesma conversa de Inbox depois" (mesmo canal, só demorou)
  de "sumiu do Inbox e reapareceu como pedido sem conversa nova" (indício de ter ido no balcão):
  - **17 (11,2% do total de 152) têm mensagem perto do pedido** → provavelmente só continuaram
    conversando no WhatsApp e o pedido foi criado a partir dessa continuação — não é conversão
    cruzada de canal, é conversão de Inbox só que demorada.
  - **4 (2,6% do total de 152) não têm mensagem nova perto do pedido** → sinal mais forte de
    conversão cruzada real Inbox→presencial. Confirmei o conteúdo da conversa original desses 4:
    ex. **CLIENTE-104** (04/07, 12h46): manda a mídia, escreve *"Imprimir a 2,3 e4 folha ok"*,
    *"Tô indo buscar"*, depois *"Tá funcionando hoje não é"* / *"??"* (sem confirmação clara na
    conversa) — o pedido só é lançado no sistema **2 dias depois** (06/07, por Gabi). Padrão
    parecido em **CLIENTE-105** (mídia sem texto, pedido só 2 dias depois) e **CLIENTE-106**
    (mídia sem texto, pedido 3 dias depois). Bate com a hipótese do Edvam: cliente fala no Inbox,
    não fecha ali, aparece fisicamente depois e o pedido é lançado nesse momento.
- **Leitura**: a conversão cruzada Inbox→balcão existe e é real (confirmada com casos concretos),
  mas no recorte medido é uma fatia pequena (2,6% das conversas sem pedido em 48h) comparada à
  simples continuação tardia da mesma conversa no Inbox (11,2%). Ainda assim, ela **subestima
  levemente** a taxa de conversão de 44-49% medida no item 5 — o número real de "atendimento que
  eventualmente virou venda" é um pouco maior que o medido lá, não uma mudança drástica de leitura.
- Não deu pra identificar um tipo de serviço específico mais associado à conversão cruzada — os 4
  casos e a maioria dos 17 são todos `IMPRESSÃO P&B A4` (o serviço mais comum em geral), não um
  padrão distinto de "dúvida que se resolve melhor ao vivo".

### 7.2 Limitação a documentar: padrão de retirada com espera real, dado pré-156

O achado da 159 (item 3: "Pix antecipado, retira depois" quase não aparece, pagamento e entrega
praticamente juntos) foi medido **inteiramente antes ou no mesmo dia** da Fase 5 da Jornada do
Pedido (demanda 156, deployada hoje 2026-07-10) — a mudança que unificou o "retira depois" do
balcão na mesma esteira de produção do Inbox (antes pulava direto pra `aguardando_retirada` sem
passar por `confirmado`/`em_producao`/`pronto`). **Isso significa que a ausência do padrão de
espera real nos dados pode refletir uma limitação de como o sistema registrava esse fluxo até
agora, não a ausência real do comportamento do cliente** — o Edvam confirma que esse padrão existe
de verdade (ex. imprimir grande quantidade, entrega tempos depois).

**Não remedido agora** (fora de escopo desta demanda) — **recomendação**: reavaliar o achado do
item 3 depois de **2-3 semanas de dado pós-156** (a partir de meados/final de julho de 2026), com a
infraestrutura de estados já madura, antes de decidir se o padrão é raro de verdade ou só estava
mal capturado.

## 8. Aprofundamento de comportamento (demanda 161)

Continuação de 159/160, olhando comportamento (não só volume): resposta, quem atende, onde trava,
o que pedem, e sobreposição de picos. 100% só-leitura. Todas as horas abaixo já em horário local
de Recife (`AT TIME ZONE 'America/Recife'`, ver correção no topo do documento).

### 8.1 Tempo de resposta do atendimento

- Base: toda mensagem recebida (`from_me=false`) seguida imediatamente por uma resposta humana
  (`from_me=true`) na mesma conversa, 2026-07-03 em diante, contato de teste excluído. 1.181
  respostas medidas.
- **Mediana: 0,7 minuto (42 segundos).** Média: 139,1 minutos — **a média não deve ser usada**,
  está totalmente distorcida por outliers (máximo observado: 4.783 minutos, ~80h). 133/1.181
  (11,3%) demoram mais de 1h; 82/1.181 (6,9%) mais de 4h.
- **Por dia da semana** (janela estável 06 a 10/07, 07h-19h local): segunda-feira (06/07) tem a
  cauda muito pior que os outros dias — p90 de 258,8 min e 33/170 (19,4%) respostas acima de 1h,
  contra p90 abaixo de 60 min e menos de 10% acima de 1h em todos os outros dias (terça a sexta).
  Indício de acúmulo típico de início de semana.
- **Por hora do dia**: a **mediana não piora** no pico de mensagens (13h local) — fica estável
  entre 0,2 e 2,1 min em todo o horário comercial. Mas o **p90 (cauda longa)** tem 2 picos claros:
  **12h local (p90 = 574,8 min, ~9,6h)** e **17h local (p90 = 941,9 min, ~15,7h)** — mensagens que
  chegam bem na hora do almoço da equipe ou perto do fechamento têm risco real de esperar até o
  turno seguinte (ou o dia seguinte) pela resposta, mesmo a maioria sendo respondida rápido.

### 8.2 Quem atende o quê, de verdade

- Campo `jsgrafica_contatos.atendente`: só 466 dos 2.207 contatos (21%) têm esse campo preenchido
  — a maioria (79%) nunca foi atribuída a um atendente no sistema, então esta é uma medição
  parcial, não o quadro completo.
- Dos 466 atribuídos: **Gabi 233 (50%), Edvam 209 (45%), Zu 24 (5%).**
- Cruzando com `pedido_criado_por` (333 pedidos reais de WhatsApp, já medido nas 159/160):
  **Gabi 200 (60%), Edvam 105 (32%), Zu 28 (8%).**
- **Correção de premissa**: as duas fontes concordam que Zu é claramente auxiliar (5-8%), mas
  **Edvam não é "secundário"** como a frase original ("Gabi principal, Edvam também atende
  bastante") sugeria — no campo `atendente`, Edvam está quase empatado com Gabi (45% vs 50%). A
  leitura mais precisa é "Gabi e Edvam dividem quase igualmente o atendimento real, Zu é bem
  menor", não "Gabi principal e Edvam de apoio".

### 8.3 Onde a conversa trava (sessões que nunca viraram pedido)

Mesma base de "início de sessão" da 159/160, janela 2026-07-01 a 2026-07-07 (282 sessões no
total). **158 (56%) nunca geram nenhum pedido vinculado** — consistente com a taxa de conversão de
44-49% já medida na 159. Amostrei 15 casos concretos e o padrão qualitativo é bem mais variado do
que uma categoria genérica de "abandonou":

- **Mídia/documento enviado, sem resposta humana registrada em até 6h** (ex.: CLIENTE-107
  manda boleto e diz "Só o boleto"/"Ok", zero resposta; CLIENTE-108 manda 4 documentos + "Meu
  esposo vai buscar", zero resposta; CLIENTE-109 manda vários documentos perguntando a ordem de
  impressão, zero resposta). No total da amostra de 158, **54 (34%) não têm nenhuma resposta
  humana em 6h** — mas esse número mistura casos que realmente precisavam de resposta e não
  tiveram (ponto de atrito real) com casos que a equipe corretamente ignorou (Dizu, spam — ver
  abaixo), não dá pra separar os dois só com esse agregado.
- **Negociação completa no chat que mesmo assim nunca vira pedido registrado no sistema**: caso
  mais importante da amostra — **CLIENTE-110** pergunta o preço de 50 cópias com corte, confirma
  ("Tá certo"), diz que a mãe vai pagar em dinheiro e pede recibo em nome de terceiro — conversa
  com **acordo claro fechado no chat**, mas **nunca aparece um `jsgrafica_pedido` vinculado a esse
  telefone**. Isso sugere que a "taxa de conversão" da 159 (medida só por vínculo em
  `jsgrafica_pedidos`) pode estar **subestimando vendas reais** que acontecem e são combinadas
  via WhatsApp mas não chegam a ser lançadas no sistema — um gap de processo (venda sem registro),
  não de atendimento.
- **Confusão com a Dizu Refeições continua aparecendo em quem "não converte"** (CLIENTE-111 faz
  pedido de comida estruturado; CLIENTE-112 avisa "hoje não vou pedir"; CLIENTE-113
  pede comida e depois pergunta "já está pronto?" pro número errado) — reforça o achado da
  159/160, e mostra que o confundido às vezes chega a perguntar status pro número errado.
- **Contato é outro WhatsApp Business com resposta automática própria, não é atendimento real**:
  achado novo — "Farmácia do Trabalhador Pernambuco" respondeu com uma mensagem de boas-vindas
  automatizada própria ("Olá, seja bem-vindo! Já estamos com entrega em domicílio...") quando a
  JS Gráfica entrou em contato com eles — é ruído de infraestrutura (bot de outro negócio), não
  uma dúvida de cliente real.
- **Dúvida sobre serviço fora do padrão**: CLIENTE-114 pergunta se fazem "marca texto em bíblia"
  — não converte, possivelmente por não ser um serviço que a gráfica ofereça claramente.

### 8.4 O que as pessoas pedem, de fato

Distribuição real de `servico_nome` em `jsgrafica_pedidos` (pedidos reais de WhatsApp, excluindo
balcão e contato de teste):

| Serviço | Qtd | % |
|---|---|---|
| IMPRESSÃO P&B A4 | 212 | 66,0% |
| IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | 26 | 8,1% |
| XEROX PRETO E BRANCO A4 | 9 | 2,8% |
| IMPRESSÃO 2ª VIA CONTA | 7 | 2,2% |
| ENVELOPE A4 | 6 | 1,9% |
| IMPRESSÃO PAPEL CARTÃO A4 180G (só frente) | 5 | 1,6% |
| FOTO 10X15 | 5 | 1,6% |
| DIGITAÇÃO DE PROVAS | 5 | 1,6% |
| IMPRESSÃO COLORIDA OFÍCIO A4 (laser) | 4 | 1,2% |
| CONSULTA E 2ª VIA CONTA | 4 | 1,2% |

**Extremamente concentrado**: só o serviço mais comum (impressão P&B A4) já é 66% de tudo, e os 2
primeiros somam 74,1%. Uma automação que cobrisse bem só "impressão simples P&B/colorida" já
endereçaria a maior parte do volume real, com o menor risco (é também o serviço mais simples de
especificar).

### 8.5 Sobreposição do pico do Inbox com o movimento de balcão

- Pico de mensagens do Inbox (local, item 4 corrigido): **13h (373 msgs)**, com volume alto entre
  9h-16h.
- Pedidos de balcão por hora local: dois picos — **manhã 8h-11h (25, 26, 26, 28)**, uma queda às
  **12h (7 — pausa de almoço da própria equipe)**, e retomada **13h-16h (17, 16, 26, 18)**.
- **Janela de maior risco de sobrecarga simultânea: 13h-14h local** — é exatamente quando o Inbox
  está no pico absoluto (373 msgs) e o balcão já está se recuperando da pausa do almoço (17-16
  pedidos) — a mesma equipe (Gabi/Edvam) provavelmente sendo puxada pros dois lados ao mesmo
  tempo. Um segundo ponto de atenção, menor, é 9h-11h (balcão já com bom volume, Inbox subindo
  pro pico).

## 9. Padrão de fragmentação e resposta da equipe (demanda 162)

Continuação de 159/160/161, focada em *comportamento e conteúdo* (não volume agregado): como o
cliente fragmenta mensagens depois de mandar mídia sem legenda, quando a equipe entra, e se ela
já direciona a partir do arquivo. 100% só-leitura, executado via REST direto no Supabase
(MCP indisponível na sessão) — mesma metodologia de "início de sessão" (primeira mensagem após
lacuna de 4h) das demandas anteriores. Janela: 2026-07-03 (reconexão Z-API) a 2026-07-12 (hoje),
~9,5 dias — mais curta que os 30 dias padrão porque só esse recorte tem tráfego real, e porque o
objetivo aqui é volume de exemplos concretos, não estatística de longo prazo. Contato de teste
(`5521965185667`) excluído, `status@broadcast` e mensagens de grupo excluídos.

Base: 301 sessões que começam com mídia sem texto de um contato real (mesmo critério de
"mídia sem texto" da 159/161: `media_type` preenchido e `message_text` vazio/nulo — o campo
`message_text` já carrega a legenda quando existe).

### 9.1 Padrão de fragmentação (rajada) do cliente

- **181/301 (60,1%)** dessas sessões têm o cliente mandando **2 ou mais mensagens seguidas** antes
  de qualquer resposta da equipe. **115/301 (38,2%)** têm 3 ou mais. Distribuição de tamanho de
  rajada: 1 msg (120), 2 (66), 3 (47), 4 (21), 5 (17), 6 (8), 7 (6), 8 (5), 9 (3), 10+ (10,
  incluindo alguns outliers de dezenas de mensagens ao longo do dia todo — não são "um pensamento
  fragmentado", são vários assuntos na mesma sessão de 4h).
- **Intervalo entre mensagens dentro da rajada** (559 gaps medidos): mediana **22 segundos**;
  **67,8% dos gaps são ≤60s, 76,9% são ≤120s** — a maioria das rajadas reais (mesmo pensamento
  sendo digitado em partes) se conclui em até 2 minutos. Existe uma cauda longa (~10% dos gaps
  >15min) que corresponde a retomadas dentro da mesma janela de 4h, não ao mesmo "pensamento".

**12 exemplos reais de rajada** (texto exato, hora local Recife; nenhum repete CLIENTE-104,
CLIENTE-110 [confirmado: a sessão de `CLIENTE-110` — "50 cópias", corte, mãe paga em dinheiro, recibo
pro Conjunto Musical Melodia Divina — é o MESMO caso da 161, excluída daqui], CLIENTE-105 ou
CLIENTE-106):

1. **CLIENTE-115** (03/07 09:23-09:25): 6 imagens em ~2s, depois 141s
   depois: *"Bom dia!!!\nPor favor, imprimir em colorido , recortar, e plastificar essa
   carteiras.\n\nObs: a frente é essa verde e atrás é essa branca.\nNo tamanho legível ,pode se
   basear na carteira de identidade"* — legenda completa chega só depois da rajada de imagem.
2. **CLIENTE-007** (06/07 13:42): imagem, +17s *"Boa tarde olha essa foto aqui para
   mim pegar ela de 3 horas tá certo por favor é o tamanho dela de uma foto normal pequena normal
   obrigada"*, +7s *"Manda o preço"*, +6s *"Vai ser no Pix"` — 3 mensagens em 30s completando o
   mesmo pedido.
3. **CLIENTE-116** (06/07 13:05-13:08): 8 imagens em <2s, +68s *"Boa tarde copie mais 5
   folhas mande o valor vou passar o pix"*, +109s *"Essas 8 desculpe não são 5"*, +36s *"Mande o
   total com as 3 primeiras"* — cliente se autocorrige dentro da própria rajada, antes mesmo da
   equipe responder.
4. **CLIENTE-117** (10/07 08:29-08:31): imagem, +25s *"Bom dia"*, +71s *"CLIENTE-117
   \nNasc. [data de nascimento removida]\n[e-mail removido]"*, +15s *"Essa fatura é para
   imprimir"* — dados pessoais e instrução chegam em mensagens separadas.
5. **CLIENTE-055** (06/07 10:04-12:36): 2 documentos duplicados 3 vezes ao longo
   de ~2,5h (reenvio, não rajada única), *"Bom dia"*, *"Chego já"*, *"Senha do hiper 192814"` —
   mostra que "rajada" às vezes é o cliente reenviando o mesmo arquivo por insegurança, não só
   fragmentando texto novo.
6. **CLIENTE-118** (07/07 11:40-11:58): 2 imagens, +10s *"Bom dia é para quanto para
   puxar esses dois exames"*, +71s *"Eu queria para hoje esse exame é dois exames que eu queria
   que imprimir"*, +16s *"Pra hoje!"*, +309s *"É para quanto fica para quanto os dois exames"*,
   sticker, +620s *"Boa tarde mande o valor desses dois exames e se tem alguma coisa que tem que
   abrir mais esse papel"* — a mesma pergunta (preço) repetida 3x em formas diferentes dentro da
   mesma rajada, por ansiedade/falta de resposta.
7. **CLIENTE-119** (03/07 09:31): 5 imagens em 14s, +8s *"Bom dia"*, +39s *"É
   para revelar essas fotos tamanho normal"*, +73s *"Ok"* — sem resposta da equipe registrada na
   sessão.
8. **CLIENTE-120** (03/07 11:39-11:42): 3 documentos em
   1s, +5s *"Boa tarde"*, +25s *"Gostaria de imprimir essas 3 páginas. Pode ser preto e branco
   mesmo."*, +10s *"Daqui a pouco vou buscar"*, +98s *"Ok"*, +8s *"Manda o pix"* — sem resposta da
   equipe registrada na sessão.
9. **CLIENTE-121** (06/07 20:11-20:13): documento, +12s *"Em ofício"*, 3 imagens em
   <1s, +7s *"E essas 3 em polaroid"* — combina documento e fotos com instrução de formato
   fragmentada entre os dois.
10. **CLIENTE-122** (06/07 10:02-12:08): 2 documentos, +43s *"Um dia
    abençoado."*, +57s *"Por favor imprimir Pag. 1e 2"*, mais 1 documento, +7000s *"Faltou a foto
    Hiper"* — equipe responde 425s depois: *"mil desculpa , mas pode vim buscar"*.
11. **CLIENTE-123** (06/07 09:00-09:55): rajada longa e complexa (documento,
    senha numérica solta, "à de pagar e a detalhada", mais documentos, mais senhas) — equipe só
    responde 3.096s (51,6min) depois: *"teve duas que nao conseguir"*, mostra que rajadas
    complexas/confusas correlacionam com silêncio maior antes da resposta.
12. **CLIENTE-124** (10/07 10:18-10:54): 2 documentos, +7s *"Bom dia!"*, +51s
    *"O extrato da Tim só a folha q tem o endereço ok?"*, +38s *"Quanto custa as impressões?"*,
    dados pessoais, 👍 — equipe só responde 4.289s (71,5min) depois com *"Obrigado"*, **sem
    responder a pergunta de preço feita na rajada** — evidência de que nem toda resposta da
    equipe resolve de fato o que foi perguntado.

### 9.2 Quando a equipe responde: espera a rajada terminar ou interrompe?

- Por construção, a primeira resposta da equipe **nunca aparece no meio da rajada inicial** (se
  aparecesse, a rajada já teria terminado ali, por definição). A pergunta real é se a equipe
  responde cedo demais (cliente ainda não tinha terminado de explicar) ou tarde demais.
- **153/301 (50,8%)** sessões de mídia-sem-texto recebem alguma resposta da equipe dentro da
  mesma sessão (antes de uma lacuna de 4h); **148 (49,2%) não recebem nenhuma resposta
  registrada** nesse intervalo — consistente com o padrão já visto no item 8.3 (56% das sessões em
  geral nunca convertem), mas aqui é uma amostra diferente (só mídia-sem-texto).
- **Tempo de silêncio do cliente antes da equipe responder** (153 casos): mediana **229 segundos
  (3,8 minutos)**. Distribuição: 0-60s (20, 13%), 60-120s (24, 16%), 120-300s (42, 27% — maior
  faixa), 300-600s (28, 18%), 600-1.800s (23, 15%), 1.800-3.600s (9, 6%), >3.600s (7, 4,6%). p75 =
  617s (10,3min), p90 = 1.904s (31,7min).
  **Isso é bem mais lento que a mediana geral de resposta medida na 161 (42 segundos, para
  qualquer tipo de mensagem)** — sugere que, especificamente quando a sessão começa por mídia sem
  legenda, a equipe de fato segura a resposta mais tempo, provavelmente esperando o cliente
  "terminar de explicar" e/ou pelo custo real de abrir e interpretar o arquivo antes de responder.
  **Não dá pra afirmar com certeza que é uma espera deliberada e não só fila/carga de trabalho**
  (não há como isolar as duas causas só com os logs), mas o número (~3-4 min de mediana) é uma
  referência razoável de "tempo de silêncio típico antes que a equipe considere que o cliente
  encerrou a explicação".
- **Cliente continua falando logo depois da 1ª resposta da equipe** (possível sinal de
  interrupção): 29/153 (19%) sessões têm nova mensagem do cliente antes de qualquer nova mensagem
  da equipe; dessas, 15/153 (9,8% do total) vêm em menos de 3 minutos. **Lendo o conteúdo real
  dessas 15**, quase todas não são "interrupção de um pensamento inacabado" — são (a) o cliente
  só confirmando/agradecendo (*"Joia"*, *"ok"*, *"Tou indo agora buscar"*), ou (b) a primeira
  resposta da equipe foi só uma saudação genérica (*"Boa tarde"*, *"boa tarde"*) e o cliente
  emenda a explicação de verdade na sequência (ex. **CLIENTE-136**, 06/07
  12:42:29 equipe *"Boa tarde"* → 11s depois cliente detalha pedido de 6 cadernos de louvor com
  lista de músicas — a saudação não foi uma tentativa de resolver, só um "oi, já vi"). **Só 1 caso
  na amostra é evidência real de a equipe ter agido cedo demais**: **CLIENTE-135**
  (`CLIENTE-135`, 09/07 08:03-08:11) manda 3 documentos + "Bom dia irmão", a equipe já cria o
  pedido (template automático "Pedido confirmado! IMPRESSÃO P&B A4 Qtd: 4") no mesmo segundo, e o
  cliente precisa corrigir na sequência: *"Pode imprimir estes três arquivos q mandei"* — indício
  de que o pedido foi criado com uma leitura incompleta dos 3 arquivos antes do cliente confirmar
  o que queria.
- **Conclusão do item**: não há evidência de que a equipe interrompa rajadas no meio (não
  acontece por construção); a equipe tende a **esperar mais tempo que o padrão geral** antes de
  responder quando a sessão começa por mídia sem legenda (mediana ~3,8min vs 42s geral), e quase
  não há sinal de resposta prematura seguida de correção — a única exceção clara (CLIENTE-135)
  envolve o fluxo automático de "criar pedido", não uma resposta manual de texto.

### 9.3 Frases reais da equipe pra confirmar mídia recebida e perguntar o que o cliente quer

Das 153 primeiras respostas da equipe nessas sessões: 33 (21,6%) são o template automático
"Pedido confirmado! 🖨️ ..." (gerado ao criar pedido no Inbox, não é texto livre digitado), 27
(17,6%) são só uma saudação isolada ("bom dia"/"boa tarde", nada mais), 53 (34,6%) são só um
agradecimento isolado ("obg"/"Obrigado", nada mais), 3 (2%) são só uma confirmação curta
("ok"/"pronto"/"joia"), e **37 (24,2%) têm conteúdo substantivo** (pergunta, preço, ou
confirmação com contexto). Frases reais desse último grupo que confirmam recebimento e/ou
perguntam o que o cliente quer (texto exato, não parafraseado):

- *"Bom dia, seu arquivo tem 3 folhas, é para imprimir as 3 ou só boleto?"* (`CLIENTE-125`)
- *"que tipo de papel"* (`CLIENTE-126`)
- *"Boa tarde, a impressão colorida ou preto e branco?"* (`CLIENTE-127`)
- *"Bom dia, CLIENTE-128! impressão de foto no tamanho 10x15 2,50 - 15x20 4,50 - polaroid 2,00 qual
  vai querer? 😉"* (`CLIENTE-128`)
- *"Bom dia! Pra te passar o valor certinho, preciso dar uma olhada no arquivo.  Assim já confirmo
  e te falo o total."* (`CLIENTE-088`)
- *"boa tarde ira imprimir novamente?"* (`CLIENTE-129`)
- *"Oi, CLIENTE-130! Recebemos seu arquivo aqui, valor da impressão 1,20 😉"* (`CLIENTE-130`)
- *"Bom dia, CLIENTE-002! Recebemos o documento. Vamos verificar sua solicitação. 😉"*
  (`CLIENTE-002`)
- *"Opa, CLIENTE-131! Recebi todos os arquivos aqui. A impressão P&B A4, 3 unidades, fica R$ 3,60.
  Confirma pra gente?"* (`CLIENTE-131`)
- *"Oi, CLIENTE-118! Boa tarde!\n\nVamos verificar e informaremos os valores"* (`CLIENTE-118`,
  CLIENTE-118)

**Padrão de tom**: quase sempre nome próprio + saudação + confirmação objetiva ("recebemos
[o quê]" / "seu arquivo tem [n] folhas") antes da pergunta ou do valor — vocabulário simples,
direto, sem formalidade excessiva. "Vamos verificar"/"só um momento" aparece como resposta de
segurar tempo quando a equipe ainda não sabe o valor.

### 9.4 A equipe já direciona a partir do arquivo, sem perguntar em aberto?

Resposta: **sim, acontece, e é mais comum do que perguntar em aberto — mas majoritariamente pelo
caminho do pedido automático, não por texto livre**. Quantificando os casos onde a rajada inicial
do cliente é **só mídia, zero texto** (o cenário mais exigente pra automação, porque não há
nenhuma pista textual):

- **Template automático "Pedido confirmado!"**: 33 sessões tiveram esse template como 1ª resposta;
  **21/33 (63,6%) vieram de rajadas 100% mídia, sem nenhum texto do cliente** — ou seja, na
  maioria desses casos a equipe (usando o fluxo "Criar pedido" do Inbox) olhou o arquivo, decidiu
  produto+quantidade+preço, e já registrou o pedido **sem perguntar nada no chat**. Exemplos
  reais: `CLIENTE-132` (4 imagens → Pedido confirmado, IMPRESSÃO P&B A4, Qtd 4,
  R$4,80), `CLIENTE-085` (1 imagem → Pedido confirmado, ENCADERNAÇÃO
  ATÉ 30 FOLHAS, R$4,50), `CLIENTE-133` (3 documentos → Pedido confirmado,
  IMPRESSÃO COLORIDA OFÍCIO A4, Qtd 2).
- **Resposta manual em texto livre**, olhando só as 11 sessões onde a rajada inicial também era
  100% mídia sem texto e a resposta foi texto digitado (não o template): **5/11 (45,5%) já
  direcionam sem perguntar** — ex. *"Opa, CLIENTE-031! Recebemos os arquivos. Sua impressão P&B A4, 1
  unidade, no valor de R$ 1,20, já está impressa."* (`CLIENTE-031`, nem pergunta, já entregou
  pronto); *"Oi, CLIENTE-130! Recebemos seu arquivo aqui, valor da impressão 1,20 😉"* (`CLIENTE-130`);
  *"Opa, CLIENTE-131! Recebi todos os arquivos aqui. A impressão P&B A4, 3 unidades, fica R$ 3,60.
  Confirma pra gente?"* (`CLIENTE-131` — direciona mas fecha com confirmação objetiva sim/não, não
  pergunta aberta); *"Opa, bom dia! Confirmado o recebimento dos 50% , a caneca está em produção.
  Avisaremos assim que chegar. 😉"* (`CLIENTE-134` — aqui a equipe claramente usa contexto de uma
  conversa anterior fora dessa janela de 4h, não só o conteúdo da imagem em si). Só **1/11 (9%)**
  fez pergunta aberta de verdade (*"que tipo de papel"*). Os outros **5/11 (45,5%)** só
  agradeceram/cumprimentaram sem confirmar nada em texto (ex. *"Obrigado."*, *"Obrigo CLIENTE-091!"*)
  — **limite importante**: não dá pra saber por esses casos se a equipe decidiu o produto sem
  perguntar (fora do chat, verbalmente ou só executando) ou se a conversa continuou por outro
  canal; o log não mostra a decisão.
- **Juntando os dois caminhos** (template automático + texto manual direcionando): pelo menos
  **26 dos 44 casos analisados de "mídia pura, sem nenhum texto do cliente"** (21 + 5, ~59% dessa
  base específica) terminam com a equipe decidindo e comunicando produto/preço sem nenhuma
  pergunta aberta no chat, contra **1 caso** de pergunta genuinamente aberta. **Isso sustenta a
  segunda pergunta do Edvam**: pra pelo menos uma fatia real e não pequena dos casos (documentos
  óbvios tipo fatura/boleto/comprovante — o padrão mais comum da amostra), a equipe já consegue
  decidir "isso vai ser impressão P&B, R$X" só olhando o arquivo, sem precisar perguntar "o que
  você deseja fazer?" — mas o caso do CLIENTE-031/CLIENTE-131/CLIENTE-130 é sempre documento **de página única e
  claramente identificável** (boleto/fatura = impressão simples P&B); não há exemplo na amostra de
  direcionamento sem pergunta pra arquivos ambíguos (fotos de objeto, artes gráficas, documentos
  de múltiplas páginas com finalidade não óbvia) — nesses, o padrão observado nas seções 9.1/9.3
  é sempre pergunta (tipo de papel, cor, tamanho, "pra quê").

## Resumo executivo (pros próximos passos, não é proposta — só o mapa pedido)

1. Quase metade do volume de entrada é mídia sem texto — automação de texto puro não cobre isso.
2. A confusão com a Dizu é real, atual, ~8,6% do tráfego, concentrada no horário de almoço local
   (11h-13h), nunca mistura com pedido de gráfica — fácil de isolar com um padrão simples
   (prato+acompanhamento+preço fixo de marmita, não só palavra "quentinha"). Registrado à parte
   (fora do escopo de automação): é empresa do mesmo grupo (LabOnchain) que vai ganhar
   sistema/número próprios — o objetivo de longo prazo é migração desse tráfego, não filtro
   permanente.
3. O padrão "Pix antecipado, retira depois" (com espera de verdade) **não se confirma** nos dados
   disponíveis — o que existe hoje é "paga na hora, retira quase junto". **Mas o dado até agora é
   pré-156 (deployada hoje) — reavaliar em 2-3 semanas antes de descartar o padrão.**
4. Pico real de sobrecarga é 13h local, com 11h-13h parcialmente inflado pela confusão da Dizu.
5. ~44-49% dos contatos novos viram pedido — não é maioria de "pergunta que não vira venda". Esse
   número é uma leve subestimativa: existe conversão cruzada Inbox→balcão real (confirmada com
   casos concretos, 2,6%) e pelo menos 1 caso concreto de venda combinada no chat que nunca virou
   registro no sistema (item 8.3) — a taxa real de "atendimento que vira venda" é um pouco maior
   que o medido.
6. Pedido raramente vem pronto em texto — depende de mídia ou pergunta de volta humana, o que
   pesa contra automação 100% por regra.
7. Tempo de resposta mediano é ótimo (0,7 min), mas com cauda longa real nos horários de almoço
   (12h) e fechamento (17h) da equipe — a "sobrecarga" percebida pelo Edvam é real, mas se
   concentra em janelas específicas, não no dia todo.
8. Gabi e Edvam dividem o atendimento quase igualmente (50%/45% no campo atendente, 60%/32% em
   pedidos criados) — Edvam não é papel secundário como a descrição original sugeria. Zu é
   claramente auxiliar (5-8%).
9. Impressão P&B A4 sozinha é 66% de todos os pedidos reais de WhatsApp — automação deveria
   priorizar esse fluxo primeiro, pelo maior impacto com o menor risco.
10. Maior risco de sobrecarga simultânea Inbox+balcão: 13h-14h local (Inbox no pico absoluto,
    balcão saindo da pausa de almoço).
11. Rajada de mensagens do cliente é real e frequente (60% das sessões de mídia-sem-texto têm 2+
    mensagens seguidas) e tende a se fechar em até ~1-2 minutos entre mensagens (mediana 22s) — um
    agente deveria esperar uma pausa de silêncio nessa ordem de grandeza antes de considerar que o
    cliente terminou. A equipe já espera mais que o padrão geral antes de responder a mídia sem
    legenda (mediana 3,8min vs 42s geral) e quase não interrompe. E a equipe **já direciona sem
    perguntar em aberto** numa fatia real dos casos (~59% de "mídia pura, zero texto") — mas só
    quando o arquivo é auto-explicativo (boleto/fatura de 1 página = impressão P&B simples); pra
    arquivos ambíguos, sempre pergunta.
12. **(Demanda 204) O padrão normal do serviço dominante (Impressão P&B A4) é rápido e mensurável**:
    mediana de 2 mensagens do cliente + 1 da equipe, 6,5 min até o pedido, 73% começando por mídia
    sem texto — um "SLA" natural pra automação medir contra. Serviços que exigem coleta de dado
    (currículo, digitação, foto composta) são estruturalmente mais lentos — isso é característica
    do serviço, não desvio/debate.
13. **(Demanda 204) O que realmente gera "debate" dentro do serviço dominante tem 8 causas
    concretas e recorrentes**, não é hesitação genérica: confusão Dizu infiltrada na própria
    resposta da equipe, negociação de pagamento fora do padrão, falta de vocabulário técnico do
    cliente, arquivo protegido por senha, coleta de dado pessoal (2ª via), cliente sem saber a
    própria especificação, pedido de edição de conteúdo antes de imprimir, e combinação de
    múltiplas etapas de acabamento — as 3 primeiras são as que mais pesam a favor de escalar pro
    humano cedo num agente futuro.
14. **(Demanda 204) Reforça 2x, com casos novos e independentes, que a taxa de conversão real é
    subestimada pela taxa medida só via `jsgrafica_pedidos`**: achei mais 2 casos de venda real
    que acontece de fato (com entrega/retirada confirmada na conversa) mas nunca vira registro
    formal no sistema — mesmo padrão do caso CLIENTE-110 (161), agora com 3 exemplos concretos no
    total.
15. **(Demanda 204) Contaminação do log distorce outlier bruto de forma concreta e mensurável**: a
    maior sessão do dataset inteiro (182 mensagens) era 100% bot da Neoenergia/Celpe, não
    atendimento — confirma na prática que nenhuma automação de detecção de "sessão longa =
    escalar" pode rodar sem filtrar contaminação primeiro.
16. **(Demanda 204) Hoje não existe dado de "IA tentou e escalou pro humano"** porque 100% do
    atendimento já é humano — o proxy usado (outlier dentro do padrão por tipo de serviço, com
    conteúdo lido, não só contado) é a melhor aproximação possível com o dado disponível, mas não
    substitui dado real de escalonamento, que só vai existir depois que alguma automação estiver
    no ar.

## 10. Padrão de atendimento por tipo de pedido + desvio como sinal de escalonamento (demanda 204)

**Esta seção substitui integralmente a investigação preliminar do PM de 2026-07-17** (busca rasa
por palavra-chave, achado válido mas raso — o Edvam apontou o problema certo: "vc tá tirando
análises que o chat de dados poderia responder diferente"). Metodologia mensurável: pra cada
sessão que virou pedido, medir quantas mensagens/quanto tempo até o pedido nascer, por tipo de
serviço; identificar as sessões-outlier dentro do próprio tipo (muito mais mensagens/tempo que a
mediana) e ler o conteúdo real de cada uma — essas são o proxy de "isso teria gerado debate/
escalado pro humano se fosse IA atendendo". Mesma lente aplicada às sessões que NÃO viraram
pedido.

### 10.1 Metodologia (idêntica às demandas 159-163, sem reinvenção)

Mesma base de "início de sessão" (gap de 4h) de sempre. Janela: 2026-07-01 a 2026-07-17 (mais
ampla que investigações anteriores, pra ter volume suficiente por tipo de serviço) — **1.083
sessões, 682 contatos distintos**, depois de excluir os 2 contatos de teste já conhecidos
(`5521965185667`/`52063694233823@lid`). Pedido vinculado à sessão: mesmo critério da 160
(telefone/`contact_lid` bate, `created_at` do pedido dentro da janela da sessão ou até 48h
depois). **430 sessões (39,7%) viram pedido, 653 (60,3%) não** — nessa unidade de medida
(sessão, não contato-novo), consistente com a leitura já estabelecida no item 5/8.3 de que a
conversão não é minoria.

**Achado metodológico importante, achado no processo**: a maior sessão bruta do dataset (182
mensagens, telefone `558132176990`) **não é atendimento real — é 100% o bot automático da
Neoenergia/Celpe** (segunda via de conta, corte de energia) contaminando o mesmo número de
telefone que também é usado por um cliente real da gráfica. Excluí esse telefone de toda a
análise desta seção. **Isso confirma na prática o cuidado que a própria demanda pedia**: contar
mensagem sem ler o conteúdo real teria inflado um "outlier" que não tem nada a ver com
atendimento da gráfica — mesmo achado de contaminação já documentado em
`project_log_dados_contaminados`, agora com um exemplo concreto de como ele distorce métrica de
volume/debate especificamente.

### 10.2 Padrão normal por tipo de serviço (sessões que viraram pedido)

Mensagens contadas **do início da sessão até o pedido nascer** (não a sessão inteira — uma sessão
pode continuar depois do pedido por outro assunto, o que infla a contagem sem relação com o
tempo-até-o-pedido; corrigido nesta análise).

| Serviço | Qtd sessões | Mediana msgs cliente | Mediana msgs equipe | Mediana min. até pedido | p90 min. até pedido |
|---|---|---|---|---|---|
| IMPRESSÃO P&B A4 | 272 | 2 | 1 | 6,5 min | 73 min |
| IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | 40 | 3 | 2 | 9,5 min | 56 min |
| IMPRESSÃO 2ª VIA CONTA | 18 | 2 | 2 | 14,2 min | 143 min |
| XEROX PRETO E BRANCO A4 | 17 | 3 | 1 | 6,9 min | 89 min |
| AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | 10 | 7 | 7 | 90,2 min | 258 min |
| IMPRESSÃO COLORIDA OFÍCIO A4 (laser) | 7 | 11 | 4 | 23,8 min | 118 min |
| FOTO 10X15 | 7 | 5 | 2 | 13,1 min | 75 min |
| FOTO POLAROID 7X10 | 5 | 6 | 1 | 92,2 min | 443 min |
| DIGITAÇÃO DE PROVAS | 4 | 14 | 10,5 | 112,8 min | 266 min |

**Achado central**: o serviço dominante (Impressão P&B A4, 272 sessões — mesma concentração
~66-74% já medida na 161) tem padrão **rápido e simples**: mediana de 2 mensagens do cliente + 1
da equipe, 6,5 minutos até o pedido — **73,2% dessas sessões (199/272) começam com mídia sem
texto**, confirmando que o caminho "mídia→confirma→pedido" (seção 9.4) é o majoritário pra esse
serviço específico, não só uma observação qualitativa.

**Achado igualmente importante — nem toda categoria "lenta" é debate**: serviços como
Agendamento/Currículo/Digitação, Digitação de Provas e Foto Polaroid têm mediana de
mensagens/tempo muito maior que Impressão P&B — mas isso é **estrutural, não um desvio**: são
serviços que inerentemente exigem coletar mais dados (nome completo, data de nascimento, e-mail,
CPF pra currículo; enunciados de prova pra digitação; instruções de composição pra foto) antes de
fechar. Uma automação que tentasse aplicar o mesmo "padrão rápido" da Impressão P&B a esses tipos
erraria — esses serviços deveriam ser tratados como categoria de alto-toque por padrão, não como
desvio de um serviço simples.

### 10.3 Sessões-outlier (com pedido) — o que realmente gera debate, com exemplo real de cada causa

Definição de outlier: sessões de Impressão P&B A4 (o grupo com volume suficiente pra ter uma
mediana confiável) com mensagens totais ≥ p90 do grupo (14) ou tempo até o pedido ≥ p90 (73 min).
Li o conteúdo real de 8 sessões-outlier (não só contei) — cada uma tem uma causa concreta e
diferente, nenhuma é "só demorou":

1. **Confusão com a Dizu Refeições no início da própria conversa que depois vira pedido real de
   gráfica** (`CLIENTE-137`): a equipe respondeu com o cardápio de quentinha por engano ("Bom
   dia, cardápio dia 08/07/26... Faça seu pedido aqui"), a cliente corrige ("Seria pra imprimir"),
   segue normalmente depois — mostra que a confusão da Dizu (seção 2) às vezes acontece do lado
   da EQUIPE, não só do cliente.
2. **Negociação de forma de pagamento não padrão** (mesma sessão, `CLIENTE-137`): cliente propõe
   pagar em dinheiro na hora + a equipe repassar o Pix depois ("você teria 9 reais em espécie pra
   eu lhe mandar em Pix?") — variação do fluxo normal Pix/dinheiro que exige negociação extra.
3. **Dúvida de especificação de formatação/tamanho** (`CLIENTE-128`): pede impressão de uma
   mensagem religiosa longa, depois muda de ideia várias vezes ("eu queria mais espalhado",
   "papel simples oficio", "as letras grande", "este 4por4 é o tamanho do oficio?") — cliente não
   tem vocabulário técnico de gráfica pra especificar de uma vez.
4. **Múltiplos documentos com problema técnico de arquivo protegido por senha**
   (`CLIENTE-123`, mesmo caso já citado na seção 9.1): vários boletos/faturas
   com senha de acesso, a equipe não consegue abrir 2 deles ("teve duas que não consegui") —
   atraso de 4,5h vem de dificuldade técnica real, não indecisão do cliente.
5. **Coleta de dados pessoais pra localizar documento (2ª via de conta)** (`CLIENTE-138`,
   CLIENTE-138): manda nome completo, data de nascimento e e-mail sem que a equipe peça formalmente —
   inerente ao tipo de serviço (2ª via exige identificação), não desvio.
6. **Cliente indeciso sobre a própria especificação técnica** (`CLIENTE-139`): quer imprimir
   foto mas não sabe o tamanho do quadro/porta-retrato ("Eu não sei kkkk. Só tenho o quadro. Mas
   n sei o tamanho") — trava por falta de informação do próprio cliente, não por dúvida da
   equipe.
7. **Pedido de alteração/edição do arquivo antes de imprimir** (`CLIENTE-140`): pergunta se dá
   pra editar o PDF pra remover páginas em branco antes de imprimir — intenção diferente de
   "imprimir como está", categoria própria (edição de conteúdo, não só impressão).
8. **Múltiplas etapas de acabamento combinadas** (`CLIENTE-061`): imprimir + plastificar + saber
   se dá pra dobrar, cliente leva papel específico próprio — mais etapas de decisão que uma
   impressão simples de 1 passo.

**Nenhuma dessas 8 causas é "cliente hesitante genérico"** — são categorias concretas e
recorrentes: confusão externa infiltrada, negociação de pagamento fora do padrão, vocabulário
técnico que o cliente não tem, problema técnico de arquivo, coleta de dado pessoal inerente ao
serviço, falta de informação própria do cliente, pedido de edição de conteúdo, e combinação de
etapas de acabamento. Pro desenho do agente: as 3 primeiras (confusão externa, pagamento não
padrão, vocabulário técnico) são as que mais se beneficiariam de escalonar pro humano cedo; as
outras (coleta de dado, edição, acabamento múltiplo) são perguntas previsíveis que um agente bem
desenhado poderia cobrir com um fluxo de pergunta estruturada.

### 10.4 Sessões sem pedido — outlier como proxy de intenção real (não só "não converteu")

644 sessões sem pedido (excluído o telefone contaminado). Mediana 6 mensagens totais, p90 = 20.
Outlier = ≥20 mensagens. Li 5 das sessões-outlier mais extremas (excluindo o próprio telefone do
Edvam, que aparece aqui de novo como o maior outlier bruto — 93 mensagens, é ele mesmo usando o
WhatsApp, não atendimento):

1. **Contaminação externa pura — nem é conversa com a gráfica** (`558181990533`, 58 mensagens):
   mensagem inteira é um golpe/mensagem de terceiro se passando por farmáceutica da Drogasil
   pedindo CPF e confirmando troca de remédio — zero relação com a gráfica. Reforça, com um caso
   extremo, o achado antigo de contaminação do log (`project_log_dados_contaminados`).
2. **Venda real que acontece de verdade mas nunca vira registro no sistema**
   (`CLIENTE-141`, 57 mensagens): cliente recorrente cobra 8 convites faltando de uma encomenda
   anterior, negocia Pix, reclama de diferença de preço vs. pedido anterior, organiza entrega por
   Uber Moto com endereço — **conversa termina com a entrega de fato acontecendo** ("Ele chegou"),
   mas não existe nenhum `jsgrafica_pedido` vinculado a esse telefone. **Confirma e reforça o
   achado da 161 (caso CLIENTE-110)**: a taxa de conversão medida só por `jsgrafica_pedidos` segue
   subestimando venda real — aqui com um segundo exemplo concreto e independente.
3. **Pedido real que aparenta ter sido atendido informalmente, mesmo padrão do item 2**
   (`CLIENTE-142` — cliente recorrente já conhecida, 47 mensagens): pede composição de
   foto (rosto do filho colado em jogador de futebol), pergunta o valor, organiza retirada por
   terceiro ("meu filho... o gordinho, ele que vai buscar") — termina em "Ok, obrigado", sinal de
   resolução, sem pedido formal.
4. **Pergunta de preço repetida sem resposta visível no log — risco real de atrito**
   (`CLIENTE-143`, 47 mensagens): quer AJUSTAR um documento (nome, estado civil, RG→CPF, data de
   nascimento, trocar foto — parece atualização de currículo/documento), pergunta o valor **3
   vezes** ("Quanto ficaria?", "Vc mim passando o valor ja pago logo", "Fica quanto?") sem
   nenhuma resposta da equipe aparecer na janela da sessão — candidato real a "cliente queria mas
   não fechou por falta de resposta", diferente dos casos 2/3 que fecharam informalmente.

**Leitura**: dentro do grupo de maior engajamento (mais mensagens) que não vira pedido formal, o
padrão **não é majoritariamente "pergunta simples que não virou venda"** — é uma mistura real de
(a) contaminação externa/spam que nem é conversa com a gráfica, (b) vendas reais que acontecem e
resolvem mas nunca são lançadas no sistema (reforça 2x o achado da 161), e (c) intenção real não
resolvida por falta de resposta visível da equipe — essa última é a que mais importa pro desenho
do agente, porque é risco de perda de venda por atraso, não por desinteresse do cliente. A
maioria das 644 sessões sem pedido, porém, tem poucas mensagens (mediana 6) — não dá pra
generalizar que "60% do atendimento sem pedido é oportunidade perdida"; é só na cauda de maior
engajamento que esse sinal aparece.

### 10.5 Honesto sobre os limites

- **Contaminação do log continua real e distorce contagem bruta** se não filtrada: o maior
  outlier do dataset inteiro (182 msgs) era 100% ruído externo (bot Neoenergia), e a maior
  sessão sem pedido (93 msgs) é o próprio Edvam usando o WhatsApp. Qualquer sistema de detecção
  automática de outlier precisa deste tipo de filtro antes de escalar pro humano — senão vai
  escalar contaminação, não atendimento real.
- **Tamanho de amostra por categoria menos comum é pequeno** (Digitação de Provas: 4 sessões;
  Foto Polaroid: 5) — as medianas dessas categorias são direcionais, não estatisticamente
  robustas; suficiente pra saber "isso é estruturalmente mais lento", não suficiente pra fixar um
  número exato de "tempo normal" com confiança.
- **Ainda não existe escalonamento real pra aprender com ele** (mesmo limite já registrado na
  versão anterior desta seção): hoje 100% do atendimento é humano, então "outlier" aqui é proxy
  de complexidade/debate, não um caso real de "IA tentou e passou pro humano". A inferência de
  "o que precisa escalar" vem das categorias de causa encontradas (10.3/10.4), não de um padrão
  de escalonamento observado de verdade.
- **A pergunta original do PM ("cancelar" cancela o quê) não foi re-investigada nesta demanda**
  — não estava no escopo da 204 (que pediu padrão por tipo + outlier, não repetir a busca por
  palavra-chave). Os achados qualitativos da versão anterior desta seção sobre "cancelar" vs.
  "alterar/corrigir" (cancelar é sempre sobre desistir, nunca sobre mensagem/produto; nenhum dos
  3 casos tinha pedido formal ainda; alterar é categoria própria de ajustar o que já foi pedido)
  continuam válidos como achado qualitativo — só não foram remedidos com o método novo porque a
  demanda não pediu isso.

## 11. Projeção real do tempo da jornada automatizada, ponta a ponta (demanda 205)

O Edvam perguntou quanto tempo a jornada automatizada levaria — em vez de chutar, medi os 2
pedaços com proxy real no dado que já existe, mais 1 medição técnica direta. Mesma janela/base da
204 (2026-07-01 a 17, contato de teste e o telefone do bot Neoenergia excluídos). 100% só-leitura,
salvo a medição técnica do item 3 (só lê mídia pública + chama a API do Gemini, não grava nada).

### 11.1 Tempo de resposta do CLIENTE a uma mensagem da equipe que pede confirmação/decisão

Nunca tinha sido medido (159-162 só mediram tempo de resposta da EQUIPE). Critério: mensagens da
equipe contendo "confirma" ou terminando com "?" (excluindo o template automático "Pedido
confirmado!"), dentro de sessões que viraram pedido, medindo o tempo até a próxima mensagem do
cliente.

- **Geral (102 perguntas de confirmação medidas): mediana 1,2 min, p75 6,4 min, p90 17,6 min**
  (máximo observado 497 min, outlier isolado).
- Por serviço (volume suficiente): Impressão P&B A4 (34 casos) — mediana 1,1 min, p90 33,9 min;
  Colorida Ofício (15 casos) — mediana 0,7 min, p90 9,3 min; Agendamento/Currículo (9 casos) —
  mediana 0,7 min, p90 44,7 min (cauda mais longa, consistente com o achado da 204 de que esse
  tipo de serviço é estruturalmente mais lento).

### 11.2 Tempo parado em `confirmado` até a equipe avançar (proxy pra aprovação futura)

Medido em `data_producao_at - confirmado_cliente_at`, 527 pedidos reais de WhatsApp na mesma
janela.

- **Mediana: 0,1 min (~6 segundos). p75: 0,9 min. p90: 11,2 min.** 76,7% (404/527) avança em até
  1 minuto — **maioria é a MESMA pessoa criando o pedido e avançando o status na mesma ação
  contínua**, não uma etapa de revisão separada.
- **Limitação importante, achada no processo**: esse proxy provavelmente **subestima** o tempo
  real de `aguardando_aprovacao` da Fase 1 — hoje não existe uma etapa de "alguém precisa notar e
  decidir revisar" porque quem cria o pedido já está ali na hora. Na jornada automatizada, o
  agente cria o pedido sozinho (sem humano por perto no momento) e a equipe precisa **notar** a
  Fila de impressão depois — isso pode demorar mais que os ~6 segundos medidos aqui. Uso o
  p90 (11,2 min) como estimativa mais realista pro cenário de espera de verdade, não a mediana.

### 11.3 Latência técnica real do Gemini (`analisarMidiaGemini`, demanda 203)

Cronometrei 13 chamadas reais (mesma amostra da 203: 5 imagens, 5 PDFs de 1 página, 3 PDFs
multi-página), script em `scripts/spike-205-latencia-gemini.ts`.

- **13/13 chamadas concluídas. Mediana 3,0s. Média 3,0s. Mínimo 1,9s. Máximo 3,8s.**
- Latência muito estável (variação de só ~1,9s entre mínimo e máximo) — o componente técnico é,
  de longe, a parte mais previsível e mais rápida de toda a jornada.

### 11.4 Projeção final — faixa, não número fixo

| Cenário | Gemini (11.3) | Resposta do cliente (11.1) | Aprovação (11.2) | **Total projetado** | **Hoje (100% humano, 204)** |
|---|---|---|---|---|---|
| Mediana (Impressão P&B A4) | ~3s | 1,1 min | 0,1-11,2 min* | **~1,3 a ~12,4 min** | **6,5 min** |
| Cauda p90 (Impressão P&B A4) | ~4s | 33,9 min | 11,2 min | **~45,1 min** | **73 min** |

*Faixa de aprovação: 0,1 min é o proxy bruto medido hoje (mesma ação contínua), 11,2 min (p90) é a
estimativa mais realista pro cenário em que a equipe precisa notar o pedido depois, sem estar
olhando na hora — ver limitação em 11.2.

**Leitura honesta**: o componente de IA (Gemini) é irrelevante pro tempo total — 3 segundos não
competem com minutos. O que domina o tempo total, em qualquer cenário (hoje ou automatizado), é
**tempo humano**: quanto o cliente demora pra responder, e quanto a equipe demora pra agir. A
automação **não elimina esse tempo humano**, ela só **substitui o tempo de "equipe ler o arquivo,
decidir o que é e digitar uma proposta"** (hoje parte do que compõe os 6,5 min medianos/73 min
p90 da 204) **pelo tempo do Gemini (3s)** — o resto (cliente confirmando, equipe aprovando)
continua dependendo das mesmas pessoas, nas mesmas velocidades já medidas. Ainda assim, mesmo no
cenário mais conservador (aprovação = p90 realista de 11,2 min), a projeção de cauda (~45 min)
fica melhor que a cauda de hoje (73 min) — e a mediana otimista (~1,3 min, se a equipe estiver
disponível pra aprovar rápido) é bem mais rápida que os 6,5 min de hoje.

### 11.5 Limitação explícita do proxy (pedida no escopo, não escondida)

**O tempo de resposta do cliente medido em 11.1 é resposta a uma mensagem de um ATENDENTE
HUMANO, não de um bot/agente.** É uma suposição, não um fato, que o cliente responderia no mesmo
ritmo a uma mensagem do agente — pode ser mais rápido (mensagem de bot chega e é lida na hora,
sem o cliente "esperar a vez" percebida de um humano ocupado) ou mais lento (menos confiança/
urgência percebida numa mensagem que se sabe ser automática, ou estranhamento inicial com o
formato). **A Fase B (quando o agente rodar restrito, com número real de conversas via bot) deve
remedir este número de verdade assim que houver dado — não usar esta projeção como número final,
só como a melhor estimativa possível antes de existir o dado real.**

### 11.6 Honesto sobre limites adicionais
- O proxy de aprovação (11.2) é o mais frágil dos 3 — a ressalva de 11.2 é tão importante quanto
  o número em si.
- Amostra do Gemini é pequena (13 chamadas) mas suficiente pra latência técnica: é uma medição
  direta de infraestrutura (API), não uma amostra estatística de comportamento humano variável —
  13 chamadas com variação de só ~1,9s já mostram que o componente é estável.
- Amostra de "perguntas de confirmação" por serviço fora do P&B A4 é pequena (9-15 casos) — usar
  como direção, não número fixo, mesmo cuidado já registrado na 204.

## 12. Perfis de clientes candidatos pra expansão gradual do agente (demanda 209)

Objetivo: achar, com dado real (não escolha ao acaso), quem tem maior chance de já ser bem
atendido pelo desenho atual da Fase 1, pra minimizar risco no início da expansão gradual pro
cliente real. Mesma janela da 204/205 (2026-07-01 a 2026-07-17), mesmas exclusões (contato de
teste, telefone do bot Neoenergia).

### 12.1 Critério de "recorrente" — 3+ sessões com pedido no recorte

8 telefones atingem 3+ sessões que viraram pedido nessa janela (corte de 3 mantido, deu volume
suficiente pra comparar sem esticar o critério). Não precisou ajustar o corte.

### 12.2 Perfil de cada candidato — os 4 critérios aplicados

| Telefone | Nome | Sessões | Serviço típico | % começa por mídia | Outlier/debate? | Contaminação/Dizu |
|---|---|---|---|---|---|---|
| CLIENTE-054 | CLIENTE-054 | 4 | 100% Impressão P&B A4 | 50% | Nenhuma (todas rápidas: 1-4 msgs, 1,8-39min) | Limpo |
| CLIENTE-096 | CLIENTE-096 | 3 | Colorida/P&B A4 (100% rápido) | 0% | Nenhuma (4-7 msgs, 6,7-18,4min) | Limpo |
| CLIENTE-042 | CLIENTE-042 | 4 | P&B A4/Xerox (100% rápido) | 25% | Nenhuma (2-5 msgs, 3-40min) | Limpo |
| CLIENTE-032 | CLIENTE-032 | 3 | Misto | 33% | **1/3 outlier** (Papel Couchê A3, 17 msgs/201min) | Limpo |
| CLIENTE-083 | CLIENTE-083 | 3 | 100% Impressão P&B A4 | 67% | Nenhuma nas 3 de gráfica | **🔴 Confusão real e recorrente com a Dizu** — 2 pedidos de quentinha confirmados no mesmo número ("Eu quero 01 quentinha lombo ao molho madeira de 14,00 completo") |
| CLIENTE-061 | CLIENTE-061 | 3 | Misto | 67% | **1/3 outlier** — é o próprio exemplo de "múltiplas etapas de acabamento" da seção 10.3 (imprimir+plastificar+dobrar) | Limpo |
| CLIENTE-030 | CLIENTE-030 | 3 | Maioria "lenta por natureza" (digitação/currículo) | 33% | **1/3 outlier grave** (2ª via, 1.331 min ≈ 22h) | Limpo |
| CLIENTE-043 | CLIENTE-043 | 3 | Maioria papel foto especializado (negociação real) | 33% | **2/3 com 10+ mensagens** (fotos A4/A3, 139/35min) | Limpo |

Nenhum dos 8 já está em `jsgrafica_telefones_autorizados` (checado, zero sobreposição com a
whitelist atual — que hoje só tem números de teste/interno, ver 12.5).

### 12.3 Achado honesto: nenhum candidato cumpre 100% os 2 critérios de "fluxo padrão" ao mesmo tempo

O critério pedia "maioria das sessões em serviço rápido **E** maioria começando por mídia sem
legenda". Na prática, **nenhum dos 3 melhores candidatos passa de 50% em "começa por mídia"**
(CLIENTE-054 50%, CLIENTE-042 25%, CLIENTE-096 0%) — a maioria das sessões desses
clientes começa por TEXTO, não mídia. Isso é um achado relevante pro Edvam, não só um detalhe: **a
Fase 1 de hoje (escopo só sessão que começa por mídia sem legenda) não vai cobrir a maior parte
das interações reais nem dos clientes mais "seguros"** — mesmo os candidatos ideais vão continuar
precisando de atendimento humano na maioria das vezes, só uma fatia das sessões deles vai
realmente acionar o agente. Não é motivo pra não começar a expansão, mas é motivo pra calibrar a
expectativa: o volume de "casos resolvidos pelo agente" desses primeiros números vai ser menor do
que "total de sessões desse cliente".

### 12.4 Lista ordenada final (mais seguro → menos seguro)

1. **CLIENTE-054** — melhor candidato geral: 100% das sessões em
   Impressão P&B A4 (o serviço com o SLA mais bem medido), zero sessão-outlier, zero sinal de
   contaminação, 50% das sessões já começam por mídia (o maior entre os 3 primeiros).
2. **CLIENTE-042** — 100% em serviço rápido (P&B A4/Xerox), zero outlier, zero
   contaminação. Só 25% começa por mídia — vai acionar o agente com menos frequência que o #1.
3. **CLIENTE-096** — 100% em serviço rápido, zero outlier, zero contaminação,
   mas **nenhuma sessão observada começou por mídia** — candidato mais "seguro" no papel, mas o
   que menos deve interagir com o agente na prática hoje.
4. **CLIENTE-032** — maioria (2/3) limpa, mas 1/3 é um outlier real (produto de
   papel especial, não o catálogo rápido) — incluir com atenção, não é tão limpo quanto 1-3.
5. **CLIENTE-061** — já tem padrão CONHECIDO de debate (múltiplas etapas de
   acabamento, seção 10.3) — **recomendo esperar a demanda 208 (gatilhos) concluir** antes de
   incluir esse, já que o gatilho específico pra esse padrão ainda não está pronto.
6. **CLIENTE-030** e **CLIENTE-043** — **não
   recomendados pra essa primeira leva**: maioria das sessões de ambos está fora do escopo
   "rápido" da Fase 1 (digitação/currículo o primeiro; papel foto especializado com negociação
   real o segundo), incluindo 1 outlier grave de 22h no caso do CLIENTE-030.
7. **CLIENTE-083 — EXCLUÍDO, não recomendado de jeito nenhum agora**: apesar do
   padrão de pedido de gráfica ser limpo (3/3 sessões em P&B A4, sem outlier), esse número tem
   **confusão real e recorrente com a Dizu Refeições** — 2 pedidos de quentinha confirmados no
   mesmo telefone. Colocar esse número na whitelist do agente é risco real de o agente confundir
   pedido de comida com pedido de gráfica no mesmo fio de conversa.

**Sugestão de tamanho inicial** (o Edvam decide, mas o dado sugere algo concreto): começar com os
**2-3 primeiros da lista** (CLIENTE-054, CLIENTE-042, e opcionalmente CLIENTE-096) —
são os únicos com 100% de padrão limpo E zero contaminação. Adicionar CLIENTE-032 só depois de
validar os 3 primeiros. Deixar CLIENTE-061 pra depois da 208. Não incluir CLIENTE-030, CLIENTE-043
e CLIENTE-083 nesta rodada.

### 12.5 Checagem técnica (item 4 do escopo, já embutida na tabela 12.2)

- Nenhum dos 8 está em `jsgrafica_telefones_autorizados` — a whitelist atual só tem números de
  teste/interno (número pessoal do Edvam, contato "Cliente Teste", 1 número da própria Dizu usado
  como teste, 1 bot de outro projeto, 1 sem histórico) — zero conflito.
- Contaminação/Dizu checada individualmente por candidato (não só um sinal agregado) — só o
  CLIENTE-083 deu positivo, com conteúdo real confirmado antes de excluir (não foi só o sinal de
  palavra-chave, li a mensagem real).

### 12.6 Honesto sobre limites
- Amostra é pequena por natureza (só 8 clientes cruzam o corte de "3+ sessões" em ~2,5 semanas de
  dado real) — suficiente pra uma primeira leva de expansão gradual, não pra afirmar que são "os
  únicos bons clientes" da base; outros clientes com 1-2 sessões podem ser igualmente bons, só não
  têm histórico suficiente pra avaliar com confiança ainda.
- O critério de "sem debate" usa a mesma definição de outlier da 204 (contagem de
  mensagens/tempo) — não é garantia absoluta de que a sessão "limpa" de um candidato no passado
  vai continuar limpa no futuro, é a melhor estimativa com o dado disponível.
- Depende parcialmente da 208 (gatilhos pendentes) pra decidir sobre o candidato #5 (CLIENTE-061)
  — se a 208 concluir e cobrir o gatilho de "múltiplas etapas de acabamento", esse
  candidato pode subir de posição.
