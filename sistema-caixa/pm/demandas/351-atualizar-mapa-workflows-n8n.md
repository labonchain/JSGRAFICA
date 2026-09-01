# 351 - Atualizar o mapa de workflows n8n (desatualizado desde meados de agosto)

Status: concluída
Criada em: 2026-08-29
Aprovada em: 2026-08-29
Concluída em: 2026-08-31
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

Levantamento completo via API REST do n8n (`GET /workflows`, paginado, 380 workflows na conta
inteira, filtrado por nome `grafica`/`jsg`) - fonte de verdade real, não por memória.

**Adicionados como ativos de verdade**: `296 - CAMINHO C FERRAMENTAS` e
`297 - CAMINHO C AGENTE`, confirmados `active:true`.

**206 atualizado**: removido da seção "awaiting decisão" (vazia agora), adicionado à tabela de
descontinuados formalmente (mesma demanda 299, executada antes desta na mesma sessão).

**Achado maior, resolve a demanda 273 (aberta desde 15/08)**: os "19 workflows sumidos" nunca
sumiram - a ferramenta usada naquela investigação (`search_workflows`/`get_workflow_details` via
MCP) só enxerga workflow ativo, por isso não achava nenhum dos 19 inativos por ID nem por nome.
`GET /workflows` direto na API REST lista todos, ativos e inativos, sem exceção - confirmei os 19
+ o 206 (agora 20) todos lá, intactos. Nada foi perdido, a demanda 242 estava certa desde sempre.
Isso fecha a demanda 273 - recomendo o PM marcar como resolvida.

**Outra divergência achada e corrigida**: o `06 - JSGRAFICA | PEDIDOS` estava descrito no mapa
como "ativo real, mas nós de envio desabilitados" - desatualizado. Confirmado via API que o
workflow INTEIRO está `active:false` desde a demanda 303 (27/08). Corrigido a descrição e movido
pra seção própria (nem "ativo de verdade" nem "[DESCONTINUADO]" formalmente, categoria própria
criada pra não confundir com os outros dois grupos).

**Status final: concluída.** Todos os 3 critérios de aceite da demanda cumpridos (296/297
adicionados, 206 atualizado, resto revisado e 2 divergências reais corrigidas: a do 273 e a do
06-PEDIDOS).
