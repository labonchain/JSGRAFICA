# 257 — Investigar contaminação Dizu Refeições em clientes reais da JS Gráfica

**⚠️ ARQUIVO DUPLICADO — a demanda 257 canônica é
`257-investigar-contaminacao-dizu-clientes-reais.md`. Esta cópia foi gerada por uma execução
paralela sem coordenação (achado durante a revisão da 259). Mantido aqui só como registro do
relato original completo — não editar/atualizar este arquivo daqui pra frente, usar o canônico.**

Status: concluída (duplicata do relato acima — ver nota)
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: 2026-07-30
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Achado da demanda 256 (leitura qualitativa de 340 clientes reais): prova textual direta (mensagem
interna real) de que a equipe migrou atendimento de almoços da Dizu Refeições pro número da JS
Gráfica depois que o WhatsApp da Dizu foi bloqueado. Confirmado em **10-13 dos 340 clientes reais
lidos** — ou seja, não é só ruído de contato solto misturado no log (já documentado antes, ~23%
de contaminação geral), é contaminação **dentro da conversa de clientes reais da própria
gráfica**. Achado relatado pelo 06-ATENDIMENTO, não investigado a fundo (fora do escopo daquela
demanda).

## Objetivo
Quantificar o alcance real dessa contaminação e recomendar um caminho (separar instância, filtro
automático, ou aceitar como risco conhecido) com evidência suficiente pra decisão do Edvam.

## ⚠️ Checkpoint obrigatório antes de qualquer correção
Esta demanda é só investigação — nenhuma correção de dado, filtro ou mudança de instância deve
ser implementada sem confirmação explícita separada. Apresentar o levantamento completo primeiro.

## Escopo
- Incluído: partir da evidência já levantada pela 256 (`pm/conhecimento/evidencia-256/`, os 12
  arquivos de lote) — identificar exatamente quais telefones/pedidos têm contaminação confirmada,
  não re-ler os 340 do zero.
- Incluído: confirmar se isso é um evento **histórico** (a migração aconteceu numa janela
  específica, já encerrada quando a Dizu recuperou o próprio WhatsApp) ou **ainda em
  andamento/recorrente** hoje — isso muda completamente a urgência e o tipo de correção que faz
  sentido.
- Incluído: pra cada caso confirmado, entender o padrão — é conversa inteira contaminada (cliente
  real da Dizu, nunca foi da gráfica) ou é 1 cliente real da JS Gráfica cuja conversa tem
  mensagens de Dizu misturadas no meio (mais grave — pode confundir automação futura)?
- Incluído: avaliar impacto real hoje — algum pedido/pagamento real da JS Gráfica foi afetado
  (categoria errada, valor errado, confusão de produto)? Ou é só ruído de log sem consequência
  prática até agora?
- Incluído: recomendar 1 dos 3 caminhos (separar instância Z-API, filtro automático de
  detecção/exclusão, aceitar como risco conhecido e documentado) com justificativa clara.
- Explicitamente fora de escopo: implementar a correção escolhida — fica pra demanda separada,
  depois da decisão do Edvam.

## Critérios de aceite
- [x] Lista completa de telefones/pedidos com contaminação confirmada, partindo da evidência da
      256
- [x] Confirmado se é evento histórico encerrado ou ainda em andamento
- [x] Padrão de contaminação caracterizado (conversa inteira vs. mensagens misturadas)
- [x] Impacto real em pedido/pagamento avaliado (achado real, não presumido)
- [x] Recomendação de caminho apresentada com justificativa, aguardando decisão do Edvam

## Riscos e cuidados
Dado sensível de cliente real — não expor nada além do necessário pra decisão. Nenhuma correção
de dado ou config sem confirmação explícita separada desta demanda.

## Referências
Demanda 256 (`pm/conhecimento/evidencia-256/`, achado original). Demanda 159/160 (achado
original de contaminação geral, ~23% dos contatos).

## Relato de execução

**Status: concluída.** Relatório completo em
`pm/conhecimento/investigacao-contaminacao-dizu-refeicoes.md`. 100% só-leitura — nenhuma
correção de dado, filtro ou config aplicada.

### O que foi feito

1. Recontei diretamente nos 12 arquivos de lote da 256 (`pm/conhecimento/evidencia-256/lote_00..
   11_resultado.md`, não confiei só no resumo já consolidado) — **11 casos confirmados** (número
   exato, não "10-13 por estimativa"), batendo com o que já estava na seção 6 do
   `base-conhecimento-atendimento-completa.md`. Para cada um, busquei o pedido real em
   `jsgrafica_pedidos` (valor, forma de pagamento, status) pra avaliar impacto financeiro.
