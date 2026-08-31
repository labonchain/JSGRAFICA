# 202 — Status "aguardando aprovação" + UI de revisão na Fila de impressão

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: 2026-07-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Fase A da automação gradual do atendimento (`pm/OBJETIVOS-MACRO.md`, objetivo 2) — preparação de
baixo risco, **nada é ativado ainda**, só deixa a peça pronta pro futuro agente de WhatsApp usar.
Desenho já decidido pelo Edvam em 2026-07-12/13: quando o agente automático existir (Fase B,
ainda não construída), ele nunca cria pedido direto na esteira — gera um pedido **pendente de
aprovação**, e um humano revisa/aprova antes de qualquer coisa avançar (fluxo estilo "iFood").
Decisão do Edvam sobre onde essa revisão mora: a aba **Fila de impressão** (hoje mostra só
confirmado/em produção, subutilizada) vira também o lugar de aprovar pedido pendente — não cria
aba nova.

## Objetivo
Existe um status de pedido "aguardando aprovação" e uma tela pra revisar/aprovar ou rejeitar esse
tipo de pedido na Fila de impressão — pronto pra ser usado, mas **nada cria pedido nesse status
ainda** (isso é trabalho da Fase B, fora desta demanda).

## Escopo
- Incluído: novo valor de status `aguardando_aprovacao` no enum de status de pedido
  (`STATUS_CFG` em `components/TelaPedidos.tsx`, reaproveitado no Inbox conforme nota da demanda
  071 — mesma fonte única de verdade).
- UI de revisão na Fila de impressão: card de pedido nesse status mostra o que o agente
  "entendeu" (produto/preço/quantidade propostos) com destaque visual de que precisa aprovação
  humana antes de seguir — botões "✓ Aprovar" (avança pro status normal seguinte, ex.
  `confirmado`) e "✕ Rejeitar" (o que acontece ao rejeitar é decisão do executor — documentar:
  cancela o pedido, ou volta pra edição manual, o que fizer mais sentido dado o que já existe).
- Popup de notificação quando um pedido cai em `aguardando_aprovacao` (decisão já tomada pelo
  Edvam em 12/07) — reaproveitar mecanismo de notificação já existente no admin, se houver; se
  não houver nenhum, um indicador visual simples (badge/contador na aba) já cobre o objetivo
  desta demanda — popup completo pode ficar pra quando a Fase B existir de verdade, documentar a
  decisão.
- **Nenhum pedido deve nascer com este status hoje** — é infraestrutura pronta, sem gatilho
  ainda. Testar criando um pedido sintético diretamente nesse status (via API/banco) só pra provar
  que a UI funciona, e apagar depois.
- Explicitamente fora de escopo: qualquer lógica de IA lendo mensagem/criando pedido automático
  (isso é a Fase B, outra demanda, território 01-N8N) — aqui é só a peça do lado do 03-APP.

## Critérios de aceite
- [x] Status `aguardando_aprovacao` existe no enum, com label/cor próprios
- [x] Card na Fila de impressão mostra pedido nesse status com destaque de "precisa aprovação"
- [x] Botão Aprovar avança o pedido normalmente
- [x] Botão Rejeitar tem comportamento definido e documentado
- [x] Nenhum fluxo hoje cria pedido nesse status espontaneamente (só teste manual/sintético)
- [x] Testado com pedido sintético, depois apagado

## Riscos e cuidados
Não conectar em nenhum gatilho automático real — é preparação, a ativação de verdade é decisão
futura separada do Edvam (Fase B, `pm/OBJETIVOS-MACRO.md`).

## Referências
`pm/OBJETIVOS-MACRO.md` (objetivo 2, desenho da Fase 1, checklist Fase A). Demanda 071 (fonte
única de verdade do status de pedido). Demanda 176 (Fila de impressão, card clicável — mesma
tela sendo estendida aqui).

## Relato de execução
Achado durante a implementação: `jsgrafica_pedidos` tem um CHECK constraint no banco
(`status_valido`) restringindo os valores aceitos de `status` — não é só um enum de front-end
(`STATUS_CFG`/`PROXIMO`/`FILTROS`, `TelaPedidos.tsx`), como a demanda parecia sugerir. Sem
adicionar `aguardando_aprovacao` na constraint, NENHUM pedido conseguiria nascer nesse status
(nem o de teste) — o INSERT falharia direto no banco. Migration aplicada
(`status_aguardando_aprovacao`) adicionando o valor à lista existente (`aguardando_confirmacao`,
`aguardando_pix`, `aguardando_arquivo`, `aguardando_equipe_prazo`, `confirmado`, `em_producao`,
`pronto`, `aguardando_retirada`, `entregue`, `cancelado`, `expirado`, `orcamento`).

