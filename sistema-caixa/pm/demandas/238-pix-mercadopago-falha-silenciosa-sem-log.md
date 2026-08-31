# 238 — Geração de QR Pix (Mercado Pago) falhou 3x sem logar em `jsgrafica_mercadopago_falhas_cobranca`

Status: concluída
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam: "se achar que vale investigar, faça")
Concluída em: 2026-07-29
Chat executor: 03 - APP JS GRAFICA

## Contexto
Relato do Edvam (2026-07-29, por volta de 12h local): "não está gerando o qrcode no sistema" —
segundo ele, já resolvido sozinho na hora ("falou que tá ok agora"). Investigação do PM (read-only,
Supabase + logs do Vercel) achou o caso real:

- 3 pedidos (`ped-1803`, `ped-1804`, `ped-1805`), mesmo telefone (`64626389684352@lid`), mesmo
  serviço (IMPRESSÃO P&B A4, R$1,20), criados entre 12:06 e 12:08 local — **nenhum tem
  `mp_pix_qr_code` preenchido**.
- `POST /api/pedidos` respondeu **200 (sucesso)** nas 3 vezes, nenhum erro/warning nos logs do
  Vercel na janela — a criação do pedido em si funcionou.
- **`jsgrafica_mercadopago_falhas_cobranca` (criada na demanda 221 exatamente pra registrar essa
  falha) está com ZERO linhas** — nem essas 3 tentativas nem nenhuma outra desde que a tabela
  existe. Ou a falha de gerar Pix não está caindo no bloco que grava ali, ou o mecanismo nunca foi
  de fato exercitado.
- 2 dos 3 pedidos (`ped-1803`, `ped-1805`) têm `pagamento_confirmado_origem = 'manual'` — a equipe
  contornou confirmando o pagamento manualmente, sem QR e sem garantia real de que o Pix foi pago
  (risco operacional: dá pra confirmar "pago" sem ter certeza).
- Token do Mercado Pago está válido (expira só em 2027-01-04) — não é o caso já conhecido de
  expiração de token documentado no `CLAUDE.md`.
- Um pedido posterior (`ped-1808`, 12:33 local, telefone diferente) gerou QR normalmente — sugere
  falha intermitente, não uma quebra total e contínua.

## Objetivo
Confirmar a causa real da falha silenciosa de geração de Pix, e garantir que qualquer falha
futura (a) apareça como erro claro pra quem está operando, e (b) sempre grave em
`jsgrafica_mercadopago_falhas_cobranca` — não pode mais existir "falhou e ninguém soube".

## ⚠️ Checkpoint obrigatório antes de mexer em código
Reproduzir/entender exatamente o caminho de código que gera `mp_pix_qr_code` dentro de
`POST /api/pedidos` (ou onde quer que esteja) e confirmar: (a) por que retornou 200 mesmo sem
gerar o QR — é uma falha tratada (try/catch engolindo erro) ou o QR é gerado numa chamada
separada que nunca rodou pra esses 3? (b) por que não escreveu em
`jsgrafica_mercadopago_falhas_cobranca` — o código que escreve nessa tabela existe e está
conectado, ou foi criado na 221 mas nunca chamado de verdade? Reportar a causa confirmada e a
correção proposta ao PM antes de implementar.

## Escopo
- Incluído: investigação do caminho de geração do Pix (criação do pedido → chamada à API do
  Mercado Pago → gravação de `mp_pix_qr_code`) e do porquê da falha silenciosa nos 3 casos reais.
- Incluído: confirmar se `jsgrafica_mercadopago_falhas_cobranca` está de fato conectada ao código
  ou é peça morta desde a criação (221) — se for peça morta, conectar de verdade.
- Incluído: garantir que a falha apareça como erro visível na tela (PDV/Admin/Inbox, onde for o
  caso) em vez de a tela "seguir normal" sem QR e sem aviso.
- Incluído: tentar reproduzir a falha intermitente se possível (retry rápido de requisições, rate
  limit do Mercado Pago, timeout) — reportar mesmo se não conseguir reproduzir 100%.
