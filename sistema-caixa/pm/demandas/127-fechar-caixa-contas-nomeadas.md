# 127 — Fechar Caixa (Admin): trocar "Bancos" por contas nomeadas (Mercado Pago automático + 3 manuais)

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
No fechamento de 08/07, o Admin lançou R$1.712,50 no campo único "Bancos" — na real era a soma de
4 contas diferentes (Caixa Econômica R$585, RecargaPay R$9,63, Stone R$181,77, Mercado Pago
R$936,10). O sistema calculou esperado R$1.535,73, dando divergência de R$474,02 — real, não erro
de digitação (a soma bateu exatamente com o que ele reportou). O problema é estrutural: o layout
tem 1 campo genérico "Bancos" pra uma realidade de 4 contas que a gráfica de fato movimenta.

Desenhamos o fluxo correto com o Edvam (2026-07-09):
- **Mercado Pago**: não precisa digitar nada — a integração já dá saldo em tempo real (demanda
  084, tela "💳 Mercado Pago", `buscarPagamentos()`). Só exibir/conferir.
- **Caixa Econômica** (cédulas depositadas), **Stone** (cartão) e **RecargaPay** (crédito pra
  recarga de VEM): continuam manuais, mas cada um no seu próprio campo nomeado, não misturados.

## Objetivo
A "Contagem física" do fechamento geral (Admin) mostra 4 linhas nomeadas em vez de 1 campo
"Bancos" genérico — cada divergência futura fica rastreável até a conta certa.

## Escopo
- Incluído:
  1. Trocar o campo único "Bancos" em `TelaFechamento.tsx` (Contagem física, geral) por 4 campos:
     - **Mercado Pago** — somente leitura, pré-preenchido automaticamente com o saldo do dia vindo
       de `/api/mercadopago/movimentacoes` (mesma fonte da tela "💳 Mercado Pago").
     - **Caixa Econômica**, **Stone**, **RecargaPay** — editáveis, manuais, como o "Bancos" é hoje.
  2. `total_fisico` continua sendo a soma de tudo (dinheiro + moedas + os 4 valores acima) —
     manter o cálculo de divergência igual, só mudar a origem dos números que compõem o físico.
  3. `POST /api/fechamento` grava os 4 valores separados (novas colunas em `jsgrafica_fechamento`:
     `saldo_mercadopago`, `saldo_caixa_economica`, `saldo_stone`, `saldo_recargapay` — ou nomes
     equivalentes) além de continuar gravando o total consolidado pra não quebrar leitura antiga.
  4. Histórico/relatórios que hoje leem `bancos` continuam funcionando (manter a coluna `bancos`
     como soma dos 4, ou migrar — decisão do executor, documentar no relato).
- Fora de escopo: integração com API da Stone (fica manual). Fechamento por operador (Zu/Gabi) não
  muda, esse desenho é só do fechamento geral do Admin.

## Critérios de aceite
- [x] Campo "Mercado Pago" aparece pré-preenchido, sem precisar digitar, batendo com a tela MP
- [x] Os outros 3 campos (Caixa Econômica, Stone, RecargaPay) editáveis, valor 0 por padrão
- [x] Fechar com os 4 valores preenchidos calcula `total_fisico`/divergência corretos
- [x] Histórico de fechamentos antigos continua sendo exibido sem quebrar (campo `bancos` antigo)
- [x] Regressão: fechamento por operador (Zu/Gabi) sem nenhuma mudança de comportamento

## Riscos e cuidados
Mexe na tela mais usada do Financeiro — testar exaustivamente antes de considerar concluída,
inclusive com um fechamento sintético completo (não gravar fechamento real de teste no dia real).

## Referências
Esta conversa (2026-07-08/09, investigação da divergência de R$474,02). Demanda 084 (Mercado
Pago, fonte do saldo automático). `components/TelaFechamento.tsx`, `app/api/fechamento/route.ts`.

## Relato de execução

### O que foi feito

- **Migration** (`add_contas_nomeadas_fechamento`): 4 colunas nullable em `jsgrafica_fechamento`
  — `saldo_mercadopago`, `saldo_caixa_economica`, `saldo_stone`, `saldo_recargapay`. **Decisão
  sobre a coluna `bancos` (item 4 do escopo, decisão do executor)**: mantida e continua sendo
  gravada como a SOMA das 4 — nenhuma leitura antiga quebra (conferido por grep: `bancos` só era
  lido em `TelaFechamento.tsx` e na própria rota; o histórico da 099 nem usa), e as 225+ linhas
  históricas seguem intactas com as colunas novas em `null`. Sem migração de dado histórico —
  não tem como saber retroativamente como o valor antigo se dividia entre as contas.
