# 293 — Fronteira clara: até onde vai a IA, quando passa pra automação, quando escala pra equipe

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Decisão tomada pelo Edvam (2026-08-16): seguir com o Caminho C da demanda 292 (agente de IA com
ferramentas travadas, substituindo a árvore de IFs do `206`). Ele sabe que vai ter erro, vai
precisar testar ao longo dos dias — decisão consciente, não é pra reabrir o debate.

**O que falta antes de qualquer prompt/ferramenta virar código**: definir com clareza os 3 papéis
e as transições entre eles, na visão do Edvam:
1. **IA de atendimento** — conversa, entende o cliente, decide o que fazer.
2. **Sistema de automação de tarefas** — as ferramentas travadas (preço, Pix, criar pedido) que a
   292 já mapeou (9 ferramentas).
3. **Equipe humana** — quando escala.

Precisa ficar claro: até onde a IA vai sozinha, exatamente quando ela aciona a automação (não é
"em algum momento", é um critério objetivo), exatamente quando escala pra equipe, e o que
acontece se a conversa **voltar** depois de escalar (equipe respondeu, cliente reagiu de novo,
ou a pergunta não foi bem respondida) — a IA precisa saber retomar sabendo onde a conversa parou,
não recomeçar do zero nem duplicar o que a equipe já disse.

## Objetivo
Um desenho claro da fronteira e das transições entre IA, automação e equipe, pronto pra virar
prompt/lógica real na próxima demanda de implementação — não é pra implementar nada aqui ainda.

## Escopo
- Incluído: **até onde a IA vai sozinha** — que tipo de pergunta/situação ela responde
  inteiramente por conta própria, sem acionar nem ferramenta nem equipe (ex.: dúvida sobre
  horário de funcionamento, forma de pagamento aceita, prazo típico).
- Incluído: **critério objetivo de quando aciona a automação** (as 9 ferramentas da 292) — não
  "quando for pedido", mas o sinal exato que dispara cada ferramenta (ex.: cliente confirmou
  produto e quantidade → aciona `calcular_preco`; cliente confirmou o valor → aciona `gerar_pix`).
- Incluído: **critério objetivo de quando escala pra equipe** — reaproveitar a régua que já existe
  (dado pessoal/alto toque, negociação fora do padrão, cancelamento de pedido já pago/entregue,
  Dizu, timeout) e decidir se algo muda nela nesse novo desenho, ou se continua igual.
- Incluído: **o que acontece quando a conversa volta depois de escalar** — 3 cenários a cobrir
  explicitamente: (a) equipe respondeu e resolveu, conversa devia ficar "encerrada" pra IA, não
  reabrir sozinha; (b) equipe respondeu mas o cliente tem uma pergunta nova depois, a IA retoma
  sabendo o que a equipe já disse (não repete nem contradiz); (c) a IA respondeu algo e o cliente
  reagiu como se não tivesse entendido/não fosse bem respondido, como ela reconhece isso e decide
  entre tentar de novo ou escalar, sem ficar num loop.
- Incluído: como a IA sabe "onde a conversa está" nesses casos — que dado real ela consulta antes
  de responder (mesmo mecanismo de contexto de conversa recente já desenhado na demanda 291, mas
  agora incluindo também o que a EQUIPE respondeu manualmente pelo Inbox, não só o que a própria
  IA disse antes).
- Incluído: diagramas/exemplos concretos (mesmo padrão do blueprint) cobrindo pelo menos 1 caso de
  cada transição (IA sozinha, IA→automação, IA→equipe, equipe→IA de volta).
- Explicitamente fora de escopo: escrever o prompt final, escrever o código das ferramentas,
  qualquer implementação no `206` ou workflow novo.

## Critérios de aceite
- [ ] Fronteira "IA sozinha" definida com exemplos concretos
- [ ] Critério objetivo de acionamento de cada uma das 9 ferramentas da 292
- [ ] Critério de escalação pra equipe, reaproveitando ou ajustando a régua existente, com
      justificativa se mudar algo
- [ ] Os 3 cenários de retomada pós-escalação cobertos com exemplo concreto cada
- [ ] Mecanismo de "saber onde a conversa está" desenhado, incluindo resposta manual da equipe
      no Inbox como fonte de contexto, não só mensagem da própria IA

## Riscos e cuidados
Isso é a peça que evita a IA "pisar" na equipe (responder algo que já foi respondido, ou
contradizer o que um atendente já disse) — tratar com cuidado real, não só como formalidade.

