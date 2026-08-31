# Base de conhecimento completa — atendimento via WhatsApp (demandas 255 e 256)

Executado por: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA
Criado: 2026-07-30 (demanda 255). Atualizado: 2026-07-30 (demanda 256, escala real + linguagem
do cliente; demanda 260, checklist de voz real, seção 7).

**Este é um documento de pesquisa, não de redação.** Nenhuma conversa exemplo nova foi escrita
aqui — é a base de dado real que faltava antes da demanda 234. **Nenhuma proposta de mecanismo
pro agente (lista, pergunta, prioridade de categoria, opção de menu) pode ser escrita sem citar
este documento.**

## Nota de escala (demanda 256 — ler antes do resto)

A demanda 255 (seção original) trabalhou com amostra de um mês e amostras pequenas (44 sessões,
26 jornadas). A demanda 256 escalou isso:

- **Quantitativo (contagens, crosstabs) agora cobre 100% da base de clientes reais** — não mais
  um mês, histórico completo. População real na aprovação da demanda (2026-07-30, manhã): 666.
  População no momento da execução da análise (mesmo dia, mais tarde): **668** — diferença de +2
  por crescimento orgânico normal (sistema em produção, PDV rodando ao vivo). Toda a seção 3
  (mapa mídia→categoria) e os números de "novo vs. recorrente" abaixo usam os **668 clientes
  reais atuais**, não amostra. Ver diagnóstico completo do 666→668 em
  `evidencia-256/quantitativo_668_completo.md`.
- **Qualitativo (leitura de texto real) expandiu para 340 clientes (51% dos 666 confirmados na
  aprovação da demanda)** — seleção sistemática por stride (não escolha manual/enviesada):
  telefones ordenados, `stride = 666/340`, selecionado `idx = floor(i*stride)+1`. Método completo
  e lista dos 340 selecionados em `evidencia-256/selecao_340_metodo_stride.txt`. Os 12 lotes de
  leitura completa (28-29 telefones cada) estão em `evidencia-256/lote_00_resultado.md` a
  `lote_11_resultado.md`.
- Cada achado abaixo agora declara explicitamente quantos clientes/sessões cobre — não fica mais
  implícito qual era amostra pequena e o que já é escala real.

---

## Metodologia

Janela original (seção 1, demanda 255): 2026-07-01 a 2026-07-30. Janela da demanda 256: sem
corte de data, histórico completo de cada cliente. `jsgrafica_log_msgs_privadas.data_timestamp`
está em milissegundos — todas as consultas usaram `to_timestamp(data_timestamp / 1000.0)`, hora
local `AT TIME ZONE 'America/Recife'`. Excluídos sempre: grupos, mensagens apagadas, telefones de
teste/contaminação conhecidos (`5521965185667`, `558132176990`, `558181990533`,
`11308716003574@lid`, `169501605793973@lid` — os 2 últimos `@lid` confirmados como contaminação
total na demanda 256, ver seção de risco), `telefone='balcao'`/`'balcao-%'`. "Início de sessão" =
1ª mensagem do contato após 4h+ sem mensagem anterior. Pedido ligado à sessão: mesmo telefone
(match pelos últimos 11 dígitos, exceto `@lid` que casa direto por `phone`/`contact_lid`),
`created_at` dentro da janela da sessão ou até 48h depois (demanda 255) / -6h a +48h em torno de
cada pedido do telefone (demanda 256, leitura por cliente completo, não por sessão de 1 mês).

**Achado técnico**: usado `phone` (não `contact_lid`) como identificador de contato — verificado
que `contact_lid` tem dezenas de casos 1-telefone-pra-2-lids (provável troca de aparelho),
enquanto `phone` teve só 1 caso ambíguo. Mais estável pra esta análise.

---

## 1. Comportamento real por tipo de mídia (cobertura: 1 mês, 610 sessões — demanda 255, não
re-executado em escala pela 256 porque é achado de comportamento de equipe, não de contagem de
cliente)

Sessões iniciadas por mídia sem legenda (`media_type` preenchido, `message_text`/`caption`
vazios), contadas no mês inteiro:

| Tipo de mídia | Sessões no mês | Convertem em pedido (48h) | Taxa de conversão |
|---|---:|---:|---:|
| Documento/PDF | 372 | 257 | 69,1% |
| Imagem/foto | 217 | 112 | 51,6% |
| Áudio | 18 | 2 | 11,1% |
| Sticker | 10 | 4 | 40,0% (2 dos 4 são contaminação, ver seção 6) |
| Cartão de contato | 2 | 0 | 0% |
| Documento outro (docx etc.) | 1 | 0 | 0% |
| Vídeo | 1 | 0 | 0% |

**O comportamento da equipe muda de verdade por tipo — não é uniforme:**

