# Lote 02 — Pesquisa linguagem real do cliente (28 telefones)

Metodologia: `to_timestamp(data_timestamp/1000.0)`, `is_group != true`, `apagada_em IS NULL`,
telefone ligado por últimos 11 dígitos. Pedidos agrupados em clusters por proximidade temporal
(mesmo dia/minutos = mesma conversa); janela de busca -6h/+48h em torno de cada cluster de pedidos.
Colunas reais da tabela: `message_text`, `transcription_text` (áudio), `caption` (legenda de mídia),
`media_type`. Não existe coluna `remetente`/`telefone` — usei `phone` e `from_me`.

---

## 1. 558184768356 — Néliton Personal — IMPRESSÃO PAPEL CARTÃO A4 180G (só frente)
1. SEM TEXTO substantivo — cliente só reagiu com "👍" e enviou 3 documentos cujas legendas são
   strings aleatórias de upload seguidas do CPF (ex.: `HIC1ZxORVSgs1X8fxHiK_704.691.274-22`), não
   frases próprias descrevendo o pedido.
2. Produto: IMPRESSÃO PAPEL CARTÃO A4 180G (só frente)
3. Primeira resposta da equipe: "Obrigado" (não explica o pedido)
4. Sem contaminação

---

## 2. 558184784565 — Celia Xavier — RECARGA CELULAR 20,00 + RECARGA VEM
1. SEM LOG DE CONVERSA na janela -6h/+48h do pedido (criado 2026-07-15). Único log recuperável do
   telefone é de **2026-04-02** (quase 2 meses e meio antes), e nem fala de recarga: "Bom dia" /
   "Vocês trabalham com adesivo, quem não sai? Da água" / "Na água" / "Obrigada" — pergunta sobre
   adesivo à prova d'água, assunto diferente do pedido de recarga celular/VEM deste lote.
2. Produto: RECARGA CELULAR 20,00, RECARGA VEM
3. Primeira resposta da equipe: nenhuma capturada (nem na janela nem no log de abril)
4. Sem contaminação de outro negócio, mas o único texto disponível não descreve este pedido

---

## 3. 558184836197 — Teresinha Costa — IMPRESSÃO P&B A4
1. Texto literal do cliente sobre o pedido real: "Bom dia só primeira página." — resto do texto do
   cliente na janela é sobre outro assunto (ver item 4)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "Bom dia pedido feito" / depois "Pedido confirmado! 😊 🖨️
   *IMPRESSÃO P&B A4* 💰 R$ 1.20 ... Prontinho! Seu pedido já está pronto pra retirada 😊"
4. **CONTAMINAÇÃO CLARA**: o mesmo telefone manda, no meio da janela, mensagens de venda de almoço
   — "Bom dia!\nUm almoço completo feijão mulatinho e frango ao molho.\n14,00" (07-09) e no dia
   seguinte "Bom dia!\nUm almoço completo feijão mulatinho e lombo recheado.\n14,00" (07-10). Parece
   ser um fornecedor de marmita/quentinha que também usa a JS Gráfica pra impressão — não misturar
   com o pedido de impressão.

---

## 4. 558184873750 — Paulicéia — IMPRESSÃO P&B A4 + ENVELOPE A4
1. Texto literal do cliente: "Bom dia" / "Imprima p mim por favor" / "Preto e branco" / "Ok"
2. Produto: IMPRESSÃO P&B A4, ENVELOPE A4
3. Primeira resposta da equipe: "está impresso pode vir buscar, valor 1,20😉"
4. Sem contaminação

---

## 5. 558184897708 — Beronice Maria — IMPRESSÃO P&B A4
1. SEM TEXTO do cliente capturado na janela — as 3 mensagens na janela são todas da equipe
   (`from_me=true`); o cliente não tem nenhuma mensagem própria registrada nesse intervalo
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "pode vim buscar valor 2,40" / depois mensagem automática "Pedido
   confirmado! 😊 🖨️ *IMPRESSÃO P&B A4* 📦 Qtd: 2 💰 R$ 2.40..."
4. Sem contaminação

---

## 6. 558185021029 — Maria da Conceição Alves — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (2 documentos, sem legenda, sem nenhuma mensagem de texto do cliente na
   janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 7. 558185070094 — Ellen Santos — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) x2 + PLASTIFICAÇÃO MÉDIA x2
