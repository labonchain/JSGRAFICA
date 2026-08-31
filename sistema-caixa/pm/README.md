# PM, Integração WhatsApp / Z-API / n8n / Supabase (JS Gráfica)

## Regra 0, vale pra todo mundo: nunca usar travessão

**Nunca é permitido usar travessão em nenhuma página, arquivo, documento, nem em nenhuma
mensagem de nenhum chat.** Não importa qual chat/agente escreve, nem se é o Edvam escrevendo:
travessão está errado e não deve ser usado, em nenhuma circunstância. Onde já foi usado (arquivo
antigo, relato de demanda, memória, código com mensagem pro cliente) deve ser corrigido assim
que encontrado, não é regra só "daqui pra frente", é regra sempre que o travessão for achado,
onde quer que esteja. Usar vírgula, ponto final, ou reescrever a frase em duas frases, nunca
travessão.

Esta é a primeira regra do documento de propósito: nenhuma outra regra abaixo vale mais que essa.

---

Esta pasta é o campo de trabalho do chat **"00 - PM JS GRAFICA"**. Existe porque o sistema
foi montado em pedaços separados, em épocas diferentes, e agora esses pedaços estão sendo
reconectados. O objetivo desta pasta é não perder o fio da meada entre sessões e entre chats.

Quando o git deste projeto for inicializado, esta pasta sobe junto, ela já nasce pensada
para virar histórico versionado, não é um rascunho descartável.

## Os dois documentos principais

- **`TAREFAS.md`**: o que despachar. Organizado por sessão/data, com o texto pronto pra
  copiar e colar em cada chat do time. É o documento operacional do dia a dia.
- **`PRODUTO.md`**: o que o sistema é e em que estado está agora. Atualizado pelo PM sempre
  que uma tarefa é concluída e muda a realidade do produto. Não é histórico (isso é
  `HISTORICO.md`), é a foto atual.

O resto (`demandas/`, `investigacoes/`, `equipe/`) é suporte: detalhe fino, relato de
execução, e briefings de onboarding, não precisa ser lido toda hora, só quando for direto ao
ponto.

## Papel do "00 - PM JS GRAFICA"

O PM **não investiga e não executa nada diretamente** (nem código, nem SQL, nem n8n), quem
investiga e executa são os chats do time, cada um dentro do seu domínio. O PM:

- Analisa os relatos/reports que os chats do time trazem de volta.
- Confere implementações e mudanças contra os critérios de aceite da demanda.
- Atualiza o status do projeto (`demandas/STATUS.md`, `HISTORICO.md`) com base nesses relatos.
- Elabora demandas e os briefings de cada chat (`equipe/`), e manda para o Edvam o que precisa
  de aprovação.
- Documenta tudo com o nível de confiança real (verificado pelo time vs. hipótese vs. o que o
  usuário informou diretamente), evitar afirmar como fato o que é só relato de terceiros
  ainda não conferido.

O Edvam pode encaminhar diretamente os prompts/demandas para os chats do time, o PM não
precisa ser o único canal de despacho.

**Onboarding do PM (checklist pós-clear)**: assim como cada chat do time tem o próprio briefing
em `equipe/`, o PM também tem o dele, `pm/equipe/00-pm.md`. Se esta janela for limpa, a sessão
nova lê esse arquivo primeiro, ele já tem o checklist completo de leitura pós-clear.

> Nota: a investigação de 2026-07-02 (arquivo em `investigacoes/`) foi feita pelo PM
> diretamente, antes desse modelo ficar definido, tratar como bootstrap único, não como
> padrão. Dali em diante, qualquer nova investigação (n8n → 01, Supabase/dados → 02, código
> do app → 03) é delegada ao chat do domínio correspondente.

## Time de chats

Cada demanda aprovada é executada por um chat auxiliar dedicado a um domínio, isso evita
dois chats mexendo no mesmo sistema ao mesmo tempo e gerando conflito. Cada chat só executa
demandas do seu domínio; se uma demanda cruza domínios, o PM quebra em duas demandas
sequenciais (uma por chat), nunca manda duas em paralelo sobre a mesma coisa.

