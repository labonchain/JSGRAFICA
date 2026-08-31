# 302 - Auditar: nenhuma rota /api/* valida sessão no servidor

Status: concluída
Criada em: 2026-08-17
Aprovada em: 2026-08-17
Concluída em: 2026-08-17
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado pelo 03-APP durante a demanda 300, registrado explicitamente como "gap pré-existente, não
introduzido por esta demanda": login no PDV/Admin é 100% client-side (`lib/usuarios.ts`), e
nenhuma rota de `/api/*` valida sessão/autenticação no servidor. Isso significa que, em tese,
qualquer pessoa que descubra a URL de uma rota (ex. `/api/pedidos`, `/api/pedidos/retentar-pix`,
`/api/mercadopago/cobranca`) consegue chamá-la diretamente, sem precisar estar logada no sistema
- incluindo rotas que mexem com dinheiro (gerar Pix, criar pedido, cancelar).

Isto NÃO é uma correção pontual, é um achado estrutural que precisa ser investigado com calma
antes de decidir o que fazer - daí ser demanda de auditoria, não de correção direta.

## Objetivo
Entender o tamanho real da exposição (quais rotas fazem o quê sem checagem, quais mexem em dinheiro
ou dado sensível) e propor ao Edvam um caminho de correção proporcional ao risco real, não uma
suposição.

## Escopo
- Incluído: levantar TODAS as rotas `/api/*` do sistema, classificar cada uma por o que ela permite
  fazer sem login (leitura de dado sensível, escrita que mexe em dinheiro, escrita que mexe em
  pedido/cliente, ação administrativa) - não presumir, conferir uma a uma.
- Incluído: confirmar se as URLs de produção (`pdv.jsgrafica.site`/`admin.jsgrafica.site`) são
  descobríveis/adivinháveis de fora com facilidade real, ou se dependem de algo que já reduz o
  risco na prática (ex. domínio não indexado, sem link público) - sem superestimar nem
  subestimar o risco.
- Incluído: propor pelo menos 1 caminho de correção realista (ex. checagem de sessão/cookie no
  servidor, chave de API interna, mover pra rota autenticada) com estimativa de esforço, deixando a
  decisão de qual caminho seguir pro Edvam.
- Explicitamente fora de escopo: implementar a correção nesta demanda - é levantamento e proposta,
  a implementação vira demanda própria depois que o Edvam decidir o caminho.

## Critérios de aceite
- [x] Lista completa de rotas `/api/*` com classificação de risco por rota
- [x] Confirmação (não suposição) sobre o quão exposta a URL de produção está de fora
- [x] Pelo menos 1 caminho de correção proposto com esforço estimado, decisão explicitamente
      deixada pro Edvam

## Riscos e cuidados
Esta é a própria demanda que trata do risco - não requer cuidado especial de execução além de não
implementar nada por conta própria antes do Edvam decidir o caminho (isso pode mudar comportamento
de login pra 3 pessoas que usam o sistema todo dia, precisa de decisão consciente, não silenciosa).

## Referências
Demanda 300 (achado original, relato "Achados fora do escopo"). `lib/usuarios.ts` (login
client-side atual).

## Relato de execução

### 🔴 Achado crítico separado, reportado ao Edvam em tempo real (fora do escopo original, mas urgente demais pra esperar o resto do relatório)
Enquanto lia o mecanismo de login pra entender o "gap estrutural" descrito na demanda, encontrei
algo mais grave e imediatamente acionável: **a senha do Admin (`lib/usuarios.ts`, campo `senha` de
Edvam) está em texto puro, hoje, no bundle JavaScript público** servido por `admin.jsgrafica.site`.
`lib/usuarios.ts` é importado direto por `app/page.tsx`, que é `"use client"` — o Next.js empacota
o arquivo inteiro (senha incluída) pro navegador de QUALQUER visitante da tela de login, sem
precisar estar logado. Confirmado baixando o `.js` real servido em produção e encontrando a senha
literal dentro dele (não é suposição de como o bundler funciona — testei o arquivo de verdade).
Isso é independente da decisão maior desta demanda (não precisa escolher nenhum dos 3 caminhos
abaixo pra agir nisso) — recomendei ao Edvam trocar a senha assim que possível; não troquei
sozinho (autenticação é dele, trocar sem avisar o trancaria fora do próprio sistema). Mesmo
trocando a senha, o problema estrutural continua (a PRÓXIMA senha também iria pro bundle público
do mesmo jeito) — resolver isso de verdade é mover a validação de senha pro servidor, o que já é
parte do que os 3 caminhos abaixo propõem.

