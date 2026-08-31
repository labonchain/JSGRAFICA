# 306 - CHECK SESSAO PEDIDO trava cliente real no 06-PEDIDOS morto, sem resposta nenhuma

Status: concluída
Criada em: 2026-08-18
Aprovada em: 2026-08-18
Chat executor: 01 - N8N JS GRAFICA
Concluída em: 2026-08-18

**Decisão do Edvam (2026-08-18)**: seguir a opção (b) do "Por que não foi corrigido agora" - o
`CHECK SESSAO PEDIDO` passa a checar se o destino (`06-PEDIDOS` ou qualquer workflow pra onde ele
rotear) está vivo/ativo antes de mandar a mensagem pra lá; se não estiver, cai pro atendimento
normal em vez de travar em silêncio. Resolve o caso de hoje (441 telefones presos) e protege contra
o mesmo tipo de falha silenciosa se outro workflow for desativado no futuro.

## Contexto
Achado durante a demanda 299 (conectar o agente Caminho C no roteamento real do `01`), fora do
escopo dela. Ao testar com o telefone de teste de sempre, a mensagem foi engolida pelo webhook
`jsgraficapedidos`, que está morto desde que a demanda 303 desativou o workflow `06 - JSGRAFICA |
PEDIDOS` (decisão do Edvam, depois do incidente de outra equipe LabOnchain reativando nodes de
envio por engano). O motivo: o node `CHECK SESSAO PEDIDO` do `01` le a ULTIMA linha de
`jsgrafica_memoria_conversas` pro telefone e, se `fase_jornada` estiver numa lista de fases
"ativas" (`coleta_specs_pedido`, `perguntar_pagamento`, `aguardando_confirmacao_pedido`,
`aguardando_pix`) OU `origem` for `'06-pedidos'`, manda TODA mensagem nova desse telefone direto
pro `06-PEDIDOS`, sem checar se esse workflow ainda existe ou está ativo. Isso e uma decisao
tomada antes da 303 desativar o `06-PEDIDOS`, nunca revisada depois.

Quando o `06-PEDIDOS` esta morto, isso vira falha silenciosa: a execução do `01` erra
(`"The requested webhook \"POST jsgraficapedidos\" is not registered."`) e o cliente NAO recebe
resposta nenhuma - nem erro, nem mensagem de fallback, nada.

## Tamanho real do risco (medido em produção, não estimado)
- 441 telefones tem, como ULTIMA linha registrada em `jsgrafica_memoria_conversas`, uma fase de
  pedido ativa ou `origem='06-pedidos'` - ou seja, qualquer mensagem nova desses telefones cai
  nessa armadilha hoje.
- Desses, 112 tiveram essa ultima linha registrada nos últimos 7 dias - risco atual, não so
  residuo historico antigo.
- Não é um numero pequeno nem um caso isolado de teste: é o comportamento padrão pra qualquer
  cliente que chegou a interagir com o fluxo de pedido e cuja sessão nunca foi fechada
  (`fase_jornada` nunca reseta pra fora da lista de "ativas" depois que o pedido termina, seja com
  sucesso ou abandono).

## Por que não foi corrigido agora
Fora do escopo da demanda 299 (que é sobre o agente Caminho C, não sobre `06-PEDIDOS`/`01`).
Corrigir exige uma decisão de produto, não só técnica: reativar `06-PEDIDOS` (revertendo a decisão
da 303, que teve motivo real de segurança) NÃO é a única opção nem necessariamente a certa -
alternativas possíveis: (a) `CHECK SESSAO PEDIDO` passa a expirar/resetar sessão de pedido depois
de um tempo sem atividade, (b) `CHECK SESSAO PEDIDO` verifica se `06-PEDIDOS` está vivo antes de
rotear pra ele e cai pro atendimento normal se não estiver, (c) alguma combinação das duas. Decisão
do Edvam, não do executor.

## Objetivo
Nenhum cliente real fica sem resposta por causa de uma sessão de pedido travada apontando pra um
workflow desativado.

## Critérios de aceite
- [x] Decisão tomada: `CHECK SESSAO PEDIDO` checa se o destino está vivo antes de rotear pra ele
- [x] Nenhuma mensagem nova de cliente cai mais num destino morto sem fallback
- [x] Testado com sessão de pedido real (fase ativa) simulando o `06-PEDIDOS` fora do ar (situação
      real de hoje, não precisa nem simular)
- [x] Confirmado que os 112 telefones com atividade recente (7 dias) voltam a receber resposta
      normal na próxima mensagem que mandarem (via a mesma correção, aplicada de forma genérica,
      não telefone por telefone)

## Referências
Demanda 303 (desativação do `06-PEDIDOS`). Demanda 299 (onde o achado apareceu, mesmo dia). Node
`CHECK SESSAO PEDIDO` do workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (`lcFEt1kbyqNfTS89`).

