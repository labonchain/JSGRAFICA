# 265 — Integrar relatório "Dinheiro em Conta" do Mercado Pago (extrato completo)

Status: concluída (destravou sozinha em 2026-08-02 — ver "Atualização 2026-08-02" no Relato)
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-02
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
Urgente — bloqueando a conciliação de julho em andamento com o Edvam. `lib/mercadopago.ts` hoje
só integra `GET /v1/payments/search` (`buscarPagamentos`, demanda 084) — mostra só **pagamentos
recebidos**, nunca taxa, saque, transferência ou qualquer coisa que tira dinheiro da conta. Isso
deixou vários dias de julho (20, 21, 24, 31/07) com um "buraco" grande no saldo do Mercado Pago
que a conciliação automática (227/228) não consegue explicar, porque a origem provável é do lado
de saída/taxa, que o sistema nunca viu.

Pesquisa confirmou que existe uma API real do Mercado Pago que cobre isso: o relatório **"Dinheiro
em Conta"** (`settlement_report`), documentado em
`https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/reports/account-money/api`.
Segundo a doc, ele mostra "pagamentos recebidos, saques, taxas, transferências e outras
operações" — o extrato completo que falta.

**Fluxo da API (assíncrono, confirmado na doc):**
1. `POST /v1/account/settlement_report` com `begin_date`/`end_date` (ISO 8601) — cria o relatório,
   responde `202 Accepted` (processamento em background). Parâmetros opcionais úteis:
   `include_withdraw`, `show_fee_prevision`, `refund_detailed`.
2. `GET /v1/account/settlement_report/list` — consulta os relatórios já gerados (pra saber quando
   ficou pronto).
3. `GET /v1/account/settlement_report/:file_name` — baixa o arquivo do relatório pronto.

## Objetivo
Integrar essas 3 chamadas em `lib/mercadopago.ts` e disponibilizar o resultado de forma que dê
pra consultar o extrato completo de um dia/período específico — ao vivo, sem eu (PM) precisar
tocar no token de acesso diretamente.

## Escopo
- Incluído: 3 novas funções em `lib/mercadopago.ts` (reaproveitando `mpFetch`, já genérica):
  `criarRelatorioDinheiroEmConta(beginDate, endDate)`, `listarRelatoriosDinheiroEmConta()`,
  `baixarRelatorioDinheiroEmConta(fileName)`.
- Incluído: uma forma de usar isso pra um dia específico — pode ser um script novo em `scripts/`
  (mesmo padrão dos scripts de investigação já existentes no projeto) que gera o relatório,
  espera ficar pronto (poll no `/list`), baixa e mostra as movimentações de um `data_dia`
  específico em formato legível — usado agora pra investigar 20, 21, 24 e 31 de julho.
- Incluído: confirmar no relatório baixado se ele realmente cobre taxas/saques/transferências
  (validar contra um dia real, ex. 24-07-26, que já sabemos ter uma queda grande e real de saldo)
  — reportar o achado real, não presumir que a doc está certa sem checar.
- Considerar (se o tempo permitir): expor isso como endpoint na tela "💳 Mercado Pago" (Financeiro)
  também, complementando a demanda 264 — mas o urgente agora é o script pra desbloquear a
  conciliação de julho, a tela pode ficar pra depois.
- Explicitamente fora de escopo: qualquer mudança na lógica de conciliação (227/228) — essa
  integração é só de consulta/visualização do extrato real, pra informar decisões manuais.

## Critérios de aceite
- [ ] As 3 chamadas de API funcionando (criar, listar, baixar relatório)
- [ ] Consegue ver o extrato completo (entrada e saída) de pelo menos um dia real de julho —
      idealmente 20, 21, 24 e 31/07, os dias travados na conciliação
- [ ] Reportado com evidência real se o relatório realmente mostra taxa/saque/transferência (não
      só pagamento recebido) — se não mostrar, avisar imediatamente, não afirmar que resolveu sem
      checar

