# 135 — n8n: proteger `lead_phone`/`lead_phone_ddd`/`lead_phone_number` contra LID também

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 01 - N8N

## Contexto
A demanda 134 protegeu a coluna `phone` de `jsgrafica_contatos` contra sobrescrita por LID. O
próprio relato da 134 registrou um achado fora do escopo: `lead_phone`, `lead_phone_ddd` e
`lead_phone_number` (mesma tabela) têm o mesmo problema em potencial — são calculados no node
"Processar Evento" (antes de "PREPARAR LOG CONTATOS") a partir do `phone` bruto do evento, sem
nenhuma proteção, e passam direto (`lead_phone: data.lead_phone` etc.) no output de "PREPARAR LOG
CONTATOS".

O Edvam pediu (2026-07-09) resolver isso junto, já que é baixo risco: esses 3 campos não são
lidos por nenhuma rota do Next.js hoje (confirmado no mapa da 126), então corrigir agora evita que
o mesmo problema apareça silenciosamente se algum dia alguém passar a usá-los.

## Objetivo
`lead_phone`/`lead_phone_ddd`/`lead_phone_number` nunca ficam derivados de um valor LID quando já
existe um número bom conhecido pro contato.

## Escopo
- Incluído:
  1. No node **"PREPARAR LOG CONTATOS"** (mesmo da 134), trocar a origem desses 3 campos: em vez
     de vir direto de `data.lead_phone`/`data.lead_phone_ddd`/`data.lead_phone_number` (calculados
     a partir do `phone` bruto, sem proteção), derivar a partir do **`phoneFinal`** já protegido
     (a mesma variável criada na 134) — ex.: extrair DDD e número de `phoneFinal` diretamente
     nesse node, em vez de confiar no valor pré-calculado rio acima.
  2. Não mexer no node "Processar Evento" nem em nenhum outro workflow.
- Fora de escopo: qualquer coisa que não seja esses 3 campos.

## Critérios de aceite
- [ ] `lead_phone`/`lead_phone_ddd`/`lead_phone_number` derivados de `phoneFinal`, não do valor
      bruto do evento
- [ ] Testado com o mesmo cenário da 134 (evento LID pra contato que já tinha número bom): os 3
      campos continuam batendo com o número real, não viram LID
- [ ] Sem regressão pra contato novo (número real desde o primeiro evento)

## Referências
Demanda 134 (achado original, mesmo node). Demanda 126 (confirma que esses 3 campos não são lidos
por nenhuma rota hoje — risco baixo de corrigir agora).

## Relato de execução

**Status final: concluída**

### O que foi feito
No node `PREPARAR LOG CONTATOS` (mesmo da 134), logo depois da declaração de `phoneFinal`,
adicionado:

```js
const leadPhoneFinal = phoneFinal;
const leadPhoneDddFinal = leadPhoneFinal ? String(leadPhoneFinal).substring(2, 4) : null;
const leadPhoneNumberFinal = leadPhoneFinal ? String(leadPhoneFinal).substring(4) : null;
```

E troquei o output de `lead_phone: data.lead_phone` / `lead_phone_ddd: data.lead_phone_ddd` /
`lead_phone_number: data.lead_phone_number` pra usar `leadPhoneFinal`/`leadPhoneDddFinal`/
`leadPhoneNumberFinal`. Não toquei em `Processar Evento` nem em nenhum outro node/workflow.

### Teste — mesmo cenário da 134 (e achado interessante)
Usei o mesmo contato da 134 (`558184860661`, "Douglas Ridrigues", `contact_lid:
15995095789640@lid`). Ao conferir o estado **antes** de aplicar o fix, esse contato já estava
com os 3 campos corrompidos (`lead_phone: "15995095789640@lid"`, `lead_phone_ddd: "99"`,
`lead_phone_number: "5095789640@lid"`) — efeito colateral do meu próprio teste da demanda 134
(naquela hora `phone` já estava protegido, mas esses 3 campos ainda não).

Depois do fix, repeti o mesmo evento sintético (`fromMe:true`, `phone` chegando como
`15995095789640@lid`) e os 3 campos vieram corretos: `lead_phone: "558184860661"`,
`lead_phone_ddd: "81"`, `lead_phone_number: "84860661"` — batendo com o `phone` real. Ou seja,
o fix não só impede novo dano, como **autocorrigiu** a corrupção que já existia nesse contato,
no primeiro evento novo que chegou.

**Regressão:** contato novo sintético com telefone real — `lead_phone`/`lead_phone_ddd`/
`lead_phone_number` calculados certos (`558xxxxxxxxx`/`81`/`900000302`), sem nenhuma proteção
bloqueando o caminho normal.

Limpei os dados sintéticos depois. Restaurei os contadores do contato real
(`total_mensagens_enviadas`, `total_interacoes`, `data_ultimo_contato`) ao valor de antes do
teste — mas **mantive** `lead_phone`/`lead_phone_ddd`/`lead_phone_number` corrigidos (não
reverti pro valor corrompido, já que o certo é o valor bom mesmo).

### Critérios de aceite
- [x] `lead_phone`/`lead_phone_ddd`/`lead_phone_number` derivados de `phoneFinal`, não do valor
      bruto do evento
- [x] Testado com o mesmo cenário da 134: os 3 campos continuam batendo com o número real
- [x] Sem regressão pra contato novo
