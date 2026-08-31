# 295 - Caminho C, passo 1: contrato exato de cada ferramenta

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-17
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA

## Contexto
Demanda 292 mapeou as 9 ferramentas do Caminho C (tabela da seção 7.3) contra o que já existe
hoje em código, e a demanda 293 definiu o critério objetivo de quando cada uma é acionada (seção
3) mais a régua de escalação em 2 camadas (seção 4). As duas são desenho, não especificação
técnica pronta pra codar. Esta é a primeira demanda da sequência de implementação real (seção 7.7
da análise, itens 1-6), primeiro passo antes de qualquer código.

Sem um contrato exato, quem construir a ferramenta (demanda 296) tem que tomar decisão de
segurança sozinho, no meio do código, sob pressão de "fazer funcionar" - exatamente o tipo de
lacuna que já causou os 6 bugs reais do dia 279-289. O contrato existe pra fechar essa decisão
antes, com calma, não durante a implementação.

## Objetivo
Um documento técnico com o contrato completo de cada uma das 9 ferramentas do Caminho C mais a
trava Dizu, pronto pra virar código sem nenhuma decisão de segurança nova precisar ser tomada
durante a implementação.

## Escopo
- Incluído: para cada uma das 9 ferramentas da tabela da demanda 292 (seção 7.3) - `consultar_preco_produto`,
  `checar_sessao_pedido_ativa`, `criar_pedido_aguardando_aprovacao`, `gerar_cobranca_pix`,
  `escalar_para_humano`, `processar_cancelamento`, `confirmar_pagamento_recebido`,
  `buscar_contexto_conversa_recente`, mais a trava Dizu (validação embutida, não ferramenta
  separada) - definir:
  - Nome exato (usado no schema de function calling do agente).
  - Parâmetros de entrada aceitos, com tipo e obrigatoriedade.
  - O que a ferramenta SEMPRE recalcula da fonte real (nunca aceita da IA como parâmetro) - esta é
    a linha mais importante do contrato, tem que ficar impossível de mal-entender.
  - Formato exato do retorno, incluindo o caso de sucesso já formatado como texto pronto pra
    conversa quando fizer sentido (princípio da demanda 292, seção 7.4b: reduz a chance de a IA
    reescrever/errar um valor ao transcrever).
  - O que a ferramenta faz em cada caso de erro/borda (produto não encontrado, sessão já existe,
    cancelamento de pedido pago, telefone não autorizado) - nunca falha silenciosamente.
  - Qual código/tabela/endpoint real de hoje ela reaproveita (coluna já existe na tabela da 292,
    conferir e detalhar, não redigitar de memória).
- Incluído: revisar se o número de 9 ferramentas continua certo agora que se desce ao nível de
  contrato - por exemplo, checar se `checar_sessao_pedido_ativa` e `buscar_contexto_conversa_recente`
  (as duas pré-condições automáticas, não a critério da IA, segundo a tabela da 293 seção 3) devem
  ser 1 chamada combinada ou 2 chamadas separadas, decisão técnica que a 293 deixou em aberto.
- Incluído: para a trava Dizu, definir exatamente ONDE ela vive (dentro de
  `criar_pedido_aguardando_aprovacao`, ou como checagem de pré-turno separada, ou as duas) -
  a demanda 292 já disse que precisa ficar "impossível de contornar por engano de roteamento",
  esta demanda decide a forma exata disso.
- Incluído: reconferir a tabela de verificação do blueprint (`blueprint-conversas-exemplo-agente.md`)
  pra confirmar que nenhuma mensagem hoje classificada como EVIDÊNCIA DIRETA (valor, Pix,
  confirmação) fica sem ferramenta correspondente no contrato novo.
- Explicitamente fora de escopo: escrever código de qualquer ferramenta (é a demanda 296), prompt
  final do agente (é a demanda 297), qualquer teste com mensagem real ou sintética.

