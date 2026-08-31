# 119 — Inbox: remover bloco "Status do atendimento" do painel, Pedidos assume a coluna inteira

Status: concluída — deployada em produção
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Correção em cima das demandas 114/116, depois do Edvam ver a tela real em produção (print
anexado à conversa). Ele apontou o bloco inteiro "Status do atendimento" (Aberto/Em
atendimento/Resolvido, "Atendente: X", "Histórico de atendimento", botão "Resumir conversa") pra
sair do painel direito — o status já aparece em cada conversa na lista da esquerda (badge
colorido por linha), então repetir no painel é redundante. Com o bloco fora, o card de
pedido(s) da conversa passa a ocupar a coluna inteira.

**Pergunta feita ao Edvam sobre onde fica o controle de marcar "Resolvido"** (não existe nada
automático pra isso, diferente de "Em atendimento" que a 114 já assume sozinho ao abrir a
conversa): ele sugeriu **"na barra de cima do chat"** — mesmo lugar onde já ficam os botões
"Reabrir"/"Arquivar" (cabeçalho da conversa, ao lado do nome do contato).

## Objetivo
Painel direito do Inbox mostra só o(s) pedido(s) da conversa, ocupando o espaço todo. O controle
de status (principalmente "Resolvido", que ainda precisa de ação manual) fica compacto no
cabeçalho da conversa, não mais como bloco lateral. Histórico de quem atendeu sai do Inbox e
aparece na tela Clientes.

## Escopo
- Incluído:
  1. Remover do painel direito do Inbox (`TelaInbox.tsx`) o bloco inteiro: badges de status
     Aberto/Em atendimento/Resolvido, linha "Atendente: X", "Histórico de atendimento", botão
     "Resumir conversa" (demanda 048).
  2. Card de pedido(s) da conversa (já existente, demanda 116) passa a ocupar toda a altura/
     largura disponível no painel direito, sem o bloco de status acima dele.
  3. **Controle de status compacto no cabeçalho da conversa** — ao lado (ou próximo) dos botões
     já existentes "Reabrir"/"Arquivar". Pelo menos "Marcar como Resolvido" precisa continuar
     existindo em algum lugar clicável — "Em atendimento" já é automático (114), "Aberto" some
     sozinho quando chega mensagem nova de cliente (mecanismo já existente antes da 114). Decidir
     o formato mais compacto (dropdown, botão único que alterna, ou 3 botões pequenos) — não
     precisa ser idêntico ao bloco antigo, só compacto e no cabeçalho.
  4. **Histórico de atendimento migra pra Tela Clientes** (`TelaClientes.tsx`): ao clicar num
     cliente, o painel de detalhe mostra quem foram os últimos atendentes que falaram com ele —
     reaproveitar a coluna `historico_atendimento` (jsonb, já existe desde a 114) e a função SQL
     `jsgrafica_registrar_atendimento()`, sem duplicar lógica de gravação (só muda onde é exibido).
  5. **"Resumir conversa" desativado por enquanto** — não apagar o código/funcionalidade, só
     esconder o botão / comentar a chamada, pra poder reativar fácil depois sem reconstruir.
- Fora de escopo: mudar a lógica de quando o status muda automaticamente (isso já está definido
  pela 114 e por mecanismos anteriores) — só onde os controles aparecem na tela.

## Critérios de aceite
- [x] Painel direito do Inbox mostra só o(s) pedido(s), sem o bloco de status/atendente/histórico
- [x] Existe uma forma de marcar "Resolvido" manualmente, compacta, no cabeçalho da conversa
- [x] Tela Clientes mostra o histórico de últimos atendentes ao selecionar um contato
- [x] "Resumir conversa" não aparece mais na tela, mas o código continua existindo (fácil reativar)
- [x] Testado com o mesmo cenário de pedido múltiplo já usado nas demandas 088/116, confirmando
      que o card de pedido tem ainda mais espaço que antes

## Riscos e cuidados
Mudança visual numa tela de uso constante — cuidado extra em não perder a capacidade de marcar
"Resolvido" no meio da mudança (era a preocupação levantada antes de aprovar esta demanda).
Testar esse fluxo específico (marcar resolvido pelo novo lugar) antes de considerar concluído.

## Referências
`components/TelaInbox.tsx` (demandas 114/116), `components/TelaClientes.tsx` (demandas 082/086/
117), `jsgrafica_contatos.historico_atendimento` (114), demanda 048 (Resumir conversa).

## Relato de execução

**Status final: concluída — deployada em produção**

### Achado antes de mexer (economizou trabalho)
Ao investigar onde colocar o "controle de status compacto no cabeçalho", descobri que **ele já
existia por completo**: o cabeçalho da conversa (`components/TelaInbox.tsx`, ao lado de
"Arquivar") já tinha um botão único que alterna conforme o status — "Assumir" (quando aberto),
"Atendendo: X" + "Resolver ✓" (quando em atendimento), "Reabrir" (quando resolvido). Isso já é
exatamente o "botão único que alterna" sugerido no próprio escopo como uma das opções de formato.
Não precisei construir nada novo pro item 3 do escopo — só confirmar que continuava funcionando
depois de tirar o bloco lateral (que tinha os mesmos 3 status, só duplicado).

