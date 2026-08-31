# 323 — Reivindicação de atendimento (`297`) revertia o estado `escalado` que a própria IA acabara de gravar

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: sessão fora do fluxo normal dos chats especialistas, a pedido direto do Edvam

## Contexto

Bug real, urgente, confirmado com execução real (`1576879`, 2026-08-27 ~16:04 UTC) enquanto o
Edvam testava ao vivo o piloto do Caminho C (`297`).

Quando a IA do Caminho C decide, no meio do próprio raciocínio, chamar a ferramenta
`escalar_para_humano` (Camada 2 — ambiguidade/negociação que a própria IA reconhece, diferente dos
gates determinísticos Dizu/Alto Toque/Guardrail-bloqueado, que escalam por caminho próprio e não
passam por este node), a sequência real era:

1. `Tool Escalar Para Humano` dispara → chama `WH Escalar Para Humano` no workflow `296`, que roda
   `Contatos: Liberar Atendimento (Escalado)` — grava corretamente
   `jsgrafica_contatos.status_atendimento='escalado', atendente=null` pro telefone. Essa parte
   sempre funcionou certo.
2. ~1,4s depois, ainda no MESMO turno do agente, o node `Contatos: Reivindicar Atendimento (raw)`
   (adicionado na demanda 321, passo de "reivindicação" antes de mandar a resposta final) dispara
   incondicionalmente a caminho do envio da resposta final ("Chamando a equipe"). O filtro dele:
   ```
   PATCH .../jsgrafica_contatos?phone=eq.{{ $json.telefone }}&or=(atendente.is.null,atendente.eq.'Agente Atendimento')
   body: { atendente: 'Agente Atendimento', status_atendimento: 'em_atendimento' }
   ```
   Como a escrita da escalação tinha acabado de deixar `atendente=null`, esse guard OR batia, e o
   node de reivindicação **reclamava e revertia a escalação silenciosamente** — devolvendo a linha
   pra `em_atendimento`/`Agente Atendimento` 1,4s depois de ter sido corretamente marcada
   `escalado`. Confirmado por consulta real: o contato `5521965185667` estava em
   `em_atendimento`/`Agente Atendimento`, não `escalado`, apesar da mensagem do cliente ter sido
   genuinamente escalada e a resposta "Chamando a equipe" ter sido genuinamente enviada.

Por que só acontece nesse caminho e não nos gates determinísticos: Dizu/Alto Toque/Guardrail
bloqueado são ramos separados que vão direto pra `Montar Envio Z-API`, sem passar pelo node de
reivindicação (confirmado nas `connections` do workflow, ver seção Investigação). Só a decisão da
própria IA de chamar `escalar_para_humano` no meio do raciocínio (Camada 2) produz um texto final
que passa pelo MESMO pipeline compartilhado de qualquer resposta normal (`Guardrail Falhou?` →
reivindicar → enviar), então o passo de reivindicação — que só devia rodar em resposta
genuinamente normal — acaba rodando aqui também e atropelando o estado correto.

## Objetivo

Impedir que `Contatos: Reivindicar Atendimento (raw)` reclame/reverta uma linha que acabou de ser
corretamente marcada `escalado`.

## Investigação antes de mudar

Lido o node ao vivo via `GET` fresco (workflow `297`, `JeN7VMYMeQEJgd0b`) — confirmado que a URL
real batia exatamente com o relatado:
```
=https://arqkdnexpederquztegn.supabase.co/rest/v1/jsgrafica_contatos?phone=eq.{{ $json.telefone }}&or=(atendente.is.null,atendente.eq.{{ encodeURIComponent('Agente Atendimento') }})
```

Confirmado via execução real `1576879` que a sequência é exatamente a descrita: `Tool Escalar Para
Humano` (dentro do `AI Agent Caminho C`) → `Extrair Resposta Agent` → `Guardrail Validacao Saida` →
`Guardrail Falhou?` (saída falsa, guardrail passou) → `Contatos: Reivindicar Atendimento (raw)`
(~1,4s depois do tool call) → `Contatos: Avaliar Reivindicacao` → `Reivindicacao Falhou?` (falso,
porque o guard OR bateu por engano) → `Preparar Envio Normal` → `Montar Envio Z-API` → `Enviar
Z-API` (mensagem "Chamando a equipe" enviada de verdade).

Confirmado nas `connections` do workflow que os 3 gates determinísticos (`Preparar Envio Dizu`,
`Preparar Envio Alto Toque`, `Preparar Envio Bloqueado`) conectam DIRETO em `Montar Envio Z-API`,
sem passar pelo node de reivindicação — só `Preparar Envio Normal` (alcançado via o node de
reivindicação) está no caminho afetado.

## Fix aplicado

Adicionado `status_atendimento=neq.escalado` como condição AND de topo (PostgREST faz AND entre
parâmetros de topo e o grupo `or=(...)`, testado e confirmado pelo resultado real pós-deploy):

```
ANTES:  ...?phone=eq.{{ $json.telefone }}&or=(atendente.is.null,atendente.eq.{{ encodeURIComponent('Agente Atendimento') }})
DEPOIS: ...?phone=eq.{{ $json.telefone }}&status_atendimento=neq.escalado&or=(atendente.is.null,atendente.eq.{{ encodeURIComponent('Agente Atendimento') }})
```

Mesmo princípio "recalcular a partir da fonte real, nunca confiar numa decisão desatualizada" já
usado nas outras ferramentas do Caminho C (ex. `consultar_preco_produto` sempre recalcula em vez de
confiar num valor anterior da conversa).

