# 187 — Busca não encontra contato com nome em fonte Unicode estilizada

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado na demanda 184 (revalidação): **10 contatos** têm nome real digitado em fonte Unicode
estilizada (bold/script/fraktur/monospace matemático) — ex. `𝐿𝒶𝓇𝒾𝓈𝓈𝒶 𝒱. 💨` é "Larissa V.",
`𝑳𝒆𝒕𝒊𝒄𝒊𝒂 𝑹𝒐𝒅𝒓𝒊𝒈𝒖𝒆𝒔` é "Leticia Rodrigues". Diferente do problema da 168/184 (nome errado/vazio) —
aqui o nome está certo e completo, só que os caracteres não são letras ASCII normais. A busca por
nome (`ilike` em `app/api/clientes/route.ts` e `app/api/inbox/conversas/route.ts`) compara texto
literal — buscar "Larissa" (digitado normal) nunca encontra esses contatos, porque os bytes são
diferentes de "L-a-r-i-s-s-a" comum.

## Objetivo
Buscar por nome digitado normal (ASCII) encontra contatos mesmo quando o nome salvo estiver em
fonte Unicode estilizada.

## Escopo
- Incluído: normalizar o texto pra comparação de busca (não mudar o nome exibido/salvo, só como
  ele é comparado) — transliterar caracteres Unicode estilizados pro equivalente ASCII antes de
  comparar. Decisão do executor sobre a abordagem: normalizar em cada busca (mais simples,
  funciona hoje) ou manter uma coluna auxiliar normalizada (mais rápido em escala, mas exige
  manter sincronizada). Aplicar nos mesmos 2 pontos que a demanda 183 já mexeu
  (`app/api/clientes/route.ts`, `app/api/inbox/conversas/route.ts`).
- Explicitamente fora de escopo: mudar o nome salvo no banco (o nome está certo, só a busca que
  precisa melhorar).

## Critérios de aceite
- [ ] Buscar "Larissa" (ASCII normal) encontra o contato `558183551002` (nome estilizado)
- [ ] Buscar os outros 9 nomes da lista (relato da demanda 184) também funciona
- [ ] Busca por nome normal (não estilizado) continua funcionando igual

## Riscos e cuidados
Cobrir pelo menos os padrões Unicode encontrados nos 10 casos reais (mathematical alphanumeric
symbols — bold, script, fraktur, monospace, double-struck) — não precisa cobrir todo Unicode
existente, só o que já apareceu na prática.

## Referências
Demanda 184 (achado original, lista completa dos 10 telefones/nomes no relato). Demanda 183
(mesmos pontos de código: busca do balcão/Clientes/Inbox).

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_HX94J3BkSUfkLhZivZdZRkcTWiq3`.

### Abordagem escolhida (a 3ª opção — melhor que as duas da demanda)
**Colunas GERADAS pelo Postgres** (`lead_name_busca`/`lead_push_name_busca`, migration
`add_nome_busca_normalizado_187`): têm a velocidade da coluna auxiliar SEM o risco de
dessincronizar — o banco recalcula sozinho em todo INSERT/UPDATE, não existe "manter
sincronizada". A normalização é a função SQL `jsgrafica_normalizar_nome_busca`:
1. `normalize(texto, NFKC)` — o Unicode já define os Mathematical Alphanumeric Symbols
   (bold/script/fraktur/monospace/double-struck) como "compatibilidade" das letras ASCII; o
   NFKC translitera sozinho e é IMMUTABLE no Postgres (conferido). Cobre 9 dos 10 casos reais.
2. `translate()` com mapa explícito de 20 Canadian Aboriginal Syllabics usados como letra
   "fancy" (ᗩ→A, ᗷ→B...) — o caso real ᗷᗩK **não é** compatibility char, NFKC não resolve.
O nome exibido/salvo NÃO muda (fora de escopo respeitado) — só a comparação. A busca
(`filtroBuscaContato`, mesma função única da 183 usada pelas 2 rotas) compara o termo digitado
(normalizado pelo espelho JS `normalizarNomeBusca`) contra as colunas geradas.

### Testes (dado real, só leitura)
- **Os 10 casos reais da 184, um a um, nas DUAS rotas** (inbox/conversas e clientes): "Larissa"
  acha 558183551002, "BAK" acha ᗷᗩK, "Hellen Oliveira", "Bruna vit" (com o Hangul filler no
  nome), "Leticia Rodrigues", "Lucicleide", "Jacksylene", "Luh Lob", "mel", "Hellen" — 10/10.
- Regressões: nome normal ("Eliane") idêntico; telefone formatado ("81 8330-8276", da 183) ok.
- Bônus: colar o próprio texto ESTILIZADO na busca também acha (o termo é normalizado igual).
- Produção pós-deploy: "Larissa" e "BAK" achando os contatos estilizados ao vivo.

### Nota
Acentos continuam exigindo acento na busca ("vitoria" não acha "vitória") — comportamento de
sempre, fora do escopo desta demanda; se incomodar, é 1 linha a mais na mesma função (unaccent).