### O que foi feito
1. **Bloco "Status do atendimento" removido por completo** do painel direito — badges Aberto/Em
   atendimento/Resolvido, linha "Atendente: X" e "Histórico de atendimento" (demanda 114) saíram
   do JSX. `mudarStatus()` (a função que os botões chamavam) **não foi tocada** — continua sendo
   usada pelo controle do cabeçalho, que já existia.
2. **"Resumir conversa" (demanda 048) escondido, não apagado**: nova constante
   `RESUMIR_CONVERSA_ATIVO = false` — o botão/estado/função (`resumirConversa`, `resumindo`,
   `resumoConversa`, `resumoErro`) continuam 100% intactos no arquivo, só o JSX que os renderiza
   ficou atrás de `{RESUMIR_CONVERSA_ATIVO && (...)}`. Reativar é só virar a constante pra `true`.
3. **Limpeza do que ficou genuinamente sem uso**: como a exibição do histórico de atendimento saiu
   do Inbox, o campo `historicoAtendimento` no tipo `Conversa`, no select/response de
   `app/api/inbox/conversas/route.ts`, e o espelhamento otimista local em `mudarStatus`/
   `assumirAutomaticamente` foram removidos — sem isso, o Inbox estaria buscando e mantendo um
   dado que nunca mais é lido em lugar nenhum ali. A **gravação** (função SQL
   `jsgrafica_registrar_atendimento`, chamada por `PATCH /api/inbox/atendimento`) não mudou — só
   onde o dado é consumido/exibido, exatamente como pedido no escopo.
4. **Histórico de atendimento migrado pra `TelaClientes.tsx`**: `app/api/clientes/route.ts`
   (`detalheCliente`) passou a selecionar `historico_atendimento` e devolver
   `historicoAtendimento` no JSON — mesma coluna, mesmo formato da 114, nenhuma lógica de
   gravação nova. Nova seção "Histórico de atendimento" no painel de detalhe do cliente (entre
   "Resumo" e "Aniversário e endereço"), mesmo padrão visual (últimos 5, mais recente primeiro,
   "Nome assumiu · data/hora") usado antes no Inbox.
5. **Card de pedido(s) ocupa a coluna inteira** — consequência direta de remover o bloco de status
   acima dele; não precisou de nenhuma mudança de CSS (já era `flex-1 overflow-y-auto`, só tinha
   menos espaço sobrando antes).

### Testes realizados e resultado
1. `npx tsc --noEmit`, `npx eslint`, `npm run build` limpos (nenhuma classe de erro nova).
2. **Deploy em produção**: `npx vercel --prod --yes` → 1ª tentativa falhou por erro transitório de
   rede (`ECONNRESET` da própria API da Vercel, não erro de código) — retentei e completou:
   **`dpl_8F18LDyLtizWtAvv2ofRkmWmzHrG`**.
3. **Cenário de pedido múltiplo (088/116), com clique real** (Playwright, `admin.jsgrafica.site`,
   contato real "Edvan Filho" com 2 pedidos sintéticos no mesmo `venda_id`): screenshot confirma
   painel direito com só nome+telefone (Bloco 1) e o card "🧾 Venda com 2 itens · R$65,45"
   ocupando o resto da coluna inteira — **sem** nenhum bloco de status/atendente/histórico acima,
   mais espaço que no teste da demanda 116.
4. **"Resolver" pelo cabeçalho, testado de ponta a ponta**: cliquei no botão "Resolver ✓" no
   cabeçalho da conversa (mesmo cenário acima) — screenshot confirma: status mudou pra
   "Resolvido" na lista da esquerda, cabeçalho passou a mostrar "Reabrir" no lugar de "Resolver ✓"
   — fluxo intacto, exatamente a preocupação levantada nos riscos.
5. **Histórico de atendimento em Clientes, confirmado com dado real**: resetei o mesmo contato pra
   "aberto" e cliquei na conversa no Inbox (dispara o assumir automático da 114, que grava
   histórico via a função SQL) — depois abri o mesmo contato na tela Clientes e a seção
   "HISTÓRICO DE ATENDIMENTO" apareceu com "Edvam assumiu · 08/07/26, 02:08", entre "Resumo" e
   "Aniversário e endereço". Pedidos e histórico de teste apagados/resetados do Supabase depois.

### Achados fora do escopo
- `app/api/clientes/route.ts` (`detalheCliente`) ainda usa o padrão antigo de contagem
  recebidas/enviadas (paginar linhas cruas e somar em JS) — mesma classe de ineficiência corrigida
  na demanda 108, mas escopado a 1 telefone só (bem mais barato que a versão de 100 contatos do
  Inbox que motivou a 108). Não mexi — fora do escopo desta demanda, registro caso vire demanda
  própria de otimização.

### Status final
Concluída e deployada em produção (`dpl_8F18LDyLtizWtAvv2ofRkmWmzHrG`). Todos os 5 critérios de
aceite confirmados com dados reais e cliques reais, incluindo o fluxo de "Resolvido" que era a
preocupação explícita antes de aprovar esta demanda.
