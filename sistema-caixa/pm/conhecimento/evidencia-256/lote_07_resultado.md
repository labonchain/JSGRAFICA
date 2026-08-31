# Lote 07 — Pesquisa de linguagem do cliente (28 telefones)

Metodologia: `to_timestamp(data_timestamp/1000.0)`, hora `America/Recife`, exclui `is_group=true` e
`apagada_em IS NOT NULL`. Telefone ligado a `jsgrafica_pedidos.telefone` pelos últimos 11 dígitos.
Janela por telefone: -6h a +48h do(s) `created_at` de todos os pedidos reais desse telefone
(pedidos próximos agrupados na mesma janela/conversa; clusters de datas bem separadas tratados
como conversas distintas dentro do mesmo registro).

---

## 558191680943 — ped-1351 — IMPRESSÃO P&B A4 (entregue, 2026-07-21)
1. Frase literal do cliente: "." (mensagem sem conteúdo real) — depois um documento com legenda
   "ADRIEL SANTOS DA PAZ.pdf" (nome do arquivo, não descrição) e uma imagem sem legenda.
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma em texto — só o código Pix enviado.
4. Contaminação: não observada.

## 558191851845 — ped-0721 — IMPRESSÃO P&B A4 (entregue, 2026-07-13)
1. Frase literal: "Ok bom dia" (resposta de confirmação; não descreve o pedido — a solicitação em
   si não está na janela, pedido provavelmente combinado antes ou por outro meio).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Bom dia, Eliane! Seu boleto está impresso valor 1,20
   pode vir buscar." (mensagem que precede a resposta do cliente, indicando que o pedido (boleto)
   já estava pronto).
4. Contaminação: não observada.

## 558191921749 — ped-1360 — IMPRESSÃO PAPEL FOTO A4 230g (entregue, 2026-07-21)
1. Frase literal: "eu quero no papel foto tb" / "agr eu quero pequeno" / "tipo esse aq" [imagem] /
   "que é pra colocar em cima dos docinhos" / "sabe como é?" / "voce consegue colocar contorno pra
   que eu consiga cortar melhor ?" / "eu quero que fique dessa forma" / "tu conseguiria me dizer ?"
   / "4,5 cm cabe qnts em uma foto em pé ?" / "consegue me mostrar igual mostrasse aqui" / "da qnts
   na folha ?"
2. Produto real: IMPRESSÃO PAPEL FOTO A4 230g — topper/imagem para colocar em cima de docinhos
   (topo de doce), não uma "foto" convencional.
3. Primeira resposta substantiva da equipe: nenhuma resposta em texto explicando preço/processo na
   janela — só "Obrigado 😊" ao final do atendimento.
