# 309 - Piloto silenciado ao vivo por falso positivo do contador de loop (demanda 307)

Status: concluída
Criada em: 2026-08-19
Aprovada em: 2026-08-19
Concluída em: 2026-08-19
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam durante o piloto real (demanda 299): o telefone de teste
(`5521965185667`) mandou "Quero fazer uma impressão" às 09:48 e "Oi" às 09:51 (2026-08-19) e não
recebeu nenhuma resposta do agente novo. Duas pistas levantadas: (1) o mesmo telefone tinha
recebido 2 respostas de saudação quase simultâneas às 09:47 (2,2s de diferença); (2) a sessão em
`jsgrafica_agente_teste_sessoes` estava marcada `status: 'escalada'` desde ontem.

## Investigação (log de execução real do n8n, não presumido)
- **Pista 1 (2 saudações quase simultâneas) não é bug.** Confirmado com o log de execução real:
  são 2 execuções completamente separadas (`1282493` e `1282495`), cada uma disparada por uma
  mensagem real distinta do cliente ("Bença" e "Tudo bem sim", 3s de diferença), cada uma chamando
  o agente exatamente 1 vez, cada uma com `zaapId` próprio (2 envios reais distintos, não duplicata
  do mesmo envio). O intervalo de 2,2s entre as respostas é só o tempo de processamento do LLM
  pra 2 turnos independentes e legítimos.
- **Pista 2 (`jsgrafica_agente_teste_sessoes` escalada desde ontem) é resíduo de teste antigo, não
  a causa de hoje** - `updated_at` de ontem, sem relação com os timestamps de hoje.
- **Causa raiz real, confirmada em `jsgrafica_memoria_conversas` E no log de execução**: as 2
  respostas legítimas da pista 1 contaram como "2 respostas automáticas nos últimos 10 minutos"
  pro contador de segurança (Camada 2) construído na demanda 307. A 3ª mensagem real ("Não dá pra
  editar né?", 12:47:14 UTC) foi tratada como se fosse a "3ª resposta automática seguida" e
  bloqueada, marcando a sessão com `status_atendimento='aguardando_equipe'`
  (`origem='protecao_loop_307'`, 3 linhas reais confirmadas com timestamp batendo exatamente com
  cada mensagem seguinte). Como a demanda 307 também estendeu `CHECK SESSAO PEDIDO` pra silenciar
  TODA mensagem seguinte enquanto esse status existir, o telefone ficou mudo permanentemente até
  reset manual - confirmado com o log de execução real de "Quero fazer uma impressão"
  (`1282569`): `CHECK SESSAO PEDIDO` já chegou com `_destino:'ignorar'` pelo status antigo, e o
  contador (reavaliado do zero) confirmou `contador_seguranca_estourado` de novo de forma
  independente.
- **Defeito de desenho real na Camada 2 original**: contagem bruta de respostas automáticas não
  distingue "cliente perguntou 3 coisas diferentes rapidamente, cada uma com resposta real
  distinta" de "bot repetindo a mesma away-message em loop" - exatamente a nuance que a demanda
  307 tinha identificado como importante ("sem sinal de intenção humana real") mas simplificou
  demais na implementação original (só contagem, sem checar o conteúdo do cliente).

## Correção
Camada 2 reformulada: contagem bruta sobe de gatilho em 2 pra 3 (backstop de frequência), MAS só
vira bloqueio de verdade se, além da contagem, as últimas mensagens DO CLIENTE forem
repetidas/idênticas entre si (assinatura real de bot/away-message batendo o mesmo texto sempre) -
não qualquer conversa real com conteúdo variado. Node novo `Buscar Mensagens Cliente Recentes`
(HTTP GET PostgREST, últimas 3 mensagens do cliente) alimenta essa checagem dentro de `Detectar
Loop Resposta Automatica`.

**3 bugs de implementação achados e corrigidos durante a própria correção, antes de fechar**:
1. Referência `{{ $json.phone }}` no node novo quebrou porque seu node anterior no grafo
   (`Contar Envios Automaticos Recentes`) faz auto-split de array em múltiplos itens - cada item
   vira uma linha da contagem (`{enviado_por, data_timestamp}`), sem campo `phone` nenhum.
   Corrigido com referência nomeada a `AJUSTAR DESTINO AGENTE FASE B` (ancestral comum estável nos
   2 ramos, sempre roda antes).
2. Muitas linhas de `jsgrafica_log_msgs_privadas` pra este telefone têm `data_timestamp: null`
   (eventos de status, não mensagem de conteúdo) - `order=data_timestamp.desc` do PostgREST põe
   NULL primeiro por padrão, então a consulta sempre trazia lixo em vez das últimas mensagens
   reais. Corrigido filtrando `data_timestamp=not.is.null&message_text=not.is.null`.
3. Nenhum dos 2 acima quebrava a execução (sem erro), só devolvia resultado errado em silêncio -
   confirmado ao vivo com teste antes de considerar corrigido, não presumido pela ausência de erro.

## Testes realizados e resultado
- Reproduzido o cenário exato do incidente (3+ respostas automáticas recentes + mensagens
  DIFERENTES do cliente): confirmado que NÃO bloqueia mais, agente responde normal.
- Controle positivo (a proteção original não pode ter sido destruída): 4 mensagens reais
  idênticas seguidas ("processando seu pedido aguarde") - confirmado que a 4ª (quando as 3
  anteriores já estão logadas, formando 3 idênticas em sequência) é bloqueada de verdade
  (`motivo: contador_seguranca_estourado`), sessão marcada, nenhuma resposta automática saiu.
- Mitigação imediata: sessão do telefone piloto desbloqueada (`jsgrafica_memoria_conversas`,
  linhas `protecao_loop_307` apagadas) assim que a causa raiz foi confirmada, antes mesmo da
  correção de código estar pronta, pra não deixar o piloto parado mais tempo que o necessário.

## Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo. `jsgrafica_agente_teste_sessoes` (pista 2) era resíduo de teste antigo, sem relação
com a causa de hoje - limpo por higiene, não por ser a causa.

## Status final
Concluída. `206` (91 nodes, ativo) e `jsgrafica_contatos` (nome real "Ninho" intacto) conferidos.
Todo dado de teste desta investigação apagado (18 linhas de entrada + 7 respostas reais de teste
em `jsgrafica_log_msgs_privadas`, linhas de `jsgrafica_memoria_conversas` de teste). Telefone
piloto devolvido ao estado normal, pronto pra continuar o piloto da demanda 299 sem interrupção.

## Referências
Demanda 307 (Camada 2 original, achado do defeito). Demanda 299 (piloto ao vivo afetado). Demanda
306/308 (mesma disciplina de nunca presumir, sempre confirmar com log de execução real).
