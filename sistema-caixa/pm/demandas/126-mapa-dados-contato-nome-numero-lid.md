# 126 — Mapa de dados de contato (nome/número/lid) + corrigir 545 contatos com telefone errado

Status: concluída (exceto confirmação via n8n — MCP não autorizado, pendência registrada no relato)
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 02 - DADOS

## Contexto
Investigando por que "Criar pedido" não gerou mensagem/cobrança Pix pra um contato de teste,
achei a causa: o campo `phone` de `jsgrafica_contatos` guarda, pra uma parte real dos contatos,
o identificador interno do WhatsApp (formato `NNNN@lid`, o "LID" — usado quando a Meta não expõe
o número de telefone real) em vez do número de verdade. Confirmado: **545 dos 2.161 contatos
(25%) têm o telefone salvo assim**, nomes reais, não é teste (ex.: "Alessandra De Lima", "Cláudio
José Melo", "Felipe Andrade").

O número real **não está perdido** — confirmei em `jsgrafica_log_msgs_privadas` que, pro mesmo
`conversation_id`/`contact_lid`, o campo `phone` de cada mensagem individual tem o número real em
~85% das linhas (sempre o mesmo número, nunca varia — não tem risco de mistura entre pessoas
diferentes). O problema é que a agregação em `jsgrafica_contatos` não está usando esse dado
corretamente — grava o `@lid` na coluna `phone` em vez do número, quando o payload daquele evento
específico não trazia o número resolvido.

**Mas o Edvam apontou (2026-07-09) que o escopo é maior que só corrigir os 545**: precisamos de
um mapa claro de **quem usa o quê**, porque cada parte do sistema precisa de uma coisa diferente
desse mesmo contato:
- **Inbox** (tela que humano lê): nunca deveria mostrar `@lid` — sempre nome real e número real.
- **Z-API / envio de mensagem**: precisa do `@lid` pra endereçar a conversa corretamente (é assim
  que a Meta identifica esses chats — não dá pra só trocar por número em todo lugar).
- **Mercado Pago** (cobrança Pix, demanda 124): precisa de telefone em formato numérico (usa pra
  derivar o e-mail sintético do pagador, ver `criarCobrancaPix` em `lib/mercadopago.ts`).
- **Stone** (futuro, fora de escopo aqui): vai precisar de algo a definir quando for integrado —
  não travar por causa disso, só deixar registrado que vai existir mais um consumidor.

**Não temos hoje um mapa confiável disso** — o achado desta investigação (o 45%/25% de contatos
com `phone` = `@lid`) só apareceu por acidente, testando outra coisa. Precisamos saber com certeza
antes de continuar corrigindo qualquer coisa relacionada a contato.

**Bug relacionado, reportado pelo Edvam (2026-07-08)**: editou e salvou o nome de um cliente na
tela de clientes, e o nome voltou a mostrar o valor vindo do WhatsApp depois. Suspeita: mesma raiz
(alguma tela/rotina está lendo de uma fonte "ao vivo" do WhatsApp em vez do dado editado/salvo) —
investigar junto, mas sem assumir que é a mesma causa até confirmar.

## Objetivo
1. Ter um mapa documentado, verificado (não assumido), de: cada tabela/coluna que guarda
   nome/telefone/lid de contato, e qual funcionalidade do sistema lê de qual campo, e por quê.
2. Corrigir os 545 contatos com `phone` = `@lid`, usando o número real já disponível no log de
   mensagens, sem quebrar o que já funciona (Z-API continua endereçando certo via `contact_lid`).
3. Soltar a trava que impede "Criar pedido" de gerar mensagem/cobrança Pix pra esses contatos.

## Escopo
- Incluído:
  1. **Mapa de dados** (documento novo, `pm/conhecimento/mapa-dados-contato.md` ou similar):
     listar cada campo relevante em `jsgrafica_contatos` e `jsgrafica_log_msgs_privadas`
     (`phone`, `contact_lid`, `conversation_id`, `chat_lid`, `sender_lid`, `lead_phone`,
     `lead_phone_ddd`, `lead_phone_number`, `lead_name`, etc.), o que cada um representa de
     verdade (testado, não documentação da Z-API assumida), e qual parte do sistema (Inbox,
     envio de mensagem, Mercado Pago, `jsgrafica_pedidos.telefone`) deveria ler de qual.
  2. **Backfill dos 545 contatos**: pra cada um, buscar em `jsgrafica_log_msgs_privadas` (mesmo
     `conversation_id`) o `phone` mais frequente que **não** seja formato `@lid`, e usar isso pra
     corrigir `jsgrafica_contatos.phone`. Se um contato não tiver NENHUMA linha de log com número
     real (confirmar se esse caso existe antes de assumir que não), documentar quantos ficam sem
     solução e não travar os outros por causa disso.
  3. **Não sobrescrever `contact_lid`** — esse campo já existe separado e está certo, é ele que
     deve continuar sendo usado por quem precisa endereçar a conversa via Z-API.
  4. **Soltar a trava em `app/api/pedidos/route.ts` linha ~148** (`/^\d+$/.test(telefone)`) — hoje
     essa checagem impede geração de mensagem/Pix pra qualquer telefone fora do formato numérico
     puro. Ajustar pra aceitar o formato real que o Inbox usa pra endereçar a conversa (que pode
     legitimamente ser `@lid` pra parte dos contatos, mesmo depois do backfill, se `phone` que o
     Inbox usa pra identificar a conversa continuar sendo o `contact_lid` em vez do `phone`
     corrigido — **isso é exatamente o tipo de decisão que o mapa do item 1 precisa esclarecer
     antes** de tocar nesse código).
  5. Investigar o bug da edição de nome de cliente (reportado 2026-07-08) — confirmar se é a
     mesma causa raiz ou coisa separada, e corrigir.
- Fora de escopo: integração com Stone (mencionar no mapa que vai existir, não implementar nada).
  Contatos sem NENHUM número real recuperável (se existirem) — só documentar, não inventar dado.

## Critérios de aceite
- [ ] Mapa de dados escrito e revisado pelo PM antes de qualquer correção em massa
- [ ] Os 545 contatos corrigidos (ou o número real dos que não tiverem solução, documentado)
- [ ] `contact_lid` continua intacto, Z-API/envio de mensagem sem regressão
- [ ] "Criar pedido" volta a gerar mensagem/Pix pra contatos que antes eram bloqueados pela trava
- [ ] Bug da edição de nome investigado e resolvido (ou reportado como causa diferente, com plano)

## Riscos e cuidados
Mexe em 25% da base de contatos — testar o backfill num contato só primeiro, confirmar com o PM
antes de rodar em massa. Não mexer em `contact_lid` de jeito nenhum (Z-API depende dele).

## Referências
Achado original: esta conversa, 2026-07-08/09 (contato "Edvan Filho", `52063694233823@lid`).
`app/api/pedidos/route.ts` (linha ~148, trava do regex). `lib/mercadopago.ts` (`criarCobrancaPix`,
uso do telefone pro e-mail sintético). Demanda 124 (Pix por pedido, consumidor do telefone).

## Relato de execução

**Status: PARCIAL — mapa escrito, 1 contato testado, achado crítico bloqueia a correção em
massa e o item 4 até decisão. Aguardando confirmação antes de continuar, como a própria
demanda pede ("mapa revisado pelo PM antes de qualquer correção em massa").**

### 1. Mapa de dados — escrito

`pm/conhecimento/mapa-dados-contato.md`. Resumo do que tem lá (tudo testado ao vivo, não
assumido):
- `phone`, `contact_lid`, `conversation_id`: o que cada um é de verdade, testado com exemplo
  real.
- Tabela "quem usa o quê", lendo o código de verdade (Inbox, Clientes, Pedidos, Mercado Pago,
  Z-API) — não a documentação da Z-API.
- 🔴 **Achado crítico**: hoje o envio de mensagem (Z-API) usa **só `phone`, nunca
  `contact_lid`** — confirmado em `lib/zapi.ts` + os 2 únicos call-sites
  (`app/api/inbox/responder/route.ts`, `app/api/inbox/enviar-midia/route.ts`) +
  `TelaInbox.tsx`. O envio pra esses 545 contatos só funciona hoje porque `phone` **já é** o
  LID — mecanismo acidental. Corrigir `phone` pro número real, sem mais nada, pode quebrar o
  envio se a Meta exigir endereçamento por LID (não testei mandando mensagem real pra
  confirmar — não é decisão minha tomar isso sozinho).
- Causa confirmada (com exemplo real de dado) do bug de nome revertendo — não precisei do n8n
  pra confirmar, é duplicidade de linha por telefone + a lógica de "linha mais recente" não
  considerar `lead_name` do jeito que já considera `lead_photo`.

### 2. Dimensionamento real (não assumido)

| | Quantidade |
|---|---|
| Total de contatos com `phone` = LID | 545 |
| Testado/corrigido (1 contato, ver item 3) | 1 |
| Restam | 544 |
| Com número real recuperável (1 número distinto, sem ambiguidade) | **438** |
| **Sem nenhum número real no log — não recuperável** | **106** |

Rodei a checagem de "número nunca varia" (risco de misturar pessoas) pros 438 inteiros, não só
amostra: **100% têm exatamente 1 número distinto**. Backfill é seguro quanto a isso.

### 3. Teste em 1 contato — feito, validado

Contato "Lucio Ferreira" (`conversation_id = 129699456012502@lid`): 26 eventos de log com
número real (`558185971071`), 13 com LID. Atualizei:
```sql
UPDATE jsgrafica_contatos SET phone = '558185971071'
WHERE phone = '129699456012502@lid' AND contact_lid = '129699456012502@lid';
```
Confirmado depois: `phone` = número real, `contact_lid`/`conversation_id` **intocados**, sem
colisão com nenhuma outra linha que já tivesse esse número.

### 4. O que NÃO fiz ainda, e por quê

- **Backfill em massa dos outros 438**: pausei de propósito — depende da decisão sobre o
  achado crítico (item 1). Fazer os 438 sem resolver isso arrisca quebrar o envio de mensagem
  pra 438 conversas reais de uma vez, não é reversível sem reeditar tudo de novo.
- **Item 4 (soltar a trava em `pedidos/route.ts`)**: achado importante — **a trava
  `/^\d+$/` provavelmente não precisa mudar**. Ela bloqueia porque `telefone` é LID; depois do
  backfill, `telefone` vira número real pra 438 e passa a bater na regex sozinho, sem editar o
  regex. Só continua bloqueando os 106 sem número — e isso é o comportamento certo (não tem
  telefone real pra mandar Pix mesmo). Não toquei nesse arquivo ainda porque depende do
  backfill acontecer primeiro.
- **Fix do bug de nome (item 5)**: causa confirmada (ver mapa), fix é pequeno e localizado (3
  rotas, incluir `lead_name` na mesma preferência que já existe pra `lead_photo`) — não
  implementei ainda, fica pra decisão junto com o resto.
- **Os 106 sem número recuperável**: documentados (mapa + aqui), não inventei número nenhum
  pra eles, como pedido.

### Achados fora do escopo
- MCP do n8n caiu nesta sessão (autenticação expirada) — não consegui confirmar o lado exato
  da ingestão que gera o `contact_lid` novo pro mesmo telefone. Não bloqueou a investigação (a
  causa do lado do dado já está confirmada), mas fica registrado como limitação.

### Perguntas pro PM/Edvam antes de eu continuar
1. **Mapa revisado — aprovado pra seguir?**
2. **Achado crítico do Z-API**: seguir com o backfill dos 438 mesmo sem confirmar se enviar por
   número real funciona pra contatos LID? Ou primeiro mudar `responder/route.ts`/
   `enviar-midia/route.ts` pra usar `contact_lid` no envio (proposta no mapa), testando com 1
   envio real antes de fazer o backfill em massa?
3. **Os 106 sem número**: só documentar mesmo (como está) ou querem tentar outra fonte (ex.
   perguntar direto pro cliente via a própria conversa)?
4. Confirmo que posso implementar o fix do bug de nome (item 5, 3 rotas) já, independente da
   resposta acima — é uma mudança isolada, sem risco pro envio de mensagem. Aviso antes de
   fazer, caso prefiram que eu espere junto com o resto.

### Status final
**Concluída de vez (2026-07-09).** Mapa concluído. 438/544 contatos corrigidos, 106 documentados
como não-recuperáveis. Envio via `contact_lid` implementado e testado com envio real. Bug do nome
corrigido. Causa raiz no n8n **confirmada** pelo PM (acesso reconectado): node "PREPARAR LOG
CONTATOS" do workflow "01 - JSGRAFICA | LOG MSG RECEBIDAS" protege `lead_name` contra sobrescrita
ruim mas não protegia `phone` — exatamente a hipótese. Correção virou demanda **134**, liberada
pro 01-N8N.

### Decisões do PM (2026-07-09) — seguir com isso antes de continuar

1. **Ordem confirmada**: primeiro mudar `responder/route.ts`/`enviar-midia/route.ts` pra usar
   `contact_lid` (quando existir) em vez de `phone` no envio — testar com **1 envio real pra um
   número seguro** (o do próprio Edvam, já é contato no sistema). Só depois de confirmar que
   chegou, rodar o backfill dos 438. Não fazer backfill antes disso.
2. **Fix do bug de nome (item 5)**: aprovado, pode implementar já, independente do resto.
3. **Novo item, MCP do n8n foi reconectado (2026-07-09) — tentar de novo**: o PM tentou acessar
   o n8n depois da reconexão e as ferramentas ainda não apareceram na busca (`ToolSearch`) — pode
   ser propagação lenta do lado do claude.ai, ou pode não ter completado. **Tentar de novo nesta
   sessão** (ferramentas MCP do n8n aparecem prefixadas, buscar por "n8n"). Se conseguir acesso,
   ler o workflow "01 - LOG MSG RECEBIDAS" e confirmar (ou refutar) a hipótese, hoje baseada só
   em inferência de dado: **o upsert de `jsgrafica_contatos` grava por `contact_lid` (ou
   equivalente) a cada evento novo, sem preferir eventos com `phone` em formato numérico sobre
   eventos com LID — inclusive em mensagens enviadas por vocês (`fromMe: true`), que às vezes só
   trazem o LID.** Isso explicaria por que o telefone de um contato pode "piscar" entre certo e
   errado dependendo de qual foi o último evento processado (achado com timestamps reais no
   contato "D. Bete CEDPSF", `contact_lid=201915120009270@lid` — reportar se o código do n8n
   confirma ou contradiz esse comportamento). Se der pra confirmar, considerar corrigir o n8n pra
   preferir sempre o evento com `fromMe: false` (mensagem do cliente) ao decidir o `phone` — mas
   **não implementar isso sem reportar o achado ao PM primeiro**, é mudança em workflow de
   produção que roda pra todos os clientes da LabOnchain, não só a JS Gráfica.

## Relato de execução (continuação, 2026-07-09) — seguindo as 3 decisões do PM

### 1. Roteamento por `contact_lid` no envio — implementado, testado com envio real, confirmado

`app/api/inbox/responder/route.ts` e `app/api/inbox/enviar-midia/route.ts`: antes de chamar
`enviarMensagem`/`enviarImagem`/`enviarDocumento`/`enviarVideo`, busca o `contact_lid` do
contato (por `phone`, com `.limit(1)` + filtro de não-nulo em vez de `.single()` — telefone pode
ter mais de uma linha, achado já conhecido) e usa **ele** como destinatário do Z-API quando
existir; `phone` continua sendo a chave de log/CRM abaixo, sem mudança nenhuma nisso. Deploy
feito.

**Teste real, aprovado pelo PM ("número do próprio Edvam")**: usei a própria linha do Edvam que
já era um dos 545 (`phone = contact_lid = 52063694233823@lid`, nome "Edvan Filho") — o cenário
exato que o fix precisa cobrir. Mandei via `POST /api/inbox/responder` em produção:

> "[Teste automático — demanda 126] Se você recebeu esta mensagem, o envio por contact_lid
> funcionou. Pode ignorar."

Resultado: `{"success":true,"zapiResponse":{"messageId":"FBCB39C6BB2CBB2BFE0B",...}}`. Conferido
depois em `jsgrafica_log_msgs_privadas`: `status = "DELIVERED"`. **E o Edvam confirmou
diretamente ter recebido a mensagem.** Envio por LID funciona — fix validado com prova dupla
(status de entrega real + confirmação humana), não só suposição.

### 2. Backfill em massa dos 438 — executado

Antes de rodar, chequei colisão (algum número real recuperado já existir como linha própria):
só **1 colisão**, e era exatamente o contato de teste do Edvam (esperado — ele já tinha uma
linha própria com o número puro, mesmo padrão de duplicidade que o sistema já tem em outros
lugares, sem problema novo). Rodei:

```sql
UPDATE jsgrafica_contatos c
SET phone = m.telefone_real
FROM (/* CTE: melhor número real por conversation_id, só quando existe */) m
WHERE c.phone = m.phone_lid AND c.contact_lid = m.contact_lid;
```

Confirmado depois: `2.161` contatos totais, **106** ainda com `phone` = LID (exatamente os
não-recuperáveis, documentados desde a parte anterior deste relato) — os outros **438** corrigidos.
`contact_lid` não foi tocado em nenhuma linha.

### 3. Fix do bug de nome (item 5) — implementado, testado com caso real ao vivo

Nas 3 rotas de deduplicação (`app/api/inbox/conversas/route.ts`,
`app/api/clientes/route.ts` — lista e detalhe): adicionei `lead_name` como critério de
prioridade **antes** de `lead_photo` e recência (antes só existia a preferência por foto).
Deploy feito.

**Validação com caso real, não hipotético**: o telefone `558191252071` (o mesmo exemplo do
mapa) recebeu uma mensagem nova **durante este trabalho**, e a duplicidade se inverteu ao vivo —
a linha mais recente ficou sem nome, a mais antiga com "Eliane". Esse é o bug acontecendo de
verdade, no momento exato de testar. Chamei as 2 rotas em produção depois do deploy:
- `GET /api/clientes?phone=558191252071` → `nome: "Eliane", temNome: true`
- `GET /api/inbox/conversas` (filtrado pro mesmo phone) → `nome: "Eliane", temNome: true`

Sem o fix, isso teria mostrado "Contato privado". Confirmado corrigido com o bug real
acontecendo, não só em teoria.

### 4. Acesso ao n8n — tentei de novo, ainda bloqueado nesta sessão

`ToolSearch` por "n8n workflow search execute" não retornou nenhuma ferramenta do n8n — mesma
situação de antes da reconexão. Não é algo que eu resolvo (autenticação do lado do claude.ai) —
reportando de volta pro PM. **Não consegui confirmar nem refutar a hipótese sobre o
`fromMe: true` no upsert do n8n.** Fica pendente pra quando o MCP realmente conectar nesta ou
numa próxima sessão — não implementei nem sugeri mudança nenhuma no workflow, como pedido.

### Status final
**Concluída, exceto o item 3 das decisões do PM (acesso ao n8n), bloqueado por causa externa
à minha sessão.** Resumo:
- Mapa escrito e usado pra guiar todo o resto ✅
- Roteamento por `contact_lid` implementado, deployado, testado com envio real e confirmação
  humana ✅
- 438 contatos corrigidos, 106 documentados como não-recuperáveis, `contact_lid` intacto em
  todos ✅
- Bug do nome corrigido, deployado, validado contra um caso real acontecendo ao vivo ✅
- Confirmação n8n: bloqueada (MCP indisponível nesta sessão), reportando de volta — não é
  bloqueante pro resto já entregue.
