# Piloto do Caminho C (18/08 a 27/08): resultado real e recomendação (demanda 330)

Compilado pelo 06-Atendimento a partir de dado real (Supabase, logs de execução, demandas
concluídas), não por memória. Todo número aqui foi consultado direto no banco em 2026-08-27.

## Recomendação objetiva

**Nota de atualização**: entre a redação inicial deste relatório e o fechamento da demanda 330, a
própria 328 foi concluída pelo `01-N8N` com um teste controlado limpo (`ped-3833`, ver seção
própria abaixo), satisfazendo a condição 1 original. A recomendação abaixo já está ajustada pra
essa realidade.

**Continuar como está (whitelist interna, sem expandir pra cliente real) por mais 1 item pendente,
não mais 2.** Não recomendo pausar (o mecanismo central funciona e os guardrails seguram o que
foram desenhados pra segurar). O bloqueio mais crítico (pedido/Pix de ponta a ponta acionado pela
própria IA) está resolvido com evidência forte. Ainda não recomendo expandir agora só por causa do
item 2 abaixo (achado de hoje, ainda sem auditoria completa).

**Condição restante antes de expandir a whitelist pra qualquer cliente real:**
1. ~~Teste controlado limpo de pedido/Pix~~ **Satisfeita.** A demanda 328 (`01-N8N`, concluída
   27/08) rodou um teste controlado de 2 turnos no telefone interno e confirmou, pelo log real de
   `intermediateSteps`, que a própria IA aciona `consultar_preco_produto` →
   `criar_pedido_aguardando_aprovacao` → `gerar_cobranca_pix` na sequência certa, com os parâmetros
   certos (pedido real `ped-3833`, Pix real via Mercado Pago, `mp_order_id
   ORD01M12B8E7BN2BFK0JA032Y72Q0`). Isso é mais forte que o achado arqueológico desta demanda
   (`ped-3149`, ver seção própria abaixo): é um teste limpo, de propósito, repetível, não uma
   sessão bagunçada de tentativas.
2. Confirmar que a brecha achada hoje (documento-imagem sem legenda desviando pro agente legado
   sem guardrail, corrigida na demanda 322) não tem irmãs equivalentes nos outros branches de
   mídia (`image`, `video`, `audio`), não investigado ainda, fora do escopo que a 322 se propôs a
   cobrir.

## O que o piloto realmente testou (escopo real, não o anunciado)

A demanda 299 anunciou o piloto com prazo de 4 dias (18/08 a ~22/08). Hoje é 27/08, 9 dias depois,
sem decisão formal registrada (esse é o próprio motivo da demanda 330 existir).

Consultando `jsgrafica_telefones_autorizados` e `jsgrafica_log_msgs_privadas` direto:
- **6 telefones na whitelist**, todos internos/da equipe (nenhum cliente real). 5 estão lá desde
  03/07 (antecedem o próprio Caminho C). 1 foi adicionado **hoje**, 27/08 às 12:18.
- **103 respostas da IA no total desde 18/08**, praticamente todas (99) pra **1 único telefone**
  (`5521965185667`, o número de teste do próprio Edvam usado desde a demanda 299). O telefone
  novo (adicionado hoje) recebeu 4 respostas, só perguntas de preço básicas, nenhuma tentativa de
  fechar pedido.
- Ou seja: **na prática, o piloto de 9 dias rodou quase inteiro sobre 1 número de teste só**, não
  sobre uma amostra variada. Isso explica por que a maioria dos bugs reais (ver próxima seção) só
  apareceu numa varredura deliberada de hoje, não organicamente ao longo dos 9 dias: não teve
  volume/variedade suficiente pra estressar o sistema sozinho.
- **Zero clientes reais** passaram pelo Caminho C até agora. Isso é esperado (a whitelist é
  desenhada assim de propósito), mas significa que "resultado do piloto" aqui é sobre
  comportamento em teste controlado, não sobre reação de cliente de verdade.

## Bugs achados e corrigidos durante o piloto (17 no total, cronologia real)