## Validação (antes do deploy)

1. **Filtro real confirmado**: leitura do `GET` fresco bateu exatamente com a URL descrita acima,
   antes de qualquer edição.
2. **Cenário real que acabou de acontecer**: com o fix, quando este node roda 1,4s depois da
   escrita de escalação (linha já em `status_atendimento='escalado', atendente=null`), a nova
   condição `status_atendimento=neq.escalado` faz o filtro inteiro não bater NENHUMA linha → o
   PATCH de reivindicação vira no-op → o estado `escalado` correto permanece intacto.
3. **Caso genuinamente normal (não escalado) confirmado sem regressão**: contato em `aberto`,
   `resolvido`, ou já `em_atendimento`+`Agente Atendimento` — nenhum desses estados é `escalado`,
   então a nova condição não interfere, a reivindicação continua funcionando exatamente como antes.
4. **Achado crítico durante esta mesma validação** (ver demanda 324): a suposição inicial de que a
   mensagem "Chamando a equipe" já tinha sido enviada por um node diferente no caminho de
   escalação (`296`) estava **errada** — investigação real (workflow `296` completo + execução
   `1576879`) confirmou que não existe nenhum node de envio WhatsApp no caminho de escalação;
   `Enviar Z-API` (`297`) é o único envio do turno inteiro, e depende do mesmo node de
   reivindicação. Ou seja, o fix como descrito acima, sozinho, faria a confirmação "Chamando a
   equipe" nunca ser enviada ao cliente quando a IA escala sozinha (Camada 2) — trocando "estado do
   banco errado, cliente recebe confirmação" por "estado do banco certo, cliente recebe silêncio".
   Esse achado virou a demanda 324, **corrigida no mesmo dia** (ver esse documento para o desenho
   final: o PATCH desta demanda continua exatamente como description acima, e a decisão de "enviar
   ou não" foi desacoplada dele no node seguinte).

## Deploy

Backup pré-mudança (`GET` fresco antes de editar):
`pm/backups/297-caminho-c-agente_pre-demanda323_2026-08-27.json` (44 nodes).

`PUT /api/v1/workflows/JeN7VMYMeQEJgd0b` → HTTP 200. `GET` fresco separado confirmou persistência:
44→44 nodes, 0 adicionados/removidos, **exatamente 1 node alterado**
(`Contatos: Reivindicar Atendimento (raw)`), `connections` idênticas byte a byte ao backup.

## Limpeza real do dado corrompido

Telefone `5521965185667` (o mesmo já visto na demanda 321, escalado de novo hoje por outro motivo
real: `proposta_negada`). Confirmado por `SELECT` real, antes da correção:
`atendente='Agente Atendimento', status_atendimento='em_atendimento'` — batia exatamente com o
estado corrompido relatado.

```sql
UPDATE jsgrafica_contatos SET status_atendimento='escalado', atendente=null
WHERE phone='5521965185667';
```

Confirmado por `RETURNING`: `atendente=null, status_atendimento='escalado'`.

## Critérios de aceite

- [x] Filtro real do node confirmado antes de mudar (bate com o relatado)
- [x] Fix adiciona exatamente a condição pedida, sintaxe verificada contra a URL real (não um
      formato genérico assumido)
- [x] Reasoning validado: filtro passa a não bater nenhuma linha no cenário real que acabou de
      acontecer, deixando o `escalado` intacto
- [x] Caso normal (não escalado) confirmado sem regressão
- [x] Achado sobre o efeito colateral no envio da confirmação não ficou só documentado — virou
      demanda 324, corrigida no mesmo dia
- [x] Backup salvo antes da mudança
- [x] Persistência confirmada via `GET` fresco separado do `PUT`
- [x] Diff node-a-node confirma exatamente 1 node alterado, conexões intactas
- [x] Dado real do telefone `5521965185667` corrigido nas 2 colunas
- [x] Nenhuma execução real/sintética disparada contra o webhook

## Riscos e cuidados

Nenhum risco novo introduzido pelo fix em si — reduz superfície de corrida (o claim nunca mais
sobrescreve uma escalação que acabou de acontecer). O risco real descoberto (efeito colateral no
envio da confirmação) foi endereçado na mesma passada pela demanda 324, não deixado solto.

## Referências

Execução real `1576879` (evidência original). Demanda 321 (Piece 2, que criou o node
`Contatos: Reivindicar Atendimento (raw)` e o node `Contatos: Avaliar Reivindicacao`). Demanda 324
(achado crítico da própria validação desta demanda, corrigido no mesmo dia).
`pm/conhecimento/caminho-c-mapa-decisoes-completo.md` seção 3.4 (guardas de corrida, atualizada com
o desenho final das duas demandas).

## Relato de execução

Executado em 2026-08-27, workflow `297` (`JeN7VMYMeQEJgd0b`, produção real, piloto ativo). Node
real lido via `GET` fresco antes de editar, confirmado idêntico ao relatado. Fix aplicado (1 URL,
1 condição AND nova), `PUT` HTTP 200, `GET` fresco separado confirmou persistência: diff final é
exatamente 1 node alterado, 0 adicionados/removidos, conexões idênticas byte a byte ao backup.
Telefone `5521965185667` corrigido nas 2 colunas via Supabase, confirmado por `RETURNING`.
Validação obrigatória (4 pontos do briefing original) cumprida, achado crítico do ponto 4 não
ficou só documentado — corrigido no mesmo dia pela demanda 324. Nenhuma execução real ou sintética
disparada contra o webhook.
