# Caminho C: contrato técnico exato de cada ferramenta

Executado por: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA
Data: 2026-08-17 (demanda 295). Nota de status: 2026-08-27.

## Nota de status (2026-08-27, atualização depois de ficar sem contato com o projeto por dias)

**Este contrato foi implementado e está rodando em produção real**, não é mais só desenho. Linha
do tempo confirmada (arquivos de demanda lidos diretamente, não só resumo de terceiros):
demanda 296 (2026-08-17) construiu as 6 ferramentas + pré-passo + trava Dizu exatamente como este
contrato descreve, testadas isoladas; demanda 297 construiu o workflow do agente
(`@n8n/n8n-nodes-langchain.agent`); demanda 298 rodou teste adversarial (achou e fechou 1
vazamento real de prompt); **demanda 299 (2026-08-18) conectou o agente novo no roteamento real do
`01`, no lugar do `206`**, que ficou congelado sem tráfego. Piloto rodando desde então pra
whitelist de teste (ainda sem cliente real), com várias rodadas de correção de bug real ao vivo
(300-325, inclusive hoje, 27/08, por causa da Zu/Gabi entrando de férias).

**Correções confirmadas em relação ao que este documento previa**:
- **`gerar_cobranca_pix` existe de verdade agora** (via `POST /api/mercadopago/cobranca`,
  `criarCobrancaPix`), inclusive testado com Pix real de R$1,20. A seção 3 abaixo ainda registra
  corretamente que o `206` NUNCA teve isso, esse achado histórico continua válido, só não é mais a
  situação atual do sistema que roda de verdade.
- **Decisão tomada sobre o ponto em aberto da seção 3** (Mercado Pago não responder a tempo): o
  Edvam decidiu escalar pra equipe, nunca cair pra chave Pix estática. Implementado assim.
- **Achado real de desconto de volume (seção 1) foi confirmado em produção**: teste real com Xerox
  qtd 60 aplicou os 10% corretamente.
- Achados novos que a implementação (296) trouxe, não previstos aqui: bug real de
  `JSON.stringify()` gravando STRING em vez de objeto em campo jsonb (nos nodes `Escalar - *` do
  `206`, não só nas ferramentas novas, candidato a impacto silencioso não investigado a fundo);
  inconsistência de nomenclatura entre a seção 4 e a seção 6 deste contrato pros motivos de
  cancelamento (`devolucao`/`cancelamento_pos_entrega` vs. `cancelamento_pago`/
  `cancelamento_entregue`, implementado com os nomes da seção 6); filtro de dado sensível
  "mensagens Alto Toque não entram no contexto" (seção 2) não pôde ser implementado por mensagem
  (só existe classificação por sessão inteira hoje), registrado como gap real, não resolvido.

**Não verifiquei pessoalmente as demandas 300-325 uma a uma nesta atualização** (fiquei sem
contato com o projeto por dias, retomando agora), confirmei que os arquivos existem de verdade e
li 296/299/316 direto na fonte antes de atualizar este documento, o resto vem de resumo de outra
sessão que estava acompanhando o piloto ao vivo, não presumido nem inventado por mim. Pra detalhe
fino de 300-325, ler os arquivos de demanda diretamente, não confiar só nesta nota.

Este documento continua valendo como REGISTRO DO CONTRATO ORIGINAL (o "porquê" de cada decisão de
segurança), não foi reescrito por baixo. Onde a implementação real divergiu ou achou algo novo,
está anotado acima, não escondido.

---

Isto é contrato técnico, não código. Pronto pra virar implementação (demanda 296) sem nenhuma
decisão de segurança nova sendo tomada no meio do caminho. Documento novo, referencia mas não
edita `analise-arquitetura-atendimento-humanizado-vs-estruturado.md` (demanda 292),
`caminho-c-fronteira-ia-automacao-equipe.md` (demanda 293) nem o blueprint congelado do `206`.

