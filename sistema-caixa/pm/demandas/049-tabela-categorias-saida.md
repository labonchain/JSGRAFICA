# 049 — Tabela de categorias de saída no Supabase

Status: aprovada — fundação da 050 (fazer primeiro)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Pedido do Edvam: a tela de "Lançar Saídas" precisa permitir adicionar categoria nova e editar
as existentes. Hoje isso é **impossível de fazer pelo sistema** porque as categorias estão
hardcoded em `lib/dados.ts` (`CATEGORIAS_SAIDA`, 11 itens) — mudar exige alterar código e fazer
deploy.

Prova de que isso já é um problema real: a categoria `recargas_dinheiro_pix` (criada direto no
banco pela demanda 044, ao recuperar saídas históricas de nov/2024) **não aparece na tela hoje**,
porque a tela lê do array hardcoded, não do banco.

## Objetivo
Categorias de saída viram dado no Supabase, editável — não mais texto fixo no código.

## Escopo
- Incluído:
  1. Criar tabela `jsgrafica_categorias_saida`: `id` (text, slug — ex. `fornecedores`), `nome`
     (text), `ativo` (boolean, default true), `created_at`, `updated_at`. Seguir o mesmo padrão
     de RLS já estabelecido nas demais tabelas `jsgrafica_*` (travada, só `service_role`).
  2. Popular com as 11 categorias já hardcoded em `lib/dados.ts` (mesmos `id`/`nome` — não
     inventar slug novo, usar exatamente os já em uso em `jsgrafica_saidas.categoria_id` hoje,
     pra não quebrar histórico) **mais** a `recargas_dinheiro_pix` que já existe no banco desde
     a demanda 044.
  3. Conferir que todo `categoria_id` já usado em `jsgrafica_saidas` (histórico) tem uma linha
     correspondente nesta tabela nova — não deixar categoria órfã sem cadastro.
- Fora de escopo: mudar a UI (isso é a demanda 050); mexer em `jsgrafica_saidas` em si (só a
  tabela nova de categorias).

## Critérios de aceite
- [ ] Tabela criada com RLS no mesmo padrão das demais
- [ ] 12 categorias inseridas (11 antigas + `recargas_dinheiro_pix`)
- [ ] Nenhum `categoria_id` distinto usado historicamente em `jsgrafica_saidas` fica sem
      correspondência na tabela nova (conferir com uma query de comparação)

## Riscos e cuidados
Usar os `id`/slug exatamente como já estão gravados em `jsgrafica_saidas.categoria_id` hoje —
qualquer diferença (maiúscula/underscore) quebra o vínculo com o histórico.

## Referências
`lib/dados.ts` (`CATEGORIAS_SAIDA`, array a migrar). Tabela `jsgrafica_saidas`
(`categoria_id`/`categoria_nome`). Demanda 044 (categoria `recargas_dinheiro_pix`).

## Relato de execução

### O que foi feito

Criada `jsgrafica_categorias_saida` (`id` text PK, `nome` text, `ativo` boolean default true,
`created_at`/`updated_at`), RLS ligada sem nenhuma policy — mesmo padrão da demanda 025
(só `service_role` acessa).

Antes de popular, conferi ao vivo o `categoria_id`/`categoria_nome` **realmente gravado** em
`jsgrafica_saidas` (não assumi por `lib/dados.ts`) e achei duas divergências entre o hardcoded
e o histórico real:

| id | `lib/dados.ts` (nome) | Histórico real (nome, com contagem) | Usei |
|---|---|---|---|
| `energia` | "Energia Elétrica / Água" | "Energia Elétrica" (18x) | histórico real |
| `recarga_vem` | "Repasse Recarga VEM" | "Repasse Recarga VEM/Celular" (323x) | histórico real |
| `recarga_cel` | "Repasse Recarga Celular" | **nunca usado** (0 linhas) | `lib/dados.ts` (não tem histórico pra preferir) |

**Decisão:** para as 2 categorias com nome divergente, usei o nome que já está gravado em
centenas de linhas de produção, não o do código — é o nome que reflete a realidade, e o texto
do `lib/dados.ts` parece estar desatualizado/nunca foi sincronizado. `id` (a chave que
realmente importa pro histórico) é idêntico em ambas as fontes, então nada quebra.

Populada com as 12 categorias (11 de `lib/dados.ts`, incluindo `recarga_cel` mesmo sem uso
histórico — a demanda pediu essas 11 explicitamente — mais `recargas_dinheiro_pix` da
demanda 044).

### Testes realizados e resultado

```
RLS ligada: true
Total de linhas: 12
categoria_id em jsgrafica_saidas sem correspondência na tabela nova: 0 (nenhum órfão)
SELECT com chave anônima: rows=0, error=null (bloqueado, mesmo padrão das demais tabelas)
```

### Achados fora do escopo
- `recarga_cel` fica cadastrada como categoria válida mas **nunca foi usada em nenhuma linha
  histórica** — só `recarga_vem` (que já cobre tanto VEM quanto Celular na prática). Não sei
  se isso é intencional (categoria disponível mas rara) ou se a tela de saídas nunca de fato
  ofereceu essa opção separada — não decidi, é achado pra quem for construir a demanda 050
  (a tela) considerar se vale manter as duas ou fundir.
- O nome divergente do `lib/dados.ts` em 2 categorias (acima) sugere que esse arquivo não é
  atualizado há um tempo — se o 03-APP for remover `CATEGORIAS_SAIDA` do código na demanda 050
  (trocando por leitura desta tabela nova), isso já resolve sozinho; só registrando o porquê
  da escolha de nome que fiz aqui.

### Status final
**Concluída.** Tabela criada, RLS no padrão, 12 categorias populadas, zero órfãos, testado
bloqueio anônimo.