- **PDF/documento**: a equipe quase nunca pergunta "que documento é esse". A resposta padrão é um
  agradecimento curto que funciona como confirmação implícita ("obg", "Obrigado! 😉") ou já vem
  com o preço direto. Confirmado exaustivamente na leitura de 340 clientes da 256: a esmagadora
  maioria dos pedidos por documento/PDF não tem NENHUMA pergunta de esclarecimento da equipe.
- **Imagem/foto**: quando responde, a equipe faz pergunta de TRIAGEM, não agradecimento. Mas em
  boa parte dos casos não há resposta de texto em 2h — parte da negociação acontece fora do
  texto (Pix mandado sem confirmação escrita, decisão presencial).
- **Áudio**: conversão baixíssima (11,1%) e quase nenhuma resposta da equipe. Áudio como canal de
  PEDIDO é raro e mal resolvido hoje.
- **Sticker/cartão de contato/vídeo**: volume irrelevante e parcialmente contaminado — não vale
  desenhar comportamento específico.

**Implicação direta pro desenho do agente**: documento e imagem são os únicos 2 tipos com volume
e conversão que justificam automação agora.

---

## 2. Categorias na linguagem do cliente (NOVO — demanda 256)

**Cobertura desta seção: 340 clientes reais (51% dos 666 confirmados na aprovação da demanda),
leitura completa de texto real, seleção sistemática por stride — não amostra pequena, não
escolhida a dedo.** Fonte: os 12 arquivos `evidencia-256/lote_00_resultado.md` a `lote_11.md`.

### 0. O achado mais importante: a maioria dos clientes não descreve nada em palavras

De 340 clientes lidos: **aproximadamente 193 (57%) escreveram pelo menos uma frase própria
substantiva** sobre o pedido; **aproximadamente 128 (38%) só mandaram o arquivo/imagem/documento,
sem nenhuma palavra digitada** ("pedido mudo"); os **~18 restantes (5%)** não têm log recuperável
na janela do pedido (mas quase sempre têm log em outra data, reportado com ressalva nos arquivos
brutos) ou são casos isolados de contaminação sem fala de cliente real. Estas contagens são a
soma dos resumos que cada um dos 12 lotes já reportou por conta própria (pequena margem de ±1 por
lote em casos de fronteira "texto mínimo" vs "sem texto", documentada dentro de cada arquivo, não
escondida).

**Isso confirma e agora quantifica em escala real o "Achado 1" da demanda 255** (jornada
silenciosa): não é exceção, é o padrão majoritário de um terço a 40% dos clientes. **Qualquer
proposta de mecanismo de agente (lista, pergunta obrigatória, menu) precisa funcionar bem quando
o cliente não escreve nada** — não pode presumir que o cliente vai descrever o que quer em
palavras.

### 1-9. Como os clientes descrevem o que querem, quando escrevem (grupos reais, não catálogo
interno) — cada grupo com exemplos literais dos 340 lidos

A tabela de categoria interna (`jsgrafica_produtos.categoria`, 14 categorias — seção 4) é
organização da gráfica, não como o cliente pensa. Nenhum cliente, nos 340 lidos, usou o termo
"Impressão papel ofício" ou "Consulta Online". Abaixo, os agrupamentos reais que emergem da
própria fala do cliente, quando ele fala:

**Grupo A — "Imprime isso que eu tenho" (documento/PDF/foto pronta, já em mãos digital)**
Grupo de maior volume disparado. Vocabulário: "imprime pra mim", "por favor imprimir", "pode
imprimir", "gostaria de imprimir esse documento", "por favor um orçamento" (raro). Cliente
identifica o pedido pelo TIPO DE DOCUMENTO que tem em mãos, não por categoria de impressão:
- Boleto/conta/fatura — vocabulário específico pra diferenciar versões: *"puxe só à de pagar"* /
  *"o de pagar e o detalhado"* (558184216944, lote 01); *"Tirar uma copia... Só preciso da que
  tem a msgem"* (558183698582, lote 01).
- Documento pessoal/jurídico — procuração, declaração, CNH, RG, comprovante de residência,
  alvará: *"Ai onde tem as assinaturas tem que colocar a data de hoje"* (558186607285, lote 03,
  documento judicial com testemunhas); *"Pode imprimir o laudo colorido por favor, e o
  comprovante de residência preto e branco"* (558187431933, lote 04).
- Resultado de exame médico: *"Você pode imprimir esse resultado de exame para mim?"*
  (558187246194, lote 04); *"Por favor imprime o resultado dos exames pra mim"* (558196053836,
  lote 08).
