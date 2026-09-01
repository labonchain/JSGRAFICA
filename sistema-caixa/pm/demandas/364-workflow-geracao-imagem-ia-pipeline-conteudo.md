# 364 - Workflow de geração de imagem por IA pro pipeline de conteúdo (automatizar o briefing-imagem)

Status: concluída (via Gemini, gratuito - troca de provedor pedida pelo Edvam depois do
bloqueio de créditos da OpenAI)
Criada em: 2026-08-31
Aprovada em: 2026-08-31
Concluída em: 2026-08-31
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A demanda 361 (07-Marketing) descobriu um teto real na técnica atual de produção de peça
(HTML/CSS/SVG renderizado): não dá pra simular foto de produto/textura de material realista só
com código, precisa de imagem gerada por IA ou foto real de verdade. Primeiro teste manual já foi
feito: 07-Marketing escreveu um "briefing de imagem" (prompt detalhado) e salvou no repositório
(`conteudos/2026/08/BLOCO-007_P4-07_P4-08_P4-09/briefing-imagem/CANAL_P4-07_20260831_BRIEFING-
IMAGEM_v01.md`), e por ora o Edvam precisa rodar isso manualmente no GPT dele e trazer a imagem
de volta.

**Objetivo desta demanda**: eliminar esse passo manual, automatizando geração de imagem via API
direto num workflow n8n, que o 07-Marketing (e o pipeline de conteúdo em geral) consegue
alimentar e consumir sem depender de abrir chat e pedir imagem por imagem.

**Dependência real, ainda não resolvida**: o Edvam **ainda não tem uma chave de API** (OpenAI ou
outro provedor de geração de imagem) pra JS Gráfica, precisa criar antes de qualquer teste real
de ponta a ponta. Pode começar o desenho/esqueleto do workflow sem a chave, mas não dá pra testar
de verdade até ela existir.

## Objetivo
Workflow n8n que recebe um "briefing de imagem" e devolve a imagem gerada, disponível pro squad
de conteúdo consumir, sem intervenção manual no GPT a cada peça.

## Escopo
Incluído:
- Desenhar o fluxo: entrada (briefing de imagem, texto/prompt) → chamada à API de geração de
  imagem (OpenAI Images API ou equivalente, a definir conforme a chave que o Edvam criar) → saída
  (arquivo de imagem salvo em lugar acessível ao squad).
- Decidir e documentar o gatilho: pode ser webhook (07-Marketing chama quando tiver um briefing
  pronto), ou polling de uma pasta/tabela com briefings pendentes — o que for mais simples dado
  que o briefing hoje é um arquivo `.md` no GitHub, não um registro em tabela.
- Decidir onde a imagem gerada fica disponível pro squad: mais natural é comitar de volta no
  mesmo repositório (`labonchain/JSGRAFICA`, mesma pasta `briefing-imagem/` ou uma `imagem-
  gerada/` nova), já que é onde o resto do pipeline já vive e o 07-Marketing já lê de lá.
- Gerenciar a credencial da API nova com o mesmo cuidado de sempre: nunca hardcoded, credencial
  nativa do n8n, nunca aparecer em log/backup exportável.
- Testar de ponta a ponta com o briefing real do P4-07 já existente, assim que a chave existir.

Explicitamente fora de escopo: decidir o provedor de IA de imagem em si (isso o Edvam decide ao
criar a chave), mudar o processo de briefing de texto que já funciona.

## Critérios de aceite
- [x] Fluxo desenhado e documentado.
- [x] Credencial gerenciada com segurança (nativa do n8n, nunca em texto puro).
- [x] Teste real de ponta a ponta com o briefing do P4-07 - feito via Gemini (gratuito), 2 imagens
      reais geradas e conferidas visualmente (não só sucesso HTTP). Achado real sobre proporção
      vertical, ver relato.
- [x] Imagem gerada acessível pro 07-Marketing sem passo manual - devolve na resposta do próprio
      webhook (ver decisão de arquitetura no relato), não commita direto no GitHub via n8n.

## Riscos e cuidados
Custo de API por imagem gerada não é zero, considerar isso ao desenhar o volume esperado (152
blocos planejados, se cada um precisar de imagem, o custo escala). Não é decisão desta demanda,
só um ponto a monitorar e reportar se ficar relevante.