### O que foi feito (levantamento, sem nenhuma implementação — conforme escopo)

**1) Todas as rotas `/api/*`, uma por uma.** 44 arquivos de rota, **74 combinações rota+método**.
**Nenhuma (0/74) faz qualquer checagem real de sessão/token/cookie** antes de agir — confirmado
lendo o código de cada uma, não presumido. A única quase-exceção é `POST /api/mercadopago/webhook`,
que valida uma assinatura HMAC mas **processa mesmo se a assinatura vier inválida ou ausente** —
por desenho isso não é tão grave quanto parece: a confirmação de pagamento nunca confia no corpo
recebido, sempre rebusca a order de verdade na API do Mercado Pago com o token da própria loja
antes de marcar qualquer coisa como paga. O campo `operador` que várias rotas recebem no corpo
(usado em textos de auditoria/histórico) NÃO é autenticação — é só um rótulo, qualquer string
serve, confirmado lendo o código de quem usa esse campo.

Tabela completa (74 linhas) com classificação por rota, ordenada por severidade
(`write-money`/`admin-action` primeiro), no comentário de levantamento anexado a esta demanda —
resumo por classificação:

| Classificação | Qtd | O que significa |
|---|---|---|
| `write-money` | 21 | Ação que mexe em dinheiro real sem login: criar/editar/apagar venda, saída, entrada, transferência, conta a pagar/receber, fechamento de caixa, confirmar pagamento sem pagamento real, gerar Pix real |
| `admin-action` | 5 | Muda configuração do sistema: taxa de cartão/Pix, whitelist do agente de IA, QR de pareamento do WhatsApp |
| `write-business-data` | 16 | Cria/edita/apaga pedido, cliente, produto, conversa; **envia mensagem/mídia real via WhatsApp da gráfica pra qualquer telefone** |
| `read-sensitive` | 27 | Lê dado privado: telefone/nome/endereço de cliente, conteúdo de mensagem, financeiro completo (dashboard, fechamento, contas a pagar), config de conta bancária |
| `low-risk` / `external-webhook` | 5 | Sem dado sensível, ou webhook que já revalida contra a fonte real antes de confiar |

**Pior achado individual**: `POST /api/inbox/responder` e `POST /api/inbox/enviar-midia` deixam
QUALQUER pessoa com a URL mandar mensagem de WhatsApp de verdade (texto ou mídia) do número real e
conectado da JS Gráfica pra qualquer telefone do mundo, sem login, sem limite de taxa — transforma
o WhatsApp da gráfica numa ferramenta de spam/phishing em escala sob uma identidade de negócio
real, hoje, sem precisar de nenhum conhecimento interno do sistema. Achados quase tão graves:
`GET /api/zapi/qrcode` pode expor o QR de pareamento ao vivo (sequestro da conexão se a instância
precisar reparear); `PATCH /api/pedidos` com `confirmarPagamento:true` marca QUALQUER pedido como
pago sem pagamento real — fraude direta contra o caixa; e o encadeamento é trivial (`GET /api/
pedidos` sem login descobre IDs reais, `PATCH` confirma pagamento deles; `GET /api/clientes`
vaza telefones reais, `POST /api/inbox/responder` manda mensagem pra cada um).

**2) Confirmado, não presumido, o quão exposta a URL de produção está:**
- **Prova ao vivo, feita com cuidado (só leitura, `?limite=1`, nunca ação de escrita)**: chamei
  `GET https://admin.jsgrafica.site/api/pedidos?limite=1` direto, de fora, sem login nenhum — voltou
  dado real de cliente (nome, telefone, pedido) com HTTP 200. Repeti em `pdv.jsgrafica.site`, mesmo
  resultado. Isso não é "poderia ser explorado" — É explorável, agora, confirmado com uma chamada
  real. (Não testei nenhuma rota de escrita/dinheiro sem login de propósito — confirmar leitura já
  prova o ponto sem gerar efeito colateral real.)
