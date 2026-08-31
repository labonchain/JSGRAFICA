# Lote 00 — 28 telefones — Pesquisa de linguagem real do cliente

Metodologia: `to_timestamp(data_timestamp/1000.0)` (ms), hora local `America/Recife`,
`is_group=false`, `apagada_em IS NULL`. Match por últimos 11 dígitos (ou `phone`/`contact_lid`
direto para `@lid`). Janela por telefone: -6h antes do primeiro pedido até +48h depois do
último pedido do mesmo telefone (cobre todos os pedidos do telefone numa só janela, quando
próximos).

---

## 1. 255949986103392@lid — Marcia Carvalho — IMPRESSÃO 2ª VIA CONTA
1. **Frase literal do cliente**: SEM TEXTO — nenhuma mensagem do cliente recuperada. Verificado
   sem restrição de janela, todo o histórico ligado a esse `@lid` (06/07 a 30/07): as ÚNICAS
   mensagens no log são `from_me=true` (saem da JS Gráfica), e são 100% cardápio diário de
   "Dizu Refeições" (quentinha) — nada relacionado à impressão.
2. **Produto real do pedido**: IMPRESSÃO 2ª VIA CONTA (`ped-1866`, entregue, 30/07).
3. **Primeira resposta da equipe**: não há resposta relacionada ao pedido de impressão no log —
   só o disparo automático de cardápio de quentinha.
4. **Contaminação**: CRÍTICA E TOTAL. Esse `@lid` está 100% poluído por outro negócio (Dizu
   Refeições — cardápio de quentinhas, broadcast diário). Há inclusive uma mensagem interna
   (09/07) dizendo "WhatsApp bloqueou o número da Dizu, vamos continuar atendendo os Almoços
   pela JS Gráfica mesmo" — confirma que os dois negócios compartilham a mesma instância/número
   de WhatsApp. Nenhum traço da conversa real do pedido de impressão está neste log.

---

## 2. 5511930900121 — Solfácil — DIGITAÇÃO DE PROVAS
1. **Frase literal do cliente**: SEM LOG DE CONVERSA — confirmado sem nenhuma mensagem no log
   (com ou sem filtro de janela, grupo ou exclusão) para esse telefone.
2. **Produto real do pedido**: DIGITAÇÃO DE PROVAS (`ped-1044`, entregue, 16/07).
3. **Primeira resposta da equipe**: não há.
4. **Contaminação**: não aplicável (sem log).

---

## 3. 554192475364 — Rob Gol — ENVELOPE A4 (+ IMPRESSÃO P&B A4)
1. **Frase literal do cliente**: "Oi"
2. **Produto real do pedido**: ENVELOPE A4 e IMPRESSÃO P&B A4 (4 pedidos no mesmo minuto,
   `ped-0493` a `ped-0496`, 2 cancelados, 2 entregues, 09/07).
3. **Primeira resposta da equipe**: não há resposta de texto da equipe na janela — cliente mandou
   "Oi" e em seguida 3 PDFs em sequência ("laudos-medicos (23/24/25).pdf") sem legenda; pedido
   foi processado sem resposta textual registrada.
4. **Contaminação**: nenhuma.

---

## 4. 556799634051 — Rodoprima — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: "Oi" (depois envia um documento sem legenda; depois "Ok")
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0157`, entregue, 06/07).
3. **Primeira resposta da equipe**: "Pedido confirmado! 😊\n\n🖨️ *IMPRESSÃO P&B A4*\n💰 R$ 1.20\n\nAssim que estiver pronto eu te aviso 😊" — mensagem automática de confirmação de pedido (sem pergunta prévia de especificação; o pedido foi feito direto do arquivo enviado).
4. **Contaminação**: nenhuma.

---

## 5. 558171188980 — Ideal Rações — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: SEM TEXTO no envio do pedido — só imagem sem legenda. Depois do
   pedido pronto, cliente escreveu "obg tbm".
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0778`, entregue, 13/07).
3. **Primeira resposta da equipe**: "Obrigado. 😉" (após receber a imagem, sem pedir
   especificação).
4. **Contaminação**: nenhuma.

---

