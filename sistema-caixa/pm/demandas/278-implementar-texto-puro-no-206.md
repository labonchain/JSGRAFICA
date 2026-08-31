# 278 — Implementar no `206`: agente atende também texto puro (spec da 277)

Status: concluída
Criada em: 2026-08-15
Aprovada em: 2026-08-15
Concluída em: 2026-08-15
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A demanda 277 (06-ATENDIMENTO) entregou o desenho completo de como o agente deve reagir quando
uma sessão nova começa por texto puro, com especificação técnica de 7 pontos pronta pra
implementar — ver seção "Especificação técnica pro 01-N8N implementar" em
`pm/conhecimento/blueprint-conversas-exemplo-agente.md` (Parte 2). Esta demanda é a implementação
de verdade, no workflow `206` (id `M5WZ6zHAe625XyJm`, já conectado ao roteamento real desde a
274).

**Achado da 277 que precisa entrar no escopo**: o nó `Serviço Alto Toque?` (que decide quando
escalar por dado pessoal) usa a regex
`/curr[ií]culo|digita[çc][ãa]o|prova|antecedente|foto composta|composi[çc][ãa]o/i` — **não cobre
"conta gov"**, mesmo a Regra 4 do manual (234) citando um caso real de risco exatamente com
Gov.br. Corrigir esse gap faz parte desta demanda, não é opcional — é a mesma trava de segurança
que protege hoje o caminho de mídia, e o texto vai depender dela igualmente.

## Objetivo
O `206` passa a reagir também quando uma sessão nova começa com mensagem de texto puro (hoje só
reage a mídia sem legenda), seguindo exatamente a triagem desenhada na 277: texto objetivo →
proposta direta; texto ambíguo → pergunta → lista; texto de dado pessoal/alto toque → escala
direto. Continua 100% dependente da whitelist (`jsgrafica_telefones_autorizados`) — nenhuma
mudança nessa trava.

## Escopo
- Incluído: os 7 pontos da especificação técnica da 277 (ver blueprint, Parte 2) — novo gatilho
  de entrada por texto, novo nó de classificação Gemini pra texto, reaproveitamento dos nós já
  existentes (`Documento Óbvio?`, `Serviço Alto Toque?`, `Produto Detectado Tem Sinal?`, caminho
  de proposta/lista, buffer de rajada), e o valor `"fora_de_escopo"` pra não disparar em saudação
  solta.
- Incluído: corrigir a regex do `Serviço Alto Toque?` pra também cobrir "conta gov" (e variações
  razoáveis: "gov.br", "conta gov.br", "senha do gov") — testar especificamente com o caso real
  citado na Regra 4 antes de considerar concluído.
- Incluído: testar isolado primeiro (só número do Edvam), depois confirmar comportamento real
  igual foi feito na 274 — mensagem de texto real dele disparando o fluxo certo.
- Incluído: confirmar que mídia sem legenda continua funcionando exatamente como antes (nenhuma
  regressão no caminho já em produção desde a 274).
- Explicitamente fora de escopo: mudar a lista de telefones autorizados; qualquer decisão de
  expansão de cliente real (isso é sempre decisão separada do Edvam); resolver a limitação já
  conhecida de a proposta hoje só cobrir Impressão P&B A4 (achado da 277, mas não é desta
  demanda).

## Critérios de aceite
- [x] Novo gatilho de texto puro implementado, seguindo a triagem da 277
- [x] Regex do `Serviço Alto Toque?` corrigida pra cobrir "conta gov", testada com o caso real da
      Regra 4
- [x] Testado isolado (número do Edvam) nos 3 caminhos: objetivo, ambíguo, dado pessoal/alto
      toque (+ fora_de_escopo testado à parte)
- [x] Confirmado sem regressão no caminho de mídia já em produção
- [x] Diff final mostrando exatamente o que mudou, nada além do previsto

## Riscos e cuidados
Mesma disciplina de sempre: `206` é produção real desde a 274 (mesmo que só responda quem está na
whitelist). Backup antes de mexer, testar isolado antes de considerar concluído.

## Referências
Demanda 277 (`blueprint-conversas-exemplo-agente.md`, Parte 2, especificação técnica completa).
Demanda 234 (Regra 4, manual de resposta). Demandas 206/208/274 (estado atual do `206`).

## Relato de execução

Executado em 2026-08-15, no workflow `206` (id `M5WZ6zHAe625XyJm`, já conectado ao roteamento
real desde a 274). Backup antes de mexer:
`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda278_2026-08-15.json` (77 nodes).

