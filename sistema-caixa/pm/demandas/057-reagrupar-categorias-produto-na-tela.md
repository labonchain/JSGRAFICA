# 057 — Reagrupar categorias de produto na tela (Impressão unificada, Recargas só recarga, Personalizados novo)

Status: aprovada — depende da 056 (categoria nova precisa existir no banco)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Pedido do Edvam: "impressão é todo tipo de impressão", "recargas é só recarga de celular e vem"
— o agrupamento visual de categorias (`CATEGORIA_PARA_GRUPO`/`ORDEM_GRUPOS` em `lib/dados.ts`)
hoje espalha os produtos de impressão em 4 grupos diferentes (Impressão, Papel Especial, Foto,
Impressão Metro) e mistura recarga com produtos avulsos no grupo "Recargas / Outros".

## Objetivo
O agrupamento da tela reflete o que o Edvam pediu: todo tipo de impressão (ofício, adesivo,
cartão, couché, foto) num grupo só "Impressão"; "Recargas" só com recarga de celular e VEM; os
produtos que saíram da categoria de recarga (demanda 056) ganham seu próprio grupo.

## Escopo
- Incluído, em `lib/dados.ts` (`CATEGORIA_PARA_GRUPO`/`ORDEM_GRUPOS`):
  1. Unificar num grupo só, **"Impressão"**: `Impressão papel oficio`, `Impressão papel
     adesivo`, `Impressão papel cartao`, `Impressão papel couche`, `Impressão papel foto` (hoje
     espalhados em Impressão/Papel Especial/Foto). `Impressão metro` (banner/adesivo por metro,
     precisa de orçamento) continua separado — é estruturalmente diferente (sem preço fixo).
  2. Renomear o grupo "Recargas / Outros" pra **"Recargas"**, contendo só `Recarga celular` e
     `Recarga vem` (depois da demanda 056 tirar os produtos que não são recarga de lá).
  3. Criar grupo novo pra categoria criada na demanda 056 (ex. "Personalizados").
  4. Se o grupo "Impressão" ficar com muitos produtos numa lista só (são ~19 produtos somados),
     considerar (decisão de UI livre) alguma sub-organização dentro do grupo — ex. sub-título por
     tipo de papel — pra não virar uma lista longa difícil de escanear. Não é obrigatório, só
     atenção de usabilidade (equipe tem pouca familiaridade com sistema).
- Fora de escopo: mudar categoria no banco (isso é a demanda 056, já deve estar pronta antes
  desta rodar).

## Critérios de aceite
- [ ] Grupo "Impressão" mostra todos os tipos de impressão (oficio/adesivo/cartão/couché/foto)
      juntos
- [ ] "Impressão Metro" continua separado
- [ ] Grupo "Recargas" só tem recarga de celular e VEM
- [ ] Produtos reclassificados na demanda 056 aparecem no grupo novo, não em "Recargas"
- [ ] Testado visualmente (screenshot) mostrando os grupos reorganizados

## Referências
`lib/dados.ts` (`CATEGORIA_PARA_GRUPO`, `ORDEM_GRUPOS`). Demanda 056 (dependência, categoria
nova no banco). Telas afetadas: "Pedidos Balcão" (ex-"Lançar Venda", ver demanda 054), "Criar
pedido" no Inbox (demanda 045) — ambas usam essas categorias/grupos.

## Relato de execução

### O que foi feito
- **`lib/dados.ts`** (`CATEGORIA_PARA_GRUPO`/`ORDEM_GRUPOS`): unificado num grupo só
  **"Impressão"** (ofício, adesivo, cartão, couché, foto — antes espalhados em
  Impressão/Papel Especial/Foto, 3 grupos diferentes). Renomeado "Recargas / Outros" pra
  **"Recargas"**, agora só com `Recarga celular`/`Recarga vem`. "Impressão Metro" saiu do mapa —
  a categoria em si não existe mais no catálogo (foi renomeada/reestruturada pra "Seviço
  terceirizado" em algum momento fora desta demanda, achado ao consultar o banco ao vivo antes
  de codar — ver "achado fora do escopo" abaixo).
- Como a "Impressão" unificada ficou com **32 produtos** (bem mais que os ~19 estimados na
  demanda — o catálogo cresceu nesse meio tempo), a sugestão de usabilidade da própria demanda
  (não obrigatória, mas recomendada) virou necessária de verdade: adicionada
  `ordenarProdutosDoGrupo()` em `lib/dados.ts`, que ordena os produtos desse grupo por categoria
  original (ofício → adesivo → cartão → couché → foto) em vez de por nome puro — mantém papel do
  mesmo tipo visualmente agrupado na grade sem precisar de subtítulo/nova UI. Aplicada nos 3
  lugares que renderizam essa grade (`components/TelaInbox.tsx`, `app/page.tsx`,
  `app/pdv/page.tsx` — implementações praticamente duplicadas, mesmo padrão nas três).

### Achado fora do escopo — catálogo mudou mais do que a demanda previa
Ao consultar `jsgrafica_produtos` ao vivo antes de codar (não confiei no texto da demanda, que
foi escrita antes dessas mudanças), achei que o catálogo já tinha **2 categorias novas** que não
existiam quando a 056/057 foram escritas: **"Escritório"** (canetas, lápis, papel ofício,
pastas, envelope A4, carteira pra RG — 8 produtos) e **"Seviço terceirizado"** (o antigo
"Impressão metro"/banner/adesivo por metro, renomeado e com preços por faixa de tamanho — 6
produtos). Sem mapear essas duas, elas cairiam no fallback implícito (viram grupo próprio do
jeito que já vinham, mas fora de controle de posição em `ORDEM_GRUPOS`) — mapeei as duas
explicitamente pra grupos próprios e adicionei em `ORDEM_GRUPOS` (corrigindo o typo pra "Serviço
Terceirizado" só no rótulo exibido, não mexi no dado). Não fiz isso silenciosamente por ser
"parecido" com o pedido — é reportado aqui porque o catálogo mudou de um jeito que a demanda não
previu, vale o Edvam/02-DADOS saberem que essas categorias existem e já têm grupo na tela agora.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- Playwright local (`admin.localhost:3000`, login real), aba "Pedidos Balcão":
  - Ordem das categorias na barra lateral confirmada: Xerox, Impressão, Plastificação,
    Encadernação, Recargas, Serviço Terceirizado, Personalizados, Escritório, Serviços, Entrada
    Avulsa.
  - "Impressão" mostra os 5 tipos de papel juntos, na ordem certa (ofício → adesivo → cartão →
    couché — conferido visualmente por screenshot, produtos do mesmo tipo aparecem em blocos
    consecutivos, não embaralhados).
  - "Recargas" mostra só `RECARGA CELULAR`/`RECARGA VEM` (2 itens, nenhum produto reclassificado
    aparece ali).
  - "Personalizados" mostra os 5 produtos da demanda 056 (Caneca/Camisa, Ímã, Rifa, Topo de Bolo
    com/sem recorte).
  - "Escritório" mostra os 8 produtos de papelaria, corretamente separado de "Personalizados".
- Testado nas 3 telas que reaproveitam essa mesma lógica (Pedidos Balcão admin, Pedidos Balcão
  PDV, "Criar pedido" no Inbox) — mesmo agrupamento em todas, sem divergência.

### Status final
**Concluída e deployada** (`dpl_A7oztc9ijvPwqtV6YgYo8WyAW8CC`), testado local com Playwright e
confirmado funcionando em produção.