- **`lib/mercadopago.ts`**: nova `saldoMercadoPagoDoDia(dataDia)` — **líquido recebido no dia do
  caixa** (soma de `net_received_amount` dos pagamentos aprovados na janela do dia, fuso Recife
  via `limitesDiaCaixaUTC`, mesmo recorte de `getResumoDia`). Mesma fonte da tela "💳 Mercado
  Pago" (`buscarPagamentos`, 084), só que na janela do dia em vez de 7/30/90 dias. **Decisão:
  líquido, não bruto** — é o número que de fato entra na conta e que o Edvam lia no app quando
  digitava manualmente.
- **`GET /api/fechamento`** (visão geral): devolve `saldoMercadoPago` junto com o resto (mesmo
  `Promise.all`). **Se a integração falhar** (token expirado, MP fora do ar), devolve `null` e a
  tela abre o campo pra preenchimento manual com aviso âmbar — o fechamento nunca trava por
  causa do Mercado Pago (mesma filosofia de resiliência da 124).
- **`POST /api/fechamento`**: aceita os 4 campos novos; quando qualquer um vem, `bancos` = soma
  dos 4 (arredondada) e as 4 colunas são gravadas. Sem os campos (fechamento por operador ou
  chamada no formato antigo), comportamento idêntico ao anterior — colunas novas ficam `null`.
- **`TelaFechamento.tsx`** (Contagem física, só o bloco `isAdmin`): campo único "Saldo em conta /
  PIX" substituído por 4 linhas — 💳 Mercado Pago (caixa verde read-only com o valor automático;
  vira input com aviso âmbar se a integração cair), 🏦 Caixa Econômica ("cédulas depositadas
  hoje"), 💳 Stone ("recebido hoje no cartão"), 📱 RecargaPay ("crédito pra recarga de VEM").
  Total físico/divergência ao vivo somam as 4 + dinheiro + moedas. Fechamento por operador
  (Zu/Gabi) não renderiza nada disso — bloco continua inteiro dentro de `isAdmin`.

### Testes realizados (tudo sintético, apagado na sequência — sem fechamento de teste no dia real)

- **Matemática da janela do dia validada contra dado real**: os 7 pagamentos aprovados do
  dia-caixa 08-07 no sandbox somam R$38,98 líquido pela mesma fonte/filtragem da função — e o
  GET de hoje (09-07, sem pagamento nenhum) devolve 0, consistente.
- **GET geral**: `saldoMercadoPago` presente (0 hoje, integração viva). **GET operador (Zu)**:
  campo ausente, resposta idêntica à de antes — regressão ok.
- **POST geral com as 4 contas** usando os valores EXATOS do incidente de 08/07 (MP 936,10 +
  Caixa 585 + Stone 181,77 + RecargaPay 9,63 + dinheiro 100 + moedas 10): gravou
  `bancos: 1712,50` (a mesma soma que o Edvam digitou no campo único no dia do problema),
  as 4 colunas separadas certas, `total_fisico: 1822,50` e divergência exata. **POST operador
  no formato antigo**: gravou igual a antes, colunas novas `null`. Os 2 fechamentos sintéticos
  apagados imediatamente via SQL.
- **UI ao vivo (Playwright)**: 4 campos renderizando certos (MP verde read-only automático),
  preenchimento dos 3 manuais + dinheiro/moedas atualiza "Total físico contado" (R$886,40 =
  585+181,77+9,63+100+10+MP 0) e divergência (−R$649,33) exatos, sem clicar em "Fechar Caixa"
  (dia real aberto — o caminho de gravação já tinha sido testado via API e apagado).
- **Histórico antigo**: tabela dos últimos dias segue renderizando normal (nem lê `bancos`).
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_GmDhaWpk4dyiK7mqjo1UJEuE2Sbf`), GET de produção confirmado
devolvendo `saldoMercadoPago`. A partir do próximo fechamento geral, cada divergência fica
rastreável até a conta certa — o caso dos R$474,02 de 08/07 teria mostrado na hora qual das 4
linhas não batia.
