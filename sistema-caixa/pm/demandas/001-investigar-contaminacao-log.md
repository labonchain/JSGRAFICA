# 001 — Investigar contaminação do log histórico

Status: concluída (diagnóstico)
Criada em: 2026-07-02
Aprovada em: — (despachada direto pelo Edvam, sem passar pela etapa formal de aprovação)
Concluída em: 2026-07-02
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Achado em `pm/investigacoes/2026-07-02-integracao-whatsapp-zapi-n8n.md`: ~23% dos 1.987
contatos em `jsgrafica_contatos` têm DDD fora de 81 (Recife). Amostra real de mensagens de
04/05/2026 mostra conversas sem relação nenhuma com gráfica rápida (bot de controle de gastos
pessoais, negociação de produção/logística RJ↔SP). Causa raiz ainda não confirmada — hipótese
mais provável é reuso da mesma instância Z-API para outro número/projeto em algum momento,
mas não é fato.

## Objetivo
Determinar a origem/causa da contaminação e dimensionar o problema (quanto do dado é
realmente estranho à JS Gráfica), sem ainda decidir o que fazer com o dado contaminado.

## Escopo
- Incluído: analisar padrões em `jsgrafica_contatos` e `jsgrafica_log_msgs_privadas`/`_grupos`
  por DDD, por período (`data_timestamp`), e por conteúdo; verificar se existe algum campo no
  payload Z-API (ex.: `instance_id`, `phone` da instância, `session`) que aponte a origem;
  produzir estimativa quantificada de % contaminado por período.
- Fora de escopo: apagar, mover, arquivar ou alterar qualquer dado. Decidir política de
  limpeza é demanda futura, depois que o relatório for aprovado.