- Documento de terceiro (nome de arquivo revela o assunto sem o cliente descrever nada):
  *"DAE Doação - Maria Quiteria.pdf"* (558186236009, lote 03) — cliente nunca escreve uma frase,
  o nome do arquivo já entrega o pedido.

Confirma o mapa mídia→categoria da 255 (seção 3): documento/PDF vira "Impressão papel ofício" em
85-94% dos casos — o dado quantitativo dos 668 (seção 3 abaixo) bate exatamente com este padrão
qualitativo.

**Grupo B — "Preciso fazer/montar um currículo" (serviço de criação, não só impressão)**
Achado recorrente e forte nos 340 — currículo aparece dezenas de vezes como pedido de
**montagem/edição**, não impressão pura: *"Quanto fica currículo em pdf"* (558187967133, lote 05);
*"Vcs pode colocar foto nesse curriculum?"* (558196409480, lote 08); *"Falta a outra experiência...
Retira a experiência do português de baixo"* (558196409480, edição); *"Troca o endereço" / "E
agregar uma experiência" / "Empresa ultra limpo Função porteiro"* (558183246828, lote 00). Muitas
vezes vem junto com pedido de envelope: *"Vcs tem envelope pra botar currículo??"* (558193770883,
lote 07; 558187967133, lote 05). O catálogo trata isso como "AGENDAMENTO/CURRÍCULO/ANTECEDENTES/
DIGITAÇÃO" (1 categoria genérica) — o cliente trata como serviço de redação assistida.

**Grupo C — "Tirar xerox/cópia" (vocabulário ambíguo, cliente não distingue fotocópia física de
impressão de arquivo digital)**
Achado direto de confusão de vocabulário: cliente chama TANTO fotocópia física de documento em
papel QUANTO impressão de arquivo digital de "xerox" ou "cópia" — mesmo quando a equipe corrige.
Caso documentado (558198673450, lote 10): cliente pergunta "Quanto é o preço de 30 xerox" para um
PDF de apostila; a equipe corrige explicitamente ("não e xerox... e impreção p/b 1,20") e ela
insiste: *"É xerox"*. Caso espelhado, mesmo padrão invertido (558199245141, lote 11): equipe
oferece preço de impressão, cliente corrige *"Não e impressão / E quero em pdf"* (queria
digitalizar/scanner). **Implicação pro agente**: não presumir que a palavra "xerox" ou "cópia"
usada pelo cliente bate 1:1 com a categoria interna do mesmo nome.

**Grupo D — "Quero uma foto impressa" (por tamanho, não por categoria)**
Cliente especifica por medida/formato, não por nome de produto: *"ESSA 15 X 20" / "AS OUTRAS
10 X 15"* (558188260888, lote 05); *"Quanto tá impressão em folha fotográfica?"*
(evidência 255, mantida); *"Queria saber se vcs imprimem cartões no tamanho 5,5 × 8,5 cm, em
papel fotográfico"* (558199426913, lote 11); *"Foto 3/4 vocês fazem?"* (558196847478, lote 09).

**Grupo E — "Preciso resolver um documento/serviço oficial" (assistido, não é só impressão)**
Cliente pede ajuda com trâmite, não produto de catálogo: *"vcs fazem boletim de ocorrência pela
internet"* (558197103012, lote 09); *"Gostaria dos meus antecedentes criminais... Federal e
estadual"* (558181373081, lote 00; 558195755534, lote 08); *"Quanto e pra fazer um contrato de
aluguel de casa"* (558199674588, lote 11); agendamento Detran/SUS via link direto do governo
(558186518160, lote 03). Vários casos pedem serviço em nome de terceiro (mãe idosa, familiar) —
*"Sem condições de escrever tudo"* (558197103012, lote 09, pedindo em nome da mãe).

**Grupo F — "Algo personalizado pra festa/presente/negócio" (decoração, não impressão)**
Vocabulário de artesanato/festa, tamanho em cm, "com corte"/"sem corte"/"picotado": topo de bolo
(*"quero fazer um topo do bolo... seria ursinho rosa com balões rosinha"*, 558185628507, lote 02);
aplique/tubete (*"Vocês trabalham com esses aplique... E 13 que tem o tubete"*, 558187733689,
lote 04); adesivo com nome (*"Só troca a cor Do nome... Faz na cor preta"*, 558189175125, lote
06); etiqueta de doce (*"É picotado 😁"*, 558199443565, lote 11, cliente confeiteira); caneca/
camisa personalizada (*"Com a frase vovô nosso herói"*, 558191498762, lote 06).

**Grupo G — "Proteger/plastificar" (geralmente bundle com carteirinha/crachá)**
*"Queria que emplastificasse e se tem um cordãozinho para em pendurar"* (558185070094, lote 02)
— pronúncia popular "emplastificar"; *"tem como imprimir e enplastica 4 unidades... pra eu andar
com eles na minha bolsa ti peito"* (558196507652, lote 08).

