# 339 - Squad de marca: manual de logo/aplicações da JS Gráfica

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: 2026-08-28
Chat executor: 07 - MARKETING JS GRAFICA

Pedido direto do Edvam: a JS Gráfica não tem nenhum manual de marca, seja logo, aplicações,
identidade visual. `JSGRAFICA_Brand_Profile.md` existe mas está majoritariamente vazio. Cada
lugar usa o logo/identidade de um jeito diferente, e o próprio Edvam gera variações diferentes
no GPT sem uma referência única pra seguir. Isso já causa inconsistência real em qualquer peça
nova (WhatsApp Status, Instagram, impressos).

## Contexto: existe um modelo comprovado, de outro cliente do mesmo grupo

O workspace `DIZU REFEIÇÕES/squads/dizu-brand/` tem um squad "opensquad" real, já rodado com
sucesso (abril/2026) pra outra empresa do mesmo grupo (Dizu Refeições), resultado real
inspecionado: pipeline de 8 passos com "agentes" nomeados (Marina - curadoria, Otávio - sistema,
Teo - templates, Rita - revisão), checkpoints de aprovação humana em pontos-chave, terminando
numa peça de revisão estruturada (nota ponderada 8.1/10 por dimensão: coerência com a direção,
solidez do sistema, aplicação nos templates, serve ao público real) com lista de pendências por
prioridade. Vale usar como referência de estrutura, não copiar o conteúdo (é de outra marca).

**Achado técnico, ainda não confirmado**: as integrações de publicação (`instagram-publisher`,
`blotato`) existem só como pasta vazia neste workspace, não confirmado se rodam de outro lugar
(pacote instalado, skill global) ou se nunca foram implementadas de verdade. Precisa confirmar
antes de prometer publicação automática via esse caminho.

## Objetivo
Montar um squad `js-grafica-brand` (mesmo formato do `dizu-brand`, adaptado) que produza um
manual de marca real e definitivo pra JS Gráfica: logo (ou refinamento do que já existe),
paleta, tipografia, regras de aplicação por canal (WhatsApp Status, Instagram, impressos,
fachada), com o mesmo rigor de revisão/nota do exemplo da Dizu, não é só gerar uma peça, é
criar a referência que todo mundo (inclusive o Edvam gerando algo no GPT) deveria seguir depois.

## Escopo
- Incluído: desenho do squad (passos, agentes, checkpoints), execução com material real da JS
  Gráfica (fotos da fachada já levantadas em `DIZU REFEIÇÕES/`, `unnamed.webp`/`WhatsApp
  Image...jpeg`, mais qualquer material adicional que o Edvam fornecer), manual final.
- Explicitamente fora de escopo: montar o squad `js-grafica-conteudo` (peças recorrentes de
  Status/Instagram). Isso é demanda futura separada, depois que o manual de marca existir (não
  faz sentido gerar conteúdo recorrente antes de ter a referência de marca definida).
- Explicitamente fora de escopo: confirmar/implementar publicação automática real (Instagram
  ainda bloqueado esperando token da conta comercial, achado técnico do publisher/blotato acima
  ainda não resolvido).

## Riscos e cuidados
Squad novo, fora do `caixa-js-grafica` (Next.js), não mexe em nada do sistema em produção. Se
precisar de infraestrutura que hoje não existe no workspace da JS Gráfica (o framework opensquad
em si), avaliar se a criação dessa infraestrutura é deste domínio ou se precisa de apoio do
03-APP/01-N8N antes de prosseguir. Relatar pro PM se esbarrar nisso.

## Referências
`DIZU REFEIÇÕES/squads/dizu-brand/` (modelo real), `JSGRAFICA_Brand_Profile.md` (hoje vazio),
`DIZU REFEIÇÕES/unnamed.webp` e `WhatsApp Image 2026-08-01 at 00.33.04.jpeg` (fotos reais da
fachada da JS Gráfica).

## Relato de execução

**Concluída em 2026-08-28, executor 07-Marketing. Aprovada pelo Edvam ("APROVADO").**

