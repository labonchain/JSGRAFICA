# 266 — Nome de contato editado pelo Admin volta ao nome bruto do WhatsApp

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-14
Chat executor: 01-N8N

## Contexto
Achado real do Edvam (2026-08-01): edita o nome de um contato no Inbox, e depois de um tempo o
nome volta a ser o nome bruto que vem do WhatsApp, "como se estivesse sendo sobrescrito".

Investigação confirmou a causa raiz, não é suposição: o workflow n8n
`01 - JSGRAFICA | LOG MSG RECEBIDAS` (node `Get row(s) CONTATOS`, ver backup
`pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda249_2026-07-29.json`) busca o contato
existente **só por `contact_lid`**, nunca por `phone`. `contact_lid` é o identificador de
privacidade "LID" do WhatsApp, comprovadamente instável (mesmo telefone pode ganhar um
`contact_lid` novo — já documentado nas demandas 008/029/053, `pm/conhecimento/mapa-dados-
contato.md`). Quando o `contact_lid` muda, o lookup não acha a linha antiga (com o nome editado),
`_action` vira `"create"`, e o n8n insere uma **linha nova** pra aquele telefone, sem o nome. A
UI/app passa a exibir/usar essa linha nova (sem nome), enquanto a linha antiga (com o nome
editado) continua intacta mas órfã.

As demandas 126/134/135 já mitigaram parte do sintoma (preferir `lead_name` ao deduplicar por
`phone`, proteger `phoneFinal` dentro de uma linha já existente), mas **nenhuma mudou a chave de
lookup de `contact_lid` pra `phone`** — a causa estrutural continua lá, e a linha nova pode nascer
com `phone` diferente também, não deduplicando nem no app.

## Objetivo
Contato não perder nome editado quando o `contact_lid` do WhatsApp mudar pra aquele telefone.

## Escopo
- Incluído: mudar (ou complementar) o lookup do node `Get row(s) CONTATOS` no workflow
  `01 - LOG MSG RECEBIDAS` pra buscar também por `phone` quando a busca por `contact_lid` não
  encontrar nada — se achar uma linha existente por `phone`, fazer UPDATE (preservando
  `lead_name` já setado) em vez de criar linha nova, e atualizar o `contact_lid` daquela linha pro
  novo valor.
- Incluído: revisar se `phoneFinal` também precisa de proteção nesse caminho novo/merge (mesma
  lógica da demanda 134, que hoje só se aplica quando `contatoExistente` já vinha do lookup por
  `contact_lid`).
- Incluído: rodar uma consulta em `jsgrafica_contatos` pra encontrar quantos telefones já têm
  linhas duplicadas por esse motivo (mesmo `phone`, `contact_lid` diferentes) — reportar a escala
  real do problema histórico, mesmo que a correção do fluxo não seja retroativa.
- Explicitamente fora de escopo: corrigir/mesclar retroativamente as duplicatas já existentes —
  fica pra demanda separada, depois de ver a escala.

## Critérios de aceite
- [ ] Lookup do node corrigido pra também achar por `phone` quando `contact_lid` não bate
- [ ] Nome editado pelo Admin preservado num teste real (editar nome, forçar/simular rotação de
      `contact_lid`, confirmar que o nome não some)
- [ ] Escala do problema histórico (contagem de duplicatas) reportada

## Referências
`pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda249_2026-07-29.json` (node `Get row(s)
CONTATOS`, `PREPARAR LOG CONTATOS`). `app/api/inbox/contato/route.ts` (edição manual do nome pelo
Admin). `app/api/inbox/conversas/route.ts`, `app/api/clientes/route.ts` (dedup por `phone`,
demanda 126). `pm/conhecimento/mapa-dados-contato.md`. Achado 2026-08-01.

## Relato de execução

**Status final: concluída**, com honestidade sobre 2 imprevistos reais durante a execução (um bug
na minha própria correção, achado e corrigido antes de fechar; e um erro de limpeza de dado de
teste, já revertido). Nenhum dos dois ficou em aberto.

