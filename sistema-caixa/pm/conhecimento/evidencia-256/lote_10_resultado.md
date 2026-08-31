# Lote 10 — Pesquisa linguagem real do cliente (28 telefones)

Metodologia: `data_timestamp` em ms convertido com `to_timestamp(/1000.0)`, hora local
America/Recife, `is_group=false`, `apagada_em IS NULL`. Telefone ligado pelos últimos 11
dígitos. Janela de -6h a +48h em torno de cada `created_at` de pedido; pedidos do mesmo
telefone separados por gap >6h tratados como conversas/clusters distintos.

---

## 558197558016 — Neto — IMPRESSÃO P&B A4 (3 pedidos, 06 e 07/07)
1. Frases literais: "Este número é a seha daqui a pouco passo aí pra pegar" / "Brigado" /
   (pedido seguinte) "Boa tarde e possível enprimi esses documentos passo depois para pegar
   brigado" / "Pode"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: "Boa tarde! Seus arquivos tem 8 páginas para
   impressão, preto e branco 1,20 cada página, total 9,60" seguido de "posso imprimir?"
4. Sem contaminação.

## 558197637352 — Genifer 🦋 — IMPRESSÃO PAPEL FOTO A4 230g
1. "Quando é para imprimir uma folha de a4?" / "Quais os valores dos papel?" / "Tem foto e
   outro tipo né. ?" / "Nesse papel" / "Sim" / "Tá certo" / "Vou buscar assim que largar"
2. Produto real: IMPRESSÃO PAPEL FOTO A4 230g
3. Nenhuma resposta da equipe capturada em texto na janela (provável resposta fora da janela
   ou por outro canal).
4. Sem contaminação.

## 558197708605 — Souza👻 — IMPRESSÃO P&B A4
1. Cliente colou um texto escolar inteiro sobre Karl Marx e Émile Durkheim como corpo da
   mensagem (não é descrição do pedido, é o próprio conteúdo a ser impresso/anexo às imagens
   enviadas em seguida).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta: "Pedido confirmado! 🖨️ IMPRESSÃO P&B A4 Qtd: 2 R$ 2.40..." (mensagem
   automática de confirmação).
4. Contaminação leve: texto colado é conteúdo escolar, não fala do pedido em si — registrar
   como "não descritivo", não misturar com taxonomia de pedido.

## 558197726476 — Ana Luiza — RECARGA VEM 45,00
SEM LOG DE CONVERSA (zero mensagens privadas 1:1 na janela de -6h/+48h em torno do pedido).

## 558197785356 — Adriana Alves — IMPRESSÃO 2ª VIA CONTA
1. "Boa tarde tá certo" / "Segunda irei ai" (confirmação, não descreve o produto)
2. Produto real: IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta: "Bom fim de semana." (não substantiva sobre o pedido)
4. Sem contaminação.

## 558197819609 — Ronaldo Barbosa — IMPRESSÃO P&B A4
SEM TEXTO — só mídia. Único evento: documento com nome de arquivo "PROCURAÇÃO ABONO DE
PERMANENCIA E Auxilio Ronaldo.pdf" (nome do arquivo indica o conteúdo, mas não é texto
digitado pelo cliente).
Produto real: IMPRESSÃO P&B A4. Sem resposta de equipe em texto capturada.

## 558197983497 — Jose Severino — IMPRESSÃO P&B A4
SEM TEXTO — só mídia (documento, legenda vazia).
Produto real: IMPRESSÃO P&B A4.
Primeira resposta: "bom dia", seguida da confirmação automática do pedido.

## 558198016818 — Elisangela Mota — CADASTRO/MATRÍCULA ESCOLAR (24/07) e IMPRESSÃO P&B A4 (28/07)
Cluster A (24/07 — CADASTRO/MATRÍCULA ESCOLAR):
1. "Vcs vendem pendrive pequeno" / "Meu nome Elizângela mota" / "Vou aí daqui a pouco comprar.
   Pendrive e vou aí ok obrigado" / depois colou textos longos sobre antibióticos (conteúdo
   escolar, não descreve o pedido) / "Mande o PDF tá incluso esse amigo"
3. Primeira resposta substantiva: "Obrigado 😊"
4. Contaminação: os textos longos sobre antibióticos são conteúdo escolar colado, não
   descrição do pedido — não confundir com o serviço real.

