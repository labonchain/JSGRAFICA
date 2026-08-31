# Lote 05 — Pesquisa linguagem real do cliente (28 telefones)

Metodologia: `to_timestamp(data_timestamp/1000.0) AT TIME ZONE 'America/Recife'`, `is_group=false`,
`apagada_em IS NULL`, telefone casado pelos últimos 11 dígitos, janela -6h/+48h do `created_at`
de cada pedido do telefone (pedidos próximos no tempo tratados como 1 conversa; pedidos
distantes, tratados como conversas separadas dentro do mesmo registro).

---

## 558187734290 — Rodrigo Isidoro — IMPRESSÃO P&B A4
1. Frase literal do cliente: "Imprime pra mim" / "Por favor"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: não houve pergunta de esclarecimento capturada na
   janela — só "obg" (agradecimento) depois da entrega.
4. Sem contaminação.

## 558187794825 — Aloizio Melo — XEROX PRETO E BRANCO A4
1. SEM LOG DE CONVERSA — nenhuma mensagem (nem texto nem mídia) encontrada na janela do pedido.
2. Produto real: XEROX PRETO E BRANCO A4
3. N/A
4. Sem contaminação.

## 558187801684 — Fatima Melo — IMPRESSÃO P&B A4 + IMPRESSÃO COLORIDA OFÍCIO A4 (2 conversas)
1. Frases literais do cliente:
   - Conversa 1 (09/07): "Boa tarde Sr Edivan" / link do Google Docs / "O Sr imprimir este
     documento, amanhã pego." / "Obgda" / "Minha sobrinha vai pegar o documento." / "Mande sua
     chave Pix" / "Qual valor ⁉️"
   - Conversa 2 (24/07): "Bom dia Sr Edivan" / "Sai atrasada hoje e não deu para ir pegar .
     Informe seu Pix . Que segunda eu pego. Obgda" / "Pode ser papel ofício."
2. Produto real: IMPRESSÃO P&B A4 (conv 1) / IMPRESSÃO COLORIDA OFÍCIO A4 jato tinta (conv 2)
3. Primeira resposta substantiva da equipe: conv 2 — equipe deu opções de papel: "papel ofício
   2,20" / "papel cartão 5,00" / "papel foto 6,50" (cliente escolheu ofício).
4. Sem contaminação.

## 558187810979 — Pricila Francisco — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (sticker + 2 documentos, nenhuma mensagem de texto do cliente).
2. Produto real: IMPRESSÃO P&B A4
3. Sem resposta de texto da equipe capturada na janela.
4. Sem contaminação.

## 558187844624 — Emanuel De Jesus Rocha — IMPRESSÃO P&B A4 / XEROX PRETO E BRANCO A4 / ENVELOPE A4 (2 conversas)
1. Conversa 1 (21/07, IMPRESSÃO P&B A4): SEM TEXTO — só mídia (1 documento).
   Conversa 2 (23/07, XEROX + ENVELOPE): SEM LOG DE CONVERSA — nenhuma mensagem na janela.
2. Produto real: IMPRESSÃO P&B A4 / XEROX PRETO E BRANCO A4 / ENVELOPE A4
3. N/A
4. Sem contaminação.

## 558187872386 — Inaldo José — IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4 (várias, 14-15/07 e 20/07)
1. SEM TEXTO — cliente só mandou arquivo(s) (conta protegida por senha). O texto real que existe
   na janela é da equipe: "Oi Inaldo! Recebemos os arquivos qual é a senha." — revela que o
   pedido de 2ª via de conta chega como PDF protegido e a equipe precisa pedir a senha.
2. Produto real: IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Oi Inaldo! Recebemos os arquivos qual é a senha."
4. Sem contaminação.

## 558187905271 — Luciano Monteiro — IMPRESSÃO P&B A4
1. SEM TEXTO — cliente só mandou mídia; as "legendas" capturadas são nomes de arquivo
   automáticos ("IMAGE_4222062_1780433769000", "RECEITA_LUCIANO_MONTEIRO_assinado"), não texto
   digitado pelo cliente.
2. Produto real: IMPRESSÃO P&B A4 (receita médica)
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "obg" no final.
4. Sem contaminação.

## 558187967133 — Alessandra Lopes 🌹💞 — ENVELOPE A4 / AGENDAMENTO-CURRÍCULO / IMPRESSÃO P&B A4 (2 conversas: 21/07 e 30/07)
1. Frases literais do cliente (conv 1, 21/07 — muito reveladora):
   "Ola bom dia" / "Quanto fica currículo em pdf" / "Alessandra Lopes\n07/08/90\n
   alessandra_nika@hotmail.com" / "No caso seria so em pdf" / "Eu acho q tenho no meus arquivos
   um desatualizado ai te mando" / "Me manda o pix" / "Pode fazer o impresso tbm ta meu menino
   depois busca" / "Vcs tem envelope" / "Pra coloca o currículo impresso" / "O impresso está
   pronto junto com o envelope" / "Que meu filho vai buscar"
   Conv 2 (30/07): "Boa tarde" / "Pra imprimir exames"
