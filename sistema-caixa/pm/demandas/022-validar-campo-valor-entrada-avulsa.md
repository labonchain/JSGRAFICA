# 022 — Validar campo Valor na Entrada Avulsa (PDV e mini-PDV do Inbox)

Status: aprovada — baixa prioridade
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado na demanda 002: uma venda registrada via "Entrada Avulsa" saiu com texto colado
("R$\n\nnasdnasda$ 8,50") no meio do valor — o campo aceita texto livre colado sem validar
formato de moeda.

## Objetivo
Validar o campo Valor pra só aceitar número/formato monetário.

## Escopo
- Incluído: campo Valor (tela "Lançar Venda" → Entrada Avulsa, e o mini-PDV dentro do Inbox)
  só aceita dígitos e formatação de moeda; bloquear ou sanitizar colagem de texto.
- Fora de escopo: mudar o campo Descrição (esse pode ser texto livre mesmo).

## Critérios de aceite
- [ ] Colar texto no campo Valor não gera valor inválido
- [ ] Testado no PDV e no mini-PDV do Inbox

## Referências
`pm/demandas/002-investigar-inbox-nao-reflete-log.md`.

## Relato de execução

### O que foi feito
- `lib/dados.ts`: adicionada função `sanitizarValorMonetario(texto)` — remove qualquer
  caractere que não seja dígito, vírgula ou ponto (`replace(/[^\d,.]/g, '')`). Mantém vírgula
  como separador decimal porque o parse existente (`adicionarAvulso`, em todos os 3 lugares)
  já faz `valor.replace(",", ".")` antes de `parseFloat`.
- Havia **3 lugares** com o campo Valor da Entrada Avulsa, todos com o mesmo padrão
  duplicado — corrigidos os três:
  - `app/page.tsx` (Admin → aba "Lançar Venda" → Entrada Avulsa)
  - `app/pdv/page.tsx` (PDV → Entrada Avulsa)
  - `components/TelaInbox.tsx` (mini-PDV dentro do Inbox → Entrada Avulsa)
  Em cada um: trocado `type="number"` por `type="text" inputMode="decimal"` (mantém teclado
  numérico no celular) e o `onChange` agora sanitiza com `sanitizarValorMonetario()` antes de
  gravar no estado — tanto digitação quanto colagem passam pelo mesmo `onChange`, então colar
  texto sujo já sai filtrado no próprio evento, sem precisar de handler de paste separado.
- Campo Descrição não foi tocado (fora de escopo, continua texto livre).

### Por que trocar de `type="number"` pra `type="text"`
O campo já era `type="number"`, mas isso tem duas lacunas: (1) o comportamento de colar texto
em `<input type="number">` varia entre navegadores — em alguns aceita colar dígitos misturados
com letras e trava o valor como inválido silenciosamente; (2) o parse já espera vírgula como
decimal (padrão BR, `8,50`), mas `type="number"` nativo do HTML só aceita ponto como decimal
em boa parte dos navegadores — ou seja, digitar "8,50" à moda brasileira já não funcionava
direito antes. Com `type="text"` + sanitização própria, o comportamento fica controlado e
consistente nos três lugares, e vírgula continua funcionando.

### Testes realizados
- `npm run build` e `npx tsc --noEmit` — build de produção e checagem de tipos passaram
  limpos depois da mudança.
- Testei a função `sanitizarValorMonetario` isolada via `node -e` com o texto exato do
  incidente da demanda 002 (`"nasdnasda$8,50"` → sanitiza pra `"8,50"`) e outros casos (texto
  puro sem número → sanitiza pra string vazia, que o `adicionarAvulso()` já rejeita por não
  ser um valor `> 0`; número com letra grudada → mantém só os dígitos).
- **Não testei clicando de verdade no navegador** (não tenho ferramenta de browser disponível
  nesta sessão) — a lógica foi verificada isoladamente e o build passou, mas o critério de
  aceite "testado no PDV e no mini-PDV do Inbox" não foi confirmado via interação real de UI.
  Recomendo ao Edvam um teste manual rápido: colar algo como `abc123,45xyz` no campo Valor nos
  três lugares e confirmar que só sobra `123,45`.

### Deploy
`npx vercel --prod --yes` — deployment `dpl_6uLCAbfghJZdr7ZM5aFxrQZLqFgh` (bundlado junto com
a demanda 019), aliased pra `pdv.jsgrafica.site`. Confirmado 200 em produção em
`admin.jsgrafica.site` e `pdv.jsgrafica.site` depois do deploy.

### Status final
**Parcial** — código implementado, buildado, deployado em produção, e com a lógica central
verificada isoladamente, mas sem confirmação por teste manual em navegador real (ver ressalva
acima). Se o Edvam encontrar algo estranho ao testar de verdade (colar texto no campo Valor),
é fácil de ajustar.