## Relato de execução

- O que foi feito: no workflow `01` (`lcFEt1kbyqNfTS89`), 3 nodes novos entre `AJUSTAR DESTINO
  AGENTE FASE B` e `Switch Destino` (nenhum node existente alterado nessa parte): `E Destino
  Pedidos?` (IF, só segue se `_destino==='pedidos'` - qualquer outra mensagem passa direto pro
  `Switch Destino` de sempre, sem custo extra), `Verificar 06-PEDIDOS Vivo` (HTTP GET real na API
  do próprio n8n, `GET /api/v1/workflows/WDOixH8LKyh0DDGq`, checa `active`; credencial nova
  `httpHeaderAuth` criada só pra isso, valor nunca exposto em texto), `Aplicar Fallback Se Destino
  Morto` (Code: se `active !== true`, trata a mensagem exatamente como se não houvesse sessão de
  pedido nenhuma - mesma regra de elegibilidade que qualquer mensagem sem sessão usa hoje, autorizado
  + mídia sem legenda/texto puro vira `agente_fase_b`, senão `atendimento` normal). Reversível: só
  desconectar essas 3 conexões novas.
- Achado adicional durante o teste, corrigido na mesma demanda (não estava no diagnóstico original):
  o 1º teste real mostrou que a checagem nem chegava a rodar pra telefone NÃO autorizado no painel
  Fase B (que é o caso de praticamente todo cliente real, já que a whitelist hoje só tem número
  interno/teste) - `GET Telefone Autorizado (Fase B)` (consulta Supabase) devolve 0 linhas pra
  quem não está na lista, e sem `alwaysOutputData` isso faz TODOS os nodes seguintes (incluindo
  `AJUSTAR DESTINO AGENTE FASE B` e, por consequência, a checagem nova) simplesmente não rodar -
  mesmo bug de plataforma já documentado na demanda 296, aqui achado numa consulta diferente.
  Corrigido setando `alwaysOutputData: true` nesse node (1 único parâmetro mudado, mesma técnica
  já usada na 296). Sem esse 2º ajuste, a correção principal desta demanda não protegeria os 441
  telefones reais, só telefones internos/teste - ficaria "corrigido" só na aparência.
- Testes realizados e resultado: 3 testes reais, cada um confirmado pelo log de execução real do
  n8n (não só pelo texto), usando o `06-PEDIDOS` genuinamente fora do ar (nenhuma simulação
  precisou ser inventada, é o estado real de hoje). (1) Telefone de teste autorizado com sessão de
  pedido travada: `Verificar 06-PEDIDOS Vivo` confirmou `active:false`, `Aplicar Fallback` decidiu
  `agente_fase_b` (autorizado + texto puro), `HTTP 06-PEDIDOS` não rodou, `HTTP Agente Caminho C`
  respondeu de verdade ("Chamando a equipe", zaapId confirmado). (2) Mesmo telefone temporariamente
  desautorizado no painel (`ativo:false`, restaurado a `true` logo em seguida) com a mesma sessão
  travada, simulando fielmente um cliente real não autorizado: `GET Telefone Autorizado` passou a
  emitir 1 item vazio em vez de 0 (fix do achado acima confirmado funcionando), `AJUSTAR DESTINO`
  rodou, `autorizado` calculado corretamente como falso, caiu pro `atendimento` normal
  (`HTTP Request` → `JSGRAFICA_ATENDIMENTO_AI`, mesmo caminho que qualquer mensagem comum usa
  hoje), `HTTP 06-PEDIDOS` não rodou. Crucial: `MSG PRIVADA` (log do Inbox) também rodou nesse
  teste - antes desta correção, a execução inteira dava erro e morria antes de logar a mensagem no
  Inbox, então nem o time via a mensagem pra responder manualmente; agora ela fica visível mesmo
  quando não há resposta automática. (3) Regressão: mensagens comuns (sem sessão de pedido) de
  tráfego real continuaram passando pelo ramo `false` do IF novo sem nenhuma mudança de
  comportamento, confirmado em várias execuções reais concorrentes durante os testes, todas
  `status: success`.
- Achados fora do escopo (relatados, não resolvidos por conta própria): nenhum novo. O achado do
  `alwaysOutputData` foi resolvido dentro desta mesma demanda por ser pré-requisito direto pra ela
  funcionar de verdade pros clientes reais que o critério de aceite pede, não um achado separado.
- Status final: concluída. Dado de teste limpo (2 linhas de `jsgrafica_memoria_conversas`
  apagadas), whitelist do telefone de teste restaurada (`ativo:true`), `206` (91 nodes, ativo) e
  `jsgrafica_contatos` (nome real "Ninho" intacto) conferidos no final.
