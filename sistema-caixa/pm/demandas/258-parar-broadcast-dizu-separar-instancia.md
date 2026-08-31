# 258 — Parar o broadcast diário da Dizu no número da JS Gráfica e separar a instância

Status: cancelada — premissa errada, ver nota do Edvam abaixo
Criada em: 2026-07-30
Aprovada em: 2026-07-30 (aprovação original, baseada em premissa técnica errada)
Concluída em: 2026-07-30 (cancelada, não despachada)
Chat executor: — (não despachada)

## ⚠️ Cancelada pelo Edvam antes de despachar (2026-07-30)
O PM presumiu, sem confirmar antes, que o broadcast diário era automação técnica (workflow n8n ou
disparo via API Z-API) — **errado**. Correção direta do Edvam: **é o Admin mandando manualmente,
por Lista de Transmissão nativa do WhatsApp**, pra divulgar a Dizu Refeições porque ela ainda não
tem número próprio. Não é bug, não é disparo em massa pela API, não tem nada pra investigar no
n8n — é decisão consciente e temporária, já em andamento de resolução (falta só providenciar chip
novo pra Dizu). Não despachar esta demanda como estava escrita — ficaria procurando um mecanismo
técnico que não existe. Mantida no histórico só como registro do erro, não como tarefa ativa.

## Contexto
Achado urgente da demanda 257: o número de WhatsApp da JS Gráfica está disparando, todo dia
desde 2026-07-06 (confirmado ativo hoje mesmo, 2026-07-30, 08:22-08:38), um broadcast automático
de cardápio de quentinha pra 160 destinatários distintos — só 7-11 desses são clientes reais da
gráfica, o resto é a lista de clientes da Dizu Refeições. O número original da Dizu já foi banido
pelo WhatsApp, provavelmente por esse mesmo padrão de comportamento (broadcast diário de
marketing pra lista grande). Repetir isso no número da JS Gráfica arrisca o mesmo banimento —
derrubando Inbox, PDV e atendimento real da gráfica inteira, não só o negócio de marmita.

**Isto é uma emergência operacional, não uma demanda de rotina** — o risco está ativo agora.

## Objetivo
1. **Imediato**: identificar o mecanismo exato que dispara esse broadcast e pará-lo o quanto
   antes — nenhum novo disparo a partir do número da JS Gráfica.
2. **Definitivo**: a Dizu Refeições passa a operar com sua própria instância/número de WhatsApp,
   separado de vez do canal da JS Gráfica.

## ⚠️ Checkpoint obrigatório — primeiro passo, antes de qualquer parada
Confirmar EXATAMENTE o que dispara o broadcast antes de mexer em qualquer coisa — não presumir.
Candidatos a checar: workflow n8n agendado (buscar em toda a conta, não só os já catalogados da
JS Gráfica — pode ser um workflow "Dizu" separado usando a mesma instância/credencial Z-API),
disparo manual via alguém enviando por fora do n8n, ou automação externa ao n8n. Reportar ao PM o
mecanismo exato encontrado, com evidência (execução real, log, ou confirmação de quem envia),
antes de desativar/pausar qualquer coisa.

## Escopo
- Incluído: identificar o mecanismo real do broadcast (checkpoint acima).
- Incluído: parar o broadcast de sair do número da JS Gráfica o quanto antes — se for workflow
  n8n, desativar (com backup, mesma disciplina de sempre); se for processo manual, reportar ao PM
  pra alinhar com quem envia hoje, já que isso não se resolve só tecnicamente.
- Incluído: confirmar, depois de parar, que nenhum novo disparo saiu (checar no dia seguinte ou
  via log real, não só assumir que parou).
- Incluído: levantar o que seria necessário pra Dizu Refeições ter sua própria instância/número
  de WhatsApp de verdade (nova instância Z-API, novo número, ou reaproveitar alguma infra já
  disponível no grupo LabOnchain) — **investigação e proposta, não necessariamente implementação
  completa nesta mesma demanda**, dado que isso pode envolver decisão fora do escopo técnico puro
  (custo de novo número/instância, quem administra o WhatsApp da Dizu).
- Explicitamente fora de escopo: qualquer limpeza retroativa do log de mensagens já contaminado
  (isso é assunto separado, já sinalizado na 257 como "filtro complementar", não urgente).
- Explicitamente fora de escopo: corrigir o R$400 do `ped-1029` no fechamento de 15/07 — isso é
  correção financeira, domínio do 05-FINANCEIRO, demanda própria se o Edvam confirmar que quer
  corrigir retroativamente.

## Critérios de aceite
- [ ] Mecanismo exato do broadcast confirmado com evidência real, reportado antes de agir
- [ ] Broadcast parado — confirmado que não dispara mais a partir do número da JS Gráfica
- [ ] Confirmação pós-parada de que nenhum novo disparo saiu
- [ ] Proposta levantada pra Dizu ter instância/número próprio (mesmo que a implementação final
      dependa de decisão de negócio fora desta demanda)

## Riscos e cuidados
Urgência real, mas sem atropelar — confirmar o mecanismo antes de desativar qualquer coisa, pra
não quebrar algo que também sirva a um propósito legítimo sem querer. Se o disparo for manual
(alguém da equipe mandando), não é um "bug" pra corrigir sozinho — é uma conversa que precisa
acontecer com essa pessoa, reportar ao PM pra isso ser alinhado direito.

## Referências
Demanda 257 (`pm/conhecimento/investigacao-contaminacao-dizu-refeicoes.md`, achado e evidência
completa). Demanda 256 (achado original da migração de 09/07).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
- Testes realizados e resultado:
- Achados fora do escopo (relatados, não resolvidos por conta própria):
- Status final: concluída / bloqueada (motivo) / parcial (o que falta)
