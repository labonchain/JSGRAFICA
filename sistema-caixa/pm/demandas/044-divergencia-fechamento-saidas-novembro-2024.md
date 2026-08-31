# 044 — Divergência de R$ 3.569,87 entre fechamento e saídas itemizadas (6 dias sem dado em nov/2024)

Status: aprovada
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Achado durante a validação da demanda 043 (03-APP): `jsgrafica_fechamento.total_saidas` somado
(R$ 160.098,29) não bate com a soma direta de `jsgrafica_saidas.valor` (R$ 156.528,42) —
diferença de R$ 3.569,87.

**Causa raiz já identificada pelo PM via SQL** (comparação dia a dia entre as duas tabelas): são
exatamente **6 dias consecutivos de novembro/2024** onde `jsgrafica_fechamento` tem um
`total_saidas` > 0, mas `jsgrafica_saidas` **não tem nenhuma linha** pra essas datas:

| data_dia | total_saidas (fechamento) | soma real em jsgrafica_saidas |
|---|---|---|
| 04-11-24 | 1116.14 | 0 |
| 05-11-24 | 129.00 | 0 |
| 06-11-24 | 707.00 | 0 |
| 07-11-24 | 108.00 | 0 |
| 08-11-24 | 279.23 | 0 |
| 09-11-24 | 1230.50 | 0 |

A soma dessas 6 diferenças (1116.14+129+707+108+279.23+1230.50) = **3.569,87** — bate
exatamente com a divergência total. Não há nenhum outro dia divergente além desses 6 — não é um
problema de reconciliação geral, é uma lacuna isolada e específica.

## Objetivo
Entender por que esses 6 dias não têm saídas itemizadas (apesar do fechamento saber o total) e
decidir se dá pra recuperar o detalhamento ou só documentar a lacuna.

## Escopo
- Incluído:
  - Investigar se a fonte original (planilha Excel/Sheets do histórico) tem o detalhamento de
    saídas por categoria pra esses 6 dias — se tiver, importar as linhas faltantes em
    `jsgrafica_saidas` (mesmo padrão da importação histórica original).
  - Se a fonte original também não tiver o detalhamento (só o total, sem quebra por categoria),
    documentar isso como limitação conhecida dos dados — não é possível reconstruir uma quebra
    que nunca existiu.
- Fora de escopo: mudar como o dashboard exibe/soma esses valores (isso já foi resolvido na
  demanda 043, que usa a tabela itemizada como fonte, não o rollup do fechamento).

## Critérios de aceite
- [ ] Causa confirmada (fonte original tinha o detalhe e ele não foi importado / ou fonte
      original nunca teve o detalhe pra esses dias)
- [ ] Se recuperável: as 6 linhas/dias importados, divergência caindo a zero
- [ ] Se não recuperável: documentado no relato + memória do projeto, sem tentar "inventar" uma
      quebra por categoria que não existe

## Riscos e cuidados
Não inventar uma distribuição por categoria pra esses valores caso a fonte original não tenha
o detalhe — melhor documentar a lacuna do que criar dado sintético que pareça real.

## Referências
Tabelas `jsgrafica_fechamento`, `jsgrafica_saidas`. Achado original: relato da demanda 043
(03-APP), causa raiz isolada pelo PM via SQL (ver tabela acima).

## Relato de execução

### O que foi feito

1. Confirmei via SQL que só esses 6 dias divergem (bate com o achado do PM).
2. Fui atrás da fonte original. Achei duas cópias no Drive do Edvam: `CAIXA ATUAL` (Google
   Sheets, `1u5t0Vc9J6-r0OlsHAvFO8qSbPbQmzHpRpw8Nqra1GZk`) e `CAIXA ATUAL.xlsx` (cópia .xlsx,
   `1HTtB4K9gcAhGTjG0KvCR5VU1LMrpj0A0`) — essa é a planilha antiga usada na migração original
   (Fase 3, `HISTORICO.md`), diferente da `Caixa_JS_Grafica_ATUAL.xlsx` mais nova usada nas
   demandas anteriores (import de abr–jul/2026).
