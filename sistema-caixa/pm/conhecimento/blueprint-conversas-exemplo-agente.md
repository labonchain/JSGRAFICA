# Blueprint do atendimento automático, JS Gráfica

Executado por: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA
Última atualização: 2026-08-16 (demanda 291, passo 1 da sequência híbrida da análise 290: régua
explícita de correção de tom, o que do padrão real do time deve ser seguido literalmente vs.
corrigido antes de virar fala do agente, e desenho do mecanismo de contexto de conversa recente,
últimas mensagens reais do mesmo telefone entrando na geração da resposta, com cuidado de
performance e de dado sensível. Ver Exemplos 11 e 12, e a nova seção de fundamentação na Parte 2.
Não é escrita de prompt final nem implementação, isso é o passo 2, demanda separada);
2026-08-15 (demanda 277: desenho de como o agente passa a atender também
mensagem de texto puro, não só mídia sem legenda, reaproveitando os mesmos gatilhos de
escalonamento do `206` já existentes. Texto que nomeia produto de tabela fixa objetivamente segue
direto pra proposta, texto ambíguo pergunta antes de mostrar lista, texto de serviço alto toque
(currículo, digitação, antecedentes, conta gov) escala direto, sem coletar nada. Ver Exemplos 9 e
10, achado novo sobre a Regra 4 do manual, e a especificação técnica pro 01-N8N implementar
depois. Implementação NÃO feita nesta demanda, só o desenho); 2026-08-14 (demanda 272: lista de
fallback do Exemplo 2 trocada de vez, 6
categorias amplas mapeadas 1:1 contra os 110 produtos ativos reais do catálogo (Xerox/cópia,
Impressões, Consulta online, Recargas, Escritório, Personalizados), decisão direta do Edvam,
substituindo tanto os 9 grupos em linguagem de cliente da 256/259 quanto os 15 nomes técnicos que
na prática ainda estavam em produção no workflow `206`, achado da 208. Detalhe completo, com
sub-categoria e contagem de produto, em `pm/demandas/272-lista-final-categorias-agente-
atendimento.md`); 2026-08-14 (achado do PM/Edvam, sessão de reavaliação da demanda 208: a
confusão com a Dizu Refeições **não é temporária** — mesmo depois de a Dizu ganhar número
próprio, o número da JS Gráfica continua sendo o que já está salvo na agenda de muita gente,
ligado ao mesmo espaço físico e ao mesmo grupo — sempre vai existir algum volume baixo e
constante de gente perguntando de comida por aqui. **Revertida a decisão da demanda 259** de
tratar isso como situação temporária a apagar do desenho: reincorporada a detecção de padrão
Dizu como parte permanente do fluxo, ver "Exemplo 8" — mantendo a correção da demanda 246
(nunca afirmar "número errado", sempre escalar pro humano decidir) e adicionando uma trava de
dado nova: nenhum pedido/entrada financeira nasce de mensagem classificada como padrão Dizu);
2026-08-14 (demanda 267, achado do Edvam: nenhuma versão deste blueprint tratou data/hora como
requisito — nova seção registrando a regra pro prompt real do n8n, ainda não implementada, ver
"Uso de data/hora na saudação"); 2026-07-30 (demanda 260, reescrita completa das falas SIMULADO
com voz extraída do corpus real, remoção de travessão em todo o documento, resolução do limite
de lista da Z-API; demanda 259, reescrito com a base de conhecimento em escala real das
demandas 255/256)

Este documento tem 2 partes. A **Parte 1** é a versão final, pronta pra leitura e aprovação:
mostra como o atendimento automático vai funcionar e as 3 decisões que precisam de aprovação. A
**Parte 2** é material de apoio técnico (histórico de correção, fundamentação, achados de risco).
Não é necessário ler pra aprovar, é registro pra quem for implementar depois.

---

# PARTE 1: Resultado final

## Como ler as conversas abaixo

Cada mensagem mostrada é marcada:
- 🔵 **REAL**: já aconteceu de verdade, tirada de uma conversa real de cliente (nome/telefone
  citados só quando necessário).
- 🟡 **SIMULADO**: escrita pra este documento, mostra o comportamento esperado do agente, mas
  ainda não foi testada com um cliente de verdade. A partir da demanda 260, todo texto do agente
  aqui segue a checklist de voz real (seção 7 de `base-conhecimento-atendimento-completa.md`).
- ⚙️ **SISTEMA**: mensagem automática que o próprio sistema já manda hoje, sem mudança nenhuma.

## As 3 decisões que precisam da sua aprovação

### 1. Ligar o atendimento automático de verdade

O "agente" já foi construído e testado, mas hoje ele só conversa com um número de teste interno,
nunca com cliente real. Pra ativar de verdade, é preciso conectar esse agente no sistema que
recebe as mensagens dos clientes de verdade, mas de um jeito controlado:
- Só responde pra números que estiverem numa lista aprovada. Nenhum cliente novo entra sozinho.
- Só entra em ação quando o cliente manda uma foto ou documento (com ou sem explicação junto).
  É o caso mais comum e mais estudado até agora.
- O atendimento automático geral **continua desligado**. Isso não liga um "chatbot" pra todo
  mundo, é um caminho novo, separado e restrito.

**O que você decide**: aprovar a construção dessa conexão (o trabalho técnico em si ainda
depende de alguém da equipe implementar). A lista de opções que o agente usa como último recurso
(Exemplo 2 abaixo) foi redesenhada pra falar a língua do cliente, não o nome técnico do catálogo
da gráfica. Vale conferir se faz sentido antes de aprovar.

### 2. Por quem começar

Não dá pra ligar pra todo mundo de uma vez. A proposta é começar só com um grupo pequeno de
clientes que já têm histórico limpo e confiável: sem confusão, sem negociação difícil, sem
reclamação registrada:

| Cliente | Por quê |
|---|---|
| Maria da Conceição Silva | Sempre pede o mesmo serviço simples, nunca gerou confusão |
| Otto Silva | Mesmo perfil, pedido direto, sem complicação |
| Jociane Araújo | Mesmo perfil, já respondeu bem a perguntas do tipo "cor ou preto e branco?" |
| Lidiane Oliveira (opcional, 4º nome) | Mesmo perfil, adicionado numa revisão mais recente |

Depois que esse grupo acumular pelo menos 10 pedidos feitos pelo agente, se pelo menos 8 em cada
10 forem aprovados por você/Gabi sem precisar editar nada, libera pra incluir mais gente. Se
qualquer um desses clientes se comportar de um jeito inesperado, é só tirar o número da lista.
Ele volta a ser atendido do jeito manual de sempre, na hora.

**O que você decide**: aprovar essa lista inicial e essa regra de quando liberar o próximo grupo.

### 3. Texto puro também passa a ser atendido (decisão já tomada, demanda 277)