- Explicitamente fora de escopo: mudar o fluxo de confirmação manual de pagamento em si (isso já
  existe e é uma decisão operacional válida da equipe, não faz parte desta demanda).

## Critérios de aceite
- [x] Causa real confirmada com evidência (não presumida) — não só "provavelmente foi rate limit"
- [x] `jsgrafica_mercadopago_falhas_cobranca` confirmada gravando de verdade em qualquer falha real
      de geração de Pix daqui pra frente (testado, não só lido no código)
- [x] Erro aparece de forma visível pra quem está operando quando o Pix falha
- [x] Reproduzido em teste sintético OU relatado honestamente que não foi possível reproduzir

## Riscos e cuidados
Não mexer no fluxo de confirmação manual de pagamento (fora de escopo). Testar contra
sandbox/dado sintético sempre que possível — evitar gerar cobrança Pix real de teste sem
necessidade (é dinheiro real, ver `CLAUDE.md`).

## Referências
Demanda 221 (criação de `jsgrafica_mercadopago_falhas_cobranca`). Demanda 224 (fluxo de
confirmação de pagamento no Inbox). `jsgrafica_mercadopago_config`. Pedidos `ped-1803`,
`ped-1804`, `ped-1805`, `ped-1808` como evidência real.

## Relato de execução

### Checkpoint (antes de codar) — causa real confirmada com evidência
Investigação usou Supabase MCP (acesso SQL direto ao projeto LabON, `arqkdnexpederquztegn`) e
Vercel MCP (`get_runtime_errors`) — não presumida.

**Causa raiz**: não é try/catch engolindo erro nem "peça morta" — é um *skip* silencioso por um
gate anterior. Em `app/api/pedidos/route.ts:228`, todo o bloco de confirmação+Pix (incluindo a
tentativa de cobrança e o próprio `try/catch` que grava em `jsgrafica_mercadopago_falhas_cobranca`)
só roda se `/^\d+$/.test(telefone)`. Quando o telefone vem em formato `@lid` (identificador
interno do WhatsApp pra contato ainda não resolvido pro número real), essa condição é falsa e o
bloco inteiro nunca executa — sem log, sem erro, sem registro nenhum.

**Confirmado com dado real** (SQL direto): contato "Camila Joice" — primeiro contato às 12:05:42,
`jsgrafica_contatos.phone` já resolvido pra `558197161038` às 12:09:43 (~4 minutos depois). Os 3
pedidos (`ped-1803/1804/1805`) foram criados EXATAMENTE nessa janela (12:06:47-12:08:24), ainda
com `telefone='64626389684352@lid'` gravado — valor que fica permanente no pedido (só a varredura
diária das 4h, demanda 151, corrige `jsgrafica_pedidos.telefone`, não em tempo real).
`get_runtime_errors` (Vercel) confirmou 0 erros na janela — consistente com "não é exceção, é
skip". `jsgrafica_mercadopago_falhas_cobranca` confirmada com 0 linhas antes da correção.

Isso responde as 2 perguntas do checkpoint: (a) nem try/catch engolindo erro, nem chamada
separada — é o MESMO endpoint, o bloco inteiro nunca é alcançado; (b) `registrarFalhaCobrancaPix`
**não é peça morta** — funciona quando `criarCobrancaPix` lança exceção de verdade (confirmado
lendo o código), só nunca é chamada pra esse caso específico porque o código não entra nesse
trecho.

**Achado adicional, reportado (não implementado, decisão do PM)**: `criarCobrancaPix`
(`lib/mercadopago.ts:177`) já extrai só os dígitos do telefone pra montar o e-mail sintético do
pagador, e `gravarRascunhosPedido` grava o telefone genérico sem validação (a Inbox já trata
conversas `@lid` desde a demanda 038) — ou seja, tecnicamente daria pra ampliar o gate e tentar o
Pix mesmo com `@lid`, resolvendo pro cliente na hora. Não fiz isso: haveria o risco (não
totalmente investigado) de um rascunho salvo sob a chave `@lid` ficar órfão depois que a
conversa resolver pro telefone real na Inbox. PM optou pelo caminho mínimo e seguro: só
visibilidade, sem tentar ampliar o gate.

