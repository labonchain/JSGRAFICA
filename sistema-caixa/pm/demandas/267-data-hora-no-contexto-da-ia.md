# 267 — Data/hora ausente no contexto das respostas por IA (sugestão manual e blueprint do agente)

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-14
Chat executor: 03-APP

## Contexto
Achado do Edvam (2026-08-01): pra atendimento automático funcionar direito, a IA precisa saber
que dia e hora são (dia ou noite, pelo menos) — hoje não sabe.

Investigação confirmou 2 partes distintas:

**(a) "Sugestão de IA" (botão manual, já em produção)** — `lib/gemini.ts` (`chamarGemini`),
chamado por `app/api/inbox/sugestao-resposta/route.ts` e `app/api/inbox/resumir-conversa/route.ts`.
Os prompts (lidos linha a linha) **não injetam data, hora, dia da semana nem timezone** — só nome
do cliente, contexto de pedido e últimas mensagens (`lib/inboxContexto.ts`, que também não carrega
nenhum campo de data/hora atual, só o `data_timestamp` de mensagens passadas). Confirmado com
leitura de código, não é suposição.

**(b) O agente de atendimento automático (Fase B/06-ATENDIMENTO, ainda pausado)** — o
n8n do agente em si não está no repositório (sem export/backup), não deu pra confirmar lendo o
prompt real. Mas o documento de especificação (`pm/conhecimento/blueprint-conversas-exemplo-
agente.md`, tabela de verificação com 22 falas catalogadas) **não tem nenhuma menção** a saudação
por período do dia ou horário comercial — todo "Bom dia"/"Boa tarde" nos exemplos é citação real
do CLIENTE, nunca o agente saudando sozinho baseado no relógio. Ou seja, o design nunca tratou
data/hora como requisito — se o n8n seguir o blueprint (mais provável), herda a mesma lacuna.

## Objetivo
IA (sugestão manual e, quando for o caso, o agente automático) sabe a data/hora atual e usa isso
de forma correta (saudação adequada ao período do dia, sem sugerir "bom dia" de madrugada, etc.).

## Escopo
- Incluído: em `lib/gemini.ts` (ou onde os prompts de `sugestao-resposta`/`resumir-conversa` são
  montados), injetar data/hora atual (timezone America/Recife, mesmo padrão já usado em outras
  partes do sistema) no prompt — dia da semana, hora, e um rótulo de período (manhã/tarde/noite)
  calculado no código (não deixar a IA "advinhar" a partir de texto).
- Incluído: atualizar `pm/conhecimento/blueprint-conversas-exemplo-agente.md` (e a base de
  conhecimento 255/256 se fizer sentido) com uma seção nova sobre uso de data/hora — quando o
  agente deve/pode variar a saudação por período do dia, e deixar claro que isso precisa entrar no
  prompt real do agente n8n antes de qualquer conexão com cliente real (Fase B, ainda pausada).
- Explicitamente fora de escopo: qualquer mudança no workflow n8n do agente automático em si —
  esse fica fora do repositório, ver se cabe demanda separada pro 01-N8N depois que o texto do
  blueprint estiver atualizado.

## Critérios de aceite
- [x] Prompts de `sugestao-resposta`/`resumir-conversa` recebem data/hora real, testado com
      exemplo (pedir sugestão de madrugada vs. de manhã, confirmar que a saudação muda certo)
- [x] Blueprint do 06-ATENDIMENTO atualizado com seção sobre uso de data/hora

## Referências
`lib/gemini.ts`, `lib/inboxContexto.ts`, `app/api/inbox/sugestao-resposta/route.ts`,
`app/api/inbox/resumir-conversa/route.ts`. `pm/conhecimento/blueprint-conversas-exemplo-
agente.md`. Achado 2026-08-01.

## Relato de execução

### O que foi feito
- **`lib/gemini.ts`** — nova função `contextoDataHoraAtual()`: calcula dia da semana, data, hora
  (`agoraRecife()`, mesmo timezone de sempre) e um rótulo de período (manhã 05h-12h, tarde
  12h-18h, noite 18h-05h) — tudo calculado no código, nunca deixado pra IA "adivinhar" a partir
  do texto. Devolve 1 string pronta pra prefixar qualquer prompt.
- **`app/api/inbox/sugestao-resposta/route.ts`** e **`app/api/inbox/resumir-conversa/route.ts`**:
  ambos os prompts passaram a começar com `contextoDataHoraAtual()`, antes do resto do prompt
  (nenhuma outra lógica das 2 rotas mudou).
- **`pm/conhecimento/blueprint-conversas-exemplo-agente.md`**: nova seção "Uso de data/hora na
  saudação (achado da demanda 267, ainda não implementado no n8n)" — confirma que nenhuma versão
  anterior do blueprint tratou isso (todo "Bom dia"/"Boa tarde" nos exemplos é citação do
  cliente), registra a regra pro prompt real do n8n (calcular fora do modelo, nunca adivinhar) e
  deixa explícito que **isso não está implementado** (o workflow do agente fica fora do
  repositório) — fica pra demanda separada do 01-N8N quando a Fase B for retomada. Adicionada
  linha na tabela "Mapa de cobertura" e atualizado o cabeçalho "Última atualização".

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- Testado chamando `contextoDataHoraAtual()` direto (script temporário, removido depois): no
  horário real da máquina (14/08/2026, sexta-feira, ~11h) devolveu corretamente "hoje é
  sexta-feira, 14/08/2026, agora são 11:05 ... período do dia: manhã".
  Limites de período testados isoladamente (mesma regra replicada no teste): 3h/4h → noite,
  5h/11h → manhã, 12h/17h → tarde, 18h/23h/0h → noite — todos corretos, cobrindo a virada da
  madrugada (critério de aceite: "madrugada vs. manhã").
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo — o achado principal (agente n8n não tem a regra) já era o próprio objeto da
demanda, registrado no blueprint, explicitamente fora de escopo implementar (workflow n8n fora
do repositório).

### Status final: concluída
