# 260 — Reescrever falas SIMULADO com voz real extraída do corpus, resolver limite de lista/botão

Status: concluída
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: 2026-07-30
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Auditoria feita pelo PM (2026-07-30, comparação linha por linha de todas as falas 🟡 SIMULADO do
blueprint contra os 12 lotes de evidência bruta da demanda 256, ~130 respostas reais do time)
achou que a camada de **conteúdo/decisão** do blueprint é real e embasada (taxonomia de 9 grupos,
regra de preço, tratamento por tipo de mídia — tudo rastreável a citação real), mas a camada de
**voz/registro** nunca foi extraída da evidência — cada fala do agente foi escrita "no estilo que
pareceu bom", não a partir de um padrão medido no corpus.

Achado mais concreto: a fórmula "Recebemos [arquivo/imagem/pedido/tudo/áudio] 😊", que abre 5 dos
7 exemplos principais do blueprint, **não aparece nenhuma vez em nenhum dos 340 clientes reais
lidos** (demandas 255/256). Mesmo mensagens marcadas "PADRÃO GERAL" (grounded em achado de
comportamento) usam texto de superfície inventado em vez de reaproveitar o vocabulário real.

Contagem real do corpus (130 respostas manuais do time, 12 lotes):
- Emoji: ~38% das respostas (não a maioria), sempre 1 só, sempre no final da frase, sempre 😊 ou 😉
- Tamanho: moda é 1-6 palavras ("Obrigado", "obg", "1,20", "pode vim buscar")
- Informalidade/erro de digitação natural e frequente: "nao tem na conta", "Bo dia, Lily!",
  "Obigado", "pode vim buscar" — nenhuma dessas variações de registro aparece em nenhuma das 29
  falas simuladas do agente, todas gramaticalmente perfeitas

Nenhum documento (nem `base-conhecimento-atendimento-completa.md`, nem o blueprint) tem uma
síntese de "como o time fala" — só de "o que o time decide". Essa síntese nunca foi pedida nem
feita, apesar de estar implícita em quase toda fala do agente.

Achado adicional, à parte: o mecanismo de botão/lista clicável (Exemplo 1 e 2) tem fallback de
texto real desenhado no próprio mockup (não é decoração), fundamentado na doc real da Z-API
(demanda 247) — mas o limite de quantos itens/caracteres uma lista aguenta com segurança continua
sem resposta, só registrado como risco conhecido.

