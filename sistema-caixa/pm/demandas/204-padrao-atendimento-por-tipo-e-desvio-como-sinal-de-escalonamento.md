# 204 — Padrão de atendimento por tipo de pedido + desvio como sinal de "escalaria pro humano"

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-07-17
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Continuação da pesquisa de automação do atendimento (objetivo 2, `pm/OBJETIVOS-MACRO.md`),
depois da Fase A concluída (demandas 202/203). Ao desenhar os detalhes de jornada do futuro
agente (que intenção vira botão, quando escala pro humano), o PM tentou uma investigação rápida
por palavra-chave no log (`mapa-jornada-atendimento-whatsapp.md`, seção 10) e o Edvam apontou o
problema certo: **"vc tá tirando análises que o chat de dados poderia responder diferente"** —
busca por palavra solta é rasa e sujeita a alucinar padrão que não existe, especialmente com o
log contaminado (achado antigo, ~23% do tráfego não é da JS Gráfica). Existe uma pergunta melhor
e mensurável, que o PM não tinha pensado: **hoje 100% do atendimento já é humano — mas dá pra
medir, por TIPO de pedido, qual é o padrão normal de atendimento (quantas mensagens, quanto
tempo, que sequência), e quais sessões fogem desse padrão (mais debate, mais idas e vindas).
Essas sessões que fogem do padrão são o proxy real de "isso teria escalado pro humano se fosse
IA atendendo"** — não é suposição, é medível com o dado que já existe.

## Objetivo
Pra cada tipo de pedido relevante (agrupado por `servico_nome`/categoria do catálogo, ou pela
ausência de pedido quando a sessão não vira um), existe um padrão de atendimento normal
mensurável (número de mensagens até resolver, sequência típica, tempo de resolução) — e uma
lista de sessões reais que fogem desse padrão, com o que elas têm em comum, servindo de base pra
decidir o que precisa escalar pro humano no desenho do agente.

## Escopo
- Incluído:
  1. Reaproveitar a MESMA metodologia de "sessão" já validada nas demandas 159-163 (gap de 4h
     delimitando início de sessão) — não reinventar o critério.
  2. Agrupar sessões que resultaram em pedido por `servico_nome`/categoria (usar a mesma
     concentração já medida: Impressão P&B A4 domina, top 2 = 74%) — pra cada grupo com volume
     suficiente pra análise, medir: número de mensagens do cliente até o pedido nascer, número de
     mensagens da equipe, tempo total da sessão, se seguiu o padrão "mídia→confirma→pedido" (o
     caminho comum, já documentado na seção 9.4) ou teve idas e vindas extras.
  3. Identificar sessões que são outliers dentro do próprio grupo (muito mais mensagens/tempo que
     a mediana do tipo) — essas são o proxy de "gerou debate". Ler uma amostra real dessas
     sessões (não só contar número) e caracterizar **o que especificamente gerou o debate**:
     negociação de preço, dúvida de especificação, reclamação, pedido de alteração, cliente
     indeciso, arquivo ilegível, etc. — categorizar com exemplo real de cada categoria encontrada.
  4. Também considerar sessões que NÃO viraram pedido (56% do total, achado da 161) — dentro
     dessas, quais têm sinal de "cliente queria mas não fechou" vs "só pergunta/não virou venda
     mesmo" — mesma lógica de outlier/debate aplicada a esse grupo.
  5. Cruzar com o achado da demanda 173 (não é o mesmo tema, mas usar como referência de
     metodologia: verificar hipótese com recálculo independente antes de reportar como fato).
  6. **Revisar/substituir a seção 10 do `mapa-jornada-atendimento-whatsapp.md`** (a investigação
     rasa do PM, que ficou registrada como achado preliminar, não definitivo) com o resultado
     desta demanda — deixar claro que substitui, não só complementa.
- Fora de escopo: qualquer decisão de desenho do agente em si (isso volta pro PM depois, com o
  dado); qualquer alteração de dado ou de sistema (100% investigação, só leitura).

## Critérios de aceite
- [ ] Padrão normal de atendimento medido por tipo de pedido relevante (pelo menos os que têm
      volume suficiente pra análise — Impressão P&B A4 e os próximos mais frequentes)
- [ ] Lista de sessões-outlier (fogem do padrão do próprio tipo) com exemplo real de cada
      categoria de "o que gerou o debate"
- [ ] Sessões sem pedido também analisadas pela mesma lente (outlier = sinal de intenção real
      não resolvida vs. não-venda comum)
- [ ] Metodologia de sessão idêntica à 159-163 (não reinventar critério)
- [ ] Seção 10 do mapa de jornada revisada/substituída com o resultado rigoroso
- [ ] Honesto sobre limites (contaminação do log, tamanho de amostra por categoria menos comum)

## Riscos e cuidados
Não confundir "sessão longa" com "precisaria escalar" sem ler o conteúdo real — o objetivo é
caracterizar POR QUE fugiu do padrão, não só contar outlier. Mesmo cuidado de sempre com o log
contaminado (~23% não é tráfego da gráfica) — filtrar antes de generalizar.

## Referências
`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md` (seções 9 e 10 — a 10 foi investigação
rasa do PM, a ser substituída por esta demanda). Demandas 159-163 (metodologia de sessão,
concentração de catálogo, fragmentação). `pm/OBJETIVOS-MACRO.md` (objetivo 2, desenho da Fase 1).

