# Manual de resposta da IA + perfis candidatos — reconstrução de 100 clientes reais (demanda 234)

Executado por: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA
Data: 2026-07-29
Janela de dados: 2026-07-01 a 2026-07-28 (`jsgrafica_pedidos`, `jsgrafica_log_msgs_privadas`, `jsgrafica_contatos`)

Este documento reconstrói, conversa a conversa, uma amostra diversa de 100 clientes reais da
JS Gráfica — não pra remedir volume/percentual (isso já está feito nas demandas 159-163/204/205,
`mapa-jornada-atendimento-whatsapp.md`), mas pra extrair **regras concretas de comportamento**
que a equipe já segue na prática, com cada regra amarrada a uma conversa real citável. A segunda
parte refina a lista de candidatos à automação gradual (demanda 209).

**Leitura obrigatória antes deste documento**: `mapa-jornada-atendimento-whatsapp.md` (mapa
agregado), `pm/OBJETIVOS-MACRO.md` (objetivo 2), demandas 159-163/202/203/206/208/209.

---

## 1. Metodologia

### 1.1 Amostra — como os 100 foram escolhidos

Não foi amostra de conveniência. Pool inicial: **628 telefones distintos** com pelo menos 1
pedido real (`telefone` numérico, não `"balcao"` nem `"balcao-*"`) na janela 07-01 a 07-28,
excluindo os telefones de teste/contaminação já conhecidos (`5521965185667` do Edvam,
`558132176990` bot Neoenergia/Celpe, `558181990533` golpe de farmácia).

Categorizei cada telefone por `servico_nome` agregado em 4 baldes (RAPIDO: P&B A4/Colorida/Xerox/
2ª via — o padrão dominante já medido em 62-74% do volume pelas demandas 161/204; LENTO:
Agendamento/Currículo/Antecedentes/Digitação; ESPECIAL: Foto/Plastificação/Encadernação/Cartão/
Adesivo/Envelope/Scanner/Recarga/etc.; MISTO: combina 2+ categorias) e por recorrência
(`total_pedidos` = 1 → NOVO, 2+ → RECORRENTE). Amostragem estratificada com espaçamento
(`stride sampling`, não os N mais recorrentes — isso enviesaria pra quem já é "cliente favorito")
dentro de cada combinação balde×recorrência, forçando a inclusão dos 8 candidatos já avaliados
pela demanda 209 como âncoras de continuidade.

**Diversidade final documentada** (100 clientes):

| Dimensão | Distribuição |
|---|---|
| Categoria de serviço | RAPIDO 50, ESPECIAL 20, MISTO 15, LENTO 10, OUTRO 5 |
| Novo vs. recorrente | NOVO 54, RECORRENTE 46 |
| Forma de pagamento (pedido mais recente) | dinheiro 34, pix 30, sem registro 24, dinheiro+pix 10, cartão 2 |
| Momento de pagamento | sem registro 53, agora 42, retirada 2, agora+retirada 3 |
| Cancelamento | 87 sem cancelamento, 13 com pelo menos 1 pedido cancelado |

### 1.2 Achado de limpeza — contaminação encontrada ANTES de fechar a amostra

Ao montar a seleção inicial de 100, 5 candidatos vieram de sinal enganoso e foram substituídos
por candidatos reais do mesmo balde antes de qualquer leitura:
- **3 lançamentos financeiros internos gravados como se fossem pedido de cliente**: telefones com
  `servico_nome` = "Entrada diversa", "Entrada 50,00 3 banner..." e "Recebimento de empréstimo"
  (este último com `nome_cliente = "Dizu Refeições"`, R$400 — claramente um evento financeiro
  interno do grupo, não uma cliente). Achado relevante: `jsgrafica_pedidos` foi usado por um
  tempo como workaround pra registrar entrada de caixa avulsa, antes de `jsgrafica_entradas_avulsas`
  existir (criada só na demanda 226, 22/07) — qualquer automação futura que use `jsgrafica_pedidos`
  como fonte de "todo cliente real" precisa filtrar esse tipo de `servico_nome`.
