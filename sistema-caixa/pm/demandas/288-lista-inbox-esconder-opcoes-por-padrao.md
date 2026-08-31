# 288 — Lista interativa no Inbox: esconder opções por padrão, igual ao WhatsApp real

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16), print da conversa real: a demanda 282 implementou a
renderização de listas interativas no Inbox mostrando o botão ("📋 Ver categorias") **e** todas as
opções já visíveis embaixo, sempre. No WhatsApp de verdade, a lista aparece só como um botão — as
opções só ficam visíveis depois que a pessoa toca nele, abrindo um menu separado. O Edvam quer o
Inbox mais fiel a esse padrão: opções escondidas por padrão, só aparecem com uma ação.

Confirmado com o Edvam (pergunta direta): a opção escolhida é esconder as opções por padrão, com
um clique dentro do próprio Inbox pra revelar — não precisa ser idêntico a abrir um menu separado
do WhatsApp, só não pode ficar tudo exposto de cara como está hoje.

## Objetivo
Mensagem de lista no Inbox mostra só o botão ("📋 Ver categorias" ou o texto real do botão da
mensagem) por padrão; as opções ficam escondidas até alguém clicar, e aí aparecem (expandir/
colapsar dentro da própria bolha da mensagem).

## Escopo
- Incluído: em `components/TelaInbox.tsx` (mesmo componente da 282), mudar a renderização do tipo
  `lista` (`interativo.tipo === 'lista'`) — botão continua sempre visível; as `opcoes` (hoje
  sempre visíveis embaixo) passam a ficar escondidas, reveladas com um clique no próprio botão ou
  num toggle simples (ex. seta/"mostrar opções").
- Incluído: mensagens de botão (`interativo.tipo === 'botoes'`) continuam como estão — a demanda
  282 já testou e o Edvam não reportou problema com essas, só com a lista.
- Incluído: testar na conversa real do Ninho (mesmo caso da 282), clicando/revelando e
  confirmando que as opções aparecem certas.
- Explicitamente fora de escopo: qualquer mudança no que é capturado/extraído do `raw_zapi` (isso
  já está certo desde a 282) — é só sobre como a lista é exibida por padrão.

## Critérios de aceite
- [x] Lista aparece só com o botão por padrão, opções escondidas
- [x] Clicar/interagir revela as opções corretamente
- [x] Mensagens de botão continuam funcionando como antes (sem regressão)
- [x] Testado na conversa real do Ninho

## Riscos e cuidados
Mudança só visual, baixo risco — mesma disciplina de sempre, testar antes de considerar
concluído.

## Referências
Demanda 282 (`pm/demandas/282-*.md`, implementação original, mesmo componente). Print do Edvam
(2026-08-16) mostrando a lista sempre expandida.

## Relato de execução

### O que foi feito
- **`components/TelaInbox.tsx`**: novo estado `listasExpandidas` (`Record<message_id, boolean>`),
  1 entrada por mensagem de lista. O bloco de renderização `interativo.tipo === 'lista'` (demanda
  282) virou um `<button>` clicável (era uma `<div>` estática) — mostra sempre o texto do botão
  ("📋 Ver categorias") com uma seta (▼ fechado / ▲ aberto), e as `opcoes` só renderizam quando
  `listasExpandidas[message_id]` é `true`. Clique alterna esse valor pra aquela mensagem
  específica — cada bolha de lista expande/colapsa independente das outras.
- Mensagens de botão (`interativo.tipo === 'botoes'`) não foram tocadas, exatamente como pedido.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` limpos (2ª tentativa em ambos — erro transiente de spawn/
  IO na 1ª, não relacionado ao código).
- **Conversa real do Ninho** (Playwright, dev local): confirmado por contagem de elementos —
  14 mensagens de lista na conversa, **0 opções visíveis antes de clicar**, **1 conjunto de opções
  visível depois de clicar** (só a lista clicada, as outras 13 continuam fechadas), **0 de novo
  depois de clicar de novo** (colapsa). Print confirma visualmente: bolha clicada mostra "▲" e as
  7 opções (XEROX, IMPRESSÕES, CONSULTA ONLINE, RECARGAS, ESCRITÓRIO, PERSONALIZADOS, Outro);
  as outras bolhas de lista na mesma tela continuam só com "▼", fechadas. Mensagens de botão
  ("✅ Confirmar"/"❌ Não é isso") aparecem sem nenhuma mudança visual, mesmo layout de antes.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo.

### Status final: concluída
