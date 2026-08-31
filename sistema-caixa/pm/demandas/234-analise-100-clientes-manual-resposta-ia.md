# 234 — Análise de 100 clientes reais: manual de resposta da IA + perfis candidatos

Status: concluída
Criada em: 2026-07-28
Aprovada em: 2026-07-28
Concluída em: 2026-07-29
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Ideia do Edvam (2026-07-28): a pesquisa já feita (demandas 159-163) mapeou padrão agregado
(43,3% mídia sem legenda, rajada, tempo de resposta etc.), mas nunca reconstruiu conversa por
conversa o suficiente pra virar regra prática de "o que a IA deve responder". Sem isso, desenhar
o comportamento da Fase B com segurança fica limitado. Objetivo do Edvam, quase verbatim: mapear
texto corrido vs. botão, quando cobra pagamento antecipado vs. presencial na retirada, e demais
decisões reais da equipe, a partir de uma amostra diversa de clientes reais — e usar o mesmo
material pra refinar quem são os melhores candidatos a entrar na automação primeiro (refina a
lista da demanda 209).

Este é o primeiro trabalho do chat 06 - AUTOMAÇÃO ATENDIMENTO INBOX, criado especificamente pra
esta disciplina (ver `equipe/06-atendimento.md`).

## Objetivo
Produzir (1) um "manual de resposta" com regras concretas, cada uma amarrada a evidência real de
conversa, pra orientar o comportamento da IA na Fase B, e (2) uma lista refinada de clientes
candidatos à automação gradual, com justificativa por perfil.

## Escopo

### Etapa 1 — Amostra e reconstrução
- Selecionar 100 clientes reais que fizeram 1+ pedido nas últimas semanas, com diversidade
  deliberada de perfil: tipo de serviço pedido, cliente novo vs. recorrente, forma de pagamento,
  complexidade do pedido (simples/1 item vs. múltiplos itens ou negociação), e estilo de
  conversa (direto vs. rajada fragmentada vs. mídia sem legenda).
- Para cada cliente da amostra, reconstruir a sequência real: o que o cliente mandou (texto,
  mídia, ordem, timestamps), o que a equipe respondeu, em que momento o pagamento foi tratado
  (antes, durante, ou só na retirada), qual forma de pagamento, e o desfecho (virou pedido,
  cancelou, ainda em aberto).
- Fonte: `jsgrafica_log_msgs_privadas` cruzado com `jsgrafica_pedidos` e `jsgrafica_contatos`.

### Etapa 2 — Manual de resposta + perfis candidatos
- A partir da Etapa 1, extrair regras práticas recorrentes (não uma por cliente, um padrão
  quando aparecer em múltiplos casos reais): quando a resposta real foi texto corrido vs. opção
  de botão/menu; quando a equipe cobrou pagamento antes de produzir vs. deixou pra retirada;
  quais tipos de pedido a equipe sempre confirma antes de agir vs. os que resolve direto (deve
  bater com o padrão já confirmado nas demandas 159-163: só documento óbvio de 1 página resolve
  sem hesitar); pontos de hesitação real da equipe (onde demorou mais, onde perguntou mais de
  uma vez).
- Cada regra do manual cita a conversa real que a embasa (nenhuma regra sem exemplo real).
- A partir do mesmo material, apontar quais dos 100 clientes (ou perfis que eles representam)
  são mais seguros pra entrar primeiro na automação gradual, com justificativa — cruzar com a
  lista já existente da demanda 209 (`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`
  seção 12): confirmar quem já estava na lista, adicionar quem faz sentido e não estava, e
  marcar quem da lista antiga não parece mais um bom candidato à luz do material novo.

## Critérios de aceite
- [x] 100 clientes selecionados, com diversidade documentada (não uma amostra de conveniência)
- [x] Reconstrução completa de cada um dos 100 (conversa + desfecho), citando fonte real —
      estruturada (SQL) pros 100/196 pedidos, qualitativa (texto real) pra subamostra de 40,
      limite documentado explicitamente na seção 6 do relatório
- [x] Manual de resposta com cada regra amarrada a pelo menos 1 exemplo real citável
- [x] Lista de perfis candidatos refinada, com justificativa, cruzada explicitamente com a 209
- [x] Separação clara, em todo o relatório: padrão confirmado com múltiplos casos reais vs.
      caso isolado vs. hipótese ainda não confirmada

## Riscos e cuidados
- Nenhuma regra proposta pode vir de exemplo inventado — se não houver caso real suficiente pra
  confirmar um padrão, registrar como hipótese em aberto, não como regra.
- Esta é uma análise, não uma mudança de produção — não altera whitelist, não conecta a Fase B
  no roteamento real, não modifica nenhum workflow n8n. Achados sobre risco (algo que pode
  incomodar cliente, algo fora da janela de 24h do WhatsApp) devem ser destacados mesmo fora do
  escopo direto.
- Dado de conversa real de cliente é sensível — o relatório final fica em
  `pm/conhecimento/`, não em lugar público; citar telefone/nome só quando necessário pra
  rastreabilidade do achado.

