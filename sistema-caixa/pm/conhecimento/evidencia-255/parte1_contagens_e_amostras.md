# Pesquisa 255 — Parte 1: comportamento por tipo de mídia na 1ª mensagem da sessão

Janela: 2026-07-01 a 2026-07-30 (mês incompleto — dado real disponível até hoje, 30/07).
Metodologia: sessão = 1ª mensagem do cliente (from_me=false) após lacuna >=4h no histórico
DELE (partição por `phone`, não `contact_lid` — ver nota de metodologia no final).
Escopo: só sessões cuja 1ª mensagem tem `media_type` preenchido E `message_text`/`caption`
vazios (mídia pura, sem legenda) — mesmo escopo da demanda 234.

## CONTAGEM REAL — sessões por tipo (mês inteiro, não amostra)

| tipo | sessões totais | sessões com pedido em até 48h | % conversão |
|---|---:|---:|---:|
| documento_pdf | 372 | 257 | 69.1% |
| imagem | 217 | 112 | 51.6% |
| audio | 18 | 2 | 11.1% |
| outro_sticker | 10 | 4 | 40.0% |
| outro_contact (cartão de contato) | 2 | 0 | 0.0% |
| documento_outro (docx/pptx/etc, não-PDF) | 1 | 0 | 0.0% |
| video | 1 | 0 | 0.0% |

Total de sessões nesse escopo (mídia sem legenda, mês): 621.

Nota: "documento" no log inclui 1 caso de PNG classificado como document (mime_type image/png)
— não apareceu na amostra, mas existe no bruto (7 mensagens document/png no mês, não
necessariamente 1ª mensagem de sessão).

---

## AMOSTRA — sequência real de mensagens nas primeiras ~2h de sessão

Cada bloco = 1 sessão real. `[CLIENTE]` = from_me=false, `[EQUIPE]` = from_me=true. Hora em
America/Recife. Telefone incluído para permitir citação/verificação cruzada.

### TIPO: documento_pdf (10 de 372 sessões, espalhadas ao longo do mês)

**1) 558185237960 — 2026-07-06**
- 11:00 [CLIENTE] envia PDF
- 11:03 [CLIENTE] envia 2º PDF
- 11:12 [EQUIPE] "pode vim buscar  valor 1,20"
- 11:16 [CLIENTE] "Ok daqui a pouco"
- 11:16 [CLIENTE] "São 2 boletos"
- 11:19 [EQUIPE] "ok pode vim  valor 2,40"
- 11:21 [CLIENTE] "Ok"
→ pedido vinculado em 48h: SIM

**2) 558199547666 — 2026-07-07**
- 12:51 [CLIENTE] envia PDF
- 12:51 [CLIENTE] "Boa tarde"
- 12:51 [CLIENTE] "Pode imprimir"
- 12:51 [CLIENTE] "A senha é"
- 12:51 [CLIENTE] "69492"
- 12:59 [EQUIPE] "Obrigado."
→ pedido vinculado: SIM

**3) 558184616060 — 2026-07-08**
- 17:20 [CLIENTE] envia PDF
- 17:21 [EQUIPE] "obg"
→ pedido vinculado: SIM

**4) 558188438635 — 2026-07-10**
- 12:21 [CLIENTE] envia PDF
- 12:23 [CLIENTE] envia imagem (jpeg)
- 12:24 [EQUIPE] "Obrigado"
→ pedido vinculado: SIM

**5) 558196206867 — 2026-07-14**
- 10:55 [CLIENTE] envia PDF
- 10:57 [EQUIPE] "Obrigado! 😉"
→ pedido vinculado: SIM

**6) 558181863430 — 2026-07-17**
- 14:55 [CLIENTE] envia PDF
- 15:28 [EQUIPE] "Obrigado 😊"
- 15:51 [CLIENTE] mensagem vazia (provável reação/apagada parcial)
→ pedido vinculado: SIM (6 pedidos no total em 48h — cliente recorrente/volume)

**7) 558197080551 — 2026-07-21**
- 14:10 [CLIENTE] envia PDF
- (sem resposta da equipe nas 2h seguintes)
→ pedido vinculado: NÃO

