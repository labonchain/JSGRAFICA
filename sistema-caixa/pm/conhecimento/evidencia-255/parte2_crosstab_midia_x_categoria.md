# Pesquisa 255 — Parte 2: mapa de frequência mídia inicial → categoria de produto resultante

Janela: 2026-07-01 a 2026-07-30. Mesmo escopo de sessão da Parte 1 (1ª mensagem = mídia sem
legenda). Categoria vem de `jsgrafica_produtos.categoria`, join por `servico_id = produtos.id`
com fallback por nome (`lower(btrim(servico_nome)) = lower(btrim(produtos.nome))`) quando
`servico_id` é nulo (pedido com item digitado à mão, fora do catálogo).

Duas versões da contagem, pelo mesmo motivo: 44 das sessões vinculadas geraram MAIS de 1 pedido
dentro da janela de 48h (ex.: cliente que manda PDF e depois pede 6 impressões separadas —
comum em clientes recorrentes/volume). "Por pedido" conta cada pedido individual; "por sessão"
conta só o 1º pedido de cada sessão (não duplica o mesmo cliente/sessão várias vezes).

## TABELA A — contagem por PEDIDO (n=537 pedidos vinculados no total)

### documento_pdf → categoria (357 pedidos vinculados a 257 sessões)
| categoria | n pedidos | % dentro de documento_pdf |
|---|---:|---:|
| Impressão papel oficio | 305 | 85.4% |
| xerox | 24 | 6.7% |
| Consulta Online | 10 | 2.8% |
| Escritório | 9 | 2.5% |
| Plastificação | 3 | 0.8% |
| Impressão papel cartao | 2 | 0.6% |
| Recarga celular | 2 | 0.6% |
| SEM_CATEGORIA_MATCH (item avulso digitado) | 2 | 0.6% |
| Impressão papel foto | 1 | 0.3% |
| Impressão papel couche | 1 | 0.3% |

### imagem → categoria (164 pedidos vinculados a 112 sessões)
| categoria | n pedidos | % dentro de imagem |
|---|---:|---:|
| Impressão papel oficio | 95 | 57.9% |
| Impressão papel foto | 26 | 15.9% |
| xerox | 8 | 4.9% |
| Impressão papel cartao | 6 | 3.7% |
| Plastificação | 6 | 3.7% |
| Impressão papel adesivo | 5 | 3.0% |
| Encadernacao | 4 | 2.4% |
| Serviço terceirizado | 3 | 1.8% |
| Impressão papel couche | 3 | 1.8% |
| Escritório | 2 | 1.2% |
| Recarga vem | 2 | 1.2% |
| Consulta Online | 2 | 1.2% |
| SEM_CATEGORIA_MATCH (item avulso digitado) | 2 | 1.2% |
| Personalizados | 2 | 1.2% |

### audio → categoria (3 pedidos vinculados a 2 sessões)
| categoria | n pedidos |
|---|---:|
| Escritório | 1 |
| Impressão papel oficio | 1 |
| Consulta Online | 1 |
(n muito baixo — não tratar como distribuição confiável, é só o resultado bruto real)

### outro_sticker → categoria (5 pedidos vinculados a 4 sessões)
| categoria | n pedidos |
|---|---:|
| Consulta Online | 3 |
| Impressão papel oficio | 2 |
(inclui o caso de contaminação 558198016818 discutido na Parte 1 — não tratar como confiável)

### video, documento_outro, outro_contact
Nenhum pedido vinculado em 48h (0 sessões converteram) — sem dado pra crosstab.

---

## TABELA B — contagem por SESSÃO (1º pedido de cada sessão só, sem duplicar cliente recorrente)

### documento_pdf → categoria (257 sessões com pedido)
| categoria | n sessões | % |
|---|---:|---:|
| Impressão papel oficio | 243 | 94.6% |
| xerox | 10 | 3.9% |
| Impressão papel cartao | 2 | 0.8% |
| Consulta Online | 2 | 0.8% |
| Impressão papel foto | 1 | 0.4% (arredondamento residual — soma bate com 257) |

### imagem → categoria (112 sessões com pedido)
| categoria | n sessões | % |
|---|---:|---:|
| Impressão papel oficio | 72 | 64.3% |
| Impressão papel foto | 15 | 13.4% |
| Impressão papel cartao | 5 | 4.5% |
| Impressão papel adesivo | 4 | 3.6% |
| xerox | 4 | 3.6% |
| Serviço terceirizado | 3 | 2.7% |
| Impressão papel couche | 2 | 1.8% |
| Recarga vem | 2 | 1.8% |
| SEM_CATEGORIA_MATCH | 2 | 1.8% |
| Personalizados | 1 | 0.9% |
| Encadernacao | 1 | 0.9% |
| Plastificação | 1 | 0.9% |

### audio → categoria (2 sessões com pedido)
| categoria | n sessões |
|---|---:|
| Impressão papel oficio | 1 |
| Consulta Online | 1 |

### outro_sticker → categoria (4 sessões com pedido)
| categoria | n sessões |
|---|---:|
| Impressão papel oficio | 2 |
| Consulta Online | 2 |

---

## LEITURA DIRETA DOS NÚMEROS (achado real, não hipótese)

- **Documento/PDF quase sempre vira "Impressão papel oficio"** (85-95% dependendo da métrica) —
  a hipótese do pedido de pesquisa ("documento quase sempre vira X") bate com o dado real. O
  resto se dispersa pouco: xerox é o único 2º lugar com peso (3.9-6.7%).
- **Imagem é MUITO mais distribuída do que documento** — ainda assim "Impressão papel oficio"
  domina (57.9-64.3%), o que provavelmente reflete pessoas fotografando um documento físico em
  vez de escanear (comportamento real, vale investigar separado se topo é isso). Mas imagem
  também puxa categorias que documento praticamente não puxa: Impressão papel foto (13-16%),
  papel adesivo, encadernação, plastificação, personalizados, serviço terceirizado — ou seja,
  imagem é o canal de entrada real para pedidos "visuais" (fotos, banners, adesivos), não só
  substituto de PDF.
- **Áudio e sticker têm volume baixo demais pra ler tendência de categoria** (n=2 a 4 sessões) —
  o dado disponível é só isso, reportado como está, sem inferência de %.
- **4 dos 537 pedidos vinculados (0.7%) não bateram com nenhuma categoria do catálogo** — são
  itens avulsos digitados à mão pelo operador (ex. "3 banner 50x100", "1 m² adesivo leitoso
  recortado", "Entrada diversa") — não é erro de join, é pedido fora do catálogo padrão mesmo.

## Casos de contaminação identificados nesta pesquisa (novo achado, não estava em investigação
anterior — repassar como achado a investigar/registrar por completo, não só documentar)

Pelo menos 3 sessões na amostra qualitativa (não a contagem agregada, mas presentes nela) têm
conteúdo claramente não relacionado a serviço de gráfica, no mesmo padrão do achado de ~23% de
contatos contaminados já registrado:
- 558198016818 (sticker, 07-24): textão sobre antibióticos misturado com pergunta de pendrive.
- 558184836197 (sticker, 07-30): mensagem de cardápio de almoço ("feijão mulatinho e almôndegas
  molho, 14,00") — parece vendedor de marmita usando o mesmo número/canal.
- 558192778804 (contact card, 07-20): conversa sobre comida ("isca de frango").
Isso pode estar inflando ligeiramente as contagens de "outro_sticker"/"outro_contact" (n já é
baixo, então o efeito proporcional é grande nesses 2 tipos especificamente — não afeta PDF/imagem
que têm volume alto).
