# 073 — Mensagens automáticas de pedido (046/062) viram rascunho na caixa de resposta, não envio direto

Status: aprovada — liberada pra execução (2026-07-07)
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

**Nota de agendamento (2026-07-06):** Edvam pediu pra NÃO executar naquele momento — Zu/Gabi
estavam em atendimento real na gráfica, e essa mudança altera o fluxo de pedido no meio da
operação. **Liberada em 2026-07-07** — confirmado com o Edvam que agora é hora segura pra
executar. Executar em seguida a demanda 076 (múltiplos produtos no pedido do Inbox), que
depende desta.

## Contexto
Primeiro dia de operação real: Gabi criou um pedido de verdade (cliente "Reginaldo Nascimento")
e avançou o status, e as 3 mensagens automáticas das demandas 046/062 (confirmação, entrou em
produção, pronto pra retirada) foram enviadas **direto pro cliente**, sem nenhuma revisão humana
— exatamente como essas demandas foram construídas e testadas ao longo da sessão.

Vendo isso acontecer com um cliente real, o Edvam corrigiu a intenção: **a ideia nunca foi
enviar direto** — é gerar o texto pronto **na caixa de resposta**, pra equipe revisar/editar se
precisar e mandar na mão. Mesmo princípio já usado na sugestão de resposta por IA (demanda 048:
"não é automático, é botão que a equipe decide se manda"), agora estendido pras mensagens de
pedido também.

Decisão do Edvam sobre o caso em que o status muda pela aba "Pedidos" (sem conversa aberta,
sem caixa de resposta visível): a mensagem fica pendente, e aparece pronta na caixa de resposta
assim que alguém abrir a conversa daquele contato no Inbox — não obriga trocar de tela nem
trava a aba Pedidos.

## Objetivo
Nenhuma mensagem de pedido (confirmação, Pix, aviso de status) é enviada automaticamente pro
cliente. Em vez disso, o texto aparece pronto na caixa de resposta da conversa — a equipe decide
se edita e manda.

## Escopo
- Incluído:
  1. Em `app/api/pedidos/route.ts` (POST com `produtoId`, mensagem de confirmação/Pix da 062) e
     no ponto que dispara aviso de mudança de status (PATCH, demanda 046): trocar a chamada direta
     de `enviarMensagem()` + `registrarMensagemEnviada()` por **gravar o texto como rascunho
     pendente** associado ao telefone do contato (não enviar nada, não logar como `from_me`).
  2. Quando a conversa desse contato for aberta no Inbox (`TelaInbox.tsx`), se houver rascunho(s)
     pendente(s) pra esse telefone, pré-preencher a caixa de resposta com o texto (se houver mais
     de 1 rascunho acumulado — ex.: pedido criado e avançado 2x antes de alguém abrir a conversa —
     concatenar em ordem, separado por linha em branco, num texto só).
  3. Ao enviar essa mensagem pela caixa de resposta (fluxo normal já existente,
     `app/api/inbox/responder`), limpar o(s) rascunho(s) pendente(s) daquele contato.
  4. Escolher onde guardar o rascunho pendente (ex.: nova coluna em `jsgrafica_contatos` ou tabela
     pequena separada) — decisão técnica do 03-APP, desde que sobreviva a reload de página e não
     dependa de estado só no navegador.
- Fora de escopo: mudar a sugestão de resposta por IA (048) ou o resumo de conversa (048/063) —
  já funcionam do jeito certo (geram, não enviam). Mudar a lógica de quando cada mensagem é gerada
  (isso já está definido nas demandas 046/062, só muda o destino: rascunho em vez de envio).

## Critérios de aceite
- [ ] Criar pedido (com telefone real, Inbox) não envia nada automaticamente — texto de
      confirmação (+ Pix se exigir) aparece na caixa de resposta quando a conversa for aberta
- [ ] Avançar status do pedido (de qualquer lugar — Inbox ou aba Pedidos) não envia nada
      automaticamente — texto aparece na caixa de resposta quando a conversa for aberta
- [ ] Testado o caso de 2+ mudanças de status acontecerem antes de abrir a conversa — os textos
      aparecem concatenados, não perdidos nem sobrescritos
- [ ] Enviar a mensagem pela caixa de resposta funciona normal (fluxo já existente) e limpa o
      rascunho pendente

## Riscos e cuidados
Essa é uma mudança de comportamento de duas demandas já concluídas e testadas (046, 062) — não é
bug, é correção de intenção depois de ver funcionando com cliente real. Testar com cuidado pra não
regredir o envio manual normal (resposta de texto simples, sem pedido envolvido), que continua
devendo funcionar exatamente como hoje.