## Critérios de aceite
- [ ] Relatório com estimativa quantificada de contaminação (por período e/ou por padrão)
- [ ] Hipótese de causa raiz (ou declaração explícita de "não determinável com os dados
      disponíveis")
- [ ] Recomendação de próximos passos (sem executar) para o PM levar ao Edvam

## Riscos e cuidados
Nenhuma mudança de dado nesta demanda — é só leitura/análise.

## Referências
Tabelas: `jsgrafica_contatos`, `jsgrafica_log_msgs_privadas`, `jsgrafica_log_msgs_grupos`,
`jsgrafica_agent_config`. Ver `pm/HISTORICO.md` e `pm/investigacoes/2026-07-02-*.md`.

## Relato de execução

**Status: concluída** (chat executor: 02 - DADOS). Investigação só de leitura — nenhum dado
alterado. Nota: o arquivo estava com status `proposta`; o Edvam despachou a tarefa direto no
chat (permitido pelo `pm/README.md`), então executei sem esperar o campo mudar pra `aprovada`.

### O que foi feito

1. Conferi schema ao vivo (`list_tables` verbose) de `jsgrafica_contatos`,
   `jsgrafica_log_msgs_privadas`, `jsgrafica_log_msgs_grupos`, `jsgrafica_agent_config` — achei
   os campos `instance_id` e `connected_phone` presentes nas 3 tabelas de dado (exatamente o
   que a demanda pediu para checar).
2. Agrupei `jsgrafica_log_msgs_privadas` e `_grupos` por `(instance_id, connected_phone)` com
   min/max de `data_timestamp` — revelou uma janela isolada com número conectado diferente.
3. Cruzei `lead_phone_ddd` por mês em `jsgrafica_log_msgs_privadas` e por mês
   (`data_primeiro_contato`) em `jsgrafica_contatos`.
4. Amostrei `message_text` dentro da janela suspeita para confirmar o conteúdo.

### Causa raiz — CONFIRMADA (não é mais hipótese)

Entre **2026-05-03 03:58:40 UTC e 2026-05-04 12:58:01 UTC (~33h)**, a mesma instância Z-API
da gráfica (`instance_id = 3EFA4C62C755F07164E46237BF5854B6`) apareceu logada com
`connected_phone = 5521965185667` (DDD 21, RJ) em vez do número real da gráfica
(`558186108547`, DDD 81). **Esse número (`5521965185667`) é exatamente o mesmo hardcoded
como `AUTORIZADOS` no nó "IDENTIFICAR AUTORIZAÇÃO" do workflow n8n `01`** (achado da
investigação de 2026-07-02) — ou seja, é quase certamente um número pessoal/de teste do
próprio Edvam (ou de quem administra o bot), usado para reconectar/testar a instância, e não
uma outra empresa reaproveitando a mesma infraestrutura por acaso.

Durante essa janela, o workflow de log (`01 - LOG MSG RECEBIDAS`) capturou **todo** o tráfego
desse número indiscriminadamente — não só conversas relacionadas à gráfica. Conteúdo
confirmado na amostra: um lembrete de remédio, e uma conversa extensa sobre um produto/curso
de "encontros" com links de Google Docs/Drive, sem nenhuma relação com gráfica rápida.
Confidence: **alta** (correlação exata instance+connected_phone+janela temporal+conteúdo).

### Estimativa quantificada

Duas causas distintas contribuem pro "23% de DDD fora de 81" — não é um fenômeno só:

| Origem | Tabela | Volume | % do total |
|---|---|---|---|
| Janela de reconexão 03–04/05 (`connected_phone=5521965185667`) | `log_msgs_privadas` | 106 msgs / 12 contatos distintos | 0,3% das 34.291 msgs |
| Mesma janela | `jsgrafica_contatos` (criados em mai/2026) | 8 contatos | 0,4% dos 1.987 contatos |
| "Long tail" difuso (dezenas de DDDs, 1–7 ocorrências cada, jan–abr/2026) | `jsgrafica_contatos` | ~130 contatos | ~6,5% dos 1.987 |
| DDD não-parseável (`lead_phone_ddd` NULL) | `jsgrafica_contatos` | 327 contatos | 16,5% dos 1.987 |
| DDD 81 (Recife) | `jsgrafica_contatos` | 1.523 contatos | 76,7% dos 1.987 |
| `jsgrafica_log_msgs_grupos` fora de DDD 81 | `log_msgs_grupos` | 4 msgs (DDD 21/40/50/79, 1 cada) | 1,4% das 284 msgs — desprezível, nenhuma bate com a janela de 03–04/05 |

**Leitura importante:** o evento de reconexão de 03–04/05 é real, confirmado e concentrado,
mas é pequeno (106 msgs, 12 contatos) — **não** explica a maior parte dos 465 contatos
"não-81". A maior fatia desse número (~327 contatos, 16,5%) é telefone malformado/não
parseável — problema de qualidade de dado, não de instância reaproveitada. O restante
(~130 contatos) é um "long tail" espalhado por dezenas de DDDs diferentes de todo o Brasil,
quase todos com 1 único contato cada, ao longo de jan–abr/2026 — padrão inconsistente com
reuso de instância (que produziria um bloco concentrado, como o de maio). É mais provável
que seja ruído orgânico de WhatsApp Business (números errados, alcance de divulgação,
membros de grupo) — **não determinável com certeza com os dados disponíveis**, mas não há
evidência de que seja o mesmo tipo de contaminação do evento de maio.

### Recomendação de próximos passos (não executado, é decisão do PM/Edvam)

1. Confirmar com o Edvam se `5521965185667` é mesmo número pessoal/de teste dele — se sim,
   a causa está resolvida e vira só decisão de limpeza (o que fazer com os 106
   registros/12 contatos daquela janela).
2. Demanda futura (02-DADOS): decidir e executar política de limpeza para os registros da
   janela 03–04/05 (marcar, arquivar ou excluir) — não fiz isso aqui, é fora de escopo desta
   demanda.
3. Achado fora do escopo, sugiro nova demanda para **01-N8N**: o workflow `01` deveria
   comparar `connected_phone` contra o número oficial da gráfica antes de logar/rotear,
   pra evitar recontaminação em futuras reconexões de teste.
4. Tratar os 327 contatos com DDD não-parseável como demanda de qualidade de dado separada
   (não confundir com "contaminação de outro negócio").
5. Se quiser mais certeza sobre o "long tail" de jan–abr, uma futura investigação pode
   amostrar mensagens desses ~130 contatos individualmente — não fiz isso aqui por estar
   fora do que a demanda pediu (foco era achar a causa da contaminação relatada, que já foi
   confirmada no evento de maio).

### Achado fora do escopo (não resolvido, só relatado)

O campo `connected_phone` só começou a ser preenchido a partir de ~25/03/2026 — antes disso
(19.143 + 7.679 = 26.822 mensagens de jan–mar, ~78% do total) o campo é `NULL`, então não dá
pra confirmar via esse campo que o número conectado era o real da gráfica naquele período.
Não há evidência de que não fosse, mas também não há como provar via este campo — registrar
como limitação de dado, não como suspeita.
