# 109 — Investigar mensagens desalinhadas entre o Inbox e o WhatsApp Web real

Status: parcial — corrigido o que era do workflow n8n; causa maior é fila de execução da instância (infra compartilhada), reportado ao PM
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Item 3 do backlog. Edvam relatou que, durante o atendimento, "rola um dale do que aparece no
chat e o que chega no WhatsApp Web" — ou seja, o que aparece no Inbox não bate em tempo real com
o que chega de verdade no WhatsApp. Pode ser delay do pipeline de webhook (Z-API → n8n →
Supabase → Realtime → tela) ou perda pontual de mensagem. Não investigado ainda.

## Objetivo
Entender e corrigir a causa do desalinhamento — mensagens aparecerem no Inbox no mesmo momento
(ou bem próximo) em que chegam no WhatsApp de verdade.

## Escopo
- Incluído:
  1. Investigar o caminho completo: Z-API webhook → workflow n8n (`01 - LOG MSG RECEBIDAS`) →
     `jsgrafica_log_msgs_privadas` → Realtime → `TelaInbox.tsx`. Medir tempo real de cada etapa
     com uma mensagem de teste.
  2. Reportar onde está o delay/perda antes de propor fix — não é claro ainda se é n8n, Supabase
     Realtime, ou o polling do frontend (nesse caso, avisar o PM pra virar demanda do 04-FRONTEND
     em vez de mexer aqui).
- Fora de escopo: aplicar fix fora do domínio do n8n sem antes reportar ao PM.

## Critérios de aceite
- [ ] Tempo de cada etapa do pipeline medido com mensagem de teste real
- [ ] Causa do desalinhamento identificada
- [ ] Se a causa for no workflow n8n, corrigida; se for fora (Realtime/frontend), reportado ao PM

## Riscos e cuidados
Não é claro ainda se é bug real ou percepção (delay normal de alguns segundos que parece maior
durante atendimento corrido) — medir antes de assumir que precisa de correção grande.

## Referências
Workflow `01 - LOG MSG RECEBIDAS`, `jsgrafica_log_msgs_privadas`, `components/TelaInbox.tsx`
(Realtime/polling). Demandas 037/070 (mesma família de bug de sincronização de mensagem).

## Relato de execução

**Status final: causa identificada e parcialmente corrigida — parte do problema está fora do
domínio n8n/workflow, precisa de decisão do PM/infra**

### Medição (3 mensagens reais + 1 teste controlado)

Comparei `data_timestamp` (o `momment` que a própria Z-API/WhatsApp registra pro evento) contra
o horário real da inserção em `jsgrafica_log_msgs_privadas`, usando execuções reais recentes do
workflow `01` (via `GET /executions/{id}?includeData=true`):

| Execução | Delay total (mensagem → linha gravada) |
|---|---|
| 893278 | 5,3s |
| 893039 | 8,3s |
| 893496 | ~20s |
| Teste controlado (893524, horário de disparo conhecido com precisão de ms) | ~20s |

### Causa raiz — duas partes distintas

1. **Ordem de execução dentro do workflow (corrigida):** desde a demanda 058, `Processar
   Evento` manda o evento em paralelo pra `Switch Log Geral` (log) e pra `If Mensagem Enviada
   Por Nos` (que leva pra toda a cadeia de IA/pedido — mais lenta, várias chamadas HTTP/Supabase
   em sequência). A ordem das conexões tinha o ramo de IA **primeiro** na lista; n8n parece
   processar branches paralelas na ordem em que aparecem na definição, então o log ficava
   **atrás** do processamento de IA na fila interna do próprio n8n, mesmo sendo estruturalmente
   independente. **Reordenei** (`Processar Evento` → `Switch Log Geral`/`Merge1`/
   `Get row(s) CONTATOS` primeiro, `If Mensagem Enviada Por Nos` por último) — isso reduz o
   atraso *interno* da execução, mas não foi a causa principal do delay grande observado (ver
   abaixo).

2. **Fila antes da execução começar (NÃO é bug de workflow — acho que é capacidade da
   instância n8n compartilhada):** no teste controlado, medi o instante exato em que mandei a
   mensagem de teste (`momment`, `03:56:24.952 UTC`) contra o instante em que o **primeiro nó**
   do workflow (`Processar Evento`) começou a rodar (`03:56:41.636 UTC`) — **16,7 segundos de
   diferença antes de qualquer lógica minha rodar**. Ou seja, a maior parte do atraso não está
   dentro do meu workflow — a execução fica numa fila do n8n antes mesmo de começar. Isso bate
   com o padrão de uma instância compartilhada entre vários clientes da agência (LabOnchain) sob
   carga, não com um problema de código.

### O que fiz e o que não pude fazer
- Corrigi o que estava ao meu alcance (ordem de execução interna).
- **Não consigo corrigir a fila de execução do n8n** a partir de um workflow individual — isso
  é configuração de capacidade/concorrência da instância (número de workers, modo fila, etc.),
  que é infraestrutura compartilhada entre todos os clientes da agência, fora do escopo de
  qualquer workflow específico.
- **Não é bug de Supabase Realtime nem do frontend** (`TelaInbox.tsx`) — o atraso acontece
  **antes** da mensagem sequer chegar no Supabase, então não tem nada pro 04-FRONTEND investigar
  aqui. Confirmando o que a própria demanda pediu pra verificar antes de escalar incorretamente.

### Recomendação pro PM
Isso precisa ser levado pra quem administra a instância n8n do LabOnchain (fora do meu acesso
via API pública) — avaliar se dá pra aumentar concorrência/workers, ou se o volume de todos os
clientes juntos já está no limite da instância atual. Não é algo que eu resolvo mexendo só no
workflow da JS Gráfica.

### Critérios de aceite
- [x] Tempo de cada etapa medido com mensagem de teste real (e mensagens reais adicionais)
- [x] Causa do desalinhamento identificada (duas causas: ordem interna corrigida + fila de
      execução da instância, não corrigível por mim)
- [x] Parte do workflow n8n corrigida; parte de infra reportada ao PM (não é Realtime/frontend,
      então não precisa virar demanda do 04-FRONTEND)