**Grupo H — "Preciso que redijam um documento" (criação de conteúdo, não só impressão)**
Cliente dita o conteúdo, equipe escreve/formata: carta formal ao CRAS colada por inteiro como
texto no chat, não anexo (558186969731, lote 04); contrato particular de compra e venda de
terreno, ditado por áudio transcrito (558199744479, lote 11: *"a dona é a minha mãe... ela quer
vender esse terreno para minha filha... a advogada me aconselhou fazer esse documento pela lan
house"*); edição de contrato já existente (558394146606, lote 11: *"É só pra mudar o tamanho do
imóvel que está de 5x5 Por 7x7"*).

**Grupo I — "Recarga" (não é impressão, é serviço financeiro)**
Descrito só em valor de R$, nunca em termos de impressão: *"o senhor pode carregar 20 reais pra
mim"* (evidência 255); *"Vcs estão colocando crédito no Vem?"* (558184572020, lote 01).

### Cruzamento com o mapa mídia→categoria da 255 (confirmação, não substituição)

O mapa da 255 (seção 3 abaixo) mostrou que documento/PDF vira "Impressão papel ofício" em 85-94%
dos casos e imagem é mais distribuída (foto, adesivo, cartão, plastificação, encadernação). A
leitura de 340 clientes da 256 explica **por que**: documento/PDF quase sempre é o Grupo A
("imprime isso que eu tenho" — cliente já tem o arquivo pronto, pedido "mudo" ou frase mínima).
Imagem é o canal real de entrada dos Grupos D, F e G (foto, personalizados, plastificação) —
categorias que documento praticamente não gera, porque esses pedidos nascem de uma foto de
referência (ursinho rosa, logomarca, arte de adesivo), não de um arquivo pronto pra imprimir.

**Implicação prática pra qualquer menu/lista que o agente venha a mostrar ao cliente**: organizar
por "o que você tem em mãos" (documento pronto / documento físico pra copiar / foto ou arte /
preciso de ajuda com um trâmite / quero algo personalizado), não pelo nome interno da categoria —
e sempre assumir que o cliente pode simplesmente mandar o arquivo sem dizer nada (Grupo 0, 38%
dos casos).

---

## 3. Mapa de frequência real: mídia inicial → categoria de produto resultante

**Duas versões desta tabela agora coexistem, cobertura diferente, citar a certa conforme o uso:**
- **Versão "1 mês" (demanda 255)**: 357 pedidos documento / 164 pedidos imagem, janela
  2026-07-01 a 30. Boa pra entender comportamento recente.
- **Versão "histórico completo, 668 clientes" (demanda 256, NOVA)**: cobre 100% da base real,
  sem corte de data. Fonte: `evidencia-256/quantitativo_668_completo.md`. Usar esta versão pra
  qualquer decisão de prioridade/volume geral — é a que tem cobertura completa.

### Versão 1 mês (demanda 255) — mantida como estava

Quando chega DOCUMENTO/PDF (357 pedidos vinculados a 257 sessões):

| Categoria resultante | Pedidos | % |
|---|---:|---:|
| Impressão papel ofício | 305 | 85,4% |
| Xerox | 24 | 6,7% |
| Consulta Online | 10 | 2,8% |
| Escritório | 9 | 2,5% |
| (outras) | 9 | 2,6% |

Quando chega IMAGEM/FOTO (164 pedidos vinculados a 112 sessões):

| Categoria resultante | Pedidos | % |
|---|---:|---:|
| Impressão papel ofício | 95 | 57,9% |
| Impressão papel foto | 26 | 15,9% |
| Xerox | 8 | 4,9% |
| Impressão papel cartão | 6 | 3,7% |
| Plastificação | 6 | 3,7% |
| (outras) | 23 | 14,0% |

### Versão histórico completo, 668 clientes reais (demanda 256 — NOVA, esta é a cobertura total)

Tipo de mídia inicial = 1ª mensagem recuperável do cliente no log (histórico completo, não só um
mês). Categoria predominante = categoria mais pedida por aquele cliente ao longo de todo o
histórico.

| tipo_midia_inicial | qtd_clientes | % dos 668 |
|---|---:|---:|
| document | 266 | 39,8% |
| image | 204 | 30,5% |
| texto | 185 | 27,7% |
| sem_log (sem match) | 6 | 0,9% |
| audio | 3 | 0,4% |
| sticker | 3 | 0,4% |
| outro | 1 | 0,1% |

Crosstab completo (só combinações com peso — soma total = 668):

| tipo_midia_inicial | categoria_predominante | qtd_clientes |
|---|---|---:|
| document | Impressão papel oficio | 230 |
| image | Impressão papel oficio | 133 |
| texto | Impressão papel oficio | 120 |
| image | Impressão papel foto | 18 |
| texto | Consulta Online | 17 |
| document | Escritório | 11 |
| image | Impressão papel cartao | 11 |
| texto | Impressão papel foto | 10 |
| document | xerox | 9 |
| image | Consulta Online | 9 |
| image / texto | xerox | 7 cada |
| image | Impressão papel adesivo | 6 |
| (demais combinações, cada uma ≤5 clientes) | | |

**Leitura principal**: documento→ofício (230), imagem→ofício (133) e texto→ofício (120) somam
483 dos 668 clientes (72,3%) — a categoria "Impressão papel ofício" domina o comportamento
inicial independente do tipo de mídia, confirmado agora em 100% da base real, não só amostra de
mês. Consistente com o Grupo A da seção 2 (documento/PDF pronto pra imprimir é o pedido mais
comum, disparado).

**Novo vs. recorrente, 668 clientes, histórico completo (não existia na 255, novo na 256):**

| Tipo | Qtd clientes | % dos 668 | Total de pedidos gerados |
|---|---:|---:|---:|
| Novo (1 pedido em todo o histórico) | 394 | 59,0% | 394 |
| Recorrente (2+ pedidos) | 274 | 41,0% | 787 |

Os 41% recorrentes respondem por 787 dos 1.181 pedidos totais (66,6% do volume) — concentração de
volume esperada em base de clientes recorrentes.

**Log recuperável vs. só pedido, 668 clientes (novo na 256):** 662 (99,1%) têm pelo menos 1 sessão
real recuperável no log; só 6 (0,9%) têm pedido sem nenhuma mensagem de log correspondente.

---

## 4. Catálogo completo — as 14 categorias reais, uma a uma (cobertura: 1 mês, demanda 255 —
não alterado pela 256, que tratou da linguagem do cliente, não de reler o catálogo interno)