**8) 558186215173 — 2026-07-24**
- 08:28 [CLIENTE] envia PDF
- 08:37 [EQUIPE] "obg"
→ pedido vinculado: SIM

**9) 558187884969 — 2026-07-28**
- 09:02 [CLIENTE] envia PDF
- 09:02 [CLIENTE] "Bom dia pode imprimir"
- (sem resposta da equipe nas 2h seguintes)
→ pedido vinculado: NÃO

**10) 558185805847 — 2026-07-30**
- 14:11 [CLIENTE] envia PDF
- 14:11 [CLIENTE] "Imprimir este !"
- 14:31 [EQUIPE] "Obrigado"
→ pedido vinculado: SIM

**Achado qualitativo (amostra n=10, mas consistente com padrão visto nos 372):** a equipe
NÃO faz pergunta de triagem tipo "que documento é esse, pra que serve?" — a resposta padrão a
PDF é um agradecimento curto ("obg"/"Obrigado"/"Obrigado 😊") que funciona como confirmação
implícita de recebimento para impressão. Quando há preço, ele já vem direto ("pode vim buscar
valor 1,20"), sem pergunta intermediária. Em 8/10 da amostra a equipe respondeu; em 2/10 não
houve resposta em 2h.

---

### TIPO: imagem (10 de 217 sessões, espalhadas ao longo do mês)

**1) 558185556203 — 2026-07-06**
- 12:35 [CLIENTE] envia imagem
- 12:42 [EQUIPE] "Boa tarde"
- 12:42 [CLIENTE] "Boa tarde gostaria de saber se podem fazer 6 cadernos de louvor como este da
  foto acima fiz com vocês serão estes louvores : Jerusalém e Eu canta Denise Cerqueira / ..."
- 12:44 [CLIENTE] "E o valor e se pode ser entregar no dia 10 deste mês aguardo resposta"
- 12:44 [EQUIPE] "Boa tarde"
- 12:45 [EQUIPE] "é para fazer o caderno com a impressão dos hinos acima?"
- 12:46 [CLIENTE] "Sim"
- 12:47 [EQUIPE] "ok vamos preparar e enviaremos o valor."
- 12:53 [CLIENTE] "Ok"
→ pedido vinculado: SIM

**2) 558185132557 — 2026-07-07**
- 16:49 [CLIENTE] envia imagem
- (sem resposta da equipe nas 2h seguintes)
→ pedido vinculado: NÃO

**3) 558196186444 — 2026-07-08**
- 16:55 [CLIENTE] envia imagem
- 16:56 [EQUIPE] "boa tarde ira imprimir novamente?"
→ pedido vinculado: SIM (pergunta de triagem, assume cliente recorrente)

**4) 558179028912 — 2026-07-10**
- 15:37 [CLIENTE] envia imagem
- 15:37 [CLIENTE] "Vou querer colorida"
- 15:38 [CLIENTE] "Shirley Cleide Nascimento \n01/12\nshirleymacley@outlook.com"
- 15:40 [CLIENTE] "Me mande o pix"
- 15:51 [CLIENTE] "Boa tarde"
- 15:51 [CLIENTE] "Tá ok"
- 15:52 [CLIENTE] envia 2ª imagem
- 15:52 [CLIENTE] "Obrigada"
- (sem resposta da equipe nas 2h — provável resposta por fora do texto, ex. ligação/áudio não
  capturado, ou resposta após a janela de 2h)
→ pedido vinculado: SIM

**5) 558186321734 — 2026-07-15**
- 11:19 [CLIENTE] envia 5 imagens seguidas
- 11:22 [CLIENTE] "Esas fotos sem molduras quanto custa e quando entrega"
- 11:25 [CLIENTE] "Eu vou precisar passar aí para explicar melhor bom dia"
- 12:39 [CLIENTE] "Tá certo ,mas tarde eu passo aí obrigada boa tarde.😐"
- (sem resposta da equipe nas 2h — cliente decide ir pessoalmente)
→ pedido vinculado: SIM (5 pedidos em 48h)

