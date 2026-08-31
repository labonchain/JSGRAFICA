# 158 — Fechar Caixa: reordenar pra mostrar o essencial primeiro (contagem + divergência)

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto — objetivo macro
Serve o objetivo 1 de `pm/OBJETIVOS-MACRO.md` (fechamento de caixa assistido, reduzir fricção do
fim de dia) — este é o primeiro passo concreto: **ajuste de layout, sem mexer em cálculo**, antes
de qualquer desenho de agente por WhatsApp.

Achado do Edvam (2026-07-10): a tela de Fechar Caixa tem informação importante embaixo quando
devia estar em cima — pra quem está fechando cansado no fim do dia, isso é fricção.

**Ordem confirmada hoje** (lido direto em `components/TelaFechamento.tsx`):
1. Cabeçalho + selo aberto/fechado
2. "Como funciona" (texto explicativo, sempre visível)
3. "Por operador hoje" (3 cards Edvam/Zu/Gabi)
4. 2 colunas: **esquerda** = "Resumo geral"/"Seu resumo hoje" + "Histórico dos últimos dias";
   **direita** = "Contagem física" (Mercado Pago automático + Caixa Econômica/Stone/RecargaPay
   manuais + Dinheiro/Moedas + Total físico contado + **Divergência** + botão "🔒 Fechar Caixa")
5. "Discriminação por forma de pagamento" (tabela)
6. "🔍 Diagnóstico do fechamento" (só Admin, 149-153)

A **ação que o Admin precisa fazer** (preencher a contagem física e ver se bate) e o
**resultado que ele quer ver primeiro** (divergência) estão na coluna da direita, depois de
rolar passar 2 blocos inteiros (explicação + por operador) que não são a tarefa do dia — são
contexto secundário.

## Objetivo
Ao abrir Fechar Caixa, o Admin vê e começa a preencher a Contagem física (a ação do dia)
imediatamente, sem rolar — o resto (explicação, por operador, histórico, discriminação,
diagnóstico) continua tudo presente e acessível, só deixa de competir por atenção logo de cara.