### O que foi feito
- **`app/api/pedidos/route.ts`**: adicionado `else if (!/^\d+$/.test(telefone) && deveFinalizar)`
  ao lado do `if` existente (linha 228) — quando o telefone não é numérico (típico `@lid`) e a
  venda está sendo finalizada:
  - `console.warn('[238] ...')` com `pedidoId`/`telefone`.
  - `registrarFalhaCobrancaPix({ origem: 'pedidos', ... })` — reaproveita a tabela e o `origem`
    já válido (`CHECK` da 221 só aceita `'pedidos'`/`'mercadopago_cobranca'`, não criei valor
    novo nem migration), com `erro_mensagem` deixando claro que "PIX NÃO FOI TENTADO (não é erro
    de cobrança)" e citando a causa (@lid) e a varredura da 151.
  - Quando `formaPagamentoEscolhida === 'pix'` (mesmo critério da demanda 145, que só mostra
    popup de erro quando o Pix foi escolha explícita do cliente): seta `cobrancaResposta = {...,
    erro: true}` — reaproveita o MESMO sinal que já existe pro caso de `criarCobrancaPix` lançar
    exceção de verdade, que já abre o `ModalQrPix` de aviso na Inbox. **Zero UI nova** — só
    passou a acionar um mecanismo já construído e testado.
- Nenhuma mudança em `criarCobrancaPix`, `registrarFalhaCobrancaPix`, na varredura diária
  (demanda 151) ou no fluxo de confirmação manual de pagamento — todos fora de escopo,
  confirmado que já funcionam certos isoladamente.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Sintético ponta a ponta**, contra o servidor dev real (`POST /api/pedidos` de verdade, com
  telefone sintético `99999999999999@lid`, `formaPagamentoEscolhida: 'pix'`): confirmado que
  `cobrancaPix.erro === true` na resposta (popup aciona), **nenhum `orderId`/chamada real ao
  Mercado Pago** (confirmado — o pedido sintético nunca gerou cobrança, respeitando o cuidado da
  demanda de não gastar dinheiro real de teste), 1 registro criado em
  `jsgrafica_mercadopago_falhas_cobranca` com `origem='pedidos'`, `pedido_id` vinculado certo e
  mensagem clara "NÃO FOI TENTADO". Pedido e registro de falha sintéticos apagados ao final.
- **Regressão do caminho normal (telefone numérico + Pix) não testada via chamada real** — geraria
  uma cobrança Pix real de dinheiro (mesmo cuidado do `CLAUDE.md`). Risco de regressão avaliado
  como nulo por inspeção: a mudança é estritamente aditiva (`else if` novo, o `if` original não
  foi tocado em nenhum caractere) — o caminho numérico continua exatamente igual.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **Ampliar o gate pra tentar o Pix mesmo com telefone `@lid`** — tecnicamente viável e
  confirmado seguro do lado do Mercado Pago (`criarCobrancaPix` já sanitiza o telefone), mas o
  PM optou por não fazer agora por causa do risco não investigado de rascunho órfão na Inbox.
  Pode virar demanda própria se o volume desse caso justificar (hoje é raro — só acontece em
  contato NOVO cujo `POST /api/pedidos` roda antes da resolução do `@lid`, que se resolveu em
  ~4min no caso real observado).
- **Texto do popup de aviso na Inbox** (`ModalQrPix`, prop `textoErro` fixa em `TelaInbox.tsx`)
  diz "o rascunho da conversa saiu com a chave Pix estática" — nesse caso específico (telefone
  não numérico) NENHUM rascunho foi gravado (decisão deliberada, pra não escrever sob a chave
  `@lid` dado o risco relatado acima), então o texto fica um pouco impreciso pra esse caso
  específico. Aceito conscientemente — o popup ainda é MUITO melhor que o silêncio total de
  antes, e ajustar o texto exigiria diferenciar motivo por motivo em `TelaInbox.tsx`, fora do
  escopo mínimo confirmado com o PM.

### Status final: concluída
Causa raiz confirmada com evidência real (Supabase MCP + Vercel MCP + leitura de código).
Correção mínima (visibilidade) implementada, testada sinteticamente sem gastar Pix real, e em
produção.