**Metodologia**: cada função/tabela/coluna citada aqui foi conferida direto no código real
(`lib/pedidos.ts`, `lib/mercadopago.ts`, `app/api/pedidos/calcular-valor/route.ts`) ou no JSON do
workflow `206` já consultado em demandas anteriores desta sessão, não redigitada de memória. Onde
não há certeza, está marcado como tal, não escondido.

---

## 0. Decisões estruturais desta demanda (antes do contrato de cada ferramenta)

### 0.1. `checar_sessao_pedido_ativa` + `buscar_contexto_conversa_recente`: nem 1 chamada, nem 2, viram pré-passo de código

A demanda 293 (seção 3) já tinha dito que as duas são pré-condição automática, nunca decisão da
IA. Descendo ao nível de contrato, a decisão mais precisa não é "1 tool ou 2 tools", é: **nenhuma
das duas deve ser modelada como function-calling que a IA decide invocar**. Se é sempre
obrigatório, chamado sempre no mesmo momento, nunca discricionário, virar uma ferramenta que a IA
"escolhe chamar" só desperdiça 1 rodada de LLM e cria um risco desnecessário (por menor que seja,
a chance de a IA "esquecer" de chamar algo que deveria ser automático). A solução mais segura e
mais barata: **1 pré-passo de código no workflow, executado ANTES de invocar o node do agente**,
que busca as duas coisas juntas e injeta o resultado no prompt/contexto inicial da conversa.
Nome: `carregar_contexto_atendimento` (não é tool do agente, é function/node do workflow).
Justificativa completa e contrato na seção 2.

### 0.2. Onde vive a trava Dizu: nos 2 lugares, defesa em profundidade

A demanda 292 (seção 7.4) já exigia que a trava ficasse "impossível de contornar por engano de
roteamento". Resposta exata: **vive em 2 lugares ao mesmo tempo, não 1**:
1. **Gate de pré-turno, código, antes do agente processar livremente** (mesmo padrão do `Filtro
   Dizu`/`É Dizu?` do `206` hoje): se a mensagem bater o padrão, desvia direto pra escalação, a IA
   nem chega a raciocinar sobre ela.
2. **Validação embutida dentro de `criar_pedido_aguardando_aprovacao`** (seção 4.2): recusa gravar
   se a sessão associada estiver marcada como Dizu, mesmo que o gate de pré-turno tenha sido
   contornado por algum bug futuro ainda não previsto (o mesmo tipo de lacuna que já aconteceu 6
   vezes em 1 dia, demandas 279-289, sempre é uma interação nova que ninguém previu).

Não escolher só 1 dos 2 lugares é deliberado: o gate de pré-turno é mais barato (evita gastar
raciocínio de IA à toa), a validação na ferramenta é a garantia que não pode ser contornada.

### 0.3. Contagem final de ferramentas, reconciliada

A tabela da demanda 292 (seção 7.3) listava 9 linhas. Descendo ao contrato: **6 ferramentas de
function-calling de verdade** (a IA decide chamar), **1 pré-passo de código** (não é tool, seção
0.1), **1 gatilho de evento externo** (não é tool que a IA decide chamar, é disparado pelo
sistema), **1 trava embutida em 2 lugares** (não é ferramenta separada). Nada foi removido de
cobertura, só reclassificado com mais precisão:

| # | Nome | Tipo |
|---|---|---|
| 1 | `consultar_preco_produto` | Tool (IA decide chamar) |
| 2 | `criar_pedido_aguardando_aprovacao` | Tool (IA decide chamar) |
| 3 | `gerar_cobranca_pix` | Tool (IA decide chamar) |
| 4 | `processar_cancelamento` | Tool (IA decide chamar) |
| 5 | `escalar_para_humano` | Tool (IA decide chamar) |
| 6 | `confirmar_pagamento_recebido` | Gatilho de evento externo, não é a IA que decide |
| 7 | `carregar_contexto_atendimento` | Pré-passo de código, sempre roda, não é tool |
| 8 | Trava Dizu | Validação embutida em 2 lugares, não é ferramenta separada |

---

## 1. `consultar_preco_produto`

