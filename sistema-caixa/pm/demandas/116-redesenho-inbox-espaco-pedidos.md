# 116 — Inbox: tirar painel de informações do contato, focar em pedidos

Status: concluída — deployada em produção
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Item 12 do backlog. No uso real, o painel de informações do contato (nome, telefone, resumo,
aniversário/endereço) está ocupando espaço que faz falta pra ver os pedidos direito — a tela fica
apertada. Edvam pediu pra tirar essas informações e focar o espaço em pedidos.

## Objetivo
Painel direito do Inbox tem mais espaço pros pedidos da conversa (mesmo com 2+ itens, sem
cortar).

## Escopo
- Incluído: remover ou reduzir drasticamente o bloco de informações do contato no painel direito
  do Inbox (`TelaInbox.tsx`), redistribuindo o espaço pro card de pedido(s) da conversa. Antes de
  remover de vez, confirmar com o PM se alguma informação do contato (ex. nome, telefone) ainda
  precisa aparecer em algum lugar mínimo — provavelmente sim, só compacto, não a versão detalhada
  atual (que já existe em Clientes).
- Fora de escopo: mudar a tela de Clientes (isso é a demanda 117).

## Critérios de aceite
- [x] Painel direito do Inbox mostra os pedidos da conversa sem cortar, mesmo com vários itens
- [x] Informação mínima do contato (nome, pelo menos) ainda visível, sem o bloco detalhado atual

## Riscos e cuidados
Mudança visual numa tela de uso constante — testar com uma conversa real de pedido múltiplo
(ex. o cenário da demanda 088) pra confirmar que o espaço extra realmente resolve o aperto.

## Referências
`components/TelaInbox.tsx`. `pm/conhecimento/backlog-feedback-uso-real-07-07.md` (item 11).

## Relato de execução

**Status final: concluída — deployada em produção**

### Decisão confirmada com o PM antes de implementar
Perguntei o que ficaria no lugar do bloco detalhado — confirmado: **só nome + telefone**, sem
avatar, sem o lápis de editar nome (essa edição já existe na tela Clientes, demandas 082/086), sem
os cards de Recebidas/Enviadas, sem "Último contato".

### O que foi feito
1. **Bloco 1 (Dados do contato)** — reduzido de ~9 elementos (avatar 40px, nome editável inline,
   telefone, grid Recebidas/Enviadas, Último contato, botão Resumir conversa + resultado) pra
   **2 linhas**: nome (itálico/cinza quando é "Contato privado", mesmo critério visual de sempre)
   + telefone. `padding` vertical também reduzido (`py-3` → `py-2`).
2. **"Resumir conversa" (demanda 048) não foi excluído** — é uma ferramenta de análise da
   conversa, não "informação do contato" no sentido literal do escopo, então **realocado pro
   Bloco 2** (Status do atendimento), logo depois do histórico de atendimento da demanda 114, em
   vez de apagar a funcionalidade.
3. **Código morto removido** (não só escondido): como a edição de nome saiu do Inbox por decisão
   explícita do PM, os 4 estados (`editandoNome`, `nomeEditado`, `salvandoNome`, `nomeErro`), o
   efeito que os resetava ao trocar de conversa, e as 2 funções (`iniciarEdicaoNome`,
   `salvarNomeContato`) foram removidos por completo — sem deixar código órfão, e a edição de nome
   continua funcionando normalmente em Clientes (endpoint `PATCH /api/inbox/contato` intacto, não
   mexi nele).

### Testes realizados e resultado
1. `npx tsc --noEmit`, `npx eslint`, `npm run build` limpos (nenhuma classe de erro nova).
2. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_4QtqYiESigV9HenxEBKjxjx6NPX7`**.
3. **Testado com o mesmo cenário da demanda 088** (pedido no exigido pelos riscos): recriei 2
   pedidos sintéticos com o mesmo `venda_id` pro contato real "Edvan Filho" (Xerox R$0,45 + Banner
   R$65,00) e abri a conversa em produção (Playwright, `admin.jsgrafica.site`) — screenshot
   confirma: painel direito mostra "Edvan Filho" + telefone em 2 linhas compactas no topo, Status
   do atendimento + Atendente + botão "Resumir conversa" logo abaixo, e o card **"🧾 Venda com 2
   itens · R$65,45"** aparece **completo**, com os 2 produtos, badges de status e botões
   "Avançar" individuais — sem cortar, com espaço de sobra (antes, com o bloco de contato
   detalhado, esse mesmo cenário ficava apertado, motivo original da demanda 088/116). Pedidos de
   teste apagados do Supabase depois.

### Achados fora do escopo
Nenhum — a tela de Clientes (fora de escopo aqui, é a demanda 117) não foi tocada; a edição de
nome nela continua idêntica.

### Status final
Concluída e deployada em produção (`dpl_4QtqYiESigV9HenxEBKjxjx6NPX7`). Os 2 critérios de aceite
confirmados com um cenário real de pedido múltiplo, com evidência visual (screenshot).