Achado à parte (2026-07-30, revisão do PM): o blueprint atual tem travessão (—) em ~121 pontos,
incluindo dentro de pelo menos 3 falas reais do agente (Exemplo 6, situações 2 e 3; "2ª via de
conta — R$ 2,20" no Exemplo 1). Regra já confirmada nesta sessão: nunca usar travessão em nenhum
texto — vale também pro texto que o agente vai mandar pro cliente real. Corrigir junto, já que
esta demanda reescreve toda fala mesmo.

## Objetivo
Toda fala 🟡 SIMULADO do blueprint reescrita seguindo um padrão de voz literalmente extraído do
corpus real (não estilo livre), e o limite de itens/caracteres da lista/botão resolvido antes de
apresentar o documento como pronto pro Admin.

## Escopo
- Incluído: produzir uma checklist de voz explícita, com os números reais do corpus (taxa de
  emoji, tamanho médio, tolerância a informalidade/erro de digitação natural) — documentar essa
  checklist como seção nova em `base-conhecimento-atendimento-completa.md`, não deixar informal
  só na cabeça de quem escreve.
- Incluído: reescrever cada uma das ~29 falas SIMULADO do blueprint aplicando essa checklist —
  eliminar especificamente a fórmula "Recebemos X 😊" (sem precedente) e qualquer outra abertura
  inventada, substituindo por variação real observada no corpus (ex.: confirmação direta, "obg"/
  "ok", ou ir direto ao preço/pergunta, conforme o caso).
- Incluído: remover todo travessão (—) de qualquer texto do blueprint, principalmente das falas
  do agente (Exemplo 6 sit. 2/3, Exemplo 1) — trocar por vírgula, ponto ou frase separada.
- Incluído: resolver a lacuna do limite de itens/caracteres da lista/botão — buscar na doc real da
  Z-API (mesma fonte da demanda 247) se existe limite documentado; se não existir, definir um
  limite conservador explícito e justificar (ex.: baseado em prática comum de WhatsApp Business).
- Incluído: as falas marcadas HIPÓTESE ou REGRA DE NEGÓCIO (sem precedente real, ex. cancelamento)
  continuam sem citação de conversa real — mas também devem seguir a checklist de voz (sem
  travessão, tom/tamanho consistente com o padrão real), já que vão ser ditas pelo mesmo agente.
- Incluído: reconferir a tabela de verificação do blueprint depois da reescrita, confirmando que
  a classificação de evidência (direta/padrão geral/hipótese/regra de negócio) de cada linha ainda
  bate com o texto final.
- Explicitamente fora de escopo: a camada de conteúdo/decisão (taxonomia de 9 grupos, regra de
  preço, tratamento por mídia) — já está bem embasada, não mexer nisso agora. As 3 decisões da
  demanda 243 continuam fora de escopo, aguardando o Edvam depois desta correção.

## Critérios de aceite
- [x] Checklist de voz documentada com números reais do corpus (taxa de emoji, tamanho, exemplos
      de informalidade tolerada), como seção nova na base de conhecimento
- [x] Zero ocorrência da fórmula "Recebemos [X] 😊" ou equivalente sem precedente sobrevivendo no
      blueprint
- [x] Zero travessão em qualquer lugar do blueprint, checado por busca literal (149 → 0)
- [x] Limite de itens/caracteres da lista/botão resolvido com fonte real (limite oficial de lista
      interativa do WhatsApp/Meta), não mais "risco conhecido" em aberto
- [x] Tabela de verificação reconferida, classificação de evidência ainda correta pra cada linha

## Riscos e cuidados
Não confundir "aplicar a checklist de voz" com inventar de novo — cada fala reescrita deve, na
medida do possível, reaproveitar vocabulário/estrutura já observada no corpus (citar de qual lote/
padrão veio a inspiração), não só "soar mais informal" por impressão.

## Referências
Base de conhecimento: `pm/conhecimento/base-conhecimento-atendimento-completa.md`. Evidência bruta:
`pm/conhecimento/evidencia-255/`, `pm/conhecimento/evidencia-256/` (lote_00 a lote_11). Blueprint
atual: `pm/conhecimento/blueprint-conversas-exemplo-agente.md` (demanda 259). Z-API real: demanda
247. Auditoria que originou esta demanda: feita pelo PM em 2026-07-30, achados relatados
diretamente ao Edvam nesta sessão, sem arquivo de demanda próprio (é revisão, não execução).

## Relato de execução

**Status final: concluída**, todos os critérios de aceite atendidos.

### O que foi feito

**1. Checklist de voz real, com contagem própria, não a estimativa preliminar do PM**
Em vez de aceitar a estimativa "~38% com emoji" da auditoria inicial (contexto desta demanda),
li os 12 lotes de evidência (`evidencia-256/lote_00` a `lote_11`, 340 clientes) e extraí
manualmente o campo "Primeira resposta da equipe" de cada entrada, excluindo respostas
inexistentes, templates automáticos do sistema e casos já sinalizados como contaminação de outro
negócio. Sobraram **191 respostas manuais reais e genuínas**. Recontagem sistemática encontrou:
emoji em 29% (não 38%, número revisado e agora citável), sempre único, sempre 😊 ou 😉, quase
sempre no final; moda de tamanho 1-3 palavras (55%); 54% das respostas com marca real de
informalidade (minúscula inicial, falta de acento, abreviação, erro de digitação). Documentado
como seção 7 nova de `base-conhecimento-atendimento-completa.md`, com a metodologia da contagem
explícita e a correção em relação à estimativa preliminar registrada com transparência (não
escondida). Usei 2 subagentes pra fazer a extração exaustiva das 340 entradas (10 lotes num, 2
lotes noutro) e depois combinei os totais eu mesmo.

**2. Limite de lista/botão resolvido com fonte real, não regra inventada**
A própria documentação da Z-API (`developer.z-api.io/message/send-option-list`) não documenta
limite de itens/caracteres, confirmado direto na fonte (não presumido). Mas a Z-API entrega o
mesmo componente visual do formato nativo de lista interativa do WhatsApp, que a Meta documenta
oficialmente: até 10 seções, até 10 linhas somando todas as seções, título de linha até 24
caracteres, descrição até 72 caracteres, botão até 20 caracteres (verificado direto na
documentação oficial da Cloud API da Meta). Adotado como regra conservadora explícita e
justificada, não mais "risco conhecido" solto. Os 9 itens do Exemplo 2 foram reescritos no
formato "título curto (descrição)" pra caber de verdade dentro do limite, cada título conferido
a até 24 caracteres.

**3. As ~29 falas SIMULADO reescritas com voz extraída do corpus**
Eliminadas as 6 ocorrências da fórmula "Recebemos [X] 😊" no documento. Em 3 casos (Exemplo 2
com imagem ambígua, "dado pessoal" genérico, e áudio), a linha inteira foi removida em vez de
reescrita, indo direto pra pergunta/ação seguinte, já que essa é a variação real sugerida no
próprio escopo da demanda ("ir direto ao preço/pergunta, conforme o caso") e bate com o padrão
real documentado no próprio blueprint (equipe faz pergunta de triagem, não agradecimento, pra
imagem). Nos outros 3 casos (Exemplo 1 documento, Exemplo 3 currículo, Exemplo 4 rajada de
mensagens), a abertura foi trocada por uma fala real curta ("Obrigado! 😉", "ok") ou pela remoção
do beat redundante, mantendo a estrutura de conteúdo/decisão intacta (não mexi na camada de
regra/mecanismo, só na palavra escrita). Falas HIPÓTESE/REGRA DE NEGÓCIO (cancelamento, retirada,
comprovante fora de hora) mantidas sem citação de conversa real (como o escopo permite), mas
ajustadas pra tamanho/tom/emoji dentro da checklist.

**4. Travessão removido do documento inteiro**
Confirmado por busca literal: 149 ocorrências antes, 0 depois (rechecado com `grep` depois da
reescrita completa, não só nas falas do agente). Troquei por vírgula, ponto (frase separada) ou
dois-pontos, escolhido caso a caso pra manter a frase gramatical, não uma substituição
automática cega. Também limpei os travessões que eu mesmo introduzi ao escrever a nova seção 7
da base de conhecimento (nenhum documento que eu escrevo deveria ter travessão, regra do
projeto) — as ocorrências pré-existentes de 255/256 na base de conhecimento não foram tocadas,
fora do escopo desta demanda (que é sobre o blueprint).

**5. Tabela de verificação reconferida linha por linha**
Reconstruída do zero contra o texto final: as 3 linhas da fórmula removida saíram da tabela
(documentado explicitamente na "leitura honesta" da tabela, não escondido); "Obrigado! 😉" subiu
de PADRÃO GERAL pra EVIDÊNCIA DIRETA (é citação exata recorrente em múltiplos telefones reais,
não só um padrão inferido); as demais classificações foram confirmadas ainda corretas contra o
texto reescrito (a mudança foi de palavra, não de conteúdo/decisão, então a maioria das
classificações originais continuou válida).

### Achados fora do escopo (relatados, não resolvidos por conta própria)

- Nenhum achado novo fora do escopo. A auditoria que originou esta demanda já tinha mapeado tudo
  que precisava ser corrigido; não apareceu nada adicional durante a execução.

### Status final: concluída