Praticamente todos ligados à mesma família de causa raiz de plataforma n8n
(`alwaysOutputData` ausente faz o próximo node não rodar quando a consulta devolve 0 linhas),
repetida 6+ vezes em pontos diferentes:

**18-19/08 (conexão do piloto):**
- 305: gate determinístico de Alto Toque (dado sensível) construído antes do agente.
- 306: roteamento de sessão de pedido travava telefone com sessão antiga apontando pro
  `06-PEDIDOS` morto (441 telefones reais afetados, 112 com atividade recente).
- 307: proteção contra loop de resposta automática com away-message do lado do cliente.
- 308: 1ª mensagem de cliente genuinamente novo não recebia avaliação de roteamento nenhuma.
- 309: a própria proteção da 307 silenciou o piloto ao vivo por falso positivo (contagem bruta
  sem checar conteúdo real das mensagens do cliente); corrigida no mesmo dia.
- 298: 1 vazamento real de prompt de sistema (pedido de "tradução das diretrizes" expôs nomes de
  ferramenta e regras internas); corrigido, sem recorrência confirmada até hoje (consultado no
  banco: nenhum novo vazamento desde então).

**27/08 (varredura completa pedida pelo Edvam, achados de 9 dias acumulados em 1 dia só):**
- 314/315: `Buscar Log Recente` não ordenava por recência (IA lia contexto desatualizado) e não
  filtrava histórico da Dizu Refeições do contexto.
- 316: regex de detecção de confusão com a Dizu gerava falso positivo em cliente pagante real
  pedindo cardápio impresso (risco de redirecionar cliente de verdade pro número errado).
- 317: anexo sem legenda derrubava a execução inteira do `01` com o Caminho C ativo.
- 318: texto de mensagem citada (`quoted_msg`) não era resolvido.
- 319: análise de imagem/documento sem legenda via Gemini Vision, não existia antes.
- 320: transcrição de áudio 100% quebrada desde 01/08 (credencial ausente).
- 321: sistema de 4 estados de atendimento (`aberto`/`em_atendimento`/`escalado`/`resolvido`)
  compartilhado entre IA e humano, substituindo o campo antigo que travava conversa escalada por
  dias sem sincronizar com o Admin.
- 322: **achado novo, não citado em nenhum resumo anterior** (ver seção própria abaixo).
- 323/324: 2 corridas (race conditions) reais no sistema de 4 estados recém-criado pela própria
  321, no mesmo dia.
- 325: conversa escalada sem resposta caía em silêncio total pro cliente; banner no Admin +
  mensagem de cortesia com cooldown.

## Achado novo desta demanda: brecha de roteamento pro agente sem guardrail, com preço errado real

Não estava em nenhum resumo anterior porque a demanda que o descreve (322) é dona do `01-N8N`, não
do `06-Atendimento`, encontrado ao ler o arquivo completo pra montar este relatório.

Hoje (27/08, ~12:52), um documento-imagem sem legenda mandado pelo telefone de teste
(`5521965185667`) caiu numa condição mal calculada em `Processar Evento` (`caption` sendo
preenchido com o nome do arquivo em vez da legenda real) que fez o roteamento avaliar o contato
como NÃO elegível pro Caminho C, caindo no fallback: o workflow legado `JSGRAFICA_ATENDIMENTO_AI`
(Gemini+RAG, sem nenhuma ferramenta de recálculo de preço, "pausado por decisão de produto" desde
antes do Caminho C existir). Esse agente **cotou R$ 9,00 pra uma foto 10x15 que custa R$ 2,50 no
catálogo real** (confirmado no log de execução real, `1576461`), exatamente o tipo de erro que o
Caminho C inteiro foi desenhado pra nunca deixar acontecer.

Corrigido no mesmo dia (322), mas isso mostra 2 coisas importantes pra decisão de expansão:
1. O guardrail de preço do Caminho C só protege quem **chega** no Caminho C. Um bug de roteamento
   (não um bug do agente em si) já bastou pra um preço errado sair de verdade, mesmo com todas as
   proteções da IA nova intactas e funcionando.
