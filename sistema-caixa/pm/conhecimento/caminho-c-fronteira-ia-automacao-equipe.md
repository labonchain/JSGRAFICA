# Caminho C: fronteira entre IA, automação (ferramentas) e equipe humana

Executado por: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA
Data: 2026-08-16 (demanda 293). Nota de status: 2026-08-27.

## Nota de status (2026-08-27)

**Este desenho foi implementado e está rodando em produção real** desde a demanda 299
(2026-08-18): o Caminho C está conectado no roteamento real do `01`, no lugar do `206`, atendendo
a whitelist de teste (ainda sem cliente real). Os 3 cenários de retomada desta seção 5 evoluíram
de verdade na demanda 321 (2026-08-27): o mecanismo de "sessão escalada" que eu desenhava aqui
como estado da IA ganhou um 4º estado OPERACIONAL compartilhado com o humano
(`jsgrafica_contatos.status_atendimento`: `aberto`/`em_atendimento`/`escalado`/`resolvido`, visível
na tela do Inbox), fechando exatamente o tipo de gap que o cenário (a) desta seção já antecipava
(a IA não pode reabrir sozinha uma conversa que um humano resolveu). O mecanismo de contexto
recente (seção 6) também evoluiu: a coluna real `enviado_por` (demanda 294) já substituiu o
contorno por inferência que eu tinha proposto aqui, exatamente como a seção 6 já previa que
poderia acontecer.

**Documento novo, mais atual, que amarra tudo isso numa visão de ponta a ponta**:
`pm/conhecimento/caminho-c-mapa-decisoes-completo.md` (2026-08-27), não fui eu quem escreveu,
outra sessão fez a pedido direto do Edvam, mas eu conferi e o conteúdo bate com os arquivos de
demanda reais. Pra estado operacional atual, ler aquele primeiro; este documento continua válido
como registro do RACIOCÍNIO original de cada regra (o "porquê"), não foi reescrito por baixo.

---

Isto é desenho, não prompt final nem implementação. Documento novo, não uma extensão de
`blueprint-conversas-exemplo-agente.md`: aquele documento é o desenho do `206` (árvore de IFs),
que a demanda 292 recomendou **congelar**, não continuar recebendo regra nova. Este documento é o
desenho do Caminho C (agente com ferramentas), decisão já tomada pelo Edvam. O conteúdo de tom e
contexto de conversa recente da demanda 291 continua válido e é reaproveitado aqui como insumo,
só muda de destino (era pro prompt do `206`, agora é pro prompt do agente novo).

Mesma marcação do blueprint: 🔵 **REAL** (conversa real, citada), 🟡 **SIMULADO** (ilustrativo,
não é reconstrução de conversa real), ⚙️ **SISTEMA** (mecanismo/ferramenta, não fala).

---

## 1. Os 3 papéis, na visão do Edvam

1. **IA de atendimento**: conversa, entende o cliente, decide o que fazer.
2. **Automação de tarefas** (as 9 ferramentas da demanda 292): preço, Pix, pedido, cancelamento,
   escalação, confirmação de pagamento, sessão ativa, contexto recente, trava Dizu.
3. **Equipe humana**: quando escala.

O resto deste documento define a fronteira exata entre os 3.

---

## 2. Até onde a IA vai sozinha (sem acionar nem ferramenta nem equipe)

**Regra**: a IA responde sozinha qualquer coisa que (a) não depende de dado que só existe no
banco (preço real, status de pedido, existência de sessão) e (b) não grava nem promete nada. É
conversa, não consulta nem compromisso.

Cobre:
- **Perguntas institucionais estáveis**: horário de funcionamento, forma de pagamento aceita,
  onde fica a gráfica. Conteúdo fixo, pode vir de contexto estático no prompt, não precisa de
  ferramenta.
- **Perguntas de esclarecimento/triagem**: "colorido ou preto e branco?", "qual tamanho?", é
  pergunta, não consulta.
- **Cortesia e confirmação verbal**: saudação, agradecimento, "combinado", "beleza".
- **Reaproveitar o que já está no contexto recente**: "você disse que queria 3 cópias, confirma?"
  sem precisar consultar nada de novo.

**Fronteira dura, nunca "sozinha"**: qualquer coisa que declare um valor em R$, confirme um
pedido, ou prometa algo que o sistema precisa cumprir depois, sempre passa por ferramenta. Esse é
o mesmo princípio central da demanda 292 (seção 7.2): a garantia não pode depender da IA "se
lembrar" de não inventar, tem que ser estrutural.

