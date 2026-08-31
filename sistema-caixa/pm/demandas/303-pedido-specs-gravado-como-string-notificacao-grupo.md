# 303 - `06-PEDIDOS`: `specs` gravado como string dupla-codificada (achado, prioridade rebaixada após correção do contexto)

Status: concluída
Criada em: 2026-08-17
Aprovada em: 2026-08-17
Concluída em: 2026-08-18
Chat executor: 01 - N8N JS GRAFICA

## Contexto (corrigido pelo PM - a versão original desta demanda atribuiu a causa ao workflow errado)
Achado ao vivo (PM) investigando reclamação do Edvam sobre mensagens estranhas chegando no
WhatsApp dele e no grupo real da equipe ("atendimento ia") hoje. **Causa real, agora confirmada
lendo o JSON do workflow direto (não presumida)**: não é o `206`, é o workflow
`06 - JSGRAFICA | PEDIDOS` (`WDOixH8LKyh0DDGq`). Correção anterior desta demanda (minha, com base
só no conteúdo da mensagem) estava errada - registrando aqui pra não repetir o erro.

O que houve de verdade: uma equipe de outro projeto LabOnchain mexeu por engano no `06-PEDIDOS` e
no `JSGRAFICA_ATENDIMENTO_AI` (achando que era sistema deles), reativou 9 nodes de envio Z-API do
`06-PEDIDOS` que estavam **desativados de propósito desde 2026-07-10** (achado antigo, `06-PEDIDOS`
é dead-end intencional desde que o `206` virou o caminho real de pedido, demanda 274), e testou
com dado real (nome fake "Edvam Teste M058/M059"), gerando 7 pedidos de teste reais
(`ped-3129`-`ped-3135`, já cancelados pelo PM) e notificação real no grupo da equipe.

**A causa raiz do texto corrompido, confirmada no código**: node `INSERT jsgrafica_pedidos` grava
`specs: JSON.stringify($json.specs)` (deveria gravar o objeto direto, coluna já é `jsonb`); node
`MONTAR MSG GRUPO` depois lê esse valor com `Object.entries(specs)`, que sobre uma STRING itera
caractere por caractere - daí o `0: { | 1: " | 2: c...`. Bug pré-existente no `06-PEDIDOS`, dormente
há meses porque os nodes de envio (incluindo `ENVIAR MSG GRUPO`) estavam desativados - ninguém via
o resultado corrompido até hoje, quando foram reativados por engano.

**Confirmado, não presumido**: só existem 7 pedidos com `pedido_criado_por = 'dizu'` (valor
hardcoded neste workflow) em toda a tabela, todos de hoje, entre 20:24 e 20:47 UTC, batendo exato
com a janela do incidente - nenhum pedido de cliente real passou por este caminho, hoje ou antes.
Todos os pedidos reais de hoje (`ped-3107` a `ped-3143`) têm `pedido_criado_por` = nome de
atendente real (Gabi/Edvam/Zu) ou `'balcao'`, vindos do app, não deste workflow n8n.

**Recomendação do PM pro Edvam**: pedir pra essa outra equipe reverter só o `06-PEDIDOS` (volta a
ficar desativado, que é o estado correto/intencional pro nosso sistema hoje - `206` é quem atende
de verdade). O reparo deles no `JSGRAFICA_ATENDIMENTO_AI` (conexão órfã removida) parece inofensivo
e até positivo, sem precisar reverter esse. Confirmado que nenhuma demanda nossa de hoje tocou em
`06-PEDIDOS` nem `ATENDIMENTO_AI` - seguro reverter sem conflito com nosso trabalho.

## Objetivo (rebaixado de urgente pra normal, já que o `06-PEDIDOS` deve voltar a ficar desativado)
Se e quando o `06-PEDIDOS` for religado de propósito no futuro (não é o caso hoje), `specs` grava
como objeto de verdade, não string, e a notificação do grupo não quebra.