1. Texto literal do cliente: "E sobre o QR code que eu falei com o senhor" / "Seria esse aí \nQueria
   no tamanho padrão ,médio \nQueria que emplastificasse e se tem um cordãozinho para em pendurar" /
   "O médio é mas ou menos no tamanho de um metade da folha de ofício" / "Tem o pix pra mim manda
   logo ou quando eu for pega eu faço"
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta), PLASTIFICAÇÃO MÉDIA
3. Primeira resposta da equipe: nenhuma resposta de texto explicativa capturada — só o envio do
   código Pix copia-e-cola diretamente
4. Sem contaminação

---

## 8. 558185122053 — Milena Vitória — FOTO POLAROID 7X10
1. Texto literal do cliente: "Oii boa tarde" / "Quanto está a foto polaroide?" / "Quanto custa a
   foto em polaroide??" / legenda de imagem: "Quero essas duas fto prfvv" / "Qnd terminar avise por
   favor"
2. Produto: FOTO POLAROID 7X10
3. Primeira resposta da equipe: "2,00" / "a uni" — depois "Opa, Milena! Já estão pronas suas fotos,
   valor 4,00! Qual vai ser a forma de pagamento? 😉"
4. Sem contaminação

---

## 9. 558185166086 — Carlos Luciano — IMPRESSÃO P&B A4
1. SEM TEXTO real do cliente sobre o pedido — a única mensagem na janela é um **aviso automático de
   agendamento médico** ("Olá, ROSINEIDE FERREIRA DA SILVA! Sou a Assistente Virtual da Central de
   Regulação de Recife... atendimento para DENSITOMETRIA foi agendado... Solicitação: 543453664...")
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma capturada
4. **CONTAMINAÇÃO CLARA**: mensagem é de um bot da Central de Regulação de Recife (SUS), dirigida a
   "Rosineide Ferreira da Silva" (nome diferente do contato "Carlos Luciano") — provavelmente o
   cliente encaminhou o print/guia desse agendamento pra imprimir, mas o texto capturado no log não
   é do cliente, é o conteúdo do documento/mensagem de terceiro. Nenhuma frase própria do cliente
   sobre o pedido de impressão foi capturada.

---

## 10. 558185215788 — Edjane Severina — IMPRESSÃO 2ª VIA CONTA
1. SEM TEXTO — só mídia (1 documento, sem legenda, sem nenhuma mensagem de texto do cliente na
   janela)
2. Produto: IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta da equipe: "Obrigado"
4. Sem contaminação

---

## 11. 558185238572 — Daniel Carlos proteção ve — IMPRESSÃO P&B A4 + XEROX PRETO E BRANCO A4
1. Texto literal do cliente: "O8" (provável erro de digitação) + documento com nome de arquivo
   "JOSE_HELENO_DA_SILVA.pdf" (revela que é documento de terceiro) / depois "Deus te" / "Abençoe"
   (despedida, não descreve pedido)
2. Produto: IMPRESSÃO P&B A4, XEROX PRETO E BRANCO A4
3. Primeira resposta da equipe: "Obrigado 😊"
4. Sem contaminação — nome do contato ("Daniel Carlos proteção ve[icular]") sugere outro serviço
   pessoal do cliente, mas conteúdo trocado é legítimo (documento de terceiro pra imprimir)

---

## 12. 558185254817 — Severino Martim — XEROX COLORIDA A4
1. SEM LOG DE CONVERSA na janela -6h/+48h do pedido (criado 2026-07-20). Único log recuperável é de
   **2026-01-26**, quase 6 meses antes: "Boa tarde qual o valor" / "Posso pegar ainda hoje" /
   "Obrigado por tudo" (todas essas linhas vieram com `media_type: image`, sugerindo mensagens de
   texto anexadas/relacionadas a uma imagem enviada antes)
2. Produto: XEROX COLORIDA A4
3. Primeira resposta da equipe: nenhuma capturada (nem na janela nem no log de janeiro)
4. Sem contaminação, mas vínculo direto com este pedido específico não pode ser confirmado
   (defasagem de quase 6 meses)

---

## 13. 558185309035 — Beltran — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento, sem legenda, sem nenhuma mensagem de texto do cliente na
   janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 14. 558185337779 — Veronildo — 1 m² adesivo leitoso recortado
1. Texto literal do cliente: imagem sem legenda, depois "Boa tarde,este com o símbolo do ZAP
   verdade" (perguntando se o Pix/comprovante recebido é verdadeiro) / "👍"
2. Produto: 1 m² adesivo leitoso recortado
3. Primeira resposta da equipe: "Boa tarde" / "Pago 65,00 pedido de 1 m² de adesivo leitoso
   recortado, prazo de entrega dia 16/07/26."
4. Sem contaminação

---

## 15. 558185387222 — Juliana Lopes — XEROX PRETO E BRANCO A4
1. SEM LOG DE CONVERSA na janela -6h/+48h do pedido (criado 2026-07-17). O telefone tem log em
   **2026-02-04** e **2026-03-31 a 2026-04-06** (meses de distância pra ambos os lados), com padrão
   recorrente de pedidos de xerox: "Boleto +histórico fica quanto??" / "E a xerox do Rg" / "A xerox
   é quanto??" / "Vou buscar lá pras 16hrs" — mostra que a cliente é recorrente para xerox/boletos,
   mas não é o texto deste pedido específico.
2. Produto: XEROX PRETO E BRANCO A4
3. Primeira resposta da equipe: nenhuma capturada na janela do pedido
4. Sem contaminação

---

## 16. 558185423246 — Gabriel — IMPRESSÃO P&B A4
1. Texto literal do cliente: "Bom dia" / "Pode imprimir uma foto ? Por favor" (+ imagem) / "Qual o
   valor ?" / "Ok"
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: mensagem automática "Pedido confirmado! 😊 🖨️ *IMPRESSÃO P&B A4* 💰
   R$ 1.20 ... Prontinho! Seu pedido já está pronto pra retirada 😊"
4. Sem contaminação

---

## 17. 558185478972 — Erika — IMPRESSÃO COLORIDA OFÍCIO A4 (laser) + CARTEIRA PARA RG (cluster A,
07-27) / XEROX PRETO E BRANCO A4 + ENVELOPE A4 (cluster B, 07-28)
1. SEM TEXTO substantivo em nenhum dos 2 clusters — cliente só enviou 1 documento sem legenda e
   disse "Por nada" (resposta a um agradecimento, não descreve pedido). A janela do cluster B
   (07-28 12:20) está contida dentro da janela do cluster A, e nenhuma mensagem adicional aparece
   perto desse segundo pedido — ou seja, para os 2 pedidos combinados, não há frase própria do
   cliente descrevendo o que queria.
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (laser), CARTEIRA PARA RG, XEROX PRETO E BRANCO A4,
   ENVELOPE A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 18. 558185494954 — Douglas Buarque — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta, 07-07) +
