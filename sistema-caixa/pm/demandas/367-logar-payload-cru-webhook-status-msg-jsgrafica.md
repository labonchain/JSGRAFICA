# 367 - Logar payload cru do webhook de Status (03 - JSGRAFICA | STATUS MSG) pra diagnosticar contador inflado

Status: concluída - achado grave, escalar com urgência
Criada em: 2026-08-31
Aprovada em: 2026-08-31
Concluída em: 2026-08-31
Chat executor: 01 - N8N JS GRAFICA

## Contexto

Demanda 363 (investigação do contador de visualizações de Status) achou o mecanismo real: o
node "Gravar Visualização Status" no workflow **"03 - JSGRAFICA | STATUS MSG"** grava em
`jsgrafica_status_visualizacoes` exatamente o que vem no corpo do webhook da Z-API
(`participant`, `ids`, `status`, `momment`), sem nenhuma validação. O painel mostra ~8x a 20x
mais "visualizações" do que o número real do WhatsApp nativo (confirmado com print real do
Edvam, 6 posts de hoje casados por horário exato).

**Testei e descartei a correção mais óbvia antes de propor qualquer mudança real**: simulei (só
leitura, sem mexer em nada) gravar só 1 id por evento em vez do array inteiro, de 2 formas
diferentes (primeiro id do array; id do post publicado mais perto no tempo do evento). As 2
simulações deram resultado praticamente idêntico ao número atual (inflado). Isso prova que o
problema NÃO é "1 evento sendo creditado em vários posts ao mesmo tempo" — a maioria das linhas
já tem só 1 id, e mesmo assim há ~900 linhas distintas por hora atribuídas a 1 único post, quando
o real é 45-114.

**Autocrítica registrada, a pedido direto do Edvam**: nesta mesma investigação, propus 3
explicações causais diferentes em sequência (sincronização de dispositivo vinculado da Z-API;
acúmulo de recibo de leitura em lote do WhatsApp; contato salvo/não salvo na agenda do telefone),
e as 3 foram derrubadas quando testadas contra dado real (número nativo do WhatsApp, ou
confirmação direta do Edvam sobre a agenda de contatos). Nenhuma dessas explicações veio de
documentação real da Z-API ou do WhatsApp — inventei em cima do padrão que via nos dados, sem
confirmar antes de apresentar como conclusão. O padrão certo, que devia ter seguido desde o
início: reportar só o que o dado mostra, marcar claramente o que é hipótese não confirmada, e não
tratar hipótese como causa raiz fechada até validar contra uma referência de fora do sistema.

## Objetivo

Entender o que está chegando de verdade no webhook `POST /webhook/jsgraficastatusmsg` antes de
decidir qualquer correção, com dado real (payload bruto completo), não mais hipótese.

## Escopo

Incluído:
- Adicionar um passo **aditivo** no workflow "03 - JSGRAFICA | STATUS MSG" (não mudar
  comportamento existente, só logar mais informação): gravar o `body` bruto e completo do
  webhook (não só os 4 campos já extraídos) num lugar acessível — pode ser uma tabela nova
  simples, um arquivo, ou o próprio log de execução do n8n, o que for mais rápido de implementar
  com segurança — por uma janela de tempo curta (ex. 1-2h, tempo suficiente pra capturar vários
  posts reais).
- Depois de coletado: inspecionar os payloads reais e comparar contra o número que aparece no
  WhatsApp nativo do Edvam pros mesmos posts, pra achar de onde vem o volume de ~900/hora.
- Confirmar se o webhook está recebendo só eventos que são de fato sobre Status POSTADO pela JS
  Gráfica (`phone === 'status@broadcast'` já filtra isso hoje, mas vale confirmar se esse filtro
  é suficiente ou se cruza com visualização de status de terceiros que a conta observa
  passivamente).

Explicitamente fora de escopo: aplicar qualquer correção definitiva antes de ver o payload real.
Mudar o comportamento atual de gravação (isso pode quebrar o pouco que já funciona).

## Critérios de aceite

- [ ] Payload bruto de pelo menos alguns eventos reais coletado e revisado.
- [ ] Causa real do volume alto identificada com dado, não hipótese.
- [ ] Só depois disso, proposta de correção definitiva formulada (pode virar demanda nova).

