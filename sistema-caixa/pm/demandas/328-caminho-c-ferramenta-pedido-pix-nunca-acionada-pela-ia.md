# 328 - Caminho C: ferramenta de criar pedido/Pix nunca foi acionada pela IA de verdade

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

Achado na varredura completa pedida pelo Edvam em 27/08. Este é provavelmente o achado mais
importante da varredura pro objetivo dele ("mecanismos como pedidos que ainda não foi testado").

## Objetivo
Rodar um teste controlado (número interno) que force uma conversa até o ponto de fechar um
pedido de verdade pelo Caminho C, e confirmar no log (`intermediateSteps`) que
`criar_pedido_aguardando_aprovacao`/`gerar_cobranca_pix` foram chamadas com os parâmetros certos.
Se o teste revelar bug na lógica de pedido/Pix em si (não no roteamento do agente), relatar pro
PM em vez de tentar corrigir fora do domínio (`lib/pedidos.ts`/`lib/mercadopago.ts` são do
03-APP).

## O que foi confirmado

- Demanda 296 (17/08) construiu `criar_pedido_aguardando_aprovacao` e `gerar_cobranca_pix` no
  workflow `296 - JSGRAFICA | CAMINHO C FERRAMENTAS` e testou **chamando o webhook da ferramenta
  diretamente por HTTP** (não pela IA) — um pedido real foi criado e um Pix real de R$1,20 foi
  gerado via Mercado Pago, depois os dados de teste foram apagados. Isso prova que o CÓDIGO da
  ferramenta funciona.
- Demanda 297 (18/08) conectou as ferramentas ao agente de verdade
  (`@n8n/n8n-nodes-langchain.agent`, workflow `297`) e testou as 4 categorias exigidas — mas o
  único exemplo documentado de "a IA aciona a ferramenta" registrado é
  `consultar_preco_produto` (consulta de preço, XEROX COLORIDA A4 R$1,20,
  `pm/demandas/297-caminho-c-workflow-do-agente.md` linha ~118-119). **Nenhum registro mostra a
  própria IA decidindo chamar `criar_pedido_aguardando_aprovacao` ou `gerar_cobranca_pix` numa
  conversa real ou simulada.**
- Varredura em todas as demandas 298 até 325 (incluindo o piloto ao vivo inteiro, 18/08 até hoje)
  procurando `criar_pedido`: **zero ocorrências**. Os achados documentados do piloto (306-309,
  314-325) são todos sobre roteamento, proteção de loop, carregamento de contexto, escalonamento
  e mídia — nenhum toca em criação de pedido/Pix.

## Por que isso importa

O Caminho C está em piloto ao vivo desde 18/08, com ferramentas de código puro desenhadas
especificamente pra nunca deixar a IA inventar preço/Pix. Isso é uma garantia real de correção
SE a ferramenta for chamada. Mas **nunca foi confirmado que a própria IA, raciocinando numa
conversa real (ou até simulada), efetivamente aciona essas duas ferramentas específicas** — só que
o código delas funciona quando chamado direto. Se houver algum problema na forma como a IA decide
chamar essas ferramentas (nome errado, formato de parâmetro que o LLM erra, um guardrail que
bloqueia sem querer, etc.), ninguém saberia até acontecer com um cliente real querendo fechar
pedido pelo WhatsApp.

## Recomendação

Antes de expandir a whitelist pra qualquer cliente real, vale um teste controlado (número interno)
que force uma conversa até o ponto de pedir pra fechar um pedido de verdade, e confirmar no log
(`intermediateSteps`, mesmo mecanismo já usado nas demandas 323/324 hoje) que a ferramenta certa
foi chamada com os parâmetros certos. Prioridade e timing ficam com o Edvam.

## Relato de execução

**O que foi feito**: teste controlado real via webhook de produção (`jsgraficamsgrecebidas`),
telefone interno de sempre (`5521965185667`, nome real "Ninho", nunca fake), forçando uma
conversa de 2 turnos: (1) pergunta de preço ("Quero fazer uma xerox colorida, 5 folhas"), (2)
confirmação explícita pedindo pra fechar e pagar por Pix ("Pode confirmar sim, quero fechar o
pedido e pagar por pix"). Antes do teste, checado e resetado o estado de pré-condição do contato
(`jsgrafica_contatos.atendente` estava `'Edvam'`, o que faria o gate `Contatos: Reivindicar
Atendimento` da demanda 321 falhar e bloquear o agente antes mesmo de processar a mensagem, um
achado à parte não documentado antes) - resetado pra `atendente: null` antes de testar, restaurado
ao valor original depois.

**Testes realizados e resultado**: confirmado com o log de execução real do workflow `297`
(não presumido, não só pelo texto final) que a própria IA, raciocinando na conversa, acionou as 3
ferramentas na sequência certa, com os parâmetros certos:
- Turno 1: `Tool_Consultar_Preco_Produto({produto_nome_ou_id:"xerox colorida A4", quantidade:5})`
  → `{produto_id:"prod-035", valor_final:6}` real, vindo do preço de fonte real
  (`calcularValorPedido`).
- Turno 2: `Tool_Criar_Pedido_Aguardando_Aprovacao({telefone:"5521965185667", produto_id:"prod-035",
  quantidade:5})` → pedido real criado, `ped-3833`. Telefone usado é o real da conversa (não
  inventado, preocupação que a própria demanda 297 tinha levantado).
- Turno 2 (mesmo turno): `Tool_Gerar_Cobranca_Pix({pedido_id:"ped-3833"})` → Pix real gerado via
  Mercado Pago, `mp_order_id: ORD01M12B8E7BN2BFK0JA032Y72Q0`, copia-e-cola válido confirmado no
  banco.

**Conclusão**: a suspeita da varredura (nunca confirmado que a IA aciona essas 2 ferramentas de
verdade numa conversa real, só que o código funciona quando chamado direto) está **descartada**
com evidência real. O caminho completo (consulta de preço → criar pedido → gerar Pix, os 3 na
sequência certa, no mesmo raciocínio de conversa) funciona de ponta a ponta como desenhado.

**Achado à parte, fora do escopo original desta demanda, mas relevante**: o gate `Contatos:
Reivindicar Atendimento` (demanda 321, mecanismo de status compartilhado humano/IA) só deixa o
agente responder se `atendente` estiver nulo ou já for `'Agente Atendimento'` - qualquer contato
com `atendente` preenchido com um nome humano (`'Edvam'`, `'Zu'`, `'Gabi'`) trava o agente
silenciosamente (resposta fixa "bloqueado por humano", sem erro). Isso é o comportamento
INTENCIONAL do mecanismo (evitar a IA responder por cima de um humano já atendendo), não um bug -
mas vale registrar pro PM que qualquer teste futuro no piloto precisa checar esse estado antes,
mesma disciplina que já existe pra sessão de pedido/whitelist.

**Status final**: concluída. Pedido de teste cancelado com motivo preenchido (não só deletado,
`ped-3833`, nunca foi pago de verdade). Log de mensagens de teste apagado (2 linhas de entrada + 2
respostas reais). Contato restaurado ao estado original (`atendente: 'Edvam'`,
`status_atendimento: 'resolvido'`). `206` (91 nodes, ativo) e `jsgrafica_contatos` (nome real
"Ninho" intacto) conferidos no final.
