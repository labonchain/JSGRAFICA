# Lote 08 — Pesquisa de linguagem do cliente (28 telefones)

Metodologia: `to_timestamp(data_timestamp/1000.0)`, hora `America/Recife`, exclui `is_group=true` e
`apagada_em IS NOT NULL`. Telefone ligado a `jsgrafica_pedidos.telefone` pelos últimos 11 dígitos.
Janela por telefone: -6h a +48h do(s) `created_at` de todos os pedidos reais desse telefone
(pedidos próximos agrupados na mesma janela/conversa).

---

## 558195091364 — ped-1852 — IMPRESSÃO P&B A4 (entregue, 2026-07-30)
1. Frase literal do cliente: "Vcs podem imprimir esse documento por favor" — também: "Em 20 minutos ou 15 vou pegar ai", "Pode me mandar o valor e o número do pix pra mim pagar já?"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva da equipe: nenhuma resposta em texto — a equipe só enviou o código Pix (QR/copia-e-cola), sem mensagem descritiva.
4. Contaminação: não observada.

## 558195117675 — ped-0471 / ped-0477 — IMPRESSÃO P&B A4 (entregue, 2026-07-09)
1. Frase literal: "Oi Bom dia" / "Imprime por favor,preto e branco mesmo."
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: mensagem automática de template — "Pedido confirmado! 🖨️ IMPRESSÃO P&B A4 Qtd: 2 R$ 2.40 ... Seu pedido entrou em produção! ... Prontinho! Seu pedido já está pronto pra retirada" (enviada como bloco único, aparentemente concatenando os estágios do pedido).
4. Contaminação: não observada.

## 558195170719 — ped-0055 — IMPRESSÃO P&B A4 (entregue, 2026-07-06)
1. Frase literal: SEM TEXTO — só mídia (só um documento sem legenda em toda a janela).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: template automático "Pedido confirmado! ... entrou em produção ... Prontinho".
4. Contaminação: não observada.

## 558195196902 — ped-1618/1619/1620 (07-27) — IMPRESSÃO P&B A4 / FOTO 3X4 (6 FOTOS) / XEROX P&B A4
1. Frase literal: SEM LOG DE CONVERSA — não há nenhuma mensagem na janela do pedido (-6h/+48h de 2026-07-27). O único histórico existente nesse telefone é de 2026-02-04 (fora da janela, sem relação clara com este pedido).
2. Produto real: IMPRESSÃO P&B A4 + FOTO 3X4 (6 FOTOS) + XEROX PRETO E BRANCO A4 (pacote — provável atendimento de balcão sem registro de WhatsApp).
3. Primeira resposta substantiva: N/A (sem log).
4. Contaminação: não observada.

## 558195216527 — ped-0806 — IMPRESSÃO P&B A4 (entregue, 2026-07-13)
1. Frase literal: "Boa tarde" / "Pode imprimir pfvr" / "Esse contrato"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: nenhuma — não há mensagem `from_me` na janela (atendimento presencial/sem resposta textual registrada).
4. Contaminação: não observada.

## 558195219561 — ped-0088 — IMPRESSÃO P&B A4 (status "pronto", 2026-07-06)
1. Frase literal: SEM LOG DE CONVERSA — nenhuma mensagem cai na janela (-6h/+48h de 2026-07-06). Cliente (Risoneide) tem histórico extenso de conversas reais de gráfica em outras datas (jan/fev/mar/abr/jul), mas nenhuma coincide com este pedido específico.
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: N/A (sem log na janela).
4. Contaminação: não observada.

## 558195269996 — ped-0072 — IMPRESSÃO PAPEL COUCHÊ A3 300G (só frente) (entregue, 2026-07-06)
1. Frase literal: SEM TEXTO — só mídia (4 imagens enviadas, nenhuma legenda/texto).
2. Produto real: IMPRESSÃO PAPEL COUCHÊ A3 300G
3. Primeira resposta substantiva: template automático "Pedido confirmado! ... Qtd: 5 R$ 50.00 ... entrou em produção ... Prontinho".
4. Contaminação: não observada.

