# Lote 06 — Pesquisa linguagem real do cliente (29 telefones)

Retomado após queda do processo anterior (lote 6/12). Nenhum resultado prévio existia em
`lote_06_resultado.md` — refeito do zero seguindo a mesma metodologia dos lotes 03/05/08:
`to_timestamp(data_timestamp/1000.0) AT TIME ZONE 'America/Recife'`, `is_group=false`,
`apagada_em IS NULL`, telefone casado pelos últimos 11 dígitos, janela -6h/+48h do `created_at`
de cada pedido do telefone (pedidos próximos no tempo tratados como 1 conversa).

---

## 558188559469 — Richard — IMPRESSÃO P&B A4
1. Frase literal do cliente: "Boa tarde"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma capturada em texto na janela.
4. Sem contaminação.

## 558188578935 — Gustavo — IMPRESSÃO P&B A4
1. Frases literais: "Oi" + documento "NotaFiscal 216 - CONSORCIO CONSAG.pdf" / "🤝"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Obrigado, Gustavo! 😉"
4. Sem contaminação.

## 558188603659 — Cecilia — IMPRESSÃO P&B A4 (2 pedidos mesmo dia, 1 conversa)
1. Frase literal do cliente: "Cecília" (só o nome, sem descrever pedido)
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Bom dia, Cecília! Seu pedido de impressão P&B A4 já
   está pronto pra retirada, valor 1,20"
4. Sem contaminação.

## 558188646488 — Roberto José — IMPRESSÃO P&B A4 (2 pedidos quase simultâneos)
1. SEM TEXTO — só as mensagens automáticas da equipe foram capturadas na janela; nenhuma
   mensagem do cliente.
2. Produto real: IMPRESSÃO P&B A4
3. Resposta da equipe é só a automação de status ("Pedido confirmado!... entrou em produção...
   pronto pra retirada").
4. Sem contaminação.

## 558188719349 — Lucas — IMPRESSÃO 2ª VIA CONTA
1. Frase literal do cliente: "Nome: LUCAS ANTONIO DA SILVA           NASC.16-04-1956.
   LUCASANTONIO56SILVA@GMAIL.COM"
2. Produto real: IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta substantiva da equipe: "Obrigado 😊"
4. Sem contaminação.

## 558188751588 — Mateus de Andrade — IMPRESSÃO P&B A4 (cancelado) / PAPEL ADESIVO A4 192G (sem recorte)
1. Frase literal do cliente: "Oi" + documento "14º Encontro de Adolescentes - IEADPE Área 55
   (3).pdf"
2. Produto real: IMPRESSÃO P&B A4 (cancelado) / IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte)
3. Primeira resposta substantiva da equipe: "Obrigado"
4. Sem contaminação (documento é de evento de igreja, mas é conteúdo do próprio cliente levado
   pra impressão, não é conversa de outro negócio).

## 558188768207 — Maria da Conceição Silva — IMPRESSÃO P&B A4 (4 pedidos, várias conversas)
1. Frases literais do cliente: "Olá, estou compartilhando Documento_1783384110350 com você..."
   (texto automático do Adobe Acrobat Space ao compartilhar link) / "Bom dia!" / depois "Olá,
   estou compartilhando statement_month_15_07_2026..." / "Olá, estou compartilhando
   Fatura_Itau_20260715..."
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "bomdia" / "2,40" (valor informado direto).
4. Sem contaminação.

## 558188787312 — Rafaela Alburqueque — IMPRESSÃO PAPEL ADESIVO A4 192G (com recorte)
1. Frases literais do cliente (bem reveladoras de especificação técnica): "Bom dia!" + legenda
   de imagem "Gostaria de 20 unidades dessa imagem no tamanho 2,5 x 2,5 cm no papel adesivo" /
   "Quanto fica?" / "Redondo , Com corte" / "Me manda ao Pix por favor"
2. Produto real: IMPRESSÃO PAPEL ADESIVO A4 192G (com recorte) — etiquetas circulares
3. Primeira resposta substantiva da equipe: "recebido, assim que sair do corte avisaremos para
   vir buscar."
4. Sem contaminação.

## 558188852989 — Ricardo do Dutra — IMPRESSÃO P&B A4
1. Frases literais do cliente: "Bom dia irmão" / "Pode imprimir estes três arquivos q mandei" /
   "Daqui a pouco vou ai pegar e fazer o pagamento certo"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: automação de "Pedido confirmado" + "ok"
