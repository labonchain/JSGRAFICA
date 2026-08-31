# 284 — Performance do Inbox: investigação de fundo, não só o conserto pontual da prévia

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16), com print: na conversa aberta do "Ninho", a última
mensagem de verdade é "BOM DIA" às 10:40 de hoje. Mas na lista lateral de conversas (à esquerda),
o mesmo contato mostra como prévia "Você: Meu Deus 🙏", com data **14/08** — mais de um dia
desatualizado. O Edvam também reportou lentidão geral carregando o histórico da conversa, e
"vários bugs de carregamento" percebidos — não é a primeira vez hoje: a demanda 280 (mais cedo,
mesmo dia) já tinha achado e corrigido um bug de ordenação/paginação na busca de mensagens de uma
conversa aberta, também exposto pelo mesmo contato "Ninho" (693+ mensagens acumuladas, reuso
constante como número de teste desde julho).

**Pedido explícito do Edvam**: não tratar isso como mais um conserto pontual isolado — já é o 2º
sintoma de performance no mesmo dia, no mesmo contato de alto volume. Precisa de uma investigação
de fundo, pra não continuar voltando com um bug novo a cada demanda.

**Contexto histórico relevante, não repetir do zero**: o Inbox já passou por 2 rodadas de
performance antes — demanda 108 (2026-07-08, causa raiz de lentidão geral identificada por
medição real, Seq Scan de ~3,1s, corrigida com RPCs de agregação no banco, ganho de ~40-60x
medido) e demanda 136 (2026-07-12, keep-alive de abas, limites de query, RPC agregada, índices
confirmados por `EXPLAIN`). Isso significa: ou essas correções não cobriram o caminho específico
da lista de conversas/prévia, ou é regressão desde então, ou é um caso novo que só aparece com
volume de mensagem muito acima do normal (o contato de teste tem 693+, a esmagadora maioria dos
contatos reais tem dezenas). Confirmar qual dos três antes de corrigir.

## Objetivo
Não é só "a prévia bater certo" — é entender e corrigir a causa estrutural de por que o Inbox
degrada com volume alto de mensagens num contato, cobrindo todos os pontos que dependem disso
(lista de conversas, prévia, histórico da conversa aberta), com medição real (tempo de query,
`EXPLAIN`, mesmo padrão de evidência da 108), pra não precisar de mais uma demanda pontual da
próxima vez que aparecer um sintoma novo do mesmo problema de fundo.

## Escopo
- Incluído: **medir primeiro, com dado real** — tempo de resposta de cada endpoint envolvido no
  carregamento do Inbox (lista de conversas, prévia/última mensagem, histórico de mensagens de
  uma conversa aberta) contra o contato do Ninho (alto volume) comparado com um contato normal
  (baixo volume) — mesmo padrão de medição da demanda 108, não presumir onde está lento.
- Incluído: investigar o endpoint/query que monta a lista de conversas (provavelmente
  `app/api/inbox/conversas/route.ts` ou equivalente) — como decide "última mensagem"/prévia de
  cada contato, se usa RPC agregada (como a 108 already fez pra outros pontos) ou uma query mais
  ingênua que não escala com volume.
- Incluído: revisar se as RPCs/índices da 108/136 realmente cobrem esse caminho específico, ou se
  ficou de fora na época — reportar com clareza qual é o caso.
- Incluído: corrigir a causa raiz estrutural (não só a prévia do Ninho) — se o padrão certo é uma
  RPC agregada nova, ou um índice faltando, ou paginação real na lista de conversas, aplicar isso
  de um jeito que sirva pra qualquer contato de alto volume futuro, não só o de teste de hoje.
- Incluído: `EXPLAIN`/medição depois da correção, comparando antes/depois, mesmo padrão de
  evidência da 108 (ganho medido, não estimado).
- Incluído: testar com o contato do Ninho (alto volume) e com pelo menos 1 contato normal (baixo
  volume), confirmando sem regressão nos dois.
- Explicitamente fora de escopo: mudar a lógica de mensagens dentro de uma conversa aberta em si
  (já corrigida na 280, essa parte específica não muda) — o foco aqui é a lista/prévia e qualquer
  gargalo estrutural que sobrar.

## Critérios de aceite
- [x] Medição real (antes) de cada endpoint envolvido, contato de alto volume vs. normal
- [x] Causa raiz estrutural identificada com evidência (`EXPLAIN` ou equivalente), não suposição
- [x] Corrigido de um jeito que escala pra qualquer contato de alto volume, não só o do Ninho
- [x] Medição real (depois), com ganho comparado, mesmo padrão da demanda 108
- [x] Prévia da lista bate com a última mensagem real, testado no contato do Ninho
- [x] Testado num contato de volume normal, sem regressão

## Riscos e cuidados
Tela usada o dia inteiro pela equipe — mesma disciplina de sempre, testar bem antes de considerar
concluído. Se a investigação achar que o escopo real é maior do que dá pra fechar numa demanda só,
reportar o que ficou de fora com clareza em vez de forçar caber tudo aqui.

## Referências
Print do Edvam (2026-08-16): lista lateral mostrando "Meu Deus 🙏 · 14/08" enquanto a conversa
aberta tem "BOM DIA" às 10:40 de hoje como última mensagem real. Demanda 280 (mesmo dia, mesmo
contato, bug de ordenação já corrigido no endpoint de mensagens da conversa aberta). Demandas 108
e 136 (rodadas anteriores de performance do Inbox, referência de método e ponto de partida pra
não repetir investigação do zero).

## Relato de execução

### 2 causas raiz distintas, não 1 — confirmadas com medição real antes de corrigir