Até a demanda 277, o agente só sabia lidar com foto ou PDF, mensagem de texto puro (sem nenhuma
mídia) caía fora do escopo por completo. O Edvam decidiu expandir isso: o agente agora também
reage quando uma sessão nova começa só com texto, com a MESMA disciplina já usada pra mídia, não
uma régua mais frouxa. Texto que já nomeia um produto de tabela fixa de forma objetiva ("quanto
custa impressão colorida?") segue direto pra proposta, igual documento óbvio hoje. Texto ambíguo
("preciso imprimir uma coisa") pergunta, igual imagem ambígua. Texto que sinaliza um serviço de
alto toque, envolvendo dado pessoal (currículo, digitação, antecedentes, conta gov) escala direto
pra equipe, sem tentar coletar nada, reaproveitando o mesmo gatilho que o `206` já usa pra mídia
(não é categoria nova). Ver Exemplos 9 e 10 abaixo, e a Parte 2 pra fundamentação e o que muda no
`206`.

**Isso não é implementação ainda**: o `206` continua, hoje, só disparando pra mídia sem legenda.
Esta demanda é só o desenho de como vai funcionar quando implementado, especificado pra o
01-N8N executar numa demanda separada.

---

## Exemplo 1: Documento sem nenhuma palavra (o caso mais comum)

Este é o fluxo principal, não uma exceção: a maioria dos clientes reais manda só o arquivo, sem
descrever nada (seção acima). Quando é documento/PDF, o comportamento real da equipe é quase
nunca perguntar o que é. Reage com um agradecimento curto ou já vem com o preço direto.

```
🔵 REAL (Carmem Lúcia)
  [manda foto de uma conta, sem escrever nada]

🟡 SIMULADO
  Obrigado! 😉
🟡 SIMULADO
  Já te digo o valor

⚙️ SISTEMA: em paralelo, a leitura automática do arquivo identifica que é uma 2ª via de conta
   (leva ~3 segundos)

🟡 SIMULADO
  2ª via de conta, R$ 2,20. Confirma?
  [✅ Confirmar]  [❌ Não é isso]

🔵 REAL
  (toca em ✅ Confirmar, digitar "sim" também funciona)

🟡 SIMULADO
  Pix copia e cola (válido por 24h):
  [código Pix real, gerado pelo Mercado Pago]
  💰 Valor: R$ 2,20

  É só copiar o código acima e colar na área Pix do app do seu banco. Assim que o pagamento
  cair, a gente avisa por aqui 😊

🔵 REAL
  Show, já mandei

🟡 SIMULADO
  Obrigado! 😊

⚙️ SISTEMA: o pagamento é detectado automaticamente e uma mensagem de confirmação já fica
   pronta, esperando alguém da equipe mandar (nunca sai sozinha)

⚙️ SISTEMA: mensagem pronta pra enviar:
  ✅ Recebemos seu pagamento! 😊

  🖨️ IMPRESSÃO 2ª VIA CONTA
  💰 R$ 2,20

  Já vamos começar a produção.

👤 VOCÊ/GABI: clica "Enviar" no Inbox (a mensagem já vem certa, sem precisar editar)
```

**O que aparece pra você na Fila de Impressão antes de qualquer coisa avançar:**

```
┌─────────────────────────────────────────────┐
│ 🤖 Gerado automaticamente, revise antes      │
│    de aprovar                                 │
│                                                │
│ Carmem Lúcia, 558186508876                    │
│ IMPRESSÃO 2ª VIA CONTA                        │
│ R$ 2,20 · Pix                                 │
│                                                │
│  [✓ Aprovar]        [✕ Rejeitar]              │
└─────────────────────────────────────────────┘
```

Nenhum pedido gerado pelo agente entra em produção ou é cobrado sem você (ou a Gabi) aprovar
esse card primeiro. O envio da confirmação de pagamento também sempre passa por um clique seu.
Não é 100% automático, pelo menos nesta primeira fase.

---

## Exemplo 2: Imagem sem nenhuma palavra (ambíguo → triagem, nunca menu direto)

Quando chega imagem (não documento), o padrão real é diferente: a equipe faz **pergunta de
triagem**, não agradecimento, porque imagem é muito mais distribuída entre categorias do que
documento (foto, adesivo, plastificação, personalizado, não só "papel ofício").

```
🟡 SIMULADO (cliente)
  [manda foto de um objeto, sem legenda]

⚙️ SISTEMA: a leitura automática não consegue identificar um documento óbvio (é "ambíguo")

🟡 SIMULADO
  O que você precisa fazer com essa imagem?

🟡 SIMULADO (cliente)
  Preciso imprimir isso

  (ainda não dá pra saber formato/cor/quantidade, a pergunta aberta não resolveu sozinha)

🟡 SIMULADO
  Deixa eu te mostrar as opções, aí você me diz qual encaixa:
  📋 Xerox (cópia) — P&B ou colorida
  📋 Impressões — Papel ofício, foto, couché, cartão, adesivo
  📋 Consulta online — Currículo, CPF, cadastro, digitação...
  📋 Recargas — Celular ou VEM
  📋 Escritório — Papel, caneta, encadernação, plastificação
  📋 Personalizados — Festa, presente, banner, caneca...
  📋 Outro — Não sei / nenhuma das opções

🟡 SIMULADO (cliente)
  (toca em "Foto impressa", ou digita, se a lista não abrir)

🟡 SIMULADO
  Anotado 😊
🟡 SIMULADO
  Já te chamo com o valor
```

Neste caminho, o agente **não decide sozinho o produto e o preço**. Passa a conversa pra fila
normal de atendimento manual, porque o pedido ainda é ambíguo demais pra fechar sem um humano
olhar. Não gera nenhum pedido pendente de aprovação neste caso.

**Por que a pergunta aberta vem primeiro, e a lista só depois**: é o padrão real documentado: a
equipe pergunta 1 coisa objetiva de cada vez, nunca apresenta um menu de opções como primeira
resposta. A lista só existe como último recurso.

**Por que a lista agora é assim (revisão de 2026-08-14, demanda 272)**: a versão anterior (9
grupos em linguagem de cliente, demanda 256/259) nunca chegou a ser implementada no workflow real
— o node `Enviar Lista Categorias` continuou usando os 15 nomes técnicos internos do catálogo
(achado da demanda 208). Ao corrigir isso de vez, o Edvam revisou o catálogo real completo (110
produtos ativos, `jsgrafica_produtos`) e definiu 6 categorias amplas mapeadas 1:1 contra o
catálogo, mais simples que os 9 grupos anteriores: **Xerox (cópia), Impressões, Consulta online,
Recargas, Escritório, Personalizados** + Outro como saída padrão. Prioriza caber com folga no
limite de 10 linhas do WhatsApp e bater exatamente com a estrutura real de produtos, em vez da
granularidade por "o que o cliente descreveu" da versão anterior — decisão de produto do Edvam,
não achado de dado novo. Mapeamento completo (categoria → sub-categoria interna → produto →
quantidade) em `pm/demandas/272-lista-final-categorias-agente-atendimento.md`.

**Nota de implementação (demanda 260, ainda válida)**: os títulos respeitam o limite real de
lista do WhatsApp (24 caracteres por título, confirmado na Parte 2), com o detalhe extra depois
do "—" funcionando como a descrição da linha, não como texto corrido dentro do próprio título.

---

## Exemplo 3: Cliente pede currículo

Currículo aparece com muita frequência nos 340 clientes reais lidos (demanda 256), mas quase
sempre como pedido de **montagem/edição**, não impressão pura.

```
🔵 REAL (Jamilly)
  Bom dia
🔵 REAL
  Quanto é mesmo pra criar um currículo ?

  (cola o texto completo do currículo dela, em vez de anexar arquivo)

🔵 REAL
  Em PDF

🔵 REAL
  Oi, Jamilly! Seu currículo já está produção, assim que estiver pronto enviaremos para sua
  correão antes de gerar o pdf, valor 5,00
```

O agente reconhece esse pedido como "Editar currículo" e **escala direto pra equipe**, sem tentar
montar o currículo sozinho. É um serviço que envolve dado pessoal e redação, não só impressão de
arquivo pronto (mesmo princípio já documentado pra qualquer coleta de dado pessoal).

**Nota da demanda 277**: esta conversa é um exemplo real de sessão que começa por TEXTO PURO
(Jamilly nunca manda mídia até depois da escalação). Até a 277, o agente não reagia a isso porque
o gatilho só disparava pra mídia. Com a expansão da 277, esta é exatamente a conversa que passa a
disparar o agente direto: o texto sinaliza "criar currículo", cai no mesmo gatilho de Serviço Alto
Toque que a mídia já usa, e escala do mesmo jeito.

```
🟡 SIMULADO
  ok
🟡 SIMULADO
  Chamando a equipe pra montar certinho
```

---

## Exemplo 4: Cliente manda várias mensagens seguidas

```
🟡 SIMULADO (cliente)
  Boa tarde
🟡 SIMULADO (cliente)
  [manda um documento, sem legenda]
🟡 SIMULADO (cliente)
  Preciso de 3 cópias
🟡 SIMULADO (cliente)
  Coloridas
🟡 SIMULADO (cliente)
  Ah, e uma em preto e branco também

  (o agente espera; não responde a cada mensagem separada, espera cerca de 1 minuto e meio de
  silêncio antes de considerar que o cliente terminou de explicar)

🟡 SIMULADO
  3 coloridas + 1 P&B, isso mesmo?
```

O "obrigado"/"obg" é o padrão real de **encerramento**, quando a conversa já está resolvida, não
de confirmação de recebimento no meio da conversa. Confirmar objetivamente o que foi recebido,
sem "obrigado" e sem abrir com "recebemos", é o padrão certo neste ponto.

**Nota da demanda 277**: a espera de rajada (buffer de 90s) já é genérica no `206`: o mecanismo
(`Anexar ao Buffer` → `Esperar Pausa 90s`) lê `message_text`/`caption` de qualquer mensagem nova
na sessão, mídia ou texto, sem distinguir. Isso já cobre texto fragmentado do mesmo jeito que
cobre hoje mídia seguida de texto misto, sem precisar de nenhuma mudança pra funcionar também no
caminho novo de texto puro (ver especificação técnica na Parte 2).

---

## Exemplo 5: Comunicação de preço, nem sempre o agente fala o número

Achado da demanda 255 (reconfirmado na leitura de 340 da 256): a equipe **só fala o valor em
texto quando é produto de tabela fixa**, fácil de citar de cabeça. Em produto sob encomenda, o
padrão real é mandar direto o código Pix, sem cravar o número em português.

**(a) Produto de tabela fixa, o agente PODE falar o valor:**
```
🔵 REAL (cliente)
  Bom dia
🔵 REAL
  Manuela Moreira
🔵 REAL
  Pode imprimir só a primeira folha

🔵 REAL
  Bom dia, Manu! Recebemos seu pedido. Valor impressão 1,20.
```

**(b) Produto sob encomenda, o agente NÃO inventa um valor, manda o Pix direto:**
```
🔵 REAL (Rafaela)
  Bom dia!
🔵 REAL
  Gostaria de 20 unidades dessa imagem no tamanho 2,5 x 2,5 cm no papel adesivo
🔵 REAL
  Quanto fica?
🔵 REAL
  Redondo, Com corte
🔵 REAL
  Me manda ao Pix por favor

🔵 REAL
  recebido, assim que sair do corte avisaremos para vir buscar.
```

**Regra pro agente**: se o produto é de tabela fixa (impressão avulsa por folha, xerox, papel
cartão, papel couché), pode informar o preço direto. Se é sob encomenda (adesivo com corte,
plastificação, personalizado, consulta/agendamento), **nunca inventa um número**: ou manda o Pix
já com o valor calculado pelo sistema, ou escala pra equipe decidir o preço, mas não cita um valor
que não veio de um cálculo confirmado.

---

## Exemplo 6: Cancelamento

Política de negócio (decisão do Edvam, não é achado de conversa real, ver nota abaixo):
cancelamento se comporta diferente dependendo do estado do pedido.

**Situação 1, pedido ainda NÃO foi pago**: o agente resolve sozinho, sem escalar. É o mesmo que
qualquer atendente já pode fazer hoje.
```
🟡 SIMULADO
  IMPRESSÃO PAPEL FOTO A4, R$ 6,50. Confirma?

🟡 SIMULADO (cliente)
  Ah deixa, quero cancelar

🟡 SIMULADO
  Sem problemas, cancelado! 😊
```

**Situação 2, pedido JÁ FOI PAGO**: o agente não decide sozinho, escala com o motivo real.
```
🟡 SIMULADO (cliente)
  Quero cancelar aquele pedido

🟡 SIMULADO
  Você já pagou esse. Vou pedir pra equipe processar a devolução
```

**Situação 3, pedido JÁ FOI ENTREGUE**: escala pro Admin especificamente, não pra fila geral.
```
🟡 SIMULADO (cliente)
  Quero cancelar aquele pedido

🟡 SIMULADO
  Esse já foi entregue. Vou verificar e te aviso
```

A partir da Situação 2 ou 3, nenhuma mensagem automática a mais é enviada. A conversa fica
marcada pra um atendente humano assumir pelo Inbox, do jeito de sempre.

---

## Exemplo 7: Cuidado com pagamento antes da hora

```
🟡 SIMULADO (cliente)
  [manda um documento, sem legenda]
🟡 SIMULADO (cliente)
  [manda print de um comprovante de Pix, R$ 5,00]
🟡 SIMULADO (cliente)
  Pronto, já paguei!

🟡 SIMULADO
  Opa, vi o comprovante!
🟡 SIMULADO
  Ainda não confirmei o valor certo, só um minuto 😊

⚙️ SISTEMA: o valor real da impressão é R$ 1,20, diferente do comprovante de R$ 5,00

🟡 SIMULADO
  Confirmado, fica R$ 1,20
🟡 SIMULADO
  Você mandou R$ 5,00
🟡 SIMULADO
  Tem uma diferença
🟡 SIMULADO
  Vou chamar a equipe pra acertar 😊
```

O agente nunca deixa passar batido um pagamento que não bate com o valor certo. Sempre chama um
humano pra resolver a diferença, em vez de tentar decidir sozinho.

---

## Exemplo 8: Confusão com a Dizu Refeições (mesmo número, outro negócio do grupo)

A Dizu Refeições (marmita, mesmo grupo/mesmo espaço físico da JS Gráfica) divulga cardápio usando
o número da JS Gráfica porque ainda não tem número próprio (achado das demandas 256/257). **Isso
não é um problema que desaparece quando a Dizu ganhar seu próprio número**: o número da JS
Gráfica é o que já está salvo na agenda de muita gente, associado à fachada/ao mesmo espaço
físico — sempre vai ter alguém perguntando de comida por aqui, em algum volume baixo e constante,
mesmo depois. O agente precisa reconhecer esse padrão permanentemente, não só enquanto durar a
divulgação manual de hoje.

```
🔵 REAL (padrão observado, investigação 257)
  [cliente pergunta sobre cardápio, prato do dia, valor de marmita/quentinha]

⚙️ SISTEMA: o agente reconhece o padrão (comida, prato, cardápio, valor fixo por refeição) e
   nunca decide sozinho — em especial, nunca afirma "número errado": às vezes é a própria
   equipe atendendo pedido de Dizu de propósito por aqui, quando o WhatsApp da Dizu está fora do
   ar (achado da demanda 246)

🟡 SIMULADO
  Chamando a equipe
```

**Regra permanente, reforçada com trava de dado**: mensagem classificada como padrão Dizu nunca
gera pedido/cobrança automática da JS Gráfica — sempre escala, sempre é um humano que decide
(encaminhar pra Dizu, atender por conta própria se for o caso, ou só avisar que é outro número).
A trava não é só de comportamento do agente, é de dado: nenhum `jsgrafica_pedido` nasce de
mensagem classificada como Dizu — protege mesmo se o comportamento do agente mudar de novo no
futuro. O vazamento financeiro real já aconteceu sem essa trava (`ped-1029`, R$400,00,
"Recebimento de empréstimo", contando indevidamente no fechamento de 15-07-26, achado da 257,
ainda não corrigido retroativamente).

---

## Exemplo 9: Texto puro que já nomeia o pedido objetivamente (novo, demanda 277)

Sessão nova, sem nenhuma mídia. Quando o texto já nomeia produto/quantidade com clareza, o agente
segue direto pra proposta, o mesmo padrão que documento óbvio já usa pra mídia.

```
🔵 REAL (Maria Clara)
  Boa tarde.
🔵 REAL
  Maria Clara Gonçalves de Andrade
🔵 REAL
  Quanto é o preço de 30 xerox
🔵 REAL
  É uma apostila só precisamos APARTIR do tema da 4 semana
🔵 REAL
  As páginas de 10 a14 frente e verso.

🔵 REAL
  a xerox p/b 0,45 colorida 1,20
```

O agente reconhece "30 xerox, páginas 10 a 14, frente e verso" como pedido objetivo (quantidade e
especificação claras) e monta a proposta direto, sem pergunta aberta. O vocabulário do cliente
("xerox" pra impressão de arquivo digital, não fotocópia física) não é corrigido pelo agente,
mesmo princípio já documentado em "Outros casos rápidos" abaixo, só que agora vale desde a
primeira mensagem de texto, não só depois de mídia.

---

## Exemplo 10: Texto puro ambíguo (novo, demanda 277)

Sessão nova, sem nenhuma mídia. Quando o texto sinaliza que o cliente quer algo da gráfica mas não
fecha um produto específico, o agente pergunta 1 coisa objetiva, igual já faz pra imagem ambígua,
antes de qualquer lista.

```
🔵 REAL (Débora Borges)
  Olá! Vim pelo site e preciso de um orçamento.
🔵 REAL
  Débora Borges
🔵 REAL
  Ola boa tarde
🔵 REAL
  Vocês fazem panfletos?

🔵 REAL
  Oi Débora, boa tarde! Que bom que veio pelo site. Me diz o que você precisa pra eu te ajudar
  com o orçamento. 😊

🔵 REAL
  Vocês fazem Aparti de quantos ?
🔵 REAL
  10x15
🔵 REAL
  Seria 4 em uma folha

🔵 REAL
  Seria em que papel
```

O agente não força uma lista de categorias na primeira resposta. Pergunta 1 coisa de cada vez
("qual quantidade?", "qual tamanho?"), do mesmo jeito que a Regra 3 do manual já documenta pra
mídia ambígua. Só cai na lista de categorias (Exemplo 2) se depois de 1-2 perguntas o pedido ainda
não fechar num produto específico.

```
🟡 SIMULADO
  Deixa eu te mostrar as opções, aí você me diz qual encaixa:
  📋 Xerox (cópia): P&B ou colorida
  📋 Impressões: papel ofício, foto, couché, cartão, adesivo
  📋 Consulta online: currículo, CPF, cadastro, digitação...
  📋 Recargas: celular ou VEM
  📋 Escritório: papel, caneta, encadernação, plastificação
  📋 Personalizados: festa, presente, banner, caneca...
  📋 Outro: não sei / nenhuma das opções
```

**Diferença importante em relação à mídia ambígua**: pra imagem, o agente sempre entra em ação
(qualquer imagem sem legenda dispara o fluxo). Pra texto, o agente só entra em ação se o texto já
tiver algum sinal de que o cliente quer um serviço da gráfica (produto, quantidade, pergunta de
preço, nome de documento). Uma mensagem só de saudação ("Oi", "Bom dia", sem mais nada) **não**
dispara o agente, ele nunca inicia conversa nem "força" o cliente a dizer o que quer. Ver
especificação técnica na Parte 2 pra como isso é decidido (classificação, não presença/ausência
de texto).

---

## Exemplo 11: Contexto de conversa recente evita repetir pergunta já feita (novo, demanda 291)

Cliente recorrente, José Roberto Silva (`558191414184`, lote 06 da demanda 256), documentado como
um dos clientes mais engajados do mês, várias visitas com produtos diferentes (P&B A4, papel
foto, plastificação, xerox). Numa das visitas reais, ele perguntou sobre banner sem fechar o
pedido:

```
🔵 REAL (José Roberto, 09/07)
  este vou verificar o valor e tamanho, é um banner, não sei se vocês trabalham, quando chegar ai
  conversamos

🔵 REAL (equipe, 09/07)
  Bom dia vai ser que tipo de papel
```

A conversa fecha sem resposta do cliente (achado real: mensagem sem resposta capturada não é
prova de mau atendimento, é limite de captura, ver Parte 2). Semanas depois, numa sessão nova:

```
🟡 SIMULADO (José Roberto)
  Lembra do banner que perguntei? Fecha esse tamanho mesmo

⚙️ SISTEMA: o agente busca as últimas mensagens reais desse telefone (contexto de conversa
   recente, ver Parte 2) antes de responder, sem precisar o cliente reexplicar do zero

🟡 SIMULADO
  Achei aqui, ainda não tinha fechado o tamanho do banner, confirma de novo pra mim?
```

Sem o contexto, essa mensagem cairia como texto ambíguo genérico (Exemplo 10), pedindo pro
cliente descrever tudo de novo, inclusive o que ele já tinha dito ("é um banner"). Com contexto, o
agente sabe que "banner" já é o produto em jogo, só falta o dado que ficou pendente (tamanho), a
pergunta de volta é mais direta, não uma pergunta aberta genérica.

**O texto do agente segue a régua de correção (ver Parte 2)**: curto, sem travessão, sem forçar
gíria nova, mesmo padrão de registro do checklist de voz (seção 7 da base de conhecimento) — não
foi preciso corrigir nada aqui porque não há erro de digitação na fala simulada, mas a régua vale
igual, é aplicada em toda fala nova do agente, não só quando há algo pra corrigir.

---

## Exemplo 12: Régua de correção, o que manter e o que corrigir (novo, demanda 291)

Reaproveitando a própria citação real do Exemplo 3 (Jamilly, currículo), a resposta real da
equipe tem um erro de digitação genuíno: "sua **correão** antes de gerar o pdf" (queria dizer
"correção"). Se o agente algum dia gerar uma mensagem nova inspirada nesse padrão de resposta
(currículo em produção, aviso de revisão antes do PDF final), a régua de correção decide o que
sobrevive e o que não:

```
🔵 REAL (equipe, citação original, Exemplo 3)
  Oi, Jamilly! Seu currículo já está produção, assim que estiver pronto enviaremos para sua
  correão antes de gerar o pdf, valor 5,00

🟡 SIMULADO (mesma estrutura, régua de correção aplicada)
  Oi! Seu currículo já tá em produção, mandamos pra revisão antes de gerar o pdf, valor 5,00
```

O que mudou e por quê (ver tabela completa na Parte 2):
- "correão" virou "revisão" (troquei a palavra em vez de só consertar a grafia, mas o princípio é
  o mesmo: erro de digitação que quebra a palavra nunca sobrevive, é erro básico, não é tom).
- "está produção" (faltando "em") virou "tá em produção": erro de concordância/gramática básico
  corrigido, "tá" (abreviação de "está") foi MANTIDO, é registro real, não erro.
- O resto (frase curta, direto ao ponto, sem emoji forçado) ficou igual: é exatamente o tom real
  medido no checklist de voz, não precisa de correção nenhuma.

---

## Outros casos rápidos

**Cliente chama de "xerox"/"cópia" uma coisa que não é fotocópia física**: achado da demanda 256:
clientes usam "xerox" e "cópia" tanto pra fotocópia de papel quanto pra impressão de arquivo
digital, e continuam usando o termo mesmo depois de a equipe tentar corrigir (caso real: cliente
pediu preço de "30 xerox" pra um PDF; a equipe corrigiu que era impressão, não xerox; ela seguiu
chamando de "É xerox" mesmo assim). **O agente não força o cliente a usar o termo certo**, só
identifica o produto certo por trás da palavra e segue, sem discutir terminologia.

**Quando o pedido envolve dado pessoal (além de currículo, ex. digitação de documento,
antecedentes, conta gov)**: o agente reconhece que não é um caso simples e chama a equipe direto,
sem tentar coletar os dados sozinho.
```
🟡 SIMULADO
  Chamando a equipe
```

**Achado da demanda 277, Regra 4 do manual (234)**: essa cautela não é hipotética, é o que a
própria equipe humana já faz hoje. 2 casos reais: `558198324841` (Iraneide Peixoto) só seguiu com
o currículo depois de colar um template inteiro de campos ("Nome Completo: Endereço: Telefone:
[...]") pro cliente preencher, nunca tentando adivinhar; `558189032016` (Luciana, agendamento de
identidade) a equipe pediu explicitamente "CPF e senha do Gov.br da pessoa" antes de agendar, e
recusou avançar sem isso. Confirma: dado sensível trocado em texto puro no WhatsApp já é prática
da equipe, o agente não está inventando um risco novo ao escalar isso, só reconhecendo o mesmo
risco que a equipe já trata com cuidado hoje.

**Quando o cliente já avisa que paga na retirada**: o agente não insiste em mandar Pix.
```
🔵 REAL (cliente)
  Vou passar aí prá passar no cartão.
🟡 SIMULADO
  Combinado! Acerta na retirada 😊
```

**Quando chega áudio**: áudio como canal de pedido tem volume baixo e conversão baixíssima (11%,
demanda 255). O agente não tenta interpretar o conteúdo do áudio. Registra o recebimento e passa
pra fila manual, sem tentar decidir produto/preço a partir de uma transcrição.
```
🟡 SIMULADO
  Chamando a equipe pra ouvir certinho
```

---

# PARTE 2: Parte técnica

Material de apoio: histórico de correção, fundamentação técnica real, achados de risco. Não é
necessário pra aprovar a Parte 1. É registro de como se chegou nesse resultado, pra quem for
implementar ou revisar depois.

## Histórico de correção deste documento

Este blueprint passou por 8 rodadas de revisão antes de chegar na versão final da Parte 1:

- **244 (2026-07-29)**: versão original, primeiro rascunho de conversas exemplo cobrindo as 11
  regras do manual de resposta (demanda 234).
- **246**: 2 problemas achados pelo Edvam: tom de mensagem em parágrafo longo (corrigido pra
  mensagens curtas) e lógica errada do filtro de número compartilhado (o agente afirmava "número
  errado" quando isso podia ser falso).
- **247**: a documentação real da Z-API (o gateway de WhatsApp usado) nunca tinha sido lida antes
  de propor botão/lista/Pix. Lida, ver "Fundamentação técnica real" abaixo.
- **251/252**: revisão sistemática de tom e sincronização com o resultado real da demanda 250
  (texto do Pix, rascunho automático de confirmação de pagamento).
- **253**: reestruturação em 2 partes: Parte 1 (limpa, pra aprovação) e a parte técnica.
- **254**: checkpoint mais profundo até então: revalidou o *mecanismo* de cada exemplo contra a
  evidência real (não só tom/organização). Achou 3 erros de mecanismo, corrigidos.
- **255/256 (2026-07-30, base de conhecimento, não é rodada de correção do blueprint em si)**:
  o Edvam pediu pesquisa muito mais profunda antes de qualquer novo mecanismo. Escalado pra
  cobertura real: 100% dos clientes reais no quantitativo (668, histórico completo), 340 (51%)
  lidos de verdade no qualitativo, seleção sistemática. Achado central: ~38% dos clientes reais
  não escrevem nenhuma palavra. "Pedido mudo" é maioria, não exceção. Proposta de categorias na
  linguagem real do cliente (9 grupos), não mais a categoria interna. Consolidado em
  `pm/conhecimento/base-conhecimento-atendimento-completa.md`.
- **259**: reescrita completa do blueprint usando a base 255/256 como fundamento obrigatório:
  fluxo de mídia ambígua redesenhado com a taxonomia de 9 grupos (Exemplo 2); comportamento
  inicial diferenciado por tipo de mídia real, documento vs. imagem vs. áudio (Exemplos 1, 2,
  "outros casos rápidos"); "pedido mudo" desenhado como fluxo principal, não exceção (Exemplos 1
  e 2); comunicação de preço corrigida pro padrão real: tabela fixa fala o valor, sob encomenda
  nunca inventa número (Exemplo 5, novo); nova política de cancelamento com 3 situações (não
  pago / pago / entregue), cada uma com motivo real (Exemplo 6, substitui o cancelamento genérico
  anterior); **removida por completo toda referência a confusão com outro negócio usando o mesmo
  número de WhatsApp**: decisão do Edvam, essa situação é temporária e está sendo resolvida por
  outro caminho (ver achado registrado na memória do projeto), não faz sentido desenhar
  comportamento permanente do agente em cima disso.
- **260 (esta revisão, 2026-07-30)**: auditoria de voz achou que a camada de conteúdo/decisão
  estava bem embasada, mas as ~29 falas do agente tinham sido escritas por estilo, não extraídas
  do corpus (a fórmula "Recebemos [X] 😊", presente em 6 exemplos, nunca aparece nos 340 clientes
  reais lidos). Extraída checklist de voz real com contagem sistemática das 191 respostas
  manuais genuínas dos 12 lotes de evidência (seção 7 de `base-conhecimento-atendimento-
  completa.md`): emoji em 29% das respostas (não maioria), sempre único e quase sempre no fim da
  mensagem, moda de tamanho é 1-3 palavras, e 54% das respostas têm alguma marca real de
  informalidade (minúscula no início, falta de acento, abreviação, erro de digitação). Todas as
  falas do agente reescritas seguindo essa checklist, com a fórmula "Recebemos X 😊" eliminada
  (em 3 casos, a linha inteira foi removida em vez de reescrita, indo direto pra pergunta/ação
  seguinte, que é como o time realmente se comporta). Removido todo uso do caractere de
  travessão do documento inteiro. Limite de itens/caracteres da lista do Exemplo 2 resolvido com fonte real (limite
  oficial de mensagem de lista interativa do WhatsApp, verificado via documentação da Meta):
  títulos reduzidos pra caber em 24 caracteres, detalhe movido pra descrição da linha (até 72
  caracteres), 9 itens dentro do limite de 10 linhas totais.
- **272 (2026-08-14, lista de categorias, já registrada acima no Exemplo 2)**: substituída a lista
  de 9 grupos por 6 categorias reais do catálogo + Outro, decisão direta do Edvam.
- **277 (2026-08-15, esta revisão)**: desenho de como o agente passa a atender também mensagem de
  texto puro (sessão nova sem nenhuma mídia), não só mídia sem legenda. Reaproveita 100% dos
  gatilhos de escalonamento já existentes no `206` (Serviço Alto Toque, cancelar, negociação de
  pagamento, Dizu, buffer de rajada), não inventa mecanismo novo, só estende o que já entra na
  triagem. Novos Exemplos 9 (texto objetivo → proposta direta) e 10 (texto ambíguo → pergunta →
  lista, só se necessário). Nota nova no Exemplo 3 e no "outros casos rápidos" citando 2 evidências
  reais adicionais da Regra 4 do manual (234) sobre dado pessoal/gov.br em texto puro. Especificação
  técnica completa de mudanças no `206` (não implementadas nesta demanda, ver seção própria abaixo)
  pro 01-N8N executar depois.
- **291 (2026-08-16, esta revisão)**: passo 1 da sequência híbrida recomendada pela demanda 290
  (análise de arquitetura). Régua de correção explícita: o que do padrão real do time (seção 7 da
  base de conhecimento, demanda 260) o agente deve seguir literalmente (registro informal real,
  abreviação, interjeição) vs. corrigir antes de mandar (erro de digitação que quebra a palavra,
  falta de acentuação, essa última por decisão explícita do Edvam, não achado novo). Desenho do
  mecanismo de contexto de conversa recente (últimas mensagens reais do mesmo telefone entrando na
  geração da resposta), com janela de tamanho e tempo justificadas, cuidado de performance (mesmo
  princípio da demanda 284: nunca ordenar tudo e cortar depois, sempre `ORDER BY ... LIMIT` direto
  no banco usando índice) e cuidado de dado sensível (Regra 4 do manual 234: mensagem já
  classificada como Alto Toque nunca entra no contexto livre reenviado). Novos Exemplos 11
  (contexto recente) e 12 (régua de correção). Nem prompt final nem implementação, isso é o passo
  2, demanda separada.

## Checkpoint da demanda 254 (preservado, ainda válido)

**(a) Autoria das citações da Regra 9**: reconferido nos 40 casos qualitativos originais da 234.
Das 4 citações do manual, **2 são reais e de autoria da EQUIPE**: `558187613253` (Otto Silva) e
`558187734290` (Rodrigo Isidoro). **As outras 2 estão erradas** (`558188167372` sem citação real;
`558196517857` nunca fez parte da subamostra lida), reportado ao PM, correção fora do escopo
desta demanda mexer no arquivo da 234.

**(b) Precedente real de resposta a cancelamento/escalação por texto**: na época da 254, busca
nos 40 casos qualitativos da 234 (termos "cancelar"/"desistir"): zero ocorrências. **Isso segue
verdadeiro**: a política de cancelamento do Exemplo 6 (Parte 1) não é reconstrução de conversa
real, é **regra de negócio definida diretamente pelo Edvam nesta demanda (259)**, marcada como tal
na tabela de verificação abaixo, não confundir com HIPÓTESE (que significaria "proposta de
redação sem embasamento"), aqui existe embasamento, só que é uma decisão explícita, não um
padrão observado em conversa.

## Triagem de texto puro: fundamentação e o que muda no `206` (demanda 277)

### Como a equipe humana reage hoje quando a sessão começa por texto puro

Base: manual de resposta (`manual-resposta-ia-100-clientes.md`, demanda 234) e leitura de 340
clientes reais (demanda 256), que incluiu muitas sessões iniciadas por texto puro (não só mídia,
apesar de o blueprint anterior só ter automatizado o caminho de mídia). Achados que sustentam o
Exemplo 9 e 10:

- **Regra 2 (documento óbvio → direto) e Regra 3 (ambíguo → pergunta 1 coisa) não são específicas
  de mídia**: as citações originais da Regra 3 no manual (234) já incluem casos onde a equipe
  pergunta "colorido ou preto e branco?" e "qual a forma de pagamento?" em sequência, o mesmo
  padrão vale quando o pedido chegou por texto (caso Maria Clara, Exemplo 9; caso Débora Borges,
  Exemplo 10) ou por imagem (Exemplo 2). A régua de "pergunta 1 coisa objetiva de cada vez, nunca
  lista de cara" já era comportamento geral da equipe, não amarrado ao tipo de mídia.
- **Regra 4 (dado pessoal → template estruturado, nunca adivinhação) tem evidência real
  específica de texto puro**: `558198324841` (Iraneide, currículo) e `558189032016` (Luciana,
  agendamento com CPF/senha Gov.br), ambos citados no manual, são conversas que começam e
  continuam inteiramente por texto. Essa é exatamente a Regra 4 que motivou a ressalva original da
  demanda 243 (esperar antes de automatizar texto), mas o achado confirma que a régua de escalar
  já existe e é seguida pela equipe humana hoje, o agente só reproduz essa régua, não relaxa nela.
- **Escala quantitativa (668 clientes, base de conhecimento seção 3)**: 185 dos 668 clientes reais
  (27,7%) tiveram TEXTO como tipo de mídia inicial (não documento, não imagem). Desses, 120 (64,9%)
  têm categoria predominante "Impressão papel ofício" e 17 (9,2%) "Consulta Online", distribuição
  parecida com documento/imagem (dominado por ofício), reforçando que texto puro não é um universo
  de pedido diferente, é o mesmo leque de produtos, só chegando descrito em palavras em vez de
  arquivo.

### Especificação técnica pro 01-N8N implementar (NÃO implementado nesta demanda)

Mapeamento contra o workflow real `206 - JSGRAFICA | AGENTE FASE B` (conferido direto no JSON do
workflow, backup `pm/backups/206-jsgrafica-agente-fase-b_pre-demanda274_2026-08-15.json`), pra que
o 01-N8N tenha uma demanda de implementação sem ambiguidade:

1. **Novo gatilho de entrada, ao lado de `É Mídia Sem Legenda?`**: hoje, quando não há sessão
   ativa (`Tem Sessão?` = falso), o fluxo testa só `É Mídia Sem Legenda?` (mídia presente E
   `message_text`/`caption` vazios), se falso, cai em `Stop Fora de Escopo` e nada acontece.
   Precisa de um novo nó IF, por exemplo `É Texto Puro (Sessão Nova)?`, testando o oposto: mídia
   AUSENTE e `message_text` não vazio. Quando verdadeiro, NÃO cria sessão nem envia confirmação
   de recebimento ainda (diferente da mídia, que sempre confirma recebimento antes de analisar,
   porque baixar/processar mídia demora, texto é instantâneo), vai direto pra classificação.
2. **Novo nó de classificação por texto, ao lado de `Gemini Analisar Mídia`**: hoje a mídia passa
   por `Baixar Mídia` → `Converter Mídia Base64` → `Gemini Analisar Mídia` (envia o arquivo em
   base64) → `Parsear Resposta Gemini`. Pra texto, não existe arquivo pra baixar, então o novo nó
   (`Gemini Analisar Texto`, por exemplo) chama a API do Gemini direto com `message_text`, um
   prompt equivalente ao da mídia mas adaptado, retornando o MESMO formato de campos que
   `Parsear Resposta Gemini` já produz hoje: `classificacao` (`"documento_obvio"` ou `"ambiguo"`,
   nomenclatura mantida por compatibilidade mesmo sendo texto, não documento) e
   `produto_ou_valor_detectado`. Sugestão de prompt: "Você está analisando uma mensagem de texto
   de um cliente numa conversa de WhatsApp com uma gráfica rápida (JS Gráfica, Recife-PE).
   Responda SOMENTE em JSON válido: {"classificacao": "documento_obvio" (o cliente já nomeou um
   produto/serviço específico com informação suficiente pra fazer uma proposta, ex. quantidade,
   tipo de papel, cor) ou "ambiguo" (o cliente sinaliza que quer algo da gráfica mas falta
   informação pra fechar um produto) ou "fora_de_escopo" (a mensagem não tem nenhum sinal de
   pedido pra gráfica, ex. só saudação, conversa aleatória), "produto_ou_valor_detectado": string
   ou null}". O valor novo `"fora_de_escopo"` não existe no fluxo de mídia (mídia sempre tem
   algum conteúdo pra analisar), precisa de 1 branch novo: se `"fora_de_escopo"`, vai pra
   `Stop Fora de Escopo` (o mesmo nó que já existe), sem criar sessão, sem responder nada. Isso é
   o que garante que "Oi"/"Bom dia" sozinho não dispara o agente (ver nota do Exemplo 10).
3. **Reaproveitar sem alteração**: `Documento Óbvio?` (testa `gemini_classificacao ===
   "documento_obvio"`, já funciona igual pro campo vindo do texto), `Serviço Alto Toque?` (regex
   sobre `gemini_produto_detectado`, já funciona igual), `Produto Detectado Tem Sinal?`,
   `GET Produto P&B A4` → `Montar Proposta` → `Enviar Proposta Botões` (caminho de proposta
   direta), `Tipo Não Identificado?`/`Enviar Lista Categorias` (caminho ambíguo → lista), `Anexar
   ao Buffer`/`Esperar Pausa 90s` (rajada, já genérico). Nenhum desses precisa mudar.
4. **Gap de regex a corrigir, achado desta demanda**: o regex de `Serviço Alto Toque?` hoje é
   `/curr[ií]culo|digita[çc][ãa]o|prova|antecedente|foto composta|composi[çc][ãa]o/i`, cobre
   currículo, digitação, prova, antecedente, mas **não cobre "conta gov"**, mesmo a Regra 4 do
   manual (234) citando exatamente um caso de agendamento com CPF/senha de Gov.br
   (`558189032016`, Luciana) como o tipo de risco que motiva a escalação. Recomendação: adicionar
   termos ao regex, por exemplo `gov\.?br|conta gov|senha do gov`, antes de conectar texto em
   produção, sem isso, um cliente que escreve "preciso de ajuda com conta gov" pode não ser
   pego pelo gatilho de alto toque, dependendo do que o Gemini extrair como
   `produto_ou_valor_detectado`.
5. **Nó de erro de classificação**: hoje, se `Gemini Analisar Mídia` falha, cai em `Escalar -
   Arquivo Com Problema` (via `onError: continueErrorOutput`). Pra texto, sugestão de reaproveitar
   o mesmo nó de escalação (ajustando o nome pra algo mais genérico tipo `Escalar - Erro
   Classificação`, ou simplesmente apontar `Gemini Analisar Texto` pro mesmo `Escalar - Arquivo
   Com Problema` já existente, já que a ação é idêntica: marcar sessão como escalada e não travar
   o restante do `01`).
6. **Nada muda em**: `Filtro Dizu`, `É Dizu?`, `Contém Cancelar?`, `Negociação Pagamento Fora
   Padrão?`, todos já leem `message_text`/`caption` de forma genérica, já cobrem texto puro hoje
   (rodam ANTES do gate de mídia/texto no fluxo, pra qualquer mensagem, com ou sem sessão ativa).
   Igual `Confirma Proposta?`/`Nega Proposta?`/`Escolheu Categoria?` (leitura de sessão ativa,
   também já genérica).
7. **Fora desta especificação, decisão de produto pendente**: o `206` hoje só tem 1 produto com
   proposta automática de verdade (`IMPRESSÃO P&B A4`, hardcoded em `GET Produto P&B A4`), todo
   "documento óbvio"/"produto detectado com sinal" vira proposta desse produto, independente do
   que o Gemini realmente detectou. Isso já é uma limitação conhecida do caminho de mídia (não
   desta demanda), mas vale registrar que ela se propaga igual pro caminho de texto: um cliente
   que escreve "quanto custa impressão colorida?" (Exemplo 9 hipotético) cairia na mesma proposta
   fixa de P&B A4 até essa limitação ser resolvida à parte, fora do escopo de 277.

## Régua de correção e contexto de conversa recente (demanda 291)

Passo 1 da sequência híbrida recomendada pela demanda 290 (`analise-arquitetura-atendimento-
humanizado-vs-estruturado.md`): antes de escrever qualquer prompt novo pro Gemini gerar texto
livre (passo 2, demanda separada), decidir com clareza 2 coisas que o Edvam pediu explicitamente:
o agente tem que soar como o time real (mas corrigindo erro básico), e a resposta tem que
considerar o que já foi conversado recentemente com aquele cliente.

### Régua de correção: o que o padrão real do time diz, e o que fazer com cada parte

O checklist de voz da demanda 260 (seção 7 da base de conhecimento) já mediu a informalidade real
do time (54% das 191 respostas reais têm alguma marca de informalidade), mas tratou isso como um
bloco só. Esta demanda separa esse bloco em "isso é tom" (segue literal) e "isso é erro" (corrige
antes de mandar), usando os próprios exemplos já catalogados na seção 7:

| Padrão real observado | O que fazer | Por quê |
|---|---|---|
| Início de frase em minúscula ("bom dia", "pode vir buscar") | **MANTER** | Registro real medido, não é erro, é como o time realmente escreve |
| Abreviação comum ("obg", "vc", "pra", "tá") | **MANTER** | Vocabulário real observado (não é gíria inventada, é o que apareceu no corpus) |
| Interjeição informal ("Opa", "Show de bola") | **MANTER** | Dá exatamente o tom humano que o Edvam pediu pra preservar |
| Ênfase em maiúscula (rara, ex. "BOA TARDE") | **MANTER quando acontecer, mas não é a regra a seguir de propósito** | Existe no corpus (não proibida), mas é exceção, não padrão a reproduzir sempre |
| Falta de acento ("nao", "esta", "sera", "ira") | **CORRIGIR** | Decisão explícita do Edvam nesta demanda: mesmo sendo parte do padrão real medido (achado da 260), ele pediu correção básica de acentuação. Isso é decisão de produto por cima da evidência, não uma descoberta nova, registrado aqui pra não confundir com achado escondido |
| Erro de digitação que quebra a palavra ("correão", "Obrigo", "ttarde", "pade", "Bo dia") | **CORRIGIR** | É engano, não registro. Mesmo o time, se relesse, teria corrigido, não é o tom que o Edvam quer preservar |
| Pontuação/gramática básica que muda o sentido (concordância quebrada, frase confusa) | **CORRIGIR** | Ambiguidade real de leitura pro cliente é um problema diferente de informalidade de tom |

**Regra de decisão, resumida**: se o padrão observado é uma ESCOLHA de registro (abreviar,
começar com minúscula, usar interjeição) o agente reproduz. Se é um ENGANO (letra errada, palavra
que não se forma direito, acento que muda a clareza), o agente corrige. A régua não é "replicar
tudo que é informal", é "replicar o jeito de falar, não os deslizes". Exemplo aplicado no
Exemplo 12 (Parte 1).

**O que continua igual, do checklist da 260**: emoji como exceção controlada (no máximo 1 a cada
3 falas, sempre 😊 ou 😉, nunca outro), preferir curto (moda real é 1-3 palavras), nunca inventar
gíria que não apareceu no corpus, nunca travessão. A régua de correção desta demanda é um adendo
ao checklist, não substitui nada dele.

### Contexto de conversa recente: o que buscar, de onde, e com que cuidado

**O que não existe hoje**: o `206` só enxerga a sessão atual (`jsgrafica_agente_teste_sessoes`),
criada quando a triagem dispara e concluída/escalada no fim da interação. Não olha nada de
conversas anteriores do mesmo telefone, mesmo pra cliente recorrente (41% dos 668 clientes reais,
seção 3 da base de conhecimento).

**Fonte**: `jsgrafica_log_msgs_privadas`, mesma tabela e mesmo padrão de filtro já usado desde as
demandas 255/256 (`is_group=false`, `apagada_em IS NULL`, `data_timestamp` em milissegundos,
excluir telefones de teste/contaminação conhecidos). Não é dado novo pra coletar, é dado que já
existe e já está sendo lido pra outras finalidades (Inbox, pesquisas de base).

**Quantidade e janela, com justificativa, não chute**:
- **Até 8 mensagens mais recentes** (dos dois lados, cliente e equipe/agente) do mesmo telefone.
  Justificativa: a moda real de tamanho de resposta é 1-3 palavras (seção 7), 8 mensagens é
  aproximadamente 4 trocas completas, pequeno o bastante pra não virar contexto caro/gigante,
  grande o bastante pra capturar 1-2 trocas de continuidade real (ver Exemplo 11).
- **Até 7 dias pra trás**. Justificativa: sessão de atendimento já é definida como 4h+ de silêncio
  (demandas 159-163, reused em toda esta base) — 7 dias é "essa semana", dá continuidade sem
  arrastar meses de histórico irrelevante pra cliente de alto volume.
- **O menor dos dois limites vale**: cliente de baixo volume (a maioria) nem chega a 8 mensagens
  dentro de 7 dias; cliente de alto volume (o problema que a demanda 284 documentou) não estoura
  as 8 mensagens mesmo tendo centenas de linhas no total histórico.
- **Não é RAG**: é uma janela fixa e pequena, direto no prompt, sem busca por similaridade — mesma
  recomendação da análise 290 de começar simples, contexto estático, antes de qualquer coisa mais
  cara.

**Cuidado de performance (mesmo princípio da demanda 284)**: a causa raiz da lentidão que a 284
corrigiu foi buscar/ordenar mensagens de MUITOS contatos numa sort combinada só, sem usar índice
de forma eficiente. Aqui o padrão é mais simples (1 telefone por vez, não um lote de 100), mas a
mesma lição vale: a consulta tem que ser `ORDER BY data_timestamp DESC LIMIT 8` direto no banco,
nunca "buscar tudo desse telefone e cortar/ordenar na aplicação". Antes de conectar de verdade,
confirmar com `EXPLAIN` que o índice em `phone`/`data_timestamp` (já existe desde as demandas
108/136) está sendo usado pra esse padrão específico, não presumir que está — mesma disciplina de
medir antes/depois já demonstrada nas demandas 108/284.

**Cuidado de dado sensível (Regra 4 do manual 234)**: mensagens de sessões que já foram
classificadas/escaladas como Serviço Alto Toque (currículo, digitação, antecedentes, conta gov,
dado pessoal em geral) **nunca entram no contexto livre reenviado pro Gemini**. Não é resumida,
não é mascarada parcialmente, fica de fora por completo. Justificativa: essas mensagens podem
conter CPF, endereço, senha de Gov.br (achado real da Regra 4, casos Iraneide/Luciana), e o
contexto de conversa recente é justamente pra gerar texto de baixo risco (saudação, transição,
continuidade de pedido), não pra reenviar dado sensível de uma interação anterior pra uma API
externa numa mensagem não relacionada. Detecção de "isso é sensível" reaproveita o MESMO gatilho
que já existe (`Serviço Alto Toque?`, regex sobre o produto detectado), mais um filtro simples de
padrão de CPF (sequência de dígitos no formato) e palavras como "senha"/"cpf"/"rg" — não é
mecanismo novo, é reaproveitamento do que já existe pra decidir o que fica de fora.

### Os dois mecanismos funcionando juntos

Contexto de conversa recente entra ANTES da geração da resposta (dado buscado, filtrado por
sensibilidade, resumido no prompt). Régua de correção se aplica DEPOIS, na hora de escrever o
texto (seja ele influenciado pelo contexto ou não). São etapas diferentes do mesmo pipeline, não
mecanismos concorrentes. Exemplo 11 (Parte 1) ilustra o contexto evitando repetir pergunta já
feita; Exemplo 12 ilustra a régua de correção aplicada numa fala inspirada em padrão real. Nenhum
dos dois exige RAG, embedding, ou busca por similaridade — os dois são desenho simples e barato de
propósito, seguindo a recomendação da análise 290.

## Fundamentação da taxonomia de linguagem de cliente (demanda 256 — histórico, superada pela 272)

**Superada em 2026-08-14 (demanda 272)**: a lista do Exemplo 2 hoje usa 6 categorias amplas
mapeadas direto contra o catálogo real (`jsgrafica_produtos`), decididas pelo Edvam, não mais os
9 grupos abaixo. Esta seção fica preservada como histórico/fundamentação de origem (o princípio
de "não usar vocabulário interno da gráfica" continua válido, só a granularidade mudou), não
como o desenho vigente.

A lista anterior do Exemplo 2 vinha da seção 2 de `base-conhecimento-atendimento-completa.md`
(demanda 256): leitura de 340 clientes reais (51% dos 666 confirmados na aprovação da demanda),
seleção sistemática por stride. Os 9 grupos, com 1 exemplo real cada (lista completa e citações na
fonte; título curto usado no Exemplo 2 entre parênteses, quando diferente do nome completo do
grupo):

| Grupo | O que é | Título curto no Exemplo 2 | Exemplo real |
|---|---|---|---|
| A: Imprimir documento pronto | Cliente já tem o arquivo, só quer imprimir | Documento pronto | "imprime pra mim" (maioria dos casos, inclusive sem nenhuma palavra) |
| D: Foto impressa | Por tamanho/formato, não por categoria | Foto impressa | "ESSA 15 X 20" / "AS OUTRAS 10 X 15" |
| B: Currículo | Montagem/edição, não só impressão | Editar currículo | "Quanto fica currículo em pdf" |
| C: Xerox/cópia ambíguo | Cliente não distingue fotocópia física de impressão digital | Xerox / cópia física | "É xerox" (mesmo após correção da equipe) |
| F: Personalizado (festa/presente/negócio) | Vocabulário de decoração, tamanho em cm | Algo personalizado | "quero fazer um topo do bolo... ursinho rosa" |
| E: Trâmite oficial assistido | Antecedentes, boletim de ocorrência, conta gov | Trâmite oficial | "Gostaria dos meus antecedentes criminais" |
| I: Recarga | Descrito só em R$, nada a ver com impressão | Recarga | "o senhor pode carregar 20 reais pra mim" |
| G: Plastificar/proteger | Geralmente bundle com carteirinha/crachá | Plastificar ou proteger | "emplastificasse e se tem um cordãozinho" |
| H: Redigir documento | Cliente dita conteúdo, equipe escreve | Redigir documento | carta ao CRAS colada por inteiro no chat |

**A ordem da lista no Exemplo 2 é PADRÃO GERAL** (proxy de volume combinando o crosstab
quantitativo dos 668 clientes, seção 3 da base, com a frequência qualitativa observada nos 340
lidos), **não uma contagem exata de %-por-grupo**: a leitura da 256 foi qualitativa/de padrão,
não uma contagem estruturada de "quantos clientes caem em cada um dos 9 grupos". Isso está
declarado aqui de forma explícita, não escondido.

## Catálogo real e peso de volume por categoria interna (achado da 234/254, ainda usado como
referência técnica, não é mais a base do Exemplo 2, que agora usa linguagem de cliente)

Consulta direta em `jsgrafica_produtos`/`jsgrafica_pedidos`, janela 2026-07-01 a 2026-07-30 (ver
`base-conhecimento-atendimento-completa.md` seção 3 pra versão em 100% da base real, 668
clientes, histórico completo):

| Categoria | Pedidos reais (1 mês) | % do total |
|---|---|---|
| Impressão papel ofício | 792 | 68,7% |
| Xerox | 90 | 7,8% |
| Consulta online | 64 | 5,6% |
| Impressão papel foto | 59 | 5,1% |
| Escritório | 35 | 3,0% |
| Impressão papel cartão | 21 | 1,8% |
| Impressão papel adesivo | 19 | 1,6% |
| Plastificação | 18 | 1,6% |
| Recarga VEM | 15 | 1,3% |
| Personalizados | 12 | 1,0% |
| Recarga celular | 8 | 0,7% |
| Encadernação | 8 | 0,7% |
| Impressão papel couché | 5 | 0,4% |
| Serviço terceirizado | 4 | 0,3% |

## Tabela de verificação: toda mensagem do agente na Parte 1

Classificação em 4 níveis: **[EVIDÊNCIA DIRETA]** (citação exata ou quase literal de conversa
real), **[PADRÃO GERAL]** (grounded numa regra/achado documentado com múltiplos casos reais, mas
sem 1 citação exata idêntica), **[HIPÓTESE]** (sem precedente direto, proposta de redação nova),
**[REGRA DE NEGÓCIO]** (decisão explícita do Edvam, não é pra ter precedente de conversa, é
política nova sendo instituída agora). Reconferida por completo na demanda 260 depois da
reescrita de voz: 3 linhas antigas (a fórmula "Recebemos X 😊" em 3 pontos) foram removidas do
documento em vez de reescritas, e saíram desta tabela; as demais foram reclassificadas quando o
texto novo mudou o nível de evidência (ex.: "Obrigado! 😉" subiu pra EVIDÊNCIA DIRETA, por ser
citação exata recorrente, não só um padrão geral).

| # | Mensagem do agente | Classificação | Evidência |
|---|---|---|---|
| 1 | "Obrigado! 😉" (Ex.1) | EVIDÊNCIA DIRETA | Citação exata recorrente, ex. 558171188980 e 558181692717, lote 00 da demanda 256 |
| 2 | "Já te digo o valor" (Ex.1) | PADRÃO GERAL | Regra 1: confirmação objetiva antes de preço (achado 162) |
| 3 | "2ª via de conta, R$ 2,20. Confirma?" (Ex.1) | PADRÃO GERAL | Regra 2: estrutura produto+preço direto |
| 4 | Texto do Pix completo (Ex.1) | EVIDÊNCIA DIRETA | Literal: `montarTrechoPix()`, `lib/pedidos.ts` |
| 5 | "Obrigado! 😊" (Ex.1, depois do Pix) | EVIDÊNCIA DIRETA | Otto Silva / Rodrigo Isidoro (Regra 9) |
| 6 | "✅ Recebemos seu pagamento!..." (Ex.1) | EVIDÊNCIA DIRETA | Literal: `montarMensagemPagamentoConfirmado()` |
| 7 | "O que você precisa fazer com essa imagem?" (Ex.2) | HIPÓTESE | Sem citação exata, grounded no achado geral de que a equipe sempre pergunta antes de decidir |
| 8 | Lista de 6 categorias + Outro, como fallback (Ex.2) | REGRA DE NEGÓCIO | Decisão do Edvam (demanda 272, 2026-08-14), mapeada 1:1 contra os 110 produtos ativos reais; substitui a lista de 9 grupos da 256 (nunca implementada de fato) e a lista de 15 nomes técnicos que estava em produção no workflow `206` (achado da 208); mecanismo técnico de lista testado na 206; títulos ajustados ao limite real de lista (demanda 260) |
| 9 | "Anotado 😊" / "Já te chamo com o valor" (Ex.2) | HIPÓTESE | Frase de transição sem citação exata |
| 10 | "Quanto é mesmo pra criar um currículo?" / resposta da equipe (Ex.3) | EVIDÊNCIA DIRETA | Jamilly, `558197037824`, lote 09 da demanda 256 |
| 11 | "ok" / "Chamando a equipe pra montar certinho" (Ex.3) | HIPÓTESE | "ok" é citação real de padrão curto (ex. 558196053836, lote 08); a transição de escalação em si não tem citação exata. Desde a demanda 277, esta mesma linha também é o que dispara quando a sessão começa por TEXTO puro sinalizando currículo (Jamilly nunca manda mídia nesta conversa), reforçado por mais 2 citações reais da Regra 4 do manual 234 (Iraneide, Luciana, ver "Outros casos rápidos") |
| 12 | "3 coloridas + 1 P&B, isso mesmo?" (Ex.4) | PADRÃO GERAL | Regra 1, corrigido na demanda 254; abertura "Recebemos tudo" removida na 260 por não ter precedente |
| 13 | "Valor impressão 1,20." (Ex.5a) | EVIDÊNCIA DIRETA | Manuela Moreira, `558186050094`, lote 03 da demanda 256 |
| 14 | "recebido, assim que sair do corte avisaremos..." (Ex.5b) | EVIDÊNCIA DIRETA | Rafaela Alburqueque, `558188787312`, lote 06 da demanda 256 |
| 15 | "Sem problemas, cancelado! 😊" (Ex.6, não pago) | REGRA DE NEGÓCIO | Decisão do Edvam, demanda 259; texto revisado na 260 pra tirar travessão |
| 16 | "Você já pagou esse. Vou pedir pra equipe processar a devolução" (Ex.6, pago) | REGRA DE NEGÓCIO | Decisão do Edvam, demanda 259 |
| 17 | "Esse já foi entregue. Vou verificar e te aviso" (Ex.6, entregue) | REGRA DE NEGÓCIO | Decisão do Edvam, demanda 259 |
| 18 | "Opa, vi o comprovante!" / sequência completa (Ex.7) | HIPÓTESE | Cenário construído pra ilustrar a Regra 5, não reconstrução; "Opa" é interjeição real (ex. 558183413115, lote 01) |
| 19 | "É xerox" aceito sem correção (xerox ambíguo) | PADRÃO GERAL | Maria Clara, `558198673450`, lote 10 da demanda 256, princípio de não forçar terminologia |
| 20 | "Chamando a equipe" (dado pessoal genérico) | HIPÓTESE | Transição sem precedente; abertura "Recebemos sua imagem" removida na 260 |
| 21 | "Combinado! Acerta na retirada 😊" (retirada) | HIPÓTESE | Regra 6 documenta o padrão do cliente, não uma fala equivalente da equipe |
| 22 | "Chamando a equipe pra ouvir certinho" (áudio) | PADRÃO GERAL | Seção 1 da base (255): áudio tem conversão baixíssima (11%), quase nunca resolvido por texto; abertura "Recebemos seu áudio" removida na 260 |
| 23 | "Chamando a equipe" (padrão Dizu, Ex.8) | REGRA DE NEGÓCIO | Detecção reincorporada em 2026-08-14 (revertendo remoção da 259); comportamento de "nunca afirmar número errado" é achado real da demanda 246, mas a decisão de reincorporar como permanente é regra de negócio nova desta sessão |
| 24 | "a xerox p/b 0,45 colorida 1,20" (Ex.9, texto objetivo) | EVIDÊNCIA DIRETA | Maria Clara, `558198673450`, lote 10 da demanda 256, mesma citação já usada em "Outros casos rápidos" (xerox ambíguo), aqui reenquadrada como texto puro objetivo |
| 25 | "Oi Débora, boa tarde!... Me diz o que você precisa pra eu te ajudar com o orçamento. 😊" (Ex.10, texto ambíguo) | EVIDÊNCIA DIRETA | Débora Borges, `558184640012`, lote 01 da demanda 256 |
| 26 | Lista de 6 categorias + Outro, reaproveitada no Ex.10 | REGRA DE NEGÓCIO | Mesma lista/decisão do item 8 (demanda 272), reaproveitada sem alteração pro caminho de texto |
| 27 | "Bom dia vai ser que tipo de papel" (Ex.11, mensagem antiga que vira contexto) | EVIDÊNCIA DIRETA | José Roberto Silva, `558191414184`, lote 06 da demanda 256 |
| 28 | "Lembra do banner que perguntei? Fecha esse tamanho mesmo" (Ex.11, cliente) | HIPÓTESE | Fala nova do cliente, ilustrativa, não citação exata; o produto/contexto (banner, mesmo telefone) é real, a frase específica é simulada |
| 29 | "Achei aqui, ainda não tinha fechado o tamanho do banner, confirma de novo pra mim?" (Ex.11, agente) | HIPÓTESE | Transição sem precedente exato, mas segue a régua de correção/voz (curto, sem travessão) e demonstra o mecanismo de contexto, não é reconstrução de conversa real |
| 30 | "Oi! Seu currículo já tá em produção, mandamos pra revisão antes de gerar o pdf, valor 5,00" (Ex.12, régua de correção aplicada) | HIPÓTESE (derivada de EVIDÊNCIA DIRETA) | Reescrita da citação real do item 10 (Jamilly), aplicando a régua de correção desta demanda; a estrutura/conteúdo vem de citação real, o texto final é reescrito, não literal, por isso não é EVIDÊNCIA DIRETA pura |

**Leitura honesta desta tabela**: recontada linha por linha nesta revisão (achado: a contagem
anterior dizia "6 evidência direta", a contagem real de linhas 1-23 já era 7, corrigido aqui, não
escondido). Das 30 linhas hoje: **10 têm evidência direta** (9 já existentes + 1 nova desta
revisão, item 27), **5 têm padrão geral**, **9 são hipótese explícita** (sem precedente,
principalmente transições de escalação, incluindo as 3 novas desta revisão, itens 28-30), e **6
são regra de negócio nova** (política de cancelamento + detecção permanente de Dizu + lista final
de categorias, decisões do Edvam, não achado de dado, marcadas como tal). Diferença em relação à
tabela anterior à demanda 291: 4 linhas novas (#27-30) entraram nesta revisão (Exemplos 11 e 12).

## Fundamentação técnica real, Z-API (demanda 247, preservada) e limite de lista (demanda 260)

| Achado | Fonte | Efeito no blueprint |
|---|---|---|
| Z-API não é parceira oficial da Meta, opera emulando o WhatsApp Web. | `developer.z-api.io/tips/Z-APIvsAPI-OFICIAL` | Regra "sessão de 24h dispensa aprovação Meta" não confirmada pra este gateway. |
| Botões têm instabilidade reconhecida pela própria Z-API. | `developer.z-api.io/tips/button-status` | Botão é conveniência sobre um caminho de texto que já funciona, nunca dependência única. |
| Endpoint de Pix espera chave fixa, não o código dinâmico do Mercado Pago. | `developer.z-api.io/message/send-button-pix` | Pix só pode ser texto simples, é o que o sistema já faz hoje. |
| Palavras financeiras podem ativar verificação automática do WhatsApp. | `developer.z-api.io/tips/blockednumbernew` | Risco real, mitigado hoje porque todo envio passa por humano clicando "Enviar". |
| Lista de opções: a própria doc da Z-API não documenta limite de itens/caracteres. | `developer.z-api.io/message/send-option-list` | Não dava pra confiar só nisso (achado da 254/259, deixado como "risco conhecido"). |
| **(NOVO, demanda 260) Limite real resolvido**: a Z-API emula o formato nativo de lista interativa do WhatsApp, que a própria Meta documenta com limite oficial: **até 10 seções, até 10 linhas somando todas as seções, título de linha até 24 caracteres, descrição de linha até 72 caracteres, texto de botão até 20 caracteres**. | `developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages` (limite da renderização nativa do WhatsApp, não da Z-API em si, mas a Z-API entrega o mesmo componente visual, então o limite se aplica na prática) | Adotado como regra conservadora explícita: os 9 itens do Exemplo 2 couberam dentro de 10 linhas; cada título foi reduzido pra caber em 24 caracteres, com o detalhe restante movido pra descrição (até 72 caracteres). Não é mais "risco conhecido" em aberto. |

### Decisão: envio automático x manual na aprovação do pedido

Recomendação mantida: manter manual (humano clica "Enviar") mesmo depois da aprovação do pedido,
pelo menos na primeira leva. Julgamento, não achado de dado, pode ser revisitado com o sinal de
confiança da decisão 2 (taxa de aprovação sem edição).

## Achados de risco e decisões registradas

- **Escalação com aviso visível**: a demanda 206 testou escalação silenciosa (sem nenhuma
  mensagem automática). A versão usada neste documento (com aviso visível, ex. "Chamando a
  equipe") é diferente do que foi testado tecnicamente, recomendação registrada, não decisão
  automática. A favor do aviso: a pessoa precisa perceber que foi escalada, não ficar esperando
  resposta que não vem.
- **Lógica de "número compartilhado com outro atendimento" (Dizu Refeições) — removida na demanda
  259, reincorporada em 2026-08-14, ver Exemplo 8.** A 259 tinha removido por completo essa lógica
  por entender que era situação temporária, resolvida assim que a Dizu ganhasse número próprio.
  Revisto: o número da JS Gráfica continua sendo o que já está salvo na agenda de muita gente e
  ligado ao mesmo espaço físico/grupo — o volume cai, mas o padrão não desaparece nunca de fato.
  Reincorporado como comportamento permanente (detecção + escalar, nunca decidir sozinho, nunca
  afirmar "número errado" — mantendo a correção da 246), com uma trava de dado nova: nenhum pedido
  nasce de mensagem classificada como Dizu, protegendo mesmo se o comportamento do agente mudar de
  novo no futuro. **Distinto da divulgação de cardápio em si** (Lista de Transmissão manual do
  Admin, decisão de negócio temporária, confirmada com o Edvam em 30/07 — ver
  `project_contaminacao_dizu_refeicoes.md`): aquela é sobre MENSAGEM SAINDO da JS Gráfica e segue
  temporária; o Exemplo 8 é sobre MENSAGEM CHEGANDO de cliente confuso, e essa parte é permanente.
- **Regra de dado, telefone é a identidade real, não o nome do pedido**: o mesmo telefone pode
  aparecer com nomes diferentes em pedidos diferentes. O agente nunca deve decidir "cliente novo"
  pelo nome, sempre pelo telefone.
- **Limite de captura do log**: uma fração real de pedidos entregues e pagos não tem nenhuma
  resposta da equipe registrada no histórico de mensagens, não é prova de mau atendimento, é
  limite de captura. Relevante pra quem for calibrar gatilho de "escalar por timeout de silêncio".
- **Log com tráfego que não é da JS Gráfica**: além do padrão Dizu (agora tratado de forma
  permanente, Exemplo 8), existem outros achados de tráfego misto no mesmo histórico (bot de
  terceiro, pedido vinculado por engano a número errado), ver
  `project_log_dados_contaminados.md`. Reforça a importância do filtro de segurança rodar sempre,
  não só na primeira mensagem de uma conversa.
- **Mensagens de escalação sem precedente real (demanda 254, ainda válido pra transições
  genéricas)**: não existe, no dado hoje disponível, nenhum caso real de resposta da equipe por
  texto a um cancelamento espontâneo, por isso a política de cancelamento (Exemplo 6) é regra de
  negócio nova, não reconstrução, marcada como tal na tabela de verificação.
- **2 das 4 citações da Regra 9 no manual da 234 estão erradas (achado da demanda 254, ainda não
  corrigido no arquivo da 234)**: `558188167372` não tem "obg"/"Obrigado" na conversa real
  capturada, e `558196517857` nunca fez parte da subamostra qualitativa lida, reportado ao PM.
- **Regex de "Serviço Alto Toque?" não cobre "conta gov" (achado da demanda 277)**: o gatilho de
  escalação de dado pessoal, hoje testado com
  `/curr[ií]culo|digita[çc][ãa]o|prova|antecedente|foto composta|composi[çc][ãa]o/i`, não pega
  menção a "conta gov"/"gov.br", mesmo essa sendo exatamente o tipo de caso citado na Regra 4 do
  manual (`558189032016`, Luciana, senha do Gov.br). Não é um problema criado pela 277 (o regex já
  existia assim pra mídia), mas expandir pra texto aumenta a chance real desse termo aparecer
  cru na mensagem do cliente (texto nomeia serviço com mais frequência que imagem). Recomendação
  registrada na especificação técnica acima, correção não implementada aqui.
- **Novo valor de classificação "fora_de_escopo" (texto) precisa de calibração cuidadosa**: ao
  contrário de mídia (sempre tem algo pra classificar), texto pode ser só saudação/ruído. Se o
  Gemini for generoso demais classificando texto vago como "ambíguo" em vez de "fora_de_escopo", o
  agente pode passar a reagir a "Oi" sozinho, quebrando o princípio de nunca iniciar conversa.
  Recomendação: testar bastante esse limiar antes de conectar em produção, fora do escopo desta
  demanda de desenho.

## Uso de data/hora na saudação (achado da demanda 267, ainda não implementado no n8n)

Achado do Edvam (2026-08-01): nenhuma versão deste blueprint, em nenhuma revisão, tratou data/hora
como requisito. Confirmado revendo a tabela de verificação (seção abaixo) e os 22 falas
catalogadas — todo "Bom dia"/"Boa tarde" que aparece nos Exemplos 3, 4 e 5 é **citação do
CLIENTE**, nunca o agente saudando sozinho baseado no relógio. Isso é coerente (o agente nunca
inicia conversa, sempre responde), mas significa que o design em si nunca precisou decidir "o
agente sabe que horas são?" — e a resposta, hoje, é não.

**Regra pra quando o agente for implementado de verdade no n8n**: o prompt real precisa receber
data/hora atual (dia da semana, hora, período do dia — manhã/tarde/noite) **calculado fora do
modelo**, no próprio n8n antes de montar o prompt — nunca deixar o modelo "adivinhar" a hora a
partir do texto da conversa (mesmo princípio já aplicado na correção da "Sugestão de IA" manual,
demanda 267, `lib/gemini.ts:contextoDataHoraAtual`). Uso principal: calibrar a saudação nas
respostas do agente que citam "bom dia"/"boa tarde"/"boa noite" por conta própria (hoje isso não
acontece nos exemplos, mas pode acontecer em falas novas conforme o agente cobrir mais casos) —
nunca sugerir "bom dia" de madrugada, por exemplo.

**Isso NÃO está implementado nesta demanda** — o workflow n8n do agente fica fora do repositório
(sem export/backup, não deu pra confirmar/editar o prompt real). Fica registrado aqui como
requisito confirmado, pra entrar no prompt real antes de qualquer conexão com cliente de verdade
(Fase B, decisão 1 da Parte 1, ainda pausada) — cabe demanda separada pro 01-N8N quando a Fase B
for retomada.

## Mapa de cobertura das 11 regras do manual (demanda 234) + regras novas desta revisão

| Regra | Onde aparece na Parte 1 |
|---|---|
| 1: Confirmação objetiva antes de preço | Exemplos 1, 2, 4 |
| 2: Documento óbvio → direto, sem pergunta aberta | Exemplo 1 |
| 3: Ambíguo → pergunta 1 coisa de cada vez | Exemplo 2 |
| 4: Dado pessoal → escala, não adivinha | Exemplo 3, "Outros casos rápidos" |
| 5: Nunca deixar pagar antes de confirmar valor | Exemplos 1 e 7 |
| 6: Dinheiro tende a ficar pra retirada | "Outros casos rápidos" |
| 7: Telefone é a identidade real | Só na Parte 2, é regra de dado, não de conversa |
| 8: Espera a rajada terminar | Exemplo 4 |
| 9: Encerramento curto ("Obrigado") | Exemplo 1 |
| 10: Log sem resposta capturada | Só na Parte 2, achado de risco |
| 11: Contaminação de log variada | Só na Parte 2, achado de risco |
| NOVA: Preço só falado em produto de tabela fixa | Exemplo 5 |
| NOVA: Cancelamento por estado do pedido (não pago/pago/entregue) | Exemplo 6 |
| NOVA: Não forçar terminologia do cliente (xerox/cópia) | "Outros casos rápidos" |
| NOVA: Data/hora calculada fora do modelo, nunca "adivinhada" (demanda 267) | Só na Parte 2, achado ainda não implementado no n8n |
| NOVA: Áudio não é interpretado, só registrado | "Outros casos rápidos" |
| NOVA (2026-08-14): Detecção de padrão Dizu é permanente, nunca decide sozinho, trava nenhum pedido nascer daí | Exemplo 8 |
| NOVA (2026-08-14, demanda 272): Lista de fallback usa 6 categorias reais do catálogo (não mais 9 grupos de linguagem de cliente nem 15 nomes técnicos) | Exemplo 2 |
| NOVA (260): Voz do agente segue checklist real (emoji raro, curto, informalidade real) | Toda a Parte 1 |
| NOVA (2026-08-15, demanda 277): Texto puro também dispara o agente, mesma triagem de mídia (objetivo → direto, ambíguo → pergunta → lista, alto toque → escala) | Exemplos 9, 10, nota no Exemplo 3 |
| NOVA (277): Serviço Alto Toque (currículo/digitação/antecedentes/conta gov) é o mesmo gatilho pra mídia e texto, sem categoria nova | Exemplo 3 (nota), Exemplo 10, "Outros casos rápidos" |
| NOVA (277): Texto sem sinal de pedido (só saudação) não dispara o agente, ele nunca inicia conversa | Exemplo 10 |
| NOVA (2026-08-16, demanda 291): Régua de correção, erro básico (digitação/acentuação) sempre corrigido, registro informal real sempre mantido | Exemplo 12, Parte 2 |
| NOVA (291): Contexto de conversa recente (até 8 mensagens/7 dias do mesmo telefone) entra na geração da resposta, com filtro de dado sensível | Exemplo 11, Parte 2 |

## Honesto sobre os limites deste blueprint

- Nenhuma mensagem do agente neste documento rodou de verdade contra um cliente real, mesmo
  marcada como baseada em caso real, é adaptação, não um teste ao vivo.
- O texto exato de cada mensagem é proposta de redação, pode e deve ser ajustado se algo soar
  errado, esse é o propósito de revisar antes de aprovar.
- A recomendação de manter o envio pós-aprovação manual é julgamento, não achado de dado.
- A política de cancelamento (Exemplo 6) é regra de negócio nova desta demanda, ainda não
  testada com nenhum cliente real, ao contrário de outras partes do documento que pelo menos
  citam conversa real como base.
- A regra "sessão de 24h dispensa aprovação da Meta" (de investigação anterior, registrada em
  `pm/OBJETIVOS-MACRO.md`) não está confirmada pra este gateway específico.
- O limite de lista resolvido na demanda 260 vem da documentação oficial do formato nativo do
  WhatsApp, não de um teste direto contra a Z-API com 10+ itens, vale confirmar na prática quando
  o agente for ligado de verdade.

## Referências

Demanda 234 (`pm/conhecimento/manual-resposta-ia-100-clientes.md`). Demanda 243 (proposta técnica
das 3 decisões). Demandas 206, 208, 159-163 (pesquisa e testes de base). Demanda 250 (mensagem de
confirmação de pagamento). Demanda 254 (checkpoint de mecanismo). **Demandas 255/256
(`pm/conhecimento/base-conhecimento-atendimento-completa.md`, fonte obrigatória desta revisão,
668 clientes no quantitativo, 340 no qualitativo, taxonomia de linguagem de cliente)**. Demanda
259 (reescrita anterior, política de cancelamento nova). Demanda 260 (checklist de voz real seção
7 da base de conhecimento, remoção de travessão, limite de lista resolvido). Demanda 257
(`investigacao-contaminacao-dizu-refeicoes.md`, evidência real do padrão Dizu). **2026-08-14
(sessão de reavaliação da demanda 208): reincorporada a detecção permanente de Dizu (Exemplo 8),
revertendo a remoção da 259 — ver `project_contaminacao_dizu_refeicoes.md` pra distinção entre a
divulgação de cardápio (temporária) e a confusão de cliente recebida (permanente)**. **Demanda 272
(2026-08-14): lista final de categorias do Exemplo 2, 6 categorias mapeadas contra os 110 produtos
ativos reais, substituindo os 9 grupos da 256 (nunca implementados no workflow) e os 15 nomes
técnicos que estavam em produção (achado da 208)**. **Demanda 277 (2026-08-15): desenho de
triagem de texto puro, reaproveitando os gatilhos de escalonamento do `206` (Serviço Alto Toque,
cancelar, negociação de pagamento, Dizu, buffer de rajada), Exemplos 9 e 10, especificação técnica
completa pro 01-N8N implementar depois, achado de gap no regex de Serviço Alto Toque (falta "conta
gov"). Demanda 243 (Proposta 3, ressalva original sobre esperar antes de expandir pra texto,
resolvida por decisão do Edvam nesta demanda). Demanda 274 (estado atual real do `206`,
conectado ao roteamento, fonte do backup consultado pra esta especificação). Demanda 275 (painel
de controle da whitelist, contenção que já limita a exposição de qualquer expansão de escopo).
**Demanda 290 (2026-08-16, `analise-arquitetura-atendimento-humanizado-vs-estruturado.md`):
recomendação de caminho híbrido que originou esta demanda como passo 1 da sequência sugerida.**
**Demanda 291 (2026-08-16, esta revisão): régua de correção de tom (o que manter vs. corrigir do
padrão real do time) e desenho do mecanismo de contexto de conversa recente, Exemplos 11 e 12,
cuidado de performance citando a demanda 284 e cuidado de dado sensível citando a Regra 4 do
manual 234.****
