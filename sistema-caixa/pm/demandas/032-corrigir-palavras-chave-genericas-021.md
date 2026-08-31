# 032 — Corrigir palavras-chave genéricas demais na demanda 021 ("cpf"/"serasa")

Status: concluída
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: 2026-07-03
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 031: a palavra-chave "cpf" (categoria `consulta`, demanda 021) é genérica
demais — bate em qualquer mensagem que mencione um CPF, sem relação com o serviço da gráfica.
Isso puxou pessoas reais sem nenhuma relação com a JS Gráfica pro fluxo de pedidos, e
mensagens reais foram enviadas a elas (confirmado via `zaapId`). Os nós de envio do
`06-PEDIDOS` estão desativados manualmente pelo Edvam agora — esta correção é pré-requisito
antes de cogitar reativá-los.

## Objetivo
Trocar palavras-chave isoladas demais por frases compostas mais específicas, sem perder a
capacidade de reconhecer pedido real de consulta CPF/Serasa.

## Escopo
- Incluído: no nó `CHECK SESSAO PEDIDO` (workflow `01`), trocar `cpf` e `serasa` isolados por
  frases compostas: "consulta cpf", "consulta serasa", "2ª via", "segunda via" (mantendo as já
  existentes). Revisar rapidamente as outras categorias de palavra-chave da 021 procurando
  outros termos genéricos demais no mesmo padrão (ex.: palavras de 1-2 sílabas que podem
  aparecer em qualquer contexto) — reportar se achar mais algum, não precisa corrigir tudo
  nesta demanda se a lista for grande.
- Fora de escopo: reativar os nós de envio do `06-PEDIDOS` (isso é decisão do Edvam, separada).

## Critérios de aceite
- [ ] "cpf"/"serasa" isolados removidos, frases compostas no lugar
- [ ] Testado com mensagem sintética contendo "cpf" fora de contexto de gráfica (ex.: "me
      informe seu cpf") — confirmar que NÃO aciona mais o fluxo de pedidos
- [ ] Testado com mensagem real de pedido ("quero fazer uma consulta de cpf") — confirmar que
      ainda aciona corretamente

## Referências
`pm/demandas/021-*.md`, `pm/demandas/031-*.md`.

## Relato de execução

**Status final: concluída**

### O que foi feito
Backup do workflow `01` antes de mexer. No nó `CHECK SESSAO PEDIDO`, categoria `consulta` da
lista `KEYWORDS_SERVICO`:

- **Antes:** `['cpf', 'serasa', 'segunda via', '2ª via', '2 via']`
- **Depois:** `['consulta cpf', 'consulta de cpf', 'consulta serasa', 'consulta de serasa',
  'segunda via', '2ª via', '2 via']`

Tirei "cpf" e "serasa" isolados, troquei por frases compostas. Mantive "segunda via"/"2ª
via"/"2 via" como estavam — já são específicas o suficiente (não são palavras soltas de uso
comum).

### Testes feitos (os dois pedidos no critério de aceite)
1. **Fora de contexto:** telefone de teste mandando "me informe seu cpf" (a mesma frase que
   causou o problema real na demanda 031) → `_destino: "atendimento"` — **não aciona mais o
   fluxo de pedidos**. Confirmado via `GET /executions/{id}?includeData=true`.
2. **Consulta real:** telefone de teste mandando "quero fazer uma consulta de cpf" →
   `_destino: "pedidos"`, `servico_detectado: "consulta"` — **continua acionando
   corretamente**.

Limpei os dados sintéticos dos dois testes (`jsgrafica_contatos`, `jsgrafica_memoria_conversas`,
`jsgrafica_log_msgs_privadas`) depois de confirmar os resultados.

### Revisão das outras categorias (achado, não corrigido — conforme permitido pelo escopo)
Olhando a lista toda com o mesmo critério (palavra curta/comum que pode aparecer em qualquer
contexto):

| Categoria | Palavra-chave | Risco |
|---|---|---|
| `foto` | `foto`, `fotos` | **Alto** — "foto" é uma das palavras mais comuns do português, aparece em qualquer contexto ("me manda uma foto", "vi na foto do perfil", etc.) — mesmo padrão de risco que o "cpf" que causou o problema real |
| `xerox` | `copia`/`cópia` | Médio — "cópia" pode aparecer fora de contexto ("cópia de segurança", "uma cópia do documento"), mas menos comum no dia a dia que "foto" |
| `banner` | `faixa`, `adesivo` | Baixo/médio — palavras do dia a dia mas menos genéricas |
| `encadernacao` | `espiral` | Baixo — palavra incomum em conversa casual |

**A de maior risco é `foto`/`fotos`** — mesmo padrão que já causou o incidente real. Não
corrigi porque o escopo desta demanda permite reportar sem corrigir tudo, mas recomendo que
vire o próximo ajuste, antes de "cpf" dar mais uma surpresa em forma de "foto".

### Critérios de aceite
- [x] "cpf"/"serasa" isolados removidos, frases compostas no lugar
- [x] Testado com mensagem sintética "me informe seu cpf" fora de contexto — confirmado que
      NÃO aciona mais
- [x] Testado com "quero fazer uma consulta de cpf" — confirmado que ainda aciona

### Testes feitos
Dois testes sintéticos via webhook `jsgraficamsgrecebidas`, inspeção de execução via API do
n8n, limpeza dos dados de teste no Supabase depois. Nenhuma outra mudança no workflow `01` além
da linha `consulta` do `KEYWORDS_SERVICO`.
