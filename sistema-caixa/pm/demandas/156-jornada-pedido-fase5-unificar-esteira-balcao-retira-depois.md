# 156 — Jornada do pedido — Fase 5/5 (última): balcão "retira depois" entra na mesma esteira do Inbox

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA (Fable 5 — mesmo padrão das fases 3/4, mexe no fluxo de venda
de balcão usado dezenas de vezes por dia)

## Contexto — plano geral (Fases 1-4 concluídas e validadas)
1. Forma de pagamento vira escolha do pedido — 137/138 ✅
2. Tipo de entrega vira escolha explícita — 139/140 ✅
3. Cobrança Pix real generalizada + QR no balcão + RecargaPay — 141/142/145/146/147/148 ✅
4. Trava produção/entrega sem pagamento confirmado, unificada — 154/155 ✅

**Última peça do plano.** O Edvam confirmou nesta sessão: quer a esteira do balcão "retira
depois" unificada com a do Inbox, em vez de manter o atalho atual.

**Situação hoje** (confirmado lendo `app/api/pedidos/route.ts:351-415`): pedido de balcão nasce
DIRETO em `entregue` ("leva agora") ou `aguardando_retirada` ("retira depois") —
`const status = statusEntrega === 'aguardando_retirada' ? 'aguardando_retirada' : 'entregue'`
(linha 360). Nunca passa por `confirmado`/`em_producao`/`pronto`. Pedido do Inbox, em
contraste, sempre nasce em `confirmado` e percorre a esteira inteira
(`confirmado → em_producao → pronto → entregue`/`aguardando_retirada → entregue`,
`components/TelaPedidos.tsx`, mapa `PROXIMO`).

Consequência prática: um pedido de balcão "retira depois" (ex. impressão grande que demora, o
cliente volta depois) não aparece em nenhum momento como "em produção" ou "pronto" — pula direto
pra "aguardando retirada" no instante da venda, mesmo que o serviço ainda nem tenha começado a
ser feito. E, por não passar por `em_producao`/`pronto`, o gate de pagamento da Fase 4 (154/155)
nunca chega a valer pra esse caminho — só a checagem final em `→entregue` (que já existia) se
aplica.

**"Leva agora" fica de fora desta fase, de propósito**: é venda instantânea de verdade (cliente
espera no balcão, recebe na hora) — não existe etapa de produção real pra mostrar, e forçar
`confirmado→em_producao→pronto` nesse caminho seria fricção nova sem ganho nenhum, em um fluxo
usado dezenas de vezes por dia. Só "retira depois" tem produção de verdade acontecendo entre a
venda e a entrega — é o caso que faz sentido unificar.

## Objetivo
Pedido de balcão "retira depois" nasce em `confirmado` e percorre a MESMA esteira que o Inbox já
usa (`confirmado → em_producao → pronto → aguardando_retirada → entregue`) — aparece na aba
Pedidos como "em produção"/"pronto" igual a qualquer pedido do Inbox, e o gate de pagamento das
Fases 4/154-155 passa a valer pra ele automaticamente, sem lógica nova de gate. "Leva agora"
continua exatamente como está, sem nenhuma mudança.

## Escopo
- Incluído:
  1. **Único ponto de mudança real**: em `app/api/pedidos/route.ts`, dentro do branch
     `if (body.origemBalcao)`, a linha `const status = statusEntrega === 'aguardando_retirada' ?
     'aguardando_retirada' : 'entregue'` passa a gravar `'confirmado'` no lugar de
     `'aguardando_retirada'` quando `statusEntrega === 'aguardando_retirada'`. Caminho `'entregue'`
     (leva agora) INTOCADO.
  2. Ajustar o que depende desse status na criação: `data_entregue_at` já é `null` fora de
     `status === 'entregue'` (nenhuma mudança necessária); `gerarSaidaAutomaticaNaVenda` já só
     dispara na criação quando `status === 'entregue'` (nenhuma mudança — pra "retira depois" o
     repasse automático já acontece depois, no PATCH que leva a `entregue`, como hoje).
  3. Nenhuma mudança de UI necessária em `app/page.tsx`/`app/pdv/page.tsx` — o formulário de venda
     continua perguntando "levou agora ou retira depois?" (066) e mandando `statusEntrega` igual;
     quem decide o status real gravado é só o backend (item 1). A tela de Pedidos
     (`TelaPedidos.tsx`) já sabe renderizar `confirmado`/`em_producao`/`pronto` — é o mesmo
     componente que o Inbox usa, nada novo a construir.
  4. Confirmar que o vínculo de cliente da 146 (nome/telefone obrigatório em "retira depois" sem
     contato) continua gravando normalmente — esses campos não dependem do `status` inicial.
  5. Confirmar que "Cancelar venda" (142, via `vendaId`) funciona igual pra pedido que agora nasce
     em `confirmado` — `cancelarPedido` não depende do status de origem.