4. **Contaminação observada**: no dia 2026-07-23 (dentro da janela de +48h), o mesmo telefone tem
   conversa clara de um negócio de marmita/comida ("qual cardápio de hj", "cupim no molho\nfeijão
   mulato \ncompleto\n14,00", "pode se almôndegas então", "já chego aí") — sem relação com a JS
   Gráfica. Não misturado com o resultado do pedido real.

## 558191959185 — ped-0724 — IMPRESSÃO P&B A4 (entregue, 2026-07-13)
1. Frase literal: SEM TEXTO — só mídia (1 documento sem legenda em toda a janela).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: nenhuma registrada na janela.
4. Contaminação: não observada.

## 558191966693 — ped-1011 — FOTO POLAROID 7X10 (entregue, 2026-07-15)
1. Frase literal: SEM TEXTO — só mídia (2 imagens seguidas, sem legenda).
2. Produto real: FOTO POLAROID 7X10
3. Primeira resposta substantiva: nenhuma registrada na janela.
4. Contaminação: não observada.

## 558192071141 — ped-0064 — IMPRESSÃO P&B A4 (entregue, 2026-07-06)
1. Frase literal: SEM TEXTO — só mídia (1 documento sem legenda).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: template automático — "Pedido confirmado! 😊 🖨️ IMPRESSÃO P&B A4
   Qtd: 2 R$ 2.40 ... entrou em produção! ... Prontinho! Seu pedido já está pronto pra retirada 😊"
   (mensagens em sequência, sem texto próprio de diagnóstico do pedido).
4. Contaminação: não observada.

## 558192161742 — ped-0535 — IMPRESSÃO P&B A4 (entregue, 2026-07-09)
1. Frase literal: "09189" (código/protocolo, seguido de documento). No dia seguinte (dentro da
   janela de +48h), mensagens em fonte estilizada Unicode: "𝙉𝙖̃𝙤 𝙖𝙗𝙧𝙚 𝙥𝙖𝙧𝙖 𝙧𝙚𝙨𝙥𝙤𝙣𝙙𝙚𝙧 𝙨𝙤𝙗𝙧𝙚 𝙤
   𝙘𝙖𝙙𝙖𝙨𝙩𝙧𝙤, 𝙘𝙤𝙢𝙤 𝙛𝙖𝙯𝙚𝙧?" / "𝙉𝙤𝙢𝙚: 𝙉𝙤𝙚𝙢𝙞 𝙁𝙚𝙧𝙧𝙚𝙞𝙧𝙖." / "𝙉𝙖𝙨𝙘𝙞𝙢𝙚𝙣𝙩𝙤: 14/06/53" / "𝙀 𝙢𝙖𝙞𝙡:
   𝙣𝙤𝙚𝙢𝙞 𝙨𝙖𝙡𝙫𝙞𝙣𝙖@gmail.𝙘𝙤𝙢." — parece continuação de um cadastro/formulário online que o cliente
   não conseguia preencher sozinho, possivelmente ligado a outro serviço (requer_consulta), não
   necessariamente ao P&B A4 do pedido.
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma registrada na janela (nenhuma mensagem
   `from_me`).
4. Contaminação: não observada claramente — mas o conteúdo pós-pedido (cadastro/dados pessoais)
   não bate obviamente com "impressão P&B", sinalizado por precaução.

## 558192438262 — ped-0802 — IMPRESSÃO PAPEL ADESIVO A4 192G (com recorte) (entregue, 2026-07-13)
1. Frase literal: "Boa tarde, vcs imprime em papel adesivo essa logo?" (legenda de imagem) /
   "Sendo que é pra colocar como adesivo" / "Tipo assim" (legenda de imagem) / "Nesse tamanho tá
   legal" / "Cabe quantas em uma folha?" / "4 cm a 5 cm de diâmetro" / "Vai ficar no formato
   redondo?" / "5x5\n\nCabe quantos na folha?" / "Qual tamanho fica melhor? Considerando o formato
   da logomarca?\n4x5 ou 5x5?"
2. Produto real: IMPRESSÃO PAPEL ADESIVO A4 192G (com recorte) — adesivos redondos de logomarca.
3. Primeira resposta substantiva da equipe: "boa tarde a folha 6,50 de adesivo" — depois "4x5 cabe
   25 uni na folha" e "quando é redondo tem que ser por igual 4x4 , ou 5x5".
4. Contaminação: não observada.

## 558192661244 — ped-0292 — IMPRESSÃO P&B A4 (entregue, 2026-07-07)
1. Frase literal: "Boa tarde!\nPara imprimir vou pegar umas 4:30" / "Me veja o valor"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "total 13,20" / "pode imprimir?"
4. Contaminação: não observada.

## 558192778804 — ped-1688/1689/1691/1855/1873 — IMPRESSÃO 2ª VIA CONTA, IMPRESSÃO P&B A4, XEROX
PRETO E BRANCO A4, CONSULTA CPF (SCPC/SERASA/CARTÓRIOS/CHEQUES), IMPRESSÃO P&B A4 (todos entregues,
2026-07-28 e 2026-07-30 — 3 clusters no mesmo dia/dias próximos, tratados juntos por volume de
contaminação)
1. Frase literal do cliente relacionada aos pedidos reais de gráfica: **nenhuma identificável** —
   não há mensagem de texto do cliente que descreva claramente um dos pedidos de gráfica nesta
   janela; as únicas respostas relacionadas são os templates automáticos da equipe.
2. Produto real: IMPRESSÃO 2ª VIA CONTA + IMPRESSÃO P&B A4 + XEROX PRETO E BRANCO A4 + CONSULTA CPF
   + IMPRESSÃO P&B A4 (pedidos avulsos, repetidos, provável atendimento de balcão frequente).
3. Primeira resposta substantiva da equipe: mensagem-template concatenada — "Pedido confirmado! 😊
   🖨️ *Itens do seu pedido:* • IMPRESSÃO 2ª VIA CONTA: R$ 2.20 • IMPRESSÃO P&B A4: R$ 1.20 💰 *Total:
   R$ 3.40* ... entrou em produção! ... Prontinho! ..." (bloco automático, sem texto humano
   diagnosticando o pedido).