## 6. 558173167632 — cliente identificado no log como "Naty" (pedido registrado como "J S Gráfica") — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: "V enviar uns papel pra vc imprimir quando eu subir" / "Por favor
   imprimir" / "Esses documentos" (mandados junto com um PDF "04-Laudo Médico e Receituário.pdf").
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0470`, entregue, 09/07).
3. **Primeira resposta da equipe**: "bom dia" (resposta simples, sem pergunta de especificação —
   o pedido foi processado direto do PDF enviado).
4. **Contaminação**: nenhuma; mas atenção — `lead_name` no log é "Naty", diferente do
   `nome_cliente` do pedido ("J S Gráfica" — provavelmente nome de contato salvo errado/genérico
   no sistema, não é contaminação de outro negócio).

---

## 7. 558173286983 — Thaynara Rayane — AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO
1. **Frase literal do cliente**: "Precisa não" / "Bom dia!" ... depois, sobre o Pix: "Seria
   quanto?" / "Me envia antes" / "Pra me ver como ficou" / "Por favor" / depois de receber:
   "Perfeito 😍👏🏻" / "Muito obrigada".
2. **Produto real do pedido**: AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO (`ped-0948`,
   entregue, 15/07).
3. **Primeira resposta da equipe**: "qual sera a forma de pagamento?"
4. **Contaminação**: nenhuma.

---

## 8. 558173474120 — contato "SERGIO FERREIRA" (pedido "J S Gráfica") — IMPRESSÃO P&B A4 + IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
1. **Frase literal do cliente**: SEM TEXTO — só um documento sem legenda (nenhuma mensagem de
   texto em toda a janela).
2. **Produto real do pedido**: IMPRESSÃO P&B A4 e IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
   (`ped-0845`/`ped-0846`, entregues, 14/07).
3. **Primeira resposta da equipe**: não há resposta de texto registrada na janela.
4. **Contaminação**: nenhuma óbvia; nome de contato ("SERGIO FERREIRA") diverge do
   `nome_cliente` do pedido ("J S Gráfica").

---

## 9. 558174012831 — João Vitor — IMPRESSÃO 2ª VIA CONTA
1. **Frase literal do cliente**: SEM LOG DE CONVERSA — confirmado sem nenhuma mensagem no log
   para esse telefone (checado sem restrição de janela/grupo).
2. **Produto real do pedido**: IMPRESSÃO 2ª VIA CONTA (`ped-1908`, entregue, 30/07).
3. **Primeira resposta da equipe**: não há.
4. **Contaminação**: não aplicável (sem log).

---

## 10. 558179068274 — Lucas Vinicius — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) + IMPRESSÃO P&B A4
1. **Frase literal do cliente**: "Bom dia" / "Estão abertos já?" ... "Tô indo fazer uma
   impressões aí" / "Pode ir imprimindo?" (enviando PDF "0 - Processo completo_removed.pdf")
   / "Pegou em 15 minutos" ... depois, sobre cor: "Sim" / "Colorida".
2. **Produto real do pedido**: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) e IMPRESSÃO P&B A4
   (`ped-1193`/`ped-1194`, entregues, 20/07).
3. **Primeira resposta da equipe**: "Bom dia, Lucas! Já estamos abertos sim. 😉 Em que posso te
   ajudar?" — e depois, especificando o pedido: "o primeiro arquivo tem 13 folhas, é para
   imprimir todas?" / "impressão colorida 2,20 cada folha e preto e branco 1,20 cada folha, vai
   querer preto e branco ou colorida?"
4. **Contaminação**: nenhuma.

---

## 11. 558179151792 — Minho — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: "Boa tarde" / "Por favor tirar essas cópias" (com 6 imagens
   enviadas antes) ... depois de perguntado: "Uma de cada" / "Colorido não" / "Separados" /
   "Vou aí paagar".
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-1139`, entregue, 17/07).
3. **Primeira resposta da equipe**: "Boa tarde! Pra te dar o valor certinho, preciso saber
   quantas cópias de cada imagem você quer e se é colorido ou preto e branco, em folhas
   separadas ou todos junto, me diz aí que já te passo! 😉"
4. **Contaminação**: nenhuma.

---

## 12. 558181026432 — Pedro Henrique — IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) + PLASTIFICAÇÃO A4 (ambos cancelados)
1. **Frase literal do cliente**: "Vcs entrega almoço" / "Vc é de onde ?" ... "Estou no cabo" /
   "Pedi no grupo e me informaram teu contato" / "Ok" / "Obrigado".
2. **Produto real do pedido**: IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) e PLASTIFICAÇÃO A4
   (`ped-0893`/`ped-0894`, AMBOS CANCELADOS, 14/07).
