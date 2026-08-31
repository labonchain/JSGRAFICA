# 009 — Garantir que o atendimento fica só log (sem resposta automática) antes do atendimento real de amanhã

Status: concluída — garantido hoje; recomendação de reforço (desativar workflow) aguarda o Edvam
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 01 - N8N JS GRAFICA

## Contexto
O número da JS Gráfica está conectado (confirmado, demanda 003). A partir de amanhã, o
atendimento real da gráfica passa a usar esse WhatsApp normalmente. Decisão explícita do
Edvam: **o agente automático não pode responder os clientes — ele só loga as conversas e
elas aparecem na aba Inbox da plataforma para atendimento manual.**

A demanda 004 encontrou que, hoje, nenhum cliente real recebe resposta automática porque o
workflow `JSGRAFICA_ATENDIMENTO_AI` tem uma whitelist hardcoded (nó
`FILTRAR TELEFONES AUTORIZADOS`) que bloqueia qualquer telefone fora de 5 números de teste.
Isso é uma proteção indireta (efeito colateral de um filtro de teste), não uma decisão de
produto configurada de propósito — e o chat 01-N8N não tem acesso de escrita ao n8n (demanda
005, bloqueada) para reforçar isso caso precise.

## Objetivo
Confirmar, com o máximo de certeza possível hoje, que nenhum cliente real vai receber
resposta automática a partir de amanhã — e recomendar ao Edvam a ação mais segura disponível,
já que o chat não pode editar workflow.

## Escopo
- Incluído:
  1. Reconfirmar que a whitelist em `FILTRAR TELEFONES AUTORIZADOS` e o restante do
     roteamento continuam exatamente como estavam na auditoria da demanda 004 (ninguém editou
     nada no meio tempo).
  2. Reportar explicitamente: "sim, está garantido que só log" ou "não, ainda há risco, e o
     motivo é X".
  3. Já que o chat não tem acesso de escrita (demanda 005), recomendar ao Edvam a ação mais
     simples e direta que ELE pode tomar na própria UI do n8n para ter garantia total — por
     exemplo, desativar o workflow `JSGRAFICA_ATENDIMENTO_AI` (toggle ativo/inativo, não
     precisa editar nó nenhum) até que exista uma decisão explícita e testada de reativar
     atendimento automático.
- Fora de escopo: editar o workflow por conta própria (segue bloqueado por falta de
  permissão) — só confirmar, reportar e recomendar.

## Critérios de aceite
- [ ] Confirmação explícita do estado atual da whitelist/roteamento (igual ou mudou desde a
      demanda 004)
- [ ] Resposta clara: garantido que só loga, ou não — com o motivo
- [ ] Recomendação de ação concreta para o Edvam tomar na UI do n8n, se ele quiser garantia
      total além da whitelist

## Riscos e cuidados
Isso é o item mais sensível de todos — se houver qualquer dúvida, reportar como "não
garantido" em vez de tranquilizar sem certeza.

## Referências
Workflow `JSGRAFICA_ATENDIMENTO_AI` (nó `FILTRAR TELEFONES AUTORIZADOS`), workflow
`01 - LOG MSG RECEBIDAS`. Ver `pm/demandas/004-*.md` e `pm/demandas/005-*.md`.

## Relato de execução

**Status final: concluída**

### 1. Reconfirmação: nada mudou desde a auditoria da demanda 004

Comparei os dois workflows com o estado lido na demanda 004 (mais cedo hoje):

| Workflow | `updatedAt` / `versionId` na demanda 004 | Agora | Mudou? |
|---|---|---|---|
| `01 - JSGRAFICA \| LOG MSG RECEBIDAS` | `2026-04-15T05:02:03.425Z`, mesma lista de nós | idêntico | **Não** |
| `JSGRAFICA_ATENDIMENTO_AI` | `2026-05-13T17:27:18.598Z`, `versionId b826cef3-...` | idêntico | **Não** |

