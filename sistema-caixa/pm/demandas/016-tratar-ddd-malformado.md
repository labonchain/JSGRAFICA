# 016 — Tratar contatos com DDD não-parseável / long tail disperso

Status: concluída — sem contaminação real encontrada, nenhuma ação necessária
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Demanda 001 quantificou: 327 contatos (16,5%) com telefone malformado/DDD não-parseável, e
~130 contatos (~6,5%) espalhados em dezenas de DDDs diferentes (jan-abr/2026), 1 contato cada
— provável ruído orgânico, não confirmado.

## Objetivo
Entender a causa dos 327 malformados (formato errado no payload? número internacional? erro
de import?) e propor tratamento. Para o "long tail", só confirmar a suspeita (ruído orgânico)
com uma amostra — não é prioridade investigar fundo.

## Escopo
- Incluído: amostrar os 327 registros malformados, identificar padrão de erro; amostrar ~15-20
  do long tail pra confirmar/descartar a hipótese de ruído orgânico; propor tratamento pros
  malformados (corrigir formato onde der, ou marcar como inválido). Aproveitar pra explicar o
  achado da demanda 008: o número da própria gráfica (`558186108547`) aparece como contato de
  si mesma — checar rápido a causa (é razoável, artefato de log?).
- Fora de escopo: apagar ou alterar dado sem aprovação — só diagnóstico + proposta.

## Critérios de aceite
- [ ] Causa dos 327 malformados identificada (ou "não determinável")
- [ ] Confirmação/descarte da hipótese de ruído orgânico pro long tail
- [ ] Proposta de tratamento pros malformados

## Referências
`pm/demandas/001-investigar-contaminacao-log.md`.

## Relato de execução

**Status: concluída.** Só diagnóstico + proposta, nenhum dado alterado.

### Causa dos 327 malformados — identificada

Não é erro de import nem telefone digitado errado. Composição real:

| Categoria | n | Explicação |
|---|---|---|
| Contato só com LID (`phone` termina em `@lid`) | 320 (98%) | O WhatsApp/Z-API não expôs o número de telefone real desse contato — só o LID (identificador interno). Acontece por configuração de privacidade do contato ou por certos tipos de evento. `lead_phone_number` copia o próprio LID, que não é telefone — por isso a extração de DDD corretamente não acha nada. |
| Grupo (`phone` termina em `-group`) | 5 | `is_group=true`, `tipo_registro='GRUPO'` — corretamente sem DDD, grupo não tem telefone individual. Não é erro. |
| Telefone internacional real (não-BR) | 2 | `19706496709` (EUA, código 1) e `351914985449` (Portugal, código 351) — números reais, só não seguem o formato BR (`55`+DDD) que a extração assume. Não é erro, é limitação esperada de uma extração pensada só pra números brasileiros. |

**Nenhum dos 327 é dado corrompido** — é limitação de origem (LID sem telefone exposto) ou
formato não previsto (internacional). Não tem telefone real "escondido" pra recuperar nos
casos de LID — o WhatsApp simplesmente não manda esse dado no payload quando isso acontece.

### Long tail (~130 contatos, dezenas de DDDs, 1-7 cada) — CONFIRMADO como ruído/tráfego legítimo, não contaminação

Amostrei 20 desses contatos com o conteúdo real das mensagens. Resultado: é tráfego real e
legítimo da JS Gráfica — pedidos de impressão ("2,20 em papel ofício", "Imprimi por favor",
"QUAL TAMANHO?"), agradecimentos ("obg", "Obrigado"), e até a **mensagem automática da própria
gráfica** aparecendo no conteúdo ("*J S Gráfica agradece seu contato... Favor escrever sua
mensagem, este WhatsApp não tem áudio... Te atenderemos em seguida*"). Não há nenhum sinal de
conteúdo estranho ao negócio nessa amostra — bem diferente do padrão achado na demanda 001
(janela de maio).

Bônus: descobri que boa parte da própria "diversidade de DDD" que motivou a suspeita é
**também um artefato do fenômeno `@lid`** — destes ~131 contatos com DDD ≠ 81, **108 (82%)**
têm `phone` terminado em `@lid`. Ou seja, o "DDD" mostrado pra eles (ex.: "32", "41", "99") não
é uma região geográfica real — é só um fragmento do número de LID (que é gerado
pseudo-aleatoriamente) caindo na posição onde ficaria o DDD se fosse um telefone de verdade.
Só **23 contatos (18%)** têm telefone real com DDD genuinamente fora de 81 — clientes reais de
outras cidades/estados, conteúdo da amostra consistente com atendimento normal (não investiguei
esses 23 individualmente, não é o que a demanda pediu).

**Conclusão: hipótese de ruído orgânico CONFIRMADA — não é contaminação por outro
negócio/instância.** Only o evento da demanda 001 (janela de maio, já tratado na 008) foi
contaminação de verdade.

### Achado da demanda 008 (número da gráfica como contato de si mesma) — causa

Restava só 1 registro (os outros 3 daquele contato já tinham sido apagados na demanda 008, por
estarem dentro da janela). Esse 1 registro: `from_me=false` **e** `direction=OUTBOUND` (os dois
campos se contradizem), `tipo_evento='ENVIADA'`, `message_text` e `data_timestamp` **nulos**.
Não parece uma conversa real — parece um evento de status (confirmação de entrega/envio) mal
mapeado, provavelmente das workflows `02 - LOG MSG ENVIADAS` ou `03 - STATUS MSG`, que acabou
gravado como se o número da própria gráfica fosse "o contato". É um artefato de log de 1 linha
só, não uma contaminação nem uma conversa. **Causa exata é do lado do n8n — fora do meu
domínio.** Reportando como achado pro 01-N8N, não investiguei mais fundo (a demanda pediu só
"checar rápido").

### Proposta de tratamento

Nenhum dos 327 precisa de correção de dado — não tem telefone real "errado" pra consertar, e
nenhum é sinal de contaminação. Recomendações (não executadas, decisão do PM/Edvam):

1. **Não tratar os 320 `@lid` como erro.** São contatos legítimos sem telefone exposto. Se
   quiser, o 03-APP pode tratar isso na UI (ex.: mostrar "telefone não disponível" em vez de
   DDD vazio) — é decisão de produto, não dado a corrigir.
2. **Os 5 grupos e os 2 internacionais já estão corretos** — nada a fazer.
3. **Long tail (23 com telefone real fora de 81):** são clientes de verdade, não mexer.
4. **Achado da gráfica-de-si-mesma:** sugiro nova demanda pro 01-N8N investigar o mapeamento
   das workflows `02`/`03` que gerou esse 1 registro contraditório — baixa prioridade (é 1
   linha só, no total).
5. Se quiser, posso no futuro rodar uma contagem geral de quantos contatos/mensagens no
   sistema inteiro (não só os 327) têm `phone` terminando em `@lid`, já que isso parece ser um
   padrão normal e recorrente do WhatsApp/Z-API, não específico desse recorte — mas isso é além
   do que essa demanda pediu.

### Critérios de aceite
- [x] Causa dos 327 malformados identificada (LID sem telefone exposto / grupo / internacional
      — nenhum é erro de import)
- [x] Hipótese de ruído orgânico confirmada pro long tail (é tráfego real da gráfica)
- [x] Proposta de tratamento (nenhuma correção de dado necessária; recomendações de UI/produto
      pro 03-APP e 1 achado técnico pro 01-N8N)
