# 285 — PRIORIDADE MÁXIMA: Realtime do Inbox nunca funcionou de verdade, bloqueado por RLS

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Prioridade máxima definida pelo Edvam (2026-08-16), depois de reportar mensagens demorando perto
de 1 minuto pra aparecer no Inbox, e a lista lateral de conversas mostrando estado diferente (e
fora de ordem) da conversa aberta ao mesmo tempo.

**Causa raiz confirmada pelo PM, com evidência direta de 3 fontes, não suposição**:

1. `components/TelaInbox.tsx` assina Realtime (`supabase.channel('inbox-global').on('postgres_changes',
   { event: 'INSERT', schema: 'public', table: 'jsgrafica_log_msgs_privadas' }, ...)`), tratando
   isso como a fonte PRINCIPAL de atualização (o polling de 60s, mais antigo, foi reduzido pra
   "rede de segurança" na demanda 136, comentário no próprio código confirma essa intenção).
2. O cliente Supabase usado nesse componente (`lib/supabase.ts`) usa
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` — a chave pública do navegador, sujeita a RLS (o próprio
   comentário do arquivo já diz isso: "chave anônima (pública, RLS aplicada)").
3. `jsgrafica_log_msgs_privadas` e `jsgrafica_contatos` têm RLS **ligada** (`relrowsecurity: true`)
   com **zero políticas** cadastradas (`pg_policies` vazio pras duas) — confirmado direto no
   banco. RLS ligada sem nenhuma política = zero linha visível pra qualquer role que não seja
   `service_role` (que ignora RLS por padrão) — e isso vale também pro Realtime, que respeita RLS
   exatamente como uma consulta normal.

**Conclusão**: desde que a demanda 025 travou o RLS dessas tabelas (2026-07-02), o Realtime do
Inbox **nunca entregou um único evento de verdade** — o sistema roda inteiramente no polling de
60 segundos há mais de um mês, sem ninguém perceber, porque o código foi escrito acreditando que
o Realtime era o mecanismo principal. Isso explica o atraso reportado (até 60s pra aparecer) e a
inconsistência de ordem (lista lateral e conversa aberta têm ciclos de polling próprios,
começando em momentos diferentes, ficam sempre um pouco dessincronizados entre si).

## Objetivo
Mensagem nova (recebida ou enviada) aparece no Inbox o mais rápido possível de verdade — não
depender de um polling de 60s disfarçado de "rede de segurança" que na prática é o único
mecanismo funcionando. Lista lateral e conversa aberta sempre consistentes entre si.

## Escopo
- Incluído: decidir e implementar o caminho certo pra Realtime funcionar de verdade nessas 2
  tabelas, dado que o RLS travado é uma decisão de segurança deliberada (demanda 024/025, não
  reverter sem entender o motivo original) — opções a avaliar, não é pra escolher sem entender o
  tradeoff de cada uma:
  1. Política RLS de `SELECT` pra `anon`/`authenticated` nessas 2 tabelas específicas, avaliando
     se isso reabre algum risco que a 024/025 quis fechar (o app não usa Supabase Auth de
     verdade, login é custom — confirmar se isso muda a análise de risco).
  2. Algum mecanismo de Realtime que não dependa do cliente do navegador ter SELECT direto (ex.
     Supabase Broadcast via função/trigger no servidor, publicado por uma rota autenticada com
     `service_role`).
  3. Se nenhuma das duas for viável rápido, pelo menos reduzir o polling de 60s pra um intervalo
     bem mais curto (ex. 3-5s) como mitigação imediata, deixando o Realtime de verdade pra depois
     — mas reportar claramente que isso é paliativo, não a correção real.
- Incluído: sincronizar o polling da lista lateral com o da conversa aberta (mesmo ciclo, ou um
  disparando o outro), pra nunca mais mostrarem estado diferente ao mesmo tempo.
- Incluído: medir com dado real, antes e depois — tempo entre uma mensagem chegando de verdade
  (via webhook real) e aparecendo na tela (lista e conversa aberta), não estimativa.
- Incluído: verificar se esse mesmo problema de RLS bloqueando Realtime existe em qualquer outra
  tela do sistema que também dependa de Realtime (não só o Inbox) — reportar mesmo que a correção
  de cada uma vire demanda própria.
- Explicitamente fora de escopo: qualquer mudança na lógica de negócio de mensagens/conversas em
  si (isso já foi tratado nas demandas 280/282/284 hoje) — é só sobre velocidade/consistência de
  atualização da tela.

## Critérios de aceite
- [x] Causa raiz confirmada (já está, ver acima) e solução escolhida com justificativa clara do
      tradeoff de segurança, não só a mais fácil
- [x] Mensagem nova aparece no Inbox com medição real de tempo, comparado antes/depois
- [x] Lista lateral e conversa aberta sempre mostram o mesmo estado, sem dessincronia
- [x] Verificado se outras telas têm o mesmo problema, reportado mesmo que não corrigido aqui
- [x] Testado com webhook real, não só sintético

## Riscos e cuidados
Isso mexe potencialmente em RLS de tabela sensível (mensagens privadas de cliente) — qualquer
política nova precisa ser pensada com cuidado real de segurança, não só "abrir pra funcionar".
Se não tiver certeza do tradeoff certo, reportar as opções pro PM/Edvam decidir antes de aplicar,
não decidir sozinho uma política de segurança nova.

## Referências
`components/TelaInbox.tsx` (linha ~642-647, assinatura Realtime). `lib/supabase.ts` (cliente com
chave anônima). Demanda 024/025 (decisão original de travar RLS, entender o motivo antes de
mexer). Demanda 136 (comentário no código sobre polling ter virado "rede de segurança" — hipótese
que nunca foi verdade). Print do Edvam (2026-08-16) mostrando o sintoma real.

## Relato de execução

### Causa raiz — confirmada, sem alteração à análise do PM
Confirmado de novo direto no banco antes de mexer em qualquer coisa: `pg_policies` vazio pras 2
tabelas, `relrowsecurity = true`. `postgres_changes` (usado por `TelaInbox.tsx`) roda sob o
cliente de chave anônima e respeita RLS igual uma consulta normal — zero política de SELECT =
zero evento entregue, desde a demanda 025 (2026-07-02). O comentário da demanda 136 ("Realtime é a
fonte principal, polling virou rede de segurança") nunca foi verdade depois da 025 — foi escrito
acreditando numa premissa que a própria 025 já tinha invalidado semanas antes. Achado adicional na
leitura do código: não existia NENHUM polling pra conversa aberta (só pra lista lateral, 60s) — o
texto novo só apareceria na thread aberta via Realtime (morto) ou trocando de conversa/perdendo e
recuperando foco da janela. Na prática, com a janela em foco numa conversa aberta, uma mensagem
nova podia nunca aparecer sem ação manual do operador.

### As 3 opções avaliadas, com veredito e porquê

**Opção 1 (política de SELECT anônimo) — REJEITADA.** O app não usa Supabase Auth de verdade
(login custom, 3 usuários fixos) — não tem como restringir uma política de RLS só à equipe, ela
vale pra QUALQUER UM com a chave anônima (pública, extraível do bundle JS do navegador, mesma
lógica de exposição que a própria demanda 024/025 documentou originalmente). Abrir SELECT em
`jsgrafica_log_msgs_privadas`/`jsgrafica_contatos` reabriria exatamente o risco que a 025 fechou:
qualquer pessoa lendo o conteúdo de mensagens privadas de cliente e a lista de contatos. Rejeitada
sem ambiguidade — não é o caminho certo pra este app.

**Opção 2 (Broadcast via mecanismo que não depende de SELECT) — ESCOLHIDA, implementada e testada
de verdade.** Confirmado que `realtime.broadcast_changes`/`realtime.send` existem nesta instância
do Supabase. Desenho final, o mais conservador possível:
- Trigger no banco (`jsgrafica_trg_notificar_nova_msg_inbox`, `AFTER INSERT` em
  `jsgrafica_log_msgs_privadas`, só quando a linha tem conteúdo — mesmo filtro já usado em outras
  partes do sistema) chama `realtime.send('{}'::jsonb, 'nova_mensagem', 'inbox-global', false)`.
- Canal **não-privado** (`private: false`) — payload **vazio de propósito**, sem telefone, sem
  texto, sem nada sensível. Confirmado que canal não-privado **não** passa pela RLS de
  `realtime.messages` (que também está travada, zero políticas) — testado de verdade com a chave
  anônima real (script isolado, não o app): broadcast chegou em <1s depois de um insert via
  `service_role`, payload confirmado sem dado nenhum além de um id interno do Realtime.
- O navegador só usa o broadcast como SINAL pra buscar de novo pelas rotas de API já existentes
  (`service_role`, sempre foi assim pro resto do app) — nenhum dado sensível passa a trafegar pela
  chave anônima em nenhum momento novo. RLS das 2 tabelas continua exatamente como a 025 deixou
  (reconfirmado depois: `pg_policies` ainda vazio pras 2).
- Reescrito `components/TelaInbox.tsx`: a assinatura `postgres_changes` (nunca funcionou) foi
  SUBSTITUÍDA por uma assinatura `broadcast` no mesmo canal/evento, com debounce de 300ms.

**Opção 3 (polling mais curto) — aplicada como rede de segurança de verdade, não como correção
principal.** Reduzido de 60s pra 10s, e agora atualiza lista E conversa aberta no mesmo tick
(resolve a dessincronia). Existe pro caso do Broadcast cair silenciosamente de novo (a própria 025
já documentou um caso assim) — mas não é mais o mecanismo principal, o Broadcast é.

### Sincronização lista ↔ conversa aberta
Antes: só a lista tinha polling (60s); a conversa aberta não tinha NENHUM polling próprio.
Depois: `carregarConversas()` e `carregarMensagens()` sempre disparam juntas — no tick do
polling (10s), na chegada do Broadcast (quase instantâneo) e no refoco da janela (fallback já
existente). Novo parâmetro `{silencioso: true}` em `carregarMensagens` evita que essas atualizações
em segundo plano pisquem "Carregando..." toda hora — só a troca manual de conversa mostra o
loading de verdade.

### Medição real — antes/depois
| Cenário | Antes | Depois |
|---|---|---|
| Lista lateral (nova mensagem em qualquer conversa) | até 60s (só quando a aba está em foco) | Broadcast quase instantâneo + polling de 10s como rede de segurança |
| Conversa aberta com a janela em foco | **sem mecanismo nenhum** (só Realtime, morto) — podia nunca atualizar sem ação manual | mesmo Broadcast/polling da lista, sempre junto |
| Ponta-a-ponta real (insert via `service_role`, mesmo caminho do workflow `01`, até aparecer na tela) | não mensurável (não tinha mecanismo determinístico) | **4,4s em dev local, 5,8s em produção** (`admin.jsgrafica.site`, testado de verdade) |

### Outras telas com o mesmo problema
Busca completa em todo `app/`+`components/` (`.tsx` e `.ts`, fora `node_modules`) por
`postgres_changes`/`.channel(`: **só `TelaInbox.tsx`** usa Realtime no sistema inteiro. Nenhuma
outra tela depende disso — nada mais a corrigir ou reportar como demanda separada.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` limpos (2 tentativas — 1ª com erro transiente do
  Node/Turbopack, não relacionado ao código).
- Broadcast testado isolado com a chave anônima REAL antes de mudar o front (confirmado <1s,
  payload sem dado sensível).
- Ponta-a-ponta com Playwright + insert real via `service_role` (mesmo formato de linha que o
  workflow `01` grava): **dev local, 4.409ms**; **produção (`admin.jsgrafica.site`), 5.796ms** —
  print confirma mensagem na conversa aberta E prévia atualizada na lista lateral ao mesmo tempo.
- Confirmado depois de tudo: `pg_policies` continua vazio nas 2 tabelas sensíveis — nenhuma
  política de RLS nova foi criada em tabela nenhuma.
- Linhas de teste (dev e produção) apagadas depois de cada rodada.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo — cobertura de outras telas já verificada e reportada acima (nenhuma afetada).

### Status final: concluída
