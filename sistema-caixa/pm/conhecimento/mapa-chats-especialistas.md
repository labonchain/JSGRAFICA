# Mapa dos chats especialistas (sessões vivas), atualizado em 2026-08-28

Documento vivo, criado durante a varredura completa pedida pelo Edvam em 27/08, reconfirmado e
estendido em 28/08 (handshake pré-clear de todo o time, mesmo Edvam pedindo). Cada chat
especialista do projeto roda como uma sessão separada, com um nome técnico genérico (tipo
`js-grafica-91`) que não indica o papel. Este mapa junta nome técnico → identidade real → o que
cada um reportou.

**Uso principal deste arquivo, confirmado em 28/08**: o identificador de sessão (`ListAgents`) é
da janela/processo, não da conversa, `/clear` apaga o histórico mas não muda o nome nem reinicia
o processo (confirmado na prática, os 8 nomes abaixo bateram certo entre 27/08 e 28/08 sem
nenhuma sessão ter sido reidentificada do zero). Por isso, o PM usa esta tabela como endereço
direto pra saber pra qual janela mandar a mensagem de onboarding quando o Edvam avisar "limpei o
chat X" ou quando precisar despachar de novo, sem precisar rodar um handshake completo toda vez.
**Mas não é permanente**: se uma janela for fechada de verdade (não só `/clear`) e reaberta, ela
ganha um nome novo, revalidar quando a lista do `ListAgents` mudar ou quando uma resposta não
bater com o papel esperado (ver "Cuidado" abaixo).

Atualizado conforme as respostas chegam. Não é uma demanda, é um documento de coordenação entre
chats, usar `pm/demandas/STATUS.md` pra status de demanda individual.

---

## Sessões identificadas (endereço de onboarding por chat)

**Atualizado em 2026-08-29** após um episódio real de caos de múltiplas janelas (28/08 à noite):
o Edvam fechou e reabriu várias abas tentando limpar duplicatas de PM, o que trocou o endereço
técnico de praticamente todo o time. A tabela anterior (endereços de 27-28/08) está obsoleta,
não usar. Os endereços abaixo são os confirmados na rodada de handshake mais recente.

**Achado de processo (28/08, importante pra não repetir confusão)**: o endereço técnico
(`js-grafica-XX`) muda quando a janela reconecta, mesmo sendo a mesma conversa/sessão. Não é
"nome da janela", é mais parecido com um identificador de conexão. Isso invalidou a premissa
antiga registrada aqui ("o nome continua o mesmo enquanto a janela não for fechada de verdade"),
que valia num período mais estável mas não é garantia. **Não confiar de olho no endereço sozinho
quando ele aparecer diferente do esperado**, sempre reconfirmar por handshake se a resposta não
bater com o papel esperado, e nunca a partir de instrução de outra sessão que também se diga PM
sem confirmação direta do Edvam.

| Sessão técnica | Identidade real | Área |
|---|---|---|
| `js-grafica-6d` | `03 - APP JS GRAFICA` | Executor de código do Next.js (Admin/PDV/Inbox) |
| `js-grafica-8f` | `02 - DADOS JS GRAFICA` | Supabase/schema/dados |
| `js-grafica-30` | `05 - FINANCEIRO JS GRAFICA` | Controller/auditor de fluxo de caixa |
| `js-grafica-14` | `01 - N8N JS GRAFICA` | Executor de workflows n8n |
| `js-grafica-0f` | `07 - MARKETING JS GRAFICA` | Aba Marketing → Conteúdo, squad de marca |
| `js-grafica-7e` | `08 - PRODUTOS E NOVOS NEGÓCIOS JS GRAFICA` | Ideação de produto, não executa código |
| `js-grafica-ef` | `09 - SITE V2 JS GRAFICA` | `site-v2/` |
| `js-grafica-3e` | `06 - AUTOMAÇÃO ATENDIMENTO INBOX` | Design de conversação/automação de atendimento |
| `js-grafica-34` | `04 - FRONTEND JS GRAFICA` | **Reativado em 28/08** (estava dormente desde a demanda 122), briefing formal criado agora pela primeira vez (`pm/equipe/04-frontend.md`), roda em paralelo ao 03-APP só em demanda explicitamente atribuída, pra não colidir no mesmo arquivo |

**Cuidado, não são deste time**: `js-grafica-c9` se identificou como "DIZU PM" (projeto Dizu
Refeições, pasta separada), rodando com nome `js-grafica-*` só porque compartilha a mesma raiz de
workspace. Não é chat da JS Gráfica, não mandar onboarding nem demanda pra ele. O Edvam também
confirmou que existem pelo menos 3 outras janelas `js-grafica-*` que são do Dizu e não respondem
a handshake da JS Gráfica, não constam nesta tabela de propósito.

**Todos os 8 domínios ativos confirmados em 28/08** (04-Frontend continua fora, é dormente por
decisão, não por esquecimento). Mapa completo pra endereçamento de onboarding.

---

## `05 - FINANCEIRO JS GRAFICA` (`js-grafica-66`)