Mudanças de front-end (`components/TelaPedidos.tsx`):
- `STATUS_CFG`: novo status `aguardando_aprovacao` (label "🤖 Aguardando aprovação", cor fúcsia —
  cor que nenhum outro status usa, de propósito, pra saltar aos olhos que não é um pedido normal
  ainda revisado por humano).
- `PROXIMO`: `aguardando_aprovacao → confirmado` com rótulo "✓ Aprovar" — reaproveita 100% o
  mecanismo de avanço de status já existente (`avancarPara`/`executarAvanco`/PATCH), nenhuma
  lógica nova.
- `FILTROS`: opção "🤖 Aguardando aprovação" na busca de "Todos os pedidos".
- `ABERTOS` (painel "Resumo sem seleção"): incluído, pra um pedido nesse status aparecer no
  panorama geral também, não só na Fila de impressão.
- `fila` (filtro da aba Fila de impressão): passou a incluir `aguardando_aprovacao` — é a
  decisão do Edvam (12/07) de reaproveitar esta aba em vez de criar uma nova.
- `CardFila`: quando `pedido.status === 'aguardando_aprovacao'`, o card ganha fundo/borda fúcsia
  + banner "🤖 Gerado automaticamente — revise antes de aprovar"; o botão de avanço vira verde
  "✓ Aprovar" (em vez do azul padrão); o botão de cancelar vira "✕ Rejeitar" (borda mais grossa,
  mais visível que o "✕" pequeno do caso comum).

**Decisão sobre "Rejeitar"** (pedida explicitamente pra documentar): reaproveita o `cancelar()`
já existente do `CardFila` — mesmo mecanismo de sempre (`PATCH status=cancelado`, com motivo +
histórico quando já pago, simples confirm() quando não). Optei por CANCELAR (não "voltar pra
edição manual") porque: (1) reaproveita 100% de infraestrutura já testada, sem inventar um novo
estado "rascunho editável" que não existe hoje pra pedido nenhum; (2) como nada cria pedido
nesse status ainda (Fase B não existe), qualquer pedido de teste rejeitado deve mesmo
desaparecer da esteira, que é exatamente o que cancelar faz; (3) se a Fase B revelar que "editar
manualmente em vez de cancelar" é o comportamento certo quando existir de verdade, essa é uma
decisão de produto pra revisitar então, com dado real — não agora, especulando.

**Decisão sobre popup de notificação**: NÃO construí popup nenhum. A demanda já permitia essa
saída ("se não houver [mecanismo de notificação], indicador visual simples já cobre"). Não existe
nenhum mecanismo de notificação/toast no admin hoje (procurei — só alertas de erro pontuais via
`alert()` nativo em ações específicas, nada genérico pra "avisar sobre novo evento"). O indicador
que já existia (badge numérico na aba "🖨️ Fila de impressão", que soma `fila.length`) agora
JÁ inclui pedidos `aguardando_aprovacao` automaticamente, sem nenhuma mudança adicional — cobre o
objetivo desta demanda. Popup completo fica pra quando a Fase B existir de verdade (aí sim
justifica o esforço, com uso real).

**Nada cria pedido neste status hoje** — confirmado por leitura de todo `app/api/pedidos/route.ts`
(POST) e `lib/supabase-admin.ts`: toda criação de pedido usa `aguardando_confirmacao`,
`confirmado`, ou os status normais existentes; nenhum caminho novo foi adicionado que gere
`aguardando_aprovacao` — é 100% infraestrutura pronta pra a Fase B (outra demanda, território
01-N8N) usar quando existir.

Teste: criei 2 pedidos sintéticos direto no Supabase com `status='aguardando_aprovacao'`
(`teste-202-aguardando-aprovacao`, `teste-202-rejeitar`) — confirmei visualmente (Playwright,
print em anexo) que ambos aparecem na Fila de impressão com o destaque fúcsia, banner, e os 2
botões. Cliquei "✓ Aprovar" no primeiro — virou `confirmado`, saiu do destaque fúcsia, card
voltou ao visual normal (confirmado via SQL antes de apagar). Cliquei "✕ Rejeitar" no segundo —
virou `cancelado`, sumiu da fila. Os 2 pedidos sintéticos foram apagados do banco ao final.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_2mJKRzCPbyH69AKGJLVFHjqVVn72`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.
