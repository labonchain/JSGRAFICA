# 366 - Testar tipos diferentes de imagem gerada (fundo complementar/composição) antes de padronizar prompt de card

Status: concluída
Criada em: 2026-08-31
Aprovada em: 2026-08-31 (pedido direto do Edvam, aprovação implícita no próprio pedido)
Concluída em: 2026-08-31
Chat executor: 07 - MARKETING JS GRAFICA

## Contexto
A 361 (redesenho da peça P4-07) e a 364 (workflow de geração de imagem via Gemini) já provaram
que dá pra gerar uma foto realista de produto isolado e compor tipografia/logo por cima em
HTML/CSS. O Edvam agora quer um passo antes de padronizar os prompts de card pra produção: testar
tipos diferentes de imagem gerada, em especial fundo que complementa outras imagens da mesma
peça, pra criar a arte composta (não só o produto isolado sozinho).

Pedido direto do Edvam (31/08): "testar gerar imagens diferentes para os produtos, tipos de
imagens diferentes que façam bg que complementam outras imagens para criar uma arte", validar
resultado num artefato antes de voltar pra criação de cards mais afiados com os tipos de
prompt/imagem escolhidos.

## Objetivo
Produzir um conjunto de testes reais (usando o workflow 364, Gemini) de tipos diferentes de
imagem/fundo complementar pra composição de card, apresentado num artefato pro Edvam validar
visualmente, antes de fechar o padrão de prompt que vai pra produção de verdade.

## Escopo
- Incluído: gerar variações de imagem (fundo, ambientação, composição) via 364, montar artefato
  comparativo pro Edvam avaliar, documentar qual tipo de prompt/imagem funcionou melhor.
- Explicitamente fora de escopo: produção final de cards em massa (isso é o próximo passo, só
  depois do Edvam validar o teste), republicar qualquer uma das 32 peças antigas.

## Critérios de aceite
- [ ] Pelo menos 2-3 tipos diferentes de imagem/fundo testados via 364.
- [ ] Artefato publicado com os testes lado a lado, pronto pro Edvam validar.
- [ ] Recomendação registrada de qual padrão de prompt/imagem seguir pra produção.

## Riscos e cuidados
Não é produção real ainda, é teste/validação. Não publicar nada em canal real (Status/Canal/
Instagram) a partir deste teste sem aprovação separada.

## Referências
- Demanda 361 (`361-revisar-direcao-visual-pecas-canal.md`)
- Demanda 364 (`364-workflow-geracao-imagem-ia-pipeline-conteudo.md`)

## Relato de execução

Concluída em 31/08/2026. 3 variações testadas via o workflow 364 (Gemini), mesmo produto (caneca)
pra isolar a variável "tipo de fundo/imagem", com um mockup a mais provando o conceito.

Canvas publicado: https://claude.ai/code/artifact/a831a8aa-6d23-4277-a167-f556bb7bf850

**Variação A, produto isolado (reaproveitada da 361/364, sem nova chamada)**: fundo neutro liso.
Já validada antes, funciona bem quando o card é foto + tipografia separadas.

**Variação B, painel de cor complementar dentro da própria foto**: pedi no prompt uma foto real
onde parte do quadro é um painel sólido de cor uniforme (sem textura, como uma parede lisa na
mesma cena), servindo de área reservada pra texto. Resultado: painel saiu em `#274156`, muito
próximo do Azul Sistema Escuro `#1E4363` da marca (não exato, a IA não acerta hex de propósito,
mas visualmente muito parecido). Montei um mockup real (`DemoComposta.dc.html`) com título, apoio
e CTA direto sobre esse painel, sem card/frame separado nenhum, e o resultado ficou muito forte,
foto e tipografia parecem a mesma peça, não uma composição colada por cima.

**Variação C, cena lifestyle (ambientada)**: caneca numa mesa de madeira com caderno e planta
desfocados ao fundo, luz de janela. Qualidade fotográfica real muito boa, mas 2 ressalvas: os
objetos extras (caderno, planta) competem visualmente com o produto e podem ficar estranhos em
categorias de produto diferentes (nem todo produto combina com "mesa de escritório"), então não
generaliza tão bem quanto A ou B pra virar padrão único de prompt.

**Recomendação registrada**: variação B (painel de cor complementar) é a mais forte pra virar
padrão de produção, prova real na peça demo. A cor do painel gerado deve ser tratada como
aproximada, não confiável pra bater hex exato, então a composição final continua reservando a
opção de corrigir/reforçar a cor por cima em CSS quando precisão de marca for crítica. Variação C
fica como opção pontual pra pautas que pedem clima/ambientação específica, não como padrão.

Nenhuma peça publicada em canal real a partir deste teste, como pedido no escopo. 3 chamadas reais
ao webhook da 364 no total (1 reaproveitada da demanda anterior + 2 novas).

Arquivos mantidos em
`opensquad/squads/js-grafica-canal-conteudo/output/demanda-366-testes-imagem/`.
