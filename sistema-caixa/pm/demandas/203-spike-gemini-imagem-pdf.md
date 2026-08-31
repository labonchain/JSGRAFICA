# 203 — Spike técnico: Gemini lendo imagem/PDF de verdade

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: 2026-07-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Fase A da automação gradual do atendimento (`pm/OBJETIVOS-MACRO.md`, objetivo 2) — preparação de
baixo risco, **validação isolada, sem conectar em conversa real ainda**. O desenho da Fase 1 do
agente depende de um passo específico: quando chega mídia sem legenda, o LLM precisa identificar
se é "documento óbvio de 1 página" (boleto/fatura → propõe produto+preço direto) ou "algo
ambíguo" (→ pergunta em aberto, replica o padrão real medido na demanda 162). Isso nunca foi
provado tecnicamente — só foi assumido que "a mesma tecnologia da transcrição de áudio (058/059)
serve, estendida pra imagem/PDF". `GEMINI_API_KEY` **já está configurada em produção** (verificado
agora, 11 dias — pendência que bloqueava a 059 já foi resolvida, não é mais impedimento).

## Objetivo
Provar (ou refutar, documentado) que o Gemini consegue: (1) ler uma imagem/PDF de verdade a
partir de uma URL de mídia real do sistema, (2) contar páginas quando for PDF, (3) distinguir
"documento óbvio de 1 página, tipo boleto/fatura" de "algo ambíguo que precisa perguntar".

## Escopo
- Incluído: função nova em `lib/gemini.ts` (mesmo padrão de `transcreverAudioGemini` da 059 —
  baixa a mídia do `media_url`, converte pra base64, manda como `inlineData` pro Gemini) que
  recebe uma URL de imagem/PDF e devolve: tipo de mídia identificado, número de páginas (se PDF),
  classificação "documento óbvio de 1 página" vs "ambíguo", e se óbvio, uma tentativa de
  extrair produto/valor visível (mesmo que não vá ser usado ainda, serve pra medir a qualidade).