IMPRESSÃO COLORIDA OFÍCIO A4 (laser, 07-08)
1. Texto literal do cliente — dia 1: "Boa tarde" / "Gostaria de deixar essa imagem" / "Em PDF" (+
   imagem) / "Qual valor" / "Vai ser via Pix o pagamento". Dia 2: "Boom dia" / "Gostaria de colocar
   essa imagem em PDF" / "Frente e verso" / "Vc coloca no mesmo PDF" (+ 2 imagens) / "E o mesmo
   documento" / "Vai ser via Pix o pagamento"
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta), IMPRESSÃO COLORIDA OFÍCIO A4 (laser)
3. Primeira resposta da equipe: "Oi, Douglas! Boa tarde! Sua impressão A4 colorida já tá confirmada
   aqui, valor R$ 2,20. Pode fazer o Pix sim, se preferir! 😉"
4. Sem contaminação

---

## 19. 558185525103 — Ana — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
1. SEM TEXTO — só mídia (1 imagem, sem legenda, sem nenhuma mensagem de texto do cliente na janela)
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 20. 558185553910 — Adriel — IMPRESSÃO COLORIDA OFÍCIO A4 (laser) x3 + AGENDAMENTO/CURRÍCULO/
ANTECEDENTES/DIGITAÇÃO x2 + PLASTIFICAÇÃO PEQUENA
1. Texto literal do cliente: "Só da mãe, mesmo" / "Michele Goncalo da Silva" / "Bom dia" / "Esse
   desenho não é do artista não" / "Ele é altista" / (sticker) / "Ficou ótimo" / "Posso ir buscar"
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (laser), AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO,
   PLASTIFICAÇÃO PEQUENA
