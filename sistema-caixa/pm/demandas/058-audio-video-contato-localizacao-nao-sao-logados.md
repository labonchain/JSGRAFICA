# 058 — URGÊNCIA MÁXIMA: Áudio, vídeo, contato e localização não são logados (falha há meses)

Status: implementado e validado com sintético — aguardando teste real (áudio/vídeo/imagem/documento/figurinha) pra fechar
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Edvam mandou um áudio de teste pro WhatsApp real da JS Gráfica hoje — não apareceu no Inbox.
Investigação do PM confirmou: **não é bug de hoje, é uma falha estrutural de meses**. A última
mensagem de áudio logada em todo o histórico do sistema é de **25/03/2026**. Ao verificar todos
os tipos de mídia, o quadro real é:

| Tipo | Última vez logado | Total histórico | Status |
|---|---|---|---|
| Imagem | hoje (12:34) | 17.540 | ✅ funcionando |
| Documento | hoje (09:46) | 2.940 | ✅ funcionando |
| Figurinha | ontem (13:55) | 185 | ✅ funcionando |
| Áudio | 25/03/2026 | 195 | 🔴 quebrado há +3 meses |
| Vídeo | 11/04/2026 | 23 | 🔴 quebrado há +3 meses |
| Contato | 02/03/2026 | 5 | 🔴 quebrado há +4 meses |
| Localização | 06/02/2026 | 1 | 🔴 quebrado há +5 meses |

**Exigência explícita do Edvam, textual:** "não da pra ter erro, não tem como chegar uma msg ou
enviar uma msg e não aparecer no inbox, isso é URGENCIA MAXIMA e precisa ser resolvido por
completo. não da pra ser parcial a solução." — ou seja, **100% dos tipos de mensagem, sem
exceção**, precisam ficar logados de forma confiável antes desta demanda ser considerada
concluída.

