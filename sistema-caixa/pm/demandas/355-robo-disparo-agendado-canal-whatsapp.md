# 355 - Robô de disparo agendado do Canal do WhatsApp (a cada 30min)

Status: concluída
Criada em: 2026-08-29
Aprovada em: 2026-08-29 (pedido direto do Edvam, via 07-Marketing, formalizado pelo PM)
Concluída em: 2026-08-31
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A demanda 354 (07-Marketing) constrói as telas e rotas de API do Canal do WhatsApp em
Marketing → Conteúdo, incluindo "aprovar" um post (publica na hora). O que falta é o mecanismo
de **agendamento de verdade**: um post aprovado com `scheduled_at` no futuro não dispara sozinho
sem um robô rodando periodicamente, mesma lacuna que o Status já resolve hoje via o workflow
`LABON_STATUS` (roda de hora em hora, publica quem está `approved` na fila compartilhada
`labon_status_queue`).

**Diferença importante**: Canal não usa fila compartilhada do LabOnchain, vai ter tabela própria
só da JS Gráfica (`jsgrafica_canal_posts`, sendo proposta ao 02-DADOS como parte da 354). Isso é
mais parecido com o padrão já usado no workflow `13 - LEMBRETE PIX PENDENTE` (roda de hora em
hora, consulta tabela própria da JS Gráfica, age sobre o que encontra) do que com o padrão
compartilhado do Status.

## Objetivo
Post de Canal agendado (`status='approved'`, `scheduled_at` no passado) é publicado de verdade
sem intervenção manual, checado a cada 30 minutos.

## Escopo
Incluído:
- Novo workflow n8n (mesmo padrão do `13 - LEMBRETE PIX PENDENTE`: trigger de tempo, consulta
  Supabase, ação condicional, atualização de status).
- A cada 30min: consultar `jsgrafica_canal_posts` (ou nome final que o 02-DADOS definir na 354)
  filtrando `status='approved'` e `scheduled_at` já passado.
- Pra cada post encontrado: chamar a Z-API real (`send-text`/`send-image`/`send-video`, ID do
  canal como `phone`, mesmo padrão confirmado funcionando na demanda 352).
- Ao concluir: marcar `status='published'`, gravar `published_at` e o `message_id`/`zaapId` da
  resposta da Z-API (mesmo padrão de auditoria já usado no Status).
- Tratar falha de envio sem deixar o post preso silenciosamente (mesmo cuidado já visto em outras
  filas do projeto, ex. `jsgrafica_mercadopago_falhas_cobranca`): registrar erro de alguma forma
  visível, não só logar e esquecer.

Explicitamente fora de escopo:
- Criar a tabela/schema (isso é do 02-DADOS, parte da demanda 354, esta demanda **depende** dela
  existir antes de testar de ponta a ponta, mas o desenho do workflow pode começar antes).
- Telas do Admin (isso é a 354, 07-Marketing).

## Dependência
Precisa da tabela real (`jsgrafica_canal_posts` ou nome final) existir, criada pelo 02-DADOS como
parte da 354, antes do teste de ponta a ponta. Coordenar com 07-Marketing os nomes de coluna
exatos antes de finalizar a query.

## Critérios de aceite
- [x] Workflow criado, rodando a cada 30min (ativo, confirmado de forma independente).
- [x] Post de teste agendado com `scheduled_at` no passado publicado de verdade no canal -
      `message_id` real confirmado E checagem visual do Edvam confirmando que apareceu certo.
- [x] Status/published_at/message_id atualizados corretamente após publicar - confirmado com
      `SELECT` real no Supabase, não só log de execução.
- [~] Falha de envio não trava o post silenciosamente - mecanismo construído e funcional
      (`Marcar Erro`), mas só pega falha síncrona real da API, não "aceitou mas falhou depois"
      (mesma limitação de plataforma já vista na 352) - ver achado no relato.

## Referências
`pm/demandas/354-implementar-canal-whatsapp-marketing-conteudo.md`,
`pm/demandas/352-criar-testar-canal-whatsapp-js-grafica.md`, workflow `13 - LEMBRETE PIX
PENDENTE` (referência de padrão), `pm/conhecimento/guia-canal-whatsapp-automacao.md`.

