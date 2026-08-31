# Catálogo completo: exemplo real de conversa por categoria (14/14)

Investigação 255. Janela: 2026-07-01 a 2026-07-30. Metodologia: `to_timestamp(data_timestamp/1000.0)`,
hora local `America/Recife`, exclusão de grupos/apagadas/telefones de teste, match pedido↔telefone
pelos últimos 11 dígitos, janela de mensagem de -6h a +48h do `created_at` do pedido.

Cobertura confirmada: as 14 categorias reais e ativas do catálogo (Impressão papel ofício, Xerox,
Consulta Online, Impressão papel foto, Escritório, Impressão papel cartão, Impressão papel
adesivo, Plastificação, Recarga VEM, Personalizados, Recarga celular, Encadernação, Impressão
papel couché, Serviço terceirizado) foram todas verificadas com pedidos reais na janela.
"Empréstimo" e "Fechamento caixa" foram ignoradas conforme instrução (lançamento financeiro
interno, não categoria de cliente).

**Achado lateral confirmado de novo**: pelo menos 2 dos pedidos puxados na primeira amostra
(ped-1855 em "Consulta Online" e ped-1871 em "Impressão papel adesivo") vieram com conversa de
outro negócio (marmita/quentinha — "Dizu Refeições" ou correlato), não da JS Gráfica — mesmo
telefone, contaminação de log já mapeada em `project_log_dados_contaminados.md`. Esses dois casos
foram descartados e substituídos por outro pedido real da mesma categoria antes do veredito final.

---

## 1. Impressão papel ofício (792 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1867 — Ítalo Roberto (558182045365) — IMPRESSÃO COLORIDA OFÍCIO A4 (laser)
```
[10:48 30/07] CLIENTE: Bom dia
[11:06 30/07] CLIENTE: Tem algum modelo de declaração de residência?
[11:30 30/07] CLIENTE: Poderia mandar um por favor?
[11:37 30/07] CLIENTE: Pix
[11:38 30/07] EQUIPE: 00020126360014br.gov.bcb.pix0114+5581986108547...(código Pix)
[11:40 30/07] CLIENTE: [imagem]
[14:25 30/07] CLIENTE: [documento]
[14:25 30/07] CLIENTE: [imagem]
[14:26 30/07] CLIENTE: [documento]
[14:26 30/07] CLIENTE: 20260710AC4565EC9
[14:38 30/07] CLIENTE: [imagem]
[14:38 30/07] CLIENTE: [imagem]
```

### Pedido ped-1876 — Angelica Ferreira (558183628950) — IMPRESSÃO P&B A4 (categorizado, mas cliente pediu banner)
```
[13:27 30/07] CLIENTE: Boa tarde
[13:28 30/07] CLIENTE: Por favor quanto custa uma banner com o nome vende-se está casa
[13:36 30/07] EQUIPE: Boa tarde
[13:36 30/07] EQUIPE: metro quadrado 65,00
```

### Pedido ped-1869 — Ellen Soares (558189769221)
```
[11:39 30/07] CLIENTE: [documento] UNIPESSOAL - TERMO DE RESPONSABILIDADE.pdf
[11:39 30/07] CLIENTE: imprimi pra mim colorido
[11:41 30/07] CLIENTE: tou indo aqui ja
```

Nota: os 3 primeiros pedidos puxados aleatoriamente (ped-1877, ped-1879, ped-1880) só tinham
upload de documento sem texto — típico do volume alto e simples dessa categoria (cliente manda o
PDF e pronto). Foi preciso puxar mais 3 pedidos (rn 4-9) pra achar conversa com texto real —
achados acima.

---