```
🔵 REAL (cliente, 558194437630, lote 07 da demanda 256)
  Voces tao abertos ate q horas?
🔵 REAL
  Voces tem pausa pro almoço?

🔵 REAL (equipe, resposta real)
  Funcionamos de segunda à sexta Das 07:00 às 18:00h não fechamos para almoço.
```

Esta resposta, no Caminho C, é a IA sozinha: informação estável, sem valor em jogo, sem gravar
nada. Nenhuma ferramenta chamada.

---

## 3. Critério objetivo pra cada uma das 9 ferramentas (demanda 292)

Não "quando for pedido": o sinal exato que dispara cada uma.

| Ferramenta | Sinal exato que dispara | Quem decide |
|---|---|---|
| `checar_sessao_pedido_ativa` | Sempre, no início de qualquer sessão nova, antes de a IA responder qualquer coisa que avance um pedido | Não é decisão da IA, é pré-condição automática, mesmo padrão do `Tem Sessão?`/`GET Sessão Ativa` de hoje |
| `buscar_contexto_conversa_recente` | Sempre, no início de qualquer resposta | Não é decisão da IA, é pré-condição (mesma exigência da demanda 291: "resposta sempre considera contexto") |
| `consultar_preco_produto` | Cliente confirmou produto E informação suficiente pra cotar (quantidade, formato, cor quando relevante) | IA decide QUANDO tem informação suficiente (julgamento conversacional), mas depois de decidir, a ferramenta é obrigatória, nunca declara valor sem ela ter rodado no mesmo turno |
| `gerar_cobranca_pix` | Cliente confirmou o valor que a `consultar_preco_produto` devolveu (resposta afirmativa a uma proposta já apresentada) | Nunca antes de o valor ter sido apresentado e confirmado |
| `criar_pedido_aguardando_aprovacao` | Mesmo gatilho de `gerar_cobranca_pix` (cliente confirmou), grava o pedido com status `aguardando_aprovacao`, mesmo comportamento de hoje (humano aprova depois na Fila de Impressão) | Automático, junto com a confirmação, não é decisão separada da IA |
| `processar_cancelamento` | Cliente pede cancelamento explicitamente (intenção de cancelar reconhecida na conversa) | IA reconhece a intenção, a ferramenta decide o resultado (não pago/pago/entregue), a IA NUNCA decide a régua sozinha |
| `confirmar_pagamento_recebido` | Evento do sistema (pagamento detectado batendo o valor esperado), não é decisão conversacional | Não é a IA que decide, é gatilho externo; a IA só participa gerando o rascunho quando o evento acontece, envio continua manual (decisão já tomada no blueprint, mantida) |
| `escalar_para_humano` | Ver régua completa na seção 4 | Camada 1 é automática (código, antes da IA processar), Camada 2 é a IA decidindo chamar |
| Trava Dizu (não é ferramenta separada, é validação embutida) | Mensagem bate padrão de comida/cardápio | Automática, roda antes de tudo, mesmo padrão de hoje (`Filtro Dizu`/`É Dizu?`) |

```
🔵 REAL (Manuela Moreira, 558186050094, lote 03 da demanda 256)
  Bom dia
🔵 REAL
  Manuela Moreira
🔵 REAL
  Pode imprimir só a primeira folha

⚙️ SISTEMA: produto e especificação suficientes (1 folha, P&B padrão) → IA aciona
   `consultar_preco_produto`, ferramenta devolve "IMPRESSÃO P&B A4, R$ 1,20" pronto

🔵 REAL (equipe, resposta real)
  Bom dia, Manu! Recebemos seu pedido. Valor impressão 1,20.
```

---

## 4. Critério de escalação pra equipe: régua em 2 camadas (mudança em relação a hoje, justificada)

**O conteúdo da régua não muda**: os mesmos motivos que escalam hoje continuam escalando. **O que
muda é onde cada checagem roda**, e essa mudança é deliberada, não incidental:

### Camada 1, determinística, roda ANTES de a IA processar livremente (código, não julgamento)

Os riscos mais altos continuam sendo trava de código, nunca ficam à mercê do raciocínio da IA:
- **Dado pessoal / Serviço Alto Toque** (currículo, digitação, antecedentes, conta gov), mesmo
  gatilho de regex já usado no `206` hoje (`Serviço Alto Toque?`), incluindo a correção do gap
  "conta gov" já identificado na demanda 277.
- **Dizu**, mesmo filtro de hoje (`Filtro Dizu`/`É Dizu?`), trava de dado incluída (nenhum
  pedido nasce de mensagem classificada como Dizu).
