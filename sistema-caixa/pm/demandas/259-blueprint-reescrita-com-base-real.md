# 259 — Reescrever o blueprint com a base de conhecimento real (255/256), sem lógica de Dizu

Status: concluída
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: 2026-07-30
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
A base de conhecimento (`pm/conhecimento/base-conhecimento-atendimento-completa.md`, demandas
255 e 256) está pronta e conferida — cobertura real (668 clientes no quantitativo, 340 lidos de
verdade no qualitativo), não mais amostra pequena ou achismo. Esta demanda é a reescrita do
blueprint de conversas (`pm/conhecimento/blueprint-conversas-exemplo-agente.md` + artefato das
demandas 244-254) usando essa base como fundamento obrigatório — a mesma disciplina de evidência
já em vigor (cada mensagem classificada como evidência direta / padrão geral / hipótese, nenhum
mecanismo proposto sem citar a base).

**Decisão do Edvam**: o blueprint **não deve considerar nada relacionado à Dizu Refeições**. A
confusão com pedido de comida é uma situação temporária (a Dizu está usando o número da JS
Gráfica só até ter chip próprio, ver `project_dizu_whatsapp_temporario` na memória) — não faz
sentido desenhar comportamento permanente do agente em cima de um problema que está sendo
resolvido por outro caminho. Remover o "Exemplo F / Filtro Dizu" do escopo por completo.

## Objetivo
Blueprint reescrito, fundamentado na base real de 255/256, sem nenhuma referência a Dizu
Refeições, pronto pra nova revisão do Edvam.

## Escopo
- Incluído: redesenhar o fluxo de mídia ambígua usando a **taxonomia real em linguagem de
  cliente** da 256 (9 grupos: imprimir documento pronto, montar currículo, xerox/cópia ambíguo,
  foto por tamanho, trâmite oficial, personalizado de festa, plastificar, redigir documento,
  recarga) — não mais a categoria interna (`jsgrafica_produtos.categoria`).
- Incluído: diferenciar o comportamento inicial por **tipo de mídia real** (documento/PDF →
  agradecimento curto + segue direto; imagem → pergunta de triagem; áudio → não prioritário,
  registrar como tal) — usando os achados da seção 1 da base (255).
- Incluído: desenhar explicitamente o caso **"pedido mudo"** (cliente manda só o arquivo, zero
  palavra — 38% dos casos reais, Grupo 0 da seção 2/256) como fluxo principal, não exceção.
- Incluído: corrigir a comunicação de preço conforme o achado da 255 (seção 3) — produto de
  tabela fixa, o agente pode falar o valor; produto sob encomenda, o padrão real é mandar o Pix
  sem cravar o número em texto (ou escalar, não inventar valor).
- Incluído: escalação de cancelamento usando a política real já levantada nesta sessão (não
  registrada ainda na base 255/256, usar como referência adicional): pedido NÃO pago → agente
  resolve direto ("Sem problemas, cancelado! 😊"), sem passar por aprovação (mesmo comportamento
  que o sistema já permite pra qualquer atendente hoje); pedido JÁ PAGO → escala com motivo real
  ("Você já pagou esse — vou pedir pra equipe processar a devolução"); pedido JÁ ENTREGUE → escala
  pro Admin especificamente ("Esse já foi entregue — vou verificar e te aviso").
- Incluído: remover por completo o "Exemplo F / Filtro Dizu" e qualquer menção a confusão com
  pedido de comida — não é mais escopo do blueprint.
- Incluído: manter a disciplina de classificação de evidência (evidência direta / padrão geral /
  hipótese) em cada mensagem, e a estrutura de 2 abas (Resultado final / Parte técnica) já
  construída na 253.
- Explicitamente fora de escopo: as 3 decisões da demanda 243 (conectar/lote/escopo) — continuam
  aguardando o Edvam, depois desta reescrita.

## Critérios de aceite
- [ ] Fluxo de mídia ambígua usa a taxonomia de 9 grupos em linguagem de cliente, não categoria
      interna
- [ ] Comportamento inicial diferenciado por tipo de mídia real (documento vs. imagem vs. áudio)
- [ ] Caso "pedido mudo" (sem nenhuma palavra) desenhado como fluxo principal
- [ ] Comunicação de preço segue o padrão real (tabela fixa fala valor; sob encomenda não crava
      número, manda Pix ou escala)
- [ ] Escalação de cancelamento com as 3 situações (não pago / pago / entregue), cada uma com
      motivo real
- [ ] Zero menção a Dizu Refeições em qualquer parte do documento ou artefato
- [ ] Toda mensagem classificada (evidência direta / padrão geral / hipótese)
- [ ] Artefato (2 abas) e `.md` fonte atualizados de forma consistente

## Riscos e cuidados
Documento grande e com muitas peças novas — conferir a lista de critérios de aceite item por
item antes de reportar concluído, não só ler uma vez e assumir que cobriu tudo.