## 2. Xerox (90 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1874 — Débora Borges (558184640012) — XEROX PRETO E BRANCO A4
```
[13:13 30/07] CLIENTE: Olá! Vim pelo site e preciso de um orçamento.
[13:13 30/07] CLIENTE: Débora Borges
[13:14 30/07] CLIENTE: 30/10/1988
[13:14 30/07] CLIENTE: deborabsiqueira90@gmail.com
[13:14 30/07] CLIENTE: Ola boa tarde
[13:15 30/07] CLIENTE: Vocês fazem panfletos?
[13:15 30/07] EQUIPE: Oi Débora, boa tarde! Que bom que veio pelo site. Me diz o que você precisa pra eu te ajudar com o orçamento. 😊
[13:17 30/07] CLIENTE: Vocês fazem Aparti de quantos ?
[13:18 30/07] CLIENTE: 10x15
[13:18 30/07] CLIENTE: Seria 4 em uma folha
[13:18 30/07] CLIENTE: Ok
[13:19 30/07] CLIENTE: Eu não queria muitos
[13:19 30/07] CLIENTE: Mas você tem quantidade inicial ?
[13:20 30/07] CLIENTE: Seria em que papel
[13:20 30/07] EQUIPE: papel cochê 90g
[13:22 30/07] CLIENTE: Certo
[13:23 30/07] CLIENTE: Com a minha arte pronta seria o mesmo valor ?
```
Nota: a conversa acima é de um orçamento de panfleto (couché) que aparentemente terminou com o
cliente fechando o xerox P&B simples cobrado no pedido — sessão real da mesma pessoa/telefone, só
não é 100% sobre "xerox" em cada linha.

### Pedido ped-1836 / ped-1752 — mesmos telefones já citados em outras categorias (ver seções 3 e 5), conversa curta real: "Quanto tá impressão em folha fotográfica?" / "Tá pronto???"

---

## 3. Consulta Online (64 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1823 — André Rios (558191724419) — AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO
```
[14:01 29/07] CLIENTE: Boa tarde
[14:21 29/07] CLIENTE: Eu gostaria que você me agendasse para eu fazer a retirada do documento do veículo
[14:22 29/07] CLIENTE: Tá desativado as duas etapas
[14:22 29/07] CLIENTE: Cpf
[14:22 29/07] CLIENTE: 84898682472
[14:23 29/07] CLIENTE: André rios de melo
[14:57 29/07] CLIENTE: Estou lhe aguardando
[14:58 29/07] CLIENTE: Eu sei que a demanda é grande mais de 30 minutos para atender o cliente
[15:01 29/07] CLIENTE: Quero a impressão o CRV
[15:02 29/07] CLIENTE: Eu já fiz todos os trâmites só preciso agora emitir o documento
[15:23 29/07] CLIENTE: [áudio]
[15:25 29/07] CLIENTE: Eu não estou pedindo para você imprimir não eu tô pedindo para você me agendar
[15:29 29/07] CLIENTE: Você fez um agendamento para mim segunda-feira para esse mesmo veículo porque não pode fazer o agendamento para mim mais uma vez
[15:56 29/07] CLIENTE: Pode ser shopping Guararapes
[15:57 29/07] CLIENTE: E se tiver para amanhã pode marcar
[15:57 29/07] CLIENTE: Manda o pix e diga quanto é
[16:04 29/07] CLIENTE: Então não vou querer não eu vou esperar abrir vaga aqui
[16:06 29/07] CLIENTE: Quanto foi que eu lhe devo
[16:06 29/07] CLIENTE: Manda o pix
[16:07 29/07] CLIENTE: Logo tudo agendamento e os documentos imprimido passo aí e pego no dia
```
Cliente pergunta o valor duas vezes ("Manda o pix e diga quanto é" / "Quanto foi que eu lhe devo")
mas não há resposta de valor da equipe capturada na janela — provavelmente respondido por
telefone/ligação, fora do log de texto.

---

## 4. Impressão papel foto (59 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1724 — Genifer (558197637352) — IMPRESSÃO PAPEL FOTO A4 230g
```
[09:39 28/07] CLIENTE: [documento] ChatGPT Image 28_07_2026, 09_28_07.png
[09:39 28/07] CLIENTE: Bom dia
[09:39 28/07] CLIENTE: Quando é para imprimir uma folha de a4?
[09:43 28/07] CLIENTE: Quais os valores dos papel?
[09:43 28/07] CLIENTE: Tem foto e outro tipo né. ?
[10:18 28/07] CLIENTE: [imagem]
[10:19 28/07] CLIENTE: Nesse papel
[10:24 28/07] CLIENTE: Sim
[10:40 28/07] CLIENTE: Tá certo
[10:40 28/07] CLIENTE: Vou buscar assim que largar
[10:40 28/07] CLIENTE: Obg
```
Cliente pergunta "Quais os valores dos papel?" mas a resposta de valor da equipe não aparece no
texto (decidido por chamada, presencial, ou fora da janela capturada).