4. **Contaminação muito forte e recorrente**: este telefone ("JM Novo") opera claramente um
   negócio paralelo de marmita/comida pelo mesmo WhatsApp — "Isca de carne com fritas", "Bom dia
   pedido feito" (equipe, ambíguo — pode ser resposta ao pedido de comida, não de gráfica),
   "Crocante" / "Macarrão" / "Purê" / "P9", "Tem o cardápio", "Frango em cubos, feijão mulato,
   arroz e purê \n14 Natália grupo prima", múltiplos pedidos de marmita com nomes de terceiros
   (Natália, João, Diogo Guedes, Bruna, Rodrigo — "grupo prima"), reclamação "Tudo muito bom mas a
   quantidade de frango foi muitooooo pouco" / "Só feio 5 pedaço", resposta da equipe "desculpa na
   procima vai mais". Esse tráfego de comida é claramente misturado no mesmo número mas não tem
   relação com os pedidos reais de gráfica — não usado no resultado do item 1.

## 558192958979 — ped-0525 (07-09) e ped-0861/0862 (07-14) — FOTO 10X15 / XEROX COLORIDA A4 / XEROX
PRETO E BRANCO A4 (todos entregues)
1. Frase literal (conversa 1, 07-09, ligada ao ped-0525): SEM TEXTO — só mídia (1 imagem sem
   legenda). Conversa 2 (07-14, ped-0861/0862): SEM LOG DE CONVERSA — nenhuma mensagem cai na
   janela (-6h/+48h de 2026-07-14).
2. Produto real: FOTO 10X15 (conversa 1) + XEROX COLORIDA A4 / XEROX PRETO E BRANCO A4 (conversa 2,
   sem log).
3. Primeira resposta substantiva: "Obrigado" (equipe, conversa 1, não descritiva). N/A na
   conversa 2.
4. Contaminação: não observada.

## 558193255675 — ped-1692 — AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO (entregue,
2026-07-28)
1. Frase literal: apenas "Oi" — nenhuma descrição do pedido na janela.
2. Produto real: AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO
3. Primeira resposta substantiva: nenhuma registrada na janela.
4. Contaminação: não observada.

## 558193284834 — ped-1191 — AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO (entregue,
2026-07-20)
1. Frase literal: SEM LOG DE CONVERSA — nenhuma mensagem cai na janela do pedido (-6h/+48h de
   2026-07-20). O único histórico existente nesse telefone é de 2026-07-16 (4 dias antes,
   fora da janela).
2. Produto real: AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO
3. Primeira resposta substantiva: N/A (sem log na janela).
4. **Contaminação observada (fora da janela)**: a conversa de 2026-07-16 é inteiramente sobre um
   negócio de marmita ("Bom dia, quais opções tem de almoço hoje?", "Vou querer frango pizzaiolo,
   arroz, feijão preto, farofa e legumes.", "Marmita de 14,00") — sem relação com a JS Gráfica. Não
   misturado com o resultado do item 1.

## 558193391096 — ped-1482/1483 — ACESSO / ENVIO DOCUMENTOS + PLASTIFICAÇÃO PEQUENA (entregues,
2026-07-23)
1. Frase literal: SEM TEXTO — só mídia (2 imagens sem legenda, de um contato registrado como
   "Germano N. Silva").
