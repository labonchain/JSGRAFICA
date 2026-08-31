# Mapa de Decisões — Sistema JS Gráfica (caixa-js-grafica)

**Data:** 2026-08-28
**Autor:** PM do projeto Dizu Refeições (levantamento feito a pedido do Edvam)
**Para:** 00 - PM JS GRAFICA — revisar e usar se for o caso

## Por que este documento existe

O Edvam pediu que, antes de desenhar a plataforma de atendimento da Dizu Refeições (marmitaria
delivery, modelo de negócio diferente da gráfica), fosse feito primeiro o que a JS Gráfica nunca
teve e que gerou retrabalho real ao longo do projeto: um mapa exaustivo de todas as decisões de
negócio já embutidas no sistema em produção. A ideia é dupla — servir de auditoria/referência pro
próprio time da JS Gráfica, e servir de base de comparação pra construir o sistema da Dizu sem
repetir os mesmos buracos (ex. cálculo de valor confiado no cliente, fuso horário não tratado,
duplicidade de saída, etc. — tudo isso já foi corrigido aqui à base de bug real em produção).

## Metodologia

- **Fonte de verdade única: o código em produção**, lido por inteiro, arquivo por arquivo — nunca
  documentação, nunca suposição, nunca "provavelmente é assim".
- 11 varreduras paralelas, uma por domínio, cobrindo `app/`, `components/`, `lib/` inteiros do
  `caixa-js-grafica` (~21.600 linhas de código de produção): Auth/Sessão/Produtos/Clientes,
  Pedidos, Mercado Pago/Pix, Fechamento/Diagnóstico/Abertura, Conciliação/Financeiro, Inbox
  (backend), Inbox (UI), Marketing/Conteúdo, PDV/Vendas/Dashboard, casca do Admin
  (`app/page.tsx`), e a camada central de dados (`lib/supabase-admin.ts`/`lib/supabase.ts`).
- Cada decisão citada tem arquivo:linha real. Onde a leitura não teve certeza absoluta, está
  marcado como "não confirmado, revisar" em vez de preenchido por suposição.
- **Nada foi inventado, corrigido ou avaliado como bom/ruim neste documento** — é só o retrato do
  que existe hoje. Observações sobre inconsistências encontradas estão marcadas à parte, sem
  propor correção.
- Os workflows n8n (roteamento de WhatsApp, agente Caminho C) **não foram escaneados aqui** — este
  levantamento cobriu só o código do app Next.js. A lógica de decisão do agente de IA que atende
  cliente por WhatsApp vive no n8n e está documentada separadamente em
  `pm/conhecimento/caminho-c-contrato-das-ferramentas.md`.

## Como usar

Cada seção abaixo é um domínio. Dentro dele, cada decisão tem um código (`PED-04`, `FIN-12`,
`CORE-16` etc.) pra ser referenciada em qualquer conversa futura sem ambiguidade. Ao comparar com
o desenho da Dizu, o mais útil não é copiar a implementação (o modelo de negócio é outro — delivery
de marmita, não gráfica com retirada), e sim comparar a **forma da decisão**: por que ela existe,
que bug real ela evita, e se o equivalente dela precisa existir do jeito certo desde o dia 1 do
sistema novo.

---

## Índice

