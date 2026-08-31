# 002 — Investigar por que o Inbox não reflete o log real de conversas

Status: concluída (diagnóstico)
Criada em: 2026-07-02
Aprovada em: — (despachada direto pelo Edvam, sem passar pela etapa formal de aprovação)
Concluída em: 2026-07-02
Chat executor: 03 - APP JS GRAFICA (com apoio de 02 - DADOS JS GRAFICA se precisar de query
direta no banco)

## Contexto
Edvam relata que o Inbox do sistema (`admin.jsgrafica.site`) hoje não reflete corretamente o
log de conversas reais da JS Gráfica. Ainda não investigado a fundo — não sabemos se é
filtro, contaminação de dado (ver demanda 001), paginação, ou mismatch de número conectado.

## Objetivo
Identificar a causa técnica do descompasso entre o que aparece no Inbox e as conversas reais
da gráfica.

## Escopo
- Incluído: revisar `app/api/inbox/conversas/route.ts` e `app/api/inbox/mensagens/route.ts`
  (filtros de `status_atendimento`, `limit(100)`/`limit(500)`, ordenação); comparar contra o
  que existe de fato no Supabase para os contatos/telefones que o Edvam espera ver; checar se
  o número atualmente conectado no Z-API bate com o que os dados históricos representam;
  considerar a possível relação com a demanda 001 (dado contaminado poluindo a lista).
- Fora de escopo: alterar a lógica do Inbox ainda — qualquer correção vira nova demanda depois
  do diagnóstico.

## Critérios de aceite
- [ ] Causa identificada (ou lista de hipóteses testadas com resultado de cada uma)
- [ ] Proposta de correção descrita (sem implementar) para aprovação

## Riscos e cuidados
Nenhuma mudança de código nesta demanda — é diagnóstico.

## Referências
`app/api/inbox/**`, `components/TelaInbox.tsx`, tabelas `jsgrafica_contatos`,
`jsgrafica_log_msgs_privadas`. Ver `pm/investigacoes/2026-07-02-*.md` e demanda 001.

## Relato de execução

**Investigação concluída — nenhum código alterado (conforme escopo).**

### O que foi revisado
- `app/api/inbox/conversas/route.ts` e `app/api/inbox/mensagens/route.ts` (código completo).
- `components/TelaInbox.tsx` (consumo das rotas, filtros de UI, polling, realtime).
- Comparação direta com o Supabase (`jsgrafica_contatos`, `jsgrafica_log_msgs_privadas`),
  via query SQL read-only, e chamada real ao endpoint local (`npm run dev` +
  `curl localhost:3000/api/inbox/conversas`) para confirmar que o retorno da API bate
  exatamente com o que está no banco.
- Checagem de RLS (`pg_policies`) nas duas tabelas — descartada como causa.

### Causa identificada
**Não há bug de filtro/ordenação/limit no código do Inbox.** A rota `conversas/route.ts`
não aplica filtro de status por padrão (UI manda `filtroStatus=""` → nenhum `.eq()` é
aplicado), o `.order('data_ultimo_contato', desc).limit(100)` está correto, e o `curl` local
confirmou que a API devolve **exatamente** o que existe em `jsgrafica_contatos` — nenhum dado
está sendo escondido por código.

O problema é **rio acima do Inbox**: a tabela `jsgrafica_log_msgs_privadas` está,
factualmente, sem tráfego real de clientes há muito tempo:
- `SELECT count(*) FILTER (WHERE from_me=false)` desde **2026-06-01 até agora = 0**
  (zero mensagens recebidas de clientes em mais de um mês).
- As **únicas 3 mensagens** de todo esse período são de **hoje** (2026-07-02, 21:59–22:27),
  todas `from_me:true` (enviadas, não recebidas).

E o achado mais importante: **essas 3 mensagens de hoje não são tráfego real de cliente** —
são testes do próprio operador. Evidências:
- Os dois "Pedido confirmado" (21:59:01 e 21:59:33) foram para o telefone `5511981889981`
  ("Carol Marinoni", DDD 11-SP) — e o texto bate **exatamente** com o template gerado pelo
  mini-PDV dentro do próprio Inbox (`TelaInbox.tsx:443`, função `confirmarVenda()`), incluindo
  um bug visível de digitação (`"R$\n\nnasdnasda$ 8,50"` — texto colado sem querer no campo de
  valor/descrição do mini-PDV).
- A 3ª mensagem ("oi", 22:27:02) foi para `5521965185667` ("Edvan Filho", DDD 21-RJ) — o
  **mesmo número** que aparece hardcoded como `AUTORIZADOS` no workflow n8n `01` (achado da
  investigação de 2026-07-02) — indício forte de que é o próprio número pessoal/teste do
  Edvam.
- Nenhum dos dois telefones é DDD 81 (Recife). Ambos já estavam na base "contaminada"
  identificada na demanda 001 (contatos fora do escopo da gráfica).
- O campo `ultima_leitura_admin` desses e de outros contatos antigos (maio/2026, também DDD
  fora de 81) foi atualizado **hoje** — ou seja, o próprio Edvam abriu essas conversas antigas
  de teste no Inbox hoje, e ao testar o mini-PDV all-in-one, essas mensagens de teste saíram
  por elas.