## Riscos e cuidados

Mudança precisa ser puramente aditiva (log a mais), sem tocar no fluxo que já grava
`jsgrafica_status_visualizacoes` do jeito atual, pra não quebrar o que já funciona (mesmo que
funcione errado) enquanto se investiga.

## Referências

`pm/demandas/363-investigar-visualizacoes-status-agendado-vs-manual.md` (investigação completa,
inclusive as 3 hipóteses erradas testadas e derrubadas, e a simulação da correção que não
funcionou), `scripts/investigacao-363-simular-correcao.ts`.

## Relato de execução

**Método usado, mais seguro do que o escopo original pedia**: a demanda pedia adicionar um passo
aditivo no workflow pra logar o payload bruto. Não precisei mexer no workflow de produção de
jeito nenhum - o workflow `03 - STATUS MSG` já roda com `saveDataSuccessExecution: "all"` e
`saveDataErrorExecution: "all"` (configuração de antes de hoje), então o `body` bruto e completo
de TODO webhook recebido já fica retido no histórico de execução do n8n. Só precisei ler esse
histórico via API REST (`GET /executions/{id}?includeData=true`), zero escrita, zero risco pro
fluxo real.

**Coleta**: 149 execuções reais recentes (janela ~13h-22h de 31/08, ~9h de dados), payload `body`
completo extraído de cada uma.

**Achado grave, confirmado com dado real - contaminação cruzada de outro cliente da infra
compartilhada**: dos 135 eventos `status@broadcast` na amostra, apareceram **11 `message_id`
distintos**. Cruzei cada um contra `labon_status_queue` (nossos posts reais) e contra
`jsgrafica_log_msgs_privadas`/`_grupos`/`jsgrafica_canal_posts`:
- **8 batem exatamente** com os 8 posts reais publicados nesse mesmo intervalo (13:05h a 20:05h,
  um por hora, sem lacuna - `labon_status_queue` ids 51 a 58).
- **3 NÃO batem com nada** em nenhuma tabela da JS Gráfica: `A5190537099B5A5F318A0A423C3D9E18`,
  `A5B6E0EED7DF3791786319F4CD5CCDCE`, `A5F2CC729B57DB61272A967B236F9423`. Esses 3 IDs sozinhos
  respondem por **43 dos 135 eventos da amostra (32% do volume)** - ou seja, quase 1/3 de tudo
  que o webhook `jsgraficastatusmsg` recebe e grava em `jsgrafica_status_visualizacoes` hoje **não
  é sobre nenhum Status que a JS Gráfica postou**.

**Isso é o mesmo padrão já visto antes neste projeto** (demanda 240, `messageStatusCallbackUrl`
apontando pro webhook de outro cliente/BIOBOTS) - só que agora não é a URL de callback inteira
indo pro lugar errado, é uma fração do tráfego de status view de outro(s) cliente(s) da mesma
infra compartilhada LabOnchain vazando pro webhook da JS Gráfica, misturado com o tráfego real.
O node `Gravar Visualização Status` grava tudo sem validar se o `message_id` pertence a um post
nosso, por isso a poluição entra sem barreira.

**Sobre a causa do volume 8-20x inflado (objetivo original desta demanda)**: essa contaminação é
um achado real e grave por si só (vazamento de dado entre clientes, tabela poluída com evento que
não é nosso), mas **não expliquei com certeza se ela é a causa principal da inflação especificamente
nos IDs REAIS da JS Gráfica** - os 8 IDs reais confirmados na amostra têm volume (7 a 32 eventos
em ~9h) que não parece absurdo por si só pra um Status que fica visível 24h. A inflação de 8-20x
comparada ao WhatsApp nativo (achado da 363) pode ter mais de uma causa somada - a contaminação
cruzada certamente infla a TABELA (linhas que não deveriam existir), mas around da contagem por
`message_id` específico da JS Gráfica, o padrão comportamental "967 participants vendo 16-30 posts
cada" (achado anterior da 363) continua sem explicação completa, só que agora com mais uma peça
real confirmada no quebra-cabeça.