3. **Primeira resposta da equipe**: "ur3 ibura temos entrega com taxa" (respondendo sobre entrega,
   não sobre o produto em si).
4. **Contaminação**: pergunta inicial do cliente ("Vcs entrega almoço") é sobre entrega de comida
   — pode ser confusão com outro negócio (mesma linha de "quentinha"/entrega vista no telefone
   #1), mas a resposta da equipe foi sobre entrega de encomenda/gráfica mesmo, e o pedido
   (adesivo/plastificação) acabou cancelado — plausivelmente o cliente desistiu ao perceber que
   não era o negócio de comida. Registrar como suspeita de contaminação/confusão de negócio, não
   como conversa genuína sobre o produto gráfico.

---

## 13. 558181109498 — Cleonice — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: SEM TEXTO relevante ao pedido — envia documento sem legenda,
   depois só o número "12726" (provável código/protocolo) e um sticker.
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0748`, entregue, 13/07).
3. **Primeira resposta da equipe**: "Obrigado" (sem pergunta de especificação).
4. **Contaminação**: nenhuma.

---

## 14. 558181293971 — Maria Das Neves — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: SEM TEXTO — só 2 documentos enviados sem nenhuma legenda ou
   mensagem de texto em toda a janela.
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0404`, entregue, 08/07).
3. **Primeira resposta da equipe**: não há resposta de texto registrada na janela.
4. **Contaminação**: nenhuma.

---

## 15. 558181373081 — Renata Karina — AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO
1. **Frase literal do cliente**: "Olá bom dia" / "Renata Karina\n21/10/1997\nKarinatata1997@gmail.com"
   / "Gostaria dos meus antecedentes criminais" / "Federal e estadual" / (dados dos pais)
   "71364473488\nSimone Souza da Silva \nMaurício Sérgio da Silva" / "Pode passar o pix por
   favor" / "Que bom" (após receber).
2. **Produto real do pedido**: AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO (`ped-1041`,
   entregue, 16/07).
3. **Primeira resposta da equipe**: não há pergunta explícita registrada antes do Pix — a equipe
   coletou os dados e enviou o Pix diretamente ("o pix").
4. **Contaminação**: nenhuma.

---

## 16. 558181471787 — Isaias Junior — IMPRESSÃO COLORIDA OFÍCIO A4 (laser) + IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
1. **Frase literal do cliente**: SEM TEXTO — só um documento e uma imagem, ambos sem legenda, em
   toda a janela.
2. **Produto real do pedido**: IMPRESSÃO COLORIDA OFÍCIO A4 (laser) e (jato tinta) (`ped-1682`/
   `ped-1683`, entregues, 28/07).
3. **Primeira resposta da equipe**: não há resposta de texto registrada na janela.
4. **Contaminação**: nenhuma.

---

## 17. 558181549468 — Myrna Jamir — IMPRESSÃO COLORIDA OFÍCIO A4 (laser) + IMPRESSÃO PAPEL COUCHÊ A4 250G + IMPRESSÃO PAPEL ADESIVO A4 192G + IMPRESSÃO COLORIDA OFÍCIO A4 (laser)
1. **Frase literal do cliente**: SEM TEXTO descrevendo o pedido em si — envia 4 imagens sem
   legenda, depois "Myrna Roberta Vieira jamir \nCPF 05487107408" (dados pessoais), "Nota fiscal",
   "Obg".
2. **Produto real do pedido**: 4 itens de impressão (laser, couchê, adesivo, laser) — `ped-1775`
   a `ped-1778`, 29/07 (1 pronto, 3 entregues).
3. **Primeira resposta da equipe**: não há resposta de texto da equipe registrada na janela (só
   mensagens do cliente).
4. **Contaminação**: nenhuma.

---

## 18. 558181692717 — contato salvo como "ㅤ ㅤ〻" (nome ilegível/emoji) — XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4
1. **Frase literal do cliente**: SEM TEXTO — só um documento sem legenda em toda a janela.
2. **Produto real do pedido**: XEROX PRETO E BRANCO A4 e IMPRESSÃO P&B A4 (`ped-0803`/`ped-0804`,
   entregues, 13/07).
3. **Primeira resposta da equipe**: "Obrigado 😉"
4. **Contaminação**: nenhuma de outro negócio; nome de contato é ilegível/vazio por caracteres
   Unicode invisíveis (padrão já documentado em `project_pendencia_184_contatos_emoji.md`).

