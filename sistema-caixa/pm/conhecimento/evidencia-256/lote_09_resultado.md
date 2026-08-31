# Lote 09 — Linguagem real do cliente no WhatsApp (29 telefones)

Metodologia: `jsgrafica_pedidos` ligado a `jsgrafica_log_msgs_privadas` pelos últimos 11 dígitos
do telefone. `data_timestamp` convertido de milissegundos com `to_timestamp(data_timestamp/1000.0)`,
hora local `America/Recife`. Excluídos `is_group=true` e `apagada_em IS NOT NULL`. Janela padrão
-6h/+48h em torno de cada `created_at` de pedido; quando a janela não trouxe nada (telefone 18),
a janela foi ampliada manualmente para achar a conversa real.

---

## 1. 558196517857 — iranj076 — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 documento em 06/07 08:46, sem legenda, sem nenhuma mensagem de texto na janela).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** "Pedido confirmado! 😊 🖨️ *IMPRESSÃO P&B A4* 💰 R$ 1.20 / Assim que estiver pronto eu te aviso 😊"
4. **Contaminação:** nenhuma observada.

## 2. 558196582380 — Jobson Justino — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 documento em 29/07 10:07, sem legenda).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 3. 558196610778 — Carla Batista — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 imagem em 07/07 11:55, sem legenda; cliente não escreveu nada).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** "bom dia" / "1,20" / "Bom dia, Carla! Sua impressão P&B A4 já está pronta aqui, viu? Fica R$ 1,20. Pode vir buscar quando quiser! 😉"
4. **Contaminação:** nenhuma observada.

## 4. 558196625079 — Leandro Lucas — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) / IMPRESSÃO P&B A4
1. **Frase literal do cliente:** "Oi" — depois só enviou 2 documentos sem legenda de texto própria (nomes de arquivo: "FICHA_DE_HOSPEDES_2025_...pdf" e "Termo de autorização Zbreak-2.pdf").
2. **Produto/serviço real:** IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) + IMPRESSÃO P&B A4 (pedido cancelado + reenviado no mesmo dia).
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma — documentos parecem formulários de hospedagem/autorização de terceiros que o cliente só levou pra imprimir.

## 5. 558196673200 — Tom — IMPRESSÃO PAPEL ADESIVO A3 192G / IMPRESSÃO PAPEL FOTO A4 230G
1. **Frase literal do cliente:** "Boa tarde" / "Qual valor da impressão na folha se papel de foto" / "?" / "Qual tamanho do papel ?" / "Tem maior ?" / "Manda chave pix por favor" / "Quanto fica ?" / "Certo" / "Vou querer". Segundo pedido (5 dias depois): "Em papel adesivo." / "Folha menor" / "Qual valor ?" / "Certo!" / "Vou fazer agr".
2. **Produto/serviço real:** IMPRESSÃO PAPEL ADESIVO A3 192G (sem recorte) e depois IMPRESSÃO PAPEL FOTO A4 230g.
3. **Primeira resposta da equipe:** "A4" / "20x29" (respondendo tamanho de papel), depois "9,00" (preço).
4. **Contaminação:** nenhuma observada.

## 6. 558196714488 — Erlane — XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 documento em 15/07 13:08, sem legenda).
2. **Produto/serviço real:** XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 7. 558196739216 — Flaviana Valeria — IMPRESSÃO 2ª VIA CONTA / IMPRESSÃO P&B A4
1. **Frase literal do cliente:** "Bom dia" / "Imprimir" (seguido de vários documentos e imagens sem legenda de texto).
2. **Produto/serviço real:** IMPRESSÃO 2ª VIA CONTA + IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 8. 558196808677 — Alberto Filho — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 documento em 21/07 17:51, sem legenda).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** "Obrigado 😊"
4. **Contaminação:** nenhuma observada.

## 9. 558196814867 — Jana Torres — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** "Você poderia imprimir 5 folhas" / "Desse currículo" / "Me passa o pix" / "Bom diaaaaaa" / "Me passa a chave" / "Só vou poder pegar a tarde tá" / "Muito obrigada"
2. **Produto/serviço real:** IMPRESSÃO P&B A4 (5 folhas de currículo).
3. **Primeira resposta da equipe:** envio do código Pix, seguido de "pode vir buscar"
4. **Contaminação:** nenhuma observada.

