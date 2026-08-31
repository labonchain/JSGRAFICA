# 094 — Mockup das melhorias do Financeiro, em cima do que já está implementado (não do zero)

Status: concluída
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Depois de ver referências reais do Bling (prints do site oficial deles, não invenção), o Edvam
aprovou 3 ideias de melhoria no Financeiro — mas quer ver o mockup **em cima do que já existe
hoje** (`components/TelaFinanceiro.tsx` e `components/TelaFechamento.tsx`, das demandas 074/075),
não um desenho do zero. Como este chat tem acesso ao código rodando de verdade (Playwright), fica
mais fiel do que o PM tentando reconstruir a tela atual por descrição.

**Isso é só mockup — não implementar as mudanças ainda.** Objetivo é aprovação visual antes.

## As 3 ideias a mockar (baseadas nos prints reais do Bling, ver
`pm/conhecimento/proposta-fluxo-financeiro.md`)
1. **Selo colorido de status** — pedidos com pagamento pendente e saídas ganham um selo visual
   (verde/âmbar/vermelho), como o "Vence hoje"/"Atrasada"/"Recebida" do Bling — em vez de só
   texto.
2. **Menu de relatórios nomeados** — em vez de só a tela "Financeiro" única, um menu com
   relatórios específicos (ex.: Fluxo de Caixa, Relatório de Controle de Caixa, Relatório de
   Saídas), cada um com filtro de Período + filtro por **Operador** (Edvam/Zu/Gabi — adaptação
   nossa do filtro "Loja" do Bling, que não se aplica aqui) + botão "Visualizar".
3. **Contas/Saídas como lista filtrável** — "Lançar Saídas" (já tem histórico da 091) ganha busca
   e filtro por categoria/período na mesma lista.

## Escopo
- Incluído:
  1. Tirar print real (Playwright) das telas atuais: "📊 Financeiro", "🔒 Fechar Caixa", "💵
     Lançar Saídas" — como estão agora, de verdade.
  2. Montar um mockup (HTML estático ou artefato próprio, à escolha do executor) mostrando as 3
     ideias aplicadas **em cima** dessas telas reais — mesma paleta de cor, mesma estrutura, só
     com as mudanças propostas visíveis.
  3. Compartilhar o link/arquivo do mockup — não implementar nada de verdade nesta demanda.
- Fora de escopo: implementar qualquer uma das 3 ideias de verdade — só mockup, aguardando
  aprovação do Edvam antes de virar demanda de implementação.

## Critérios de aceite
- [x] Print real das 3 telas atuais anexado/usado como base
- [x] Mockup mostra as 3 ideias aplicadas, visualmente parecido com o sistema real (não um design
      novo do zero)
- [x] Link do mockup compartilhado pro PM/Edvam revisar

## Referências
`pm/conhecimento/proposta-fluxo-financeiro.md` (as 3 ideias, com fonte real do Bling).
`components/TelaFinanceiro.tsx`, `components/TelaFechamento.tsx` (telas reais a fotografar).
Demanda 091 (Lançar Saídas, já tem histórico, ponto de partida pra ideia 3).

## Relato de execução

**Status final: concluída — mockup pronto pra aprovação, nada implementado de verdade**

### O que foi feito
1. **Prints reais via Playwright** (não mockado, não recriado por descrição): confirmei que o
   pacote `playwright` está disponível via `npx` neste ambiente (Chromium já instalado em
   `~/AppData/Local/ms-playwright`, mesma infra que o 03-APP usa) e escrevi um script Node que
   loga de verdade em `admin.jsgrafica.site` (senha do admin, `lib/usuarios.ts`), abre o grupo
   "💰 Financeiro" da navegação (demanda 087) e tira screenshot full-page de cada uma das 3
   sub-abas reais: **💸 Lançar Saídas**, **🔒 Fechar Caixa**, **📊 Financeiro** — como estão em
   produção agora, com dados reais (ex. lançamentos de hoje do Edvam, R$1.371,96 de saldo
   acumulado).