1. [Autenticação, Sessão, Produtos, Clientes](#1-autenticação-sessão-produtos-clientes)
2. [Pedidos](#2-pedidos)
3. [Mercado Pago / Pix](#3-mercado-pago--pix)
4. [Fechamento de Caixa, Diagnóstico, Abertura](#4-fechamento-de-caixa-diagnóstico-abertura)
5. [Conciliação, Entradas/Saídas, Contas a Pagar/Receber, Transferências](#5-conciliação-entradassaídas-contas-a-pagarreceber-transferências)
6. [Inbox WhatsApp — Backend](#6-inbox-whatsapp--backend)
7. [Inbox WhatsApp — UI](#7-inbox-whatsapp--ui)
8. [Marketing → Conteúdo](#8-marketing--conteúdo)
9. [PDV, Vendas, Dashboard](#9-pdv-vendas-dashboard)
10. [Admin — Casca/Navegação](#10-admin--cascanavegação)
11. [Camada de Dados (lib/supabase-admin.ts, lib/supabase.ts)](#11-camada-de-dados)
12. [Padrões recorrentes observados (cross-cutting)](#12-padrões-recorrentes-observados)
13. [Cobertura e limitações deste levantamento](#13-cobertura-e-limitações)

---

## 1. Autenticação, Sessão, Produtos, Clientes

### AUTH-01 Formato do token de sessão
- **Onde:** lib/auth-token.ts:60-61
- **Gatilho:** toda chamada a `verificarTokenSessao` (rotas `/me`, login-admin, login-pdv, e onde mais o token é validado)
- **Regra:** o token precisa ter exatamente 2 partes separadas por `.` (payload base64url + assinatura). Qualquer outro número de partes retorna `null` (sessão inválida) sem checar assinatura.

### AUTH-02 Verificação de assinatura HMAC da sessão
- **Onde:** lib/auth-token.ts:37-47, 64-70
- **Regra:** a chave HMAC é derivada de `process.env.SESSION_SECRET` (lança erro se ausente); assinatura verificada com `crypto.subtle.verify('HMAC', ...)` sobre o payload em base64url. Se inválida, `verificarTokenSessao` retorna `null`.
- **Observação:** trocar `SESSION_SECRET` invalida instantaneamente todas as sessões ativas (não há rotação com sobreposição).

### AUTH-03 Expiração da sessão
- **Onde:** lib/auth-token.ts:18, 50, 72
- **Regra:** `DURACAO_SEGUNDOS = 24 * 60 * 60` (24h) somado ao momento da criação vira `exp` no payload. Na verificação, se `payload.usuarioId` ou `payload.exp` estiverem ausentes, ou se `Math.floor(Date.now()/1000) > payload.exp`, a sessão é considerada inválida (`null`).

### AUTH-04 Usuário precisa existir na lista atual no momento da verificação
- **Onde:** lib/auth-token.ts:73
- **Regra:** o `usuarioId` do payload é procurado em `USUARIOS` (lib/usuarios.ts) via `.find(u => u.id === payload.usuarioId)`; se não encontrado, retorna `null` mesmo com token tecnicamente válido.
- **Observação:** como `USUARIOS` é uma lista hardcoded no código-fonte, remover/renomear um usuário do array invalida imediatamente qualquer sessão ativa dele, sem precisar revogar cookie.

### AUTH-05 Duração do cookie de sessão
- **Onde:** lib/auth-token.ts:18, 79-82; app/api/auth/login-pdv/route.ts:32; app/api/auth/login-admin/route.ts:67
- **Regra:** cookie `jsgrafica_sessao` com `maxAge: CONFIG_COOKIE_SESSAO.duracaoSegundos` = 86400s (24h), `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `path: '/'`.

### AUTH-06 Senha do Admin ausente/vazia sempre falha
- **Onde:** lib/auth-senha.ts:16-18
- **Regra:** se `process.env.ADMIN_PASSWORD` não estiver configurado, ou `senha` recebida for falsy, retorna `false` direto, sem comparação.

### AUTH-07 Comprimento diferente rejeita antes da comparação segura
- **Onde:** lib/auth-senha.ts:19-24
- **Regra:** converte `senha` e a senha correta em `Buffer`; se `a.length !== b.length`, retorna `false` imediatamente (evita lançar exceção de `timingSafeEqual`, que exige buffers do mesmo tamanho). Comentário no código reconhece que isso "vaza só o comprimento, não o conteúdo".

### AUTH-08 Comparação de senha em tempo constante
- **Onde:** lib/auth-senha.ts:25
- **Regra:** usa `timingSafeEqual(a, b)` do `node:crypto` (não `===`) para evitar vazamento de timing sobre o conteúdo da senha.

### AUTH-09 Lista fixa de usuários e papéis
- **Onde:** lib/usuarios.ts:19-23
- **Regra:** exatamente 3 usuários hardcoded: `admin1`/"Edvam"/`admin`, `atend1`/"Zu"/`atendente`, `atend2`/"Gabi"/`atendente`. `Papel` só pode ser `"admin"` ou `"atendente"`.
- **Observação:** comentário proíbe explicitamente reintroduzir campo de senha neste arquivo, pois é importado por componentes `"use client"` e iria para o bundle público do navegador.

### AUTH-10 Interceptação global de 401 força logout, exceto rotas de auth
- **Onde:** lib/useDeslogarEm401.ts:14-25
- **Regra:** sobrescreve `window.fetch`; se a resposta tiver `status === 401` E a URL contiver `/api/` E a URL NÃO contiver `/api/auth/`, chama `aoDeslogar()` (força volta à tela de login). Rotas `/api/auth/*` estão isentas (401 nelas é senha errada, não sessão caída).

### AUTH-11 `/api/auth/me` é a única fonte de verdade de "quem está logado"
- **Onde:** app/api/auth/me/route.ts:10-15
- **Regra:** lê o cookie `jsgrafica_sessao`, chama `verificarTokenSessao`; se `usuario` for `null`, responde 401; caso contrário devolve `{ usuario }`.

### AUTH-12 Logout não exige sessão válida prévia
- **Onde:** app/api/auth/logout/route.ts:9-18
- **Regra:** sempre responde `{ success: true }` e limpa o cookie, independente de haver sessão válida ou não.

### AUTH-13 Login PDV: nome é obrigatório e não pode ser vazio
- **Onde:** app/api/auth/login-pdv/route.ts:16-19
- **Regra:** se `nome` não for string ou for string vazia, responde 400.

### AUTH-14 Login PDV nunca autentica usuário com papel admin
- **Onde:** app/api/auth/login-pdv/route.ts:20-23
- **Regra:** busca é `USUARIOS.find(u => u.nome === nome && u.papel !== 'admin')` — comparação exata, exclui explicitamente qualquer `papel === 'admin'`. Se não achar, 401 indicando que admin usa `/api/auth/login-admin`.
- **Observação:** comentário confirma que isso fecha uma falha de segurança pré-existente (clicar "Edvam" no PDV logava como admin sem senha).

### AUTH-15 Login admin: senha é obrigatória
- **Onde:** app/api/auth/login-admin/route.ts:26-29
- **Regra:** se `senha` não for string ou for vazia, 400 — antes mesmo de checar rate limit.

### AUTH-16 Chave do rate limit é o IP de origem
- **Onde:** app/api/auth/login-admin/route.ts:17-19
- **Regra:** usa o primeiro valor de `x-forwarded-for`; se o header não existir, usa `'desconhecido'` como chave (agrupando todas as requisições sem header sob o mesmo contador).

### AUTH-17 Bloqueio de login ativo rejeita mesmo senha correta
- **Onde:** app/api/auth/login-admin/route.ts:38-40
- **Regra:** se `registro.bloqueado_ate > new Date()`, responde 429, **sem sequer chamar `validarSenhaAdmin`**.

### AUTH-18 Contagem de tentativas erradas e limiar de bloqueio
- **Onde:** app/api/auth/login-admin/route.ts:14-15, 42-51
- **Regra:** `LIMITE_TENTATIVAS = 5`, `BLOQUEIO_MINUTOS = 15`. Ao chegar a 5, reseta contador e bloqueia por 15min. Persistido via `upsert` em `jsgrafica_login_tentativas` por chave (IP).

### AUTH-19 Sucesso de login zera o contador de tentativas
- **Onde:** app/api/auth/login-admin/route.ts:54-55
- **Regra:** se existir registro para aquela chave, é deletado por inteiro.

### AUTH-20 Resolução do usuário admin é dinâmica pela lista `USUARIOS`
- **Onde:** app/api/auth/login-admin/route.ts:57-58
- **Regra:** `USUARIOS.find(u => u.papel === 'admin')`; se nenhum usuário tiver esse papel, 500 mesmo com a senha certa.

### PROD-01 Listagem de produtos filtra inativos por padrão
- **Onde:** app/api/produtos/route.ts:8, 16
- **Regra:** por padrão aplica `.eq('ativo', true)`; só é omitido quando `?all=true`.

### PROD-02 Campos e ordenação fixos da listagem
- **Onde:** app/api/produtos/route.ts:10-14
- **Regra:** `select('id, nome, preco, categoria, descricao, ativo, controla_estoque, estoque_atual')`, ordenado por `categoria` depois `nome`.

### PROD-03 PATCH de produto exige apenas `id`, resto é atualização livre
- **Onde:** app/api/produtos/route.ts:23-35
- **Regra:** exige `id`; todos os demais campos são passados direto pro `.update()` sem whitelist/validação de tipo.
- **Observação:** não há validação de quais campos podem ou não ser atualizados por este endpoint.

### PROD-04 Criação de produto exige nome e categoria
- **Onde:** app/api/produtos/route.ts:37-42
- **Regra:** se `nome` ou `categoria` forem falsy, 400.

### PROD-05 Geração de ID sequencial `prod-NNN`
- **Onde:** app/api/produtos/route.ts:44-52
- **Regra:** busca o maior `id` que comece com `prod-`, incrementa 1, formata com `padStart(3,'0')`.
- **Observação:** sem transação/lock — duas criações simultâneas podem, em teoria, gerar o mesmo id.

### PROD-06 Normalização de `preco` na criação
- **Onde:** app/api/produtos/route.ts:56
- **Regra:** string vazia ou `undefined` viram `null`; qualquer outro valor convertido com `Number()` sem validar `NaN`.

### PROD-07 Normalização de `descricao` na criação
- **Onde:** app/api/produtos/route.ts:56
- **Regra:** valor falsy vira `null`.

### PROD-08 Produto novo sempre nasce ativo
- **Onde:** app/api/produtos/route.ts:56
- **Regra:** `ativo: true` fixo na criação.

### PROD-09 Mapeamento de categoria (Supabase) para grupo (PDV)
- **Onde:** lib/dados.ts:8-23
- **Regra:** tabela fixa `CATEGORIA_PARA_GRUPO` mapeia 13 valores literais de categoria para 9 grupos de exibição.
- **Observação:** categoria fora desse mapa fica `undefined` (sem fallback de nome de grupo aqui, só de ícone).

### PROD-10 Lista de categorias consideradas "recarga"
- **Onde:** lib/dados.ts:25-30
- **Regra:** `CATEGORIAS_RECARGA = ['Recarga vem', 'Recarga celular']`.
- **Observação:** duplicata proposital da mesma constante em `lib/supabase-admin.ts`, porque aquele arquivo usa `service_role key` e não pode ser importado client-side — 2 fontes da mesma regra precisam ser mantidas manualmente em sincronia.

### PROD-11 Ordem fixa de exibição dos grupos de produto
- **Onde:** lib/dados.ts:32-35
- **Regra:** Xerox, Impressão, Plastificação, Encadernação, Recargas, Serviço Terceirizado, Personalizados, Escritório, Serviços.

### PROD-12 Reordenação especial só se aplica ao grupo "Impressão"
- **Onde:** lib/dados.ts:49-59
- **Regra:** qualquer outro grupo retorna a lista sem reordenar.

### PROD-13 Ordenação dentro do grupo "Impressão" por subcategoria original
- **Onde:** lib/dados.ts:44-58
- **Regra:** ordena por posição em `ORDEM_SUBCATEGORIA_IMPRESSAO` (ofício, adesivo, cartão, couché, foto), desempate por nome.

### PROD-14 Ícone genérico para grupo não mapeado
- **Onde:** lib/dados.ts:65-80
- **Regra:** fallback `'🏷️'` quando o grupo não está entre os 10 mapeados.

### PROD-15 Sanitização do campo de valor monetário digitado
- **Onde:** lib/dados.ts:85-87
- **Regra:** remove tudo que não seja dígito, vírgula ou ponto.

### PROD-16 Taxa fixa de recarga VEM
- **Onde:** lib/dados.ts:89-92
- **Regra:** `TAXA_RECARGA_VEM = 2.5` (reais); `valor_saida = valor_carga − TAXA_RECARGA_VEM`.

### PROD-17 Lista fixa das 7 contas de origem
- **Onde:** lib/dados.ts:107-116
- **Regra:** `dinheiro_zu`, `dinheiro_gabi`, `dinheiro_geral`, `mercadopago`, `stone`, `caixa_economica`, `recargapay`.

### CLI-01 Nome de exibição do contato com fallback em 3 níveis
- **Onde:** app/api/clientes/route.ts:9-13
- **Regra:** `nome = lead_name || lead_push_name || 'Contato privado'`; `temNome` só true se algum dos dois primeiros existir.

### CLI-02 Criação de contato de balcão exige nome
- **Onde:** app/api/clientes/route.ts:41-42
- **Regra:** `nome.trim()` vazio → 400. Telefone é opcional.

### CLI-03 Validação mínima de dígitos do telefone
- **Onde:** app/api/clientes/route.ts:47-51
- **Regra:** menos de 8 dígitos após limpar não-dígitos → 400.

### CLI-04 Normalização de DDI no telefone de balcão
- **Onde:** app/api/clientes/route.ts:52
- **Regra:** 10 ou 11 dígitos (formato nacional) prefixa `'55'`; outras quantidades ficam como estão.

### CLI-05 Telefone existente reaproveita contato em vez de duplicar
- **Onde:** app/api/clientes/route.ts:58-76
- **Regra:** telefone já existente não cria linha nova, tenta corrigir nome ou retorna com `jaExistia: true`.
- **Observação:** com múltiplos registros pro mesmo telefone, usa `existentes[0]` sem `order by` explícito — potencialmente arbitrário.

### CLI-06 Correção condicional do nome ao vincular contato existente
- **Onde:** app/api/clientes/route.ts:64-71
- **Regra:** só substitui nome se o atual for "inválido" (critério em `corrigirNomeContatoSeInvalido`); nome já bom nunca é sobrescrito.

### CLI-07 Identificador sintético para contato sem telefone
- **Onde:** app/api/clientes/route.ts:79, 82-83
- **Regra:** `identificador = telefone ?? "balcao-" + Date.now()`, gravado simultaneamente em `contact_lid` e `phone`.

### CLI-08 Marcação de origem "BALCAO"
- **Onde:** app/api/clientes/route.ts:85
- **Regra:** `tipo_registro: 'BALCAO'`, distinto de `'INDIVIDUAL'`/`'GRUPO'` do pipeline WhatsApp.

### CLI-09 `data_ultimo_contato` não é setado na criação de balcão
- **Onde:** app/api/clientes/route.ts:81-88
- **Regra:** campo fica `NULL` de propósito — contato de balcão não deve aparecer no Inbox, que ordena por essa coluna.

### CLI-10 PATCH de cliente exige phone e ao menos um campo
- **Onde:** app/api/clientes/route.ts:104-108
- **Regra:** exige `phone`; exige `aniversario` OU `endereco` definidos.

### CLI-11 Normalização de aniversário/endereço em branco vira `null`
- **Onde:** app/api/clientes/route.ts:111-112
- **Regra:** aniversário falsy vira `null`; endereço trim vazio vira `null`.

### CLI-12 Listagem de clientes exclui arquivados
- **Onde:** app/api/clientes/route.ts:127
- **Regra:** `.eq('arquivado', false)` fixo, sem opção de ver arquivados nesta rota.

### CLI-13 Limite de 500 registros na listagem
- **Onde:** app/api/clientes/route.ts:129

### CLI-14 Deduplicação de contato por telefone prioriza nome sobre foto e sobre recência
- **Onde:** app/api/clientes/route.ts:145-156
- **Regra:** pontuação `(lead_name?2:0) + (lead_photo?1:0)`; empate desempata por `data_ultimo_contato` mais recente.

### CLI-15 Texto de "última mensagem recebida" com placeholder de mídia
- **Onde:** app/api/clientes/route.ts:192
- **Regra:** texto tem prioridade; sem texto mas com tipo de mídia mostra `[tipo]`.

### CLI-16 Status de atendimento padrão "aberto"
- **Onde:** app/api/clientes/route.ts:190, 258
- **Regra:** qualquer valor falsy no banco vira `'aberto'` na resposta.

### CLI-17 Alternância de ordenação da lista de clientes
- **Onde:** app/api/clientes/route.ts:196-198
- **Regra:** `ordenar=nome` → alfabética; qualquer outro valor → `data_ultimo_contato` decrescente (ausência tratada como época 0).

### CLI-18 Detalhe de cliente retorna 404 se não houver nenhuma linha
- **Onde:** app/api/clientes/route.ts:210

### CLI-19 Escolha da linha "representante" no detalhe segue o mesmo critério da lista
- **Onde:** app/api/clientes/route.ts:215-220 (mesma regra de CLI-14)

### CLI-20 Contagens de mensagens sempre calculadas ao vivo
- **Onde:** app/api/clientes/route.ts:222-235
- **Regra:** via RPC em lote, nunca de contador incremental armazenado (evita divergência conhecida).

### CLI-21 Pedidos do histórico casam por telefone exato
- **Onde:** app/api/clientes/route.ts:237-241

### CLI-22 Data do primeiro contato é a mais antiga entre as linhas duplicadas
- **Onde:** app/api/clientes/route.ts:243-246

### CLI-23 Histórico de atendimento vazio quando nulo no banco
- **Onde:** app/api/clientes/route.ts:266
- **Regra:** coluna jsonb nula vira `[]` na resposta.

### CLI-24 Badge de status de atendimento com 4 estados e fallback
- **Onde:** components/TelaClientes.tsx:66-74
- **Regra:** `em_atendimento`/`resolvido`/`escalado` têm rótulo próprio; qualquer outro valor (inclusive desconhecido) vira "Aberto".

### CLI-25 Badge de status de pedido com fallback genérico
- **Onde:** components/TelaClientes.tsx:76-79
- **Regra:** status fora do mapa mostra o valor cru como label em vez de esconder/falhar.

### CLI-26 Avatar cai para inicial do nome se a foto falhar ou não existir
- **Onde:** components/TelaClientes.tsx:84-94

### CLI-27 Edição de nome só pré-preenche se o nome atual for "de verdade"
- **Onde:** components/TelaClientes.tsx:138-143
- **Regra:** se `temNome === false`, campo de edição começa vazio.

### CLI-28 Salvar nome exige texto não vazio e usa endpoint do Inbox
- **Onde:** components/TelaClientes.tsx:145-155
- **Regra:** usa `PATCH /api/inbox/contato`, não `/api/clientes`.

### CLI-29 Normalização de aniversário vazio no envio do PATCH extra
- **Onde:** components/TelaClientes.tsx:183

### CLI-30 Exibição de classificação restrita a dois valores conhecidos
- **Onde:** components/TelaClientes.tsx:263
- **Regra:** só "RECORRENTE"/"NOVO" têm rótulo; qualquer outro valor vira "—".

### CLI-31 Histórico de atendimento exibido limitado às 5 entradas mais recentes
- **Onde:** components/TelaClientes.tsx:271-282

### CLI-32 Debounce de busca de clientes depende de haver texto digitado
- **Onde:** components/TelaClientes.tsx:392-395
- **Regra:** 300ms de debounce com texto; 0ms ao limpar a busca.

---

## 2. Pedidos

### PED-01 Desconto por volume (Xerox/Impressão)
- **Onde:** lib/pedidos.ts:7-27
- **Regra:** se `grupo` ∈ `['Xerox', 'Impressão']` E `quantidade >= 50`, aplica 10% de desconto. Qualquer outro caso, 0%.
- **Observação:** `grupo` vem de `CATEGORIA_PARA_GRUPO[categoria] || categoria` — várias categorias podem cair no mesmo grupo de desconto.

### PED-02 Cálculo de total e arredondamento
- **Onde:** lib/pedidos.ts:19-27
- **Regra:** `valorFinal = round(bruto*(1-desconto/100)*100)/100`; `valorTotal` (sem desconto) mantido separado para auditoria.

### PED-03 Texto do trecho de Pix — 2 variantes conforme existência de cobrança real
- **Onde:** lib/pedidos.ts:56-69
- **Regra:** com `pixCopiaECola`, texto fala "a gente avisa" (sem pedir comprovante); sem, usa chave estática e pede comprovante.
- **Observação:** nunca enviado sozinho — sempre vira rascunho.

### PED-04 Confirmação de pedido único — texto determinístico sem IA
- **Onde:** lib/pedidos.ts:78-99
- **Regra:** `temPix` é decisão do CHAMADOR (não mais do `pagamento_tipo` do produto, mudou na demanda 141).

### PED-05 Confirmação de pedido múltiplo (2+ itens da mesma venda)
- **Onde:** lib/pedidos.ts:115-150
- **Regra:** 1 item delega pra PED-04; 2+ monta lista + total; abertura do Pix distingue "pedido inteiro" vs "alguns itens" conforme cobertura.

### PED-06 Mensagem de pagamento confirmado
- **Onde:** lib/pedidos.ts:165-178
- **Regra:** determinístico, sem IA; sempre vira rascunho, nunca enviado sozinho.

### PED-07 Validação de campos obrigatórios no preview de valor
- **Onde:** app/api/pedidos/calcular-valor/route.ts:14-16

### PED-08 Produto deve estar ativo para calcular valor
- **Onde:** app/api/pedidos/calcular-valor/route.ts:18-27

### PED-09 Produto sem preço de tabela exige orçamento manual (preview)
- **Onde:** app/api/pedidos/calcular-valor/route.ts:28-30
- **Regra:** `preco == null` → 422 `requerOrcamento: true`.

### PED-10 Quantidade inválida (preview)
- **Onde:** app/api/pedidos/calcular-valor/route.ts:32-35

### PED-11 Retry Pix — pedidoId obrigatório
- **Onde:** app/api/pedidos/retentar-pix/route.ts:31-32

### PED-12 Retry Pix — só pedido com Pix escolhido
- **Onde:** app/api/pedidos/retentar-pix/route.ts:43-45
- **Regra:** revalida sempre no servidor, nunca confia em quem chamou.

### PED-13 Retry Pix — idempotência se cobrança já existe
- **Onde:** app/api/pedidos/retentar-pix/route.ts:46-48

### PED-14 Retry Pix — bloqueio se já pago
- **Onde:** app/api/pedidos/retentar-pix/route.ts:49-51

### PED-15 Retry Pix — bloqueio se cancelado
- **Onde:** app/api/pedidos/retentar-pix/route.ts:52-54

### PED-16 Retry Pix — fora de escopo para venda com múltiplos itens
- **Onde:** app/api/pedidos/retentar-pix/route.ts:55-57
- **Regra:** `venda_id` presente → 400, exige combinar manualmente.

### PED-17 Retry Pix — telefone precisa ser numérico
- **Onde:** app/api/pedidos/retentar-pix/route.ts:58-60

### PED-18 Retry Pix — valor deve ser positivo
- **Onde:** app/api/pedidos/retentar-pix/route.ts:61-62

### PED-19 Retry Pix — vínculo atômico contra corrida
- **Onde:** app/api/pedidos/retentar-pix/route.ts:92-113
- **Regra:** UPDATE só grava com `.is('mp_order_id', null)` no WHERE — só o processo que "vence a corrida" grava.

### PED-20 Reconciliação automática de Pix pendente ao listar pedidos
- **Onde:** app/api/pedidos/route.ts:56-67
- **Regra:** roda `conferirCobrancasPixPendentes()` via `after()`, não bloqueia a listagem.

### PED-21 Limite de linhas na listagem de pedidos
- **Onde:** app/api/pedidos/route.ts:69-77
- **Regra:** default 500, teto 2000.

### PED-22 Flag `eh_recarga` calculada na listagem
- **Onde:** app/api/pedidos/route.ts:82-90

### PED-23 Criação de pedido via Inbox — distinção de fluxo por `produtoId`/`origemBalcao`
- **Onde:** app/api/pedidos/route.ts:102-117
- **Regra:** `!body.origemBalcao` distingue fluxo Inbox de fluxo balcão (ambos mandam `produtoId`).

### PED-24 Produto deve existir e estar ativo (criação Inbox)
- **Onde:** app/api/pedidos/route.ts:119-125

### PED-25 Produto sem preço de tabela exige valor manual (criação Inbox)
- **Onde:** app/api/pedidos/route.ts:128-135

### PED-26 Cálculo de valor quando há preço de tabela (criação Inbox)
- **Onde:** app/api/pedidos/route.ts:136-140

### PED-27 Gatilho de exigência de Pix antecipado pelo tipo do produto
- **Onde:** app/api/pedidos/route.ts:142-143
- **Regra:** `pagamentoTipo = produto.pagamento_tipo || 'pos_producao'`; `precisaPix = pagamentoTipo === 'pre_producao'`. O disparo real da cobrança na resposta é decidido depois pela escolha explícita de pagamento (PED-33), não só por este campo.

### PED-28 Fonte da chave/titular Pix
- **Onde:** app/api/pedidos/route.ts:145-157
- **Regra:** de `jsgrafica_agent_config` (config única ativa).

### PED-29 Valores default na criação do pedido via Inbox
- **Onde:** app/api/pedidos/route.ts:159-183
- **Regra:** nasce em `status: 'confirmado'` (não `aguardando_confirmacao`).

### PED-30 Correção best-effort de nome do contato
- **Onde:** app/api/pedidos/route.ts:187-197
- **Regra:** falha nunca derruba a criação do pedido.

### PED-31 `finalizarVenda` controla quando a confirmação é montada (multi-item)
- **Onde:** app/api/pedidos/route.ts:206-213
- **Regra:** `deveFinalizar` default `true`; só o último item de uma venda dispara a mensagem cobrindo todos.

### PED-32 Confirmação/Pix só disparam com telefone numérico e venda finalizando
- **Onde:** app/api/pedidos/route.ts:228

### PED-33 Gatilho de cobrança Pix decidido pela escolha explícita do cliente, não pelo produto
- **Onde:** app/api/pedidos/route.ts:256-312
- **Regra:** `'pix'` → cobre total da venda; `null` (fallback legado) → cobre só itens `pre_producao`; `'dinheiro'`/`'cartao'` → nenhuma cobrança.
- **Observação:** `camposEscolhaPagamento` só aceita valores de um conjunto fechado, qualquer outro valor recebido do cliente vira `null`.

### PED-34 Recarga (VEM/celular) nunca entra na cobrança Mercado Pago
- **Onde:** app/api/pedidos/route.ts:269-312
- **Regra:** 100% recarga → Pix estático RecargaPay direto; misto → cobrança MP só na parte não-recarga + instrução separada pra recarga.

### PED-35 Criação real da cobrança Pix com fallback silencioso pra chave estática
- **Onde:** app/api/pedidos/route.ts:333-405
- **Regra:** exceção na criação da cobrança nunca trava o atendimento — cai pro texto de chave estática e registra falha permanente.

### PED-36 Vínculo de `mp_order_id` restrito aos itens que a cobrança realmente cobre
- **Onde:** app/api/pedidos/route.ts:369-380

### PED-37 Popup de erro de Pix só quando a escolha foi explícita
- **Onde:** app/api/pedidos/route.ts:397-403

### PED-38 Telefone não numérico (@lid) pula Pix inteiramente, com log explícito
- **Onde:** app/api/pedidos/route.ts:422-455
- **Observação:** antes da demanda 238 essa era uma falha 100% invisível.

### PED-39 Venda de balcão — campos obrigatórios
- **Onde:** app/api/pedidos/route.ts:479-481
- **Regra:** `servicoNome` e `operador` obrigatórios; `telefone` NÃO (default `'balcao'`).

### PED-40 Status inicial da venda de balcão depende da escolha "retira depois" vs "leva agora"
- **Onde:** app/api/pedidos/route.ts:482-490
- **Regra:** "leva agora" nasce `entregue` direto; "retira depois" nasce `confirmado` e passa pela esteira normal.

### PED-41 `servico_id` fica null para item sintético "avulso"
- **Onde:** app/api/pedidos/route.ts:493-499

### PED-42 `valor_total` (tabela) vs `valor_final` (cobrado) — auditoria de desconto
- **Onde:** app/api/pedidos/route.ts:503-511
- **Regra:** desconto por percentual e por valor são mutuamente exclusivos, escolha manual do operador no balcão.

### PED-43 Gaveta de destino só para pagamento em Dinheiro e valores fixos
- **Onde:** app/api/pedidos/route.ts:516-521

### PED-44 Pagamento confirmado por default na venda de balcão
- **Onde:** app/api/pedidos/route.ts:522-527

### PED-45 `pagamento_tipo` hardcoded 'pos_producao' na venda de balcão
- **Onde:** app/api/pedidos/route.ts:528-533
- **Observação:** `'balcao'` não é valor válido na constraint do banco.

### PED-46 Repasse automático disparado na criação já-entregue do balcão
- **Onde:** app/api/pedidos/route.ts:550-553

### PED-47 Validação de data de pagamento retroativa
- **Onde:** app/api/pedidos/route.ts:572-579
- **Regra:** formato `AAAA-MM-DD`, não pode ser no futuro em relação a "hoje em Recife".

### PED-48 Correção explícita e auditável da forma de pagamento
- **Onde:** app/api/pedidos/route.ts:598-635
- **Regra:** só permitido se já `pagamento_confirmado`; empilha registro em `pagamento_confirmacoes_historico`.

### PED-49 Confirmação manual de pagamento sem mudar status
- **Onde:** app/api/pedidos/route.ts:641-657
- **Regra:** UPDATE restrito a não-pago e não-cancelado; default forma `'Pix'`.

### PED-50 Cancelamento — venda inteira vs item único
- **Onde:** app/api/pedidos/route.ts:667-688

### PED-51 Cancelamento — pedido já cancelado é rejeitado
- **Onde:** lib/supabase-admin.ts:493-500
- **Regra:** não é idempotente/no-op, é falha explícita.

### PED-52 Cancelamento — reversão da saída automática vinculada
- **Onde:** lib/supabase-admin.ts:502-521
- **Regra:** nulifica a referência no pedido ANTES de apagar a saída (ordem obrigatória pela FK sem `ON DELETE`).

### PED-53 Gate de pagamento antes de avançar status (servidor)
- **Onde:** app/api/pedidos/route.ts:710-716
- **Regra:** `STATUS_AVANCO_COM_GATE = ['em_producao', 'pronto', 'entregue']` exige pagamento confirmado ou forma informada na chamada.
- **Observação:** `aguardando_retirada` fica fora do conjunto de propósito ("paga na retirada" pode chegar sem pagamento).

### PED-54 a PED-61 — Máquina de estados dos pedidos (transições permitidas)
- **Onde:** components/TelaPedidos.tsx:89-99; gate em app/api/pedidos/route.ts:710
- **Regra (cada transição é uma decisão separada):**
  - `aguardando_aprovacao → confirmado` (sem trigger real ainda em produção — infraestrutura pronta pra futuro agente de WhatsApp)
  - `aguardando_confirmacao → confirmado` (sem gate de pagamento)
  - `confirmado → em_producao` (com gate)
  - `em_producao → pronto` (com gate)
  - `pronto → entregue` OU `pronto → aguardando_retirada` (só a 1ª tem gate)
  - `aguardando_retirada → entregue` (com gate — ponto real onde "paga na retirada" precisa se resolver)
  - `entregue` e `cancelado` são terminais (sem transição de avanço a partir deles)

### PED-62 Confirmação de forma de pagamento — opções disponíveis e trava de recarga
- **Onde:** components/TelaPedidos.tsx:209-231
- **Regra:** "Pix" genérico é ocultado quando 100% dos itens sendo confirmados são recarga.

### PED-63 Gaveta de destino obrigatória na confirmação de pagamento (Admin sem gaveta própria)
- **Onde:** components/TelaPedidos.tsx:227, 260-276, 279-283

### PED-64 Data de pagamento não pode ser futura (validação de front)
- **Onde:** components/TelaPedidos.tsx:224, 254

### PED-65 Cancelamento de pedido NÃO pago — fluxo simples
- **Onde:** components/TelaPedidos.tsx:461-470
- **Regra:** `confirm()` nativo, sem motivo obrigatório.

### PED-66 Cancelamento de pedido PAGO — modal com motivo obrigatório
- **Onde:** components/TelaPedidos.tsx:290-358, 461-465
- **Regra:** motivo obrigatório entre 2 valores fixos: "Cancelamento" ou "Devolução/Reembolso".

### PED-67 Aviso de "dia já fechado" antes de cancelar pedido pago
- **Onde:** components/TelaPedidos.tsx:365-376
- **Regra:** avisa mas NÃO bloqueia.

### PED-68 Cancelamento de pedido entregue restrito ao Admin
- **Onde:** components/TelaPedidos.tsx:538-548

### PED-69 Agrupamento de pedidos da mesma venda só com 2+ itens
- **Onde:** components/TelaPedidos.tsx:395-411

### PED-70 Avanço em lote — todos os itens precisam estar na mesma etapa
- **Onde:** components/TelaPedidos.tsx:760-781

### PED-71 `telefoneNavegavel` — só telefone numérico é "cliente real"
- **Onde:** components/TelaPedidos.tsx:1246-1248

### PED-72 Correção de forma de pagamento não sobrescreve confirmação já feita
- **Onde:** app/api/pedidos/route.ts:743-777
- **Regra:** tentativa divergente vira registro de "tentativa bloqueada", sem alterar os campos originais.

### PED-73 Repasse automático (`gerarSaidaAutomaticaNaVenda`) — cascata de exclusões, em ordem
- **Onde:** lib/supabase-admin.ts:384-476
- **Regra (7 checagens em ordem, cada uma pode abortar sem gerar saída):** já vinculado; pago via Pix RecargaPay; sem `servico_id`; produto não encontrado; categoria de recarga; produto não marcado pra gerar saída automática; sem `preco_custo`. Se passar por todas: `valor = preco_custo * quantidade`, categoria fixa `'fornecedores'`.

### PED-74 `jornada_tipo` sempre `'simples'` na criação
- **Onde:** app/api/pedidos/route.ts:175, 513

### PED-75 Fila de impressão inclui 3 status
- **Onde:** components/TelaPedidos.tsx:1412
- **Regra:** `confirmado`, `em_producao`, `aguardando_aprovacao`.

### PED-76 Templates de mensagem por status (só 2 status têm aviso automático)
- **Onde:** app/api/pedidos/route.ts:49-52, 803-807
- **Regra:** só `em_producao` e `pronto` disparam rascunho automático; `entregue` nunca ("não faz sentido avisar quem acabou de retirar").

---

## 3. Mercado Pago / Pix

### PIX-01 Cache da configuração do Mercado Pago
- **Onde:** lib/mercadopago.ts:38-55
- **Regra:** busca config ativa em `jsgrafica_mercadopago_config`, cacheada em memória por 60s.

### PIX-02 Chamada autenticada à API do Mercado Pago
- **Onde:** lib/mercadopago.ts:57-73

### PIX-03 Busca de pagamentos (saldo/movimentações)
- **Onde:** lib/mercadopago.ts:98-118
- **Regra:** usa `GET /v1/payments/search` (API clássica), não a Orders API, porque essa não expõe taxa/`net_received_amount`/`money_release_date`.

### PIX-04 Relatório "Dinheiro em conta" — provisionamento de config
- **Onde:** lib/mercadopago.ts:168-205
- **Regra:** cria config de settlement report se não existir, com 14 colunas fixas e frequência mensal (mesmo pra geração manual).

### PIX-05 Criação e listagem/download do relatório
- **Onde:** lib/mercadopago.ts:211-246
- **Regra:** processamento assíncrono no MP; `status` decide se já pode baixar.

### PIX-06 Criação de cobrança Pix — e-mail sintético do pagador
- **Onde:** lib/mercadopago.ts:294-308
- **Regra:** domínio `@testuser.com` (sandbox) ou `@jsgrafica.site` (produção); local-part `cliente.<telefoneLimpo>`.

### PIX-07 Criação de cobrança Pix — payload e idempotência
- **Onde:** lib/mercadopago.ts:309-325
- **Regra:** `X-Idempotency-Key: pix-<externalReference>` — mesma chave retorna a mesma cobrança.

### PIX-08 Polling do QR code após criar a Order
- **Onde:** lib/mercadopago.ts:326-363
- **Regra:** até 8 tentativas × 1,4s (~11,2s total). Esgotando sem QR, lança erro.
- **Observação:** órfã conhecida no Mercado Pago se estourar (Order criada lá sem vínculo local) — resolver isso de vez ficou fora de escopo por decisão.

### PIX-09 Confirmação automática de pagamento — critério de "pago"
- **Onde:** lib/mercadopago.ts:379-415
- **Regra:** só age se `order.status === 'processed'`. UPDATE filtrado por `mp_order_id` + `pagamento_confirmado=false` + `status != cancelado`.
- **Observação:** nunca usa o payload cru do webhook, sempre rebusca a order com token próprio (assinatura do tópico "order" não valida, inconsistência do próprio Mercado Pago).

### PIX-10 Idempotência entre dois eventos de confirmação para o mesmo pedido
- **Onde:** lib/mercadopago.ts:396-397
- **Regra:** filtro `pagamento_confirmado=false` no UPDATE garante que o segundo evento concorrente não tenha efeito.

### PIX-11 Geração de rascunho de mensagem de pagamento confirmado
- **Onde:** lib/mercadopago.ts:403-451
- **Regra:** agrupa por `venda_id`; falha aqui nunca desfaz a confirmação de pagamento em si.

### PIX-12 Detecção de estorno após confirmação
- **Onde:** lib/mercadopago.ts:464-489
- **Regra:** conjunto de status de estorno; **nunca reverte** `pagamento_confirmado`, só sinaliza — cancelamento é sempre decisão manual depois.

### PIX-13 Fallback de conferência de cobranças Pix pendentes
- **Onde:** lib/mercadopago.ts:498-531
- **Regra:** trava de 60s por cobrança; ignora cobranças com mais de 24h de expiração.

### PIX-14 Saldo do Mercado Pago no dia do caixa
- **Onde:** lib/mercadopago.ts:540-548
- **Regra:** soma `net_received_amount` (líquido) só de pagamentos `approved`.

### PIX-15 Regra de expiração do token de acesso (aviso)
- **Onde:** lib/mercadopago.ts:552-557
- **Regra:** 180 dias fixos após criação, sem renovação automática.

### PIX-16 Validação de assinatura do webhook (x-signature)
- **Onde:** lib/mercadopago.ts:566-597
- **Regra:** HMAC-SHA256 sobre manifesto `id:...;request-id:...;ts:...`, comparado em tempo constante (`timingSafeEqual`).

### PIX-17 Log de todo evento de webhook recebido
- **Onde:** lib/mercadopago.ts:599-628
- **Regra:** grava sempre, independente de sucesso, incluindo headers brutos para diagnóstico.

### PIX-18 Endpoint de cobrança do balcão — validações antes de gerar Pix
- **Onde:** app/api/mercadopago/cobranca/route.ts:16-54
- **Regra:** recusa se QUALQUER item estiver cancelado (`.some()`, não `.every()`).

### PIX-19 Venda 100% recarga — nunca gera cobrança no Mercado Pago
- **Onde:** app/api/mercadopago/cobranca/route.ts:56-77
- **Regra:** devolve Pix estático do RecargaPay direto.

### PIX-20 Venda mista — bloco de instrução separado
- **Onde:** app/api/mercadopago/cobranca/route.ts:79-103
- **Regra:** cobrança MP só nos itens não-recarga; falta de config RecargaPay não bloqueia a cobrança MP.

### PIX-21 Idempotência de aplicação — reaproveitar cobrança viva
- **Onde:** app/api/mercadopago/cobranca/route.ts:105-122

### PIX-22 Validação de valor antes de criar cobrança
- **Onde:** app/api/mercadopago/cobranca/route.ts:124-126

### PIX-23 Log de falha permanente ao criar cobrança Pix
- **Onde:** app/api/mercadopago/cobranca/route.ts:128-152
- **Regra:** registra origem/pedido/venda/telefone/valor/erro/tempo decorrido; retorna 500 genérico ao atendente.

### PIX-24 Vínculo da cobrança criada aos pedidos
- **Onde:** app/api/mercadopago/cobranca/route.ts:154-162

### PIX-25 Poll de status da cobrança pelo balcão
- **Onde:** app/api/mercadopago/cobranca/route.ts:180-205
- **Regra:** sem trava de frequência — cada poll de 5s (do front) dispara chamada real à API do MP.

### PIX-26 Webhook — orçamento de tempo de resposta e estratégia
- **Onde:** app/api/mercadopago/webhook/route.ts:9-25
- **Regra:** só valida assinatura e grava evento bruto, sem processamento pesado (MP dá 22s de prazo).

### PIX-27 Origem do `data.id` no webhook
- **Onde:** app/api/mercadopago/webhook/route.ts:16-29
- **Regra:** query string tem prioridade sobre o corpo.

### PIX-28 Webhook — validação de assinatura e tratamento de segredo ausente
- **Onde:** app/api/mercadopago/webhook/route.ts:33-47

### PIX-29 Webhook — confirmação roda mesmo com assinatura inválida
- **Onde:** app/api/mercadopago/webhook/route.ts:49-70
- **Regra:** rebusca a order com token próprio independente da assinatura — um aviso forjado só faria o sistema consultar a própria conta, sem efeito se não estiver realmente paga.

### PIX-30 Webhook — log incondicional e resposta 200 sempre
- **Onde:** app/api/mercadopago/webhook/route.ts:72-93
- **Regra:** sempre 200, mesmo com assinatura inválida — evita loop de reenvio do Mercado Pago.

### PIX-31 Movimentações — janela de data (dia específico x período relativo)
- **Onde:** app/api/mercadopago/movimentacoes/route.ts:16-28
- **Regra:** `dataDia` tem prioridade sobre `dias` (default 30, teto 180).

### PIX-32 Movimentações — limite de resultados por tipo de consulta
- **Onde:** app/api/mercadopago/movimentacoes/route.ts:30-36
- **Regra:** dia específico até 100; janela relativa 50.

### PIX-33 Movimentações — cálculo de saldo bruto/líquido/taxas
- **Onde:** app/api/mercadopago/movimentacoes/route.ts:53-60
- **Regra:** só `approved` entra; taxa só é somada quando o valor líquido veio de verdade (não mascara ausência como zero).

### PIX-34 Resposta do endpoint de movimentações inclui estado do token
- **Onde:** app/api/mercadopago/movimentacoes/route.ts:70-73

### PIX-35 UI — limiares de aviso de expiração do token
- **Onde:** components/TelaMercadoPago.tsx:100-101, 143-149
- **Regra:** ≤30 dias = âmbar; ≤0 = vermelho (expirado).

### PIX-36 UI — seletor de período (7/30/90 dias) x dia específico
- **Onde:** components/TelaMercadoPago.tsx:72-138

### PIX-37 Modal de QR Pix — polling client-side de status
- **Onde:** components/ModalQrPix.tsx:105-115
- **Regra:** a cada 5s; erros de rede são silenciosos.

### PIX-38 Modal de QR Pix — Pix estático nunca faz polling automático
- **Onde:** components/ModalQrPix.tsx:66-68, 105-106, 160-195
- **Regra:** confirmação de recarga é sempre manual (botão).

### PIX-39 Modal de QR Pix — venda mista, confirmação da recarga é sempre manual
- **Onde:** components/ModalQrPix.tsx:8-51, 146-151, 196-201

---

## 4. Fechamento de Caixa, Diagnóstico, Abertura

### FEC-01 Fechamento é sempre por linha `data_dia` + `fechado_por`, geral vs por operador
- **Onde:** app/api/fechamento/route.ts:146-169
- **Regra:** upsert por `(data_dia, fechado_por)`; sem `operador` no corpo → `fechado_por: 'Sistema'` (geral); com → nome do operador (gaveta física).
- **Observação:** não há trava técnica contra refechar o mesmo dia — o upsert simplesmente substitui.

### FEC-02 Cálculo do "esperado" no fechamento POR OPERADOR usa só dinheiro que passou pela mão dele
- **Onde:** app/api/fechamento/route.ts:116-130, 21-33
- **Regra:** nunca é o total geral do dia (que inclui cartão/Pix/pendente) — só a parte física da gaveta.

### FEC-03 Cálculo do "saldo acumulado" no fechamento GERAL
- **Onde:** app/api/fechamento/route.ts:131-141, 48-51
- **Observação:** GET chama `getSaldoAnterior()` sem `dataDia` — possível inconsistência com o POST, não investigada além do que o código mostra.

### FEC-04 Consolidação das 4 contas nomeadas em "bancos"
- **Onde:** app/api/fechamento/route.ts:102-112
- **Regra:** se qualquer uma das 4 contas nomeadas vier definida, soma as 4; senão usa o campo agregado antigo (compatibilidade).

### FEC-05 Total físico contado e Divergência
- **Onde:** app/api/fechamento/route.ts:112, 144; components/TelaFechamento.tsx:156-162
- **Observação:** limiar visual de "zerado" na tela é R$0,50, diferente do limiar de R$20 do Diagnóstico (FEC-13) — dois limiares distintos coexistindo.

### FEC-06 Conciliação automática dispara só no fechamento geral com as 4 contas
- **Onde:** app/api/fechamento/route.ts:173-184
- **Regra:** roda depois da resposta HTTP (`after()`), nunca trava o fechamento; erro só é logado.

### FEC-07 Resposta do fechamento nunca trata divergência como erro
- **Onde:** components/TelaFechamento.tsx:214-241
- **Regra:** fechamento sempre é salvo, com ou sem divergência — decisão explícita do Edvam.

### FEC-08 Erro de API no fechamento é tratado explicitamente
- **Onde:** components/TelaFechamento.tsx:190-198

### FEC-09 "Dia já fechado" — o que é checado e o que isso implica
- **Onde:** app/api/fechamento/dia-fechado/route.ts:1-32
- **Regra:** só verifica fechamento GERAL; usado só pra EXIBIR AVISO no cancelamento de pedido entregue — nada é tecnicamente travado.

### FEC-10 Fechamento geral histórico só entra no "Histórico" e nos filtros via `ehFechamentoGeral`
- **Onde:** components/TelaFechamento.tsx:513-545; lib/diagnostico.ts:104-106, 183-184

### FEC-11 Coleta do Diagnóstico (Camada A) — quais pedidos "contam" no dia
- **Onde:** lib/diagnostico.ts:20-81
- **Regra:** união de (pagos+não-cancelados, na janela de `data_entrada_caixa`) e (entregues+não-pagos, na janela de `data_entregue_at`).

### FEC-12 Vínculo saída↔pedido (repasse) é resolvido também fora da janela do dia
- **Onde:** lib/diagnostico.ts:84-102
- **Regra:** segunda consulta sem restrição de data cobre repasse de hoje referente a pedido de outro dia.

### FEC-13 Sinais da Camada B — 5 regras determinísticas
- **Onde:** lib/diagnostico.ts:208-363
- **Regra:** `pix_nao_confirmado_telefone_generico`; `pedidos_identicos_em_sequencia` (janela de 10min); 3 variações de sinal de recarga de celular; `telefone_formato_lid` (crítico); divergência de fechamento acima de R$20 (`LIMIAR_DIVERGENCIA`).
- **Observação:** 2 sinais antigos de recarga VEM foram removidos por gerarem falso positivo.

### FEC-14 Categoria de produto usada nos sinais de recarga vem de consulta separada
- **Onde:** lib/diagnostico.ts:144-155

### FEC-15 Diagnóstico recalcula os totais "agora" para comparar com o gravado
- **Onde:** lib/diagnostico.ts:192-201
- **Observação:** a diferença entre gravado e recalculado não vira sinal formal — fica só exposta lado a lado no JSON.

### FEC-16 Diagnóstico por operador expõe divergência detalhada
- **Onde:** lib/diagnostico.ts:179-191

### FEC-17 Saldo Mercado Pago automático com fallback manual, nunca derruba o diagnóstico
- **Onde:** lib/diagnostico.ts:68-73; app/api/fechamento/route.ts:57-64

### FEC-18 Geração de resumo narrativo (Camada C) — o que entra no prompt e regras de conteúdo
- **Onde:** app/api/fechamento/diagnostico/resumo/route.ts:26-80
- **Regra:** obrigatório citar números reais, nunca inventar causa; se dado não sustentar explicação, dizer isso explicitamente.

### FEC-19 Resumo IA nunca sobrescreve edição manual, e falha da IA não afeta fechamento
- **Onde:** app/api/fechamento/diagnostico/resumo/route.ts:88-142
- **Regra:** falha do Gemini nunca grava nada; sobrescreve só `resumo_ia`, nunca `resumo_editado`.

### FEC-20 Edição manual do resumo (Camada D)
- **Onde:** app/api/fechamento/diagnostico/resumo/route.ts:144-181
- **Regra:** texto vazio remove a edição (volta a mostrar o texto da IA).

### FEC-21 Tela do Diagnóstico — geração/edição do resumo e exibição dos sinais
- **Onde:** components/DiagnosticoFechamento.tsx:88-256
- **Regra:** `resumo_editado` sempre sobrepõe `resumo_ia` na exibição.

### FEC-22 Diagnóstico com data selecionável, limitada a hoje
- **Onde:** components/DiagnosticoFechamento.tsx:36-44, 135

### FEC-23 Abertura de caixa — 1 linha por operador por dia, campos obrigatórios
- **Onde:** app/api/abertura-caixa/route.ts:1-36
- **Regra:** `operador` obrigatório; dinheiro/moedas default 0.

### FEC-24 Portão de abertura de caixa — o que bloqueia o acesso ao PDV
- **Onde:** components/PortaoAberturaCaixa.tsx:14-109
- **Regra:** admin nunca precisa abrir caixa; não-admin fica bloqueado até registrar Dinheiro/Moedas.

### FEC-25 Pré-preenchimento da Contagem física geral com o que os operadores já fecharam
- **Onde:** components/TelaFechamento.tsx:135-147, 337-367
- **Regra:** só acontece uma vez por carregamento, não sobrescreve ajuste manual depois.

### FEC-26 Recálculo em cascata — escopo e regra de parada
- **Onde:** components/ModalRecalculoFechamento.tsx:1-186
- **Regra:** sempre abre em modo prévia; aplicar exige confirmação explícita citando quantos dias/itens; falha para no dia onde ocorreu, mantendo os já aplicados.

### FEC-27 Comportamento de erro na prévia/aplicação do recálculo
- **Onde:** components/ModalRecalculoFechamento.tsx:56-101

---

## 5. Conciliação, Entradas/Saídas, Contas a Pagar/Receber, Transferências

### FIN-01 Matching nível 1 — referência válida do pedido
- **Onde:** lib/conciliacao.ts:81-93
- **Regra:** pagamento MP aprovado com `external_reference` batendo `id`/`venda_id` de um pedido real é considerado explicado, sem gerar pendência.

### FIN-02 Dedup de pendência já existente, com exceção de transferência
- **Onde:** lib/conciliacao.ts:97-117
- **Regra:** pendência classificada como `transferencia` não é somada de novo no agregado (já contabilizada por `criarTransferencia`).

### FIN-03 Matching nível 2/3 — candidato por valor+data
- **Onde:** lib/conciliacao.ts:119-133, 140-142, 156
- **Regra:** 1 candidato único → sugere vínculo (nunca vincula sozinho); 0 ou 2+ → descrição genérica.

### FIN-04 Criação de pendência tipo `mercadopago_pagamento`
- **Onde:** lib/conciliacao.ts:144-156

### FIN-05 Descrição em linguagem simples do tipo de pagamento MP
- **Onde:** lib/conciliacao.ts:33-54
- **Regra:** tipo desconhecido cai em texto genérico em vez de quebrar.

### FIN-06 Gap agregado — contas e forma de pagamento configuradas
- **Onde:** lib/conciliacao.ts:174-183
- **Regra:** 4 contas: mercadopago↔Pix, stone↔Cartão, recargapay↔Pix RecargaPay, caixa_economica↔nenhuma forma mapeada.

### FIN-07 Cálculo de entrada/saída por conta para o gap
- **Onde:** lib/conciliacao.ts:201-238
- **Regra:** saída exclui categoria `transferencia_entre_contas` de propósito, para não contar a mesma transferência 2x.

### FIN-08 Escolha do fechamento "Sistema" anterior por ordem real
- **Onde:** lib/conciliacao.ts:240-268
- **Regra:** nunca por subtração de dia calendário (há dias sem fechamento).

### FIN-09 Saldo informado do dia
- **Onde:** lib/conciliacao.ts:270-277

### FIN-10 Cálculo da diferença ajustada e limiar de materialidade
- **Onde:** lib/conciliacao.ts:172, 296-305
- **Regra:** `LIMIAR_MATERIALIDADE = R$2,00`; só cria pendência se ultrapassar.

### FIN-11 Dedup de pendência agregada por conta+dia
- **Onde:** lib/conciliacao.ts:307-337
- **Regra:** não recria pendência existente independente do status dela.

### FIN-12 Orquestração: Mercado Pago antes do Gap agregado, sempre
- **Onde:** lib/conciliacao.ts:358-370
- **Regra:** ordem fixa — inverter duplicaria valores.

### FIN-13 Rota manual de conciliação
- **Onde:** app/api/conciliacao/rodar/route.ts:12-23

### FIN-14 Listagem de pendências e cálculo de "fechamento desatualizado"
- **Onde:** app/api/conciliacao/pendencias/route.ts:26-56
- **Regra:** calculado ao vivo, nunca gravado; transferência nunca entra (sempre líquida zero).

### FIN-15 Classificação de pendência — ações válidas e regra de estado
- **Onde:** app/api/conciliacao/pendencias/route.ts:76-152
- **Regra:** só classifica pendência `pendente`; ações: ignorar, sabido (motivo obrigatório), entrada, saída (categoria obrigatória), transferência.

### FIN-16 Direção da transferência decidida pelo sinal do valor da pendência
- **Onde:** app/api/conciliacao/pendencias/route.ts:121-136

### FIN-17 Recálculo — modo prévia é somente leitura
- **Onde:** app/api/conciliacao/recalculo-previa/route.ts:6-18

### FIN-18 Recálculo — modo aplicar exige fingerprint exato da prévia
- **Onde:** app/api/conciliacao/recalculo-aplicar/route.ts:12-31

### FIN-19 Saídas — filtro por dia
- **Onde:** app/api/saidas/route.ts:8-39
- **Regra:** sem conceito de status em `jsgrafica_saidas` — soma tudo do dia.

### FIN-20 Criação de saída — validação de conta e categoria
- **Onde:** lib/supabase-admin.ts:1111-1165

### FIN-21 Regra especial de valor — categoria `recarga_vem`
- **Onde:** lib/supabase-admin.ts:1141-1149
- **Regra:** `(valorCarga - 2,5) * quantidade`.

### FIN-22 Correção auditável de `conta_origem` de uma saída
- **Onde:** app/api/saidas/route.ts:75-107
- **Regra:** sempre grava rastro `{em, operador, de, para}`.

### FIN-23 Edição genérica de saída — bloqueio se vinculada a transferência
- **Onde:** app/api/saidas/route.ts:109-186
- **Regra:** editar valor/data propaga pro lado da transferência na mesma chamada; falha de propagação vira erro explícito, nunca silencioso.

### FIN-24 Cancelamento de saída — DELETE real, não soft-delete
- **Onde:** app/api/saidas/route.ts:192-248
- **Regra:** bloqueado se lado de transferência; desfaz vínculo com pedido antes do delete.

### FIN-25 Ledger de entradas — fontes agregadas
- **Onde:** app/api/entradas/route.ts:31-155
- **Regra:** 5 fontes (vendas legado, pedidos pagos, abertura de caixa, entradas avulsas, fechamento), unidas num ledger cronológico.

### FIN-26 Entrada avulsa — criação
- **Onde:** app/api/entradas-avulsas/route.ts:13-30; lib/supabase-admin.ts:1221-1245

### FIN-27 Entrada avulsa — edição sem trava por origem
- **Onde:** app/api/entradas-avulsas/route.ts:32-81

### FIN-28 Entrada avulsa — cancelamento (DELETE real)
- **Onde:** app/api/entradas-avulsas/route.ts:83-111

### FIN-29 Contas a Pagar/Receber — status "atrasado" calculado na leitura
- **Onde:** app/api/contas-pagar-receber/route.ts:12-20; lib/supabase-admin.ts:660-676

### FIN-30 Contas a Pagar/Receber — cadastro
- **Onde:** app/api/contas-pagar-receber/route.ts:22-46
- **Regra:** recorrente sem frequência informada cai em `'mensal'` por default.

### FIN-31 Contas a Pagar/Receber — edição bloqueada após pago
- **Onde:** app/api/contas-pagar-receber/route.ts:52-71; lib/supabase-admin.ts:704-733

### FIN-32 Contas a Pagar/Receber — cancelamento (DELETE real)
- **Onde:** app/api/contas-pagar-receber/route.ts:75-86; lib/supabase-admin.ts:735-756
- **Regra:** conta pendente não tem vínculo ainda, então apagar não deixa órfão (diferente de saída/pedido já materializado).

### FIN-33 Baixa de conta a pagar/receber — proteção contra saída duplicada
- **Onde:** lib/supabase-admin.ts:781-936
- **Regra:** busca saídas candidatas de mesmo valor nos últimos 15 dias; conta recorrente restringe a busca ao ciclo atual (±15 dias mensal, ±3 dias semanal) pra não confundir com o ciclo anterior. Conflito nunca decide sozinho — retorna as opções pro Admin.

### FIN-34 Baixa — geração do registro financeiro real
- **Onde:** lib/supabase-admin.ts:858-903
- **Regra:** "pagar" vira saída (`data_dia` = hoje, não o vencimento original); "receber" vira pedido sintético (`telefone: 'contas_a_receber'`).

### FIN-35 Baixa — geração automática da próxima instância recorrente
- **Onde:** lib/supabase-admin.ts:758-779, 914-933

### FIN-36 Transferências — GET do dia
- **Onde:** app/api/transferencias/route.ts:11-31

### FIN-37 Transferência entre contas — criação em 2 registros ligados
- **Onde:** lib/supabase-admin.ts:1167-1215
- **Regra:** origem≠destino obrigatório; nasce sempre com a saída-par; se a origem for gaveta física de Zu/Gabi, o operador da saída é forçado pra ela, ignorando quem registrou.

### FIN-38 Transferência — cancelamento dos 2 lados juntos
- **Onde:** app/api/transferencias/route.ts:61-94
- **Regra:** nunca é possível apagar só um lado por essa rota.

### FIN-39 Contas bancárias — unicidade de "padrão" por forma de pagamento
- **Onde:** app/api/contas-bancarias/route.ts:44-58
- **Regra:** marcar uma nova como padrão desmarca a anterior — nunca 2 padrões simultâneos.

### FIN-40 Categorias de saída — geração de id (slug) e unicidade
- **Onde:** app/api/categorias-saida/route.ts:6-49

### FIN-41 Tela Conciliação — filtro padrão e banner de recálculo
- **Onde:** components/TelaConciliacao.tsx:40, 66-67, 79-92

### FIN-42 Modal de classificação — 4 opções exatas de ação
- **Onde:** components/ModalClassificarPendencia.tsx:37, 124-134

### FIN-43 Tela Contas a Pagar/Receber — fluxo de conflito de baixa na UI
- **Onde:** components/TelaContasPagarReceber.tsx:151-190

### FIN-44 Tela Entradas — total do dia e regra de acesso ao lançamento manual
- **Onde:** components/TelaEntradas.tsx:131-135, 213-221, 244
- **Regra:** lançar/editar entrada avulsa é restrito ao Admin.

### FIN-45 Tela Financeiro — thresholds de alerta de "Saúde do caixa"
- **Onde:** components/TelaFinanceiro.tsx:249, 258-284, 452-453
- **Regra:** limiar de R$0,50 pra "zero" nos últimos 7 fechamentos.

### FIN-46 Modal Adicionar/Editar Entrada — reaproveitamento do mesmo componente
- **Onde:** components/ModalAdicionarEntrada.tsx:36-97

### FIN-47 Transferência nunca entra no recálculo de fechamento por ser líquida zero
- **Onde:** lib/supabase-admin.ts:1260-1314
- **Observação:** se a saída-par de uma transferência for editada depois via rota genérica, os 2 lados podem dessincronizar (caso real citado: 24-07-26, R$945 vs R$890) — achado registrado, não corrigido nesta função.

### FIN-48 Recálculo de fechamento — cascata por ordem real, delta exato, nunca recalcula o dia inteiro
- **Onde:** lib/supabase-admin.ts:1247-1388

### FIN-49 Aplicar recálculo — verificação de fingerprint antes de cada UPDATE
- **Onde:** lib/supabase-admin.ts:1406-1470
- **Regra:** se o conjunto de pendências mudou desde a prévia, para imediatamente sem aplicar aquele dia nem os seguintes.

---

## 6. Inbox WhatsApp — Backend

### INBK-01 Janela de contexto de conversa para prompts de IA
- **Onde:** lib/inboxContexto.ts:7, 18-24
- **Regra:** últimas 15 mensagens.

### INBK-02 Texto exibido/enviado ao prompt por mensagem (fallback de conteúdo)
- **Onde:** lib/inboxContexto.ts:28-32

### INBK-03 Pedido vinculado ao contexto de conversa
- **Onde:** lib/inboxContexto.ts:34-40
- **Regra:** sempre o pedido mais recente daquele telefone.

### INBK-04 Log de mensagem enviada manualmente
- **Onde:** lib/inboxLog.ts:9-25
- **Regra:** `enviado_por: 'equipe'` hardcoded (único chamador hoje).

### INBK-05 Atualização atômica de contato ao registrar envio
- **Onde:** lib/inboxLog.ts:41-49
- **Regra:** via RPC; falha só loga, não bloqueia a resposta.

### INBK-06 Cache de configuração da Z-API
- **Onde:** lib/zapi.ts:10-34
- **Regra:** 1 minuto de cache.

### INBK-07 Chamadas HTTP à Z-API sem timeout/retry configurado
- **Onde:** lib/zapi.ts:40-66

### INBK-08 Apagar mensagem — só a própria, "apagar pra todos"
- **Onde:** lib/zapi.ts:72-95
- **Regra:** `owner: 'true'` fixo — nunca apaga mensagem do cliente.

### INBK-09 Envio de documento — extensão do arquivo
- **Onde:** lib/zapi.ts:101-104
- **Regra:** default `'pdf'` se ausente.

### INBK-10 Gemini nunca dispara sozinho / nunca envia ao cliente
- **Onde:** lib/gemini.ts:1-4

### INBK-11 Modelo Gemini fixo
- **Onde:** lib/gemini.ts:13
- **Regra:** `gemini-2.5-flash` (motivado por descontinuação confirmada do modelo anterior).

### INBK-12 Cálculo de período do dia (nunca a IA "chuta" a hora)
- **Onde:** lib/gemini.ts:17-21, 23-35

### INBK-13 Parâmetros default de geração do Gemini
- **Onde:** lib/gemini.ts:40-64
- **Regra:** `thinkingBudget: 0` sempre fixo.

### INBK-14 Transcrição de áudio via Gemini
- **Onde:** lib/gemini.ts:78-124
- **Regra:** só manual, quando o pipeline automático do n8n falha.

### INBK-15 Análise de mídia via Gemini — não conectada a nenhum fluxo real
- **Onde:** lib/gemini.ts:126-211
- **Observação:** função existe mas não é chamada por nenhuma tela/webhook, só pelo script de spike da demanda 203.

### INBK-16 Zerar não lidas ao abrir conversa
- **Onde:** app/api/inbox/marcar-lida/route.ts:9-20

### INBK-17 Arquivar/desarquivar contato
- **Onde:** app/api/inbox/arquivar/route.ts:8-21

### INBK-18 Edição manual de nome do contato
- **Onde:** app/api/inbox/contato/route.ts:10-24

### INBK-19 Contagem de conversas escaladas (deduplicada por telefone)
- **Onde:** app/api/inbox/escalados-count/route.ts:18-28
- **Regra:** deduplicada por telefone único (não por linha).

### INBK-20 Upload de mídia — signed URL direto ao Storage
- **Onde:** app/api/inbox/upload-url/route.ts:13-32
- **Regra:** existe pra contornar limite de ~4,5MB da função serverless da Vercel.

### INBK-21 Resumir conversa — nunca enviado ao cliente
- **Onde:** app/api/inbox/resumir-conversa/route.ts:9-33

### INBK-22 Sugestão de resposta — regras anti-alucinação
- **Onde:** app/api/inbox/sugestao-resposta/route.ts:9-44
- **Regra:** proibido inventar preço/prazo não explícito na conversa/pedido.

### INBK-23 Transcrição sob demanda — validações de tipo de mídia
- **Onde:** app/api/inbox/transcrever-audio/route.ts:12-45

### INBK-24 Envio de mensagem manual — endereçamento por contact_lid
- **Onde:** app/api/inbox/responder/route.ts:14-31
- **Regra:** `contact_lid` tem prioridade sobre `phone` no envio real.

### INBK-25 Prioridade de ID de mensagem ao logar envio
- **Onde:** app/api/inbox/responder/route.ts:32-37 (mesma lógica em enviar-midia)
- **Regra:** `zaapId` despriorizado de propósito (não bate com o que o webhook n8n grava).

### INBK-26 Envio manual limpa rascunho de pedido
- **Onde:** app/api/inbox/responder/route.ts:41-45

### INBK-27 Apagar mensagem — regras de permissão e ordem de operações
- **Onde:** app/api/inbox/apagar-mensagem/route.ts:17-61
- **Regra:** só apaga mensagem `from_me`; chama Z-API ANTES de mudar o banco; histórico nunca é deletado, só marcado.

### INBK-28 Envio de mídia — classificação de tipo e destino
- **Onde:** app/api/inbox/enviar-midia/route.ts:14-72

### INBK-29 Mudança de status de atendimento — dedup de histórico
- **Onde:** app/api/inbox/atendimento/route.ts:12-26

### INBK-30 Campos atualizados por transição de status de atendimento
- **Onde:** app/api/inbox/atendimento/route.ts:28-41

### INBK-31 Resolver conversa também limpa trava interna do agente de IA
- **Onde:** app/api/inbox/atendimento/route.ts:54-71
- **Regra:** best-effort, falha só loga.

### INBK-32 Extração de conteúdo interativo (botões/lista) do payload cru
- **Onde:** app/api/inbox/mensagens/route.ts:15-37

### INBK-33 Busca de mensagens — resolução de variantes @lid do telefone
- **Onde:** app/api/inbox/mensagens/route.ts:39-77
- **Regra:** sem isso, mensagens gravadas sob `@lid` ficariam invisíveis.

### INBK-34 Limite e ordenação de mensagens carregadas
- **Onde:** app/api/inbox/mensagens/route.ts:79-98
- **Regra:** 500 mais recentes, filtra bolhas vazias.

### INBK-35 GET de mensagens sempre marca como lida (efeito colateral)
- **Onde:** app/api/inbox/mensagens/route.ts:100-105

### INBK-36 Filtro de busca de conversas por status/arquivado/texto
- **Onde:** app/api/inbox/conversas/route.ts:6-44
- **Regra:** texto que parece telefone busca por `phone`; senão busca por nome.

### INBK-37 Dedup de contatos duplicados na listagem
- **Onde:** app/api/inbox/conversas/route.ts:47-78
- **Regra:** mesma pontuação nome>foto de CLI-14; contador de não lidas é SOMA das duplicatas.

### INBK-38 Batch de última mensagem e contagens via RPC
- **Onde:** app/api/inbox/conversas/route.ts:85-154
- **Regra:** contagem sempre ao vivo, nunca dos contadores incrementais (desatualizados).

### INBK-39 Motivo de escalonamento só buscado para contatos escalados
- **Onde:** app/api/inbox/conversas/route.ts:156-171

### INBK-40 Nome de exibição do contato — "Contato privado" como fallback
- **Onde:** app/api/inbox/conversas/route.ts:175-180

### INBK-41 Criação de conversa nova — dedup e status inicial
- **Onde:** app/api/inbox/conversas/route.ts:211-251
- **Regra:** nasce em `'em_atendimento'`, não `'aberto'`.

### INBK-42 Telefones autorizados — sem checagem de auth na própria rota
- **Onde:** app/api/telefones-autorizados/route.ts:6-13
- **Observação:** comentário é anterior à sessão real da demanda 329, não confirmado se ganhou proteção via `proxy.ts` depois.

### INBK-43 Adicionar telefone autorizado — normalização e checagem de duplicidade
- **Onde:** app/api/telefones-autorizados/route.ts:45-76

### INBK-44 Toggle de telefone autorizado — nunca exclui (soft-delete)
- **Onde:** app/api/telefones-autorizados/route.ts:78-100

### INBK-45 Enriquecimento de nome do contato na lista de telefones autorizados
- **Onde:** app/api/telefones-autorizados/route.ts:21-36

### INBK-46 QR Code Z-API — repasse direto sem transformação
- **Onde:** app/api/zapi/qrcode/route.ts:6-14

### INBK-47 Status da Z-API + últimos eventos de conexão
- **Onde:** app/api/zapi/status/route.ts:7-23

### INBK-48 Log de vendas — lê da tabela legada, não de pedidos
- **Onde:** app/api/log/route.ts:11-23
- **Observação:** consulta exclusivamente `jsgrafica_vendas` (legado) — não confirmado se ainda é usado por algum fluxo real em produção.

---

## 7. Inbox WhatsApp — UI

### INUI-01 Filtros enviados pro backend na lista de conversas
- **Onde:** components/TelaInbox.tsx:394-402

### INUI-02 Chips de filtro de status disponíveis
- **Onde:** components/TelaInbox.tsx:1419-1424
- **Regra:** Todos, aberto, em_atendimento, escalado, resolvido.

### INUI-03 Toggle "Arquivados" é modo exclusivo, não filtro adicional
- **Onde:** components/TelaInbox.tsx:1425-1429

### INUI-04 Contador de não lidas só aparece se a conversa não está aberta
- **Onde:** components/TelaInbox.tsx:1434, 1447-1451

### INUI-05 Abrir conversa zera não-lidas no cliente e assume atendimento automaticamente se estava "aberto"
- **Onde:** components/TelaInbox.tsx:1436, 480-486, 928-938

### INUI-06 Sinal de navegação externa por `nonce`
- **Onde:** components/TelaInbox.tsx:409-414, 419-423
- **Regra:** permite reabrir a mesma conversa clicando 2x sem mudar valor.

### INUI-07 Polling de segurança de 10s só enquanto a aba está visível
- **Onde:** components/TelaInbox.tsx:425-464
- **Observação:** o mecanismo principal é o Broadcast (INUI-09); este é rede de segurança de verdade, porque RLS bloqueia o Realtime padrão.

### INUI-08 Refetch ao focar a janela
- **Onde:** components/TelaInbox.tsx:649-656

### INUI-09 Broadcast global de "nova mensagem" com debounce
- **Onde:** components/TelaInbox.tsx:683-721
- **Regra:** payload vazio de propósito — só sinal pra refazer fetch via rota autenticada.

### INUI-10 Carregamento de mensagens: loading visível só na troca manual de conversa
- **Onde:** components/TelaInbox.tsx:470-476

### INUI-11 Rascunho de pedido pendente pré-preenche o campo de resposta
- **Onde:** components/TelaInbox.tsx:492-498
- **Regra:** sobrescreve sem checar se já havia texto digitado.

### INUI-12 Determinação do "pedido ativo" da conversa
- **Onde:** components/TelaInbox.tsx:501-531
- **Regra:** pedido mais recente aberto; se fechado mas com `venda_id`, procura outro item aberto da mesma venda.

### INUI-13 Reset de estados de fluxo de pedido/IA ao trocar de conversa
- **Onde:** components/TelaInbox.tsx:533-543, 546-551, 574-578

### INUI-14 Toggle "Atendimento IA" por telefone — 3 estados e 2 operações distintas
- **Onde:** components/TelaInbox.tsx:560-609, 1816-1840

### INUI-15 Cálculo automático de valor do pedido com debounce
- **Onde:** components/TelaInbox.tsx:612-635
- **Regra:** 400ms.

### INUI-16 Auto-scroll da thread ao chegar mensagem/mídia
- **Onde:** components/TelaInbox.tsx:640-646, 1578, 1583

### INUI-17 Auto-ajuste de altura da caixa de texto
- **Onde:** components/TelaInbox.tsx:658-681
- **Regra:** limite 420px.

### INUI-18 Seleção de tipo de anexo pela MIME
- **Onde:** components/TelaInbox.tsx:724-733

### INUI-19 Envio de mídia — upload direto pro Storage, não pela função da Vercel
- **Onde:** components/TelaInbox.tsx:735-776

### INUI-20 Envio de mensagem de texto — otimista com rollback
- **Onde:** components/TelaInbox.tsx:779-805
- **Regra:** Enter envia, Shift+Enter quebra linha.

### INUI-21 Botão de enviar desabilitado sem conteúdo
- **Onde:** components/TelaInbox.tsx:1749

### INUI-22 Sugestão de resposta por IA nunca envia sozinha
- **Onde:** components/TelaInbox.tsx:809-828, 1712-1716, 1734-1738
- **Regra:** edição manual do campo zera o aviso "sugestão da IA".

### INUI-23 "Resumir conversa" existe no código mas está desligado por flag
- **Onde:** components/TelaInbox.tsx:130, 1795-1809

### INUI-24 Apagar mensagem enviada — confirmação obrigatória e ordem de operação
- **Onde:** components/TelaInbox.tsx:856-875
- **Regra:** mensagem otimista ainda não confirmada não pode ser apagada.

### INUI-25 Mensagem apagada substitui todo o conteúdo por um placeholder
- **Onde:** components/TelaInbox.tsx:1567-1568

### INUI-26 Transcrição de áudio sob demanda só aparece se ainda não há transcrição
- **Onde:** components/TelaInbox.tsx:879-902, 1603-1609

### INUI-27 Mudança de status de atendimento (Assumir/Resolver/Reabrir/Assumir da IA)
- **Onde:** components/TelaInbox.tsx:906-918, 1505-1541

### INUI-28 Arquivar/desarquivar remove item da lista atual imediatamente
- **Onde:** components/TelaInbox.tsx:941-951, 1542-1546

### INUI-29 Validação para adicionar item ao carrinho de pedido
- **Onde:** components/TelaInbox.tsx:987-1008

### INUI-30 `vendaId` só é gerado com 2+ itens no carrinho
- **Onde:** components/TelaInbox.tsx:1014-1023

### INUI-31 Confirmação manual de Pix de recarga — dois caminhos
- **Onde:** components/TelaInbox.tsx:1080-1120

### INUI-32 Avanço de status de pedido é sempre gated por confirmação de pagamento pendente
- **Onde:** components/TelaInbox.tsx:1160-1169, 1218-1227, 1285-1298
- **Regra:** avanço em lote só se todos os itens estiverem na mesma etapa.

### INUI-33 Cancelamento de pedido/item exige confirmação com aviso diferente se já pago
- **Onde:** components/TelaInbox.tsx:1171-1182, 1230-1238

### INUI-34 Aviso de forma de pagamento bloqueada não é mais silencioso
- **Onde:** components/TelaInbox.tsx:1146-1148, 1206-1208, 1271-1276

### INUI-35 Modal de pagamento pendente recebe `apenasRecarga` calculado
- **Onde:** components/TelaInbox.tsx:2144-2169

### INUI-36 Rótulo de "Pix" muda para "Pix RecargaPay" sem mudar o valor enviado
- **Onde:** components/TelaInbox.tsx:1367-1378, 2204-2221

### INUI-37 Modal "Confirmar pedido" — três perguntas totalmente opcionais, sem default
- **Onde:** components/TelaInbox.tsx:2176-2246

### INUI-38 Card de pedido no painel direito tem 3 estados mutuamente exclusivos
- **Onde:** components/TelaInbox.tsx:1869-2136

### INUI-39 Formatação de hora depende de ser hoje ou não
- **Onde:** components/TelaInbox.tsx:1335-1349

### INUI-40 Rótulos/cores de badge de status da conversa
- **Onde:** components/TelaInbox.tsx:1351-1359

### INUI-41 Exibição de mídia interativa (botão/lista) é somente ilustrativa
- **Onde:** components/TelaInbox.tsx:1621-1647

### INUI-42 Legenda de mídia só aparece se não houver `message_text`
- **Onde:** components/TelaInbox.tsx:1617-1618

### INUI-43 Nova conversa exige telefone não vazio
- **Onde:** components/TelaInbox.tsx:1313-1332

### INUI-44 Largura dos painéis laterais é persistida em localStorage, altura do campo de texto não
- **Onde:** components/TelaInbox.tsx:162-169, 246-277, 279-294

### INUI-45 Fallback de avatar por erro de carregamento de imagem
- **Onde:** components/TelaInbox.tsx:171-190

### INUI-46 Busca de contato só dispara com 2+ caracteres, debounce 300ms
- **Onde:** components/VincularContatoBalcao.tsx:30-42

### INUI-47 Vincular venda a contato nunca é obrigatório
- **Onde:** components/VincularContatoBalcao.tsx:9-10, 144-147

### INUI-48 Criação rápida de contato — nome obrigatório, telefone opcional
- **Onde:** components/VincularContatoBalcao.tsx:49-68, 96-98

### INUI-49 Campo de nome do novo contato é pré-preenchido com o texto já digitado na busca
- **Onde:** components/VincularContatoBalcao.tsx:136

### INUI-50 Exibição de telefone é omitida para contatos criados no balcão
- **Onde:** components/VincularContatoBalcao.tsx:76

### INUI-51 Dropdown de sugestões fecha com atraso de 150ms no blur
- **Onde:** components/VincularContatoBalcao.tsx:118

### INUI-52 Mensagem de "nenhum contato encontrado" só aparece após busca de fato ter sido feita
- **Onde:** components/VincularContatoBalcao.tsx:132-134

### INUI-53 Toggle de ativo/inativo é otimista com rollback em erro
- **Onde:** components/TelaTelefonesAutorizados.tsx:46-65

### INUI-54 Adicionar telefone exige valor não vazio, descrição é opcional
- **Onde:** components/TelaTelefonesAutorizados.tsx:67-87
- **Observação:** sem validação de formato do telefone digitado.

### INUI-55 Recarrega lista ao reativar a aba
- **Onde:** components/TelaTelefonesAutorizados.tsx:44

### INUI-56 Desativar telefone não apaga histórico
- **Onde:** components/TelaTelefonesAutorizados.tsx:95-96

---

## 8. Marketing → Conteúdo

### MKT-01 Assinatura do JWT de autenticação (claims exatas + TTL)
- **Onde:** lib/labonStatus.ts:20-42
- **Regra:** HS256, TTL de 60 segundos (só precisa sobreviver a 1 chamada HTTP), claims `role: 'authenticated'`, `tutor_phone`, `iat`, `exp`.

### MKT-02 Isolamento multi-tenant na fila compartilhada
- **Onde:** lib/labonStatus.ts:20, 76-86, 91-99
- **Regra:** `agent_slug: 'jsgrafica'` no body + `tutor_phone` na claim do JWT (é a claim, via RLS, quem de fato isola os dados por cliente do LabOnchain).

### MKT-03 Tratamento de erro do webhook: HTTP 200 pode ser falha de negócio
- **Onde:** lib/labonStatus.ts:88-106
- **Regra:** trata como erro tanto `!res.ok` quanto `json?.ok === false` mesmo com HTTP 200.

### MKT-04 5 ações possíveis no webhook compartilhado
- **Onde:** lib/labonStatus.ts:45
- **Regra:** `criar | listar | aprovar | editar | cancelar`.

### MKT-05 Validação de criação de post na API (POST)
- **Onde:** app/api/marketing/conteudo/route.ts:19-44
- **Regra:** `tipo_status` ∈ `text|image|video`, cada um exige seu campo correspondente.

### MKT-06 Validação de edição/aprovação/cancelamento (PATCH) delegada ao webhook
- **Onde:** app/api/marketing/conteudo/route.ts:46-63
- **Regra:** a checagem de transição de status permitida acontece no n8n, não nesta rota.

### MKT-07 GET lista todos os posts sem paginação/filtro
- **Onde:** app/api/marketing/conteudo/route.ts:10-17

### MKT-08 Estados possíveis de um post e seus rótulos visuais
- **Onde:** lib/labonStatus.ts:67; components/ModalPost.tsx:12-18
- **Regra:** pending, approved, published, cancelled, error.

### MKT-09 Regra de somente-leitura no modal (quais status travam edição)
- **Onde:** components/ModalPost.tsx:58
- **Regra:** só `pending`/`approved` são editáveis.

### MKT-10 Duplicar post (não é "reativar")
- **Onde:** components/ModalPost.tsx:55, 60-66, 163-167
- **Regra:** cria post NOVO via ação `criar`; o original continua cancelado.

### MKT-11 Cancelamento pede confirmação nativa do navegador
- **Onde:** components/ModalPost.tsx:138

### MKT-12 Validação client-side antes de salvar (criar ou editar)
- **Onde:** components/ModalPost.tsx:108-113, 116-117, 139-140
- **Regra:** aprovar/cancelar não passam por validação de conteúdo.

### MKT-13 Upload de arquivo — via URL assinada do Supabase Storage
- **Onde:** components/ModalPost.tsx:68-94
- **Observação:** reaproveita o bucket `inbox-media` do Inbox, não um bucket dedicado de Marketing.

### MKT-14 Montagem dos campos comuns do post
- **Onde:** components/ModalPost.tsx:96-106
- **Regra:** só os campos do tipo selecionado são preenchidos; os demais viram `null` explicitamente.

### MKT-15 Conversão de data/hora fixa em UTC-3 (Recife)
- **Onde:** components/ModalPost.tsx:20-30
- **Regra:** offset `-03:00` literal fixo (Brasil aboliu horário de verão em 2019).

### MKT-16 Canal WhatsApp Status: único funcional; Instagram desabilitado
- **Onde:** components/TelaMarketingConteudo.tsx:18, 142-149, 169-172; components/ModalPost.tsx:244-253
- **Regra:** bloqueio hardcoded incondicional, sem feature flag dinâmica.

### MKT-17 Visão "Quadro" desabilitada, sem mockup
- **Onde:** components/TelaMarketingConteudo.tsx:19, 156-159

### MKT-18 Polling silencioso complementar de 15 segundos
- **Onde:** components/TelaMarketingConteudo.tsx:80-98
- **Regra:** falha de rede é silenciosa; existe pra evitar que o Status publicado só aparecesse depois de trocar de aba e voltar.

### MKT-19 Clique em dia vazio do calendário pré-preenche data de novo post
- **Onde:** components/TelaMarketingConteudo.tsx:194-210

### MKT-20 Rótulo do post na célula do calendário: "✓ status" vs. hora
- **Onde:** components/TelaMarketingConteudo.tsx:206-209

### MKT-21 Visão "Como vai ficar": composição da fila e sequência
- **Onde:** components/TelaMarketingConteudo.tsx:264-269

### MKT-22 Formatação do card de status no preview "Como vai ficar"
- **Onde:** components/TelaMarketingConteudo.tsx:308-323

### MKT-23 Resumo textual do post por tipo
- **Onde:** components/TelaMarketingConteudo.tsx:31-35

### MKT-24 Limite de 1 post/hora na fila compartilhada — não codificado nestes arquivos
- **Onde:** não encontrado nos arquivos deste domínio
- **Observação:** se esse limite existe, está implementado no lado do workflow n8n (`LABON_STATUS`), fora do escopo deste levantamento.

---

## 9. PDV, Vendas, Dashboard

### PDV-01 Login de atendente sem senha, admin sempre com senha
- **Onde:** app/pdv/page.tsx:79-137

### PDV-02 Restauração de sessão via servidor
- **Onde:** app/pdv/page.tsx:399-408

### PDV-03 401 em qualquer rota derruba a sessão
- **Onde:** app/pdv/page.tsx:410-413

### PDV-04 Navegação agrupada e some sozinha se vazia
- **Onde:** app/pdv/page.tsx:26-45, 627-643

### PDV-05 Desconto pontual por item do carrinho
- **Onde:** app/pdv/page.tsx:49-72, 354-379
- **Regra:** decisão manual do operador, nunca regra automática — descartado explicitamente pelo Edvam.

### PDV-06 Resumo do dia e atalhos de mais vendidos
- **Onde:** app/pdv/page.tsx:381-397, 619-625

### PDV-07 Catálogo agrupado por categoria, com grupo virtual "Entrada Avulsa"
- **Onde:** app/pdv/page.tsx:422-436

### PDV-08 Adicionar produto ao carrinho via modal de quantidade
- **Onde:** app/pdv/page.tsx:444-462

### PDV-09 Atalho de "mais vendidos hoje" pula o modal de quantidade
- **Onde:** app/pdv/page.tsx:468-478

### PDV-10 Entrada avulsa exige valor > 0, descrição é opcional
- **Onde:** app/pdv/page.tsx:480-489, 918-944

### PDV-11 Confirmar venda de balcão exige carrinho não vazio e operador logado
- **Onde:** app/pdv/page.tsx:498-499

### PDV-12 Vínculo de cliente à venda: contato / retirada / anônimo
- **Onde:** app/pdv/page.tsx:504-512, 991-1002, 818-844
- **Regra:** venda anônima só é permitida com entrega imediata.

### PDV-13 "Vai buscar depois" exige nome do responsável pela retirada
- **Onde:** app/pdv/page.tsx:815-834, 848-850

### PDV-14 Gaveta de destino do dinheiro, obrigatória só para admin
- **Onde:** app/pdv/page.tsx:238-242, 777-797, 848-850, 557

### PDV-15 Forma de pagamento define confirmação imediata ou pendente
- **Onde:** app/pdv/page.tsx:518
- **Regra:** Dinheiro/Cartão nascem confirmados; Pix/"Paga na retirada" não.

### PDV-16 Status de entrega deriva de "já entregou agora?"
- **Onde:** app/pdv/page.tsx:519, 563, 799-813

### PDV-17 Captura opcional de qual forma será usada na retirada futura
- **Onde:** app/pdv/page.tsx:234-237, 524-528, 759-775

### PDV-18 Uma venda = múltiplos itens de pedido com o mesmo `vendaId`
- **Onde:** app/pdv/page.tsx:513, 530-566

### PDV-19 Falha ao gerar Pix não desfaz a venda já gravada
- **Onde:** app/pdv/page.tsx:570-594

### PDV-20 Confirmação manual de Pix estático (RecargaPay)
- **Onde:** app/pdv/page.tsx:267-289

### PDV-21 Venda mista confirma só a parte de recarga, item por item
- **Onde:** app/pdv/page.tsx:294-313

### PDV-22 Cancelar venda a partir da tela de QR Pix
- **Onde:** app/pdv/page.tsx:315-336
- **Regra:** não chama o Mercado Pago — QR não pago expira sozinho lá.

### PDV-23 Reset de estado após venda confirmada
- **Onde:** app/pdv/page.tsx:596-603

### VEN-01 GET soma vendas do dia agrupadas por produto
- **Onde:** app/api/vendas/route.ts:7-39

### VEN-02 POST — venda avulsa (sem produto de catálogo)
- **Onde:** app/api/vendas/route.ts:46-57

### VEN-03 POST — venda de produto de catálogo, com baixa de estoque condicional
- **Onde:** app/api/vendas/route.ts:58-88
- **Observação:** rota descrita como legada — vendas de balcão hoje passam por `/api/pedidos` (PDV-18); não confirmado se esta rota ainda tem chamador real.

### DASH-01 Período de agregação: presets ou intervalo customizado
- **Onde:** app/api/dashboard/route.ts:81-97

### DASH-02 Todas as datas ancoradas no fuso de Recife
- **Onde:** app/api/dashboard/route.ts:7-18

### DASH-03 Filtro de operador aplicado a 4 tabelas via campos já existentes
- **Onde:** app/api/dashboard/route.ts:74-79, 120-138, 152-153, 190-193, 264, 274

### DASH-04 `data_dia` é texto "DD-MM-AA" — filtro de período feito em memória
- **Onde:** app/api/dashboard/route.ts:99-110

### DASH-05 Paginação para contornar limite de 1000 linhas do Supabase
- **Onde:** app/api/dashboard/route.ts:20-50
- **Regra:** até 30 páginas de 1000 (trava de 30.000 linhas).

### DASH-06 Entrada de pedido conta por pagamento confirmado, não por entrega física
- **Onde:** app/api/dashboard/route.ts:126-134

### DASH-07 Linha "hoje ao vivo" é injetada quando o dia ainda não foi fechado
- **Onde:** app/api/dashboard/route.ts:168-185

### DASH-08 Top produtos combina duas fontes sem risco de contagem dupla
- **Onde:** app/api/dashboard/route.ts:195-211
- **Regra:** vendas legado + pedidos, nunca há sobreposição (uma parou quando a outra começou).

### DASH-09 Entradas por forma de pagamento: formas conhecidas vs. "Não informado"
- **Onde:** app/api/dashboard/route.ts:222-239

### DASH-10 Contagem de "itens vendidos" é por linha, não por carrinho
- **Onde:** app/api/dashboard/route.ts:328-331

### DASH-11 "Saúde do caixa" — pendências e estornos escopados ao período, mas divergência recente sempre atual
- **Onde:** app/api/dashboard/route.ts:250-292
- **Regra:** últimos 7 fechamentos com divergência são sempre os mais recentes, independente do período selecionado na tela.

### DASH-12 Dias "esquecidos de fechar" excluem hoje de propósito
- **Onde:** app/api/dashboard/route.ts:294-309

### DASH-13 Agrupamento semanal começa na segunda-feira
- **Onde:** app/api/dashboard/route.ts:53-66

### DASH-14 "Top dias" e "melhor dia" só consideram dias com entrada > 0
- **Onde:** app/api/dashboard/route.ts:243-245, 318

---

## 10. Admin — Casca/Navegação

### ADM-01 Login do Admin validado no servidor
- **Onde:** app/page.tsx:222-244

### ADM-02 Tela de login exibe aviso de sessão expirada
- **Onde:** app/page.tsx:213, 254-258

### ADM-03 Restauração de sessão via cookie no carregamento
- **Onde:** app/page.tsx:2695-2701

### ADM-04 Tela em branco enquanto verifica sessão
- **Onde:** app/page.tsx:2804

### ADM-05 Gate de autenticação para renderizar a casca
- **Onde:** app/page.tsx:2806-2811

### ADM-06 Deslogar automaticamente em qualquer 401
- **Onde:** app/page.tsx:2703-2706

### ADM-07 Logout
- **Onde:** app/page.tsx:2832-2837
- **Regra:** limpa estado local mesmo se a chamada de servidor falhar.

### ADM-08 Lista de abas e quais são exclusivas de Admin
- **Onde:** app/page.tsx:2738-2781
- **Regra:** só `pdv` não é exclusiva de Admin.
- **Observação:** a aba `contas` (`TelaContasBancarias`) é código órfão — removida do menu na demanda 085 mas ainda existe no código, inacessível pela navegação normal.

### ADM-09 Filtro de abas visíveis por papel
- **Onde:** app/page.tsx:2783
- **Regra:** abas `soAdmin` só aparecem para `papel === 'admin'`.

### ADM-10 Agrupamento de navegação em 2 fileiras (grupos → abas)
- **Onde:** app/page.tsx:29-38, 2788-2790
- **Regra:** 5 grupos fixos (Atendimento, Vendas, Financeiro, Marketing, Configurações).

### ADM-11 Grupo ativo é derivado da aba atual, nunca é estado próprio
- **Onde:** app/page.tsx:2792-2796
- **Regra:** decisão deliberada pra não manter 2 estados sincronizados.

### ADM-12 Clique num grupo de navegação: pula para a 1ª aba do grupo
- **Onde:** app/page.tsx:2798-2802

### ADM-13 Abas ficam montadas permanentemente após a 1ª visita (nunca desmontam)
- **Onde:** app/page.tsx:2651-2656, 2896-2922
- **Observação:** correção de bug real (~25s de travamento no Inbox por desmontagem/remontagem).

### ADM-14 Header exibe nome do dia + nome da aba atual do fechamento
- **Onde:** app/page.tsx:2708-2718, 2735, 2820

### ADM-15 Banner de conversas escaladas — visibilidade restrita a admin e polling
- **Onde:** app/page.tsx:2678-2690, 2720-2733, 2847-2855
- **Regra:** polling de 25s + refetch no foco, só para papel admin.

### ADM-16 Atalhos de navegação cruzada entre abas (Clientes → Inbox / Clientes → Pedidos)
- **Onde:** app/page.tsx:2658-2670

### ADM-17 Header sempre mostra papel do operador logado
- **Onde:** app/page.tsx:2824-2831

### ADM-18 Layout do conteúdo da aba "config" é um caso especial (2 telas empilhadas)
- **Onde:** app/page.tsx:2910-2916

---

## 11. Camada de Dados (lib/supabase-admin.ts, lib/supabase.ts)

### CORE-01 Dois clientes Supabase, dois privilégios
- **Onde:** lib/supabase.ts:1-10; lib/supabase-admin.ts:6-13, 61-64
- **Regra:** `supabase` (anon, RLS aplicada, client-side) vs `supabaseAdmin` (service_role, ignora RLS, só server-side).

### CORE-02 Retry automático só em escrita, nunca em leitura idempotente
- **Onde:** lib/supabase-admin.ts:15-64
- **Regra:** GET/HEAD/OPTIONS delegam ao retry nativo da lib; POST/PATCH/PUT/DELETE ganham até 2 tentativas extras (300ms/800ms), só reagindo a exceção de rede antes de qualquer resposta — nunca reenvia escrita que já recebeu resposta HTTP.

### CORE-03 Horário de Recife forçado independente do fuso do servidor
- **Onde:** lib/supabase.ts:12-34
- **Regra:** via `Intl.DateTimeFormat`, porque o servidor (Vercel) roda em UTC.

### CORE-04 Conversão de timestamptz real para "dia-caixa" textual
- **Onde:** lib/supabase.ts:36-47

### CORE-05 Limites UTC de um dia-caixa para filtro direto no Postgres
- **Onde:** lib/supabase.ts:49-64
- **Regra:** assume Recife UTC-3 fixo, sem horário de verão.

### CORE-06 `data_dia` é texto, nunca ordenar/filtrar direto no Postgres
- **Onde:** lib/supabase.ts:66-85
- **Regra:** dia vem antes do mês/ano na string — comparação de texto quebra ao cruzar meses; sempre converter pra Date primeiro.

### CORE-07 Fechamento "geral" vs. "por operador" — filtro por exclusão
- **Onde:** lib/supabase-admin.ts:66-93
- **Regra:** "geral" é qualquer `fechado_por` que NÃO seja nome de operador conhecido (não uma lista fixa de valores "gerais") — evita quebrar linhas históricas com `fechado_por IS NULL` ou `'import'`.

### CORE-08 Saldo anterior — busca o fechamento geral mais recente antes de uma data
- **Onde:** lib/supabase-admin.ts:95-119

### CORE-09 Selo "fechado hoje" e histórico
- **Onde:** lib/supabase-admin.ts:121-160

### CORE-10 Fechamentos por operador hoje — valor real contado, não o esperado
- **Onde:** lib/supabase-admin.ts:162-188

### CORE-11 Resumo do dia: soma de entradas por 5 fontes distintas
- **Onde:** lib/supabase-admin.ts:190-254
- **Regra:** vendas legado + pedidos pagos + transferências + entradas avulsas, todas com fallback `Number(...) || 0`.

### CORE-12 Abertura de caixa por operador — 1 linha por dia por pessoa
- **Onde:** lib/supabase-admin.ts:256-281
- **Regra:** constraint `unique(data_dia, operador)`.

### CORE-13 Esperado do operador só conta dinheiro físico, não o total geral
- **Onde:** lib/supabase-admin.ts:283-353
- **Regra:** só Zu/Gabi têm gaveta física própria mapeada; a gaveta de DESTINO manda quando existe (venda em Dinheiro feita por quem não tem gaveta, ex. Edvam, escolhe pra qual gaveta o físico foi).

### CORE-14 Funcionalidade removida: pendências entre contas
- **Onde:** lib/supabase-admin.ts:355-364
- **Regra:** função removida por completo na demanda 218 — premissa não batia com a operação real.

### CORE-15 Repasse automático de custo na venda — múltiplas travas de exclusão
- **Onde:** lib/supabase-admin.ts:366-476 (mesma lógica de PED-73)

### CORE-16 Cancelar pedido — trava contra cancelamento duplo e reversão de saída
- **Onde:** lib/supabase-admin.ts:478-524
- **Regra:** `if (status === 'cancelado') throw` explícito; nulifica referência ANTES de apagar a saída (ordem obrigatória pela FK).

### CORE-17 Discriminação por forma de pagamento com taxa da conta padrão
- **Onde:** lib/supabase-admin.ts:526-597

### CORE-18 Rascunho de mensagem de pedido — acumula em vez de sobrescrever
- **Onde:** lib/supabase-admin.ts:599-628
- **Regra:** mensagens automáticas de pedido nunca vão direto ao cliente (incidente real motivou isso) — vão pra caixa de resposta, equipe decide.

### CORE-19 Contas a pagar/receber — "atrasado" calculado na leitura, nunca gravado
- **Onde:** lib/supabase-admin.ts:630-702

### CORE-20 Editar/cancelar conta — bloqueado depois de paga
- **Onde:** lib/supabase-admin.ts:704-756
- **Regra:** cancelar é DELETE real, não status — vazaria em filtros que assumem `status !== 'pago'`.

### CORE-21 Próximo vencimento de recorrência — mensal vs. semanal
- **Onde:** lib/supabase-admin.ts:758-779

### CORE-22 Baixa de conta a pagar/receber — detecção de saída duplicada, aviso não bloqueio
- **Onde:** lib/supabase-admin.ts:781-936 (mesma lógica de FIN-33/34/35)

### CORE-23 Reparo de nome de contato inválido — normalização Unicode agressiva
- **Onde:** lib/supabase-admin.ts:938-981
- **Regra:** só age se TODAS as linhas duplicadas do telefone tiverem nome inválido; nome estilizado Unicode (ex. fonte matemática) é considerado válido, só fillers/marcas de iteração específicas são tratados como inválidos.

### CORE-24 Busca de contato — telefone vs. nome, e parser PostgREST
- **Onde:** lib/supabase-admin.ts:983-1023
- **Regra:** texto que parece telefone busca só por `phone` (evita quebrar o parser do PostgREST com parênteses no meio do `.or()`).

### CORE-25 Pix RecargaPay — payload estático, sem valor
- **Onde:** lib/supabase-admin.ts:1025-1047
- **Regra:** confirmação sempre manual (RecargaPay não tem API).

### CORE-26 Registro de falha de cobrança Pix — nunca derruba o fluxo principal
- **Onde:** lib/supabase-admin.ts:1049-1087
- **Regra:** truncado em 1000 caracteres; se a própria persistência de auditoria falhar, só loga (perda aceitável).

### CORE-27 Identificar produtos de recarga em lote
- **Onde:** lib/supabase-admin.ts:1089-1099

### CORE-28 Criação de saída — validação de conta e cálculo especial de recarga VEM
- **Onde:** lib/supabase-admin.ts:1101-1165 (mesma lógica de FIN-20/21)

### CORE-29 Criação de transferência — trava origem≠destino e gaveta física do operador
- **Onde:** lib/supabase-admin.ts:1167-1215 (mesma lógica de FIN-37)

### CORE-30 Entrada avulsa — única origem: classificação de pendência de conciliação
- **Onde:** lib/supabase-admin.ts:1217-1245

### CORE-31 Recálculo de fechamento "Sistema" — delta exato, nunca recálculo do dia inteiro
- **Onde:** lib/supabase-admin.ts:1247-1314 (mesma lógica de FIN-47/48)

### CORE-32 Prévia de recálculo — cascata pela ORDEM real dos fechamentos, não por calendário
- **Onde:** lib/supabase-admin.ts:1316-1388

### CORE-33 Aplicar recálculo — reconfere delta fresco antes de cada UPDATE, para na primeira divergência
- **Onde:** lib/supabase-admin.ts:1390-1470 (mesma lógica de FIN-49)

---

## 12. Padrões recorrentes observados

Isto é uma síntese observacional — só nomeia padrões que se repetem em várias decisões acima,
sem propor nada novo. Útil como checklist de "formas de decisão" a considerar ao desenhar o
sistema da Dizu, não como lista de features a copiar.

1. **Valor/preço nunca é aceito de quem chama, sempre recalculado da fonte real.** PED-01/02,
   PED-33/35, PIX-07/09, INBK-22. Vale tanto pra IA quanto pra requisição HTTP comum — a ferramenta
   de negócio nunca confia em número que já apareceu na conversa/tela antes.
2. **Mensagem automática vira rascunho, nunca é enviada sozinha ao cliente.** PED-03/04/05/06,
   INBK-10/21/22, CORE-18. É convenção do produto (CLAUDE.md), não limitação técnica — decisão
   de risco reputacional (WhatsApp), reforçada depois de pelo menos 1 incidente real.
3. **Fuso horário de Recife é sempre forçado explicitamente, nunca herdado do servidor.** CORE-03,
   DASH-02, PED-47/64, MKT-15. O servidor roda em UTC (Vercel); qualquer cálculo de "hoje"/"dia"
   sem essa correção erra perto da meia-noite local.
4. **Campo de data operacional ("dia de caixa") é texto formatado, nunca comparado como texto.**
   CORE-04/05/06. Todo lugar que precisa filtrar por período converte pra `Date` real primeiro.
5. **Idempotência por trava de estado no WHERE do UPDATE, não por lock explícito.** PED-19,
   PIX-09/10, FIN-49. Ex.: `.eq('pagamento_confirmado', false)` garante que um segundo evento
   concorrente não tenha efeito, sem precisar de lock de banco.
6. **Cancelamento de item já cancelado é erro explícito, não no-op silencioso.** PED-51 (CORE-16).
   Mesmo padrão em Contas a Pagar/Receber (CORE-20) — falha alto e cedo em vez de mascarar.
7. **Reversão de vínculo antes de apagar, nunca depois** (ordem importa por causa de FK sem
   `ON DELETE`). PED-52/CORE-16, FIN-24.
8. **DELETE real (hard-delete) é escolha deliberada quando o registro nunca teve consequência
   financeira materializada; soft-delete (`ativo`/`arquivado`) quando precisa manter histórico
   auditável.** Contas a Pagar/Receber pendente → DELETE (CORE-20); Saída/Entrada avulsa → DELETE
   (FIN-24/28); telefone autorizado → soft-delete (INBK-44); pedido → soft-status `cancelado`,
   nunca apagado.
9. **Toda automação/exclusão financeira documenta o "porquê" no código com referência a um
   incidente real (número de demanda, valor, data).** Praticamente todo `Observação` acima cita
   um caso concreto que motivou a regra — nenhuma trava nasceu de precaução abstrata.
10. **Aviso não é bloqueio.** FEC-09 (dia fechado), PED-67 (cancelar pedido pago com dia fechado),
    FIN-33 (saída duplicada candidata) — o sistema mostra o risco e deixa o humano decidir, em vez
    de travar a ação.
11. **Nada é "automático" sem ferramenta determinística por trás, mesmo quando IA está envolvida
    na conversa.** Confirmado explicitamente no contrato do agente Caminho C (fora deste
    documento, ver `caminho-c-contrato-das-ferramentas.md`) e replicado aqui em toda função de
    preço/pagamento/pedido.
12. **Multi-tenant por claim de JWT, não por parâmetro solto.** MKT-01/02 — o campo que aparece no
    corpo da requisição (`agent_slug`) é só rótulo; quem de fato isola os dados é a claim assinada
    dentro do token, validada do lado do banco compartilhado.
13. **Fallback textual em vez de erro/vazio, sempre que o dado "bonito" não existe.** CLI-01/40,
    INBK-40, CLI-30 ("Contato privado", "—", rótulo genérico por status desconhecido) — a tela
    nunca quebra por falta de dado, sempre tem um texto de fallback definido.
14. **Debounce como padrão default em toda busca/campo calculado, não só otimização.** CLI-32,
    INUI-15/46, MKT-18 — presente em quase toda interação de digitação.
15. **Correção auditável em vez de sobrescrita silenciosa, quando o dado já teve consequência
    financeira.** PED-48/72 (forma de pagamento), FIN-22 (conta de origem de saída) — sempre grava
    um histórico `{em, operador, de, para}` em vez de só trocar o valor.

---

## 13. Cobertura e limitações

- **Escopo coberto:** todo o código do `caixa-js-grafica` em `app/`, `components/`, `lib/`
  (exceto `app/api/sheets`, pasta vazia sem arquivos — achado incidental, provável resíduo da
  migração Sheets→Supabase já concluída).
- **Fora de escopo deste levantamento:**
  - Os workflows n8n (roteamento de WhatsApp, o agente Caminho C e suas ferramentas) — decisão de
    negócio real, mas vive fora deste repositório. Documentado à parte em
    `pm/conhecimento/caminho-c-contrato-das-ferramentas.md` e `pm/conhecimento/mapa-workflows-n8n.md`.
  - `site-v2/` (site público novo da JS Gráfica, catálogo/vitrine) — projeto separado, não é
    sistema de atendimento/pedido.
  - Migrations SQL / schema do Supabase diretamente (RLS, constraints, triggers) — várias decisões
    acima citam comportamento de tabela inferido do código que a usa, não confirmado lendo o SQL
    da migration em si.
- **Itens marcados como "não confirmado" dentro das seções acima** (ex. FEC-03, FEC-10, INBK-42,
  INUI-50, VEN-03) apontam pra função ou arquivo fora do escopo desta varredura pontual — quem for
  usar esse mapa pra decisão de arquitetura deve reconferir esses pontos específicos antes de
  assumir o comportamento descrito como definitivo.
- Este documento reflete o código **em 2026-08-28**. Qualquer demanda nova no `caixa-js-grafica`
  depois desta data pode ter alterado alguma das regras aqui — tratar como fotografia, não como
  fonte viva.
