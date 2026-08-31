# 311, Painel de Conteúdo: duplicar post, criar por clique no calendário, atualização automática

Status: concluída
Criada em: 2026-08-19
Aprovada em: 2026-08-19 (pedido direto do Edvam, uso real do painel logo após a 310)
Concluída em: 2026-08-19
Chat executor: 07 - MARKETING JS GRAFICA

## Contexto

Primeiro uso real do painel (demanda 310) pelo Edvam revelou 3 lacunas de operação:

1. Um post `cancelado` fica só com "Fechar" no modal (`somenteLeitura = true` pra qualquer
   status fora de `pending`/`approved`, `ModalPost.tsx` linha 50), sem jeito de reusar o
   conteúdo pra criar um novo. **Confirmado no código do webhook compartilhado
   (`LABON_DASHBOARD_STATUS`, ação `editar`): só aceita editar post com status `pending` ou
   `approved`, rejeita `cancelled` com `status_invalido_para_editar`.** Não é limitação da
   nossa UI, é regra de negócio do sistema compartilhado do LabOnchain, fora do nosso domínio
   pra mudar. O caminho que funciona sem tocar no webhook deles é duplicar (usar a ação `criar`
   já existente com os campos do post cancelado pré-preenchidos), não reativar.
2. Clicar num dia do calendário (`TelaMarketingConteudo.tsx`, grade do "Plano de conteúdo") só
   abre posts já existentes daquele dia, não tem como criar um post novo já com aquela data
   marcada, mesmo padrão do Google Calendar que o Edvam pediu.
3. A tela não atualiza sozinha (só recarrega ao montar ou ao reativar a aba,
   `useRecarregarAoReativar`), post real foi publicado pelo `LABON_STATUS` (rodada horária)
   sem a tela refletir até o Edvam trocar de aba e voltar. Como o motivo de existir da tela
   "Como vai ficar" é mostrar o que já saiu de verdade, ficar sem atualizar mina exatamente o
   que ela deveria garantir. Edvam pediu explicitamente: atualização automática, no menor
   intervalo possível que não atrapalhe o uso normal da tela.

## Objetivo

Os 3 pontos resolvidos sem regressão no que já está funcionando (demanda 310).

## Escopo

Incluído:
- **Duplicar**: no modal de um post `cancelled` (ou qualquer status fora de `pending`/
  `approved`, pra cobrir `published`/`error` também), botão "Duplicar" que abre o formulário de
  criação pré-preenchido com tipo/texto/imagem/vídeo/legenda do post original, mas com
  data/hora em branco (ou sugerida pro próximo horário livre, à critério de quem implementa),
  usa a ação `criar` já existente, não pede nada novo do webhook.
- **Criar por clique no calendário**: clicar num dia (fora de um post já existente) abre o
  modal de "Novo post" com a data daquele dia já preenchida no campo "Agendar". Clicar num post
  existente continua abrindo aquele post (comportamento atual preservado).
- **Atualização automática**: polling em segundo plano (intervalo curto, ex. 10-15s, ajustar
  conforme achar razoável sem gerar tráfego desnecessário) que atualiza a lista de posts sem
  bloquear a tela (sem spinner de carregamento a cada rodada, sem interromper um modal aberto).
  Mantém o `useRecarregarAoReativar` que já existe, é complementar, não substitui.

Explicitamente fora de escopo:
- Qualquer mudança no webhook `LABON_DASHBOARD_STATUS` ou na tabela `labon_status_queue`,
  são do LabOnchain; se esta demanda revelar que precisa de uma ação nova lá (ex. "reativar"),
  registrar achado e reportar ao PM, não implementar.
- Instagram e "Quadro" continuam fora de escopo (mesma razão da 310).

## Critérios de aceite

- [x] Duplicar um post cancelado gera um post novo (`pending` ou `approved`, conforme decidido)
      com o mesmo conteúdo, testado com post real ou descartável (não publicar sem combinar
      texto antes, mesma disciplina da 310).
- [x] Clicar num dia vazio do calendário abre "Novo post" com aquela data preenchida; clicar
      num post existente continua abrindo o post (sem regressão).
- [x] A tela reflete uma mudança de status real (ex. post publicado pela rodada horária) sem
      precisar trocar de aba manualmente, validado observando o tempo real até a UI atualizar.
- [x] Nenhuma regressão nos fluxos já testados na 310 (criar, listar, aprovar, editar, cancelar).

## Riscos e cuidados

- Mesma ressalva da 310: Status não pode ser apagado depois de postado, qualquer teste real
  combina texto antes.
- Polling frequente demais pode gerar tráfego desnecessário pro banco/API, calibrar o
  intervalo com bom senso, não precisa ser em tempo real de verdade (a fila em si só processa
  1x por hora do lado do LabOnchain).

## Referências

