# 103 — Abertura de caixa vira portão obrigatório + "Fechar Caixa" passa a ser só fechamento

Status: concluída
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
Itens B2/B3 do checklist. Hoje a abertura de caixa (demanda 074) mora dentro da aba "Fechar
Caixa" (`TelaFechamento.tsx`, bloco `!isAdmin`). O Edvam descreveu a rotina real: **fechou à
noite → no dia seguinte, ao entrar no PDV, a primeira coisa que Zu/Gabi fazem é abrir o caixa —
não é uma aba que elas escolhem visitar, é um portão: não dá pra operar sem passar por ali
primeiro. Depois de abrir, cai na tela normal do sistema. No fim do dia, clica em "Fechar Caixa"
— aí sim abre a tela de fechamento.**

**🔴 Cuidado explícito do Edvam: o caixa de hoje já foi aberto pelo fluxo atual (aba, não
portão) — isso não muda retroativamente. O portão novo só entra em vigor a partir da próxima
abertura.** Horário mínimo: loja e PDV fecham às 18h, Admin fecha o caixa geral por volta das
19h — mas **não é regra automática de horário**, o Edvam confirmou que quer aprovar cada deploy
de risco individualmente. Não fazer deploy sem confirmação explícita pra esse deploy específico,
mesmo depois das 19h.

## Objetivo
Zu/Gabi não conseguem acessar o PDV sem antes registrar a abertura do dia; "Fechar Caixa" no
menu passa a ser só a ação de fechar, sem abertura misturada.

## Escopo
- Incluído:
  1. Novo componente/tela de bloqueio (gate) em `app/pdv/page.tsx`: ao logar, se não existe
     registro de abertura pra hoje (`jsgrafica_abertura_caixa`, mesma checagem que já existe em
     `carregarAbertura()`), mostra só o formulário de abertura — sem acesso a nenhuma outra aba
     até salvar. Depois de salvar, libera o resto do sistema normalmente.
  2. Admin (Edvam) **não passa por esse portão** — não tem gaveta física própria, mesma regra de
     hoje (bloco `!isAdmin` já existente).
  3. `TelaFechamento.tsx` perde o bloco de abertura (moveu pro portão) — fica só com a tela de
     fechamento (contagem física + botão fechar), como já é hoje pro Admin.
  4. Renomear a aba no menu se fizer sentido depois da mudança (avaliar com o resultado visual se
     "🔒 Fechar Caixa" ainda cabe ou se precisa de nome diferente — não é obrigatório mudar o
     nome, só o conteúdo).
- Fora de escopo: mudar a lógica de cálculo de divergência/saldo — só a localização da UI de
  abertura.

## Critérios de aceite
- [x] Zu/Gabi não conseguem acessar nenhuma aba do PDV sem abrir o caixa primeiro
- [x] Depois de abrir, acesso normal ao resto do sistema, sem pedir de novo no mesmo dia
- [x] Admin não vê esse portão (mesma regra de hoje)
- [x] "Fechar Caixa" continua funcionando igual, só sem o formulário de abertura misturado
- [x] Deploy feito depois das 19h **e** com confirmação explícita do Edvam pra esse deploy

## Riscos e cuidados
Mexe no mesmo arquivo que a demanda 099 (`TelaFechamento.tsx`) — **coordenar com o PM pra não
rodar simultâneo com a 099** (sem git nesse repo, risco real de conflito). Sugestão: 099 primeiro
(aditiva, pode ir a qualquer momento), 103 depois (Bloco B, espera as 19h **e** confirmação
explícita do Edvam). **Não fazer deploy sem essa confirmação, mesmo depois das 19h.**

## Referências
`components/TelaFechamento.tsx`, `app/pdv/page.tsx`, `jsgrafica_abertura_caixa`,
`app/api/abertura-caixa/route.ts`. Demanda 074 (abertura original). Demanda 099 (mesmo arquivo,
coordenar ordem). Demanda 073 (padrão de segurar deploy até horário seguro).

## Relato de execução

