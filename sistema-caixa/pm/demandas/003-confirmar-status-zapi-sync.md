# 003 — Confirmar status live do Z-API e propor sincronização do connected_phone

Status: concluída
Criada em: 2026-07-02
Aprovada em: — (despachada direto pelo Edvam)
Concluída em: 2026-07-02
Chat executor: 01 - N8N JS GRAFICA

## Contexto
`jsgrafica_agent_config.connected_phone` (hoje `5511992980671`) tem `updated_at` parado em
2026-04-15, mesmo com reconexões acontecendo depois disso — não é fonte confiável de qual
número está conectado agora. Edvam confirmou em 2026-07-02 que o Z-API está no número real da
gráfica, mas isso não está refletido no banco.

## Objetivo
Confirmar via Z-API (`GET /status`) qual número está conectado agora, e propor (sem
implementar ainda) um mecanismo para manter `connected_phone` sincronizado automaticamente a
cada reconexão.

## Escopo
- Incluído: chamar `GET /status` da instância Z-API configurada; comparar com
  `connected_phone` salvo; propor por escrito um mecanismo de sincronização (ex.: atualizar
  o campo dentro do fluxo de eventos de conexão do workflow `01`, ou um workflow dedicado).
- Fora de escopo: implementar o mecanismo de sync — isso é demanda separada, só depois que a
  proposta for aprovada.

## Critérios de aceite
- [ ] Número conectado confirmado e comparado com o campo salvo no banco
- [ ] Proposta escrita de sincronização automática, com prós/contras

## Riscos e cuidados
Chamada de leitura ao Z-API, sem risco de efeito colateral.

## Referências
`jsgrafica_agent_config`, `jsgrafica_log_eventos_instancias`, `lib/zapi.ts` (referência de
como o app já chama `GET /status`). Ver `pm/HISTORICO.md`.

## Relato de execução

**Status final: concluída**

### Número conectado agora (confirmado via Z-API)

Chamei `GET /status` e `GET /device` diretamente na instância configurada em
`jsgrafica_agent_config` (`instance_id: 3EFA4C62C755F07164E46237BF5854B6`):

- `GET /status` → `{"connected":true,"smartphoneConnected":true,...}` — confirma que está
  conectado, mas não traz o número.
- `GET /device` → `{"phone":"558186108547","name":"J S Gráfica","isBusiness":true,...}` —
  confirma o número real: **(81) 8610-8547**, mesmo WhatsApp da gráfica citado no CLAUDE.md do
  workspace, conta business com o nome "J S Gráfica". Bate exatamente com o relato do Edvam.

Comparando com o banco: `jsgrafica_agent_config.connected_phone = 5511992980671` (DDD 11, SP),
`updated_at = 2026-04-15`. **Confirmado: o campo está desatualizado e incorreto** — mostra um
número de SP que não tem relação com o número realmente conectado agora.

### Proposta de sincronização automática (não implementada)

Seguindo o escopo, não implementei nada — só a proposta abaixo, com prós/contras.

**Opção A — atualizar dentro do fluxo de eventos do workflow `01`, no branch de conectividade**
(`Switch Redirect` → `REDIRECIONAR PARA CONECTIVIDADE`): ao detectar um evento de reconexão bem
sucedida, chamar `GET /device` (reaproveitando a config já lida no `Get Config`) e gravar
`connected_phone` + `updated_at` via um nó Supabase Update.
- Prós: reage em tempo real, reaproveita infraestrutura que já existe nesse workflow.
- Contras: adiciona lógica nova a um workflow crítico (processa toda mensagem recebida); só
  funciona se o Z-API realmente disparar um evento de tipo "CONNECTED" — na tabela
  `jsgrafica_log_eventos_instancias` só vi eventos `DISCONNECTED`, `RESTORE_FALHA`,
  `CODIGO_RECONEXAO_ENVIADO`, `BOTAO_RENOVAR_CODIGO_ENVIADO` na janela de hoje; **não confirmei
  se existe um evento de reconexão bem-sucedida sendo capturado** — isso precisaria ser
  verificado antes de implementar essa opção.

**Opção B — workflow agendado dedicado (recomendada)**: um novo workflow pequeno, com
`scheduleTrigger` (ex.: a cada 15–30 min, no mesmo padrão do `JSGRAFICA | REPORT SHEETS`), que
chama `GET /device` e só grava no banco se o número mudou.
- Prós: não toca no workflow `01` (crítico); simples de construir e testar isoladamente; fácil
  de desativar se der problema.
- Contras: não é em tempo real (atraso de até o intervalo do agendamento) — aceitável para esse
  campo, que hoje é só informativo/de diagnóstico, não crítico para o fluxo de mensagens.

**Recomendação:** Opção B, por menor risco ao workflow crítico `01`. Se o Edvam preferir tempo
real, dá pra revisitar a Opção A depois de confirmar que o Z-API realmente emite um evento de
reconexão bem-sucedida (hoje só temos evidência dos eventos de falha/reconexão manual).

### Testes feitos
`GET /status` e `GET /device` na API do Z-API (chamadas de leitura, sem efeito colateral, como
previsto no risco da demanda). Nenhuma alteração em workflow, config ou banco.
