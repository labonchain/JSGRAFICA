# 340 - Investigar picos de callback de status (servidor n8n compartilhado)

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: 2026-08-28
Chat executor: 01 - N8N JS GRAFICA

Achado relatado por uma sessão do lado LabON/Mada: no momento exato de um login da Mada, chegaram
34 callbacks de entrega/leitura de mensagem (`03 - STATUS MSG`) da JS Gráfica de uma vez só. O
servidor n8n é compartilhado entre vários clientes (Mada, Junka, Grupo Prima, JS Gráfica) e tem só
2 CPUs — processar aquele volume de uma vez consumiu quase todo o processador por alguns minutos,
deixando os webhooks de todo mundo lentos (sem erro, só demora). Já passou sozinho, não é urgente,
mas o Edvam quer entender a frequência real e como melhorar.

## Objetivo
1. Medir a frequência real de picos parecidos (rajadas de N+ callbacks de status quase
   simultâneos) no histórico de execuções do workflow `03 - STATUS MSG` da JS Gráfica — não é caso
   único, ou é raro?
2. Identificar a causa real de cada rajada encontrada — o padrão mais provável é um envio em massa
   (WhatsApp Status pro público, lembrete em lote como `13 - LEMBRETE PIX PENDENTE`, ou pico de
   leitura simultânea de mensagens de um Status/broadcast) gerando várias confirmações de entrega/
   leitura no mesmo segundo. Confirmar com dado real, não suposição.
3. Propor melhoria realista pro lado da JS Gráfica (não mexe na infra compartilhada em si, isso é
   fora do domínio): por exemplo, enfileirar/escalonar o processamento desses callbacks em vez de
   processar tudo de uma vez, ou limitar o volume de envio simultâneo que gera a rajada.

## Escopo
- Incluído: histórico de execuções do workflow `03 - STATUS MSG` da JS Gráfica, qualquer workflow
  que dispare envio em massa (Status, lembretes em lote).
- Explicitamente fora de escopo: qualquer mudança na infraestrutura compartilhada em si (CPU do
  servidor, isso não é decisão nem domínio da JS Gráfica) — só o que a JS Gráfica pode fazer do
  próprio lado pra reduzir o impacto que ela mesma gera.

## Riscos e cuidados
Investigação, não correção — não aplicar mudança nenhuma sem antes reportar o achado real e a
proposta pro PM.

## Referências
Relato da sessão LabON/Mada (28/08), workflow `03 - STATUS MSG`, `13 - LEMBRETE PIX PENDENTE`.

## Relato de execução

**Método**: histórico de execuções do `03 - JSGRAFICA | STATUS MSG` (`hg12ud3yo5mTu3XI`) via API
REST do n8n (`N8N_API_KEY`, endpoint `/api/v1/executions`), com payload completo
(`includeData=true`) de uma amostra real de execuções, cruzado com consulta direta (SQL somente
leitura) nas tabelas `jsgrafica_log_msgs_privadas`/`_grupos` e `labon_status_queue` no Supabase.
Nenhuma mudança aplicada em nenhum lugar, só investigação, conforme escopo.

**Achado 1, frequência (não é caso raro)**: o servidor n8n compartilhado só retém histórico de
execução recente (nesta consulta, ~5h de dado disponível, 3.481 execuções entre 09:29 e 14:28 de
hoje - limite de retenção da instância, não desta investigação). Dentro dessa janela, agrupando
por minuto-do-relógio (independente da hora), o padrão é claríssimo e se repete em TODA hora
observada (09h a 14h): pico de 340-397 execuções concentradas nos minutos :05-:06, contra uma
base de 15-50 execuções/minuto no resto da hora. Cruzando com `labon_status_queue`
(`agent_slug='jsgrafica'`), os `published_at` reais dos últimos 2 dias mostram publicação a cada
hora, quase sempre entre :05:02 e :06:07 (11:05, 12:05, 13:05, 14:05, 16:05, 17:05, 18:05, 19:05,
00:05, e hoje 12:05, 13:05, 14:06) - ou seja, o pico acontece TODA hora em que o Status da JS
Gráfica é publicado, o que tem sido praticamente todo hora nos últimos 2 dias. **Não é caso raro,
é o padrão normal de operação enquanto a aba Marketing → Conteúdo mantém posts de Status
agendados.**

