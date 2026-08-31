# 305 - Caminho C: construir o gate determinístico de Alto Toque (falta desde a 296)

Status: concluída
Criada em: 2026-08-18
Aprovada em: 2026-08-18
Concluída em: 2026-08-18
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A fronteira do Caminho C (demanda 293, seção 4) exige que "dado pessoal / Serviço Alto Toque"
(currículo, digitação, antecedentes, conta gov) seja Camada 1: checagem determinística de código,
rodando ANTES de a IA processar livremente, nunca dependendo do julgamento dela - mesmo princípio
de segurança estrutural da demanda 292 (nunca deixar uma garantia de segurança depender só do bom
senso do modelo). A trava Dizu já foi construída assim (gate de pré-turno + validação embutida,
demanda 295/296). O Alto Toque não foi - achado e relatado com honestidade pela demanda 297: hoje
esse reconhecimento acontece só por julgamento da IA (Camada 2, via prompt), funcionou nos testes
reais que a 297 fez, mas não é a garantia que a 293 pediu.

Isso importa mais do que parece: dado pessoal (currículo, antecedentes, digitação) é exatamente o
tipo de conteúdo sensível que a Regra 4 do manual 234 já tratava com cuidado redobrado antes do
Caminho C existir. Depender só de a IA "perceber" isso reabre o mesmo tipo de risco que motivou o
Caminho C inteiro (garantia não pode depender de julgamento, tem que ser estrutural).

## Objetivo
Alto Toque vira gate determinístico de pré-turno, mesmo padrão já construído pra Dizu, fechando o
gap que a demanda 297 encontrou e relatou.

## Escopo
- Incluído: construir o gate de Alto Toque como pré-passo de código (mesmo lugar/padrão do gate
  Dizu da 295/296), reaproveitando o mesmo critério de regex/padrão de conteúdo já usado no `206`
  hoje (`Serviço Alto Toque?`), incluindo a correção do gap "conta gov" já identificado na demanda
  277/278.
- Incluído: conectar esse gate no workflow `297 - JSGRAFICA | CAMINHO C AGENTE (TESTE ISOLADO)`,
  rodando antes do node do agente, mesmo lugar onde o gate Dizu já roda.
- Incluído: reconfirmar com teste real (nome/telefone reais, nunca fake) que o Alto Toque escala
  de verdade via este gate novo, não mais só por decisão da IA - comparar com o teste que a 297 já
  fez (currículo escalando via julgamento da IA) pra ver que o resultado final pro cliente não
  muda, só a garantia por trás fica mais forte.
- Explicitamente fora de escopo: qualquer mudança na demanda 298 (teste adversarial) em si -
  esta demanda deve terminar ANTES da 298 rodar de verdade, pra não gastar teste adversarial
  validando um guardrail que já sabemos que está incompleto.

## Critérios de aceite
- [ ] Gate determinístico de Alto Toque construído, mesmo padrão do gate Dizu
- [ ] Conectado no workflow 297, rodando antes do agente processar
- [ ] Testado com caso real de currículo/dado pessoal, confirmando escalação via gate (não mais
      só via julgamento da IA)
- [ ] `206` e `jsgrafica_contatos` conferidos intactos ao final

## Riscos e cuidados
Baixo risco de implementação (mesmo padrão já provado com o Dizu). O risco que esta demanda existe
pra fechar é o de segurança estrutural incompleta - tratar com o mesmo cuidado que a trava Dizu
recebeu, não como ajuste cosmético.

## Referências
Demanda 297 (achado original, relato "Achados fora do escopo", item 1). Demanda 293 (seção 4,
exigência de Camada 1 determinística pro Alto Toque). Demandas 295/296 (padrão do gate Dizu,
reaproveitar a mesma estrutura). Demanda 277/278 (gap "conta gov" no regex de Alto Toque,
já corrigido no `206`, reaproveitar o regex corrigido, não o original).

## Relato de execução