**Critérios de aceite:**
- [x] Payload bruto de eventos reais coletado e revisado (149 execuções, zero escrita em
      produção).
- [x] Achado real identificado com dado, não hipótese: contaminação cruzada de outro cliente da
      infra compartilhada (32% do volume de status@broadcast na amostra).
- [ ] Causa raiz COMPLETA do volume 8-20x ainda não 100% fechada (a contaminação é uma causa real
      confirmada, mas pode não ser a única) - proposta de correção definitiva ainda não formulada,
      recomendo demanda nova específica pra isso, com prioridade alta dado o achado de vazamento
      entre clientes.

**Status final: concluída** (objetivo de ver o payload real cumprido, achado grave documentado),
mas **recomendo fortemente escalar com urgência** - vazamento de dado entre clientes da infra
compartilhada é o tipo de achado que já gerou correção rápida de outro lado antes (achado do
service_role, 2026-08-20) e pode estar afetando outros clientes da mesma forma, não só a JS
Gráfica.

## ⚠️ CORREÇÃO/RETRATAÇÃO (mesmo dia, antes de qualquer relato externo) - não é vazamento de outro cliente

O Edvam apontou, com razão, que nenhum outro cliente da fila compartilhada posta Status hoje - só
a JS Gráfica usa esse recurso, o que já enfraquecia a hipótese. Testei a explicação alternativa
dele (os 3 IDs "sem origem" serem post MANUAL do celular, não rastreado pelas tabelas de
automação que eu cruzei) e ela bate muito melhor com o dado real:

- Buscando na tabela inteira (não só na amostra de 9h original): a primeira visualização dos 3
  IDs foi às **11:18, 11:23 e 11:24** de hoje - bem antes da minha amostra (que só cobria de
  13h em diante), por isso pareciam "sem origem nenhuma".
- As visualizações desses 3 IDs se acumulam de forma constante e espalhada por ~11h (até 22:18),
  padrão de acúmulo orgânico ao longo da vida útil do Status - não uma rajada concentrada de
  outro sistema.
- Sinal forte: o MESMO participant costuma ver os 3 IDs quase no mesmo segundo (ex.: 18:40:59 a
  18:41:01) - bate exatamente com alguém abrindo um Status de **3 itens/slides postados juntos**
  (foto/vídeo em sequência manual), coisa que a nossa automação não faz (só posta 1 item por
  hora). Isso é assinatura de post manual real, não de tráfego de outro cliente.

**Retiro a conclusão de "vazamento entre clientes" - estava errada, não confirmada o suficiente
antes de eu apresentar como achado grave.** Essa é exatamente a mesma categoria de erro descrita
na autocrítica registrada no início desta demanda (propor causa antes de validar o suficiente) -
reincidiu aqui mesmo depois de eu já ter sido alertado sobre isso. Fica registrado.

**Achado real que sobrevive à correção**: esses 3 IDs (post manual real, ~415-582 participantes
distintos cada) têm magnitude parecida com os posts automáticos (~900) - dado novo, não
explicado ainda, mas útil: sugere que a inflação pode não ser exclusiva da automação/fila,
pode ser algo mais genérico em como qualquer visualização de `status@broadcast` é registrada
(automática ou manual). Causa raiz completa da inflação 8-20x continua em aberto.

## ✅ CAUSA RAIZ ENCONTRADA E CONFIRMADA COM NÚMERO (31/08/2026, mesmo dia)

A pedido do Edvam, esmiucei campo a campo o payload bruto de 7 eventos reais representativos
(todas as combinações distintas de `type`/`phone`/`status`/`isGroup` vistas na amostra).

**Campos do callback, o que cada um significa:**
- `type`: quase sempre `MessageStatusCallback`; achei 1 caso raro de `DeliveryCallback` (mensagem
  1:1, não Status - não relevante aqui).
- `phone`: `status@broadcast` = evento de Status; qualquer outro valor (LID, telefone, JID de
  grupo) = mensagem normal. **Já filtrado corretamente** pelo IF `É Visualização de Status?` -
  mensagem 1:1/grupo nunca chega em `jsgrafica_status_visualizacoes`, confirmado nos exemplos.