## 558195286671 — ped-0428 (cancelado) / ped-0429 CARTEIRA PARA RG (entregue, 2026-07-08)
1. Frase literal: SEM TEXTO — só mídia (documento + imagem + documento, sem legenda).
2. Produto real: CARTEIRA PARA RG (o pedido IMPRESSÃO P&B A4 foi cancelado).
3. Primeira resposta substantiva: nenhuma registrada na janela.
4. Contaminação: não observada.

## 558195326320 — ped-0852 IMPRESSÃO 2ª VIA CONTA / ped-0853 IMPRESSÃO P&B A4 (entregue, 2026-07-14)
1. Frase literal: SEM TEXTO — só mídia (1 documento, sem legenda).
2. Produto real: IMPRESSÃO 2ª VIA CONTA + IMPRESSÃO P&B A4
3. Primeira resposta substantiva: nenhuma registrada.
4. Contaminação: não observada.

## 558195335000 — ped-1403 — IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte) (entregue, 2026-07-22)
1. Frase literal: SEM TEXTO — só mídia (7 imagens seguidas, sem legenda).
2. Produto real: IMPRESSÃO PAPEL ADESIVO A4 192G
3. Primeira resposta substantiva: nenhuma registrada.
4. Contaminação: não observada.

## 558195467099 — ped-0465 — IMPRESSÃO P&B A4 (entregue, 2026-07-09)
1. Frase literal: sem pedido descritivo — só a legenda do documento enviado, "Marcio Pedro dos Santos" (nome, provável título do arquivo), e depois "Eu que agradeço" (agradecimento pós-serviço).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: nenhuma registrada na janela.
4. Contaminação: não observada.

## 558195552362 — ped-1230 / ped-1283 — IMPRESSÃO 2ª VIA CONTA (entregue, 2026-07-20)
1. Frase literal: SEM LOG DE CONVERSA — nenhuma mensagem cai na janela do pedido (-6h/+48h de 2026-07-20).
2. Produto real: IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta substantiva: N/A (sem log na janela).
4. **Contaminação observada**: este telefone tem, em outras datas (2026-07-08 e 2026-07-24), conversa clara de um negócio de "quentinha"/marmita ("Tem quentinha ainda?", "Quero uma de 18,00 Lombo molho madeira...", "acabou o frango crocante..."), sem nenhuma relação com a JS Gráfica. Não misturado com o resultado do pedido real.

## 558195693976 — ped-1131 — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) (entregue, 2026-07-17)
1. Frase literal: "Quero fazer um currículo" / "Veja se te ai" / "Alerrandro de oliveira" / "Vou trocar o número" / "E acrescentar. U experiência" / "Consórcio recife ambiental \n\n1 e 5meses" / "Ajudante limpeza pública." / "Vc manda pra me como PDF" / "Ajudante de marcenaria LF móveis planejados" / "1ano"
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) — mas a conversa real inteira é sobre montagem/edição de currículo (produto catalogado de forma genérica como "impressão", não como "currículo").
3. Primeira resposta substantiva: nenhuma — a equipe só enviou o código Pix, sem texto descritivo.
4. Contaminação: não observada.

## 558195755534 — ped-1331 — AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO (confirmado, 2026-07-21)
1. Frase literal: "Vc pode fazer pra mim" / "Um nada consta" / "Estadual e federal" / "Antecedentes" / "Tô precisando urgente" / "Vanessa bezerra da Silva 28/03/1999 Claudete correia Silva Valter bezerra da Silva CPF:707.705.914.69" / "Pelo o app do gov tem como fazer amg" / "Queria os dois"
2. Produto real: AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO (certidão de antecedentes criminais estadual e federal, "nada consta")
3. Primeira resposta substantiva: "qual?" (equipe pedindo pra esclarecer qual documento) — única fala da equipe na janela.
4. Contaminação: não observada.