## Relato de execução

**Workflow novo criado**: `355 - JSGRAFICA | CANAL DISPARO AGENDADO` (`N6MNCiQvNUicwvHR`), mesmo
padrão do `13 - LEMBRETE PIX PENDENTE` (trigger de tempo → GET config → GET registros elegíveis →
montar envio → chamar Z-API → atualizar status). 7 nodes: `A cada 30min` (schedule), `GET Config`
(`jsgrafica_agent_config`, `ativo=true`), `GET Posts Aprovados` (`jsgrafica_canal_posts`,
`status=approved` e `scheduled_at` no passado), `Montar Envio` (Code - monta URL/corpo certo por
`tipo`: `send-text`/`send-image`/`send-video`, endpoints reais confirmados na 352, não os nomes
errados que a pesquisa original tinha), `Enviar Z-API Canal` (HTTP, `onError:
continueErrorOutput`, 2 saídas), `Marcar Publicado` e `Marcar Erro` (Supabase update).

**Testado de ponta a ponta antes de ativar** (inserção de post de teste real via SQL, já que
ainda não existe ação "agendar" na UI do Admin - ver achado abaixo):
- Caminho de sucesso: post de texto real publicado no canal de verdade (`messageId` real
  `749DF6FEF0CCD5DA9731`), confirmado tanto no log de execução quanto com `SELECT` direto no
  Supabase (`status=published`, `published_at`/`message_id` gravados certo).
- Caminho de erro: testado com uma URL de imagem propositalmente inválida (domínio inexistente).
  **Achado importante, mesma categoria da 352**: mesmo com URL completamente inválida, a Z-API
  aceitou a chamada e devolveu sucesso (200 + ID real) - o branch de erro do workflow (`Marcar
  Erro`) está construído e funcional, mas só pega falha de API de verdade (credencial errada,
  rota malformada, rede fora), não pega "aceitou mas o WhatsApp não conseguiu processar o
  conteúdo depois" (mesma limitação já documentada na 352 pro documento/PDF). Isso significa que
  o critério de aceite "falha de envio não trava o post silenciosamente" é parcialmente
  alcançável - dentro do que a própria Z-API deixa detectar de forma síncrona.
- Testado via `execute_workflow` (precisou habilitar `availableInMCP:true` nas settings, mesmo
  padrão que o `13` já usa, não é exclusivo desta demanda).
- Ativado (`active:true`) e reconfirmado de forma independente depois.

**Achado de dependência, não bloqueia, mas precisa de acompanhamento**: hoje NADA no Admin (app
Next.js) cria post com `status='approved'` - a única ação existente é "aprovar" que já publica na
hora (`aprovarEPublicarPostCanal`, `lib/canalWhatsapp.ts`, `status !== 'pending'` é rejeitado).
Ou seja, este robô está pronto e funcional, mas fica "esperando" até o 07-Marketing implementar
uma ação real de "agendar pra depois" que grave `status='approved'` com `scheduled_at` no futuro.
Sem isso, o robô roda a cada 30min sem nunca encontrar nada pra fazer - não é bug, é a peça que
falta do outro lado. Reportado ao PM pra decidir se vira demanda nova pro 07-Marketing.

**Dados de teste**: 2 posts de teste ficaram na tabela real (`id=5` sucesso, `id=6` erro
propositado), mesmo padrão já usado pelos testes da 354 (não apagados, ficam como registro
histórico, ambos claramente marcados `created_by` com "teste" no nome).

**Status final: concluída.** Workflow criado, testado nos 2 caminhos com dado real, ativado e
confirmado.

**Fechamento final (31/08/2026)**: as 2 pendências abertas no relato original foram resolvidas
por fora desta janela - (1) o Edvam confirmou visualmente que o post de teste (`id=5`) apareceu
certo no canal; (2) a demanda 362 (07-Marketing, concluída) criou a ação real de "agendar" no
Admin, que agora alimenta `jsgrafica_canal_posts` com `status='approved'` de verdade, dando
trabalho real pro robô. Sem pendência restante.