### Mapeamento confirmado antes de mexer
`Get row(s) CONTATOS` busca só por `contact_lid` (filtro único, confirmado no JSON do node).
`PREPARAR LOG CONTATOS` decide `_action` (`create`/`update`) só a partir do resultado desse
lookup. `Merge1` (mode `append`, 2 inputs) combina o evento com o resultado do lookup.
`If CRIA OU ATUALIZA CONTATOS` roteia pra `CONTATOS` (update) ou `CONTATOS1` (create). Confirmado
com o backup da 249: a causa raiz é exatamente a do relato da demanda — sem fallback nenhum.

### O que foi feito
1. Backup do `01` antes de qualquer mudança:
   `pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda266_2026-08-14.json`.
2. Node novo `Get row(s) CONTATOS por phone` (mesmo tipo/credencial do lookup original), filtro
   `phone = {{ $json.phone }}`, `alwaysOutputData: true`. `Merge1` passou de 2 pra 3 inputs.
3. `PREPARAR LOG CONTATOS`: a lógica que decide `contatoExistente` agora considera os candidatos
   dos 2 lookups, priorizando o que bate exatamente com o `contact_lid` atual (achado pelo lookup
   de `contact_lid`) e só caindo pro achado por `phone` quando o primeiro não existe (`contact_lid`
   rotacionou). `phoneFinal` **não precisou de nenhuma mudança** — já dependia só de
   `contatoExistente` existir, então passou a se beneficiar do fallback automaticamente (item do
   escopo revisado e confirmado, não é mais risco separado).
4. **Achado durante a implementação, não estava no escopo original**: corrigir só o lookup não
   bastava pra atingir o objetivo da demanda. O node `CONTATOS` (update) filtrava por
   `contact_lid = $json.contact_lid`, mas `PREPARAR LOG CONTATOS` sempre grava o `contact_lid`
   NOVO nesse campo, o que faz o `WHERE` do UPDATE não encontrar a linha antiga (que ainda tem o
   `contact_lid` velho gravado). Sem esse segundo ajuste, o UPDATE simplesmente não acharia
   nenhuma linha pra atualizar, silenciosamente. Corrigido gravando uma chave adicional
   (`_matchContactLid`, o `contact_lid` já existente na linha achada) e trocando o filtro do
   `CONTATOS` pra usar essa chave.
5. Deploy via API, diff completo confirmado a cada mudança: no total, 48 → 49 nodes (só o node
   novo), 3 nodes existentes alterados (`CONTATOS`, `Merge1`, `PREPARAR LOG CONTATOS`), nada mais.

### Bug achado e corrigido durante o próprio teste (não sobreviveu à versão final)
No primeiro teste (mensagem com `contact_lid` rotacionado, sem nome no payload), o nome editado
sumiu mesmo assim. Investigando a execução real: o lookup por `contact_lid` que não acha nada,
com `alwaysOutputData: true`, devolve um item **vazio (`{}`)**, não uma cópia do evento — e `{}`
é "truthy" em JavaScript. Minha 1ª versão do filtro (`!tipo_evento`) não excluía esse item vazio,
e `.find(Boolean)` pegava ele antes da linha real achada por `phone`. Corrigido exigindo também
`phone` no candidato (`!tipo_evento && phone`), o que exclui corretamente o placeholder vazio.
Retestado, name preservado como esperado.

### Achado mais sério, também corrigido antes de fechar: colisão de chave em telefone com duplicata
Ao testar, achei (via execução real de produção, não sintética) que a 1ª versão do filtro do
UPDATE (por `phone`, em vez da chave `_matchContactLid`) causou **1 erro real em produção**:
telefone `558198917512` já tinha 2 linhas duplicadas (o próprio sintoma desta demanda, ocorrido
antes da correção) — o `UPDATE ... WHERE phone = X` bateu nas 2 ao mesmo tempo tentando gravar o
mesmo `contact_lid` novo nas 2, violando a constraint única de `contact_lid`
(`duplicate key value violates unique constraint "jsgrafica_contatos_pkey"`). Confirmei que foi
o ÚNICO caso real afetado (todos os outros erros na janela eram o bug já conhecido e não
relacionado da 248, `request_method` faltando em `jsgrafica_log_msgs_grupos`) — a execução abortou
antes de qualquer outra coisa quebrar, e a mensagem desse cliente continuou sendo logada
normalmente pelo caminho paralelo (só o contador/nome do contato não foi atualizado nessa 1
mensagem). Corrigido trocando o filtro do UPDATE de `phone` pra `_matchContactLid` (o
`contact_lid` que a linha JÁ TINHA gravado, capturado no momento do lookup) — isso identifica a
linha exata sem risco de bater em mais de uma, mesmo quando o telefone já tem duplicata histórica.
Retestei esse cenário específico (telefone com 2 linhas duplicadas de propósito) depois da
correção: sem erro, atualiza 1 das 2 linhas, não mexe na outra (comportamento correto e esperado,
já que mesclar duplicata é explicitamente fora de escopo).