**Parâmetros de entrada**: `produto_nome_ou_id` (string, obrigatório), `quantidade` (inteiro,
obrigatório, mínimo 1).

**SEMPRE recalcula da fonte real, nunca aceita da IA**: preço unitário e valor final. Não existe
parâmetro de entrada pra valor, é fisicamente impossível a IA "passar" um preço pra esta
ferramenta.

**Lógica real reaproveitada, achado desta demanda (regra de desconto que não estava documentada
antes)**: consulta `jsgrafica_produtos` (`id, nome, categoria, preco`), deriva o grupo de desconto
via `CATEGORIA_PARA_GRUPO[categoria]` e chama `calcularValorPedido(preco, quantidade, grupo)`
(`lib/pedidos.ts`), a mesma função já usada em `app/api/pedidos/calcular-valor/route.ts`. Essa
função aplica **10% de desconto quando quantidade >= 50 em categorias dos grupos `Xerox`/
`Impressão`** (`GRUPOS_COM_DESCONTO_VOLUME`, `QUANTIDADE_MINIMA_DESCONTO`, `DESCONTO_VOLUME_PCT`,
constantes reais do arquivo). Isso não estava mapeado nas demandas 292/293, é um achado real desta
demanda: a ferramenta de preço precisa saber calcular desconto de volume, não é só lookup de preço
fixo.

**Retorno de sucesso**: `{ encontrado: true, produto_id, produto_nome, valor_unitario,
quantidade, desconto_pct, valor_final, frase_pronta }`, onde `frase_pronta` já vem formatada tipo
`"IMPRESSÃO P&B A4, R$ 1,20"` (princípio da demanda 292, seção 7.4b, reduz risco de a IA
reescrever/errar a transcrição do valor).

**Casos de erro/borda**:
- Produto não encontrado: `{ encontrado: false }`. A IA deve tratar como "ainda não sei cotar
  isso", nunca inventar um valor aproximado.
- `preco` nulo no catálogo: mesmo tratamento de erro já existente em `calcular-valor/route.ts`
  hoje (recusa, não estima).
- Produto do tipo "sob encomenda"/personalizado (achado, ver nota abaixo): a ferramenta ainda
  devolve o preço se existir no catálogo, mas a decisão de quando NÃO chamar esta ferramenta (indo
  direto pra `escalar_para_humano` ou pra pergunta de esclarecimento) é do prompt/régua de tom
  (291), não desta ferramenta.

**Nota importante, cruzando com o achado da demanda 255/blueprint**: produto sob encomenda
(adesivo com corte, personalizado, plastificação) hoje, no `206`, nunca chega a ter proposta
automática (`Produto Detectado Tem Sinal?` exclui esses itens de propósito, caem no fallback de
lista/escalação). O contrato desta ferramenta não muda esse comportamento, só formaliza: nada
impede a ferramenta de ser chamada pra um item sob encomenda (ela vai devolver o preço de tabela
se existir), mas o prompt/régua decide se USA esse resultado direto ou se prefere confirmar por
Pix sem falar o valor (Exemplo 5b do blueprint, Rafaela/adesivo), comportamento de conversa, não
de ferramenta.

**Código/tabela reaproveitado**: `jsgrafica_produtos` (colunas `id, nome, categoria, preco`,
confirmadas em `app/api/pedidos/calcular-valor/route.ts`), `calcularValorPedido()`,
`GRUPOS_COM_DESCONTO_VOLUME`, `QUANTIDADE_MINIMA_DESCONTO`, `DESCONTO_VOLUME_PCT`,
`CATEGORIA_PARA_GRUPO` (`lib/pedidos.ts` + `app/api/pedidos/calcular-valor/route.ts`).

---

## 2. `carregar_contexto_atendimento` (pré-passo, não é tool da IA, ver seção 0.1)

**Quando roda**: sempre, automaticamente, antes de o node do agente processar qualquer mensagem
nova, mídia ou texto, com sessão ativa ou não.

