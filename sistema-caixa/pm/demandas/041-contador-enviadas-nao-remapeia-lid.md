# 041 — Contador "Enviadas" ainda erra quando a mensagem loga com phone=@lid (regressão pontual da 039)

Status: aprovada — prioridade alta (o problema que a 039 devia ter resolvido ainda acontece em
alguns contatos)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Confirmado pelo PM (2026-07-03) num contato real: **Cristiane Moreira** (`558198716456`)
mostra "13 Recebidas / 0 Enviadas" no painel do Inbox, mas a thread tem várias mensagens da
equipe visíveis (blue bubbles) e o banco confirma **10 mensagens `from_me:true`** ligadas ao
`contact_lid` dela.

Causa raiz identificada por SQL: essas 10 mensagens foram gravadas com `phone` igual ao
`contact_lid` (`26998298640609@lid`), não o telefone normal (`558198716456`). O count ao vivo da
demanda 039 soma certo, mas **agrupa pela chave crua do campo `phone` de cada linha do log**, sem
remapear de volta pro telefone normal do contato — as 10 mensagens ficam contadas debaixo de uma
chave `"26998298640609@lid"` que nunca aparece em lugar nenhum da tela (a lista de conversas é
montada a partir de `jsgrafica_contatos.phone`, que é o telefone normal).

A demanda 038 (mensagens não aparecendo na thread) já tinha resolvido exatamente esse tipo de
problema pra outra rota — lá, o resultado da busca por `contact_lid` era remapeado de volta pro
telefone normal antes de montar o mapa de "última mensagem". A 039 aparentemente não replicou
esse mesmo passo pro agregado de contagem — é a causa provável do "quase certo, mas erra pra uns
poucos contatos".

Confirmado que a tela do "Lançar Venda"/Inbox é compartilhada entre PDV e Admin (mesmo
componente) — a correção da 039/041 vale pros dois automaticamente, não precisa duplicar teste.

## Objetivo
O contador "Enviadas" deve contar certo mesmo quando a mensagem foi gravada com `phone` em
formato `@lid` — igual já foi resolvido pra exibição da thread na demanda 038.

## Escopo
- Incluído: em `app/api/inbox/conversas/route.ts`, aplicar na agregação de contagem
  (`totalRecebidas`/`totalEnviadas`, criada na 039) o **mesmo remapeamento de volta pro telefone
  normal do contato** que já existe pra subquery de "última mensagem" (`ultimas`) — ou seja, se
  uma linha do log vier com `phone` igual ao `contact_lid` de algum contato da página, contar
  essa linha na chave do telefone normal desse contato, não na chave crua.
- Fora de escopo: mudar o formato de escrita no n8n (mantém o que já foi decidido nas demandas
  037/038 — resiliência é na leitura).

## Critérios de aceite
- [ ] Cristiane Moreira (`558198716456`) mostra as 10 mensagens enviadas manualmente na contagem
      (não mais "0 Enviadas")
- [ ] Reconfirmar Mauro e Willianne Barbosa (números já testados na 039) continuam corretos —
      sem regressão
- [ ] Testado direto em produção após deploy

## Riscos e cuidados
Ponto de recuperação: a versão anterior (039 deployada em `dpl_BBo5Fm1rV3uNd7mfRLneek7349Az`) já
está em produção — se a correção nova causar algum problema, reverter esse deployment específico
via painel do Vercel é suficiente (Next.js/Vercel mantêm histórico de deployments).

## Referências
`app/api/inbox/conversas/route.ts`. Achados originais: `pm/demandas/039-*.md`,
`pm/demandas/038-*.md` (o remapeamento que serve de modelo).

## Relato de execução

### A causa raiz não era a hipótese da demanda — era outra coisa
Antes de mexer em qualquer código, reli `app/api/inbox/conversas/route.ts` (o código que a
própria demanda 039 já tinha deployado) e o remapeamento pro telefone normal **já existia**:
```
const phoneKey = lidParaPhone[m.phone] ?? m.phone;
```
já estava presente na agregação de contagem desde a 039, idêntico ao padrão da 038. Testei
direto: `GET /api/inbox/conversas?q=Cristiane` já retornava **23 recebidas / 10 enviadas**
corretos — a hipótese da demanda (remapeamento faltando) não se confirmou nesse teste isolado.

