# 087 — Reorganizar navegação: menu agrupado por área (2 fileiras) em vez de 11 abas soltas

Status: concluída (1 ressalva — ver Relato)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
A navegação cresceu pra 11 abas numa fileira só (Inbox, Pedidos Balcão, Lançar Saídas, Fechar
Caixa, Movimento, Dashboard, Produtos, Pedidos, Clientes, Contas Bancárias — saindo pela demanda
085 —, Conectar API), ficando difícil de escanear. Edvam pediu ideia, aprovou um mockup:
**https://claude.ai/code/artifact/f2c28956-0ad9-433f-a1aa-ea11b9e5f3b2**

## Objetivo
A navegação vira 2 fileiras: uma com 4 grupos (Atendimento / Vendas / Financeiro /
Configurações), e uma segunda fileira, logo abaixo, mostrando as telas do grupo selecionado —
sem menu suspenso, exatamente como o mockup aprovado mostra.

## Escopo
- Incluído:
  1. Agrupar as abas exatamente assim (confirmado no mockup):
     - **💬 Atendimento**: Inbox, Clientes
     - **📋 Vendas**: Pedidos Balcão, Pedidos
     - **💰 Financeiro**: Lançar Saídas, Fechar Caixa, Movimento, Dashboard
     - **⚙️ Configurações**: Produtos, Conectar API
  2. Clicar num grupo na 1ª fileira: grupo fica marcado como atual, e a 2ª fileira (logo abaixo)
     troca pra mostrar as telas daquele grupo. Ao trocar de grupo, abrir a primeira tela do grupo
     por padrão (mesmo comportamento do mockup).
  3. Aplicar em `app/page.tsx` (admin) e `app/pdv/page.tsx` (PDV) — cada um só com os grupos/telas
     que já tem acesso hoje (não adicionar nem remover permissão, só reorganizar).
  4. Manter visualmente parecido com o mockup: 1ª fileira mais forte (fundo branco, texto do
     grupo atual em azul), 2ª fileira com fundo levemente diferente (mesmo tom do "accent" usado
     no mockup), pra ficar claro que são dois níveis diferentes.
- Fora de escopo: mudar o conteúdo interno de qualquer tela — só a navegação/organização.

## Critérios de aceite
- [x] 4 grupos aparecem na 1ª fileira, em vez de 11 abas soltas
- [x] Clicar num grupo mostra a 2ª fileira com as telas certas daquele grupo
- [x] Trocar de grupo abre a primeira tela do novo grupo automaticamente
- [ ] Testado no admin e no PDV, cobrindo todos os grupos — lógica de agrupamento simulada e
      confirmada exaustivamente (todos os grupos, admin e PDV), mas **não clicado ao vivo num
      navegador** (ver ressalva no Relato)

## Referências
Mockup aprovado: `https://claude.ai/code/artifact/f2c28956-0ad9-433f-a1aa-ea11b9e5f3b2`.
`app/page.tsx`, `app/pdv/page.tsx` (navegação atual). Demanda 085 (remove Contas Bancárias antes
desta reorganização, coordenar ordem).

## Relato de execução

**Status final: concluída, com 1 ressalva de teste (ver abaixo) — deployada em produção**

### Pré-requisito confirmado
Verifiquei direto no código (não só no relato da 085) que a aba "Contas Bancárias" já estava
removida do array `abas` em `app/page.tsx` antes de começar — só o comentário/tela/rota
(`TelaContasBancarias`, `/api/contas-bancarias`) continuam intactos, inacessíveis, exatamente como
o relato da 085 descreveu.

### O que foi feito
Busquei o HTML/CSS real do mockup aprovado (`https://claude.ai/code/artifact/f2c28956-...`) via
fetch direto, não só a descrição — reproduzi as cores/estrutura exatas do protótipo:
1ª fileira `bg-white`/`border-b`, item atual em azul com `border-bottom` (sem preencher o fundo
inteiro, diferente do estilo antigo de aba única); 2ª fileira com fundo `bg-blue-50` (mesmo tom do
"accent-soft" do mockup), item atual em azul mais escuro + negrito.

