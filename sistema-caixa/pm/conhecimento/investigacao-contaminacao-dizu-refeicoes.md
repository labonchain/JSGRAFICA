# Investigação — contaminação cruzada "Dizu Refeições" no WhatsApp da JS Gráfica (demanda 257)

Investigação 100% só-leitura (`jsgrafica_log_msgs_privadas`, `jsgrafica_pedidos`). Nenhuma
correção de dado, filtro ou mudança de config foi implementada. Parte da evidência já levantada
pela demanda 256 (`pm/conhecimento/evidencia-256/`), mas **o achado central desta demanda vai além
do que a 256 tinha visibilidade** — ver seção 2.

## 1. Confirmação da evidência da 256 (11 casos, amostra de 340 clientes reais)

Recontei diretamente nos 12 arquivos de lote (`pm/conhecimento/evidencia-256/lote_00..11_resultado.md`)
— bate exatamente com o que já estava consolidado na seção 6 de
`pm/conhecimento/base-conhecimento-atendimento-completa.md`. 11 casos confirmados (não 10-13
"por estimativa" — contagem exata):

| Telefone/lid | Cliente | Pedido real | Padrão |
|---|---|---|---|
| `255949986103392@lid` | Marcia Carvalho | `ped-1866`, IMPRESSÃO 2ª VIA CONTA, R$2,20, 30/07 | **Conversa 100% contaminada** — nenhuma mensagem real sobre o pedido de impressão sobrevive no log; só cardápio de quentinha |
| `558183106106` | Nathalia Soares | `ped-0409`, IMPRESSÃO P&B A4, R$1,20, 08/07 | Mensagens misturadas — 1ª msg "da equipe" é na real o cardápio automático, atendimento real segue depois |
| `558184651027` | Midian Gonçalves | `ped-0978`, XEROX P&B A4, R$2,70, 15/07 | Conversa capturada é 100% sobre pedido de almoço, pedido real (xerox) não aparece na conversa |
| `558184836197` | Teresinha Costa | `ped-0488`, IMPRESSÃO P&B A4, R$1,20, 09/07 | Mensagens misturadas |
| `558185555477` | Antonio Amaral | `ped-1641`/`ped-1642`, R$2,40+R$1,20, 27/07 | Mensagens misturadas, extensa |
| `558189926601` | **"Dizu Refeições"** (nome do próprio cliente no pedido) | `ped-1029`, **"Recebimento de empréstimo"**, **R$400,00**, Dinheiro, `pagamento_confirmado=true`, `status=entregue`, 15/07 | **Contaminação estrutural — não é atendimento, é um lançamento financeiro de outro negócio dentro de `jsgrafica_pedidos`** |
| `558191612382` | Elders De Ibura 2 | `ped-1871`, IMPRESSÃO PAPEL ADESIVO A4 192G, R$6,50, **30/07 (hoje)** | Conversa capturada é 100% sobre pedido de almoço, pedido real (adesivo) não aparece na conversa |
| `558191921749` | Larissa Barbosa | `ped-1360`, IMPRESSÃO PAPEL FOTO A4 230G, R$13,00, 21/07 | Contaminação em outra data (23/07), não misturada no resultado do pedido |
| `558192778804` | "JM Novo" | 5 pedidos reais, `ped-1688..1873`, até **30/07 (hoje)** | Contaminação forte e recorrente (múltiplos pedidos de marmita com nomes de terceiros), mas separada dos pedidos reais de gráfica |
| `558193284834` | Rafaela Vitória | `ped-1191`, AGENDAMENTO/CURRÍCULO/..., R$5,00, 20/07 | Contaminação fora da janela do pedido (16/07) |
| `558195552362` | Michael Kirally | `ped-1230`/`ped-1283`, R$2,20+R$2,20, 20/07 | Contaminação fora da janela do pedido |

**Padrão de contaminação, conforme pedido no escopo**: dos 11, **2 casos são "conversa
inteira"/estrutural** (a `255949986103392@lid` e a `558189926601`/"Dizu Refeições") — o resto (9
casos) é **"1 cliente real da JS Gráfica com mensagens de Dizu misturadas no log"**, sem que isso
tenha corrompido o pedido/pagamento em si (o pedido real de gráfica continua correto,
independente do ruído no log de conversa).

## 2. Achado que vai além do escopo original — a contaminação não é um punhado de casos, é uma campanha diária ativa

Ao investigar se o evento é histórico ou recorrente (item explícito do escopo), busquei no banco
inteiro — não só nos 340 da amostra — por mensagens contendo `quentinha`/`marmita`/`cardápio`
(termos específicos do negócio de Dizu, sem usar palavras genéricas tipo "almoço" que também
aparecem em respostas legítimas da própria equipe da gráfica, ex. "não fechamos para almoço").

**Resultado: 160 identificadores distintos (`conversation_id`/`phone`), 1.572 mensagens, de
2026-01-20 até HOJE (2026-07-30, última às 13:48).** O padrão não é ruído esporádico — é uma
**campanha de broadcast diária, idêntica, automatizada**: a partir de 2026-07-06 (quando ~60
desses identificadores começam a receber mensagem quase simultaneamente, entre 09:55 e 10:06),
todo santo dia sai um bloco `from_me=true` no formato:

```
Bom dia, cardápio dia DD/MM/26
*CARNES* ...
*ACOMPANHAMENTOS* ...
*VALORES*
* Quentinha média 14,0 (1 opção carne)
* Quentinha grande 18,00 (1 opção de carne)
* Quentinha grande 22,00 (2 opções de carnes)
*Faça seu pedido aqui*
*TEMOS ENTREGA*
```