**Conclusão prática:** o Inbox está refletindo o log fielmente. O motivo de ele "não bater com
as conversas reais" é que o topo da lista (ordenada por `data_ultimo_contato desc`) está
dominado por contatos de teste/contaminados que receberam interação hoje (por engano, durante
teste do mini-PDV), enquanto os contatos reais de clientes da gráfica (DDD 81) ficam mais
abaixo na lista porque não têm nenhuma mensagem nova desde abril/maio. Não há nenhuma mensagem
de cliente real chegando à tabela desde 01/06 — isso indica que a reconexão do Z-API relatada
hoje ainda não resultou em nenhuma mensagem de cliente real logada (ou porque ainda não chegou
nenhuma mensagem de cliente de fato, ou porque o pipeline Z-API → n8n → Supabase não está
efetivamente gravando o recebido — isso não foi possível confirmar a partir do código do App;
depende de checar o lado n8n/Z-API, fora do meu domínio).

### Hipóteses testadas e descartadas
| Hipótese | Resultado |
|---|---|
| Filtro `status_atendimento` escondendo conversas | Descartada — filtro padrão da UI é "Todos" (sem `.eq()`) |
| `limit(100)`/`limit(500)` cortando resultados relevantes | Descartada — com only ~2 contatos tocados desde junho, o limite nunca é o gargalo |
| Ordenação por `data_timestamp` com unidade errada (s vs ms) | Descartada — confirmado que o campo é consistentemente ms, ordena corretamente |
| RLS do Supabase bloqueando linhas para o `anon key` usado pela API | Descartada — políticas em `jsgrafica_contatos` e `jsgrafica_log_msgs_privadas` são `USING (true)` para SELECT, sem restrição |
| Mismatch entre API e banco (bug de código) | Descartada — `curl` local no endpoint real devolveu exatamente os dados do banco |
| Contaminação de dado (demanda 001) empurrando contatos reais para fora da visão imediata | **Confirmada como causa direta e observável** — contatos de teste/contaminados dominam o topo da lista hoje |
| Ausência de tráfego real de cliente no período | **Confirmada** — zero `from_me=false` desde 01/06/2026 |

### Achado fora do escopo (relatado, não resolvido)
- `jsgrafica_vendas` recebeu **946 linhas novas hoje** com `operador='import'` e `phone=null`
  — aparenta ser a importação do histórico do Google Sheets rodando hoje (item já no
  backlog). Não afeta o Inbox (tabela não tem phone/contato vinculado), mas é um evento
  grande o suficiente no banco para o PM/02-DADOS confirmar se foi intencional e se terminou
  corretamente.
- O texto do "Pedido confirmado" enviado a `5511981889981` tem um bug de digitação visível
  colado no meio do valor (`R$\n\nnasdnasda$ 8,50`) — sugere que o teste do mini-PDV dentro do
  Inbox foi feito com texto colado sem querer no campo de descrição/valor avulso. Não é um bug
  de código (o carrinho registrou certo, "ENCADERNAÇÃO DE 201 À 300 FOLHAS — R$ 8,50"; o lixo
  ficou só na string de mensagem final formatada em `TelaInbox.tsx:440-443`, que concatena
  `i.nome` — então o "lixo" veio do campo `avulsoDesc` ou de um nome de produto sujo). Vale
  confirmar com o Edvam se foi só um teste ou se há dado sujo em algum produto/descrição.

### Proposta de correção (para aprovação do PM — não implementada)
Não há bug a corrigir no Inbox propriamente dito. Recomendações, em ordem:
1. **Fora do meu domínio, prioridade alta para 01-N8N:** confirmar via `GET /status` do Z-API
   que o número conectado agora é de fato o da gráfica, e confirmar ponta a ponta que o
   webhook Z-API → n8n → `jsgrafica_log_msgs_privadas` está gravando mensagens recebidas
   (`from_me:false`) de um número de teste real antes de considerar o Inbox "voltando ao
   normal". Sem isso, o Inbox vai continuar mostrando só ruído histórico.
2. **Dentro do meu domínio, mudança de UX (não implementada, aguardando aprovação):** o
   comportamento atual de ordenar só por `data_ultimo_contato desc` é correto, mas fica frágil
   quando a base tem contatos contaminados/teste. Sugestão futura: dar ao operador uma forma
   de silenciar/arquivar contatos de teste (ex.: um status `arquivado` ou flag
   `ignorar_inbox`) para eles pararem de subir ao topo quando alguém testa algo neles — mas só
   faz sentido implementar depois que a demanda 001 (contaminação) definir o que fazer com
   esses contatos.
3. Não depende de mim decidir se a contaminação (demanda 001) deve ser limpa, arquivada ou
   apenas escondida da UI — fica para o PM decidir depois de ver os dois relatórios.

### Testes realizados
- Query SQL direta no Supabase (read-only) comparando `jsgrafica_contatos` e
  `jsgrafica_log_msgs_privadas` com o que a API retorna.
- Chamada real ao endpoint (`npm run dev` local + `curl http://localhost:3000/api/inbox/conversas`)
  — confirmado que a resposta bate 100% com a query direta no banco.
- Não testei a UI no navegador (não era necessário para este diagnóstico — a demanda pede
  investigação de API/dados, não de interface).

### Status final
**Concluída.** Diagnóstico entregue com causa identificada e proposta de correção para
aprovação — nenhuma mudança de código foi feita, conforme escopo da demanda.