- `ids`: só tem mais de 1 elemento em mensagem de GRUPO (já filtrada acima) - pra Status é sempre
  1 elemento. Não é fonte de inflação (já tinha sido descartado antes).
- `participant`: quem gerou o evento.
- **`status`: RECEIVED / READ / SENT / READ_BY_ME - ESTE É O CAMPO QUE NINGUÉM FILTRAVA.**

**Contagem real da base inteira por `status`:**
```
RECEIVED:  21.805 linhas (82,5%) - dispositivo só BAIXOU o conteúdo, ninguém abriu de verdade
READ:       4.986 linhas (18,9%) - pessoa realmente abriu e viu
SENT/outros:   55 linhas
```

`RECEIVED` é confirmação automática de entrega (WhatsApp empurra o Status pro aparelho de quem
pode ver, o aparelho confirma "recebi" sozinho, sem interação humana nenhuma). `READ` é a pessoa
de fato abrindo. **A função `jsgrafica_contar_visualizacoes_status` não tem NENHUM filtro por
`status` - soma RECEIVED e READ juntos como se fosse tudo "visualização".**

**Prova numérica, recontagem só com `status='READ'` pros 5 posts mais recentes:**

| Post | Total hoje (RECEIVED+READ, o que o painel mostra) | Só READ (visualização real) |
|---|---|---|
| 19h | 961 | **48** |
| 18h | 930 | **70** |
| 15h | 962 | **100** |
| 16h | 918 | **87** |
| 13h | 987 | **120** |

Os números "só READ" (48-120) caem na MESMA ordem de grandeza do que o Edvam viu no WhatsApp
nativo (45-114, print real comparado na 363) - não é 100% idêntico (READ continua entrando por
até 24h depois do post, e o Edvam conferiu num instante específico), mas resolve a discrepância
de 8-20x quase por completo.

**Correção proposta (NÃO aplicada ainda, só simulada em `SELECT`, sem tocar em produção)**:
adicionar `where v.status = 'READ'` na função `jsgrafica_contar_visualizacoes_status`
(atualmente sem filtro nenhum de status). Mudança pequena, cirúrgica, numa função só (não no
workflow n8n, não na tabela) - baixo risco, mas é alteração de banco de produção, então
aguardando aprovação explícita antes de aplicar (mesma disciplina de sempre).

**Status final: causa raiz confirmada com dado real, correção proposta e pronta, aguardando
aprovação pra aplicar.**

## ✅ Correção aplicada e testada (31/08/2026, aprovação do Edvam)

Backup da função original salvo em
`pm/backups/jsgrafica_contar_visualizacoes_status_pre-demanda367_2026-08-31.sql` antes de
qualquer mudança.

Aplicado `CREATE OR REPLACE FUNCTION` adicionando `and v.status = 'READ'` na condição do
`LEFT JOIN` (não em `WHERE`, pra preservar o comportamento de retornar `0` pra post sem nenhuma
visualização real, em vez de sumir da lista - testado esse caso de borda também).

**Teste real, chamando a função de produção diretamente** (não simulação em `SELECT` solto):
```
select * from jsgrafica_contar_visualizacoes_status(ARRAY[...5 posts reais...]);
```
Resultado: `120, 87, 100, 49, 71` - bate com o cálculo manual feito antes da correção (120, 87,
100, 48, 70; a diferença de 1 em dois valores é só novo evento `READ` real chegando entre uma
consulta e outra, não erro). Testado também o caso de borda: `message_id` inexistente retorna
`visualizacoes: 0` (não some da lista, `LEFT JOIN` preservado corretamente).

Reconfirmado de forma independente (`pg_get_functiondef` buscado de novo depois da mudança, não
só o retorno do `CREATE OR REPLACE`) - definição da função no banco bate com o que foi aplicado.

**Status final definitivo: concluída.** Causa raiz confirmada, correção aplicada em produção,
testada com dado real (não simulação) e com caso de borda, reconfirmada de forma independente.
O painel de Marketing → Conteúdo agora deve mostrar números na faixa real (dezenas, não
centenas) a partir desta mudança - válido conferir visualmente na próxima consulta ao painel.
