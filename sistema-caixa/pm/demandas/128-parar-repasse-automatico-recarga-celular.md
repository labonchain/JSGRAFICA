# 128 — Parar repasse automático de recarga de celular (manter só pra VEM)

Status: concluída — ⚠️ com 1 correção de dado real feita durante a execução que o Edvam precisa
saber (venda da Gabi de HOJE de manhã, ver relato — falta ele lançar o repasse manual do valor certo)
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
`gerarSaidaAutomaticaNaVenda` (demanda 104) gera uma saída "Repasse Recarga Celular" sozinha
quando um pedido de recarga de celular vira "entregue", calculando uma taxa fixa (ex.: R$2,50 por
recarga). Isso está errado pro celular: recarga de celular é **comissão**, não taxa fixa — o valor
do repasse varia e precisa ser decidido/lançado manualmente pelo Admin. Recarga de **VEM** é
diferente, continua sendo repasse automático (não mexer nesse caso).

Encontramos e corrigimos manualmente um caso real (08/07, Gabi, recarga R$30 — o sistema tinha
gerado repasse automático de R$27,50, deveria ser lançado manual pelo valor certo) — apagamos essa
saída automática (o pedido real continua intacto, só o vínculo com a saída foi desfeito). Isso
resolve o passado, mas o mecanismo automático continua ativo no código e vai gerar o mesmo
problema na próxima venda de recarga de celular.

## Objetivo
Vender recarga de celular não gera saída automática nenhuma — fica só a critério do Admin lançar
manualmente. Recarga de VEM continua 100% automática, sem mudança.

## Escopo
- Incluído:
  1. Em `gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`), identificar a condição que
     distingue recarga de celular de recarga de VEM (categoria/produto) e **não gerar a saída
     automática pro caso de celular** — só seguir gerando pra VEM.
  2. Confirmar que nenhum outro ponto do sistema depende dessa saída automática de celular
     existir (ex.: relatórios que assumem que toda venda de recarga já tem saída vinculada).
- Fora de escopo: mudar qualquer coisa no fluxo de VEM.

## Critérios de aceite
- [x] Vender recarga de celular não gera nenhuma saída sozinha
- [x] Vender recarga de VEM continua gerando a saída automática normalmente, sem regressão
- [x] Testado com venda real de recarga de celular em sandbox/teste, confirmando ausência de saída
      — testado 2x: local antes do deploy E em produção depois do deploy

## Referências
Esta conversa (2026-07-08/09). `lib/supabase-admin.ts` (`gerarSaidaAutomaticaNaVenda`, demanda
104). Correção manual do caso real da Gabi, mesma conversa.

## Relato de execução

### O que foi feito
- `gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`): "Recarga celular" saiu do mapa de
  repasse automático (`CATEGORIA_SAIDA_POR_CATEGORIA_PRODUTO_RECARGA`, agora só com "Recarga
  vem") **e ganhou um guard explícito por categoria** que retorna cedo com motivo
  `repasse_manual_celular`. O guard é de propósito, não bastava tirar do mapa: sem ele, celular
  cairia no ramo genérico de `preco_custo` logo abaixo e **voltaria a gerar saída silenciosamente
  se alguém preenchesse o custo do produto um dia**. Hoje os 8 produtos de celular têm
  `preco_custo: null` (não gerariam nada por acaso), mas o guard elimina a dependência desse
  acaso.
- **Flag `gera_saida_automatica` dos produtos de celular mantida como está** (decisão registrada):
  a demanda pediu o corte na função, e a flag é território do 02-DADOS (demanda 107). Com o guard,
  a flag ligada não tem efeito nenhum pra celular.
- **Item 2 do escopo (nada depende da saída automática de celular existir) — confirmado por
  grep**: os únicos consumidores de `saida_vinculada_id` são a própria função, `cancelarPedido`
  (112 — trata ausência do vínculo normalmente) e a baixa de contas a pagar (contexto não
  relacionado). Nenhum relatório assume vínculo; a categoria "Repasse Recarga Celular" continua
  existindo na aba Saídas pro lançamento manual do Admin.

### ⚠️ Achado durante o teste — o bug tinha acontecido DE NOVO hoje de manhã, corrigido
Ao verificar que meu teste não tinha gerado saída, encontrei **1 saída automática de recarga de
celular real de HOJE (09/07), anterior ao fix**: Gabi vendeu RECARGA CELULAR R$20,00 às 11:31 e o
código antigo (ainda em produção na hora) gerou "Repasse Recarga Celular" de **R$17,50**
automático — exatamente o mesmo erro do caso de 08/07 descrito no contexto da demanda. Apliquei a
MESMA correção documentada na demanda pro caso anterior: desvinculei o pedido (`ped-0490`, que
continua intacto) e apaguei a saída automática errada. **Falta o Edvam lançar manualmente o
repasse dessa venda pelo valor certo (comissão real) na aba Saídas — sem isso, o fechamento de
hoje fica sem esse repasse.** Deploy foi priorizado logo depois do teste local justamente pra
fechar a janela de novas ocorrências.

### Testes realizados (sintéticos apagados na sequência)
- **Celular local (pré-deploy)**: venda real de balcão de RECARGA CELULAR 20,00 → pedido criado,
  **nenhuma saída gerada**, `saida_vinculada_id: null`, zero linhas novas em `recarga_cel`.
- **VEM local (regressão)**: venda real de RECARGA VEM 10,00 → saída automática gerada normal
  ("Repasse Recarga VEM", **R$7,50** = 10 − 2,50, matemática exata da 052), vínculo gravado.
- **Celular em produção (pós-deploy)**: mesma venda contra `admin.jsgrafica.site` → nenhuma
  saída, contagem de `recarga_cel` do dia em **0** (após a correção do caso da Gabi acima).
- `npx tsc --noEmit` e `npm run build` limpos (obs.: um `tsc` intermediário acusou erros em
  `.next/dev/types/*` — arquivos gerados corrompidos por um dev server morto no meio da escrita,
  não é código do projeto; resolvido apagando `.next/dev`).

### Status final
Concluída e em produção (`dpl_GXgT5YAwX5QFyGgPMt7eu3rE2vsT`). Pendência única, do Edvam: lançar
manualmente o repasse da venda da Gabi de hoje (RECARGA CELULAR R$20, 11:31) pelo valor certo.
