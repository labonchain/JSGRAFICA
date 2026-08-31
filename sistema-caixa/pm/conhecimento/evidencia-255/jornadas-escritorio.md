# Jornadas completas — Escritório (35 pedidos, janela 2026-07-01/07-30)

Categoria inclui os produtos reais (confirmados em `jsgrafica_produtos`): CANETA CIS 0,7mm, CANETA
COMUM, CARTEIRA PARA RG, ENVELOPE A4, LÁPIS COM BORRACHA, PAPEL OFÍCIO FOLHA, PAPEL PAUTADO, PASTA
P/DOCUMENTOS TRANSPARENTE. Na prática, ENVELOPE A4 domina o volume (a maioria dos 35 pedidos).

4 jornadas, cobrindo produtos diferentes (CARTEIRA PARA RG, ENVELOPE A4 x2, CANETA COMUM) e cliente
novo/recorrente.

---

## 1. Vera 🙏🤍 — novo (1 pedido) — Dinheiro

**Telefone:** 558195286671
**Pedido:** ped-0429 — CARTEIRA PARA RG — qtd 1 — R$ 2,00 — Dinheiro — status: entregue
**Criado:** 08/07 16:00

```
[15:58 08/07] CLIENTE: [mídia: document, sem legenda]
[15:58 08/07] CLIENTE: [mídia: image, sem legenda]
[15:58 08/07] CLIENTE: [mídia: document, sem legenda]
```

*Jornada mínima: cliente manda 3 mídias (2 documentos + 1 imagem, provavelmente frente/verso do RG e uma foto) em sequência no mesmo minuto, sem nenhum texto — pedido resolvido rápido, provavelmente concluído presencialmente no balcão logo em seguida.*

---

## 2. Rob Gol — novo (1 pedido) — Pix — DDD fora de Pernambuco (54)

**Telefone:** 554192475364
**Pedido:** ped-0496 — ENVELOPE A4 — qtd 1 — R$ 1,00 — Pix — status: entregue
**Criado:** 09/07 11:49

```
[11:46 09/07] CLIENTE: Oi
[11:46 09/07] CLIENTE: laudos-medicos (23).pdf
[11:46 09/07] CLIENTE: laudos-medicos (24).pdf
[11:46 09/07] CLIENTE: laudos-medicos (25).pdf
```

*ACHADO curioso: telefone com DDD 54 (Rio Grande do Sul), fora da área normal de atendimento (Recife/PE) — cliente manda 3 laudos médicos em PDF (nomes de arquivo aparecem como texto ao invés de mídia, possível efeito de encaminhamento) e o pedido fechado no sistema é só "ENVELOPE A4", sugerindo que a real necessidade dele era um envelope para guardar/enviar os laudos impressos, não a impressão em si (ou a impressão foi outro pedido/serviço cobrado à parte).*

---

## 3. Paloma Mariano — recorrente (2 pedidos na janela) — Pix

**Telefone:** 558182942727
**Pedido:** ped-0727 — ENVELOPE A4 — qtd 1 — R$ 1,00 — Pix — status: entregue
**Criado:** 13/07 08:05

```
[07:33 13/07] CLIENTE: [mídia: audio, sem legenda]
[07:33 13/07] CLIENTE: • Paloma MarianoCurrículo
[07:59 13/07] EQUIPE: qual a senhora quer?
[08:01 13/07] CLIENTE: 2 colorido
[08:01 13/07] CLIENTE: E 1 envelope
[08:08 13/07] CLIENTE: Já já to passando aí
[08:08 13/07] CLIENTE: Me passa o pix
[08:12 13/07] CLIENTE: [mídia: image, sem legenda]
```

*Cliente manda um áudio explicando o pedido (não transcrito no log) seguido de um texto identificando o arquivo ("Paloma MarianoCurrículo") — a equipe demora 26 minutos pra responder ("qual a senhora quer?"), sinal de que o áudio pode não ter sido ouvido/processado na hora. Pedido final combina 2 impressões coloridas do currículo + 1 envelope, mas só o envelope aparece isolado nos ids escolhidos aqui (o pedido de impressão colorida provavelmente foi criado como item separado, típico do padrão "vários itens = vários pedidos no sistema" já visto em outras categorias).*

---

## 4. Beatrys Lino — novo (1 pedido) — Pix

**Telefone:** 558197506391
**Pedido:** ped-1293 — CANETA COMUM — qtd 1 — R$ 2,00 — Pix — status: entregue
**Criado:** 21/07 08:27

```
[07:33 21/07] CLIENTE: Olá
[07:33 21/07] CLIENTE: Bom dia
[07:33 21/07] CLIENTE: Estão funcionando?
[07:38 21/07] CLIENTE: [roteiro longo de série "Café com a Tata" — script de conteúdo institucional, ~700 palavras]
[07:38 21/07] CLIENTE: Poderia imprimir esse roteiro
[07:38 21/07] CLIENTE: Por favor
[07:46 21/07] EQUIPE: serão 3 páginas valor 1,20 cada uma, total 3,60
[07:46 21/07] EQUIPE: qual vai ser a forma de pagamento?
[07:49 21/07] CLIENTE: Preciso de outro
[07:51 21/07] CLIENTE: Não não
[07:51 21/07] CLIENTE: Vou enviar outro roteiro
[07:52 21/07] CLIENTE: [segundo roteiro longo — "Cronograma de Captação – Treinamento Physicus Laboral", ~900 palavras]
[07:58 21/07] EQUIPE: o segundo texto serão 4 folhas, valor 4,80
[07:59 21/07] EQUIPE: total 8,60 qual será a forma de pagamento?
[08:02 21/07] CLIENTE: Pix
[08:02 21/07] CLIENTE: Poderia grampear separado
[08:03 21/07] CLIENTE: Por favor
[08:03 21/07] CLIENTE: Essas folhas
[08:03 21/07] CLIENTE: E as folhas do outro
[08:17 21/07] CLIENTE: Pix
[08:17 21/07] CLIENTE: Eu uso a chave?
[08:19 21/07] CLIENTE: Nosso Pix Chave Mercado Pago
fone: 81 986108547
Titular -  Edvam de Oliveira e Silva
[08:19 21/07] CLIENTE: Essa?
[08:23 21/07] CLIENTE: Posso enviar?
[08:23 21/07] CLIENTE: Tô indo aí buscar
```

*Cliente cola diretamente dois roteiros de conteúdo corporativo (roteiro de vídeo institucional para redes sociais + cronograma de produção de conteúdo) como texto puro no WhatsApp para imprimir — não são documentos anexados, são textos longos colados na conversa mesmo. A equipe calcula o preço por página (R$1,20/folha) contando quantas páginas o texto vai ocupar impresso. Pedido registrado no sistema (CANETA COMUM, R$2,00) não bate com o que foi negociado no chat (impressão de 7 folhas, R$8,60) — sinal de que o pedido dela pode ter incluído mais itens (caneta comprada avulsa no balcão) além da impressão combinada por WhatsApp, e os produtos ficaram registrados em pedidos separados no sistema.*
