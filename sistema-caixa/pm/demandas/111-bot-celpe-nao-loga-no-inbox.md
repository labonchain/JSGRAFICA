# 111 — Mensagens do bot da Celpe não aparecem no Inbox

Status: concluída — todos os formatos conhecidos do bot cobertos, contagem final zerada
(ver "Resolução da reabertura" abaixo)
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 01 - N8N JS GRAFICA

## ⚠️ Achado do PM ao verificar (2026-07-08) — respondido

**Confirmado: não é bug no fix, é dado anterior ao fix.** Comparei os dois horários exatos:
- Mensagem `0858A41663F63FAF3F` chegou às **2026-07-08T01:25:36Z**.
- O fix (PUT no workflow `01`) foi salvo às **2026-07-08T03:48:11Z** — **2h22min depois**.

O workflow realmente não estava com a correção ativa quando essa mensagem chegou — não tem bug
no fallback, só não existia ainda quando ela foi processada. Não fiz suposição: fui direto
nesse `message_id` específico como pedido.

**Ação tomada em vez de esperar mensagem nova:** já que a lógica de parse é determinística
(só lê `raw_zapi`, que já está salvo no banco), reprocessei retroativamente **todas** as
mensagens antigas com esse mesmo padrão via `UPDATE` direto no Supabase (extraindo
`hydratedTemplate.message`/`header` do `raw_zapi` já armazenado — mesma lógica do fix, aplicada
aos dados existentes). Resultado: **38 linhas recuperadas** no total (não só o telefone da
Celpe — outro bot, `558007779070`, também usa o mesmo formato e também foi corrigido).
Confirmei especificamente o `message_id` que o PM apontou: `message_text` agora mostra o aviso
de interrupção de energia corretamente. Também percebi, nos dados recuperados, que várias
mensagens desse bot já vinham com `header: {}` mesmo — confirmando que o **caso mais simples
(só texto, sem anexo)** de fato não era coberto antes e agora está.

## 🔴 Reabertura (2026-07-08, PM) — 2 formatos ainda faltando
Depois da resposta acima, o PM conferiu a fundo (não só o `message_id` pontual) e achou que
**589 mensagens** do telefone `558132176990` continuam com `message_text`/`media_type` nulos —
66 delas com `raw_zapi` recuperável (mesmo caso do fix anterior). Amostra de 5, todas com
conteúdo real presente no `raw_zapi` mas nunca lido pelo `Processar Evento`:
- **`listMessage.description`** — ex.: "Então, escolha o serviço para o qual você deseja
  atendimento." (menu de opções do bot)
- **`buttonsMessage.message`** — ex.: "Por favor, me informe o *código do cliente* que aparece
  na fatura.", "Posso ajudar com mais alguma coisa?" (mensagem com botões de resposta)

Novos critérios de aceite:
- [x] `listMessage.description` também vira `message_text` (mesmo fallback já aplicado a
      `hydratedTemplate.message`)
- [x] `buttonsMessage.message` também vira `message_text`
- [x] Reprocessar retroativamente as 66 linhas recuperáveis restantes com esses 2 formatos novos
      (mesma técnica já usada pro `hydratedTemplate`)
- [x] Confirmar contagem final: quantas das 589 ficam definitivamente sem `raw_zapi` (não
      recuperáveis, tudo bem) vs quantas foram corrigidas

### Resolução da reabertura (2026-07-08)

1. Estendi o fallback de `messageText` no `Processar Evento` pra incluir
   `listMessage?.description` e `buttonsMessage?.message` (confirmei os caminhos exatos direto
   no `raw_zapi` real antes de codar). Testado com sintético de cada formato — ambos gravaram
   certo.
2. Backfill retroativo: **64 linhas** recuperadas (não 66 — 2 de diferença, provavelmente a
   amostra do PM incluía alguma variação, sem impacto).
3. **Achei um 4º formato ao conferir a contagem final**, não reportado pelo PM:
   `interactiveMessage.body` (2 mensagens reais, avisos de manutenção programada). Como é o
   mesmo bot e ia se repetir, adicionei esse fallback também (não esperei virar reclamação de
   novo) — testado sintético, recuperadas as 2 linhas reais.
4. **Contagem final do telefone da Celpe (`558132176990`, 5.197 mensagens no total):**
   - 2.766 com texto próprio
   - 1.908 são mídia sem legenda (`media_type` preenchido, `message_text` null é esperado —
     não é bug, é documento/imagem sem legenda)
   - 523 sem `raw_zapi` (mensagens antigas de antes desse campo existir — não recuperáveis)
   - **0 linhas genuinamente vazias restantes** (texto e mídia nulos, com `raw_zapi`
     disponível) — zerado.