4. Sem contaminação.

## 558188861416 — Leticia Estela — IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte)
1. Frase literal do cliente: "Boa tarde"
2. Produto real: IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte)
3. Primeira resposta substantiva da equipe: "Boa tarde" / "Obrigado"
4. Sem contaminação.

## 558188918721 — Valéria Regina — IMPRESSÃO P&B A4
1. Frases literais do cliente (reveladoras): "Boa tarde" / "Vou te mandar um boleto" /
   "830051240" / "1 Detalhamento \n\n2 vias de  boleto ok"
2. Produto real: IMPRESSÃO P&B A4 (2 vias de boleto)
3. Primeira resposta substantiva da equipe: "ok obg"
4. Sem contaminação.

## 558188933563 — Luis Paulo — IMPRESSÃO P&B A4 (1 cancelado, 1 entregue)
1. Frases literais do cliente: "Olá! Bom dia." / "Gostaria de saber até que horas vocês ficarão
   abertos hoje?" / "Blz." / "Tô chagando aí daqui a pouco." / "Obrigado." + documentos
   "PROCURACAO CTTU.pdf" e "FORMULÁRIO GGTE CESSÃO..."
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma capturada em texto na janela.
4. Sem contaminação.

## 558188981278 — Etiene Oliveira — IMPRESSÃO P&B A4 (2 pedidos, 14/07 e 29/07)
1. SEM TEXTO — só a mensagem automática da equipe foi capturada; nenhum texto do cliente.
2. Produto real: IMPRESSÃO P&B A4
3. Resposta da equipe: automação "Pedido confirmado!... IMPRESSÃO P&B A4... R$ 1.20"
4. Sem contaminação.

## 558189027387 — Cauan Monteiro — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (documento "Guia do agendamento", sem mensagem de texto do cliente).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "Obrigado." no final.
4. Sem contaminação.

## 558189115705 — nome de contato salvo "J S Gráfica" (cliente real: Marimar do Nascimento Lima) — IMPRESSÃO P&B A4
1. Frases literais do cliente: "Oi" / "Bom dia" / "Você poderia manda meu currículo em pdf" /
   "E o pix quanto ficar" / "Marimar do Nascimento Lima" / "Ficar quanto ?"
2. Produto real: IMPRESSÃO P&B A4 (currículo)
3. Primeira resposta substantiva da equipe: envio do código Pix + "obg"
4. Sem contaminação de outro negócio — mas atenção: o nome salvo no contato é "J S Gráfica"
   (provável apelido/erro de cadastro), a cliente real que escreve se identifica como "Marimar do
   Nascimento Lima". Não confundir com a própria gráfica.

## 558189149594 — Thalita Raquel — IMPRESSÃO P&B A4 / IMPRESSÃO 2ª VIA CONTA (2 conversas: 23/07 e 28/07)
1. Frases literais do cliente:
   - Conv 1: "Pode imprimir a parte dos débitos pra mim pf?" / "É só a parte que tem as compras"
     / "São 3 páginas\nPreto e branco" / "Ta certo, quando estiar mais um pouquinho minha mãe vai
     viu?" / "Me envia o pix por favor"
   - Conv 2: "Pode imprimir em papel ofício? Por favor\nE quanto custa?" / "Vou fazer o pix e
     pedi pra minha mãe buscar"
2. Produto real: IMPRESSÃO P&B A4 / IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta substantiva da equipe: envio do código Pix (sem pergunta de esclarecimento
   textual).
4. Sem contaminação.

## 558189175125 — Franciele Santos Paz — IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte)
1. Frases literais do cliente (fluxo de aprovação de arte, muito revelador): "Celina 2 anos" /
   "Ok" / "Já está pronto ?" / "Ótimo" / "Só troca a cor\nDo nome" / "?" / "Nesse Celina 2 anos" /
   "Faz na cor preta" / "Isso" / "Ok estou no aguardo"