## Critérios de aceite
- [ ] Contrato completo das 9 ferramentas + trava Dizu, cada uma com nome, parâmetros, o que
      recalcula sempre, formato de retorno, casos de erro, e código/tabela real reaproveitado
- [ ] Decisão tomada e justificada sobre `checar_sessao_pedido_ativa` + `buscar_contexto_conversa_recente`
      serem 1 ou 2 chamadas
- [ ] Decisão tomada e justificada sobre onde exatamente vive a trava Dizu
- [ ] Confirmado, revisando a tabela de verificação do blueprint, que nenhuma mensagem hoje
      EVIDÊNCIA DIRETA fica sem ferramenta correspondente no contrato novo
- [ ] Documento novo em `pm/conhecimento/` (não editar o blueprint congelado nem os documentos da
      292/293, é um documento novo que os referencia)

## Riscos e cuidados
Se o contrato ficar vago exatamente no ponto "o que a ferramenta nunca aceita da IA", a
implementação (296) pode reabrir, sem perceber, o risco central que todo o Caminho C existe pra
fechar (IA inventando/repassando um valor errado que vira dado gravado). Este é o ponto que merece
mais cuidado desta demanda, não um detalhe entre outros.

## Referências
Demanda 292 (`analise-arquitetura-atendimento-humanizado-vs-estruturado.md`, seção 7.3, tabela de
ferramentas mapeadas; seção 7.4, mitigações de risco que o contrato precisa incorporar). Demanda
293 (`caminho-c-fronteira-ia-automacao-equipe.md`, seção 3, critério de acionamento de cada
ferramenta; seção 4, régua de escalação em 2 camadas). Demanda 291 (régua de tom, reaproveitada no
prompt, não nesta demanda). `blueprint-conversas-exemplo-agente.md` (tabela de verificação
evidência/hipótese, congelado, só consulta). `manual-resposta-ia-100-clientes.md` (Regra 5, risco
de valor não confirmado).

## Relato de execução
(preenchido pelo chat executor ao concluir - ver formato exato no briefing do seu chat em
`../equipe/`)

