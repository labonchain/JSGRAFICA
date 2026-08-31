# 355 - Robô de disparo agendado do Canal do WhatsApp (a cada 30min)

Status: aprovada
Criada em: 2026-08-29
Aprovada em: 2026-08-29 (pedido direto do Edvam, via 07-Marketing, formalizado pelo PM)
Concluída em: (vazio até conclusão)
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
- [ ] Workflow criado, rodando a cada 30min.
- [ ] Post de teste agendado com `scheduled_at` no passado é publicado de verdade no canal,
      confirmado por checagem visual (não só resposta HTTP 200, mesmo cuidado da 352).
- [ ] Status/published_at/message_id atualizados corretamente após publicar.
- [ ] Falha de envio não trava o post silenciosamente, fica visível de alguma forma.

## Referências
`pm/demandas/354-implementar-canal-whatsapp-marketing-conteudo.md`,
`pm/demandas/352-criar-testar-canal-whatsapp-js-grafica.md`, workflow `13 - LEMBRETE PIX
PENDENTE` (referência de padrão), `pm/conhecimento/guia-canal-whatsapp-automacao.md`.

## Relato de execução
(preenchido pelo 01-N8N ao concluir)