3. Primeira resposta da equipe: "Está pronta carteira, pode vir buscar. 😊" — revela que o pedido é
   uma carteira/carteirinha com um desenho/arte impressa e plastificada, motivo da conversa sobre
   "o desenho não é do artista" (avaliando a autenticidade/qualidade da arte usada)
4. Sem contaminação

---

## 21. 558185555477 — Antonio Amaral — IMPRESSÃO P&B A4 + ACESSO/ENVIO DOCUMENTOS
1. Texto literal do cliente sobre o pedido real: documento + "Pra imprimir to indo" (07-27) —
   depois, no dia seguinte e no dia posterior, o texto vira outro assunto (ver item 4)
2. Produto: IMPRESSÃO P&B A4, ACESSO/ENVIO DOCUMENTOS
3. Primeira resposta da equipe: "Boa tarde, está impresso valor 1,20" — depois mensagem automática
   completa de "Pedido confirmado!" com Pix
4. **CONTAMINAÇÃO CLARA E EXTENSA**: a partir de 07-28 12:21, o mesmo telefone manda uma sequência
   longa de mensagens de pedido de comida/quentinha, claramente não relacionadas à gráfica: "Boa
   tarde ainda tem isca de carne" / "Então vou querer uma quentinha de 18 completa não coloca arroz
   mais entrega" / "Rua engenho matatapagipe 62 ur 3" / "Feijão preto" / "Isca de carne" / no dia
   seguinte: "Bom dia ainda tem panqueca" / "Vou querer uma panqueca completa feijão mulatinho" /
   boleto em PDF / "Meu endereço é rua engenho matatapagipe 62" — mesmo padrão de fornecedor de
   marmita visto no telefone 558184836197 (item 3), pode ser o mesmo negócio de quentinha ou um
   padrão comum na região. Não misturar com o pedido de impressão.

---

## 22. 558185591127 — Lari Nunes — IMPRESSÃO PAPEL FOTO A4 230g (cluster A, 07-17) / IMPRESSÃO
PAPEL FOTO A3 230g + IMPRESSÃO PAPEL CARTÃO A3 180G (cluster B, 07-24)
1. Texto literal do cliente — cluster A: "Olá boa tarde" + documento / "Gostaria de uma cópia desse
   papel, com duas fichas de avaliação na msm folha" / "O papel vai ser offset" / "O mais grosso" /
   "Me confirma qual valor fica por favor" / "O pagamento vai ser em dinheiro". Cluster B: "Bom dia"
   / "Me confirma por favor novamente o valor da impressão A3" / "E papel foto" (+ 2 imagens) / "Vou
   querer essas Duas A3 em papel foto" / "O pagamento vai ser no pix" / depois: "Imprime essa também
   em tamanho A3" / "Só que no papel cartão"
2. Produto: IMPRESSÃO PAPEL FOTO A4 230g, IMPRESSÃO PAPEL FOTO A3 230g, IMPRESSÃO PAPEL CARTÃO A3
   180G
3. Primeira resposta da equipe: nenhuma resposta de texto explicativa — equipe respondeu com o
   código Pix copia-e-cola diretamente e depois "pode vir buscar"
4. Sem contaminação — cliente é bastante técnica nas especificações (tipo de papel "offset",
   "mais grosso", tamanho A3/A4)

---

## 23. 558185628507 — Larissa — TOPO DE BOLO (com recorte)
1. Texto literal do cliente: "olá" / "boa tarde" / "quero fazer um topo do bolo" / "não tenho a
   arte" / "mas seria ursinho rosa com balões rosinha tudo clarinho" / legenda de imagem: "a ideia
   seria mais assim\n(obs: não quero o cavalo não) \n\nfrase: despedida do bucho *(rosa)*\n\nessa
   mulher grávida usando rosa \n\na frase: tem muito amor te esperando aqui fora *(rosa)*" / "rosa
   que eu digo as bordinhas sabe? \n\no texto em si você pode ver qual tom combinar" / "e fora esse
   topo \nquero 6 unidades menores para docinhos" / "mais ou menos assim\nmas nessa ideia\nque você
   fez desse ursinho" / "só uns objetos \ncavalinho\nmamadeira\no ursinho menina com balões" /
   "quero com corte"
