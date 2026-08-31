# 244 — Blueprint do atendimento automático: conversas exemplo pra cada padrão mapeado

Status: aprovada
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam: precisa ver como vai ser de verdade antes de aprovar qualquer
conexão — "que ele me mostre como vai ser as respostas do agente para cada tipo de pergunta que
foi analisada e mapeada como padrão")
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
A demanda 234 mapeou 11 regras de comportamento com evidência real, e a 243 propôs decisões
sobre conectar/expandir/escopo — mas nenhuma das duas mostrou **literalmente como uma conversa
com o agente vai parecer**. O Edvam foi explícito: antes de aprovar qualquer coisa, precisa ver
o blueprint completo — as respostas reais que o agente daria, conversa a conversa, pra cada
padrão já identificado, não só a regra em texto abstrato.

## Objetivo
Um documento com exemplos concretos de conversa (o que o cliente manda → o que o agente
responde, mensagem a mensagem) cobrindo cada padrão do manual de resposta da 234, no mesmo tom e
estilo já confirmado como real (nada inventado), pra o Edvam avaliar o comportamento de verdade
antes de aprovar qualquer conexão.

## Escopo
- Incluído: pra cada uma das 11 regras do manual de resposta (`pm/conhecimento/manual-resposta-
  ia-100-clientes.md`, seção 4), escrever pelo menos 1 exemplo de conversa completa mostrando a
  mensagem do cliente e a resposta exata que o agente daria — no mesmo tom/estilo real já
  documentado (curto, direto, confirma o que recebeu antes de falar preço, etc.), não um tom
  genérico de chatbot.
- Incluído: montar pelo menos 2 conversas end-to-end completas, do primeiro "oi" até o pedido
  virar "aguardando aprovação", cobrindo os 2 casos centrais do desenho da Fase 1:
  1. Documento óbvio (ex.: boleto de 1 página) — fluxo direto, agente propõe produto+preço sem
     perguntar.
  2. Mídia ambígua — agente faz pergunta aberta, espera resposta, confirma antes de prosseguir.
- Incluído: pelo menos 1 exemplo de rajada de mensagens fragmentadas (cliente manda várias
  mensagens curtas seguidas) mostrando que o agente espera o silêncio antes de responder, não
  reage a cada fragmento.
- Incluído: pelo menos 1 exemplo de escalação — um caso que o agente NÃO tenta resolver sozinho
  (cancelamento, negociação, reclamação) e passa pra humano, mostrando a mensagem de transição
  que o cliente veria (algo como "vou confirmar isso com a equipe").
- Incluído: o exemplo do Pix (nunca mandar código antes de confirmar valor) como conversa
  completa, não só a regra.
- Incluído: mostrar (mesmo que como print/texto simulado) o que aparece pro Admin na etapa de
  aprovação antes do pedido virar real — pra deixar claro que nada chega ao cliente sem essa
  etapa.
- Incluído: 1 exemplo de detecção do padrão Dizu Refeições (cliente confunde com pedido de
  comida) sendo reconhecido e tratado antes do fluxo de gráfica começar.
- Explicitamente fora de escopo: implementar qualquer coisa — é documento de revisão, não
  workflow, não código.

## Critérios de aceite
- [ ] Todas as 11 regras do manual de resposta representadas em pelo menos 1 exemplo de conversa
- [ ] 2 conversas end-to-end completas (documento óbvio + mídia ambígua) do início até
      "aguardando aprovação"
- [ ] Exemplo de rajada de mensagens, exemplo de escalação, exemplo do cuidado com Pix, exemplo
      do filtro Dizu — todos presentes
- [ ] Cada exemplo deixa claro se é reconstrução de um caso real (cita telefone/pedido) ou uma
      simulação nova plausível baseada nos padrões reais (não pode ser confundido um com o outro)
- [ ] Nada implementado — só o documento

## Riscos e cuidados
Nenhuma conversa simulada pode inventar um comportamento que contradiga o manual de resposta da
234 — se um exemplo não tiver base clara numa regra já confirmada, sinalizar explicitamente como
"proposta nova, sem precedente direto no dado analisado".

