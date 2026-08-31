# 143 — Investigar contato que escapou do backfill da 126 + avaliar varredura periódica

Status: aprovada — liberada
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: —
Chat executor: 02 - DADOS

## Contexto
Testando a Fase 3 (demanda 141) no Inbox, o PM achou um pedido sem cobrança Pix gerada — causa:
o contato usado no teste ("Edvan Filho", `contact_lid: 52063694233823@lid`) ainda tinha
`phone` = LID, apesar de ter **1 número real recuperável e sem ambiguidade** no log (233 eventos,
sempre `5521965185667`) — exatamente o critério que a demanda 126 usou pra corrigir os 438
contatos. Deveria ter sido corrigido, e não foi. O PM já corrigiu esse contato manualmente
(`UPDATE` direto, mesmo padrão da 126) pra destravar o teste.

Também: a contagem de contatos com `phone` = LID subiu de 106 (logo após a 126) pra **180**
agora. Provavelmente é acúmulo natural e esperado — a proteção da 134/135 só evita que um número
BOM já existente seja sobrescrito por LID; ela não corrige contato **novo** cujo primeiro evento
capturado já veio sem número resolvido (não tem "valor bom anterior" pra proteger). Mas precisa
ser confirmado, não assumido.

## Objetivo
1. Entender por que "Edvan Filho" ficou de fora do backfill original da 126 (esse contato já
   existia na época? Estava na lista dos 438? Se sim, por que não foi corrigido?).
2. Confirmar se os 180 atuais são majoritariamente contatos **novos** (criados depois da 126) ou
   se tem contato **antigo** escapando de novo (o que indicaria a 134/135 não está pegando 100%).
3. Avaliar (não necessariamente implementar já) se faz sentido uma varredura periódica agendada
   (ex. semanal) que rode a mesma lógica da 126 nos contatos novos que forem acumulando LID com
   número recuperável — proposta, não implementação, deixar pro PM decidir depois de ver a
   avaliação.

## Escopo
- Incluído:
  1. Investigar o caso específico do "Edvan Filho" — comparar com os critérios usados na 126,
     achar por que ele não bateu.
  2. Rodar a mesma contagem "tem 1 número real recuperável, sem ambiguidade" nos 180 atuais —
     quantos são recuperáveis, quantos são genuinamente sem solução, e quantos desses são
     contatos criados ANTES vs. DEPOIS da correção da 134/135 (usar `data_primeiro_contato` ou
     `criado_em` como corte).
  3. Escrever a avaliação (recomendação, não implementação) sobre varredura periódica — se vale a
     pena, com que frequência, e como implementar (cron/edge function/etc.) — registrar no
     relato pro PM decidir.
- Fora de escopo: implementar a varredura periódica agora (só avaliar). Mexer no workflow do n8n
  de novo (isso já foi resolvido nas 134/135, não repetir).

## Critérios de aceite
- [ ] Causa do miss do "Edvan Filho" identificada
- [ ] Contagem clara: dos 180 atuais, quantos são recuperáveis e quantos genuinamente não têm
      número (mesmo critério da 126)
- [ ] Confirmado se são majoritariamente contatos novos (esperado) ou se tem reincidência de
      contato antigo (indicaria problema na 134/135)
- [ ] Recomendação escrita sobre varredura periódica, sem implementar

## Referências
Demanda 126 (backfill original). Demandas 134/135 (proteção no n8n). Esta conversa (2026-07-09) —
achado ao vivo testando a Fase 3.

## Relato de execução

### 1. Causa do miss do "Edvan Filho" — confirmada com evidência direta, não só inferência

Timeline reconstruída com timestamps reais:
- Meu backfill da demanda 126 rodou por volta de **05:20 UTC** de hoje (09/07) — nesse momento
  "Edvan Filho" tinha número recuperável (187 eventos com `5521965185667` desde janeiro) e foi
  corrigido corretamente junto com os outros 437.
- A proteção no n8n (demandas 134/135) só foi salva às **18:01:50 UTC** — quase **13 horas
  depois**.
- **No meio dessa janela**, às **12:49:13 UTC**, chegou um evento real `from_me: true` pra essa
  conversa com `phone = 52063694233823@lid` — exatamente o padrão que o mapa da 126 já
  suspeitava (mensagem enviada por vocês, às vezes só com o LID). Sem a proteção (que ainda não
  existia), isso sobrescreveu `jsgrafica_contatos.phone` de volta pro LID.
- 3 minutos depois (12:52-12:53 UTC) chegaram mensagens reais do cliente com o número certo
  (`5521965185667`, `from_me: false`) — mas o telefone **não voltou a se corrigir sozinho**,
  ficou preso no LID até o PM corrigir manualmente durante o teste da Fase 3.

**Não foi falha da minha lógica de backfill nem um caso isolado de "contato de teste sendo usado
ao mesmo tempo"** — foi exposição real, durante a janela real entre o backfill e a proteção
entrar no ar. E não foi só esse contato (ver item 2).

