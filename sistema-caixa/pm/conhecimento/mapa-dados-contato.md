# Mapa de dados de contato — nome / telefone / LID

Escrito pelo 02-DADOS, demanda 126. Tudo abaixo foi **testado/confirmado ao vivo** (schema real,
dados reais, código real lido linha a linha) — nada é assumido da documentação da Z-API/Meta,
como pedido. Revisar antes de qualquer correção em massa (é o portão que a própria demanda 126
exige).

## Os 3 identificadores e o que cada um é de verdade

| Campo | Onde vive | O que é, confirmado | Muda com o tempo? |
|---|---|---|---|
| `phone` | `jsgrafica_contatos`, `jsgrafica_pedidos.telefone` | Hoje é a **chave canônica** usada por 100% do sistema (Inbox, Clientes, Pedidos, envio Z-API, Mercado Pago). Deveria ser sempre o telefone real (`55DDNNNNNNNNN`). **Problema confirmado**: em 545 de 2.161 contatos (25%), guarda o LID (`NNNN...@lid`) em vez do número — porque a Meta não expôs o número real no evento que criou/atualizou aquela linha. | Não deveria mudar (é o telefone da pessoa) |
| `contact_lid` | `jsgrafica_contatos`, `jsgrafica_log_msgs_privadas` | Identificador interno do WhatsApp/Meta pra essa conversa. Existe especificamente pro recurso de privacidade "LID" — quando ativo, a Meta não manda o número real em alguns eventos, só esse ID. | Instável — o mesmo telefone pode ganhar mais de um `contact_lid` ao longo do tempo (achado confirmado, ver "Bug do nome" abaixo) |
| `conversation_id` | ambas as tabelas | Na prática, observado como **idêntico a `contact_lid`** nos casos testados (mesma string). É a chave usada pra agrupar todos os eventos de uma mesma conversa, venha o `phone` daquele evento como LID ou como número. | Acompanha `contact_lid` |

`lead_phone`/`lead_phone_ddd`/`lead_phone_number` (só em `jsgrafica_contatos`): derivados de
`phone` no momento em que o n8n grava a linha — não usados por nenhuma rota do Next.js hoje
(confirmado via busca no código, zero ocorrência fora de leitura direta da coluna). Só servem
pra relatório/filtro por DDD (ver demandas 001/016).

## Por que a agregação erra (causa raiz do phone=@lid)

Em `jsgrafica_log_msgs_privadas`, o campo `phone` é **por evento** — pra uma mesma pessoa
(mesmo `conversation_id`), a Meta às vezes manda o número real, às vezes só o LID, dependendo
do tipo de evento. Testado num contato real (`conversation_id = 129699456012502@lid`,
"Lucio Ferreira"): 26 eventos com `phone` = número real, 13 eventos com `phone` = LID — **a
mesma conversa, os dois formatos**. A gravação em `jsgrafica_contatos.phone` usa o valor do
evento mais recente processado, sem preferir o formato numérico — se por acaso o último evento
tinha só o LID, é isso que fica salvo.

**Confirmado, não é risco teórico**: rodei a checagem pra todos os 438 contatos recuperáveis
(ver abaixo) — **100% deles têm exatamente 1 número real distinto** no histórico de log, nunca
mais de um. Não existe caso de duas pessoas diferentes compartilhando o mesmo `conversation_id`
com números diferentes — backfill por essa via é seguro quanto a isso.

## Quem usa o quê hoje (lido no código, não assumido)

| Consumidor | Arquivo | Usa hoje | Deveria usar |
|---|---|---|---|
| Inbox — listar conversas | `app/api/inbox/conversas/route.ts` | `phone` (agrupa, dedup, ordena por ele) | `phone` = telefone real |
| Inbox — enviar texto | `app/api/inbox/responder/route.ts` → `enviarMensagem(phone, ...)` | `phone` puro, **nunca `contact_lid`** | Ver achado crítico abaixo |
| Inbox — enviar mídia | `app/api/inbox/enviar-midia/route.ts` → `enviarImagem/enviarVideo/enviarDocumento(phone, ...)` | `phone` puro, **nunca `contact_lid`** | Ver achado crítico abaixo |
| Inbox — editar nome | `app/api/inbox/contato/route.ts` | `UPDATE ... WHERE phone = X` (atualiza **todas** as linhas com esse `phone`) | Correto como está, ver bug abaixo |
| Clientes (CRM) | `app/api/clientes/route.ts` | `phone` (chave de lista, busca, detalhe, edição de aniversário/endereço) | `phone` = telefone real |
| Pedidos | `app/api/pedidos/route.ts`, `jsgrafica_pedidos.telefone` | `phone` copiado direto do Inbox (`phoneAtivo`) | telefone real |
| Trava de mensagem/Pix (`pedidos/route.ts` linha ~148/375) | `/^\d+$/.test(telefone)` | Bloqueia qualquer coisa que não seja só dígitos — hoje bloqueia os 545 porque `telefone` = LID pra eles | Depois do backfill, `telefone` passa a ser número real pra 438 deles — a trava **já os deixa passar sem precisar mudar o regex**. Só continua bloqueando os 106 sem número recuperável (correto, não tem número real pra mandar Pix mesmo) |
| Mercado Pago (`criarCobrancaPix`, `lib/mercadopago.ts`) | `telefoneLimpo = telefone.replace(/\D/g, '')` | Com `phone`=LID, isso sobra um número sem sentido (dígitos do meio do LID) virando e-mail sintético errado. Com telefone real, funciona certo. | telefone real — resolvido pelo backfill, sem mudar este código |

