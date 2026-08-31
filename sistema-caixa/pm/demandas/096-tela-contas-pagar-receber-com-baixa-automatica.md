# 096 — Tela "📋 Contas a Pagar/Receber" com recorrência e baixa automática

Status: concluída (verificado pelo PM em produção — deploy Ready, dado sintético de teste confirmado limpo em `jsgrafica_contas_pagar_receber` e `jsgrafica_pedidos`)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
2ª peça da reestruturação do Financeiro — ver `pm/conhecimento/proposta-fluxo-financeiro.md`
(item 5 da IA de 5 abas) e `checklist-reestruturacao-financeiro.md` (A4). **Depende da demanda
095 estar concluída** (tabela `jsgrafica_contas_pagar_receber` precisa existir). Só o Admin usa
essa tela — confirmado com o Edvam, PDV nunca acessa contas futuras.

O Edvam já faz esse controle numa planilha hoje, sozinho — não é uso em time, então o risco de
"conta esquecida" é menor do que seria com várias pessoas cadastrando. Ele citou contas mensais
(aluguel) como caso real de recorrência: cadastra 1 vez, marca que repete, e só precisa atualizar
quando pagar — não recadastrar todo mês.

## Objetivo
Admin cadastra obrigações futuras (a pagar ou a receber), acompanha vencimento/status, e ao
marcar como paga/recebida, o sistema gera sozinho o lançamento real correspondente (Saída ou
Entrada) — sem digitar o valor 2 vezes.

## Escopo
- Incluído:
  1. Tela nova (menu do admin, só admin, dentro do grupo Financeiro): lista de contas cadastradas,
     com filtro por status (pendente/pago/atrasado) e tipo (pagar/receber). "Atrasado" calculado
     na leitura (vencimento < hoje e status ainda pendente), não precisa job/cron.
  2. Formulário de cadastro: nome, valor, categoria (texto livre), tipo (pagar/receber),
     vencimento, e toggle "repete todo mês?" — se marcado, vira `recorrente: true`,
     `frequencia: 'mensal'`.
  3. Ação "marcar como pago/recebido" (baixa):
     - Gera uma linha real em `jsgrafica_saidas` (se `tipo: 'pagar'`) ou registra como entrada (se
       `tipo: 'receber'` — decidir com base no que já existe: `jsgrafica_vendas` espera produto/
       operador, pode não caber uma "entrada avulsa" tipo recebimento de conta; se não couber
       bem, usar `jsgrafica_pedidos` com um tipo de pedido "avulso" ou criar categoria própria —
       registrar a decisão tomada no relato, não inventar campo novo sem necessidade)
     - Preenche `saida_vinculada_id`/`venda_vinculada_id` na própria linha de
       `jsgrafica_contas_pagar_receber`, e muda `status` pra `'pago'`
     - **Se `recorrente: true`**: cria automaticamente a próxima instância (mesmo nome/valor/
       categoria/tipo, `vencimento` = vencimento atual + 1 mês, `status: 'pendente'`) — mesmo
       padrão de "gerar automático" já usado na Recarga VEM (demanda 079), mas aqui disparado
       pela baixa manual, não pelo fechamento de caixa.
  4. Reaproveitar mecânica: não duplicar lógica de "gerar saída automaticamente" — se já existe
     um helper genérico o suficiente em `lib/supabase-admin.ts` da 079, avaliar se dá pra
     reaproveitar em vez de escrever do zero.