Confirmei ao vivo que esse bloco **saiu de novo hoje, 2026-07-30, entre 08:22 e 08:38**, pra pelo
menos 5 destinatários diferentes checados manualmente (`257492332335211@lid`,
`174758394114259@lid`, `266155029737554@lid`, entre outros) — **a campanha não parou, está rodando
neste exato momento**, 3 semanas depois da mensagem interna de 09/07 que avisava "vamos continuar
atendendo os Almoços pela JS Gráfica mesmo".

**Cruzamento com clientes reais**: dos 160 destinatários da campanha, **7-11 também têm pedido
real confirmado na JS Gráfica** (o cruzamento exato varia conforme o método de match — telefone
puro bate 7, contando os `@lid` já resolvidos manualmente na 256 sobe pra 11). Ou seja, **a grande
maioria dos ~150 destinatários da campanha diária NÃO são clientes da gráfica — são só a lista de
clientes da Dizu Refeições, que por algum motivo operacional está sendo atendida a partir do MESMO
número/instância de WhatsApp da JS Gráfica.**

## 3. Confirmação: histórico encerrado ou em andamento?

**Em andamento, não histórico.** A mensagem interna de 09/07 ("WhatsApp bloqueou o número da
Dizu...") não descreve um workaround temporário que terminou quando a Dizu recuperou seu próprio
WhatsApp — descreve uma migração que **virou permanente e está ativa até agora**, 3 semanas
depois, sem sinal de desaceleração (volume diário estável, ~20 mensagens por destinatário ao longo
do período, todo santo dia desde 06/07).

## 4. Impacto real em pedido/pagamento — achado, não presumido

**Sim, existe impacto financeiro real confirmado**: `ped-1029` (558189926601, "Dizu Refeições",
"Recebimento de empréstimo ", R$400,00, Dinheiro, `pagamento_confirmado=true`,
`status='entregue'`, 15-07-26) é um lançamento financeiro de **outro negócio** (repasse/empréstimo
entre Dizu e a gráfica) que está registrado em `jsgrafica_pedidos` como se fosse uma venda de
serviço da JS Gráfica — **esse valor conta hoje no `totalEntradas` do fechamento de 15/07**
(mesma regra de `getResumoDia`: soma `valor_final` onde `pagamento_confirmado=true` e
`status<>'cancelado'`), inflando o faturamento reportado daquele dia em R$400,00 que não é receita
de serviço gráfico.

Achados menores, reportados com menos confiança (não investigados a fundo, fora do orçamento desta
demanda pra aprofundar sozinha):
- `ped-1637` (558188468227, cliente registrado como **"Mw Marmitas"**) — pedido real de FOTO 10X15,
  R$17,50, 27/07. Nome de contato sugere negócio de marmita, mas o pedido em si é um produto normal
  de gráfica — pode ser só um cliente cujo contato tem nome de outro negócio próprio, não
  necessariamente contaminação de receita. Recomendo checar se esse valor é real antes de assumir
  qualquer coisa.
- Nos **9 casos "mensagens misturadas"** da seção 1, os pedidos de gráfica em si (valor, forma de
  pagamento, produto) **batem certos** — a contaminação está só no log de conversa, não no
  registro financeiro. Não há evidência de categoria/valor errado nesses 9.

## 5. Recomendação

Com a escala e a natureza confirmadas (campanha diária ativa, não caso raro; 160 destinatários,
maioria sem nenhuma relação com a gráfica; 1 caso confirmado de contaminação financeira real de
R$400), a recomendação é:

**Prioridade 1 — separar a instância/número da Dizu Refeições do WhatsApp da JS Gráfica.**
Motivo: o próprio achado da 256 documenta que o número ORIGINAL da Dizu já foi bloqueado pelo
WhatsApp — muito provavelmente por causa de exatamente este padrão (broadcast diário de
marketing/cardápio pra uma lista de ~160 números, o tipo de comportamento que o WhatsApp
tipicamente marca como spam/uso indevido de conta business). **Continuar rodando o mesmo padrão no
número da JS Gráfica arrisca o MESMO banimento acontecer de novo — só que dessa vez derrubando o
WhatsApp inteiro da gráfica** (Inbox, PDV, atendimento real, tudo junto), não só o negócio de
marmita. Esse risco existencial pro canal principal da gráfica supera, na minha avaliação, o custo
de reverter a migração. Não é uma recomendação de "aceitar como risco conhecido" — o risco já se
concretizou uma vez (a Dizu já foi banida) e continua rodando sem mitigação.

**Prioridade 2 (complementar, não substitui a 1) — filtro automático de detecção/exclusão** pros
~150 casos que já aconteceram e pros que continuarem acontecendo até a separação de fato
acontecer — protege qualquer análise/automação futura (ex. um agente de atendimento) de tratar
tráfego de Dizu como se fosse de cliente de gráfica. Útil mesmo depois de separar o número, pra
limpar o histórico.

**Não recomendo** "aceitar como risco conhecido e documentado" como opção viável isolada — o
achado desta demanda mostra que o risco não é teórico (já se concretizou pra Dizu) e a escala é
maior do que qualquer decisão consciente provavelmente presumia (160 contatos/dia, não um punhado
de casos).

Decisão final de qual caminho seguir (e quando) é do Edvam — esta demanda não implementa nenhuma
correção, conforme checkpoint obrigatório do escopo.