**Causa raiz (rastreada pelo PM no código do workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS`, id
`lcFEt1kbyqNfTS89`):** o log da mensagem está estruturalmente **amarrado à decisão de enviar pra
IA** (`If enviar llm`), quando deveria ser uma ação incondicional, independente de qualquer
roteamento de IA/pedido. Especificamente:

- O ramo `If É Áudio?` (TRUE) segue pra uma cadeia de processamento —
  `HTTP baixar audio` → `Read/Write Files from Disk` → ... → `Converter para base64` →
  `HTTP Transcrição audio` → `processar audio p llm` → `ENVIAR PARA LLM` → `GET Memoria Ativa`
  → (continua pro roteamento de pedido/IA) — **e essa cadeia nunca reconecta de volta pro nó
  `Merge Log Geral`/`Switch Log Geral`**, que é o único caminho que leva ao insert em
  `jsgrafica_log_msgs_privadas`. Uma vez que a mensagem entra nesse ramo, é estruturalmente
  impossível ela ser logada.
- O ramo `If É Áudio?` (FALSE) vai pra `Merge Log Geral` **e** `ENVIAR PARA LLM` em paralelo —
  por isso imagem/documento/figurinha (que aparentemente não entram no ramo TRUE de `If É
  Áudio?`) logam certinho.
- Vídeo/contato/localização provavelmente caem num buraco parecido — **não confirmado com a
  mesma profundidade que áudio**, precisa ser rastreado nó a nó no editor do n8n pelo 01-N8N
  (o PM só confirmou o sintoma via banco, não a causa exata pra esses 3 tipos).
- Além disso, o nó `If enviar llm` tem um branch FALSE que vai pra `[]` (vazio) — ou seja, se
  esse "If" for falso por qualquer motivo (ex. telefone fora da whitelist), a mensagem **também
  não é logada**, não importa o tipo. Isso é um problema à parte, mais amplo que só mídia —
  precisa ser investigado e corrigido junto.

## Objetivo
Toda mensagem recebida no WhatsApp da JS Gráfica — **de qualquer tipo, de qualquer telefone,
autorizado ou não pra IA** — é gravada em `jsgrafica_log_msgs_privadas`. O log nunca depende de
decisão de roteamento de IA/pedido.

## Escopo
- Incluído:
  1. Rastrear no editor do n8n, nó a nó, o caminho real de cada tipo de mensagem (texto, imagem,
     documento, figurinha, áudio, vídeo, contato, localização) desde o webhook de entrada até o
     insert em `jsgrafica_log_msgs_privadas` — confirmar exatamente onde cada tipo quebrado
     (áudio/vídeo/contato/localização) se perde.
  2. Redesenhar o fluxo pra que **o log seja incondicional** — desacoplar completamente
     "gravar a mensagem no banco" de "decidir se manda pra IA"/"decidir se processa pedido".
     Sugestão de abordagem: logo após identificar o tipo de evento (próximo de `Processar
     Evento`/`IDENTIFICAR AUTORIZAÇÃO`), criar um caminho paralelo que sempre grava a mensagem
     (com `media_url`/`media_type`/`transcription_text` quando aplicável), **antes** de
     qualquer verificação de `If enviar llm`/roteamento de pedido — o roteamento de IA continua
     acontecendo em paralelo, sem interferir no log.
  3. Pra áudio especificamente: a transcrição (`transcription_text`) deve ser gravada junto da
     mensage — não é só "logar o áudio cru", é logar o áudio **e** a transcrição que já é feita
     hoje pra IA (reaproveitar o texto já transcrito, não gerar de novo).
  4. Corrigir também o `If enviar llm` FALSE indo pra `[]` (mensagem de telefone não-autorizado
     não sendo logada) — esse é o mesmo tipo de problema, mais amplo.
  5. **Teste obrigatório e completo antes de fechar a demanda**: mandar uma mensagem de teste
     real de **cada um** dos tipos (áudio, vídeo, figurinha, imagem, documento, texto — contato
     e localização se for viável testar) pro número real da JS Gráfica, e confirmar que **todos**
     aparecem em `jsgrafica_log_msgs_privadas` em segundos. Não aceitar "testei só áudio" como
     conclusão — o pedido do Edvam é 100% de cobertura, sem exceção.
- Fora de escopo: mudar a lógica de quando a IA decide responder (isso é assunto do bloqueio já
  existente da Dizu, não mexer); mudar a whitelist de telefones autorizados.

## Critérios de aceite
- [ ] Áudio real de teste aparece no log (com `media_url` e `transcription_text` preenchidos)
- [ ] Vídeo real de teste aparece no log
- [ ] Contato/localização (se testável) aparecem no log
- [ ] Imagem/documento/figurinha continuam funcionando (regressão zero)
- [ ] Mensagem de telefone **não autorizado** pra IA também é logada (teste o `If enviar llm`
      FALSE)
- [ ] Rastreamento nó a nó documentado no relato — não só "corrigi", mas onde exatamente cada
      tipo quebrava

## Riscos e cuidados
Esta é uma mudança estrutural no workflow de produção mais crítico do sistema (recebe toda
mensagem real de cliente). Fazer backup do workflow antes de mexer (mesmo padrão da demanda
037 — exportar o JSON completo antes de qualquer alteração, salvar em `pm/backups/`). Testar
com números de teste antes de considerar validado, mas o critério de aceite final exige teste
com o número real de produção também (mensagem real chegando).

## Referências
Workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (id `lcFEt1kbyqNfTS89`). Nós envolvidos: `If É
Áudio?`, `HTTP baixar audio`, `Converter para base64`, `HTTP Transcrição audio`, `processar
audio p llm`, `ENVIAR PARA LLM`, `Merge Log Geral`, `Switch Log Geral`, `If enviar llm`.
Demanda 037 (padrão de backup antes de mexer no workflow).

## Relato de execução

**Status final: implementação concluída e validada com sintético — aguardando testes reais do
Edvam (áudio, vídeo, figurinha, imagem, documento) antes de fechar de vez, conforme exigido**

### Rastreamento nó a nó (causa raiz confirmada de cada tipo)

Backup confirmado em `pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda058_2026-07-04.json`
antes de qualquer alteração.

Tracei a árvore completa de conexões do workflow `01` (não só os nós já apontados pelo PM).
Confirmação nó a nó:

- **Áudio**: `If enviar llm` (TRUE) → `If É Áudio?` (TRUE) → `HTTP baixar audio` → ... →
  `processar audio p llm` → `ENVIAR PARA LLM` → segue só pro roteamento de IA/pedido. **Essa
  cadeia nunca tem uma conexão de volta pro `Merge Log Geral`/`Switch Log Geral`** — confirmado
  lendo o `connections` completo do workflow. Estruturalmente impossível logar, exatamente como
  o PM descreveu.
- **Vídeo**: `If É Áudio?` checa só `media_type === 'audio'` (não pega vídeo) — então vídeo
  segue pelo ramo FALSE junto com imagem/documento, que alimenta `Merge Log Geral` normalmente.
  Pela leitura do código, vídeo *deveria* logar igual imagem. Não consegui confirmar 100% pela
  leitura estática por que vídeo especificamente parou de funcionar em 11/04 enquanto imagem
  continuou — pode ser algo específico do teste real (arquivo grande, timeout na chamada) que só
  o teste real vai revelar. **Isso já deixou de importar**: a correção abaixo torna o log
  incondicional a esse ramo inteiro, então vídeo loga de qualquer jeito, independente da causa
  exata do problema antigo.
- **Contato/Localização**: achado novo, não estava no relato original do PM. O código do
  `Processar Evento` já monta os campos dedicados (`contact_display_name`, `contact_vcard`,
  `location_latitude` etc.) — isso não é o problema. O problema real: **essas mensagens não têm
  texto nem `media_type` reconhecido, então `roteamento` fica `null`**, e `If enviar llm` exige
  `roteamento notEmpty` — cai direto no branch `FALSE` → `[]` (vazio), nunca chega no
  `Merge Log Geral`. Mesma causa raiz do problema mais amplo do `If enviar llm`, não uma causa
  separada.
- **`If enviar llm` FALSE → `[]`**: confirmado — qualquer mensagem sem `roteamento` (contato,
  localização, mensagem vazia, reação sem texto, etc.) morre ali, independente de telefone
  autorizado ou não.
- **Achado extra (fora do que o PM já tinha mapeado)**: o histórico mostra `media_type =
  'contact'` (5 registros, até 02/03) e `'location'` (1 registro, até 06/02) — mas o código
  *atual* do `Processar Evento` **não define `media_type` pra contato/localização** (só monta os
  campos dedicados). Ou seja, o código de detecção de mídia foi alterado em algum momento e
  perdeu esses dois `else if`, num regresso que nem o PM tinha visto. Corrigido junto (ver
  abaixo) — sem isso, contato/localização até logariam (depois do fix principal), mas sem
  `media_type` preenchido, diferente do padrão histórico, e potencialmente confundindo o Inbox.

### O que foi feito (correção estrutural)

**Princípio: o log virou incondicional, plugado direto no `Processar Evento`, sem passar por
nenhuma decisão de IA/pedido/áudio/whitelist.**

1. `Processar Evento` agora manda o evento pra **4 destinos em paralelo** (antes só ia pro
   `If Mensagem Enviada Por Nos`, que existia desde a demanda 037):
   - `If Mensagem Enviada Por Nos` (inalterado — continua decidindo só se a mensagem entra ou
     não no roteamento de IA/pedido, sem nenhuma responsabilidade de log).
   - `Switch Log Geral` **(novo, direto)** — log incondicional, mesmo nó que já existia, só
     que agora alimentado direto, sem depender de `If enviar llm`/`If É Áudio?`/whitelist.
   - `Merge1` **(novo, direto)** e `Get row(s) CONTATOS` **(novo, direto)** — atualização de
     contato (`data_ultimo_contato` etc.) também virou incondicional, pelo mesmo motivo: um
     áudio ou vídeo de cliente real deve atualizar o contato dele no Inbox, não só logar a
     mensagem solta.
2. `If Mensagem Enviada Por Nos` (branch TRUE, mensagem nossa) — antes ia pro `Switch Log
   Geral` (gambiarra da demanda 037, único jeito de logar mensagem própria na época). Agora vai
   pra `[]` — não precisa mais, o log já acontece incondicionalmente lá em cima.
3. `Merge Log Geral` — **desconectado** (suas 3 saídas antigas: `Switch Log Geral`, `Merge1`,
   `Get row(s) CONTATOS` — removidas). Continua recebendo entrada dos ramos antigos (`If É
   Áudio?` FALSE, `HTTP Request`/atendimento), mas não alimenta mais nada — ficou órfão de
   propósito, pra não logar em duplicidade agora que o log já acontece antes. O dedupe
   (`If1`/`Get row(s) MSG PRIVADA` por `message_id`) already garantiria que não duplicasse
   linha mesmo se eu tivesse deixado conectado, mas desconectei mesmo assim pra deixar o design
   limpo (log não depende mais dessa parte do fluxo, ponto final).
4. **Transcrição de áudio**: adicionei um nó novo, `UPDATE Transcricao Audio Log`, conectado em
   paralelo à saída existente de `processar audio p llm` (que já calcula `transcription_text`
   pra IA). Esse nó faz um `UPDATE` em `jsgrafica_log_msgs_privadas` (por `message_id`)
   preenchendo `transcription_text` e `message_text` — **reaproveita a transcrição que já é
   feita hoje pra IA**, não gera de novo. Como o log da mensagem já aconteceu (passo 1, antes da
   transcrição terminar), esse UPDATE só completa o texto quando ele fica pronto — mensagem de
   áudio aparece no Inbox quase na hora, com a transcrição chegando alguns segundos depois.
5. **`Processar Evento` — contato/localização**: adicionei `else if (rawZapi.contact) mediaType
   = 'contact'` e `else if (rawZapi.location) mediaType = 'location'` na cadeia de detecção de
   mídia, corrigindo o regresso encontrado acima.

### Testes realizados e resultado

**Sintéticos (via webhook direto, confirmam a lógica sem precisar de mídia real):**
1. Texto normal (autorizado): logou certo, `roteamento: 'llm'` — segue funcionando igual antes.
2. Mensagem com `roteamento` genuinamente vazio (sem texto/mídia/reação — o cenário exato que
   morria no `If enviar llm` FALSE): **logou** (`tipo_evento: 'RECEBIDA'`, `roteamento: null`).
3. Contato sintético (`contact.displayName`): logou com `media_type: 'contact'` e
   `contact_display_name` preenchido.
4. Localização sintética (`location.latitude/longitude`): logou com `media_type: 'location'` e
   `location_latitude`/`location_name` preenchidos.
5. Confirmei também que `jsgrafica_contatos` foi atualizado (`data_ultimo_contato`,
   `total_mensagens_recebidas`) pros 3 primeiros testes — a atualização de contato incondicional
   também está funcionando.

Todos os dados sintéticos foram apagados depois de confirmar.

**Pendente — testes reais obrigatórios (não posso simular sozinho):**
Preciso que o Edvam mande, pro WhatsApp real da JS Gráfica (81 8610-8547), uma mensagem de teste
de cada um destes tipos, na sequência:
- 🎤 Um áudio (mensagem de voz)
- 🎥 Um vídeo curto
- 😀 Uma figurinha
- 🖼️ Uma imagem
- 📄 Um documento (PDF, por exemplo)
- (Opcional, se for fácil) Um contato compartilhado e uma localização

Assim que cada uma for enviada, confirmo no banco (`jsgrafica_log_msgs_privadas`) em segundos e
fecho a demanda com o resultado de cada tipo documentado aqui.

### Achados fora do escopo
- **`Merge Log Geral` ficou órfão** (não alimenta mais nada) — não removi o nó em si, só suas
  conexões de saída, pra minimizar o tamanho da mudança. Pode ser limpo numa demanda de
  organização/limpeza de código morto no futuro, junto com outros nós órfãos que já existiam
  (`HTTP ReDIRECT CONFIG`, `Switch`/`HTTP Request1`, `REDIRECIONAR PARA STATUS`/
  `CONECTIVIDADE`).
- **Causa exata de vídeo não confirmada por leitura estática** (ver rastreamento acima) — o
  teste real vai servir de confirmação indireta, já que a correção não depende de saber a causa
  exata pra funcionar.

### Critérios de aceite
- [ ] Áudio real de teste aparece no log (com `media_url` e `transcription_text`) — **aguardando teste do Edvam**
- [ ] Vídeo real de teste aparece no log — **aguardando teste do Edvam**
- [x] Contato/localização — testado sinteticamente, funcionando (real é opcional/bônus)
- [ ] Imagem/documento/figurinha continuam funcionando (regressão zero) — **aguardando teste do Edvam** (a lógica não mudou pra esses tipos, mas o pedido é confirmar com mensagem real, não assumir)
- [x] Mensagem de telefone/roteamento que cairia no `If enviar llm` FALSE também é logada —
      confirmado com sintético
- [x] Rastreamento nó a nó documentado acima
