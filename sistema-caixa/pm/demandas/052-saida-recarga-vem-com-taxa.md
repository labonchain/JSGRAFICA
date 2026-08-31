# 052 — Lançar saída de Recarga VEM com cálculo automático da taxa

Status: aprovada — depende da 051 (coluna `quantidade` precisa existir)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Explicação do Edvam sobre a mecânica real: recarga VEM tem uma **taxa fixa de R$ 2,50 por
recarga**. O cliente paga (venda) o valor cheio da carga (ex.: R$ 20), mas o valor de saída de
verdade — o que a gráfica realmente desembolsa pra carregar o cartão VEM — é **menor**, descontada
a taxa (R$ 20 − R$ 2,50 = R$ 17,50). Hoje a tela de Lançar Saídas só tem um campo de valor solto,
sem esse cálculo — quem lança tem que fazer a conta de cabeça (ou, pior, lança o valor cheio,
inflando a saída registrada e distorcendo o resultado do dia).

Recarga Celular é diferente (confirmado pelo Edvam) — tem valores fixos (R$ 20 a R$ 100) e não
foi mencionada taxa nenhuma. Não aplicar essa lógica de taxa lá.

## Objetivo
Ao lançar uma saída de categoria "Repasse Recarga VEM/Celular", o valor final já vem calculado
descontando a taxa por recarga — sem o atendente precisar calcular na mão.

## Escopo
- Incluído:
  1. Quando a categoria selecionada em Lançar Saídas for a de recarga VEM
     (`recarga_vem`), mostrar campos **"Quantidade de recargas"** e **"Valor da carga"** (por
     recarga ou total — decisão de UI do 03-APP, o que for mais natural) em vez do campo de
     valor livre padrão.
  2. Calcular e mostrar ao vivo: `valor_saida = valor_da_carga_informado − (2,50 × quantidade)`.
     Gravar esse valor calculado em `jsgrafica_saidas.valor`, e a quantidade em
     `jsgrafica_saidas.quantidade` (coluna criada na demanda 051).
  3. A taxa de R$ 2,50 não deve ficar hardcoded sem nenhum jeito de ajustar depois — colocar
     como uma constante fácil de achar/editar no código (ou, se o 03-APP preferir, um campo de
     configuração no banco) — decisão técnica livre, só não esconder o número num lugar difícil
     de manter.
  4. Recarga Celular continua com o campo de valor normal (sem taxa, sem cálculo especial) —
     opcional, não obrigatório: se fizer sentido rápido, considerar botões de valor fixo
     (R$20/R$30/R$50/R$100) pra ela também, já que os valores são sempre os mesmos — mas isso é
     um "se sobrar tempo", não critério de aceite.
- Fora de escopo: mexer em `jsgrafica_vendas` (o lado da venda da recarga já funciona); mudar a
  taxa de R$ 2,50 (é a taxa real informada, não estimativa).

## Critérios de aceite
- [ ] Categoria de recarga VEM mostra campos de quantidade + valor da carga, não valor livre
- [ ] Cálculo bate: R$ 20 de carga, 1 recarga → saída de R$ 17,50
- [ ] Testado com mais de 1 recarga na mesma linha (ex.: 2 recargas de R$ 20 → saída R$ 35,00)
- [ ] `quantidade` gravada corretamente na linha da saída
- [ ] Recarga Celular não foi afetada (continua como estava)

## Riscos e cuidados
Confirmar com o Edvam se o campo "valor da carga" deve ser por recarga individual ou total das
N recargas antes de fechar o cálculo — evitar ambiguidade que gere conta errada.

## Referências
Demanda 051 (dependência, coluna `quantidade`). Demanda 050 (tela de Lançar Saídas, mesma área).
Tabela `jsgrafica_categorias_saida` (categoria `recarga_vem`).

## Relato de execução

### O que foi feito
- `TAXA_RECARGA_VEM = 2.5` adicionada em `lib/dados.ts` como constante exportada, com comentário
  explicando a origem (valor real informado pelo Edvam, não estimativa) — fácil de achar e editar,
  não escondida dentro de uma função.
- `TelaSaidas` (`app/page.tsx`): quando a categoria ativa é `recarga_vem`, o formulário troca o
  campo de valor livre por **"Quantidade de recargas"** + **"Valor da carga (por recarga)"**,
  com o valor de saída calculado ao vivo e mostrado antes de lançar (`(carga − 2,50) × qtd`).
  Decisão de UI: valor por recarga individual, não total das N — mais natural pro caso real
  (cliente sempre paga o mesmo valor de carga por vez, ex. 2× R$20, não "R$40 dividido por 2").
  Outras categorias (incluindo Recarga Celular) continuam com o campo de valor solto, sem mudança.
- `app/api/saidas/route.ts` (POST): quando `categoriaId === 'recarga_vem'`, recalcula o valor
  **no servidor** a partir de `quantidade`+`valorCarga` usando `TAXA_RECARGA_VEM` (não confia no
  valor pronto que o front manda) — evita que um valor calculado errado ou adulterado no cliente
  vire saída registrada. Grava `quantidade` na nova coluna (demanda 051). Retorna 400 se faltar
  quantidade ou valor da carga.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` — limpos.
- Local via `curl` direto na API:
  - 1 recarga de R$20 → saída R$17,50 (bate com o exemplo da demanda)
  - 2 recargas de R$20 → saída R$35,00 (bate com o critério de aceite)
  - Faltando `valorCarga` → 400, nada gravado
  - Recarga Celular (`recarga_cel`) com valor livre R$50 → grava R$50 direto, sem taxa nem
    `quantidade` (continua `null`) — confirmado que não foi afetada.
  - Conferido direto no banco via SQL: `quantidade` gravada corretamente (1 e 2), `recarga_cel`
    com `quantidade = null` como antes.
- Playwright local: selecionou "Repasse Recarga VEM/Celular", preencheu quantidade=2 e valor da
  carga=20, confirmado visualmente que "Valor de saída calculado" mostra **R$ 35,00** ao vivo
  antes de lançar (screenshot conferido).
- Linhas de teste apagadas do banco depois (não ficou lixo em produção).

### Achados fora do escopo
Nenhum novo (o achado da 049 sobre `recarga_cel` nunca ter sido usada historicamente já foi
resolvido pela decisão do Edvam de manter as duas categorias separadas, registrada na fila desta
demanda).

### Status final
**Concluída e deployada** (junto com a 050, `dpl_9UYNQa3pPmpcof3HuvUaLbVtbK7h`).
