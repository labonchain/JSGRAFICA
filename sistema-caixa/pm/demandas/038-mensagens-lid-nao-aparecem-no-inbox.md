# 038 — Mensagens com telefone em formato @lid não aparecem no Inbox

Status: aprovada — prioridade alta (atendimento real acontecendo sem visibilidade no Inbox hoje)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Efeito colateral direto da demanda 037 (que corrigiu o log de mensagens enviadas manualmente):
confirmado por consulta direta ao banco (PM, 2026-07-03) que as mensagens da equipe pra clientes
hoje **estão sendo gravadas certinho no log**, mas **não aparecem no Inbox do admin**.

Causa: essas mensagens chegam da Z-API com o campo `phone` no formato `@lid` (identificador de
contato com número oculto, ex. `123570571206890@lid`), enquanto `jsgrafica_contatos.phone` pro
mesmo contato está no formato normal (ex. `558198332888` — os dois estão ligados pelo mesmo
`contact_lid`, confirmado via JOIN). Duas rotas fazem busca só por `phone` puro, e por isso nunca
batem com essas linhas:

- `app/api/inbox/mensagens/route.ts` — `.eq('phone', phone)` pra buscar a thread inteira de uma
  conversa. Mensagens com `phone` em formato `@lid` ficam invisíveis na conversa.
- `app/api/inbox/conversas/route.ts` — a subquery de "última mensagem" (`ultimas`) faz
  `.in('phone', phones)` com a lista de telefones vinda de `jsgrafica_contatos`. Mesmo problema:
  a prévia da lista de conversas também não reflete essas mensagens.

Confirmado com 6 mensagens reais de hoje (Fernanda, Nilda, Willianne Barbosa, Ana Paula, e o
teste do Edvam) — todas existem em `jsgrafica_log_msgs_privadas` com `from_me:true` e texto
correto, mas nenhuma aparece no Inbox.

## Objetivo
Toda mensagem que existe em `jsgrafica_log_msgs_privadas` pra um contato deve aparecer no Inbox
— na lista de conversas (prévia/ordenação) e na thread — independente de qual formato de
telefone (`phone` puro ou `@lid`) a Z-API mandou naquele evento específico.

## Escopo
- Incluído:
  1. `app/api/inbox/mensagens/route.ts`: hoje recebe só `?phone=` e faz `.eq('phone', phone)`.
     Resolver o `contact_lid` correspondente (lookup em `jsgrafica_contatos` pelo `phone`
     recebido) e trocar a busca por `.or(`phone.eq.${phone},contact_lid.eq.${contactLid}`)` (ou
     equivalente) — sem mudar o contrato da rota (continua recebendo só `phone`, sem precisar
     mexer no frontend que chama).
  2. `app/api/inbox/conversas/route.ts`: a query de "última mensagem" (`ultimas`) hoje usa só
     `.in('phone', phones)`. Incluir `contact_lid` na seleção de `contatos` (hoje não está no
     `.select()`) e ampliar essa busca pra também casar por `contact_lid`, garantindo que a
     prévia/ordenação da lista reflita mensagens gravadas em qualquer um dos dois formatos.
  3. Teste real: abrir a conversa de um dos 6 contatos afetados hoje (ex. Willianne Barbosa,
     558198332888) e confirmar que a mensagem enviada manualmente aparece na thread e na prévia
     da lista.
- Fora de escopo: mudar o formato como o n8n grava `phone` no insert (isso seria mexer de novo
  no workflow `01`, já ajustado na demanda 037 — a ideia aqui é a leitura ser resiliente ao
  formato, não impor um formato único na escrita). Se o 03-APP achar que normalizar na escrita é
  mais simples/robusto, registrar como achado pro 01-N8N, não implementar aqui.

## Critérios de aceite
- [ ] `/api/inbox/mensagens` retorna mensagens com `phone` em `@lid` na mesma thread do contato
- [ ] `/api/inbox/conversas` reflete essas mensagens na prévia/ordenação da lista
- [ ] Testado com pelo menos 1 dos 6 contatos reais afetados hoje
- [ ] Sem regressão: conversas normais (telefone puro nos dois lados) continuam funcionando

## Riscos e cuidados
- Rota `mensagens` faz uma query extra (lookup de `contact_lid`) — manter simples, não
  precisa de índice novo pra um sistema deste volume.
- Não mexer no formato de escrita do n8n (fora de escopo, ver acima) — mudança é só na leitura.

## Referências
`app/api/inbox/mensagens/route.ts`, `app/api/inbox/conversas/route.ts`, tabela
`jsgrafica_contatos` (campo `contact_lid`), tabela `jsgrafica_log_msgs_privadas` (campos `phone`,
`contact_lid`). Achado original: `pm/demandas/037-logar-mensagens-enviadas-manualmente.md`.