---

## 19. 558181863430 — Paulo André — 6 itens (XEROX P&B, IMPRESSÃO COLORIDA jato tinta, XEROX COLORIDA, ENVELOPE A4, AGENDAMENTO/CURRÍCULO/..., PLASTIFICAÇÃO A4)
1. **Frase literal do cliente**: SEM TEXTO — só um documento sem legenda; depois só uma mensagem
   vazia (`message_text`/`caption` nulos, sem `media_type`) sem conteúdo recuperável.
2. **Produto real do pedido**: 6 itens diferentes no mesmo pedido/lote (`ped-1155` a `ped-1160`,
   17/07, todos entregues).
3. **Primeira resposta da equipe**: "Obrigado 😊"
4. **Contaminação**: nenhuma.

---

## 20. 558182045365 — Ítalo Roberto — IMPRESSÃO COLORIDA OFÍCIO A4 (laser) + XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4 + ENVELOPE A4
1. **Frase literal do cliente**: "Bom dia" / "Tem algum modelo de declaração de residência?" /
   "Poderia mandar um por favor?" / "Pix" ... depois (mais tarde no mesmo dia) envia documentos e
   um código "20260710AC4565EC9" (provável nº de processo/protocolo, não é fala espontânea sobre
   o produto).
2. **Produto real do pedido**: 4 itens de impressão, todos entregues (`ped-1867`, `ped-1883/1884/1885`, 30/07).
3. **Primeira resposta da equipe**: não há resposta de texto explicando o pedido — a equipe só
   envia o Pix diretamente após o cliente pedir o modelo de declaração de residência.
4. **Contaminação**: nenhuma.

---

## 21. 558182192010 — Cristiane Negromonte — RECARGA CELULAR 50,00
1. **Frase literal do cliente**: SEM TEXTO descritivo do pedido — envia comprovante e uma imagem,
   depois dados pessoais "Cristiane Negromonte G da Silva \n11/12/1976\nnegromontecristiane@gmail.com"
   (provavelmente pros dados da recarga/nota).
2. **Produto real do pedido**: RECARGA CELULAR 50,00 (`ped-1284`, entregue, 20/07).
3. **Primeira resposta da equipe**: não há resposta de texto da equipe registrada na janela.
4. **Contaminação**: nenhuma.

---

## 22. 558182243517 — Mirian — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: "boa tarde" / "quanto esse boleto" / "pode fazer jaja pego" /
   "qual o valor por favor" (referindo-se a um documento "Contrato de prestação de serviço"
   enviado 3x) / "jaja eu pego ok" / "pode fazer tou no ônibus meia hora eu chego".
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0752`, entregue, 13/07).
3. **Primeira resposta da equipe**: "pode vir buscar"
4. **Contaminação**: nenhuma.

---

## 23. 558182707600 — Ana Karla🥰😘😍 — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: SEM TEXTO — só um documento sem legenda, nenhuma outra
   mensagem no log deste telefone (verificado sem restrição de janela também).
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-1851`, entregue, 30/07).
3. **Primeira resposta da equipe**: não há.
4. **Contaminação**: nenhuma.

---

## 24. 558183039715 — Ubiratan — IMPRESSÃO P&B A4 (dois pedidos, dias diferentes)
1. **Frase literal do cliente**: SEM TEXTO — apenas 1 documento sem legenda em 09/07 (verificado
   sem restrição de janela: não há nenhuma outra mensagem de texto associada a este número, nem
   perto do segundo pedido em 20/07 — há só 1 outro registro de mídia isolado de fevereiro/26,
   fora de qualquer janela de pedido).
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0453` 09/07 e `ped-1260` "IMPRESSÃO 2ª VIA
   CONTA" 20/07, ambos entregues).
3. **Primeira resposta da equipe**: não há resposta de texto registrada.
4. **Contaminação**: nenhuma.

---

## 25. 558183106106 — Nathalia Soares — IMPRESSÃO P&B A4
1. **Frase literal do cliente**: "Oi boa tarde" / "Tá funcionando ou está no horário de almoço?"
   / "Seria pra imprimir" / "Eu posso mandar a imagem aqui" / "Me mandar o Pix que só vou buscar"
   / "E se não for muito encômodo, você teria 9 reais em espécie pra eu lhe mandar em Pix? Já lhe
   mandaria aqui agora e passaria aí pra pegar a imagem e o dinheiro!" / "Seria preto e branco,
   pra Levar pro trabalho" / "Muito obrigada viu".
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0409`, entregue, 08/07).
3. **Primeira resposta da equipe**: ATENÇÃO — a primeira mensagem `from_me=true` na janela é o
   MESMO template de cardápio de quentinha ("Bom dia, cardápio dia 08/07/26...") visto no
   telefone #1 — contaminação cruzada confirmada, não é resposta real da equipe pro cliente. A
   primeira resposta REAL da equipe, depois que a cliente estranhou ("Seria pra imprimir"), foi:
   "desculpe" seguido de "estamos atendendo, não fechamos para almoço." e depois "envie a imagem,
   impressão preto e branco 1,20 ou colorida 2,20".