## Escopo
- Incluído: corrigir `INSERT jsgrafica_pedidos` (node do `06-PEDIDOS`) pra gravar `specs` como
  objeto, não `JSON.stringify`.
- Incluído: corrigir `MONTAR MSG GRUPO` pra tratar defensivamente um valor que venha como string
  (rede de segurança, mesmo com a causa raiz corrigida).
- Incluído: confirmar (não presumir) que o `206`, o caminho que atende de verdade hoje, **não tem
  o mesmo bug** no seu próprio fluxo de criação de pedido - checar rápido, é o caminho que importa
  de verdade pro cliente real.
- Incluído: confirmar com o Edvam que a outra equipe reverteu o `06-PEDIDOS` antes de considerar
  esta demanda de baixo risco.
- Explicitamente fora de escopo: qualquer mudança no `JSGRAFICA_ATENDIMENTO_AI` (não é problema
  nosso resolver o conserto que a outra equipe já fez lá).

## Critérios de aceite
- [ ] `06-PEDIDOS` confirmado revertido (desativado de novo) pela outra equipe, ou, se o Edvam
      decidir manter religado, `specs` corrigido pra gravar objeto de verdade
- [ ] Confirmado que o `206` não tem o mesmo padrão de bug no campo equivalente
- [ ] Se corrigido, testado com pedido sintético (nome real, nunca fake) confirmando notificação
      legível, sem deixar resíduo no grupo real

## Riscos e cuidados
Baixo risco agora que se sabe que `06-PEDIDOS` não atende cliente real. Cuidado real fica pro
Edvam/outra equipe: reverter sem perder o conserto legítimo que fizeram no `ATENDIMENTO_AI`.

## Referências
Incidente de 2026-08-17 (mensagem da outra equipe LabOnchain, relatando as mudanças). Demanda 274
(motivo do `06-PEDIDOS` estar desativado - `206` é o caminho real). Demanda 279 (achado antigo:
routing antigo por keyword no `01` ainda aponta pro `06-PEDIDOS`, risco latente pré-existente, não
novo, não é escopo desta demanda resolver agora).

## Relato de execução

- O que foi feito: backup de `06 - JSGRAFICA | PEDIDOS` (`WDOixH8LKyh0DDGq`, 42 nodes) e de
  `JSGRAFICA_ATENDIMENTO_AI` (31 nodes) antes de qualquer leitura, em `pm/backups/`. Confirmado
  direto no código que a causa é exatamente a descrita pelo PM: `INSERT jsgrafica_pedidos` gravava
  `specs` com `={{ JSON.stringify($json.specs) }}` (coluna já é `jsonb`, não precisa disso), e
  `MONTAR MSG GRUPO` montava a notificação com `Object.entries(specs)`, que sobre uma STRING itera
  caractere por caractere, exatamente o sintoma visto pelo Edvam. Corrigidos os 2 nodes: `specs`
  agora grava `={{ $json.specs }}` direto (objeto, sem stringify); `MONTAR MSG GRUPO` ganhou rede
  de segurança (se `specs` chegar como string por qualquer motivo futuro, faz `JSON.parse` com
  fallback pra `{}` antes de montar o texto). Diff confirmado: dos 42 nodes do workflow, só esses
  2 tiveram parâmetro alterado, conexões idênticas ao backup.
- Achado extra confirmado nesta demanda: a suspeita de "mesmo padrão em outro campo jsonb" foi
  auditada nos 2 workflows da cadeia real do incidente (`06-PEDIDOS` + `JSGRAFICA_ATENDIMENTO_AI`,
  não literalmente "o 206", corrigindo a atribuição original) - o único outro campo que usa
  `JSON.stringify` num node de gravação Supabase é `estado_consolidado`
  (`jsgrafica_memoria_conversas`), mas essa coluna é `text`, não `jsonb` (confirmado no schema),
  então ali o `JSON.stringify` está certo, não é bug. Nenhum outro campo jsonb com o mesmo padrão
  encontrado nos 2 workflows.