Cluster B (28/07 — IMPRESSÃO P&B A4):
1. "Bom dia" / "Por favor imprime essa conta pra mim" / "Quanto é a impressão vou mandar o
   Pix" / "Ok"
3. Primeira resposta: envio do código Pix, seguido de "o pix"
4. Sem contaminação nesse cluster.

## 558198039630 — Tereza — IMPRESSÃO COLORIDA OFÍCIO A4 / IMPRESSÃO P&B A4
1. Só um link do Adobe Acrobat ("https://acrobat.adobe.com/id/...") + documento anexo, sem
   nenhuma frase descrevendo o pedido.
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) + IMPRESSÃO P&B A4
3. Nenhuma resposta de equipe capturada em texto na janela.
4. Sem contaminação.

## 558198069187 — Claudia Leal — XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4 (x2)
1. "Oi" seguido só de documentos (145419112026CAC, Comprovante_2026-04-18_084828,
   TIMGSM_0814745907_202605_5773882914_IR, "nada consta coren.pdf") — sem descrição verbal do
   pedido além do "Oi".
2. Produto real: XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4 (x2)
3. Nenhuma resposta de equipe capturada em texto na janela.
4. Sem contaminação.

## 558198145601 — Jessica Vitória — IMPRESSÃO PAPEL FOTO A4 230g / FOTO 10X15
SEM TEXTO — só mídia (2 imagens sem legenda, sem nenhuma mensagem de texto).
Produto real: IMPRESSÃO PAPEL FOTO A4 230g + FOTO 10X15. Sem resposta de equipe capturada.

## 558198175394 — BOI TA TA TA - RECIFE Erick Pinto — XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4
SEM TEXTO — só mídia (documento, legenda vazia).
Produto real: XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4.
Primeira resposta: "Obrigado."
Observação: nome de contato ("BOI TA TA TA - RECIFE Erick Pinto") sugere conta de
divulgação/evento, não necessariamente pessoa física comum — não é contaminação de outro
negócio na conversa em si, mas vale registrar a estranheza do nome.

## 558198216173 — Carlos André Camilo — IMPRESSÃO P&B A4 (09/07 e 14/07)
Cluster A (09/07):
1. Caption "CARLOS ANDRE CAMILO DA ROCHA - PROPOSTA MAPFRE.pdf" / "Carlos andré camilo da
   rocha \n10/06" / "está aberto ?" / "pode estou indo buscar"
3. Primeira resposta substantiva: "boa tarde" seguido de "6 folhas dar 7,20" / "pode
   imprimir?"

Cluster B (14/07):
1. "bom dia" / "já está aberto ?" / documento "contrato_compra_e_venda_final" / "imprime duas
   vias por favor"
3. Primeira resposta: "Bom dia! Carlos!" seguido de "sim"
4. Sem contaminação nos dois clusters.

## 558198237085 — Sadoc Laurindo Da Silva — IMPRESSÃO P&B A4 (10/07 e 13/07)
Cluster A (10/07): documento, seguido de "Sadoc Laurindo da Silva \n
Sadoclaurindodasilvasadocsilva@gmail.com\n21/07/1959" (dados pessoais para cadastro, não
descrição do pedido em si).
Cluster B (13/07): equipe abre dizendo "Bom dia Sadoc, suas duas contas da Tim P&B A4 estão
prontas, pode vir buscar." — só aqui fica claro que eram contas da Tim (o cliente nunca
descreveu isso em texto, só respondeu "Ok").
Produto real: IMPRESSÃO P&B A4 (contas de telefone Tim). Sem contaminação.

## 558198298192 — Telma 98298192 — IMPRESSÃO P&B A4
1. "Boa tarde" / 3 imagens / "O vaso duas folhas preto é branco" / "O cocô é preto e branco se
   der uma folha com aumento" / "Estou indo" / "Se tiver dúvidas estou indo"
2. Produto real: IMPRESSÃO P&B A4
3. Nenhuma resposta de equipe capturada em texto na janela (pedido criado ~3h20 depois das
   mensagens).
4. Sem contaminação.