14 categorias reais e ativas confirmadas (`jsgrafica_produtos`, ignorando "Empréstimo" e
"Fechamento caixa" — lançamento financeiro interno). Todas as 14 têm exemplo real de conversa
disponível em `evidencia-255/catalogo-14-categorias.md`.

| # | Categoria | Volume no mês | Preço falado em texto? |
|---|---|---:|---|
| 1 | Impressão papel ofício | 792 | Às vezes |
| 2 | Xerox | 90 | — |
| 3 | Consulta Online | 64 | Não (perguntou 2x, sem resposta) |
| 4 | Impressão papel foto | 59 | Não |
| 5 | Escritório | 35 | — |
| 6 | Impressão papel cartão | 21 | Sim, claramente |
| 7 | Impressão papel adesivo | 19 | Não (só manda Pix) |
| 8 | Plastificação | 18 | Não |
| 9 | Recarga VEM | 15 | — |
| 10 | Personalizados | 12 | Não (só manda Pix) |
| 11 | Recarga celular | 8 | — |
| 12 | Encadernação | 8 | — |
| 13 | Impressão papel couché | 5 | Sim, confirmado 2x por escrito |
| 14 | Serviço terceirizado | 4 | Não |

### Como a equipe comunica preço, na prática — achado consolidado (255, confirmado qualitativamente de novo em 256)

Correlaciona fortemente com o tipo de produto:

- **Serviço de tabela fixa, fácil de citar de cabeça** (impressão avulsa por folha, xerox, papel
  cartão, papel couché, banner por m²) → **a equipe FALA o valor em texto**. Confirmado de novo
  em dezenas dos 340 casos lidos na 256 (ex.: "1,20"/"2,40" ditos direto após pedido de P&B A4).
- **Serviço sob orçamento/personalizado** (adesivo com corte, plastificação, topo de bolo,
  caneca/camisa, consulta/agendamento) → o padrão observado é **responder direto com o código
  Pix, sem falar o número**, ou negociar por fora do texto. Confirmado de novo em 256 nos Grupos
  F/G/H da seção 2 (ex.: 558188787312 pergunta "Quanto fica?" e só recebe o Pix, sem valor
  falado).

**Implicação pro agente**: mantém-se — um agente que tenta sempre "informar o preço em texto" vai
destoar do padrão real em produto sob encomenda.

---

## 5. Jornadas completas (cobertura: 26 jornadas reconstruídas em detalhe na demanda 255, mais
340 leituras de menor profundidade — literal + serviço + 1ª resposta + contaminação — na demanda
256, ver seção 2 e `evidencia-256/`)

