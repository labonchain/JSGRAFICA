# 114 — Atendimento automático ao abrir conversa + histórico de quem assumiu

Status: concluída — deployada em produção
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Item 10 do backlog. Duas coisas relacionadas:
1. Ao abrir uma conversa no Inbox, o status de atendimento deveria mudar automaticamente (hoje
   precisa de ação manual pra marcar "Em atendimento").
2. Falta um histórico de quem assumiu as últimas 3-5 conversas — cenário real: Edvam estava
   atendendo, Zu clica sem querer na mesma conversa, e não tem como saber quem estava
   conversando antes dela abrir sem querer.

## Objetivo
Abrir uma conversa marca "em atendimento" automaticamente (atribuído a quem abriu), e existe um
histórico visível de quem assumiu essa conversa recentemente.

## Escopo
- Incluído:
  1. Ao abrir uma conversa (clicar nela na lista), se o status ainda for "Aberto", muda
     automaticamente pra "Em atendimento" com o operador logado como atendente — sem precisar de
     clique extra.
  2. Novo histórico (tabela pequena ou campo jsonb na própria conversa/contato) registrando: quem
     abriu/assumiu, quando. Mostrar as últimas 3-5 entradas num lugar visível do painel da
     conversa (ex. abaixo de "Status do atendimento").
- Fora de escopo: qualquer notificação/alerta ativo ("Zu, você abriu a conversa do Edvam por
  engano") — só o histórico passivo, consultável.

## Critérios de aceite
- [x] Abrir conversa aberta muda pra "Em atendimento" automaticamente, atribuída a quem abriu
- [x] Histórico das últimas 3-5 trocas de atendente visível no painel
- [x] Testado com 2+ operadores abrindo a mesma conversa em sequência

## Riscos e cuidados
Mudança de comportamento numa tela de uso constante (Inbox) — testar bem o caso "conversa já em
atendimento por alguém, outra pessoa abre sem querer" pra confirmar que o histórico registra
certo sem duplicar.

## Referências
`components/TelaInbox.tsx`, `jsgrafica_contatos` (campo de status de atendimento já existente).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
1. **Migração**: coluna `historico_atendimento jsonb not null default '[]'` em
   `jsgrafica_contatos` — sem tabela separada, como o próprio escopo sugeria como opção (histórico
   curto, só leitura no painel).
2. **Função SQL `jsgrafica_registrar_atendimento(p_phone, p_operador)`**: append atômico no jsonb
   (busca o array atual, adiciona a entrada nova, mantém só as últimas 10 em ordem cronológica) —
   evita side-effects de ler-modificar-escrever em duas viagens separadas ao banco.
3. **`app/api/inbox/atendimento/route.ts` (PATCH)**: antes de gravar `status_atendimento`, checa
   se é uma troca de verdade (status ainda não era `em_atendimento` OU o atendente é diferente do
   que já estava) — só nesse caso chama a função de registrar histórico. Assim um re-clique no
   mesmo status pelo mesmo operador não polui o histórico com entradas repetidas.
4. **`app/api/inbox/conversas/route.ts`**: `historico_atendimento` incluído no select e devolvido
   como `historicoAtendimento` em cada conversa.
5. **`components/TelaInbox.tsx`**:
   - Nova função `assumirAutomaticamente(phone, statusAtual)` — só age quando `statusAtual ===
     "aberto"`; chama o mesmo `PATCH /api/inbox/atendimento` que o botão manual já usava, com
     `atendente: operador.nome`. Recebe o telefone explícito (não lê de `phoneAtivo`, que ainda
     não teria atualizado no instante do clique).
   - Clique num item da lista de conversas agora dispara `assumirAutomaticamente` junto com o já
     existente `setPhoneAtivo`/`setMensagens`.
   - `mudarStatus` (botões manuais) também espelha a entrada de histórico localmente, pro próximo
     poll de 5s só confirmar o que já apareceu na hora.
   - Novo bloco "Histórico de atendimento" dentro do Bloco 2 (Status do atendimento), logo abaixo
     da linha "Atendente: X" — mostra as últimas 5 entradas, mais recente primeiro
     (`operador assumiu · hora`, reaproveitando o helper `formatarHora` já existente no arquivo).

### Testes realizados e resultado
1. `npx tsc --noEmit`, `npx eslint`, `npm run build` limpos (nenhuma classe de erro nova).
2. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_3kuvYcGE79WrynBn9w4SoLfcTC58`**.
3. **Cenário de 2+ operadores, direto pela API** (contato sintético `999999000004@lid`, status
   inicial "aberto"):
   - Zu assume (`PATCH` com `atendente: "Zu"`) → histórico ganha 1 entrada.
   - Zu "abre de novo" (mesmo atendente, mesmo status) → **não duplicou** — histórico continuou
     com 1 entrada só.
   - Edvam assume por cima (atendente diferente) → histórico ganhou a 2ª entrada (Zu, depois
     Edvam), `atendente` final = "Edvam" — exatamente o cenário relatado pelo Edvam (alguém abre
     por cima de quem já estava atendendo).
4. **Confirmado com clique real na UI** (Playwright, `admin.jsgrafica.site`, login de verdade):
   resetei o mesmo contato de teste pra "aberto" e cliquei nele na lista do Inbox — screenshot
   confirma: cabeçalho da conversa mudou pra "Atendendo: Edvam" automaticamente (sem clicar em
   nenhum botão de status), badge "Em atend." na lista, botão "Em atendimento" destacado no Bloco
   2, e a seção **"HISTÓRICO DE ATENDIMENTO"** apareceu logo abaixo de "Atendente: Edvam" com a
   linha "Edvam assumiu · 01:18" — confirma os 2 primeiros critérios de aceite com evidência
   visual real, não só a API. Contato de teste apagado do Supabase depois dos dois testes.

### Achados fora do escopo
- O atalho "Abrir conversa no Inbox" vindo da tela de Clientes (demanda 083, prop `abrirConversa`)
  **não** dispara o assumir automático — só o clique direto na lista do Inbox, que é o cenário
  literal pedido no escopo ("ao abrir uma conversa (clicar nela na lista)"). Esse outro caminho
  não tem acesso fácil e sem race condition ao `statusAtendimento` atual da conversa no momento do
  clique (a lista pode nem estar carregada ainda). Registro caso o Edvam ache que devia cobrir
  esse caminho também.
- Nenhuma notificação/alerta ativo foi adicionada (fora de escopo explícito) — só o histórico
  passivo, como pedido.

### Status final
Concluída e deployada em produção (`dpl_3kuvYcGE79WrynBn9w4SoLfcTC58`). Os 3 critérios de aceite
confirmados — 2 deles (auto-assign + histórico) com clique real na UI, o 3º (2+ operadores em
sequência) com teste direto na API mostrando a troca de atendente sem duplicar o histórico.
