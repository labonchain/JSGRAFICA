# 046 — Avançar status do pedido com aviso automático ao cliente

Status: aprovada — depende da 045 (precisa existir pedido pra ter status pra avançar)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Continuação da demanda 045. Mockup aprovado por Edvam:
`https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb`. Decisão de produto
importante (equipe com pouca familiaridade com sistemas): **um botão só de "avançar"**, não 4
botões nem quadro com colunas pra arrastar — o atendente clica uma vez, o sistema decide qual é
o próximo status.

## Objetivo
O atendente avança o status do pedido com um clique, e o cliente recebe automaticamente uma
mensagem de template avisando (sem a IA decidir o texto — é sempre o mesmo texto fixo por
status).

## Escopo
- Incluído:
  1. No card de pedido do painel direito (criado na 045), mostrar uma barra de progresso simples
     (Confirmado → Em produção → Pronto → Entregue) e um único botão "Avançar → [próximo
     status]".
  2. Ao clicar: `UPDATE jsgrafica_pedidos` (status + o timestamp correspondente —
     `data_producao_at`/`data_pronto_at`/`data_entregue_at`, campos que já existem na tabela) e
     dispara `POST /send-text` na Z-API pro telefone do pedido, com o texto fixo daquele status:
     - → Em produção: "Seu pedido (nome do serviço) entrou em produção! 🖨️"
     - → Pronto: "Prontinho! Seu pedido já está pronto pra retirada 😊"
     - → Entregue: sem mensagem (transição só interna, não faz sentido avisar o cliente que ele
       mesmo já retirou)
  3. A mensagem enviada precisa ser logada do mesmo jeito que qualquer envio manual do Inbox já
     é logado hoje (mesma rota/mecanismo, não inventar um caminho novo de logging).
  4. Aba "Pedidos" (já existe no admin) — trocar o quadro/kanban (se for isso que tem hoje) por
     uma lista simples, um botão de avançar por linha — mesma lógica do painel do Inbox, só numa
     tela dedicada pra ver todos os pedidos de uma vez.
- Fora de escopo: lembrete de Pix pendente (isso é a 047, workflow separado); qualquer
  personalização de texto por IA (mensagens são sempre fixas, sem variação).

## Critérios de aceite
- [ ] Botão único avança pro próximo status certo (não pula etapa, não deixa escolher status
      errado)
- [ ] Mensagem de template chega no WhatsApp do cliente ao avançar pra "Em produção" e "Pronto"
- [ ] Mensagem aparece no Inbox como qualquer outra mensagem enviada (mesmo padrão de log)
- [ ] Aba "Pedidos" reflete o mesmo mecanismo (lista simples, não quadro pra arrastar)
- [ ] Testado com um pedido real (criado via demanda 045) avançando os 3 status

## Riscos e cuidados
Evitar mandar mensagem duplicada se o atendente clicar duas vezes rápido no botão — desabilitar
o botão (ou dar feedback visual) assim que clicado, até a resposta da API voltar.

## Referências
Mockup: `https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb`. Demanda 045
(dependência). Tabela `jsgrafica_pedidos` (campos `status`, `data_producao_at`, `data_pronto_at`,
`data_entregue_at`). Mensagens de referência: nós "AVISAR CLIENTE PEDIDO CRIADO"/"ENVIAR PIX
CLIENTE" do workflow `06-PEDIDOS` (mesmo tom, não copiar literal se não fizer sentido).

## Relato de execução

### O que foi feito
**Achado antes de codar**: a aba "Pedidos" do admin (`components/TelaPedidos.tsx`) e a rota
`app/api/pedidos/route.ts` já existiam no repo (provavelmente escritas antes desta sessão), mas
`jsgrafica_pedidos` tinha 0 linhas porque nada gravava pedidos reais ainda — é o que a 045
resolveu. Além disso, a aba "Pedidos" **já era uma lista simples** (não kanban/drag-and-drop):
`PainelDetalhe`/`CardFila` já tinham um único botão "avançar" que decide o próximo status
sozinho, exatamente o padrão pedido nesta demanda. Ou seja, boa parte do critério de aceite
"lista simples, um botão por linha" **já estava pronto** — o que faltava de verdade era o aviso
automático ao cliente, que o `PATCH` existente não fazia (só atualizava `status` e o timestamp).

