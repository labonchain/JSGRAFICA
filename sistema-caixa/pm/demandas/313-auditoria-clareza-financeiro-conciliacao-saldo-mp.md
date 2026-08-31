# 313, Auditoria de clareza do Financeiro: conciliação confusa, saldo MP não bate, fluxo mal lançado

Status: proposta
Criada em: 2026-08-20
Aprovada em:
Concluída em:
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto

Relato direto do Edvam (20/08), sem exemplo isolado, é um padrão recorrente que ele sente no dia
a dia: o Financeiro ainda dá bug e não é claro/funcional pro Admin. Três sintomas nomeados:

1. **Conciliação continua confusa**, tanto pro Edvam quanto pra quem relata a ele (o admin que
   opera no dia a dia). Já existe a tela e o mecanismo (demandas 225-231), mas a experiência de
   usar não está passando confiança.
2. **Saldo do Mercado Pago e o da "visão geral" não batem direito**, e isso gera confusão. Não
   ficou claro se é divergência real (dinheiro não lançado) ou só apresentação/rótulo pouco
   claro, precisa de investigação, não presumir qual dos dois é.
3. **Fluxo mal registrado ou nunca lançado no sistema** continua gerando divergências com
   frequência, isso é descrito como algo recorrente, não um incidente único, então voltar a
   acontecer não é surpresa, é vale mapear onde/por que isso se repete.

Este é o tipo de demanda que pede o especialista financeiro dedicado (auditoria com disciplina
de conciliação de 3 pontas, ver `pm/equipe/05-financeiro.md`), não é ajuste de UI isolado.

## Objetivo

Diagnóstico real (com dado, não suposição) do porquê o Financeiro ainda parece confuso/quebrado
pro Admin, separando o que é bug de verdade do que é clareza de apresentação, e uma proposta de
correção pra cada achado real.

## Escopo

Incluído:
- Investigar a experiência de conciliação de ponta a ponta (dado real, não teórico): o que faz
  parecer confuso hoje, comparar com o que a tela deveria estar comunicando.
- Investigar concretamente por que saldo MP e "visão geral" não batem, com casos reais, número
  a número, não estimativa.
- Levantar (com dado real, últimos 30-60 dias) que tipos de fluxo ficam mal lançados ou nunca
  chegam ao sistema, e a frequência/impacto de cada padrão achado.
- Propor correções concretas por achado, cada uma virando demanda separada pro chat certo
  (03-APP se for UI/código, 02-DADOS se for schema/dado).

Explicitamente fora de escopo desta demanda:
- Implementar qualquer correção diretamente, esta é investigação + proposta, execução vira
  demanda(s) nova(s), como sempre.

## Critérios de aceite

- [ ] Relatório claro do que é bug real vs. falta de clareza de apresentação, pros 3 sintomas.
- [ ] Casos reais citados (número, data, valor), não afirmação genérica.
- [ ] Proposta concreta de correção por achado real confirmado.

## Riscos e cuidados

Dado financeiro real, mesma disciplina de sempre: nenhuma alteração de valor/registro sem
confirmação, e conferir contra produção, não só teoria.

## Referências

`pm/conhecimento/desenho-conciliacao-automatica.md`, demandas 225-231 (conciliação automática),
`pm/equipe/05-financeiro.md`.

## Relato de execução
(preenchido pelo chat executor ao concluir, ver formato exato no briefing do seu chat em
`../equipe/`)

- O que foi feito (arquivo a arquivo):
- Testes realizados e resultado:
- Achados fora do escopo (relatados, não resolvidos por conta própria):
- Status final: concluída / bloqueada (motivo) / parcial (o que falta)
