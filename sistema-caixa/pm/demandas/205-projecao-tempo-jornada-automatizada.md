# 205 — Projeção real do tempo da jornada automatizada (ponta a ponta)

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-07-17
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Continuação do desenho de jornada da Fase 1 do agente (objetivo 2, `pm/OBJETIVOS-MACRO.md`,
demanda 204 concluída). O Edvam perguntou quanto tempo a jornada automatizada levaria em média —
o PM recusou chutar um número sem base e propôs medir de verdade. Existem 2 pedaços da jornada
que têm proxy real e mensurável no dado que já existe, e 1 pedaço que é puramente técnico
(latência do Gemini, sem histórico de conversa pra medir):
1. **Tempo de resposta do CLIENTE** a uma mensagem da equipe — proxy real pro "quanto tempo o
   cliente demora pra responder o botão do agente" (nunca foi medido, só medimos o tempo de
   resposta da EQUIPE até agora, demandas 161/162).
2. **Tempo que um pedido fica parado numa etapa até a equipe agir** — proxy real pro "quanto
   tempo vai ficar parado em `aguardando_aprovacao` até alguém aprovar", porque a aprovação vai
   morar na MESMA aba (Fila de impressão) e ser feita pela MESMA equipe que já usa essa tela hoje
   pra avançar pedido de `confirmado` pra `em_producao`/`pronto` — é o melhor proxy real
   disponível, mesmo hábito, mesma tela.
3. Latência real de `analisarMidiaGemini` (demanda 203) — não é dado de conversa, é medição
   técnica direta (cronometrar algumas chamadas reais).

## Objetivo
Uma projeção real (não estimativa do PM) do tempo médio ponta-a-ponta da jornada automatizada,
decomposta pelos 3 pedaços acima, comparada contra o tempo médio de hoje (100% humano, já medido
na 204: mediana 6,5min pra Impressão P&B).

## Escopo
- Incluído:
  1. **Tempo de resposta do cliente**: pra sessões que resultaram em pedido (mesma base da 204),
     medir o tempo entre a EQUIPE mandar uma mensagem que pede decisão/confirmação do cliente
     (ex. "confirma pra gente?", proposta de produto/preço) e o CLIENTE responder — mediana e
     p90, por tipo de serviço quando o volume permitir (reaproveitar os grupos já definidos na
     204).
  2. **Tempo parado até a equipe agir** (proxy pra aprovação): medir o tempo entre um pedido
     entrar em `confirmado` e sair desse status (virar `em_producao` ou outro avanço) — mediana e
     p90, no MESMO recorte de tempo da 204. Esse é o melhor proxy disponível pro futuro tempo de
     `aguardando_aprovacao` → aprovado, porque é literalmente a mesma tela/hábito da equipe.
  3. **Latência do Gemini**: cronometrar pelo menos 10 chamadas reais de `analisarMidiaGemini`
     (reaproveitar o script `scripts/spike-203-gemini-midia.ts` da 203, ou nova instância dele,
     só adicionando medição de tempo) — média e variação.
  4. **Projeção final**: somar os pedaços automáticos (confirmação instantânea + Gemini) com os 2
     proxies humanos (resposta do cliente + aprovação) pra dar uma faixa realista de tempo total
     da jornada automatizada, e comparar lado a lado com o tempo de hoje (100% humano).
  5. Ser explícito sobre a limitação do proxy: tempo de resposta a uma MENSAGEM HUMANA pode ser
     diferente de tempo de resposta a uma MENSAGEM DE BOT — documentar isso como suposição, não
     fato, e sugerir que a Fase B (quando rodar restrita com números reais) deve remedir isso de
     verdade assim que houver dado do agente funcionando.
- Fora de escopo: qualquer mudança de código ou de UI (isso é 100% investigação + 1 medição
  técnica pontual do item 3, sem alterar nada em produção).

## Critérios de aceite
- [ ] Tempo de resposta do cliente medido (mediana + p90), por tipo de serviço quando possível
- [ ] Tempo parado em `confirmado` até avançar, medido (mediana + p90), mesmo recorte da 204
- [ ] Latência real do Gemini medida (não estimada) com pelo menos 10 chamadas reais
- [ ] Projeção final apresentada como faixa (não número único fixo), comparada com o tempo de
      hoje (100% humano)
