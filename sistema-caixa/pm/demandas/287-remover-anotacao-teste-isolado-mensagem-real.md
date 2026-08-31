# 287 — Tirar a anotação "(mensagem de teste isolado, demanda 206)" das mensagens reais

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado pela demanda 286, fora do escopo dela (só corrigiu a pontuação, não o conteúdo): toda
mensagem que o workflow `206` manda de verdade pro cliente ainda carrega, no final, a anotação
`"(mensagem de teste isolado, demanda 206)"`. Isso fazia sentido quando o workflow só falava com
o número do próprio Edvam, em teste isolado (demandas 206-272). Mas desde a demanda 274, o `206`
está conectado ao roteamento real e responde qualquer telefone autorizado — **inclusive cliente
real, se/quando o Edvam autorizar um** (painel das demandas 275/276). Hoje, literalmente todo
mundo que recebe resposta do agente vê essa anotação de teste na mensagem, o que passaria uma
impressão ruim/confusa pra um cliente de verdade.

## Objetivo
Nenhuma mensagem real do `206` carrega anotação de "teste isolado" — o texto fica só com o
conteúdo de verdade que faz sentido pro cliente ler.

## Escopo
- Incluído: remover a anotação `(mensagem de teste isolado, demanda 206)` de todas as mensagens
  reais do workflow `206` — os mesmos 6 nodes que a demanda 286 já mapeou (`Enviar Lista
  Categorias`, `Montar Proposta`, `Montar Envio Confirmação`, `Montar Envio Pedido Criado`,
  `Montar Envio Negada`, `Montar Envio Categoria`).
- Incluído: testar com mensagem real (mesmo padrão de teste seguro da demanda 283) confirmando
  que a mensagem sai limpa, sem a anotação.
- Explicitamente fora de escopo: qualquer outra mudança de conteúdo além de tirar essa anotação
  específica — não é oportunidade pra reescrever mais nada.

## Critérios de aceite
- [x] Anotação removida dos 6 nodes, testado com mensagem real
- [x] Nenhuma outra mudança de conteúdo nas mensagens

## Riscos e cuidados
Mesma disciplina de sempre — texto que vai pro cliente de verdade, testar com cuidado. Seguir o
checklist de limpeza pós-teste da demanda 283 (conferir `jsgrafica_contatos` antes/depois).

## Referências
Demanda 286 (achado original, `pm/demandas/286-*.md`). Demanda 274 (conexão real que tornou essa
anotação inadequada). Demanda 283 (payload seguro de teste a reutilizar).

## Relato de execução

Executado em 2026-08-16, no workflow `206`. Backup antes de mexer:
`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda287_2026-08-16.json` (84 nodes).

### Correção
Removida a string `" (mensagem de teste isolado, demanda 206)"` (o espaço antes do parêntese
incluso) dos 6 nodes mapeados pela demanda 286: `Enviar Lista Categorias`, `Montar Proposta`,
`Montar Envio Confirmação`, `Montar Envio Pedido Criado`, `Montar Envio Negada`, `Montar Envio
Categoria`. Troca mecânica e exata (a mesma string idêntica nos 6 lugares), sem tocar em mais
nenhuma parte do texto. Confirmado por busca automatizada no JSON inteiro do workflow: `0`
ocorrências restantes de "teste isolado" em qualquer node.

### Testado com mensagem real
Payload seguro da demanda 283 (`chatLid` real, nomes reais), 2 casos:
- **Texto ambíguo** ("Olá, vocês fazem panfletos?"): `Enviar Lista Categorias` rodou com sucesso,
  envio real confirmado (`zaapId: 01A00C33F61E76E5921BB7F151BD7D03`).
- **Texto objetivo** ("Preciso de 50 cópias de xerox em P&B, frente e verso"): `Montar Proposta`
  gerou a mensagem `"Recebi seu arquivo! Pelo que vi, é IMPRESSÃO P&B A4 (1 unidade), fica *R$
  1.20*. Confirma?"` (texto exato extraído da execução real), sem a anotação, terminando
  naturalmente na pergunta; `Enviar Proposta Botões` confirmou envio real (`zaapId:
  01A00C3830A27DBFBB8A1E3B4F7620D5`).

Não testei os outros 4 nodes (`Montar Envio Confirmação`/`Pedido Criado`/`Negada`/`Categoria`)
com disparo real ponta a ponta nesta rodada porque exigiriam simular mídia real ou fluxos de
confirmação/negação de proposta (mais setup), mas a correção neles é a mesma troca mecânica de
string, sem lógica condicional envolvida; conferido visualmente no JSON deployado que a mesma
substituição foi aplicada corretamente nos 4.

### Checklist da demanda 283 seguido
`jsgrafica_contatos` conferido antes e depois: `contact_lid`, `lead_name`, `lead_chat_name`
continuam corretos (`52063694233823@lid`, "Ninho", "Ninho"). Sessões de teste e log de mensagens
apagados ao final.

### Diff final
Contra o backup pré-287: `0` nodes adicionados/removidos, `6` nodes com mudança (só o texto, a
string exata mapeada pela 286), `0` conexões alteradas.