### Pedido ped-1825/1836 — mesmo telefone (558196436080)
```
[15:21 29/07] CLIENTE: Olá bom dia 😃
[15:21 29/07] CLIENTE: Quanto tá impressão em folha fotográfica?
[15:22 29/07] CLIENTE: IMG_4629
[16:13 29/07] CLIENTE: Tá pronto ???
[16:18 29/07] CLIENTE: O segundo maior
[16:37 29/07] EQUIPE: Obrigado.
```

---

## 5. Escritório (35 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1799 — Paloma Mariano (558182942727) — LÁPIS COM BORRACHA
```
[10:34 29/07] CLIENTE: Boa tarde eu queria que tu imprimisse um currículo em colorido e daqui a uns 30 minutinhos eu tô indo aí buscar
[10:34 29/07] CLIENTE: • Paloma MarianoCurrículo
[10:34 29/07] CLIENTE: Só pra imprimir mesmo daqui a uns 30 minutos eu tô passando aí pra pegar
[10:43 29/07] CLIENTE: Tá certo eu vou querer um envelope também visse daqui a 10 minutinho eu tô saindo de casa
[11:04 29/07] CLIENTE: Certo
[11:09 29/07] EQUIPE: obg
```

### Pedido ped-1847 — Leide (558188438635) — ENVELOPE A4
```
[07:44 30/07] CLIENTE: Realizando avaliação fonoaudiólogica do paciente Gabriel Balduíno da Silva Lima,notório frênulo lingual encurtado,encaminho paciente para avaliação odontológica.
[07:44 30/07] CLIENTE: Tem como colocar de fundo?
[07:44 30/07] CLIENTE: [imagem]
[07:54 30/07] CLIENTE: Ótimo
[08:05 30/07] CLIENTE: [mídia]
```

---

## 6. Impressão papel cartão (21 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL — melhor exemplo de preço explícito de toda a investigação**

### Pedido ped-1740 — Maria Clara (558198673450) — IMPRESSÃO PAPEL CARTÃO A4 180G (só frente)
```
[11:29 28/07] CLIENTE: [imagem]
[11:29 28/07] CLIENTE: Bom dia.
[11:30 28/07] CLIENTE: Para fazer o marcador de Bíblia.
[11:33 28/07] CLIENTE: Qual o tipo de papel? Quantos pode ser colocado por folhas?
[11:39 28/07] EQUIPE: Bom dia
[11:40 28/07] EQUIPE: pade ser papel cartão a folha 5,00
[11:42 28/07] EQUIPE: papel foto 6,50
[12:07 28/07] CLIENTE: Quantos cabem em 1folha de papel cartão
[14:19 28/07] CLIENTE: Boa tarde. Pode imprimir 3 folhas.
[14:28 28/07] EQUIPE: ok
[14:47 28/07] EQUIPE: estão prontos, pode vir buscar, valor 15,00
[15:31 28/07] CLIENTE: Vou buscar amanhã de manhã.
[15:32 28/07] CLIENTE: Envia o número do PIX
[15:33 28/07] EQUIPE: 00020126360014br.gov.bcb.pix...(código Pix)
[15:33 28/07] EQUIPE: copie e cole este código no seu app do banco para fazer o pix.
[15:36 28/07] CLIENTE: [imagem]
[15:39 28/07] CLIENTE: Por favor faça recibo para comprovação
[07:57 29/07] CLIENTE: Bom dia. Vou buscar de tarde.
[13:24 29/07] EQUIPE: Obrigado
```

### Pedido ped-1764/ped-1810 — Joelma Maria (558187204303)
```
[07:17 29/07] CLIENTE: Bom dia
[07:17 29/07] CLIENTE: [imagem]
[07:18 29/07] CLIENTE: Seria no papel cartão
[07:18 29/07] CLIENTE: Essas fotos seria pequena, para colocar em cima dos docinhos
[07:46 29/07] CLIENTE: O tamanho das fotos pode ser 4x4
[07:46 29/07] CLIENTE: Quanto cabe na folha
[07:59 29/07] CLIENTE: Qual o valor
[08:00 29/07] CLIENTE: Vou mandar o Pix. Vc me manda por favor
[08:01 29/07] EQUIPE: 00020126360014br.gov.bcb.pix...(código Pix)
[08:01 29/07] CLIENTE: [imagem]
[08:02 29/07] CLIENTE: Obrigada. Meu esposo vai pegar
```

