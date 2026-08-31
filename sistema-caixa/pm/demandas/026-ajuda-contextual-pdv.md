# 026 — Ajuda contextual no PDV (facilitar uso pra Zu/Gabi)

Status: aprovada
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Decisão do Edvam (2026-07-02): o PDV (usado por Zu e Gabi, não-técnicas, sem senha, login só
por seleção de nome) precisa ficar mais fácil de usar, com ajuda dentro do próprio app — sem
precisar de manual separado. Foco no PDV primeiro, não no Admin/Inbox.

## Objetivo
Adicionar dicas/ajuda contextual (tooltips, textos de apoio, mensagens claras) nos pontos do
PDV onde uma pessoa não-técnica mais provavelmente trava ou erra — sem mudar o fluxo/lógica
de negócio, só tornar mais claro o que fazer.

## Escopo
- Incluído:
  1. Revisar o fluxo real do PDV (login, categorias de produto, carrinho, Entrada Avulsa,
     Lançar Saídas, Fechar Caixa) e listar os 3-5 pontos mais prováveis de confundir alguém
     sem contexto técnico — priorizar especialmente "Fechar Caixa" (envolve saldo anterior,
     físico contado, divergência — conceitos que não são óbvios) e "Entrada Avulsa" (quando
     usar em vez de uma categoria).
  2. Adicionar texto de ajuda curto e simples nesses pontos (tooltip, texto abaixo do campo,
     ou mensagem de estado vazio mais explicativa) — linguagem simples, sem jargão.
  3. Melhorar feedback de ação (ex.: confirmação clara depois de registrar venda/saída/fechar
     caixa), se hoje for pouco claro que a ação funcionou.
- Fora de escopo: mudar o fluxo, adicionar telas novas, tutorial separado, ou mexer no
  Admin/Inbox — isso é só ajuda contextual dentro do PDV como está hoje.

## Critérios de aceite
- [ ] Lista dos pontos de confusão identificados, com a solução aplicada em cada um
- [ ] Testado visualmente (screenshot ou descrição) de como ficou cada ajuda adicionada
- [ ] Nenhuma mudança de lógica de negócio — só UI/texto

## Riscos e cuidados
Baixo risco (mudança aditiva de UI/texto) — mas evitar poluir a tela com ajuda demais; focar
só nos pontos realmente confusos, não em explicar o óbvio.

## Referências
`app/pdv/page.tsx`. Se o Edvam souber especificamente o que trava a Zu/Gabi no uso real, isso
tem prioridade sobre qualquer suposição.

## Relato de execução

### Ressalva de escopo encontrada
A demanda cita revisar "Lançar Saídas" como um dos fluxos — **essa aba não existe no PDV**
hoje (`AbaPDV` só tem `inbox | pdv | fechamento | movimento`; "Saídas" só existe no Admin,
`app/page.tsx`, que está fora de escopo desta demanda). Não criei a aba nem mexi no Admin — só
sinalizando a inconsistência entre a demanda e o app atual.

### Pontos de confusão identificados e o que foi feito
1. **Fechar Caixa (prioridade da demanda)** — `components/TelaFechamento.tsx`:
   - Bloco azul "Como funciona" logo no topo, explicando em linguagem simples o que é
     "total esperado"/"saldo acumulado", contagem física e divergência — antes disso só
     existia em `title` (tooltip de hover), que não é visível em tablet/touch nem óbvio pra
     quem não pensa em passar o mouse.
   - Texto de apoio sempre visível (não só tooltip) abaixo de cada campo — Saldo em conta/PIX,
     Dinheiro em cédulas, Moedas.
   - Frase explicando "Divergência" abaixo do valor (mantive o tooltip também, como reforço).
2. **Entrada Avulsa (prioridade da demanda)** — `app/pdv/page.tsx`: parágrafo curto abaixo do
   título explicando quando usar ("serviço que não está em nenhuma categoria ao lado... se já
   aparece numa categoria, use ela em vez desta tela").
3. **Modal "Precisa ir para impressão?"** (aparece depois de confirmar uma venda de produto
   real) — linha nova explicando que a venda já foi gravada e que isso só avisa a produção pra
   impressão, e que dá pra clicar "Não" se já foi entregue na hora. Sem isso, não ficava claro
   o que a pergunta realmente fazia.
4. **Vincular contato (carrinho)** — pequeno texto abaixo do campo de busca explicando que é
   opcional e pra que serve (ligar a venda a uma conversa do WhatsApp), mais um tooltip.

Não mexi na tela de login (já é só clicar no nome, sem confusão real) nem no fluxo de
categorias/modal de quantidade (autofocus + texto vazio do carrinho "Clique em um produto pra
adicionar" já cobrem isso) — pra não poluir a tela com ajuda que ninguém precisa.

Nenhuma mudança de lógica de negócio — só textos e um bloco informativo novo (confirmado lendo
o diff: `TelaFechamento.tsx` e `app/pdv/page.tsx` só ganharam JSX de texto/parágrafo, nenhuma
função ou cálculo foi alterado).

### Achados fora do escopo (relatados, não corrigidos)
- **Corrida no carregamento de produtos:** descobri durante o teste visual que o PDV às vezes
  abre direto na aba "Entrada Avulsa" em vez de "Xerox" (primeira categoria real). Causa
  provável: o `useEffect` que define a categoria ativa (`app/pdv/page.tsx`) roda antes dos
  produtos carregarem, quando `grupos` só tem "Entrada Avulsa" (que é sempre adicionada mesmo
  sem produto nenhum) — ele fixa `grupoAtivo = "Entrada Avulsa"` e nunca corrige depois que os
  produtos chegam de verdade. Não corrigi porque mexer nessa lógica seria "mudança de lógica",
  fora do escopo explícito desta demanda (só UI/texto) — mas pode ser exatamente o tipo de
  coisa que confunde Zu/Gabi (abrir o PDV e cair direto numa tela diferente da esperada). Vale
  virar demanda própria.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Teste visual de verdade, com screenshot** (Playwright + Chromium headless, instalado
  nesta sessão): subi o `next dev`, logei como "Zu" (a atendente não-técnica, público-alvo da
  demanda) em `pdv.localhost:3000/pdv` (o `middleware.ts` roteia por subdomínio — precisei
  usar esse host, `localhost` puro redireciona `/pdv` pra tela do Admin), e capturei:
  - Tela de login (sem mudança, confirmando que está ok como está)
  - Entrada Avulsa com o parágrafo novo
  - Fechar Caixa com o bloco "Como funciona" e os textos de apoio
  - Carrinho com o texto novo em "Vincular contato"
  - O modal de impressão com a frase nova, disparado clicando "Confirmar Venda" de verdade —
    **interceptei a chamada `POST /api/vendas` no navegador pra devolver uma resposta falsa
    de sucesso**, evitando gravar uma venda de teste no banco real (o projeto usa o Supabase
    de produção mesmo em `npm run dev` local, não tem banco de teste separado).
  - `console --errors` limpo em todos os passos.
- Não testei em tablet/touch real (só desktop 1440×900) — os textos são estáticos, então o
  comportamento deve ser o mesmo, mas não confirmei visualmente em tela menor.

### Deploy
`npx vercel --prod --yes` — deployment `dpl_4JiyWWpvbYAFoeaYma5x5sQt56Sg` (bundlado com
018/029/030). Confirmado em produção: `pdv.jsgrafica.site` respondendo 200.

### Status final
Concluída.