## Riscos e cuidados
Urgente, mas não precisa ser feito com pressa que gere erro — o PM está esperando pra continuar a
conciliação ao vivo com o Edvam assim que sair. Nunca expor o token de acesso em log/output.

## Referências
`lib/mercadopago.ts` (`mpFetch`, `buscarPagamentos`, demanda 084). Doc real:
https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/reports/account-money/api

## Relato de execução

**Status final: bloqueada.** As 3 chamadas pedidas (+1 achada como pré-requisito real) estão
implementadas, testadas e no ar. Mas o critério de aceite mais importante — **confirmar com
evidência real que o relatório mostra taxa/saque/transferência** — não foi possível cumprir: a
geração do relatório nunca terminou de processar do lado do Mercado Pago, em 2 tentativas
diferentes, aguardando mais de 15 minutos numa e mais de 2 minutos e meio na outra. Não afirmo que
resolveu — é isso mesmo que a demanda pediu pra fazer nesse cenário.

### 1. O que foi implementado (`lib/mercadopago.ts`)
- `criarRelatorioDinheiroEmConta(beginDate, endDate)` — `POST /v1/account/settlement_report`.
- `listarRelatoriosDinheiroEmConta()` — `GET /v1/account/settlement_report/list`.
- `baixarRelatorioDinheiroEmConta(fileName)` — `GET /v1/account/settlement_report/:file_name`.
  Não reaproveita `mpFetch` porque a resposta é **CSV cru, não JSON** (confirmado com dado real —
  a doc já avisava, aqui só reforço que testei).
- `garantirConfigRelatorioDinheiroEmConta()` (achado, não estava no escopo original, mas sem ela
  nada funciona): `POST /v1/account/settlement_report/config`, chamada automaticamente por
  `criarRelatorioDinheiroEmConta` antes de criar o relatório, só se `GET .../config` ainda não
  existir (idempotente).
- Script `scripts/investigacao-265-relatorio-dinheiro-conta.ts` (`npx tsx
  scripts/investigacao-265-relatorio-dinheiro-conta.ts DD-MM-AA [DD-MM-AA ...]`), pronto pra rodar
  de novo assim que o Mercado Pago destravar a geração — cria, espera por `status` (não por
  presença na lista, ver achado abaixo), baixa e mostra a distribuição por `TRANSACTION_TYPE` mais
  as primeiras 20 linhas legíveis. Nunca imprime o token — usei um script de debug separado
  (apagado depois de diagnosticar, não ficou no repo) até confirmar isso.
- `npx tsc --noEmit` e `npm run build` limpos. Deploy em produção: `dpl_EiLhwHEmnMMuof8uwzcKz1Kg97J7`.

### 2. Achados reais, não presumidos da doc (a doc pública tinha lacunas/imprecisões confirmadas)
1. **A conta nunca tinha configuração de relatório** — `GET .../config` dava `404
   config_not_found_for_user`, e sem config o `POST .../settlement_report` falhava com **404 de
   corpo vazio** (diferente do erro estruturado normal da API do Mercado Pago, o que por si só
   dificultou o diagnóstico). Resolvido criando a config automaticamente (colunas incluindo
   `TRANSACTION_TYPE`, que é a coluna que discrimina taxa/saque/transferência/pagamento).
2. **`frequency` é campo obrigatório no POST da config** — a doc que consultei listava como
   opcional; a API rejeitou com `400 Error invalid fields` até eu incluir.
3. **A resposta de criação TEM um campo `status`** (`"pending"` inicialmente) que a doc resumida
   não mencionava — é o campo certo pra saber se terminou, não a mera presença em `.../list` (o
   item já aparece lá imediatamente após criado, com `status:"pending"` e `file_name` vazio).
4. **O Mercado Pago não respeita a janela exata pedida** — pedi 1h (`begin_date`/`end_date` só
   com 1h de diferença) e a API devolveu o relatório com `begin_date`/`end_date` expandidos pro
   dia inteiro (`03:00:00Z` até `02:59:59Z` do dia seguinte, o mesmo recorte de dia-caixa que o
   sistema já usa internamente) — não dá pra pedir um recorte mais fino que 1 dia.