| Chat | Domínio | Toca | Não toca |
|---|---|---|---|
| **00 - PM JS GRAFICA** | Coordenação (este chat) | Investigação read-only, `pm/`, memória, redação de demandas | Nada de produção |
| **01 - N8N JS GRAFICA** | Automação n8n | Workflows ativos reais (`01 LOG RECEBIDAS`, `03 STATUS MSG`, `297 CAMINHO C AGENTE` + ferramentas `296`, `12 SYNC CONNECTED_PHONE`, `13 LEMBRETE PIX PENDENTE`, `REPORT SHEETS` x2), mais `206` (congelado, fallback de reversão) e `JSGRAFICA_ATENDIMENTO_AI`/`06 PEDIDOS` (pausados por decisão de produto, não descontinuados), roteamento, credentials do n8n. Lista completa e atualizada: `pm/conhecimento/mapa-workflows-n8n.md` | Código do Next.js, schema do Supabase |
| **02 - DADOS JS GRAFICA** | Supabase | Migrations, schema, RLS, Realtime, auditoria/limpeza de dados via SQL direto, backfills | Workflows n8n, código do app |
| **03 - APP JS GRAFICA** | `caixa-js-grafica` (Next.js) | PDV, Admin, Inbox, rotas de API, deploy Vercel | Workflows n8n, schema do Supabase (só consome) |
| **04 - FRONTEND JS GRAFICA** | UI do `caixa-js-grafica`, em paralelo ao 03-APP | **Reativado em 2026-08-28**, briefing formal criado pela primeira vez (`equipe/04-frontend.md`). Ficou inativo de 2026-07-08 (demanda 122) até aqui. Só pega demanda explicitamente atribuída pelo PM (nunca trabalho geral por conta própria), porque toca o mesmo território de arquivo do 03-APP; o PM nunca despacha os dois na mesma tela/rota ao mesmo tempo. | Schema Supabase, workflows n8n, qualquer coisa fora da demanda explicitamente atribuída (resto do app é do 03-APP) |
| **05 - FINANCEIRO JS GRAFICA** | Fluxo de caixa e financeiro | `jsgrafica_pedidos`/`_saidas`/`_transferencias`/`_fechamento`, conciliação com extrato real do Mercado Pago, auditoria de divergência | Correção de dado/código (propõe demanda pro 02/03), UI não financeira, n8n |
| **06 - AUTOMAÇÃO ATENDIMENTO INBOX** | Design de conversação e automação de atendimento WhatsApp | Criado em 2026-07-28 (`equipe/06-atendimento.md`). Analisa `jsgrafica_log_msgs_privadas`/`_grupos`, `jsgrafica_contatos`, `jsgrafica_pedidos`, `jsgrafica_memoria_conversas`, `jsgrafica_agent_config`/`_rag`, acesso real à Z-API; lê (não edita) os workflows n8n de atendimento (`01`, `297`/`296` Caminho C, `206` congelado como fallback, `JSGRAFICA_ATENDIMENTO_AI`, `06 - PEDIDOS`). Propõe comportamento/regras de resposta da IA com base em conversa real, não inventa exemplo. O Caminho C está conectado no roteamento real desde a demanda 299 (piloto), não é mais um teste isolado. | Editar workflow n8n de verdade (propõe pro 01-N8N), código de UI (propõe pro 03-APP), schema (propõe pro 02-DADOS); nenhuma mudança de roteamento real de cliente sem confirmação explícita do PM/Edvam |
| **07 - MARKETING JS GRAFICA** | Aba Marketing → Conteúdo (WhatsApp Status + Instagram) | Criado em 2026-08-19 (`equipe/07-marketing.md`), domínio novo. Constrói a UI e as rotas de API dentro do `caixa-js-grafica` pra criar/agendar/aprovar/editar/cancelar posts, reaproveitando a fila compartilhada do LabOnchain (`labon_status_queue` + webhook `LABON_DASHBOARD_STATUS`) pro WhatsApp Status, já testada e funcionando pra JS Gráfica. Instagram usa caminho próprio (tabela e workflow dedicados, ver briefing), bloqueado até o Edvam mandar o token da conta comercial. Também dono do squad de marca/conteúdo (demanda 339, inspirado no opensquad da Dizu Refeições). | Editar workflow n8n de produção sem coordenar com o 01-N8N, schema/RLS fora do que já existe (propõe pro 02-DADOS), resto do `caixa-js-grafica` fora de Marketing (é 03-APP); nenhum post real (Status/Instagram) sem confirmar conteúdo antes, Status não tem como ser apagado depois de postado |
| **08 - PRODUTOS E NOVOS NEGÓCIOS JS GRAFICA** | Ideação e desenho de expansão de produto (produtos digitais, loja online, impressão 3D sob encomenda) | Criado em 2026-08-20 (`equipe/08-produtos.md`), domínio novo, a pedido direto do Edvam. Papel de pensar/propor (igual o 06-atendimento), não de executar código. Objetivo de negócio explícito: aumentar o ticket médio via compra direta no site, ver demanda 343. | Escrever código de verdade (propõe pro 03-APP ou pro 09-SITE-V2, dependendo de onde vive), schema (propõe pro 02-DADOS), automação n8n (propõe pro 01-N8N); nenhum detalhe de UI antes do desenho geral da jornada estar validado com o Edvam |
| **09 - SITE V2 JS GRAFICA** | `site-v2/` (Next.js, site institucional novo, `v2.jsgrafica.site`) | Criado em 2026-08-28, domínio novo, a pedido direto do Edvam (confirmado que não era o 03-APP quem construía isso, fluxo separado, com disciplina de execução própria: pacote versionado, gates de QA obrigatórios, "Protocolo de Handoff ChatGPT → Claude PM" no Drive, ver `equipe/09-site-v2.md` e `site-v2/docs/RUNBOOK-CLAUDE-PM.md`). 3 tabelas próprias de catálogo público + 2 RPCs de leitura, lê `jsgrafica_produtos` mas nunca escreve nela além de FK. | `caixa-js-grafica` (03-APP), n8n (01-N8N), schema fora das 3 tabelas do pacote (propõe pro 02-DADOS), decisão comercial de produto, preço/status ATIVO/licença (isso é do 08-PRODUTOS, só publica depois de aprovado) |