## 558198323819 — Natalia — IMPRESSÃO P&B A4
1. "Bom dia" / "Ta aberto ?" / documento "270726 Realibitaçao GUILHERME AUGUSTO RIOS DE MORAIS
   PEREIRA.pdf" / "Só a primeira" / "Me diz o pix"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: "Boa tarde" / "sim esta aberto" / "tem 2 folhas"
4. Sem contaminação.

## 558198332888 — Willianne Barbosa — IMPRESSÃO COLORIDA OFÍCIO A4 / IMPRESSÃO P&B A4
SEM TEXTO — só mídia (4 documentos + 2 imagens, todas as legendas vazias ou nulas, nenhuma
mensagem de texto em toda a janela).
Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) + IMPRESSÃO P&B A4. Sem resposta de
equipe capturada.

## 558198394103 — Jorge Luiz — IMPRESSÃO P&B A4
1. Equipe abre perguntando (fora do padrão, iniciativa da loja): "Boa noite, Jorge! Recebemos
   os arquivos. a CNH vai imprimir preto e branco ou colorida?" — cliente responde "Preto e
   branco mesmo" / "Pix" / "Pode ser" / depois "Ela já foi aí buscar ?"
2. Produto real: IMPRESSÃO P&B A4 (cópia de CNH)
3. Primeira resposta substantiva da equipe: a pergunta acima sobre a CNH.
4. Sem contaminação.

## 558198449378 — M. i. l. a. n. e. s — SCANNER / ACESSO-ENVIO DOCUMENTOS
1. Só "Bom dia" — nenhuma outra mensagem de texto na janela descrevendo o pedido de scanner
   ou envio de documentos.
2. Produto real: SCANNER + ACESSO / ENVIO DOCUMENTOS
3. Nenhuma resposta de equipe capturada em texto.
4. Sem contaminação.

## 558198495607 — Zuzeide — IMPRESSÃO 2ª VIA CONTA (x3) / Entrada diversa
1. Praticamente só documentos (contas) em 3 momentos diferentes (28 e 29/07); único texto do
   cliente em toda a janela combinada foi "Oi".
2. Produto real: IMPRESSÃO 2ª VIA CONTA (repetido 3x) + Entrada diversa
3. Primeira resposta substantiva: mensagem automática "Pedido confirmado! 🖨️ IMPRESSÃO 2ª VIA
   CONTA 💰 R$ 2.20 ... Pix copia e cola..."
4. Sem contaminação. Cliente recorrente e regular (2ª via de conta é claramente rotina dela).

## 558198528299 — Weskley Souza — IMPRESSÃO P&B A4
SEM TEXTO — só mídia (5 imagens sem legenda, nenhuma mensagem de texto).
Produto real: IMPRESSÃO P&B A4.
Primeira resposta: "Boa ttarde, Weskley!" (saudação, não substantiva sobre o pedido).

## 558198537003 — Guilherme José Silva — IMPRESSÃO P&B A4
SEM TEXTO — só mídia (documento, legenda vazia).
Produto real: IMPRESSÃO P&B A4.
Primeira resposta: "Obrigado. 😉"

