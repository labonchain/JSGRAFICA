# 161 — Aprofundar a pesquisa: comportamento de clientes e do atendimento no WhatsApp

Status: aprovada — liberada
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto — objetivo macro
Continuação de 159/160 (objetivo 2, `pm/OBJETIVOS-MACRO.md`). As duas primeiras rodadas mapearam
**o que chega** (tipo de interação, volume, conversão, formulação de pedido) e **corrigiram 2
premissas** (conversão cruzada Inbox→balcão é real mas pequena; padrão de retirada com espera
precisa remedição pós-156). O Edvam pediu pra aprofundar mais — entender com mais detalhe o
**comportamento**, não só o volume: como o atendimento responde, onde a conversa trava, quem
atende o quê de fato, e o que as pessoas pedem.

## Objetivo
Mais uma camada de relatório, ainda 100% investigação (sem propor solução, sem tocar em
código), cobrindo os 5 pontos abaixo — construindo em cima do que 159/160 já estabeleceram, sem
repetir análise já feita.

## Escopo
- Incluído, só-leitura, mesma base de dados (`jsgrafica_log_msgs_privadas`,
  `jsgrafica_contatos`, `jsgrafica_pedidos`):
  1. **Tempo de resposta do atendimento**: pra mensagens recebidas (`from_me=false`), medir o
     tempo até a primeira resposta humana (`from_me=true`) seguinte. Distribuição (mediana,
     não só média — outlier de resposta em minutos vs em horas distorce média), e se existe
     padrão claro por horário (ex. resposta mais lenta no pico das 13h já identificado na 159) ou
     por dia da semana. Isso quantifica a "sobrecarga" que motivou o pedido do Edvam, em vez de
     ficar só na percepção.
  2. **Quem atende o quê, de verdade**: usar `jsgrafica_contatos.atendente` (e/ou outro sinal
     disponível nos logs) pra medir a distribuição real de atendimento entre Gabi/Edvam/Zu —
     confirmar ou corrigir a premissa "Gabi principal, Edvam também atende bastante, Zu
     auxiliar" com número real, não impressão.
  3. **Onde a conversa trava** (pra sessões que NÃO viram pedido, usando a mesma base de
     "início de sessão" da 159/160): caracterizar o ponto de abandono — cliente pergunta preço e
     some, cliente manda mídia e não recebe resposta a tempo, cliente confirma mas ninguém
     cadastra o pedido, etc. Amostra qualitativa com casos concretos (como a 160 fez com Wilson
     Reis), não só uma categoria genérica de "abandonou".
  4. **O que as pessoas pedem, de fato**: distribuição de produtos/serviços nos pedidos reais do
     período — quais 5-10 serviços concentram a maior parte do volume. Ajuda a escopar o que
     uma automação futura precisaria cobrir primeiro pra ter o maior impacto com o menor risco.
  5. **Sobreposição do pico do Inbox com o movimento de balcão**: cruzar o horário de pico de
     mensagens (13h, achado da 159) com o horário de pico de vendas de balcão
     (`jsgrafica_pedidos`, telefone='balcao' ou vendas presenciais) — testar se existe uma janela
     onde o mesmo atendente provavelmente está sendo puxado pros dois lados ao mesmo tempo.
- Fora de escopo: propor solução, desenhar automação, mexer em código.

## Critérios de aceite
- [ ] Os 5 pontos cobertos com dado real e, onde fizer sentido, exemplos concretos (não só
      número agregado)
- [ ] Tempo de resposta reportado em mediana, com nota sobre outliers
- [ ] Nenhuma alteração em nenhuma tabela — investigação 100% só-leitura

## Referências
Demandas 159/160 (`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`, base desta
continuação — não repetir o que já foi medido lá).

## Relato de execução

**Status: concluída.** Seção 8 adicionada em
`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`. 100% só-leitura — nenhuma tabela alterada.

### Achado fora do escopo original, corrigido antes de prosseguir
Ao construir o item 1 (tempo de resposta por hora), descobri que a sessão do Postgres roda em
UTC e as análises de horário da 159/160 (`extract(hour from to_timestamp(...))` sem conversão de
fuso) estavam reportando **hora UTC, não hora local de Recife** (UTC-3). Corrigi isso agora
(`AT TIME ZONE 'America/Recife'`) pra todas as análises novas desta demanda, e também voltei no
relatório da 159 pra corrigir os itens 2 (horário da confusão Dizu: pico real é 11h local, não
12h) e 4 (pico de mensagens: 13h local é o valor real e correto, coincidentemente o mesmo número
do rótulo antigo, mas correspondendo a uma hora UTC diferente — o número antigo, 453, era hora
UTC 13h = 10h local). As conclusões qualitativas dos dois itens sobrevivem; só os rótulos de hora
e os números exatos mudaram. Marcado como correção explícita no topo do relatório.

### Resumo por item

1. **Tempo de resposta**: mediana 0,7 min (rápido), média 139 min (não usar, distorcida por
   outliers até 80h). Segunda-feira tem cauda bem pior que os outros dias (p90 258min vs <60min).
   Mediana não piora no pico de mensagens (13h), mas o p90 (cauda) tem 2 picos claros: 12h local
   (almoço da equipe) e 17h local (perto do fechamento) — risco real de demora concentrado nessas
   janelas, não no dia todo.
2. **Quem atende**: campo `atendente` só preenchido em 21% dos contatos (medição parcial). Nos
   preenchidos: Gabi 50%, Edvam 45%, Zu 5% — cruzando com `pedido_criado_por` (Gabi 60%, Edvam
   32%, Zu 8%), a premissa original subestimava o Edvam: ele não é "secundário", divide quase
   igualmente com a Gabi. Zu é claramente auxiliar nas duas fontes.
3. **Onde trava**: 158/282 sessões (56%) nunca viram pedido, consistente com a conversão da 159.
   Amostra de 15 casos concretos mostrou padrão variado: mídia sem resposta em 6h (34% do total,
   mas mistura casos que precisavam de resposta com casos corretamente ignorados), confusão Dizu
   recorrente, um caso de outro WhatsApp Business respondendo com bot próprio (ruído novo), e um
   achado importante — negociação completa fechada no chat (Ana Paula, preço+pagamento+recibo)
   que nunca virou registro em `jsgrafica_pedidos`, sugerindo que a taxa de conversão da 159 pode
   estar subestimando vendas reais fechadas via WhatsApp mas não lançadas no sistema.
4. **O que pedem**: extremamente concentrado — IMPRESSÃO P&B A4 sozinha é 66% de todos os pedidos
   reais de WhatsApp, top 2 (+ colorida ofício) chega a 74,1%.
5. **Sobreposição de picos**: pico do Inbox (13h local) coincide com a retomada do balcão depois
   da pausa de almoço (queda às 12h, recuperação 13h-16h) — 13h-14h é a janela de maior risco de
   sobrecarga simultânea pra Gabi/Edvam.

### Achados fora do escopo
O erro de timezone (acima) já foi corrigido dentro desta mesma execução, não ficou pendente.

### Critérios de aceite
- [x] Os 5 pontos cobertos com dado real e exemplos concretos (Wilson Reis-style: Etiene
      Oliveira, Ana Paula, Farmácia do Trabalhador Pernambuco, entre outros)
- [x] Tempo de resposta reportado em mediana (0,7 min), com nota clara sobre outliers (média 139
      min não confiável, cauda p90 nos horários de almoço/fechamento)
- [x] Nenhuma alteração em nenhuma tabela — investigação 100% só-leitura
