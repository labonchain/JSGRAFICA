# 282 — Inbox não mostra botões e listas interativas, só o texto puro

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16), comparando a mesma conversa lado a lado: no WhatsApp de
verdade, as mensagens do agente Fase B (`206`) aparecem com elementos interativos de verdade —
botões "✅ Confirmar" / "❌ Não é isso" na proposta de preço, e um link "Ver categorias" que abre a
lista de 7 opções quando o pedido é ambíguo. No Inbox do sistema (Admin), a mesma conversa mostra
só o texto puro dessas mensagens, sem nenhum botão nem indicação de que era uma lista/botão de
verdade — perde a experiência real que o cliente teve.

Isso não é exclusivo do agente novo — qualquer fluxo que já usava botão/lista via Z-API antes
(ex. confirmação de pedido "✅ Confirmar"/"❌ Não é isso" do balcão, código Pix) provavelmente tem
o mesmo problema, só ficou mais visível agora porque o agente usa isso com muito mais frequência.

## Objetivo
O Inbox mostra, o mais fiel possível, os elementos interativos reais que o cliente recebeu —
botões e listas de opção — não só o texto solto, pra quem está revisando a conversa entender o
que o cliente realmente viu e pôde clicar.

## Escopo
- Incluído: investigar primeiro se o dado necessário pra renderizar (estrutura do botão/lista
  enviada, não só o texto) está sendo capturado em algum lugar hoje — `jsgrafica_log_msgs_privadas`
  tem colunas `buttons_response`/`list_response`/`selected_button_id`/`selected_row_id`, mas essas
  parecem ser a RESPOSTA do cliente (o que ele clicou), não o que foi OFERECIDO a ele. Confirmar
  se o payload original enviado (`optionList`/`buttonList` mandado pro Z-API) fica gravado em
  algum lugar (`raw_payload`/`raw_zapi` ou similar) — se não estiver, isso pode virar pré-requisito
  desta demanda ou de uma demanda separada, reportar com clareza qual dos dois é o caso.
- Incluído: se o dado existir, atualizar o componente de mensagem do Inbox
  (`components/TelaInbox.tsx`) pra renderizar botões/listas reconhecíveis (não precisa ser clicável
  de verdade dentro do sistema, só visualmente representar o que foi enviado — ex. mostrar os
  botões como chips/labels abaixo do texto da mensagem).
- Incluído: testar com uma conversa real que já tenha mensagem de botão e de lista (a própria
  conversa do Ninho serve de caso real).
- Explicitamente fora de escopo: tornar os botões/listas clicáveis de dentro do Inbox (interação
  real ainda é só pelo WhatsApp do cliente) — é só exibição fiel, não novo canal de interação.

## Critérios de aceite
- [x] Confirmado onde/se o dado do botão/lista original está disponível pra renderizar
- [x] Mensagens de botão mostram os botões (mesmo que só visual, não clicável)
- [x] Mensagens de lista mostram indicação clara de que era uma lista, idealmente com as opções
- [x] Testado numa conversa real com os dois tipos (ex. conversa do Ninho)
- [x] Sem regressão nas mensagens de texto simples (continuam aparecendo normal)

## Riscos e cuidados
Se o dado necessário não estiver sendo capturado hoje, não inventar uma renderização baseada só
no texto (arriscado adivinhar errado o que era botão vs lista) — reportar o achado com clareza e
propor separadamente o que precisaria mudar na captura antes.

## Referências
Print comparativo do Edvam (2026-08-16): mesma conversa no Inbox vs. no WhatsApp real, mostrando
a diferença. `components/TelaInbox.tsx`. `jsgrafica_log_msgs_privadas` (colunas
`buttons_response`/`list_response`/`raw_payload`/`raw_zapi`).

## Relato de execução

### Confirmado: o dado existe, em `raw_zapi`
Investigado antes de escrever qualquer renderização (conforme o risco pedido). Confirmado via SQL
direto que `buttons_response`/`list_response`/`selected_button_id`/`selected_row_id` são mesmo só
a RESPOSTA do cliente, como a demanda desconfiava. Mas `raw_zapi` (coluna `text`, JSON serializado
— igual `raw_payload`) tem o payload original enviado, ecoado de volta pela Z-API quando a
mensagem é confirmada como enviada:
- Mensagem de botão: `buttonsMessage: { message, buttons: [{ buttonId, buttonText: { displayText } }] }`
- Mensagem de lista: `listMessage: { description, buttonText, sections: [{ title, options: [{ title, description, rowId }] }] }`

Confirmado nas 2 mensagens reais da conversa do Ninho ("Confirma?" → botões "✅ Confirmar"/"❌ Não
é isso"; "escolher a categoria" → lista "Ver categorias" com as 7 opções do catálogo).

**Achado à parte, reportado com clareza**: a suspeita da demanda de que isso "não é exclusivo do
agente novo" (confirmação de pedido do balcão, Pix) **não se confirmou nos dados** — busquei em
toda a tabela `jsgrafica_log_msgs_privadas` por `buttonsMessage`/`listMessage` em `raw_zapi` e as
únicas 20 linhas que têm essa estrutura são todas do telefone de teste do Ninho (agente Fase B).
Não achei nenhum vestígio de mensagem de botão/lista pra nenhum outro contato, nem no código do
app (`app/`, `lib/`) nenhuma chamada de `sendButton`/`sendOptionList` da Z-API — o app hoje não
manda botão/lista nenhum diretamente, só texto. Se o fluxo de balcão/Pix realmente usa botão em
algum lugar, é via outro workflow n8n que eu não tenho visibilidade — não afeta a correção desta
demanda (que já funciona pra qualquer mensagem com essa estrutura gravada, venha de onde vier),
só relatando pra não passar a impressão de que testei/confirmei esse caso também.

### O que foi feito
- **`app/api/inbox/mensagens/route.ts`**: adicionado `raw_zapi` na busca (só usado no servidor,
  nunca mandado pro front — tem headers, foto do contato etc. que não precisam sair daqui). Nova
  função `extrairInterativo()` faz o parse e devolve só o necessário: `{tipo: 'botoes', botoes:
  string[]}` ou `{tipo: 'lista', botaoTexto, opcoes: string[]}`. Cada mensagem retornada ganha o
  campo `interativo` (`null` quando não é botão/lista).
- **`components/TelaInbox.tsx`**: campo `interativo` na interface `Mensagem`. Na bolha, logo abaixo
  do texto: botões viram pills arredondadas (uma por linha, com o texto exato do botão, ex. "✅
  Confirmar"); lista vira 1 pill com o texto do botão de abrir ("📋 Ver categorias") + as opções
  listadas embaixo, uma por linha. Só visual, sem `onClick`, como pedido — não é canal de interação
  novo, só mostra fielmente o que o cliente recebeu.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` limpos.
- API isolada: confirmado que `interativo` vem certo nas 20 mensagens reais que têm essa estrutura
  (9 de botão, 11 de lista).
- **Conversa real do Ninho** (Playwright, dev local): print confirma as pills de "✅ Confirmar"/"❌
  Não é isso" e a pill "📋 Ver categorias" com as 7 opções da lista embaixo, junto às mensagens de
  texto simples ao redor renderizando normal.
- **2ª conversa sem elemento interativo** (Bernardo Wandesllan): sem regressão, texto normal.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
A suspeita de "não exclusivo do agente novo" não se confirmou nos dados hoje (detalhado acima) —
não abri demanda nova por falta de evidência de onde mais isso aconteceria.

### Status final: concluída