## 10. 558196822626 — Valmir Bezerra — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** "Compras 🛍 também" — única frase de texto capturada na janela; fora de contexto óbvio de impressão, mas não há mais nada no log pra confirmar se é sobre outro assunto.
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** possível — a frase isolada "Compras 🛍 também" não parece claramente ligada a pedido de impressão; marcar como ambígua, não usar como exemplo de linguagem de pedido sem checar mais contexto.

## 11. 558196836416 — Valéria Maria Lima — IMPRESSÃO P&B A4 (x2)
1. **Frase literal do cliente:** SEM TEXTO — só mídia (2 documentos em 13/07 15:03 e 15:06, sem legenda).
2. **Produto/serviço real:** IMPRESSÃO P&B A4 (x2).
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 12. 558196847478 — Hugo Nogueira — IMPRESSÃO P&B A4 / FOTO 3X4 (6 FOTOS) / IMPRESSÃO 2ª VIA CONTA
1. **Frase literal do cliente:** "Bom dia tudo bem" / "Foto 3/4 vocês fazem ?" / "Massa vlw Jajá to indo aí vou te passar 2 documentos pra fazer uma impressão" / "Imprimi outra dessa por favor" / "Minha esposa Jajá passa por aí" / "Me passa chave Pix" (dias depois:) "Consegue imprimir este documento pra mim por favor" / "Colorido"
2. **Produto/serviço real:** IMPRESSÃO P&B A4, FOTO 3X4 (6 FOTOS), IMPRESSÃO 2ª VIA CONTA (pedidos em datas diferentes).
3. **Primeira resposta da equipe:** "Pedido confirmado! 😊 🖨️ *IMPRESSÃO P&B A4* 📦 Qtd: 2 💰 R$ 2.40" / "obg"
4. **Contaminação:** nenhuma observada.

## 13. 558196997877 — Silvânia Bezerra — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** "Bom dia! \nUma copia de cada"
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** "bom dia" / "Silvânia! Sua impressão P&B A4 já está pronta, viu? Fica R$ 2,40."
4. **Contaminação:** nenhuma observada.

## 14. 558197022883 — Karol 🧿✨ — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** "Boa tarde" (documento com legenda "Segunda via - Fatura") / "eu quem agradeço!"
2. **Produto/serviço real:** IMPRESSÃO P&B A4 (2ª via de fatura).
3. **Primeira resposta da equipe:** "Obrigado"
4. **Contaminação:** nenhuma observada.

## 15. 558197037824 — Jamilly — AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO / IMPRESSÃO P&B A4 / XEROX P&B A4 / ENVELOPE A4
1. **Frase literal do cliente:** "Bom dia" / "Quanto é mesmo pra criar um currículo ?" / (colou o texto completo do currículo dela) / "Em PDF". Em pedidos posteriores: "Boa tarde qual o valor para imprimir" / "Bom dia! Vc consegue me reenviar o currículo em pdf de Jonatas arcanjo? Estava nas nossas conversar, só que sumiu" / "Quero imprimir" / "Pfvr" / "E tirar 2 cópias" / "Quanto está o envelope ?" / "Eu vou aí buscar jaja e pagar em dinheiro" / "Preto e branco" / "Vou querer 3"
2. **Produto/serviço real:** AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO (criação de currículo), depois IMPRESSÃO P&B A4, XEROX PRETO E BRANCO A4, ENVELOPE A4.
3. **Primeira resposta da equipe:** "Oi, Jamilly! Seu currículo já está produção, assim que estiver pronto enviaremos para sua correão antes de gerar o pdf, valor 5,00" / "vai bota foto?"
4. **Contaminação:** nenhuma — é o telefone com mais volume de conversa real do lote, ótimo exemplo de jornada completa (criação de currículo → impressões recorrentes).

## 16. 558197080551 — Aloizio — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 documento em 21/07 14:10, sem legenda).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 17. 558197103012 — Mario Antunes — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) / DIGITAÇÃO DE PROVAS
1. **Frase literal do cliente:** "Bom dia , vcs fazem boletim de ocorrência pela internet" / "Imprime na hora?" / "Isso leva em torno de quanto tempo ?" / "Tá certo obrigado". Depois: "Fiz um ontem pela internet vou passar o protocolo pra vc ver se já estiver disponível pode imprimir que vou buscar" (+ número de protocolo) / "Tbm vou enviar pra vc os dados para confecção de um currículo" / dados de terceira pessoa (Ana Lourdes Alves) / "Sem condições de escrever tudo" / "Ok obrigado tbm pode imprimir uma cópia dessa CNH que eu enviei acima".
2. **Produto/serviço real:** IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) + DIGITAÇÃO DE PROVAS (boletim de ocorrência online para terceiro).
3. **Primeira resposta da equipe:** "sim 7,00" / "a gente faz e espera o retorno da delegacia" / "nao sei te informar" / "vamos preparar e passamos para vc" (com modelo de currículo em branco enviado pra ele preencher).
4. **Contaminação:** nenhuma — é um caso de "cliente pedindo serviço de digitação/documento em nome de terceiro" (mãe/parente idosa), útil como padrão de serviço assistido.

