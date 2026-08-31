# 048 — Sugestão de resposta por IA no Inbox (botão manual)

Status: aprovada
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Item já era o próximo do backlog do projeto (`project_caixa.md`, item 11: "Sugestão de IA —
botão, não automático"), reforçado pela análise do PM sobre atendimento (2026-07-03). O layout
original do Inbox já reservava um ícone `[IA]` na barra de resposta, nunca implementado. Mockup
aprovado por Edvam: `https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb`.

**Regra inegociável, decisão antiga do projeto:** a IA nunca manda mensagem sozinha pro cliente.
Só sugere um rascunho que o atendente lê, edita se quiser, e manda manualmente.

## Objetivo
Atendente tem um botão que sugere uma resposta com base na conversa, editável antes de enviar —
reduz tempo de digitação sem tirar controle humano da decisão final.

## Escopo
- Incluído:
  1. Botão "✨ IA" na barra de resposta do Inbox (ao lado do anexo/enviar).
  2. Ao clicar: manda as últimas mensagens da conversa (ex. últimas 10-15) + nome do cliente +
     dados do pedido vinculado (se existir, ver demanda 045) pra um LLM (mesmo provedor já usado
     no `JSGRAFICA_ATENDIMENTO_AI`, Gemini — ou outro se o 03-APP achar mais adequado pra essa
     chamada específica, decisão técnica livre).
  3. Resposta vem preenchida no campo de texto (não enviada automaticamente) com uma legenda
     visível tipo "Sugestão da IA — edite antes de mandar".
  4. Segunda funcionalidade, mesmo escopo: botão "Resumir conversa" pra threads longas — mostra
     um resumo de 2-3 linhas no painel direito (não é mensagem, é só uma nota de apoio pro
     atendente entender rápido onde a conversa parou).
- Fora de escopo: qualquer envio automático — se o atendente não editar/mandar manualmente, nada
  sai pro cliente. Não reativar `JSGRAFICA_ATENDIMENTO_AI` nem mexer no bloqueio dela.

## Critérios de aceite
- [ ] Botão "IA" sugere uma resposta plausível baseada na conversa real, sem mandar sozinho
- [ ] Atendente consegue editar o texto sugerido antes de enviar (campo normal de digitação)
- [ ] Botão "Resumir conversa" gera um resumo coerente pra pelo menos 1 conversa longa real
- [ ] Testado com uma conversa real do Inbox (ex. Willianne Barbosa ou outra com bastante
      histórico)

## Riscos e cuidados
Deixar claro visualmente que é sugestão (não confundir com mensagem já enviada) — usar a mesma
cor/selo que já diferenciava isso no mockup, ou outra solução visual clara.

## Referências
Mockup: `https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb`. Backlog do
projeto (`project_caixa.md`, item 11). `components/TelaInbox.tsx`.

## Relato de execução

### O que foi feito
Escolha de provedor confirmada com o Edvam via pergunta direta: **Google Gemini** (não Anthropic).
Como o projeto não tinha nenhuma chave de LLM configurada (nem a do `JSGRAFICA_ATENDIMENTO_AI`,
que vive só no credential store do n8n, inacessível a este app), perguntei se ele já tinha uma
chave pra passar agora ou preferia deixar o código pronto e configurar depois — ele escolheu a
segunda opção. **A feature está 100% implementada e deployada, mas só funciona de fato depois
que `GEMINI_API_KEY` for adicionada em `.env.local` (local) e nas env vars da Vercel
(produção)** — sem a chave, os botões aparecem normalmente e mostram um erro claro em vez de
quebrar a tela (testado, ver abaixo).

Arquivos novos: `lib/gemini.ts` (chamada mínima à API do Gemini, modelo `gemini-2.0-flash`),
`lib/inboxContexto.ts` (busca as últimas 15 mensagens da conversa + pedido vinculado, direto no
servidor — não confia no que o client manda), `app/api/inbox/sugestao-resposta/route.ts`,
`app/api/inbox/resumir-conversa/route.ts`.

`components/TelaInbox.tsx`:
- Botão "✨ IA" na barra de resposta (ao lado do clipe) — preenche o campo de texto com a
  sugestão e mostra a legenda "✨ Sugestão da IA — edite antes de mandar" enquanto o texto não for
  editado manualmente (editar o campo ou enviar limpa a legenda).
- Botão "🧠 Resumir conversa" no painel de contato (topo, junto com os contadores) — mostra o
  resumo de 2-3 linhas num quadro roxo, com o rótulo "Resumo (nota interna)" deixando claro que
  não é mensagem.
- Nenhum dos dois envia nada sozinho — só populam estado local (`reply`/`resumoConversa`), o
  envio continua exigindo o clique manual de sempre no botão ➤.

### Testes realizados e resultado
- `npx tsc --noEmit` / `npm run build` — limpos.
- Sem `GEMINI_API_KEY` configurada (estado atual): `curl` nas duas rotas retorna erro claro
  ("GEMINI_API_KEY não configurada — peça pro Edvam...") em vez de 500 genérico ou crash — testei
  local e **em produção**, mesmo comportamento nos dois. Confirma que a busca de contexto (últimas
  mensagens + pedido) roda normal antes de falhar só na chamada externa.
- **Testado na UI real** (Playwright, conversa "Sr. Oliveira", 54 mensagens reais): os dois
  botões aparecem nos lugares certos; ao clicar, o erro de chave ausente aparece de forma limpa
  acima da caixa de texto (IA) e no painel de contato (Resumir) — sem travar a tela, sem
  mensagem nenhuma saindo pro cliente.
- **Não deu pra testar a geração de texto de verdade** (não tenho a chave). Recomendo, assim que
  a chave for adicionada, um teste rápido com uma conversa real pra validar a qualidade da
  sugestão/resumo antes de anunciar a feature pra equipe.

### Achados fora do escopo
Nenhum novo nesta demanda — os achados relevantes (bug do `lib/zapi.ts`/RLS e do `contact_lid`)
já foram registrados e corrigidos nas demandas 045/046.

### Status final
Concluída e deployada (`dpl_AUre9ENDWyEFPaMhpNPQBC4sabyt`) — **bloqueada em produção até
`GEMINI_API_KEY` ser adicionada** (decisão do Edvam: configurar depois). Assim que a chave
existir, não precisa de mais nenhum deploy — as rotas já leem `process.env.GEMINI_API_KEY` a
cada chamada.