**Achado 2, causa real confirmada com payload de verdade**: a fila compartilhada do LabOnchain
(`LABON_STATUS`, `triggerAtMinute: 5` no Schedule Trigger - confirmado direto na configuração do
node) publica 1 Status por hora pra JS Gráfica. Toda vez que um contato da JS Gráfica visualiza
esse Status, a Z-API manda um webhook de confirmação (`MessageStatusCallback`, com
`phone: "status@broadcast"`) pro `03 - STATUS MSG` - um webhook por espectador, às vezes vários
por segundo quando muita gente vê o Status ao mesmo tempo (é isso que gera o pico). Inspecionei o
payload completo de 44 execuções reais (39 da janela de pico + 5 de fora dela): **42 das 44
(95%) eram `status@broadcast`**, não conversa 1:1 real. O workflow hoje NÃO trata esse caso cedo -
roda a cadeia inteira (2 consultas Supabase `GET MSG PRIVADA`/`GET MSG GRUPOS` + tentativa de
`UPDATE`) pra cada uma dessas confirmações, mesmo sabendo que o `id` de uma visualização de Status
nunca bate com nenhuma linha real (confirmado: `UPDATE STATUS MSG PRIVADA` retornou `[]` - zero
linhas afetadas - no exemplo inspecionado). Bate exatamente com a suspeita do Edvam ("envio em
massa tipo Status pro público gerando várias confirmações") - `13-LEMBRETE PIX PENDENTE` foi
descartado como causa com dado real (as 5 execuções da janela investigada não encontraram nenhum
pedido aguardando Pix, 0 lembretes enviados).

**Achado colateral**: a consulta em `jsgrafica_log_msgs_privadas`/`_grupos` não mostra pico
nenhum de linhas gravadas nesses minutos (14-18 linhas em 14:05, todas de `message_id` distintos)
- ou seja, todo esse volume de execução e consulta ao banco não produz nenhum resultado útil,
é processamento gasto à toa.

**Proposta pro lado da JS Gráfica (sem mexer em infra compartilhada)**: adicionar 1 filtro logo
depois do `Webhook STATUS MSG` (antes de `GET MSG PRIVADA`/`GET MSG GRUPOS`) que descarta de cara
qualquer callback com `phone === "status@broadcast"`, sem rodar as 2 consultas nem a tentativa de
`UPDATE`. Isso elimina ~95% do trabalho de banco desse workflow (o que nunca gera atualização
real de qualquer forma) sem tocar em nada da lógica de status de conversa 1:1 de verdade, sem
mudar o volume/cadência de Status enviado (fora de escopo) e sem mexer na infra compartilhada
(fora de escopo). Risco baixo: adiciona 1 node, não remove nem altera os já existentes.

**Nenhuma mudança aplicada** - aguardando aprovação da proposta antes de implementar, conforme
escopo desta demanda ("investigação, não correção").

**Adendo (28/08, 3 perguntas do Edvam antes de aprovar a 342)**:

1. Identidade real do espectador: SIM, disponível. Todo callback `status@broadcast` (42/42 na
   amostra) traz um campo `participant` com o LID do espectador, numérico, sem o sufixo `@lid`.
   Confirmado por cruzamento direto com `jsgrafica_contatos`: 6 de 10 valores testados batem com
   `contact_lid` já cadastrado (depois de normalizar o sufixo `@lid`), os outros 4 são espectadores
   ainda não cadastrados como contato. Não é o mesmo espaço de `phone` (telefone real formatado
   `55DDDNUMERO`) - é o mesmo espaço de `contact_lid`.

2. Viável salvar como log leve: SIM. Em vez das 2 consultas (`GET MSG PRIVADA`/`GET MSG GRUPOS`)
   + tentativa de `UPDATE` (que nunca acha nada pra esse tipo de evento), dá pra fazer 1 INSERT
   direto numa tabela de log dedicada (`participant`, `ids`, `status`, `momment`) sem nenhuma
   consulta condicional antes - mais barato que o fluxo atual e ainda preserva o dado (quem viu
   qual Status, quando), útil pro Marketing → Conteúdo medir alcance real do Status.

3. Custo real medido (não estimado): fora do pico, o fluxo pesado atual roda rápido (756ms-3081ms
   por callback, amostra de 5 execuções fora da janela de rajada). DENTRO do pico, porém, a
   maioria das execuções amostradas (26 de 39, dois terços) levou 96-102 SEGUNDOS pra terminar -
   não é custo de CPU por chamada, é fila: o `Webhook STATUS MSG` não usa resposta imediata
   (`responseMode` não configurado, comportamento padrão do n8n é esperar o workflow inteiro
   terminar antes de responder a Z-API), então cada callback fica preso segurando um slot de
   worker no servidor compartilhado por até 100+ segundos durante o pico, e isso é exatamente o
   mecanismo que atrasa o webhook de todo mundo (Mada incluso) - não é o trabalho de cada callback
   isolado que pesa, é a fila competindo por só 2 CPUs quando várias centenas chegam concentradas
   em 1-2 minutos. Cortar consulta pesada por INSERT leve reduz quanto tempo cada callback segura
   o worker, o que ajuda a fila mesmo sem eliminar o volume de callbacks em si.