Estendi `app/api/pedidos/route.ts`:
- `PATCH` agora busca `telefone`/`servico_nome` do pedido antes de atualizar, aplica o
  `UPDATE` (status + campo de timestamp, lógica que já existia), e — se o novo status tiver
  template (`em_producao`/`pronto`) e o telefone for numérico de verdade (não `'balcao'`, usado
  pela fila de impressão do PDV) — dispara `enviarMensagem` (Z-API) com o texto fixo e loga via
  `registrarMensagemEnviada` (`lib/inboxLog.ts`, extraída do `/api/inbox/responder` na 045 —
  **mesmo mecanismo de log que qualquer envio manual usa**, não um caminho novo). Falha no envio
  não derruba a resposta do PATCH (o status já foi salvo; só o aviso que não saiu — logado no
  console do servidor).
- Textos fixos, sem IA: "Seu pedido (X) entrou em produção! 🖨️" / "Prontinho! Seu pedido já está
  pronto pra retirada 😊" / nada em "entregue".
- `TelaPedidos.tsx`: só troquei o PATCH pra mandar `operador: operador.nome` junto (a prop já
  existia, só não era usada) — usada como fallback pra criar contato novo caso a Z-API precise
  registrar um telefone ainda não cadastrado.
- `components/TelaInbox.tsx`: card de pedido (criado na 045) ganhou a barra de progresso
  (Confirmado → Em produção → Pronto → Entregue) e o botão único "Avançar → [próximo status]",
  desabilitado durante a chamada (`avancandoPedido`) — evita duplo clique/duplo envio.

### Testes realizados e resultado
- `npx tsc --noEmit` / `npm run build` — limpos.
- Fluxo completo via `curl` com telefone sintético (`550000000001`, não é WhatsApp real):
  confirmado → em_producao → pronto → entregue. Confirmei no banco (`jsgrafica_log_msgs_privadas`)
  que os textos certos foram logados nos dois primeiros avanços e **nenhuma mensagem foi gravada
  no avanço pra "entregue"** (comportamento esperado). Timestamps (`data_producao_at`,
  `data_pronto_at`, `data_entregue_at`) todos batendo com o horário real do PATCH.
- **Testado na UI real** (Playwright, conversa "Sr. Oliveira"): depois de criar o pedido (teste
  da 045), o card mostrou a barra de progresso com "Confirmado" ✓ e "Em produção" como próximo, e
  o botão "Avançar → Em produção" com o aviso "Ao avançar, o cliente recebe um aviso automático"
  — **não cliquei nesse botão nessa conversa real** (a Z-API está de fato conectada agora,
  confirmei via `/api/zapi/status`, então clicar teria mandado uma mensagem de verdade pro celular
  do Sr. Oliveira; isso não é um teste que eu devesse rodar sem autorização explícita). A lógica
  do clique já foi validada de ponta a ponta com o telefone sintético acima.
- Confirmei que a aba "Pedidos" do admin ainda renderiza normal depois da mudança (screenshot).
- Todo pedido/log/contato de teste foi apagado do banco depois (`ped-0003`, `ped-0004`,
  `ped-0005`, contatos/logs de `550000000001`/`550000000002`) — nenhum dado de mentira ficou em
  produção.

### Achados fora do escopo
- Ver relato da 045 — o bug crítico de `lib/zapi.ts` (RLS sem política em
  `jsgrafica_agent_config`, quebrava toda a Z-API silenciosamente desde a demanda 025) foi
  corrigido lá porque bloqueava diretamente o critério de aceite desta demanda ("mensagem chega
  no WhatsApp do cliente") — sem esse fix, `enviarMensagem` nunca teria funcionado aqui.
- **Recomendo um teste real controlado antes de considerar 046 100% validada end-to-end**: eu
  validei o envio/log/timestamp com telefone sintético e a UI até o ponto do clique, mas não
  cliquei "Avançar" numa conversa de cliente real (ver acima) — vale o Edvam ou alguém da equipe
  clicar uma vez num pedido de teste com o próprio número, só pra confirmar que a mensagem chega
  mesmo no aparelho.
- Não toquei na "fila de impressão" (view "fila" de `TelaPedidos.tsx`) além de garantir que ela
  usa o mesmo `mudarStatus`/PATCH — já reaproveita o mesmo botão único, sem mudança necessária.

### Status final
Concluída, testada (local + parcialmente em produção, ver ressalva acima) e deployada junto com
a 045 — `dpl_64fbuKP9ogvmu8CU2XWdaHwniR7g`.