## Relato de execução

**Status: concluída.** Seção 10 do `pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`
**substituída integralmente** (não só complementada) pela investigação rigorosa desta demanda.
Resumo executivo do documento também atualizado (itens 12-16). 100% só-leitura.

### Metodologia (idêntica à 159-163)

Mesma base de "início de sessão" (gap de 4h), janela 2026-07-01 a 2026-07-17 (mais ampla que
investigações anteriores pra ter volume por tipo de serviço) — 1.083 sessões, 682 contatos
distintos, contatos de teste já conhecidos excluídos. Vínculo com pedido: mesmo critério da 160
(telefone/`contact_lid` bate, `created_at` dentro da sessão ou até 48h depois). 430 sessões
(39,7%) viram pedido, 653 (60,3%) não — nessa unidade (sessão, não contato-novo), consistente com
a leitura já estabelecida de que conversão não é minoria.

**Achado metodológico relevante, achado no processo**: a maior sessão bruta do dataset (182
mensagens) não era atendimento — era o bot da Neoenergia/Celpe (segunda via/corte de energia)
contaminando o mesmo telefone de um cliente real. Excluí esse telefone de toda a análise —
confirma na prática o cuidado que a própria demanda pedia sobre não confundir volume com desvio
sem ler o conteúdo.

### 1. Padrão normal por tipo de serviço

Mensagens contadas do início da sessão até o pedido nascer (não a sessão inteira — corrigi um
erro de medição no meio do processo: contar a sessão inteira inflava o número com assuntos
posteriores não relacionados ao pedido).

Impressão P&B A4 (272 sessões, o dominante): mediana 2 msgs cliente + 1 da equipe, 6,5 min até o
pedido, **73,2% começam com mídia sem texto**. Outros serviços de alto volume (Colorida Ofício,
2ª Via Conta, Xerox) seguem padrão parecido. Serviços que exigem coleta de dado (Agendamento/
Currículo/Digitação, Digitação de Provas, Foto Polaroid) são estruturalmente mais lentos —
**isso é característica do serviço, não desvio** (achado explícito, evita confundir os dois).

### 2. Sessões-outlier com pedido — 8 causas reais de "debate", cada uma lida e categorizada

Outlier definido por p90 do grupo dominante (≥14 msgs ou ≥73min). Li 8 sessões reais: confusão
Dizu infiltrada na própria resposta da equipe, negociação de pagamento fora do padrão
(dinheiro↔Pix), falta de vocabulário técnico do cliente pra especificar formatação, arquivo
protegido por senha, coleta de dado pessoal (2ª via de conta), cliente sem saber a própria
especificação (tamanho de foto), pedido de edição de conteúdo antes de imprimir, e combinação de
múltiplas etapas de acabamento. Detalhe e telefone de cada caso no documento.

### 3. Sessões sem pedido — outlier como proxy de intenção real

644 sessões sem pedido (mediana 6 msgs, outlier ≥20). Li 5 outliers: 1 contaminação externa pura
(golpe de farmácia, zero relação com a gráfica), 2 vendas reais que acontecem de fato (entrega/
retirada confirmada na conversa) mas nunca viram registro em `jsgrafica_pedidos` — **reforça 2x,
com casos novos e independentes, o achado da 161 (caso Ana Paula)** —, e 1 caso de pergunta de
preço repetida 3x sem resposta visível (risco real de atrito, diferente dos 2 casos que fecharam
informalmente). Maioria das 644 tem poucas mensagens — não generalizei "60% é venda perdida", só
a cauda de maior engajamento mostra esse sinal.

### 4. Honesto sobre limites
Contaminação do log distorce outlier bruto de forma concreta e mensurável (2 exemplos reais:
bot Neoenergia e o próprio telefone do Edvam). Amostra pequena em categorias menos comuns
(Digitação de Provas: 4; Foto Polaroid: 5) — direcional, não robusto. Não existe dado real de
"IA escalou pro humano" (100% do atendimento é humano hoje) — o outlier lido é a melhor
aproximação possível, não substituto de dado de escalonamento real. A pergunta original do PM
sobre "cancelar" não foi re-investigada (fora do escopo desta demanda) — achado qualitativo
anterior preservado no documento como válido.

### Achados fora do escopo
Nenhum novo além do já registrado (a descoberta de mais 2 casos de venda real sem registro formal
já era um padrão conhecido desde a 161 — aqui só reforçado com evidência independente).

### Critérios de aceite
- [x] Padrão normal medido por tipo de pedido relevante (P&B A4 e os próximos mais frequentes)
- [x] Lista de sessões-outlier com exemplo real de cada categoria de "o que gerou o debate" (8
      causas distintas, com telefone/trecho real de cada uma)
- [x] Sessões sem pedido analisadas pela mesma lente (outlier = sinal de intenção real não
      resolvida vs. não-venda comum — 3 categorias distintas encontradas)
- [x] Metodologia de sessão idêntica à 159-163 (gap de 4h, sem reinvenção)
- [x] Seção 10 do mapa de jornada revisada/substituída com o resultado rigoroso
- [x] Honesto sobre limites (contaminação do log com 2 exemplos concretos; tamanho de amostra
      pequeno em categorias menos comuns, documentado explicitamente)
