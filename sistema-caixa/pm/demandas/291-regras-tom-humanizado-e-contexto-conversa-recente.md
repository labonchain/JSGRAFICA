# 291 — Regras de tom humanizado (baseado no log real) + contexto de conversa recente

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Passo 1 da sequência sugerida pela demanda 290 (caminho híbrido aprovado em princípio pelo
Edvam): antes de qualquer prompt novo no `206`, decidir com clareza as regras de tom e de
memória que a parte de texto livre vai seguir.

**2 exigências explícitas do Edvam (2026-08-16), em suas palavras**:
1. A IA que vai atender "tem que ter o mesmo padrão" do time real, "fazendo correções básicas
   necessárias mas mantendo um tom humanizado" — usar o log gigante de atendimento real como
   fonte, não inventar tom do zero, mas sem replicar erro de digitação/gramática básico 1:1 só
   porque apareceu no log real.
2. A resposta precisa estar "sempre de acordo com o contexto de conversas recentes do cliente com
   o agente" — o agente precisa saber o que já foi dito recentemente pro mesmo cliente, não reagir
   só à mensagem isolada de agora.

**O que já existe, não repetir do zero**: a demanda 260 já extraiu um checklist de voz real do log
(191 respostas manuais genuínas, 12 lotes de evidência) — emoji em 29% das respostas (não
maioria), sempre único e quase sempre no fim, moda de tamanho 1-3 palavras, 54% com alguma marca
real de informalidade (minúscula no início, falta de acento, abreviação, erro de digitação). Isso
já é o material-base pro item 1, mas nunca foi usado pra decidir a régua de "o que corrigir vs o
que manter" — só documentou o padrão, não prescreveu a regra de correção.

**O que não existe hoje**: o `206` não tem nenhuma noção de "conversa recente" além da sessão
atual em andamento (`jsgrafica_agente_teste_sessoes`, criada/concluída por interação) — não olha
histórico de conversas anteriores do mesmo telefone. Isso é peça nova, não coberta pela análise da
290.

## Objetivo
Duas coisas decididas com clareza, prontas pra virar prompt real na próxima demanda (passo 2 da
sequência da 290):
1. Regra de correção: o que do padrão real do time deve ser seguido literalmente vs. o que deve
   ser corrigido (erro de digitação, falta de acento, abreviação excessiva), sem perder o tom
   humano/informal que já é o padrão real medido.
2. Desenho de como "contexto de conversa recente" entra na geração do texto livre — que dado
   buscar (quantas mensagens/quanto tempo pra trás), de onde (`jsgrafica_log_msgs_privadas` já
   tem tudo logado), e como isso é passado pro prompt sem virar um RAG completo (mantendo a
   recomendação da 290 de começar simples, contexto estático/direto, não busca por similaridade).

## Escopo
- Incluído: revisar o checklist de voz da demanda 260 e propor a régua explícita de correção —
  ex.: sempre corrigir ortografia/acentuação bruta (não é "tom", é erro), manter abreviação comum
  e informalidade real de registro (isso É o tom), nunca inventar gíria ou emoji que não apareceu
  no padrão medido.
- Incluído: desenhar o mecanismo de contexto de conversa recente — quantidade de mensagens
  anteriores a incluir (recomendação com justificativa, não chute), se filtra por sessão ou por
  janela de tempo, como evitar que isso vire contexto gigante/caro por telefone com muito volume
  (mesmo cuidado de performance que a demanda 284 já teve que aplicar pro Inbox).
- Incluído: exemplos concretos (conversa real ou simulada, mesmo padrão do blueprint) mostrando a
  regra de correção e o uso de contexto recente funcionando juntos.
- Incluído: atualizar `blueprint-conversas-exemplo-agente.md` com essa nova seção.
- Explicitamente fora de escopo: escrever o prompt final do Gemini em si (isso é o passo 2,
  demanda separada) e qualquer implementação no `206`.

## Critérios de aceite
- [ ] Régua de correção clara (o que corrigir vs. o que manter), fundamentada no checklist da 260
- [ ] Desenho do mecanismo de contexto de conversa recente, com justificativa de escopo (quantas
      mensagens, que janela) e cuidado de performance
- [ ] Exemplos concretos mostrando os dois funcionando juntos
- [ ] Blueprint atualizado

## Riscos e cuidados
Contexto de conversa recente pode incluir dado sensível (nome, endereço, dado pessoal já
discutido) — considerar isso ao decidir o que entra no prompt, mesmo cuidado já documentado na
Regra 4 do manual (234) sobre dado pessoal.