2. Produto real: ACESSO / ENVIO DOCUMENTOS + PLASTIFICAÇÃO PEQUENA
3. Primeira resposta substantiva: nenhuma — só "Obrigado" da equipe (não descritivo).
4. Contaminação: não observada.

## 558193480105 — ped-0751/0755 (cancelados) / ped-0756 — TOPO DE BOLO (sem recorte) (entregue,
2026-07-13)
1. Frase literal: "Vou sim" (em resposta a "ainda vai precisar desse topper de bolo?") / "O símbolo
   da CBF tá faltando" / "Isso" / "Sem" / "Qual o pix por favor" / "O Uber já está a caminho daí" /
   "Obg" / "Chegou aí" / "Agora"
2. Produto real: TOPO DE BOLO (sem recorte) — topo com símbolo da CBF (provável bolo de futebol).
3. Primeira resposta substantiva da equipe: "Bom dia, Rayane! ainda vai precisar desse topper de
   bolo? 😊" (equipe reabrindo contato sobre pedido de topo de bolo).
4. Contaminação: não observada.

## 558193565125 — ped-1334 — IMPRESSÃO P&B A4 (em produção, 2026-07-21)
1. Frase literal: "Fecha pra almoço?" / legendas de documentos: "PROCURAÇÃO AD JUDICIA ET EXTRA.pdf"
   e "DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA-2.pdf" / "Gostaria de imprimir" / "Esses dois
   documentos por favor" / "Assim que estiar eu passo aí pra pegar" / "Fica quanto?"
2. Produto real: IMPRESSÃO P&B A4 (documentos jurídicos — procuração e declaração de
   hipossuficiência).
3. Primeira resposta substantiva da equipe: "Boa tarde, Francielly! Estão impressos valor 2,40 😉" —
   depois "Ok! Estamos te esperando. 😉" e "qual vai ser a forma de pagamento?"
4. Contaminação: não observada.

## 558193770883 — ped-0630 (07-10) e ped-1638/1639 (07-27) — IMPRESSÃO P&B A4 / ENVELOPE A4
(todos entregues)
1. Frase literal (conversa 1, 07-10): "Bom dia" / "Vcs estão abertos?????" / documento / "Para
   imprimir" / "Estou indo buscar"
   Frase literal (conversa 2, 07-27): "Bom dia" / "De tarde vcs abre que horas??" / "Fecha pra
   almoço??" / "Vcs tem envelope pra botar currículo??" / documento / "Para imprimir" / "Fica
   quanto?" / "Vou querer"
2. Produto real: IMPRESSÃO P&B A4 (conversa 1) + IMPRESSÃO P&B A4 / ENVELOPE A4 (conversa 2 —
   envelope explicitamente pedido para "botar currículo").
3. Primeira resposta substantiva da equipe: nenhuma em texto além de "Obrigado😊" ao final de cada
   atendimento.
4. Contaminação: não observada.

## 558193871494 — ped-1013 — IMPRESSÃO 2ª VIA CONTA (entregue, 2026-07-15)
1. Frase literal: SEM LOG DE CONVERSA — nenhuma mensagem cai na janela (-6h/+48h de 2026-07-15). O
   histórico existente nesse telefone é de março/abril de 2026 (bem fora da janela).
2. Produto real: IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta substantiva: N/A (sem log na janela).
4. Contaminação: não observada com clareza — o histórico fora da janela (mar/abr) fala em "tirar a
   identidade", "reservar uma vaga para minha filha", "vcs abrem amanhã", que não bate obviamente
   com "2ª via de conta" nem parece outro negócio; possivelmente outro tipo de atendimento da
   própria gráfica (agendamento/documento) meses antes. Sinalizado por precaução, não misturado com
   o resultado do item 1.

