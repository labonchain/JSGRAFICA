# 351 - Atualizar o mapa de workflows n8n (desatualizado desde meados de agosto)

Status: aprovada
Criada em: 2026-08-29
Aprovada em: 2026-08-29
Concluída em: (vazio até conclusão)
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado repetido em duas rodadas de reidentificação de sessão (28/08 e 29/08) pelo próprio
01-N8N: `pm/conhecimento/mapa-workflows-n8n.md` se descreve como "fonte técnica definitiva" mas
não menciona os workflows do Caminho C (`296` ferramentas, `297` agente) nem o congelamento do
`206` desde a demanda 292, tudo isso de meados de agosto (demandas 295-299). Quem ler esse mapa
hoje tem uma visão desatualizada do que realmente está rodando em produção.

## Objetivo
Atualizar o `mapa-workflows-n8n.md` pra refletir o estado real de produção, incluindo o
desligamento definitivo do `206` decidido na mesma data (ver demanda 299), pra não precisar de
outra atualização daqui a uma semana.

## Escopo
Incluído:
- Adicionar `296` (ferramentas Caminho C) e `297` (agente Caminho C) como workflows ativos reais.
- Atualizar o status do `206` pra refletir o desligamento definitivo (demanda 299), não mais
  "congelado como fallback de reversão".
- Revisar o resto da lista contra o estado real (`get_workflow_details`/API REST) e corrigir
  qualquer outra divergência encontrada no processo.

Explicitamente fora de escopo: mexer em qualquer workflow de produção além do que a demanda 299
já pede (desligar o `206`), esta demanda é só documentação.

## Critérios de aceite
- [ ] Mapa reflete 296/297 como ativos reais.
- [ ] Mapa reflete o `206` como desligado definitivamente (não mais fallback).
- [ ] Qualquer outra divergência achada na revisão está corrigida ou pelo menos registrada.

## Referências
`pm/conhecimento/mapa-workflows-n8n.md`, demandas 295-299, demanda 299 (desligamento do `206`).

## Relato de execução
(preenchido pelo 01-N8N ao concluir)
