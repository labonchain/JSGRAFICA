# 325 - Conversa escalada esquecida cai em silêncio total: banner no Admin + cortesia com cooldown pro cliente

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27 (pedido direto do Edvam, achado ao vivo no próprio número de teste dele
enquanto testava o piloto do Caminho C)
Concluída em: 2026-08-27
Chat executor: sessão fora do fluxo normal dos chats especialistas, a pedido direto do Edvam

## Contexto

Gap real encontrado ao vivo, não hipótese: quando uma conversa é escalada pro humano (a IA do
Caminho C desiste e marca `jsgrafica_contatos.status_atendimento='escalado'`, demanda 321) e
ninguém no Admin resolve, QUALQUER mensagem nova desse cliente caía em silêncio total. O gate
`Contatos: Avaliar Atendimento (Gate IA)` (workflow `01`, demanda 321) força `_destino='ignorar'`
nesse caso, e o output `IGNORAR` do `Switch Destino` não tinha nenhuma conexão de saída: dead-end
puro, sem log, sem resposta, sem nada. Aconteceu de verdade com o número de teste do próprio
Edvam, e ele só percebeu porque estava acompanhando o log direto.

Duas coisas fechavam esse gap, confirmadas com o Edvam via perguntas diretas antes de construir:

1. **Ninguém no Admin sabia que existia uma conversa esperando**: a única forma de descobrir era
   abrir o Inbox e olhar o filtro "Escalado" (demanda 321) por conta própria.
2. **O cliente também não sabia**: nenhuma confirmação, nem "recebemos, já estamos vendo",
   nada. Pior experiência possível, parecia que a mensagem nem tinha chegado.

## Objetivo

Fechar as duas pontas: um aviso permanente no Admin enquanto existir 1+ conversa escalada sem
resolver, e uma mensagem de cortesia (com cooldown, não repetitiva) avisando o cliente que a
equipe já está ciente, sem reativar o processamento automático da IA nessa conversa.

## Escopo

- Incluído: banner persistente no shell do Admin (`app/page.tsx`), nova rota
  `app/api/inbox/escalados-count`, prop nova em `TelaInbox.tsx` pra abrir direto no filtro
  "Escalado" já existente; workflow `01` (`lcFEt1kbyqNfTS89`), saída `IGNORAR` do `Switch Destino`,
  só no caso específico `_bloqueado_motivo === 'ia_ja_escalou'`.
- Explicitamente fora de escopo: qualquer mudança em como a IA decide escalar, no gate em si
  (`Contatos: Avaliar Atendimento (Gate IA)`, intocado), no caso `_bloqueado_motivo ===
  'humano_atendendo'` (humano já ativo na conversa, não é o cenário relatado, mensagem de
  cortesia nesse caso seria redundante/confusa com quem já está digitando manualmente),
  qualquer coisa relacionada às demandas 323/324 (mesmo dia, já verificadas, sistema em teste ao
  vivo pelo Edvam, não retestado nem tocado aqui).

## Parte A: Banner persistente no Admin

### Estrutura real lida antes de mexer

`middleware.ts` roteia por host: `pdv.jsgrafica.site` vai pra `/pdv` (`app/pdv/page.tsx`, arquivo
separado, Zu/Gabi, sem Inbox); `admin.jsgrafica.site` (ou qualquer outro host) vai pra `/`
(`app/page.tsx`, `export default function Home()`), o shell inteiro do Admin, com header fixo,
2 fileiras de navegação por grupo (demanda 087) e o `<main>` com todas as telas (`AbaKeepAlive`,
demanda 136). Confirmado que `Home()` só é alcançável com a senha do Edvam (`lib/usuarios.ts`, só
o usuário admin tem senha): na prática só ele chega aqui, mas o banner ainda checa
`operador.papel === "admin"` defensivamente, mesmo padrão já usado nas outras abas `soAdmin`.

`components/TelaInbox.tsx` já tinha o filtro "Escalado" pronto (`filtroStatus`, demanda 321) e o
padrão de navegação cruzada por prop com `nonce` (`abrirConversa`, usado pela aba Clientes).

### O que foi feito

1. **`app/api/inbox/escalados-count/route.ts`** (rota nova): `GET` retorna `{ count }`,
   `jsgrafica_contatos` filtrado por `status_atendimento='escalado'`, contando por `phone` único
   (não linha crua, o mesmo telefone pode ter mais de uma linha, contact_lid instável, mesmo
   problema já tratado com dedup em `conversas/route.ts`, demanda 008/029). Como o volume aqui é
   sempre baixo, não precisou da RPC de dedup, só um `Set` em JS sobre a coluna `phone`.