- **A URL `admin.`/`pdv.` NÃO está linkada no site público de marketing** (`index.html` da raiz do
  workspace) — não tem link clicável levando um visitante comum até lá.
- **Mas "admin" e "pdv" são nomes de subdomínio extremamente comuns** — qualquer ferramenta básica
  de varredura de subdomínio (lista de palavras padrão) descobre isso em minutos contra qualquer
  domínio raiz conhecido (`jsgrafica.site`, que está em cartão/Google/fachada da loja — não é
  segredo). DNS de subdomínio é público por natureza: não precisa de link nenhum pra alguém
  simplesmente tentar `admin.<dominio>`.
- **Achado técnico específico**: a Vercel TEM proteção de deploy ativa (SSO), confirmado — testei
  `https://caixa-js-grafica-edvams-projects.vercel.app` (a URL padrão do projeto na Vercel) e ela
  redireciona pra `vercel.com/sso-api` (exige login na conta Vercel da equipe). **Mas essa proteção
  NÃO se estende aos domínios customizados** (`admin.jsgrafica.site`/`pdv.jsgrafica.site`) — só
  protege a URL feia/padrão que ninguém usa. Confirmado com `curl` direto nos 2 domínios reais,
  ambos 200 sem exigir nada. Isso é uma configuração específica da Vercel que dá pra ajustar (ver
  opções abaixo) — hoje está, na prática, sem efeito nenhum pro domínio que passa de verdade.

**Conclusão da confirmação**: não é "teoricamente exposto" — é diretamente acessível de qualquer
lugar do mundo, sem nenhuma barreira técnica real, hoje.

### Caminhos de correção propostos (decisão de qual seguir é do Edvam/PM — nada implementado)

**A — Sessão de verdade no servidor (correção correta, esforço médio — dias, não horas)**
Login (admin com senha, PDV com seleção de nome) passa a validar no SERVIDOR (rota nova, ex.
`POST /api/auth/login`), nunca mais no navegador — a senha do Edvam sai de `lib/usuarios.ts`
(arquivo hoje importável por componente cliente) pra um lugar só-servidor (env var ou tabela com
RLS travada, mesmo padrão já usado pra outros segredos do sistema). Login bem-sucedido grava um
cookie `HttpOnly`/`Secure`/assinado; `middleware.ts` (já existe, só faz roteamento de subdomínio
hoje) passa a EXIGIR esse cookie em toda rota `/api/*` e nas páginas, devolvendo 401/redirecionando
sem ele. Resolve o achado crítico da senha exposta e o gap estrutural inteiro de uma vez.
Trabalho: rota de login nova, geração/verificação de cookie assinado, atualizar `middleware.ts`,
mover a config de usuários pra fora do bundle cliente, tratar 401 no front (redirecionar pro
login), testar as 44 rotas não quebraram. Sem dependência de serviço externo novo.

**B — Segredo compartilhado por header (mitigação rápida, mais fraca — horas)**
Depois do login client-side de hoje (continua igual), o front guarda 1 valor secreto fixo (env var
pública, mesmo pra todo mundo) e manda num header em toda chamada `fetch`; cada rota checa esse
header antes de agir. Fecha o buraco de "qualquer um na internet, sem saber nada do sistema"
rapidamente, mas é bem mais fraco que A: não distingue quem é Edvam/Zu/Gabi, um vazamento do
segredo (ex. inspecionar o navegador) expõe tudo de novo até trocar o valor pra todo mundo. Bom
como ponte enquanto A não sai, não como solução definitiva.

**C — Proteção de deploy da Vercel estendida pro domínio customizado (quase 0 esforço, troca
operacional a avaliar)**
A Vercel já tem SSO ativo, só não cobre `admin.`/`pdv.jsgrafica.site` — dá pra configurar cobertura
de Produção + domínio customizado no painel (depende do plano atual, precisa confirmar se o plano
contratado permite; "Trusted IPs", se disponível, seria uma alternativa mais compatível com o uso
físico no balcão do que exigir login Vercel a cada acesso). Risco: pode atrapalhar o fluxo rápido
do PDV no balcão se a barreira exigida for pesada demais — precisa validar com uso real antes de
adotar como única camada. Funciona bem como camada EXTRA somada ao caminho A, não como substituto
sozinho (não fecha o vazamento da senha no bundle, por exemplo).