Ao aprovar uma demanda, o Edvam (ou o PM, se explicitamente combinado) define o campo
`Chat executor` no arquivo da demanda com um desses. Se um novo domínio aparecer
(ex.: campanhas de marketing, script de impressora local), o PM propõe um novo membro do
time antes de criar a demanda.

**Antes de mandar a primeira demanda para um chat do time, sempre enviar o briefing dele
primeiro** (arquivo completo em `equipe/`) como mensagem inicial, define quem ele é, como
age, o que faz no projeto, o que precisa ler antes de fazer qualquer coisa, e como reportar
ao PM. Isso vale mesmo que o chat já tenha recebido o briefing antes, se for uma sessão nova.

## Como funciona uma demanda

Uma demanda é um arquivo em `demandas/` com:
- Contexto (por que isso importa, o que já se sabe)
- Objetivo (o que deve mudar, resultado esperado)
- Escopo explícito, inclusive o que **não** deve ser tocado
- Critérios de aceite (como saber que ficou pronto)
- Riscos conhecidos / cuidados
- Arquivos, tabelas e workflows relevantes

Fluxo: PM escreve a demanda → Edvam aprova ou ajusta → status vira `aprovada` → é
encaminhada para um chat auxiliar executar → o executor relata o resultado → PM revisa,
atualiza `demandas/STATUS.md` e, se revelar algo estrutural novo, atualiza a memória.

Nenhuma demanda deve ser criada como `aprovada` diretamente, sempre nasce como `proposta`.

## Regra fixa: status sempre atualizado, sem exceção

Achado real (2026-08-14, auditoria do PM): quase 70 demandas antigas (004-255) ficaram com o
campo `Status:` do próprio arquivo desatualizado (`aprovada`/`parcial`) mesmo depois do trabalho
já ter sido feito de verdade, e várias nem tinham entrada nenhuma em `STATUS.md`. Isso torna
impossível confiar num "o que falta fazer?" sem reabrir cada arquivo um por um.

Pra não repetir isso, regra sem exceção daqui pra frente:

1. **Todo executor**, ao reportar uma demanda como concluída (ou cancelada, ou encerrada sem
   necessidade), atualiza **no mesmo relato** o cabeçalho do próprio arquivo da demanda,
   `Status:` e a data de conclusão, junto com a seção "Relato de execução". Nunca deixar só o
   relato preenchido com o cabeçalho antigo.
2. **O PM**, ao receber qualquer relato de conclusão, atualiza `demandas/STATUS.md` **na mesma
   resposta**, nunca depois, inclusive demandas pequenas ou que pareçam triviais demais pra
   "valer a pena" um registro. Substitui a entrada antiga inteira (nunca deixa duas entradas pra
   mesma demanda, uma velha "aguardando execução" e uma nova "concluída" lado a lado).
