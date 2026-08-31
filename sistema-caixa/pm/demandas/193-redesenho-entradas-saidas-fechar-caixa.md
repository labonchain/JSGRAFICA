# 193 — Redesenho de Entradas + Saídas + Fechar Caixa (as 3 telas mais usadas)

Status: REVERTIDA a pedido do Edvam em 2026-07-15 (decisão: deixar de lado por enquanto) — trabalho 100% preservado em `pm/demandas/193-backup-codigo/`, pendente de retomada futura. Nada em produção hoje.
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Demanda 186 fez o levantamento completo das 6 sub-abas do Financeiro (prints em
`pm/demandas/186-prints/`, problemas transversais T1-T4 e lista concreta por tela). Edvam decidiu:
começar pelas 3 telas mais usadas — Entradas, Saídas e Fechar Caixa — porque **elas "dialogam"
entre si** (mesmo dinheiro, olhado de ângulos diferentes) e hoje cada uma tem um padrão visual
próprio (cabeçalho, seletor de período, formato de data). Dúvida explícita do Edvam, a resolver
nesta demanda: **juntar as 3 numa tela só, ou manter separadas mas com desenho consistente?** — o
critério é o que facilita mais pra quem usa no dia a dia, não preferência de arquitetura.

## Objetivo
Entradas, Saídas e Fechar Caixa ficam com desenho consistente entre si (ou unificadas, se for a
conclusão) e resolvem os problemas T1-T4 + os específicos de cada tela já listados na 186.

## Escopo
- Incluído:
  1. Antes de desenhar: avaliar juntar as 3 numa visão só vs. manter separadas-mas-alinhadas —
     decisão do executor, documentada com o raciocínio (o critério é facilitar o uso, não gosto
     pessoal). Se a conclusão for "juntar", pensar em como isso convive com o resto da navegação
     do Financeiro.
  2. Resolver os transversais T1-T4 nas 3 telas: cabeçalho padronizado, 1 jeito só de escolher
     período, data em formato BR em todo lugar (nunca mm/dd/yyyy), todo número com rótulo do que
     inclui.
  3. Problemas específicos já listados na 186 pra Entradas (quebra por forma de pagamento,
     agrupar por venda, separar evento de dinheiro), Saídas (aproveitamento de espaço, total do
     dia, blocos de vencimento, ruído dos botões) e Fechar Caixa (o que é obrigatório vs ajuste
     fino na contagem, corrigir o card "ainda não fechou", explicar saldo acumulado, legenda do
     sinal da divergência + marcar dia fechado/não fechado no histórico).
- **Antes de finalizar**: mandar prints (antes/depois) pro PM validar com o Edvam — só depois
  disso fazer o deploy final em produção. Mesmo processo já usado nas demandas 174/175/176.
- Explicitamente fora de escopo: Movimento (vira dashboard geral, demanda separada), Contas a
  Pagar/Receber e Mercado Pago (rodadas futuras).

## Critérios de aceite
- [ ] Decisão de juntar-ou-manter-separado tomada e documentada com o porquê
- [ ] T1-T4 resolvidos nas 3 telas
- [ ] Problemas específicos de cada tela (lista da 186) resolvidos
- [ ] Prints antes/depois mandados pro PM/Edvam ANTES do deploy final
- [ ] Testado com dado real

## Riscos e cuidados
Não decidir "juntar numa tela só" só porque parece mais elegante — validar que facilita de
verdade o uso diário antes de ir por esse caminho maior. Mandar print pra validação antes de
finalizar é obrigatório, não opcional.

## Referências
Demanda 186 (levantamento completo, prints em `pm/demandas/186-prints/`). Demandas 174/175/176
(mesmo processo de validação por print já usado).

## Relato de execução
**Etapa de 2026-07-15: implementado + testado localmente — prints aguardando validação; deploy
só depois do OK** (processo da demanda). Prints do DEPOIS em `pm/demandas/193-prints/`
(2 versões por tela); o ANTES são os prints da 186 (`pm/demandas/186-prints/`).

### Decisão: MANTER separadas, alinhadas (critério 1)
Juntar as 3 numa tela viraria um scroll gigante misturando três usos diferentes: **conferir**
(Entradas, leitura), **lançar** (Saídas, ação pontual) e o **ritual de fechamento** (formulário
longo e delicado) — quem fecha o caixa não quer rolar por listas do dia pra achar o botão. As
abas já são vizinhas no mesmo grupo; o "diálogo" entre elas veio de outro jeito: componentes
compartilhados (`components/FinanceiroUI.tsx` — cabeçalho e seletor de dia ÚNICOS) e o mesmo
vocabulário nos números. Se o Edvam usar e ainda sentir falta de uma visão única, a 194
(dashboard geral) é exatamente esse lugar.

### Transversais T1-T4 (critério 2)
- **T1**: `CabecalhoFinanceiro` (emoji + título + frase do que a tela é) nas 3.
- **T2**: `SeletorDia` único (Hoje + calendário + selo "Vendo DD/MM/AAAA" quando não é hoje) em
  Entradas e Saídas; Fechar Caixa é sempre "hoje" por natureza (só cabeçalho).
