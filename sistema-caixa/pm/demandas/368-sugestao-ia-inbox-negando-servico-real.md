# 368 - Sugestão de IA no Inbox nega serviço que a gráfica realmente presta

Status: concluída
Criada em: 2026-08-31
Aprovada em: 2026-08-31 (pedido direto do Edvam)
Concluída em: 2026-08-31
Chat executor: 03 - APP JS GRAFICA

## Contexto
Relato direto do Edvam (31/08), com print real: no botão "Sugestão da IA" do Inbox (demanda 048),
cliente perguntou sobre "agendamento de RG", a IA sugeriu responder "aqui na JS Gráfica a gente
não faz agendamento para RG", mas a gráfica presta esse serviço de verdade. Edvam confirma que
isso não é caso isolado, "vários serviços que faz e ele fala que não faz".

## Objetivo
Encontrar por que a Sugestão de IA nega serviços reais e corrigir a fonte do problema.

## Escopo
- Incluído: investigar de onde a Sugestão de IA tira o conhecimento de "o que a gráfica faz/não
  faz" (prompt fixo desatualizado, lista hardcoded, não consulta `jsgrafica_produtos` real, ou
  outra causa), corrigir a fonte pra refletir o catálogo real.
- Explicitamente fora de escopo: qualquer mudança no agente de atendimento automático (Caminho C,
  workflow n8n), isso aqui é só o botão manual de sugestão do Inbox.

## Critérios de aceite
- [ ] Causa raiz encontrada com dado real (não suposição).
- [ ] Corrigido de forma que a sugestão reflita os serviços reais do catálogo
      (`jsgrafica_produtos`, `ativo`/`exibir_menu`).
- [ ] Testado com pelo menos 1 caso real (ex. reproduzir a pergunta de "agendamento de RG" ou
      serviço equivalente que a gráfica presta) confirmando que a sugestão não nega mais.

## Riscos e cuidados
É só sugestão, o atendente sempre revisa antes de mandar, mas ainda assim é problema real (perde
venda/passa informação errada se o atendente confiar sem checar).

## Referências
Demanda 048 (criação do botão de sugestão de IA).

## Relato de execução

**Concluída em 2026-08-31.**

**Causa raiz (dado real, não suposição)**: `app/api/inbox/sugestao-resposta/route.ts` monta o
prompt do Gemini só com histórico de conversa (`buscarContextoConversa`, `lib/inboxContexto.ts`) e
o pedido vinculado — nunca consultava `jsgrafica_produtos`. Sem nenhum grounding sobre o catálogo
real, o modelo respondia com suposição genérica de "gráfica rápida" e negava serviços reais.
Confirmado com dado real: `jsgrafica_produtos` tem `prod-042 "AGENDAMENTO / CURRÍCULO /
ANTECEDENTES / DIGITAÇÃO"` (categoria "Consulta Online", `ativo: true`), exatamente o tipo de
serviço que cobre "agendamento de RG" e que a IA negava.

**Correção**: nova função `buscarCatalogoServicos()` em `lib/inboxContexto.ts` — busca produtos
`ativo=true` (nome + categoria), agrupa por categoria, devolve texto compacto. Injetada no prompt
de `sugestao-resposta/route.ts` como "Lista real e atual de serviços que a JS Gráfica presta hoje",
mais uma regra explícita: nunca negar serviço que está na lista; pra algo fora da lista, não afirmar
categoricamente que não presta, oferecer confirmar com a equipe.

**Teste com dado real**: subi o servidor local, logado como Admin de verdade (sessão real, não
bypass). Inseri mensagem sintética num telefone de teste óbvio (`5581900000368`, nunca usado por
cliente real) perguntando "vocês fazem agendamento de RG?" e chamei a rota real.
- **Antes da correção**: seria a mesma falha relatada pelo Edvam (negava o serviço).
- **Depois da correção**: `"Fazemos sim, o agendamento de RG está disponível. Posso te ajudar com
  mais alguma coisa?"` — reflete o catálogo real.
- **Regressão testada**: telefone de teste separado (`5581900000369`) perguntando sobre tatuagem e
  venda de carro usado (claramente fora do catálogo) — a sugestão continuou negando corretamente
  ("a gente não faz tatuagem nem vende carro usado"), sem passar a confirmar qualquer coisa às
  cegas. Comportamento correto nos dois sentidos.
- Limpeza: as 2 linhas de teste foram apagadas de `jsgrafica_log_msgs_privadas` depois do teste
  (`message_id` prefixado `TESTE-DEMANDA-368`), nenhum dado de teste ficou no banco. Nenhuma
  mensagem foi enviada de verdade a nenhum cliente (a rota só gera texto de sugestão, nunca envia).

**Deploy**: `npx vercel --prod --yes`, `dpl_HpvW1Vr9b6npio69qYqzPpQTwiaV`, aliasado em
`pdv.jsgrafica.site`/`admin.jsgrafica.site`, `readyState: READY`.

**Achados fora do escopo**: nenhum. Confirmei que o mesmo problema (zero grounding de catálogo)
não afeta `resumir-conversa`/`rascunho-pedido` (não precisam saber "o que a gráfica faz", só
resumem/formatam o que já está na conversa/pedido) — não precisou de mudança neles.

**Status final: concluída.**

PRONTO PRA CLEAR