- Fora de escopo: qualquer mudança no caminho "leva agora"; mudar `pagamento_tipo` hardcoded
  `'pos_producao'` do balcão (achado antigo da 137, não é gate de status, fica pra decisão
  separada se algum dia importar); Fase 6 ou qualquer coisa além do plano das 5 fases.

## Critérios de aceite
- [ ] Venda de balcão "retira depois" nasce em `confirmado` (não mais direto em
      `aguardando_retirada`) — testado nos dois balcões (`app/page.tsx` e `app/pdv/page.tsx`)
- [ ] O mesmo pedido aparece na aba Pedidos com os botões "Iniciar produção"/"Marcar como
      pronto"/"Aguardando retirada"/"Marcar entregue", idêntico a um pedido do Inbox
- [ ] O gate de pagamento (154/155) vale pra esse pedido nos pontos certos: trava em
      `em_producao` e `entregue` se não pago, NÃO trava em `aguardando_retirada` (regressão da
      155) — testado com pedido "retira depois" + Pix sem cobrança confirmada
- [ ] Venda "leva agora" continua idêntica em tudo — nasce direto `entregue`, sem passar pela
      esteira (regressão explícita)
- [ ] Vínculo de cliente (146) e cancelamento de venda (142) funcionam sem regressão no novo
      caminho
- [ ] Repasse automático (104) dispara no momento certo (transição pra `entregue` via PATCH,
      como hoje) — sem duplicar nem faltar

## Riscos e cuidados
- **Mudança de comportamento operacional real pra Zu/Gabi**: hoje "retira depois" vira
  "aguardando retirada" instantaneamente; depois desta fase, precisa avançar manualmente pela
  esteira (Iniciar produção → Pronto → Aguardando retirada) antes de aparecer como pronto pra
  buscar. Isso é o objetivo pedido pelo Edvam (visibilidade real do que está em produção), mas
  vale confirmar com ele que a equipe está ciente da mudança de fluxo no dia a dia, não só o
  código.
- Testar exaustivamente com dado sintético antes de qualquer teste em produção real — é o fluxo
  de venda de maior frequência do sistema.
- Fecha o plano de 5 fases da jornada do pedido (137→156) — ao concluir, confirmar que nenhum
  pedido real em andamento no momento do deploy fica com o status inicial errado (só afeta
  pedidos CRIADOS depois do deploy, pedidos já existentes em `aguardando_retirada` continuam
  exatamente onde estão).