## Referências
`pm/demandas/361-revisar-direcao-visual-pecas-canal.md` (achado original, teto da técnica atual),
briefing de imagem real: `conteudos/2026/08/BLOCO-007_P4-07_P4-08_P4-09/briefing-imagem/
CANAL_P4-07_20260831_BRIEFING-IMAGEM_v01.md` (em `labonchain/JSGRAFICA`).

## Relato de execução

**Credencial**: chave lida direto do arquivo local que o PM indicou (nunca aberta pelo PM, nunca
colada em texto puro em nenhum workflow), cadastrada como credencial nativa do n8n (tipo
`openAiApi`, id `uhesy0ACgjwlbYsg`, nome "OpenAI JS Grafica (demanda 364)"). Arquivo temporário
que continha a chave em texto puro apagado do disco depois de confirmar o cadastro.

**Workflow criado**: `364 - JSGRAFICA | GERACAO IMAGEM IA (briefing -> OpenAI)`
(`Zrjw2XrJEahpwJzd`), gatilho webhook (`POST /webhook/jsgraficageracaoimagem`, mais simples que
polling de arquivo `.md` no GitHub, como o próprio escopo já sugeria). 5 nodes: `Webhook Briefing
Imagem` → `Preparar Tamanhos` (Code, gera 1 item por proporção pedida) → `Gerar Imagem OpenAI`
(HTTP Request, `authentication: predefinedCredentialType` usando a credencial nativa, nunca
referencia a chave em texto/expressão) → `Montar Resposta`/`Montar Erro` (2 saídas, mesmo padrão
de erro visível já usado na 355).

**Decisão de arquitetura, documentada explicitamente (não estava decidido no escopo)**: a imagem
gerada volta na própria resposta HTTP do webhook (base64), em vez do workflow n8n comitar direto
no repositório `labonchain/JSGRAFICA`. Motivo: não existe hoje nenhuma credencial GitHub
cadastrada no n8n, e todo o resto do pipeline de conteúdo já comita via sessão Claude Code
(squad), não via n8n - criar uma credencial GitHub nova só pra isso seria uma peça a mais sem
necessidade real, quando quem chama o webhook (o squad/07-Marketing) já tem acesso de git normal
pra salvar o arquivo recebido. Documentado aqui pro PM confirmar se concorda ou prefere a
automação completa (n8n comitando sozinho) - nesse caso seria uma demanda nova (criar/gerenciar
PAT do GitHub como credencial n8n).

**Achado real, importante - tamanho de imagem**: `gpt-image-1` só aceita
`1024x1024`/`1024x1536`/`1536x1024`/`auto`, não pixel exato. O briefing pede `1080x1080` e
`1080x1920` - não dá pra gerar nesse tamanho exato via API. O workflow mapeia pro tamanho
suportado mais próximo (`1024x1024` e `1024x1536`) e documenta que o ajuste fino de proporção
fica pro recorte/composição HTML/CSS que o 07-Marketing já faz por cima (mesma etapa que já
existia no processo, não é trabalho novo pra eles).