- Confirmado meu critério de aceite adicional: `206` (`M5WZ6zHAe625XyJm`, o caminho que atende
  cliente real hoje) não tem nenhum node que referencie `specs` ou monte pedido do tipo
  SCANNER/BANNER - confirmado por busca direta no JSON completo do workflow, zero ocorrências.
  `versionId` do `206` conferido idêntico ao de antes (`2dd0699f-...`), não tocado.
- **Atualização pós-relato inicial, mesmo dia**: o Edvam recebeu, DEPOIS deste relato, mais 4
  mensagens reais no grupo/WhatsApp dele que não eram dos meus testes (3x "COMPROVANTE RECEBIDO -
  ped-????" + 1 lembrete de Pix pra "BANNER OU LONA ATE 50X1,00"). Investigado na hora, causa
  confirmada por log real do n8n: `ped-3135` (um dos 7 pedidos do incidente original) tinha sido
  cancelado PELA METADE pelo PM - `cancelado_em`/`cancelado_por` preenchidos, mas `status` continuou
  `aguardando_pix`, ou seja, o pedido continuou vivo de verdade no sistema. **O script automatizado
  da outra equipe LabOnchain continuava rodando** (confirmado pelo `user-agent: axios/1.12.0` e IP
  interno do servidor nas chamadas ao webhook, não é tráfego real de WhatsApp) e mandou 3 chamadas
  simulando "cliente enviou comprovante" pra esse pedido ainda ativo, gerando as notificações reais;
  o lembrete horário de Pix (`13-LEMBRETE PIX PENDENTE`) pegou o mesmo pedido morto-mas-não-cancelado
  na sua rodada normal das 22h. Corrigido: `ped-3135` fechado de verdade (`status='cancelado'`);
  conferido que nenhum outro pedido em toda a tabela tem o mesmo padrão (`cancelado_em` preenchido
  com `status` diferente de `cancelado`) - só existiam 2 outros casos, ambos antigos (julho) e
  `status='entregue'`, que são reversão consciente antiga, não bug.
- **3º bug achado no mesmo incidente, corrigido**: a notificação "COMPROVANTE RECEBIDO" saía com
  `ped-????` em vez do número real porque `MONTAR NOTIF COMPROVANTE` lia `data._comprovante_pedido_id`
  (campo sintético que o node anterior grava), mas o node `UPDATE Comprovante Supabase` no meio do
  caminho devolve a LINHA REAL do banco como saída (que tem `id`, não esse campo sintético) - o
  campo simplesmente não existia mais quando a notificação era montada. Corrigido pra
  `data.id ?? data._comprovante_pedido_id ?? 'ped-????'`, cobrindo os dois formatos possíveis de
  entrada. Confirmado deployado com re-leitura imediata (mesmo cuidado do incidente do `PUT`
  anterior, ver abaixo).
- **Achado crítico**: um relato colado pelo Edvam, vindo de outro chat/equipe ("CHAT 00", tenant
  LabOnchain que causou o incidente original), afirmava ter revertido `06-PEDIDOS` por completo pro
  estado anterior a qualquer mudança (nodes de envio desativados de novo). **Conferido direto na
  API do n8n e o relato não batia com a realidade**: `versionId`/`versionCounter` do workflow
  continuavam exatamente os do meu último deploy, e os nodes de envio (`ENVIAR PERGUNTA Z-API`,
  `ENVIAR MSG GRUPO`, `ENVIAR NOTIF COMPROVANTE GRUPO`) continuavam com `disabled: false`. Reportado
  ao Edvam antes de agir - não presumi que estava resolvido só porque outro chat disse que estava.
- **Decisão do Edvam, confirmada**: desativar o `06-PEDIDOS` diretamente (reversível, fácil religar
  depois) em vez de esperar confirmação da outra equipe, já que o script deles provou estar ativo e
  fora do meu/nosso controle. Corrigido o 3º bug primeiro, testado com re-leitura imediata do
  workflow depois do `PUT` (confirmado presente antes de desativar), e então desativado via
  `POST /workflows/{id}/deactivate`. Confirmado com 2 verificações independentes: `GET` do workflow
  mostra `active: false`; chamada real ao webhook `jsgraficapedidos` devolve `404 "not registered"`
  - o script da outra equipe não consegue mais acionar nada neste workflow, qualquer que seja o
  estado real do revert deles.
- Testes realizados e resultado: 2 pedidos sintéticos reais via webhook de produção
  (`https://n8n.labonchain.xyz/webhook/jsgraficapedidos`), simulando a fase `aguardando_confirmacao`
  direto (sem repetir os 4 turnos de pergunta/resposta, que não fazem parte do bug), telefone/nome
  real (`5521965185667`/"Edvam", nunca nome fake, seguindo a disciplina da 283/291). SCANNER
  (`ped-3146`): `specs` gravado como objeto de verdade (`jsonb_typeof = "object"`), notificação
  saiu legível: "📋 cor: Colorida | paginas: 3 paginas | frente verso: So frente | quantidade
  copias: 1 copia". BANNER (`ped-3147`): mesmo resultado, `specs` objeto, notificação legível
  ("📋 altura: 0,9 metros | largura: 1,5 metros | material: lona | tem arte: sim"). **Achado do
  próprio processo de teste, registrado com honestidade**: a 1ª tentativa (`ped-3145`) rodou ANTES
  do fix realmente pegar no n8n (o primeiro `PUT` foi sobrescrito por um `versionCounter` mais novo
  segundos depois, causa não identificada com certeza - reaplicado e confirmado com re-leitura
  imediata na 2ª tentativa) e reproduziu o texto corrompido de verdade no grupo real de novo, com
  nome/telefone reais do Edvam (reconhecível como teste dele, não pedido de cliente). As 2
  mensagens de teste legíveis (SCANNER/BANNER) e a 1 corrompida também foram enviadas de verdade
  pro grupo "atendimento ia" e pro WhatsApp do próprio Edvam (`AVISAR CLIENTE PEDIDO CRIADO`),
  inevitável pra testar o envio real de ponta a ponta. Limpeza: `ped-3145`/`ped-3146`/`ped-3147`
  cancelados (`status='cancelado'`, `cancelado_por`/`motivo_cancelamento` preenchidos, não só
  deletados - mantém rastro de auditoria como pedido cancelado, igual à disciplina de outras
  demandas); as 3 linhas de teste criadas em `jsgrafica_memoria_conversas` (`fase_jornada:
  'aguardando_pix'`, `origem: '06-pedidos'`) apagadas por completo (não são pedido, não precisam
  de rastro). `jsgrafica_contatos` conferido intacto antes/depois (`Ninho`, sem alteração).
- Achados fora do escopo (relatados, não resolvidos por conta própria): nenhum novo além do que o
  PM já registrou no Contexto (recomendação de reverter `06-PEDIDOS` pra desativado, pendente de
  confirmação com a outra equipe LabOnchain - não é ação de código, não me cabe executar).
- Status final: concluída. `specs` corrigido e testado com 2 tipos reais (SCANNER/BANNER), rede de
  segurança na notificação do grupo no lugar, 3º bug relacionado (`ped-????` no comprovante)
  também corrigido, `ped-3135` fechado de verdade, confirmado que `206` (caminho real) não tem o
  mesmo bug, nenhum outro campo jsonb com o padrão nos 2 workflows da cadeia do incidente,
  `06-PEDIDOS` desativado por mim mesmo (decisão do Edvam) e confirmado inalcançável via webhook
  real - não depende mais de nenhum revert de terceiros.
