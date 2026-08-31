# 053 — Mensagens somem no Inbox quando o contato tem contact_lid duplicado

Status: aprovada — prioridade alta (esconde mensagem real de cliente)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam reportou: mensagens reais de hoje (imagens de valores, áudios, um texto sobre recarga VEM,
entre 12:20 e 12:34) mandadas via WhatsApp real não aparecem no Inbox (nem admin, nem PDV) — só
a resposta do cliente ("Entendi") aparece. Confirmado pelo PM: as mensagens **existem** no banco
(`jsgrafica_log_msgs_privadas`, `from_me:true`, `contact_lid` certo), mas a API
`/api/inbox/mensagens` não devolve elas.

**Causa raiz confirmada, lendo o código:** `app/api/inbox/mensagens/route.ts` (linha 16-20) usa
`.single()` pra buscar o `contact_lid` do contato pelo telefone recebido:
```js
const { data: contato } = await supabaseAdmin
  .from('jsgrafica_contatos')
  .select('contact_lid')
  .eq('phone', phone)
  .single();
```
`.single()` **retorna erro quando encontram-se 2+ linhas**, não só quando não encontra nenhuma.
O contato de teste ("Edvan Filho", `5521965185667`) tem **2 linhas duplicadas** em
`jsgrafica_contatos` pro mesmo telefone — problema de duplicação já conhecido desde as demandas
008/029 (contact_lid instável). Quando isso acontece, `contato` vem `null` (o erro é descartado
silenciosamente pelo destructuring `const { data: contato } = ...`), e o código cai no
comportamento **anterior à demanda 038** (`query.eq('phone', phone)`, sem o `.or()` que também
busca por `contact_lid`) — ou seja, a correção da 038 simplesmente não entra em ação pra
qualquer contato que tenha esse tipo de duplicata, e mensagens gravadas em formato `@lid` voltam
a ficar invisíveis.

**Risco maior:** isso não é exclusivo de contato de teste — qualquer contato real com telefone
duplicado em `jsgrafica_contatos` (achado recorrente, não é raro) sofre do mesmo problema, e pode
estar escondendo mensagem de cliente de verdade, não só a da equipe.

## Objetivo
A busca de mensagens nunca falha silenciosamente por causa de contato duplicado — sempre acha o
`contact_lid` certo (ou pelo menos um válido) mesmo quando há mais de uma linha pro mesmo
telefone.

## Escopo
- Incluído:
  1. Trocar `.single()` por uma busca que não quebra com múltiplas linhas — ex. `.limit(1)` sem
     `.single()`, ou reaproveitar a mesma lógica de "escolher representante" que já existe em
     `app/api/inbox/conversas/route.ts` (demanda 029: prefere quem tem foto, ou o mais recente)
     em vez de pegar uma linha arbitrária.
  2. Levantar quantos contatos hoje têm telefone duplicado em `jsgrafica_contatos` (mesma query
     de diagnóstico que a 029 já fez) — só pra dimensionar o tamanho real do problema, não
     precisa corrigir a duplicação em si aqui (isso seria outra demanda, de dado).
  3. Conferir se `app/api/inbox/conversas/route.ts` tem o mesmo tipo de risco (uso de `.single()`
     que quebra com duplicata) — se tiver, corrigir junto; se não tiver (a 029 já trata
     duplicata de outro jeito lá), só confirmar e não mexer.
- Fora de escopo: resolver a causa raiz da duplicação de contatos em si (por que
  `jsgrafica_contatos` tem 2 linhas pro mesmo telefone) — isso é assunto pro 01-N8N/02-DADOS,
  candidato a demanda separada se o Edvam quiser ir atrás disso depois.

## Critérios de aceite
- [ ] Mensagens de hoje do contato "Edvan Filho" (12:20-12:34) aparecem na thread depois do fix
- [ ] Testado com pelo menos mais 1 contato que tenha telefone duplicado (se existir outro caso
      real), confirmando que não quebra mais
- [ ] Contatos sem duplicata continuam funcionando normalmente (sem regressão)

## Riscos e cuidados
Não é bug novo introduzido hoje — existe desde a demanda 038 (`.single()` já estava lá desde a
implementação original). Só ficou visível agora porque um contato com duplicata mandou mensagem
em formato `@lid` hoje.

## Referências
`app/api/inbox/mensagens/route.ts` (linha 16-20, a corrigir). `app/api/inbox/conversas/route.ts`
(lógica de "escolher representante" da demanda 029, referência de padrão). Demandas 008/029/038
(histórico da duplicação de contact_lid).

## Relato de execução

### O que foi feito
- `app/api/inbox/mensagens/route.ts` (linha 16-20, a causa raiz confirmada): trocado `.single()`
  por uma busca de todas as linhas do telefone, juntando **todos** os `contact_lid` não nulos
  (não só "escolher um representante") — o filtro final busca mensagens em `phone` OU em
  qualquer um dos `contact_lid` encontrados. Mais robusto que escolher um representante único:
  se as linhas duplicadas tiverem `contact_lid` diferentes, nenhuma mensagem fica de fora.