4. **Contaminação**: SIM — mesmo padrão de contaminação do telefone #1 (broadcast automático de
   cardápio "Dizu Refeições" disparado sobre esse número/instância antes da conversa real
   começar). A cliente inclusive reage a isso confusa ("Tá funcionando ou está no horário de
   almoço?"), e a equipe se desculpa. É evidência adicional de que o disparo de cardápio de
   quentinha atinge contatos da JS Gráfica indiscriminadamente.

---

## 26. 558183140241 — Cristiane S. Santos — carteirinha
1. **Frase literal do cliente**: "Boa tarde" / "Vc já tem os modelos da carteira.. Obgda" /
   "Esses não específica a deficiência ou a carteira já mostra pelo modelo" / "Vc vai colocar
   perda auditiva ou só o Cid" / dados pessoais completos (nome, CPF/nascimento, tipo sanguíneo,
   contatos de emergência) / "Irei aí, no final da tarde.. Obgda".
2. **Produto real do pedido**: carteirinha (`ped-0907`, entregue, 14/07 — carteirinha de
   deficiência/identificação, plastificada, tamanho identidade).
3. **Primeira resposta da equipe**: "O valor é de 10,00 ela fica do tamanho da identidade já
   plastificada." (a única resposta de texto da equipe registrada — as perguntas anteriores da
   cliente sobre modelo/Cid não têm resposta de texto capturada no log, possivelmente
   respondidas por áudio/ligação).
4. **Contaminação**: nenhuma.

---

## 27. 558183246828 — Guilherme Souza — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
1. **Frase literal do cliente**: "Bom dia !!" / "Poderia edita um currículo pfv" / "Está em pdf"
   ... depois de pedido de detalhes: "Rua Primeira travessa são Rafael" / "Bairro.. penedo" /
   "Cidade: são Lourenço da mata" / "CEP 54715801" / "Número 03" / "Troca o endereço" / "E
   agregar uma experiência" / "Empresa ultra limpo \nFunção porteiro \nPerdido 1 ano" / "E bota
   uma obs possuo moto própria" / "Mande o pix".
2. **Produto real do pedido**: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) (`ped-1795`, status
   "confirmado", 29/07 — pedido de edição+impressão de currículo).
3. **Primeira resposta da equipe**: "mande e informe oq ira alterar"
4. **Contaminação**: nenhuma.

---

## 28. 558183344493 — Poliana Odete — IMPRESSÃO P&B A4 (2 pedidos no mesmo dia)
1. **Frase literal do cliente**: "Bom dia!" / "Imprimi isso por favor,jaja vou buscar." (junto
   com PDF "Júlio César da Silva Alves.pdf").
2. **Produto real do pedido**: IMPRESSÃO P&B A4 (`ped-0355` e `ped-0361`, ambos entregues, 08/07).
3. **Primeira resposta da equipe**: "Pedido confirmado! 😊\n\n🖨️ *IMPRESSÃO P&B A4*\n💰 R$ 1.20\n\nAssim que estiver pronto eu te aviso 😊\n\nSeu pedido (IMPRESSÃO P&B A4) entrou em produção! 🖨️\n\nProntinho! Seu pedido já está pronto pra retirada 😊" (mensagem automática consolidada).
4. **Contaminação**: nenhuma.

---

## Resumo quantitativo do lote

- **Total coberto**: 28 / 28 (100%, nenhum pulado)
- **Com texto real do cliente descrevendo/negociando o pedido**: 15 (telefones 3, 4, 6, 7, 10,
  11, 12*, 15, 20, 21*, 22, 25, 26, 27, 28) — *#12 e #21 têm texto mas não descrevendo o
  produto em si (entrega/dados pessoais)