- **1 telefone `@lid` que era o próprio broadcast de cardápio da Dizu Refeições** (`169501605793973@lid`)
  vazando dentro do log de mensagens privadas da JS Gráfica — não é confusão de cliente, é o
  emissor do cardápio (mensagens `from_me=true` mandando cardápio de quentinha pra uma lista, com
  aviso final "Whatsapp bloqueou o número da Dizu, vamos continuar atendendo os Almoços pela JS
  Gráfica mesmo"). **Achado de risco relevante**: confirma, com evidência mais forte que a 159/160,
  que a mistura Dizu×JS Gráfica não é só "cliente errou o número" — o próprio negócio de comida
  operou, por um tempo, dentro da mesma instância de WhatsApp da gráfica.
- **1 telefone `@lid` sem nenhuma mensagem real do cliente** (`11308716003574@lid`, só 2 mensagens
  `from_me=true` sem nenhuma resposta capturável) — sem dado suficiente pra reconstrução, substituído.

### 1.3 Achado técnico — `data_timestamp` em milissegundos, não segundos

Achado **novo e crítico**, encontrado de forma independente 2 vezes (uma em cada consulta paralela
desta investigação): a coluna `data_timestamp` de `jsgrafica_log_msgs_privadas` (usada pra
ordenar/filtrar mensagens por tempo, já que `sent_at`/`delivered_at`/etc. são `text` não confiável)
está em **milissegundos desde epoch**, não segundos. Usar `to_timestamp(data_timestamp)` direto
(como o texto de investigações anteriores fazia supor) produz datas no ano 58021+, zerando
silenciosamente qualquer filtro de janela de tempo. A correção é `to_timestamp(data_timestamp / 1000.0)`.
**Recomendo revisar/corrigir a memória `reference_n8n_api_escrita`/qualquer nota técnica que cite
essa coluna, e checar se algum workflow n8n em produção depende de `data_timestamp` sem essa
correção** — isso é fora do escopo desta demanda (é achado de infraestrutura, não de comportamento
de atendimento), reportando pro PM avaliar com o 01-N8N/02-DADOS.

### 1.4 Duas camadas de reconstrução

1. **Estruturada (todos os 100/196 pedidos)**: via SQL, cruzando `jsgrafica_pedidos` com métricas
   agregadas de `jsgrafica_log_msgs_privadas` numa janela de -6h/+48h do `created_at` de cada
   pedido (mensagens do cliente, da equipe, tipo da 1ª mensagem, tempo até 1ª resposta). Tabela
   completa na seção 3.
2. **Qualitativa (subamostra de 40, estratificada pelas mesmas dimensões)**: texto real,
   mensagem a mensagem, com timestamp local — é a base de evidência citável do manual de
   resposta (seção 4). Arquivos brutos ficam em
   `C:\Users\edvam\AppData\Local\Temp\claude\...\scratchpad\conversas\grupo{1-5}.md` (temporários,
   não fazem parte do repositório — as citações relevantes estão reproduzidas neste documento).

---

## 2. Honesto sobre o que esta amostra NÃO é

Isto **não é uma remedição do volume real de atendimento** — a amostra foi estratificada de
propósito pra cobrir diversidade (inclusive baldes raros como LENTO/OUTRO), então proporções como
"quantos % começam por mídia" ou "tempo mediano de resposta" **não devem ser citadas a partir
deste documento** como estatística populacional — isso já foi medido corretamente nas demandas
159-163/204/205 com metodologia de amostra representativa, não estratificada. Este documento serve
pra **regra de comportamento com evidência**, não pra estatística de frequência.

---

## 3. Reconstrução estruturada — os 100 clientes / 196 pedidos

Tabela completa. `Timing pgto` = classificação automática (comparando `pagamento_confirmado_at`
com `data_producao_at`/`data_entregue_at`) em ANTECIPADO / NA_RETIRADA / SEM_DADO (campos nulos).
`1ª msg` = tipo da primeira mensagem do cliente na janela do pedido. `Resp. equipe (min)` = minutos
até a 1ª resposta da equipe **dentro da janela calculada** (não comparável à mediana oficial de
0,7min da demanda 161 — ver ressalva na seção 6).

| Telefone | Cliente | Pedido | Serviço | Categoria | Qtd | Valor | Pagamento (forma/momento) | Timing pgto | Status | 1ª msg | Msgs cliente/equipe | Resp. equipe (min) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CLIENTE-001 | Solfácil | ped-1044 | DIGITAÇÃO DE PROVAS | LENTO | 1 | R$ 5 | dinheiro/agora | NA_RETIRADA | entregue | sem msg | 0/0 | — |
| CLIENTE-002 | CLIENTE-002 | ped-0457 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 5/2 | 7 |
| CLIENTE-002 | CLIENTE-002 | ped-0468 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 5/2 | 7 |
| CLIENTE-003 | CLIENTE-003 | ped-0493 | IMPRESSÃO P&B A4 | RAPIDO | 6 | R$ 7.2 | —/— | SEM_DADO | cancelado | texto | 4/0 | — |
| CLIENTE-003 | CLIENTE-003 | ped-0494 | ENVELOPE A4 | ESPECIAL | 1 | R$ 1 | —/— | SEM_DADO | cancelado | texto | 4/0 | — |
| CLIENTE-003 | CLIENTE-003 | ped-0495 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | —/— | SEM_DADO | cancelado | texto | 4/0 | — |
| CLIENTE-003 | CLIENTE-003 | ped-0496 | ENVELOPE A4 | ESPECIAL | 1 | R$ 1 | —/— | NA_RETIRADA | entregue | texto | 4/0 | — |
| CLIENTE-004 | CLIENTE-004 | ped-0778 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_sem_legenda | 2/1 | 5 |
| CLIENTE-005 | CLIENTE-005 | ped-0948 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/— | ANTECIPADO | entregue | texto | 10/3 | 2 |
| CLIENTE-006 | CLIENTE-006 | ped-1139 | IMPRESSÃO P&B A4 | RAPIDO | 5 | R$ 6 | pix/agora | ANTECIPADO | entregue | midia_sem_legenda | 12/2 | 9 |
| CLIENTE-007 | CLIENTE-007 | ped-0136 | FOTO 15X20 | ESPECIAL | 1 | R$ 4.5 | —/— | SEM_DADO | pronto | midia_sem_legenda | 14/0 | — |
| CLIENTE-008 | CLIENTE-008 | ped-0222 | DIGITAÇÃO DE PROVAS | LENTO | 1 | R$ 5 | —/— | NA_RETIRADA | entregue | texto | 9/6 | 3 |
| CLIENTE-009 | CLIENTE-009 | ped-0413 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | SEM_DADO | cancelado | texto | 6/1 | 38 |
| CLIENTE-009 | CLIENTE-009 | ped-0423 | IMPRESSÃO P&B A4 | RAPIDO | 3 | R$ 3.6 | —/— | NA_RETIRADA | entregue | texto | 6/1 | 38 |
| CLIENTE-009 | CLIENTE-009 | ped-0749 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_sem_legenda | 1/1 | 3 |
| CLIENTE-010 | CLIENTE-010 | ped-0907 | carteirinha | OUTRO | 1 | R$ 10 | dinheiro/agora | SEM_DADO | entregue | texto | 13/0 | — |
| CLIENTE-011 | CLIENTE-011 | ped-0367 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-012 | CLIENTE-012 | ped-0842 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_com_legenda | 7/1 | 2820 |
| CLIENTE-012 | CLIENTE-012 | ped-1035 | FOTO 10X15 | ESPECIAL | 5 | R$ 12.5 | pix/agora | ANTECIPADO | entregue | midia_sem_legenda | 5/1 | 12 |
| CLIENTE-013 | CLIENTE-013 | ped-1667 | IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) | ESPECIAL | 2 | R$ 13 | dinheiro/agora | ANTECIPADO | entregue | texto | 10/1 | 113 |
| CLIENTE-013 | CLIENTE-013 | ped-1668 | PLASTIFICAÇÃO PEQUENA | ESPECIAL | 1 | R$ 4 | dinheiro/agora | ANTECIPADO | entregue | texto | 10/1 | 113 |
| CLIENTE-014 | CLIENTE-014 | ped-0725 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 6/6 | 36 |
| CLIENTE-014 | CLIENTE-014 | ped-0873 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_sem_legenda | 3/2 | 27 |
| CLIENTE-015 | CLIENTE-015 | ped-1235 | IMPRESSÃO P&B A4 | RAPIDO | 3 | R$ 3.6 | cartao/— | ANTECIPADO | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-016 | CLIENTE-016 | ped-1539 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/— | ANTECIPADO | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-017 | CLIENTE-017 | ped-0886 | FOTO 20X29 | ESPECIAL | 1 | R$ 9 | pix/— | ANTECIPADO | entregue | texto | 5/0 | — |
| CLIENTE-018 | CLIENTE-018 | ped-1275 | SCANNER | ESPECIAL | 1 | R$ 0.7 | dinheiro/agora | ANTECIPADO | entregue | sem msg | 0/2 | — |
| CLIENTE-018 | CLIENTE-018 | ped-1276 | ACESSO/ENVIO DOCUMENTOS | ESPECIAL | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | sem msg | 0/2 | — |
| CLIENTE-019 | CLIENTE-019 | ped-1523 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_sem_legenda | 1/1 | 9 |
| CLIENTE-020 | CLIENTE-020 | ped-1410 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | pix/— | SEM_DADO | confirmado | texto | 19/1 | 24 |
| CLIENTE-020 | CLIENTE-020 | ped-1411 | PLASTIFICAÇÃO MÉDIA | ESPECIAL | 1 | R$ 5 | pix/— | SEM_DADO | confirmado | texto | 19/1 | 24 |
| CLIENTE-020 | CLIENTE-020 | ped-1412 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | pix/agora | SEM_DADO | confirmado | texto | 19/1 | 24 |
| CLIENTE-020 | CLIENTE-020 | ped-1413 | PLASTIFICAÇÃO MÉDIA | ESPECIAL | 1 | R$ 5 | pix/agora | SEM_DADO | confirmado | texto | 19/1 | 24 |
| CLIENTE-021 | CLIENTE-021 | ped-1001 | FOTO POLAROID 7X10 | ESPECIAL | 2 | R$ 4 | —/— | SEM_DADO | confirmado | texto | 8/3 | 9 |
| CLIENTE-022 | CLIENTE-022 | ped-0291 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-022 | CLIENTE-022 | ped-0987 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/agora | ANTECIPADO | entregue | midia_sem_legenda | 2/1 | 4 |
| CLIENTE-022 | CLIENTE-022 | ped-1378 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/agora | NA_RETIRADA | entregue | sem msg | 0/0 | — |
| CLIENTE-023 | CLIENTE-023 | ped-0236 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 3/3 | 34 |
| CLIENTE-024 | CLIENTE-024 | ped-1171 | IMPRESSÃO PAPEL FOTO A4 230g | ESPECIAL | 1 | R$ 6.5 | dinheiro/— | ANTECIPADO | entregue | texto | 12/0 | — |
| CLIENTE-024 | CLIENTE-024 | ped-1535 | IMPRESSÃO PAPEL FOTO A3 230g | ESPECIAL | 2 | R$ 18 | pix/— | ANTECIPADO | entregue | texto | 15/3 | 14 |
| CLIENTE-024 | CLIENTE-024 | ped-1550 | IMPRESSÃO PAPEL CARTÃO A3 180G (só frente) | ESPECIAL | 1 | R$ 7 | pix/— | ANTECIPADO | entregue | texto | 15/3 | 14 |
| CLIENTE-025 | CLIENTE-025 | ped-0070 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 4/3 | 17 |
| CLIENTE-025 | CLIENTE-025 | ped-1107 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/— | ANTECIPADO | entregue | midia_sem_legenda | 2/0 | — |
| CLIENTE-025 | CLIENTE-025 | ped-1108 | RECARGA CELULAR 20,00 | ESPECIAL | 1 | R$ 20 | dinheiro/agora | NA_RETIRADA | entregue | midia_sem_legenda | 2/0 | — |
| CLIENTE-026 | CLIENTE-026 | ped-1709 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/— | ANTECIPADO | entregue | midia_sem_legenda | 10/1 | 22 |
| CLIENTE-027 | CLIENTE-027 | ped-1028 | ENCADERNAÇÃO DE 101 À 200 FOLHAS | ESPECIAL | 1 | R$ 7.5 | dinheiro/agora | ANTECIPADO | entregue | texto | 5/1 | 63 |
| CLIENTE-028 | CLIENTE-028 | ped-0083 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 1/3 | 1 |
| CLIENTE-029 | CLIENTE-029 | ped-0735 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_com_legenda | 1/1 | 3 |
| CLIENTE-029 | CLIENTE-029 | ped-1164 | IMPRESSÃO P&B A4 | RAPIDO | 3 | R$ 3.6 | dinheiro/agora | ANTECIPADO | entregue | texto | 4/0 | — |
| CLIENTE-030 | CLIENTE-030 | ped-0356 | DIGITAÇÃO DE PROVAS | LENTO | 1 | R$ 5 | —/— | NA_RETIRADA | entregue | midia_com_legenda | 6/4 | 8 |
| CLIENTE-030 | CLIENTE-030 | ped-0991 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | dinheiro/agora | NA_RETIRADA | entregue | texto | 5/2 | 170 |
| CLIENTE-030 | CLIENTE-030 | ped-0992 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | dinheiro/agora | NA_RETIRADA | entregue | texto | 5/2 | 170 |
| CLIENTE-030 | CLIENTE-030 | ped-1082 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 2 | R$ 10 | dinheiro/agora | ANTECIPADO | entregue | texto | 5/2 | 170 |
| CLIENTE-030 | CLIENTE-030 | ped-1471 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/— | ANTECIPADO | entregue | texto | 6/1 | 96 |
| CLIENTE-031 | CLIENTE-031 | ped-0610 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/retirada | ANTECIPADO | entregue | midia_sem_legenda | 1/2 | 67 |
| CLIENTE-032 | CLIENTE-032 | ped-0687 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | cartao/agora | ANTECIPADO | entregue | texto | 2/2 | 107 |
| CLIENTE-032 | CLIENTE-032 | ped-0908 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/— | ANTECIPADO | entregue | midia_sem_legenda | 13/5 | 987 |
| CLIENTE-032 | CLIENTE-032 | ped-0976 | IMPRESSÃO PAPEL COUCHÊ A3 90G (só frente) | OUTRO | 6 | R$ 30 | cartao/retirada | ANTECIPADO | entregue | texto | 11/5 | 12 |
| CLIENTE-033 | CLIENTE-033 | ped-1309 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/— | ANTECIPADO | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-034 | CLIENTE-034 | ped-0776 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | —/retirada | ANTECIPADO | cancelado | texto | 19/5 | 2 |
| CLIENTE-034 | CLIENTE-034 | ped-0777 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | pix/agora | ANTECIPADO | entregue | texto | 19/5 | 2 |
| CLIENTE-034 | CLIENTE-034 | ped-0798 | IMPRESSÃO COLORIDA OFÍCIO A4 (laser) | RAPIDO | 6 | R$ 18 | pix/— | ANTECIPADO | entregue | texto | 19/5 | 2 |
| CLIENTE-034 | CLIENTE-034 | ped-0799 | ENVELOPE A4 | ESPECIAL | 1 | R$ 1 | pix/— | ANTECIPADO | entregue | texto | 19/5 | 2 |
| CLIENTE-034 | CLIENTE-034 | ped-1089 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | NA_RETIRADA | entregue | sem msg | 0/0 | — |
| CLIENTE-035 | CLIENTE-035 | ped-0977 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | texto | 1/1 | 3 |
| CLIENTE-035 | CLIENTE-035 | ped-0988 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | dinheiro/agora | NA_RETIRADA | entregue | texto | 1/1 | 3 |
| CLIENTE-036 | CLIENTE-036 | ped-0281 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 3/1 | 5 |
| CLIENTE-037 | CLIENTE-037 | ped-1181 | Adesivo leitoso recortado | OUTRO | 1 | R$ 75 | cartao/agora | NA_RETIRADA | entregue | texto | 6/1 | 100 |
| CLIENTE-038 | CLIENTE-038 | ped-1571 | TOPO DE BOLO (com recorte) | OUTRO | 1 | R$ 12 | dinheiro/— | ANTECIPADO | entregue | texto | 14/0 | — |
| CLIENTE-039 | CLIENTE-039 | ped-0073 | IMPRESSÃO PAPEL COUCHÊ A3 300G (só frente) | OUTRO | 4 | R$ 40 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 2/4 | 25 |
| CLIENTE-040 | CLIENTE-040 | ped-1472 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/— | ANTECIPADO | entregue | midia_sem_legenda | 2/1 | 1 |
| CLIENTE-041 | CLIENTE-041 | ped-0966 | RECARGA VEM | ESPECIAL | 1 | R$ 70 | dinheiro/agora | NA_RETIRADA | entregue | sem msg | 0/0 | — |
| CLIENTE-042 | CLIENTE-042 | ped-0043 | XEROX PRETO E BRANCO A4 | RAPIDO | 1 | R$ 0.45 | —/— | NA_RETIRADA | entregue | texto | 4/4 | 23 |
| CLIENTE-042 | CLIENTE-042 | ped-0350 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | NA_RETIRADA | entregue | texto | 6/2 | 6 |
| CLIENTE-042 | CLIENTE-042 | ped-0613 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | ANTECIPADO | entregue | texto | 2/1 | 45 |
| CLIENTE-042 | CLIENTE-042 | ped-1102 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | pix/— | ANTECIPADO | entregue | midia_sem_legenda | 2/0 | — |
| CLIENTE-042 | CLIENTE-042 | ped-1233 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/agora | ANTECIPADO | entregue | midia_sem_legenda | 1/1 | 2 |
| CLIENTE-043 | CLIENTE-043 | ped-1025 | IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) | ESPECIAL | 1 | R$ 6.5 | pix/— | ANTECIPADO | entregue | midia_sem_legenda | 34/5 | 819 |
| CLIENTE-043 | CLIENTE-043 | ped-1059 | IMPRESSÃO PAPEL FOTO A4 230g | ESPECIAL | 1 | R$ 6.5 | pix/agora | ANTECIPADO | entregue | texto | 25/6 | 182 |
| CLIENTE-043 | CLIENTE-043 | ped-1172 | IMPRESSÃO PAPEL FOTO A3 230g | ESPECIAL | 1 | R$ 9 | pix/— | ANTECIPADO | entregue | texto | 14/2 | 35 |
| CLIENTE-044 | CLIENTE-044 | ped-0251 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 3/1 | 9 |
| CLIENTE-045 | CLIENTE-045 | ped-1111 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | pix/— | SEM_DADO | cancelado | midia_sem_legenda | 18/2 | 19 |
| CLIENTE-045 | CLIENTE-045 | ped-1119 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | pix/agora | ANTECIPADO | entregue | midia_sem_legenda | 18/2 | 19 |
| CLIENTE-045 | CLIENTE-045 | ped-1120 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/agora | ANTECIPADO | entregue | midia_sem_legenda | 18/2 | 19 |
| CLIENTE-045 | CLIENTE-045 | ped-1121 | XEROX PRETO E BRANCO A4 | RAPIDO | 20 | R$ 9 | pix/agora | ANTECIPADO | entregue | midia_sem_legenda | 18/2 | 19 |
| CLIENTE-045 | CLIENTE-045 | ped-1122 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/agora | ANTECIPADO | entregue | midia_sem_legenda | 18/2 | 19 |
| CLIENTE-045 | CLIENTE-045 | ped-1578 | XEROX PRETO E BRANCO A4 | RAPIDO | 26 | R$ 11.7 | pix/— | ANTECIPADO | entregue | texto | 12/3 | 37 |
| CLIENTE-045 | CLIENTE-045 | ped-1579 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | pix/— | ANTECIPADO | entregue | texto | 12/3 | 37 |
| CLIENTE-046 | CLIENTE-046 | ped-1297 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-046 | CLIENTE-046 | ped-1461 | XEROX PRETO E BRANCO A4 | RAPIDO | 22 | R$ 9.9 | dinheiro/agora | ANTECIPADO | entregue | sem msg | 0/0 | — |
| CLIENTE-046 | CLIENTE-046 | ped-1462 | ENVELOPE A4 | ESPECIAL | 1 | R$ 1 | dinheiro/agora | ANTECIPADO | entregue | sem msg | 0/0 | — |
| CLIENTE-047 | CLIENTE-047 | ped-0880 | papel couche 250g A3 | OUTRO | 1 | R$ 10 | dinheiro/agora | SEM_DADO | entregue | midia_com_legenda | 1/0 | — |
| CLIENTE-048 | CLIENTE-048 | ped-1734 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_sem_legenda | 1/1 | 3 |
| CLIENTE-049 | CLIENTE-049 | ped-0514 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | SEM_DADO | cancelado | midia_sem_legenda | 3/0 | — |
| CLIENTE-049 | CLIENTE-049 | ped-0882 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/— | ANTECIPADO | entregue | midia_sem_legenda | 3/2 | 4 |
| CLIENTE-050 | CLIENTE-050 | ped-1268 | FOTO 10X15 | ESPECIAL | 2 | R$ 5 | pix/— | ANTECIPADO | entregue | texto | 25/1 | 271 |
| CLIENTE-050 | CLIENTE-050 | ped-1448 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 4/0 | — |
| CLIENTE-051 | CLIENTE-051 | ped-0038 | RECARGA VEM 52,50 | ESPECIAL | 1 | R$ 52.5 | —/— | NA_RETIRADA | entregue | texto | 6/4 | 11 |
| CLIENTE-051 | CLIENTE-051 | ped-1187 | RECARGA VEM 52,50 | ESPECIAL | 1 | R$ 52.5 | pix/agora | ANTECIPADO | entregue | texto | 5/4 | 8 |
| CLIENTE-052 | CLIENTE-052 | ped-1394 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | pix/— | ANTECIPADO | entregue | midia_com_legenda | 4/1 | 33 |
| CLIENTE-053 | CLIENTE-053 | ped-1637 | FOTO 10X15 | ESPECIAL | 7 | R$ 17.5 | dinheiro/agora | ANTECIPADO | entregue | texto | 15/1 | 357 |
| CLIENTE-054 | CLIENTE-054 | ped-0194 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | texto | 3/3 | 1453 |
| CLIENTE-054 | CLIENTE-054 | ped-0342 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | SEM_DADO | cancelado | midia_sem_legenda | 3/3 | 3 |
| CLIENTE-054 | CLIENTE-054 | ped-0343 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 3/3 | 3 |
| CLIENTE-054 | CLIENTE-054 | ped-0466 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-054 | CLIENTE-054 | ped-1062 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/— | ANTECIPADO | entregue | texto | 2/0 | — |
| CLIENTE-055 | CLIENTE-055 | ped-0101 | IMPRESSÃO P&B A4 | RAPIDO | 3 | R$ 3.6 | —/— | SEM_DADO | pronto | midia_sem_legenda | 9/3 | 157 |
| CLIENTE-056 | CLIENTE-056 | ped-0039 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | texto | 2/3 | 1 |
| CLIENTE-056 | CLIENTE-056 | ped-1447 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/agora | ANTECIPADO | entregue | texto | 5/3 | 8 |
| CLIENTE-057 | CLIENTE-057 | ped-0362 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | —/— | NA_RETIRADA | entregue | texto | 49/14 | 13 |
| CLIENTE-058 | CLIENTE-058 | ped-1711 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 1/1 | 64 |
| CLIENTE-058 | CLIENTE-058 | ped-1712 | ENVELOPE A4 | ESPECIAL | 1 | R$ 1 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 1/1 | 64 |
| CLIENTE-059 | CLIENTE-059 | ped-1197 | TOPO DE BOLO (com recorte) | OUTRO | 1 | R$ 12 | pix/— | ANTECIPADO | cancelado | texto | 13/1 | 19 |
| CLIENTE-060 | CLIENTE-060 | ped-1670 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/— | ANTECIPADO | entregue | midia_sem_legenda | 2/1 | 60 |
| CLIENTE-061 | CLIENTE-061 | ped-0300 | IMPRESSÃO P&B A4 | RAPIDO | 11 | R$ 13.2 | —/— | ANTECIPADO | entregue | texto | 18/5 | 3 |
| CLIENTE-061 | CLIENTE-061 | ped-0354 | IMPRESSÃO P&B A4 | RAPIDO | 3 | R$ 3.6 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 6/1 | 6 |
| CLIENTE-061 | CLIENTE-061 | ped-0897 | IMPRESSÃO PAPEL FOTO A4 230g | ESPECIAL | 1 | R$ 6.5 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 3/0 | — |
| CLIENTE-061 | CLIENTE-061 | ped-0898 | PLASTIFICAÇÃO A4 | ESPECIAL | 1 | R$ 7 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 3/0 | — |
| CLIENTE-061 | CLIENTE-061 | ped-0900 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 3/0 | — |
| CLIENTE-061 | CLIENTE-061 | ped-0901 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 3/0 | — |
| CLIENTE-061 | CLIENTE-061 | ped-1717 | XEROX PRETO E BRANCO A4 | RAPIDO | 3 | R$ 1.35 | pix/— | ANTECIPADO | entregue | midia_com_legenda | 7/4 | 10 |
| CLIENTE-062 | CLIENTE-062 | ped-0876 | IMPRESSÃO COLORIDA OFÍCIO A4 (laser) | RAPIDO | 1 | R$ 3 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 19/3 | 14 |
| CLIENTE-063 | CLIENTE-063 | ped-1748 | IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) | ESPECIAL | 3 | R$ 19.5 | pix/agora | SEM_DADO | cancelado | texto | 8/3 | 6 |
| CLIENTE-064 | CLIENTE-064 | ped-0963 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | pix/— | ANTECIPADO | entregue | texto | 10/3 | 9 |
| CLIENTE-064 | CLIENTE-064 | ped-0964 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/— | ANTECIPADO | entregue | texto | 10/3 | 9 |
| CLIENTE-064 | CLIENTE-064 | ped-1478 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | pix/— | ANTECIPADO | entregue | texto | 7/1 | 20 |
| CLIENTE-065 | CLIENTE-065 | ped-1191 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | dinheiro/agora | NA_RETIRADA | entregue | sem msg | 0/0 | — |
| CLIENTE-066 | CLIENTE-066 | ped-1716 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | dinheiro/— | ANTECIPADO | entregue | midia_com_legenda | 1/1 | 19 |
| CLIENTE-067 | CLIENTE-067 | ped-0420 | TOPO DE BOLO (com recorte) | OUTRO | 1 | R$ 12 | —/— | SEM_DADO | cancelado | sem msg | 0/0 | — |
| CLIENTE-067 | CLIENTE-067 | ped-0469 | TOPO DE BOLO (com recorte) | OUTRO | 1 | R$ 12 | —/— | NA_RETIRADA | entregue | sem msg | 0/0 | — |
| CLIENTE-068 | CLIENTE-068 | ped-1623 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | midia_sem_legenda | 5/1 | 15 |
| CLIENTE-069 | CLIENTE-069 | ped-0702 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/— | SEM_DADO | cancelado | texto | 5/1 | 27 |
| CLIENTE-069 | CLIENTE-069 | ped-0703 | FOTO 3X4 (6 FOTOS) | ESPECIAL | 1 | R$ 7 | pix/— | ANTECIPADO | entregue | texto | 5/1 | 27 |
| CLIENTE-070 | CLIENTE-070 | ped-0471 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 4/1 | 32 |
| CLIENTE-070 | CLIENTE-070 | ped-0477 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 4/1 | 32 |
| CLIENTE-071 | CLIENTE-071 | ped-0088 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | SEM_DADO | pronto | sem msg | 0/0 | — |
| CLIENTE-072 | CLIENTE-072 | ped-1340 | IMPRESSÃO PAPEL FOTO A4 230g | ESPECIAL | 1 | R$ 6.5 | pix/— | ANTECIPADO | entregue | texto | 9/0 | — |
| CLIENTE-073 | CLIENTE-073 | ped-1417 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/— | ANTECIPADO | entregue | texto | 20/3 | 278 |
| CLIENTE-074 | CLIENTE-074 | ped-0864 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/— | ANTECIPADO | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-075 | CLIENTE-075 | ped-1020 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/— | ANTECIPADO | entregue | texto | 9/1 | 32 |
| CLIENTE-076 | CLIENTE-076 | ped-0744 | IMPRESSÃO P&B A4 | RAPIDO | 12 | R$ 14.4 | pix/agora | ANTECIPADO | entregue | texto | 13/1 | 44 |
| CLIENTE-076 | CLIENTE-076 | ped-0745 | XEROX PRETO E BRANCO A4 | RAPIDO | 4 | R$ 1.8 | pix/agora | ANTECIPADO | entregue | texto | 13/1 | 44 |
| CLIENTE-076 | CLIENTE-076 | ped-0746 | FOTO 3X4 (6 FOTOS) | ESPECIAL | 1 | R$ 7 | pix/agora | ANTECIPADO | entregue | texto | 13/1 | 44 |
| CLIENTE-077 | CLIENTE-077 | ped-0229 | IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) | ESPECIAL | 1 | R$ 6.5 | —/— | NA_RETIRADA | entregue | texto | 16/10 | 2 |
| CLIENTE-077 | CLIENTE-077 | ped-0380 | IMPRESSÃO PAPEL FOTO A4 230g | ESPECIAL | 1 | R$ 6.5 | —/— | NA_RETIRADA | entregue | texto | 6/3 | 16 |
| CLIENTE-078 | CLIENTE-078 | ped-0047 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 1/3 | 1 |
| CLIENTE-079 | CLIENTE-079 | ped-1651 | CADASTRO/MATRÍCULA ESCOLAR | OUTRO | 4 | R$ 40 | dinheiro/agora | ANTECIPADO | entregue | sem msg | 0/0 | — |
| CLIENTE-080 | CLIENTE-080 | ped-0497 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | SEM_DADO | cancelado | midia_sem_legenda | 1/0 | — |
| CLIENTE-080 | CLIENTE-080 | ped-0498 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 1/0 | — |
| CLIENTE-081 | CLIENTE-081 | ped-0198 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | SEM_DADO | pronto | midia_sem_legenda | 3/2 | 3 |
| CLIENTE-082 | CLIENTE-082 | ped-0190 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | —/— | NA_RETIRADA | entregue | texto | 8/5 | 20 |
| CLIENTE-082 | CLIENTE-082 | ped-1633 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | texto | 27/1 | 36 |
| CLIENTE-082 | CLIENTE-082 | ped-1634 | XEROX PRETO E BRANCO A4 | RAPIDO | 2 | R$ 0.9 | dinheiro/agora | ANTECIPADO | entregue | texto | 27/1 | 36 |
| CLIENTE-082 | CLIENTE-082 | ped-1635 | ENVELOPE A4 | ESPECIAL | 3 | R$ 3 | dinheiro/agora | ANTECIPADO | entregue | texto | 27/1 | 36 |
| CLIENTE-082 | CLIENTE-082 | ped-1658 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/— | ANTECIPADO | entregue | texto | 27/1 | 36 |
| CLIENTE-083 | CLIENTE-083 | ped-0337 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 14/3 | 284 |
| CLIENTE-083 | CLIENTE-083 | ped-0532 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 12/1 | 252 |
| CLIENTE-083 | CLIENTE-083 | ped-0720 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | pix/agora | ANTECIPADO | entregue | midia_com_legenda | 11/1 | 51 |
| CLIENTE-083 | CLIENTE-083 | ped-1287 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/agora | SEM_DADO | cancelado | texto | 13/5 | 1301 |
| CLIENTE-083 | CLIENTE-083 | ped-1369 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/agora | ANTECIPADO | pronto | midia_sem_legenda | 11/4 | 140 |
| CLIENTE-084 | CLIENTE-084 | ped-1073 | FOTO 10X15 | ESPECIAL | 3 | R$ 7.5 | pix/— | ANTECIPADO | entregue | texto | 20/1 | 13 |
| CLIENTE-084 | CLIENTE-084 | ped-1074 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/— | ANTECIPADO | entregue | texto | 20/1 | 13 |
| CLIENTE-084 | CLIENTE-084 | ped-1492 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/— | ANTECIPADO | entregue | texto | 24/2 | 17 |
| CLIENTE-084 | CLIENTE-084 | ped-1493 | FOTO 10X15 | ESPECIAL | 3 | R$ 7.5 | pix/— | ANTECIPADO | entregue | texto | 24/2 | 17 |
| CLIENTE-085 | CLIENTE-085 | ped-0087 | ENCADERNAÇÃO ATÉ 30 FOLHAS | ESPECIAL | 1 | R$ 4.5 | —/— | NA_RETIRADA | entregue | midia_sem_legenda | 3/7 | 64 |
| CLIENTE-085 | CLIENTE-085 | ped-0102 | ENCADERNAÇÃO ATÉ 30 FOLHAS | ESPECIAL | 1 | R$ 4.5 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 3/7 | 64 |
| CLIENTE-086 | CLIENTE-086 | ped-0801 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/— | ANTECIPADO | entregue | midia_com_legenda | 3/0 | — |
| CLIENTE-087 | CLIENTE-087 | ped-0116 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | SEM_DADO | pronto | midia_sem_legenda | 14/9 | 148 |
| CLIENTE-087 | CLIENTE-087 | ped-0137 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 14/9 | 148 |
| CLIENTE-087 | CLIENTE-087 | ped-0245 | IMPRESSÃO P&B A4 | RAPIDO | 8 | R$ 9.6 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 6/5 | 7 |
| CLIENTE-088 | CLIENTE-088 | ped-0674 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | pix/agora | ANTECIPADO | entregue | sem msg | 0/1 | — |
| CLIENTE-089 | CLIENTE-089 | ped-0641 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | —/— | ANTECIPADO | entregue | midia_sem_legenda | 2/0 | — |
| CLIENTE-089 | CLIENTE-089 | ped-0722 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | pix/retirada | ANTECIPADO | entregue | texto | 1/2 | 87 |
| CLIENTE-090 | CLIENTE-090 | ped-0424 | DIGITAÇÃO DE PROVAS | LENTO | 1 | R$ 5 | —/— | NA_RETIRADA | entregue | texto | 22/10 | 7 |
| CLIENTE-090 | CLIENTE-090 | ped-1282 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/— | ANTECIPADO | entregue | texto | 13/2 | 41 |
| CLIENTE-091 | CLIENTE-091 | ped-0359 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | —/— | NA_RETIRADA | entregue | midia_com_legenda | 3/1 | 3 |
| CLIENTE-092 | CLIENTE-092 | ped-1432 | XEROX PRETO E BRANCO A4 | RAPIDO | 130 | R$ 52.65 | pix/agora | ANTECIPADO | entregue | texto | 13/8 | 4 |
| CLIENTE-092 | CLIENTE-092 | ped-1433 | IMPRESSÃO P&B A4 | RAPIDO | 5 | R$ 6 | pix/agora | ANTECIPADO | entregue | texto | 13/8 | 4 |
| CLIENTE-092 | CLIENTE-092 | ped-1434 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | pix/agora | ANTECIPADO | entregue | texto | 13/8 | 4 |
| CLIENTE-092 | CLIENTE-092 | ped-1740 | IMPRESSÃO PAPEL CARTÃO A4 180G (só frente) | ESPECIAL | 3 | R$ 15 | pix/agora | ANTECIPADO | pronto | midia_sem_legenda | 11/8 | 10 |
| CLIENTE-093 | CLIENTE-093 | ped-0974 | impressão frente e verso | OUTRO | 1 | R$ 66.4 | pix/agora | NA_RETIRADA | entregue | midia_com_legenda | 5/1 | 28 |
| CLIENTE-093 | CLIENTE-093 | ped-1132 | xerox frente e verso | OUTRO | 1 | R$ 44 | pix/agora | NA_RETIRADA | entregue | midia_com_legenda | 2/1 | 97 |
| CLIENTE-094 | CLIENTE-094 | ped-1584 | FOTO 10X15 | ESPECIAL | 6 | R$ 15 | pix/— | ANTECIPADO | entregue | midia_sem_legenda | 6/0 | — |
| CLIENTE-095 | CLIENTE-095 | ped-1426 | XEROX PRETO E BRANCO A4 | RAPIDO | 6 | R$ 2.7 | pix/agora | NA_RETIRADA | entregue | sem msg | 0/0 | — |
| CLIENTE-096 | CLIENTE-096 | ped-0509 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | —/— | NA_RETIRADA | entregue | texto | 4/1 | 19 |
| CLIENTE-096 | CLIENTE-096 | ped-0789 | IMPRESSÃO P&B A4 | RAPIDO | 1 | R$ 1.2 | dinheiro/agora | ANTECIPADO | entregue | texto | 9/5 | 9 |
| CLIENTE-096 | CLIENTE-096 | ped-0875 | IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) | RAPIDO | 1 | R$ 2.2 | dinheiro/retirada | ANTECIPADO | entregue | texto | 5/4 | 2 |
| CLIENTE-096 | CLIENTE-096 | ped-1288 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | —/— | ANTECIPADO | cancelado | texto | 6/2 | 11 |
| CLIENTE-096 | CLIENTE-096 | ped-1289 | IMPRESSÃO P&B A4 | RAPIDO | 4 | R$ 4.8 | pix/agora | ANTECIPADO | entregue | texto | 6/2 | 11 |
| CLIENTE-097 | CLIENTE-097 | ped-1021 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/agora | ANTECIPADO | entregue | texto | 21/6 | 22 |
| CLIENTE-098 | CLIENTE-098 | ped-1204 | XEROX PRETO E BRANCO A4 | RAPIDO | 4 | R$ 1.8 | dinheiro/agora | NA_RETIRADA | entregue | midia_com_legenda | 1/0 | — |
| CLIENTE-098 | CLIENTE-098 | ped-1271 | IMPRESSÃO 2ª VIA CONTA | RAPIDO | 1 | R$ 2.2 | dinheiro/agora | ANTECIPADO | entregue | midia_com_legenda | 1/0 | — |
| CLIENTE-098 | CLIENTE-098 | ped-1272 | IMPRESSÃO P&B A4 | RAPIDO | 2 | R$ 2.4 | dinheiro/agora | ANTECIPADO | entregue | midia_com_legenda | 1/0 | — |
| CLIENTE-099 | CLIENTE-099 | ped-1652 | IMPRESSÃO COLORIDA OFÍCIO A4 (laser) | RAPIDO | 1 | R$ 3 | pix/— | SEM_DADO | confirmado | texto | 12/1 | 8 |
| CLIENTE-100 | CLIENTE-100 | ped-1409 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/agora | ANTECIPADO | entregue | texto | 5/1 | 15 |
| CLIENTE-100 | CLIENTE-100 | ped-1657 | AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | LENTO | 1 | R$ 5 | pix/— | ANTECIPADO | entregue | texto | 24/1 | 43 |

