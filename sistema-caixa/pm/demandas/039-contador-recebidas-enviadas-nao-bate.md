# 039 — Contador "Recebidas/Enviadas" do Inbox não bate com o volume real de mensagens

Status: aprovada — prioridade média (não afeta o dado real, só o número mostrado na tela)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Dois achados da mesma sessão (PM, 2026-07-03) confirmam que os campos
`jsgrafica_contatos.total_mensagens_recebidas`/`total_mensagens_enviadas` — mostrados no painel
direito do Inbox como "Recebidas/Enviadas" — **não refletem o volume real** de mensagens em
`jsgrafica_log_msgs_privadas`:

1. Contato "Mauro" (558186393800): painel mostrava "7 Recebidas / 0 Enviadas", mas o banco tem
   pelo menos 35 mensagens reais (a maioria de janeiro, antes de os contadores existirem/serem
   incrementados de forma confiável).
2. Depois da demanda 037 (log de mensagens enviadas manualmente), confirmado que esse caminho
   novo **não incrementa** `total_mensagens_enviadas` (decisão deliberada de escopo da 037, pra
   não mexer no merge de contato) — então toda mensagem que a equipe manda pelo WhatsApp Web/
   celular contribui pro log mas nunca pro contador.

Os contadores são campos incrementais, calculados só em certos caminhos do pipeline n8n — não são
um "count" ao vivo da tabela de log. Isso os torna estruturalmente frágeis: qualquer novo caminho
de envio/recebimento que não incremente esses campos (como aconteceu na 037) os deixa desatualizados
silenciosamente, e mensagens antigas (de antes do campo existir) nunca são contabilizadas
retroativamente.

## Objetivo
O número mostrado no painel do Inbox deve sempre bater com o volume real de mensagens no banco,
sem depender de cada caminho do pipeline lembrar de incrementar um contador.

## Escopo
- Incluído: trocar a fonte do "Recebidas"/"Enviadas" mostrado no Inbox de
  `jsgrafica_contatos.total_mensagens_recebidas`/`total_mensagens_enviadas` (campo incremental)
  pra um **count ao vivo** direto em `jsgrafica_log_msgs_privadas`, agrupado por `from_me`,
  casando por `phone` OU `contact_lid` (mesmo padrão de resiliência a formato `@lid` da demanda
  038). Seguir o mesmo padrão da subquery de "última mensagem" já existente em
  `conversas/route.ts` (calcular só pros contatos da página atual, não a tabela inteira).
- Explicitamente fora de escopo:
  - Não precisa apagar/parar de gravar os campos incrementais em `jsgrafica_contatos` (podem
    continuar existindo, só não são mais a fonte de verdade pro que aparece na tela). Se o
    03-APP achar que faz sentido remover esses campos depois, registrar como achado, não fazer
    aqui.
  - Não mexer no n8n pra fazer ele incrementar certo (seria mais uma correção pontual que sofre
    do mesmo problema estrutural no futuro) — a ideia é a tela nunca mais depender disso.

## Critérios de aceite
- [ ] Painel do Inbox mostra contagem real de mensagens pro contato "Mauro" (bate com o total em
      `jsgrafica_log_msgs_privadas`, não mais "7/0")
- [ ] Painel reflete corretamente mensagens enviadas manualmente (contatos afetados pela demanda
      037/038 — ex. Willianne Barbosa, Jadilson Francisco — mostram "Enviadas" > 0)
- [ ] Performance aceitável (sem lentidão perceptível ao carregar a lista de conversas)

## Riscos e cuidados
- Cuidado pra não trazer regressão de performance — usar o mesmo padrão de escopo por página
  (só os telefones/contact_lid visíveis) que já existe pra "última mensagem", não um count
  global sem filtro.

## Referências
`app/api/inbox/conversas/route.ts`, tabela `jsgrafica_contatos`, tabela
`jsgrafica_log_msgs_privadas`. Achados originais: `pm/demandas/037-*.md` (achados fora de
escopo) e a investigação do contato "Mauro" na mesma sessão.

## Relato de execução

