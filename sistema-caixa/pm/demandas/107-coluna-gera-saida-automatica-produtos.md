# 107 — Coluna `gera_saida_automatica` em jsgrafica_produtos (destrava a 104)

Status: aprovada
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
O 03-APP está executando a demanda 104 (recarga gera saída na hora da venda, generalizado pra
qualquer produto com repasse real) e reportou que o MCP do Supabase caiu na sessão dele — sem
acesso a SQL/DDL direto (sem CLI linkado, sem connection string, sem psql). Essa parte específica
(coluna nova) precisa vir do 02-DADOS, mesmo padrão da demanda 095.

Contexto do porquê esse campo existe (não é o mesmo que `preco_custo`, que já existe desde a
095): `preco_custo` serve pra métrica de margem em **todos** os produtos. Esse campo novo decide
**só** se a venda desse produto dispara saída automática no caixa — precisa ser explícito porque
produção própria (impressão) tem `preco_custo` só pra métrica, sem repasse real na hora da venda.

## Objetivo
`jsgrafica_produtos` ganha um jeito de marcar quais produtos disparam saída automática ao vender,
com Recarga Celular/VEM já marcados como primeiro caso real (a 104 depende disso pra migrar esses
produtos, item 4 do escopo dela).

## Escopo
- Incluído:
  1. Coluna nova: `gera_saida_automatica boolean NOT NULL DEFAULT false`.
  2. Marcar como `true` os produtos que hoje já usam o mecanismo agregado da 079 — achar pelo
     nome/categoria (Recarga Celular, Recarga VEM) e confirmar antes de gravar (mesmo cuidado de
     sempre: 2x conferir o que vai marcar).
  3. Resto dos produtos fica `false` (default), sem mudança.
- Fora de escopo: qualquer lógica de quando/como a saída é gerada — isso é a 104, do 03-APP.

## Critérios de aceite
- [ ] Coluna criada, nullable=false, default false, produtos existentes intactos
- [ ] Recarga Celular e Recarga VEM (conferir nome exato antes) marcados `true`
- [ ] Resto do catálogo continua `false`

## Riscos e cuidados
Mudança aditiva, pode ir a qualquer momento — não interfere no que já está em uso. Prioridade
alta porque está bloqueando a demanda 104, que já está em execução.

## Referências
`jsgrafica_produtos`, demanda 095 (mesmo padrão de coluna nova), demanda 104 (quem depende
disso), demandas 052/079 (Recarga Celular/VEM, mecanismo que está sendo substituído).

## Relato de execução

### Achado antes de gravar — catálogo mudou desde 052/079

O catálogo hoje **não tem** mais um único produto "RECARGA CELULAR"/"RECARGA VEM" genérico —
virou SKU por valor (ex. `RECARGA CELULAR 20,00`, `RECARGA VEM 12,50`, `RECARGA VEM 52,50`...):
**8 produtos** na categoria `Recarga celular` e **19** na categoria `Recarga vem` (27 no
total). Marcar por categoria (como a demanda já pedia) cobre isso certo — não precisei ajustar
o critério, só confirmar que "por categoria" ainda é a abordagem certa com o catálogo atual.

### O que foi feito
```sql
ALTER TABLE jsgrafica_produtos ADD COLUMN gera_saida_automatica boolean NOT NULL DEFAULT false;

UPDATE jsgrafica_produtos
SET gera_saida_automatica = true
WHERE categoria IN ('Recarga celular', 'Recarga vem');
```

### Testes realizados e resultado
```
Total de produtos: 100 | marcados true: 27
  Recarga vem: 19 | Recarga celular: 8   (bate com a contagem por categoria)
Produtos dessas 2 categorias que ficaram false por engano: 0
```

### Achados fora do escopo
Nenhum.

### Status final
**Concluída.** Coluna criada (not null, default false), 27 produtos de Recarga Celular/VEM
marcados `true`, resto do catálogo (73 produtos) intacto em `false`. Destrava a 104.
