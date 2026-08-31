# Briefing de imagem, teste de geração por IA, P4-07 (Canecas personalizadas)

Demanda: 361 (caminho b, teste de geração de imagem por IA no lugar de desenhar o objeto em SVG)
Data: 31/08/2026
Peça de referência: `conteudos/2026/08/BLOCO-007_P4-07_P4-08_P4-09/` (copy já aprovada, não muda)

## Por que este teste

O exemplo anterior da P4-07 (caneca desenhada em SVG dentro do HTML/CSS da peça) foi apontado
como fraco porque a técnica de vetor plano não simula material real (cerâmica, luz, sombra).
Este briefing pede uma foto real (ou ilustração realista, ver seção Estilo) da caneca, gerada
fora deste processo, pra eu compor a peça final por cima depois (texto, logo, layout), em vez de
desenhar o objeto do zero.

## O que a imagem PRECISA mostrar

Uma caneca de cerâmica branca lisa, sem nenhuma estampa, texto, logo ou desenho aplicado nela.
Isso é proposital: a peça fala de "personalização" como possibilidade ("pensando em uma caneca
personalizada?"), não mostra uma arte finalizada específica de um cliente real, então a caneca
deve estar em branco, pronta pra receber qualquer ideia, não com uma estampa de exemplo já
aplicada (evita prometer visualmente um resultado específico que não existe ainda).

Objeto único, sem outros itens de papelaria/produto no quadro (sem caneta, sem prato, sem outros
objetos competindo com o foco).

## Estilo

Foto de produto realista, não ilustração nem 3D estilizado. Luz natural suave, uma fonte de luz
principal vindo de cima e da esquerda (mesma lógica de luz única que o resto do sistema visual já
usa em sombra), sombra de contato suave no apoio, sem sombra dura de estúdio comercial agressivo.
Sem elementos decorativos soltos no quadro (confete, formas geométricas, texto), a imagem deve
ser só a caneca fotografada bem, o resto (tipografia, cor de fundo de marca, logo) entra depois
no HTML/CSS por cima.

## Paleta (obrigatório bater com o manual de marca)

Fundo/superfície da foto: tom neutro batendo com Branco Gelo `#F7F7F5` (levemente quente, não
branco puro de estúdio) ou, como alternativa, um fundo levemente Azul Sistema Claro `#DCE8F0`
bem desaturado, sempre claro o bastante pra não competir com texto escuro sobreposto depois.
Não usar fundo azul saturado, laranja ou amarelo do sistema como cor de cena (essas ficam pra
elementos gráficos aplicados depois em CSS, não pra cor de fundo da foto em si). A própria
caneca branca lisa.

## Composição e enquadramento

Caneca posicionada levemente à direita ou centro-direita do quadro, alça virada pra direita,
ângulo de 3/4 (não de frente reta nem de cima), tamanho generoso no quadro (a caneca deve ser o
elemento dominante, não pequena e perdida no fundo).

**Respiro obrigatório pra composição posterior:**
- Terço superior do quadro (aprox. 35 a 40% da altura) livre de objeto, só fundo, pra eu
  sobrepor o título grande em tipografia depois.
- Faixa inferior (aprox. 15 a 20% da altura) livre de objeto, só fundo, pra eu sobrepor
  legenda, CTA e logo depois.
- Área frontal lisa da caneca (a parte voltada pro observador) sem nenhum brilho ou reflexo forte
  bloqueando essa superfície, pra eu poder aplicar por cima, se decidir na composição final, um
  elemento gráfico leve indicando "sua ideia aqui" (opcional, decido na hora de montar a peça).

## Proporção, 2 versões

Preciso de 2 enquadramentos, não é só recortar um no outro:

1. **Quadrado, 1080x1080 (Canal)**: composição conforme descrito acima.
2. **Vertical, 1080x1920 (Status)**: mesma caneca, mesmo estilo e paleta, mas enquadramento mais
   alto/estreito, com MAIS respiro vertical acima e abaixo do objeto (a área central em torno de
   40 a 55% da altura reservada pra caneca, resto é fundo liso pra texto), não é a imagem quadrada
   esticada.

## O que NÃO incluir

Sem marca de terceiro, sem logo de outra empresa, sem texto/palavra escrita em qualquer
superfície da imagem (nem na caneca, nem no fundo), sem mão ou pessoa segurando a caneca, sem
preço, sem elemento de outra categoria de produto, sem estampa/desenho já aplicado na caneca.

## Depois de gerada

A imagem volta pro repositório (`conteudos/2026/08/BLOCO-007_P4-07_P4-08_P4-09/briefing-imagem/`,
2 arquivos, um por proporção) e eu componho a peça final por cima dela em HTML/CSS (tipografia,
CTA, logo), no lugar de desenhar a caneca em SVG. Copy não muda, continua a já aprovada em
`copy/CANAL_P4-07_20260830_COPY_v01.md`.