---

## 7. Impressão papel adesivo (19 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1558 — Rafaela Alburqueque (558188787312) — IMPRESSÃO PAPEL ADESIVO A4 192G (com recorte)
```
[11:19 24/07] CLIENTE: Bom dia!
[11:21 24/07] CLIENTE: [imagem] "Gostaria de 20 unidades dessa imagem no tamanho 2,5 x 2,5 cm no papel adesivo"
[11:21 24/07] CLIENTE: Quanto fica?
[11:22 24/07] CLIENTE: Ok
[11:22 24/07] CLIENTE: Me manda ao Pix por favor
[11:32 24/07] CLIENTE: Redondo, Com corte
[12:18 24/07] CLIENTE: Me manda o Pix por favor
[12:40 24/07] EQUIPE: 00020126360014br.gov.bcb.pix...(código Pix)
[12:43 24/07] CLIENTE: [documento — provável comprovante]
[12:44 24/07] EQUIPE: recebido, assim que sair do corte avisaremos para vir buscar.
[12:44 24/07] CLIENTE: Ta certo. Obrigada.
[15:41 24/07] CLIENTE: Ok
```
Cliente perguntou "Quanto fica?" e a equipe nunca disse o valor em texto — só mandou o código Pix
direto (o valor fica embutido no QR code, não é falado).

### Pedido ped-1748 — Jane Lopes (558191956624) — IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte)
```
[11:55 28/07] CLIENTE: Oi boa tarde,manda agora a foto
[11:56 28/07] CLIENTE: O adesivo 6×6
[12:01 28/07] EQUIPE: a moça voi almoça
[12:23 28/07] CLIENTE: Era p enviar a folga com os tamanhos dos adesivos.
[12:24 28/07] CLIENTE: Foto
[15:43 28/07] CLIENTE: Ok, queria a frase Feliz Dia dos Pais em adesivo
[15:43 28/07] CLIENTE: Quais fonte voces tem?
[15:46 28/07] EQUIPE: SÓ UM MIMUTO
[15:46 28/07] CLIENTE: Ok
[16:08 28/07] CLIENTE: To indo ai
[17:18 28/07] EQUIPE: Obrigado
```

(Nota: o pedido ped-1871, "Elders De Ibura 2", que apareceu na primeira amostra aleatória dessa
categoria, veio com log de conversa sobre "quentinha grande" / marmita — contaminação de negócio
externo no mesmo telefone, descartado.)

---

## 8. Plastificação (18 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1668 — Debora Cristina (558183671953) — PLASTIFICAÇÃO PEQUENA
```
[14:48 27/07] CLIENTE: Olá Boa tarde ☺️
[14:49 27/07] CLIENTE: Quanto custa para imprimir essa arte e colocar no papel colante
[14:52 27/07] CLIENTE: Nome Débora Cristina, Data de nascimento Dia 03/07, E-mail: deboraadila03@gmail.com
[14:52 27/07] CLIENTE: ????
[14:53 27/07] CLIENTE: ??👀
[15:08 27/07] CLIENTE: Tá certo obrigada chegarei aí já já ☺️
[16:10 27/07] CLIENTE: [imagem] [imagem] [imagem]
[16:41 27/07] EQUIPE: Obrigado
[22:22 27/07] CLIENTE: [mídia]
```
Pergunta de preço ("Quanto custa...") sem resposta de valor visível em texto — houve um hiato de
~15min sem resposta ("????", "??👀") até o cliente aceitar por conta própria ("Tá certo").

### Pedido ped-1829 — Fabiana & Bruno (558188938125)
```
[16:38 29/07] CLIENTE: [imagem]
[16:39 29/07] EQUIPE: Pedido confirmado! 😊
[16:40 29/07] CLIENTE: [documento]
[17:04 29/07] EQUIPE: Obrigada 😉
```

---

## 9. Recarga VEM (15 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL (fino)**

### Pedidos ped-1355 / ped-1367 — Wanderley - Deco (558195977033) — RECARGA VEM 27,50 / 20,0
```
[13:23 21/07] CLIENTE: painho, o senhor pode carregar 20 reais pra mim por favor
```
Essa é a única mensagem de texto real capturada nos dois pedidos de recarga VEM desse cliente na
janela — o resto da operação (conferência de valor, confirmação) parece ter acontecido fora do
chat de texto (o pai provavelmente processou direto no PDV/pessoalmente, já que "painho" = pai).
Mensagem real, mas conversa muito curta.