**Causa 1 (lentidão): a RPC da demanda 108 não escala com contato de volume muito alto.**
`jsgrafica_ultima_msg_qualquer_direcao_em_lote` (criada na 108, usa `DISTINCT ON (phone)`) monta
o lote com telefone + `contact_lid` de até 100 contatos numa array só e ordena o resultado
COMBINADO inteiro numa sort só. Isso é barato quando nenhum contato do lote tem muitas mensagens
— mas o lote real de hoje inclui não só o Ninho (693) como outro número real com **8.452
mensagens**. Medido com `EXPLAIN (ANALYZE, BUFFERS)` no lote real de 100 contatos:
**1.576ms**, com sort externo em disco (`Sort Method: external merge Disk: 1760kB`,
14.911 linhas ordenadas antes do `DISTINCT ON` reduzir pra 199). Índice em `phone` sozinho já
existia (demanda 108/136); testei um índice composto novo `(phone, data_timestamp desc)`, mas o
planner não usou (mesmo custo) — removido, não ficou lixo no banco.

**Resposta à pergunta do contexto** (cobertura da 108/136): não é caso 1 (não ficou de fora) nem
caso 2 (não é regressão) — é o **caso 3**: a RPC sempre teve essa característica de escala, só
nunca foi exercitada por um contato realmente acima da faixa normal (mediana de 5 mensagens/
contato, p90 de 32) até o reuso do telefone de teste do Ninho este mês.

**Corrigido**: RPC reescrita com `LATERAL` — uma busca `ORDER BY ... LIMIT 1` por valor do lote,
em vez de ordenar tudo combinado. Usa o índice `phone` já existente (não precisou do índice
novo). Medido no mesmo lote real depois da troca: **80-153ms** via `EXPLAIN` direto (~10-20x),
**232-520ms** via chamada real da RPC (supabase-js, inclui overhead de rede/PostgREST) — antes
disso a mesma chamada real levava **2100ms+** no pior caso.

**Achado extra, corrigido junto (mesmo código, mesmo caminho)**: a RPC de última mensagem e a de
contagem (`jsgrafica_contagem_msgs_em_lote`, 47ms, já eficiente desde a 108) são independentes
mas rodavam em sequência (`await` esperando uma terminar pra chamar a outra) em
`app/api/inbox/conversas/route.ts`. Trocado pra `Promise.all`, cortando 1 ida-e-volta inteira de
rede do tempo total da rota.

**Causa 2 (prévia desatualizada, bug de dado, não só de performance): merge de resultado
duplicado escolhia a linha errada.** A RPC devolve 1 linha por VALOR buscado — e o lote busca
tanto o telefone quanto o `contact_lid` de cada contato (instabilidade de LID conhecida desde a
038/266). Quando o mesmo contato tem mensagens gravadas sob os dois formatos, a RPC devolve 2
candidatas a "última mensagem" pra ele. O código em `route.ts` ficava com a PRIMEIRA vista (por
causa da ordem alfabética do valor no resultado, não da recência) — `52063694233823@lid` vem
antes de `5521965185667` alfabeticamente, então a mensagem antiga gravada sob o `@lid` ("Meu Deus
🙀", 14/08) sempre vencia a mensagem nova gravada sob o telefone ("BOM DIA", hoje). Confirmado
chamando a RPC direto com os 2 valores do Ninho: retornava as 2 linhas, uma de cada. **Corrigido**
comparando timestamp e ficando com a mais recente das duas — vale pra qualquer contato com esse
padrão de LID instável, não só o Ninho.

### O que foi feito
- **SQL (Supabase, função)**: `jsgrafica_ultima_msg_qualquer_direcao_em_lote` reescrita com
  `LATERAL` (`CREATE OR REPLACE FUNCTION`, mesma assinatura, sem mudar o contrato com quem chama).
- **`app/api/inbox/conversas/route.ts`**: `mapaUltima` agora compara timestamp em vez de "primeiro
  visto"; as 2 chamadas RPC independentes (última mensagem + contagem) viraram `Promise.all`.

### Medição real — antes/depois (mesmo padrão da demanda 108)
| Onde | Antes | Depois |
|---|---|---|
| `EXPLAIN ANALYZE` da query da RPC (lote real, 100 contatos) | 1.576ms (sort externo em disco) | 80-153ms |
| Chamada real da RPC (supabase-js, com rede) | até 2.100ms+ | 232-520ms |
| Endpoint `/api/inbox/conversas` completo (build de produção local, aquecido) | ~1.000-1.560ms | ~740-1.050ms |
| Prévia do Ninho na lista | "Meu Deus 🙀" · 14/08 (errada) | "BOM DIA" · hoje 10:40 (confirmada correta por SQL direto) |

Nota de transparência: o tempo do endpoint completo é dominado por overhead de rede local→Supabase
Cloud (~250-400ms por chamada, presente antes E depois, não é algo que este fix piora nem resolve
totalmente) — por isso o ganho mais limpo e comparável ao método da 108 é o nível de query
(`EXPLAIN`), não o wall-clock do endpoint.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` limpos (2ª tentativa — 1ª falhou por erro transiente do
  Turbopack/IO, não relacionado ao código).
- Conferido com SQL direto que a prévia do Ninho bate com a mensagem realmente mais recente.
- Playwright (dev local): lista lateral mostra "Ninho · BOM DIA · 10:40", ordenada corretamente
  por recência entre os outros contatos.
- Contato de volume normal (Bernardo Wandesllan, 2 mensagens): prévia "Vocês fazem camisa · 15/08"
  intacta, sem regressão.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo — o índice composto testado e descartado (sem uso pelo planner) já está documentado
acima, não ficou pendência.

### Status final: concluída
