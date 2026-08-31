# 182 — Envio manual pelo Inbox continua duplicando contato (contact_lid)

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Auditoria do PM (2026-07-15): a duplicação de `contact_lid` (mesmo `phone` em mais de 1 linha,
problema já conhecido como "demanda 029") **continua acontecendo hoje**, não é só resíduo antigo.
Causa identificada: `lib/inboxLog.ts:32-58` (`registrarMensagemEnviada`, chamada toda vez que a
equipe manda mensagem manual pelo Inbox) faz `.eq('phone', phone).limit(1)` pra checar se o
contato já existe — mas em pelo menos 5 casos reais recentes (08-09/07) essa checagem não achou a
linha que já existia e criou uma segunda, órfã (`lead_name: null`, sem histórico). A tela mascara
isso (demanda 126 escolhe o "melhor" registro pra exibir), mas o dado continua duplicando por
baixo — 8 telefones com linha duplicada hoje, 6 individuais reais.

## Objetivo
Mandar mensagem manual pelo Inbox pra um contato que já existe nunca cria uma segunda linha.

## Escopo
- Incluído: investigar por que `.eq('phone', phone).limit(1)` não encontra a linha existente em
  alguns casos (suspeita: diferença de timing/formatação entre o `phone` usado nessa checagem e o
  já gravado, ou uma condição de corrida com o log do n8n que atualiza a mesma linha quase ao
  mesmo tempo) — usar os 5 casos reais já identificados (`558191252071`, `558193864868`,
  `558198917512`, `558183971678`, `558184109425`) pra reproduzir/confirmar a causa exata antes de
  corrigir.
- Corrigir pra nunca duplicar (ex. usar `upsert` com constraint em `phone`, ou reforçar a busca).
- Explicitamente fora de escopo: limpar as duplicatas já existentes (isso é trabalho do 02-DADOS,
  registrar achado separado se o PM quiser abrir).

## Critérios de aceite
- [ ] Causa raiz exata confirmada com um dos 5 casos reais (não suposição)
- [ ] Corrigido de forma que não duplica mais
- [ ] Testado enviando mensagem manual pra um contato já existente (sintético)

## Riscos e cuidados
Cuidado com concorrência (n8n atualizando a mesma linha ao mesmo tempo que o envio manual) — se a
causa for condição de corrida, a correção precisa ser atômica (upsert), não só reordenar a query.

## Referências
`lib/inboxLog.ts:32-58`. Demanda 029 (achado original de contact_lid instável), 126 (mitigação de
exibição), 170 (limpeza de 1 caso órfão). Auditoria de cadastro do PM, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### Causa raiz EXATA, confirmada com os casos reais (critério 1)
As 5 órfãs têm a impressão digital do `registrarMensagemEnviada` (contact_lid = phone, sem
nome, só contador de enviadas, timestamp em formato JS) — e a da Eliane (`558191252071`) foi
criada no **mesmo milissegundo** do `sent_at` da mensagem manual "Obrigado" de 08/07 (mesma
variável `agora` dos 2 inserts). A linha original existia desde MARÇO com o phone correto, e
um SELECT no Postgres não "perde" linha commitada — logo a checagem check-then-insert **falhou
de forma transiente e o erro era DESCARTADO** (`const { data }` sem olhar `error`): falha na
checagem virava "contato não existe" → INSERT órfão. Não é o `.single()` (já trocado na 053) —
é a classe seguinte do mesmo bug. A proximidade com o update do n8n (~2s depois em todos os
casos) é esperada (todo envio dispara o webhook fromMe), não a causa.

### Correção (atômica, como a demanda mandou)
Função SQL `jsgrafica_registrar_envio_contato(phone, agora, operador)` (migration
`add_rpc_registrar_envio_contato_182`): **um statement só** — UPDATE em TODAS as linhas do
phone (cada uma incrementa o próprio contador; a versão antiga clobberava todas com o valor de
uma) e INSERT apenas `WHERE NOT EXISTS` sobre o resultado do UPDATE. Se falhar, falha inteira
— o caminho "não achei → crio" deixou de existir. `lib/inboxLog.ts` chama a RPC e trata erro
(contador desatualizado é melhor que duplicata). A mesma classe de erro-engolido foi fechada
também no POST de nova conversa (checagem que falha → 500, nunca insert às cegas).

### Testes
- SQL: fone sintético inexistente → 1 insert; 2ª linha "estilo lid" criada pro mesmo fone →
  chamada atualizou AS DUAS, zero insert. Apagados.
- Fluxo real: 2 mensagens manuais via `POST /api/inbox/responder` pro número da PRÓPRIA
  gráfica (inofensivo) — 1º envio criou 1 linha, 2º envio ATUALIZOU (contador 2), nenhuma
  duplicata pelo nosso caminho. Linha de teste apagada.

### Achados fora de escopo (registrados pro PM)
1. **A duplicação CRUZADA (lid × phone) continua possível e foi vista AO VIVO no teste**: a
   linha antiga do self-chat da gráfica era chaveada por `@lid` com phone antigo — nosso insert
   por phone foi legítimo ("não existe linha com esse phone") e 29s depois o n8n atualizou o
   phone da linha `@lid` pro mesmo número → 2 linhas. É a família 029 (dois sistemas chaveando
   por colunas diferentes) — resolver de verdade é constraint/normalização de identidade
   (02-DADOS + 01-N8N), não este ponto de entrada.
2. Limpar as duplicatas já existentes segue sendo trabalho do 02-DADOS (a demanda já previa).
