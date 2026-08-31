# 056 — Reclassificar produtos que não são recarga (categoria "Recarga celular" virou catch-all)

Status: aprovada — fundação da 057 (fazer primeiro)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Pedido do Edvam: "recargas é só recarga de celular e vem" — mas hoje a categoria `Recarga
celular` em `jsgrafica_produtos` é um catch-all que inclui, além da recarga de verdade:
`CANECA / CAMISA`, `ENVELOPE A4`, `IMA COM CALENDÁRIO`, `RIFA`, `TOPO DE BOLO` — produtos sem
nenhuma relação com recarga de celular. Isso faz o grupo "Recargas / Outros" na tela ficar
poluído com itens que não são recarga.

## Objetivo
A categoria de recarga no catálogo passa a ter só o que é recarga de verdade — os outros 5
produtos ganham uma categoria própria.

## Escopo
- Incluído:
  1. Criar/usar uma categoria nova em `jsgrafica_produtos.categoria` pros 5 produtos que não são
     recarga — sugestão: `Personalizados` (caneca, camisa, ímã, topo de bolo são itens
     personalizados; envelope e rifa não encaixam perfeitamente nessa palavra, mas são poucos
     itens — se o 03-APP/Edvam preferir outro nome ou separar em 2 categorias, decisão livre
     durante a execução, só documentar a escolha no relato).
  2. Atualizar os 5 produtos (`CANECA / CAMISA`, `ENVELOPE A4`, `IMA COM CALENDÁRIO`, `RIFA`,
     `TOPO DE BOLO`) pra essa categoria nova.
  3. `RECARGA CELULAR` e `RECARGA VEM` continuam como estão (categorias `Recarga celular` e
     `Recarga vem`, sem mudança).
- Fora de escopo: mudar o agrupamento visual da tela (isso é a demanda 057, código do 03-APP,
  não dado).

## Critérios de aceite
- [ ] Os 5 produtos saem da categoria `Recarga celular` e vão pra uma categoria nova
- [ ] `RECARGA CELULAR`/`RECARGA VEM` continuam intactos
- [ ] Nenhuma venda/pedido histórico que já referenciou esses produtos por `produto_id` quebra
      (a mudança é só no campo `categoria`, não no `id`/nome do produto)

## Referências
Tabela `jsgrafica_produtos`. Demanda 057 (depende desta, ajusta o agrupamento visual).

## Relato de execução

### Achado antes de agir — a premissa da demanda não batia com o banco ao vivo

Conferi os 5 produtos antes de mudar qualquer coisa e **só 2 dos 5 estavam de fato em
"Recarga celular"** hoje:

| Produto | Categoria antes |
|---|---|
| ENVELOPE A4 | Recarga celular ✅ (bate com a demanda) |
| IMA COM CALENDÁRIO | Recarga celular ✅ (bate com a demanda) |
| CANECA / CAMISA | "Seviço terceirizado" (já com typo no próprio dado) |
| RIFA | "Impressão papel oficio" |
| TOPO DE BOLO | "Impressão papel foto" — **e o nome real é "TOPO DE BOLO (sem recorte)"** |

Ou seja, a poluição do catch-all "Recarga celular" era menor do que o relatado — mas o
problema de fundo (esses 5 produtos sem categoria coerente) era real do mesmo jeito, só que
espalhado por 3 categorias erradas em vez de 1. Prossegui com o objetivo da demanda
(reclassificar os 5 pra uma categoria própria), independente de onde cada um estava antes.

**Achado extra, fora do escopo:** `TOPO DE BOLO (sem recorte)` está **duplicado** — dois `id`
diferentes (`prod-046` e `prod-054`), mesmo nome, mesma categoria. Não mesclei nem apaguei
nenhum dos dois (each um pode ter vendas históricas vinculadas por `produto_id` diferentes,
mexer nisso é decisão separada) — só atualizei a categoria dos dois igualmente, pra não deixar
um órfão na categoria antiga. Reportando pro PM decidir se vale investigar/mesclar.

### O que foi feito

Categoria escolhida: **`Personalizados`** (a sugestão da demanda), aplicada às 6 linhas (5
produtos, sendo 1 duplicado):

```sql
UPDATE jsgrafica_produtos
SET categoria = 'Personalizados'
WHERE id IN ('prod-048', 'prod-044', 'prod-047', 'prod-045', 'prod-046', 'prod-054');
```

Não separei em 2 categorias apesar do encaixe imperfeito de `ENVELOPE A4`/`RIFA` em
"Personalizados" (nenhum dos dois é item personalizado de verdade) — optei por manter simples
(1 categoria só) já que são só 2 itens fora do padrão, e a demanda 057 (agrupamento visual)
pode subdividir na tela se fizer sentido, sem precisar de outra categoria no banco.

### Testes realizados e resultado
```
Categoria "Personalizados": 6 linhas — CANECA / CAMISA, ENVELOPE A4, IMA COM CALENDÁRIO,
  RIFA, TOPO DE BOLO (sem recorte) x2 (as duas linhas duplicadas)
RECARGA CELULAR: categoria = "Recarga celular" (intacta)
RECARGA VEM: categoria = "Recarga vem" (intacta)
```
Mudança foi só no campo `categoria` — `id` e `nome` de todos os produtos permanecem
inalterados, então nenhuma venda histórica que referencia esses `produto_id` é afetada.

### Achados fora do escopo
- Duplicata `TOPO DE BOLO (sem recorte)` (`prod-046` / `prod-054`) — ver acima.
- Categoria "Seviço terceirizado" tem um typo no próprio dado (faltando o "r") — não corrigi,
  é uma categoria com mais 4 produtos além do `CANECA / CAMISA` que saiu de lá agora; corrigir
  o typo afetaria esses outros 4 também, fora do escopo desta demanda.

### Status final
**Concluída.** Os 5 produtos (6 linhas) reclassificados pra "Personalizados", recargas
intactas, sem quebra de histórico.