2. Produto real: IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) — nome personalizado ("Celina 2
   anos", provável topo de bolo/decoração de festa)
3. Primeira resposta substantiva da equipe: "Vamos preparar e antes de imprimir enviaremos para
   sua aprovação" / depois "escreva qual cor você quer o nome dela"
4. Sem contaminação.

## 558189370005 — Isabela Cristina 😎 — "Entrada diversa"
1. Frases literais do cliente (revelador — convite de aniversário infantil): "Bom dia" / "Quero
   mudar tudo isso aí que circulei" / "Nome: BRAYAN\n4anos\nDia 5 de setembro \nLocal:Av. engenho
   Muribara 181 Ur 3 Ibura \nPerto do colégio Cordeiro de Deus\nHora: 4 horas da tarde" / "Fica
   15 né isso?" / "Manda o pic" / "Aí quando termina me manda por pdf" / "Manda o pix" / "Obgd
   vc"
2. Produto real: registrado como "Entrada diversa" (lançamento financeiro genérico) — mas o
   conteúdo real da conversa é claramente encomenda de convite de aniversário personalizado.
3. Primeira resposta substantiva da equipe: "Boa festa! 😊"
4. Sem contaminação de outro negócio, mas nota: `servico_nome` "Entrada diversa" não reflete o
   produto real (convite personalizado) — mismatch categoria/conteúdo, útil pra taxonomia.

## 558189634030 — Wallace — IMPRESSÃO 2ª VIA CONTA / ENVELOPE A4
1. SEM TEXTO — só mídia (documento "michely cristina vicente da silva.pdf", nenhuma mensagem de
   texto do cliente).
2. Produto real: IMPRESSÃO 2ª VIA CONTA / ENVELOPE A4
3. Resposta da equipe: só automação de status.
4. Sem contaminação.

## 558189769221 — Ellen Soares — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) (2 conversas: 23/07 e 30/07)
1. Frases literais do cliente:
   - Conv 1: "Boa tarde" / "Quanto e pra imprimir" / "?" / "Antes das 14hrs eu passo aí pra
     pegar" / "Pode imprimir" / "Colorido"
   - Conv 2: documento "UNIPESSOAL - TERMO DE RESPONSABILIDADE.pdf" + "imprimi pra mim colorido"
     / "tou indo aqui ja"
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
3. Primeira resposta substantiva da equipe: "está impresso, valor 2,20"
4. Sem contaminação.

## 558189926601 — Dizu Refeições — "Recebimento de empréstimo" — CONTAMINAÇÃO ESTRUTURAL
1. SEM LOG DE CONVERSA — nenhuma mensagem (texto ou mídia) encontrada na janela do pedido.
2. Produto real registrado: "Recebimento de empréstimo " (com espaço sobrando no fim, sugerindo
   lançamento manual/financeiro).
3. N/A — não há conversa de atendimento a cliente de gráfica aqui.
4. **CONTAMINAÇÃO CONFIRMADA**: o nome do cliente ("Dizu Refeições") e o `servico_nome`
   ("Recebimento de empréstimo") deixam claro que este registro em `jsgrafica_pedidos` não é um
   pedido de impressão/gráfica — é um lançamento financeiro de outro negócio (Dizu Refeições,
   empreendimento de marmitas/quentinhas) que entrou na mesma tabela. Não usar este telefone pra
   taxonomia de linguagem de pedido de gráfica.

## 558191087685 — Lucis — IMPRESSÃO P&B A4
1. Frase literal do cliente: só "👍" (emoji, sem texto descritivo do pedido).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Obrigado"
4. Sem contaminação.

## 558191193769 — Genildo — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) / PLASTIFICAÇÃO MÉDIA / IMPRESSÃO COLORIDA OFÍCIO A4 (laser) — 1 pedido, 3 itens
1. SEM TEXTO — cliente só mandou um comprovante de pagamento ("Comprovante_20260724_125351"),
   sem mensagem de texto descrevendo o pedido.
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta + laser) / PLASTIFICAÇÃO MÉDIA
3. Primeira resposta substantiva da equipe: nenhuma pergunta, só "Obrigado".
4. Sem contaminação.

## 558191249589 — Deborah Monique 🦋 — CONTA GOV / ACESSO-ENVIO DOCUMENTOS / XEROX PRETO E BRANCO A4 / FOTO 10X15 — 1 pedido, 4 itens
1. Frases literais do cliente: "Boa tarde" / "Pode imprimir estou indo buscar"
2. Produto real: CONTA GOV, ACESSO/ENVIO DOCUMENTOS, XEROX PRETO E BRANCO A4, FOTO 10X15 (pacote
   de serviços digitais + impressão)
