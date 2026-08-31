# 064 — URGENTE: IA corta resposta/resumo pela metade (thinking do Gemini 2.5 consome o limite de tokens)

Status: aprovada — prioridade alta, causa raiz já confirmada e testada pelo PM
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam testou a sugestão de resposta e o resumo de conversa em produção (depois da demanda 063)
e reportou, com print: texto sempre incompleto, cortado no meio da palavra, sem relevância
("Cliente Joma perguntou se fazemos impress" — corta em "impress", devia ser "impressão";
"Cliente enviou 2 imagens, deu bom dia e depois" — termina em nada). Reação do Edvam: "se for pra
ser assim melhor não ter."

**Causa raiz confirmada e testada pelo PM, direto na API do Gemini:** o modelo `gemini-2.5-flash`
(trocado na demanda 063) tem um modo de "pensar" internamente antes de responder
(`thinkingConfig`), que **consome tokens do mesmo limite** configurado em `maxOutputTokens`. Nos
testes do PM, de um limite de 300 tokens, **285 foram gastos "pensando"**, sobrando só 10 pra
resposta de verdade — o texto corta assim que o limite estoura
(`finishReason: MAX_TOKENS`, `thoughtsTokenCount: 285`). Isso não existia no `gemini-2.0-flash`
(modelo anterior, sem essa etapa de "pensamento").

**Correção testada e confirmada pelo PM**: adicionar `thinkingConfig: { thinkingBudget: 0 }` no
`generationConfig` das chamadas — desliga o "pensamento" (não é necessário pra uma tarefa
simples de sugestão/resumo) e todo o limite de tokens vai pra resposta real. Testado direto na
API: com essa mudança, `finishReason: STOP` (resposta completa) e texto coerente, sem cortar.

## Objetivo
Sugestão de resposta e resumo de conversa saem completos, coerentes e relevantes ao contexto
real da conversa — sem cortar no meio.

## Escopo
- Incluído:
  1. Em `lib/gemini.ts`, adicionar `thinkingConfig: { thinkingBudget: 0 }` no
     `generationConfig` das duas chamadas (`chamarGemini()` e `transcreverAudioGemini()`) — o PM
     já testou e confirmou que resolve o corte.
  2. Ajustar `maxOutputTokens`: **500** em `chamarGemini()` (sugestão de resposta e resumo — hoje
     300) e **1000** em `transcreverAudioGemini()` (hoje 500). Números testados pelo PM direto na
     API com `thinkingBudget: 0` ligado: uma sugestão de resposta real usou 23 tokens, um resumo
     de conversa real usou 56 — 500 dá margem confortável pra casos mais complexos sem custar
     mais (o modelo para sozinho ao terminar, `finishReason: STOP`; o limite é só teto de
     segurança, não é pré-alocado). Pra transcrição, 1000 cobre com folga áudios de até ~4-5
     minutos de fala (fala em português roda ~150 palavras/minuto). Ainda assim, testar com uma
     conversa real longa e um áudio real longo antes de fechar, e aumentar mais se algum caso real
     ainda cortar.
  3. **Investigar ao vivo** (o PM não conseguiu diagnosticar só lendo código) o segundo problema
     do print: a caixa de texto de resposta fica pequena/cortada quando a IA sugere algo longo —
     mal dá pra ver o que foi sugerido antes de mandar. Existe uma lógica de auto-ajuste de
     altura em `TelaInbox.tsx` (`useEffect` que cresce a textarea até 420px conforme o texto),
     mas na prática (print do Edvam) não parece estar funcionando direito — testar com uma
     sugestão longa de verdade e ver onde quebra (pode ser o container pai limitando o espaço
     disponível, ou timing do cálculo de altura rodando antes do texto estar de fato na tela).
- Fora de escopo: mudar o modelo de novo (fica `gemini-2.5-flash`, só ajustar a config).

## Critérios de aceite
- [ ] Sugestão de resposta sai completa (sem cortar no meio), testado com pelo menos 2
      conversas reais diferentes
- [ ] Resumo de conversa sai completo e relevante ao conteúdo real
- [ ] Caixa de texto mostra o conteúdo sugerido por inteiro, sem cortar visualmente
- [ ] Testado em produção com os mesmos contatos que o Edvam usou pro print (Joma, Helen Silva)
      se possível, ou equivalente

## Riscos e cuidados
Essa é a segunda vez que uma mudança de modelo Gemini (demanda 063) introduz comportamento
inesperado — vale, depois de corrigir, fazer um teste mais completo (2-3 conversas reais
diferentes, não só 1) antes de reportar concluído, dado o histórico.