## 558194042007 — ped-0481 (07-09), ped-1137 (07-17), ped-1732 (cancelado)/ped-1733 (07-28) —
IMPRESSÃO P&B A4 (repetido)
1. Frase literal (conversa 1, 07-09): documento "recibo.pdf" + imagem, sem texto livre.
   Frase literal (conversa 2, 07-17): documento "Hw2aWX7j0prRYdu16CTz-superfrete" / "Imprimir" /
   "Pix" / (depois de receber pix) envia comprovante em imagem.
   Frase literal (conversa 3, 07-28): documento "NWEmwE6I6ECrniwK99ZU-superfrete" / "Pode imprimir"
   / "Vai ser no pix" / "Manda a chave" / "Boa tarde" / depois "Pix" / **"Tá dando 2,40"**
   (reclamação/dúvida sobre valor cobrado a mais).
2. Produto real: IMPRESSÃO P&B A4 (recibos e etiquetas de postagem "superfrete", cliente recorrente).
3. Primeira resposta substantiva da equipe: "Opa, Flaviinho! O recibo já tá impresso, viu? Pode vir
   buscar. O valor é R$ 1,20. 😉" (conversa 2). Na conversa 3, a equipe responde ao questionamento
   do valor com "desculpe vou gerar outro" e reemite o Pix (indício de erro no valor cobrado).
4. Contaminação: não observada.

## 558194069490 — ped-0084/ped-0089 — IMPRESSÃO P&B A4 (status "pronto", 2026-07-06)
1. Frase literal: "Bom dia, pode imprimir essa fatura por favor?" / documento / "Seu Bio vai passar
   aí" / "Obrigado"
2. Produto real: IMPRESSÃO P&B A4 (fatura)
3. Primeira resposta substantiva da equipe: template — "Pedido confirmado! 😊 🖨️ IMPRESSÃO P&B A4 💰
   R$ 1.20 ... Assim que estiver pronto eu te aviso 😊" — depois "Obrigado" (não descritivo).
4. Contaminação: não observada.

## 558194111055 — ped-0191/0192/0193 — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) + IMPRESSÃO P&B
A4 + XEROX PRETO E BRANCO A4 (status "pronto"/entregue, 2026-07-07)
1. Frase literal: "Bom dia" / legendas de documentos: "Currículo Humberto Nascimento .pdf" e
   "Fatura de junho" — sem descrição própria além dos nomes dos arquivos enviados.
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 + IMPRESSÃO P&B A4 + XEROX PRETO E BRANCO A4 —
   currículo + fatura, pacote de documentos.
3. Primeira resposta substantiva da equipe: "obg" — depois template completo: "Pedido confirmado!
   😊 🖨️ *Itens do seu pedido:* • IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) (Qtd: 2): R$ 4.40 •
   IMPRESSÃO P&B A4: R$ 1.20 • XEROX PRETO E BRANCO A4 (Qtd: 6): R$ 2.70 💰 *Total: R$ 8.30* ...".
4. Contaminação: não observada.

## 558194366375 — ped-1144/1145 — IMPRESSÃO P&B A4 + ENVELOPE A4 (entregue, 2026-07-17)
1. Frase literal: SEM TEXTO — só mídia (1 documento sem legenda em toda a janela).
2. Produto real: IMPRESSÃO P&B A4 + ENVELOPE A4
3. Primeira resposta substantiva: nenhuma registrada na janela.
4. Contaminação: não observada.

## 558194437630 — ped-1335 — IMPRESSÃO P&B A4 (entregue, 2026-07-21)
1. Frase literal: "Bom dia" / "Voces tao abertos ate q horas?" / "Voces tem pausa pro almoço?" /
   "Quanto custa a impressão?" / "Preto e branco mesmo, vao ser entorno de 8" / "Posso te mandar
   aqui e ir buscar la pras 12h?" / vários comprovantes/documentos enviados / "Daqui a 20 minutos
   chego" / "Pra pegar" / "O pagamento eu faço quando pegar?"