**6) 558197116182 — 2026-07-17**
- 14:28 [CLIENTE] envia imagem
- 14:28 [CLIENTE] "boa tarde, quero esse em papel cartão"
- (sem resposta da equipe nas 2h seguintes)
→ pedido vinculado: SIM

**7) 558188172184 — 2026-07-21**
- 10:38 [CLIENTE] envia imagem
- (sem resposta da equipe nas 2h seguintes)
→ pedido vinculado: NÃO (mesmo telefone reaparece na amostra de vídeo, 1 dia depois, também
  sem resposta em 2h — ver observação no final)

**8) 558191001077 — 2026-07-24**
- 10:05 [CLIENTE] envia imagem
- 10:05 [CLIENTE] "Bom dia"
- 10:06 [CLIENTE] "Eu quero a impressão dessa imagem"
- 10:08 [CLIENTE] "Papel de fotografia"
- 10:08 [CLIENTE] "Quanto fica"
- 10:28 [CLIENTE] "O valor é o pix"
- 10:28 [CLIENTE] "?"
- 10:29 [CLIENTE] "Me manda o pix"
- 10:50 [CLIENTE] envia 2ª imagem (provável comprovante)
- 10:50 [CLIENTE] "Eu vou manda meu filho pega"
- 10:50 [CLIENTE] "Mas não agora"
- 10:50 [CLIENTE] "Pq estou aguardando uma pessoa pra vê se vai tira uma\nOutra imagem"
- (sem resposta de texto da equipe nas 2h — pix provavelmente enviado por outro canal/nó
  automatizado não capturado neste log de texto)
→ pedido vinculado: SIM

**9) 558186870885 — 2026-07-27**
- 15:39 [CLIENTE] envia imagem
- (sem resposta da equipe nas 2h seguintes)
→ pedido vinculado: NÃO

**10) 558184471096 — 2026-07-30**
- 14:06 [CLIENTE] envia imagem
- 14:07 [CLIENTE] "Banner"
- 14:10 [CLIENTE] "Vou querer 50x70"
- 14:12 [CLIENTE] "Vou pagar 100%"
- 14:12 [CLIENTE] "Mande o pix"
- 14:12 [CLIENTE] "Ok"
- 14:21 [CLIENTE] "Ok"
- (sem resposta de texto da equipe nas 2h)
→ pedido vinculado: SIM

**Achado qualitativo (amostra n=10):** diferente do PDF, a resposta da equipe a imagem — quando
existe no texto dentro de 2h — é mais frequentemente uma pergunta de triagem ("é para fazer o
caderno com a impressão dos hinos acima?", "ira imprimir novamente?") em vez do agradecimento
automático visto no PDF. MAS: em 6/10 sessões da amostra não há NENHUMA resposta de texto da
equipe nas 2h, mesmo em casos que fecharam pedido depois (ex. 558179028912, 558191001077,
558184471096) — sugere que parte da negociação de imagem acontece fora do texto puro (o cliente
já sabe o preço, pede pix direto) ou a resposta chega depois da janela de 2h. Isso é diferente do
PDF, que teve resposta em 8/10.

---

### TIPO: audio (10 de 18 sessões, espalhadas ao longo do mês)

**1) 558173207864 — 2026-07-06/07 (21:03)**
- 21:03 [CLIENTE] envia áudio
- (sem resposta da equipe nas 2h)
→ pedido vinculado: NÃO

**2) 558196497589 — 2026-07-10**
- 11:23 [CLIENTE] envia áudio
- 11:24 [CLIENTE] "Bom dia"
- 11:24 [CLIENTE] "Poderia me passar o valor de tudo?!"
- 11:25 [CLIENTE] "Estou indo ao Ibura"
- 11:25 [CLIENTE] "Vocês fazem papel adesivo que já solta no formato ideal? Eu gostaria dele
  redondo"