## Referências
`pm/conhecimento/base-conhecimento-atendimento-completa.md` (demandas 255/256, fonte obrigatória).
Demandas 244-254 (blueprint anterior, estrutura de abas a manter). Demanda 243 (as 3 decisões que
seguem depois). Política de cancelamento discutida nesta sessão (não está na base 255/256 ainda —
usar como referência direta desta demanda).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. Blueprint (`pm/conhecimento/blueprint-conversas-exemplo-agente.md`) reescrito por completo.
     Parte 1: Exemplo 1 (documento sem nenhuma palavra, pedido mudo dominante) e Exemplo 2
     (imagem sem nenhuma palavra → triagem → lista de 9 grupos em linguagem de cliente, não mais
     categoria interna) redesenhados como fluxo principal. Exemplo 3 novo (currículo, agora com
     citação real da 256, Jamilly `558197037824`). Exemplo 4 = rajada de mensagens (preservado).
     Exemplo 5 novo (comunicação de preço — tabela fixa fala valor, sob encomenda manda Pix sem
     cravar número, com 2 citações reais contrastando). Exemplo 6 novo (cancelamento, 3 situações
     — não pago/pago/entregue — usando os textos exatos fornecidos na demanda, marcados como
     REGRA DE NEGÓCIO, não evidência de conversa). Exemplo 7 = cuidado com Pix (preservado,
     renumerado). "Outros casos rápidos" expandido com xerox/cópia ambíguo (achado 256) e áudio
     não-prioritário (achado 255). Exemplo antigo de confusão de número compartilhado removido
     por completo, junto com toda menção equivalente na Parte 2 (histórico, achados de risco,
     mapa de regras).
  2. Parte 2 atualizada: novo item no histórico de correção (259), nova seção "Fundamentação da
     taxonomia de linguagem de cliente" (os 9 grupos com exemplo real cada, citando
     `evidencia-256/`), tabela de verificação expandida pra 22 linhas com 4º nível de
     classificação (REGRA DE NEGÓCIO, pras 3 mensagens de cancelamento), achados de risco com o
     item de número compartilhado generalizado/sem nomear o negócio específico, mapa de regras
     com as 4 regras novas desta revisão.
  3. Artefato HTML (`blueprint-atendimento.html`, mesma URL
     `https://claude.ai/code/artifact/ce1a341d-4c82-4549-b21a-6ca124a04301`) reescrito espelhando
     o `.md` — mesmo design system reaproveitado, 2 abas preservadas, navegação rápida atualizada
     pros novos Exemplos 1-7 + "Outros casos". Republicado com sucesso na mesma URL.

- Testes realizados e resultado:
  - Busca por "dizu" (case-insensitive) rodada nos dois arquivos finais (`.md` e `.html`) — 0
    ocorrências confirmadas em ambos (a primeira passada do `.md` ainda tinha 6 menções residuais
    em texto de histórico/meta-comentário, corrigidas antes de reportar concluído — não eram
    conteúdo de exemplo de conversa, mas contavam pro critério "qualquer parte do documento").
  - Conferência item a item dos 8 critérios de aceite (não só releitura corrida): taxonomia de 9
    grupos presente no Exemplo 2 de ambos os arquivos com wording consistente; comportamento por
    tipo de mídia diferenciado (documento/imagem/áudio) confirmado nos Exemplos 1, 2 e "outros
    casos"; "pedido mudo" explicitamente descrito como fluxo principal (não exceção) nos Exemplos
    1 e 2; comunicação de preço com 2 exemplos reais contrastantes (Exemplo 5); cancelamento com
    as 3 situações e os textos exatos da demanda (Exemplo 6); toda mensagem da Parte 1 conferida
    contra a tabela de verificação da Parte 2 — as 22 linhas cobrem 100% das mensagens do agente
    mostradas na Parte 1, nenhuma faltando.

- Achados fora do escopo (relatados, não resolvidos por conta própria):
  - Ao abrir a pasta de demandas pra localizar o arquivo da 259, encontrei que a demanda 257
    (investigação de contaminação Dizu) já tinha sido executada por outra sessão/chat (02-DADOS,
    conforme especificado na própria demanda) — existem 2 arquivos de demanda 257 no disco
    (`257-investigar-contaminacao-dizu-clientes-reais.md` e
    `257-investigar-contaminacao-dizu-refeicoes-clientes-reais.md`, nomes quase idênticos) e já
    existe uma demanda 258 (`258-parar-broadcast-dizu-separar-instancia.md`). Não abri nem mexi em
    nenhum dos dois — fora do escopo desta demanda e de um chat executor diferente — mas sinalizo
    a duplicata de nome de arquivo da 257 como possível achado de higiene a resolver depois (dois
    arquivos quase iguais para o mesmo número de demanda sugere execução em paralelo por 2
    sessões sem coordenação).
  - As 3 decisões da demanda 243 (conectar/lote/escopo) seguem aguardando o Edvam, sem mudança —
    conforme explicitamente fora de escopo desta demanda.

- Status final: **concluída**. Todos os 8 critérios de aceite batidos, conferidos item a item
  (não só lidos uma vez): taxonomia de 9 grupos no fluxo de mídia ambígua; comportamento inicial
  diferenciado por tipo de mídia; "pedido mudo" como fluxo principal; comunicação de preço correta
  (tabela fixa fala valor, sob encomenda não crava número); cancelamento com as 3 situações e
  motivo real; zero menção a Dizu Refeições confirmada por busca direta nos 2 arquivos finais;
  toda mensagem classificada (4 níveis, incluindo o novo REGRA DE NEGÓCIO); artefato e `.md`
  atualizados de forma consistente e republicados na mesma URL.
