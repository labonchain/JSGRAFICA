# 255 — Pesquisa profunda: mídia por tipo, catálogo completo, jornadas reais (base pro blueprint)

Status: aprovada
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Depois de 6 rodadas de correção do blueprint (244-254), o Edvam identificou a causa raiz de por
que as propostas continuam soando inventadas: **o chat 06 nunca fez a pesquisa de base completa**.
A demanda 234 tratou "mídia sem legenda" como um bloco homogêneo (documento vs. ambíguo), sem
diferenciar **foto de documento/PDF**, sem mapear que produtos/categorias realmente se originam
de cada tipo de mídia, e sem cobrir o catálogo inteiro (só os produtos que apareceram por acaso
na amostra de 100 clientes). Isso faz o blueprint propor mecanismo sem chão — como a lista de
categorias que veio do desenho técnico da 206, nunca validada contra dado real (achado da 254).

Citação direta do Edvam: *"uma pessoa manda uma foto o que a equipe faz? ele fez isso pra arquivos
sem msg mas não fez isso pro resto... esse chat precisa aprofundar totalmente em tudo relacionado
a histórico de conversas, produtos, categorias, preços, jornadas de atendimento."*

Esta demanda **não é sobre escrever conversa exemplo** — é sobre construir a base de conhecimento
que falta antes de qualquer nova tentativa de redação. Só depois dela fechar é que faz sentido
mexer no blueprint de novo.

## Objetivo
Uma base de conhecimento real e completa, cruzando: tipo de mídia → o que a equipe realmente faz
→ que produto/categoria resulta → jornada completa até o fim, cobrindo o catálogo inteiro (não
uma amostra ilustrativa).

## Escopo

### 1. Comportamento real POR TIPO DE MÍDIA (não só "documento sem legenda")
- `jsgrafica_log_msgs_privadas` tem os campos `media_type`/`mime_type` reais da Z-API — usar isso
  pra separar de verdade: foto/imagem, documento/PDF, áudio, vídeo (se houver), texto puro.
- Pra cada tipo, com amostra real (não anedótica): o que a equipe pergunta/responde primeiro? A
  resposta muda por tipo de mídia, ou é igual? (ex.: foto pode virar "impressão de foto" direto
  mais vezes que PDF, que tende a virar "documento pra imprimir" — checar se isso é verdade ou
  hipótese).
- Documentar quantos casos reais existem de cada tipo (não presumir volume, contar).

### 2. Mapeamento real: mídia → produto/categoria resultante
- Cruzar a mídia da primeira mensagem de cada sessão com o `servico_nome`/categoria do pedido que
  resultou dela (quando resultou) — construir uma tabela real de "quando chega uma foto, vira X%
  Impressão papel foto, Y% outra coisa; quando chega PDF, vira Z% Impressão papel ofício...".
- Isso substitui qualquer lista de categorias "achando" que serve — a lista certa (se precisar de
  uma) sai direto dessa tabela de frequência real.

### 3. Catálogo completo (não amostra)
- Passar pelas 14 categorias reais e ativas de `jsgrafica_produtos` (confirmadas pelo PM: `1150`
  pedidos reais na janela, Impressão papel ofício = 68,7%, resto distribuído) — pra cada uma,
  confirmar: tem exemplo real de conversa na amostra já lida (234)? Se não tiver, buscar mais
  casos reais especificamente dessa categoria (expandir amostra pontualmente, não é preciso
  repetir as 100 do zero) ou marcar explicitamente "sem exemplo real ainda" — nunca inventar pra
  preencher a lacuna.
- Preço não é fixo (varia por produto/variação) — confirmar como a equipe comunica preço na
  prática (sempre fala o valor exato? pergunta detalhe antes de saber o preço? já sabe de cabeça
  os preços mais comuns?).

### 4. Jornadas completas por categoria de maior volume
- Pra pelo menos as 4-5 categorias de maior volume real, reconstruir a jornada completa (do
  primeiro contato até o pedido fechado) com exemplo real citável — não só 1-2 exemplos
  ilustrativos escolhidos a dedo, cobertura de fato proporcional ao volume real.

### 5. Consolidar como referência permanente
- Resultado vira um documento novo, `pm/conhecimento/base-conhecimento-atendimento-completa.md`
  (ou nome equivalente), que passa a ser a fonte obrigatória pra qualquer futura revisão do
  blueprint — nenhuma proposta de mecanismo (lista, pergunta, categoria) pode mais ser escrita
  sem citar essa base.

Explicitamente fora de escopo nesta demanda: reescrever o blueprint em si (244-254) — isso é
demanda separada, só depois desta fechar.

## Critérios de aceite
- [ ] Comportamento real documentado separadamente por tipo de mídia (foto ≠ documento ≠ áudio
      ≠ texto), com contagem real, não presumida
- [ ] Tabela real de mídia → categoria/produto resultante, com frequência real
- [ ] Todas as 14 categorias do catálogo revisadas — cada uma com exemplo real citado ou marcada
      explicitamente como "sem exemplo real disponível"
- [ ] Jornada completa reconstruída pra pelo menos as 4-5 categorias de maior volume
- [ ] Documento de referência novo criado, consolidando tudo, citável por demandas futuras