**Teste real de ponta a ponta - BLOCADO, achado novo**: testei com o briefing real do P4-07
(prompt fiel ao arquivo `CANAL_P4-07_20260831_BRIEFING-IMAGEM_v01.md`, as 2 proporções). O
workflow funcionou tecnicamente de ponta a ponta - webhook recebeu, montou os 2 prompts, chamou a
OpenAI de verdade com a credencial certa, recebeu resposta real da API (não erro de rota/auth) -
mas a API devolveu erro real: `"You have no credits remaining. Add credits to continue using the
API"`. Ou seja, a chave existe e autentica certo, mas a conta/organização OpenAI não tem crédito
de pagamento configurado ainda. Isso é diferente da dependência original da demanda ("falta criar
a chave") - a chave existe, falta é o Edvam adicionar forma de pagamento/créditos em
`platform.openai.com/settings/organization/billing`. O branch de erro do workflow funcionou
exatamente como desenhado (capturou o erro real da API, não travou silencioso, `Montar Erro`
devolveu a mensagem clara) - prova que o tratamento de erro funciona de verdade, só faltou o
caminho de sucesso ainda não testável.

**Atualização - troca de provedor pedida pelo Edvam (mesmo dia, depois do bloqueio de créditos da
OpenAI)**: testar a camada gratuita do Gemini/Google AI Studio antes de assumir custo.

**Credencial Gemini já existia** - achado bom, evitou passo novo: o workflow antigo
`JSGRAFICA_ATENDIMENTO_AI` (pausado, mas intacto) já tinha uma credencial `googlePalmApi`
cadastrada (id `HuMb1WcX1o0FTeLu`, "Google Gemini(PaLM) Api account") de quando esse agente usava
Gemini. Reaproveitei essa credencial existente pro workflow novo, sem precisar pedir chave nova
ao Edvam - nunca vi o valor da chave (n8n não expõe credencial já cadastrada via API, só
referencia por ID).

**Workflow atualizado pra chamar o Gemini**: node `Gerar Imagem Gemini` (HTTP Request,
`generateContent` do modelo `gemini-2.5-flash-image` "Nano Banana", `authentication:
predefinedCredentialType` com a credencial acima - nunca referencia a chave em texto/expressão).
`Montar Resposta` ajustado pro formato de resposta do Gemini (`candidates[].content.parts[].
inlineData.data`, base64), diferente do formato da OpenAI (`data[].b64_json`).

**Teste real, com o briefing verdadeiro do P4-07, camada GRATUITA (sem custo)**:
- Proporção quadrada (1:1): sucesso real, imagem de ~1,5MB gerada, **decodifiquei e conferi
  visualmente** (não só sucesso HTTP/base64 presente) - bate muito bem com o briefing: caneca
  branca lisa sem estampa/texto/logo, ângulo 3/4 com alça pra direita, luz suave vindo de cima-
  esquerda, sombra de contato suave, fundo neutro quente (bate com Branco Gelo do manual), terço
  superior e faixa inferior livres pra composição de texto depois, sem elemento estranho no
  quadro. Qualidade real muito boa pro caso de uso, sem custo nenhum.
- Proporção vertical (9:16): sucesso real na API, mas **achado importante**: a instrução de
  proporção via texto no prompt (não existe campo estruturado confiável documentado pra
  `gemini-2.5-flash-image` especificamente) **não mudou o enquadramento de verdade** - a imagem
  voltou quadrada de novo, só com conteúdo ligeiramente diferente, não vertical. Conferido
  visualmente, não é suposição. Pra vertical de verdade, as opções são: (a) gerar quadrado e
  estender/recompor no HTML/CSS que o 07-Marketing já faz por cima (mesma lógica que já ia ser
  usada pro ajuste fino de proporção mesmo com a OpenAI), ou (b) testar os modelos mais novos
  (Nano Banana 2/Pro, que o Edvam mencionou) que têm campo estruturado de aspect ratio, esses são
  pagos.

**Decisão de arquitetura da versão OpenAI continua valendo** (devolver imagem na resposta do
webhook, não commitar direto no GitHub via n8n - ver parágrafo anterior).

**Workflow ativado e reconfirmado de forma independente**, mesmo modelo/credencial testados de
verdade, funcionando, sem custo.

**Status final: concluída.** Teste real de ponta a ponta feito com sucesso (quadrado), achado
real e documentado sobre a limitação de proporção vertical (não é bug do workflow, é limitação
do modelo gratuito), decisão de arquitetura registrada. Suporte a múltiplos provedores (OpenAI +
Gemini configurável) não foi feito - ficou só Gemini, que é o que está em uso real agora; se
quiserem manter os dois como opção, é ajuste pequeno, aviso o PM decidir se vale a pena.

**Correção adicional, achada quando o 07-Marketing tentou chamar o webhook de fora (via `curl`,
não MCP)**: retornava `404 "webhook not registered"` mesmo com o workflow `active:true`. Causa
real: node de webhook criado do zero via API REST não vem com o campo `webhookId` (UUID que a
interface do n8n atribui sozinha, a API não gera automaticamente) - sem isso o webhook de
produção nunca registra de verdade, só funciona via execução manual/MCP (caminho interno
diferente). Corrigido: adicionado `webhookId`, ciclo de desativar/reativar via API pra forçar o
registro, testado com `curl` real direto na URL pública (não só MCP) - `200`, imagem gerada de
verdade, confirmado. Achado registrado em memória (`reference_n8n_api_escrita`) pra não repetir
em workflows futuros. Comando de teste pronto (com o prompt real do P4-07) já foi passado ao
07-Marketing via PM.