Reli o código completo do nó `FILTRAR TELEFONES AUTORIZADOS` — o array `TELEFONES_AUTORIZADOS`
está byte a byte igual ao que registrei na demanda 004. Os dois workflows continuam `active:
true`. Ninguém editou nada no meio tempo.

### 2. Quem são os 5 números da whitelist (checagem extra, não pedida no escopo, mas necessária
para responder com segurança)

Cruzei os 5 telefones com `jsgrafica_contatos`:

| Telefone | Contato | Interações | Observação |
|---|---|---|---|
| `5521965185667` | Edvan Filho | 102 | Número pessoal do Edvam (confirmado em PRODUTO.md) |
| `5581982574944` | "Cliente Teste" | 1 | Nome literal "Cliente Teste" |
| `558196674923` | "Dizu Refeições" | 16 | Número de **outro cliente da agência** (Dizu Refeições, projeto separado), não JS Gráfica |
| `5511992980671` | "Mada AI Agent" | 13 | Bot de teste de outro projeto/template |
| `5581984956007` | *(sem registro)* | 0 | Nunca trocou mensagem — sem histórico de interação |

**Nenhum dos 5 é cliente real da JS Gráfica.** São: 1 número pessoal do Edvam, 1 marcado
explicitamente como teste, 1 de outro cliente da agência, 1 bot de teste de outro projeto, e 1
sem qualquer histórico.

### 3. Verificação adicional: o caminho de `06 - PEDIDOS` também está fechado pra cliente novo

Fui além do escopo original pra fechar uma dúvida: será que um cliente real, mesmo sem passar
pela whitelist do atendimento, poderia cair direto no fluxo automático de pedidos (`06 -
PEDIDOS`, que também manda mensagem automática, só que roteirizada em vez de gerada por LLM)?
Li o código do nó `CHECK SESSAO PEDIDO` (workflow `01`): ele só redireciona pra pedidos se a
memória do telefone (`jsgrafica_memoria_conversas`) já tiver `fase_jornada` numa lista de fases
de pedido em andamento, ou `origem === '06-pedidos'` — e essas memórias só são criadas pelo
próprio `JSGRAFICA_ATENDIMENTO_AI` (bloqueado pela whitelist) ou pelo próprio `06-PEDIDOS` (que
só é chamado a partir do atendimento). Ou seja: **um cliente novo, que nunca falou com a Dizu
antes, também não consegue cair no fluxo de pedidos automático** — cai sempre no default
`_destino: 'atendimento'`, que é onde a whitelist mata o fluxo.

### 4. Resposta explícita à pergunta da demanda

**Sim, está garantido: nenhum cliente real recebe resposta automática a partir de amanhã**, com
o estado atual do n8n. A garantia vem de duas camadas independentes, ambas verificadas: (a) a
whitelist do `FILTRAR TELEFONES AUTORIZADOS`, cujos 5 números são todos de teste/pessoal/outro
projeto — nenhum é cliente da gráfica; (b) o único jeito de chegar no fluxo automático de
pedidos também depende de já ter passado pela whitelist antes.

**Ressalva importante:** essa garantia depende inteiramente de ninguém editar esses dois
workflows entre agora e amanhã — e, como registrado na demanda 005, eu não tenho como travar
isso tecnicamente (sem acesso de escrita, não consigo nem desativar o workflow como
salvaguarda). Por isso a recomendação abaixo.

**Também vale registrar uma diferença de escopo que a demanda não previu:** a decisão do Edvam
foi "o agente automático não pode responder o cliente". O que investiguei cobre o agente
conversacional (Dizu/IA) e o fluxo de coleta de pedido (`06-PEDIDOS`) — ambos hoje inacessíveis
a cliente novo. Não avaliei se a intenção do Edvam também inclui bloquear os workflows
`05 - GESTAO PRODUTOS` (responde comandos, mas só de telefone autorizado `5521965185667` — já
travado) e `jsgrafica_envio_de_msg` (campanhas agendadas, não é resposta a mensagem recebida) —
achei que não se aplicam ao que ele quis dizer, mas vale confirmar se ele concorda.

