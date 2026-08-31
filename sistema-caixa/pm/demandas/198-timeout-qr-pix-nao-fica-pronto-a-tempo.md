# 198 — Cobrança Pix criada mas QR não fica pronto a tempo (timeout curto demais)

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: 2026-07-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real (Edvam, 2026-07-16): 2 pedidos (ped-1027 "Maria Izabel" R$6 e ped-1039 "Marcia
Cristina" R$4,80) tiveram pagamento em Pix "confirmado" pelo atendente sem o QR nunca ter
aparecido. Causa raiz identificada em `lib/mercadopago.ts` (`criarCobrancaPix`, linhas 198-218):
o Mercado Pago gera o QR de forma assíncrona, e a cobrança volta sem QR na criação — o código
tenta buscar de novo por até 5 tentativas de 1,1s (~5,5s no total) antes de desistir e jogar um
erro. Quando o MP demora mais que isso (aconteceu 2x recentemente), a função lança
`Cobrança Pix criada (X) mas o QR não ficou pronto a tempo`, o pedido cai no fallback de erro
(chave estática) e a cobrança criada no Mercado Pago fica **órfã** — nunca grava `mp_order_id`
no pedido, porque o erro é lançado antes do vínculo ser salvo (`app/api/pedidos/route.ts`,
linhas 334-367). Confirmado que não é o Mercado Pago fora do ar (API testada e respondendo
normal agora) nem relacionado aos deploys recentes (195/196/197) — esse trecho não foi tocado.

## Objetivo
Reduzir a chance de timeout, aumentando a janela de espera pelo QR antes de desistir.

## Escopo
- Incluído: em `criarCobrancaPix` (`lib/mercadopago.ts`), aumentar o orçamento de espera pelo
  QR — mais tentativas e/ou intervalo maior entre elas (ex. dobrar para ~10-12s de espera total),
  respeitando o limite de tempo da função serverless (Vercel) pra não estourar timeout da própria
  requisição HTTP.
- Se ainda assim esgotar o novo orçamento: comportamento de hoje continua (erro + fallback pra
  chave estática) — este ajuste é só dar mais margem, não mudar a mecânica.
- Explicitamente fora de escopo: qualquer redesenho pra confirmar o pedido na hora e buscar o QR
  depois em segundo plano (mecanismo mais robusto, mas maior) — registrar como ideia futura se
  o problema persistir mesmo com a janela maior.

## Critérios de aceite
- [x] Janela de espera pelo QR aumentada (tentativas e/ou intervalo maiores que hoje)
- [x] Requisição HTTP do pedido continua dentro do limite de timeout da função serverless
- [x] Testado simulando demora do MP (ou com casos reais) — QR chega dentro da nova janela nos
      casos que antes falhavam por poucos segundos
- [x] Comportamento de fallback (erro + chave estática) intacto pro caso de esgotar mesmo assim

## Riscos e cuidados
Não deixar a espera tão longa que estoure o timeout da função serverless (Vercel) e vire um erro
diferente (pior: sem nem cair no fallback de chave estática).

## Referências
`lib/mercadopago.ts` (`criarCobrancaPix`, linhas 165-219). `app/api/pedidos/route.ts` (linhas
320-379, catch da criação de cobrança). Casos reais: ped-1027, ped-1039 (2026-07-16).

## Relato de execução
Confirmado o diagnóstico da demanda: `criarCobrancaPix` (`lib/mercadopago.ts`) fazia até 5
tentativas de 1,1s (~5,5s de sleep) buscando o QR antes de desistir, e o vínculo `mp_order_id`
só era gravado DENTRO do try — no timeout, o erro é lançado antes do vínculo, então a Order do
Mercado Pago fica órfã (criada lá, sem rastro no pedido). Achado adicional durante a leitura do
loop antigo: a 5ª consulta (GET) era buscada mas NUNCA checada antes do loop terminar — um
desperdício silencioso que reduzia o orçamento real efetivo.

Mudanças (só em `criarCobrancaPix`, escopo respeitado — nenhum redesenho do vínculo/fallback):
- Orçamento de espera dobrado: de 5 tentativas × 1,1s (~5,5s) para 8 tentativas × 1,4s (~11,2s de
  sleep puro), reaproveitando o `buscarOrderPorId` já existente.
- Corrigido o desperdício do loop antigo: agora toda consulta buscada é verificada antes de
  desistir, inclusive a última (antes descartada por engano).
- Mecânica de fallback intacta: se o novo orçamento também esgotar, continua lançando o mesmo
  erro (`Cobrança Pix criada (...) mas o QR não ficou pronto a tempo`) e os dois pontos de
  chamada (`app/api/pedidos/route.ts`, `app/api/mercadopago/cobranca/route.ts`) continuam caindo
  no mesmo fallback de hoje (chave estática) — não mexi nesse trecho, só na janela interna.
- Adicionado `export const maxDuration = 25` explicitamente nas duas rotas que chamam
  `criarCobrancaPix` (`app/api/pedidos/route.ts` e `app/api/mercadopago/cobranca/route.ts`), já
  que o projeto não tinha `vercel.json` nem nenhum `maxDuration` configurado em lugar nenhum e eu
  não consegui confirmar o tier do plano Vercel via `vercel project ls`/`vercel teams ls` (nenhum
  dos dois expõe limite de função). 25s dá margem confortável acima do pior caso observado no
  teste (~13,7s pra esgotar o orçamento todo) sem risco de estourar o timeout da função e virar um
  erro pior (que nem cairia no fallback de chave estática) — meta explícita do "Riscos e cuidados".

Teste: não criei nenhuma cobrança Pix real (produção MP = dinheiro real desde 2026-07-10) nem
usei os casos reais ped-1027/ped-1039 pra reproduzir ao vivo. Em vez disso, escrevi um script
Node isolado que reproduz a MESMA estrutura do loop (8 tentativas, 1,4s, checagem em toda
consulta) com um mock de `buscarOrderPorId` simulando atraso do MP, sem tocar a API do
Mercado Pago:
- QR pronto na criação (tentativa 0) → retorna imediato (`ok:true`, 0ms).
- QR só aparece na 6ª consulta (dentro do orçamento ANTIGO estourado, ~10,2s) → retorna
  `ok:true` — confirma que os casos como ped-1027/ped-1039 (que estouravam por poucos segundos
  no orçamento de 5,5s) passariam na nova janela.
- QR só aparece na ÚLTIMA tentativa possível → retorna `ok:true` na tentativa 8, confirmando a
  correção do bug do "GET final nunca checado".
- QR nunca aparece → esgota e retorna `ok:false` (equivalente ao lançar o erro e cair no
  fallback), em ~13,7s — dentro do `maxDuration=25` com margem de ~11s de sobra.

`npx tsc --noEmit` limpo. `npm run build` limpo (rotas afetadas continuam `ƒ` dinâmicas, sem
erro). Deploy em produção: `dpl_79fJT7eaJQX4gHYqUtHZAeZPmZRM`, aliases confirmados via
`vercel inspect` em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

Achado fora de escopo (registrado, não implementado — conforme a demanda pede explicitamente):
mesmo com a janela maior, se o Mercado Pago demorar MAIS que ~11s pra gerar o QR, a Order ainda
fica órfã (sem `mp_order_id` vinculado) — o mecanismo mais robusto (confirmar o pedido na hora e
buscar/vincular o QR depois em segundo plano) segue como ideia futura, só a ser considerado se o
problema voltar a acontecer mesmo com este orçamento maior.