- **"SEM TEXTO — só mídia"** (cliente só mandou arquivo/imagem sem nenhuma legenda ou mensagem):
  11 (telefones 5, 8, 13, 14, 16, 17, 18, 19, 21, 23, 24) — nota: #17 e #21 têm outras mensagens
  de texto (dados pessoais), mas não descrevendo o pedido em si; contadas aqui por terem
  documento/imagem como o "pedido" propriamente dito
- **"SEM LOG DE CONVERSA"** (zero mensagem no log, verificado sem restrição de janela): 2
  (telefones 2 = 5511930900121, 9 = 558174012831)
- **Contaminação crítica confirmada** (broadcast de "Dizu Refeições"/quentinha disparado sobre
  contatos da JS Gráfica, mesma instância de WhatsApp): 2 casos diretos — telefone #1
  (255949986103392@lid, contaminação TOTAL — nenhuma mensagem real sobre o pedido de impressão
  sobrevive no log) e telefone #25 (558183106106, contaminação parcial — primeira mensagem
  "da equipe" é na real o cardápio, mas a conversa real sobre impressão continua depois).
- **Suspeita de confusão com outro negócio** (não confirmada como contaminação de log, mas
  cliente claramente confundiu o WhatsApp): telefone #12 (558181026432, "Vcs entrega almoço?",
  pedido cancelado em seguida).

## Frases mais reveladoras (para taxonomia de linguagem do cliente)

1. **558179068274**: "Tô indo fazer uma impressões aí" / "Pode ir imprimindo?" — cliente já a
   caminho, pede pra equipe adiantar sem nem estar lá.
2. **558179151792**: "Por favor tirar essas cópias" — usa "cópias" mesmo pra impressão de
   imagem, não xerox de documento físico.
3. **558181026432**: "Vcs entrega almoço" — confusão direta com negócio de comida no mesmo
   WhatsApp (evidência de contaminação/UX ruim de contato compartilhado).
4. **558183106106**: "Tá funcionando ou está no horário de almoço?" — reação da cliente ao
   receber cardápio de quentinha por engano, achando que é sobre horário de funcionamento da
   gráfica.
5. **558183106106**: "E se não for muito encômodo, você teria 9 reais em espécie pra eu lhe
   mandar em Pix? Já lhe mandaria aqui agora e passaria aí pra pegar a imagem e o dinheiro!" —
   cliente propondo Pix + troco combinados, mostra fricção de pagamento fracionado.
6. **558183140241**: "Esses não específica a deficiência ou a carteira já mostra pelo modelo" —
   linguagem técnica/específica de carteirinha de PCD, cliente já entende do produto.
7. **558183246828**: "Poderia edita um currículo pfv" / "Troca o endereço" / "E agregar uma
   experiência" — pedido de edição de conteúdo (não só impressão), tratando a gráfica como
   serviço de "montar currículo".
8. **558173167632** ("Naty"): "V enviar uns papel pra vc imprimir quando eu subir" — aviso prévio
   informal, uso de "papel" no lugar de "documento/arquivo".
9. **558182243517**: "pode fazer jaja pego" — padrão recorrente de "eu chego já/jaja" antes de
   confirmar pagamento presencial.
10. **558181373081**: "Gostaria dos meus antecedentes criminais" — pedido de serviço de terceiros
    (certidão), não de impressão pura — mostra a gráfica como ponto de "resolve documentos".
11. **558181109498**: "12726" — cliente manda só um número de protocolo, sem nenhuma frase,
    esperando que a equipe entenda o contexto pelo documento já enviado.
12. **558173286983**: "Me envia antes / Pra me ver como ficou / Por favor" — pedido explícito de
    conferência visual antes de pagar (prova/preview).
13. **554192475364**: cliente manda "Oi" e, sem mais nenhuma palavra, 3 PDFs em sequência
    ("laudos-medicos") — pedido 100% autoexplicativo pelo nome do arquivo.
14. **558183106106**: "Seria preto e branco, pra Levar pro trabalho" — cliente justifica o uso
    final do impresso, não só especifica o produto.
15. **255949986103392@lid / 558183106106**: "Bom dia, cardápio dia .../.../26 ... Quentinha
    média 14,0 ..." — não é fala de cliente, é o próprio ruído/contaminação que mais aparece no
    lote e precisa ser filtrado explicitamente de qualquer taxonomia.