- Fora de escopo: saldo projetado / qualquer número de "previsão" no Financeiro (fica pra depois,
  decisão explícita do Edvam) — esta demanda é só cadastro + baixa, sem calcular projeção.
  Conciliação bancária / Mercado Pago (isso é outro conceito da proposta, "Contas &
  Conciliação", demanda 084 futura).

## Critérios de aceite
- [x] Cadastra conta a pagar e a receber, avulsa e recorrente
- [x] Marcar como pago gera a Saída real (categoria/valor batendo) e vincula o id
- [x] Marcar como recebido gera a Entrada real (mecanismo a decidir, documentar escolha)
- [x] Conta recorrente, ao dar baixa, gera sozinha a próxima instância (mês seguinte, pendente)
- [x] Conta com vencimento passado e ainda pendente aparece como "atrasado" sem precisar de ação
      manual
- [x] PDV (Zu/Gabi) não vê essa tela em nenhum lugar do menu

## Riscos e cuidados
Mudança aditiva (tela nova) — pode ir a qualquer momento, não interfere no que já está em uso.
Cuidado real: a baixa grava em tabelas financeiras de verdade (`jsgrafica_saidas`) — testar com
dado sintético antes, nunca gerar saída de teste em cima de dado real de produção, mesmo padrão
já seguido em todas as demandas financeiras dessa sessão.

## Referências
`jsgrafica_contas_pagar_receber` (demanda 095), `jsgrafica_saidas`, `jsgrafica_vendas`,
`jsgrafica_pedidos`. `lib/supabase-admin.ts` (`gerarSaidaRecargaVemAutomatica()`, demanda 079,
como referência de padrão "gerar lançamento automático + vincular id").
`pm/conhecimento/proposta-fluxo-financeiro.md`.

## Relato de execução

- **O que foi feito:**
  - `lib/supabase-admin.ts`: `listarContasPagarReceber()` (calcula "atrasado" na leitura,
    comparando `vencimento` com hoje — nunca grava esse status, sempre deriva), `criarContaPagarReceber()`,
    `darBaixaContaPagarReceber(id, operador)` — o núcleo da demanda:
    - `tipo: 'pagar'` → insere linha real em `jsgrafica_saidas` (`data_dia` = hoje, dia em que o
      dinheiro sai de verdade, não o vencimento original; `categoria_id` = slug simples da
      categoria livre da conta, sem FK — 095 já deixou esse campo sem exigência de referência),
      vincula `saida_vinculada_id`.
    - `tipo: 'receber'` → **decisão registrada aqui**: `jsgrafica_vendas` não recebe linha nova
      desde a 054 e não cabe bem um recebimento avulso (espera produto/operador);
      `jsgrafica_pedidos` já é a fonte real de entradas do dia (Dashboard/Fechamento somam de lá)
      e aceita entrada avulsa no mesmo formato do balcão anônimo (demanda 054,
      `telefone: 'balcao'`) — reaproveitei esse padrão com `telefone: 'contas_a_receber'` (só pra
      distinguir na aba Pedidos) em vez de inventar tabela/campo novo. Vincula `pedido_vinculado_id`.
    - Se `recorrente: true`: gera sozinha a próxima instância (mesmo nome/valor/categoria/tipo,
      vencimento = atual + 1 mês, status `pendente`) — mesmo padrão de "gerar automático" já
      usado na Recarga VEM (079), aqui disparado pela baixa manual.
    - Guarda contra baixa duplicada: se a conta já está `pago`, lança erro em vez de gerar um 2º
      lançamento (`saída`/`pedido`) em cima do mesmo.
  - `app/api/contas-pagar-receber/route.ts` (novo): GET lista (+ `?resumo=vencer` pro card da
    097), POST cadastra, PATCH dá baixa.
  - `components/TelaContasPagarReceber.tsx` (novo): formulário de cadastro (nome, valor,
    categoria livre, tipo, vencimento, "repete todo mês?"), filtros por status/tipo, tabela com
    botão "Marcar pago"/"Marcar recebido" por linha (some sozinho quando já `pago`).
  - `app/page.tsx`: nova aba "📋 Contas a Pagar/Receber" dentro do grupo "💰 Financeiro",
    `soAdmin: true` — só existe neste arquivo (o admin), nunca em `app/pdv/page.tsx`, então
    Zu/Gabi não têm como chegar nela por nenhum caminho, não só por gating de role.

- **Testes realizados e resultado (dados sintéticos, apagados no fim):**
  - Cadastrei 3 contas reais via Playwright: 1 a pagar com vencimento 5 dias atrás
    (`TESTE-096 Atrasada`), 1 a pagar recorrente com vencimento em 3 dias (`TESTE-096 A Vencer`),
    1 a receber com vencimento em 10 dias (`TESTE-096 Receber`).
  - Confirmado por screenshot: lista mostra as 3, ícone 🔁 na recorrente; filtro "Atrasado" isola
    corretamente só a 1ª (as outras 2, ainda dentro do prazo, não aparecem).
  - Dei baixa nas 2 restantes via UI. Confirmado via SQL direto (não só a tela):
    - `TESTE-096 A Vencer` → `status: 'pago'`, `saida_vinculada_id` preenchido apontando pra uma
      linha real em `jsgrafica_saidas` (categoria/valor batendo exato) — **e uma nova instância
      recorrente foi criada sozinha** com vencimento exatamente 1 mês depois (`2026-07-10` →
      `2026-08-10`), `status: 'pendente'`.
    - `TESTE-096 Receber` → `status: 'pago'`, `pedido_vinculado_id` apontando pra um pedido real
      em `jsgrafica_pedidos` (`telefone: 'contas_a_receber'`, `status: 'entregue'`,
      `pagamento_confirmado: true`, valor batendo exato).
  - Testei a baixa duplicada direto na API (`PATCH` na mesma conta já paga): retornou erro
    ("Conta já está paga/recebida"), não gerou 2º lançamento.
  - Confirmado que PDV (logado como Zu) não tem essa aba em lugar nenhum do menu.
  - `npx tsc --noEmit` e `npm run build` limpos. Todos os dados sintéticos (3 contas + a instância
    recorrente gerada + a saída + o pedido) apagados via SQL depois do teste — produção não ficou
    com nenhum rastro de teste.

- **Achados fora do escopo:**
  - Escrevi por engano um trecho de regex com caracteres Unicode literais de acento (não a sequência
    de escape `̀-ͯ`) tentando enxugar acento no slug da categoria — pego antes do build,
    simplificado pra não precisar de acento nenhum (`categoria_id` já é texto livre, sem FK, não
    precisa de slug "perfeito").
  - Recebimentos avulsos (baixa de "a receber") agora aparecem na aba Pedidos com
    `telefone: 'contas_a_receber'` — mesmo padrão do balcão anônimo (`'balcao'`), não é bug, só
    registrando que é um lugar novo onde esse tipo de linha passa a aparecer.

- **Status final:** concluída e em produção (`dpl_93YBhYgxZ6oMinbgwQEECy1YCawx`). Destrava a 097.
