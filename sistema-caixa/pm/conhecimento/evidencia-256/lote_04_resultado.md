# Lote 04 — Pesquisa linguagem real do cliente (29 telefones)

**Nota de continuidade:** este lote foi retomado após queda do processo anterior. Lista de
telefones verificada em `pesquisa256/lote_04_csv.txt` (mesmo padrão pré-gerado que originou a
lista do lote 03, confirmado por conferência cruzada) — 29 telefones, batendo com
`lote_04.txt`. Nenhum progresso anterior (`lote_04_resultado.md`) existia antes desta execução;
feito do zero.

Metodologia: `to_timestamp(data_timestamp/1000.0)`, `is_group=false`, `apagada_em IS NULL`,
telefone ligado por últimos 11 dígitos. Pedidos agrupados em clusters (gap > 48h = nova
conversa); janela de busca -6h/+48h em torno de cada cluster de pedidos.

---

## 1. 558186880265 — Atalmir — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) + IMPRESSÃO P&B A4 (2 clusters: 07-10, 07-13)
1. SEM TEXTO — só mídia nos 2 clusters (documento + 2 imagens no cluster 1; documento no cluster 2), sem nenhuma legenda ou frase do cliente
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta), IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "Obrigado 😊"
4. Sem contaminação

---

## 2. 558186886373 — Marcio Pereira — IMPRESSÃO P&B A4 (07-08) / agendamento (07-17)
1. Cluster 1: SEM TEXTO — só documento (etiqueta "3290734421514132164_jadlog_standard", nome de arquivo indica rastreio Jadlog). Cluster 2 (pedido "agendamento" 07-17): **SEM LOG DE CONVERSA** — não há nenhuma mensagem deste telefone no banco além da única do cluster 1
2. Produto: IMPRESSÃO P&B A4, agendamento
3. Primeira resposta da equipe: nenhuma resposta de texto capturada
4. Sem contaminação

---

## 3. 558186903048 — Marluce Martins — IMPRESSÃO P&B A4
1. Texto literal do cliente: "Bom dia" / "Eu só vô querer a parte pra fazer o pagamento" / "Senha 55861466491" / "Tô indo ai" / "Obrigada"
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto da equipe capturada na janela
4. Sem contaminação

---

## 4. 558186908807 — Ozelia Melo — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento, sem legenda, sem nenhuma mensagem de texto do cliente na janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 5. 558186941468 — Maria De Lourdes — IMPRESSÃO P&B A4
1. Texto literal do cliente: "Bom dia!" / "Ok" (+ documento anexado, sem legenda)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto da equipe capturada na janela
4. Sem contaminação

---

## 6. 558186969731 — Edite Maria Santos — IMPRESSÃO P&B A4 + IMPRESSÃO 2ª VIA CONTA
1. Texto literal do cliente (mensagem longa, íntegra, colada como texto — não anexo): "À EQUIPE DO CRAS\n\nPrezados(as),\n\nSolicito a atualização do meu Cadastro Único, tendo em vista que o Instituto Nacional do Seguro Social – INSS emitiu exigência no processo administrativo de restabelecimento do meu Benefício de Prestação Continuada – BPC/LOAS.\n\nNo meu Cadastro Único ainda consta como renda familiar o valor de R$ 1.518,00, referente ao BPC que eu recebia anteriormente. [...] EDITE MARIA SANTOS DA SILVA\nCPF: 093.136.398-58" — carta formal completa, endereçada ao CRAS, colada direto no chat pra ser impressa
2. Produto: IMPRESSÃO P&B A4, IMPRESSÃO 2ª VIA CONTA
3. Primeira resposta da equipe: "Obrigado 😉"
4. Sem contaminação — achado relevante: cliente usa o WhatsApp da gráfica como "editor de texto", colando o conteúdo integral de um documento formal (requerimento ao CRAS) pra virar impressão, sem anexar arquivo

---

## 7. 558187002491 — Everaldoo Bezerra — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (3 documentos em sequência, sem legenda, sem nenhuma mensagem de texto do cliente na janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "obg"
4. Sem contaminação

---

## 8. 558187073466 — Andrea Regina — IMPRESSÃO P&B A4
1. Texto literal do cliente: "89046" (após 2 documentos anexados, sem legenda — parece número de senha/protocolo)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "OBG"
4. Sem contaminação

---

