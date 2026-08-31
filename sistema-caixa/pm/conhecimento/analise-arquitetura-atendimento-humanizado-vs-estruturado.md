# Análise: atendimento humanizado (IA livre) vs. fluxo estruturado (206)

Executado por: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA
Data: 2026-08-16 (demanda 290). Atualizado: 2026-08-16 (demanda 292, 3ª opção avaliada, ver seção
7, recomendação mudou).

Isto é uma análise, não um desenho de conversa nem uma implementação. Objetivo: dar ao Edvam
informação técnica real suficiente pra decidir entre reviver o `ATENDIMENTO_AI`, dar liberdade de
escrita pro `206`, um caminho híbrido, um agente com ferramentas travadas, ou nenhum por ora.

## Recomendação atual (atualizada na demanda 292, substitui a recomendação original da 290)

**Agente de IA com ferramentas travadas (Caminho C, seção 7), não mais o híbrido da 290.** O
Edvam apontou um problema estrutural real que a análise original não tinha pesado: o `206` tem 19
nodes IF encadeados decidindo a conversa inteira, e isso já gerou 6 bugs reais no mesmo dia
(demandas 279-289), a maioria do tipo "regra nova quebrando regra antiga sem ninguém prever".
Empilhar a camada de texto livre do híbrido (e o mecanismo de contexto da demanda 291) em cima
dessa árvore tende a piorar essa fragilidade, não resolver. O Caminho C troca a árvore de IFs por
raciocínio de IA decidindo o fluxo, com ferramentas de código puro garantindo preço/Pix/pedido/
confirmação (nunca a IA calculando ou inventando esses valores). Justificativa completa, mapa de
ferramentas, riscos com mitigação real, e nova sequência de demandas na seção 7. **A recomendação
original da 290 (híbrido) fica preservada abaixo como registro histórico do raciocínio até ali,
não é mais a recomendação vigente.**

---

## Recomendação original da demanda 290 (histórico, superada pela 292, ver seção 7)

**Caminho híbrido: manter o `206` como sistema único, adicionar uma camada de texto livre só nas
partes de baixo risco (saudação, transição, formulação da pergunta de triagem), mantendo preço,
Pix e confirmação de pedido 100% determinísticos, exatamente como hoje.** Não reviver o
`ATENDIMENTO_AI` agora. Justificativa completa nas seções abaixo; sequência de demandas sugerida
no fim (seção 6, também superada, ver seção 7 pra sequência atual).

---

## 1. Situação real de hoje (não redescoberta, citada dos achados de 274-289)

- O `01` já roteia telefone autorizado + mídia/texto de sessão nova pro `206` antes de qualquer
  checagem do `ATENDIMENTO_AI` (274/277/278/279). Os 2 sistemas competem hoje pelo mesmo tipo de
  mensagem, sem régua explícita além da ordem de checagem no código.
- `ATENDIMENTO_AI` tem 1 bug de infraestrutura real e não corrigido: `Postgres Chat Memory`
  (conexão Postgres direta, não REST) falha com `ENETUNREACH` (IPv6), derrubando o agente inteiro
  antes de gerar qualquer resposta (achado da 279, confirmado em execução real do n8n, não
  suposição).
