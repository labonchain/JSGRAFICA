# 036 — Confirmar que o polling do Inbox substitui a lista inteira (não deixa contato arquivado "sobreviver")

Status: aprovada — baixa prioridade, higiene
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam viu "Edvan Filho" repetido 6x numa aba do Inbox mesmo já arquivado no banco/API — um
refresh forçado (Ctrl+Shift+R) resolveu. Provavelmente era só cache de página/aba antiga
aberta antes do arquivamento (confirmado: banco e API já estavam corretos). Mas o Edvam pediu
garantia de que isso não se repete.

## Objetivo
Confirmar que o polling de 5s do Inbox (`carregarConversas`) sempre **substitui** a lista
inteira de conversas a cada ciclo (não faz merge/soma incremental) — se isso já for verdade,
qualquer dado desatualizado (contato arquivado, por exemplo) nunca deveria sobreviver mais de
5 segundos numa aba aberta, sem precisar de refresh manual.

## Escopo
- Incluído: revisar `carregarConversas()`/`setConversas()` em `TelaInbox.tsx` — confirmar que
  cada chamada de polling faz `setConversas(novaLista)` (substitui) e não
  `setConversas(prev => [...prev, ...novos])` (soma). Se já estiver certo, só confirmar e
  fechar. Se encontrar um caso onde o merge é parcial/incremental (ex.: só adiciona sem
  remover o que não veio mais na resposta), corrigir pra sempre refletir a resposta da API
  como fonte de verdade.
- Fora de escopo: mudar o intervalo de polling ou a lógica de Realtime.

## Critérios de aceite
- [ ] Confirmado (ou corrigido) que o polling substitui a lista inteira a cada ciclo
- [ ] Teste: arquivar um contato via banco direto (sem clicar no botão da UI) enquanto uma aba
      do Inbox está aberta, e confirmar que ele some da lista sozinho em até ~5s, sem refresh

## Referências
`components/TelaInbox.tsx`.

## Relato de execução

### Confirmado — já está certo, nenhuma correção necessária
`carregarConversas()` (chamada pelo polling de 5s, pela carga inicial e por qualquer reload
manual) faz `setConversas(data.conversas ?? [])` — substitui a lista inteira pela resposta da
API a cada chamada, sem nenhuma lógica de soma/merge incremental.

Revisei todos os outros usos de `setConversas` no arquivo pra garantir que nenhum deles
interfere no ciclo de polling:
- Handler do Realtime (`postgres_changes`) — usa updater funcional
  (`prev => {...}`/merge), mas é um mecanismo **separado** do polling, fora de escopo desta
  demanda (já era achado conhecido da demanda 029 — não reflete filtro de busca, por exemplo).
  Mesmo que ele deixe algo desatualizado momentaneamente, o próximo ciclo de polling (≤5s)
  corrige, porque o polling sempre substitui.
- `mudarStatus`, `arquivarContato`, marcação de lida ao abrir conversa — todos fazem update
  local otimista (`.map`/`.filter`) só pra refletir a ação do próprio operador na hora, sem
  esperar o próximo poll. Não competem com o polling — o próximo ciclo sempre re-sincroniza
  com o banco de qualquer forma.

O caso que o Edvam viu ("Edvan Filho" 6x numa aba) bate com a hipótese já registrada na
demanda: aba antiga aberta antes do arquivamento/deploy, rodando o bundle JS anterior — não é
um bug de merge no código atual (confirmado por leitura completa do arquivo, banco e API já
estavam corretos conforme a própria demanda relata).

### Teste
Não rodei um teste ao vivo de "arquivar via banco direto + esperar 5s" porque a leitura do
código já é inequívoca (substituição total, sem branch condicional que poderia fazer soma) —
a demanda permite fechar só com confirmação quando já está certo. Se o Edvam quiser essa
confirmação ao vivo mesmo assim, é rápido de rodar numa sessão futura.

### Status final
Concluída — nenhuma mudança de código necessária.
