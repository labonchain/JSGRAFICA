# 010 — Confirmar desativação de 05-GESTAO PRODUTOS e jsgrafica_envio_de_msg

Status: concluída
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: PM (00), via API do n8n com chave fornecida pelo Edvam (2026-07-02)

## Relato de execução (fechamento)
Com a API key fornecida, desativei os dois via `POST /api/v1/workflows/{id}/deactivate` e
confirmei via `GET` que ambos estão `active: false`: `05 - JSGRAFICA | GESTAO PRODUTOS` e
`jsgrafica_envio_de_msg`. Análise de segurança já feita antes (relato original abaixo) segue
válida — nenhum dos dois cruza com o caminho de log.

## Contexto
Decisão do Edvam (2026-07-02): o workflow `05 - GESTAO PRODUTOS` fica desativado de vez —
essa função passa a ser feita pela aba Produtos do admin (`caixa-js-grafica`, já construída).
O workflow `jsgrafica_envio_de_msg` (campanhas) só deve disparar manualmente, nunca sozinho —
fica desativado por padrão, e o Edvam ativa + dispara na mão quando quiser mandar campanha.

O Edvam pediu explicitamente para o 01-N8N tentar fazer a desativação diretamente. **Atenção:
na demanda 005 o mesmo chat reportou não ter ferramenta de escrita no n8n via MCP (só
`search_workflows`, `get_workflow_details`, `execute_workflow`)** — pode esbarrar no mesmo
bloqueio aqui, já que desativar um workflow normalmente é uma chamada de escrita. Vale tentar
mesmo assim (pode haver um caminho diferente de `update_workflow` para esse toggle
específico); se não der, reportar claramente o bloqueio em vez de insistir ou simular sucesso.

## Objetivo
Desativar `05 - GESTAO PRODUTOS` e `jsgrafica_envio_de_msg`, ou — se não for possível com as
ferramentas disponíveis — reportar o bloqueio com clareza para o Edvam fazer manualmente na
UI. Em qualquer um dos dois casos, confirmar o estado final e que nada quebrou em volta
(principalmente o workflow `01`, que roteia mensagens pra `05 - GESTAO PRODUTOS` quando
reconhece um comando autorizado).

## Escopo
- Incluído: tentar desativar os dois workflows; confirmar via `search_workflows`/
  `get_workflow_details` o estado final (`active: true`/`false`) de cada um; verificar o que
  acontece no workflow `01` se alguém mandar um comando de produto agora que o destino está
  desativado — deve falhar de forma silenciosa/segura, sem quebrar o log de mensagens
  recebidas. Reportar se encontrar algum erro visível ou comportamento inesperado.
- Fora de escopo: editar ou remover os workflows — só ativar/desativar e confirmar o estado.

## Critérios de aceite
- [ ] Resultado claro: conseguiu desativar os dois, ou reportou bloqueio explicando por quê
- [ ] Estado final (`active: true`/`false`) de cada workflow confirmado
- [ ] Confirmado que um comando de produto (se alguém mandar) não quebra o log/roteamento —
      ou reportado se quebrar

## Riscos e cuidados
Se a tentativa de desativar falhar, não insistir de formas alternativas arriscadas (ex.:
editar o workflow inteiro só pra forçar `active:false`) — reportar o bloqueio e parar.

## Referências
Workflows `05 - GESTAO PRODUTOS` e `jsgrafica_envio_de_msg`, workflow `01` (nó que roteia pra
gestão de produtos). Ver `pm/demandas/005-*.md` (mesma limitação de acesso).

## Relato de execução

**Status final: bloqueada (mesma limitação da demanda 005) — diagnóstico de segurança
concluído**

### Tentativa de desativação
Confirmei, procurando de novo por qualquer ferramenta diferente (`ToolSearch` por
"activate/deactivate/toggle workflow"), que continuo só com `search_workflows`,
`get_workflow_details` e `execute_workflow` via MCP — nenhuma delas muda `active`. Não tentei
nenhum caminho alternativo arriscado (ex.: acessar o banco interno do n8n diretamente) — isso
seria sair muito do escopo de uma ferramenta homologada, então não fiz.