## 558195930003 — ped-0432 — IMPRESSÃO P&B A4 (entregue, 2026-07-08)
1. Frase literal: sem texto descritivo — só a legenda do documento enviado, "Fatura_Itau_20260707-003357" (nome de arquivo indicando fatura de banco).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: nenhuma registrada.
4. Contaminação: não observada.

## 558195952405 — ped-0774/0775 (07-13) e ped-1267 (07-20) — IMPRESSÃO P&B A4 (entregue)
1. Frase literal (conversa 1, 07-13): "Boa tarde.imprimir só duas primeiras folhas.👆👍🏾" / "Esse também duas primeiras folhas.👆👍🏾" / "Passo agora a tarde obrigado"
   Frase literal (conversa 2, 07-20): "Imprimir.a tarde pegarei obrigado"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: "Boa tarde! Seus documentos estão prontos. Deu R$ 4,80. Pode vir buscar quando quiser! 😊" (conversa 1); "Obrigado 😊" (conversa 2, não descritiva).
4. Contaminação: não observada.

## 558195975113 — ped-1232 — IMPRESSÃO P&B A4 (entregue, 2026-07-20)
1. Frase literal: SEM TEXTO — só mídia (1 documento sem legenda).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: "Obrigado" (equipe, não descritiva).
4. Contaminação: não observada.

## 558196053836 — ped-0115 (07-06) e ped-1643/1644 (07-27) — IMPRESSÃO P&B A4 / IMPRESSÃO 2ª VIA CONTA (entregue/pronto)
1. Frase literal (conversa 1, 07-06): "Bom dia!!!\nPor favor imprime pra mim 3 cópias" / "Vou aí buscar"
   Frase literal (conversa 2, 07-27): "Por favor imprime o resultado dos exames pra mim" / legenda de imagem "A senha do resultado dela" / "Vê esse tbm" / "Imprime tbm esse guia por favor"
2. Produto real: IMPRESSÃO P&B A4 + IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta substantiva: "ok" (equipe, conversa 1, não descritiva); na conversa 2 a equipe só envia o código Pix, sem texto descritivo.
4. Contaminação: não observada.

## 558196106487 — ped-1020 — AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO (entregue, 2026-07-15)
1. Frase literal: "Olá boa tarde" / "Quero da continuidade" / "Pix" / "Pode manda" / "A chave" / "5 ?" / "Concluído" / "Obrigado". (Nota: "Quero da continuidade" é vago — referencia um atendimento anterior não capturado na janela; não há descrição explícita do serviço na conversa visível.)
2. Produto real: AGENDAMENTO / CURRÍCULO / ANTECEDENTES / DIGITAÇÃO
3. Primeira resposta substantiva: nenhuma — só o código Pix. Há também uma mensagem recebida com propaganda de banco digital (Next) no meio da conversa, ruído não relacionado ao pedido.
4. Contaminação: não observada (a propaganda do banco é ruído pontual, não uma conversa de outro negócio).

## 558196145092 — ped-0744/0745/0746 — IMPRESSÃO P&B A4 / XEROX P&B A4 / FOTO 3X4 (6 FOTOS) (entregue, 2026-07-13)
1. Frase literal: "Opa" — sem descrição explícita do pedido em texto; as legendas dos documentos enviados indicam o motivo: "DOC. ADMISSÃO (4).pdf", "FORMULARIO.pdf", "Emprego.pdf" (documentação de admissão de emprego). Depois: "Estou A Caminho" / "Desculpa".
2. Produto real: IMPRESSÃO P&B A4 + XEROX P&B A4 + FOTO 3X4 (6 FOTOS) — pacote de documentação para admissão em emprego.
3. Primeira resposta substantiva: "Obrigado" (equipe, não descritiva).
4. Contaminação: não observada.

## 558196183694 — ped-1211 — IMPRESSÃO 2ª VIA CONTA (entregue, 2026-07-20)
1. Frase literal: apenas "Tá bom" — sem nenhuma descrição do pedido na janela (nenhum documento/mídia registrado tampouco).
2. Produto real: IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta substantiva: nenhuma registrada.
4. Contaminação: não observada.