### 3. O bloqueio real — geração nunca terminou
Criei 2 relatórios reais: um pra 23-25/07 (cobre o caso 24/07 citado na demanda) e outro que pedi
de 1h mas o Mercado Pago expandiu pro dia de hoje inteiro (01/08). **Os dois ficaram travados em
`status:"pending"` o tempo todo**:
- 23-25/07 (`id 102652342`): monitorado por **15 minutos contínuos** (90 consultas a cada 10s),
  `status` nunca mudou de `"pending"`, `file_name` nunca saiu de vazio.
- 01/08 (`id 102652377`): monitorado por **2m25s** (30 consultas a cada 5s), mesmo resultado.
- Reconferido uma última vez, minutos depois de ambos os polls terminarem: os dois `id`s
  continuam `"pending"` — não é só o meu tempo de espera ter sido curto, o Mercado Pago
  simplesmente não processou nenhum dos dois ainda.

Não consegui, portanto, chegar ao passo de baixar/ler o CSV com dado real — **não posso confirmar
nem negar** se o relatório realmente mostra taxa/saque/transferência, apesar de a documentação
pública (e o layout de colunas que ela expõe, incluindo `TRANSACTION_TYPE`, `FEE_AMOUNT`,
`SETTLEMENT_NET_AMOUNT`) sugerir fortemente que sim. Registrando isso como **hipótese forte, não
fato verificado** — a diferença que meu briefing pede que eu sempre marque.

### 4. Hipótese sobre a causa (não confirmada)
Mais provável: é a primeira vez que esta conta gera esse tipo de relatório (a config nem existia),
e a fila de processamento do Mercado Pago pra isso pode ser passos horas, não minutos, em contas
sem histórico de uso — não achei nada na doc pública sobre tempo típico de geração. Não descarto
também alguma limitação de conta/tipo de integração ainda não sinalizada por nenhum erro explícito
(a API nunca devolveu erro depois da criação — só ficou muda).

### Testes realizados e resultado
Reproduzido o 404 original antes de corrigir (§2.1); testado config + criação depois da correção,
sucesso confirmado (202, `status:"pending"`) — evidência real, não presumida; 2 relatórios reais
monitorados por 15min e 2m25s respectivamente, sem sucesso; reconferido de novo depois, ainda
pendentes. Nenhuma tentativa de baixar/confirmar conteúdo foi bem-sucedida.

### Achados fora do escopo
Nenhum — tudo acima está diretamente dentro do objetivo desta demanda.

### Status final e recomendação pro PM (revisado — ver atualização abaixo)
~~Bloqueada, não concluída~~ — destravou sozinha no dia seguinte, ver "Atualização 2026-08-02".

---

## Atualização 2026-08-02 — destravou, critério de aceite confirmado nos 4 dias

O Edvam pediu pra reconferir hoje. **A geração passou a funcionar normal** (40-180s por relatório,
nunca mais travou em "pending" indefinidamente como ontem) — o motivo do travamento de ontem segue
não confirmado (mais provável: latência de primeira geração da conta, já que era a primeira vez
que essa config existia), mas não é mais um bloqueio.

### Achado novo, corrigido no script: a janela pedida não bate com o corte real do arquivo
`begin_date`/`end_date` **não recorta o CSV com precisão de dia-caixa** — o relatório pedido pra
"20-07-26" (deveria ser só 20/07 00h-24h Recife) veio com `TRANSACTION_DATE` real de 20/07 07:25 até
**21/07 19:16** (quase 1,5 dia de dado dentro do mesmo arquivo). Não dá pra confiar no corte da
própria API. Corrigido em `scripts/investigacao-265-relatorio-dinheiro-conta.ts`: agora filtra as
linhas pelo dia-caixa exato (`limitesDiaCaixaUTC`) depois de baixar, antes de somar qualquer total
"do dia" — o script avisa explicitamente quando precisou filtrar. **Se este relatório algum dia
virar código de produção (fora do escopo desta demanda), esse filtro cliente-side é obrigatório,
não opcional.**

