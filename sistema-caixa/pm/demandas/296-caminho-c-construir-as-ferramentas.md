# 296 - Caminho C, passo 2: construir as ferramentas, isoladas e testáveis

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-17
Concluída em: 2026-08-17
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Demanda 295 fecha o contrato exato de cada uma das 9 ferramentas do Caminho C mais a trava Dizu.
Esta demanda constrói cada uma delas, isoladas e testáveis por conta própria, ANTES de qualquer
agente de IA existir pra chamá-las (isso é o item 2 da sequência da demanda 292, seção 7.7:
"construir as ferramentas primeiro, isoladas e testáveis por conta própria, reaproveitando a
lógica já existente e testada, sem reescrever do zero o que já funciona, só encapsular como
tool chamável").

Não pode começar antes da 295 estar concluída - o contrato é o que evita decisão de segurança
sendo tomada no meio do código.

## Objetivo
As 9 ferramentas + trava Dizu existem como componentes chamáveis de verdade (sub-workflow n8n ou
endpoint HTTP, conforme o contrato da 295 definir), cada uma testável isoladamente, batendo
exatamente o contrato aprovado, sem nenhum agente de IA ainda conectado a elas.

## Escopo
- Incluído: implementar cada ferramenta exatamente conforme o contrato da demanda 295 (nome,
  parâmetros, o que recalcula sempre, formato de retorno, casos de erro).
- Incluído: reaproveitar a lógica e o dado que já existem e já são testados hoje (nodes do `206`,
  `lib/pedidos.ts`, tabelas Supabase reais) - encapsular como ferramenta chamável, não reescrever
  a lógica do zero. Onde uma ferramenta precisar de um endpoint que ainda não existe no app,
  sinalizar ao PM antes de criar endpoint novo (pode ser trabalho de 03-APP, não presumir sozinho).
- Incluído: testar cada ferramenta isoladamente (chamada direta, com dado de teste seguindo o
  template seguro da demanda 283, nunca dado sintético sem `chatLid`/nome real quando envolver
  contato), confirmando que ela nunca aceita um valor "da IA" como válido quando esse valor não
  bate com o que a fonte real diz - isto é, simular uma chamada com parâmetro divergente do banco
  de propósito, e confirmar que a ferramenta ignora o parâmetro e usa o dado real.
- Incluído: backup do `206` antes de qualquer leitura/reaproveitamento de node dele (mesma
  disciplina já usada nas demandas 274-294).
- Explicitamente fora de escopo: prompt do agente, workflow do agente em si, conectar qualquer
  ferramenta a um agente de IA, qualquer teste de conversa real.

## Critérios de aceite
- [ ] As 9 ferramentas + trava Dizu implementadas, cada uma batendo exatamente o contrato da 295
- [ ] Cada ferramenta testada isoladamente, com pelo menos 1 teste confirmando que ignora valor
      divergente e usa sempre o dado real recalculado
- [ ] Nenhuma lógica duplicada sem necessidade - onde o `206` já tem a lógica certa, a ferramenta
      reaproveita, não recria uma segunda fonte de verdade
- [ ] `jsgrafica_contatos` e o `206` conferidos intactos ao final (checklist da demanda 283)

## Riscos e cuidados
Reaproveitar sem duplicar exige cuidado: se a ferramenta nova e o `206` antigo (congelado, mas
ainda rodando em produção pra whitelist de teste) acabarem com 2 cópias divergentes da mesma
lógica (ex. cálculo de preço), uma correção futura pode ser aplicada só numa das duas sem
ninguém perceber. Preferir sempre que a ferramenta CHAME o mesmo código/endpoint que o `206` já
usa, em vez de copiar a lógica.

## Referências
Demanda 295 (contrato exato, pré-requisito direto desta demanda). Demanda 292 (seção 7.3, mapa de
cada ferramenta contra o código que já existe hoje). Demanda 283 (template seguro de teste,
disciplina de conferir `jsgrafica_contatos` antes/depois). Demanda 294 (achado de arquitetura:
`autoMapInputData` do `01` nunca sobrescreve chave nova, mesma disciplina de escrita segura se
alguma ferramenta gravar em `jsgrafica_log_msgs_privadas`).

## Relato de execução

- O que foi feito: backup do `206` antes de qualquer leitura (`pm/backups/206-jsgrafica-agente-
  fase-b_pre-demanda296_2026-08-17.json`, 91 nodes, confirmado intacto no final, mesmo
  `versionId`). Workflow novo criado no n8n, `296 - JSGRAFICA | CAMINHO C FERRAMENTAS (TESTE
  ISOLADO)` (id `aO6iktSzcYtVZ6B5`, ativo), 95 nodes, 1 webhook HTTP dedicado por ferramenta
  (nenhum agente de IA conectado, exatamente como pedido):
  - `consultar_preco_produto`: resolve produto por id exato primeiro, cai pra busca por nome
    (ilike) só se não achar (achado: os ids de `jsgrafica_produtos` são texto curto tipo
    `prod-052`, não UUID, como uma leitura anterior desta sessão tinha registrado por engano);
    chama o endpoint real `POST /api/pedidos/calcular-valor` (`calcularValorPedido` de
    `lib/pedidos.ts`) pro cálculo, nunca recalcula localmente.
  - `criar_pedido_aguardando_aprovacao`: checa whitelist, trava Dizu embutida (camada 2, ver
    abaixo), trava de duplicidade, chama a MESMA `consultar_preco_produto` internamente (via
    HTTP pro próprio webhook, não copia a lógica) antes de gravar em `jsgrafica_pedidos`,
    `pedido_criado_por='agente_caminho_c'` (valor novo, não reaproveita `'agente_teste_206'`),
    `forma_pagamento_escolhida='pix'` fixo (decisão de implementação: é o único caminho que este
    conjunto de ferramentas automatiza de ponta a ponta).
  - `gerar_cobranca_pix`: chama o endpoint real `POST /api/mercadopago/cobranca`
    (`criarCobrancaPix`, idempotente); se falhar ou não vier a tempo, escala pra equipe (nunca
    cai pra chave Pix estática), exatamente a decisão do Edvam de 2026-08-17 registrada no
    contrato.
  - `processar_cancelamento`: consulta `pagamento_confirmado`/`data_entregue_at` reais e decide a
    régua de 3 situações no próprio código (nunca a IA); não pago cancela direto reaproveitando
    `cancelarPedido()` via `PATCH /api/pedidos`; pago-não-entregue e entregue escalam pra sessão
    com motivo dedicado.
  - `escalar_para_humano`: 1 ferramenta parametrizada generalizando as 9 variantes `Escalar - *`
    do `206`, conjunto fechado de motivos validado antes de gravar.
  - `carregar_contexto_atendimento` (pré-passo de código, não é tool da IA): junta sessão
    ativa/`ultima_interacao_foi_escalada` + até 8 mensagens/7 dias de `jsgrafica_log_msgs_privadas`
    usando a coluna real `enviado_por` (294), como o contrato pedia.
  - Trava Dizu nos 2 lugares do contrato: gate de pré-turno standalone (mesma regex do `Filtro
    Dizu` do `206`, testável isolado) + validação embutida dentro de
    `criar_pedido_aguardando_aprovacao` (lê a sessão associada ao telefone, recusa gravar se
    `dados_extra.motivo_escalonamento==='dizu'`).
  - `confirmar_pagamento_recebido`: conferido no código, não precisou de nada novo: já é 100%
    implementado e testado em produção (`app/api/mercadopago/webhook/route.ts`, chama
    `confirmarPedidosPagosPorOrder`/`montarMensagemPagamentoConfirmado`, sempre rascunho, nunca
    envia sozinho). Só documentado aqui, não construído.

- Testes realizados e resultado: todas as 6 tools + gate Dizu + pré-passo testados isolados via
  chamada HTTP direta ao webhook (sem agente), incluindo pelo menos 1 caso adversarial por
  ferramenta com valor divergente (preço, valor final) injetado no corpo da requisição; em todos
  os casos a ferramenta ignorou o valor da chamada e usou o dado real recalculado (confirmado
  comparando o retorno com o preço de tabela e com a linha gravada no Supabase). `consultar_preco_
  produto`: por id, por nome, produto inexistente, desconto de volume real (Xerox qtd 60 → 10%).
  `criar_pedido_aguardando_aprovacao`: telefone não autorizado, duplicidade, trava Dizu bloqueando
  de verdade (sessão marcada Dizu → `dizu_bloqueado`), happy path com valor divergente ignorado.
  `gerar_cobranca_pix`: pedido inexistente, pedido sem Pix escolhido, geração REAL via Mercado
  Pago (Pix de R$1,20, copia-e-cola real, expira em 24h) com valor divergente ignorado,
  idempotência confirmada (2ª chamada devolve a mesma cobrança), falha forçada (venda sem valor)
  escalando pra equipe em vez de cair pra chave estática. `processar_cancelamento`: pedido
  inexistente, pedido de outro telefone, não pago → cancelado de verdade via `cancelarPedido()`,
  pago-não-entregue → escalado `cancelamento_pago`, pago-e-entregue → escalado
  `cancelamento_entregue`. `escalar_para_humano`: motivo inválido rejeitado, sessão nova criada,
  sessão existente atualizada (merge preservando `dados_extra` anterior). `carregar_contexto_
  atendimento`: telefone com sessão escalada + 8 mensagens reais recentes retornadas com origem
  certa (`ia`/`sistema`/`cliente`), entrada inválida devolvendo o fallback do contrato. Gate Dizu:
  frase real de Dizu Refeições detectada, frase neutra não detectada. 2 bugs de execução achados e
  corrigidos no próprio processo de teste (não sobraram no resultado final): n8n não executa nó
  seguinte quando uma consulta Supabase devolve 0 linhas (corrigido com `alwaysOutputData` em
  todo nó de leitura); grave `JSON.stringify(...)` num campo jsonb grava STRING, não objeto (ver
  achado abaixo). Checklist da 283 conferido ao final: `jsgrafica_contatos` intacto (contato do
  Ninho sem alteração), `206` intacto (91 nodes, mesmo `versionId` do backup pré-demanda). Toda
  sessão/pedido de teste (telefone `5521965185667`, `pedido_criado_por='agente_caminho_c'`)
  apagada do banco ao final, não só cancelada (inclui 2 linhas que tinham `pagamento_confirmado`
  forçado por SQL só pra testar a régua de cancelamento, que não podiam ficar reais no banco).

- Achados fora do escopo (relatados, não resolvidos por conta própria):
  1. **Bug real em produção, achado nesta demanda**: gravar um campo jsonb (`dados_extra`,
     `mensagens` de `jsgrafica_agente_teste_sessoes`) via `JSON.stringify(...)` como valor do
     campo (o padrão usado desde sempre nos nodes reais do `206`: `Escalar - Cancelar`, `Escalar
     - Timeout P90`, `Escalar Dizu - Atualizar Sessão`, `Escalar Dizu - Criar Sessão`, e
     provavelmente as outras variantes `Escalar - *` não inspecionadas uma a uma) grava uma
     STRING dentro da coluna, não um objeto (`jsonb_typeof` confirmado como `"string"` numa linha
     de teste antes da correção). Isso significa que `dados_extra.motivo_escalonamento` nunca foi
     lido como objeto de verdade em nenhum código que dependa disso funcionando no `206` real,
     candidato a impacto silencioso, precisa de investigação de quem lê esse campo hoje. Corrigido
     só na ferramenta nova (passando o objeto/array direto na expressão, sem `JSON.stringify`),
     `206` não tocado.
  2. `montarTrechoPix()` e o texto de `montarMensagensConfirmacaoPedido()` (`lib/pedidos.ts`) não
     são expostos por nenhum endpoint HTTP: `frase_pronta` de `gerar_cobranca_pix` e de
     `criar_pedido_aguardando_aprovacao` precisou reconstruir o MESMO texto como template dentro
     do n8n (2ª cópia da formatação, não do cálculo; valor/copia-e-cola continuam 100% vindo do
     endpoint real). Recomendo expor essas 2 funções via endpoint leve (trabalho de 03-APP) numa
     demanda futura pra eliminar essa duplicação de texto.
  3. Inconsistência dentro do próprio contrato da demanda 295: a seção 5
     (`processar_cancelamento`) cita os motivos de sessão como `devolucao`/
     `cancelamento_pos_entrega`, mas a seção 6 (`escalar_para_humano`) define o conjunto fechado
     como `cancelamento_pago`/`cancelamento_entregue`. Implementado usando os valores da seção 6
     (o conjunto fechado explícito, pensado pra auditoria consistente); contrato precisa de
     correção/confirmação pra não ficar com 2 nomenclaturas divergentes documentadas.
  4. O conjunto fechado de motivos de `escalar_para_humano` não tem valor dedicado pra "Pix
     indisponível/timeout" (o caso do item 3 do contrato, decisão do Edvam de escalar em vez de
     cair pra chave estática), usado `'outro'` como o mais próximo disponível. Recomendo um
     motivo novo dedicado (ex. `pix_indisponivel`) numa revisão futura do contrato.
  5. O filtro de dado sensível do contrato ("mensagens já classificadas Alto Toque nunca entram"
     no contexto recente) não pôde ser implementado: não existe hoje nenhuma coluna por-mensagem
     em `jsgrafica_log_msgs_privadas` com essa classificação (só existe no nível de sessão,
     `jsgrafica_agente_teste_sessoes.classificacao`). `carregar_contexto_atendimento` devolve as
     últimas 8 mensagens/7 dias sem esse filtro. Precisa de decisão de desenho: criar mecanismo
     por mensagem, ou aplicar o filtro no nível da sessão inteira.
  6. O fallback de erro de `carregar_contexto_atendimento` (`erro_ao_carregar: true` se o banco
     cair) só foi testado pro caso de entrada inválida, não dá pra simular com segurança uma
     queda real de conexão com o Supabase num teste isolado, e os nós de leitura desta lane não
     têm `continueOnFail` configurado, então uma falha de conexão real hoje derrubaria a execução
     em vez de cair no fallback. Documentado como limitação de teste, não como algo corrigido.

- Status final: concluída. As 6 ferramentas de function-calling + o pré-passo
  `carregar_contexto_atendimento` + o gatilho `confirmar_pagamento_recebido` (já existente,
  documentado) + a trava Dizu nos 2 lugares batem o contrato da demanda 295, testados isolados,
  sem nenhum agente de IA conectado (fora de escopo, intocado). 6 achados fora do escopo listados
  acima, nenhum bloqueia a 297 seguir em frente.