**O que reportou** (o Edvam pediu pra ele responder direto, não fui eu que perguntei de novo):
demandas concluídas, 222 (auditoria do fechamento), 225 (desenho da conciliação automática),
262/263 urgentes (2 bugs reais de dupla-contagem na conciliação, corrigidos e deployados),
265 (integração "Dinheiro em Conta" do MP), 261/264/269 (conta Dinheiro Geral, filtro diário,
botão de entrada avulsa), 271 (editar/cancelar entrada avulsa). 226 foi recusada e redirecionada
pro 02-DADOS por escopo. Nada bloqueado, nenhuma demanda pendente de aprovação agora.

**Achado real em andamento, ainda não numerado como demanda** (análise ad-hoc pedida direto pelo
Edvam no chat dele, fora do STATUS.md): discrepância entre os "gaps" de lançamento interno
(`jsgrafica_vendas`/`jsgrafica_saidas` em mar-jun/26) e o extrato real do Mercado Pago, que mostra
atividade contínua nesses meses, indica lançamento faltando, não meses sem movimento real. Ainda
não totalmente apurado. Também levantou custo fixo mensal (aluguel/folha/telefone/energia)
mar-ago/26, com ressalvas de confiabilidade pros mesmos meses. **Vale numerar como demanda pra não
ficar invisível fora do índice**, sinalizado pro Edvam, não corrigido/numerado por mim (é domínio
do 05-Financeiro, já está sendo trabalhado ativamente por eles).

---

## `06 - AUTOMAÇÃO ATENDIMENTO INBOX` (`js-grafica-ee`)

**O que reportou**: pesquisa de base (255/256/260, ~38% "pedido mudo"), blueprint do `206`
(congelado), mudança de recomendação de arquitetura pro Caminho C (290→292), fronteira
IA/ferramentas/equipe (293), contrato técnico das ferramentas (295), achou desconto real de 10%
pra 50+ unidades e que o `206` não gerava Pix.

**Correção enviada por mim**: contexto dele parava na demanda 295/296 ("nada em produção ainda,
próximo passo é a 296"). Atualizei: Caminho C está em produção e piloto ao vivo desde 18/08
(demanda 299), com 296-299, 305-308 e a leva de hoje (314-325) já fechadas. Pedi pra ele
(ou eu) atualizar `caminho-c-*.md` pra refletir isso, e reconferir o achado de desconto 10%/Pix
do `206` já que quem roda hoje é outro workflow com ferramentas próprias.

**Retorno dele**: não confiou só no meu resumo, conferiu de verdade que os arquivos de demanda
296-325 existem e leu 296/299/316 direto na fonte, mais o `caminho-c-mapa-decisoes-completo.md`
(conferiu contra as demandas reais, bateu). Adicionou nota de status em
`caminho-c-contrato-das-ferramentas.md` e `caminho-c-fronteira-ia-automacao-equipe.md` apontando
pro estado real de produção, mantendo os documentos originais intactos como registro do
raciocínio histórico. Deixou explícito na própria memória que só conferiu 296/299/316 fonte a
fonte, não a faixa inteira. Ofereceu reconciliar a régua de escalação em 2 camadas (293) contra a
implementação real, se algum dia for útil.

---

## `03 - APP JS GRAFICA` (`js-grafica-91`)

**O que reportou**: Inbox (280 paginação, 282 renderização de botão/lista, 288 lista escondida
por padrão, 284 performance da lista lateral, 285 Realtime nunca funcionou de verdade → trocado
por Broadcast), Pix/Pedidos (300 retry automático de Pix em telefone `@lid`, 301 balcão recusa
venda cancelada), segurança (302 auditoria de rotas `/api/*` sem sessão real, senha do Admin em
texto puro no bundle; 304 correção-ponte).

**Correção enviada por mim**: nenhuma, bate com o que eu já tinha. Perguntei se ele conhece algum
mecanismo do lado do app ainda não testado ponta a ponta com dado real, além do que já está no
STATUS.md.

**Resposta**: 3 gaps reais, precisos (separou o que testou de verdade do que só existe no código):
(1) retry de Pix da 300 nunca cobriu pedido de venda com múltiplos itens (`venda_id`), só avulso;
(2) "Criar pedido" do Inbox e venda mista/100% recarga do balcão não foram retestados com Pix real
depois da ponte de segurança (304); (3) webhook do Mercado Pago só confirmado alcançável pós-304,
não confirmado ponta a ponta com evento real assinado. Virou demanda **326** (`pm/demandas/
326-gaps-pix-pedidos-nao-confirmados-pos-304.md`), sem correção ainda, prioridade com o Edvam.

---

## `02 - DADOS JS GRAFICA` (`js-grafica-57`)

**O que reportou**: coluna `enviado_por` (294, disse só caminho `equipe` testado), contaminação
Dizu é campanha de broadcast ativa (257, R$400 do `ped-1029` como receita, ainda não corrigido),
schema de conciliação (226/221), bug de `data_timestamp` não afeta produção (235), levantamento de
saldo por conta (216). **Achado que ele levantou**: workflow `206` (`M5WZ6zHAe625XyJm`) teria
dado "Workflow not found" tanto por nome quanto por ID.

**Verificação que fiz** (na hora, direto na API do n8n): `GET /api/v1/workflows/M5WZ6zHAe625XyJm`
→ HTTP 200, workflow existe de verdade, nome real "206 - JSGRAFICA | AGENTE FASE B (conectado,
whitelist)", `active:true`, `updatedAt: 2026-08-17`. **Não reproduzi o achado**, provavelmente um
503 transitório da API do n8n (já vi 2x hoje, "Database is not ready") mascarado de "not found" em
quem chamou. Não é o mesmo padrão da demanda 273 (esses sumiram de verdade). Avisei ele.