## 9. 558187115636 — "João - AGENDA FECHADA" — IMPRESSÃO P&B A4 (2 clusters: 07-06, 07-14)
1. Texto literal do cliente — cluster 1: "Olá, imprime pra mim, por favor" / "ambas" / "acho que dão 8 páginas, preto e branco" / "Joia". Cluster 2: "boa tarde" / "imprime esses dois pdfs pra mim, por favor" / "preto e branco, todas as páginas" / "okok?" / "isso" / "a outra, um" / "certo" / "vou pedir pra ir buscar" / "Manda a chave, por favor" (pedindo chave Pix)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "Boa tarde, estão impressos valor 9,60" (cluster 1) / "oi a noça esta aqui para pegar o material vc manda o comprovante do pix" (cluster 2, com erro de digitação "noça"=moça/pessoa)
4. Sem contaminação — cliente descreve com precisão o que quer (todas as páginas, P&B), bom exemplo de instrução completa em texto corrido

---

## 10. 558187144970 — "Irmão Rinaldo" — Adesivo leitoso recortado
1. Texto literal do cliente: "No cartão" / "Amanhã eu pego" / "Eu só posso pegar as 18.00horas" / "Estou na lagoa encantada" / "O senhor está aberto" / "Ok"
2. Produto: Adesivo leitoso recortado
3. Primeira resposta da equipe: "Obrigado!"
4. Sem contaminação — tratamento "irmão" no nome do contato sugere vínculo religioso/comunitário, mas conteúdo é comercial normal

---

## 11. 558187183166 — france silva — TOPO DE BOLO (com recorte)
1. Texto literal do cliente: "?" / "E quanto" / "Cortado e" / "Fica do lado da casa de ração ne" (referência de localização) / "Quero com corte" / "Certo" / "Simm" / "16 anos" (provavelmente tema do topo de bolo — aniversário de 16 anos) / "Boa tarde" / "Vai tá pronto ainda hj" / "Posso ir aí que horas" / "Tá certo"
2. Produto: TOPO DE BOLO (com recorte)
3. Primeira resposta da equipe: nenhuma resposta de texto da equipe capturada na janela
4. Sem contaminação — mensagens bem fragmentadas/picotadas, típico de digitação por celular, mas conteúdo consistente (topo de bolo com corte, para aniversário de 16 anos)

---

## 12. 558187210479 — Neide Maria da Silva — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento, sem legenda, sem nenhuma mensagem de texto do cliente na janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 13. 558187246194 — Maria José De Souza — IMPRESSÃO P&B A4 (2 pedidos no mesmo cluster)
1. Texto literal do cliente: "Bom dia" / "Você pode imprimir esse resultado de exame para mim?" / "Pode" / "Ok" / "Qual a chave pix" / "Consegui fazer o Pix não! tá dando QR code inválido vou mandar ele levar em espécie" / "O motoqueiro vai agora" / "Ele pegou?"
2. Produto: IMPRESSÃO P&B A4 (impressão de resultado de exame médico)
3. Primeira resposta da equipe: envio do Pix copia-e-cola / "ok" / "sim"
4. Sem contaminação — caso relevante de fricção de pagamento (Pix "QR code inválido") resolvido enviando dinheiro em espécie por motoboy

---

## 14. 558187275786 — Rodrigo Cabral — IMPRESSÃO P&B A4
1. Texto literal do cliente: "Boa tarde!\nÉ para imprimir, daqui a pouco eu chego aí para buscar" (legenda do documento "Exerc. de principios de inspeções 3.docx") / "Dinheiro"
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "Boa tarde, Rodrigo! Beleza, pode vir buscar a impressão. Já tá prontinha aqui. Valor 1,20😉" / "qual vai ser a forma de pagamento?"
4. Sem contaminação

---

## 15. 558187293811 — Rosiane Barbosa — CONTA GOV / IMPRESSÃO COLORIDA OFÍCIO A4 / IMPRESSÃO P&B A4 / PLASTIFICAÇÃO A4 / FOTO 10X15 (3 clusters: 07-15, 07-17, 07-23 — cliente super recorrente, 8 pedidos no total)
1. SEM TEXTO em texto próprio — cliente só envia imagens e 2 links do ChatGPT como legenda de imagem: "https://chatgpt.com/s/m_6a525e705a008191b6f4392e5a435871" e "https://chatgpt.com/s/m_6a5a79daa0ac8191b3df8671e5067a5e" (provavelmente prints de conversas/resultados do ChatGPT que ela quer imprimir) — em nenhum cluster há frase própria descrevendo o pedido
2. Produto: CONTA GOV, IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta/laser), IMPRESSÃO P&B A4, PLASTIFICAÇÃO A4, FOTO 10X15
3. Primeira resposta da equipe: nenhuma resposta de texto capturada em nenhum dos 3 clusters
4. Sem contaminação — achado relevante: cliente recorrente e de alto volume, mas comunicação 100% por imagem/link de compartilhamento do ChatGPT, nunca por frase própria