- Conferido `app/api/inbox/conversas/route.ts` (item 3 do escopo): o `GET` (lista de conversas)
  **não** tinha esse risco — já deduplica por telefone sem usar `.single()` (lógica da demanda
  029). Mas o `POST` (usado pelo botão "Nova conversa") **tinha o mesmo `.single()`** numa
  checagem de "contato já existe?" — e o efeito era pior ali: com telefone duplicado, a checagem
  quebrava, o código caía no `else` (achando que o contato não existia) e **inseria mais uma
  linha duplicada** a cada chamada. Corrigido com `.limit(1)`.

### Achado fora do escopo — corrigido no mesmo processo
Ao procurar por outros usos de `.single()` sobre `jsgrafica_contatos` (pra responder o item 3 do
escopo com rigor, não só olhar o arquivo citado), achei o **mesmo padrão** em
`lib/inboxLog.ts` (função `registrarMensagemEnviada`, usada por toda resposta manual do Inbox e
pelo aviso automático de status de pedido da demanda 046) — com o agravante de que esse é o
**caminho de escrita**, não de leitura: toda vez que alguém manda mensagem pra um telefone que já
tem duplicata, o `.single()` quebrava, o código caía no `else` e **inseria mais uma linha
duplicada em `jsgrafica_contatos`**. Isso é candidato a mecanismo real por trás da duplicação
continuar acontecendo (achado desde as demandas 008/029) — cada envio de mensagem pra um contato
já duplicado criava mais uma cópia. Corrigido com o mesmo padrão `.limit(1)`. Não estava no texto
original da demanda (que falava só da busca/leitura), mas é a mesma classe de bug, na mesma
tabela, encontrada durante a mesma varredura pedida no item 3 — reportando aqui em vez de
corrigir silenciosamente.

`app/api/inbox/enviar-midia/route.ts` foi conferido e **não** tem esse padrão (só faz `.update()`
direto, sem `.single()`/branch de criação) — nada a corrigir ali.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` — limpos.
- Levantamento de duplicatas reais (item 2 do escopo), via SQL direto:
  ```
  120363404329458007-group → 8 linhas (grupo do WhatsApp, não é bug de contato individual)
  120363368732391284-group → 3 linhas (idem, grupo)
  5521965185667 ("Edvan Filho") → 2 linhas (contact_lid = 52063694233823@lid e o próprio phone)
  ```
  Confirma os "3 telefones com duplicata" citados na demanda — 2 são grupos (fora do escopo real
  do bug, que é sobre contato individual), 1 é o "Edvan Filho" citado no contexto.
- Confirmei via SQL que as mensagens reais de hoje (04-07-26, ~15:20-15:34) estavam mesmo
  gravadas só sob `contact_lid = 52063694233823@lid` (2 imagens + o texto "De celular não é
  comum fazer acima de 60,00") — exatamente as que o Edvam reportou como sumidas.
- **Testado local** (`npm run dev`): `GET /api/inbox/mensagens?phone=5521965185667` — antes do
  fix essas mensagens não apareciam (comportamento pré-038); depois do fix, aparecem todas as 6
  mensagens de hoje na thread, incluindo as 2 imagens e o texto.
- **Testado o fix da 029/`conversas` POST**: chamei `POST /api/inbox/conversas` pro mesmo
  telefone duplicado — confirmado via SQL que continua com exatamente 2 linhas (não virou 3).
  Antes do fix, cada chamada teria criado mais uma linha.
- **Testado o fix de `lib/inboxLog.ts`**: enviei uma mensagem de teste real via
  `POST /api/inbox/responder` pro mesmo telefone (mesmo contato de teste "Edvan Filho" já usado
  com aprovação do Edvam na demanda 046) — confirmado via SQL que continua com exatamente 2
  linhas em `jsgrafica_contatos` (não virou 3), e as duas linhas convergiram pro mesmo contador
  `total_mensagens_enviadas` (efeito colateral positivo do `.update()` que já afetava todas as
  linhas duplicadas, só não era alcançado antes por causa do `.single()` quebrando primeiro).
  Mensagem de teste apagada do log depois de confirmar (não ficou lixo na conversa real).
- **Verificado em produção após deploy**: `GET https://admin.jsgrafica.site/api/inbox/mensagens?phone=5521965185667`
  retorna as mensagens reais de hoje corretamente, incluindo as 2 imagens e o texto que estavam
  sumidos.
- Sem regressão: contatos sem duplicata (maioria) continuam funcionando igual — a lógica só muda
  de comportamento quando há 2+ linhas pro mesmo telefone.

### Achados fora do escopo (registro, não corrigido)
- A causa raiz da duplicação em si (por que `jsgrafica_contatos` ganha 2 linhas pro mesmo
  telefone) continua não investigada — como a própria demanda já definia como fora de escopo,
  candidata pro 01-N8N/02-DADOS.
- Os grupos do WhatsApp (`...-group`) também aparecem com "múltiplas linhas por telefone" na
  mesma consulta de diagnóstico, mas é um padrão de dado esperado (várias pessoas do grupo viram
  linhas com o mesmo `phone` de grupo) — não é o mesmo bug, não precisa de ação.
- O contador `total_mensagens_enviadas` do contato de teste "Edvan Filho" ficou 1 unidade acima
  do real por causa do envio de teste (11 em vez de 10) — é só um contador de exibição, não afeta
  nenhum dado financeiro ou de negócio; não revertido por ser um efeito colateral inofensivo de
  um teste em contato já usado para testes reais antes.

### Status final
**Concluída e deployada** (`dpl_CEy5nZiRjSQcboid9n5Xz6CUqhw7`), testado em produção real.