| Categoria | Jornadas completas (255) | Cobertura garantida |
|---|---:|---|
| Impressão papel ofício | 8 | novo (4) + recorrente (4); Pix (3) + Dinheiro (3) + Cartão (2) |
| Xerox | 5 | — |
| Consulta Online | 5 | inclui SCANNER, CONSULTA SERASA, CONTA GOV, ACESSO/ENVIO DOCUMENTOS |
| Impressão papel foto | 4 | inclui 1 caso recorrente (Polaroid + 10x15) |
| Escritório | 4 | inclui CARTEIRA PARA RG, ENVELOPE A4, CANETA COMUM |

As 26 jornadas completas (255) continuam em `evidencia-255/jornadas-*.md`. Os 340 casos da 256
(mais rasos, mas 8x mais clientes) estão em `evidencia-256/lote_00_resultado.md` a `lote_11.md` —
cada telefone com frase literal, produto real, 1ª resposta da equipe e flag de contaminação.

### Achados que atravessam várias jornadas (255, ainda válidos)

**Achado 1 — "jornada silenciosa" é o padrão mais comum, não exceção.** Agora quantificado em
escala real pela 256: ~38% dos 340 clientes lidos mandam só mídia, sem nenhuma palavra (ver
seção 2, Grupo 0).

**Achado 2 — confusão com a Dizu Refeições pode vir da EQUIPE, não só do cliente** (caso Nathalia
Soares, 558183106106) — ver seção 6, agora com mais casos confirmados pela 256.

**Achado 3 — pedidos combinados nem sempre viram 1 registro só.**

**Achado 4 — template automático "Pedido confirmado! → em produção → pronto" dispara em bloco**
quando o pedido é simples e a equipe está com o cliente na hora.

**Achado 5 (NOVO, 256) — o `servico_nome`/categoria registrado às vezes não reflete o que foi
realmente conversado.** Casos confirmados na leitura de 340: 558189370005 (registrado como
"Entrada diversa", conversa real é convite de aniversário personalizado); 558191570159
(registrado como "Impressão 2ª via conta", conteúdo real são plantas de arquitetura);
558195693976 e 558196409480 (registrados como "Impressão", conversa real é 100% sobre montagem/
edição de currículo — ver Grupo B da seção 2); 558184640012 (pedido registrado é xerox simples,
conversa capturada é orçamento de panfleto — provável pedido separado ou negociação em aberto).
**Não inventar mecanismo que "leia o produto pelo texto da conversa" sem contar com esse
descompasso.**

---

## 6. Achados de risco / contaminação (cobertura: 1 mês na 255, 340 clientes + 668 population
scan na 256 — números somados abaixo, ambos citados)

### Contaminação confirmada por "Dizu Refeições" (negócio de marmita/quentinha compartilhando a
mesma instância de WhatsApp) — achado crítico, agora com evidência textual direta

A demanda 255 já tinha achado ~23% de contatos contaminados no log geral
(`project_log_dados_contaminados.md`) e 3 sessões contaminadas na amostra de 1 mês. A demanda 256
foi além: **na leitura de 340 clientes REAIS (com pedido de verdade confirmado), pelo menos 10-13
casos têm contaminação direta e confirmada de tráfego "Dizu Refeições" no mesmo número** —
inclusive **prova textual direta** de que os dois negócios compartilham a mesma instância de
WhatsApp: mensagem interna real encontrada no log (09/07): *"WhatsApp bloqueou o número da Dizu,
vamos continuar atendendo os Almoços pela JS Gráfica mesmo"* (achada no cluster do telefone
`255949986103392@lid`, lote 00 da 256). Esse mesmo `@lid` e o `169501605793973@lid` (a própria
fonte do broadcast de cardápio) foram confirmados como contaminação total e adicionados à lista
de exclusão padrão desta pesquisa (ver Metodologia).

Casos confirmados na leitura de 340 (lista não exaustiva, ver arquivos brutos pra completa):
- `255949986103392@lid` (lote 00) — contaminação TOTAL, nenhuma mensagem real sobre o pedido de
  impressão sobrevive no log.