- O prompt de sistema do `AI Agent1` (dentro do `ATENDIMENTO_AI`) tem 4 ocorrências de travessão,
  incluindo na descrição do próprio papel do agente ("Você é a porta de entrada, quando
  identificar o serviço, passa para o sistema de pedidos cuidar do restante") e em cabeçalhos de
  seção (achado da 286, não corrigido).
- O `ATENDIMENTO_AI` manda pedido identificado pro `06-PEDIDOS` (`HTTP Chamar 06-PEDIDOS`), cujos
  nós de envio de mensagem real estão `disabled: true` há semanas (achado de 2026-07-10). O
  `ATENDIMENTO_AI` nunca foi atualizado pra saber que o `206` existe, foi construído antes da Fase
  B. Isso significa que, mesmo corrigindo os 2 bugs acima, o `ATENDIMENTO_AI` hoje não tem NENHUMA
  ponte funcional pra fechar um pedido de verdade.
- O `206` propõe preço automático hoje só pra 1 produto (Impressão P&B A4, hardcoded em
  `GET Produto P&B A4`), confirmado nas demandas 277/289. Qualquer outro produto classificado
  corretamente como "documento óbvio" ainda não tem preço automático real.
- O motivo original de pausar o `ATENDIMENTO_AI` pro cliente foi risco de banimento do WhatsApp
  (`CLAUDE.md`), nunca reavaliado desde então. A Z-API (gateway usado pelos 2 sistemas) não é
  parceira oficial da Meta (achado da demanda 247, já documentado no blueprint), isso vale pra
  qualquer texto que sai por ela, gerado por template ou por LLM livre.
- O `206` (mensagens em template fixo) está rodando contra números autorizados reais desde a
  demanda 274, sem nenhum sinal de banimento até agora, esse período é curto (dias, não semanas) e
  o volume ainda é pequeno (whitelist de teste), não é evidência forte de segurança, só um dado
  ponto a favor do padrão de mensagem em template.

---

## 2. Caminho A: reviver o `ATENDIMENTO_AI` como atendimento de 1º contato

### O que precisaria ser corrigido/construído antes de ligar

1. **Bug de rede (279), correção pequena mas obrigatória**: trocar `Postgres Chat Memory` (conexão
   direta) por um mecanismo de memória via REST/Supabase, o mesmo padrão que todo o resto do `206`
   já usa com sucesso. Sem isso, o agente cai antes de responder qualquer coisa, é bloqueador
   total, não é opcional.
2. **Travessão no prompt de sistema (286), correção pequena**: mesma disciplina já aplicada nos 7
   nodes do `206` na demanda 286, replicar nos 4 pontos do `AI Agent1`.
3. **Ponte pro `06-PEDIDOS` morta, correção grande, não pequena**: o `06-PEDIDOS` não é mais o
   caminho real de fechamento de pedido, o `206` é. Ligar `ATENDIMENTO_AI` de volta exige
   redesenhar inteiramente como ele identifica "isto é um pedido" e entrega isso pro `206`, não é
   trocar 1 URL de webhook. Duas identificações de pedido existiriam ao mesmo tempo (a do
   `ATENDIMENTO_AI` via RAG/LLM e a do `206` via Gemini classificador), com risco real de
   divergência (`ATENDIMENTO_AI` acha que é pedido de X, `206` classifica como Y) se não forem
   desenhadas como uma etapa só.
4. **Prioridade de roteamento no `01`, mudança arquitetural**: hoje `206` é checado primeiro
   (telefone autorizado + mídia/texto de sessão nova), `ATENDIMENTO_AI` é o fallback. A proposta
   do Edvam INVERTE isso: `ATENDIMENTO_AI` vira o primeiro contato pra tudo que não é
   imagem/arquivo sem contexto, `206` vira o segundo estágio. Isso desfaz a régua estabilizada nas
   demandas 274/277/278/279 (que já levaram várias rodadas de correção pra chegar num estado sem
   regressão) e exige reconstruir a régua do zero, com o mesmo cuidado.

### Risco de banimento, reavaliado honestamente

Nada mudou estruturalmente desde a pausa original: a Z-API continua não sendo parceira oficial da
Meta, o texto livre gerado por LLM tem uma "assinatura" diferente do texto em template (mais
variado, potencialmente mais parecido com escrita humana, o que pode ser bom OU ruim do ponto de
vista de detecção automática de bot, não há dado real pra saber qual). **Esta análise não resolve
essa pergunta**, só confirma que ela continua em aberto e que texto livre é uma mudança de
categoria de risco em relação ao texto template já testado, não incremento pequeno.

### Esforço estimado

Médio-alto: 2 correções pequenas (rede, travessão) + 1 reconstrução de ponte pro `206`
(médio-grande, envolve redesenho de identificação de pedido) + 1 reconstrução de prioridade de
roteamento no `01` (médio, desfaz trabalho recente e estabilizado) + re-teste completo de tudo
que já foi validado nas demandas 274-289.

### Prós

- Qualidade de conversa genuinamente mais natural pra saudação/conversa solta, é RAG de verdade,
  não fluxograma com preenchimento de lacuna.
- Reaproveita infraestrutura já construída (`jsgrafica_agent_rag`), não começa do zero.

### Contras

- Maior custo de engenharia dos 3 caminhos avaliados.
- Reabre uma arquitetura de roteamento que só ficou estável recentemente, risco real de
  regressão nos casos já testados (mídia, texto objetivo/ambíguo/alto toque, cancelamento,
  Dizu).
- Risco estrutural de "2 cérebros" competindo pela mesma decisão (identificar o que é pedido),
  a menos que sejam desenhados como 1 etapa só, o que é trabalho de desenho adicional, não
  coberto por esta análise.
- Risco de banimento não resolvido, só herdado.

---

## 3. Caminho B: dar liberdade de escrita pro classificador do `206`

### Como seria tecnicamente

O Gemini que hoje só classifica (`gemini_classificacao`, `gemini_produto_detectado`) passaria a
também gerar texto livre, mantendo botão/lista/escalonamento como trava programática por cima
(o código continua decidindo QUANDO propor preço, QUANDO escalar, QUANDO mandar lista, só o TEXTO
de cada mensagem passaria a ser gerado, não mais 100% fixo).

### Base de conhecimento

O `206` não tem RAG hoje. 2 opções, com custo bem diferente:
- **RAG de verdade** (busca por similaridade sobre `jsgrafica_agent_rag`): mais flexível, mas é
  construção nova real, não existe pipeline de embedding/busca hoje no `206`.
- **Contexto estático embutido no prompt** (colar `base-conhecimento-atendimento-completa.md` e o
  manual de resposta, ou um resumo curado deles, direto no prompt do Gemini): muito mais barato de
  construir, e provavelmente suficiente, o corpus de conhecimento da JS Gráfica é pequeno o
  bastante pra caber em contexto sem precisar de busca por similaridade. **Recomendação técnica
  desta análise, se o Caminho B ou o híbrido for escolhido: começar por aqui, não construir RAG
  antes de provar que contexto estático não é suficiente.**

### Risco de segurança de conteúdo/preço, o ponto mais sério

Se o texto livre incluir os campos que hoje são garantidos por template fixo (valor, código Pix,
confirmação de que o pedido foi criado), reabre exatamente o risco que a Regra 5 do manual (234) e
o desenho determinístico do preço foram construídos pra evitar: um texto gerado por LLM pode
"inventar" ou arredondar um valor errado, ou prometer algo que o sistema não vai cumprir (o mesmo
tipo de risco já documentado quando a mensagem de Pix em produção prometia "confirmo
automaticamente" sem nenhum mecanismo cumprir isso, achado da demanda 250). **Isso não é
hipotético, é o mesmo tipo de erro que já aconteceu uma vez no sistema, com texto fixo escrito por
humano, com texto livre gerado por modelo o risco é maior, não menor.**

### Esforço estimado

Médio-baixo, SE escopado com disciplina: prompt novo (schema JSON ampliado, não substituído,
campos de classificação continuam existindo do jeito que estão, mais um campo de texto livre pra
saudação/transição), decisão de fonte de conhecimento (recomendado: contexto estático primeiro),
nenhuma mudança no roteamento do `01` (o `206` continua sendo chamado do mesmo jeito que hoje),
teste focado em garantir que nenhum valor/confirmação sai da parte livre do texto.

### Prós

- Não mexe no roteamento do `01`, menor risco de regressão nos 6 tipos de caso já testados
  (mídia, texto objetivo/ambíguo, currículo/alto toque, cancelamento, pagamento fora do padrão,
  Dizu).
- Reaproveita 100% do trabalho de escalonamento e triagem já validado (274-289).
- Esforço menor que o Caminho A.

### Contras

- Sem RAG hoje, precisa de alguma fonte de conhecimento nova (mitigável, ver recomendação de
  contexto estático).
- Risco real de o texto livre "vazar" preço/confirmação errados se o desenho não isolar bem o
  que é livre do que é determinístico, esse é o risco central a controlar, não um detalhe.

---

## 4. Caminho híbrido (recomendação original da 290, superada pela 292, ver seção 7)

O próprio Caminho B, bem escopado, já é o híbrido: **texto livre só nas partes que o blueprint já
trata como flexíveis hoje (saudação, transição, formulação da pergunta de triagem), nunca nas
partes que carregam garantia de segurança (valor, Pix, confirmação de pedido criado, mensagens de
escalonamento com motivo)**. A separação entre "o que pode variar" e "o que nunca pode variar" já
existe de fato no blueprint atual (`blueprint-conversas-exemplo-agente.md`, tabela de verificação:
mensagens EVIDÊNCIA DIRETA como o texto do Pix e o valor são literais de código de produção,
nunca frase livre; mensagens HIPÓTESE/PADRÃO GERAL como "O que você precisa fazer com essa
imagem?" ou a abertura da proposta já são, na prática, o tipo de texto que uma camada de geração
livre poderia assumir sem risco).

Mecanicamente: o prompt do Gemini ganha um campo novo (ex. `saudacao_ou_transicao_livre`), gerado
com contexto estático da base de conhecimento, mas o código que monta a mensagem final continua
sendo o único lugar que escreve valor/Pix/confirmação, exatamente como hoje, o texto livre é
prefixo/complemento, nunca substitui o dado crítico.

**Por que isto e não o Caminho A agora**: o Caminho A resolveria o mesmo objetivo de "conversa mais
natural" só que pagando um custo bem maior (reconstruir ponte morta, reabrir roteamento
estabilizado, risco de 2 cérebros competindo) sem ganhar nenhuma garantia de segurança extra, o
híbrido entrega a maior parte do ganho de qualidade percebida pelo cliente com o menor custo de
engenharia e sem tocar em nada que já foi estabilizado.

**O que o híbrido não resolve, e fica registrado, não escondido**: conversa genuinamente aberta,
fora do domínio de gráfica (ex. um cliente querendo bater papo sem nenhuma intenção comercial), o
`206` provavelmente continuaria classificando como `fora_de_escopo` e não respondendo, porque o
escopo do texto livre proposto aqui é só dentro do fluxo de atendimento já mapeado, não um chat
aberto de verdade. Se isso for um problema real (precisa de dado de uso real pra saber, não existe
hoje), é o cenário em que vale reconsiderar o Caminho A no futuro, com os bugs already corrigidos e
a ponte pro `206` desenhada com calma, não sob pressão de "ligar rápido".

---

## 5. Comparação lado a lado (original da 290, ver seção 7 pra tabela com as 3 opções)

| Critério | Caminho A (revive ATENDIMENTO_AI) | Caminho B (206 livre) | Híbrido (206 livre, escopado) |
|---|---|---|---|
| Esforço de engenharia | Médio-alto (3 peças não triviais) | Médio-baixo, se escopado | Médio-baixo |
| Mexe no roteamento do `01` | Sim, inverte prioridade atual | Não | Não |
| Risco de regressão no que já foi testado | Alto (reabre arquitetura estável) | Baixo | Baixo |
| Risco de preço/confirmação errados | Baixo (texto fixo continua) até a ponte pro `206` ser desenhada | Alto se mal escopado | Baixo (separação explícita) |
| Precisa de RAG/base de conhecimento nova | Não (já tem) | Sim (recomendado: contexto estático, não RAG completo) | Sim (mesmo, escopo menor) |
| Resolve conversa genuinamente aberta (fora do domínio) | Sim | Não | Não |
| Risco de banimento | Não resolvido, herdado | Não resolvido, mas mesmo padrão de volume/teste gradual já em uso | Igual ao B |

---

## 6. Sequência de demandas sugerida pro híbrido (superada pela 292, ver seção 7 pra sequência atual)

1. Decisão de produto do Edvam: confirmar exatamente quais campos da mensagem podem ser texto
   livre e quais nunca podem, usando a tabela de verificação do blueprint como ponto de partida
   (não uma decisão técnica, é decisão de risco aceitável).
2. Prompt novo do `206`: schema JSON ampliado com o campo de texto livre, contexto estático da
   base de conhecimento embutido no prompt, campos de classificação existentes inalterados.
3. Nodes de montagem de mensagem (`Montar Proposta`, `Enviar Lista Categorias`, etc.) passam a
   intercalar o texto livre com os tokens fixos, sem nunca deixar o texto livre carregar
   valor/Pix/confirmação.
4. Teste dedicado, focado em achar qualquer vazamento de dado crítico pro texto livre antes de
   considerar aprovado, não só teste de fluxo feliz.
5. Rodar por um tempo com a whitelist de teste atual, olhar sinal real de qualidade percebida e
   de risco de banimento, antes de expandir.
6. Só depois disso, com dado real de uso, reavaliar se vale a pena o Caminho A pra cobertura de
   conversa genuinamente aberta, com os bugs da 279/286 corrigidos e a ponte pro `206` desenhada
   com calma.

## 7. Atualização (demanda 292): 3ª opção, agente de IA com ferramentas travadas

### 7.1. O problema estrutural que a 290 não pesou, com evidência exata

O `206` hoje tem **exatamente 19 nodes do tipo IF** decidindo toda a conversa (contagem
reconferida direto no JSON do workflow, não estimativa): `Telefone Autorizado?`, `Ignorar From
Me`, `É Dizu?`, `Sessão Dizu Já Existe?`, `Contém Cancelar?`, `Negociação Pagamento Fora Padrão?`,
`Tem Sessão?`, `É Mídia Sem Legenda?`, `Documento Óbvio?`, `Serviço Alto Toque?`, `Produto
Detectado Tem Sinal?`, `Tipo Não Identificado?`, `Confirma Proposta?`, `Nega Proposta?`,
`Escolheu Categoria?`, `Muitas Correções Sem Resolver?`, `Timestamp Mudou?`, `Buffer Confirma
Proposta?`, `Passou do P90 do Tipo de Serviço?`. Bate exatamente com o número que o Edvam citou.

Evidência real de fragilidade, mesmo dia, 6 bugs (279-289), o padrão comum entre eles não é "erro
de digitação simples", é interação entre regras que ninguém previu ao escrever a regra nova:
- **279**: a keyword antiga da demanda 021 (`xerox`, `imprimir`, etc.) decidia `_destino` ANTES de
  qualquer checagem do agente novo, desviando mensagem pro `06-PEDIDOS` morto. Ninguém, ao
  construir o `206`/roteamento novo, tinha mapeado essa regra antiga que já existia.
- **289**: `Montar Proposta` foi construído só pensando em mídia ("Recebi seu arquivo!"); quando a
  278 reaproveitou o mesmo node pro caminho de texto, ninguém ajustou o texto pra fazer sentido
  nos 2 casos, porque o node não foi desenhado pensando em ser compartilhado.
- **281**: `GET Memoria Ativa` sem ordenação explícita, achado só quando outra demanda (279) foi
  testar um cenário que nunca tinha sido exercitado antes (sessão de pedido real ativa).
- **286**: travessão sobrevivendo em 7 nodes espalhados, porque não existe um lugar central que
  gere todo texto de mensagem, cada node hardcoda a própria string.

Esse é exatamente o tipo de fragilidade que **não é sobre a regra em si estar errada**, é sobre o
custo de adicionar uma regra nova sem conseguir enxergar todas as interações possíveis com as
regras que já existem, numa árvore de 19+ decisões encadeadas. O híbrido da 290 (mais a camada de
contexto da 291) adicionaria PELO MENOS mais 2 pontos de decisão nessa mesma árvore, mais um tipo
de bug que a árvore já demonstrou ter: mais chance de interação não prevista, não menos.

### 7.2. Como o padrão "agente + ferramentas" funcionaria

Em vez de o roteamento decidir por IF qual branch executar, um node `@n8n/n8n-nodes-langchain.agent`
(o mesmo tipo que o `ATENDIMENTO_AI` já usa e já prova que funciona no n8n desta conta) recebe a
mensagem, o histórico da conversa, e uma lista de ferramentas disponíveis. A IA decide, por
raciocínio, o que fazer: pode responder direto (saudação, esclarecimento), pode chamar 1 ou mais
ferramentas (consultar preço, criar pedido, escalar), e monta a resposta final combinando o que
as ferramentas devolveram com linguagem natural.

**Princípio central de segurança, não negociável**: toda ferramenta que grava dado ou informa um
valor **recalcula o dado por conta própria a partir da fonte real** (`jsgrafica_produtos`,
`jsgrafica_pedidos`), nunca aceita um preço/valor que a IA tenta passar como parâmetro. Isso
significa que mesmo se a IA "alucinar" um valor na conversa, o dado que efetivamente vira pedido/
cobrança vem sempre do banco, não do que o modelo disse. Detalhe de mitigação na seção 7.4.

### 7.3. Ferramentas necessárias, mapeadas contra o que já existe hoje (nenhuma garantia perdida)

| Ferramenta proposta | O que faz | Equivalente hoje (código já existe, só precisa virar "tool") |
|---|---|---|
| `consultar_preco_produto` | Recebe nome/categoria do produto, devolve preço real, calculado do banco | `GET Produto P&B A4` (n26), hoje hardcoded só pra 1 produto, como ferramenta genérica resolve de quebra a limitação conhecida da 277/289 (só P&B A4 tem preço automático) |
| `checar_sessao_pedido_ativa` | Recebe telefone, devolve se já tem pedido em andamento | `GET Sessão Ativa`/`Tem Sessão?` (n10/n14) e `CHECK SESSAO PEDIDO` (workflow `01`) |
| `criar_pedido_aguardando_aprovacao` | Recebe telefone + produto (nunca preço, recalcula internamente), grava `jsgrafica_pedidos` com status `aguardando_aprovacao` | `Criar Pedido Aguardando Aprovação` (n36) |
| `gerar_cobranca_pix` | Gera código Pix real (Mercado Pago) pro pedido | Fluxo real de Pix já usado pelo app (`lib/pedidos.ts`), hoje o `206` usa Pix copia-e-cola estático mais simples |
| `escalar_para_humano` | Recebe telefone + motivo, marca sessão como escalada, nunca manda mais nada automático | Generaliza as 9 variantes de `Escalar - *` que existem hoje (Cancelar, Negociação Pagamento, Serviço Alto Toque, Ambíguo Não Identificado, Arquivo Com Problema, Proposta Negada, Timeout P90, Sem Vocabulário Técnico, Dizu) numa ferramenta só, com `motivo` como parâmetro |
| `processar_cancelamento` | Recebe pedido, aplica a régua já desenhada (não pago = cancela direto; pago = escala pedindo devolução; entregue = escala pro Admin) **dentro do próprio código da ferramenta**, a IA só chama "cliente quer cancelar", não decide a régua | Política de 3 situações já desenhada nas demandas 259/291 (Exemplo 6 do blueprint) |
| `confirmar_pagamento_recebido` | Gera o rascunho de confirmação, mantendo humano-no-loop pro envio final (decisão já tomada) | `montarMensagemPagamentoConfirmado()`, `lib/pedidos.ts` |
| `buscar_contexto_conversa_recente` | Devolve últimas mensagens reais do telefone, já filtrando dado sensível | Mecanismo desenhado (não implementado) na demanda 291, reaproveitado sem mudança de desenho, só muda ONDE ele é chamado (pela IA/carregado antes do agente rodar, não por um node fixo no meio de uma árvore) |
| **Trava de dado embutida, não é ferramenta separada** | Nenhuma ferramenta de criar pedido/cobrança aceita gravar nada se a mensagem bater padrão Dizu | Mesma trava já documentada no blueprint (Exemplo 8), só muda de lugar: vira validação dentro da ferramenta em vez de um IF antes dela |

**Nenhuma garantia hoje existente fica pra trás**: as 9 variantes de escalação viram 1 ferramenta
parametrizada (menos superfície de código, mesma cobertura); a régua de cancelamento (3 situações)
migra inteira pra dentro da ferramenta, não fica exposta à decisão da IA; a trava de dado do Dizu
vira validação de ferramenta, mais forte que hoje (hoje é um IF que pode, em teoria, ser
contornado se algum caminho novo esquecer de checar `É Dizu?`, igual o bug da 279 mostrou
acontecer com outras regras; como validação DENTRO da ferramenta de escrita, é impossível de
contornar por engano de roteamento).

### 7.4. Riscos novos, com mitigação real (não só teórica)

**Risco 1, o mais sério: a IA decide não chamar a ferramenta de preço e informa um valor errado
por conta própria.**
Mitigação em camadas, nenhuma sozinha é suficiente, juntas fecham o risco:
- (a) Instrução de prompt explícita ("nunca informe valor sem antes chamar `consultar_preco_produto`"):
  necessária, mas insuficiente sozinha, é só disciplina de modelo, não garantia.
- (b) **A ferramenta devolve a frase pronta, não só o número** (ex. `"IMPRESSÃO P&B A4, R$ 1,20"`
  já formatado), reduzindo a chance de a IA reescrever/errar a transcrição do valor.
- (c) **Validação de saída, código puro, não confiança no modelo**: depois que o agente monta a
  resposta, um passo determinístico varre o texto de saída procurando padrão de valor (`R$` +
  dígitos) e confere se esse valor bate com o que alguma ferramenta chamada NAQUELE turno
  realmente devolveu. Se não bater (ou se não tiver nenhuma chamada de ferramenta correspondente),
  a mensagem é bloqueada e a conversa escala pro humano em vez de sair. Isso é o mesmo tipo de
  trava que o blueprint já usa hoje pro lado inverso (nunca deixar passar pagamento que não bate,
  Exemplo 7), aplicado agora à saída em vez da entrada.
- (d) Auditoria: toda chamada de ferramenta + resultado fica logada (grátis, é o log de execução
  do próprio n8n), permitindo checagem periódica de "alguma resposta saiu com valor sem chamada de
  ferramenta correspondente" durante o piloto, antes de considerar seguro escalar.

**Risco 2: sequenciamento errado (ex. criar pedido duplicado sem checar sessão ativa antes).**
Mitigação: a validação de pré-condição fica DENTRO da ferramenta (`criar_pedido_aguardando_aprovacao`
recusa se já existir pedido pendente pro mesmo telefone, checagem no banco, não checagem "a IA
lembrou de chamar checar_sessao antes"), mais constraint de unicidade no nível de dado quando
fizer sentido. A garantia não depende da IA seguir a ordem certa, o código da ferramenta impõe a
ordem certa.

**Risco 3, categoria nova que a árvore de IFs simplesmente não tem: manipulação por conversa
(prompt injection)**. Um cliente pode tentar, por texto, convencer o agente a aplicar desconto,
ignorar instrução, ou embutir instrução dentro de um "documento" que na real é texto malicioso. Uma
árvore de IFs não tem esse risco (não pode ser "convencida" de nada, só compara string/regex),
um agente de IA em tese pode. Mitigação: reforça o Princípio 7.2 (ferramenta nunca aceita valor
vindo da IA pra gravar/cobrar, sempre recalcula da fonte). Mesmo que o cliente convença a IA a
"dizer" que o desconto foi aplicado, a ferramenta que de fato cria o pedido ignora qualquer valor
que não seja o preço real do banco. O dano possível fica limitado ao que a IA CONSEGUE FALAR, nunca
ao que fica GRAVADO, porque gravação sempre passa por revalidação determinística.

**Risco 4: observabilidade menor.** Um IF que falha é rastreável direto no JSON, "a condição X deu
falso". Por que um agente chamou (ou não chamou) uma ferramenta específica é uma decisão
probabilística, sem um "porquê" tão nítido quanto uma condição booleana. Mitigação parcial: o
próprio node de agente do n8n loga o raciocínio/chamadas de ferramenta da execução (mesmo
mecanismo que já existe no `ATENDIMENTO_AI` hoje), mais as travas de código da 7.4(c)/7.4(b) que
funcionam como rede de segurança independente de o raciocínio interno ser 100% legível ou não.

**Risco 5: custo e latência.** Um agente com ferramentas normalmente faz mais de 1 chamada de LLM
por turno (raciocínio + decisão de ferramenta + resposta final), mais caro/lento que 1 chamada de
classificação (206 hoje) ou 1 chamada de geração livre (híbrido da 290). Custo real, não deve ser
ignorado, mas é secundário comparado ao risco de segurança/fragilidade.

**Risco 6: esforço de construção, o maior dos 3 caminhos.** É workflow novo do zero (não é
reviver o `ATENDIMENTO_AI` quebrado, nem estender o `206`), cada ferramenta precisa ser construída
e testada isoladamente antes de conectar ao agente, e a superfície de teste é qualitativamente
diferente (comportamento emergente de conversa, não branches enumeráveis), precisa de disciplina
de teste adversarial (tentar quebrar de propósito), não só teste de fluxo feliz.

### 7.5. Tabela comparativa final, as 3 opções, mesmos critérios da 290 + o critério novo

| Critério | Caminho A (revive ATENDIMENTO_AI) | Caminho B/Híbrido (206 livre, escopado) | **Caminho C (agente + ferramentas)** |
|---|---|---|---|
| Esforço de engenharia | Médio-alto | Médio-baixo | **Alto** (workflow novo, N ferramentas, teste adversarial) |
| Mexe no roteamento do `01` | Sim, inverte prioridade atual | Não | **Sim, mas troca destino, não inverte prioridade** (whitelist aponta pro workflow novo em vez do `206`) |
| Risco de regressão no que já foi testado | Alto (reabre arquitetura estável) | Baixo | **Médio** (não herda os 19 IFs nem os bugs deles, mas é código 100% novo, tipo de bug diferente, não necessariamente menos até testado de verdade) |
| Risco de preço/confirmação errados | Baixo até a ponte pro `206` ser desenhada | Baixo (separação explícita) | **Baixo, com guardrail estrutural** (ferramenta recalcula sempre, validação de saída), potencialmente a garantia MAIS forte dos 3, se implementado como desenhado na 7.4 |
| Precisa de RAG/base de conhecimento nova | Não (já tem) | Sim (contexto estático recomendado) | **Sim, mas já tem precedente funcionando** (`ATENDIMENTO_AI` já usa RAG com sucesso técnico) |
| Resolve conversa genuinamente aberta | Sim | Não | **Sim** |
| Risco de banimento | Não resolvido, herdado | Não resolvido, herdado | **Não resolvido, herdado** (mesma Z-API, mesmo texto livre) |
| **NOVO: fragilidade/manutenção a longo prazo** | **Herda os 19 IFs do `206` pra fechar pedido (ponte precisa decidir com ele), mesmo problema estrutural continua** | **Herda e ADICIONA decisão nova na mesma árvore de 19 IFs (evidência real: 6 bugs/dia, 279-289), tende a piorar, não resolver** | **Elimina a árvore de IFs como fonte deste tipo de bug, troca por um tipo de risco diferente (imprevisibilidade de agente), mitigável de forma estrutural (7.4), não por vigilância manual a cada regra nova** |

### 7.6. Recomendação final, atualizada

**Caminho C (agente com ferramentas travadas) passa a ser a recomendação**, substituindo o
híbrido da 290. Não é escolha automática só por ser opção nova (a demanda pediu explicitamente
pra não fazer isso): é porque, pesando os 7 critérios lado a lado, o Caminho C é o único que
resolve o problema estrutural real que o Edvam identificou (evidência: 19 IFs, 6 bugs no mesmo
dia), sem abrir mão da garantia de segurança de preço (o guardrail da 7.4 é, se bem implementado,
tão forte ou mais forte que a separação livre/fixo do híbrido). O custo real é esforço de
engenharia bem maior e um tipo de risco novo (imprevisibilidade de agente, mitigável) em vez do
risco antigo (interação de regra não prevista, já demonstrado 6 vezes em 1 dia).

**Isso não significa "jogar fora" o trabalho da 291**: a régua de correção de tom e o desenho do
mecanismo de contexto de conversa recente continuam válidos como conhecimento, só mudam de
destino, viram insumo pro prompt de sistema do agente novo (Caminho C), não pro prompt do `206`.

**Recomendação operacional, pra não travar tudo esperando o workflow novo ficar pronto**:
congelar o `206` (não empilhar mais regra/campo nele, incluindo não prosseguir com a integração da
291 como extensão do `206`) enquanto o piloto do Caminho C é construído e testado em paralelo,
contra a mesma whitelist de hoje, sem desligar o `206` que já está estabilizado pro que já cobre.

### 7.7. Sequência de demandas atualizada (substitui a sequência da seção 6, não emenda)

1. **Contrato de cada ferramenta**: nome, parâmetros de entrada, o que garante, o que NUNCA aceita
   vindo da IA (ex. `criar_pedido_aguardando_aprovacao` nunca aceita `valor` como parâmetro,
   sempre recalcula), decisão de produto + especificação técnica, sem código ainda, mesmo nível
   de detalhe que a especificação técnica da demanda 277 teve pro `206`.
2. **Construir as ferramentas primeiro, isoladas e testáveis por conta própria**, reaproveitando
   a lógica já existente e testada (206/`lib/pedidos.ts`/app), sem reescrever do zero o que já
   funciona, só encapsular como tool chamável.
3. **Construir o workflow novo do agente** (`@n8n/n8n-nodes-langchain.agent`, mesmo padrão do
   `ATENDIMENTO_AI`), prompt de sistema usando a régua de tom e o mecanismo de contexto da 291,
   ferramentas da etapa 2 conectadas, MAIS o guardrail de validação de saída (7.4c) implementado
   desde o primeiro teste, não como reforço posterior.
4. **Teste adversarial dedicado**: tentar ativamente quebrar os guardrails (pedir desconto, tentar
   fazer a IA "esquecer" de chamar a ferramenta de preço, injeção de instrução dentro de texto/
   documento) antes de considerar qualquer coisa segura, não só teste de fluxo feliz.
5. **Congelar o `206`** durante a construção/teste do piloto (nenhuma regra nova nele, incluindo a
   integração da 291), pra não continuar acumulando risco na árvore de IFs enquanto o caminho novo
   é validado.
6. **Rodar os dois em paralelo**, `206` continua atendendo a whitelist de hoje, agente novo entra
   só quando testado, comparar taxa de erro/aprovação sem edição com dado real, decidir o corte
   definitivo (desligar o `206`, ou manter os dois pra tipos de caso diferentes) com base nisso,
   não em estimativa.

## Referências

Demandas 279 (bug de rede do `ATENDIMENTO_AI`), 286 (travessão no prompt), 274 (roteamento atual
do `01`), 277/278 (desenho e implementação da triagem de texto do `206`), 289 (limitação de preço
só pra P&B A4), 250 (achado real de mensagem prometendo algo que o sistema não cumpria, mesmo tipo
de risco citado na seção 3). `blueprint-conversas-exemplo-agente.md` (tabela de verificação,
classificação evidência/padrão/hipótese/regra de negócio, base da separação livre/fixo proposta
aqui). `base-conhecimento-atendimento-completa.md` (checklist de voz da demanda 260, fonte
candidata a contexto estático). `manual-resposta-ia-100-clientes.md` (Regra 5, risco de preço não
confirmado). `CLAUDE.md` (motivo original da pausa do atendimento automático). **Demanda 290
(análise original, seções 1-6, recomendação de híbrido superada pela 292). Demanda 291
(`blueprint-conversas-exemplo-agente.md`, régua de tom + contexto de conversa recente, conteúdo
reaproveitado como insumo pro prompt do agente novo, não descartado). Demanda 292 (esta
atualização, seção 7, 3ª opção e recomendação final): demandas 279-289 citadas como evidência
direta da fragilidade estrutural dos 19 IFs, `JSGRAFICA_ATENDIMENTO_AI` (`@n8n/n8n-nodes-
langchain.agent`, já com 1 ferramenta de RAG, prova de conceito do tipo de node no n8n).**
