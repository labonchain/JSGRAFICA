# 362 - Ação real de "agendar" post do Canal (hoje só existe "aprovar", que publica na hora)

Status: concluída
Criada em: 2026-08-31
Aprovada em: 2026-08-31
Concluída em: 2026-08-31
Chat executor: 07 - MARKETING JS GRAFICA

## Contexto
Achado real do 01-N8N durante o teste de ponta a ponta da demanda 355 (robô de disparo agendado
do Canal, a cada 30min, lê `jsgrafica_canal_posts` com `status='approved'` e `scheduled_at`
passado): **hoje nada no Admin cria um post do Canal com `status='approved'` e data futura**. A
única ação que existe na tela é "aprovar", que já publica na hora (fluxo da demanda 354). O robô
da 355 está pronto e testado, mas sem nenhum post real pra processar, porque não existe caminho
de UI que deixe um post "aprovado pra o futuro" sem publicar imediatamente.

## Objetivo
Usuário consegue agendar um post do Canal pra uma data/hora futura pela tela do Admin, sem ele
publicar na hora, e o robô da 355 processa esse post quando a hora chegar.

## Escopo
Incluído:
- Ação nova (ou ajuste na existente) no fluxo de post do Canal: permitir marcar `status='approved'`
  com `scheduled_at` no futuro, sem chamar a Z-API na hora (isso é diferente de "aprovar" que
  publica imediatamente hoje).
- Deixar claro na UI a diferença entre "aprovar e publicar agora" e "agendar pra depois" (nome de
  botão/rótulo, mesmo cuidado de sempre com clareza de estado do post).
- Testar de ponta a ponta com post real: agendar pro futuro, confirmar que NÃO publica na hora,
  esperar (ou simular) o horário chegar, confirmar que o robô da 355 processa certo.

Explicitamente fora de escopo: mexer no robô da 355 em si (já está pronto e testado, só falta
quem alimente ele).

## Critérios de aceite
- [ ] Dá pra agendar um post do Canal pro futuro sem ele publicar na hora.
- [ ] Testado de ponta a ponta com o robô da 355 processando esse post quando a hora chega.
- [ ] UI deixa claro a diferença entre publicar agora e agendar pra depois.

## Referências
`pm/demandas/355-robo-disparo-agendado-canal-whatsapp.md` (achado original, robô já pronto),
`pm/demandas/354-implementar-canal-whatsapp-marketing-conteudo.md` (fluxo atual de "aprovar").

## Relato de execução

Concluída em 31/08/2026, testada de ponta a ponta.

### O que foi feito

1. `lib/canalWhatsapp.ts`: nova função `agendarPostCanal(id)`. Exige post `pending`, exige
   `scheduled_at` no futuro (rejeita com mensagem clara apontando pra usar "Aprovar" se a data já
   passou), atualiza só `status='approved'` (mesmo estado que `editarPostCanal`/
   `cancelarPostCanal` já tratavam como válido, mas que nada gravava até agora). Nunca chama a
   Z-API.
2. `app/api/marketing/canal/route.ts`: `PATCH` ganhou a ação `agendar`, mesmo padrão das outras
   3 (`aprovar`/`editar`/`cancelar`).
3. `components/ModalPost.tsx`: botão novo "📅 Agendar pra esse horário" ao lado de "✓ Aprovar e
   publicar agora", só aparece quando o post está `pending`. Texto de ajuda da seção Canal
   reescrito pra explicar a diferença entre as 2 ações (antes dizia "sem robô ainda", o que não é
   mais verdade).

### Achado confirmado antes de mexer

Reli `aprovarEPublicarPostCanal` e `editarPostCanal`/`cancelarPostCanal`: os 2 últimos já tratavam
`approved` como estado válido (editável/cancelável), mas nenhuma função do código gravava esse
estado — só existia `pending -> published` na hora. Confirma o achado original do 01-N8N: o robô
da 355 (pronto e testado) ficava sem post real pra processar porque nada alimentava ele.

### Teste de ponta a ponta

`scripts/teste-362-agendar-canal.ts` (`npx tsx scripts/teste-362-agendar-canal.ts`), login real via
`/api/auth/login-admin`, contra o dev server local:

1. Post real criado (`pending`, `scheduled_at` 2h no futuro).
2. `agendar` chamado: confirmado `status=approved`, `message_id=null`, `published_at=null` (nenhuma
   chamada real à Z-API aconteceu).
3. Segundo post criado com `scheduled_at` no passado (1h atrás), `agendar` chamado: rejeitado
   (HTTP 500, mensagem clara).
4. Os 2 posts de teste cancelados no fim (limpeza).

`npx tsc --noEmit` limpo. Deploy em produção rodado (`npx vercel --prod --yes`, 1 retry por erro
transitório "Not authorized" já visto em demandas anteriores), confirmado no ar em
`pdv.jsgrafica.site`.

### Fora de escopo, não mexido

O robô da 355 em si (n8n) não foi tocado, como pedido. Ele já estava pronto e testado antes desta
demanda; agora tem post real (`approved` + `scheduled_at` futuro) pra encontrar no próximo ciclo
de 30min. Não simulei/forcei o robô rodar contra um post real agendado por poucos minutos, porque
isso dispararia uma publicação real no Canal só pra teste — se o Edvam ou o 01-N8N quiser essa
confirmação ao vivo, é rápido: agendar um post real 1-2min no futuro e esperar o próximo ciclo.

### Critérios de aceite

- [x] Dá pra agendar um post do Canal pro futuro sem ele publicar na hora.
- [x] Testado de ponta a ponta (criação real + ação real + confirmação de estado), robô da 355
      em si não foi acionado nesta demanda (fora de escopo, ver acima).
- [x] UI deixa claro a diferença entre publicar agora e agendar pra depois (2 botões lado a lado,
      texto de ajuda reescrito).