- `558183106106`, Nathalia Soares (lote 00) — contaminação parcial: 1ª mensagem "da equipe" é na
  real o cardápio automático; cliente reage confusa ("Tá funcionando ou está no horário de
  almoço?"), equipe se desculpa e segue o atendimento real depois.
- `558184836197` (lote 02), `558184651027` (lote 01), `558185555477` (lote 02), `558189926601`
  (lote 06, registrado como "Recebimento de empréstimo" — contaminação estrutural dentro da
  própria tabela `jsgrafica_pedidos`), `558191612382` (lote 06), `558192778804` "JM Novo" (lote
  07, contaminação forte e recorrente, múltiplos pedidos de marmita com nomes de terceiros),
  `558195552362` (lote 08), `558191921749` e `558193284834` (lote 07, contaminação fora da janela
  exata do pedido, mas mesmo telefone).

**1 caso adicional de contaminação de tipo diferente** (não é Dizu): `558199098314` (lote 11) —
mensagem de golpe/phishing bancário ("fatura do seu cartão Americanas") no mesmo número,
claramente não relacionada à gráfica nem à Dizu.

**Implicação**: contaminação cruzada com a Dizu não é um caso raro isolado — aparece em
aproximadamente 3-4% dos clientes REAIS lidos em detalhe (não do ruído geral de contatos, que já
era ~23%, mas especificamente entre quem tem pedido de gráfica confirmado). Qualquer agente
automatizado de atendimento precisa ter uma forma de detectar/filtrar esse padrão (ex.: mensagem
de cardápio de "Dizu"/quentinha chegando misturada no fluxo do cliente da gráfica), não só contar
com que "não vai acontecer".

### Outros achados de risco (255, mantidos)

- Sticker e cartão de contato são bases pequenas E parcialmente sujas — não usar essas 2
  categorias de mídia pra desenhar comportamento de agente sem re-limpar a amostra.
- `servico_nome`/categoria às vezes não bate com a conversa real (ver seção 5, Achado 5, novo na
  256).

---

## 7. Voz real do time no atendimento, checklist (NOVO, demanda 260)

**Por que esta seção existe**: a auditoria da demanda 260 comparou toda fala 🟡 SIMULADO do
blueprint contra a evidência bruta desta base e achou que a camada de conteúdo/decisão (o que
responder) estava bem embasada, mas a camada de voz (como escrever a resposta) tinha sido
inventada por estilo, não extraída do corpus. A fórmula "Recebemos [X] 😊", que abria a maioria
dos exemplos do blueprint, não aparece nenhuma vez em nenhum dos 340 clientes lidos (demandas
255/256). Esta seção fecha essa lacuna com números reais, pra qualquer fala futura do agente
citar aqui, do mesmo jeito que já é obrigatório citar a seção 2 pra categoria/opção.

### Metodologia desta contagem

Leitura completa das 12 planilhas de evidência (`evidencia-256/lote_00_resultado.md` a
`lote_11_resultado.md`, 340 clientes), extraindo o campo "Primeira resposta da equipe" de cada
entrada. Excluído da contagem: (a) entradas sem nenhuma resposta capturada; (b) mensagens
automáticas de template do próprio sistema (ex. "Pedido confirmado! 🖨️..."), que não são escrita
manual do time; (c) entradas já sinalizadas como contaminação de outro negócio (Dizu Refeições,
número de funcionária, número de teste). Sobraram **191 respostas manuais reais e genuínas do
time**, distribuídas nos 12 lotes. Cada resposta foi classificada por: presença/ausência e
posição de emoji, contagem de palavras, e presença de marcador de informalidade (letra minúscula
no início da frase, falta de acento, abreviação como "obg"/"vc"/"pra"/"tá", erro de digitação).

### Os números reais

| Métrica | Resultado real (191 respostas, 12 lotes) |
|---|---|
| Respostas com emoji | 56 de 191 (29%), **minoria, não maioria** |
| Respostas sem nenhum emoji | 135 de 191 (71%) |
| Qual emoji aparece | Só 😊 ou 😉, nunca outro, em toda a base lida |
| Quantos emoji por mensagem, quando aparece | Sempre exatamente 1 |
| Onde o emoji aparece | Quase sempre no final da mensagem; existe exceção real em
mensagem de múltiplas frases (ex. "Já estamos abertos sim. 😉 Em que posso te ajudar?", telefone
558179068274, lote 00, onde o emoji fecha a 1ª frase e a conversa continua depois) |
| Tamanho, 1 a 3 palavras | 106 de 191 (55%), a moda real, dominada por "Obrigado"/"obg"/preço |
| Tamanho, 4 a 6 palavras | 24 de 191 (13%) |
| Tamanho, 7 a 12 palavras | 14 de 191 (7%) |
| Tamanho, 13+ palavras | 47 de 191 (25%), mensagens explicativas de preço/especificação |
| Respostas com informalidade/erro visível | 104 de 191 (54%), **maioria**, não exceção |

**Nota de correção em relação à contagem preliminar do PM (contexto da demanda 260)**: a auditoria
inicial estimou "~38% com emoji" a partir de leitura amostral. A recontagem completa e sistemática
dos 191 casos reais (feita nesta demanda, indo entrada por entrada nos 12 lotes) encontrou **29%**,
ainda claramente minoritário, mesma conclusão prática (emoji não é o padrão, é a exceção
frequente), só que com o número exato revisado e citável.

### O que "informalidade real" significa na prática (exemplos literais, não parafraseados)

- Início de frase em minúscula: "bom dia", "boa tarde", "pode vir buscar", "desculpe"
- Falta de acento: "nao" (não), "esta" (está), "sera" (será), "ira" (irá)
- Abreviação: "obg" (obrigado), "vc"/"você" alternando, "pra" (para), "tá" (está)
- Erro de digitação real, sem correção: "correão" (correção), "Obrigo" (Obrigado), "ttarde"
  (tarde), "pade" (pode), "Bo dia" (Bom dia)
- Interjeição informal: "Opa", "Show de bola", "tia Carla é top!" (558199778756, lote 11)
- Caso raro de ênfase em maiúscula: "BOA TARDE" / "OK" (558199443565, lote 11), não é o padrão,
  mas existe, então não é proibido categoricamente
- **Padrão real, não regra inventada**: mensagens curtas (1-6 palavras) puxam mais pra
  informalidade; mensagens longas e explicativas de preço tendem a vir mais bem escritas (ainda
  que sem ser 100% gramaticalmente perfeitas). A correlação é "tamanho → registro", não um
  interruptor ligado/desligado.

### Checklist pra escrever (ou revisar) qualquer fala nova do agente

1. **Emoji é exceção controlada, não regra**: usar 😊 ou 😉 em no máximo 1 a cada 3 falas
   simuladas do agente, nunca mais de 1 por mensagem, sempre no final (a menos que a mensagem
   tenha mais de 1 frase, aí pode fechar a 1ª frase). Nunca outro emoji além desses 2.
2. **Prefira curto**: se a fala real equivalente do corpus tende a ser 1-6 palavras (confirmação,
   agradecimento, instrução simples), a fala do agente deve ser igual de curta, não alongar por
   educação/estilo.
3. **Não reescrever pra "soar mais informal" por impressão**: reaproveitar vocabulário real
   observado (obg/ok/direto o preço), não inventar gíria nova que não apareceu em nenhum lote.
4. **Toda fala precisa citar de onde veio a inspiração**: qual lote, ou qual regra/achado desta
   base, não só "parece que o time fala assim".
5. **Nunca usar travessão** em nenhuma fala do agente, regra do projeto, vale também pro texto
   que vai pro cliente real, não só documentação interna.

## 8. Regra de uso deste documento

Qualquer demanda futura que proponha mecanismo de agente (que pergunta fazer, que lista mostrar,
que categoria priorizar, se deve ou não falar preço em texto, como organizar opções pro cliente)
**precisa citar a seção correspondente deste documento** como fundamento — não pode mais propor
"achando que serve". Se a pergunta específica não estiver coberta aqui, a resposta correta é
fazer a investigação pontual nova, não inventar. **A partir da demanda 256, qualquer proposta de
categoria/opção voltada pro cliente precisa citar a seção 2 (linguagem do cliente), não só a
seção 4 (catálogo interno). A partir da demanda 260, qualquer fala nova do agente também precisa
citar a seção 7 (voz real do time).**

## Referências

Demanda 234 (`pm/conhecimento/manual-resposta-ia-100-clientes.md`). Demanda 254 (achado que
motivou a pesquisa 255). Demanda 255 (pesquisa original, 1 mês + amostras pequenas). Demanda 256
(escala real: 668 clientes no quantitativo, 340 no qualitativo, + linguagem do cliente).
Demandas 159-163/204 (metodologia de sessão/timezone). `jsgrafica_log_msgs_privadas`,
`jsgrafica_pedidos`, `jsgrafica_produtos`.

**Dados brutos preservados permanentemente:**

`pm/conhecimento/evidencia-255/` (demanda 255, amostra de 1 mês):
- `catalogo-14-categorias.md`, `parte1_contagens_e_amostras.md`,
  `parte2_crosstab_midia_x_categoria.md`, `jornadas-oficio.md`, `jornadas-xerox.md`,
  `jornadas-consulta-online.md`, `jornadas-foto.md`, `jornadas-escritorio.md`.

`pm/conhecimento/evidencia-256/` (demanda 256, escala real):
- `lote_00_resultado.md` a `lote_11_resultado.md` — os 340 clientes lidos em detalhe (28-29 cada
  lote), frase literal + produto real + 1ª resposta da equipe + flag de contaminação, cada um.
- `quantitativo_668_completo.md` — crosstab completo mídia×categoria, novo vs. recorrente, log
  recuperável vs. só pedido, sobre os 668 clientes reais (histórico completo, não amostra).
- `selecao_340_metodo_stride.txt` — lista dos 340 telefones selecionados e o método de seleção
  sistemática (stride) usado, pra auditoria/reprodução.

Este documento consolida os achados citáveis; qualquer citação adicional de conversa real além do
que está reproduzido aqui deve vir desses arquivos brutos, não de memória.