### 2. Os 180 atuais — NÃO são majoritariamente novos (contradiz a hipótese inicial)

| | Quantidade |
|---|---|
| Total com `phone` = LID agora | 180 |
| Contatos **antigos** (`data_primeiro_contato` antes da proteção 134/135 entrar no ar, 09/07 12:01 Recife) | **164** |
| Contatos **novos** (criados depois da proteção) | 16 |

Quebra dos 164 antigos:
| | Quantidade |
|---|---|
| Sem nenhum número real recuperável no log | **106** — exatamente os já documentados na 126, sem mudança, esperado |
| **Com número real recuperável (reincidência real)** | **58** |

**58 contatos, não 1** — "Edvan Filho" foi só o primeiro caso encontrado, não um caso isolado.
Todos os 58 provavelmente passaram pela mesma janela de exposição (corrigidos ou já corretos na
126, sobrescritos de volta pro LID por eventos `from_me: true`/sem número resolvido antes da
proteção existir). **Isso é reincidência de contato antigo, não acúmulo natural de contato
novo** — a hipótese inicial do PM não se confirma.

Quebra dos 16 novos (criados DEPOIS da proteção já estar no ar):
| | Quantidade |
|---|---|
| Sem nenhum número real recuperável (esperado, genuinamente novo) | 1 |
| **Com número real recuperável, mesmo já criado depois da proteção** | **15** |

Achado extra, fora do que a demanda pediu pra concluir mas relevante: mesmo **depois** da 134/135
estarem no ar, 15 contatos novos já nasceram com `phone` = LID apesar de já terem evento com
número real no log. Isso sugere que a proteção da 134/135 resolve bem o caso "não sobrescrever
um telefone bom já existente", mas pode não cobrir 100% o caso "criar o contato pela primeira vez
já preferindo o evento com número real, quando os dois chegam próximos". Não confirmei a causa
exata disso no código do n8n (n8n voltou a ficar acessível nesta sessão, mas não abri o workflow
pra essa parte específica — não estava no escopo pedido e o volume é pequeno, 15 contatos em
~13h). Registrando como achado, não como conclusão fechada.

### 3. Recomendação sobre varredura periódica

**Recomendo implementar** (não implementei, só avaliação como pedido), mas por um motivo mais
específico do que "prevenção genérica":
- O grosso do problema (58 reincidências) foi um evento **único e já fechado** — a janela de
  exposição entre a 126 e a 134/135 não existe mais, não é uma sangria contínua.
- Mas o achado do item 2 (15 contatos **novos**, pós-proteção, já nascendo com LID apesar de
  número recuperável) sugere que pode existir uma sangria pequena e contínua, separada da que a
  134/135 já resolveu — e é exatamente esse tipo de caso que uma varredura periódica pegaria de
  forma barata e seguro (mesmo critério já validado 2x: só corrige quando há exatamente 1 número
  real sem ambiguidade).
- **Frequência sugerida**: semanal é razoável e barato — mas dado que 15 casos já se acumularam
  em menos de 13h, se a taxa continuar parecida, uma varredura **diária** teria custo
  desprezível (poucas dezenas de linhas checadas) e manteria a janela de exposição pequena.
  Decisão final de frequência é do PM/Edvam.
- **Implementação sugerida**: Supabase Edge Function agendada (`pg_cron` ou Vercel Cron
  chamando uma rota interna) rodando a mesma query idempotente desta demanda/da 126 — reforço:
  idempotente, então rodar em contato já correto não faz nada, seguro de agendar sem medo de
  dano se rodar mais vezes que o necessário.
- Também recomendo (separado da varredura, decisão do PM): **corrigir os 58 reincidentes já
  identificados agora**, usando o mesmo método já aprovado e testado 2x na 126 — não fiz isso
  aqui porque o escopo desta demanda era só diagnóstico ("achar", "contar", "avaliar", não
  "corrigir"), mas fica pronto pra executar assim que autorizado (baixo risco, mesmo critério
  já validado com envio real).

### Achados fora do escopo
- Os 15 novos com número recuperável mesmo pós-134/135 (ver item 2) — não investiguei a causa
  exata no n8n, só quantifiquei. Se quiserem certeza total da causa, precisa abrir o workflow
  de novo (não fiz, por estar fora do pedido explícito desta demanda e o volume ser pequeno).

### Status final
**Concluída.** Causa do miss do "Edvan Filho" confirmada com evidência direta (não só
inferência). Contagem clara dos 180: 106 já conhecidos (sem número), 58 reincidência real
(número recuperável, contato antigo — contradiz a hipótese de "acúmulo esperado"), 15 novos
com achado extra, 1 genuinamente novo sem dado. Recomendação de varredura periódica escrita,
não implementada, como pedido.