2. **Mockup HTML** (artifact único, publicado): pra cada uma das 3 telas, um toggle "Hoje" /
   "Proposta" — igual ao mecanismo já aprovado no mockup da demanda 087. "Hoje" mostra o print
   real (imagem, não recriado). "Proposta" é HTML/CSS codificado à mão replicando a mesma
   estrutura e paleta de cor real (header azul, nav de 2 fileiras, cards brancos, verde/vermelho
   pra entradas/saídas — cores tiradas direto do app, não inventadas), com as 3 ideias aplicadas:
   - **Lançar Saídas**: campo de busca + filtro de período acima da lista "Lançamentos", e um
     selo verde "● Pago" em cada lançamento.
   - **Fechar Caixa**: selo por operador ("🟢 Confere" / "🟡 Contar") nos 3 cards de entrada, e um
     selo "🟡 Fechamento em aberto" no resumo geral.
   - **Financeiro**: o filtro de período único virou um menu de 3 relatórios nomeados (📈 Fluxo de
     Caixa / 🔒 Controle de Caixa / 💸 Relatório de Saídas), cada card com nome + descrição curta;
     abaixo, filtro de Período + **Operador** + botão "Visualizar" — o conteúdo mostrado
     (idêntico ao de hoje) é o resultado do relatório "Fluxo de Caixa" selecionado.
   - Um quarto bloco no topo (3 cards curtos) explica as 3 ideias antes das telas, e uma nota azul
     "💡 Novo: ..." dentro de cada "Proposta" explica a mudança específica daquela tela.
3. **Design**: segui a diretriz de honrar o sistema existente — não inventei paleta nova. Cores,
   tipografia (system-ui, mesmo stack do app) e espaçamento vieram direto dos prints reais. Página
   funciona nos dois temas (claro/escuro) — o "app-frame" (réplica da UI real) fica sempre no
   visual claro do sistema de verdade (que não tem dark mode), mas o resto da página (cards de
   ideias, notas, fundo) respeita o tema do visualizador.

### Testes realizados e resultado
1. Self-check visual: rodei o próprio mockup no Playwright (arquivo local) e tirei screenshot de
   cada estado ("Hoje" de cada tela + "Proposta" de cada tela, 6 no total) pra conferir visualmente
   antes de publicar — toggle funcionando, sem sobreposição/quebra de layout, cores batendo com o
   print real ao lado.
2. Conferido modo escuro (`colorScheme: 'dark'` no Playwright) — contraste ok, nada ilegível.
3. Link publicado como Artifact: **https://claude.ai/code/artifact/feec01d8-c90b-4f2f-838f-1254eb223877**

### Achados fora do escopo
- **Mesmo achado da demanda 091** (registrado lá, confirmado aqui de novo): há muitos processos
  `chrome.exe` órfãos rodando na máquina (17 no momento em que verifiquei, nenhum `node.exe` pai
  vivo — confirmando que são órfãos de sessões de teste anteriores, não do meu script, que sempre
  fechou o browser + `process.exit(0)` certinho). **Não matei nenhum processo** — diferente da
  091, não tive um build travando por falta de memória que justificasse essa ação, e não dá pra
  distinguir com segurança um processo órfão de teste de uma janela de navegador real que alguém
  esteja usando. Fica registrado — se o próximo build/teste travar por memória, esse é o motivo
  provável.
- Não usei o servidor `next dev` local pra esta demanda — como é só mockup (nenhum código do app
  foi alterado), tirei os prints direto de produção (`admin.jsgrafica.site`), que é exatamente o
  que o Edvam vê hoje.

### Status final
Concluída — mockup publicado, aguardando aprovação visual do Edvam antes de virar demanda de
implementação de verdade. Nenhum código de produção foi alterado nesta demanda.
