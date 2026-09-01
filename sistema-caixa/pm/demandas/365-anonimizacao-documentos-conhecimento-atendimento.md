# 365 - Anonimizar documentos de conhecimento do atendimento antes de irem pro GitHub público

Status: concluída
Criada em: 2026-08-31
Aprovada em: 2026-08-31 (retroativa, trabalho já em andamento quando formalizada)
Concluída em: 2026-08-31
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
`pm/` do `caixa-js-grafica` sobe pro repositório público `labonchain/JSGRAFICA` (decisão do
Edvam, ver `CLAUDE.md` raiz). Os 3 documentos de conhecimento do atendimento
(`manual-resposta-ia-100-clientes.md`, `mapa-jornada-atendimento-whatsapp.md`,
`blueprint-conversas-exemplo-agente.md`) foram construídos a partir de conversa real de cliente
(demandas 159-163, 234), continham dado pessoal identificável.

Esta demanda foi criada de forma retroativa por este PM, o trabalho já estava em andamento numa
sessão do 06-Atendimento quando reportado durante a rodada de handshake de identificação de
2026-08-31 (após `/clear` desta janela de PM). Formalizada agora só pra não ficar sem registro em
`STATUS.md`, conforme a regra do projeto (nenhuma demanda concluída fica sem entrada).

## Objetivo
Redigir todo dado pessoal identificável dos 3 documentos antes de irem pro repositório público,
sem perder o valor de conhecimento/exemplo real que eles carregam.

## Escopo
- Incluído: os 3 arquivos citados, em `pm/conhecimento/`.
- Explicitamente fora de escopo: qualquer outro documento de `pm/`.

## Decisão de escopo (achado durante a execução)
O 06-Atendimento ampliou por conta própria o escopo original (nome/telefone) pra também redigir
data de nascimento e e-mail de uma cliente. Não marcou como fechado só com relato deste PM,
esperou confirmação direta do Edvam na própria sessão dele antes de considerar resolvido
(disciplina correta, ver `pm/README.md`, "nunca declarar algo resolvido sem confirmar com dado
real"). **Edvam confirmou diretamente na sessão do 06-Atendimento (31/08)**: de acordo com o
escopo ampliado.

## Critérios de aceite
- [x] Nome e telefone de cliente real redigidos nos 3 arquivos.
- [x] Data de nascimento e e-mail redigidos (escopo ampliado, confirmado pelo Edvam).
- [x] Sem PII residual nos 3 arquivos, pronto pro GitHub público.

## Relato de execução
- O que foi feito: os 3 arquivos (`manual-resposta-ia-100-clientes.md`,
  `mapa-jornada-atendimento-whatsapp.md`, `blueprint-conversas-exemplo-agente.md`) tiveram
  nome/telefone/data de nascimento/e-mail de cliente real redigidos, mantendo o valor de exemplo
  do conteúdo.
- Testes realizados e resultado: revisão dos 3 arquivos confirmando ausência de PII residual
  (relato do 06-Atendimento).
- Achados fora do escopo: nenhum reportado.
- Status final: concluída. 06-Atendimento sinalizou PRONTO PRA CLEAR.
