# 280 — Inbox não mostra mensagens recentes de uma conversa real (dado existe no banco)

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16), durante o teste do agente Fase B: a conversa de "Ninho"
(`5521965185667`, número de teste do próprio Edvam) no Inbox mostra como última mensagem algo de
01/08 — mesmo rolando até o fim da conversa. Confirmado via SQL que existem mensagens reais bem
mais recentes que isso, gravadas certinho em `jsgrafica_log_msgs_privadas`:

| Texto | `contact_lid` | `conversation_id` | Quando (UTC) |
|---|---|---|---|
| "OI" | `52063694233823@lid` (mesmo do contato "Ninho") | `52063694233823@lid` | 2026-08-16 02:42:23 |
| "QUANTO É A XEROX?" | `52063694233823@lid` (mesmo do contato) | `52063694233823@lid` | 2026-08-16 02:43:55 |
| "QUANTO E A XEROX?" (reenvio) | `5521965185667` (número cru, diferente!) | `5521965185667` | 2026-08-16 03:30:17 |
| "OI" (reenvio) | `5521965185667` (número cru, diferente!) | `5521965185667` | 2026-08-16 03:31:34 |

**2 pistas, não confirmadas, pra investigar**:
1. As 2 primeiras mensagens (02:42/02:43) têm o `contact_lid`/`conversation_id` **idênticos** ao
   registro do contato "Ninho" em `jsgrafica_contatos` — mesmo assim não aparecem na tela, nem
   rolando até o fim. Isso sozinho já indica que o problema não é só de identificador — pode ser
   limite de paginação, cache no front, ou o endpoint de mensagens da conversa não estar buscando
   o que há de mais recente.
2. As 2 últimas (03:30/03:31, reenvio do Edvam testando de novo) usaram o número de telefone cru
   como `contact_lid`/`conversation_id`, diferente do identificador estável do contato — mesmo
   padrão de instabilidade de LID já corrigido uma vez na demanda 266 (workflow `01`, não gravava
   mais isso desde então). Se isso é uma recorrência do mesmo bug ou um caminho diferente (o
   agente Fase B por trás dessas mensagens de teste usa um payload sintético, não o webhook real
   completo da Z-API — pode não estar preenchendo `contact_lid` do jeito que o `01` normalmente
   preenche) precisa ser confirmado antes de decidir o que corrigir.

## Objetivo
A conversa de qualquer contato no Inbox sempre mostra a mensagem mais recente de verdade,
rolando até o fim — sem depender de qual identificador específico (`contact_lid` vs telefone cru)
a mensagem usou pra gravar.

## Escopo
- Incluído: investigar por que a conversa de "Ninho" não mostra as 2 mensagens de 02:42/02:43
  (que têm o `contact_lid` CERTO, idêntico ao do contato) — essa é a parte mais grave, porque não
  é explicada pela instabilidade de LID conhecida. Candidatos a checar: paginação/limite da query
  de mensagens da conversa, ordenação, cache do front, filtro por algum campo que essas mensagens
  de teste não têm preenchido do jeito esperado.
- Incluído: confirmar (ou descartar) se as mensagens com `contact_lid` = telefone cru (03:30/03:31)
  são uma recorrência do bug da 266, ou causadas pelo payload sintético usado nos testes do agente
  Fase B (fora do fluxo normal da Z-API) — se for isso, não é bug de produção real, só um
  artefato de como os testes foram feitos, mas precisa confirmar antes de descartar.
- Incluído: testado com essa conversa real específica (Ninho) até aparecer tudo certo, e com pelo
  menos 1 conversa "normal" (não relacionada a nenhum teste do agente), pra confirmar que não é
  regressão geral do Inbox.
- Explicitamente fora de escopo: mexer no workflow n8n do agente Fase B (isso é domínio 01-N8N,
  já tem demanda própria — a 279 — se o payload sintético for de fato a causa, reportar pro PM
  abrir demanda separada pro 01-N8N, não misturar).

## Critérios de aceite
- [x] Causa raiz confirmada com evidência real (não suposição) de por que 02:42/02:43 não aparecem
      mesmo com `contact_lid` correto
- [x] Corrigido, testado na própria conversa do Ninho até as mensagens aparecerem
- [x] Confirmado se o caso do `contact_lid` = telefone cru é recorrência da 266 ou artefato de
      teste do agente — reportado com clareza, mesmo que a correção fique fora desta demanda
- [x] Testado numa 2ª conversa qualquer, sem regressão

