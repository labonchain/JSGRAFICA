# Tarefas, o que mandar pros chats

**Nota de 2026-07-28**: este arquivo parou de ser atualizado em 02/07 (demandas 001-022). A
partir daí, o volume de demandas cresceu muito (hoje são ~230) e o texto de despacho de cada
uma passou a viver só em `demandas/STATUS.md` (que resume o resultado) e no próprio arquivo
`demandas/NNN-*.md` (que tem o texto de despacho pronto, geralmente só `Executa a demanda NNN:
pm/demandas/NNN-*.md`, já que o chat já foi briefado antes). Não faz sentido reconstruir aqui,
retroativamente, o texto exato mandado em cada uma das ~210 demandas seguintes, arriscaria
inventar detalhe que não existe. **Pra despacho do dia a dia, use `demandas/STATUS.md` (mais
recente primeiro) e o arquivo da demanda específica, não este documento.** O conteúdo abaixo
(sessão de 02/07) continua sendo um registro válido de como o formato de despacho funcionava no
início do projeto.

Este é o documento que você usa pra copiar e colar direto nos chats do time. Organizado por
sessão (data). Cada tarefa mostra pra qual chat vai e o texto pronto pra enviar.

Cada tarefa referencia um arquivo em `demandas/NNN-*.md`, é onde fica o detalhe completo
(escopo, critério de aceite) e onde o chat deve preencher o relato ao terminar. Você não
precisa abrir esse arquivo pra despachar a tarefa, só se quiser o detalhe fino.

---

## Sessão 2026-07-02, RESULTADO: todas as 5 concluídas/reportadas

001 ✅ diagnóstico | 002 ✅ diagnóstico | 003 ✅ concluída | 004 ⚠️ parcial (auditoria ok, sem
vazamento; decisão aguarda Edvam) | 005 ⛔ bloqueada (01-N8N sem ferramenta de escrita no n8n)

Detalhe completo em `PRODUTO.md` e `HISTORICO.md`. Textos originais desta sessão abaixo,
mantidos como registro.

## 🔴 CHECKLIST COMPLETO, 2026-07-02, mandar agora pros 3 chats

### → 01 - N8N JS GRAFICA
```
Você tem 4 tarefas na fila, todas aprovadas, execute em ordem, uma de cada vez, preenchendo
o "Relato de execução" de cada demanda antes de passar pra próxima:

1. Demanda 005 (caixa-js-grafica/pm/demandas/005-rotacionar-jwt-hardcoded-workflow-01.md):
   agora desbloqueada, você tem acesso de escrita via API do n8n se precisar (pergunte ao PM
   se precisar da chave). Mover o JWT hardcoded pra credential.
2. Demanda 013 (013-sincronizar-connected-phone.md), criar workflow agendado que sincroniza
   connected_phone.
3. Demanda 014 (014-consertar-envio-atendimento-ia.md), consertar a entrega de resposta do
   atendimento IA (fila send_queue nunca lida). Baixa prioridade, mas está na fila.
4. Demanda 015 (015-formalizar-whitelist-atendimento.md), mover a whitelist pro Supabase.

Não pule nenhuma nem invente escopo além do que está escrito em cada arquivo.
```

### → 02 - DADOS JS GRAFICA
```
Você tem 1 tarefa na fila, aprovada:

Demanda 016 (caixa-js-grafica/pm/demandas/016-tratar-ddd-malformado.md), tratar os 327
contatos com DDD não-parseável, checar o long tail disperso, e o achado da própria gráfica
aparecendo como contato de si mesma.
```

### → 03 - APP JS GRAFICA
```
Você tem 2 tarefas na fila, aprovadas, execute em ordem:

1. Demanda 018 (caixa-js-grafica/pm/demandas/018-arquivar-contatos-teste-inbox.md):
   permitir arquivar/silenciar contato no Inbox.
2. Demanda 019 (019-limpeza-codigo-morto.md), limpeza de código morto (lib/sheets.ts,
   TelaLog, console.log de diagnóstico).
```
Status 018: ⛔ **bloqueada**, o escopo pede coluna nova em `jsgrafica_contatos` (schema),
fora do domínio do 03-APP. Perguntado ao Edvam como proceder; ele decidiu "reportar pro PM"
em vez de deixar o 03-APP decidir. Ver relato completo em `demandas/018-*.md` e a tarefa
sugerida pro 02-DADOS logo abaixo, em "Candidatas futuras". (Nota: já foi criada e aprovada
como demanda 023 pro 02-DADOS, ver `demandas/STATUS.md`.)