2. Produto real: ENVELOPE A4, AGENDAMENTO/CURRÍCULO/DIGITAÇÃO, IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: envio do código Pix (sem pergunta de esclarecimento
   textual — a equipe atendeu direto ao pedido).
4. Sem contaminação.

## 558187979829 — Xangô Ayra — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
1. SEM TEXTO — só mídia (3 imagens, nenhuma mensagem de texto).
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
3. Sem resposta de texto da equipe capturada na janela.
4. Sem contaminação. (Nome "Xangô Ayra" sugere contexto religioso/terreiro — não é contaminação
   de outro negócio, é só o nome de contato.)

## 558187997545 — D&V LOCAÇÕES — IMPRESSÃO P&B A4
1. SEM TEXTO — cliente só mandou 3 documentos, nenhuma mensagem de texto.
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "Obrigado 😉" no final.
4. Sem contaminação.

## 558188039123 — Maria Lucia 88039123 — IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4
1. Frases literais do cliente: "Maria Lucia" / "14.03.962" / "luciaagricio@gmail.com" /
   "Colorido" / "Quanto é"
2. Produto real: IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "colorido ou preto e branco?" (pergunta de
   esclarecimento clássica).
4. Sem contaminação.

## 558188071500 — Janaina — IMPRESSÃO P&B A4
1. Frases literais do cliente: "Confira o documento de João." + link Adobe Acrobat / "Para
   impressão" / "Jaja irei buscar" / "Ok" / "Jája chego"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Seu arquivo está impresso valor 1,20" (já entregou
   direto, sem pergunta).
4. Sem contaminação.

## 558188081062 — Stephany 88081062 — IMPRESSÃO P&B A4 / IMPRESSÃO PAPEL CARTÃO A4 180G (2 conversas)
1. Conversa 1 (07/07, muito reveladora sobre serviço de foto/quadro):
   "Boa tarde" / "Qual o valor da foto ?" / "Se levar o quarto vcs sabem qual o tamanho ?" /
   "Eu não sei kkkk" / "Só tenho o quadro" / "Mas n sei o tamanho" / "Levo os porta retratos ?" /
   "Eitaaaa" (quando avisada que esqueceu a tampa) / "Quinta eu pego"
   Conversa 2 (21/07, papel cartão): SEM LOG DE CONVERSA — nenhuma mensagem na janela.
2. Produto real: IMPRESSÃO P&B A4 (mas a conversa real foi sobre imprimir foto/retrato levando
   quadro de referência — o `servico_nome` registrado não reflete bem o que foi discutido) /
   IMPRESSÃO PAPEL CARTÃO A4 180G
3. Primeira resposta substantiva da equipe: "qual tamanho?"
4. Sem contaminação (é o próprio negócio, mas nota: pedido registrado como "IMPRESSÃO P&B A4"
   não bate com a conversa, que é sobre foto/quadro sem medida definida — vale investigar esse
   padrão de mismatch produto-conversa fora desta tarefa).

## 558188095542 — rafaeli silva — IMPRESSÃO P&B A4
1. SEM TEXTO — cliente só mandou 1 documento.
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "Obrigado" no final.
4. Sem contaminação.

## 558188101245 — Mauricio - Areia Preta — IMPRESSÃO P&B A4
1. SEM TEXTO — cliente só mandou 1 documento, nenhuma mensagem de texto.
2. Produto real: IMPRESSÃO P&B A4
3. Resposta da equipe é só a automação de status ("Pedido confirmado!... entrou em produção...
   pronto pra retirada"), sem interação humana textual.
4. Sem contaminação.

## 558188152181 — Luiza 😊 — IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento, nenhuma mensagem de texto).
2. Produto real: IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4
3. Sem resposta de texto da equipe capturada na janela.
4. Sem contaminação.

## 558188160276 — Rapha Souza — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
1. Frases literais do cliente: "Quero imprimir esse desenho" / "Vai ser colocado" / "E no pix" /
   "Estou indo agora buscar"
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) — um desenho.
3. Primeira resposta substantiva da equipe: envio do código Pix + "pode vir buscar".
4. Sem contaminação.

## 558188164834 — Marcelo Dutra — XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4 (2 conversas próximas, 13-14/07, tratadas juntas)
1. Frase literal do cliente: só "opa" (cumprimento, sem descrever o pedido) — depois só mídia
   (imagens/documentos, incluindo "MARCELO - CURRICULO.pdf"). Sem texto descritivo real.
2. Produto real: XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4 (currículo)
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "Obrigado".
4. Sem contaminação.

## 558188188419 — Luiz da Silva Filho — IMPRESSÃO P&B A4 / XEROX PRETO E BRANCO A4 (2 conversas: 08/07 e 14/07)
1. SEM TEXTO — cliente só mandou mídia (documentos e imagens) nas duas janelas, nenhuma
   mensagem de texto.
2. Produto real: IMPRESSÃO P&B A4 / XEROX PRETO E BRANCO A4
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "obg" no final.
4. Sem contaminação.