**Recomendação implícita, não decisão**: A (ou A fora do prazo + B como ponte imediata) resolve o
problema de raiz; C é reforço, não substituto. Mas a escolha e o prazo são do Edvam/PM.

### Testes realizados e resultado
- Leitura de código de todas as 44 rotas (via agente dedicado, resultado conferido) — nenhuma
  chamada real feita contra rota de escrita/dinheiro em produção sem login (só leitura, com
  `?limite=1`, ação não-destrutiva).
- Prova ao vivo de exposição: `curl` direto em `admin.`/`pdv.jsgrafica.site` (leitura), confirmado.
- Prova ao vivo do vazamento de senha: baixado o `.js` real de produção, senha encontrada em texto
  puro dentro dele, arquivos temporários apagados depois de confirmar (não deixei o teste rodando
  nem salvei a senha em nenhum lugar além deste relato).
- Prova ao vivo da proteção Vercel: `curl` na URL padrão do projeto (redireciona pro SSO) vs. nos
  domínios customizados (não redireciona, 200 direto).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **Vazamento da senha do Admin no bundle JS** — já reportado diretamente ao Edvam em tempo real
  durante esta demanda (ver seção no topo), recomendação de troca imediata da senha dado por mim,
  nenhuma mudança de código feita.
- Nenhum outro achado novo além dos já cobertos no levantamento acima.

### Status final: concluída (levantamento e proposta — implementação explicitamente fora de
escopo, aguardando decisão do Edvam/PM sobre qual caminho seguir)

## Apêndice — tabela completa das 74 combinações rota+método

Nenhuma linha abaixo faz checagem real de sessão/token (coluna omitida — é sempre "Não", exceto
o webhook do Mercado Pago, marcado à parte). Ordenada por severidade.

