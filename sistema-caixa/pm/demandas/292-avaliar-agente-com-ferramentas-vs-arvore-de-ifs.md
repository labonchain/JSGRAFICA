# 292 — Avaliar 3ª opção: agente de IA com "ferramentas" travadas, em vez de árvore de IFs

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
A demanda 290 comparou 2 caminhos (reviver `ATENDIMENTO_AI` vs. dar liberdade de escrita pro
classificador do `206`) e recomendou um híbrido em cima do `206`. Depois disso, o Edvam apontou
um problema estrutural que a 290 não tinha pesado: **o `206` hoje tem 19 nodes IF encadeados**
decidindo toda a conversa, e isso já se mostrou frágil na prática — **6 bugs reais achados e
corrigidos no mesmo dia (demandas 279-289)**, vários deles exatamente do tipo "regra nova
interagindo mal com regra antiga que já existia" (ex.: a keyword antiga da 021 desviando
mensagem pro `06-PEDIDOS` morto sem que ninguém tivesse previsto a interação; o node
compartilhado entre mídia e texto que quebrou porque um campo que só fazia sentido pra mídia não
existia no caminho de texto). Empilhar mais conhecimento/regra em cima dessa árvore (o que o
híbrido da 290 propõe) tende a piorar essa fragilidade, não resolver.

**3ª opção, ainda não avaliada**: em vez de um fluxograma decidindo a conversa inteira com IFs, um
agente de IA de conversa livre de verdade (o mesmo tipo de node que o `ATENDIMENTO_AI` já usa,
`@n8n/n8n-nodes-langchain.agent`) que **chama ferramentas travadas** só pra fazer a parte que não
pode errar — calcular preço, gerar Pix, criar pedido, confirmar pagamento, escalar pro humano.
A IA decide o fluxo da conversa (sabe o catálogo inteiro, mantém contexto, tom humano, lida com
ambiguidade por raciocínio, não por branch pré-programado); a ferramenta em si é código puro,
determinístico, nunca inventa valor, igual ao `206` já garante hoje. O `ATENDIMENTO_AI` já prova
que esse tipo de node funciona no n8n (ele já tem 1 ferramenta, a busca no RAG) — a proposta é
usar o mesmo padrão de nó, mas construído do zero com as ferramentas certas, não reviver o
workflow quebrado de hoje.

**Isto é só análise, nada deve ser implementado nesta demanda.**

## Objetivo
Avaliar com peso técnico real se o padrão "agente + ferramentas" resolve o problema de fragilidade
que os 19 IFs do `206` já demonstraram na prática, comparado com o híbrido que a 290 recomendou e
com reviver o `ATENDIMENTO_AI` como está. Terminar com recomendação atualizada.

## Escopo
- Incluído: mapear quais "ferramentas" seriam necessárias pro atendimento da JS Gráfica funcionar
  de ponta a ponta (ex.: consultar preço de produto, gerar cobrança Pix, criar pedido aguardando
  aprovação, checar se cliente já tem sessão de pedido ativa, escalar pro humano com motivo) —
  cada uma mapeada contra o que o `206`/`06-PEDIDOS` já fazem hoje via código, pra não perder
  nenhuma garantia que já existe.
- Incluído: avaliar honestamente os riscos NOVOS desse padrão que os outros 2 caminhos não têm —
  principalmente: menos previsibilidade sobre COMO/QUANDO a IA decide chamar cada ferramenta (um
  agente pode, em tese, decidir não chamar a ferramenta de preço e responder um valor errado por
  conta própria, se o prompt/instrução não travar isso bem) — como mitigar isso de verdade, não
  só na teoria.
- Incluído: reavaliar a tabela comparativa da 290 (`pm/conhecimento/analise-arquitetura-
  atendimento-humanizado-vs-estruturado.md`, seção 5) incluindo esta 3ª opção, mesmos critérios já
  usados (esforço, risco de regressão, risco de preço errado, precisa de RAG, resolve conversa
  aberta, risco de banimento) + o critério novo que motivou esta demanda (fragilidade/manutenção
  a longo prazo, citando os 6 bugs de hoje como evidência real).