- **O que foi feito:**
  - Novo `components/PortaoAberturaCaixa.tsx` — extraído do bloco `!isAdmin` que antes vivia
    dentro de `TelaFechamento.tsx` (mesma lógica de `carregarAbertura`/`registrarAbertura`, sem
    reescrever do zero). Envolve todo o conteúdo do PDV: enquanto `operador.papel !== 'admin'` e
    não existe abertura pra hoje, mostra só o formulário (dinheiro/moedas) — nenhuma aba, nenhum
    menu, nada mais renderiza. Depois de salvar, ou se a abertura já existe (reload, ou já tinha
    sido feita mais cedo no dia), libera `children` normalmente. Admin sempre passa direto
    (`if (isAdmin) return children`), mesma regra da 074. Adicionei um link "Não é você? Sair"
    no portão (não pedido explicitamente, mas sem ele quem logasse errado ficaria preso sem saída
    até registrar uma abertura no nome errado).
  - `app/pdv/page.tsx`: todo o retorno da página (depois do login) passou a ficar envolto em
    `<PortaoAberturaCaixa operador={operador} onSair={...}>`.
  - `components/TelaFechamento.tsx`: removido o bloco `!isAdmin` de abertura (estado
    `abertura`/`carregandoAbertura`/`aberturaDinheiro`/`aberturaMoedas`/`salvandoAbertura`/
    `erroAbertura`, funções `carregarAbertura`/`registrarAbertura`, e o card JSX) — a tela ficou
    só com a contagem física + botão de fechar, igual já era pro Admin.
  - **Nome da aba**: avaliado e decidido **não renomear** — "🔒 Fechar Caixa" já descrevia só o
    fechamento antes (a abertura só "morava" ali por conveniência, não pelo nome), então o nome
    continua fazendo sentido sem a abertura misturada. Sem mudança no menu.

- **Achado durante a execução — edição concorrente no mesmo arquivo:** enquanto eu testava esta
  demanda, outra sessão aplicou a demanda 098 (nova aba "📥 Entradas", ledger) em cima do mesmo
  `app/pdv/page.tsx` (e também `app/page.tsx`) que eu tinha acabado de editar — sem git neste
  repo, isso é risco real de perda de trabalho. Conferi com cuidado depois: a edição da 098 foi
  puramente aditiva (import novo, entrada nova no tipo `AbaPDV`, item novo em `GRUPOS_NAV_PDV`/
  `ABAS_PDV`, 1 linha de render) e **não tocou** na área que eu tinha acabado de envolver com
  `<PortaoAberturaCaixa>` — o wrapper (abertura na linha do `return` e fechamento antes do `);`)
  seguiu intacto. Re-rodei `tsc`/`build` depois de confirmar, e testei de novo o fluxo do portão
  ponta a ponta pra ter certeza de que nada quebrou na composição das duas mudanças.

- **Testes realizados e resultado:**
  - Confirmado via API (`GET /api/abertura-caixa?operador=X`) que Zu e Gabi não tinham abertura
    hoje antes de testar — nada de sujar dado real por engano.
  - Playwright real: login como Gabi → gate aparece imediatamente, sem nenhum item de menu
    visível (nem "Atendimento" nem qualquer aba) — confirmado por screenshot. Registrei abertura
    (R$100 dinheiro + R$10 moedas) → gate sumiu, nav completo apareceu. Reload da página → não
    pediu de novo (abertura já existia). Fui em "Fechar Caixa" → confirmado que não tem mais o
    bloco "Abertura de caixa — hoje" (removido da 099/103), só a contagem física, e o "Total
    esperado" já refletia a abertura registrada (R$106,05 entradas + R$110 abertura = R$216,05).
  - Repeti com Zu (abertura R$50) — mesmo resultado, gate bloqueia, depois libera, sem pedir de
    novo.
  - Confirmado que **Admin (Edvam) nunca vê o gate**, mesmo entrando pelo PDV diretamente (não só
    pelo admin.jsgrafica.site) — vai direto pro app normal.
  - Todos os dados sintéticos (aberturas de teste de Zu e Gabi) apagados depois — verificado via
    API que `07-07-26` voltou a `abertura: null` pros dois, pronto pra abertura real deles.
  - `npx tsc --noEmit` e `npm run build` limpos (rodados de novo depois da edição concorrente da
    098, pra garantir que a composição das duas mudanças compila certo).

- **Status final:** concluída e em produção. Deployada 2x: `dpl_4TLQJ31guEZRqB4cuFV8MnXFwmzr` (1º
  deploy, sessão interrompida logo depois) e reconfirmada com `dpl_HhboRLzYRHAc6RihfWyHfAPP2n8x`
  (2º deploy, depois de retomar a sessão e reconferir tudo do zero: tsc/build limpos, portão
  testado de ponta a ponta de novo com Gabi/Zu, admin confirmado pulando o portão, "Sair"
  funcionando, e produção confirmada com `abertura: null` pros dois antes e depois do 2º deploy)
  — ambos depois da confirmação explícita do Edvam de que o caixa de hoje já tinha fechado.
  Próxima abertura de Zu/Gabi (amanhã) já passa pelo portão novo — a de hoje, feita pelo fluxo
  antigo, não foi mexida retroativamente, como pedido.