## Referências
`app/api/pedidos/route.ts` (POST e PATCH, pontos que hoje enviam automático). `lib/pedidos.ts`
(`montarMensagensConfirmacaoPedido`). `components/TelaInbox.tsx` (caixa de resposta, pré-
preenchimento já existe pro botão de sugestão de IA — reaproveitar o mesmo padrão). Demandas 046 e
062 (comportamento original a ser alterado).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. Nova tabela `jsgrafica_rascunhos_pedido` (`id`, `telefone`, `mensagem`, `created_at`, RLS
     ativa sem política — só `supabaseAdmin` acessa, mesmo padrão de segurança das outras
     tabelas). Escolhida em vez de uma coluna em `jsgrafica_contatos` porque um telefone pode
     acumular 2+ rascunhos (pedido criado e avançado de status antes de alguém abrir a conversa)
     e uma tabela própria deixa ordenar/concatenar/limpar trivial.
  2. Novos helpers em `lib/supabase-admin.ts`: `gravarRascunhosPedido(telefone, mensagens[])`,
     `buscarRascunhoPedido(telefone)` (concatena em ordem de criação, separado por linha em
     branco) e `limparRascunhoPedido(telefone)`.
  3. `app/api/pedidos/route.ts`: nos dois pontos que hoje enviavam direto
     (`enviarMensagem`+`registrarMensagemEnviada` — confirmação/Pix da 062 no POST com
     `produtoId`, aviso de status da 046 no PATCH), trocado por `gravarRascunhosPedido()`. Imports
     de `lib/zapi`/`lib/inboxLog` removidos desse arquivo (sem mais nenhum uso nele).
  4. Nova rota `app/api/inbox/rascunho-pedido` (GET `?phone=`) — `TelaInbox.tsx` não pode importar
     `lib/supabase-admin.ts` diretamente (client component).
  5. `TelaInbox.tsx`: novo `useEffect` disparado por `phoneAtivo` que busca o rascunho e, se
     existir, chama `setReply()` — mesmo padrão de pré-preenchimento já usado pelo botão de
     sugestão de IA (048). Só preenche se houver rascunho; não mexe no campo se não houver
     (comportamento de troca de conversa sem rascunho continua igual a antes).
  6. `app/api/inbox/responder/route.ts` (POST): depois de logar o envio, chama
     `limparRascunhoPedido(phone)` — limpa sempre que uma mensagem é enviada por esse telefone
     pela caixa de resposta, mesmo que o operador tenha editado o texto (o rascunho já cumpriu o
     papel de dar o texto pronto pra revisão).
- Testes realizados e resultado:
  Com o contato de teste real "Edvan Filho" (`5521965185667`): criado 1 pedido via
  `POST /api/pedidos` (produto sem Pix) — confirmado que **nenhuma mensagem foi enviada** (sem
  chamada à Z-API) e que `GET /api/inbox/rascunho-pedido?phone=...` retornou o texto de
  confirmação certo. Avançado o status 2x (`em_producao`, `pronto`) via PATCH — confirmado que os
  3 textos (confirmação + 2 avisos) ficaram concatenados em ordem, separados por linha em branco,
  sem perder nenhum. Testado via Playwright: abrir a conversa desse contato no Inbox pré-preencheu
  a caixa de resposta com o texto concatenado certinho (achado no processo: existem 2 contatos
  "Edvan Filho" na base — um por `@lid`, outro pelo telefone real, duplicata já conhecida das
  demandas 029/038 — tive que buscar pelo telefone pra abrir a conversa certa no teste). Enviado
  de verdade pela caixa de resposta (Z-API real) — mensagem chegou (status `DELIVERED` no log) e o
  rascunho foi limpo depois (`GET` voltou a retornar `null`). `npx tsc --noEmit` e `npm run build`
  rodaram limpos antes do deploy. Deploy em produção: `npx vercel --prod --yes` →
  `dpl_DwLGXBdUDCpHmsbG7Uu4dHfRoUmD`, reconfirmado com `/api/inbox/rascunho-pedido` respondendo em
  produção. Pedido e mensagem de teste apagados do Supabase depois.
- Achados fora do escopo:
  Confirmado (não investigado a fundo, já documentado nas demandas 029/038) que o contato "Edvan
  Filho" tem 2 entradas na lista do Inbox — uma pelo `@lid`, outra pelo telefone real — mesmo
  problema de duplicata de contato já conhecido, sem relação com esta demanda além de ter
  atrapalhado o teste inicialmente.
- Status final: concluída.