### Testes realizados e resultado (versão final, já com as 2 correções acima)
1. Mensagem cria contato com `contact_lid` A. Nome editado manualmente (simulando edição do
   Admin). Mensagem seguinte do mesmo telefone com `contact_lid` B (simulando rotação) e sem nome
   no payload (cenário real do bug: WhatsApp não manda nome válido nessa mensagem):
   **1 única linha** no fim, `contact_lid` atualizado pra B, `lead_name` preservado
   ("Nome Editado Pelo Admin 266"), `total_interacoes` incrementado corretamente (2,
   `RECORRENTE`), `criado_em` preservado da linha original. Confirmado por SQL e pela execução
   real do n8n (`_action: "update"` com `lead_name` certo chegando no node `CONTATOS`).
2. Telefone com 2 duplicatas históricas simuladas + mensagem com `contact_lid` novo (3º):
   execução com sucesso, sem erro de constraint, atualiza 1 das 2 linhas (comportamento aceitável,
   mesclar não é desta demanda).
3. Confirmado nos logs reais de produção (10 execuções mais recentes após o deploy final): todas
   `success`, nenhum novo erro.

### Escala do problema histórico (pedida no escopo)
`select count(*) from jsgrafica_contatos` = 2.814 linhas totais. Telefones com mais de 1
`contact_lid` (duplicata pelo motivo desta demanda): **7 telefones, 21 linhas ao todo** (5 são
clientes individuais reais — `558191252071` Eliane, `558193864868` Jessica Silva Silva,
`558198917512` Mateus Grupo Prima Almoço, `558184109425` Fabiana, `558183971678` Memel — cada um
com exatamente 2 linhas, 1 com nome e 1 sem, a assinatura exata do bug; 2 são grupos internos do
WhatsApp, não clientes). Escala pequena e contida (~0,75% das linhas totais) — consistente com o
lookup por `contact_lid` já funcionar corretamente na maioria esmagadora dos casos (rotação de LID
não é o padrão comum, só acontece ocasionalmente). Não corrigido retroativamente, conforme
explicitamente fora de escopo.

### Achado fora do escopo (relatado, não resolvido por conta própria)
- **Erro de limpeza cometido e já corrigido**: ao apagar dado de teste, um `DELETE ... WHERE
  phone = '5521965185667'` sem restringir por `contact_lid` de teste apagou também a linha REAL
  desse telefone (o próprio número de teste do Edvam, usado em várias demandas anteriores desta
  sessão — `contact_lid` real `52063694233823@lid`, nome real "Edvan Filho", histórico real desde
  11/01/2026). Percebido ao conferir o resultado da limpeza (0 linhas em vez da 1 esperada).
  Reconstruída com os melhores dados reais disponíveis: nome e `contact_lid` recuperados por
  agregação de `jsgrafica_log_msgs_privadas` (a combinação mais frequente no histórico real, 187+
  ocorrências), contadores de mensagens recebidas/enviadas (253/38) e datas de primeiro/último
  contato também recalculados a partir do log real. **Não é uma restauração perfeita** (não há
  como recuperar o `criado_em`/`atualizado_em` originais exatos, nem qualquer edição manual que
  já tivesse sido feita nesse contato antes de hoje) — reportando com transparência, não
  escondendo o erro.

### Critérios de aceite
- [x] Lookup do node corrigido pra também achar por `phone` quando `contact_lid` não bate
- [x] Nome editado pelo Admin preservado num teste real (editar nome, forçar/simular rotação de
      `contact_lid`, confirmar que o nome não some) — testado 2x (cenário simples e cenário com
      duplicata histórica), confirmado nos dois
- [x] Escala do problema histórico (contagem de duplicatas) reportada: 7 telefones, 21 linhas