**Estado final confirmado (sem alteração):**
| Workflow | `active` |
|---|---|
| `05 - JSGRAFICA \| GESTAO PRODUTOS` | `true` (inalterado) |
| `jsgrafica_envio_de_msg` | `true` (inalterado) |

### Verificação: workflow 01 não quebra se comando de produto chegar com o destino desativado

Li o código completo dos dois workflows e o grafo de conexões do workflow `01` pra responder
isso com segurança (não só supor):

**`05 - GESTAO PRODUTOS`:** o nó que chama esse workflow (`HTTP Request1`, POST pra
`.../webhook/jsgraficagestaoprodutos`) fica no ramo `COMANDO` do `Switch Redirect` — esse ramo
é **mutuamente exclusivo** com o ramo que leva ao log de mensagens privadas (`If enviar llm` →
... → `Merge Log Geral` → `Switch Log Geral` → `MSG PRIVADA`). Uma mensagem que é comando
(`/listar`, `/ativar`, etc., e só do telefone autorizado `5521965185667`) nunca passa pelo ramo
de log — são caminhos completamente separados a partir do mesmo switch. Além disso,
`HTTP Request1` não tem nenhuma conexão de saída (é um beco sem saída no grafo). Conclusão:
**se o workflow de destino estiver desativado, essa chamada HTTP vai falhar (erro/404) e essa
execução específica do workflow `01` vai terminar com erro — mas isso não tem nenhum jeito de
afetar o log de mensagens privadas**, porque os dois caminhos nunca se cruzam. Do ponto de
vista do WhatsApp, o comando simplesmente não recebe resposta nenhuma (silencioso pro usuário,
igual pedido no critério de aceite) — só fica um registro de execução com erro dentro do
próprio n8n.

**`jsgrafica_envio_de_msg`:** não encontrei nenhuma chamada saindo do workflow `01` (ou de
qualquer outro dos 8 workflows do projeto) para o webhook desse workflow. Ele só é alcançado
pelo gatilho manual (`When clicking 'Execute workflow'`) — inclusive, reparei que o próprio
gatilho agendado (`Início (Agendado)3`, cron 17:40) e o gatilho de webhook dele já estão **sem
nenhuma conexão de saída no fluxo** (são becos sem saída também) — ou seja, mesmo hoje, com
`active:true`, esses dois gatilhos não disparam envio nenhum sozinhos; só o `Execute workflow`
manual aciona o fluxo de fato. Deixar `active:true` ou `false` não muda esse comportamento nem
afeta o workflow `01` de jeito nenhum — são sistemas desconectados.

### Achado importante, fora do escopo desta demanda, mas descoberto ao investigá-la

Ao mapear o grafo do workflow `01` pra responder a pergunta acima, encontrei uma explicação
provável para o problema da demanda 006 (mensagem de teste que não chega no log) — registrei o
detalhe completo no relato da 006 e um adendo na 009, porque afeta as duas. Resumo: o nó que
loga mensagens privadas (`Merge Log Geral` → ... → `MSG PRIVADA`) só executa **depois** de uma
chamada HTTP síncrona pro webhook do `JSGRAFICA_ATENDIMENTO_AI`, e esse workflow tem uma conexão
quebrada internamente que provavelmente faz essa chamada nunca responder — o que trava a
execução do workflow `01` **antes** de chegar no log, pra mensagens normais de cliente (não
comando). Ou seja, o log pode já estar quebrado hoje, independente de qualquer decisão sobre
`05-GESTAO PRODUTOS`/`jsgrafica_envio_de_msg`.

### O que falta fazer (para quem tiver acesso de escrita)
Desativar os dois toggles `active` na UI do n8n — é literalmente um clique em cada um, sem
precisar editar nenhum nó. Baixo risco, confirmado pela análise acima.

### Testes feitos
Somente leitura: `search_workflows`, `get_workflow_details` (grafo completo de conexões e
parâmetros de nó) dos workflows `01`, `05 - GESTAO PRODUTOS` e `jsgrafica_envio_de_msg`.
Nenhuma alteração em workflow, credential ou configuração.