Status 019: ✅ **concluída e deployada**, `lib/sheets.ts` já não existia (removido numa
sessão anterior), `TelaLog` (~165 linhas mortas em `app/page.tsx`) removido, `console.log` de
diagnóstico removido de `enviar-midia/route.ts`. Achado fora de escopo: `app/api/log/route.ts`
ficou órfã (só o `TelaLog` a chamava), não apagada, fica como candidata. Ver
`demandas/019-*.md`.

### → 03 - APP JS GRAFICA (mais 2 tarefas executadas na mesma sessão, fora da lista original)
- **Demanda 020** (alta prioridade, despachada direto pelo Edvam): corrigido bug de fuso
  horário no cálculo do "dia do caixa" (`formatarDiaCaixa()` rodava em UTC no servidor,
  adiantando o dia perto da meia-noite de Recife). ✅ Concluída, testada com servidor forçado
  em UTC e deployada em produção. Ver `demandas/020-*.md`.
- **Demanda 022** (baixa prioridade): validação do campo Valor na Entrada Avulsa (PDV, Admin
  e mini-PDV do Inbox, eram 3 lugares com o mesmo campo duplicado). ✅ Implementada,
  buildada e deployada; falta só teste manual em navegador (sem ferramenta de browser nesta
  sessão). Ver `demandas/022-*.md`.

## ✅ 2026-07-02, fim de tarde, acesso de escrita ao n8n resolvido

Edvam forneceu uma API key do n8n (escopo workflows). O PM passou a poder ler **e escrever**
direto (ativar/desativar workflow, editar node), sem depender de chat nem de ação manual do
Edvam na UI. Com isso:
- **Demanda 010 concluída**: `05 - GESTAO PRODUTOS` e `jsgrafica_envio_de_msg` desativados e
  confirmados via API.
- **Demanda 011 aplicada**: nó `HTTP Request` do workflow `01` recebeu
  `onError: continueRegularOutput`, o log de mensagens não trava mais esperando o webhook do
  atendimento IA responder. Diff confirmado: só esse nó mudou, resto do workflow intacto.

**Única coisa que falta:** mandar mais uma mensagem de teste pra (81) 8610-8547, o PM confere
direto se ela chegou em `jsgrafica_log_msgs_privadas`, sem precisar de chat nenhum.

## Sessão seguinte, respostas do Edvam (2026-07-02)

- `5521965185667` é seu número pessoal, confirmado. Causa da janela de maio fechada.
- Importação de 946 linhas em `jsgrafica_vendas`: não tem certeza do que é, vira demanda 007
  abaixo, prioridade normal.
- Teste ponta a ponta de recebimento: priorizado, vira demanda 006 abaixo, **primeira da
  próxima leva**.
- Acesso de escrita do 01-N8N ao n8n: ainda em aberto, não decidido.

### → 01 - N8N JS GRAFICA (demanda 006, prioritária)
Status: ⏳ bloqueada, precisa que o Edvam mande uma mensagem de teste pra (81) 8610-8547
agora, depois avisar o chat "01 - N8N JS GRAFICA" pra ele conferir e fechar

```
Tarefa 006, Confirmar ponta a ponta que mensagem recebida de cliente real é gravada

Leia antes de agir: caixa-js-grafica/pm/PRODUTO.md

O que fazer: zero mensagem de cliente (from_me:false) chegou em jsgrafica_log_msgs_privadas
desde 01/06/2026, mesmo com o Z-API reconectado hoje no número real (81) 8610-8547. Combine
com o Edvam o envio de uma mensagem de teste (não precisa ser cliente real) para esse número,
e confirme se ela chega em jsgrafica_log_msgs_privadas com from_me:false. Se não chegar,
diagnostique em qual ponto da cadeia travou: Z-API não disparou webhook / n8n não processou /
erro ao gravar no Supabase. Não conserte ainda, só diagnóstico.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/006-teste-ponta-a-ponta-recebimento.md
```

### → 02 - DADOS JS GRAFICA (demanda 007)
Status: ✅ concluída (ver `demandas/007-*.md`, importação legítima, já em uso no dashboard)