## Riscos e cuidados
Isso é pesquisa, não redação — não escrever nenhuma conversa exemplo nova aqui, só levantar a
base. Se o volume de trabalho for muito grande pra uma passada só, dividir em partes e reportar
progresso, mas não entregar parcial disfarçado de completo.

## Referências
Demanda 234 (pesquisa original, agora confirmada insuficiente em profundidade). Demanda 254
(achado que motivou esta demanda). `jsgrafica_log_msgs_privadas` (`media_type`/`mime_type`),
`jsgrafica_pedidos`, `jsgrafica_produtos` (catálogo real, 14 categorias).

## Relato de execução

Executada em 2026-07-30 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Documento novo criado:
`pm/conhecimento/base-conhecimento-atendimento-completa.md`, com os dados brutos preservados
permanentemente em `pm/conhecimento/evidencia-255/` (8 arquivos, não deixados só no scratchpad
temporário da sessão, que seria perdido). Pesquisa pura — nenhuma conversa exemplo nova foi
escrita, conforme escopo.

### O que foi feito
Dividido em 3 investigações paralelas via SQL direto (Supabase), todas reaproveitando a
metodologia já estabelecida (sessão = gap de 4h, `data_timestamp/1000.0`, exclusão de teste/
contaminação conhecida, janela 2026-07-01/07-30):

1. **Comportamento por tipo de mídia + mapa mídia→categoria**: contagem real de sessões por tipo
   (documento/PDF 372, imagem 217, áudio 18, sticker 10, contato 2, vídeo 1) com taxa de
   conversão real de cada uma (69,1% / 51,6% / 11,1% / 40% / 0% / 0%) — não presumida. Amostra
   qualitativa de 8-10 casos por tipo confirmou que o comportamento da equipe MUDA por tipo:
   documento recebe agradecimento curto (confirmação implícita), imagem recebe pergunta de
   triagem, áudio quase nunca recebe resposta. Crosstab completo mídia×categoria construído (357
   pedidos de documento, 164 de imagem, com % de cada categoria resultante).
2. **Cobertura completa do catálogo (14/14 categorias)**: nenhuma ficou sem exemplo real — todas
   têm conversa real citável, embora 2 (Recarga VEM, Recarga celular) tenham ficado com evidência
   fina (1 frase só). Achado novo e importante: como a equipe comunica preço correlaciona
   fortemente com o tipo de produto — serviço de tabela fixa, a equipe FALA o valor em texto;
   serviço sob orçamento, o padrão é mandar o Pix direto sem falar o número (6 dos 14 casos
   tiveram pergunta de valor sem resposta em texto).
3. **26 jornadas completas nas 5 categorias de maior volume** (cotas: 8 ofício + 5 xerox + 5
   consulta online + 4 foto + 4 escritório, todas batidas com dado real): confirmou que "jornada
   silenciosa" (1-3 mídias, zero texto) é padrão comum, não exceção; achou um novo caso real de
   confusão com a Dizu Refeições (Nathalia Soares, 558183106106) que é o MESMO caso já citado na
   demanda 204 seção 10.3 — confirma de forma independente que a equipe também erra, não só o
   cliente.

Consolidei os 3 resultados no documento de referência, com tabelas completas, citações reais e a
regra explícita de que qualquer proposta futura de mecanismo precisa citar esta base.

### Testes realizados e resultado
Sem execução de código — pesquisa 100% de leitura (SQL `SELECT` direto no Supabase). Conferi
manualmente uma amostra dos achados dos 3 agentes de pesquisa antes de consolidar (li o arquivo
completo `catalogo-14-categorias.md` e uma jornada de exemplo) pra confirmar que o texto citado
bate com o que estava nos arquivos brutos, não é resumo distorcido.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **Achado novo sobre comunicação de preço** (seção 3 do documento): não estava mapeado antes da
  255 — correlaciona fortemente com tipo de produto (tabela fixa fala o preço, sob encomenda manda
  só o Pix). Relevante pra qualquer futura revisão do blueprint, registrado como achado formal.
- **3 novos casos de contaminação de log identificados** durante a checagem de catálogo
  (Consulta Online e Impressão papel adesivo tiveram pedido puxado com conversa de outro negócio
  no mesmo telefone) — descartados da amostra final, mas o padrão reforça o achado já registrado
  em `project_log_dados_contaminados`.
- **Sticker/cartão de contato/vídeo têm volume baixo demais e parcialmente contaminado** — não
  usar essas 3 categorias de mídia pra desenhar comportamento de agente sem nova limpeza.

### Status final
Concluída. Os 5 critérios de aceite atendidos: comportamento por tipo de mídia documentado com
contagem real (não presumida); tabela real de mídia→categoria com frequência real; 14/14
categorias do catálogo revisadas, todas com exemplo real (nenhuma lacuna silenciada); 26 jornadas
completas reconstruídas nas 5 categorias de maior volume (cotas batidas); documento de referência
novo criado e citável, com dados brutos preservados permanentemente (não só no scratchpad
temporário). Reescrever o blueprint com essa base é demanda separada, como já definido no escopo.
