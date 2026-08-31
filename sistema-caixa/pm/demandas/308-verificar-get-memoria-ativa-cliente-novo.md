# 308 - Verificar se GET Memoria Ativa (raw) engole a 1ª mensagem de cliente genuinamente novo

Status: concluída
Criada em: 2026-08-18
Aprovada em: 2026-08-18
Concluída em: 2026-08-19
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Suspeita fundamentada, não confirmada, relatada pela demanda 307: durante os testes dela, o mesmo
bug de plataforma apareceu 2 vezes num único dia (nodes sem `alwaysOutputData` fazendo tudo
downstream parar de rodar quando a consulta devolve 0 linhas - já visto nas demandas 296, 305, 306
e 2x na 307). O node `GET Memoria Ativa (raw)`, que `CHECK SESSAO PEDIDO` usa pra saber se há
sessão de pedido ativa, também não tem `alwaysOutputData` configurado. Se um telefone
GENUINAMENTE NOVO (zero linha em `jsgrafica_memoria_conversas`) sofrer do mesmo comportamento, a
própria PRIMEIRA mensagem desse cliente poderia nunca chegar em `CHECK SESSAO PEDIDO` - o tipo de
falha mais grave possível (primeiro contato de cliente novo é exatamente o momento que mais
importa não falhar, e exatamente o cenário que fica mais provável de acontecer se a whitelist for
expandida pra cliente real de verdade em breve).

## Objetivo
Confirmar (ou descartar) com teste real se cliente genuinamente novo tem a 1ª mensagem perdida por
esse mecanismo, e corrigir se confirmado.

## Escopo
- Incluído: testar com um telefone genuinamente novo (zero linha prévia em
  `jsgrafica_memoria_conversas`, zero linha em `jsgrafica_log_msgs_privadas`) - não simular
  parcialmente, criar a condição real de "nunca conversou antes".
- Incluído: se confirmado, aplicar a mesma correção já usada 4 vezes nesta sessão
  (`alwaysOutputData: true` no node), testar de novo confirmando que a mensagem chega em `CHECK
  SESSAO PEDIDO` e segue o fluxo normal.
- Incluído: se descartado (node já se comporta diferente por algum motivo, ex. tipo de consulta
  diferente dos outros casos), documentar o motivo real, não só "não reproduzi".
- Incluído: já que está mexendo nessa área, uma varredura rápida nos outros nodes do `01` que fazem
  consulta Supabase/PostgREST sem `alwaysOutputData`, pra não descobrir um 6º caso da mesma
  categoria um dia desses por acidente de novo.
- Explicitamente fora de escopo: qualquer mudança de lógica de negócio, só a garantia técnica de
  que a mensagem chega no node seguinte independente do resultado da consulta.

## Critérios de aceite
- [x] Testado com telefone genuinamente novo, confirmando ou descartando a suspeita com evidência
      real (log de execução), não presumido
- [x] Se confirmado: corrigido e retestado, mensagem de cliente novo chega em `CHECK SESSAO
      PEDIDO` e segue fluxo normal
- [x] Varredura rápida dos outros nodes Supabase/PostgREST do `01` sem `alwaysOutputData`,
      resultado relatado mesmo que nada mais seja corrigido nesta demanda
- [x] `206` e `jsgrafica_contatos` conferidos intactos ao final

## Riscos e cuidados
Se confirmado, é a falha mais grave da categoria já achada nesta sessão - afeta especificamente o
momento de maior valor (1º contato de cliente novo), não um caso de borda raro.

## Referências
Demanda 307 (achado original, relatado como suspeita não confirmada). Demandas 296, 305, 306
(mesma categoria de bug de plataforma, já corrigida 4 vezes antes desta).

## Relato de execução

- O que foi feito: confirmada a suspeita da demanda 307 com teste real, não simulado. Usado um
  telefone real já presente em `jsgrafica_telefones_autorizados` (`5581984956007`) que tinha
  literalmente zero linhas nas 3 tabelas relevantes (`jsgrafica_memoria_conversas`,
  `jsgrafica_log_msgs_privadas`, `jsgrafica_contatos`) antes do teste, condição de "cliente
  genuinamente novo" real, não fabricada. 1ª tentativa confirmou o bug: `GET Memoria Ativa (raw)`
  rodou mas devolveu 0 itens, e nem `GET Memoria Ativa` (Code de desembrulho) nem `CHECK SESSAO
  PEDIDO` chegaram a executar - a mensagem foi logada no Inbox (chain paralela de log, independente
  dessa cadeia), mas nenhuma lógica de roteamento/resposta automática sequer avaliou a mensagem.
  Corrigido com `alwaysOutputData: true` no node (mesmo parâmetro, 5ª vez nesta sessão: 296, 305,
  306, 307 (2x) e agora 308).
- Testes realizados e resultado: reteste com o mesmo telefone (confirmado ainda com 0 linhas em
  `jsgrafica_memoria_conversas` antes de reenviar, já que a 1ª tentativa nunca chegou a gravar
  nada lá): `GET Memoria Ativa` e `CHECK SESSAO PEDIDO` rodaram normalmente
  (`_destino: 'atendimento'`), passou pela cadeia inteira das demandas 306/307 sem bloqueio, chegou
  no agente novo (`HTTP Agente Caminho C`) e recebeu resposta real e correta ("Opa! Boa tarde! 😊
  Como posso te ajudar hoje?", `zaapId` confirmado, `guardrail_bloqueou:false`).
- Varredura rápida (pedida no escopo): todos os nodes do `01` que tocam Supabase/PostgREST
  auditados um a um. Além do `GET Memoria Ativa (raw)` corrigido aqui, existem 7 outros sem
  `alwaysOutputData` (`MSG PRIVADA`, `MSG GRUPOS`, `CONTATOS`, `MSG PRIVADA1`, `MSG GRUPOS1`,
  `CONTATOS1`, `UPDATE Transcricao Audio Log`) - nenhum deles tem o mesmo perfil de risco: são
  todos INSERT/UPDATE agindo sobre um item que já está fluindo na execução (não uma consulta tipo
  "getAll" cujo resultado pode legitimamente vir vazio e cujo node seguinte dependa de rodar mesmo
  assim). Não corrigidos por não se encaixarem no padrão de bug real desta categoria - risco
  residual reconhecido mas não do mesmo tipo (uma UPDATE que não bate nenhuma linha por algum
  motivo poderia teoricamente ter comportamento parecido, mas não é o cenário "0 resultados é
  caminho normal esperado" que caracteriza os 6 casos já corrigidos).
- Achados fora do escopo (relatados, não resolvidos por conta própria): nenhum novo.
- Status final: concluída. Achado confirmado com evidência real (não presumido), corrigido,
  retestado com sucesso. Dado de teste limpo por completo: 3 linhas de
  `jsgrafica_log_msgs_privadas` e 1 linha de `jsgrafica_contatos` apagadas, telefone de teste
  devolvido ao estado original (zero histórico nas 3 tabelas, exatamente como estava antes do
  teste). `206` (91 nodes, ativo) e `jsgrafica_contatos` (2877 linhas, contato do piloto da 299
  intacto) conferidos no final.