**Casos sem nenhuma mensagem correspondente na janela calculada** (10 telefones/12 pedidos —
detalhado na seção 6): `CLIENTE-001` (contaminação Solfácil), `CLIENTE-022`/`CLIENTE-034` (2º
pedido do dia, mensagem já capturada na janela do 1º), `CLIENTE-041`, `CLIENTE-046` (x2),
`CLIENTE-065`, `CLIENTE-067` (x2), `CLIENTE-071` (contato `@lid` genérico), `CLIENTE-079`,
`CLIENTE-095` (zero linhas em toda a tabela de log, não só na janela).

---

## 4. Manual de resposta — regras com evidência real

Cada regra abaixo cita telefone(s)/pedido(s) real(is) da subamostra qualitativa de 40 (arquivos
`grupo1-5.md`). Marcado explicitamente: **[PADRÃO CONFIRMADO]** (2+ casos reais convergentes),
**[CASO ISOLADO]** (1 caso, ainda não é padrão) ou **[RISCO]** (achado de segurança, não regra de
comportamento).

### Regra 1 — Confirmar objetivamente o que foi recebido antes de perguntar/informar preço [PADRÃO CONFIRMADO]
Reconfirma o achado central da demanda 162 com casos novos. Evidência:
- `CLIENTE-034` (13/07): "Boa tarde! imprimir em folhas separadas ou na mesma
  folha?" → depois "Boa tarde! Certo, CLIENTE-034. Fica R$ 2,20 mesmo."