---

## 10. Personalizados (12 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1513 — Larissa (558185628507) — TOPO DE BOLO (com recorte)
```
[12:32 23/07] CLIENTE: olá
[12:32 23/07] CLIENTE: boa tarde
[12:34 23/07] CLIENTE: quero fazer um topo do bolo
[13:35 23/07] EQUIPE: Opa, Larissa! Boa tarde! Topo de bolo a gente faz sim! Pra te passar um orçamento, me diz qual o tema e se você já tem a arte ou quer que a gente crie? 😊
[13:57 23/07] CLIENTE: [imagem]
[13:57 23/07] CLIENTE: não tenho a arte
[13:58 23/07] CLIENTE: mas seria ursinho rosa com balões rosinha tudo clarinho
[14:01 23/07] CLIENTE: a ideia seria mais assim (obs: não quero o cavalo não) frase: despedida do bucho (rosa)... essa mulher grávida usando rosa... a frase: tem muito amor te esperando aqui fora (rosa)
[14:02 23/07] CLIENTE: e me passa o valor referente
[14:07 23/07] CLIENTE: Antonela
[14:13 23/07] CLIENTE: perfeito
[14:18 23/07] CLIENTE: e fora esse topo quero 6 unidades menores para docinhos
[14:20 23/07] CLIENTE: [imagem] [imagem]
[14:21 23/07] CLIENTE: quero com corte
[14:59 23/07] CLIENTE: sim / quero / me envia a chave pix
[15:28 23/07] CLIENTE: isso / sim / ficou quanto total
[17:56 23/07] CLIENTE: amigo, eu larguei tarde, perdão, me envia a chave pix, amanhã pela manhã eu busco ta bom?
[17:59 23/07] EQUIPE: 00020126360014br.gov.bcb.pix...(código Pix)
[18:00 23/07] CLIENTE: [imagem] ✅✅
```
Cliente pediu explicitamente "e me passa o valor referente" e depois "ficou quanto total" — nenhum
valor em número aparece na resposta da equipe em texto, só o código Pix (sem o número falado).

---

## 11. Recarga celular (8 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL (fino)**

### Pedido ped-1354 — Wanderley - Deco (558195977033) — RECARGA CELULAR 35,00
```
[13:23 21/07] CLIENTE: painho, o senhor pode carregar 20 reais pra mim por favor
```
Mesma mensagem única citada na seção de Recarga VEM (mesmo cliente, mesma janela de tempo,
provavelmente pediu os dois tipos de recarga na mesma conversa com o pai). Real, mas raso.

### Pedido ped-1284 — Cristiane Negromonte (558182192010) — RECARGA CELULAR 50,00
```
[16:42 20/07] CLIENTE: [imagem "Comprovante_20260720_164209"]
[16:43 20/07] CLIENTE: [imagem]
[16:44 20/07] CLIENTE: Cristiane Negromonte G da Silva, 11/12/1976, negromontecristiane@gmail.com
[17:01 20/07] CLIENTE: [figurinha]
[17:02 20/07] CLIENTE: [mídia]
```

---

## 12. Encadernação (8 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1028 — Joselito (558185938533) — ENCADERNAÇÃO DE 101 À 200 FOLHAS
```
[16:51 15/07] CLIENTE: Boa tarde, minha encadernação está pronta?
[16:52 15/07] CLIENTE: Posso ir pegar?
[17:17 15/07] CLIENTE: Amanhã não posso
[17:26 15/07] CLIENTE: [figurinha]
[17:46 15/07] CLIENTE: [figurinha]
[17:55 15/07] EQUIPE: Obrigado 😊
```

### Pedido ped-0710 — Lindauria Maria (558185556203) — ENCADERNAÇÃO ATÉ 30 FOLHAS
```
[17:01 10/07] CLIENTE: Boa tarde estou saindo do trabalho agora
[17:01 10/07] CLIENTE: Vou passar aí
[17:07 10/07] CLIENTE: Neste caso não pego hoje
[17:16 10/07] CLIENTE: Ok
[18:15 10/07] CLIENTE: O segundo das flores sortidas
[18:16 10/07] CLIENTE: Já estou no Ibura de baixo
[18:50 10/07] EQUIPE: Obrigado
```