## 558196206867 — ped-0863 — IMPRESSÃO P&B A4 (entregue, 2026-07-14)
1. Frase literal: SEM TEXTO — só mídia (1 documento sem legenda).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: "Obrigado! 😉" (equipe, não descritiva).
4. Contaminação: não observada.

## 558196308928 — ped-0048 — IMPRESSÃO P&B A4 (entregue, 2026-07-06)
1. Frase literal: "Bom Dia. \nPeço que imprimam a primeira folha." / "Estou enviando novamente para ser impresso a primeira folha." / "Conseguiu imprimir?" / "Posso ir buscar?"
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: "A sra. tem esse arquivos em PDF fica melhor a impressão para pagamento." (equipe orientando sobre qualidade do arquivo, provavelmente um boleto/guia de pagamento).
4. Contaminação: não observada.

## 558196331560 — ped-0885 — IMPRESSÃO P&B A4 (entregue, 2026-07-14)
1. Frase literal: "Desculpe me eu não tive tempo para ir buscar mais assim que eu chegar eu pago e pego" / áudio sem transcrição / "Desculpe me quando o sol baixar mais eu passo aí" — só logística de retirada, sem descrição do que foi impresso.
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: "ok" (equipe, não descritiva).
4. Contaminação: não observada.

## 558196381444 — ped-1066 IMPRESSÃO PAPEL ADESIVO A4 192G / ped-1067 ENCADERNAÇÃO ATÉ 30 FOLHAS (entregue, 2026-07-16)
1. Frase literal: SEM TEXTO — só mídia (2 imagens, sem legenda).
2. Produto real: IMPRESSÃO PAPEL ADESIVO A4 192G + ENCADERNAÇÃO ATÉ 30 FOLHAS
3. Primeira resposta substantiva: nenhuma registrada.
4. Contaminação: não observada.

## 558196409480 — ped-1341 IMPRESSÃO COLORIDA OFÍCIO A4 / ped-1342 IMPRESSÃO P&B A4 (entregue, 2026-07-21)
1. Frase literal: "Falta a outra experiência" / "Hospital memorial Star \nAtuação: Enfermeira \nSetor: Clínica médica \nTempo: 12/2024\nAté 07/2026" / "Retira a experiência do português de baixo" / "Pq é o mesmo hospital ficou em duplicidade" / "Vcs pode colocar foto nesse curriculum ?"
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 + IMPRESSÃO P&B A4 — mas a conversa real é edição de currículo (mesmo padrão do 558195693976: produto catalogado genericamente como "impressão").
3. Primeira resposta substantiva: nenhuma — só o código Pix.
4. Contaminação: não observada.

## 558196448304 — ped-0874 — IMPRESSÃO P&B A4 (entregue, 2026-07-14)
1. Frase literal: sem texto livre — só as legendas dos documentos enviados, "Agendamento Detran George.pdf" e "Agendamento Detran George" (documento de agendamento do DETRAN).
2. Produto real: IMPRESSÃO P&B A4
3. Primeira resposta substantiva: nenhuma registrada.
4. Contaminação: não observada.

## 558196507652 — ped-0779 IMPRESSÃO COLORIDA OFÍCIO A4 / ped-0780 PLASTIFICAÇÃO PEQUENA (entregue, 2026-07-13)
1. Frase literal: "Boa tarde tem como imprimir e enplastica 4 unidades pra mim que vou buscar" / "E pra eu andar com eles na minha bolsa ti peito" / "Dinheiro" (forma de pagamento)
2. Produto real: IMPRESSÃO COLORIDA OFÍCIO A4 + PLASTIFICAÇÃO PEQUENA
3. Primeira resposta substantiva: "Opa, Flávio! Boa tarde! Tem sim, a impressão 2,20 + 16,00 das plastificaçõe, total 18,20 . Assim que ficar pronto avisaremos. 😉" — depois "Show, Flávio! Combinado! qual vai ser a forma de pagamento? 😉"
4. Contaminação: não observada.