## 558198566743 — Laércio guaramix — IMPRESSÃO P&B A4
1. Sem texto descritivo — só documentos com nomes de arquivo indicando notas fiscais ("danfe
   NF 122 COML ALIM STA CLARA LAERCIO.pdf", "danfe NF 123 ATACAREJO STA CLARA LAERCIO.pdf");
   única reação de texto foi um emoji "👍🏻" depois da entrega.
2. Produto real: IMPRESSÃO P&B A4 (impressão de DANFE / nota fiscal)
3. Primeira resposta: "Obrigo Laércio!"
4. Sem contaminação.

## 558198605538 — Osmar Guedes — IMPRESSÃO P&B A4 (09/07 e 22/07) / TOPO DE BOLO (24/07)
Cluster A (09/07): "BOM DIA IMPRIME ESSA FATURA PRA MIM POR FAVOR. DAQUI APOUCO EU VOU PEGAR
AÍ." (maiúsculas do próprio cliente) / depois repete o padrão: "IMPRIME ESSA FATURA TAMBÉM TÔ
INDO PEGAR AÍ."
Cluster B (22/07): repete quase literalmente a mesma frase: "BOM DIA IMPRIME ESSA FATURA PRA
MIM POR FAVOR. DAQUI APOUCO EU VOU PEGAR AÍ."
Cluster C (24/07 — pedido TOPO DE BOLO com recorte): SEM LOG DE CONVERSA para este pedido
específico — nenhuma mensagem encontrada na janela de -6h/+48h em torno desse `created_at`
(caiu ~23min depois do fim da janela do cluster B; pode ser continuação da mesma conversa não
capturada, ou pedido lançado direto pela equipe).
Produto real: IMPRESSÃO P&B A4 (faturas) + TOPO DE BOLO.
Primeira resposta (clusters A/B): "bom dia" / "Obrigado".
Sem contaminação.

## 558198673450 — Maria Clara — XEROX/IMPRESSÃO P&B/IMPRESSÃO COLORIDA/PAPEL CARTÃO (22/07 e 28/07)
Cluster A (22/07):
1. "Boa tarde." / "Maria Clara Gonçalves de Andrade 25/07/1961\nclarasegurancadopaciente@gmail.com"
   / "Quanto é o preço de 30 xerox" / "É uma apostila só precisamos APARTIR do tema da 4
   semana" / "As páginas de 10 a14 frente e verso." / depois, quando a equipe corrige
   terminologia ("não e xerox" / "e impreção p/b 1,20 a folha colorida 2,20"), a cliente insiste:
   "É xerox" / "Está Pronto?" / "Peço que o senhor fac comprovante para mim prestar conta."
2. Produto real: XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4 + IMPRESSÃO COLORIDA OFÍCIO A4
3. Primeira resposta substantiva: "Boa tarde" / "a xerox p/b 0,45 colorida 1,20" / "Bom dia,
   Maria Clara! Pra 30 xerox, fica R$ 13,50. Cada xerox 0,45 preto e branco."
4. Achado de linguagem (não é contaminação de outro negócio, mas confusão de termos):
   cliente chama de "xerox" tanto a fotocópia quanto a impressão de arquivo digital; a equipe
   corrige explicitamente ("primeiro tem que imprimir para depois tirar xerox") e ela mantém
   "É xerox" mesmo assim.

Cluster B (28/07):
1. "Bom dia." / "Para fazer o marcador de Bíblia." / "Qual o tipo de papel? Quantos pode ser
   colocado por folhas?" / "Quantos cabem em 1folha de papel cartão" / "Boa tarde \nPode
   imprimir 3 folhas." / "Envia o número do PIX" / "Por favor faça recibo para comprovação"
2. Produto real: IMPRESSÃO PAPEL CARTÃO A4 180G (só frente)
3. Primeira resposta substantiva: "pade ser papel cartão a folha 5,00" / "papel foto 6,50"
4. Sem contaminação.

## 5581987082204 — Jonas de Paiva — IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4
SEM LOG DE CONVERSA (zero mensagens privadas 1:1 na janela de -6h/+48h em torno do pedido).

## 558198726391 — Juliana Marinho — Entrada diversa
SEM LOG DE CONVERSA (zero mensagens privadas 1:1 na janela de -6h/+48h em torno do pedido).

## 558198745717 — Abigail Silva — IMPRESSÃO P&B A4
SEM TEXTO — só mídia (2 documentos: "ABIGAIL RES CORRECAO.pdf" e "ABIGAIL SD CORRECAO.pdf",
sem nenhuma mensagem de texto).
Produto real: IMPRESSÃO P&B A4.
Primeira resposta: "Obrigado"

---

## Resumo quantitativo do lote

- 28/28 telefones cobertos, nenhum pulado.
- Texto real do cliente (pelo menos 1 mensagem de texto substantiva): **17**
  (558197558016, 558197637352, 558197708605, 558197785356, 558198016818, 558198039630,
  558198069187, 558198216173, 558198237085, 558198298192, 558198323819, 558198394103,
  558198449378, 558198495607, 558198566743, 558198605538, 558198673450)
- SEM TEXTO — só mídia (cliente nunca digitou nada, só mandou arquivo/imagem/sticker): **8**
  (558197819609, 558197983497, 558198145601, 558198175394, 558198332888, 558198528299,
  558198537003, 558198745717)
- SEM LOG DE CONVERSA (zero mensagens 1:1 recuperáveis): **3**
  (558197726476, 5581987082204, 558198726391)
- Total: 17 + 8 + 3 = 28.