## Referências
Demanda 234 (`pm/conhecimento/manual-resposta-ia-100-clientes.md`, fonte de todo padrão citado).
Demanda 243 (`pm/conhecimento/proposta-conexao-fase-b-expansao-escopo.md`, desenho técnico da
Fase B). `pm/OBJETIVOS-MACRO.md` (desenho original dos 7 passos da Fase 1).

## Relato de execução

Executada em 2026-07-29 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Documento completo em
`pm/conhecimento/blueprint-conversas-exemplo-agente.md`.

### O que foi feito
Escrevi 6 conversas exemplo (2 end-to-end completas — documento óbvio e mídia ambígua — mais
rajada fragmentada, escalação, cuidado com Pix e filtro Dizu), cada linha marcada explicitamente
como [CLIENTE — REAL] (cita telefone/pedido), [CLIENTE — SIMULADO], [AGENTE — SIMULADO, com nota
de qual regra/caso real embasa] ou [SISTEMA] (template que já roda em produção hoje). Mostrei
também o card de aprovação do Admin na Fila de Impressão, reconstruído fielmente do que já existe
desde a demanda 202. Cobri as 11 regras do manual da 234: 6 aparecem diretamente nos exemplos de
conversa (1, 2, 3, 5, 8, 9), 2 têm exemplo dedicado adicional (4 — currículo, escalando em vez de
tentar; 6 — dinheiro na retirada), 1 é ilustrada sem ser conversa por natureza (7 — telefone como
identidade, é regra de dado, não de diálogo) e 2 são achados de risco/limitação de dado, não
comportamento conversacional (10 e 11) — expliquei essa distinção no documento em vez de forçar
uma conversa artificial só pra "bater a lista", o que violaria o próprio risco desta demanda
(não inventar comportamento sem base real).

### Testes realizados e resultado
Nenhum teste de execução — demanda de documento de revisão, sem código nem workflow tocado.
Validação foi de consistência: toda mensagem do agente foi checada contra o manual da 234 e a
proposta técnica da 243 antes de entrar no documento.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **Achado mais importante desta rodada**: encontrei uma contradição real entre o que esta
  demanda pediu (exemplo de escalação "com mensagem de transição visível pro cliente") e o que a
  demanda 206 testou de verdade (escalação **silenciosa**, sem nenhuma mensagem automática,
  decisão registrada explicitamente no relato da 206 como comportamento correto — "escalar =
  parar o automatismo, não fingir resolver"). Escrevi o Exemplo D na versão COM aviso (conforme
  pedido nesta demanda), mas registrei a contradição e recomendei — como julgamento, não achado
  de dado — a versão com aviso, citando o próprio princípio de metodologia do meu briefing ("80%
  das pessoas só usam bot se souberem que existe opção de falar com humano"). **Isso muda um
  comportamento já testado tecnicamente** — não é só ajuste de redação, precisa confirmação
  explícita do Edvam/PM antes de qualquer implementação real, não decidi sozinho.
- O texto de redirecionamento do filtro Dizu (Exemplo F) evita citar um número de contato fixo da
  Dizu Refeições, porque o log real mostra um período em que o próprio número da Dizu foi
  bloqueado pelo WhatsApp e os pedidos de comida voltaram a ser atendidos pelo número da JS
  Gráfica por decisão da equipe — se um número de contato for cravado no agente, precisa de
  mecanismo pra manter atualizado, não hardcoded.
- Reforcei (não novo, já registrado na 243) que a lista de categorias usada no Exemplo B ainda não
  inclui "Recarga celular"/"Recarga vem", pendência já sinalizada.

### Status final
Concluída. Todos os critérios de aceite atendidos: as 11 regras representadas (com distinção
clara e justificada entre as que geram conversa e as que são achado de risco); 2 end-to-end
completos (documento óbvio + mídia ambígua); exemplos de rajada, escalação, Pix e filtro Dizu
presentes; toda linha marcada como reconstrução real ou simulação, sem ambiguidade; nada
implementado.