## 558188221037 — Edileide Eustáquio — IMPRESSÃO P&B A4
1. Frases literais do cliente: "Bom dia. Quanto você imprime esse comprovante?" (junto com PDF
   "DAS-PGMEI...") / "Edileide Eustáquio\n26/08/1974\nedileideelopes@gmail.com" / "O rapaz vai
   passar aí" / "Obrigada"
2. Produto real: IMPRESSÃO P&B A4 (comprovante DAS-PGMEI/MEI)
3. Primeira resposta substantiva da equipe: não capturada em texto na janela (fluxo seguiu com
   dados do cliente e retirada por terceiro).
4. Sem contaminação.

## 558188260888 — Ariane Oliveira — FOTO 10X15 / IMPRESSÃO P&B A4 (2 conversas: 20/07 e 22-23/07)
1. Frases literais do cliente:
   - Conv 1 (fotos, 20/07): "uma" / "pode" / "ESSA 15 X 20" / "AS OUTRAS 10 X 15" / "MAIS ESSAS" /
     "mais duas"
   - Conv 2 (22-23/07): "se puderem ajudar agradeço muito, estou agora nesta batalha. ele se
     classificou pra um panamericano na Costa Rica, a federação só paga a inscrição, todos os
     outros custos de passagem aerea,hospedagem, alimentação tudo é por conta do atleta." (mensagem
     de contexto pessoal/campanha de arrecadação, não é contaminação de outro negócio — segue
     depois pedindo impressão de documento oficial) / "Imprimi duas vias por favor" / "Preto e
     branco" / "Da quanto"
2. Produto real: FOTO 10X15 (mistura de tamanhos 10x15 e 15x20) / IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "obg" (conv 1); nenhuma resposta de texto capturada
   na conv 2.
4. Nota: a mensagem sobre arrecadação para atleta é contexto pessoal do cliente, não é
   contaminação de outro negócio — mas destoa do fluxo comercial, vale marcar como "ruído" na
   taxonomia.

## 558188276422 — Adriana Santos — XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4
1. Frases literais do cliente: "Bom dia" / "Vc pode fazer essa impressão de resultado de exames"
   / "Passo aí jaja"
2. Produto real: XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4 (resultado de exames)
3. Primeira resposta substantiva da equipe: nenhuma pergunta de esclarecimento capturada em
   texto (fluxo seguiu direto).
4. Sem contaminação.

## 558188347325 — Thamires Muniz — IMPRESSÃO P&B A4 / IMPRESSÃO COLORIDA OFÍCIO A4 (2 conversas: 21/07 e 30/07)
1. Frases literais do cliente:
   - Conv 1 (21/07): "Bom dia" / "Imprimi pra mim PDF" / "Qual o pix?" / "Qual valor?" / "To
     indo já"
   - Conv 2 (30/07 — pedido de emprego/declaração de vínculo): "Pedreiro" / "Começou 02/2026" /
     "Ainda tá aberto" / "Sim" / "Não" / "Impresso" / "Quando tiver pronto avisa" / "E manda o
     pix" / "Tá pronta?" + comprovante Santander
2. Produto real: IMPRESSÃO P&B A4 / IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
3. Primeira resposta substantiva da equipe (conv 2): "qual a função nesta empresa e tempo de
   serviço?" — pergunta de esclarecimento clássica pra preencher documento/declaração.
4. Sem contaminação.

## 558188360438 — LSG Coturnos — IMPRESSÃO P&B A4 (cancelado) / XEROX PRETO E BRANCO A4
1. SEM TEXTO — só mídia (1 documento, nenhuma mensagem de texto).
2. Produto real: IMPRESSÃO P&B A4 (cancelado) / XEROX PRETO E BRANCO A4
3. Sem resposta de texto da equipe capturada na janela.
4. Sem contaminação. (Nome de contato é empresarial — "LSG Coturnos" — sem sinal de outro
   negócio na conversa em si, é só o nome salvo do contato.)

## 558188402775 — Robelio — IMPRESSÃO P&B A4
1. Cliente só mandou 3 links do Adobe Acrobat (documentos compartilhados) + 5 documentos,
   nenhum texto descritivo próprio — classificado como SEM TEXTO (links/arquivos, sem frase
   escrita pelo cliente).
2. Produto real: IMPRESSÃO P&B A4
3. Sem resposta de texto da equipe capturada na janela.
4. Sem contaminação.

## 558188448047 — Jenifer — IMPRESSÃO P&B A4
1. Frase literal do cliente: "Bom dia" (junto com 3 documentos: declaração, procuração e
   contrato Sul América em nome de "Maria Jóse de Lira").
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "Obrigado 😊" no final.
4. Sem contaminação.

## 558188470589 — Jeida Abia — IMPRESSÃO P&B A4
1. SEM TEXTO — cliente só mandou 1 documento, nenhuma mensagem de texto.
2. Produto real: IMPRESSÃO P&B A4
3. Resposta da equipe é só a automação de status, sem interação humana textual.
4. Sem contaminação.

## 558188496931 — Sra. Jane — IMPRESSÃO P&B A4
1. SEM TEXTO — cliente só mandou 1 documento, nenhuma mensagem de texto.
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "Obrigado" no final.
4. Sem contaminação.