- [ ] Limitação do proxy (resposta a humano vs a bot) documentada explicitamente, não escondida

## Riscos e cuidados
Não apresentar a projeção como certeza — é a melhor estimativa possível com proxy real, mas o
próprio documento já deve dizer onde ela pode estar errada (a suposição do item 5).

## Referências
Demanda 204 (metodologia de sessão, tipos de serviço, recorte de tempo). Demanda 203 (script de
teste do Gemini, reaproveitar). `pm/OBJETIVOS-MACRO.md` (desenho de jornada da Fase 1).

## Relato de execução

**Status: concluída.** Seção 11 adicionada ao `pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`.
100% só-leitura, exceto a medição técnica do item 3 (chamada real à API do Gemini, sem gravar
nada — script novo em `scripts/spike-205-latencia-gemini.ts`, não conectado a nenhuma tela/fluxo).

### 1. Tempo de resposta do cliente a pergunta de confirmação da equipe
Nunca medido antes (159-162 só mediram tempo de resposta da equipe). Critério: mensagem da
equipe com "confirma" ou terminando em "?" (excluindo template automático), dentro de sessão que
virou pedido, medindo até a próxima mensagem do cliente. **102 casos: mediana 1,2 min, p75 6,4
min, p90 17,6 min.** Por serviço (P&B A4, Colorida, Agendamento/Currículo) com números
consistentes — Agendamento tem cauda mais longa (p90 44,7min), reforça achado da 204 de que
esse tipo é estruturalmente mais lento.

### 2. Tempo parado em `confirmado` até avançar (proxy de aprovação)
527 pedidos reais de WhatsApp, `data_producao_at - confirmado_cliente_at`: **mediana 0,1 min
(~6s), p75 0,9min, p90 11,2min.** 76,7% avança em até 1 minuto — confirmei que isso é porque hoje
é a MESMA pessoa criando e avançando o pedido na mesma ação, não uma revisão separada. **Registrei
essa limitação explicitamente**: o proxy provavelmente subestima o tempo real de aprovação da
Fase 1 (onde o agente cria sozinho e a equipe precisa notar depois) — usei o p90 (11,2min) como
estimativa mais realista pro cenário de espera de verdade, não a mediana.

### 3. Latência real do Gemini
Reaproveitei a amostra de 13 mídias reais da demanda 203, script novo com cronometragem
(`scripts/spike-205-latencia-gemini.ts`, `npx tsx scripts/spike-205-latencia-gemini.ts`).
**13/13 chamadas concluídas: mediana 3,0s, média 3,0s, mínimo 1,9s, máximo 3,8s** — componente
muito estável e, de longe, a parte mais rápida da jornada.

### 4. Projeção final (faixa, não número fixo)
Impressão P&B A4 (serviço dominante): **mediana projetada ~1,3 a ~12,4 min** (depende de qual
estimativa de aprovação usar) **vs. 6,5 min hoje**; **cauda p90 projetada ~45,1 min vs. 73 min
hoje**. Leitura honesta registrada: o Gemini (3s) é irrelevante pro tempo total — quem domina é
tempo humano (cliente respondendo, equipe aprovando), que a automação não elimina, só substitui a
parte de "equipe ler+decidir+digitar" pelo Gemini. Mesmo assim, a projeção de cauda fica melhor
que hoje nos dois cenários.

### 5. Limitação do proxy (explícita, não escondida)
Tempo de resposta medido é resposta a mensagem de ATENDENTE HUMANO, não de bot — documentado como
suposição, não fato, com recomendação explícita de remedir na Fase B assim que houver conversa
real com o agente.

### Achados fora do escopo
Nenhum novo — as limitações encontradas (proxy de aprovação provavelmente subestimado; resposta a
humano vs bot) já estavam previstas no risco da própria demanda e foram documentadas como pedido.

### Critérios de aceite
- [x] Tempo de resposta do cliente medido (mediana + p90), por tipo de serviço quando possível
- [x] Tempo parado em `confirmado` até avançar, medido (mediana + p90), mesmo recorte da 204
- [x] Latência real do Gemini medida (não estimada) com 13 chamadas reais
- [x] Projeção final apresentada como faixa, comparada com o tempo de hoje (100% humano)
- [x] Limitação do proxy (resposta a humano vs a bot) documentada explicitamente
