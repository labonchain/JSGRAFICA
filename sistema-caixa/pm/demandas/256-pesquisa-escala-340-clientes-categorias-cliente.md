# 256 — Pesquisa em escala real (~340 clientes) + categorias na linguagem do cliente, não da gráfica

Status: concluída
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: 2026-07-30
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
A demanda 255 foi um avanço real (conferido pelo PM, números batem com o banco), mas o Edvam
identificou 2 lacunas que ainda tornam a base insuficiente:

1. **As categorias usadas (`jsgrafica_produtos.categoria`) são organização interna da gráfica,
   não linguagem de cliente.** "Impressão papel ofício", "Consulta Online" — ninguém liga
   pedindo isso. O documento da 255 mapeou mídia→categoria interna, mas nunca investigou como o
   cliente **de fato descreve** o que quer, nem como apresentar opções de um jeito que ele
   reconheça sem saber a categorização da gráfica.
2. **Escala da amostra ainda pequena e com critério de seleção não sistemático o suficiente.**
   Confirmado pelo PM: existem **666 clientes reais** (telefones com pelo menos 1 pedido de
   verdade, excluindo contaminação/teste/balcão) — não os 2.551 contatos totais (que incluem
   ruído de outro negócio e gente que nunca virou cliente). Decisão do Edvam: a pesquisa precisa
   cobrir **51% desses 666 (~340 clientes)**, não amostras pequenas selecionadas por critério
   frágil.

## Objetivo
1. Uma proposta de organização de categorias/opções **na linguagem real do cliente**, derivada de
   como os próprios clientes descrevem o que querem (não da tabela interna de categoria).
2. A base de conhecimento (255) robustecida com cobertura em escala real: análise quantitativa
   (contagens, cruzamentos) cobrindo os 666 clientes por completo, e leitura qualitativa (texto
   real de conversa) alcançando ~340 (51%).

## Escopo

### 1. Categorias na linguagem do cliente
- Levantar, direto das mensagens reais (`message_text`/`caption`), como os clientes descrevem o
  que querem no primeiro contato — palavras/frases reais usadas, não a categoria interna.
- Agrupar esses termos reais em uma proposta de organização voltada pro cliente (ex.: pode ser
  por tipo de documento/objeto físico que ele tem em mãos, não pelo nome do produto no catálogo)
  — a proposta deve citar exemplos reais de como cliente descreveu cada grupo.
- Cruzar essa organização nova com o mapa mídia→categoria já feito na 255, pra confirmar que ela
  cobre os casos de maior volume sem obrigar o cliente a conhecer termo técnico da gráfica.

### 2. Escala: quantitativo em 100% da base real, qualitativo em ~51% (340)
- **Quantitativo** (contagens, taxas de conversão, crosstab mídia×categoria, tudo que é cálculo
  em SQL, não leitura de texto): refazer/confirmar cobrindo os **666 clientes reais por
  completo** — isso é barato de escalar, não precisa de amostra pra essa parte.
- **Qualitativo** (leitura de texto real de conversa, como a seção 1 e 4 da 255): expandir a
  amostra lida de verdade pra alcançar **~340 clientes (51% dos 666)**, com método de seleção
  sistemático e documentado (ex.: todos os clientes de determinados baldes de mídia/categoria,
  não escolha manual) — reportar exatamente quantos e como foram escolhidos, sem enviesar pra
  casos "bonitos".
- Onde a 255 já tinha achado real e citável, não precisa reler do zero — expandir a cobertura
  nos pontos que ainda eram amostra pequena (44 sessões da seção 1, 26 jornadas da seção 4).

### 3. Atualizar o documento de referência
- `pm/conhecimento/base-conhecimento-atendimento-completa.md` atualizado com os achados novos
  (categorias em linguagem de cliente) e a cobertura em escala — deixar claro no próprio
  documento quantos clientes/sessões cada achado cobre agora (não deixar implícito).

Explicitamente fora de escopo: reescrever o blueprint de conversa em si — isso continua sendo a
próxima demanda, depois desta.

## Critérios de aceite
- [ ] Proposta de categorias/opções na linguagem real do cliente, com exemplos reais citados,
      cruzada com o mapa mídia→categoria da 255
- [ ] Análise quantitativa (contagens/crosstabs) cobrindo os 666 clientes reais por completo
- [ ] Análise qualitativa (leitura de texto) alcançando ~340 clientes (51%), com método de
      seleção sistemático documentado
- [ ] Documento de referência atualizado, com cobertura declarada explicitamente por achado

## Riscos e cuidados
Escala grande — se o volume de trabalho não couber numa passada só, dividir e reportar progresso
real (quantos já cobertos, quantos faltam), nunca declarar "completo" sem bater o número.