2. Esse tipo específico de bug (branch `document` mal mapeado) só foi achado hoje, na varredura
   completa. Os branches irmãos (`image`, `video`, `audio`) usam padrão parecido e não foram
   auditados com o mesmo cuidado ainda, ver condição 2 da recomendação acima.

## Reavaliação da demanda 328 (ferramenta de pedido/Pix nunca confirmada sendo acionada pela IA)

**Atualização**: a 328 foi concluída pelo `01-N8N` no mesmo dia com um teste controlado real e
limpo (telefone interno, 2 turnos, log de `intermediateSteps` conferido, não presumido): a própria
IA acionou `consultar_preco_produto` → `criar_pedido_aguardando_aprovacao` → `gerar_cobranca_pix`
na sequência certa, com os parâmetros certos (pedido real `ped-3833`, Pix real,
`mp_order_id ORD01M12B8E7BN2BFK0JA032Y72Q0`). A suspeita original da varredura está descartada com
evidência real e forte. A seção abaixo é o achado independente que fiz antes de saber do resultado
da 328, mantido como registro por ser uma fonte diferente (log histórico real, não teste dirigido)
que aponta na mesma direção.

Ao consultar o log de mensagens reais direto no banco (não só as demandas escritas), achei
evidência própria, anterior à conclusão da 328, que já apontava no mesmo sentido:

- Em 18/08, 03:18:22 (horário Recife), dentro da mesma conversa de teste do piloto
  (`5521965185667`), a IA respondeu com uma mensagem completa e real de confirmação de pedido +
  Pix copia-e-cola válido (`XEROX COLORIDA A4, R$ 1,20`), batendo exatamente com o pedido real
  `ped-3149` (`pedido_criado_por: agente_caminho_c`, `origem_conversa: whatsapp_caminho_c`) criado
  no mesmo segundo. Isso **é** evidência real de que a própria IA, raciocinando numa conversa de
  WhatsApp de verdade (não um teste de webhook direto), decidiu chamar as duas ferramentas
  corretamente pelo menos 1 vez.
- Mas essa mesma janela de conversa (02:06 a 03:37 do mesmo dia, ~70 mensagens da IA num intervalo
  de 1h30) mostra a IA **repetindo a mesma pergunta ("posso gerar o pedido?") dezenas de vezes**
  sem fechar, e várias respostas de "problema técnico, tenta de novo", antes de finalmente fechar
  1 vez. Não dá pra saber, só com esse dado, se o fechamento bem-sucedido foi porque o cliente
  (Edvam testando) finalmente disse algo que destravou, ou se foi sorte de uma tentativa entre
  muitas.
- **Conclusão**: essa evidência sozinha (1 sucesso dentro de uma sessão instável, dezenas de
  tentativas sem fechar) não seria suficiente pra fechar a dúvida original da 328 com confiança,
  o teste controlado limpo que a própria 328 rodou depois (`ped-3833`) é que resolve isso de
  verdade. Fica registrada aqui só como confirmação independente, de fonte diferente, de que o
  caminho funciona.

## O que funcionou bem, sem achado negativo

- Nenhuma cobrança errada, nenhum valor inventado pela IA em conversa real dentro do Caminho C em
  si (o único preço errado saiu do agente legado, por bug de roteamento, seção acima).
- Guardrail de vazamento de prompt segurou desde a correção (298), sem recorrência em 9 dias de
  uso real, inclusive sob o mesmo tipo de tentativa que expôs o problema originalmente.
- Escalação pra humano funciona e usa linguagem real validada contra o padrão de voz da equipe
  (não citar mecanismo interno, 1 emoji no máximo), incluindo o caso de conversa esquecida (325).
- Nenhum dos 6 telefones da whitelist teve dado sensível (Alto Toque) vazado ou mal tratado desde
  a 305.

## Referências
Demanda 299 (piloto original), 305 a 325 (bugs corrigidos), 328 (achado mais crítico, dono
`01-N8N`), 326 (confirma que o caminho de Pix do app, que as ferramentas do Caminho C reaproveitam,
segue funcionando com dinheiro real pós-304), `pm/conhecimento/caminho-c-mapa-decisoes-completo.md`.