---

## 16. 558187323412 — "Silvania 🙋🏻‍♀️" — IMPRESSÃO P&B A4
1. Texto literal do cliente: "Boa tarde, imprime so o de pagamento" (+ documento anexado)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto da equipe capturada na janela
4. Sem contaminação

---

## 17. 558187394852 — Edith — IMPRESSÃO P&B A4 + ENVELOPE A4
1. SEM TEXTO — só mídia (3 documentos em sequência, sem legenda, sem nenhuma mensagem de texto do cliente na janela)
2. Produto: IMPRESSÃO P&B A4, ENVELOPE A4
3. Primeira resposta da equipe: "Obrigado"
4. Sem contaminação

---

## 18. 558187407360 — Gisele Guimarães — IMPRESSÃO COLORIDA OFÍCIO A4 (laser e jato tinta) (2 clusters: 07-10, 07-13)
1. Texto literal do cliente — cluster 1 (bastante rico, cliente indecisa/insistente): "Bom dia" / "Gostaria dessas imagens" (7 imagens enviadas) / "Kd uma em 1 folha de papel" / "Vcs tem como pegar na Internet pra mim?" / "Mais ou menos nesse modelo que te mandei" / "Umas imagens melhor, que essas minhas" / "De quanto??" / "Ðe quanto????" (repetiu com urgência/erro de teclado) / "Vc poderia me responder por favor!?" / "Certo" / "Eu vou querer 5 folhas" / "15,00 né isso?" / "Não e muito pequeno não?" / "Tô chegando ai". Cluster 2: "Bom dia" / "Imprimir por favor" / "Cada folha de ofício vc imprime 2 imagens" / "Me diz o valor por favor" (10 imagens enviadas)
2. Produto: IMPRESSÃO COLORIDA OFÍCIO A4 (laser), IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
3. Primeira resposta da equipe: "Bom dia, Gisele! Pra te dar um orçamento certinho, preciso saber qual o tamanho e o material que você quer pra essas imagens. Me diz aí que eu já vejo pra você! 😉"
4. Sem contaminação — caso rico de fricção: cliente pede "imagens da internet" que a gráfica busque por ela, demora bastante pra responder → ela reclama repetidamente ("De quanto??", "Ðe quanto????", "Vc poderia me responder por favor!?")

---

## 19. 558187431933 — "Raiane 87431933" — XEROX PRETO E BRANCO A4
1. Texto literal do cliente: "Bom dia" / "Pode imprimir o laudo colorido por favor, e o comprovante de residência preto e branco" / "Vou pagar a dinheiro"
2. Produto: XEROX PRETO E BRANCO A4
3. Primeira resposta da equipe: mensagem automática "Pedido confirmado! 😊 🖨️ *XEROX PRETO E BRANCO A4* 📦 Qtd: 6 💰 R$ 2.70..."
4. Sem contaminação

---

## 20. 558187434701 — Bartolomeu Cassiano — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (3 documentos em sequência, sem legenda, sem nenhuma mensagem de texto do cliente na janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 21. 558187499128 — Lenildo — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento + 1 sticker, sem legenda, sem nenhuma mensagem de texto do cliente na janela)
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "1,20" (valor cobrado)
4. Sem contaminação

---

## 22. 558187511655 — Suely — RECARGA VEM
**Nota:** não há log de conversa na janela -6h/+48h do pedido (criado 2026-07-15). As únicas
mensagens deste telefone no banco são de fevereiro e março de 2026 — reportadas aqui com
ressalva de defasagem temporal, não confirmadas como ligadas a este pedido específico.
1. Texto literal do cliente (conversas anteriores): "Bom dia é só o boleto mesmo." (fevereiro) / "Boa tarde" / "Aí faz alteração no CPF pra acrescentar o sobrenome de casado,e no título eleitor?" / "👍" (março)
2. Produto do pedido do lote: RECARGA VEM
3. Primeira resposta da equipe: nenhuma resposta de texto da equipe capturada nessas conversas anteriores
4. Sem contaminação — mas os assuntos anteriores (boleto, alteração de documento) são bem diferentes do produto do pedido do lote (recarga de cartão VEM), reforçando que não é a mesma conversa

---

## 23. 558187531204 — Eli Votória — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (2 documentos: "NOTIFICAÇÃO DE AUTUAÇÃO.pdf" e "TERMO DE RESPONSABILIDADE 4.pdf" — nomes de arquivo revelam o assunto: multa/notificação de trânsito), sem nenhuma legenda ou frase do cliente
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada na janela
4. Sem contaminação

---

