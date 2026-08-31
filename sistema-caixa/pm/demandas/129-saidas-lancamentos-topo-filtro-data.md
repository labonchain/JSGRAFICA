# 129 — Saídas: "Lançamentos" sobe pro topo e ganha filtro por data

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 123 reorganizou a aba "Saídas" em 2 cards: "Saídas previstas" (contas a pagar) em cima,
"Lançamentos de hoje" embaixo. Usando a tela de verdade (2026-07-09), o Edvam apontou 2 problemas:
1. O card de lançamentos deveria vir **primeiro** (é o que se usa mais no dia a dia — conferir o
   que já foi lançado — não as contas previstas, que mudam pouco).
2. Só mostra **hoje** — não dá pra ver lançamentos de outro dia sem ir direto no banco.

## Objetivo
"Lançamentos" aparece no topo da aba Saídas, com um seletor de data pra ver qualquer dia (não só
hoje).

## Escopo
- Incluído:
  1. Inverter a ordem dos cards: "Lançamentos" em cima, "Saídas previstas" embaixo.
  2. Renomear "Lançamentos de hoje" pra só "Lançamentos" (já que deixa de ser só hoje).
  3. Adicionar seletor de data no card (padrão simples: um `<input type="date">` ou atalho
     Hoje/Ontem, à escolha do executor) — ao trocar a data, a lista recarrega pros lançamentos
     daquele dia (`GET /api/saidas?data=...` ou equivalente, conferir se a rota já aceita
     parâmetro de data ou precisa ganhar um).
  4. Padrão ao abrir a tela continua sendo "hoje" (não muda o comportamento default, só adiciona
     a opção de trocar).
- Fora de escopo: mudar o card "Saídas previstas" (Contas a Pagar/Receber) — isso é assunto da
  demanda 125.

## Critérios de aceite
- [x] "Lançamentos" aparece antes de "Saídas previstas" na tela
- [x] Seletor de data funciona, mostra lançamentos reais do dia escolhido
- [x] Abrir a tela sem mexer em nada continua mostrando hoje, sem regressão

## Referências
Demanda 123 (criação original dos 2 cards). `components/TelaSaidas.tsx` (ou nome equivalente),
`app/api/saidas/route.ts`.

## Relato de execução

### O que foi feito
- **`GET /api/saidas`**: ganhou `?data=DD-MM-AA` opcional (formato validado, 400 se inválido) —
  sem o parâmetro, continua devolvendo hoje, comportamento idêntico ao original da 091. A rota
  não aceitava parâmetro nenhum antes (conferido, precisou ganhar um).
- **UI** (`TelaSaidas` em `app/page.tsx`): cards invertidos — "Lançamentos" (renomeado, sem o
  "de hoje") no topo, "Saídas previstas" embaixo. No cabeçalho do card: `<input type="date">`
  (mesmo padrão da demanda 110 em Entradas, com `max` = hoje) + atalho **"Hoje"** que só aparece
  quando a data selecionada não é hoje. Trocar a data recarrega a lista pro dia escolhido; o
  texto de lista vazia também se adapta ("ainda hoje" vs "nesse dia"). Padrão ao abrir: hoje.
- **Nada da 130 foi revertido**: os botões Editar/Cancelar, o modal e o selo "✎ editada"
  continuam em cada card — o bloco foi movido inteiro, não reescrito.

### Testes realizados (só leitura de dado real, nenhum sintético necessário)
- **API**: sem parâmetro → hoje (2 saídas reais, R$32,50); `?data=08-07-26` → as 4 saídas reais
  daquele dia (R$132,54); `?data=2026-07-08` (formato errado) → 400 com mensagem clara.
- **UI (Playwright)**: ordem dos títulos confirmada (`["Lançamentos","Saídas previstas"]`);
  abre com os 2 lançamentos de hoje; trocando pra 08/07 aparecem os 4 reais daquele dia (Taxas
  de cartões, Retiradas Sócios, Repasse Recarga Celular, Material de expediente), com os botões
  da 130 presentes em cada um; botão "Hoje" aparece e volta pro padrão (2 cards de hoje de novo).
- **Produção** pós-deploy: `?data=08-07-26` devolvendo as 4 linhas.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_AhMCrAkevqZNcoMiBsy2HSDrCS1w`).