**O que busca, combinando as 2 peças que a 293 tinha separado**:
1. **Sessão de pedido ativa**: mesma consulta de hoje (`GET Sessão Ativa`/`Tem Sessão?`,
   `jsgrafica_agente_teste_sessoes` ou sua sucessora no Caminho C).
2. **Contexto de conversa recente** (mecanismo desenhado na demanda 291): até 8 mensagens ou 7
   dias do mesmo telefone, `jsgrafica_log_msgs_privadas`, filtro de dado sensível (mensagens já
   classificadas Alto Toque nunca entram).

**Achado desta demanda: o mecanismo de diferenciação IA/equipe da 293 está obsoleto, substituído
por dado real**. A 293 tinha proposto um contorno (o agente mantém o próprio histórico e infere
por eliminação o que sobra é de humano) porque, na época, não existia coluna de origem no banco.
A demanda 294 fechou isso de verdade: `jsgrafica_log_msgs_privadas.enviado_por` (`ia`/`equipe`/
`sistema`) existe e está confirmado funcionando nos 3 caminhos, testado com mensagem real,
sobrevivendo ao eco do workflow `01`. **Esta ferramenta usa a coluna real, não o contorno por
inferência da 293**, mais simples e mais confiável, exatamente como a própria 294 recomendava.

**Retorno**:
```
{
  sessao_ativa: { ... } | null,
  contexto_recente: [
    { texto, quando, origem: 'ia' | 'equipe' | 'sistema' | 'cliente' }
    ...
  ],
  ultima_interacao_foi_escalada: true | false
}
```
`ultima_interacao_foi_escalada` é o sinal explícito pros 3 cenários de retomada da demanda 293
(seção 5): se `true`, a IA sabe que precisa tratar a mensagem nova como possível reabertura pós-
humano, não presumir continuidade automática.

**Casos de erro**: se a consulta falhar (banco fora do ar), a ferramenta devolve contexto vazio
(`sessao_ativa: null, contexto_recente: []`) e um campo `erro_ao_carregar: true`, o prompt deve
tratar isso como "sem contexto, ser mais cauteloso", nunca travar a conversa inteira por causa de
uma falha de leitura.

**Código/tabela reaproveitado**: `jsgrafica_agente_teste_sessoes` (ou sucessora),
`jsgrafica_log_msgs_privadas` + coluna `enviado_por` (demanda 294, real). Mesma janela de 8
mensagens/7 dias desenhada na demanda 291, sem mudança de escopo.

---

## 3. `gerar_cobranca_pix`

**Achado mais importante desta ferramenta, desta demanda**: **o `206` de hoje não gera Pix
nenhum**. Conferido direto no JSON do workflow: depois que o cliente confirma a proposta
(`Confirma Proposta?`), o fluxo vai direto pra `Criar Pedido Aguardando Aprovação` e manda "Show,
já registrei aqui! ... Só aguardar a equipe confirmar", sem nenhum código Pix. O texto de Pix
copia-e-cola do Exemplo 1 do blueprint é uma proposta de desenho, não algo já implementado no
`206` real. **O precedente real desta ferramenta não é o `206`, é o fluxo do APP** (PDV/Inbox
manual), que já gera Pix dinâmico de verdade via Mercado Pago. Isso não estava dito com clareza em
nenhuma demanda anterior, registrado aqui, não escondido.

**Parâmetros de entrada**: `pedido_id` (obrigatório). **Nunca aceita `valor`** como parâmetro.

**SEMPRE recalcula da fonte real**: lê o `valor_final` já gravado no pedido (criado por
`criar_pedido_aguardando_aprovacao`, seção 4), chama `criarCobrancaPix({ valor, externalReference:
pedido_id, telefone })` (`lib/mercadopago.ts`, função real, já em produção no fluxo manual).
Idempotente por natureza (`X-Idempotency-Key: pix-${externalReference}`, real, confirmado no
código): chamar 2x pro mesmo pedido não cria 2 cobranças.

