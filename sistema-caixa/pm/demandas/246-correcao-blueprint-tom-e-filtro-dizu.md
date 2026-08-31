# 246 — Corrigir o blueprint (244): tom de mensagem e lógica do filtro Dizu

Status: aprovada
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (revisão do Edvam sobre o artefato da 244)
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
O Edvam revisou o blueprint da demanda 244 (artefato publicado) e achou 2 problemas reais que
precisam correção antes do documento ser considerado pronto pra decisão. Os outros 2 pontos que
ele questionou (listas/botões via Z-API, envio de código Pix por texto) foram verificados pelo PM
e estão OK — não fazem parte do escopo desta correção.

## Objetivo
Corrigir o blueprint pra (1) o tom das mensagens do agente bater com o padrão real já confirmado
(curto, direto), e (2) a resposta ao padrão Dizu não afirmar algo que pode estar errado.

## Escopo
- Incluído: revisar TODAS as mensagens simuladas do agente no blueprint e reescrever qualquer uma
  que esteja em tom de parágrafo longo/formal — o padrão real confirmado (Regra 9 do manual da
  234, e o tom das próprias citações REAL usadas no documento) é curto e direto, frase única
  sempre que possível. Comparar cada mensagem revisada com pelo menos 1 exemplo REAL do manual
  pra confirmar que o tamanho/tom bate.
- Incluído: revisar a lógica do Exemplo F (filtro Dizu). O próprio blueprint já documenta um
  achado real: a equipe às vezes atende pedido de Dizu de propósito pelo número da JS Gráfica
  (quando o WhatsApp da Dizu cai) — nesses períodos, a resposta simulada atual ("isso aqui não é
  Dizu, confere o número") estaria errada. Duas opções a avaliar e recomendar uma: (a) o agente
  teria como saber com segurança se está ou não nesse período/modo de exceção antes de responder
  — se sim, desenhar como; (b) se não há como saber com segurança, o comportamento correto é
  **escalar pra humano** em vez de afirmar qualquer coisa sobre ser ou não Dizu — reescrever o
  Exemplo F nessa linha, com justificativa clara.
- Explicitamente fora de escopo: qualquer mudança na parte técnica já verificada (lista/botão via
  Z-API, envio de Pix por texto) — essa parte está confirmada correta, não mexer.
- Explicitamente fora de escopo: as decisões da 243 (conectar/expandir/escopo) continuam
  aguardando o blueprint corrigido, não fazem parte desta demanda.

## Critérios de aceite
- [ ] Todas as mensagens do agente revisadas — nenhuma em tom de parágrafo longo, todas
      comparáveis a um exemplo REAL do manual em tamanho/tom
- [ ] Exemplo F reescrito com lógica seguinda (escalar quando não há certeza, ou identificação
      segura do modo de exceção — o que for recomendado, com justificativa)
- [ ] Artefato republicado com as correções, claramente indicando o que mudou desde a versão
      revisada pelo Edvam

## Riscos e cuidados
Nenhum — é revisão de documento, não execução.

## Referências
Demanda 244 (blueprint original). Demanda 234 (manual de resposta, fonte do tom real e do achado
sobre a Dizu). Artefato publicado da 244.

## Relato de execução

Executada em 2026-07-29 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Documento corrigido em
`pm/conhecimento/blueprint-conversas-exemplo-agente.md` (nova seção "O que mudou nesta correção"
logo após a legenda) e artefato republicado na mesma URL da 244, com faixa de correção visível
no topo e seção dedicada "O que mudou" antes do índice de regras.

### O que foi feito
1. **Tom**: revisei as 14 mensagens do agente no documento. As já curtas (ex. "Obrigado! 😊",
   regra 9) não mudaram. As 6 que estavam em parágrafo longo (juntando confirmação + recapitulação
   + pergunta numa bolha só — Exemplos C, E×2, D, e as notas de regra 1/4) foram reescritas,
   várias divididas em 2-3 mensagens curtas em sequência, comparável ao padrão real de bursts
   curtos do manual da 234 (ex. "Boa tarde! Certo, Lidiane." separado de "Fica R$ 2,20 mesmo.").
   Cada mudança foi anotada inline no markdown com a nota "correção 246" e o exemplo REAL
   comparável usado como referência.
2. **Lógica do filtro Dizu (Exemplo F)**: reescrita completa, não só o texto. Avaliei as 2 opções
   pedidas no escopo — (a) o agente detectar com segurança o modo de exceção (só seria viável com
   um sinalizador manual novo, que não existe hoje — registrado como opção futura, não construído
   aqui) e (b) escalar sempre que o padrão Dizu for detectado, sem afirmar nada sobre qual
   situação é. Adotei (b): o agente reconhece o padrão (mesma detecção da 159/206) mas nunca mais
   afirma "número errado" — passa direto pra humano com mensagem neutra que funciona certo tanto
   em confusão real quanto no período de exceção.

### Testes realizados e resultado
Nenhum teste de execução (revisão de documento). Validação: cada mensagem revisada foi comparada
lado a lado com pelo menos 1 citação REAL do manual da 234 antes de entrar no documento final
(tabela de comparação incluída tanto no `.md` quanto no artefato).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo — os 2 pontos que o Edvam questionou e que já estavam corretos (lista/botão via
Z-API, envio de Pix por texto) foram confirmados pelo PM antes desta demanda, não reabertos aqui.

### Status final
Concluída. Os 3 critérios de aceite atendidos: todas as mensagens do agente revisadas, nenhuma em
parágrafo longo, todas comparadas a exemplo REAL; Exemplo F reescrito com a lógica (b) — escalar
sempre, nunca afirmar — com justificativa completa das 2 opções avaliadas; artefato republicado
na mesma URL com faixa de correção no topo e seção "O que mudou" dedicada.