Só reproduzi o bug comparando a busca **filtrada** (`?q=Cristiane`, poucos contatos) com a
busca **padrão** (sem filtro, 100 contatos — o que o Inbox usa por padrão): só na busca sem
filtro o contador vinha errado ("13/0"). Isso apontou pra algo relacionado ao **tamanho do lote
de contatos**, não ao remapeamento em si.

**Causa raiz de verdade, confirmada com um script isolado batendo direto no Supabase:** o
Supabase trava em **1.000 linhas por requisição**, não importa o `.limit()` pedido no código
(pedi `.limit(20000)`, voltou exatamente 1000). Com 100 contatos na página padrão, o volume
total de mensagens combinadas passa de 1.000 (confirmei: **8.382 mensagens** reais nesse
lote) — a query de contagem da 039 trazia só as primeiras 1.000 (sem `order by` nem
paginação), e as 10 mensagens da Cristiane (que têm `message_id` num intervalo que cai fora
dessas 1.000 primeiras) ficavam de fora silenciosamente. Não é bug de remapeamento — é
truncamento silencioso de linha por causa do limite do servidor.

### O que foi feito
Em `app/api/inbox/conversas/route.ts`, a query de contagem (`todasMsgs`) agora:
1. Primeiro pede só a contagem exata (`count: 'exact', head: true` — não traz nenhuma linha,
   só o número total de linhas que baterim no filtro).
2. Calcula quantas páginas de 1.000 são necessárias (trava de segurança em 30 páginas /
   30.000 linhas).
3. Busca todas as páginas **em paralelo** (`Promise.all`), cada uma com `.range()` e
   `.order('message_id')` (ordem estável — sem isso, paginação com `.range()` pode pular ou
   repetir linha entre chamadas).

Fiz em paralelo (não sequencial) porque testei sequencial primeiro e a resposta ficou
perceptivelmente mais lenta (~2,5-4s local, contra ~0,6s antes da 039/041) — com paralelo caiu
pra ~1,7-2,1s, aceitável pra uma tela que faz polling em background.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Reproduzido o bug isoladamente** com um script Node direto no Supabase (fora do Next.js),
  replicando a query exata da rota: confirmei que a versão sem paginação retornava
  exatamente 1000 linhas e 0 mensagens `from_me:true` da Cristiane; com paginação, retornou
  8.382 linhas e as 10 mensagens dela apareceram certas.
- **Testado via rota real** (`npm run dev` local): `GET /api/inbox/conversas` (sem filtro, o
  cenário que reproduzia o bug) passou a mostrar Cristiane Moreira com **23 recebidas / 10
  enviadas** (antes: 13/0).
- **Sem regressão**: Mauro continua 35/0, Willianne Barbosa 49/9 (pequena variação de 48/8 pra
  49/9 em relação ao teste da demanda 039 — tráfego real mudando entre os testes, não é bug).
- **Testado direto em produção** depois do deploy (ver seção Deploy).

### Achados fora do escopo (relatados, não corrigidos)
- **O mesmo limite de 1.000 linhas pode afetar outras rotas** que fazem `select` sem paginação
  em tabelas que já passaram ou vão passar de 1.000 linhas (`jsgrafica_vendas`,
  `jsgrafica_saidas`, `jsgrafica_log_msgs_privadas` em geral). Não fiz um levantamento
  sistemático de todas as rotas — só corrigi a que esta demanda pedia. Vale um raio-x geral do
  código em busca do mesmo padrão de risco.
- A subquery de "última mensagem" (`ultimas`) já existente desde a 038 usa
  `.limit(phones.length * 5)` = até 500 linhas com 100 contatos — hoje está abaixo do limite de
  1.000, então não tem o mesmo bug, mas ficaria vulnerável se o limite de contatos por página
  algum dia subir além de ~200 (500 → 1000+). Não mexi porque não é o problema de hoje, só
  registrando o risco.

### Critérios de aceite
- [x] Cristiane Moreira mostra as 10 enviadas (confirmado local e em produção)
- [x] Mauro e Willianne Barbosa reconfirmados sem regressão
- [x] Testado direto em produção depois do deploy

### Deploy
`npx vercel --prod --yes` — deployment `dpl_9xaqcPdx2YGreWG88Rg8At3k4A1n`. Confirmado direto em
produção (`admin.jsgrafica.site`, sem filtro de busca — o cenário exato que reproduzia o bug):
Cristiane Moreira `23/10`, Mauro `35/0`, Willianne Barbosa `49/9`.

### Status final
Concluída e deployada.