## Referências
Demandas 159, 160, 161, 162, 163 (pesquisa base), 202, 203 (Fase A), 206, 208 (Fase B testada
isolada), 209 (lista de candidatos original). `pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`.
Tabelas: `jsgrafica_log_msgs_privadas`, `jsgrafica_pedidos`, `jsgrafica_contatos`.

## Relato de execução

Executada em 2026-07-29 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Relatório completo em
`pm/conhecimento/manual-resposta-ia-100-clientes.md`.

### O que foi feito
Amostra de 100 clientes reais montada por amostragem estratificada (não conveniência) a partir de
um pool de 628 telefones distintos com pedido em `jsgrafica_pedidos` na janela 2026-07-01 a
2026-07-28, cobrindo diversidade documentada de categoria de serviço (RAPIDO/LENTO/ESPECIAL/
MISTO/OUTRO), novo vs. recorrente, forma/momento de pagamento e cancelamento — incluindo os 8
candidatos da demanda 209 como âncoras. Antes de reconstruir, achei e substitui 5 candidatos
contaminados (3 lançamentos financeiros internos gravados como pedido, 1 telefone `@lid` que era
o próprio broadcast da Dizu Refeições, 1 `@lid` sem dado). Reconstrução em 2 camadas: estruturada
via SQL pros 100/196 pedidos (sessão, timing de pagamento, tipo da 1ª mensagem — tabela completa
no relatório) e qualitativa com texto real, mensagem a mensagem, pra uma subamostra de 40
estratificada pelas mesmas dimensões (evidência citável do manual de resposta).

### Achados (manual de resposta, perfis candidatos)
11 regras/achados no manual de resposta (seção 4 do relatório), cada um citando conversa real —
destaque pros achados de risco: (a) a própria equipe já instrui explicitamente um cliente a não
antecipar Pix antes da confirmação de valor (`558197252103`, citação literal), validando o desenho
já decidido da Fase B; (b) uma fração real de pedidos entregues/pagos não tem nenhuma resposta da
equipe capturada no log (limite de captura, não prova de mau atendimento); (c) contaminação de
log mais variada que a documentada antes (bot de financiamento solar vinculado a um pedido real, e
o próprio emissor do cardápio da Dizu vazando no log de uma cliente da gráfica). Lista de
candidatos (seção 5): 3 confirmados sem mudança (Maria da Conceição Silva, Otto Silva, Jociane
Araújo), 1 mantido com ressalva (Carmem Lúcia), 1 aguardando pré-requisito sem mudança (José
Roberto Silva — demanda 208 segue "liberada", não concluída, em 29/07), 2 não recomendados com
evidência reforçada (Vlademir Ribeiro — pede serviço fora do catálogo; Vivian Cavalcante), 1
excluído com evidência muito mais forte que antes (André Américo — mistura pedido de gráfica e de
comida no mesmo dia/mesma janela de mensagens, não só 2 casos isolados), 1 candidato NOVO
adicionado com evidência limpa (Lidiane Oliveira, não estava na lista original da 209), 1 pra
monitorar futuramente (Jamilly, perfil misto sem hesitação) e 1 sinalizado como promissor mas não
lido qualitativamente (Metamorfose, cliente de alto volume).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **Achado técnico crítico pro 01-N8N/02-DADOS**: `jsgrafica_log_msgs_privadas.data_timestamp`
  está em MILISSEGUNDOS, não segundos — usar `to_timestamp(data_timestamp)` sem dividir por 1000
  produz datas no ano 58000+ e zera silenciosamente qualquer filtro de janela de tempo. Achado de
  forma independente 2 vezes nesta investigação. Recomendo revisar se algum workflow n8n ou script
  em produção depende dessa coluna sem a correção, e atualizar qualquer memória/nota técnica que
  cite essa coluna como epoch-segundos.
- **`jsgrafica_pedidos` foi usado como workaround pra lançamento financeiro avulso antes da
  demanda 226 existir** — encontrei `servico_nome` como "Entrada diversa"/"Recebimento de
  empréstimo" vinculados a pedidos reais na tabela. Não é mais necessário (226 já resolveu o caso
  de uso), mas qualquer leitura futura de `jsgrafica_pedidos` como "todo cliente real" precisa
  filtrar esse tipo de `servico_nome` residual.
- Telefone `5581988407435` (Yasmim Manuela) tem pedido real, pago e entregue, mas ZERO linhas em
  `jsgrafica_log_msgs_privadas` em toda a tabela (não só na janela) — não investigado a fundo
  (fora de escopo), registrado como achado de qualidade de dado.

### Status final
Concluída. Todos os critérios de aceite atendidos: 100 clientes selecionados com diversidade
documentada; reconstrução completa (estruturada pros 100, qualitativa citável pra 40) com fonte
real; manual de resposta com cada regra amarrada a pelo menos 1 exemplo real; lista de perfis
candidatos refinada e cruzada explicitamente com a 209; separação clara em todo o relatório entre
padrão confirmado (2+ casos), caso isolado e achado de risco/hipótese.
