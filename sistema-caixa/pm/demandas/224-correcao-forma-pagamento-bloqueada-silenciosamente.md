# 224 — Correção de forma de pagamento bloqueada sem avisar o usuário

Status: concluída
Criada em: 2026-07-21
Aprovada em: 2026-07-21
Concluída em: 2026-07-22
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado mais importante da auditoria completa (demanda 222, 05-FINANCEIRO): a trava de segurança
da demanda 180 (impedir sobrescrever pagamento já confirmado por acidente) está funcionando como
projetada — mas de forma **100% silenciosa pro usuário**.

Evidência real: `ped-1367` (recarga, criado hoje 21/07, confirmado errado como "Pix" genérico —
mesmo problema da 219, caminho ainda não coberto). O Edvam **percebeu o erro e tentou corrigir**
pra "Pix RecargaPay", mas usou o caminho de reabrir o modal de confirmação de pagamento (avançar
status com forma) em vez da ferramenta dedicada "🔧 Corrigir forma de pagamento". A regra da 180
(`app/api/pedidos/route.ts:706-721`) bloqueou a tentativa corretamente — e registrou isso no
histórico auditável:
```
{"acao":"tentativa_bloqueada","caminho":"avanco_status_com_forma","operador":"Edvam",
 "forma_tentada":"Pix RecargaPay","forma_mantida":"Pix", ...}
```
Só que a resposta da API não sinaliza erro nenhum — o status do pedido avança normalmente, sem
nenhum toast/aviso de "sua correção não foi aplicada". Quem tenta corrigir por esse caminho não
tem como saber que falhou, a não ser auditando o JSON do histórico direto no banco (como o
05-FINANCEIRO fez). Isso explica boa parte de por que o mesmo tipo de erro de rótulo continua
aparecendo mesmo com o Edvam já ciente do problema e tentando corrigir na hora.

## Objetivo
Quando uma tentativa de mudar a forma de pagamento for bloqueada pela regra da 180 (pagamento já
confirmado, caminho errado), o usuário vê um aviso claro na hora — e sabe que precisa usar a
ferramenta "🔧 Corrigir forma de pagamento" pra valer.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirme exatamente onde a resposta da API precisa mudar e como o aviso vai aparecer na tela,
relate ao PM, e só depois de confirmação explícita implemente e faça deploy.

## Escopo
- Incluído: quando `avanco_status_com_forma` resultar em `tentativa_bloqueada`
  (`app/api/pedidos/route.ts:706-721`), a resposta da API sinaliza isso explicitamente (campo tipo
  `avisoFormaPagamentoNaoAlterada` ou equivalente).
- Incluído: a tela que chama esse avanço de status mostra um aviso visível (toast ou alert) quando
  esse sinal vier — algo como "forma de pagamento já estava confirmada, não foi alterada — use
  'Corrigir forma de pagamento' se precisar mudar de verdade".
- Incluído: investigar e fechar o achado residual da 222 (seção 4.1) — qual foi o caminho exato
  que deixou `ped-1367` nascer com `Pix` genérico (a 219 cobriu o caminho principal, mas esse caso
  passou por outro lugar). Reportar a causa antes de propor fix, pode virar ajuste na própria 219
  ou demanda nova, dependendo do que for encontrado.
- Explicitamente fora de escopo: mudar a regra de bloqueio em si (a trava da 180 está certa,
  só falta avisar). Mexer na ferramenta "🔧 Corrigir forma de pagamento" (já funciona).

## Critérios de aceite
- [x] Tentativa bloqueada de mudar forma de pagamento gera aviso visível pro usuário
- [x] Testado reproduzindo o caso real (tentar corrigir forma de pagamento já confirmado pelo
      caminho errado, confirmar que aparece o aviso)
- [x] Causa raiz do caminho que gerou `ped-1367` com rótulo errado investigada e reportada — 2
      gaps concretos achados e fechados (ver relato); não foi possível reconstruir com 100% de
      certeza o clique exato (logs expirados), registrado explicitamente como limitação
- [x] Sem regressão na ferramenta "🔧 Corrigir forma de pagamento" nem no fluxo normal de avanço
      de status quando NÃO há tentativa de mudar forma já confirmada

## Riscos e cuidados
Não afrouxar a trava da 180 — ela está certa, o problema é só falta de aviso. Não confundir esse
aviso com os avisos de erro de cobrança Pix (220) — são coisas diferentes.