### 5. Recomendação de ação para o Edvam (já que eu não posso editar nada)

Mais simples e direto: **desativar o workflow `JSGRAFICA_ATENDIMENTO_AI` na UI do n8n** (toggle
"Active" pra "Inactive", sem precisar abrir nenhum nó). Isso dá garantia total, independente da
whitelist continuar certa ou alguém mexer nela sem querer.

**Importante:** desativar esse workflow não deve afetar o log de mensagens nem o Inbox — pela
estrutura do workflow `01`, a gravação em `jsgrafica_log_msgs_privadas` (nós `Switch Log Geral`
→ `PREPARAR LOG MSG PRIVADA` → `MSG PRIVADA`) acontece antes do ramo que decide se manda pro
atendimento (`If enviar llm` → ... → `Switch Destino` → chamada HTTP pro webhook do
`JSGRAFICA_ATENDIMENTO_AI`). Ou seja, mesmo com o workflow de IA desativado, a mensagem do
cliente deve continuar sendo logada normalmente — só a chamada HTTP pro webhook (agora
inativo) que vai falhar silenciosamente, sem nenhum efeito colateral no log. **Não testei isso
ponta a ponta ainda** — a demanda 006 (próxima da fila) vai confirmar isso com uma mensagem de
teste real, então recomendo fazer 006 logo depois de desativar o workflow, pra confirmar que o
log continua funcionando mesmo com a IA desligada.

### Testes feitos
Somente leitura: `get_workflow_details` e `search_workflows` (comparação de `updatedAt`/
`versionId`/conteúdo de nó com o estado da demanda 004), consultas SQL em
`jsgrafica_contatos`. Nenhuma alteração em workflow, credential ou configuração.

---

## Adendo urgente (2026-07-02, investigando a demanda 010) — corrige a recomendação acima

Ao investigar a demanda 010, mapeei o grafo de conexões do workflow `01` com mais profundidade
e encontrei algo que muda a análise de risco desta demanda: **a gravação da mensagem em
`jsgrafica_log_msgs_privadas` não é independente da chamada ao `JSGRAFICA_ATENDIMENTO_AI` como
eu tinha avaliado antes** — pelo contrário, o nó `HTTP Request` (que chama o webhook do
atendimento) fica **antes**, no mesmo caminho síncrono, do nó `Merge Log Geral` que alimenta a
gravação do log. Se essa chamada falhar ou travar (sem `continueOnFail` configurado), a
execução do workflow `01` para ali, **antes** de logar a mensagem.

**Isso já está acontecendo agora, com o workflow ativo** (confirmado empiricamente na demanda
006: mensagem de teste do Edvam chegou no Z-API mas não foi logada) — encontrei um nó órfão
dentro do `JSGRAFICA_ATENDIMENTO_AI` (`10 – Responder Webhook1` sem nenhuma entrada válida)
que provavelmente faz esse webhook nunca responder, travando a chamada.

**O que isso muda na prática:**
- A garantia de "nenhum cliente real recebe resposta automática" (seção 4 acima) **continua
  válida** — a whitelist e a análise de rota continuam corretas.
- Mas a recomendação de "desativar `JSGRAFICA_ATENDIMENTO_AI` como reforço extra" **não deixa
  as coisas piores** (o log já está quebrado com o workflow ativo, então desativar não piora
  isso), só que minha justificativa original ("desativar não deve afetar o log") estava errada
  — na real, o log já não está funcionando de qualquer jeito, ativo ou não.
- **Isso é mais grave do que a pergunta original desta demanda**: significa que, mesmo com a
  whitelist garantindo que a IA não responde, o Inbox pode continuar vazio amanhã pra
  mensagens de clientes reais — o que também não é o que o Edvam quer (ele quer log +
  Inbox funcionando, só sem resposta automática).

Diagnóstico completo, causa provável e evidência estão na demanda 006 (seção "Continuação").
Recomendo tratar o conserto desse pipeline como prioridade **maior** que a decisão original
desta demanda, já que sem ele o "só log" também não funciona.