## Escopo
- Incluído:
  1. **Contagem física sobe pro topo** — primeiro bloco depois do cabeçalho/selo, tanto pra
     Admin quanto pra Zu/Gabi (visão reduzida delas, sem as 4 contas, continua igual — só muda
     onde o bloco fica na página).
  2. **"Como funciona" vira colapsável**, fechado por padrão (ex. um link/ícone "Como funciona
     isso? ⓘ" que expande o texto que já existe) — mantém a explicação pra quem precisa, sem
     ocupar espaço fixo pra quem já sabe usar.
  3. **"Por operador hoje" e "Resumo geral"/"Histórico dos últimos dias" descem** pra depois da
     Contagem física — continuam existindo exatamente como são, só de posição.
  4. **Discriminação por forma de pagamento e 🔍 Diagnóstico do fechamento continuam por
     último**, como já estão — não fazem parte da ação do dia, são consulta/investigação.
  5. Nenhuma mudança de cálculo: divergência, saldo esperado, pré-preenchimento automático do
     que Zu/Gabi já fecharam (127) — tudo intocado, só a ordem visual dos blocos.
- Fora de escopo: qualquer mudança nas telas de Movimento/Financeiro (gráficos) — não
  investigado se têm o mesmo problema, fica pra avaliação separada se confirmado depois.

## Critérios de aceite
- [ ] Contagem física é o primeiro bloco visível (depois do cabeçalho) pra Admin e pra
      Zu/Gabi, sem precisar rolar
- [ ] "Como funciona" começa fechado, expande com 1 clique, texto idêntico ao de hoje
- [ ] Nenhum cálculo mudou (divergência, saldo esperado, pré-preenchimento automático de
      Zu/Gabi) — testar um fechamento sintético e comparar valor a valor com o comportamento
      de hoje antes de considerar concluído
- [ ] Testado com os 3 papéis (Admin, Zu, Gabi) — a versão reduzida do operador continua
      mostrando só o que ela via antes, na nova posição

## Riscos e cuidados
- Tela usada todo santo dia pelas 3 pessoas do sistema — mudança de hierarquia visual, não só
  cosmética, testar com calma antes de produção.
- Não misturar com nenhuma mudança de cálculo — se achar algo errado no cálculo durante o
  trabalho, reportar separado, não corrigir dentro desta demanda.

## Referências
`pm/OBJETIVOS-MACRO.md` (objetivo 1). `components/TelaFechamento.tsx` (estrutura atual, linhas
239-538). Demanda 132 (última reorganização desta mesma tela — "Resumo"/"Histórico" viraram uma
coluna ao lado da Contagem física).

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_2EgTsMvpVFwmwaLvmj1WhGVKDfLk`,
verificado em produção com Zu e Gabi (visão reduzida real).

### O que foi feito (só JSX movido — zero linha de cálculo tocada)
Nova ordem em `components/TelaFechamento.tsx`:
1. Cabeçalho + selo (intocados)
2. **"ⓘ Como funciona isso? ▼"** — colapsável, fechado por padrão, 1 linha; expande com 1 clique
   pro MESMO texto de sempre (026), inclusive a variação admin/operador ("saldo acumulado" vs
   "total esperado")
3. **Contagem física** — virou o primeiro bloco de verdade (primeira posição do flex de colunas;
   em desktop aparece à esquerda, em tela estreita o wrap põe ela em cima)
4. "Resumo geral"/"Seu resumo hoje" + "Histórico dos últimos dias" — mesma coluna da 132, agora
   DEPOIS da contagem na ordem de leitura
5. "Por operador hoje" — desceu pra depois do flex
6. Discriminação por forma de pagamento e 🔍 Diagnóstico — últimos, como já estavam
Blocos movidos inteiros (recorte/reinserção mecânica, conteúdo byte-idêntico); comentários de
código atualizados com o porquê de cada posição.

### Cálculo intacto — como foi verificado
Nenhuma linha de estado/fórmula/POST mudou (a mudança é 100% posição de JSX). Verificação
valor a valor pela tela (admin local): digitando dinheiro R$100 + moedas R$50 com MP automático
R$0, a tela exibiu **Total físico R$150,00** e **Divergência -R$2.339,19** — exatamente
`150 − 2.489,19` (saldo acumulado real da API no momento). Pré-preenchimento da 121 sem mudança
de código (o efeito nem foi tocado).
**Decisão documentada: NÃO gravei um fechamento geral real** — o critério pedia "fechamento
sintético", mas o POST grava direto em `jsgrafica_fechamento` e marcaria o dia REAL (aberto, meio
da manhã) como "🟢 Fechado" pro sistema inteiro (selo da 099, saldo-base de amanhã). Como o POST
não foi tocado pela demanda e a comparação valor-a-valor foi feita na exibição (mesma fórmula que
alimenta o POST), gravar seria risco operacional sem ganho de verificação.

### Testes com os 3 papéis
- **Admin (local, Playwright + medidas de posição)**: Contagem física visível sem rolar
  (boundingBox acima da dobra) e ANTES do Resumo na ordem de leitura; "Por operador hoje" abaixo
  da contagem; colapsável fechado (texto ausente) → expande com o texto original → recolhe;
  screenshot.
- **Zu e Gabi (PDV de PRODUÇÃO, pós-deploy)**: contagem no topo sem rolar, antes do "Seu resumo
  hoje", colapsável fechado, e a visão reduzida delas segue exatamente reduzida — sem as 4
  contas do admin, sem Histórico, sem Diagnóstico (6 checks por operadora, screenshot da Zu).

### Critérios de aceite
- [x] Contagem física primeiro bloco visível sem rolar — Admin, Zu e Gabi
- [x] "Como funciona" fechado por padrão, expande com 1 clique, texto idêntico
- [x] Nenhum cálculo mudou — verificação valor a valor na tela (com a ressalva documentada acima
      sobre não gravar fechamento geral real no meio do dia)
- [x] 3 papéis testados; visão reduzida do operador idêntica em conteúdo, só reposicionada
