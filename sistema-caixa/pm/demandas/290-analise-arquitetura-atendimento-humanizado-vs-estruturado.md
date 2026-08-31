# 290 — Análise profunda: como equilibrar atendimento humanizado (IA livre) com o fluxo estruturado de pedido

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Depois de um dia inteiro testando o `206` ao vivo (demandas 274-289), o Edvam levantou uma
questão de fundo: o `206` hoje é puramente determinístico — o Gemini só classifica (é
documento_obvio? é ambíguo? qual produto?), e toda resposta que o cliente recebe é um texto FIXO
pré-escrito, preenchido com o dado extraído. Isso limita a qualidade do atendimento — não é uma
conversa de verdade, é um fluxograma com preenchimento de lacuna.

**Proposta do Edvam, em suas palavras**: o agente de IA (o `JSGRAFICA_ATENDIMENTO_AI`, que tem RAG
e escreve resposta livre, hoje pausado pro cliente) deveria voltar a funcionar, atualizado com
tudo que foi aprendido/construído desde que foi pausado, e ser o atendimento de **primeiro
contato** sempre que a mensagem não for imagem/arquivo sem contexto — atendendo saudação e
conversa solta de forma humanizada, com contexto de verdade. Quando identificar que é pedido de
verdade, passaria pro fluxo estruturado de pedido (`206` ou equivalente) — que o próprio Edvam
reconhece que também "precisa melhorar muito", ou alternativamente, dar liberdade pro `206`
escrever a resposta livre também, mantendo as regras de botão/lista como trava estrutural por
cima. **O Edvam não decidiu qual caminho — pediu análise técnica e de contexto profunda antes.**

**Achados reais de hoje, que precisam entrar nessa análise (não redescobrir do zero)**:
1. `JSGRAFICA_ATENDIMENTO_AI` tem um bug de infraestrutura real, não corrigido: seu node de
   memória (`Postgres Chat Memory`, conexão direta, não REST) falha com `ENETUNREACH` (rede
   IPv6), derrubando o `AI Agent1` inteiro antes de gerar qualquer resposta — achado investigando
   a causa raiz do "oi" não respondido (demanda 279, `pm/demandas/279-*.md`).
2. O prompt de sistema do `AI Agent1` (dentro do `ATENDIMENTO_AI`) tem 4 ocorrências de travessão,
   não corrigidas — achado e reportado na demanda 286 (`pm/demandas/286-*.md`), fora de escopo na
   hora.
3. O desenho original do `ATENDIMENTO_AI` manda pedido identificado pro `06-PEDIDOS`
   (`HTTP Chamar 06-PEDIDOS`, node `If Pedido Identificado`) — e os nós de envio de mensagem do
   `06-PEDIDOS` estão `disabled: true` há semanas (achado de 2026-07-10, nunca revertido). O
   `ATENDIMENTO_AI` nunca foi atualizado pra saber que o `206` existe — ele foi construído antes
   da Fase B.
4. O workflow `01` já roteia telefone autorizado + mídia/texto de sessão nova pro `206` antes de
   chegar no fallback pro `ATENDIMENTO_AI` (demandas 274/279) — os dois sistemas hoje **competem**
   pelo mesmo tipo de mensagem no mesmo roteamento, sem nenhuma régua clara de "quem atende o
   quê primeiro" definida além do que o acaso da ordem de checagem decide.
5. O `206` propõe preço direto hoje só pra 1 produto (Impressão P&B A4, hardcoded) — qualquer
   outro produto "objetivo" não tem preço automático, mesmo sendo classificado corretamente
   (achado/confirmado na demanda 277/289).
6. O motivo original de pausar o `ATENDIMENTO_AI` pro cliente foi risco de banimento do WhatsApp
   (ver `CLAUDE.md`) — não reavaliado desde então.

## Objetivo
Uma análise escrita, com peso técnico real (não só opinião), comparando os 2 caminhos que o
Edvam propôs, terminando numa recomendação clara (pode ser um dos dois, um híbrido, ou nenhum —
com justificativa) pra ele decidir com informação de verdade, não no escuro.

## Escopo
- Incluído: **Caminho A — reviver o `ATENDIMENTO_AI` como atendimento humanizado de primeiro
  contato.** Avaliar: o que precisaria ser corrigido antes (bug de rede, travessão do prompt,
  ponte pro `206` em vez do `06-PEDIDOS` morto), como delimitar claramente no roteamento do `01`
  quem atende o quê (ex.: `ATENDIMENTO_AI` sempre primeiro pra texto sem sinal objetivo de
  pedido, `206` só quando já é claramente mídia ou pedido objetivo), se o risco de banimento
  original ainda se aplica do mesmo jeito, e uma estimativa honesta de esforço/risco.
- Incluído: **Caminho B — dar liberdade de escrita pro classificador do `206`.** Avaliar: como
  seria tecnicamente (Gemini gera texto livre em vez de só classificar, mantendo botão/lista/
  escalonamento como trava programática por cima), que base de conhecimento ele usaria (hoje o
  `206` não tem RAG nenhum — precisaria construir do zero, ou reaproveitar
  `jsgrafica_agent_rag`/`base-conhecimento-atendimento-completa.md`), e se perde alguma garantia
  de segurança que o texto fixo hoje garante (ex. nunca inventar preço, nunca prometer algo
  errado — texto livre tem esse risco, texto fixo não).
- Incluído: avaliar se existe um **caminho híbrido** que nenhum dos dois cobre sozinho — ex.
  `206` continua 100% determinístico pra tudo que já garante segurança (preço, confirmação,
  pagamento), mas ganha uma camada de linguagem mais natural só nas partes de baixo risco
  (saudação, transição, pergunta de triagem), sem virar geração livre de ponta a ponta.