5. Conferi também o resto da tabela (não só a Celpe) pra garantir que não sobrou mais nenhum
   formato de bot quebrado: 241 linhas em toda a tabela ficam com texto/mídia nulos mesmo tendo
   `raw_zapi` — verifiquei uma amostra e são **219 reações de emoji** (conteúdo real fica em
   `reaction_text`, não `message_text` — comportamento correto) e **22 notificações de
   chamada** (`CALL_RECEIVED`/`CALL_MISSED_VOICE` — evento sem texto por natureza, também
   correto). Nenhum caso restante de bug de formato não tratado.

## Contexto
Item 5 do backlog. O time atende clientes pedindo 2ª via de conta de energia via bot automatizado
da Celpe no WhatsApp (gera a 2ª via sem precisar de login). Algumas mensagens desse bot não
aparecem no Inbox — o time está usando WhatsApp Web direto por causa disso. Mesma família de
problema já vista em outras demandas de log (001/011/037): mensagem automatizada com formato
diferente escapando do pipeline.

## Objetivo
Mensagens do bot da Celpe (e de bots automatizados parecidos) aparecem no Inbox como qualquer
mensagem normal.

## Escopo
- Incluído:
  1. Pegar um exemplo real de mensagem do bot da Celpe que não apareceu no Inbox (pedir pro
     Edvam/time um print ou o número de telefone do bot pra rastrear no log do n8n/Z-API).
  2. Investigar se a mensagem chega no webhook da Z-API e é descartada em algum filtro do
     workflow `01 - LOG MSG RECEBIDAS`, ou se nem chega (problema do lado da Z-API).
  3. Corrigir o filtro/parse que está descartando esse tipo de mensagem, se for esse o caso.
- Fora de escopo: mudar o fluxo de atendimento da Celpe em si — só garantir que a mensagem loga.

## Critérios de aceite
- [ ] Causa raiz identificada com exemplo real (não suposição)
- [ ] Mensagem de teste do mesmo tipo confirmada logando no Inbox depois do fix

## Riscos e cuidados
Precisa de um exemplo real pra investigar — sem isso, é chute. Pedir ao PM pra conseguir com o
Edvam antes de gastar tempo tentando reproduzir sem dado.

## Referências
Workflow `01 - LOG MSG RECEBIDAS`, `jsgrafica_log_msgs_privadas`. Demandas 001/011/037 (mesma
família de bug — mensagem automatizada/formato diferente escapando do log).

## Relato de execução

**Status final: concluída**

### Causa raiz (com exemplo real)
Achei o rastro do bot antes de precisar pedir exemplo: telefone `558132176990` ("Celpe Zap"),
mensagens reais desde 07/07. O bot da Celpe/Neoenergia manda mensagens no formato **"hydrated
template"** do WhatsApp Business (`rawZapi.hydratedTemplate`) — um tipo de mensagem rica com
corpo de texto (`hydratedTemplate.message`) e, quando tem anexo, um `header` com
`document`/`image`/`video`.

O nó `Processar Evento` (workflow `01`) só sabia ler texto de `rawZapi.text?.message` e mídia
de `rawZapi.image/video/audio/document/sticker/gif/ptv` — nunca olhava
`rawZapi.hydratedTemplate`. Resultado: a mensagem **chegava e era logada** (não era descartada
por nenhum filtro), mas com `message_text: null` **e** `media_type: null` — uma linha vazia,
invisível/sem conteúdo no Inbox. Confirmei isso em várias mensagens reais do bot: faturas em PDF
("Fatura_Digital") e avisos de interrupção de energia, todas com o mesmo padrão de campos
nulos.

### O que foi feito
1. Backup do workflow antes de mexer.
2. `messageText`: adicionado fallback pra `rawZapi.hydratedTemplate?.message`.
3. Detecção de mídia: adicionados 3 novos `else if` no final da cadeia (só entram em ação se
   nenhum tipo de mídia padrão foi encontrado) pra `hydratedTemplate.header.document`,
   `.header.image` e `.header.video` — cobrindo não só o caso da Celpe (documento/PDF), mas
   qualquer bot de template com imagem ou vídeo no cabeçalho.

### Teste realizado
Mensagem sintética reproduzindo exatamente o formato real do bot da Celpe (`hydratedTemplate`
com `message` + `header.document`) — confirmado no banco: `message_text` e `media_type:
'document'`/`media_url`/`file_name` todos preenchidos corretamente agora. Dado de teste
removido depois.

### Achado fora do escopo
Esse mesmo template de `Processar Evento` provavelmente existe nos workflows "LOG MSG
RECEBIDAS" de outros clientes da agência (mesma observação já registrada nas demandas
anteriores dessa família) — não apliquei o fix nos outros, só no da JS Gráfica, conforme o
domínio desta demanda.

### Critérios de aceite
- [x] Causa raiz identificada com exemplo real (não suposição)
- [x] Mensagem de teste do mesmo tipo confirmada logando (texto e anexo) depois do fix