- 11:29 [EQUIPE] "R$9,00 cada folha"
- 11:30 [EQUIPE] "qual tamanho do seu adesivo para ver quantos cabem em uma folha."
- 11:31 [CLIENTE] "4x4"
- 12:16 [CLIENTE] "Cabem quantos?"
- 12:16 [CLIENTE] "Qual o valor das outras imagens que lhe passei?"
→ pedido vinculado: NÃO (única sessão de áudio da amostra com resposta real de equipe, ainda
  assim não converteu em pedido registrado em 48h)

**3) 558195821311 — 2026-07-11**
- 10:47 [CLIENTE] envia áudio
- 10:47 [CLIENTE] envia 2º áudio
- 10:49 [CLIENTE] "Meu nome janilda deixei pra fazer duas etiqueta pra roupa com 10 unidades
  caso. São 20 já está pronto"
- 11:25 [CLIENTE] "Oi"
- (sem resposta da equipe nas 2h)
→ pedido vinculado: NÃO

**4) 558191395387 — 2026-07-13**
- 15:39 [CLIENTE] envia áudio
- 15:40–15:59 [CLIENTE] 6 mensagens de texto ("Ola", "Boa 5ade"/"Boa tarde", "Gostaria de saber
  até que horas tira fotos", "3 por quatro", "?", "?????", "Oie", "Quando custa")
- (sem resposta da equipe nas 2h — cliente insiste várias vezes sem retorno)
→ pedido vinculado: NÃO

**5) 558185387018 — 2026-07-16**
- 08:06 [CLIENTE] envia áudio (única mensagem na sessão/janela)
- (sem resposta da equipe nas 2h)
→ pedido vinculado: NÃO

**6) 558198324841 — 2026-07-17**
- 15:51 [CLIENTE] envia áudio
- 15:53–15:59 [CLIENTE] mensagens fragmentadas: "Sobre", "Minha conta", "Gove", "Ver", "Ai",
  "Ver", "Ai" (parece transcrição truncada de fala, possível "governo"/"gov.br")
- (sem resposta da equipe nas 2h)
→ pedido vinculado: NÃO

**7) 558187287267 — 2026-07-20**
- 12:22 [CLIENTE] envia áudio
- 12:24 [CLIENTE] "Desculpa tá respondendo essa mensagem agora foi porque a gente não estamos
  mais trabalhando para o lado daí só daqui a duas semanas que estamos para esse lado aí tá bom
  aí eu falo com vocês aí"
- 12:24 [CLIENTE] "Boa tarde"
- 12:24 [CLIENTE] "Bom trabalho"
- 12:25 [CLIENTE] "🙏🏼🤝"
- (sem resposta da equipe — mensagem não é pedido, é despedida/cliente que parou de atender
  numa região)
→ pedido vinculado: NÃO

**8) 558183367399 — 2026-07-21**
- 15:57 [CLIENTE] envia áudio
- 15:58 [CLIENTE] "Localização"
- 16:17 [CLIENTE] "A caminho"
- (sem resposta da equipe — parece cliente avisando que está chegando, não pedido novo)
→ pedido vinculado: NÃO

**9) 558197366449 — 2026-07-30 (07:46)**
- 07:46 [CLIENTE] envia áudio
- 07:48 [CLIENTE] "Eu queria marca um indentidade mas ele e de menor e é meu irmão tem algum
  problema"
- 07:48 [CLIENTE] "Ou não"
- 07:49 [CLIENTE] "Eu tenho a minha"
- 07:50 [CLIENTE] "Ele não tem não ele e uma criança"
- 07:53 [CLIENTE] "Eu não posso não pq ele tem uma conta com o advogado quer tá com o caso dele
  aí fica difícil"
- (sem resposta da equipe — assunto sensível, fora do escopo de impressão/gráfica)
→ pedido vinculado: NÃO

**10) 558197606229 — 2026-07-30 (14:13)**
- 14:13 [CLIENTE] envia áudio (única mensagem na janela)
- (sem resposta da equipe nas 2h)
→ pedido vinculado: NÃO