### O que foi feito
Em `app/api/inbox/conversas/route.ts`:
- Adicionada uma segunda query em `jsgrafica_log_msgs_privadas` (só `phone, from_me`, sem
  filtro de conteúdo), usando o **mesmo filtro `.or()` phone-ou-contact_lid** já construído
  pra subquery de "última mensagem" (reaproveita `orPartes`/`lidParaPhone`, escopado só aos
  contatos da página atual — nada de count global). Limite de 20.000 linhas (2 colunas
  estreitas, folga generosa pra até 100 contatos).
- Resultado agregado em memória por telefone, contando `from_me: true` como enviada e
  qualquer outra coisa (incluindo `from_me: null`) como recebida — ver nota abaixo sobre por
  que isso é o comportamento certo, não um descuido.
- `totalRecebidas`/`totalEnviadas` na resposta agora vêm desse count ao vivo, não mais de
  `c.total_mensagens_recebidas`/`total_mensagens_enviadas`.
- Como esses dois campos pararam de ser usados na resposta, removi eles do `.select()` de
  `jsgrafica_contatos` e da soma de duplicados na deduplicação por telefone (demanda 029) —
  ficariam mortos no código. **Os campos continuam existindo e sendo gravados no banco**
  (conforme pedido no escopo) — só não são mais lidos por esta rota.

### Achado durante o teste: `from_me: null` não é bug, é sinal válido
Ao validar contra o banco, descobri que boa parte das mensagens do contato "Mauro" tem
`from_me: null` (nem `true` nem `false`) — não é ausência de dado, é uma lacuna de qualidade
de um trecho mais antigo do pipeline. Confirmei que **todas** essas linhas têm
`status: 'RECEIVED'` e texto real de cliente ("Imprimir", "Bom dia", "Manda o valor" etc.) —
ou seja, são mensagens recebidas de verdade, só sem o `from_me` explícito. O código já trata
`from_me` "não verdadeiro" (false ou null) como recebida, então essas linhas já entram
corretamente na contagem de recebidas sem tratamento especial — bati o número final (35) com o
que a própria demanda já esperava pro Mauro ("pelo menos 35 mensagens reais").

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Testado com os dois contatos citados na demanda**, via `npm run dev` local + `curl`:
  - Mauro (`558186393800`): API retornou **35 recebidas / 0 enviadas** — bate com "pelo menos
    35" citado na demanda (antes mostrava "7/0").
  - Willianne Barbosa (`558198332888`, afetada pela 037/038): API retornou **48 recebidas / 8
    enviadas** — confirma que as mensagens manuais (formato `@lid`) agora contam como
    enviadas (antes mostrava "24/0", enviadas sempre zerada).
- **Performance**: 3 requisições seguidas em `localhost` (dev, mais lento que produção) ficaram
  em ~0,6-0,65s cada depois do aquecimento inicial — sem lentidão perceptível pra uma tela que
  faz polling a cada 5s.

### Achados fora do escopo (relatados, não corrigidos)
- Durante o teste, apareceu um contato com o próprio `phone` já em formato `@lid`
  (`164811484713108@lid`, "Mauro (Ferrugem) José Santos") — um contato "cru" cujo campo
  `phone` nunca foi resolvido pro formato normal (diferente do problema desta demanda, que é
  sobre mensagens chegando em formato diferente do que o contato já tem). Mesma família de
  achado já registrado nas demandas 026/029 sobre contatos malformados — não investiguei a
  fundo, não corrigido aqui.

### Critérios de aceite
- [x] Painel mostra contagem real pro contato "Mauro" (35, não mais "7/0")
- [x] Painel reflete mensagens enviadas manualmente (Willianne Barbosa: 8 enviadas, não mais 0)
- [x] Performance aceitável — sem lentidão perceptível

### Deploy
`npx vercel --prod --yes` — deployment `dpl_BBo5Fm1rV3uNd7mfRLneek7349Az` (junto com a demanda
040, a pedido do Edvam depois de aprovar o visual da 040). **Reteste direto em produção**
(`admin.jsgrafica.site`, não local) depois do deploy:
- Mauro (`558186393800`): **35 recebidas / 0 enviadas** — igual ao teste local.
- Willianne Barbosa (`558198332888`): **48 recebidas / 8 enviadas** — igual ao teste local.

### Status final
Concluída e deployada.