2. **`components/TelaInbox.tsx`**: prop nova `abrirFiltroStatus?: { status: string; nonce: number
   } | null`, com um `useEffect` que aplica `setFiltroStatus(...)` quando o `nonce` muda, mesmo
   padrão exato do `abrirConversa` existente, reaproveita o filtro "Escalado" já construído na
   321, sem duplicar nenhuma UI de listagem nova.
3. **`app/page.tsx`** (`Home()`): estado `escaladosCount`, `carregarEscaladosCount()` (fetch da
   rota nova), poll a cada 25s + refetch ao focar a aba (mesmo fallback já usado no Inbox pra
   quando o Broadcast cai), só ativo quando `operador.papel === "admin"`. Banner (`<button>`
   vermelho, full-width) renderizado entre o `<header>` e as 2 fileiras de navegação, fora da
   área `<main>` que troca por aba, então aparece em QUALQUER tela do Admin, não só no Inbox.
   Só renderiza quando `escaladosCount > 0`; some sozinho no próximo ciclo de poll assim que a
   contagem zera (sem timer de esconder, é renderização condicional direta na contagem real).
   Clique chama `abrirInboxEscalados()`: seta `abrirFiltroEscalado` com `nonce` novo e troca pra
   aba `inbox`, o Inbox já reage e mostra a lista filtrada.

### Por que poll simples em vez de reaproveitar o Broadcast do Inbox

O banner vive em `Home()`, fora da árvore de `TelaInbox`. Puxar o canal de Broadcast
(`inbox-global`, demanda 285) pra cá duplicaria a assinatura Supabase Realtime só pra um contador
de baixo volume, sem ganho real (o evento do Broadcast dispara em toda mensagem nova, não
especificamente quando uma conversa vira/deixa de ser `escalado`). Poll de 25s + refetch ao focar
é simples, correto e do tamanho certo pro problema.

### Texto do banner

`⚠️ N conversa(s) aguardando atendimento humano · clique para ver`. Sem travessão (regra do
workspace), usa `·` no lugar, mesmo caractere já usado em outros textos do app (ex. cabeçalho do
Admin).

## Parte B: Mensagem de cortesia pro cliente, com cooldown

### Estrutura real lida antes de mexer

`GET` fresco do workflow `01` (`lcFEt1kbyqNfTS89`, 72 nodes) confirmou: `Switch Destino` roteia
por `_destino` (`ignorar`/`pedidos`/`agente_fase_b`/fallback), e o output `IGNORAR` (índice 0)
tinha `"main": [[]]`, zero conexões, exatamente como o achado descrevia.

Investigação de quem mais pode setar `_destino='ignorar'` (importante: não é só o gate da 321),
achados via busca no JSON completo do workflow:

- `CHECK SESSAO PEDIDO`: outro caminho que pode ignorar (ex. sessão de pedido morta).
- `Detectar Loop Resposta Automatica`: proteção contra loop de auto-resposta (demandas 307/309).
- `Contatos: Avaliar Atendimento (Gate IA)` (demanda 321): o gate deste relato, único que
  também grava `_bloqueado_motivo`, com 2 valores possíveis: `'humano_atendendo'` ou
  `'ia_ja_escalou'`.

**Isso importa**: se a cortesia fosse conectada direto no output `IGNORAR` sem checar o motivo,
teria mandado mensagem também pro caso de loop de auto-resposta detectado (exatamente o cenário
que a 307 existe pra silenciar) e pro caso de sessão de pedido morta, errado. A ferramenta
correta pra diferenciar já existia pronta: o campo `_bloqueado_motivo`, que só o gate da 321
grava, e só quando bloqueia. Por isso o primeiro node novo checa
`_bloqueado_motivo === 'ia_ja_escalou'` especificamente, nunca dispara pros outros motivos de
`ignorar`, nem para o caso `'humano_atendendo'` (fora de escopo, ver seção acima).

### O que foi adicionado (8 nodes novos, todos com prefixo `Cortesia:`)

Conectados só a partir do output `IGNORAR` do `Switch Destino` (que segue com as outras 3 saídas
intocadas):

1. **`Cortesia: Motivo Foi Escalado?`** (IF): `_bloqueado_motivo === 'ia_ja_escalou'`. Saída
   falsa não tem conexão (dead-end preservado pros outros motivos de `ignorar`, comportamento
   idêntico ao de antes desta demanda).