## 24. 558187562116 — Cleyton Manoel — IMPRESSÃO P&B A4 (4 clusters: 07-14, 07-21, 07-24, 07-28 — cliente recorrente, sempre o mesmo padrão)
1. Texto literal do cliente, recorrente em todos os 4 clusters: "Bom dia" (só isso, sempre) — depois só documentos, principalmente boletos e notas fiscais de fornecedores de alimentos (nomes de arquivo revelam: "boleto kd.pdf", "nota kd.pdf", "BOLETO ALTO DA BONDADE.pdf", "NOTA ALTO DA BONDADE.pdf", "NOTA KD ALIMENTO.pdf", "BOLETO HIPER BOM CONCEIÇAO.pdf", "NOTA FELIX ALTO DA BONDADE.pdf" etc.). Único texto fora do padrão: "De nadar" (aparece 2x, provavelmente erro de autocorretor pra "de nada")
2. Produto: IMPRESSÃO P&B A4 (repetido em todos os 4 pedidos)
3. Primeira resposta da equipe: "Obrigado 😊" / "obg"
4. Sem contaminação — cliente é claramente dono/gestor de estabelecimento (compra de alimentos/mercadorias — "KD Alimentos", "Alto da Bondade", "Hiper Bom Conceição" parecem nomes de comércios/fornecedores) usando a JS Gráfica pra imprimir boletos e notas fiscais recorrentemente, quase toda semana. Achado relevante: comunicação 100% por nome de arquivo, cliente nunca descreve o pedido em texto próprio além de "Bom dia"

---

## 25. 558187584978 — "Reginaldo Souza Souza" — IMPRESSÃO P&B A4
1. SEM TEXTO — só mídia (1 documento, sem legenda). Único texto: nenhum do cliente na janela
2. Produto: IMPRESSÃO P&B A4
3. Primeira resposta da equipe: "Obrigado"
4. Sem contaminação

---

## 26. 558187613253 — "FERREIRADSUMUS 🌊🦈🌵🦅" / Otto Silva — XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4 (4 clusters: 07-06, 07-08/10, 07-17, 07-20 — mesmo telefone, nome do contato muda de "FERREIRADSUMUS" para "Otto Silva" ao longo do tempo, provavelmente mesma pessoa trocando de nome de exibição)
1. Texto literal do cliente — cluster 1: "Bom dia, vcs já estão atendendo?" (repetida 2x) + documento "DEFESA_FINAL_CPPAD_IPOJUCA_-_OTTO_SILVA_FERREIRA_-_MAT.79952_assinado.pdf" (nome do arquivo confirma que é processo administrativo/defesa de PAD do próprio cliente, matrícula funcional). Cluster 2: "Bom dia" / "Estarei indo ao seu estabelecimento para pagar e pegar esta impressão abaixo" / depois (Otto Silva): "Bom dia\nQuanto custa a impressão abaixo?" (+ documento "DETRAN Requerimento Psicomedico.pdf"). Cluster 3: "Bom dia\nQuanto custa a impressão acima?". Cluster 4: SEM TEXTO — só documento
2. Produto: XEROX PRETO E BRANCO A4, IMPRESSÃO P&B A4
3. Primeira resposta da equipe: mensagem automática "Pedido confirmado! 😊 🖨️ *XEROX PRETO E BRANCO A4* 💰 R$ 0.45..." / "Bom dia! Obrigado 😉" / "Obrigado!😊"
4. Sem contaminação — cliente pergunta valor ANTES de confirmar repetidamente ("Quanto custa a impressão abaixo?" / "Quanto custa a impressão acima?"), padrão de cliente que sempre quer saber preço antes de decidir

---

## 27. 558187650000 — Rogeria Soares — IMPRESSÃO P&B A4 + XEROX PRETO E BRANCO A4 (2 clusters: 07-15/17, 07-24)
1. Texto literal do cliente — cluster 1: "Bom dia,🕊️" (+ documento) / "Posso ir buscar vi agora," (com vírgula sobrando, erro de digitação comum). Cluster 2: "Boa tarde, o boleto por gentileza." (+ documento)
2. Produto: IMPRESSÃO P&B A4, XEROX PRETO E BRANCO A4
3. Primeira resposta da equipe: "Bom dia! Obrigado 😊" / "Obrigado 😊"
4. Sem contaminação

---

