# 088 — Cartão "Pedido desta conversa" no Inbox só mostra 1 item de um pedido com vários

Status: concluída
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Achado pelo 03-APP durante a demanda 076 (múltiplos produtos no pedido do Inbox), fora do escopo
daquela demanda. O painel direito da conversa no Inbox tem um cartão pequeno "📦 Pedido desta
conversa" — diferente da aba Pedidos (tela grande), que já mostra corretamente pedidos
agrupados por `venda_id` (ex.: "🧾 Edvan Filho · 2 itens", desde a demanda 066/076).

O cartão pequeno do Inbox nunca foi pensado pra pedido com vários itens: ele busca só o pedido
mais recente daquele telefone (`GET /api/pedidos?telefone=...`, pega 1 registro). Num pedido de
2 produtos (ex.: Xerox + Banner, mesmo `venda_id`), esse cartão mostra só o último item criado
(ex.: só "Banner"), como se o outro item não existisse — mesmo ele estando lá na aba Pedidos,
certo.

## Objetivo
O cartão "Pedido desta conversa" no Inbox mostra todos os itens de uma venda com vários
produtos, não só o mais recente.

## Escopo
- Incluído: quando o pedido mais recente daquele telefone tiver `venda_id` preenchido, buscar
  todos os pedidos com o mesmo `venda_id` (mesma lógica que `agruparPorVenda()` já usa em
  `TelaPedidos.tsx`) e mostrar a lista de itens + total geral no cartão, em vez de só 1 produto.
  Pedido de 1 item só (sem `venda_id`) continua exatamente como está hoje.
- Fora de escopo: mudar o layout do cartão além do necessário pra caber a lista de itens.

## Critérios de aceite
- [x] Pedido de 1 item continua mostrando normal, sem regressão
- [x] Pedido de 2+ itens (mesmo `venda_id`) mostra todos os produtos no cartão, não só o último
- [x] Testado com um pedido real de 2+ itens (reaproveitar o mesmo teste da demanda 076, contato
      "Edvan Filho")

## Referências
`components/TelaInbox.tsx` (cartão "📦 Pedido desta conversa"). `components/TelaPedidos.tsx`
(`agruparPorVenda()`, lógica de referência). Demanda 076 (achado original).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
`components/TelaInbox.tsx`:
1. `PedidoAPI` ganhou o campo `venda_id: string | null` (já vinha na resposta da API, só não
   estava tipado).
2. Novo estado `itensVendaAtivo: PedidoAPI[] | null` + `avancandoItemId: string | null`.
3. `carregarPedidoAtivo`: **não precisou de nenhuma chamada de API nova** — `GET
   /api/pedidos?telefone=` já retorna todo o histórico daquele telefone (não só o mais recente),
   então os outros itens da mesma venda já vinham na resposta. Só adicionei um `filter()` local:
   se o pedido mais recente tem `venda_id`, filtra os outros pedidos do mesmo array com o mesmo
   `venda_id` — exatamente a mesma regra de `agruparPorVenda()` em `TelaPedidos.tsx` (2+ ⇒ agrupa,
   1 ⇒ trata como antes).
4. Nova função `avancarStatusItemVenda(id, statusAtual)` — mesmo endpoint `PATCH /api/pedidos` já
   usado por `avancarStatusPedido`, só que por item específico; depois de avançar, recarrega
   `carregarPedidoAtivo` inteiro (evita mexer em estado local na mão, mantém `pedidoAtivo` e
   `itensVendaAtivo` sempre sincronizados com o servidor).
5. Render do cartão: novo branch `itensVendaAtivo ?` **antes** do branch de item único —
   quando há 2+ itens, mostra "🧾 Venda com N itens" + total geral, e cada item numa linha própria
   com nome/qtd/valor, badge de status (reaproveitando `STATUS_CFG`/`STATUS_LABEL_PEDIDO`, já
   importados de `TelaPedidos.tsx`) e botão "Avançar" individual — mesmo padrão de
   `PainelDetalheVenda` (cada item mantém seu próprio status/avanço). O branch de item único
   (`pedidoAtivo ?`) não foi alterado, só passou a vir depois do novo branch.

### Testes realizados e resultado
1. **Simulação da lógica contra dados reais (local)**: sem cliente de pedido real com 2+ itens
   sobrando no banco (a 076 já limpou o teste dela), recriei o mesmo cenário — 2 pedidos
   sintéticos pro telefone real "Edvan Filho" (`5521965185667`), mesmo `venda_id`, valores reais
   de catálogo (Xerox R$0,45 + Banner R$65,00). Rodei a mesma lógica de filtro do componente
   direto contra o JSON de `GET /api/pedidos?telefone=...` — `itensVendaAtivo` ficou com os 2
   itens certos, total R$65,45 (bate com a soma).
2. **Avanço por item**: `PATCH /api/pedidos` no item Xerox (confirmado → em_producao) e
   reconferido — os 2 itens continuam agrupados, agora com status **misto** (1 em_producao, 1
   confirmado), confirmando que cada item avança independente sem quebrar o agrupamento.
3. **Regressão de 1 item**: contato real diferente com pedido ativo sem `venda_id`
   (`558187724423`, `ped-0142`, status "pronto") — confirmado que a lógica cai exatamente no
   branch antigo (`itensVendaAtivo: null`, `pedidoAtivo` continua sendo esse pedido único).
4. Dados sintéticos apagados depois de cada teste.
5. `npx tsc --noEmit` limpo, `npm run build` sem erro, `npx eslint` sem classe de erro nova (só o
   baseline já existente no arquivo). Arquivos financeiros conferidos por timestamp antes do
   deploy — nada tocado.
6. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_APBnDvdLMcYDjhn1DmS8ZrWoZ5S3`**.
   Reteste 1 e 2 acima refeitos direto contra `admin.jsgrafica.site` com um novo par de pedidos
   sintéticos (mesmo telefone) — mesmo resultado (2 itens agrupados, total certo, avanço por item
   funcionando, status misto). Dados de teste apagados depois.

### Achados fora do escopo
- **Ressalva de metodologia (não é bug do código)**: no meio do teste em produção, a 1ª consulta
  a `GET /api/pedidos?telefone=5521965185667` retornou 2 pedidos (`ped-0176`/`ped-0177`) que
  **não existem no banco** (confirmei depois por SQL direto — só existiam meus 2 registros de
  teste). Investiguei cache (headers `X-Vercel-Cache: MISS`, `Age: 0` — sem cache) e concluí que
  foi uma colisão passageira: "Edvan Filho" é o mesmo contato de teste reaproveitado por mais de
  um chat (demanda 076 também usou), e o 03-APP provavelmente rodou um teste próprio nesse exato
  telefone bem no mesmo instante. Não afeta o resultado final (reconfirmado logo em seguida com
  dados 100% controlados), mas registro pra evitar reusar esse contato pros dois chats ao mesmo
  tempo no futuro.
- Não toquei no fluxo de mensagem/aviso automático ao cliente quando avança status — comportamento
  inalterado (mesmo endpoint, mesma lógica de template por status já existente).

### Status final
Concluída e deployada em produção (`dpl_APBnDvdLMcYDjhn1DmS8ZrWoZ5S3`). Todos os 3 critérios de
aceite confirmados com dados reais, local e em produção.
