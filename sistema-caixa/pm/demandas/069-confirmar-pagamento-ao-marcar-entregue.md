# 069 — Popup de confirmação ao marcar "Entregue" com pagamento pendente (corrige item 3 da 066)

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Na demanda 066, o aviso de "pagamento pendente" ficou só passivo — aparece no cabeçalho do grupo
da venda em `TelaPedidos.tsx`, mas não em nenhum momento de ação. Risco confirmado pelo PM: numa
correria no balcão, dá pra clicar "Marcar entregue" num item com `pagamento_confirmado: false` sem
reparar no aviso lá em cima. Edvam confirmou que quer o passo extra.

## Objetivo
Ao clicar pra marcar um pedido como "Entregue", se `pagamento_confirmado` for `false`, o sistema
pede uma confirmação explícita antes de gravar.

## Escopo
- Incluído: no botão/ação que marca um pedido como "Entregue" (tanto vindo de "Pronto" quanto de
  "Aguardando retirada", ambos os casos entram nessa transição), se `pagamento_confirmado` for
  `false`, mostrar uma confirmação simples: "Esse item ainda não foi marcado como pago. Confirma
  que já recebeu o pagamento antes de entregar?" — Sim (segue e marca entregue) / Cancelar (não
  faz nada). Não precisa ser modal complexo — um `confirm()`/diálogo simples já resolve.
- Fora de escopo: mudar o aviso passivo já existente no cabeçalho do grupo (continua); criar
  fluxo de cobrança ou qualquer coisa além dessa confirmação pontual.

## Critérios de aceite
- [ ] Marcar "Entregue" num pedido com `pagamento_confirmado: false` mostra a confirmação
- [ ] Marcar "Entregue" num pedido já pago (`pagamento_confirmado: true`) não mostra nada, segue
      direto como já era
- [ ] Testado com pelo menos 1 caso de cada

## Riscos e cuidados
Nenhum específico — mudança pequena e isolada.

## Referências
`components/TelaPedidos.tsx`. Demanda 066 (achado que originou esta correção).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Em `components/TelaPedidos.tsx`, nova função `confirmarEntregaSePendente(status, pagamentoConfirmado)`
  — se o status alvo é `"entregue"` e `pagamento_confirmado` é `false`, mostra
  `confirm("Esse item ainda não foi marcado como pago. Confirma que já recebeu o pagamento antes de
  entregar?")` e só segue se o usuário confirmar; caso contrário (já pago, ou status diferente de
  "entregue"), não mostra nada. Aplicada nos 3 pontos onde um pedido pode virar "Entregue":
  `PainelDetalhe.avancarPara`, `CardFila.avancarPara` (view "Fila de impressão" — na prática nunca
  chega em "entregue" direto por ali hoje, mas ficou coberto por consistência) e
  `PainelDetalheVenda.avancarItem` (painel de venda agrupada da 066, usa o `pagamento_confirmado`
  do item específico dentro do grupo, não do grupo inteiro). O aviso passivo no cabeçalho da venda
  (066) não foi alterado, continua igual.
- Testes realizados e resultado:
  Playwright local (`admin.localhost:3000`) com 3 pedidos de teste reais (status `pronto`):
  1. `pagamento_confirmado=false`, clicando "Entregue (levou agora)" → confirm() apareceu com o
     texto certo; aceitando, o status mudou pra "Entregue" normalmente.
  2. `pagamento_confirmado=true`, mesmo clique → nenhum diálogo apareceu, seguiu direto pra
     "Entregue" (comportamento igual ao de antes da 069).
  3. `pagamento_confirmado=false`, clicando "Entregue" e cancelando o confirm() → pedido continuou
     em "Pronto", nada foi gravado.
  `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy. Deploy em produção:
  `npx vercel --prod --yes` → `dpl_9Rqv2fgSQxbCMSQe4RfVuPwJeXyE`. Registros de teste apagados do
  Supabase depois de cada rodada.
- Achados fora do escopo: nenhum.
- Status final: concluída.