2. **`Cortesia: Buscar Sessao (raw)`** (`httpRequest` GET, `alwaysOutputData: true`, credencial
   `Supabase account 2`): `jsgrafica_agente_teste_sessoes?telefone=eq.{{ $json.phone }}
   &select=telefone,dados_extra&limit=1`.
3. **`Cortesia: Avaliar Cooldown`** (Code): desembrulha a resposta (mesmo padrão de duplo
   formato já usado em `Contatos: Avaliar Atendimento (Gate IA)`/`Detectar Loop Resposta
   Automatica`), lê `dados_extra.cortesia_dead_end_enviada_em` da sessão (se existir), calcula se
   já passaram 45 minutos desde o último envio, e monta `_cortesia_dados_extra_novo` (o
   `dados_extra` existente com a chave nova mesclada, pronto pra gravar se for enviar).
4. **`Cortesia: Pode Enviar?`** (IF): `_cortesia_pode_enviar === true`. Saída falsa sem conexão
   (dentro do cooldown, não manda de novo).
5. **`Cortesia: GET Config Agente (raw)`** (`httpRequest` GET, credencial `Supabase account 2`):
   `jsgrafica_agent_config?ativo=eq.true&select=zapi_url,client_token&limit=1`. O workflow `01`
   nunca teve nenhum node de envio Z-API antes de hoje (só loga/roteia), esta é a primeira vez.
6. **`Cortesia: Montar Envio Z-API`** (Code): mesmo cálculo de `_zapi_base`/`_zapi_token` já
   usado em `Montar Envio Z-API` do workflow `297` (`zapi_url` sem o último segmento de path vira
   a base), reaproveitado aqui isolado. Também fixa o texto da mensagem.
7. **`Cortesia: Enviar Z-API`** (`httpRequest` POST `{{ _zapi_base }}/send-text`, header
   `client-token`, `neverError: true`, `onError: continueRegularOutput`): mesmo formato exato do
   `Enviar Z-API` do `297`.
8. **`Cortesia: Marcar Enviada (raw)`** (`httpRequest` PATCH, credencial `Supabase account 2`,
   `onError: continueRegularOutput`, best-effort): grava `dados_extra` mesclado de volta em
   `jsgrafica_agente_teste_sessoes`, fixando o novo `cortesia_dead_end_enviada_em`. Nó terminal,
   sem conexão de saída.

### Cooldown escolhido: 45 minutos, gravado em `jsgrafica_agente_teste_sessoes.dados_extra`

Ficou no meio da faixa sugerida (30-60min). Guardado dentro do mesmo campo `jsonb` que já guarda
`motivo_escalonamento` (demanda 321), sem precisar de coluna nova nem migração. Mecanismo é
ler-antes-de-escrever dentro da mesma execução (não é lock distribuído): aceitável pro tamanho da
janela, porque o mesmo telefone escalado não manda 2 mensagens no mesmo instante exato, é o
mesmo tipo de corrida já aceita conscientemente em outros pontos do sistema (ex. telefone/lid na
hora do Pix, documentado em `caminho-c-mapa-decisoes-completo.md`).

Assume que a sessão em `jsgrafica_agente_teste_sessoes` já existe quando `status_atendimento`
está `'escalado'`, verdade por construção (é a própria escalação, workflow `296`, que sempre
cria ou atualiza essa sessão antes de marcar `escalado`, demanda 321 Piece 3). Se por algum motivo
não existir, o `PATCH` final afeta 0 linhas (best-effort, não quebra o envio da mensagem, só o
cooldown não persiste pra próxima vez, risco residual aceito, mesmo padrão de outros PATCHes
best-effort já no sistema).

### O texto da cortesia, e por que esse e não outro

> Isso já tá com a equipe, só um minutinho que já te respondo por aqui 😊

Escrito depois de ler as frases REAIS já usadas em produção (não inventado do zero), pra bater
com a voz real da equipe, casual, sem soar corporativo:

- `"Chamando a equipe"` / `"Chamando a equipe pra montar certinho"` / `"Chamando a equipe pra
  ouvir certinho"`: o padrão mais comum de transição pra escalação (`blueprint-conversas-
  exemplo-agente.md`, Exemplos 3 e 8), mas essa frase especificamente significa "estou chamando
  agora", não serve aqui. Esta mensagem é para quando a equipe JÁ foi chamada e o cliente está
  mandando uma mensagem NOVA enquanto espera. Repetir "chamando a equipe" de novo soaria como um
  bot travado, exatamente o efeito que o Edvam pediu pra evitar.