2. Caracterizei o padrão pedido no escopo: **2 dos 11 são "conversa inteira"/estrutural**
   (`255949986103392@lid` — zero mensagem real sobrevive; `558189926601` — o próprio pedido no
   sistema tem `nome_cliente="Dizu Refeições"`); os outros **9 são "cliente real da JS Gráfica com
   mensagens de Dizu misturadas no log"**, sem que isso tenha corrompido o pedido/pagamento real.
3. **Achado que expandiu o escopo original, direto da pergunta "é histórico ou em andamento?"**:
   ao buscar no banco INTEIRO (não só nos 340 da amostra) por mensagens com termos específicos do
   negócio da Dizu (`quentinha`, `marmita`, `cardápio` — evitei termos genéricos tipo "almoço" que
   também aparecem em respostas legítimas da própria equipe, ex. "não fechamos para almoço"),
   achei que a contaminação não é um punhado de casos: é uma **campanha de broadcast diária
   automatizada**, mesmo texto-modelo ("Bom dia, cardápio dia DD/MM/26..."), disparada
   `from_me=true` (do número da JS Gráfica) pra **160 destinatários distintos**, todo santo dia
   desde 2026-07-06, **1.572 mensagens no total, a última hoje (2026-07-30) às 13:48**. Confirmei
   ao vivo que o disparo de hoje aconteceu normalmente (08:22-08:38), pra pelo menos 5
   destinatários checados manualmente com o texto completo da mensagem.
4. Cruzei os 160 destinatários da campanha contra `jsgrafica_pedidos`: **7-11 também são clientes
   reais da gráfica** (o número varia conforme o método de match usado) — a maioria esmagadora
   dos ~150 restantes não tem nenhuma relação com a JS Gráfica, é só lista de clientes da Dizu
   sendo atendida pelo número errado.
5. Avaliei impacto financeiro real: **confirmado, não presumido** — `ped-1029` (R$400,00,
   "Recebimento de empréstimo", `pagamento_confirmado=true`, `status=entregue`, 15/07) é um
   lançamento financeiro de outro negócio contando como receita da JS Gráfica no fechamento
   daquele dia. Reportei também 2 achados de confiança menor (não aprofundados): `ped-1637`
   (cliente registrado como "Mw Marmitas", pedido de FOTO 10X15 — pode ser só nome de contato, não
   necessariamente contaminação de receita) e a confirmação de que, nos outros 9 casos de
   "mensagens misturadas", o pedido de gráfica em si bate certo (produto/valor/forma de
   pagamento) — a contaminação ali é só no log de conversa, não no financeiro.

### Testes realizados e resultado
- Contagem de mensagens com termos específicos de Dizu (`quentinha`/`marmita`/`cardápio`) em toda
  a tabela `jsgrafica_log_msgs_privadas`, sem filtro de amostra: 160 identificadores, 1.572
  mensagens, 2026-01-20 a 2026-07-30 (hoje).
- Leitura direta do texto de 5 mensagens de hoje (30/07) pra confirmar que o padrão é literalmente
  idêntico ao broadcast já documentado (não coincidência de palavra solta).
- Cruzamento exato (`join` por telefone) entre a lista de 160 contaminados e `jsgrafica_pedidos`
  pra separar clientes reais de destinatários puramente de Dizu.
- Confirmação de `pagamento_confirmado`/`status` do `ped-1029` pra embasar a afirmação de impacto
  financeiro real (não presumida).
- 100% leitura — nenhum UPDATE/DELETE/INSERT em nenhuma etapa.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- A escala real da campanha (160 destinatários/dia) é muito maior do que o que a demanda 256
  conseguiu ver (limitada aos 340 clientes reais da amostra) — reportado com destaque na seção 2
  do relatório, é o achado mais importante desta demanda.
- `ped-1637` ("Mw Marmitas", FOTO 10X15, R$17,50) — sinalizado como caso de confiança menor, não
  investigado a fundo.

### Status final
Concluída. Todos os 5 critérios de aceite batidos, com 1 achado adicional relevante (escala real
da campanha, muito maior que o esperado) reportado com destaque. Recomendação apresentada:
priorizar separar a instância/número da Dizu Refeições (risco de banimento do número da JS
Gráfica, já concretizado uma vez pro número original da Dizu), com filtro automático como medida
complementar pro histórico. Não recomendado "aceitar como risco conhecido" isoladamente — o risco
já se concretizou uma vez e a campanha está ativa até hoje. Nenhuma correção implementada,
aguardando decisão do Edvam.