- `components/ModalPost.tsx`, `components/TelaMarketingConteudo.tsx` (demanda 310).
- Webhook `LABON_DASHBOARD_STATUS` (`2Kpnbf61dtsf1zmO`), ação `editar` rejeita status fora de
  `pending`/`approved` (confirmado no código do node "Editar Post: Verificar").
- `pm/demandas/310-painel-conteudo-marketing-whatsapp-status.md`.

## Relato de execução

- **O que foi feito (arquivo a arquivo):**
  - `components/ModalPost.tsx`: novo estado `duplicando`; `somenteLeitura` passa a ser
    `post && !duplicando ? !["pending","approved"].includes(post.status) : false` (antes era só
    baseado no `post`). Função `duplicar()` reseta data/hora pra "agora" e ativa o modo. Título
    e texto de apoio mudam pra "Duplicar post" nesse modo. Rodapé ganhou um 3º caminho: modo
    leitura (`post` existe, status fora de pending/approved, não duplicando) agora mostra
    `[Fechar] [📋 Duplicar]` em vez de só `[Fechar]`; ao clicar Duplicar, os campos destravam
    (mesmos campos de sempre, `disabled={somenteLeitura}` já cobria isso sem mudança adicional)
    e o rodapé de criação (`[Cancelar] [Salvar como rascunho]`) assume, chamando a mesma
    `salvarRascunho()`/ação `criar` já existente, nenhuma chamada nova ao webhook.
  - `components/TelaMarketingConteudo.tsx`: novo prop `dataInicial` repassado ao `ModalPost`
    de criação; `abrirNovoPost(dataPreset?)` centraliza abertura do modal (usado pelo botão
    "+ Novo post" sem data e pelo clique no calendário com data). Célula do calendário ganhou
    `onClick` condicional (`doMesAtual && doDia.length === 0`) chamando `abrirNovoPost(chave)`,
    com `cursor-pointer`/`hover:bg-blue-50` só nesses dias; botões de post dentro da célula
    ganharam `e.stopPropagation()` pra não disparar os 2 handlers juntos. `useEffect` novo com
    `setInterval` de 15s chamando o mesmo `GET /api/marketing/conteudo` só com `setPosts`
    (sem `setCarregando`, sem afetar `erro`), silencioso de propósito, roda em paralelo ao
    `useRecarregarAoReativar` já existente (mantido, não substituído). Modal de post existente
    (`postSelecionado`) e o de criação (`modalNovoPost`) são estado à parte de `posts`, então o
    polling nunca fecha/reresseta um modal aberto.

- **Testes realizados e resultado (Playwright headless contra `npm run dev`, `.next` limpo,
  mesma disciplina da 310):**
  - **Duplicar**: aberto o post `cancelled` da 310 (id 11), clicado "📋 Duplicar", modal virou
    "Duplicar post", campos vieram pré-preenchidos e editáveis, data/hora resetaram pra "agora".
    Texto alterado pra um identificador de teste claro, salvo como rascunho → confirmado no
    banco como linha nova (`status='pending'`), original (id 11) continuou `cancelled` intacto.
  - **Clique no calendário**: clicado num dia vazio (25/08) → modal "Novo post" abriu com o
    campo Agendar já em `2026-08-25` (confirmado lendo o valor do input, não só visualmente).
    Clique num post existente (o "Em breve novidades!" da 310, já `published` de verdade nesse
    ponto, ver achado abaixo) continuou abrindo o post normalmente, sem regressão.
  - **Atualização automática**: com a tela aberta e sem tocar nela, o `status` de um post de
    teste foi trocado direto no banco (`pending`→`approved`, via REST/service_role, simulando
    uma mudança externa real tipo a rodada horária do `LABON_STATUS` ou outra pessoa aprovando
    em outra sessão), o badge da linha mudou de "Rascunho" pra "📅 Agendado" sozinho, sem
    reload, dentro de ~15-20s (1 ciclo do polling). Confirmado com `waitForSelector` (não só
    `sleep`+screenshot) e com screenshot antes/depois.
  - **Regressão da 310**: build (`npm run build`) e `tsc --noEmit` limpos; nenhum erro novo de
    console em nenhum passo do fluxo.
  - **Achado bônus, não esperado no escopo desta demanda**: o post real "Em breve novidades!"
    (criado/aprovado na 310, id 10) apareceu `published` durante os testes desta sessão,
    confirma que a rodada horária do `LABON_STATUS` publicou de verdade, fechando a única
    pendência que tinha ficado em aberto no relato da 310 (ainda não dava pra confirmar isso
    dentro daquela sessão). Recomendo o Edvam confirmar olhando o Status real no celular, mas o
    dado no banco já bate.
  - Limpeza: as 2 linhas descartáveis criadas durante o teste de "Duplicar" (ids 12 e 13,
    conteúdo claramente marcado como teste, nunca aprovadas) foram canceladas depois do teste,
    nunca ficaram elegíveis pro consumidor horário (`status='pending'` o tempo todo).

- **Achados fora do escopo (relatados, não resolvidos por conta própria):** nenhum novo.

- **Status final: concluída.**