**Infraestrutura construída (não existia antes desta demanda)**: o framework opensquad de
origem (`Projects/opensquad/`) não é acessível desta sessão e, inspecionado de perto, estava
vazio (nunca teve o motor genérico implementado, cada squad rodado lá foi manual). Decisão do
Edvam: construir implementação própria, completa, dentro do workspace da JS Gráfica. Resultado:
`opensquad/CLAUDE.md`, `opensquad/_opensquad/core/` (prompts de arquiteto/pipeline runner, best
practices de squad de marca), `opensquad/_opensquad/_memory/company.md` (contexto real da JS
Gráfica), skill `.claude/skills/opensquad/SKILL.md`, e o squad `js-grafica-brand` com pipeline
de 8 passos, agentes nomeados (Nina Referência, Caio Sistema, Duda Templates, Ivo Revisão).

**Run completa**: Direção 3 (Sistema de Ícone Vivo) escolhida pelo Edvam via moodboard visual
real (não só texto), com instrução direta de preservar o selo da lâmpada da exploração aprovada.
Sistema visual (paleta de 12 cores, tipografia de 3 famílias, grid) e manual de 10 seções
construídos e aprovados sem loop de correção. 10 templates de aplicação gerados (WhatsApp
Status, Instagram, cartão de visita, panfleto, banner, placa, etiqueta, perfil), 1 bug real de
sobreposição achado e corrigido antes do checkpoint intermediário.

**Logo, 6 rodadas de ajuste até fechar** (o item que mais exigiu iteração da run inteira,
sempre validado com renderização real, nunca só leitura de SVG): loop 1-4 fecharam a densidade e
o conteúdo real dos 15 pictogramas internos (o Edvam corrigiu 2 vezes que os ícones precisavam
ser formas reconhecíveis reais do selo original, não abstrações genéricas, até bater com a
imagem que ele mandou). Loop 5 trocou a regra de cor (de monolinear branco único pra colorido
disciplinado, pedido direto do Edvam), com 3 sub-rodadas até achar uma paleta com variedade
visual real (2 tentativas anteriores tecnicamente passavam no cálculo WCAG mas liam como "quase
tudo branco" a olho nu, achado só confirmado com renderização de teste, não com número). Loop 6
foi a correção mais estrutural: o Edvam reenviou a imagem original do selo e apontou que a
versão do sistema tinha 3 erros reais que nenhuma rodada anterior tinha pego (o selo nunca teve
círculo de fundo, é só a lâmpada; o interior do bulbo é claro, não Azul Sistema; falta a rosca
real na base, que era só um retângulo liso). Corrigido nos 5 arquivos de logo, com o fundo claro
abrindo uma paleta de cor bem mais ampla pros ícones (6 cores finais: Azul Sistema, Azul Sistema
Escuro, Amarelo Aviso Escuro, Laranja Pêssego Escuro, Grafite Traço, Grafite Névoa), reembutido
nos 10 templates e no manual, tudo verificado por renderização real antes de cada apresentação
ao Edvam.

**Achado de processo real desta run**: pelo menos 3 vezes o problema real não era design, era
percepção/verificação, cores tecnicamente distintas por cálculo WCAG que liam como iguais a
olho nu (loop 5), e uma imagem colada anteriormente na conversa que não podia ser reaberta,
exigindo pedir o reenvio pro Edvam (loop 4/6). Lição pro `_opensquad/core/best-practices/`:
sempre validar decisão de cor/forma por renderização real vista com os próprios olhos antes de
apresentar, nunca só por número calculado, e guardar/relatar imagem de referência assim que
recebida, já que não é possível reabri-la depois.

**Entregáveis finais**: manual completo publicado em
`https://claude.ai/code/artifact/70fd7f31-48ac-4379-98b4-fa7ed98896e6` (10 seções, live),
5 arquivos de logo e 10 templates em
`opensquad/squads/js-grafica-brand/output/2026-08-28-010610/`, revisão final (Ivo) com nota
ponderada 8.8/10, veredicto aprovado, sem blocker.

**Próximo passo natural, fora desta demanda**: atualizar `JSGRAFICA_Brand_Profile.md` (hoje
vazio) com o conteúdo de `05-manual-marca.md`, e abrir o squad `js-grafica-conteudo` (peças
recorrentes), já sequenciado como dependência da demanda 348.