### Critério de aceite confirmado, com dado real, nos 4 dias pedidos
`TRANSACTION_TYPE` realmente discrimina **SETTLEMENT** (pagamento recebido, com `FEE_AMOUNT`
próprio) de **PAYOUTS** (saque/transferência saindo da conta, sem taxa própria) — exatamente o que
faltava. Resultado líquido (`SETTLEMENT_NET_AMOUNT`, já com filtro de dia-caixa aplicado):

| Dia | SETTLEMENT (qtd / soma bruta) | PAYOUTS (qtd / soma) | Líquido do dia |
|---|---|---|---|
| 20-07-26 | 37 / R$240,80 | 3 / -R$94,90 | **R$137,53** |
| 21-07-26 | 28 / R$431,56 | 4 / -R$330,19 | **R$100,27** |
| 24-07-26 | 39 / R$2.160,22 | 3 / -R$2.752,00 | **-R$596,90** |
| 31-07-26 | 24 / R$593,41 | 4 / -R$1.040,00 | **-R$447,78** |

**Achado forte, não 100% fechado**: pra 24-07-26, o líquido do relatório real (-R$596,90) bate
**exatamente** com a `variacaoInformada` que a conciliação (227/228) já calculava pra aquele dia
(saldo informado hoje − ontem = -R$596,90, mesmo valor, confirmado na demanda 262) — evidência forte
de que o relatório é uma fonte confiável pra explicar o gap. Já os dias 20-07 e 21-07 **não bateram
tão limpo** contra a `variacaoInformada` que a conciliação tinha calculado antes (72,13 e outro
valor, respectivamente, bem diferentes de 137,53 e 100,27) — hipótese não confirmada: pode ser
atraso de liquidação (`SETTLEMENT_DATE` ≠ `TRANSACTION_DATE`, um pagamento pode ser "recebido" num
dia mas só afetar o saldo disponível no dia seguinte) ou pode ser que a `variacaoInformada` antiga
precise ser recalculada agora que existe dado melhor. **Não fechei essa conta sozinho** — é
exatamente o tipo de comparação que cabe ao Edvam/PM decidir como usar na classificação das
pendências, não uma correção que eu aplico por conta própria (fora do escopo desta demanda, que era
só trazer o extrato).

**Caso concreto encontrado, útil pra classificar a pendência de 24/07 (mercadopago,
`diferencaAjustada -2216,89` na 262)**: o PAYOUTS de -R$2.352,00 (24/07 20h19, `ORDER_ID
X0mjEz8mJS`, sem vínculo de pedido) é quase certamente o "Admin sacando/transferindo direto no app
do Mercado Pago" já documentado como padrão conhecido (movimentação de consolidação fora do
sistema) — vale o Edvam confirmar de cabeça se lembra desse valor específico antes de classificar.

### Testes realizados e resultado (atualização)
4 relatórios reais gerados e baixados com sucesso hoje (20, 21, 24, 31-07-26), cada um com o filtro
de dia-caixa aplicado e conferido manualmente (`min`/`max` de `TRANSACTION_DATE` inspecionado antes
de confiar no corte). Tive falhas de rede transitórias (`fetch failed`) em algumas tentativas —
sem relação com a API do Mercado Pago (reconfirmado: `curl` direto respondeu normal durante as
falhas), resolvidas só repetindo a chamada.

### Status final (atualizado)
**Concluída.** As 3(+1) funções, o script e o filtro de dia-caixa estão prontos e testados com
dado real dos 4 dias pedidos. Entrego ao PM: (a) a tabela acima pronta pra usar na classificação de
julho; (b) o caso do PAYOUTS de R$2.352,00 em 24/07 como pista concreta; (c) o alerta de que
20-07/21-07 não bateram limpo contra a `variacaoInformada` já calculada — recomendo reconferir
esses 2 dias com mais calma (fora do escopo de código desta demanda) antes de fechar a
classificação deles como certa.