## Referências
Demanda 255 (base já construída, ponto de partida). `jsgrafica_contatos` (2.551 total, ruído
incluso). `jsgrafica_pedidos` (666 clientes reais, telefone com pedido de verdade — número
confirmado pelo PM em 2026-07-30).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. Confirmada a população de 666 clientes reais via SQL (filtro: telefone com pedido real,
     excluindo `balcao`/`balcao-%` e 5 telefones de contaminação/teste conhecidos). Durante a
     reconciliação, achados 2 novos `@lid` de contaminação total (`11308716003574@lid`,
     `169501605793973@lid` — este último é a própria fonte do broadcast "Dizu Refeições"),
     confirmados individualmente antes de excluir (não presumido).
  2. Selecionados 340 (51% dos 666) por método sistemático documentado: telefones ordenados,
     stride = 666/340, `idx = floor(i*stride)+1` — lista completa e método preservados em
     `pm/conhecimento/evidencia-256/selecao_340_metodo_stride.txt`.
  3. Análise quantitativa (contagens/crosstabs) rodada sobre 100% da base real, histórico
     completo (não amostra de mês). Entre a aprovação da demanda e a execução da análise, a
     população real cresceu organicamente de 666 para 668 (sistema em produção ao vivo) —
     decisão explícita de seguir com os 668 atuais e documentar a diferença, em vez de perseguir
     reprodução artificial do número exato de manhã. Resultado completo em
     `pm/conhecimento/evidencia-256/quantitativo_668_completo.md`.
  4. Análise qualitativa (leitura de texto real) executada nos 340 selecionados, via 12 lotes de
     28-29 telefones cada, despachados como agentes em background paralelos. **O processo caiu no
     meio da execução** (perda de sessão) — retomado com sucesso a partir do progresso salvo em
     disco: 4 lotes já estavam prontos, 2 tinham dados brutos parciais reaproveitados, 6 refeitos
     do zero. Cobertura final: **340/340 telefones cobertos, nenhum pulado**. Resultado completo
     nos 12 arquivos `pm/conhecimento/evidencia-256/lote_00_resultado.md` a `lote_11_resultado.md`.
  5. Consolidada proposta de categorias/opções na linguagem real do cliente (9 grupos: A-imprimir
     documento pronto, B-montar currículo, C-xerox/cópia ambíguo, D-foto por tamanho, E-trâmite
     oficial assistido, F-personalizado festa/presente, G-plastificar, H-redigir documento,
     I-recarga; + Grupo 0, o "pedido mudo" sem nenhuma palavra), cruzada explicitamente com o
     mapa mídia→categoria da demanda 255. Cada grupo cita exemplos reais e literais dos 340
     lidos, com telefone e lote de origem.
  6. `pm/conhecimento/base-conhecimento-atendimento-completa.md` atualizado com: nova seção 2
     (categorias na linguagem do cliente), seção 3 com a versão em escala real (668) do mapa
     mídia→categoria ao lado da versão de 1 mês (255, mantida), seção de "novo vs. recorrente"
     (nova, não existia na 255), seção 6 (risco/contaminação) expandida com os casos confirmados
     na leitura de 340, seção 5 com achado novo (categoria registrada nem sempre bate com a
     conversa real). Cobertura declarada explicitamente em cada seção (não implícita).

- Testes realizados e resultado:
  - SQL de confirmação de população rodado de forma independente 2 vezes (uma antes da queda do
    processo, outra depois, pelo próprio agente do quantitativo) — resultado consistente (668
    após a correção de exclusão), com diagnóstico completo de que a diferença 666→668 não é bug/
    duplicata/formatação (testado `TRIM`/`LOWER`, testado corte por dia, nenhum bate 666 — é
    mesmo crescimento intra-dia).
  - Cobertura dos 12 lotes conferida individualmente (contagem de telefones no CSV de origem vs.
    seções no resultado final) — todos batem 28/28 ou 29/29, exceto pequenas fronteiras
    documentadas dentro de cada arquivo (ex.: telefone com texto mínimo tipo "Oi"/emoji, contado
    como "texto" em alguns lotes e discutido explicitamente, não escondido).
  - Verificação cruzada: 2 lotes (03/08, e depois 05) foram lidos de forma independente por um
    segundo agente após a retomada, pra confirmar que o resultado já salvo batia com o CSV de
    origem — sem necessidade de refazer.

- Achados fora do escopo (relatados, não resolvidos por conta própria):
  - Contaminação cruzada "Dizu Refeições" é mais extensa do que documentado até aqui: achada
    prova textual direta (mensagem interna real) de que a equipe migrou atendimento de almoços
    pro número da JS Gráfica após bloqueio do WhatsApp da Dizu — e 10-13 dos 340 clientes reais
    lidos (não do ruído geral de contatos) têm contaminação direta confirmada. Isso não estava
    quantificado nesse nível de detalhe antes. Recomendo demanda própria pra decidir o que fazer
    (separar instância, filtro automático, ou aceitar como risco conhecido).
  - `servico_nome`/categoria registrado no pedido às vezes não reflete a conversa real (4+ casos
    confirmados: convite de aniversário registrado como "Entrada diversa", plantas de arquitetura
    registradas como "Impressão 2ª via conta", 2 casos de currículo registrados como "impressão"
    genérica). Não é bug crítico, mas qualquer mecanismo futuro que tente "adivinhar o produto
    pela categoria do pedido" vai errar nesses casos — sinalizado, não corrigido aqui (fora de
    escopo da demanda).
  - 1 caso de contaminação de tipo diferente (não Dizu): mensagem de golpe/phishing bancário
    ("fatura Americanas") capturada no log de um cliente real — não é falha da JS Gráfica, é
    golpe externo chegando no mesmo número, mas vale nota de que o log tem esse tipo de ruído
    também.

- Status final: **concluída**. Todos os 4 critérios de aceite batidos: (1) proposta de categorias
  na linguagem do cliente com exemplos reais, cruzada com o mapa da 255 — feita; (2) quantitativo
  cobrindo 100% dos clientes reais (668, crescimento orgânico documentado a partir dos 666
  confirmados na aprovação) — feito; (3) qualitativo alcançando 340/666 = 51%, método sistemático
  documentado e reproduzível — feito, 340/340 cobertos sem nenhum pulado; (4) documento de
  referência atualizado com cobertura declarada explicitamente por achado — feito. Nenhuma
  lacuna conhecida ficou sem marcação. Blueprint de conversa (`blueprint-conversas-exemplo-agente.md`)
  não foi tocado, conforme fora de escopo explícito desta demanda.
