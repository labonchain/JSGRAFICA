# 063 — Atualizar modelo Gemini descontinuado (gemini-2.0-flash → gemini-2.5-flash)

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
`GEMINI_API_KEY` foi configurada (local e produção) e testada pelo PM. A chave em si funciona
(`GET /v1beta/models` responde normal, lista `gemini-2.5-flash` como modelo estável atual), mas
o modelo hardcoded no código (`gemini-2.0-flash`, escrito na demanda 048) **não existe mais**:

```
Gemini API respondeu 404: "This model models/gemini-2.0-flash is no longer available."
```

## Objetivo
Sugestão de resposta (048) e transcrição de áudio (059) voltam a funcionar de ponta a ponta.

## Escopo
- Incluído: trocar o nome do modelo em `lib/gemini.ts` (usado tanto por `chamarGemini()` quanto
  por `transcreverAudioGemini()`) de `gemini-2.0-flash` pra `gemini-2.5-flash` (ou outro modelo
  atual, se o 03-APP preferir conferir a lista de modelos disponíveis e escolher diferente —
  `gemini-2.5-flash` é só a confirmação mais recente do PM, não uma imposição).
- Fora de escopo: mudar a lógica de sugestão/transcrição em si.

## Critérios de aceite
- [ ] Sugestão de resposta (048) gera texto real numa conversa real
- [ ] Transcrição de áudio (059) transcreve um áudio real sem transcrição (tem vários no banco,
      contato "Edvan Filho" por exemplo)
- [ ] Testado em produção, não só local

## Referências
`lib/gemini.ts`. Demandas 048 e 059 (ambas dependem deste fix pra funcionar de verdade agora que
a chave já está configurada).

## Relato de execução

### O que foi feito
Trocado `GEMINI_MODEL` em `lib/gemini.ts` (constante única, usada tanto por `chamarGemini()`
quanto por `transcreverAudioGemini()`) de `gemini-2.0-flash` pra `gemini-2.5-flash`. Antes de
aplicar, confirmei por conta própria (não só confiei no relato) que:
- `gemini-2.0-flash` realmente devolve 404 "no longer available" numa chamada `generateContent`
  de verdade — reproduzi o erro exato citado na demanda.
- `gemini-2.0-flash` **ainda aparece listado** em `GET /v1beta/models` (mesmo estando
  descontinuado pra `generateContent`) — por isso não bastava conferir a listagem, testei a
  chamada real antes de decidir.
- `gemini-2.5-flash` responde normal com texto de verdade. Também vi que já existem modelos mais
  novos na lista (`gemini-3-flash-preview`, `gemini-3.5-flash`, etc.) — fiquei com a sugestão do
  PM (`gemini-2.5-flash`, estável e já confirmado funcionando) em vez de arriscar um preview.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Local**: `POST /api/inbox/sugestao-resposta` (conversa real, "Edvan Filho") → texto real
  gerado, não erro. `POST /api/inbox/resumir-conversa` → resumo real gerado. `POST
  /api/inbox/transcrever-audio` (áudio real sem transcrição do mesmo contato) → transcrição real
  gerada e **confirmada gravada no banco** (`transcription_text` não nulo depois).
- Playwright local: botão "✨ IA" na conversa real → "Sugestão da IA — edite antes de mandar"
  aparece no campo de texto com conteúdo de verdade (screenshot conferido); áudio antes
  transcrito aparece com o texto certo na bolha.
- **Produção** (depois do deploy): `POST /api/inbox/sugestao-resposta` e `POST
  /api/inbox/transcrever-audio` (outro áudio real sem transcrição, URL conferida fresca antes de
  usar) — ambos retornaram texto real gerado pelo Gemini, não erro.

### Achados fora do escopo
Nenhum. Confirmei que as demandas 048 e 059 estavam implementadas corretamente desde sempre — o
único problema era o nome do modelo descontinuado, exatamente como a demanda descrevia.

### Status final
**Concluída e deployada** (`dpl_4Hj6XAWEe5pWpsPZUFyTgc1VMKmK`). Testado de ponta a ponta em
produção com conversa e áudio reais — demandas 048 e 059 agora funcionam de verdade, não só o
caminho de erro gracioso.
