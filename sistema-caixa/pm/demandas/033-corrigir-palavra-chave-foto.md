# 033 — Corrigir palavra-chave "foto"/"fotos" genérica demais (mesmo padrão da 032)

Status: concluída
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: 2026-07-03
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 032, ao revisar a lista de palavras-chave: `foto`/`fotos` é uma das
palavras mais comuns do português, aparece em qualquer contexto de conversa ("me manda uma
foto", "vi na foto do perfil") — mesmo padrão de risco que o "cpf" isolado que causou o
incidente real (demanda 031). Ainda não causou problema confirmado, mas é o próximo risco
óbvio na mesma categoria.

## Objetivo
Trocar `foto`/`fotos` isolados por frases/contexto mais específico, sem perder o
reconhecimento de pedido real de impressão de foto.

## Escopo
- Incluído: no `KEYWORDS_SERVICO` (nó `CHECK SESSAO PEDIDO`, workflow `01`), trocar `foto`/
  `fotos` isolados por frases compostas que reflitam intenção real de serviço — ex.:
  "imprimir foto", "revelar foto", "foto 3x4", "foto 10x15", "tirar foto" (não, essa última
  não — cuidado pra não incluir frases que também são genéricas). Usar como referência os
  produtos reais da gráfica (3x4, 10x15, 7x10, 15x20, 20x29 — já cobertos por "3x4"/"10x15"
  etc.) e termos como "revelar"/"revelação".
- Fora de escopo: revisar `cópia`, `faixa`, `adesivo`, `espiral` (risco médio/baixo, já
  identificados na 032, ficam pra depois se quiser).

## Critérios de aceite
- [ ] "foto"/"fotos" isolados removidos, frases compostas no lugar
- [ ] Testado com mensagem fora de contexto contendo "foto" solta (ex.: "me manda uma foto
      sua") — confirmar que NÃO aciona o fluxo de pedidos
- [ ] Testado com pedido real ("quero revelar umas fotos", "foto 10x15") — confirmar que
      ainda aciona corretamente

## Referências
`pm/demandas/032-*.md` (onde foi encontrado), `pm/demandas/031-*.md` (incidente original).

## Relato de execução

**Status final: concluída**

### O que foi feito
Backup do workflow `01`. No `KEYWORDS_SERVICO` (nó `CHECK SESSAO PEDIDO`), categoria `foto`:

- **Antes:** `['foto', 'fotos', 'revelar', '3x4', '10x15']`
- **Depois:** `['imprimir foto', 'imprimir fotos', 'revelar foto', 'revelar fotos', 'revelar',
  'revelacao', 'revelação', '3x4', '10x15', '7x10', '15x20', '20x29']`

Tirei "foto"/"fotos" isolados. Mantive "revelar" sozinho (não foi apontado como arriscado, é
palavra menos comum em conversa fora de contexto) e aproveitei pra completar os tamanhos reais
do catálogo da gráfica que faltavam (`7x10`, `15x20`, `20x29` — só tinha `3x4`/`10x15` antes),
como o próprio texto da demanda sugeriu.

### Testes feitos (os dois pedidos no critério de aceite, mais um extra)
1. **Fora de contexto:** "me manda uma foto sua" → `_destino: "atendimento"` — não aciona mais.
2. **Pedido real 1:** "quero revelar umas fotos" → `_destino: "pedidos"`,
   `servico_detectado: "foto"` — aciona corretamente.
3. **Pedido real 2 (extra, testando os tamanhos):** "foto 10x15" → `_destino: "pedidos"`,
   `servico_detectado: "foto"` — aciona corretamente.

Os três confirmados via `GET /executions/{id}?includeData=true`. Limpei os dados sintéticos dos
3 telefones de teste depois.

### Critérios de aceite
- [x] "foto"/"fotos" isolados removidos, frases compostas no lugar
- [x] Testado com "me manda uma foto sua" fora de contexto — confirmado que NÃO aciona
- [x] Testado com "quero revelar umas fotos" e "foto 10x15" — confirmado que aciona
      corretamente nos dois

### Testes feitos
Três testes sintéticos via webhook `jsgraficamsgrecebidas`, inspeção de execução via API do
n8n, limpeza dos dados de teste. Nenhuma outra mudança no workflow além da linha `foto` do
`KEYWORDS_SERVICO` — `cópia`, `faixa`, `adesivo`, `espiral` ficaram de fora, como combinado.