- Incluído: se a recomendação mudar em relação à 290, deixar claro o que muda na sequência de
  demandas sugerida (a 290 tinha 6 passos pro caminho híbrido; se a recomendação virar "agente com
  ferramentas", a sequência precisa ser redesenhada, não só emendada).
- Explicitamente fora de escopo: implementar qualquer coisa — nenhum node novo, nenhum prompt
  final, nenhuma mudança no `206` nem no `ATENDIMENTO_AI`. É análise, decisão fica pro Edvam depois.

## Critérios de aceite
- [ ] Ferramentas necessárias mapeadas contra o que já existe hoje (não perder garantia nenhuma)
- [ ] Riscos novos do padrão "agente + ferramentas" avaliados com honestidade, com mitigação real
      proposta pra cada um
- [ ] Tabela comparativa da 290 atualizada com a 3ª opção
- [ ] Recomendação final clara, mesmo que reafirme o híbrido da 290 (não é pra forçar mudar de
      ideia só porque é uma opção nova)

## Riscos e cuidados
Decisão estratégica, não técnica pura — a recomendação é insumo pro Edvam decidir, não autorização
pra implementar. Nenhuma mudança de roteamento real ou novo workflow deve ser criado a partir
desta demanda sozinha.

## Referências
Demanda 290 (`pm/conhecimento/analise-arquitetura-atendimento-humanizado-vs-estruturado.md`,
análise original, esta demanda estende, não substitui). Demandas 279-289 (os 6 bugs reais do dia,
evidência da fragilidade da árvore de IFs). `JSGRAFICA_ATENDIMENTO_AI` (já usa
`@n8n/n8n-nodes-langchain.agent` com 1 ferramenta de RAG, prova de conceito do tipo de node no
n8n, mesmo que o workflow em si tenha bugs próprios não relacionados a este padrão).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito: `pm/conhecimento/analise-arquitetura-atendimento-humanizado-vs-estruturado.md`
  atualizado com nova seção 7 (3ª opção, agente com ferramentas travadas), sem apagar a análise
  original da 290 (marcada explicitamente como histórico/superada, não removida). Conteúdo:
  1. **Contagem exata dos 19 nodes IF do `206`** reconferida direto no JSON do workflow (não
     estimativa), listados nome a nome, batendo com o número citado pelo Edvam.
  2. **6 bugs reais do dia (279-289) recitados com o padrão comum entre eles** (regra nova
     interagindo mal com regra antiga que ninguém tinha mapeado: keyword 021 desviando pro
     `06-PEDIDOS` morto, `Montar Proposta` assumindo mídia quando texto passou a compartilhar o
     node, `GET Memoria Ativa` sem ordenação só achado ao testar cenário novo, travessão
     espalhado por 7 nodes sem lugar central de texto) como evidência de que empilhar mais regra
     em cima da árvore tende a piorar, não resolver.
  3. **9 ferramentas mapeadas** contra o código que já existe hoje (206/lib/pedidos.ts), incluindo
     nota explícita de que nenhuma garantia se perde: as 9 variantes de escalação viram 1
     ferramenta parametrizada, a régua de cancelamento de 3 situações migra pra dentro da
     ferramenta (não fica exposta à decisão da IA), a trava de dado do Dizu vira validação de
     ferramenta (mais forte que hoje, porque não pode ser esquecida num roteamento novo do jeito
     que já aconteceu com outras regras).
  4. **6 riscos novos avaliados com mitigação real, não só teórica**, principalmente o risco 1
     (IA decide não chamar a ferramenta de preço): mitigação em camadas, prompt + ferramenta
     devolvendo frase pronta + validação de saída determinística que bloqueia e escala se um
     valor sair sem chamada de ferramenta correspondente (mesmo princípio já usado no blueprint
     pro lado inverso, nunca deixar passar pagamento que não bate) + auditoria via log de
     execução. Risco 3 (prompt injection) nomeado como categoria genuinamente nova que a árvore
     de IFs não tem, mitigado pelo mesmo princípio estrutural (ferramenta nunca aceita valor da
     IA pra gravar).
  5. **Tabela comparativa atualizada** com os 7 critérios da 290 + o critério novo (fragilidade/
     manutenção a longo prazo, com evidência real dos 6 bugs).
  6. **Recomendação mudou**: Caminho C (agente com ferramentas) passa a ser a recomendação,
     substituindo o híbrido da 290, com justificativa explícita de por que (resolve o problema
     estrutural real, guardrail de preço pelo menos tão forte quanto o do híbrido) e honestidade
     sobre o custo (esforço bem maior, tipo de risco novo). Deixado claro que o trabalho da 291
     (régua de tom + contexto recente) não é descartado, vira insumo pro prompt do agente novo.
  7. **Sequência de demandas redesenhada** (não emendada): 6 passos novos, incluindo "congelar o
     `206`" (não empilhar mais regra nele, incluindo não prosseguir com a integração da 291) e
     teste adversarial dedicado antes de qualquer rollout.

- Testes realizados e resultado: não aplicável no sentido de código (demanda de análise, sem
  implementação, conforme escopo explícito). Verificação feita: recontagem literal dos nodes IF
  do `206` contra o backup JSON já consultado em demandas anteriores desta sessão (277/292),
  batendo exatamente 19; conferência de que os 6 bugs citados (279-289) correspondem ao texto real
  dos relatos daquelas demandas, não memória; busca literal por travessão no arquivo inteiro após
  a edição, corrigidas 8 ocorrências introduzidas por mim mesmo durante a escrita antes de
  considerar a demanda concluída (regra do projeto, nenhum texto novo pode ter o caractere).

- Achados fora do escopo (relatados, não resolvidos por conta própria): nenhum achado técnico
  novo além do que já estava mapeado nas referências. Sinalizo pro PM/Edvam que, se o Caminho C
  for aprovado, a demanda 291 (mecanismo de contexto/tom) não precisa ser refeita, só redirecionada
  como insumo de prompt pro workflow novo em vez do `206`, economia real de trabalho já feito.

- Status final: **concluída**. Os 4 critérios de aceite batidos: ferramentas necessárias mapeadas
  contra o que já existe hoje, sem perda de garantia (seção 7.3); riscos novos avaliados com
  honestidade e mitigação real proposta pra cada um, não só teoria (seção 7.4); tabela comparativa
  da 290 atualizada com a 3ª opção e o critério novo de fragilidade (seção 7.5); recomendação
  final clara e justificada, com a mudança de recomendação explicitamente sinalizada e não
  escondida (seção 7.6), sequência de demandas redesenhada por completo, não só emendada (seção
  7.7).
