# 171 — Navegação cruzada entre Pedidos e Cliente/Inbox

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-14
Chat executor: 03 - APP JS GRAFICA

## Contexto
Pedido do Edvam, ao investigar o caso da Laura Isabel: "em pedidos se clico no cliente vou pra o
inbox dele e no inbox também ir pra tela de pedidos". Hoje as duas telas (Pedidos, em
`components/TelaPedidos.tsx`, e Cliente/Inbox) são navegações separadas sem link entre si. O
vínculo por telefone já existe nos bastidores — `GET /api/clientes?phone=...` (`detalheCliente`
em `app/api/clientes/route.ts`) já busca o histórico de pedidos de um contato pelo telefone. O que
falta é só a navegação na interface.

## Objetivo
A partir de um pedido, um clique no nome do cliente leva pro contato dele (Cliente/Inbox); a
partir de um contato, dá pra ver/ir pros pedidos dele.

## Escopo
- Incluído:
  1. Na tela de Pedidos (`PainelDetalhe`/`PainelDetalheVenda` em `TelaPedidos.tsx`), o nome do
     cliente vira um link/botão que navega pra aba Atendimento, já com aquele contato aberto
     (usar o telefone do pedido).
  2. Na tela de Cliente (detalhe do contato, onde já existe `detalheCliente` retornando
     `pedidos`), mostrar essa lista de pedidos de forma navegável (se já não mostrar) — ou um
     link/botão pra ir pra aba Pedidos filtrada por aquele telefone (o campo de busca de
     `TelaPedidos.tsx` já busca por telefone, reaproveitar).
  3. Decisão do executor sobre o mecanismo exato de navegação entre abas (o app já tem estrutura
     de abas/estado em `app/page.tsx` — usar o padrão que já existe pra trocar de aba
     programaticamente, se houver, ou o mais simples que funcione).
- Explicitamente fora de escopo: mudar a lógica de busca/vínculo por telefone em si (já funciona).
  Resolver os problemas de nome de contato desconectado (demandas 167/168/169) — esta demanda
  pode ficar mais útil depois dessas, mas não depende tecnicamente delas pra funcionar (navegação
  é por telefone, não por nome).

## Critérios de aceite
- [ ] Clicar no nome do cliente num pedido leva pro contato dele no Atendimento
- [ ] A partir do contato, dá pra ver os pedidos dele (lista já existe via API, só falta
      navegação/exibição)
- [ ] Testado num pedido/contato reais, nos dois sentidos
- [ ] Pedido sem contato vinculado (telefone "balcao"/sintético) não quebra — mostra que não tem
      contato pra navegar, sem erro

## Riscos e cuidados
Nenhum risco financeiro/dado — é navegação de UI sobre dado que já existe.

## Referências
`components/TelaPedidos.tsx`, `app/api/clientes/route.ts` (`detalheCliente`), `app/page.tsx`
(estrutura de abas).

## Relato de execução
Executada em 2026-07-14 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_Dikvv1SRkuYKFAPTJzR3W98RU32q`. Nos 2 apps
(admin e PDV — mesmo wiring).

### O que foi feito
1. **Pedido → contato**: nos painéis da aba Pedidos (item único e venda agrupada), o nome do
   cliente vira link azul "Nome 💬" quando o telefone é navegável (`telefoneNavegavel`: só
   dígitos — exclui 'balcao', 'balcao-<ts>' da 163 e 'contas_a_receber' da 096) → abre a aba
   Atendimento já na conversa (mesmo mecanismo `abrirConversaNoInbox` da 083). Pedido
   anônimo/sintético fica texto puro, sem erro (critério 4 testado).
2. **Contato → pedidos** (dois pontos de partida): no detalhe de Clientes, o "Histórico de
   pedidos" ganhou "Ver na aba Pedidos →"; no painel da conversa do Inbox, "📦 Pedido desta
   conversa" ganhou "Todos os pedidos →" — ambos abrem a aba Pedidos com a busca pré-preenchida
   com o telefone (o campo já buscava por telefone; prop nova `abrirBusca` com nonce, mesmo
   padrão do abrirConversa da 083).

### Testes (dado real, só leitura/navegação)
Ciclo completo pela UI: conversa real no Inbox → "Todos os pedidos →" → aba Pedidos filtrada
pelo telefone (input = '558183140241') → nome clicável no pedido → de volta pro Inbox no mesmo
contato; Clientes (Edvan Filho, 13 pedidos) → "Ver na aba Pedidos →" → filtrada
('5521965185667'); pedido anônimo de balcão → nome texto puro, sem link, sem erro.

### Nota
Achado incidental: "Edvan Filho" saiu do top-100 da lista do Inbox (conversas mais recentes
empurraram) mas segue buscável — comportamento normal do limit 100, não é bug.