3. Primeira resposta substantiva da equipe: nenhuma capturada em texto na janela.
4. Sem contaminação — nota: "CONTA GOV" e "ACESSO/ENVIO DOCUMENTOS" revelam demanda de apoio
   digital (acesso a conta gov.br) combinada com impressão, produto vendido em pacote.

## 558191334243 — Edvaldo Xavier — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento, nenhuma mensagem de texto do cliente).
2. Produto real: IMPRESSÃO P&B A4
3. Sem resposta de texto da equipe capturada na janela.
4. Sem contaminação.

## 558191414184 — José Roberto Silva — cliente recorrente, muitos pedidos (P&B A4, papel foto, plastificação, 2ª via conta, xerox, entrada diversa)
1. Frases literais do cliente (cliente muito engajado, várias visitas ao longo do mês):
   "vcs ainda estão atendendo hoje?" / "oba" / "estou mandando material e vou correndo ai" /
   "para este não imprima estou levando papel especifico" / "este imprimir e platificar" /
   "imprimir e plastificar" (cartão CNS e título eleitoral) / "tem como dobrar ele?" / "Bom dia,
   \nPor favor, uma cópia de cada" / "Passo em meia hora." / "VOU LEVAR O PAPEL" / "este vou
   verificar o valor e tamanho, é um banner, não sei se vocês trabalham, quando chegar ai
   conversamos" / "ETIQUETA NO PAPEL ADESIVO." / "TO INDO BUSCAR."
2. Produto real: IMPRESSÃO P&B A4, IMPRESSÃO PAPEL FOTO A4 230g, PLASTIFICAÇÃO A4, IMPRESSÃO 2ª
   VIA CONTA (x2), XEROX PRETO E BRANCO A4, Entrada diversa
3. Primeira resposta substantiva da equipe: "o cartão do SUS a impressão é colorida ou preto e
   branco?" / depois "Bom dia  vai ser que tipo de papel"
4. Sem contaminação. Nota: cliente perguntou sobre imprimir banner (fora do catálogo padrão) —
   equipe respondeu que precisava verificar valor/tamanho na hora.

## 558191498762 — Walter J. Junior — CANECA / CAMISA
1. Frases literais do cliente (produto personalizado, muito revelador): "Bom dia" / "Walter
   Silva" / "08/07" / "walterjosejunior88@gmail.com" / "Quanto está a camisa e caneca" / "Vou
   querer uma camisa branca e caneca" / "Com a frase vovô nosso herói" / "Chave Pix" / "Tamanho
   da camisa G"
2. Produto real: CANECA / CAMISA (personalizada, com frase "vovô nosso herói")
3. Primeira resposta substantiva da equipe: "vamos montar e passamos para voce"
4. Sem contaminação.

## 558191570159 — Marleide Fernandes — IMPRESSÃO 2ª VIA CONTA
1. SEM TEXTO — cliente só mandou 2 documentos (plantas arquitetônicas "MB-R-CASA_ALPHA-ARQ-EP-
   001/002"), nenhuma mensagem de texto.
2. Produto real registrado: IMPRESSÃO 2ª VIA CONTA — mas o conteúdo real enviado são plantas de
   arquitetura, não conta de consumo (mismatch produto/conteúdo, dentro do próprio negócio de
   impressão).
3. Primeira resposta substantiva da equipe: "Obigado" (sic).
4. Sem contaminação de outro negócio.

## 558191612382 — Elders De Ibura 2 — IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) — CONTAMINAÇÃO CLARA
1. Frases literais do cliente: "Bom dia" / "Vou quer a quentinha grande de 1 opção de carne\n
   Frango assado\nFeijão preto\nArroz\nMacarrão \nLegumes \nFarofa \nPurê" / "Rua engenho pedra
   lavada 32\nDo lado de um quadro de futebol" / "Vai demorar quanto?" / "Ok" / "Posso passar pra
   pagar na loja?" / "Ok obrigado"
2. Produto real registrado: IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) — mas a conversa
   inteira é sobre pedido de comida.
3. Primeira resposta substantiva da equipe: "seu almoçojá saio" (sic).
4. **CONTAMINAÇÃO CONFIRMADA**: conversa 100% sobre pedido de "quentinha" (marmita) com endereço
   de entrega — nada a ver com impressão/adesivo. É tráfego de outro negócio de alimentação
   (provavelmente Dizu Refeições ou similar) misturado no mesmo número/log. Não usar para
   taxonomia de linguagem de pedido de gráfica.