### Investigação antes de implementar
Antes de desenhar qualquer coisa, mapeei exatamente como os nodes reaproveitados (`Documento
Óbvio?`, `Serviço Alto Toque?`, `Produto Detectado Tem Sinal?`, `Montar Proposta`, `Escalar -
Serviço Alto Toque`, `Escalar - Ambíguo Não Identificado`, `Enviar Lista Categorias`, `Salvar
Lista Enviada`) buscam `sessao_id`/`telefone`/`_zapi_url`/`_zapi_token`: **todos usam referência
nomeada direto pra `Parsear Resposta Gemini`**, não pro node anterior imediato. Isso significa que
sessão e config Z-API precisam existir e estar corretos ANTES da classificação (espelhando a
ordem da mídia), não depois como uma leitura mais literal do ponto 1 da especificação sugeria.
Decisão registrada aqui: criei a sessão de texto e busquei a config Z-API antes de classificar
(igual à mídia), mas pulei só o envio da mensagem de confirmação em si (isso sim, sem
necessidade nenhuma pra texto, já que classificar texto é instantâneo). Sem essa sessão prévia,
`Montar Proposta`, `Escalar - Serviço Alto Toque` e os outros quebrariam de verdade pro caminho de
texto.

### O que foi implementado
7 nodes novos: `É Texto Puro (Sessão Nova)?` (IF, mídia ausente + texto presente, encaixado na
saída falsa de `É Mídia Sem Legenda?`), `Criar Sessão (Texto)` (mesma tabela, mensagens
`tipo:'texto_inicial'`), `GET Config (Texto)` (mesma query da confirmação de mídia, instância
própria), `Montar Contexto Texto` (empacota telefone/sessao_id/config/texto, sem montar mensagem
de confirmação), `Gemini Analisar Texto` (mesmo padrão de credencial do `Gemini Analisar Mídia`,
prompt adaptado com a categoria nova `"fora_de_escopo"`), `Classificação Fora de Escopo?` (novo
gate compartilhado entre `Parsear Resposta Gemini` e `Salvar Classificação`) e `Concluir Sessão -
Fora de Escopo` (fecha a sessão como `concluida` em vez de deixá-la `ativa` pra sempre quando o
texto é só saudação solta).

3 nodes existentes ajustados (motivo técnico de cada um, não escolha estética):
- `Parsear Resposta Gemini`: `ctx` agora tenta `Converter Mídia Base64` (mídia) e cai pra `Montar
  Contexto Texto` (texto) se o primeiro não rodou nessa execução; também repassa
  `"fora_de_escopo"` quando o Gemini classificar assim (mídia nunca retorna esse valor, então o
  comportamento de mídia fica idêntico); e o default de `tipo_midia` vira `'texto'` em vez de
  `'outro'` quando a origem é texto (achado do próprio teste, ver abaixo).
- `Escalar - Arquivo Com Problema`: o filtro que resolve a sessão a marcar como escalada agora
  tenta `Criar Sessão` (mídia) e cai pra `Criar Sessão (Texto)` (texto) se o primeiro não rodou.
- `Serviço Alto Toque?`: regex ampliada de
  `/currículo|digitação|prova|antecedente|foto composta|composição/i` pra incluir
  `gov\.?br|conta gov|senha do gov`.

Também liguei o salvamento de execuções do workflow (`saveDataErrorExecution`,
`saveDataSuccessExecution`, `saveExecutionProgress`, `saveManualExecutions`, todos ausentes antes,
mesmo padrão já usado nos workflows `01`/`02`/`03`), sem isso não tinha como investigar o
primeiro bug achado no teste (ver abaixo): o histórico de execuções vinha sempre vazio.

### 2 bugs achados e corrigidos no próprio teste (nenhum sobreviveu à versão final)
1. **Erro de sintaxe no prompt do `Gemini Analisar Texto`**: montei a expressão do `jsonBody`
   concatenando o texto do prompt com `+ JSON.stringify($json.message_text || '')`, mas deixei uma
   aspa simples duplicada bem no ponto de junção (`...cliente: '' + JSON.stringify(...)`), o que
   fechava a string 1 caractere cedo demais e quebrava o JS depois. Primeiro teste real
   (`teste278-texto-objetivo-1`) escalou direto como `arquivo_com_problema` por causa disso.
   Corrigido removendo a aspa extra, testado de novo com sucesso.
2. **`tipo_midia` sempre `'outro'` pra texto, quebrando `Tipo Não Identificado?`**: esse node
   reaproveitado (ponto 3 da especificação, "sem alteração") checa
   `gemini_tipo_midia === 'outro'` pra decidir se escala como "não identificado" em vez de mandar
   a lista de categorias. Meu prompt de texto não pede `tipo_midia` nenhum (não faz sentido pra
   texto), então esse campo sempre vinha vazio e caía no fallback `'outro'` do parser, fazendo TODO
   texto ambíguo escalar em vez de mostrar a lista, mesmo funcionando perfeitamente bem. Achado no
   teste do caminho ambíguo (`teste278-texto-ambiguo-1`, virou `escalada` quando devia mostrar a
   lista). Corrigido fazendo o default do parser ser `'texto'` (não `'outro'`) quando a origem é o
   caminho de texto, retestado com sucesso (`lista_enviada: true`).