**Retorno de sucesso**: `{ copia_e_cola, expira_em, frase_pronta }`, onde `frase_pronta` reaproveita
`montarTrechoPix()` (`lib/pedidos.ts`, real) pra montar o texto exatamente igual ao que o cliente
já recebe hoje no fluxo manual (`"Pix copia e cola (válido por 24h): ... Assim que o pagamento
cair, a gente avisa por aqui 😊"`).

**Casos de erro, com base no código real**:
- `criarCobrancaPix` pode demorar até ~11s (8 tentativas de polling, `MAX_TENTATIVAS`/
  `INTERVALO_MS`, reais) esperando o objeto do Mercado Pago ficar pronto (o texto copia e cola sai
  desse objeto, nunca é mandada imagem/QR pro cliente, só o texto), e pode lançar erro se estourar
  esse tempo.
  **Decisão do Edvam (2026-08-17)**: se o Pix não vier a tempo (timeout de ~11s) ou o Mercado Pago
  responder com erro, a ferramenta **escala pra equipe**, nunca cai pra chave Pix estática. Motivo
  explícito: o Edvam quer o Pix sempre gerado automático e vinculado ao pedido real; a chave
  estática funcionaria mas perde a confirmação automática de pagamento depois, então só entra
  equipe se o caminho automático realmente falhar, não como atalho padrão.
- Mercado Pago fora do ar / erro de API: mesmo comportamento acima, escala pra equipe.
- `pedido_id` não encontrado ou não pertence ao telefone da conversa: erro, nunca gera cobrança
  pra pedido de outro cliente.

**Código reaproveitado**: `criarCobrancaPix()` (`lib/mercadopago.ts`), `montarTrechoPix()`
(`lib/pedidos.ts`).

---

## 4. `criar_pedido_aguardando_aprovacao`

**Parâmetros de entrada**: `telefone` (obrigatório), `produto_id` (obrigatório, nunca nome livre
sem resolver contra o catálogo antes), `quantidade` (obrigatório). **Nunca aceita
`valor_unitario`/`valor_total`/`valor_final`** como parâmetro, mesmo que a conversa já tenha
mencionado um número.

**SEMPRE recalcula da fonte real**: roda a MESMA lógica de `consultar_preco_produto` (seção 1)
internamente antes de gravar, nunca confia num valor que a IA tenha citado antes na conversa,
mesmo que tenha vindo de uma chamada real de `consultar_preco_produto` momentos atrás (recalcula
de novo, preço pode ter mudado entre 1 chamada e outra, mesmo que improvável).

**Trava Dizu embutida (camada 2 de defesa, seção 0.2)**: recusa gravar se a sessão associada
estiver marcada como conversa Dizu.

**Trava de duplicidade**: recusa se já existir pedido `aguardando_aprovacao` (ou sessão ativa) pro
mesmo telefone, revalida isso de novo aqui, não confia só no que `carregar_contexto_atendimento`
trouxe no início do turno (pode ter mudado entre o início do turno e agora).

**Grava em `jsgrafica_pedidos`**: `telefone, servico_id, servico_nome, quantidade,
valor_unitario, valor_total, valor_final, status='aguardando_aprovacao', pedido_criado_por,
origem_conversa, session_id`, mesmas colunas já usadas por `Criar Pedido Aguardando Aprovação`
(n36) no `206` hoje. `pedido_criado_por` deve identificar o Caminho C especificamente (valor novo,
não reaproveitar `'agente_teste_206'`), pra manter rastreabilidade de qual sistema criou cada
pedido.

**Retorno de sucesso**: `{ pedido_id, servico_nome, valor_final, frase_pronta }`, `frase_pronta`
reaproveitando `montarMensagensConfirmacaoPedido()` (`lib/pedidos.ts`, real).

**Casos de erro**: telefone não autorizado (checagem de whitelist, mesma trava de hoje), Dizu
detectado, sessão duplicada, produto não encontrado, quantidade inválida (zero ou negativa).

**Código/tabela reaproveitado**: `Criar Pedido Aguardando Aprovação` (n36 do `206`), schema de
`jsgrafica_pedidos`, `montarMensagensConfirmacaoPedido()` (`lib/pedidos.ts`).

---