**Achado qualitativo (amostra n=10, mas bate com o padrão dos 18):** em 9 das 10 sessões
amostradas NÃO HÁ nenhuma resposta de texto da equipe nas 2h seguintes ao áudio — a única exceção
(558196497589) teve resposta de preço + pergunta técnica ("R$9,00 cada folha" / "qual tamanho do
seu adesivo") mas ainda assim não converteu em pedido registrado. Isso é consistente com a taxa
de conversão real de 11,1% (2/18) — a mais baixa entre todos os tipos, MUITO abaixo de PDF
(69,1%) e imagem (51,6%). Vários áudios da amostra nem são pedido de serviço (cliente avisando
que está chegando, assunto de documento de menor de idade, despedida de cliente que mudou de
área) — sugere que uma fatia relevante do áudio como 1ª mensagem NÃO é intenção de compra.

---

### TIPO: outro_sticker (10 de 10 sessões — é o total do mês, não amostra)

**1) 558193750503 — 2026-07-03**
- 13:55 [CLIENTE] envia sticker
- 13:55 [CLIENTE] "Passo aí  pq tô  no médico"
- (sem resposta da equipe)
→ pedido vinculado: SIM

**2) 558197536109 — 2026-07-06**
- 13:31 [CLIENTE] envia sticker (única mensagem na janela)
→ pedido vinculado: NÃO

**3) 558194991364 — 2026-07-06**
- 14:17 [CLIENTE] envia sticker (única mensagem na janela)
→ pedido vinculado: NÃO

**4) 558187810979 — 2026-07-14**
- 08:08 [CLIENTE] envia sticker
- 08:23 [CLIENTE] envia PDF
- (sem resposta da equipe nas 2h)
→ pedido vinculado: NÃO

**5) 558187201259 — 2026-07-15**
- 16:12 [CLIENTE] envia sticker (única mensagem na janela)
→ pedido vinculado: NÃO

**6) 558197422896 — 2026-07-17**
- 17:59 [CLIENTE] envia sticker
- 18:06 [EQUIPE] "Obrigado! 😊"
- 18:25 [CLIENTE] envia áudio
→ pedido vinculado: SIM

**7) 558198016818 — 2026-07-24 — CASO DE CONTAMINAÇÃO, não descartar mas não tratar como
representativo:**
- 09:24 [CLIENTE] envia sticker
- 09:25–09:26 [CLIENTE] "Vcs vendem pendrive pequeno" / "Meu nome Elizângela mota" / "Ok" /
  "Vou aí daqui a pouco comprar. Pendrive e vou aí ok obrigado" / "Obrigada"
- 10:15–10:44 [CLIENTE] série de textos longos e imagens sobre ANTIBIÓTICOS (conteúdo de
  saúde/educacional, sem relação com gráfica) + capas de trabalho escolar
- 10:52 [EQUIPE] "Obrigado 😊"
- 11:04–11:12 [CLIENTE] "Obrigada" / "Mande o PDF tá incluso esse amigo" / "Ok obrigado"
→ pedido vinculado: SIM — mas o conteúdo da sessão é majoritariamente tráfego não relacionado
  a pedido de gráfica (mistura pergunta sobre pendrive + textão de saúde), same pattern do achado
  de dados contaminados já documentado (~23% dos contatos não são tráfego real da JS Gráfica).
  Tratar esse caso com cautela — não é representativo do padrão "sticker → pedido".

**8) 558185897161 — 2026-07-29**
- 08:27 [CLIENTE] envia sticker (única mensagem na janela)
→ pedido vinculado: NÃO

**9) 558186393800 — 2026-07-29**
- 15:35 [CLIENTE] envia sticker
- 15:38 [CLIENTE] envia 3 imagens
- 15:48 [CLIENTE] "Obg vcs"
→ pedido vinculado: SIM

**10) 558184836197 — 2026-07-30**
- 09:43 [CLIENTE] envia sticker
- 09:45 [CLIENTE] "Bom dia!\nUm almoço completo feijão mulatinho e almôndegas molho.\n14,00"
→ pedido vinculado: NÃO — **provável contaminação**: texto de almoço/comida não é produto de
  gráfica, parece tráfego de outro negócio (vendedor de marmita) chegando no mesmo número.