## 28. 558187700579 — Fernando Augusto — ACESSO/ENVIO DOCUMENTOS + IMPRESSÃO P&B A4 + XEROX PRETO E BRANCO A4 (2 clusters: 07-17, 07-22)
1. Texto literal do cliente — cluster 1: "Boa tarde" / "Gostaria de saber se vocês tem currículo meu aí salvo?" / "Fernando Augusto da Silva" / "Isso!" / "Tem como mandar o pix pra mim mandar o dinheiro" / "Gostaria em PDF" / "Deu quanto?!". Cluster 2: "Por gentileza tem como imprimir" (+ documento) / "Ola pesso perdão" (erro de digitação, "peço perdão") / "Eu remarquei o agendamento" / "Vou mandar o certo" (+ documento "Comprovante do agendamento NEW.pdf") / "Pode tirar impressão desses documentos também!" / "Por gentileza!" / "Estou indo aí"
2. Produto: ACESSO/ENVIO DOCUMENTOS (recuperação de currículo salvo no sistema da gráfica), IMPRESSÃO P&B A4, XEROX PRETO E BRANCO A4
3. Primeira resposta da equipe: nenhuma resposta de texto capturada no cluster 1 (só envio de Pix); cluster 2 idem
4. Sem contaminação — achado relevante: cliente pede o próprio currículo salvo anteriormente na gráfica ("vocês tem currículo meu aí salvo?"), revelando que a JS Gráfica funciona como repositório de documentos do cliente entre visitas, e depois pede em PDF ao invés de impresso

---

## 29. 558187733689 — Vivian / Vivian Cavalcante — IMPRESSÃO PAPEL ADESIVO A4 192G + IMPRESSÃO PAPEL FOTO A4/A3 230g
1. Texto literal do cliente (conversa rica, decoração de festa): "Boa noite" / "Certo, obrigada" / "Amanhã vai abrir?" / "Vocês trabalham com esses aplique" (referindo-se a imagem enviada) / depois: "Cada uma figura dessa" / "Fica assim desses tamanhos" / "Grande" / "Aquela figura figura pequena não gostei" / "E 13 que tem o tubete" / "Esse modelos vocês fazem?" / "Eu passo ai pra buscar quando tiver pronto" / ". Sem recorte" / "Tubete tem 13 cm" / depois (2º dia): "Boa tar" / "Boa tarde!" / "Vocês faz mas 10 recorte desse no papel foto de 9 cm" / "Do mesmo jeito de ontem ja no recorte" / "São 2 modelos de cada igual a de ontem" / "Ta certo" / "No recorte ne 9" / "Pronto vai ser recortada" / "No pix" / "E vida jardim" (bairro) / "Ja ta pronto" / "Ta certo"
2. Produto: IMPRESSÃO PAPEL ADESIVO A4 192G (sem recorte), IMPRESSÃO PAPEL FOTO A4 230g, IMPRESSÃO PAPEL FOTO A3 230g
3. Primeira resposta da equipe: "Bom dia 😊" / "Bom dia, Vivian! Sim, abriremos pelo menos até às 15:00h" / "esse aplique pode ser feito com papel foto com recorte, você cola com cola quente ou outra cola, o valor do papel foto com recorte 9,00, e se quiser sem recorte 6,50."
4. Sem contaminação — o termo "aplique" e "tubete" e pedido de "recorte" no formato de figuras remete a decoração de festa infantil (topper/aplique de bolo ou lembrancinha), cliente manda referências visuais e pede replicar tamanho/modelo

---

# Resumo de cobertura

Todos os 29 telefones do lote foram cobertos (nenhum pulado). Um telefone (558186886373,
cluster 2) e um telefone inteiro (558187511655) caíram em situação "sem log na janela do
pedido" — para 558187511655 há log em datas muito anteriores (fev/mar), reportado com ressalva;
para 558186886373 cluster 2, não há absolutamente nenhum log adicional no banco (SEM LOG DE
CONVERSA de fato, mesmo fora da janela).

- **Texto real do cliente (frase própria substantiva):** 17 telefones (558186903048,
  558186941468, 558186969731, 558187115636, 558187144970, 558187183166, 558187246194,
  558187275786, 558187323412, 558187407360, 558187431933, 558187613253, 558187650000,
  558187700579, 558187733689, e parcialmente 558187511655 [em conversa de outra data])
- **Só mídia, sem nenhum texto (SEM TEXTO):** 11 telefones (558186880265, 558186886373 [cluster
  1], 558186908807, 558187002491, 558187073466 [só um código numérico], 558187210479,
  558187293811 [só links/imagens], 558187394852, 558187434701, 558187499128, 558187531204,
  558187562116 [só "Bom dia" recorrente], 558187584978)
- **Sem log na janela do pedido:** 2 casos — 558187511655 (log em outra data, reportado com
  ressalva) e 558186886373 cluster 2 (nenhum log adicional, SEM LOG DE CONVERSA de fato)