2. Produto real: IMPRESSÃO P&B A4 (cerca de 8 folhas — comprovantes/CamScanner/histórico de
   créditos)
3. Primeira resposta substantiva da equipe: "ate as 18h" / "Funcionamos de segunda à sexta\nDas
   07:00 às 18:00h\nnão fechamos para almoço." / "Oi, Guilherme! impressão preto e branco 1,20 ou
   colorida 2,20 em papel ofício, se for outro tipo de papel, informe para passar o valor. 😉"
4. Contaminação: não observada.

## 558194759879 — ped-1623 — IMPRESSÃO P&B A4 (entregue, 2026-07-27)
1. Frase literal: documento + "Bom dia imprimi por favor" / "Passando pra buscar" / "Pb" (preto e
   branco) / "Ok passando pra buscar"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Obrigado" (não descritiva; nenhuma mensagem de
   diagnóstico do pedido registrada).
4. Contaminação: não observada.

## 558194917629 — ped-0702 (cancelado) / ped-0703 — FOTO 3X4 (6 FOTOS) (entregue, 2026-07-10)
1. Frase literal: "Boa tarde, em relação as fotos 3×4, vcs tiram foto aí ou precisa enviar só pra
   impressão?" / "Certo, de que horas fecha?" / "Ok" / "Já estou indo" / imagem enviada.
2. Produto real: FOTO 3X4 (6 FOTOS)
3. Primeira resposta substantiva da equipe: "ok" (não descritiva — a pergunta sobre "tirar foto aí
   vs. enviar pra impressão" não foi respondida em texto na janela).
4. Contaminação: não observada.

## 558194953225 — ped-1252/1253/1254 — IMPRESSÃO P&B A4 + SCANNER + IMPRESSÃO COLORIDA OFÍCIO A4
(entregue, 2026-07-20)
1. Frase literal: "Oi" — depois documento com legenda "NOVA PROCURAÇÃO 2026.docx - Google Docs.pdf"
   (nome do arquivo, indica documento de procuração).
2. Produto real: IMPRESSÃO P&B A4 + SCANNER + IMPRESSÃO COLORIDA OFÍCIO A4 (procuração — provável
   digitalização + impressão colorida + P&B do mesmo documento).
3. Primeira resposta substantiva: nenhuma em texto — só o código Pix enviado.
4. Contaminação: não observada.

## 558194998208 — ped-0697 — IMPRESSÃO 2ª VIA CONTA (cancelado, 2026-07-10)
1. Frase literal: **nenhuma mensagem do cliente em toda a janela** — as únicas 2 mensagens
   encontradas são da equipe. Registrando como caso especial: não é "sem log" (há log, mas só do
   lado da equipe) nem "só mídia" (não há mídia do cliente tampouco) — é ausência total de
   mensagem do cliente na janela apesar de haver conversa da equipe.
2. Produto real: IMPRESSÃO 2ª VIA CONTA (conta de luz, conforme texto da equipe) — pedido no fim
   marcado como cancelado.
3. Primeira resposta substantiva da equipe: "esta impresso valor 2,20" / "A conta da luz já tá
   impressa, sim. Pode vir buscar! 😉"
4. Contaminação: não observada.

## 558195027393 — ped-0287/0288/0289 — PLASTIFICAÇÃO A4 + ENVELOPE A4 + IMPRESSÃO PAPEL CARTÃO A4
180G (só frente) (entregue, 2026-07-07)
1. Frase literal: SEM TEXTO — só mídia (2 imagens seguidas, sem legenda).
2. Produto real: PLASTIFICAÇÃO A4 + ENVELOPE A4 + IMPRESSÃO PAPEL CARTÃO A4 180G
3. Primeira resposta substantiva: nenhuma registrada na janela.
4. Contaminação: não observada.