- **T3**: todo texto de data em DD/MM (inclusive o histórico do Fechar Caixa, que era 14-07-26).
  **Limite honesto**: o `<input type="date">` nativo segue o idioma do NAVEGADOR — no Chrome
  em português (o da gráfica) ele mostra dd/mm/aaaa; nos meus prints aparece mm/dd porque o
  Chromium de teste é en-US. Por isso o selo "Vendo DD/MM/AAAA" ao lado — a data escolhida
  nunca depende do input.
- **T4**: todo número grande ganhou rótulo: "Entrou em 15/07/2026 — N lançamentos de dinheiro
  (vendas + pedidos pagos); abertura/fechamento são eventos e não somam", "Saiu em ... (manuais
  + repasses automáticos)", "+ Entradas (pagas hoje)", "− Saídas (lançadas hoje)", "Saldo
  acumulado = saldo do último fechamento geral + entradas − saídas de hoje...".

### Específicos por tela (critério 3, lista da 186)
**Entradas** — quebra por forma de pagamento (chips Dinheiro/Pix/Cartão; `/api/entradas` passou
a devolver `forma`+`vendaId`; vendas legadas pré-054 não têm forma → "Sem forma registrada");
itens do mesmo carrinho agrupados ("🧾 Venda com N itens" com sub-linhas); abertura/fechamento
saíram da lista de dinheiro pra seção própria "Eventos do caixa (não somam)"; o contador do dia
conta só dinheiro; forma exibida em cada linha.
**Saídas** — a coluna lateral fixa morreu: "+ Adicionar saída" virou botão no cabeçalho + modal
(mesmo conteúdo/lógica de sempre, incl. Recarga VEM e ⚙️ categorias) e a tela inteira é o que
importa; Lançamentos ganharam o TOTAL do dia; previstas agrupadas em blocos com subtotal
(⚠️ Atrasadas / Vencem hoje / Próximos 7 dias / Mais adiante); Editar/Cancelar viraram ícones
discretos que se destacam no hover.
**Fechar Caixa** — card "JÁ FECHADO POR OPERADOR HOJE" (que dizia 'ainda não fechou') virou
"Gavetas dos operadores hoje" com estado honesto por linha (✅ com horário / 🕗 ainda não);
contagem com hierarquia explícita "1 · Conte a gaveta (essencial)" → "2 · Contas digitais do
dia (o que não movimentou fica R$ 0,00)" — dinheiro/moedas subiram pro topo, zero mudança de
cálculo; Saldo acumulado explicado; histórico com legenda do sinal (+ sobrou / − faltou),
datas com barras e **dias sem fechamento geral aparecem marcados** em vez de sumir da sequência
(buracos internos, máx. 7 por vão).

### Testes (dado real do dia 15/07 + 1 sintético apagado)
16 checagens de UI via Playwright (locale pt-BR), todas passando: os 3 cabeçalhos/seletores,
chips de forma (R$430,15 = 232,25 Dinheiro + 154,30 Pix + 43,60 Cartão do dia real), eventos
separados, modal de adicionar saída **lançando uma saída real de R$0,10 e cancelando em
seguida** (limpeza feita), blocos de vencimento com as contas reais, gavetas/hierarquia/
rótulos/legenda/dias-sem-fechamento no Fechar Caixa com o histórico real (12/07 e 11/07
aparecem como "sem fechamento geral"). `tsc` e build limpos.

### ⚠️ Operacional (importante pro PM)
O workspace NÃO tem git — as mudanças da 193 estão na árvore local e **qualquer deploy de outra
demanda a partir de agora leva a 193 junto**. Recomendo validar os prints logo; se o Edvam
pedir mudanças grandes, me avisem ANTES de qualquer outro deploy.



### Revertida em 2026-07-15 (a pedido do Edvam, via PM)
Decisão: deixar a 193 de lado por enquanto — será retomada depois. **Nenhum trabalho foi
perdido**: o código completo (as 3 telas redesenhadas + `FinanceiroUI.tsx` + os campos
`forma`/`vendaId` de `/api/entradas`) está salvo em `pm/demandas/193-backup-codigo/`
(extensão `.txt` de propósito, pra não entrar no build/typecheck enquanto guardado):
- `TelaEntradas-193.tsx.txt`, `TelaFechamento-193.tsx.txt`, `FinanceiroUI-193.tsx.txt`
- `TelaSaidas-app-page-193-bloco-return.tsx.txt` (o bloco JSX que ficava em `app/page.tsx`)
- `api-entradas-route-193.ts.txt`

Os arquivos live (`components/TelaEntradas.tsx`, `components/TelaFechamento.tsx`,
`app/api/entradas/route.ts`, a função `TelaSaidas` em `app/page.tsx`) voltaram exatamente ao
texto de antes da 193 — conferido linha a linha contra o que eu tinha lido no início da
demanda. `components/FinanceiroUI.tsx` (só existia pra 193, nada mais referenciava) foi
removido da árvore viva. Build e `tsc` limpos só com 195+196; produção conferida
(`/api/entradas` sem `forma`/`vendaId`, título "📥 Entradas — DD/MM/AAAA" de volta).

**Pra retomar no futuro**: os arquivos de backup têm o conteúdo pronto — é só copiar de volta
(removendo o `.txt`) e reconferir os imports/estado de `app/page.tsx` (dataDia/SeletorDia no
lugar de dataFiltro/hojeISO), já que a 195/196 não mexeram nesses arquivos.