## 18. 558197119600 — Cayo Moraes — IMPRESSÃO COLORIDA OFÍCIO A3
1. **Frase literal do cliente:** janela padrão (-6h/+48h do pedido de 28/07) não teve nenhuma mensagem — busca ampliada achou a conversa real no dia anterior (27/07 10:30–10:32): "Olá gente bom dia" / "Imprimir aqui a partir da página 05. Desconsiderar as 04 primeiras páginas." / "Já esse segundo aqui, desconsiderar as 05 primeiras páginas." / "São impressões em A3 colorido" / "Estou desconsiderando essas porque vamos imprimir apenas a partir das páginas que tem medidas, tá bem?" (documentos anexados: "PROJETO DE DESIGN DE INTERIORES - CAÍQUE BARRETO" e "...- QT MARIA FERNANDA")
2. **Produto/serviço real:** IMPRESSÃO COLORIDA OFÍCIO A3 (plantas/projeto de design de interiores, imprimindo só a partir de certas páginas).
3. **Primeira resposta da equipe:** nenhuma resposta de equipe encontrada no log (nem na janela ampliada) — pode ter sido combinado por outro canal ou não logado.
4. **Contaminação:** nenhuma — há também uma conversa antiga (09/02, meses antes) do mesmo telefone sobre "01 copia colorida de cada em A3" por R$35, não misturada aqui por ser de outro ciclo de pedido.

## 19. 558197161038 — Camila 🤩 — IMPRESSÃO P&B A4 (x3, sendo 2 cancelados)
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 imagem em 29/07 12:09, sem legenda).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 20. 558197216872 — Patrícia Freitas — XEROX PRETO E BRANCO A4 / IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (2 imagens em 15/07 10:15, sem legenda).
2. **Produto/serviço real:** XEROX PRETO E BRANCO A4 + IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 21. 558197253217 — Cristiane Oliveira — XEROX PRETO E BRANCO A4 / IMPRESSÃO 2ª VIA CONTA / ENVELOPE A4
1. **Frase literal do cliente:** documento com legenda "Rafael Dantas Dos Santos.22pdf.pdf" (nome de arquivo, não descrição própria); depois "Já retirei" / "Paguei em dinheiro" / "Retirei junto com uns rgs"
2. **Produto/serviço real:** XEROX PRETO E BRANCO A4, IMPRESSÃO 2ª VIA CONTA, ENVELOPE A4.
3. **Primeira resposta da equipe:** "Obrigado 😉" e depois mensagem em lote de produção/pronto pra retirada dos 3 pedidos.
4. **Contaminação:** nenhuma — "rgs" no fim sugere que ela também retirou RGs (documento de identidade) no mesmo momento, mas não é serviço de outro negócio.

## 22. 558197319338 — Cleone — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** "Boa tarde!" / "Imprime,por favor?." / "Posso fazer em outro momento?"
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 23. 558197376802 — .Thiago F — IMPRESSÃO P&B A4 (x2, datas diferentes)
1. **Frase literal do cliente:** SEM TEXTO — só mídia em ambos os pedidos (documentos em 07/07 10:57 e 17/07 11:15, sem legenda, sem texto).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** "Pedido confirmado! 😊 🖨️ *IMPRESSÃO P&B A4* 💰 R$ 1.20" / "Obrigado" (só no primeiro pedido; segundo sem resposta capturada).
4. **Contaminação:** nenhuma observada.

## 24. 558197390256 — Adriano Freitas — IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta)
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 imagem + 1 documento "CRACHA ADRIANO.pdf", sem legenda de texto).
2. **Produto/serviço real:** IMPRESSÃO COLORIDA OFÍCIO A4 (jato tinta) — pelo nome do arquivo, impressão de crachá.
3. **Primeira resposta da equipe:** "Obrigado"
4. **Contaminação:** nenhuma observada.