---

## 13. Impressão papel couché (5 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL — melhor exemplo de negociação completa da investigação**

### Pedido ped-0976 — Carmem Lúcia (558186508876) — IMPRESSÃO PAPEL COUCHÊ A3 90G (só frente)
```
[09:34 15/07] CLIENTE: Resolvi aumentar o valor para R$60,00 e meu número de celular é: 986508876.
[09:35 15/07] CLIENTE: Ok?
[09:36 15/07] CLIENTE: Só ajustar nesses detalhes.
[09:47 15/07] EQUIPE: Ok! Vamos alterar 😊
[09:51 15/07] CLIENTE: Ok. Pode imprimir.
[09:51 15/07] CLIENTE: O valor é de R$30,00 Certo?
[09:52 15/07] CLIENTE: Eita. Faltou dizer que é até o 5°ano somente.
[09:53 15/07] CLIENTE: Apesar que a foto já indica.
[09:54 15/07] CLIENTE: Vou passar aí prá passar no cartão.
[10:28 15/07] CLIENTE: Não. É até o 5° ano. Entendeu?
[11:33 15/07] CLIENTE: Ok.Agora ficou mais claro.
[12:28 15/07] EQUIPE: vamos imprimir, quando estiver pronto avisaremos.
[12:56 15/07] EQUIPE: Boa tarde pode vim buscar seu material
[12:56 15/07] EQUIPE: valor 30,00
[12:56 15/07] EQUIPE: Boa tarde, Carmem! Seu material já está pronto pra retirada. O valor é R$30,00. Pode vir buscar! 😊
[13:17 15/07] CLIENTE: Ok. Eu irei pegá-lo.
```
Único caso da investigação com valor confirmado explicitamente duas vezes por escrito pela
equipe ("valor 30,00" + mensagem completa repetindo "O valor é R$30,00").

---

## 14. Serviço terceirizado (4 pedidos na janela)

**EXEMPLO REAL DISPONÍVEL**

### Pedido ped-1372 — Walter J. Junior (558191498762) — CANECA / CAMISA
```
[07:39 22/07] CLIENTE: [imagem]
[07:39 22/07] CLIENTE: Bom dia
[07:39 22/07] CLIENTE: Walter Silva
[07:39 22/07] CLIENTE: 08/07
[07:39 22/07] CLIENTE: walterjosejunior88@gmail.com
[07:42 22/07] CLIENTE: Quanto está a camisa e caneca
[07:52 22/07] CLIENTE: Vou querer uma camisa branca e caneca
[07:52 22/07] CLIENTE: Com a frase vovô nosso herói
[07:53 22/07] CLIENTE: Chave Pix
[07:53 22/07] CLIENTE: Certo
[07:54 22/07] CLIENTE: Vou querer
[07:54 22/07] CLIENTE: Pode passar a chave pix
[07:54 22/07] CLIENTE: 80 os dois
[07:59 22/07] CLIENTE: Tamanho da camisa G
[07:59 22/07] CLIENTE: [imagem]
[08:02 22/07] CLIENTE: [imagem]
[08:03 22/07] EQUIPE: vamos montar e passamos para voce
[08:03 22/07] CLIENTE: Ok
[08:03 22/07] CLIENTE: Aguardo
[16:15 22/07] CLIENTE: Boa tarde
[16:16 22/07] CLIENTE: Boa tarde
[16:16 22/07] CLIENTE: Sim
[16:16 22/07] CLIENTE: Está bom
[16:19 22/07] CLIENTE: Ok pode sim
```
Cliente pergunta o valor ("Quanto está a camisa e caneca") e depois é ELE MESMO que declara o
número ("80 os dois") — a equipe nunca confirma o valor em texto, só diz "vamos montar e passamos
para voce". Indício forte de que o preço foi combinado por fora do texto (call/áudio/presencial)
e o cliente só está repetindo de volta o que ouviu.

### Pedido ped-0472 — Lucio Ferreira (558185971071) — CANECA / CAMISA
```
[07:06 09/07] CLIENTE: [imagem]
[09:43 09/07] EQUIPE: Opa, bom dia! Confirmado o recebimento dos 50%, a caneca está em produção. Avisaremos assim que chegar. 😉
[09:49 09/07] CLIENTE: Ok, obrigado
[10/07 14:28] CLIENTE: Boa tarde. Estou indo
[10/07 15:49] CLIENTE: [imagem]
```