3. **A fonte original TEM o detalhamento por categoria pra todos os 6 dias** — não é uma
   lacuna real da planilha, é algo que ficou de fora na migração original de 2026-05-02.
   Confirmei linha por linha: a soma de cada dia bate exatamente com o `total_saidas` do
   `jsgrafica_fechamento` (ver tabela abaixo) — recuperável com confiança total, não é
   reconstrução aproximada.

| data_dia | categorias (planilha original) | soma | bate com fechamento? |
|---|---|---|---|
| 04-11-24 | Retiradas sócios 66,20 + Pagamento cartões 1.049,94 | 1.116,14 | ✅ |
| 05-11-24 | Fornecedores (Redesuc) 74,00 + Retiradas sócios (casa) 55,00 | 129,00 | ✅ |
| 06-11-24 | Retiradas sócios (casa) 70,50 + Despesas diversas (uber) 30,50 + Pagamento cartões (Tânia) 606,00 | 707,00 | ✅ |
| 07-11-24 | Fornecedores (papel adesivo) 25,00 + Retiradas sócios (casa) 83,00 | 108,00 | ✅ |
| 08-11-24 | Retiradas sócios (casa) 69,23 + Despesas diversas (passagem) 10,00 + Recargas Dinheiro e Pix 200,00 | 279,23 | ✅ |
| 09-11-24 | Fornecedores (Grafica Matriz) 115,00 + Folha de pagamento (Gabi) 250,00 + Retiradas sócios (casa) 92,50 + Recargas Dinheiro e Pix 141,00 + Pagamento cartões (Mercado Pago) 632,00 | 1.230,50 | ✅ |

**Achado à parte:** a planilha original tinha uma categoria (`RECARGAS DINHEIRO E PIX`) que não
existe no catálogo atual de 10 categorias de `jsgrafica_saidas`. Não é a mesma coisa que
`recarga_vem` (Repasse Recarga VEM/Celular, revenda de crédito pro cliente) — parece ser um
tipo de saída distinto, descontinuado ou renomeado depois de nov/2024. Criei categoria nova
(`categoria_id='recargas_dinheiro_pix'`, `categoria_nome='Recargas Dinheiro e Pix'`) em vez de
forçar numa categoria existente que não corresponde — é dado real da fonte, não invenção.

Também preservei as descrições livres que a planilha tinha por linha (`Redesuc`, `casa`,
`Tânia`, `uber`, `papel adesivo`, `Gabi`, `Grafica Matriz`, `Mercado Pago`) no campo
`descricao` — informação real que a planilha guardava e que se perderia se eu importasse só o
valor.

Inseridas 17 linhas em `jsgrafica_saidas`, `operador='import'` (mesmo padrão das outras linhas
de 2024 já existentes na tabela).

### Testes realizados e resultado

```sql
-- divergência por dia, depois do import:
0 linhas retornadas (nenhum dia diverge mais)

-- totais gerais:
sum(jsgrafica_fechamento.total_saidas) = 160.098,29
sum(jsgrafica_saidas.valor)             = 160.098,29   -- batem exatamente
```

### Achados fora do escopo
- A planilha original (`CAIXA ATUAL`) tem histórico desde antes de nov/2024 — não conferi se
  há outras lacunas silenciosas fora dos 6 dias já identificados pelo PM (a demanda pediu só
  esses 6; se quiserem uma varredura completa de consistência fechamento↔saídas↔vendas pra
  todo o histórico 2024–2025, é demanda nova).
- Categoria `recargas_dinheiro_pix` é usada só nesses 2 dias (08 e 09/11/24) — não vi em mais
  nenhum lugar do histórico. Pode valer a pena o PM decidir se isso deveria ser mapeado pra uma
  categoria já existente (ex. fundir com `recarga_vem`) ou manter separada — não decidi isso
  sozinho, é dado novo, não uma correção óbvia.

### Status final
**Concluída.** Causa confirmada (dado recuperável, não lacuna real da fonte), 17 linhas
importadas, divergência de R$ 3.569,87 zerada.