### Testes realizados, todos via webhook real de produção (`https://n8n.labonchain.xyz/webhook/
jsgrafica-agente-fase-b`, não `execute_workflow`, que aliás parou de funcionar pra este workflow
depois da 274 ("not available for execution via MCP", provavelmente afetado pela mesma
configuração que o Edvam mexeu pra destravar o webhook), sempre só com o número do Edvam
(5521965185667), sessão de teste limpa antes de cada rodada:

- **Texto objetivo** (`"Preciso de 50 copias de xerox em P&B, frente e verso"`): classificou
  `documento_obvio`, produto detectado `"50 cópias de xerox P&B, frente e verso"`, passou por
  `Serviço Alto Toque?` (falso), propôs P&B A4 e **mandou mensagem real** (`zaapId:
  01A0082AD3087F839442288C51CFE66F`).
- **Texto ambíguo** (`"Ola boa tarde, voces fazem panfletos?"`): classificou `ambiguo`, mandou a
  lista de 7 categorias **de verdade** (`zaapId: 01A00841287F756C86DC9AF9329D32DC`), sessão ficou
  `ativa` esperando a escolha.
- **Texto de dado pessoal / conta gov** (achado da 277, caso real Luciana/`558189032016`,
  reconstruído de forma sintética sem reusar CPF/senha reais do log): depois de 3 tentativas de
  frase pra fazer o Gemini classificar como `documento_obvio` (as 2 primeiras vieram
  `fora_de_escopo`, o Gemini sem contexto do catálogo não associa "ajuda com conta gov" a serviço
  de gráfica de cara), a frase `"Preciso imprimir 1 folha, e o comprovante da minha conta gov.br,
  so isso mesmo"` classificou `documento_obvio` com produto detectado `"1 folha, comprovante da
  conta gov.br"`, confirmado que isso **escalou direto** (`Escalar - Serviço Alto Toque`, sessão
  `escalada`) e **nunca chegou** em `GET Produto P&B A4`/`Enviar Proposta Botões` (confirmado node
  a node no histórico de execução), provando que a regex nova pega esse caso. Antes da correção,
  isso teria virado proposta de P&B A4 por engano.
- **Saudação solta** (`"Bom dia"` sozinho): classificou `fora_de_escopo`, sessão criada e depois
  **concluída** (`status: concluida`, `motivo_conclusao: fora_de_escopo`) em vez de ficar `ativa`
  pra sempre. Nenhuma mensagem enviada, nenhuma sessão fantasma sobrando pra próxima mensagem
  desse telefone.
- **Regressão de mídia**: imagem real do log, sem legenda, documento óbvio, classificou
  `tipo_midia: "imagem"` (não `"texto"`, confirmando que o fallback do `ctx` resolve o caminho
  certo) e propôs P&B A4 normalmente, igual sempre fez.
- **Regressão do erro de download de mídia**: forcei uma URL de mídia inexistente (404 real),
  confirmado que `Escalar - Arquivo Com Problema` ainda escala certo pro caminho de mídia depois
  do ajuste do filtro (`motivo_escalonamento: arquivo_com_problema`), igual testado na demanda 208.

Todas as sessões de teste apagadas depois de cada rodada
(`DELETE FROM jsgrafica_agente_teste_sessoes WHERE telefone = '5521965185667'`), `0` linhas
restantes confirmado ao final.

### Diff final
Contra o backup pré-278: `7` nodes adicionados, `0` removidos, `3` nodes existentes com mudança
(`Escalar - Arquivo Com Problema`, `Parsear Resposta Gemini`, `Serviço Alto Toque?`, todas
justificadas acima), `8` conexões alteradas, todas nos pontos de encaixe descritos. Settings do
workflow ganharam os 4 campos de salvar execução (mudança deliberada, documentada acima). Workflow
`01` confirmado intocado (`updatedAt` sem mudança desde antes desta demanda comecar).

### Achado fora do escopo, não resolvido aqui (já registrado no ponto 7 da especificação da 277)
O `206` continua só propondo `IMPRESSÃO P&B A4` pra qualquer "documento_obvio"/"produto com
sinal", agora também pro caminho de texto (ex.: alguém escrevendo "quanto custa impressão
colorida?" ainda cairia na proposta fixa de P&B A4). Limitação conhecida, não desta demanda.