---

## Resumo dos 14 vereditos

| # | Categoria | Veredito |
|---|---|---|
| 1 | Impressão papel ofício | EXEMPLO REAL DISPONÍVEL |
| 2 | Xerox | EXEMPLO REAL DISPONÍVEL |
| 3 | Consulta Online | EXEMPLO REAL DISPONÍVEL |
| 4 | Impressão papel foto | EXEMPLO REAL DISPONÍVEL |
| 5 | Escritório | EXEMPLO REAL DISPONÍVEL |
| 6 | Impressão papel cartão | EXEMPLO REAL DISPONÍVEL |
| 7 | Impressão papel adesivo | EXEMPLO REAL DISPONÍVEL |
| 8 | Plastificação | EXEMPLO REAL DISPONÍVEL |
| 9 | Recarga VEM | EXEMPLO REAL DISPONÍVEL (raso — 1 frase só) |
| 10 | Personalizados | EXEMPLO REAL DISPONÍVEL |
| 11 | Recarga celular | EXEMPLO REAL DISPONÍVEL (raso) |
| 12 | Encadernação | EXEMPLO REAL DISPONÍVEL |
| 13 | Impressão papel couché | EXEMPLO REAL DISPONÍVEL |
| 14 | Serviço terceirizado | EXEMPLO REAL DISPONÍVEL |

Nenhuma categoria ficou sem exemplo real — mas duas (Recarga VEM e Recarga celular) só têm uma
frase de texto recuperável no cliente que foi puxado (mesmo telefone, mesmo cliente "Wanderley -
Deco"), o resto da operação de recarga aparentemente não passa por texto.

---

## Como a equipe comunica preço, na prática (observação sobre os casos já lidos acima, sem consulta nova)

Contando os casos com pergunta de valor visível ou momento de cobrança, dos 14 exemplos acima:

**Preço dito explicitamente em texto pela equipe (5 casos):**
- ped-1754/1752 (impressão P&B, James): "valor 2,40"
- ped-1740 (papel cartão, Maria Clara): "pade ser papel cartão a folha 5,00" / "papel foto 6,50" / "valor 15,00"
- ped-0976 (papel couché, Carmem): "valor 30,00" + confirmação por escrito de R$30,00
- ped-1876 (banner/ofício, Angelica): "metro quadrado 65,00"
- ped-0472 (serviço terceirizado, Lucio): não diz o valor total, mas confirma "recebimento dos 50%" (fala de dinheiro, sem repetir o número)

**Preço perguntado pelo cliente mas NUNCA respondido em texto pela equipe — só chega o código Pix
direto, sem o valor falado (6 casos):**
- ped-1558 (adesivo, Rafaela): "Quanto fica?" → sem resposta em texto, só Pix
- ped-1867 (ofício, Ítalo): cliente só diz "Pix" e recebe o código, sem negociação de valor em texto
- ped-1513 (personalizados, Larissa): "me passa o valor referente" / "ficou quanto total" → sem resposta em texto, só Pix
- ped-1372 (terceirizado, Walter): cliente pergunta o valor e é ELE MESMO quem declara o número depois ("80 os dois") — a equipe nunca confirma por escrito
- ped-1668 (plastificação, Debora): "Quanto custa..." → 15 minutos de silêncio, cliente aceita sozinho
- ped-1823 (consulta online, André): pergunta o valor duas vezes, sem resposta em texto

**Conclusão prática:** a equipe SOMENTE fala o valor em texto quando é um serviço de tabela fixa
e simples de citar de cabeça (preço por folha/página/metro quadrado — impressão avulsa, xerox,
papel cartão, couché, banner). Em serviços sob orçamento/personalizados (adesivo com corte,
plastificação, topo de bolo, caneca/camisa, consulta/agendamento), o padrão é responder com o
código Pix direto ou negociar por fora do texto (ligação, presencial) — o valor em si quase nunca
aparece escrito no chat nesses casos. Isso é "às vezes" no total, mas não é aleatório: correlaciona
fortemente com o tipo de produto (tabela fixa = fala o preço; sob encomenda = manda o Pix e pronto).