- Incluído: recomendação final clara, com prós/contras de cada caminho, e se possível uma
  sugestão de sequência de demandas caso o Edvam aprove um caminho (não implementar nada agora,
  só desenhar o que viria depois).
- Explicitamente fora de escopo: implementar qualquer coisa desta análise — é desenho/decisão,
  não código. Não é pra decidir sozinho qual caminho seguir — é pra apresentar a análise pro PM/
  Edvam decidirem.

## Critérios de aceite
- [ ] Os 2 caminhos avaliados com peso técnico real, citando os achados de hoje (279/286/277/289)
      como base, não redescobrindo do zero
- [ ] Avaliação honesta de risco (banimento, qualidade, segurança de preço/conteúdo) pros 2
      caminhos
- [ ] Recomendação final clara, com justificativa
- [ ] Se houver caminho híbrido viável, apresentado como opção real, não só os 2 extremos

## Riscos e cuidados
Isso é decisão estratégica de produto, não técnica pura — a recomendação final é insumo pro
Edvam decidir, não uma implementação autorizada. Nenhuma mudança de roteamento real deve
acontecer a partir desta demanda sozinha.

## Referências
Demandas 279 (bug do `ATENDIMENTO_AI`), 286 (travessão no prompt), 274 (roteamento atual do
`01`), 277/278 (desenho e implementação da triagem de texto do `206`), 289 (limitação de preço
só pra P&B A4). `pm/conhecimento/blueprint-conversas-exemplo-agente.md` e
`base-conhecimento-atendimento-completa.md` (material já existente de desenho de conversa).
`CLAUDE.md` (motivo original da pausa do atendimento automático).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito: análise completa escrita em
  `pm/conhecimento/analise-arquitetura-atendimento-humanizado-vs-estruturado.md`, citando os 6
  achados de contexto (279, 286, 06-PEDIDOS morto, competição de roteamento no `01`, limitação de
  preço só P&B A4, risco de banimento não reavaliado) como base, sem redescobrir nada. Avaliados
  os 2 caminhos do Edvam mais um híbrido:
  - **Caminho A (reviver `ATENDIMENTO_AI`)**: mapeado o que precisa ser corrigido antes (bug de
    rede da 279, travessão da 286, ambos pequenos) e o que precisa ser CONSTRUÍDO, não só
    corrigido (ponte pro `206` no lugar do `06-PEDIDOS` morto, e inversão da prioridade de
    roteamento no `01` que as demandas 274/277/278/279 estabilizaram) — esforço médio-alto, risco
    real de regressão no que já foi testado, risco estrutural de "2 cérebros" competindo pela
    mesma decisão de classificação se a ponte não for desenhada como 1 etapa só.
  - **Caminho B (liberdade pro classificador do `206`)**: mapeado como seria tecnicamente (schema
    JSON ampliado, não substituído), a falta de RAG hoje no `206` (recomendação: contexto
    estático embutido no prompt antes de construir RAG de verdade, mais barato e provavelmente
    suficiente pro tamanho do corpus real da JS Gráfica), e o risco central: texto livre pode
    vazar valor/confirmação errados, o mesmo tipo de risco já materializado uma vez no sistema
    (achado da demanda 250, mensagem de Pix prometendo algo que nada cumpria) — esforço
    médio-baixo se escopado com disciplina, não mexe no roteamento do `01`.
  - **Híbrido**: reconhecido que o Caminho B, bem escopado (texto livre só em saudação/transição/
    pergunta de triagem, nunca em valor/Pix/confirmação/motivo de escalonamento), já É o híbrido
    — a separação livre/fixo já existe de fato na tabela de verificação do blueprint atual
    (EVIDÊNCIA DIRETA = sempre fixo; HIPÓTESE/PADRÃO GERAL de transição = candidato a texto
    livre). Reconhecido honestamente o que o híbrido NÃO resolve (conversa genuinamente aberta
    fora do domínio de gráfica) como cenário de reavaliação futura do Caminho A, não escondido.
  - Tabela comparativa lado a lado (7 critérios) e sequência de 6 demandas sugeridas caso o
    híbrido seja aprovado (nenhuma implementada aqui).

- Testes realizados e resultado: não aplicável (demanda de análise, sem código, conforme escopo
  explícito). Verificação feita foi de citação: reconferido, antes de escrever, que os achados
  279/286/289 citados batem com o texto real dos relatos de execução daquelas demandas (não
  memória/suposição), e que o regex/nó/limitação técnica citados (ex. `GET Produto P&B A4`
  hardcoded, `Postgres Chat Memory` com `ENETUNREACH`) vêm literalmente dos relatos já escritos
  por quem executou aquelas demandas.

- Achados fora do escopo (relatados, não resolvidos por conta própria):
  - Nenhum achado técnico novo fora do escopo (esta demanda foi só leitura/análise, não investiguei
    nada além do que os achados citados já cobriam).
  - Sinalizo pro PM/Edvam que a recomendação desta análise (híbrido) é insumo pra decisão, não uma
    aprovação de implementação — se aprovado, a demanda 1 da sequência sugerida (decisão de quais
    campos podem ser texto livre) precisa vir do Edvam antes de qualquer código.

- Status final: **concluída**. Os 4 critérios de aceite batidos: os 2 caminhos avaliados com peso
  técnico real citando os achados de hoje como base; avaliação honesta de risco (banimento não
  resolvido em nenhum dos 2 caminhos, qualidade e segurança de preço/conteúdo comparadas lado a
  lado); recomendação final clara (híbrido, com justificativa completa de por que não o Caminho A
  agora); caminho híbrido apresentado como opção real e recomendada, não só os 2 extremos.