- **Cancelamento de pedido já pago ou já entregue**, fica dentro da própria ferramenta
  `processar_cancelamento` (seção 3), não é a IA que decide, é o código que consulta o estado
  real do pedido.

**Por que continuam determinísticas, não viram julgamento da IA**: são exatamente os casos onde
dado sensível ou dinheiro já processado estão em jogo, o mesmo princípio da demanda 292 de nunca
deixar uma garantia de segurança depender só do bom senso do modelo.

### Camada 2, a critério da IA, ela chama `escalar_para_humano` quando julgar

- Ambiguidade que não resolve depois de 1-2 perguntas de esclarecimento.
- Cliente insistindo em algo fora do catálogo real.
- Negociação de pagamento fora do padrão (parcelar, desconto, "metade agora metade depois"),
  mesmo gatilho de conteúdo de hoje (`Negociação Pagamento Fora Padrão?`), mas reconhecido por
  julgamento da IA em vez de regex fixo.
- Proposta negada (cliente diz que não é isso).
- Timeout de resposta / cliente sumiu no meio de uma proposta pendente.

**Por que estes viram julgamento da IA, não regex**: são casos onde o padrão real é variado
demais pra um regex cobrir bem (achado já registrado no blueprint: a régua de "sem vocabulário
técnico" hoje é só contagem de fragmentos, não entende o CONTEÚDO da confusão). A IA, raciocinando
sobre a conversa inteira, reconhece esses casos melhor do que um padrão fixo, é justamente a
vantagem do Caminho C nesse tipo de situação.

```
🔵 REAL (Iraneide Peixoto, 558198324841, Regra 4 do manual 234)
  [pede currículo]

⚙️ SISTEMA: Camada 1 (determinística) reconhece "currículo" antes de a IA processar
   livremente → escala direto, IA nunca chega a decidir isso por conta própria

🔵 REAL (equipe, resposta real)
  Nome Completo: Endereço: Telefone: E-mail: Data nascimento: Estado civil: [...]
```

---

## 5. Os 3 cenários de retomada depois de escalar

### (a) Equipe resolveu, IA não reabre sozinha

```
🟡 SIMULADO (cliente, sessão escalada por dado pessoal)
  [conversa de currículo, escalada]

🟡 SIMULADO (equipe, pelo Inbox)
  Prontinho, seu currículo tá pronto, pode vir buscar

⚙️ SISTEMA: sessão marcada `concluida`. Se o cliente mandar mensagem nova depois (mesmo dia ou
   dias depois), a IA NÃO presume que pode continuar de onde a automação parou. Trata como
   possível início de nova interação: roda `checar_sessao_pedido_ativa` e
   `buscar_contexto_conversa_recente` de novo, do zero, aplicando a régua normal (seções 2-4)
   pra essa mensagem nova, não reabre a sessão concluída
```

### (b) Equipe respondeu, cliente tem pergunta nova depois: IA retoma sabendo o que já foi dito

```
🔵 REAL (José Roberto Silva, 558191414184, lote 06 da demanda 256)
  este vou verificar o valor e tamanho, é um banner, não sei se vocês trabalham, quando chegar
  ai conversamos

🔵 REAL (equipe, resposta real, pelo Inbox, manual)
  Bom dia vai ser que tipo de papel

  [sessão sem resposta do cliente na hora, fica em aberto]

🟡 SIMULADO (José Roberto, dias depois, sessão nova)
  E aquele banner, fecha 50x70 mesmo?

⚙️ SISTEMA: `buscar_contexto_conversa_recente` (estendida, ver seção 6) traz a mensagem da
   EQUIPE (não da IA) sobre o banner, a IA sabe que já foi perguntado sobre tipo de papel e usa
   isso, não repete a pergunta do zero nem contradiz o que já foi combinado

🟡 SIMULADO
  Vi que já tinha perguntado o tipo de papel pro banner, você já decidiu ou ainda precisa ver as
  opções?
```

### (c) IA respondeu, cliente reagiu como se não tivesse entendido: tentar de novo ou escalar, sem loop

```
🟡 SIMULADO (cliente)
  Quanto custa imprimir uma coisa aqui

🟡 SIMULADO (IA)
  Depende do que é! Você tem o arquivo em mãos, ou é foto de algo físico?

🟡 SIMULADO (cliente)
  Não entendi

🟡 SIMULADO (IA, 2ª tentativa, reformulando, não repetindo igual)
  Sem problema. É pra imprimir um documento que você já tem no celular, ou uma foto de alguma
  coisa?

🟡 SIMULADO (cliente)
  ????

⚙️ SISTEMA: 2 tentativas de esclarecimento sem resolver → mesmo limite já usado hoje pro caso
   análogo de mídia ambígua (`Muitas Correções Sem Resolver?`, contagem >= 2) → escala,
   `escalar_para_humano` com motivo "cliente não entendeu esclarecimento da IA", nunca uma 3ª
   tentativa
```

**Regra geral do cenário (c)**: contador de tentativas de esclarecimento por sessão, mesmo limite
de 2 já usado hoje (não é número novo inventado, é o mesmo threshold que a régua de "correções sem
resolver" já usa). Na 2ª reformulação sem entendimento, escala, nunca insiste uma 3ª vez.

---

## 6. Como a IA sabe onde a conversa está: estendendo o mecanismo da demanda 291

A demanda 291 desenhou `buscar_contexto_conversa_recente` lendo `jsgrafica_log_msgs_privadas`
(até 8 mensagens ou 7 dias, filtro de dado sensível). Isso já traz TODO `from_me=true` do
telefone, incluindo mensagem mandada pela equipe manualmente pelo Inbox, porque o log de WhatsApp
não distingue quem mandou, só que saiu do número da JS Gráfica (Z-API relaya qualquer envio,
automático ou manual, do mesmo jeito).

**O que falta pra IA saber DIFERENCIAR "isso fui eu que mandei" de "isso foi um humano que
mandou"**, o que importa pros cenários (a)/(b) da seção 5: hoje não existe coluna nenhuma em
`jsgrafica_log_msgs_privadas` marcando origem (achado desta demanda, não presumido como já
resolvido). **Proposta, sem precisar de coluna nova**: o workflow do agente novo (quando
construído) passa a registrar, na PRÓPRIA sessão dele (sucessora de
`jsgrafica_agente_teste_sessoes`), cada mensagem que ELE mandou. `buscar_contexto_conversa_recente`
compara as mensagens `from_me=true` do log compartilhado contra esse registro próprio: o que bate
é "a IA mandou", o que sobra é "alguém mais mandou" (equipe, pelo Inbox). Não precisa de campo
novo no log geral, só o agente manter o próprio histórico do que ele mesmo enviou, e a ferramenta
faz a diferença.

**Sinal adicional**: se a última coisa que aconteceu na conversa foi uma escalação (`status:
escalada` ou `concluida` por escalação), o contexto devolvido pra IA inclui esse status
explicitamente, não só o texto das mensagens, pra ela saber "isso foi atendido por humano", sem
precisar inferir só pelo conteúdo.

**Isso continua sem RAG/embedding**, mesma janela fixa e pequena da 291, só o filtro de origem é
novo. Nenhuma mudança na quantidade (8 mensagens/7 dias) proposta aqui.

---

## 7. Honesto sobre os limites deste desenho

- Nenhuma ferramenta/prompt foi escrita, isso é fronteira e critério, não implementação.
- A diferenciação "IA vs. equipe" no contexto (seção 6) depende de o workflow novo manter seu
  próprio histórico de envio desde o primeiro dia, se isso não for feito com disciplina desde o
  início, o mecanismo de diferenciação simplesmente não funciona, não é opcional adicionar depois
  sem perder histórico do período sem essa disciplina.
- O limite de "2 tentativas antes de escalar" (cenário c) reaproveita um número que já existe pra
  outro contexto (fragmentos de mídia ambígua), não uma medição nova específica pra confusão de
  texto livre, vale validar com dado real depois que o agente estiver rodando.
- Os exemplos SIMULADO desta seção (cenários b e c, majoritariamente) não são reconstrução de
  conversa real, são ilustrativos do mecanismo, mesma disciplina de marcação do blueprint.

## Referências

Demanda 292 (`analise-arquitetura-atendimento-humanizado-vs-estruturado.md`, seção 7, decisão do
Caminho C e as 9 ferramentas que esta demanda detalha o critério de acionamento). Demanda 291
(mecanismo de contexto de conversa recente, estendido na seção 6). Demanda 234
(`manual-resposta-ia-100-clientes.md`, Regra 4, base da Camada 1 de escalação). Demandas 255/256
(base de conhecimento, citações reais usadas nos exemplos). `blueprint-conversas-exemplo-
agente.md` (mesmo padrão de marcação REAL/SIMULADO/SISTEMA, régua de escalação original que esta
demanda reorganiza em 2 camadas, documento agora congelado por decisão da 292, não editado aqui).