```
Tarefa 007, Investigar a importação de 946 linhas em jsgrafica_vendas

Leia antes de agir: caixa-js-grafica/pm/HISTORICO.md (Fase 3, migração Sheets → Supabase)

O que fazer: jsgrafica_vendas recebeu 946 linhas novas hoje (2026-07-02) com
operador='import' e phone=null. O Edvam não tem certeza do que é essa importação. Analise as
946 linhas (datas, produtos, valores, created_at), veja se bate com o histórico esperado do
Google Sheets, confirme que não há duplicidade com vendas já existentes, e proponha como esse
dado pode ser usado (ex.: alimentar dashboard histórico). Não altere as linhas ainda.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/007-investigar-import-vendas.md
```

### → 02 - DADOS JS GRAFICA (demanda 008, Edvam autorizou a exclusão)
Status: ✅ concluída (ver `demandas/008-*.md`, 106 msgs / 7 contatos apagados)

```
Tarefa 008, Deletar dados da janela de contaminação (número pessoal do Edvam)

Leia antes de agir: caixa-js-grafica/pm/demandas/001-investigar-contaminacao-log.md

O que fazer: o Edvam confirmou que 5521965185667 é seu número pessoal e autorizou apagar os
dados da janela em que a instância ficou conectada nele por engano (2026-05-03 03:58 a
2026-05-04 12:58 UTC). Antes de apagar: rode um SELECT reconstruindo a lista exata de
mensagens e contatos dessa janela (associados a connected_phone=5521965185667) e reporte a
contagem. Depois, apague as mensagens dessa janela em jsgrafica_log_msgs_privadas. Para
contatos que só existem por causa dessa janela (sem nenhuma mensagem fora dela), apague o
contato também, se tiver mensagem fora da janela, não apague o contato, só as mensagens da
janela. Verifique também se o número 5521965185667 tem mensagens de fora dessa janela (ex.:
os testes de hoje) antes de decidir o que fazer com ele, reporte em vez de decidir sozinho.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/008-deletar-janela-contaminacao-numero-pessoal.md com a
contagem antes/depois.
```

### → 01 - N8N JS GRAFICA (demanda 009, URGENTE, antes do atendimento real de amanhã)
Status: ✅ concluída, garantido que nenhum cliente real recebe resposta automática amanhã
(ver `demandas/009-*.md`). Reforço opcional recomendado: Edvam desativar
`JSGRAFICA_ATENDIMENTO_AI` na UI do n8n.

```
Tarefa 009, Garantir que o atendimento fica só log antes do atendimento real de amanhã

Leia antes de agir: caixa-js-grafica/pm/demandas/004-auditar-e-decidir-roteamento-atendimento-ia.md
e caixa-js-grafica/pm/demandas/005-rotacionar-jwt-hardcoded-workflow-01.md

O que fazer: a partir de amanhã o atendimento real da gráfica passa a usar esse WhatsApp.
Decisão do Edvam: o agente automático NÃO pode responder cliente, só logar e mostrar no
Inbox. Reconfirme que a whitelist no nó "FILTRAR TELEFONES AUTORIZADOS" (workflow
JSGRAFICA_ATENDIMENTO_AI) e o resto do roteamento continuam exatamente como estavam na
auditoria da demanda 004 (ninguém editou nada). Reporte de forma explícita: está garantido
que nenhum cliente real recebe resposta automática, ou não (e por quê). Como você não tem
acesso de escrita ao n8n (demanda 005), recomende ao Edvam a ação mais simples que ELE pode
fazer na própria UI do n8n para ter garantia total, por exemplo, desativar o workflow
JSGRAFICA_ATENDIMENTO_AI (é só um toggle, não precisa editar nó nenhum).

Isso é urgente, precisa de resposta antes do atendimento real começar amanhã.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/009-garantir-atendimento-so-log-antes-de-amanha.md
```

### 🔴 → Edvam, URGENTE (demanda 011, ação direta na UI do n8n, sem esperar chat)
Status: aguardando ação