## 🔴 Achado crítico — envio via Z-API depende de `phone`, nunca de `contact_lid`

Confirmado lendo `lib/zapi.ts` + os 2 únicos call-sites (`responder/route.ts`,
`enviar-midia/route.ts`) + `TelaInbox.tsx`: o valor passado pro Z-API (`enviarMensagem`,
`enviarImagem`, `enviarDocumento`, `enviarVideo`) é sempre `phoneAtivo`, isto é,
`jsgrafica_contatos.phone` — **`contact_lid` nunca é lido nem passado pro Z-API em nenhum lugar
do código atual**.

Isso significa: hoje, o envio de mensagem pra esses 545 contatos **só funciona porque `phone`
já é o LID** — é um mecanismo acidental, não desenhado. Se o backfill trocar `phone` pelo
número real **sem mais nenhuma mudança**, o envio pra esses contatos passa a usar o número real
em vez do LID — e **não sei se isso continua funcionando** pro recurso de privacidade da Meta
(pode ser que o WhatsApp aceite endereçar por número mesmo assim; pode ser que exija o LID
especificamente, como o Edvam já suspeitava). **Não testei mandando mensagem de verdade pra
confirmar** — enviaria uma mensagem real pra um cliente real sem necessidade, e isso não é uma
decisão que eu tomo sozinho.

**Recomendação (não implementada, decisão pra confirmar antes)**: mudar `responder/route.ts` e
`enviar-midia/route.ts` pra buscar o `contact_lid` do contato e passar **ele** (quando existir)
pro Z-API em vez do `phone` corrigido — desacopla "identificação/CRM" (sempre `phone` real) de
"endereçamento Z-API" (sempre `contact_lid` quando existir, senão `phone`). É mudança pequena e
localizada (2 arquivos), mas envolve tocar o caminho de envio real — prefiro confirmar antes de
mexer, e o teste de "funciona mesmo" só dá pra fazer com um envio real.

## Bug do nome "revertendo" após editar (item 5) — causa confirmada por dado

**Não é o n8n sobrescrevendo o valor editado.** Confirmado com um caso real:
telefone `558191252071` tem **2 linhas** em `jsgrafica_contatos` — uma com
`contact_lid=264613069336709@lid`, `lead_name="Eliane"`, `data_ultimo_contato` mais recente; e
outra com `contact_lid=558191252071` (igual ao phone), `lead_name=null`, mais antiga.

A causa: `contact_lid` é instável (o mesmo telefone pode ganhar mais de um `contact_lid` com o
tempo — já documentado desde as demandas 008/029/053). Quando uma mensagem nova chega e o n8n
grava/atualiza por `contact_lid` (não por `phone`), ela pode acabar atualizando a linha **sem
nome** em vez da linha editada — e essa linha sem nome, agora mais recente, vira a escolhida
como "representante" nas 3 rotas que fazem essa dedução (`conversas`, `clientes` lista,
`clientes` detalhe). O nome editado continua salvo, intacto, na outra linha — só deixa de ser
exibido. `PATCH /api/inbox/contato` já atualiza **todas** as linhas com aquele `phone` (correto,
conferido no código) — o problema é só na hora de **escolher qual linha exibir**, não na
gravação da edição.

A lógica de "representante" já dá preferência pra quem tem `lead_photo` preenchido
(`!atual.lead_photo && c.lead_photo`) — só falta fazer o mesmo pra `lead_name`.

**Fix proposto (não implementado)**: nas 3 rotas (`inbox/conversas`, `clientes` lista,
`clientes` detalhe), incluir `lead_name` no mesmo critério de preferência do `lead_photo` —
preferir a linha com nome preenchido em vez de só a mais recente.

**Limitação desta investigação**: não tive acesso ao n8n nesta sessão (MCP caído, precisa
reautenticar) — não confirmei o lado exato de como/quando o n8n decide gravar por `contact_lid`.
A causa do lado do dado (duplicidade de linha, escolha de representante) já está confirmada com
exemplo real e é suficiente pra propor o fix acima sem depender do n8n.

## Números confirmados (dimensionamento)

| | Quantidade |
|---|---|
| Total de contatos | 2.161 |
| Com `phone` = LID (antes do teste) | 545 |
| Testado/corrigido nesta sessão (1 contato, ver relato da demanda) | 1 |
| Restam com `phone` = LID | 544 |
| Desses, com número real recuperável no log (1 número distinto, sem ambiguidade) | 438 |
| Desses, **sem nenhum número real no log** — não recuperável, não inventar dado | 106 |

## Stone (futuro, fora de escopo)

Vai precisar de telefone em algum formato quando integrado — mesma dependência de "phone =
número real" que o Mercado Pago já tem. Não implementar nada agora, só registrar que vai
existir mais um consumidor com a mesma exigência.