- O que foi feito: backup dos 2 workflows antes de qualquer mudança (`pm/backups/
  296-caminho-c-ferramentas_pre-demanda305_2026-08-18.json`,
  `297-caminho-c-agente_pre-demanda305_2026-08-18.json`). Extraído o regex real e atual do node
  `Serviço Alto Toque?` do `206` (não de memória): `/curr[ií]culo|digita[çc][ãa]o|prova|
  antecedente|foto composta|composi[çc][ãa]o|gov\.?br|conta gov|senha do gov/i`, já incluindo a
  correção "conta gov"/"gov.br"/"senha do gov" da demanda 278. Construído gate novo
  `caminho-c-verificar-alto-toque` no workflow de ferramentas (`aO6iktSzcYtVZ6B5`), mesmo padrão
  exato do gate Dizu (webhook -> Code testando o regex contra o texto cru da mensagem -> resposta),
  adição pura (3 nodes novos, nenhum node existente alterado, diff confirmado). Nota de adaptação:
  o `206` testa esse regex contra `gemini_produto_detectado` (uma classificação prévia do Gemini
  que não existe neste pipeline mais simples); aqui testado direto contra o texto da mensagem, mesma
  lógica, sem a etapa intermediária.
  Conectado no workflow do agente (`JeN7VMYMeQEJgd0b`) logo depois do gate Dizu (mesmo lugar,
  antes de qualquer processamento da IA): se Dizu não bater, chama o gate de Alto Toque; se bater,
  escala via `escalar_para_humano` (motivo `alto_toque`) sem a IA nunca ver a mensagem; se não
  bater nenhum dos dois, segue pro fluxo normal.
- **Achado real e corrigido no caminho, regressão que eu mesmo introduzi**: ao inserir o novo gate,
  reposicionei `GET Config Agente` (credenciais Z-API) pra rodar uma única vez, antes dos dois
  gates (Dizu e Alto Toque), garantindo que os 3 caminhos de saída (Dizu, Alto Toque, normal)
  sempre tenham a config disponível na hora de enviar a mensagem - antes ele só rodava depois do
  gate Dizu, e a resposta de escalação de Alto Toque tentava usar uma config que nunca tinha
  rodado (`Node 'GET Config Agente' hasn't been executed`), erro real capturado na 1ª tentativa de
  teste. Esse reposicionamento revelou uma 2ª regressão pré-existente (não desta demanda, latente
  desde a 297 e nunca testada ponta a ponta até agora): o node `Chamar Gate Dizu` referenciava
  `$json.mensagem_texto` (entrada direta implícita) em vez do node por nome - depois do
  reposicionamento, a entrada direta mudou pra `GET Config Agente` (que não tem esse campo),
  quebrando a detecção de Dizu em silêncio (`is_dizu` sempre `false`, testado com "voces vendem
  marmita hoje?" e confirmado que a IA respondia sozinha explicando "somos uma gráfica", violando
  a regra de nunca explicar Dizu pro cliente). Corrigido trocando pra referência explícita
  (`$('Validar Entrada').first().json.mensagem_texto`), mesma disciplina já aplicada nas outras
  ferramentas depois de bugs parecidos nas demandas 296/297.
- Testes realizados e resultado, todos reais via webhook (telefone/nome reais do Edvam, disciplina
  283/291): **Alto Toque via gate novo**: "preciso montar meu curriculo, voces fazem?" escalou
  ("Chamando a equipe"); confirmado no log de execução que nem o node do agente nem o node do
  Gemini rodaram (`AI Agent Caminho C` e `Google Gemini Chat Model` ausentes do `runData`) - prova
  direta de que a decisão foi 100% do gate de código, não julgamento da IA, diferente do teste da
  297 (mesmo resultado pro cliente, garantia estrutural diferente por trás). **Gap "conta gov"
  (278)**: "preciso de ajuda pra acessar minha conta gov" também escalou via gate, mesma prova
  (agente não rodou). **Regressão de Dizu corrigida, testada**: "voces vendem marmita hoje?"
  voltou a escalar com "Chamando a equipe" sem explicar o motivo, confirmado `is_dizu: true` e
  agente não rodando. **Regressão geral**: preço real (XEROX COLORIDA A4, R$ 1,20) e pergunta
  institucional (horário real) continuam funcionando normalmente depois de todas as mudanças.
- Achados fora do escopo (relatados, não resolvidos por conta própria): nenhum novo além dos já
  relatados e corrigidos no próprio processo desta demanda (as 2 regressões acima já foram
  resolvidas, não ficaram como achado pendente).
- `jsgrafica_contatos` conferido intacto (Ninho, sem alteração) e `206` conferido intacto
  (`versionId` idêntico ao de sempre nesta sessão, 91 nodes, ativo) ao final. Sessão de teste
  apagada, nenhum pedido de teste criado nesta demanda.
- Status final: concluída. Gate determinístico de Alto Toque construído (mesmo padrão do Dizu),
  conectado no workflow do agente antes de qualquer processamento da IA, testado com caso real de
  currículo e com o gap "conta gov" da 278, confirmado com evidência de execução que a IA não
  participa mais dessa decisão. 2 regressões reais achadas no próprio processo de integração
  (config de envio não disponível nos caminhos de escalação; detecção de Dizu quebrada por
  referência implícita) foram corrigidas e testadas antes de fechar, não deixadas como achado.
