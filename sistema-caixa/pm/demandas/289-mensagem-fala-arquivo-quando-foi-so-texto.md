# 289 — Proposta fala "recebi seu arquivo" mesmo quando o cliente só mandou texto

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16), print da conversa real: mandou só a pergunta "Quanto
custa impressão P&B A4?" (texto puro, sem anexar nada) e a resposta do agente foi "Recebi seu
arquivo! Pelo que vi, é IMPRESSÃO P&B A4 (1 unidade), fica R$ 1.20. Confirma?" — não fez sentido
nenhum pro cliente, que não mandou arquivo algum.

Causa: o node `Montar Proposta` (workflow `206`) tem essa frase fixa desde que o agente só existia
pra responder mídia (demanda 206, antes de existir caminho de texto). A demanda 278 reaproveitou
esse mesmo node pro caminho de texto puro (decisão correta de não duplicar lógica), mas ninguém
ajustou o texto da mensagem em si pra fazer sentido nos dois casos.

## Objetivo
A proposta de preço faz sentido tanto quando veio de mídia quanto quando veio de texto puro —
nunca fala "arquivo" quando não teve arquivo nenhum.

## Escopo
- Incluído: no node `Montar Proposta`, tornar a frase de abertura condicional à origem (mídia vs
  texto) — ex. "Recebi seu arquivo!" quando veio de mídia, algo como "Recebi seu pedido!" ou
  "Entendi!" quando veio de texto puro. Escolher texto que soe natural nos dois casos, mesmo
  cuidado de voz real já usado nas demandas 260/277.
- Incluído: verificar se algum outro node compartilhado entre os 2 caminhos (mídia/texto) tem o
  mesmo tipo de frase hardcoded assumindo mídia — reportar cada ocorrência achada, mesmo que a
  correção de cada uma vire escopo à parte.
- Incluído: testar os 2 casos reais (mídia real e texto puro real) confirmando que a frase faz
  sentido nos dois.
- Explicitamente fora de escopo: qualquer outra mudança de conteúdo além de tornar a abertura
  condicional à origem.

## Critérios de aceite
- [x] Frase de abertura da proposta correta pros 2 casos (mídia diz "arquivo", texto não)
- [x] Outros nodes compartilhados com o mesmo problema levantados, mesmo que não corrigidos aqui
- [x] Testado com mensagem real nos 2 caminhos

## Riscos e cuidados
Mesma disciplina de sempre — texto real pro cliente, testar com cuidado antes de considerar
concluído. Seguir o checklist de limpeza pós-teste da demanda 283.

## Referências
Demanda 278 (reaproveitamento do `Montar Proposta` pro caminho de texto). Print do Edvam
(2026-08-16) mostrando o caso real.

## Relato de execução

Executado em 2026-08-16, no workflow `206`. Backup antes de mexer:
`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda289_2026-08-16.json` (84 nodes).

### Correção
Único node alterado: `Montar Proposta`. Usei o campo `gemini_tipo_midia` (já calculado por
`Parsear Resposta Gemini`, que desde a demanda 278 grava `'texto'` quando a origem é texto puro,
não `'imagem'`/`'pdf'`/`'outro'`) como discriminador pra decidir a abertura da mensagem:
```js
const veioDeTexto = ctx.gemini_tipo_midia === 'texto';
const abertura = veioDeTexto ? 'Recebi seu pedido! Pelo que entendi,' : 'Recebi seu arquivo! Pelo que vi,';
```
Mídia continua "Recebi seu arquivo! Pelo que vi, é..." (texto original, inalterado). Texto puro
passa a ser "Recebi seu pedido! Pelo que entendi, é...", mantendo o mesmo ritmo/estrutura da
frase original (saudação curta + "pelo que X, é Y"), só trocando o par
arquivo/vi por pedido/entendi, que faz sentido nos dois casos sem soar
esquisito nem robótico. Nenhuma outra mudança de conteúdo.

### Outros nodes compartilhados, verificados
Busquei a palavra "arquivo" em todos os 84 nodes do workflow: 4 ocorrências.
- `Montar Envio Confirmação` (mensagem "Recebemos seu arquivo aqui!...") e `Gemini Analisar
  Mídia` (prompt interno pro Gemini): **não são bug**, são nodes exclusivos do caminho de mídia
  por construção (o caminho de texto usa `Montar Contexto Texto`/`Gemini Analisar Texto` em vez
  desses, nunca os alcança), não há origem mista pra confundir.
- `Escalar - Arquivo Com Problema`: **não manda mensagem nenhuma pro cliente** (é update
  silencioso de sessão, mesmo padrão de toda escalação do `206`), a palavra "arquivo" só aparece
  no campo interno `motivo_escalonamento: 'arquivo_com_problema'`, não visível pro cliente. Esse
  node É compartilhado entre mídia e texto (desde a 278), então o rótulo interno tecnicamente
  ficou um pouco genérico demais pro caso de texto (erro de classificação de texto não é bem um
  "arquivo com problema"), mas como não é texto exibido a ninguém, não constitui o mesmo tipo de
  bug desta demanda. Reportado por completude, não corrigido (fora de escopo, mudança cosmética
  de dado interno).
- `Montar Proposta`: o node corrigido nesta demanda.

Nenhum outro node compartilhado com frase hardcoded assumindo mídia foi encontrado.

### Testado com os 2 casos reais
Payload seguro da demanda 283 (`chatLid` real, nomes reais):
- **Texto puro** ("Preciso de 50 cópias de xerox em P&B, frente e verso", primeira tentativa com
  a frase exata do Edvam "Quanto custa impressão P&B A4?" caiu como `ambiguo` no Gemini dessa vez,
  não chegou em `Montar Proposta`, sem regressão nenhuma, só não exercitou o node-alvo): mensagem
  real gerada foi `"Recebi seu pedido! Pelo que entendi, é IMPRESSÃO P&B A4 (1 unidade), fica *R$
  1.20*. Confirma?"` (texto exato extraído da execução real), sem falar em arquivo, envio real
  confirmado (`zaapId: 01A00C65CC7B7D7D86D08C146E9D43AB`).
- **Mídia real** (imagem real do log, sem legenda): mensagem real gerada foi `"Recebi seu
  arquivo! Pelo que vi, é IMPRESSÃO P&B A4 (1 unidade), fica *R$ 1.20*. Confirma?"`, idêntica ao
  texto original, confirmando que o caminho de mídia não regrediu; envio real confirmado
  (`zaapId: 01A00C66E90C7B5180DCA2A6D2CC5A0F`).

### Checklist da demanda 283 seguido
`jsgrafica_contatos` conferido antes e depois: `contact_lid`, `lead_name`, `lead_chat_name`
continuam corretos. Sessões de teste e log de mensagens apagados ao final.

### Diff final
Contra o backup pré-289: `0` nodes adicionados/removidos, `1` node com mudança (`Montar
Proposta`), `0` conexões alteradas.
