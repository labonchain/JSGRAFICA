# 338 - Busca de preço não cobre linguagem natural do cliente (risco de cotar produto errado em silêncio)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-28
Chat executor: 01 - N8N JS GRAFICA

Achado ao vivo pelo Edvam (screenshot real, 22:40-22:42): cliente mandou PDF, pediu "imprimir",
"preto e branco a4", quantidade "1" — a IA respondeu "não consegui encontrar o preço". Investigado
com evidência real: `Preco: Buscar Por Nome` (workflow `296`) faz um único `ilike` contra a frase
inteira que a IA passa. O catálogo nomeia produtos em linguagem formal ("IMPRESSÃO P&B A4"), nunca
usa "imprimir" (verbo) nem "pdf" (formato de arquivo não aparece em nome de produto nenhum).

**Risco mais grave que "não encontrado"**: `nome ilike '%preto e branco a4%'` bate em "XEROX PRETO
E BRANCO A4" (R$0,45), não em "IMPRESSÃO P&B A4" (R$1,20) — produtos e preços diferentes.
Dependendo de como a IA formula a busca, o sistema pode cotar o produto ERRADO silenciosamente,
sem erro nenhum aparecer pro cliente nem pra equipe.

Afeta o tipo de pedido de maior volume da gráfica (impressão, 1.021 pedidos confirmados em
agosto, achado da demanda 336) — não é caso raro.

## Objetivo
Corrigir a busca de preço pra cobrir a forma como cliente real fala, sem introduzir o risco de
casar produto errado silenciosamente.

**Direção principal, decidida pelo Edvam (não negociável)**: a etapa de "qual produto do catálogo
é esse que o cliente descreveu" precisa usar busca semântica/RAG (`jsgrafica_agent_rag` ou
mecanismo equivalente), em vez do `ilike` de texto literal atual. Isso NÃO enfraquece o princípio
de segurança do Caminho C ("a IA nunca inventa preço/valor") — o RAG entra só pra achar o
`produto_id` certo a partir da linguagem natural do cliente; o preço continua vindo sempre
recalculado em tempo real da tabela `jsgrafica_produtos`, nunca decidido pela IA. Fluxo correto:
cliente descreve em linguagem natural → busca semântica encontra o produto real mais próximo do
catálogo → ferramenta busca o preço real desse produto no banco → IA comunica esse preço, nunca
inventado.

Cuidado explícito de desenho: a busca semântica precisa ter um limiar de confiança — se nenhum
produto bater com confiança razoável, a ferramenta deve responder "não encontrado" (como já faz
hoje), nunca "casar" o produto mais parecido só porque é o menos ruim, pra não trocar o risco de
"não encontrado" pelo risco de "achou o produto errado com confiança baixa" (o mesmo problema do
`ilike` hoje, só que mascarado).

## Escopo
- Incluído: `Preco: Buscar Por Nome` e qualquer lógica de montagem do termo de busca que a IA usa
  antes de chamar essa ferramenta.
- Explicitamente fora de escopo: mudar nomes de produto no catálogo (isso é decisão de negócio,
  não desta demanda); qualquer outra ferramenta do Caminho C.

## Riscos e cuidados
Ferramenta usada em toda conversa do piloto — testar contra casos reais conhecidos (o caso do
Edvam de hoje, mais os nomes reais de produto de maior volume) antes de considerar concluída, sem
regressão nos casos que já funcionavam (ex. "xerox colorida A4" testado com sucesso na demanda
328). Backup do workflow 296 antes de qualquer mudança.

## Referências
Demandas 328, 336. `Preco: Buscar Por Nome` (workflow `296`, `aO6iktSzcYtVZ6B5`).

## Relato de execução

**O que foi feito**: `Preco: Buscar Por Nome` (ilike de texto literal) substituído por busca
semântica de verdade, conforme direção do Edvam.

- Coluna nova `jsgrafica_produtos.nome_embedding vector(768)` (pgvector já habilitado no projeto,
  usado antes só por `jsgrafica_agent_rag`, nunca populado). Embedding gerado com
  `gemini-embedding-001` (`outputDimensionality: 768`), mesma credencial n8n já usada pelo agente
  (`Google Gemini(PaLM) Api account`) - nenhuma credencial nova pra IA, só a nova pro app (ver
  achado urgente abaixo).
