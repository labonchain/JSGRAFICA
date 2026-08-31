# 257 — Investigar contaminação Dizu Refeições em clientes reais da JS Gráfica

Status: concluída
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: 2026-07-30
Chat executor: 02 - DADOS JS GRAFICA

**Nota do PM (2026-07-30)**: esta demanda foi executada 2 vezes de forma independente, sem
coordenação — achado durante a revisão da 259 (06-ATENDIMENTO achou 2 arquivos quase duplicados
no disco). O relato real está preservado em
`257-investigar-contaminacao-dizu-refeicoes-clientes-reais.md` (conteúdo idêntico em substância:
11 casos, 160 destinatários, R$400 em `ped-1029`, mesma recomendação). Este arquivo é o canônico
(criado primeiro pelo PM); o outro fica marcado como duplicata, não apagado.

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
- [ ] Lista completa de telefones/pedidos com contaminação confirmada, partindo da evidência da
      256
- [ ] Confirmado se é evento histórico encerrado ou ainda em andamento
- [ ] Padrão de contaminação caracterizado (conversa inteira vs. mensagens misturadas)
- [ ] Impacto real em pedido/pagamento avaliado (achado real, não presumido)
- [ ] Recomendação de caminho apresentada com justificativa, aguardando decisão do Edvam

## Riscos e cuidados
Dado sensível de cliente real — não expor nada além do necessário pra decisão. Nenhuma correção
de dado ou config sem confirmação explícita separada desta demanda.

## Referências
Demanda 256 (`pm/conhecimento/evidencia-256/`, achado original). Demanda 159/160 (achado
original de contaminação geral, ~23% dos contatos).

## Relato de execução

Ver `257-investigar-contaminacao-dizu-refeicoes-clientes-reais.md` (relato completo, idêntico em
substância) — não duplicado aqui pra evitar mais divergência entre os 2 arquivos. Resumo: 11
casos confirmados nos 340 lidos (2 estruturais, 9 mensagens misturadas); achado que expandiu o
escopo: campanha de broadcast diária real, 160 destinatários, 1.572 mensagens desde 20/01,
confirmada ativa até hoje; R$400 de contaminação financeira real em `ped-1029`; recomendação de
separar a instância da Dizu. **Correção pós-relato (mesma sessão, direto do Edvam)**: o mecanismo
não é campanha automatizada — é Lista de Transmissão manual do WhatsApp, operada pelo Admin,
solução temporária até a Dizu ter chip próprio. Ver `project_dizu_whatsapp_temporario` na memória
pra o entendimento correto e atualizado do mecanismo (a memória `project_contaminacao_dizu_
refeicoes` antiga ficou desatualizada nesse ponto específico).

- Status final: concluída.
