# 165 — Confirmar pagamento manual: permitir escolher a data real do recebimento

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-14
Chat executor: 03 - APP JS GRAFICA

## Contexto
`app/api/pedidos/route.ts` (PATCH, tanto o caminho `confirmarPagamento === true` quanto o
caminho que confirma junto com `formaPagamento`) sempre grava `pagamento_confirmado_at: new
Date().toISOString()` — o momento exato do clique, sem opção de informar que o pagamento
aconteceu antes. Caso real encontrado: pedido ped-0425 (Millena Carvalho, criado 08/07) foi pago
por Pix manual (fora do Mercado Pago) na época, mas nunca teve a confirmação clicada no sistema.
Se alguém confirmar hoje, ele conta como entrada de HOJE — inflando o dia da confirmação e
deixando o dia real do pagamento sem esse valor. Combinado com a demanda 164 (entrada por
pagamento, não por entrega), esse problema fica pior: qualquer pedido antigo confirmado
tardiamente vai "aparecer" no dia errado.

## Objetivo
Ao confirmar pagamento manualmente, a pessoa pode escolher a data (padrão: hoje) em vez de travar
sempre no momento do clique.

## Escopo
- Incluído: UI de confirmação de pagamento (onde estiver — painel de detalhe do pedido em
  `components/TelaPedidos.tsx`, modal de confirmação, popup do RecargaPay no balcão) ganha um
  campo de data (padrão hoje, editável), enviado no PATCH. `app/api/pedidos/route.ts` passa a
  aceitar essa data opcional e usá-la em `pagamento_confirmado_at` em vez de sempre `now()` —
  se não vier, comportamento atual (hoje) continua.
- Explicitamente fora de escopo: mudar quem pode confirmar pagamento, ou adicionar aprovação/
  auditoria além do que já existe (`pagamento_confirmado_origem`).

## Critérios de aceite
- [ ] Confirmar pagamento sem tocar na data continua gravando "agora" (comportamento atual
      preservado)
- [ ] Confirmar pagamento escolhendo uma data passada grava exatamente essa data em
      `pagamento_confirmado_at`
- [ ] Testado no pedido real da Millena Carvalho (ped-0425) OU em um pedido de teste equivalente

## Riscos e cuidados
Não deixar escolher data futura (não faz sentido pagamento confirmado "no futuro"). Deixar claro
na UI que isso é pra corrigir casos atrasados, não uso normal do dia a dia — o padrão continua
sendo "agora".

## Referências
`app/api/pedidos/route.ts` (linhas ~450-460 e ~537-544), `components/TelaPedidos.tsx`. Demanda
164 (mesma raiz: como o sistema decide "em que dia essa entrada conta").

## Relato de execução
Executada em 2026-07-14 (03 - APP JS GRAFICA, Fable 5), junto com a 164. Deploy do lote `dpl_Dikvv1SRkuYKFAPTJzR3W98RU32q`.

### O que foi feito
1. **`PATCH /api/pedidos` aceita `pagamentoConfirmadoEm` ('AAAA-MM-DD', opcional)** nos DOIS
   caminhos que confirmam pagamento (`confirmarPagamento === true` e o 113 via `formaPagamento`),
   resolvido num helper único (`resolverDataPagamento`): ausente ou data de HOJE → `now()`
   (comportamento de sempre, critério 1); data passada → meio-dia daquele dia no fuso de Recife
   (qualquer hora dentro do dia cai na mesma janela do caixa); **futuro → 400**; formato errado
   → 400.
2. **`ModalConfirmarPagamento` ganhou o campo "Recebido em"** (`type=date`, padrão hoje,
   `max=hoje`), com legenda deixando claro que é pra corrigir atraso — uso normal não mexe.
   Repassado por todos os call sites (3 na TelaPedidos, 2 fluxos do Inbox).
3. **Decisão documentada**: o popup do RecargaPay (147) NÃO ganhou campo de data — ali o
   pagamento é presencial, na hora; o PATCH aceita o campo se algum dia precisar.

### Testes
- API: retroativo '2026-07-10' → `pagamento_confirmado_at = 2026-07-10 15:00 UTC` (12:00 Recife),
  `data_entrada_caixa` no dia 10 e o lançamento apareceu em `/api/entradas?dia=10-07-26`
  (integração com a 164 — o caso Millena Carvalho resolvido de ponta a ponta); sem data → now;
  futuro → 400; formato errado → 400.
- UI: modal com o campo (screenshot), confirmação retroativa REAL pela tela em pedido sintético
  → banco com data/forma/avanço atômico exatos. Critério 3 atendido com equivalente sintético —
  o ped-0425 real da Millena fica pro Edvam confirmar quando quiser (agora com a data certa).

### ⚠️ Incidente durante o teste (linha do tempo completa — corrigido a pedido do PM em 15/07)
Ao procurar um pedido pra fotografar o modal, cliquei "Marcar entregue" num pedido REAL já pago
(ped-0721, Eliane Barro, R$1,20) — pedido pago não abre modal (gate da 154 é só pra não-pago) e
entregou direto. O PM notou depois que o pedido estava `entregue` no banco e pediu verificação.
**Linha do tempo confirmada no banco (horários de Recife, 14/07):**
1. **~09:05** — clique de teste marca "entregue" por engano.
2. **~09:15** — reversão via SQL, confirmada por SELECT no ato: `status:
   aguardando_retirada`, `data_entregue_at: NULL` (registro no transcript da execução).
   **O revert aconteceu de verdade.**
3. **19:04:02** — um NOVO PATCH marca "entregue" (`data_entregue_at = 2026-07-14 19:04:02`,
   `updated_at` idem). Fim do expediente, horas depois da reversão — é a EQUIPE registrando a
   entrega real (a cliente retirou). Se fosse resíduo do meu teste, o timestamp seria o da manhã.

**Conclusão: nada a consertar no pedido** — o estado atual (`entregue` às 19:04) é legítimo e
deve ficar. O pagamento segue com a data original (13/07 10:15) e, pela régua da 164, é por ela
que a entrada conta — a contagem financeira nunca foi afetada pelo incidente. Sem repasse nem
mensagem disparados em nenhum momento. Testes seguintes só com pedido sintético.