```
Demanda 011, Conserto rápido: workflow "01 - LOG MSG RECEBIDAS" → nó "HTTP Request" (o que
chama o webhook do JSGRAFICA_ATENDIMENTO_AI). Abra esse nó e habilite "Continue On Fail" (ou
configure timeout curto + continuar em erro). Isso faz o log de mensagens funcionar mesmo se
o webhook do atendimento travar, que é exatamente o que está acontecendo agora (mensagem de
cliente chega no WhatsApp mas não é gravada no banco). Depois de habilitar, mande outra
mensagem de teste pro (81) 8610-8547 e peça pro chat "01 - N8N JS GRAFICA" conferir se dessa
vez ela aparece em jsgrafica_log_msgs_privadas. Detalhe completo em
caixa-js-grafica/pm/demandas/011-consertar-pipeline-log-quebrado.md
```

### → 01 - N8N JS GRAFICA (demanda 010)
Status: aguardando envio

```
Tarefa 010, Desativar 05-GESTAO PRODUTOS e jsgrafica_envio_de_msg

Leia antes de agir: caixa-js-grafica/pm/demandas/005-rotacionar-jwt-hardcoded-workflow-01.md
(mesmo bloqueio de acesso pode se aplicar aqui)

O que fazer: o Edvam decidiu desativar de vez o workflow "05 - GESTAO PRODUTOS" (função passa
a ser só pelo admin) e deixar "jsgrafica_envio_de_msg" desativado por padrão (só dispara
quando ele ativar e rodar manualmente). Tente desativar os dois. Se suas ferramentas não
permitirem (mesmo bloqueio de escrita da demanda 005), reporte isso claramente em vez de
insistir ou simular sucesso. De um jeito ou de outro, confirme o estado final (active
true/false) dos dois, e verifique que o workflow 01 não quebra se alguém mandar um comando de
produto agora que o destino está desativado (deve falhar silenciosamente, sem afetar o log).

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/010-confirmar-desativacao-gestao-produtos-e-campanhas.md
```

### → Edvam (ação direta, se o 01-N8N reportar bloqueio)
- Se a tarefa 010 vier bloqueada, desativar `05 - GESTAO PRODUTOS` e `jsgrafica_envio_de_msg`
  manualmente na UI do n8n.
- Mandar mensagem de teste pra (81) 8610-8547 pra destravar a demanda 006.

### Candidatas futuras (ainda não viraram demanda formal)
- **01-N8N:** mover a whitelist do atendimento IA (hoje hardcoded no nó
  `FILTRAR TELEFONES AUTORIZADOS`) para uma tabela/config editável.
- **01-N8N:** investigar por que `jsgrafica_send_queue` nunca é lida/entregue via Z-API (mesmo
  pros 5 números autorizados, o envio final não sai).
- **01-N8N:** implementar a Opção B da demanda 003 (workflow agendado sincronizando
  `connected_phone`), só depois do Edvam aprovar a proposta.
- **01-N8N:** retomar a demanda 005 assim que o acesso de escrita for resolvido.
- **02-DADOS:** tratar os 327 contatos com DDD não-parseável como frente separada de
  qualidade de dado.
- **02-DADOS (nova, 2026-07-02, bloqueando a demanda 018 do 03-APP):** adicionar coluna
  `arquivado boolean not null default false` em `jsgrafica_contatos`. Escopo mínimo, só essa
  coluna (sem RLS/índice extra a menos que julgue necessário). Texto sugerido:

  ```
  Tarefa, Adicionar coluna "arquivado" em jsgrafica_contatos

  Leia antes de agir: caixa-js-grafica/pm/demandas/018-arquivar-contatos-teste-inbox.md

  O que fazer: a demanda 018 (03-APP) precisa de uma coluna nova em jsgrafica_contatos pra
  permitir arquivar/silenciar contato no Inbox. Adicione arquivado boolean not null default
  false. Escopo mínimo, só essa coluna. Avise quando estiver pronta pra o 03-APP retomar a
  018.

  Quando terminar, preencha "Relato de execução" na demanda que o PM criar pra isso.
  ```

---

## Sessão 2026-07-02 (textos originais, já despachados)

### → 01 - N8N JS GRAFICA

**Tarefa 004, Auditoria do atendimento automático por IA (PRIORITÁRIA)**
Status: ⚠️ parcial (concluída, ver `demandas/004-*.md`)