- `"Vou chamar a equipe pra acertar 😊"` (Exemplo 7) e `"Já te chamo com o valor"` (Exemplo 2):
  o padrão real de frase curta, presente, ativa ("vou"/"já te"), sem explicar mecanismo interno
  nenhum pro cliente.
- `"Sem problemas, cancelado! 😊"` / `"Você já pagou esse. Vou pedir pra equipe processar a
  devolução"` / `"Esse já foi entregue. Vou verificar e te aviso"` (Exemplo 6): confirmam o
  padrão de 1 emoji no máximo, nunca mais, e frases curtas de 1-2 orações.
- `"...Assim que o pagamento cair, a gente avisa por aqui 😊"` (frase real de Pix, `caminho-c-
  contrato-das-ferramentas.md`): mesmo fechamento com "por aqui" + 1 emoji único.

Restrito a 1 emoji só (😊, no fim), respeitando o achado da demanda 322 (a IA exagerando em
emoji foi reclamação real de cliente), "restrito, no máximo" foi seguido à risca. A frase nunca
menciona mecanismo interno (não fala "gate", "IA", "sistema", "escalado"), só o que o cliente
precisa saber: já tem gente vendo, e logo alguém responde.

### Validação (antes do deploy)

- Confirmado via leitura do JSON completo do workflow que `_bloqueado_motivo` só existe quando o
  gate da 321 bloqueia, e só tem os 2 valores `'humano_atendendo'`/`'ia_ja_escalou'`: o IF novo
  nunca dispara por engano pros outros 2 caminhos que também usam `_destino='ignorar'` (sessão de
  pedido morta, loop de auto-resposta), porque esses nunca gravam esse campo.
- Confirmado que `entrada.phone` sobrevive intacto por toda a cadeia nova (rastreado desde
  `Processar Evento`, o node mais cedo do workflow que grava `phone: rawZapi.phone`, até o gate
  da 321, que faz spread de `...entrada` sem remover campos).
- Padrão de "0 linhas não quebra o próximo node" (`alwaysOutputData: true` nos 2 `httpRequest`
  GET novos) seguido à risca, já é a 7ª vez que esse cuidado específico é aplicado neste projeto
  (demandas 307/308/309/314/321 antes desta).

### Persistência

Backup pré-mudança: **`GET` real via API REST (não só o snapshot do MCP)**, salvo em
`pm/backups/01-log-msg-recebidas_pre-demanda325_2026-08-27.json` (72 nodes, `active: true`).

`PUT /api/v1/workflows/lcFEt1kbyqNfTS89` teve 2 tentativas: a 1ª, com `pinData` incluído no
corpo, devolveu HTTP 400 "must NOT have additional properties" (a API não aceita esse campo de
volta no `PUT`, mesmo vindo do próprio `GET`); a 2ª, com só `{name, nodes, connections,
settings}`, devolveu HTTP 200.

**`GET` fresco separado** confirmou persistência: 72 para 80 nodes (exatamente os 8 novos, prefixo
`Cortesia:`), `active: true` mantido. Diff nó-a-nó contra o backup: **0 nodes removidos, 0 nodes
existentes alterados**, só os 8 nodes novos adicionados. Diff de conexões: **só `Switch Destino`
mudou** (saída `IGNORAR`, de vazia pra apontar no primeiro node novo, as outras 3 saídas
idênticas byte a byte ao backup), mais as 7 conexões novas entre os próprios nodes `Cortesia:`
(o 8º, `Marcar Enviada (raw)`, é terminal, sem saída).

Nenhuma execução real ou sintética disparada contra o webhook, conforme instruído. O efeito
aparece organicamente na próxima vez que um cliente escalado mandar mensagem nova.

## Critérios de aceite

- [x] Banner só existe no Admin (`app/page.tsx`), nunca no PDV (`app/pdv/page.tsx` é arquivo
      separado, não foi tocado)
- [x] Banner sempre visível em toda aba do Admin (fora da área `<main>` que troca por aba)
- [x] Banner some sozinho quando a contagem zera, sem toast/timer
- [x] Clique leva direto pro filtro "Escalado" do Inbox já existente (demanda 321), sem UI nova
      de listagem duplicada
- [x] Sem som/áudio (confirmado, só visual)
- [x] Mensagem de cortesia só dispara no caso específico `_bloqueado_motivo === 'ia_ja_escalou'`,
      nunca nos outros motivos que também usam `_destino='ignorar'`
