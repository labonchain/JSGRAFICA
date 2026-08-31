# 051 — Coluna `quantidade` em jsgrafica_saidas

Status: aprovada — fundação da 052 (fazer primeiro)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Edvam explicou a mecânica real da saída de Recarga VEM: tem uma **taxa fixa de R$ 2,50 por
recarga**. Se o cliente paga R$ 20 de carga, o valor de saída de verdade é R$ 17,50 (a diferença
é a margem da gráfica). Pra registrar isso direito (e permitir relatório por quantidade de
recargas feitas), a tela de Lançar Saídas (demanda 052) precisa de um campo de quantidade, não só
valor solto — e `jsgrafica_saidas` não tem essa coluna hoje.

Confirmado por Edvam: Recarga Celular e Recarga VEM são **coisas diferentes** (não fundir,
resolve a dúvida deixada em aberto pela demanda 049/050).

## Objetivo
`jsgrafica_saidas` tem onde guardar a quantidade de recargas de uma saída, pra habilitar o
cálculo automático na demanda 052.

## Escopo
- Incluído: adicionar coluna `quantidade` (numeric, nullable — só é usada pra saídas do tipo
  recarga, não faz sentido pra "Aluguel" por exemplo) em `jsgrafica_saidas`.
- Fora de escopo: qualquer lógica de cálculo (isso é a 052); mexer em `jsgrafica_vendas` (que já
  tem `quantidade`, não precisa mudar).

## Critérios de aceite
- [ ] Coluna `quantidade` criada, nullable, não quebra nenhuma linha existente
- [ ] Confirmado que linhas antigas continuam com `quantidade = null` sem erro

## Referências
Tabela `jsgrafica_saidas`. Demanda 052 (depende desta).

## Relato de execução

### O que foi feito
```sql
ALTER TABLE jsgrafica_saidas ADD COLUMN quantidade numeric NULL;
```

### Testes realizados e resultado
```
coluna: quantidade | tipo: numeric | nullable: YES
jsgrafica_saidas: 963 linhas totais, 0 com quantidade, 963 com quantidade = null
```
Nenhuma linha existente quebrou — todas seguem `null`, como esperado (numeric aceita `null`
livremente, sem default forçado).

### Achados fora do escopo
Nenhum.

### Status final
**Concluída.** Coluna criada, nullable, histórico intacto.