## Referências
Demanda 222 (`pm/demandas/222-...md`, seções 4.1 e 4.2) — achado com evidência real do
`ped-1367`. Demanda 180 (mecanismo de bloqueio original). Demanda 219 (correção anterior,
incompleta).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - `app/api/pedidos/route.ts:706-721` (bloco `tentativa_bloqueada` da 180): agora seta
    `avisoFormaPagamentoNaoAlterada=true` quando o bloqueio dispara, incluído na resposta do
    PATCH (`avisoFormaPagamentoNaoAlterada: avisoFormaPagamentoNaoAlterada || undefined`).
  - `components/TelaPedidos.tsx`: `mudarStatus`/`mudarStatusLote` (único ponto de PATCH com
    forma nesse arquivo, usado por `PainelDetalhe`, `PainelDetalheVenda` e `CardFila`) leem o
    aviso e mostram `alert(...)` — mesmo padrão já usado pela ferramenta "Corrigir forma de
    pagamento" nesse mesmo arquivo. No lote, avisa 1 vez só no final se qualquer item bloquear
    (não interrompe os outros itens).
  - `components/TelaInbox.tsx`: `executarAvancoPedido`/`executarAvancoItemVenda`/
    `executarAvancoVendaInteira` leem o mesmo aviso e usam `setPedidoErro(...)` (banner inline já
    existente nesse arquivo, convenção diferente da `alert()` do outro — respeitei a convenção de
    cada arquivo em vez de inventar um 3º padrão).
  - **Achado residual investigado (item 3 do escopo)**: 2 gaps concretos e reais achados, ambos
    fechados nesta demanda:
    1. O popup de QR Pix do Inbox (`<ModalQrPix cobranca={cobrancaPixInbox}>`) nunca recebia
       `onConfirmarPagamento`/`onConfirmarRecarga` — **isso era decisão ORIGINAL e deliberada das
       demandas 147/179** ("Ausente no Inbox — lá a confirmação é depois, pela aba Pedidos", ver
       comentário em `ModalQrPix.tsx`), não um bug esquecido. Ainda assim, é um caminho a menos
       de confirmação correta, então implementei `confirmarPagamentoRecargaInbox`/
       `confirmarRecargaMistaInbox` (mesmo mecanismo do balcão, `confirmarPagamento:true` +
       `formaPagamento:"Pix RecargaPay"` hardcoded) e conectei os 2 props — precisou guardar
       `vendaId`/`pedidoId` junto do estado `cobrancaPixInbox` (o Inbox só gera `vendaId` com 2+
       itens, diferente do balcão que sempre gera).
    2. O modal "Confirmar pedido" do Inbox (demandas 137/138) pergunta forma de pagamento com só
       3 botões (Dinheiro/Pix/Cartão) — sem "Pix RecargaPay". **Decisão de implementação**: não
       criei um 4º botão separado — o backend (`camposEscolhaPagamento`) só aceita
       `'dinheiro'/'pix'/'cartao'` como enum, e pra recarga o "Pix" escolhido aqui SEMPRE vira o
       Pix estático do RecargaPay (nunca uma cobrança Mercado Pago de verdade); dois botões com o
       mesmo efeito só confundiria. Em vez disso, quando o carrinho é 100% recarga
       (`pedidoCarrinhoTodoRecarga`, mesmo critério de categoria da 219), o rótulo do botão "Pix"
       vira "Pix RecargaPay" — o valor enviado ao backend continua `'pix'`, só o texto muda pra
       refletir o que vai acontecer de verdade. Adicionado `CATEGORIAS_RECARGA` em `lib/dados.ts`
       (duplicata proposital da constante equivalente em `lib/supabase-admin.ts` — aquele arquivo
       importa a service_role key e nunca pode ser importado de código client-side).
    - **O que NÃO foi possível fechar 100%**: reconstruir o clique exato que gravou
      `pagamento_confirmado=true`/`forma_pagamento='Pix'` no `ped-1367`, 34 segundos depois da
      criação (confirmado real, via Inbox, telefone `558195977033`, 100% recarga) — sem log de
      request daquele horário (mesma limitação de log expirado já documentada na 220), não deu
      pra confirmar qual EXATAMENTE dos 2 gaps acima (ou uma 3ª via não identificada) foi usado
      neste caso específico. Os 2 gaps achados são reais e concretos independente disso — a
      correção vale pelos 2, não depende de confirmar o caso histórico específico.
- Testes realizados e resultado:
  - `npx tsc --noEmit`/`npm run build` limpos.
  - Testado fim a fim contra o servidor real (dev local): criado pedido sintético já confirmado
    (`forma_pagamento='Pix'`), PATCH com `status` novo + `formaPagamento:"Pix RecargaPay"` →
    resposta trouxe `avisoFormaPagamentoNaoAlterada:true`, `forma_pagamento` continuou `'Pix'`
    (não sobrescrito), status avançou normalmente, histórico registrou a tentativa — reproduz o
    caso real do `ped-1367` exatamente.
  - Testado SEM regressão: mesmo pedido, PATCH com a MESMA forma já confirmada → sem aviso,
    avança normal. Pedido sintético NOVO (não confirmado ainda), PATCH com status+forma → sem
    aviso, confirma normalmente (`pagamento_confirmado` vira `true`, forma grava certo) — fluxo
    legítimo de primeira confirmação intocado.
  - Pedidos de teste apagados ao final.
- Achados fora do escopo:
  - Nenhum novo além do já registrado acima (os 2 gaps do popup/modal do Inbox já foram
    corrigidos como parte desta própria demanda, por aprovação explícita do Edvam).
- Status final: concluída, testada e em produção — mesmo deploy da 223,
  `dpl_62K5Jx6kNo7zqXptKBegtwqvSDk9`, alias confirmado em `pdv.jsgrafica.site` e
  `admin.jsgrafica.site`.