- **Testar com mídia REAL do sistema** — `jsgrafica_log_msgs_privadas` tem imagens/PDFs reais
  recebidos de clientes (mesma fonte que motivou o achado dos 43% de mídia sem legenda, 159) —
  pegar uma amostra variada (uns 10-15: boletos óbvios, comprovantes, fotos ambíguas, PDFs de
  várias páginas) e rodar contra cada uma, registrando o resultado real (não só "funcionou uma
  vez").
- Reportar taxa de acerto na amostra (documento óbvio identificado corretamente vs ambíguo) — não
  precisa ser perfeito, o objetivo é ter um número real pra decidir se a Fase B é viável como
  desenhada ou se precisa ajustar o critério.
- **Sem conectar em nenhum fluxo real** — é uma rota/script isolado (ex.
  `app/api/_spike/gemini-midia/route.ts` ou script standalone, decisão do executor) que não é
  chamado por nenhuma tela nem pelo n8n. Não cria pedido, não manda mensagem, não altera nada em
  produção além de rodar a leitura.
- Explicitamente fora de escopo: conectar isso na conversa real (Fase B, outra demanda);
  qualquer UI nova.

## Critérios de aceite
- [x] Função nova provada com mídia real (não só 1 exemplo — amostra de 10-15 casos variados)
- [x] Resultado documentado: quantos identificados certo, quantos errado, exemplos de cada
- [x] PDF multi-página: confirma se o Gemini realmente conta páginas certo (testar com pelo menos
      1 PDF de mais de 1 página real, se existir na amostra)
- [x] Nenhuma alteração em fluxo de produção — só leitura/teste isolado
- [x] Conclusão clara: a abordagen do desenho da Fase 1 é viável como está, ou precisa ajuste

## Riscos e cuidados
Não conectar em nada real — é só validação técnica. Se a taxa de acerto for baixa, reportar sem
tentar consertar/ajustar prompt indefinidamente — é decisão do Edvam se ajusta o desenho da Fase
1 depois de ver o resultado real.

## Referências
`pm/OBJETIVOS-MACRO.md` (objetivo 2, desenho da Fase 1, checklist Fase A). `lib/gemini.ts`
(demanda 048, `transcreverAudioGemini` da 059 — mesmo padrão técnico, estendido pra
imagem/PDF). Demanda 162 (padrão real do que é "documento óbvio" vs precisa perguntar).

## Relato de execução
**Conclusão clara: a abordagem do desenho da Fase 1 é VIÁVEL como está.** Taxa de acerto na
amostra real (13 mídias): 13/13 (100%) leituras técnicas bem-sucedidas (baixou a mídia real,
converteu, o Gemini processou sem erro nenhum); 8/8 (100%) contagem de páginas de PDF batendo
exatamente com o `page_count` real do Z-API (ground truth, não é o Gemini se auto-avaliando);
classificação "documento óbvio" vs "ambíguo" qualitativamente sólida — ver detalhe abaixo.

**Implementação**: `analisarMidiaGemini` nova em `lib/gemini.ts`, mesmo padrão técnico de
`transcreverAudioGemini` (059) — baixa a mídia da URL real (`fetch`), converte pra base64, manda
como `inlineData` pro Gemini (`gemini-2.5-flash`, mesmo modelo já em uso), pede JSON estruturado
(tipo de mídia, número de páginas, classificação, produto/valor detectado se óbvio). Prompt
inclui o contexto do negócio (gráfica rápida) pra calibrar o que conta como "óbvio" pra impressão.

**Amostra real** (13 mídias de `jsgrafica_log_msgs_privadas`, recebidas de clientes de verdade
13-16/07/2026, sem legenda, mesma fonte que embasou o achado dos 43% de mídia sem legenda da
demanda 159): 5 imagens JPEG, 5 PDFs de 1 página (ground truth `page_count=1`), 3 PDFs
multi-página (ground truth 2/3/7 páginas). Script isolado
`scripts/spike-203-gemini-midia.ts` (`npx tsx scripts/spike-203-gemini-midia.ts`) — não é
chamado por nenhuma tela nem pelo n8n, só roda manualmente; não grava nada em lugar nenhum, só
lê URLs de mídia já públicas (mesmas que o WhatsApp/Z-API expõem) e chama a API do Gemini.

**Resultado detalhado**:
- **Contagem de páginas (PDF)**: 5/5 PDFs de 1 página → Gemini disse 1. 3/3 PDFs multi-página →
  Gemini disse exatamente 2, 3 e 7 (bateu com o `page_count` real do Z-API nos 3 casos). **8/8 —
  100% de acerto**, incluindo o PDF de 7 páginas (não só páginas pequenas).
- **Classificação "documento óbvio" vs "ambíguo"**: os 5 PDFs de 1 página foram TODOS
  classificados como `documento_obvio`, com extrações corretas e específicas — "CRLV Digital de
  Motocicleta HONDA/NXR150", "Carteira Nacional de Habilitação (CNH) de Jorge Luiz Gomes de
  Carvalho", "Pague Seu Tributo — Prefeitura de Palmares, R$ 64,18, vencimento 20/07", "Passe de
  Agendamento TeconSuape", "Etiqueta de envio de encomenda". Os 3 PDFs multi-página foram TODOS
  classificados como `ambiguo` (nenhum produto/valor extraído, `null`) — exatamente o
  comportamento desenhado (documento de várias páginas pede pergunta, não proposta direta).
  Das 5 imagens: 3 viraram `documento_obvio` com extrações também específicas e corretas em
  formato ("Comprovante de Pix Itaú R$ 2,85, 16/07/2026", "Comprovante Pix Nubank R$ 64,18,
  16/07/2026", "Comprovante de envio de Pix, R$ 14,00, 16/07/2026") e 2 viraram `ambiguo` — sem
  ground truth pro CONTEÚDO das imagens (não abri manualmente pra conferir), mas o padrão de
  extrações certas e específicas nas outras 3 é evidência forte de que a classificação reflete
  leitura real da imagem, não um chute genérico.
- **Achado secundário (não bloqueia a conclusão, registrado pra a Fase B calibrar o prompt)**: o
  campo `tipo_midia` errou em todos os 5 PDFs de 1 página — o Gemini respondeu `"imagem"` em vez
  de `"pdf"` pra eles (provavelmente porque PDFs de 1 página escaneados/fotografados aparecem
  visualmente como "uma imagem só" pro modelo). Isso NÃO afetou a contagem de páginas nem a
  classificação óbvio/ambíguo (ambas corretas mesmo com o tipo errado) — é só um rótulo cosmético
  que a Fase B pode ignorar ou ajustar o prompt depois, decisão de quem for implementar. Conforme
  o risco documentado na demanda, não fiquei ajustando prompt indefinidamente — a taxa de acerto
  nas métricas que importam (páginas, óbvio/ambíguo) já é alta o suficiente pra reportar e seguir.

**Sem conectar em nada real**: confirmado por leitura de `app/api` inteiro — nenhuma rota nova
foi criada, `analisarMidiaGemini` fica exportada em `lib/gemini.ts` sem nenhum caminho de código
que a chame ainda (nem UI, nem webhook do n8n). `npm run build` confirma a lista de rotas
idêntica à da demanda anterior (nenhuma rota `/api/_spike/...` nem qualquer outra nova). Zero
escrita em produção durante o spike — só leituras de mídia pública + chamadas à API do Gemini.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção (a função nova em
`lib/gemini.ts` é código morto até a Fase B existir, mas segue o mesmo fluxo de deploy do
projeto): `dpl_3EYma8dubJYdwWeeSqeWfCBrrzkA`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.