**Achado qualitativo:** amostra pequena (n=10, é a população total do mês). 2 dos 10 casos têm
sinais claros de contaminação (não são clientes reais da gráfica pedindo serviço). Descontando
esses 2, a taxa de conversão real do sticker como 1ª mensagem é mais baixa do que os 40% brutos
sugerem — provavelmente 2/8 (25%) entre sessões genuinamente relacionadas a gráfica.

---

### TIPO: video (1 de 1 sessão — total do mês)

**558188172184 — 2026-07-22**
- 09:41 [CLIENTE] envia vídeo (única mensagem na janela de 2h)
→ pedido vinculado: NÃO
Nota: o mesmo telefone aparece na amostra de "imagem" 1 dia antes (2026-07-21, sessão sem
resposta da equipe em 2h e sem pedido vinculado). Duas sessões seguidas do mesmo contato sem
retorno de texto da equipe — pode ser sinal de atendimento perdido, mas com n=1 de vídeo não dá
pra generalizar.

---

### TIPO: documento_outro / não-PDF (1 de 1 sessão — total do mês)

**558179009092 — 2026-07-30**
- 12:58 [CLIENTE] envia documento (mime_type application/octet-stream — provável arquivo
  corrompido/genérico)
- 12:58 [CLIENTE] "Quanto é pra imprimir?"
- 12:59 [CLIENTE] "As 95 teses de martinho lutero | DOCX https://share.google/08WPpMKo9MjY27JhN"
- 12:59 [CLIENTE] "Seria esse aq"
- 13:12 [CLIENTE] envia documento de novo (mime_type multipart/related — reenvio, provável
  problema técnico ao compartilhar)
- 13:13 [CLIENTE] "Vê se consegue agora"
- (sem resposta da equipe nas 2h)
→ pedido vinculado: NÃO
Achado qualitativo (n=1, não generalizar): esse único caso sugere que documento fora do padrão
PDF pode vir com problema técnico de compartilhamento (link do Google, mime_type genérico) — o
cliente teve que tentar 2x. Não dá pra tirar conclusão de volume com n=1, mas é um ponto de
atrito real observado.

---

### TIPO: outro_contact / cartão de contato (2 de 2 sessões — total do mês)

**1) 558192778804 — 2026-07-20**
- 07:38 [CLIENTE] envia cartão de contato
- 09:26–09:35 [CLIENTE] "Isca de frango" / "Pouca comida 😁" / "E mais isca" / "Pouco mulato" /
  "Ixi" / envia sticker
→ pedido vinculado: NÃO. Conteúdo (comida, "mulato" = provável arroz) não tem relação com
  gráfica — outro sinal de contaminação de tráfego não-JS-Gráfica no mesmo número/canal.

**2) 558198257944 — 2026-07-20**
- 10:02 [CLIENTE] envia cartão de contato (única mensagem na janela de 2h)
→ pedido vinculado: NÃO. Este telefone já foi identificado em investigação anterior (demandas
  168/170/173) como "Edvam Filho" — contato pessoal conhecido, não necessariamente cliente comum
  de gráfica testando o sistema.

**Achado:** os 2 únicos casos de "cartão de contato" como 1ª mensagem da sessão no mês inteiro
não são pedidos de gráfica — um é contaminação clara (assunto de comida), o outro é um contato
pessoal já mapeado. n=2, mas 0% é 0% real: cartão de contato não gera pedido neste dataset.

---

## Nota de metodologia (identificador de contato)

`phone` foi usado como identificador de sessão em vez de `contact_lid`. Verificação: no mês,
`phone` teve só 1 caso de 1-para-2 com `contact_lid` (o telefone de teste já excluído,
5521965185667/Edvam), enquanto `contact_lid` teve dezenas de casos de 1-para-2 `phone`
(provável reinstalação de WhatsApp/troca de aparelho gerando novo lid para o mesmo número). Ou
seja, `phone` é mais estável como identificador de contato único neste dataset — usar `phone`
subestima levemente sessões (se o mesmo `contact_lid` trocar de número no meio da janela seria
1 pessoa/2 phones, tratada como 2 contatos), mas isso é bem mais raro que o inverso.