## Referências
Demanda 290 (`pm/conhecimento/analise-arquitetura-atendimento-humanizado-vs-estruturado.md`,
passo 1 da sequência). Demanda 260 (checklist de voz real, base pra régua de correção). Demanda
284 (cuidado de performance com contato de alto volume, mesmo princípio aplicável aqui). Demanda
234 (Regra 4, dado pessoal).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito: `pm/conhecimento/blueprint-conversas-exemplo-agente.md` atualizado com:
  1. **Régua de correção explícita**, tabela KEEP/FIX cobrindo os 6 padrões já catalogados na
     seção 7 da base de conhecimento (demanda 260): minúscula inicial, abreviação, interjeição e
     ênfase em maiúscula MANTIDOS (é registro real, não erro); falta de acentuação e erro de
     digitação que quebra a palavra CORRIGIDOS. Sinalizada com transparência a única tensão real:
     falta de acento é parte do padrão medido (achado da 260), mas o Edvam pediu correção
     explícita disso mesmo assim — registrado como decisão de produto sobre a evidência, não como
     achado novo escondido.
  2. **Mecanismo de contexto de conversa recente desenhado** (não implementado): fonte
     `jsgrafica_log_msgs_privadas` (mesmo padrão de filtro já usado desde 255/256), até 8
     mensagens OU 7 dias (o que vier primeiro), com justificativa numérica ligada a achados reais
     já existentes (moda de 1-3 palavras da seção 7, definição de sessão de 4h das demandas
     159-163). Cuidado de performance citando explicitamente a demanda 284 (nunca ordenar tudo e
     cortar depois, sempre `ORDER BY ... LIMIT` usando o índice já existente, confirmar com
     `EXPLAIN` antes de conectar). Cuidado de dado sensível citando a Regra 4 do manual 234:
     mensagens já classificadas/escaladas como Alto Toque nunca entram no contexto reenviado pro
     Gemini, reaproveitando o mesmo gatilho de regex que já existe, sem mecanismo novo.
  3. **2 exemplos concretos novos** (Exemplo 11 e 12), mostrando os 2 mecanismos: Exemplo 11 usa
     citação real de José Roberto Silva (cliente recorrente documentado na demanda 256) pra
     ilustrar contexto recente evitando repetir pergunta; Exemplo 12 reaproveita a própria
     citação real já existente no blueprint (Jamilly, Exemplo 3, erro de digitação "correão") pra
     mostrar a régua de correção aplicada linha por linha, com explicação do que mudou e por quê.
  4. Histórico de correção, tabela de verificação (4 linhas novas, #27-30, reclassificação
     completa dos totais), mapa de cobertura (2 linhas novas) e referências atualizados de forma
     consistente com o resto do documento.

- Testes realizados e resultado: não aplicável no sentido de código (demanda de desenho, sem
  prompt final nem implementação, conforme escopo explícito). Verificação feita: reconferido que
  a citação de José Roberto Silva (558191414184) e a régua de KEEP/FIX batem com o texto real da
  seção 7 da base de conhecimento e com os lotes de evidência da demanda 256, não memória; busca
  literal por travessão no documento inteiro depois da edição, confirmando que nenhuma adição
  desta demanda introduziu o caractere (as ocorrências pré-existentes de revisões anteriores não
  fazem parte do escopo desta demanda, não foi pedido fazer limpeza geral aqui).

- Achados fora do escopo (relatados, não resolvidos por conta própria): nenhum achado técnico
  novo. A tensão entre "falta de acento é padrão real medido" vs. "Edvam pediu correção" não é um
  achado novo escondido, é uma decisão de produto explícita, documentada com transparência na
  régua de correção e no relato acima, não a citando como se fosse conflito não resolvido.

- Status final: **concluída**. Os 4 critérios de aceite batidos: régua de correção clara e
  fundamentada na seção 7 da base de conhecimento; mecanismo de contexto de conversa recente
  desenhado com justificativa de escopo (quantidade/janela) e cuidado de performance explícito;
  2 exemplos concretos mostrando os 2 mecanismos funcionando juntos (contexto entra antes da
  geração, régua se aplica depois, mesmo pipeline); blueprint atualizado de forma consistente
  (histórico, tabela de verificação, mapa de cobertura, referências). Nem prompt final nem
  implementação, conforme fora de escopo explícito, fica pro passo 2 da sequência da demanda 290.