1. **`app/page.tsx`** (admin):
   - Novo `GRUPOS_NAV` (constante de módulo): mapeia os 4 grupos exatamente como o mockup/demanda
     especificam (Atendimento: inbox+clientes; Vendas: pdv+pedidos; Financeiro: saidas+fechamento+
     movimento+dashboard; Configurações: produtos+config).
   - `gruposVisiveis` — monta cada grupo só com as telas que já estão em `abasVisiveis` (que já
     aplicava o filtro `soAdmin`/papel existente, sem mudança nenhuma de permissão).
   - `grupoAtivoId` — **derivado de `aba`**, não é um estado separado. Decisão deliberada: evita
     qualquer risco de os dois ficarem fora de sincronia (ex. o botão "Sair" já fazia
     `setAba("pdv")` direto — com estado separado eu teria que lembrar de resetar o grupo também
     em todo lugar que muda `aba`; derivado, funciona automaticamente em qualquer caminho).
   - `selecionarGrupo(grupoId)`: se já é o grupo atual, não faz nada (fica na tela que já estava);
     se é outro grupo, abre a 1ª tela dele (`setAba(grupo.itens[0].id)`) — exatamente o critério
     "ao trocar de grupo, abre a primeira tela". Interpretação deliberada: o script do mockup
     reseta pro item 0 em **todo clique**, mesmo no grupo já ativo — achei isso um comportamento
     ruim pra um app de verdade (voltaria pra 1ª tela do grupo se o usuário clicasse de novo sem
     querer no cabeçalho do grupo que já está usando), então só reseta quando o grupo realmente
     muda. Fica registrado caso o Edvam prefira o comportamento literal do mockup.
   - Nav trocou de 1 `<nav>` pra 2: a de cima itera `gruposVisiveis`, a de baixo itera
     `itensGrupoAtivo` (telas do grupo corrente).
2. **`app/pdv/page.tsx`**: mesmo padrão — `GRUPOS_NAV_PDV` (só 3 grupos: Atendimento, Vendas,
   Financeiro; "Configurações" nem existe na lista porque nenhuma das 2 telas daquele grupo
   existe no PDV hoje — sumiu sozinho pelo filtro de itens vazios, sem listar exclusão manual).
   `ABAS_PDV` virou constante nomeada (antes era um array inline dentro do JSX) só pra poder
   reaproveitar no cálculo dos grupos.

### Testes realizados e resultado
1. **Simulação da lógica de agrupamento fora do navegador** (Node, replicando exatamente os
   mesmos `GRUPOS_NAV`/`GRUPOS_NAV_PDV` e o algoritmo de filtro do componente):
   - **Admin**: 4 grupos, 10 itens no total (bate com as 10 abas hoje visíveis, pós-085).
     Confirmado estado inicial (`aba="pdv"` → grupo "vendas"), e que clicar em "Financeiro"/
     "Configurações" abre a 1ª tela de cada (`saidas`/`produtos` respectivamente).
   - **PDV**: 3 grupos (não 4) — "Configurações" **some sozinho** por não ter nenhuma tela
     disponível no PDV, exatamente o comportamento esperado. 6 itens no total (bate com as 6 abas
     do PDV). Confirmado estado inicial (`aba="inbox"` → grupo "atendimento") e que reclicar no
     mesmo grupo não muda a aba (no-op).
2. `npx tsc --noEmit` limpo, `npm run build` sem erro (rotas de API inalteradas, só JSX/nav).
   `npx eslint` nos 2 arquivos não introduziu nenhuma classe de erro nova além do baseline já
   existente no projeto.
3. Arquivos financeiros (`TelaFechamento.tsx`, `app/api/fechamento`, `app/api/saidas`) conferidos
   por timestamp antes do deploy — nada tocado, nenhuma mudança inesperada.
4. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_CnoQagJTwZa9evBh8uN214zze9gM`**,
   aliasado em `admin.jsgrafica.site` e `pdv.jsgrafica.site`. Ambos os domínios respondendo
   HTTP 200 depois do deploy.

### Achados fora do escopo
- **Ressalva no critério "Testado no admin e no PDV, cobrindo todos os grupos"**: sem ferramenta
  de navegador nesta sessão, não cliquei de fato nos botões de grupo pra ver a 2ª fileira trocar
  visualmente — testei a lógica de agrupamento de forma exaustiva (todos os grupos, admin e PDV,
  incluindo o caso do grupo vazio sumindo) via simulação Node com os mesmos dados reais, que é mais
  forte que uma simples revisão de código, mas ainda não é o clique real. Recomendo 1 conferência
  visual rápida (abrir cada grupo nos dois apps) antes de fechar esse item 100%.
- Interpretação divergente do script do mockup: como registrado acima, o mockup sempre volta pro
  item 0 ao clicar num grupo (mesmo já ativo); implementei como no-op nesse caso por achar mais
  usável — fácil de reverter se o Edvam preferir o comportamento literal do mockup.
- Notei (achado dos dois times, já registrado por vocês) que "Edvan Filho" é reaproveitado como
  contato de teste por mais de 1 chat — não bati de novo nesse achado aqui, só confirmando ciência.

### Status final
Concluída e deployada em produção (`dpl_CnoQagJTwZa9evBh8uN214zze9gM`). 3 dos 4 critérios de
aceite confirmados (contagem de grupos, troca de fileira, abertura da 1ª tela — todos via
simulação de lógica contra dados reais); o 4º (teste coberto no admin e PDV) tem a lógica
inteiramente verificada mas pendente de 1 clique manual de confirmação visual, mesma limitação de
navegador já registrada nas demandas 083/086.