- Função nova `jsgrafica_buscar_produto_semantico(query_embedding, limiar)`: retorna o produto
  ativo mais próximo por similaridade de cosseno, só se a similaridade bater o limiar - devolve
  ZERO linhas se não bater, nunca "o mais parecido mesmo assim" (exigência explícita do Edvam).
  Limiar calibrado com dado real, não chutado: testei a frase real que falhou ("imprimir um pdf
  preto e branco a4") contra os 768 embeddings reais e uma frase claramente fora do catálogo
  ("financiamento de carro") pra achar onde a linha de corte precisa ficar - o match certo veio
  com 0.868/0.934 de similaridade nos 2 casos reais testados, um caso ambíguo mas plausível
  ("empréstimo" pra "financiamento") veio em 0.670 - fechei o limiar em 0.75 (entre os dois),
  favorecendo "não encontrado" sobre "achei com pouca confiança", exatamente o cuidado que o
  Edvam pediu.
- Todos os 112 produtos ativos embarcados numa rodada só (workflow temporário, removido no final).
- 2 nodes novos em produção: `Preco: Embedar Busca` (chama a API de embedding) → `Preco: Buscar
  Por Semantica` (chama a função nova via PostgREST) → alimenta `Preco: Normalizar Produto` sem
  nenhuma mudança nele (já lia genericamente "primeiro item com `.id`", funciona igual pra
  resultado de ID exato, ilike antigo ou semântica nova). `Preco: Buscar Por Nome` (ilike antigo)
  deixado no workflow, só desconectado - reversão é reconectar 1 fio, mesma disciplina de sempre.

**Achado urgente à parte, resolvido na mesma demanda (bloqueava até o teste real)**: testando o
fluxo ponta a ponta, achei que `Preco: Calcular Valor Real`, `Pix: Gerar Cobranca Real` e
`Cancelar: Cancelar Via API` (as 3 chamadas do workflow 296 pra API real do app) ainda usavam a
credencial do `X-App-Secret` antigo - que a demanda 329 (mesmo dia, 03-APP) removeu de propósito
da Vercel ao trocar pro mecanismo de sessão real. Confirmado com log de execução real: 401 "Não
autorizado" em toda chamada, desde que a 329 foi pro ar - ou seja, o piloto inteiro estava incapaz
de cotar preço, criar pedido, gerar Pix ou cancelar desde mais cedo hoje, achado que não tinha
relação nenhuma com esta demanda. Reportado com urgência pro PM antes de tocar em qualquer coisa
(cruza com o domínio do 03-APP, e eu não tinha o valor do segredo novo). O Edvam autorizou e
passou o valor de `INTERNAL_SERVICE_SECRET` direto; criada credencial n8n nova
(`JS Gráfica - X-Internal-Secret`, nunca em texto puro em node nenhum) e trocada nos 3 nodes.

**Testes realizados e resultado**:
- Chamada direta da ferramenta `consultar_preco_produto` (bypassando o agente, mesmo webhook que
  a IA usa): "imprimir pdf preto e branco a4" → `encontrado:true, produto_id:"prod-009",
  produto_nome:"IMPRESSÃO P&B A4", valor_final:1.2` (era `encontrado:false` antes do fix).
- Regressão: "xerox colorida A4" (mesmo texto validado na demanda 328) → continua achando
  `prod-035 "XEROX COLORIDA A4"`, valor R$6,00 (5 un.) - sem regressão.
- Controle negativo: "conserto de celular quebrado" (fora do catálogo de propósito) →
  `encontrado:false` - confirma que o limiar não força match de baixa confiança.
- **Conversa real completa via webhook de produção** (telefone interno de sempre, nunca fake),
  reproduzindo o caso do Edvam: "quero imprimir um pdf" → "preto e branco a4" → esclarecimento de
  página/cópia (a IA pediu, corretamente, já que não tinha PDF real anexado no meu teste) → "1
  pagina, 1 copia" → resposta real da IA: **"IMPRESSÃO P&B A4, R$ 1,20. Posso gerar seu pedido?"**
  - confirma o fluxo inteiro funcionando de ponta a ponta, não só a ferramenta isolada.

**Status final**: concluída. `206` (91 nodes, ativo) e `jsgrafica_contatos` (nome real "Ninho"
intacto) conferidos. 9 nodes de teste (`TESTE 338 *`) removidos do workflow 296 no final, diff
confirmado (102 nodes finais = 100 originais + 2 novos de produção). Nenhum pedido de teste ficou
criado (a conversa parou antes da confirmação "sim"). Log de mensagens de teste apagado. Backup
do workflow 296 salvo antes da troca de credencial
(`pm/backups/296-caminho-c-ferramentas_pre-demanda338-secretfix_2026-08-28.json`).