## Relato de execução

### O que foi feito
- **`app/api/inbox/mensagens/route.ts`:** antes de buscar a thread, faz um lookup rápido em
  `jsgrafica_contatos` pelo `phone` recebido pra pegar o `contact_lid` do contato. Se existir,
  a busca de mensagens vira `.or(\`phone.eq.${phone},contact_lid.eq.${contactLid}\`)`; se não
  existir (contato sem lid registrado), continua `.eq('phone', phone)` como antes — sem
  regressão. Contrato da rota não mudou, continua recebendo só `?phone=`.
- **`app/api/inbox/conversas/route.ts`:** adicionado `contact_lid` no `.select()` de
  `jsgrafica_contatos`. A subquery de "última mensagem" (`ultimas`) agora busca por
  `.or('phone.in.(...)', 'contact_lid.in.(...)')` (lista de telefones normais OU lista de lids
  dos contatos da página atual), e o resultado é remapeado de volta pro telefone normal do
  contato antes de montar o mapa de "última mensagem" (senão uma mensagem gravada com
  `phone=<lid>` ficaria associada à chave errada no mapa).

### Confirmado com dado real — causa raiz exatamente como o PM descreveu
Confirmei via SQL antes de mexer: `jsgrafica_contatos` de Willianne Barbosa tem
`phone='558198332888'` e `contact_lid='123570571206890@lid'`. Em
`jsgrafica_log_msgs_privadas`, a maioria das mensagens dela tem `phone` normal (com
`contact_lid` já preenchido corretamente em todas as linhas), mas as mensagens manuais
recentes ("vai ser que papel", "obg", "pode vir buscar", "desculpe", "a imagem do tamanho da
folha?", etc.) tinham `phone='123570571206890@lid'` — o mesmo valor do `contact_lid` da
tabela de contatos, confirmando o vínculo 1:1 que o PM já tinha identificado.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Testado com o contato real afetado (Willianne Barbosa, `558198332888`)** via `npm run dev`
  local + `curl`:
  - `GET /api/inbox/mensagens?phone=558198332888` — antes do fix, as mensagens com
    `phone=@lid` não apareceriam; depois do fix, a thread retornou **55 mensagens**, incluindo
    as **7 mensagens manuais em formato `@lid`** intercaladas na ordem cronológica correta
    junto com as mensagens normais (confirmei pelo texto: "pode vir buscar", "desculpe" etc.
    aparecem juntas com as mensagens do cliente).
  - `GET /api/inbox/conversas?q=Willianne` — a prévia da lista mostra a mensagem mais recente
    corretamente (`ultimaMsg: "Tudo bem"`, a última troca real da conversa).
- **Sem regressão confirmada:** testei um contato normal sem nenhuma mensagem em formato
  `@lid` (Geise Kelly, `558197711758`) — thread e prévia continuam idênticas ao comportamento
  anterior (41 mensagens, prévia "Obrigada").

### Achados fora do escopo (relatados, não alterados)
- Não mexi no formato de escrita do n8n, conforme pedido — a resiliência é só na leitura.
- Durante a busca por "Willianne" no teste, apareceu um segundo contato não relacionado —
  `158969758789650@lid` ("Elder Enzo e Willianne...") — que tem o próprio `@lid` como
  `phone` primário na tabela `jsgrafica_contatos` (não só nos logs de mensagem). Isso é um
  contato "cru"/malformado diferente do problema desta demanda (que é sobre mensagens
  chegando em formato diferente do que o contato já tem cadastrado) — parece mais um caso de
  contato nunca resolvido pro formato normal. Não mexi, reportando como achado — pode ser
  outro efeito da mesma causa raiz da demanda 037/016, mas não investiguei a fundo.

### Critérios de aceite
- [x] `/api/inbox/mensagens` retorna mensagens com `phone` em `@lid` na mesma thread do contato
- [x] `/api/inbox/conversas` reflete essas mensagens na prévia/ordenação da lista
- [x] Testado com Willianne Barbosa (um dos 6 contatos reais afetados)
- [x] Sem regressão — confirmado com contato normal (Geise Kelly)

### Deploy
`npx vercel --prod --yes` — deployment `dpl_AytJCm2P55DRAHXBUDG3yxkhdv8a`, deployado imediato
(prioridade alta, atendimento real em andamento). Confirmado em produção:
`GET https://admin.jsgrafica.site/api/inbox/mensagens?phone=558198332888` retorna as 55
mensagens (incluindo as 7 em formato `@lid`).

### Status final
Concluída e deployada.
