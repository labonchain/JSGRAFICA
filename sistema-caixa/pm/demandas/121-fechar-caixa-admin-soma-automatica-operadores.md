# 121 — Fechar Caixa (Admin): mostrar e somar automaticamente o que Zu/Gabi já fecharam

Status: concluída
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA

## Contexto
Conversa longa com o Edvam sobre a jornada real do fechamento de caixa: Zu e Gabi contam e fecham
a própria gaveta física (dinheiro + moedas) no fim do dia. Depois, o Edvam (Admin, sem gaveta
própria — só controla banco/Pix) confere se o físico de cada uma bate com o que elas lançaram, e
só então fecha o **geral** (soma o dia inteiro, todas as formas de pagamento).

**Achado confirmado no código**: o campo "Contagem física" (Dinheiro em cédulas / Moedas) que o
Admin preenche na tela geral não é uma gaveta dele — é o **total físico do dia inteiro**,
comparado contra `getResumoDia()` (todas as formas, todos os operadores). Hoje o Admin precisa
somar de cabeça o que a Zu fechou + o que a Gabi fechou e digitar o total na mão — o sistema já
sabe os dois valores (estão salvos em `jsgrafica_fechamento`, por operador) mas não mostra nem
soma. **Essa é a fonte da confusão relatada.**

## Objetivo
Ao abrir "Fechar Caixa" como Admin, a tela mostra quanto cada operador (Zu, Gabi) já fechou de
dinheiro/moedas hoje (se já fechou), e os campos "Dinheiro em cédulas"/"Moedas" já vêm
pré-preenchidos com a soma — o Admin só confirma ou ajusta se achar diferença na conferência
física real, em vez de recalcular do zero.

## Escopo
- Incluído:
  1. Nova consulta (API): buscar as linhas de `jsgrafica_fechamento` do dia de hoje com
     `fechado_por` igual a um nome de operador conhecido (Zu, Gabi — mesmo critério de exclusão
     já usado em `ehFechamentoGeral()`, não incluir o geral do próprio Admin). Trazer `dinheiro`
     e `moedas` **reais, contados e submetidos por cada uma** (não o valor "esperado" calculado
     — o que elas de fato digitaram e confirmaram ao fechar a gaveta delas).
  2. Se Zu e/ou Gabi ainda não fecharam hoje, mostrar isso claramente ("Zu ainda não fechou") —
     não travar a tela do Admin nem impedir ele de fechar o geral mesmo assim (pode acontecer de
     precisar fechar geral antes de alguém, embora não seja o fluxo esperado).
  3. Painel novo (ou dentro do já existente "Contagem física") mostrando:
     ```
     Zu fechou com:   R$ 100,00
     Gabi fechou com: R$  80,00
     ─────────────────────────
     Soma: R$ 180,00
     ```
  4. Campos "Dinheiro em cédulas" e "Moedas" da Contagem física do Admin nascem **pré-preenchidos**
     com essa soma (dinheiro somado à parte, moedas somado à parte) — editável, o Admin pode
     ajustar se a conferência física real não bater.
- Fora de escopo: mudar a lógica de cálculo do "esperado" (`getResumoDia`) ou a divergência — só
  facilitar o preenchimento do que já existe.

## Critérios de aceite
- [x] Tela mostra quanto Zu e Gabi fecharam hoje (dinheiro e moedas), separado
- [x] Campos de Contagem física do Admin já chegam preenchidos com a soma
- [x] Admin ainda consegue editar/ajustar os valores livremente antes de fechar
- [x] Caso algum operador ainda não tenha fechado, isso fica claro na tela, sem travar nada

## Riscos e cuidados
Mudança de UX numa tela financeira sensível — testar o cenário completo (Zu fecha, Gabi fecha,
Admin abre a tela e confere se a soma pré-preenchida bate) antes de considerar concluído.

## Referências
`components/TelaFechamento.tsx`, `app/api/fechamento/route.ts`, `jsgrafica_fechamento`,
`ehFechamentoGeral()` (demandas 092/075, mesmo critério de separar geral vs. por operador).

## Relato de execução

- **O que foi feito:**
  - Nova `getFechamentosOperadoresHoje(dataDia)` em `lib/supabase-admin.ts` — busca as linhas de
    `jsgrafica_fechamento` do dia com `fechado_por` igual a um nome de atendente conhecido (Zu,
    Gabi — `USUARIOS.filter(papel === 'atendente')`, mesma fonte de verdade da 092/074, não uma
    lista fixa nova). Traz `dinheiro`/`moedas` reais gravados por cada uma ao fechar a própria
    gaveta (não o "esperado" calculado, que já existia via `getTotalDinheiroRecebidoOperador` mas
    serve pra outra coisa — a divergência da própria atendente). Pra cada atendente, retorna
    `{ operador, fechou, dinheiro, moedas, fechadoEm }` — `fechou: false` com valores zerados se
    ainda não fechou hoje, sem lançar erro nem travar nada.
  - `GET /api/fechamento` (branch geral, sem `?operador=`): passou a incluir
    `fechamentosOperadores` na resposta, junto no mesmo `Promise.all` que já buscava
    forma de pagamento/status/histórico.
  - `components/TelaFechamento.tsx`: novo painel "Já fechado por operador hoje" dentro do card
    "Contagem física" (só Admin), mostrando cédulas + moedas de cada atendente separadamente (ou
    "ainda não fechou" em âmbar) e a soma no rodapé. Novo `useEffect` com guarda `useRef` pré-
    preenche os campos "Dinheiro em cédulas"/"Moedas" com a soma **uma única vez** ao carregar (não
    reaplica em cada re-render, não sobrescreve se o Admin já tiver ajustado manualmente) — só
    preenche se pelo menos 1 atendente já fechou; se nenhuma fechou ainda, os campos ficam vazios
    normalmente (não força "0"). Campos continuam inputs normais, editáveis como antes.

- **Testado exaustivamente, tudo sintético e apagado depois (SQL direto na tabela, não via POST
  real de fechamento — evitar gravar uma linha `fechado_por` real pra Zu/Gabi no dia de hoje antes
  delas fecharem de verdade):**
  - Cenário completo (Zu e Gabi "fechadas", valores diferentes: R$90+R$10 e R$75+R$5): painel
    mostra os 2 nomes com cédulas/moedas certos, soma exata (R$165,00 cédulas + R$15,00 moedas),
    campos "Dinheiro em cédulas"/"Moedas" nasceram com `165`/`15` sem precisar digitar nada —
    confirmado via Playwright (screenshot + leitura do `value` do input).
  - Cenário parcial (só Zu fechada): Gabi mostra "ainda não fechou" em âmbar, soma e pré-
    preenchimento consideram só a Zu (R$90/R$10) — nada trava, resto da tela normal.
  - Cenário real atual (ninguém fechou hoje ainda, `08-07-26`): as 2 mostram "ainda não fechou",
    soma R$0,00/R$0,00, campos ficam vazios (não forçam "0,00") — testado no estado real do banco
    antes de escrever qualquer dado sintético.
  - Confirmado que o resto da tela (Resumo geral, Por operador hoje, selo aberto/fechado,
    histórico, discriminação por forma de pagamento) segue funcionando sem regressão nos 3
    cenários.

- **Verificações finais:** `npx tsc --noEmit` e `npm run build` limpos.

- **Status final:** concluída e em produção (`dpl_Hc22s9EBYbR54pi2QEK6gVuPExva`, aliasado em
  `pdv.jsgrafica.site` e `admin.jsgrafica.site`).