```
Tarefa 004, Auditoria do atendimento automático por IA (PRIORITÁRIA)

Leia antes de agir: caixa-js-grafica/pm/HISTORICO.md e
caixa-js-grafica/pm/investigacoes/2026-07-02-integracao-whatsapp-zapi-n8n.md

O que fazer: verifique no histórico de execuções do n8n (workflows "01 - LOG MSG RECEBIDAS"
e "JSGRAFICA_ATENDIMENTO_AI") se, desde a última reconexão do Z-API hoje (2026-07-02, por
volta das 21h52 UTC), alguma mensagem foi enviada automaticamente pelo agente de IA para um
cliente real. Não mude nada no roteamento, só audite e reporte.

Isso é urgente: se encontrar evidência de resposta automática a cliente real, avise
imediatamente, não espere terminar o resto.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/004-auditar-e-decidir-roteamento-atendimento-ia.md
```

**Tarefa 003, Confirmar status live do Z-API e propor sincronização do connected_phone**
Status: ✅ concluída (ver `demandas/003-*.md`)

```
Tarefa 003, Confirmar status live do Z-API e propor sincronização do connected_phone

Leia antes de agir: caixa-js-grafica/pm/HISTORICO.md

O que fazer: chame o GET /status da instância Z-API configurada em jsgrafica_agent_config e
confirme qual número está conectado agora. Compare com o campo connected_phone salvo no banco
(desatualizado desde abril). Proponha por escrito, sem implementar ainda, uma forma de
manter esse campo sincronizado automaticamente a cada reconexão.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/003-confirmar-status-zapi-sync.md
```

**Tarefa 005, Mover JWT hardcoded para credential do n8n**
Status: ⛔ bloqueada (ver `demandas/005-*.md`, falta ferramenta de escrita no n8n)

```
Tarefa 005, Mover JWT hardcoded para credential do n8n

O que fazer: no workflow "01 - LOG MSG RECEBIDAS", nó "Flag Sessao CONFIG Ativa", existe um
JWT service_role do Supabase em texto puro no código. Crie uma credential do n8n com esse
valor, substitua a referência no nó, e teste que o workflow continua funcionando igual antes
de marcar como concluído, esse workflow é crítico (processa toda mensagem recebida).

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/005-rotacionar-jwt-hardcoded-workflow-01.md
```

### → 02 - DADOS JS GRAFICA

**Tarefa 001, Investigar contaminação do log histórico**
Status: ✅ concluída (ver `demandas/001-*.md`)

```
Tarefa 001, Investigar contaminação do log histórico

Leia antes de agir: caixa-js-grafica/pm/HISTORICO.md e
caixa-js-grafica/pm/investigacoes/2026-07-02-integracao-whatsapp-zapi-n8n.md

O que fazer: hoje sabemos que ~23% dos 1.987 contatos em jsgrafica_contatos têm DDD fora de
81 (Recife), e que mensagens de maio/2026 mostram conversas sem relação com gráfica (bot de
gastos pessoais, negociação de produção RJ/SP). Analise jsgrafica_contatos,
jsgrafica_log_msgs_privadas e jsgrafica_log_msgs_grupos por DDD, por período e por conteúdo,
e tente identificar a causa (ex.: algum campo do payload que aponte outra instância/número).
Não apague nem altere nada, é só investigação.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/001-investigar-contaminacao-log.md com uma estimativa
quantificada e a hipótese de causa (ou "não determinável com os dados disponíveis").
```

### → 03 - APP JS GRAFICA

**Tarefa 002, Investigar por que o Inbox não reflete o log real de conversas**
Status: ✅ concluída (ver `demandas/002-*.md`)

```
Tarefa 002, Investigar por que o Inbox não reflete o log real de conversas

Leia antes de agir: caixa-js-grafica/pm/HISTORICO.md,
caixa-js-grafica/pm/investigacoes/2026-07-02-integracao-whatsapp-zapi-n8n.md, e
caixa-js-grafica/pm/demandas/001-investigar-contaminacao-log.md (pode estar relacionado)

O que fazer: o Inbox (admin.jsgrafica.site) não bate com as conversas reais da gráfica hoje.
Revise app/api/inbox/conversas/route.ts e app/api/inbox/mensagens/route.ts (filtros, limit,
ordenação), compare com o que existe de fato no Supabase, e identifique a causa. Não altere o
código ainda, só diagnóstico.

Quando terminar, preencha "Relato de execução" em
caixa-js-grafica/pm/demandas/002-investigar-inbox-nao-reflete-log.md
```