## Referências
Demandas 137-155 (plano completo). Demanda 066 (origem do fluxo "levou agora"/"retira depois" no
balcão). Demandas 154/155 (gate de pagamento que passa a cobrir este caminho automaticamente).

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_BycC1pAvUr68sNo2AyBN8MMtip8Q`,
verificado em produção nos 2 balcões. **Fecha o plano de 5 fases da jornada do pedido (137→156).**

### O que foi feito
Exatamente o ponto único que a demanda mapeou: no branch `origemBalcao` do `POST /api/pedidos`,
`statusEntrega === 'aguardando_retirada'` passou a gravar **`confirmado`** — o pedido entra na
mesma esteira do Inbox. "Leva agora" intocado (continua nascendo `entregue`, com repasse na
criação como sempre). Confirmado por leitura de código ANTES de mexer (como a demanda previa):
`data_entregue_at` e `gerarSaidaAutomaticaNaVenda` já eram condicionados a `status === 'entregue'`
— zero ajuste necessário; nenhuma mudança de UI (o backend decide o status; `TelaPedidos` já
renderiza a esteira toda).

**Efeito colateral positivo documentado:** a Fila de impressão filtra `confirmado`/`em_producao`
— pedido de balcão "retira depois" agora ENTRA na fila automaticamente (visto e verificado em
teste; alinhado ao objetivo de visibilidade da produção).

### Testes (sintéticos, todos apagados; nenhum dado real tocado)
- **Nascimento**: "retira depois" → `confirmado`, sem `data_entregue_at`, com nome/telefone da
  146 gravados; "leva agora" → `entregue` idêntico a antes (com `data_entregue_at` e
  pagamento confirmado).
- **Esteira completa com o gate nos pontos certos** (critério 3): `confirmado → em_producao` não
  pago → 400/modal (154); com `formaPagamento` → confirma+avança; `→ pronto → aguardando_retirada
  → entregue` fluindo; segundo pedido NÃO pago: `pronto → aguardando_retirada` passou SEM gate
  (155 intacta) e `→ entregue` → 400 sem forma / entregue+pago com forma.
- **Repasse automático (critério 6)**: RECARGA VEM "retira depois" nasceu `confirmado` SEM
  saída; percorreu a esteira; o repasse disparou EXATAMENTE 1x, na transição pra `entregue` via
  PATCH — sem duplicar nem faltar (contagem por SQL).
- **142**: venda de 2 itens nascidos em `confirmado` cancelada inteira por `vendaId` — ok.
- **UI (admin local, Playwright)**: venda "retira depois" real pela tela → aba Pedidos com badge
  "Confirmado" + botão "Iniciar produção" (idêntico a pedido do Inbox, screenshot) + pedido
  listado na Fila de impressão (screenshot).
- **Produção (os 2 balcões, critério 1)**: admin coberto pelo teste local (mesmo código); PDV
  REAL (pdv.jsgrafica.site) → venda "retira depois" com nome → nasceu `confirmado` com
  `pagamento_momento: 'retirada'` (SQL) → cancelada pela 142 em produção (`cancelados: 1`) e
  removida.
- **Pedidos em andamento no deploy**: nenhum tocado — a mudança é só no INSERT; os já existentes
  em `aguardando_retirada` (ped-0425/ped-0514 etc.) continuam exatamente onde estão.

### Critérios de aceite
- [x] "Retira depois" nasce em `confirmado` nos 2 balcões (admin local + PDV produção)
- [x] Aparece na aba Pedidos com a esteira completa, idêntico ao Inbox (screenshot)
- [x] Gate 154/155 nos pontos certos: trava em_producao/entregue não pago, NÃO trava
      aguardando_retirada
- [x] "Leva agora" idêntico em tudo (regressão explícita)
- [x] Vínculo de cliente (146) e Cancelar venda (142) sem regressão — 142 provada até em produção
- [x] Repasse (104) exatamente 1x, na transição pra entregue

### ⚠️ Ponto operacional pro PM confirmar com o Edvam (risco citado na demanda)
A partir deste deploy, "retira depois" exige que Zu/Gabi avancem o pedido pela esteira
(Iniciar produção → Pronto → Aguardando retirada) — e o gate da 154 vai pedir a confirmação de
pagamento no "Iniciar produção" quando o cliente ainda não pagou (o modal resolve na hora, mas é
fricção nova de propósito). Vale garantir que a equipe foi avisada da mudança de rotina, não só
o código.

### 🏁 Jornada do pedido — plano de 5 fases COMPLETO
F1 escolha de pagamento (137/138) → F2 tipo de entrega (139/140) → F3 cobrança Pix
generalizada + QR + RecargaPay (141-148) → F4 gate de pagamento unificado (154/155) → F5 balcão
na esteira (156).