- `CLIENTE-083` (13/07): "Opa CLIENTE-083! Tudo certo por aqui. Recebemos os arquivos,
  já estão impressos, pode vir buscar. 😉"
- `CLIENTE-096` (14/07): "Boa tarde! Pra imprimir colorido 2,20 ou preto e
  brtanco 1,20 qual vai querer?"

### Regra 2 — Documento óbvio de 1 item reconhecível → segue direto pro fluxo automático, sem pergunta aberta [PADRÃO CONFIRMADO]
Reconfirma achado central da 162/206 (só documento óbvio de 1 página a equipe resolve sem
hesitar). Evidência:
- `CLIENTE-058` (28/07): cliente manda 1 PDF com legenda (nome da pessoa) → resposta é
  o template consolidado "Pedido confirmado!...entrou em produção!...pronto pra retirada" pros 2
  itens (2ª via + envelope), sem nenhuma pergunta no meio.
- `CLIENTE-030` (pedido `ped-0356`, 08/07): cliente manda foto com legenda pedindo
  orçamento → equipe responde só "bom dia"/"ok" e 6 minutos depois já manda o template completo
  "Pedido confirmado! DIGITAÇÃO DE PROVAS R$5,00...pronto pra retirada" — mesmo sendo um serviço
  LENTO por natureza (204), quando o pedido já chega auto-explicativo o fluxo é tão rápido quanto
  o de um documento simples.