## 5. `processar_cancelamento`

**Parâmetros de entrada**: `pedido_id` (obrigatório), `telefone` (obrigatório, pra checagem de
posse).

**SEMPRE recalcula da fonte real**: consulta o `status` real do pedido no banco, decide a régua
internamente (nunca é a IA que decide qual das 3 situações se aplica):
- Não pago → `status='cancelado'` direto.
- Já pago → NÃO cancela sozinho, marca sessão `escalada` com motivo `devolucao`.
- Já entregue → marca sessão `escalada` com motivo `cancelamento_pos_entrega` (fila do Admin,
  não a fila geral, régua já desenhada nas demandas 259/291).

**Retorno**: `{ resultado: 'cancelado' | 'escalado_devolucao' | 'escalado_admin', frase_pronta }`,
reaproveitando as 3 frases já desenhadas no blueprint (Exemplo 6): `"Sem problemas, cancelado!
😊"` / `"Você já pagou esse. Vou pedir pra equipe processar a devolução"` / `"Esse já foi
entregue. Vou verificar e te aviso"`.

**Casos de erro**: pedido não encontrado; pedido não pertence ao telefone que está pedindo
cancelamento (checagem de segurança NOVA em relação a hoje, porque hoje cancelamento sempre passa
por humano lendo a conversa inteira, aqui precisa ser explícita).

**Código/tabela reaproveitado**: régua de 3 situações já desenhada nas demandas 259/291 (Exemplo
6 do blueprint), schema de `jsgrafica_pedidos.status`.

---

## 6. `escalar_para_humano`

**Parâmetros de entrada**: `telefone` (obrigatório), `motivo` (obrigatório, valor de um conjunto
fechado, não string livre): `dizu`, `alto_toque`, `negociacao_pagamento`, `ambiguo_nao_resolvido`,
`proposta_negada`, `timeout`, `nao_entendido`, `cancelamento_pago`, `cancelamento_entregue`,
`outro`. Conjunto fechado, não texto livre, pra manter os relatórios/auditoria consistentes com o
que já existe hoje (as 9 variantes de `Escalar - *`).

**SEMPRE**: marca sessão como `escalada`, grava `motivo_escalonamento`, **nunca manda mais
nenhuma mensagem automática depois desta** (mesma trava de hoje, sem exceção).

