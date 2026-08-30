# Fontes do Manual de Marca JS Gráfica

3 famílias, todas gratuitas e de uso livre (Google Fonts, licença SIL Open Font License —
uso comercial permitido, incluindo em material impresso e embutidas em produto).

## 1. Space Grotesk (display, títulos, wordmark)
- **Uso**: título principal (H1), título de seção (H2), nome "JS GRÁFICA" no logo horizontal
  (`logo-secundario.svg`).
- **Pesos usados**: 500 (títulos de seção) e 700 (título principal, wordmark).
- **Google Fonts**: https://fonts.google.com/specimen/Space+Grotesk
- **Link de import direto (CSS)**:
  `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap`
- Nunca usar peso abaixo de 500 (fica frágil demais na identidade visual).

## 2. Inter (texto corrido, corpo)
- **Uso**: parágrafo, descrição, legenda, ênfase em corpo de texto.
- **Pesos usados**: 400 (corpo) e 600 (ênfase).
- **Google Fonts**: https://fonts.google.com/specimen/Inter
- **Link de import direto (CSS)**:
  `https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap`

## 3. IBM Plex Mono (dado funcional)
- **Uso**: preço, prazo, telefone, qualquer dado numérico/funcional em destaque.
- **Pesos usados**: 400 e 500.
- **Google Fonts**: https://fonts.google.com/specimen/IBM+Plex+Mono
- **Link de import direto (CSS)**:
  `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap`

## Pra baixar os arquivos de fonte (uso em Illustrator/Figma/InDesign, não só web)
Cada link do Google Fonts acima tem um botão "Download family" na própria página, que baixa os
arquivos `.ttf`/`.otf` de todos os pesos da família de uma vez.

## Nota sobre o logo-secundario.svg
O arquivo vetorial já referencia `'Space Grotesk'` corretamente no atributo `font-family`, mas um
arquivo SVG sozinho não carrega a fonte do Google Fonts (isso só funciona dentro de uma página web
com o link de import acima, ou em software de design que já tenha a fonte instalada no sistema).
Se abrir o SVG num programa sem a fonte instalada, o texto aparece com a fonte de fallback do
sistema — instale a Space Grotesk primeiro (link acima) pra ver/editar com a fonte certa.