| Rota | Método | Classificação | O que dá pra fazer sem login |
|---|---|---|---|
| /api/vendas | POST | write-money | Insere venda falsa (qualquer produto/valor) direto no caixa do dia e ainda decrementa estoque real |
| /api/abertura-caixa | POST | write-money | Grava/adultera o valor de abertura de caixa de qualquer operador em qualquer dia, usado no cálculo de divergência do fechamento |
| /api/contas-pagar-receber | POST | write-money | Cadastra contas a pagar/receber falsas na contabilidade da gráfica |
| /api/contas-pagar-receber | PUT | write-money | Edita valor/vencimento de qualquer conta a pagar/receber pendente |
| /api/contas-pagar-receber | DELETE | write-money | Cancela qualquer conta a pagar/receber pendente |
| /api/contas-pagar-receber | PATCH | write-money | Dá baixa (gera Saída/Entrada financeira real) em qualquer conta pendente |
| /api/fechamento | POST | write-money | Registra um fechamento de caixa completo (geral ou por operador) para qualquer data, e dispara conciliação automática |
| /api/transferencias | POST | write-money | Cria uma transferência entre as 4 contas bancárias reais rastreadas, gerando também uma Saída vinculada |
| /api/transferencias | DELETE | write-money | Apaga uma transferência já lançada e a Saída vinculada a ela |
| /api/conciliacao/pendencias | PATCH | write-money | Classifica uma pendência de conciliação, criando Entrada/Saída/Transferência real a partir dela |
| /api/conciliacao/recalculo-aplicar | POST | write-money | Aplica recálculo em cascata sobre fechamentos de caixa já lançados |
| /api/saidas | POST | write-money | Lança despesa falsa (qualquer categoria/valor) contra qualquer conta de origem |
| /api/saidas | PATCH | write-money | Edita valor/categoria/data/conta de qualquer saída já lançada |
| /api/saidas | DELETE | write-money | Apaga (DELETE real) qualquer saída já lançada |
| /api/pedidos | POST | write-money | Cria pedido para qualquer telefone e, se Pix for a forma escolhida, gera uma cobrança Pix REAL no Mercado Pago (QR code válido) |
| /api/pedidos | PATCH | write-money | Com `confirmarPagamento:true` marca qualquer pedido pendente como pago sem pagamento real ter ocorrido; também cancela pedidos (revertendo saída automática) e corrige forma de pagamento |
| /api/entradas-avulsas | POST | write-money | Lança entrada manual falsa (qualquer valor) em qualquer conta bancária rastreada |
| /api/entradas-avulsas | PATCH | write-money | Edita valor/conta/data de qualquer entrada avulsa já lançada |
| /api/entradas-avulsas | DELETE | write-money | Apaga qualquer entrada avulsa já lançada |
| /api/pedidos/retentar-pix | POST | write-money | Gera/recupera uma cobrança Pix real do Mercado Pago para um pedido existente (id descobrível via GET /api/pedidos, também sem login) |
| /api/mercadopago/cobranca | POST | write-money | Gera cobrança Pix real (ou devolve a existente) para qualquer pedidoId/vendaId informado |
| /api/zapi/qrcode | GET | admin-action | Expõe o QR code de pareamento do WhatsApp Business ao vivo; se escaneado por terceiro, pode sequestrar a conexão do número da gráfica |
| /api/contas-bancarias | POST | admin-action | Cria conta bancária nova na configuração financeira do sistema |
| /api/contas-bancarias | PATCH | admin-action | Muda taxa de cartão/Pix ou qual conta é "padrão", afetando todo cálculo de fechamento do sistema |
| /api/telefones-autorizados | POST | admin-action | Adiciona qualquer telefone à whitelist que autoriza o agente de IA automático a responder (agente tem ferramentas capazes de gerar Pix) |
| /api/telefones-autorizados | PATCH | admin-action | Ativa/desativa qualquer telefone da whitelist do agente automático |
| /api/produtos | PATCH | write-business-data | Edita nome/preço/categoria/status ativo de qualquer produto do catálogo |
| /api/produtos | POST | write-business-data | Cria produto novo arbitrário no catálogo |
| /api/inbox/arquivar | PATCH | write-business-data | Arquiva/desarquiva qualquer conversa, escondendo-a da lista padrão do Inbox |
| /api/inbox/contato | PATCH | write-business-data | Sobrescreve o nome salvo de qualquer contato/cliente |
| /api/inbox/atendimento | PATCH | write-business-data | Muda status de atendimento e atendente responsável de qualquer conversa |
| /api/inbox/responder | POST | write-business-data | Envia mensagem de texto real via WhatsApp, do número da gráfica, para qualquer telefone informado (não precisa nem ser contato existente) |
| /api/inbox/enviar-midia | POST | write-business-data | Envia imagem/vídeo/documento real via WhatsApp, do número da gráfica, para qualquer telefone informado |
| /api/inbox/apagar-mensagem | POST | write-business-data | Apaga "para todos" (via API real do WhatsApp) qualquer mensagem que a equipe já enviou, alterando o histórico visível ao cliente |
| /api/categorias-saida | POST | write-business-data | Cria categoria de despesa nova arbitrária |
| /api/categorias-saida | PATCH | write-business-data | Edita/desativa qualquer categoria de despesa |
| /api/clientes | POST | write-business-data | Cria contato/cliente novo (nome+telefone) direto na base |
| /api/clientes | PATCH | write-business-data | Edita aniversário/endereço de qualquer cliente |
| /api/inbox/conversas | POST | write-business-data | Cria conversa/contato novo para qualquer telefone informado |
| /api/conciliacao/rodar | POST | write-business-data | Força rodar a conciliação financeira automática para qualquer data |
| /api/fechamento/diagnostico/resumo | POST | write-business-data | Gera (via Gemini, custo de API) e grava resumo narrativo sobre o fechamento de caixa de qualquer data |
| /api/fechamento/diagnostico/resumo | PATCH | write-business-data | Sobrescreve o resumo editado manualmente do fechamento de qualquer data |
| /api/inbox/marcar-lida | PATCH | write-business-data | Zera o contador de mensagens não lidas de qualquer contato |
| /api/inbox/upload-url | POST | write-business-data | Gera URLs assinadas ilimitadas para upload no bucket de storage da gráfica, permitindo hospedar arquivos arbitrários às custas dela |
| /api/zapi/status | GET | read-sensitive | Revela status da conexão WhatsApp e os últimos eventos internos de conexão/reconexão |
| /api/vendas | GET | read-sensitive | Lista todas as vendas do dia com produto, quantidade e valor |
| /api/log | GET | read-sensitive | Lista o histórico completo de vendas (qualquer mês) com operador, produto e valores |
| /api/contas-bancarias | GET | read-sensitive | Expõe configuração interna das contas bancárias, incluindo taxas de cartão/Pix aplicadas |
| /api/inbox/rascunho-pedido | GET | read-sensitive | Revela o texto do rascunho de pedido pendente vinculado a qualquer telefone |
| /api/abertura-caixa | GET | read-sensitive | Revela valor de abertura de caixa contado por qualquer operador em qualquer dia |
| /api/fechamento/diagnostico | GET | read-sensitive | Expõe diagnóstico financeiro detalhado do fechamento de qualquer dia |
| /api/contas-pagar-receber | GET | read-sensitive | Lista todas as contas a pagar/receber da gráfica, com valores e vencimentos |
| /api/clientes | GET | read-sensitive | Lista/busca todos os clientes com telefone, nome, aniversário, endereço e contagem de mensagens |
| /api/fechamento | GET | read-sensitive | Expõe resumo financeiro do dia (entradas, saídas, saldo, histórico de fechamentos) |
| /api/transferencias | GET | read-sensitive | Lista transferências internas entre contas bancárias reais do dia |
| /api/dashboard | GET | read-sensitive | Expõe relatório financeiro completo do negócio (histórico, top produtos, saúde do caixa, divergências) |
| /api/conciliacao/pendencias | GET | read-sensitive | Lista itens financeiros não explicados aguardando classificação |
| /api/conciliacao/recalculo-previa | GET | read-sensitive | Mostra prévia detalhada do impacto financeiro de um recálculo de fechamento |
| /api/saidas | GET | read-sensitive | Lista todas as despesas lançadas em qualquer dia |
| /api/pedidos | GET | read-sensitive | Lista todos os pedidos com telefone do cliente, nome, produto, valor e status de pagamento (confirmado ao vivo nesta demanda) |
| /api/mercadopago/movimentacoes | GET | read-sensitive | Expõe histórico real de transações do Mercado Pago da gráfica (valores, métodos, datas) e metadados do token de acesso |
| /api/inbox/sugestao-resposta | POST | read-sensitive | Lê o histórico privado de conversa de qualquer telefone (+ pedido vinculado) para gerar sugestão via IA |
| /api/inbox/resumir-conversa | POST | read-sensitive | Lê e resume o conteúdo de conversa privada de qualquer telefone via IA |
| /api/entradas | GET | read-sensitive | Lista detalhada de todas as entradas financeiras do dia, com operador e descrição |
| /api/telefones-autorizados | GET | read-sensitive | Lista quais telefones estão autorizados a interagir com o agente automático, com nome do contato |
| /api/inbox/mensagens | GET | read-sensitive | Expõe o conteúdo integral das mensagens (texto, mídia, transcrição de áudio) de qualquer telefone |
| /api/inbox/conversas | GET | read-sensitive | Lista todos os contatos com telefone, nome, foto, prévia da última mensagem e contadores |
| /api/inbox/transcrever-audio | POST | read-sensitive | Transcreve (via Gemini) e devolve o conteúdo de um áudio privado de cliente já logado |
| /api/pedidos/calcular-valor | POST | low-risk | Só calcula preço com desconto a partir de um produtoId existente, sem gravar nada |
| /api/produtos | GET | low-risk | Lista catálogo de produtos e preços (dado que a gráfica já expõe publicamente) |
| /api/categorias-saida | GET | low-risk | Lista nomes das categorias de despesa |
| /api/fechamento/dia-fechado | GET | low-risk | Só devolve um booleano (dia fechado ou não) para uma data |
| /api/mercadopago/cobranca | GET | low-risk | Consulta status de uma cobrança por orderId (praticamente não adivinhável); a confirmação de pagamento é sempre revalidada contra a API real do Mercado Pago, não confia no chamador |
| /api/mercadopago/webhook | POST | external-webhook (valida HMAC, mas processa mesmo se ausente/inválido) | Um POST forjado não consegue fingir pagamento aprovado (a confirmação sempre rebusca a order na API real do MP com o token da loja); o máximo que um forjador consegue é gastar 1 consulta à própria conta MP para um order id arbitrário |