2. Produto: TOPO DE BOLO (com recorte)
3. Primeira resposta da equipe: "Opa, Larissa! Boa tarde! Topo de bolo a gente faz sim! Pra te
   passar um orçamento, me diz qual o tema e se você já tem a arte ou quer que a gente crie? 😊"
4. Sem contaminação — o mais rico briefing criativo do lote (chá revelação/despedida do bucho, cores
   e frases específicas)

---

## 24. 558185709423 — thxyz 🥀 — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) x2 + ENVELOPE A4
1. SEM TEXTO — só mídia (1 documento, sem legenda; o nome do arquivo "Anthony Gabriel.pdf" revela
   que é documento de terceiro, mas não é frase própria do cliente)
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta), ENVELOPE A4
3. Primeira resposta da equipe: nenhuma capturada na janela
4. Sem contaminação

---

## 25. 558185755312 — Rosi Duda 😘 — IMPRESSÃO P&B A4
1. Texto literal do cliente: documento com legenda "Guia de agendamento de Consulta -
   1783972112359-1783972126992" (guia do SUS) / "Rosineide Duda \n19/04\ndudarosineide@gmail.com"
   (dados pessoais, provavelmente pra outro serviço tipo currículo/cadastro) / "Fica quanto i"
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "obg"
4. Sem contaminação

---

## 26. 558185799726 — Carlos Pedreiro — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento, sem legenda, sem nenhuma mensagem de texto do cliente na
   janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 27. 558185805847 — Irmã Dora — IMPRESSÃO P&B A4 (cluster A, 07-28) / IMPRESSÃO P&B A4 (cluster B,
07-30)
1. Texto literal do cliente — cluster A: imagem + "Bom dia uma xerox desse exame" / "Oi" / "Está
   certo obrigado! Pix" / "Dinheiro ele vai levar" / "Tem como fazer outro?" (+ imagem) / "Não vão
   aceitar essa xerox" / "Está certo". Cluster B: documento + "Imprimir este !"
2. Produto: IMPRESSÃO P&B A4 (xerox de exame médico)
3. Primeira resposta da equipe: código Pix copia-e-cola; depois "Obrigado"
4. Sem contaminação

---

## 28. 558185826504 — D. Bete CEDPSF — IMPRESSÃO P&B A4 + ACESSO/ENVIO DOCUMENTOS
1. Texto literal do cliente: "Bom dia!" / "Pegou à tarde.\nEstarei de volta de uma hora." (+ imagem)
2. Produto: IMPRESSÃO P&B A4, ACESSO/ENVIO DOCUMENTOS
3. Primeira resposta da equipe: "14,40" / "Obrigado"
4. Sem contaminação — nome do contato ("D. Bete CEDPSF") indica posto de saúde/CEDPSF, cliente
   institucional recorrente

---

# Resumo de cobertura

Todos os 28 telefones do lote foram cobertos, nenhum pulado.

- **Texto real do cliente (frase própria além de saudação/confirmação curta):** 15 telefones —
  558184836197, 558184873750, 558185070094, 558185122053, 558185238572 (fraco), 558185337779,
  558185423246, 558185494954, 558185553910, 558185555477 (fraco, ver contaminação), 558185591127,
  558185628507, 558185755312 (fraco), 558185805847, 558185826504 (fraco)
- **SEM TEXTO — só mídia ou nenhuma mensagem do cliente na janela:** 10 telefones —
  558184768356, 558184897708, 558185021029, 558185166086 (contaminado por bot de terceiro),
  558185215788, 558185309035, 558185478972, 558185525103, 558185709423, 558185799726
- **SEM LOG DE CONVERSA na janela exata do pedido (mas com log em outra data, meses de distância,
  reportado com ressalva):** 3 telefones — 558184784565 (abril, assunto diferente), 558185254817
  (janeiro, ~6 meses antes), 558185387222 (fevereiro/março-abril, nenhum na janela de julho)
- **Contaminação clara de outro negócio/assunto no mesmo número:** 3 telefones —
  558184836197 (venda de marmita/quentinha), 558185555477 (venda de quentinha/isca de carne,
  extensa), 558185166086 (mensagem automática de bot de agendamento médico do SUS, não relacionada
  à gráfica)

Nenhum telefone caiu em "SEM LOG DE CONVERSA" absoluto (todos tinham pelo menos algum log em
alguma data, mesmo que fora da janela ideal).