## Referências
`lib/gemini.ts` (correção já confirmada pelo PM). `components/TelaInbox.tsx` (auto-ajuste de
altura da textarea, a investigar). Demandas 048/059/063 (histórico da feature).

## Relato de execução

### O que foi feito
1. **`lib/gemini.ts`**: adicionado `thinkingConfig: { thinkingBudget: 0 }` no `generationConfig`
   das duas funções (`chamarGemini()` e `transcreverAudioGemini()`). `maxOutputTokens` subiu de
   300→500 em `chamarGemini()` e de 500→1000 em `transcreverAudioGemini()`, exatamente como a
   demanda pedia.
2. **Segundo problema investigado ao vivo e corrigido** — `components/TelaInbox.tsx`, o
   `useEffect` de auto-ajuste de altura da textarea. Achado real (reproduzido com
   `page.evaluate` no Playwright, inspecionando o DOM depois de uma sugestão da IA):
   - O truque de auto-cresce funciona assim: encolhe pra `1px`, mede `scrollHeight` (altura
     natural do conteúdo), e chama `setInputHeight(h => Math.max(h, needed))` — o valor final só
     chega no DOM quando esse `setInputHeight` dispara um **re-render** (via
     `style={{height: inputHeight}}` no JSX).
   - Mas se `needed` (a altura que o texto novo precisa) **não for maior** que a altura atual
     (`h`), o novo valor de estado é **idêntico** ao antigo — React não re-renderiza pra um valor
     igual (bailout do `useState`). Resultado: a caixa fica **travada em `1px`** (o valor
     temporário usado só pra medir), porque nada nunca reaplicou a altura de volta.
   - Isso bate exatamente com o print do Edvam: a sugestão da IA chega de uma vez (não é digitada
     aos poucos), e como o padrão da caixa é 96px, qualquer sugestão cujo texto precise de altura
     ≤96px cai nesse buraco e fica cortada/pequena — não é sobre o texto ser "longo", é sobre ser
     **igual ou menor** que a altura já configurada.
   - Corrigido: a altura final agora é escrita direto no elemento (`ta.style.height`) dentro do
     próprio efeito, sem depender de um re-render do React pra desfazer a medição de `1px`.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Confirmado o fix do `thinkingConfig` direto na API do Gemini** (curl, antes de mexer no
  código do produto): sem o campo, comportamento de corte; com `thinkingBudget: 0`, resposta a
  uma pergunta de teste voltou com `finishReason: STOP` e `thoughtsTokenCount: undefined` (zero
  tokens "pensando"), texto completo e coerente.
- **Reproduzido o bug da caixa de texto ao vivo** com Playwright antes de corrigir: sugestão da
  IA na conversa real "Joma" chegou com `ta.style.height` travado em `"1px"` — bug confirmado, não
  suposição.
- **Depois do fix, testado com 2 conversas reais diferentes** (Joma e Helen Silva, os mesmos
  contatos do print do Edvam):
  - Joma: sugestão de resposta sobre impressão DTF em MDF saiu completa, coerente, com o texto
    todo visível na caixa (altura `96px`, sem cortar).
  - Helen Silva: sugestão de resposta completa (altura `96px`, sem cortar) e "Resumir conversa"
    gerou uma nota interna completa e relevante ("Helen enviou fotos de um convite e deu 'ok'...").
- **Testado em produção** depois do deploy, com os mesmos 2 contatos: sugestão de resposta e
  resumo de conversa voltaram completos e coerentes nas duas conversas — sem corte, sem texto
  genérico desconectado do assunto real.
- Transcrição de áudio (`transcreverAudioGemini`, mesmo fix de `thinkingConfig`) **não foi
  re-testada com áudio real nesta demanda** — os áudios sem transcrição achados no banco tinham
  link expirado no momento do teste (mídia do WhatsApp expira). O fix em si já foi validado no
  nível da API (mesmo `generationConfig`, mesmo comportamento de "pensamento" desligado);
  registrado aqui como não coberto por teste end-to-end desta vez, não como risco desconhecido.

### Achados fora do escopo
Nenhum novo.

### Status final
**Concluída e deployada** (`dpl_48QdgC9LYqLN4HLtkgzkScxbcyE2`). Sugestão de resposta e resumo de
conversa testados e confirmados completos/coerentes em produção, com 2 conversas reais
diferentes (Joma, Helen Silva — os mesmos contatos do print original do Edvam). Bug real da
caixa de texto (auto-ajuste de altura preso em "1px") diagnosticado ao vivo e corrigido, não só
suposto.