3. Nenhuma demanda fica sem entrada em `STATUS.md`, mesmo cancelada/não-necessária, a ausência
   de entrada é, em si, um sinal de que algo não foi registrado direito.

## Gestão de clear (economia de crédito)

Fato técnico que define a regra: o cache de contexto de uma sessão expira depois de 1h sem uso.
Dentro dessa janela, manter a sessão aberta é barato (reaproveita cache). Depois de 1h parada, o
próximo uso paga o histórico inteiro como token fresco, sem desconto nenhum. Como todo o estado
que importa já mora em arquivo (`pm/`, nunca só na conversa), dar `/clear` numa janela nunca
perde informação, só reseta o custo dela.

Disso segue a regra prática, vale pra todo chat do time e pro PM:

- **Quando limpar**: depois que um chat reporta uma demanda concluída (cabeçalho + `STATUS.md`
  já atualizados, ver regra acima) e não há despacho imediato esperado pra mesma janela.
- **Quando NÃO limpar**: no meio de uma tarefa (perde contexto útil de debug em andamento), ou
  quando o próximo despacho pra mesma janela é esperado dentro da mesma hora (o cache ainda está
  ativo, deixar rodando sai mais barato que limpar e reler tudo de novo).
- **Não existe auto-clear**: `/clear` é um comando exclusivamente interativo, disparado pelo
  Edvam na própria janela. Nenhum chat consegue se limpar sozinho nem limpar outro remotamente,
  por isso existe o sinal abaixo, é o único jeito de um chat pedir pra ser limpo.
- **O sinal "PRONTO PRA CLEAR"**: todo chat do time fecha o próprio relato de execução com essa
  frase exata quando não sobrar nenhuma pendência que precise da janela aberta (isso complementa,
  não substitui, a atualização de `Status:`/`STATUS.md` da regra acima). Não precisa se preocupar
  com "estourar limite de contexto" por deixar a janela aberta demais, isso o Claude Code já
  resolve sozinho via compactação automática, este sinal é só sobre economia deliberada.
- **Papel do PM aqui**: ao receber um relato com "PRONTO PRA CLEAR", registra isso no resumo que
  leva pro Edvam (ex.: no checklist de dispatch já padrão), pra ele saber quais janelas pode
  fechar sem perder nada. O PM nunca decide sozinho fechar a janela de outro chat, quem limpa é
  sempre o Edvam.
- **O identificador de sessão é da janela, não da conversa** (confirmado na prática, 2026-08-28):
  `/clear` apaga o histórico dentro da mesma janela, mas não reinicia o processo, então o nome
  que aparece em `ListAgents` continua o mesmo enquanto a janela não for fechada de verdade. Por
  causa disso, o PM não tem como saber sozinho quando o Edvam deu `/clear` numa janela (não
  existe notificação automática pra isso). Quando o Edvam avisar "limpei o chat X" (ou "limpei
  todas"), o PM manda a mensagem de onboarding (briefing completo do `equipe/`) pra aquela janela
  na hora, ela lê os arquivos do `pm/` do zero (o histórico de conversa foi apagado, mas o estado
  em arquivo não), confirma pro PM quem é e que está pronta, e o PM traz o resultado consolidado
  pro Edvam, sem ele precisar copiar/colar o briefing manualmente em cada janela de novo.

Todo briefing em `equipe/` deve terminar a seção "Como reportar ao PM" citando este sinal.

Esta prática de gestão de clear (incluindo esta última regra) é importada do manual cross-projeto
em `Claude/Projects/_PM_FRAMEWORK/MANUAL.md`. A JS Gráfica adotou só a disciplina de clear dele,
não a nomenclatura de arquivo (`PROTOCOLO.md`/`STATE.md`/`DEMANDAS.md`), decisão do Edvam em
2026-08-28.

## Estrutura

```
pm/
├── README.md              ← este arquivo
├── HISTORICO.md            ← linha do tempo consolidada do projeto (o que se sabe, com fontes)
├── investigacoes/          ← relatórios de investigação (somente leitura), datados
└── demandas/
    ├── STATUS.md           ← índice de todas as demandas e seus estados
    ├── _TEMPLATE.md         ← modelo para nova demanda
    └── NNN-titulo.md        ← uma demanda por arquivo, numerada
```