## 25. 558197406233 — Alan Tarcísio — IMPRESSÃO P&B A4 / ENCADERNAÇÃO
1. **Frase literal do cliente:** "Oi" / "Boa tarde" / "Pode imprimir as 5 últimas páginas por favor" / "163 a 172" / "As últimas 5" / "Tá aberto?" / "92 a 96" / "71 a 75" / "È pq está escrito na pagina" (explicando por que passou os números). Pedido seguinte: "Oi" / "Poderias editar as páginas" / "Enquanto eu chego pra dar uma olhada e imprimir os arquivos sem as páginas em branco" / "Não dá ?" / "Da pra editar ? E imprimir só o que eu vou te falar ?" / "Tô indo aí"
2. **Produto/serviço real:** IMPRESSÃO P&B A4 (15 páginas selecionadas) + ENCADERNAÇÃO ATÉ 30 FOLHAS / 51 A 100 FOLHAS.
3. **Primeira resposta da equipe:** "Pedido confirmado! 😊 🖨️ *IMPRESSÃO P&B A4* 📦 Qtd: 15 💰 R$ 18.00"
4. **Contaminação:** nenhuma observada.

## 26. 558197422896 — Maria José — SCANNER / ACESSO/ENVIO DOCUMENTOS
1. **Frase literal do cliente:** SEM TEXTO — só mídia (sticker + 1 áudio sem transcrição capturada na base).
2. **Produto/serviço real:** SCANNER + ACESSO/ENVIO DOCUMENTOS.
3. **Primeira resposta da equipe:** "Obrigado! 😊"
4. **Contaminação:** nenhuma observada.

## 27. 558197495999 — Helena Bezerra — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (1 documento) + "Obg !" (agradecimento, sem descrição do pedido).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** "Bom dia Helena, Pedido confirmado! 😊 🖨️ *IMPRESSÃO P&B A4* 📦 Qtd: 2 folhas 💰 R$ 2.40 / Prontinho! Seu pedido já está pronto pra retirada 😊"
4. **Contaminação:** nenhuma observada.

## 28. 558197509962 — Adna — IMPRESSÃO P&B A4
1. **Frase literal do cliente:** SEM TEXTO — só mídia (documento "CRLV-e_...pdf" — documento veicular — + 1 áudio sem transcrição) + "👍" (emoji, sem descrição própria).
2. **Produto/serviço real:** IMPRESSÃO P&B A4.
3. **Primeira resposta da equipe:** nenhuma resposta de equipe capturada na janela.
4. **Contaminação:** nenhuma observada.

## 29. 558197526398 — Zenilda Araújo — XEROX PRETO E BRANCO A4
1. **Frase literal do cliente:** "Oie" / "Boa tards" / "Pode imprimir para mim?" / "É para eu ir tirar o rg hj" / "O meu e o da minha filha" / "Me avisa quando estiver pronto a impressao" / "As impressões" / (depois) "Imprime por gentileza esses comprovantes" / "Quando tiver pronto me avisa" / "Ok" / "Jaja eu vou visse"
2. **Produto/serviço real:** XEROX PRETO E BRANCO A4 (documentos pessoais dela e da filha para tirar RG + comprovantes).
3. **Primeira resposta da equipe:** "pode vim buscar" / "valor 2,40"
4. **Contaminação:** nenhuma observada.

---

## Resumo de contagem

- **Cobertos: 29/29** (nenhum telefone pulado).
- **Com texto real do cliente:** 16 telefones — 558196625079 (só "Oi"), 558196673200,
  558196814867, 558196822626 (frase ambígua), 558196847478, 558196997877, 558197022883,
  558197037824, 558197103012, 558197119600, 558197253217 (nome de arquivo, não frase própria),
  558197319338, 558197406233, 558197495999 (só "Obg!"), 558197509962 (só emoji), 558197526398.
- **SEM TEXTO — só mídia (nenhuma frase própria em nenhum momento da janela):** 13 telefones —
  558196517857, 558196582380, 558196610778, 558196714488, 558196739216 (só "Bom dia"/"Imprimir",
  contado aqui como texto mínimo, ver nota abaixo), 558196808677, 558196836416, 558197080551,
  558197161038, 558197216872, 558197376802 (ambos pedidos), 558197390256, 558197422896.
- **SEM LOG DE CONVERSA:** 0 (todos os 29 tinham pelo menos 1 registro — mesmo quando só mídia).
- Nota: 558196739216 foi contado no grupo "com texto" pela presença de "Bom dia"/"Imprimir", mas
  são só 2 palavras soltas, não uma descrição real do pedido — fronteira entre as duas categorias.