**Retorno**: `{ ok: true, frase_pronta }`. Frase varia pouco por motivo (a maioria usa "Chamando a
equipe", reaproveitando o padrão real já testado no `206`); Dizu especificamente NUNCA explica o
motivo pro cliente (mantém a correção da demanda 246, nunca afirma "número errado").

**Casos de erro**: telefone sem sessão pra escalar (ainda assim registra o evento, não falha
silenciosamente).

**Código reaproveitado**: generaliza as 9 variantes de `Escalar - *` do `206` hoje (`Cancelar`,
`Negociação Pagamento`, `Serviço Alto Toque`, `Ambíguo Não Identificado`, `Arquivo Com Problema`,
`Proposta Negada`, `Timeout P90`, `Sem Vocabulário Técnico`, `Dizu`) numa ferramenta parametrizada
só, mesmo princípio já proposto na demanda 292 (seção 7.3).

---

## 7. `confirmar_pagamento_recebido` (gatilho de evento externo, não é a IA que decide chamar)

**Quando dispara**: evento do sistema (webhook do Mercado Pago, polling de reforço, ou poll do
balcão), nunca uma decisão conversacional da IA. `confirmarPedidosPagosPorOrder()`
(`lib/mercadopago.ts`, real) já faz essa detecção hoje.

**Parâmetros de entrada**: `pedido_id`(s) do(s) pedido(s) que acabaram de ser confirmados como
pagos pelo evento.

**SEMPRE recalcula da fonte real**: valor final real do(s) pedido(s), nunca aceita valor externo.

**Retorno**: rascunho de mensagem via `montarMensagemPagamentoConfirmado()` (`lib/pedidos.ts`,
real, texto literal já usado hoje: `"✅ Recebemos seu pagamento! 😊 ... Já vamos começar a
produção."`). **Nunca enviado sozinho**, fica pronto pro Admin mandar com 1 clique, mesma decisão
já tomada e mantida em todas as revisões anteriores do blueprint (`CLAUDE.md`: sem auto-resposta
automática).

**Código/tabela reaproveitado**: `confirmarPedidosPagosPorOrder()`
(`lib/mercadopago.ts`), `montarMensagemPagamentoConfirmado()` (`lib/pedidos.ts`).

---

## 8. Confirmação: nenhuma mensagem EVIDÊNCIA DIRETA do blueprint fica sem ferramenta correspondente

Reconferida a tabela de verificação do blueprint (`blueprint-conversas-exemplo-agente.md`, 30
linhas), cada mensagem hoje classificada EVIDÊNCIA DIRETA mapeia pra 1 dos 3 lugares abaixo, nenhuma
fica órfã:

| Mensagem EVIDÊNCIA DIRETA do blueprint | Onde vive no Caminho C |
|---|---|
| Texto do Pix completo | `gerar_cobranca_pix`, `frase_pronta` |
| "✅ Recebemos seu pagamento!..." | `confirmar_pagamento_recebido`, `frase_pronta` |
| "Valor impressão 1,20." | `consultar_preco_produto`, `frase_pronta` |
| "recebido, assim que sair do corte..." (Rafaela, adesivo sob encomenda) | Não é ferramenta de preço automático (item sob encomenda, mesmo comportamento de hoje), fica a critério da régua de tom (291) mandar o Pix sem falar valor, ou `escalar_para_humano` |
| Jamilly, currículo (dado pessoal) | `escalar_para_humano`, motivo `alto_toque` |
| "Obrigado! 😉"/"😊", "É xerox" aceito sem correção | Não são ferramenta, são tom/vocabulário (régua da demanda 291, prompt de sistema, não function-calling) |
| "Bom dia vai ser que tipo de papel" (pergunta de esclarecimento) | Não é ferramenta, é "IA sozinha" (demanda 293, seção 2) |

Nenhuma garantia de segurança (valor, Pix, confirmação de pagamento) fica sem ferramenta
determinística por trás. As únicas mensagens sem ferramenta são exatamente as que a demanda 293 já
tinha definido como "IA sozinha" ou tom/registro, nunca as que envolvem número ou compromisso.

## Honesto sobre os limites deste contrato

- ~~O comportamento de `gerar_cobranca_pix` quando o Mercado Pago não responde a tempo~~ **Resolvido
  em 2026-08-17**: escala pra equipe, nunca cai pra chave estática (decisão do Edvam, motivo e
  detalhe na seção 3).
- `pedido_criado_por` precisa de um valor novo específico do Caminho C (não reaproveitar
  `'agente_teste_206'`), o valor exato fica pra implementação decidir, não é decisão de contrato.
- Este documento não testa nada, é especificação. Nenhum número aqui (ex. tempo de resposta do
  Mercado Pago) foi remedido nesta demanda, são valores lidos direto do código-fonte real.

## Referências

Demanda 292 (`analise-arquitetura-atendimento-humanizado-vs-estruturado.md`, seção 7.3, tabela de
ferramentas original; seção 7.4, mitigações de risco incorporadas aqui). Demanda 293
(`caminho-c-fronteira-ia-automacao-equipe.md`, seção 3, critério de acionamento; seção 5, cenários
de retomada; seção 6, mecanismo de contexto, atualizado aqui com a coluna real da 294). Demanda 294
(`coluna-enviado-por-origem-mensagem.md`, coluna `enviado_por` real, substitui o contorno por
inferência da 293). Demanda 291 (régua de tom, janela de contexto recente). `lib/pedidos.ts`,
`lib/mercadopago.ts`, `app/api/pedidos/calcular-valor/route.ts` (código real conferido nesta
demanda, fonte de todo o contrato de preço/Pix/confirmação). `blueprint-conversas-exemplo-
agente.md` (tabela de verificação, congelado, só consulta).