- [x] Cooldown de 45min por telefone, sem repetir a cada mensagem nova do cliente ainda escalado
- [x] Copy da cortesia escrita a partir de exemplos reais de produção (citados acima), não
      inventada, restrita a 1 emoji, sem soar corporativa/robótica
- [x] Backup real via `GET` da API (não só MCP) antes de editar
- [x] `PUT` confirmado, `GET` fresco separado + diff nó-a-nó confirmando só a mudança pretendida
- [x] `npx tsc --noEmit` e `npm run build` limpos antes do deploy
- [x] Deploy `npx vercel --prod --yes` bem-sucedido (`readyState: READY`)
- [x] Nenhuma execução real/sintética disparada contra o webhook
- [x] Demandas 323/324 (mesmo dia) não tocadas, sistema em teste ao vivo pelo Edvam não
      perturbado
- [x] Documentação (esta demanda, `STATUS.md`, `caminho-c-mapa-decisoes-completo.md`) atualizada

## Riscos e cuidados

- Cooldown é best-effort (lê-antes-de-escrever, não é lock distribuído), risco residual aceito
  conscientemente, mesmo padrão de outras corridas já aceitas no projeto.
- `Cortesia: Marcar Enviada (raw)` assume que a sessão em `jsgrafica_agente_teste_sessoes` já
  existe (verdade por construção quando `status_atendimento='escalado'`); se não existir, o
  `PATCH` afeta 0 linhas sem quebrar o envio da mensagem, só o cooldown não persiste.
- O caso `_bloqueado_motivo === 'humano_atendendo'` (humano já ativo na conversa) foi
  deliberadamente deixado fora: mandar cortesia automática ali poderia parecer estranho ao lado
  de alguém já respondendo manualmente. Se isso também virar um problema real relatado depois,
  é demanda nova, não retrofit silencioso aqui.

## Referências

`pm/conhecimento/caminho-c-mapa-decisoes-completo.md` seção 3 (desenho dos 4 estados, atualizado
por esta demanda). Demanda 321 (gate, filtro "Escalado", `motivo_escalonamento`). Demandas
323/324 (mesmo dia, não tocadas). `pm/conhecimento/blueprint-conversas-exemplo-agente.md`
(exemplos reais de copy usados pra escrever a cortesia). `pm/conhecimento/caminho-c-contrato-das-
ferramentas.md` (frase real do Pix, mesmo padrão de fechamento). Backup pré-mudança:
`pm/backups/01-log-msg-recebidas_pre-demanda325_2026-08-27.json`.

## Relato de execução

Executado em 2026-08-27, mesma sessão, fora do fluxo normal dos chats especialistas, a pedido
direto do Edvam.

- **O que foi feito**: Parte A, banner persistente no Admin (`app/api/inbox/escalados-count/
  route.ts` novo, `components/TelaInbox.tsx` com prop `abrirFiltroStatus`, `app/page.tsx` com
  estado/poll/banner). Parte B, workflow `01` (`lcFEt1kbyqNfTS89`) ganhou 8 nodes novos (prefixo
  `Cortesia:`) conectados na saída `IGNORAR` do `Switch Destino`, disparando só quando
  `_bloqueado_motivo === 'ia_ja_escalou'`, com cooldown de 45min gravado em
  `jsgrafica_agente_teste_sessoes.dados_extra`.
- **Testes realizados e resultado**: `npx tsc --noEmit` limpo. `npm run build` (produção,
  Turbopack) compilou com sucesso, rota nova `/api/inbox/escalados-count` presente na lista de
  rotas geradas. `PUT` do workflow `01` confirmado com `GET` fresco separado + diff nó-a-nó: 8
  nodes adicionados, 0 removidos, 0 alterados, conexões só mudaram no ponto esperado (`Switch
  Destino` saída `IGNORAR`). Nenhuma execução real/sintética disparada contra o webhook, conforme
  instruído.
- **Achados fora do escopo (relatados, não resolvidos por conta própria)**: nenhum achado novo
  fora do escopo desta demanda.
- **Status final**: concluída. Deploy Vercel `dpl_GFUWmKJV9ePnqA16qet6NbLf4QEh`, `readyState:
  READY`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site` (mesmo projeto Vercel, roteamento
  por subdomínio via `middleware.ts`). Efeito do banner visível organicamente na próxima vez que
  a contagem de escalados mudar; efeito da cortesia visível organicamente na próxima mensagem real
  de um cliente escalado, nenhum teste ao vivo forçado pela execução desta demanda.