## Referências
Demanda 292 (`pm/conhecimento/analise-arquitetura-atendimento-humanizado-vs-estruturado.md`,
seção 7 — Caminho C, decisão tomada, 9 ferramentas mapeadas). Demanda 291 (mecanismo de contexto
de conversa recente, base pra estender aqui). Blueprint (`blueprint-conversas-exemplo-agente.md`,
régua de escalação já existente, ponto de partida pra revisar).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito: criado `pm/conhecimento/caminho-c-fronteira-ia-automacao-equipe.md`, novo
  documento (não extensão do blueprint do `206`, que a demanda 292 recomendou congelar), mesma
  disciplina de marcação REAL/SIMULADO/SISTEMA e citação real. Conteúdo:
  1. **Fronteira "IA sozinha"** definida por regra objetiva (não depende de dado do banco, não
     grava/promete nada), com exemplo real (horário de funcionamento, cliente `558194437630`,
     lote 07 da demanda 256).
  2. **Critério objetivo pra cada uma das 9 ferramentas da 292**, tabela com o sinal exato de
     acionamento de cada uma (ex.: `consultar_preco_produto` dispara quando produto+especificação
     suficiente, nunca antes; `gerar_cobranca_pix` só depois de valor apresentado E confirmado),
     distinguindo o que é pré-condição automática do que é decisão da IA.
  3. **Régua de escalação redesenhada em 2 camadas**, mudança justificada explicitamente: Camada 1
     (dado pessoal/Alto Toque, Dizu, cancelamento pago/entregue) continua determinística, roda
     antes da IA processar, nunca fica a critério do julgamento dela, mesmo princípio de segurança
     estrutural da 292. Camada 2 (ambiguidade, negociação fora do padrão, proposta negada, timeout)
     passa a ser reconhecida por julgamento da IA via ferramenta `escalar_para_humano`, com
     justificativa de por que isso é uma vantagem real do Caminho C nesses casos específicos (regex
     fixo cobre mal padrão variado de confusão).
  4. **Os 3 cenários de retomada**, cada um com exemplo concreto: (a) equipe resolveu, IA nunca
     reabre sozinha, trata mensagem nova como possível nova sessão; (b) equipe respondeu
     manualmente (José Roberto Silva, banner, citação real + continuação simulada), IA retoma sem
     repetir a pergunta que a equipe já fez; (c) IA não foi entendida, reformula 1 vez, escala na
     2ª falha, mesmo limite já usado hoje pra correções sem resolver, nunca insiste 3x.
  5. **Mecanismo de "saber onde a conversa está" estendido**: identificado que
     `jsgrafica_log_msgs_privadas` não distingue hoje mensagem da IA de mensagem da equipe (achado
     desta demanda, não presumido resolvido). Proposta sem precisar de coluna nova: o workflow do
     agente mantém o próprio histórico do que ele mandou, `buscar_contexto_conversa_recente`
     compara contra o log compartilhado, o que sobra é mensagem de humano, mesma janela de 8
     mensagens/7 dias da 291, sem RAG.

- Testes realizados e resultado: não aplicável (demanda de desenho, sem prompt final nem
  implementação, conforme escopo explícito). Verificação feita: reconferido que as 9 ferramentas
  citadas batem com o mapeamento exato da seção 7.3 da demanda 292, não redigitadas de memória; a
  citação de José Roberto Silva e a de Iraneide Peixoto conferidas contra o texto já existente no
  blueprint/lotes de evidência; busca literal por travessão no arquivo novo, 6 ocorrências
  corrigidas antes de considerar concluído.

- Achados fora do escopo (relatados, não resolvidos por conta própria): a lacuna de "log não
  distingue IA de humano" (seção 6) é achado novo desta demanda, não presumido resolvido, registrado
  como dependência real pra quem for construir o workflow novo (precisa registrar o próprio envio
  desde o primeiro dia, não é algo que dá pra adicionar retroativamente sem perder histórico do
  período anterior). Não é um bug a corrigir agora, é um requisito de desenho pra próxima demanda de
  implementação.

- Status final: **concluída**. Os 5 critérios de aceite batidos: fronteira "IA sozinha" definida
  com exemplo concreto; critério objetivo das 9 ferramentas mapeado (tabela completa); régua de
  escalação reaproveitada com ajuste explicitamente justificado (2 camadas); os 3 cenários de
  retomada cobertos com exemplo concreto cada; mecanismo de contexto estendido pra incluir resposta
  manual da equipe, com a lacuna real identificada e a proposta de resolução sem infraestrutura
  nova, não escondida.