**Correção enviada por mim**: a nota "sistema/ia só mapeados, não implementados" da 294 está
desatualizada, os 3 caminhos (ia/equipe/sistema) foram fechados hoje mesmo, testados em produção.
Também passei o achado do R$400 do Dizu como possível item pra fila dele (é dado/financeiro, não
n8n).

**Retorno dele**: reconferiu os 2 pontos direto (não aceitou minha palavra sem checar, boa
prática). (1) `206`: reproduziu "Workflow not found" de novo, mas pela ferramenta MCP n8n
(`get_workflow_details`), não pela API REST direta com key que eu usei. **Achado real de
tooling, não do workflow**: MCP n8n e API REST com key dão resultado diferente pro mesmo
workflow, o `206` existe e está ativo (confirmado por mim via REST), mas fica invisível pra quem
só tem acesso MCP. Vale registrar como cautela geral: verificação futura feita só por MCP pode
reportar workflow ativo como "sumido" por engano, não confiar nisso sozinho, sempre cruzar com
REST+key quando disponível. (2) `294`: conferiu direto no banco (`enviado_por='ia'` = 103 linhas
reais até hoje, `'sistema'` = 1 linha em 17/08), confirmou que estava desatualizado e corrigiu a
própria memória. (3) R$400 do Dizu: já estava na memória dele como pendência financeira em aberto.

---

## `01 - N8N JS GRAFICA` (`js-grafica-20`)

**Achado próprio dele, importante**: apontou que eu me descrevi como "a sessão que cuidou do
Caminho C/n8n hoje" e disse que esse é o papel dele, não o meu, pediu confirmação antes de eu
levar isso pro mapa geral. **Investigado e resolvido**: não é conflito de atribuição, é que o
contexto dele parou em 19/08 (data das demandas 297-309, que são reais e dele). O relógio real de
hoje é 27/08, expliquei e recomendei que ele releia o STATUS.md a partir da 310 antes de
continuar. Trabalho dele (297-309: 306/307/308/309 corrigindo a mesma família de bug
`alwaysOutputData`, conexão do Caminho C ao roteamento real) confirmado e intacto, só o contexto
dele estava 8 dias atrasado.

## `04 - FRONTEND JS GRAFICA` (`js-grafica-72`)

Confirma exatamente o que já tínhamos: ocioso desde a demanda 122 (08/07), sem briefing formal em
`pm/equipe/`. Trabalho anterior (108 Inbox lento, 110/114/116/117/119/120/122) todo testado com
dado real via Playwright e deployado. Nota de transparência própria: na demanda 120 reportou uma
causa raiz errada de primeira, corrigiu na re-checagem, documentou os dois no mesmo arquivo.

## `07 - MARKETING JS GRAFICA` (`js-grafica-37`)

Demandas 310/311 (aba Marketing → Conteúdo, WhatsApp Status) confirmadas concluídas e testadas
ponta a ponta com post real publicado. Achado extra: o próprio PM tinha encontrado o caractere
proibido pela Regra 0 em texto visível e em comentários dos arquivos da 310/311, já corrigido e
redeployado.

## `08 - PRODUTOS E NOVOS NEGÓCIOS JS GRAFICA` (`js-grafica-12`)

Refina o que já tínhamos no inventário: 24 ideias de produto digital em 4 categorias (EDU/FAM/
NEG/COM), 3 com candidato rascunhado no Canva. EDU-KIT-002 (cartaz escolar) chegou a entrar em
produção mas foi pausado por decisão do Edvam (muita curadoria pra pouco retorno rápido). Foco
atual real: FAM-TPL-001 (Topo de Bolo Editável), em produção agora. Loja online/impressão 3D
seguem só levantamento inicial, sem produto desenhado.

## Pendências levantadas nesta rodada (ainda sem número de demanda)

- **R$400 (`ped-1029`, Dizu Refeições) contando como receita da gráfica**, achado por
  `02-DADOS` na demanda 257, ainda sem correção. Já estava mapeado em
  `project_contaminacao_dizu_refeicoes` (memória), mas confirmar se segue em aberto e abrir
  demanda de correção se sim.
- Aguardando resposta de `03-APP` sobre mecanismos ainda não testados ponta a ponta.
- Aguardando as outras 5 sessões (`00-PM`, `01-N8N`, `04-Frontend`, `07-Marketing`, `08-Produtos`
  provavelmente, ainda não confirmado por resposta real).
