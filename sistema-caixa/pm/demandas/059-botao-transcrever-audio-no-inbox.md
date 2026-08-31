# 059 — Botão "Transcrever" ao lado do áudio no Inbox

Status: aprovada
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Depois da demanda 058 (áudio voltou a ser logado), Edvam notou que a transcrição automática
(feita hoje pelo workflow n8n, campo `transcription_text`) **nem sempre vem preenchida** — vários
áudios reais de hoje têm `message_text: "[áudio sem transcrição]"` e `transcription_text: null`.
Pedido: um botão "Transcrever" ao lado do controle de "ouvir" do áudio na thread do Inbox, pra
pedir a transcrição sob demanda quando a automática falhar ou não tiver rodado.

## Objetivo
Atendente consegue pedir a transcrição de um áudio específico com um clique, direto na thread,
sem depender só do pipeline automático do n8n.

## Escopo
- Incluído:
  1. Na renderização de mensagem com `media_type: 'audio'` (`components/TelaInbox.tsx`), botão
     "📝 Transcrever" ao lado do player/link de ouvir — só aparece quando `transcription_text`
     está vazio (se já tem transcrição, mostrar o texto direto, sem precisar de botão).
  2. Nova rota (ex. `app/api/inbox/transcrever-audio/route.ts`): recebe `message_id`, busca
     `media_url` da mensagem, manda pro Gemini (reaproveitar `lib/gemini.ts`, criado na demanda
     048 — Gemini processa áudio nativamente, não precisa de integração de transcrição
     separada) pedindo a transcrição, grava o resultado em
     `jsgrafica_log_msgs_privadas.transcription_text` (mesmo campo que o n8n já usa), devolve
     pro front atualizar a tela.
  3. Enquanto carrega, mostrar algum indicador (ex. "Transcrevendo...") — não travar a tela.
- Fora de escopo: mudar o pipeline automático de transcrição do n8n (isso é outra frente, se
  quiser investigar por que às vezes falha); mudar o modelo/provedor de IA usado (fica Gemini,
  mesmo da 048).

## Critérios de aceite
- [ ] Botão aparece só em áudio sem transcrição
- [ ] Clicar transcreve e mostra o texto na tela, sem precisar recarregar a página
- [ ] Transcrição fica salva (`transcription_text`) — se reabrir a conversa depois, já aparece
      pronta, sem precisar clicar de novo
- [ ] Testado com um áudio real sem transcrição (tem vários no banco hoje pra usar de exemplo)

## Riscos e cuidados
**Mesma dependência da demanda 048**: só funciona de verdade depois que `GEMINI_API_KEY` for
adicionada na Vercel (ainda pendente, decisão do Edvam de configurar depois). Até lá, testar o
caminho de erro gracioso (mesmo padrão da 048), não travar a tela se a chave não existir.

## Referências
`components/TelaInbox.tsx`. `lib/gemini.ts` (demanda 048, reaproveitar). Campo
`transcription_text` em `jsgrafica_log_msgs_privadas` (já usado pelo pipeline automático do
n8n). Demanda 058 (achado que motivou este pedido).

## Relato de execução

### O que foi feito
- **`lib/gemini.ts`**: adicionada `transcreverAudioGemini(audioUrl)` — baixa o áudio do
  `media_url` salvo, converte pra base64 e manda pro Gemini como `inlineData` (áudio nativo,
  sem serviço de transcrição separado) junto com um prompt pedindo a transcrição em português.
  `chamarGemini()` (texto puro, já usada na 048) não foi alterada — função nova, mesmo arquivo.
- **`app/api/inbox/transcrever-audio/route.ts`** (novo): recebe `messageId`, busca a mensagem
  (`media_type`/`media_url`) em `jsgrafica_log_msgs_privadas`, valida que é áudio e tem link,
  chama `transcreverAudioGemini`, grava o resultado em `transcription_text` (mesmo campo que o
  pipeline automático do n8n já usa) e devolve pro front.
- **`components/TelaInbox.tsx`**: botão "📝 Transcrever" ao lado de "ouvir" na bolha de áudio —
  só aparece quando `!m.transcription_text`. Estado `transcrevendo` (message_id em andamento,
  desabilita o botão e mostra "Transcrevendo..." enquanto isso) e `transcricaoErro` (mapa por
  message_id, mostra erro inline sem travar a tela). Ao concluir, atualiza `mensagens` local
  (sem precisar recarregar a página) — se reabrir a conversa depois, a transcrição já vem do
  banco pronta.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- Confirmado que `GEMINI_API_KEY` **ainda não está configurada** (nem local nem produção,
  mesma pendência da demanda 048) — testei o caminho de erro gracioso, que é o único possível
  até o Edvam configurar a chave:
  - `POST /api/inbox/transcrever-audio` local e em produção → erro claro
    ("GEMINI_API_KEY não configurada...", sem 500 genérico nem crash).
  - Playwright: abri a conversa real "Edvan Filho" (tem 3 áudios reais sem transcrição), botão
    "📝 Transcrever" aparece em todos, clique mostra "Transcrevendo..." e depois o erro em
    vermelho **dentro da bolha**, sem travar a tela nem quebrar o restante da conversa.
  - Confirmado no banco que `transcription_text` continua `null` depois do erro (nenhuma
    escrita parcial/corrompida — o erro acontece antes de chegar no Gemini, então o update
    nunca roda).
- Geração de transcrição real (o caminho feliz) **não pôde ser testada** — mesma dependência da
  048, só dá pra confirmar depois que a chave existir.

### Achados fora do escopo
Nenhum novo. Notei que a lista de conversas ainda mostra "Edvan Filho" duplicado (2 linhas) —
já é o problema conhecido de `contact_lid` duplicado (demandas 008/029/053); a busca de
mensagens já mescla as duas (fix da 053), só a *lista* de conversas ainda mostra 2 entradas
pro mesmo contato em alguns casos. Não investigado a fundo aqui, fora do escopo desta demanda.

### Status final
**Concluída e deployada** (`dpl_DnFMjKMa8ddpvvRA87axUa48gS6V`). **Bloqueada em produção até
`GEMINI_API_KEY` ser adicionada** (mesma pendência da 048) — caminho de erro testado e
gracioso; geração de transcrição real ainda não testada.