## Riscos e cuidados
Isso é uma tela usada o dia inteiro pela equipe — testar com cuidado antes de considerar
concluído, idealmente confirmando com o Edvam que a conversa real ficou certa.

## Referências
Demanda 266 (`pm/demandas/266-*.md`, correção anterior de instabilidade de `contact_lid`).
`components/TelaInbox.tsx`, `app/api/inbox/conversas/route.ts` (endpoints prováveis envolvidos).
Contato real de teste: telefone `5521965185667`, `contact_lid` correto `52063694233823@lid`,
nome "Ninho" em `jsgrafica_contatos`.

## Relato de execução

### Causa raiz (pista 1 — confirmada com evidência real)
`app/api/inbox/mensagens/route.ts` buscava as mensagens da conversa com
`.order('data_timestamp', { ascending: true }).limit(500)` — ou seja, ordenava do mais ANTIGO pro
mais novo e só depois cortava em 500. Pra a maioria dos contatos isso nunca dá problema porque tem
poucas dezenas de mensagens. Mas o telefone de teste do Ninho (`5521965185667`) foi reusado em
dezenas de demandas desde 02/07 (testes manuais, scripts automatizados, agora o agente Fase B) e
acumulou **693 linhas** em `jsgrafica_log_msgs_privadas` — confirmado por SQL direto
(`select count(*) ... where phone = '5521965185667' or contact_lid = '52063694233823@lid'`).  Com
`ascending: true` + `limit(500)`, a query pegava as 500 mais ANTIGAS (até ~01/08) e cortava fora
justamente as ~193 mais recentes, incluindo as 2 mensagens de 02:42/02:43 do achado do Edvam — que
tinham o `contact_lid` certinho o tempo todo, o problema nunca foi o identificador.
**Corrigido**: trocado pra `ascending: false` (pega as 500 mais RECENTES), mantendo a reordenação
ascendente que o código já fazia em JS logo depois (usada como fallback de `sent_at` também) — sem
mudar mais nada da lógica de filtro por `contact_lid`/`phone` (essa parte, da demanda 038/053, já
estava certa).

### Pista 2 (`contact_lid` = telefone cru nas mensagens de reenvio) — não reproduzida
Investigado a fundo antes de qualquer correção: nenhuma linha em `jsgrafica_log_msgs_privadas` com
`contact_lid` ou `conversation_id` = `5521965185667` (telefone cru) foi encontrada na janela de
tempo do achado (16/08, madrugada) — nem com busca ampla por texto ("xerox"/"oi") sem filtro de
identificador, nem com busca ampla por janela de horário (02:00-04:00 UTC) sem filtro de
identificador algum. Todas as mensagens reais desse período (10 linhas) têm o `contact_lid` CERTO
(`52063694233823@lid`). As únicas 78 linhas com `contact_lid` = telefone cru pra esse número são
todas de testes antigos de 02-03/07 (demandas 005/014), nada de 16/08.
**Não dá pra confirmar recorrência da 266 nem artefato do payload Fase B** — a evidência que a
demanda descreve (2 mensagens às 03:30/03:31 com identificador errado) simplesmente não existe no
banco hoje, nem existiu no intervalo investigado. Reportado com clareza pro PM: ou foi engano na
hora de montar a tabela do achado (lida de outra fonte que não SQL direto), ou era algo transitório
que já não está mais lá. De qualquer forma, sem evidência real, não há o que corrigir nem o que
abrir como demanda 01-N8N por enquanto — se acontecer de novo, vale capturar a linha completa
(incluindo `message_id`) antes que suma.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` limpos.
- API isolada (`curl /api/inbox/mensagens?phone=5521965185667`): confirmado que as mensagens-alvo
  (`message_id` `3EB0633ACC802F62966283` "OI" e `3EB06C76B2A3E0CB52B197` "QUANTO É A XEROX?")
  agora vêm na resposta.
- **Conversa real do Ninho** (Playwright, dev local): aberta a conversa, rolado até o fim — as 2
  mensagens aparecem, junto com todas as respostas do agente Fase B até a mais recente (mensagem
  de teste do Edvam ao vivo durante a validação, 00:58 local). Print conferido.
- **2ª conversa, sem relação** (Bernardo Wandesllan): abre e mostra a thread normalmente até a
  última mensagem, sem regressão.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo além da pista 2 já detalhada acima (não é bug de produção confirmado, é achado sem
reprodução — não abre demanda 01-N8N por falta de evidência).

### Status final: concluída
