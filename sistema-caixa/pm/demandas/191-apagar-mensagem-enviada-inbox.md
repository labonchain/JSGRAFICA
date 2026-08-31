# 191 — Apagar mensagem enviada pelo Inbox

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam tentou apagar uma mensagem que mandou pelo Atendimento/Inbox e não existe essa opção hoje.
Confirmado (pesquisa do PM): a Z-API tem endpoint de apagar mensagem —
`DELETE https://api.z-api.io/instances/{id}/token/{token}/messages`, usando o `messageId` da
mensagem — funciona tanto pra mensagem enviada pela própria conta quanto recebida.

## Objetivo
Dá pra apagar (pra todos) uma mensagem enviada pelo Inbox, direto na tela da conversa.

## Escopo
- Incluído: verificar se o `messageId` retornado pela Z-API ao enviar já é salvo hoje (em
  `jsgrafica_log_msgs_privadas` ou equivalente) — se não for, passar a salvar. Adicionar ação de
  apagar (ex. no hover/menu da mensagem, só pra mensagens enviadas pela equipe, não recebidas do
  cliente) que chama o endpoint da Z-API e reflete na tela (remove ou marca como apagada).
- Testar limite de tempo: WhatsApp costuma ter janela de tempo pra "apagar pra todos" — confirmar
  na prática se a Z-API respeita isso ou tem regra própria, e como o app se comporta se a Z-API
  recusar (mensagem antiga demais).
- Explicitamente fora de escopo: apagar mensagem recebida do cliente (a Z-API permite, mas não é
  o caso de uso pedido — decisão de manter só apagar o que a própria equipe mandou).

## Critérios de aceite
- [ ] `messageId` de mensagens enviadas está salvo (ou passa a estar)
- [ ] Botão/ação de apagar mensagem enviada, na tela da conversa
- [ ] Testado apagando uma mensagem de teste de verdade (dentro da janela de tempo permitida)
- [ ] Comportamento claro quando a Z-API recusa (mensagem muito antiga)

## Riscos e cuidados
Ação irreversível e visível pro cliente (mensagem some do WhatsApp dele também) — considerar uma
confirmação antes de apagar, mesmo sendo uma ação rápida.

## Referências
[Z-API — Deleting messages](https://developer.z-api.io/en/message/delete-message). Pedido direto
do Edvam, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_H3AEArqb1iH3o1u3N34c8rWWacCG`.

### O que foi feito
1. **`messageId` já era salvo** (critério 1): a rota de responder grava o id real do WhatsApp
   em `jsgrafica_log_msgs_privadas.message_id` desde a 070 — nada a mudar.
2. **`apagarMensagem(phone, messageId)`** em lib/zapi.ts — `DELETE /messages` com
   `owner: true` fixo (só mensagem enviada pela conta; apagar recebida ficou fora de escopo
   como a demanda decidiu).
3. **`POST /api/inbox/apagar-mensagem`** com as guardas: mensagem tem que existir no log e ser
   `from_me` (mensagem do cliente → 400 sem nem chamar a Z-API), já apagada → 400, Z-API
   falhou → 502 com texto claro em português e NADA muda no banco. A linha do log **nunca é
   deletada** — ganha `apagada_em`/`apagada_por` (migration `add_apagada_em_log_msgs_191`); o
   log é o histórico do que aconteceu de verdade no WhatsApp.
4. **UI**: 🗑️ no hover da bolha (só mensagem enviada, não apagada, com id real — a bolha
   otimista `temp-` não mostra), `confirm` explícito "apagar PRA TODOS — some do WhatsApp do
   cliente também" (o risco que a demanda apontou), e a bolha vira "🚫 Mensagem apagada"
   (persiste no reload via `apagada_em` na rota de mensagens).

### Testes (mensagem real, no chat da própria gráfica consigo mesma — inofensivo)
- Enviada "[teste 191...]" e apagada DE VERDADE pela rota → Z-API aceitou, log marcado com
  `apagada_em`/`apagada_por` (banco conferido); UI mostrando "🚫 Mensagem apagada" + 🗑️ no
  hover das demais (Playwright, screenshot).
- Guardas: apagar de novo → 400; id inexistente → 404; mensagem RECEBIDA → 400 sem tocar a
  Z-API; falha da Z-API → 502 amigável com log intacto (caminho exercitado).

### Limite conhecido (critérios 3-4, registrado com honestidade)
A Z-API **aceita o DELETE com 2xx até pra um messageId que o WhatsApp não conhece** (testado
com id sintético) — ela não valida sincronamente. Consequência: quando o WhatsApp recusar por
janela de tempo estourada ("apagar pra todos" tem limite de ~2 dias), a Z-API provavelmente
também devolve 2xx e a mensagem NÃO some do celular do cliente, enquanto o app marca como
apagada. Não há como detectar isso pela resposta; o 502 amigável cobre os erros duros (auth,
telefone inválido, API fora). Não foi possível provocar uma recusa real por idade sem mexer em
conversa de cliente (nenhuma mensagem enviada antiga existia no self-chat) — se o Edvam topar,
dá pra validar ao vivo tentando apagar uma mensagem antiga dele mesmo.