- `CLIENTE-066` (28/07): mesmo padrão, QR de conta → template completo em 19min.

### Regra 3 — Quando o pedido é ambíguo (cor, formato, tamanho), a equipe pergunta 1 coisa de cada vez, nunca assume [PADRÃO CONFIRMADO]
Evidência:
- `CLIENTE-034`: "imprimir em folhas separadas ou na mesma folha?" → cliente responde → "cada
  folha colorida 2,20" → "Pra gente finalizar, qual seria a forma de pagamento?" — 3 perguntas
  sequenciais, cada uma só depois da resposta anterior.
- `CLIENTE-096` (ped-0875, 14/07): "Pra imprimir colorido 2,20 ou preto e branco 1,20 qual vai
  querer?" → "Colorido" → "qual vai ser a forma de pagamento?" → "Dinheiro" → só então "Oi
  CLIENTE-096! Sua impressão colorida já tá pronta... O valor é R$ 2,20 em dinheiro, tá bom?"
- `CLIENTE-043` (15-16/07, papel adesivo/foto): a equipe explica preço COM E SEM recorte
  antes de qualquer coisa avançar ("esse aplique pode ser feito com papel foto com recorte...o
  valor do papel foto com recorte 9,00, e se quiser sem recorte 6,50"), deixando a decisão
  explícita com o cliente.

### Regra 4 — Currículo/documento com dado pessoal: sempre um template estruturado de campos, nunca adivinhação [PADRÃO CONFIRMADO, reforça 10.2/10.3 do mapa de jornada]
Evidência:
- `CLIENTE-090` (08/07): equipe colou o template inteiro — "Nome Completo:
  Endereço: Telefone: E-mail: Data nascimento: Estado civil: [...] Escolaridade: Nome da
  Instituição: Nome do Curso: Período:" — e só seguiu depois que o cliente preencheu tudo.
- `CLIENTE-057` (08/07, agendamento de identidade): equipe também pediu explicitamente
  "CPF e senha do Gov.br da pessoa" antes de agendar, e recusou avançar sem isso ("só faz agora
  com a senha do gov.br da pessoa").
- Implicação de risco pro design: esse tipo de serviço envolve dado sensível (CPF, senha de
  aplicativo do governo) sendo trocado em texto puro no WhatsApp — já é a prática atual da
  equipe humana, não é uma mudança introduzida pela automação, mas vale registrar como ponto de
  atenção caso o agente automatize esse fluxo (não é escopo da Fase 1, que é só mídia sem
  legenda).

### Regra 5 — Não deixar o cliente pagar Pix antes de confirmar o valor — é uma instrução ativa da própria equipe [RISCO + CASO ISOLADO, mas com citação direta e literal]
`CLIENTE-083` (`ped-1369`, 22/07): depois de mandar o Pix, a equipe escreveu
**literalmente**: *"Peço que a partir de agora quando enviar arquivos para impressão, não faça o
pix de imediato, aguarde que enviemos o código do pix para fazer o pagamento ok."* — isso é a
equipe corrigindo, em tempo real, um comportamento de cliente que tenta pagar antes de saber o
valor certo. **Implicação direta pro desenho da Fase B**: o agente NUNCA deve aceitar/incentivar
pagamento antes de ele mesmo ter confirmado o valor final — mandar o código Pix só depois da
confirmação de produto+preço, nunca antes ou em paralelo. Isso já é o desenho atual (passo 5 dos 7
passos da Fase B, `pm/OBJETIVOS-MACRO.md`), mas agora tem uma citação real da própria equipe
validando por que essa ordem importa (evita cliente pagando valor errado).

### Regra 6 — Pagamento em dinheiro raramente é formalizado no chat; fica combinado pra "na retirada" [PADRÃO CONFIRMADO por estatística + casos concretos]
Na tabela da seção 3: dos pedidos classificados `NA_RETIRADA` (pagamento tratado perto/depois da
entrega), **71% (34/48) têm `forma_pagamento_escolhida` nula** — o valor não foi registrado
formalmente no pedido porque foi decidido/pago no balcão, não no chat. Casos concretos:
- `CLIENTE-032` (15/07): "Vou passar aí prá passar no cartão." — decisão de forma
  de pagamento mencionada em texto mas só efetivada fisicamente depois.
- `CLIENTE-042` (`ped-0350`, 08/07): "Estarei indo ao seu estabelecimento para pagar
  e pegar esta impressão abaixo" — nenhuma forma de pagamento especificada no texto.

### Regra 7 — Telefone é a identidade real do cliente, não o "nome do pedido" [PADRÃO CONFIRMADO — achado de qualidade de dado, relevante pro design]
- `CLIENTE-042`: os 2 primeiros pedidos nascem com `nome_cliente` extraído da assinatura de um
  documento oficial anexado (um nome de exibição bem diferente do nome usual), os 3 seguintes já
  vêm com o nome usual do cliente — mesmo telefone, mesma pessoa, nome do pedido mudou porque foi
  extraído automaticamente do arquivo/perfil, não digitado à mão.
- `CLIENTE-090`: pedido 1 é currículo do nome da filha (maiúsculo, extraído do próprio arquivo do
  currículo), pedido 2 é currículo com o nome da própria titular do WhatsApp — mesmo
  telefone, "titular do documento" muda entre pedidos porque a mãe pede currículo pra filhos
  diferentes usando o mesmo número.
- Implicação pro agente: nunca decidir "cliente novo vs. recorrente" ou personalizar por nome do
  pedido — a chave de identidade estável é o telefone (mesmo raciocínio já usado nas demandas
  159-163/209).

### Regra 8 — Rajada fragmentada de mensagens continua real e às vezes mais extrema do que a 162 mediu [PADRÃO CONFIRMADO, reforça 9.1 do mapa de jornada com casos novos]
- `CLIENTE-057` (08-10/07): 49 mensagens do cliente numa única janela reconstruída,
  incluindo troca de assunto no meio (agendamento de identidade → dúvida técnica de Gov.br →
  pedido de topo de bolo em outro dia) — o exemplo mais longo desta subamostra.
- `CLIENTE-090` (08/07): 22 mensagens seguidas descrevendo currículo aos poucos
  (nome, depois áudio, depois foto, depois mais um detalhe).
- Reforça: o agente precisa continuar usando a pausa de silêncio (achado da 162: mediana 22s,
  ~1-2min de pausa = sinal de "terminou") como gatilho de processamento, não reagir a cada
  mensagem — inclusive em conversas mais longas que as já documentadas antes.

### Regra 9 — Encerramento padrão de interação simples e resolvida é curto e seco ("Obrigado"/"obg"), não precisa ser elaborado [PADRÃO CONFIRMADO]
Recorrente na maioria dos casos simples da subamostra: `CLIENTE-044` ("obg"),
`CLIENTE-042` (múltiplas ocorrências reais de "Obrigado 😉"/"obg"). Confirma que um
tom curto e funcional é o padrão cultural real da equipe pra esse tipo de fechamento — útil
calibrar o tom do agente pra não soar mais formal/prolixo que a equipe humana real.

**Correção 2026-07-30 (achado da demanda 254, checkpoint antes de redesenhar o blueprint)**: as
2 citações originais `CLIENTE-049` e `CLIENTE-078` estavam erradas, removidas da lista acima.
`CLIENTE-049` não tem nenhum "obg"/"Obrigado" em nenhum dos 2 pedidos capturados na
subamostra qualitativa. `CLIENTE-078` nunca fez parte da subamostra qualitativa de 40 — só
existia na reconstrução estruturada (SQL agregado), o texto real nunca foi lido. A regra
continua válida (as 2 citações restantes são reais e confirmadas), só o número de evidências caiu
de 4 pra 2 — registrado aqui pra não repetir o erro em releitura futura deste documento.

### Achado de risco 10 — Fração real de pedidos entregues e pagos não tem NENHUMA resposta da equipe capturada no log [RISCO/HIPÓTESE, não regra]
10 telefones / 12 pedidos da amostra estruturada (seção 3) não têm nenhuma mensagem (nem cliente
nem equipe) na janela calculada, e outros tantos têm mensagens do cliente sem nenhuma resposta da
equipe registrada (ex.: `CLIENTE-007`, 14 mensagens do cliente, 0 da equipe;
`CLIENTE-072`, 9/0; `CLIENTE-074`, 1/0) — mesmo assim os
pedidos foram entregues e pagos. **Não dá pra confirmar** se a equipe respondeu por outro canal
(verbal, presencial) ou se o log realmente não capturou uma resposta que existiu — é uma limitação
de dado, não prova de "cliente foi ignorado". Risco pro desenho do agente: se o agente decidir
"escalar por timeout de silêncio da equipe" usando só o log como fonte de verdade, vai escalar
casos que na prática já foram resolvidos fora do texto — sinalizado como achado de risco a
considerar quando o gatilho de timeout (demanda 208) for desenhado/testado com tráfego real.

### Achado de risco 11 — Contaminação de log é mais variada do que documentado antes [RISCO, achado novo]
Além da Dizu Refeições (já documentado, 159/160) e dos bots já conhecidos (Neoenergia/Celpe,
golpe de farmácia — 204), esta investigação achou **2 tipos novos** de contaminação:
- Um pedido real de gráfica (`ped-1044`, R$5, "Solfácil") vinculado a um telefone cujo log inteiro
  é 100% bot de financiamento solar — sem nenhuma mensagem relacionada à gráfica. Hipótese mais
  provável: erro de associação de telefone no cadastro do pedido (ex. balcão anotou o número
  errado), não confusão de negócio.
- O próprio emissor do cardápio da Dizu Refeições (`169501605793973@lid`) e uma mensagem de
  cardápio aparecendo dentro do log de uma cliente da gráfica sem relação nenhuma com o pedido
  dela (`CLIENTE-055`) — confirma que a mistura Dizu×JS Gráfica não é só cliente
  confundindo o número, é tráfego de um negócio vazando pro log do outro pela mesma instância de
  WhatsApp. Reforça a importância do filtro Dizu (passo 0 da Fase B, já implementado na 206)
  rodar em QUALQUER ponto da conversa, não só na primeira mensagem.

---

## 5. Perfis candidatos — refinamento da lista da demanda 209

Cruzamento com `mapa-jornada-atendimento-whatsapp.md` seção 12 (209). Critério de "recorrente" da
209 (3+ sessões com pedido) mantido, mas minha janela é ~11 dias mais longa (07-01 a 07-28 vs.
07-01 a 07-17 da 209) — relevante pra explicar por que 1 candidato novo aparece agora.

### Confirmados, sem mudança de posição
1. **CLIENTE-054** — segue o melhor perfil: 100% Impressão P&B A4,
   zero outlier real. Achado novo (não muda a recomendação, só documenta): 2 das "mensagens dela"
   na verdade são notificações automáticas do Adobe Acrobat compartilhando PDF pra impressão —
   um agente lendo essas mensagens precisa reconhecer esse padrão de notificação de app terceiro
   como "arquivo pra imprimir", não tratar como texto solto sem sentido.
2. **CLIENTE-042** — confirmado limpo, mesmo padrão da 209.
3. **CLIENTE-096** — confirmado limpo; a subamostra qualitativa dela é o
   melhor exemplo real da Regra 3 (pergunta sequencial cor→pagamento).

### Mantido com ressalva
4. **CLIENTE-032** — outlier real reconfirmado com texto: no `ped-0976` (papel
   couché A3) o valor mudou de negociação em tempo real ("Resolvi aumentar o valor para R$60,00" →
   depois "O valor é de R$30,00\nCerto?" → "Eita.\nFaltou dizer que é até o 5°ano somente") —
   mantém a recomendação da 209 de incluir com atenção, não como o perfil mais simples.

### Aguardando pré-requisito (sem mudança — pré-requisito ainda não cumprido)
5. **CLIENTE-061** — reconfirma o padrão de "múltiplas etapas de
   acabamento" já flagrado (204/209): `ped-0897`+`ped-0898` (impressão + plastificação) mais
   `ped-0900`+`ped-0901` (2ª via) nasceram juntos, tudo numa rajada de arquivos com legenda ("VOU
   LEVAR O PAPEL"). **A demanda 208 (gatilhos de escalonamento pendentes) segue com status
   "liberada", não concluída, em 2026-07-29** — a recomendação da 209 de esperar a 208 continua
   valendo sem alteração.

### Não recomendados — evidência reforçada
6. **CLIENTE-030** — achado NOVO e mais grave que o da 209 (outlier de 22h):
   este telefone pede orçamento de um serviço **totalmente fora do catálogo da gráfica**
   ("Remoção da película antiga de uma porta de vidro...aplicação de película fumê...Valor do
   material R$ 300\nValor serviço R$ 570", 23/07) — não é só "lento por natureza" como currículo/
   digitação, é um serviço que a gráfica nem vende regularmente. Reforça fortemente a
   recomendação de não incluir.
7. **CLIENTE-043** — confirmado com texto real: negociação de customização
   em várias mensagens (tamanho, com/sem recorte, "Vocês faz mas 10 recorte desse no papel foto de
   9 cm" com detalhe de medida) — mantém "não recomendado".
8. **CLIENTE-083 — EXCLUÍDO, evidência muito mais forte que a da 209**: a 209
   já tinha achado 2 pedidos de quentinha confirmados; esta investigação mostra que ele **mistura
   pedido de gráfica e pedido de comida no MESMO dia, às vezes na mesma sequência de mensagens**
   (14/07: "Eu quero 01 lasanha média" seguido, minutos depois, de "Eu quero 01 quentinha média de
   panqueca... Eu posso pagar agora na chave Pix da gráfica?" tudo na mesma janela onde ele também
   trata de impressão). Confirma que não é um erro pontual — é um padrão de uso recorrente que
   tornaria qualquer filtro "descarta se for Dizu" instável nesse número especificamente (o filtro
   precisaria rodar mensagem a mensagem, não sessão a sessão, e mesmo assim o risco de confundir
   um pedido de impressão real dele com comida — ou vice-versa — é maior que em qualquer outro
   candidato da lista).

### Novo candidato adicionado
9. **CLIENTE-034** — 5 pedidos na janela (13/07 e 17/07), 100% dentro do
   fluxo rápido (Colorida Ofício jato/laser + Envelope + P&B A4), zero outlier, zero sinal de
   contaminação. É o melhor exemplo real da Regra 3 (equipe pergunta formato → informa preço →
   pergunta forma de pagamento, tudo sequencial e sem ambiguidade do lado do cliente). Não estava
   na lista original da 209 — não dá pra confirmar o motivo exato sem reexecutar a 209 (fora de
   escopo aqui), mas ela já tinha volume suficiente dentro da janela da 209 (07-01 a 07-17), então
   é provável que o critério de "fluxo padrão" (maioria começando por mídia sem legenda) tenha
   sido mais restritivo pra ela — vale o Edvam saber que ela existe como opção adicional de
   perfil limpo pra primeira leva.

### Candidato pra monitorar, não primeira leva
10. **CLIENTE-082** — 5 pedidos, mistura currículo (LENTO) com impressão/xerox/
    envelope (RAPIDO) — perfil MISTO, sem nenhuma hesitação ou negociação observada nos casos
    lidos, mas fora do escopo estrito da Fase 1 (só mídia sem legenda) na parcela currículo dela.
    Registrado como hipótese de expansão futura, não como recomendação pra agora.

### Não avaliado nesta rodada, sinalizado como promissor
**CLIENTE-045** — 7 pedidos na janela, alto volume por pedido (até 26 cópias de
xerox de uma vez), 100% dentro do fluxo rápido, quase todos pagos via Pix. Não fez parte da
subamostra qualitativa de 40 lida nesta investigação (só a reconstrução estruturada, sem texto
real) — **hipótese, não confirmada com conversa real**: parece um perfil de cliente empresarial
recorrente de alto volume, promissor pra uma leva futura, mas precisa de leitura qualitativa
dedicada antes de entrar em qualquer lista de recomendação.

### Sugestão de tamanho pra próxima leva (mantém o espírito da 209, atualizado)
Confirma a recomendação da 209 de começar pelos 3 primeiros (#1-3), com CLIENTE-034 (#9)
como uma 4ª opção igualmente limpa. CLIENTE-032 (#4) na sequência, com atenção. CLIENTE-061
(#5) segue bloqueado até a 208 fechar. CLIENTE-030, CLIENTE-043 e CLIENTE-083 continuam fora.

---

## 6. Honesto sobre os limites

- **Amostra estratificada, não representativa** — não usar as proporções deste documento (ex.
  "quantos % dos 100 começam por mídia") como estatística de frequência real. Isso já está medido
  corretamente nas demandas 159-163/204/205.
- **`tempo_ate_primeira_resposta_equipe_min` desta investigação NÃO é comparável à mediana oficial
  de 0,7min da demanda 161** — a metodologia da 161 usa "início de sessão" (gap de 4h) com rigor
  específico; aqui a janela é construída em torno do `created_at` do PEDIDO (-6h/+48h), que pode
  capturar conversa de negociação mais longa antes do pedido nascer, inflando o número. Não usar
  esse campo como correção da 161 — é uma métrica diferente, com propósito diferente (dar contexto
  qualitativo por caso, não medir SLA agregado).
- **Classificação ANTECIPADO/NA_RETIRADA é uma heurística automática**, não confirmação humana —
  em pedidos onde `data_producao_at`/`confirmado_cliente_at`/`data_entregue_at` estão a poucos
  segundos um do outro (padrão já descrito na seção 11.2 do mapa de jornada: "mesma pessoa criando
  o pedido e avançando status na mesma ação"), a classificação reflete mais o hábito operacional
  de lançar tudo de uma vez do que necessariamente quando o cliente pagou de fato.
- **Casos sem resposta da equipe no log (achado de risco 10) não são prova de mau atendimento** —
  são limite de captura do webhook, não avaliação de qualidade do atendimento humano.
  **Não interpretar esses casos como "a equipe ignorou o cliente"** sem confirmação adicional.
  Registrado como achado honesto, não como crítica.
- **Subamostra qualitativa (40) não cobre todos os padrões possíveis** — 60 dos 100 clientes só
  têm reconstrução estruturada (contagens/timestamps), não texto literal. As regras do manual
  (seção 4) vêm exclusivamente dos 40 lidos com texto real; se o Edvam quiser mais confiança
  numa regra específica, dá pra ler qualitativamente mais casos do balde relevante depois.
- **"CLIENTE-045" e outros clientes de alto volume/recorrência não lidos qualitativamente**
  (ex. `CLIENTE-087`, 3 pedidos; `CLIENTE-092`, 4 pedidos incluindo 130
  unidades de xerox) ficaram só na reconstrução estruturada — promissores pra próxima rodada de
  leitura, não avaliados como candidato aqui por falta de evidência de conversa real.