- O que foi feito: criado `pm/conhecimento/caminho-c-contrato-das-ferramentas.md`. Antes de
  escrever o contrato, fui direto no código-fonte real (`lib/pedidos.ts`, `lib/mercadopago.ts`,
  `app/api/pedidos/calcular-valor/route.ts`) em vez de reaproveitar só citação de memória de
  demandas anteriores, conforme a própria demanda pediu ("conferir e detalhar, não redigitar de
  memória"). Isso revelou 2 achados reais não mapeados antes:
  1. **Regra de desconto por volume que não estava documentada em nenhuma demanda anterior do
     Caminho C**: `calcularValorPedido()` aplica 10% de desconto pra quantidade >= 50 em
     categorias dos grupos Xerox/Impressão (`GRUPOS_COM_DESCONTO_VOLUME`,
     `QUANTIDADE_MINIMA_DESCONTO`, `DESCONTO_VOLUME_PCT`, constantes reais). Incorporado ao
     contrato de `consultar_preco_produto`.
  2. **O `206` de hoje não gera Pix nenhum** (conferido no JSON do workflow: depois de confirmar
     a proposta, vai direto pra criar o pedido e diz "aguarde a equipe", sem código Pix algum). O
     precedente real de `gerar_cobranca_pix` não é o `206`, é o fluxo do app
     (`criarCobrancaPix()`, `lib/mercadopago.ts`, real, com polling de até ~11s e idempotência por
     `externalReference`). Registrado com clareza no contrato, não escondido.
  Contrato completo escrito pras 6 ferramentas de function-calling reais (`consultar_preco_produto`,
  `criar_pedido_aguardando_aprovacao`, `gerar_cobranca_pix`, `processar_cancelamento`,
  `escalar_para_humano`), o gatilho de evento externo (`confirmar_pagamento_recebido`), e a trava
  Dizu, cada um com nome, parâmetros, o que sempre recalcula (nunca aceita da IA), formato de
  retorno com `frase_pronta`, casos de erro, e código/tabela real reaproveitado.

- Decisões estruturais tomadas (seção 0 do documento):
  1. `checar_sessao_pedido_ativa` + `buscar_contexto_conversa_recente` não viram "1 chamada
     combinada de tool", vão além do que a demanda perguntou: como as duas são sempre obrigatórias
     e nunca discricionárias, a resposta mais precisa é elas deixarem de ser function-calling da
     IA e virarem 1 pré-passo de código (`carregar_contexto_atendimento`), executado antes de o
     agente processar, resultado injetado no prompt. Justificado: modelar como "tool que a IA
     decide chamar" desperdiça 1 rodada de LLM pra algo que nunca é opcional.
  2. Trava Dizu vive em 2 lugares (gate de pré-turno + validação embutida em
     `criar_pedido_aguardando_aprovacao`), defesa em profundidade, não escolhido só 1 lugar.
  3. Contagem de ferramentas reconciliada com clareza: 6 tools reais + 1 pré-passo + 1 gatilho de
     evento + 1 trava embutida, nada perdido, só reclassificado com mais precisão que a tabela
     original da 292.
  4. `buscar_contexto_conversa_recente` (dentro do pré-passo) passa a usar a coluna real
     `enviado_por` (demanda 294, já implementada e testada), substituindo por completo o mecanismo
     de inferência por diff que a demanda 293 tinha proposto como contorno temporário.

- Testes realizados e resultado: não aplicável no sentido de execução (demanda de contrato
  técnico, sem código, conforme escopo explícito). Verificação feita: as 3 funções reais citadas
  (`calcularValorPedido`, `criarCobrancaPix`, `montarTrechoPix`/`montarMensagensConfirmacaoPedido`/
  `montarMensagemPagamentoConfirmado`, `confirmarPedidosPagosPorOrder`) foram lidas direto do
  arquivo fonte nesta sessão, não citadas de memória de demanda anterior; reconferida a tabela de
  verificação do blueprint (30 linhas) confirmando que toda mensagem EVIDÊNCIA DIRETA mapeia pra
  uma ferramenta, pra tom/registro, ou pra "IA sozinha" (seção 8 do documento novo), nenhuma
  órfã; busca literal por travessão no documento novo, 9 ocorrências corrigidas antes de
  considerar concluído.

- Achados fora do escopo (relatados, não resolvidos por conta própria):
  - O comportamento de `gerar_cobranca_pix` quando o Mercado Pago não responde a tempo (fallback
    pra chave estática vs. escalar) é um ponto genuinamente em aberto, não decidido por mim (seria
    decisão de produto, não técnica), registrado explicitamente como pendência pra demanda 296.
  - O valor exato de `pedido_criado_por` pro Caminho C (não pode reaproveitar
    `'agente_teste_206'`, precisa de identificador novo) fica pra implementação decidir, não é
    decisão de contrato.

- Status final: **concluída**. Os 5 critérios de aceite batidos: contrato completo das 9
  ferramentas/peças mapeadas na 292 (agora reclassificadas com precisão em 6 tools + pré-passo +
  gatilho + trava), cada uma com todos os campos pedidos; decisão tomada e justificada sobre
  `checar_sessao_pedido_ativa`/`buscar_contexto_conversa_recente` (viram pré-passo, não tool,
  justificativa além da pergunta original); decisão tomada e justificada sobre onde vive a trava
  Dizu (2 lugares, defesa em profundidade); confirmado que nenhuma mensagem EVIDÊNCIA DIRETA do
  blueprint fica sem ferramenta correspondente (tabela de reconciliação, seção 8); documento novo
  em `pm/conhecimento/`, blueprint congelado e documentos da 292/293 não editados, só referenciados.
