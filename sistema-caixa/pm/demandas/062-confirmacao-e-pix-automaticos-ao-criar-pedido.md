# 062 — Confirmação e Pix automáticos ao criar pedido (Inbox)

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Gap real identificado com o Edvam: hoje, quando o atendente clica "Criar pedido" no Inbox
(demanda 045), **o cliente não recebe nenhuma mensagem automática** — só é avisado depois,
quando o status muda pra "Em produção"/"Pronto" (demanda 046). Falta o pedaço do meio: confirmar
o pedido com valor, e mandar o Pix na hora se o produto exigir pagamento antes de produzir.

O texto e a lógica pra isso **já existem**, escritos pro bot antigo `06-PEDIDOS` (hoje desligado,
nós "MONTAR CONFIRMACAO", "ENVIAR PIX CLIENTE", "AVISAR CLIENTE PEDIDO CRIADO") — nunca foram
conectados ao fluxo manual. É reaproveitar, não criar do zero.

## Objetivo
Ao confirmar "Criar pedido" (só pra pedido com telefone real, vindo do Inbox — não o balcão),
o cliente recebe automaticamente: resumo do pedido + valor, e o Pix (se o produto exigir) — sem
o atendente precisar digitar isso na mão.

## Escopo
- Incluído:
  1. Ao confirmar a criação do pedido (rota que a 045 já usa), disparar mensagem automática pro
     cliente com o resumo: nome do produto, specs relevantes, valor final. Reaproveitar o tom/
     formato do nó "MONTAR CONFIRMACAO" do `06-PEDIDOS` como referência de texto.
  2. Se `pagamento_tipo` do produto for `pre_producao` (Pix obrigatório antes de produzir) —
     incluir a chave Pix + titular + valor na mesma mensagem ou logo em seguida (reaproveitar o
     texto do nó "ENVIAR PIX CLIENTE"). Chave/titular já vêm de `jsgrafica_agent_config`, mesmo
     padrão já usado em outros lugares do sistema.
  3. Se não exigir Pix antecipado (paga na retirada) — mensagem só confirma o pedido e avisa "te
     aviso quando tiver pronto" (reaproveitar tom do nó "AVISAR CLIENTE PEDIDO CRIADO").
  4. Logar essa mensagem enviada do mesmo jeito que qualquer outra (reaproveitar
     `lib/inboxLog.ts`, já usado na 046) — não inventar caminho novo.
- Fora de escopo: pedido de balcão (demanda 054, sem telefone real na maioria dos casos, não
  faz sentido mandar mensagem); mudar o fluxo de avanço de status já existente (046).

## Critérios de aceite
- [ ] Criar pedido de produto com Pix obrigatório → cliente recebe confirmação + chave Pix na
      hora
- [ ] Criar pedido de produto sem Pix obrigatório → cliente recebe confirmação simples
- [ ] Mensagem aparece logada no Inbox como qualquer outra (mesmo padrão)
- [ ] Testado com pelo menos 1 produto de cada tipo de pagamento

## Riscos e cuidados
Reaproveitar texto/tom das mensagens do `06-PEDIDOS` em vez de escrever do zero — são as
mesmas mensagens que a equipe já veria se o bot estivesse ativo, só que agora disparadas pelo
clique do atendente em vez da IA decidir sozinha.

## Referências
Workflow `06 - JSGRAFICA | PEDIDOS` (nós "MONTAR CONFIRMACAO", "ENVIAR PIX CLIENTE", "AVISAR
CLIENTE PEDIDO CRIADO" — referência de texto, não reativar o workflow em si). Demanda 045
(fluxo de criar pedido a estender). Demanda 046 (padrão de mensagem automática + log,
`lib/inboxLog.ts`). Tabela `jsgrafica_agent_config` (chave Pix/titular).

## Relato de execução

### O que foi feito
- **`lib/pedidos.ts`**: nova função `montarMensagensConfirmacaoPedido()` — texto fixo por
  template (nada de `lib/gemini.ts`), adaptando o tom dos nós "MONTAR CONFIRMACAO"/"AVISAR
  CLIENTE PEDIDO CRIADO"/"ENVIAR PIX CLIENTE" do `06-PEDIDOS`. Devolve 1 mensagem (produto sem
  Pix obrigatório: confirmação + "te aviso quando pronto") ou 2 mensagens (produto com
  `pagamento_tipo = 'pre_producao'`: confirmação + mensagem separada com chave/titular/valor do
  Pix), na mesma ordem que o bot antigo mandaria.
- **`app/api/pedidos/route.ts`** (branch `produtoId`, o "Criar pedido" da demanda 045): depois de
  gravar o pedido, se o telefone for real (`/^\d+$/`, mesmo teste já usado no branch de status da
  046 — pedido de balcão nunca cai aqui, esse branch é exclusivo do fluxo via Inbox), busca
  chave/titular Pix em `jsgrafica_agent_config` (só quando precisa), monta as mensagens e manda
  via `enviarMensagem` + loga com `registrarMensagemEnviada` (mesmo padrão da 046). Falha de
  envio cai num `try/catch` que não desfaz o pedido já gravado (pedido criado é fato consumado,
  aviso é best-effort). Também passei a gravar `requer_comprovante`/`chave_pix` na linha do
  pedido quando exige Pix — faltava desde a demanda 045 (que deliberadamente não mandava nada, e
  por isso nunca precisou desses campos).

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Teste real de ponta a ponta** (mesmo padrão do resto da sessão — Z-API já conectado de
  verdade), usando o contato de teste real já estabelecido "Edvan Filho" (mesmo número usado e
  confirmado pelo Edvam nas demandas 045/046):
  - `POST /api/pedidos` com produto **sem** Pix obrigatório (`XEROX PRETO E BRANCO A4`,
    `pagamento_tipo: flexivel`) → 1 mensagem enviada e logada:
    *"Pedido confirmado! 😊\n\n🖨️ XEROX PRETO E BRANCO A4\n💰 R$ 0.45\n\nAssim que estiver pronto
    eu te aviso 😊"* — confirmado via `zaapId` real da Z-API e linha correspondente em
    `jsgrafica_log_msgs_privadas`.
  - `POST /api/pedidos` com produto **com** Pix obrigatório (`CONSULTA E 2ª VIA CONTA`,
    `pagamento_tipo: pre_producao`) → 2 mensagens enviadas e logadas, na ordem certa:
    confirmação ("...Assim que confirmarmos o pagamento, a gente começa a produção.") seguida da
    mensagem de Pix com a chave/titular reais (`81 98610-8547` / `Edvam de Oliveira e Silva`,
    vindos de `jsgrafica_agent_config`) e o valor certo (R$ 2,20).
  - Conferido no banco: `requer_comprovante: true` e `chave_pix` preenchido só no pedido com Pix;
    o outro ficou `false`/`null`, como esperado.
  - Pedidos de teste apagados do banco depois de confirmar (as mensagens do WhatsApp, por
    natureza, não têm como ser desfeitas — esperado, é exatamente o que o teste pedia).
- **Sobre "testado em produção"**: o teste acima já foi feito contra o Supabase e a instância
  Z-API reais (não há ambiente de staging separado pra esses serviços — local e produção
  compartilham o mesmo banco/gateway) — a mensagem chegou de verdade via Z-API real, então não
  repeti o mesmo envio de novo só pra bater na URL `admin.jsgrafica.site` em vez de localhost
  (evitar mandar mensagem de teste duplicada pro WhatsApp do Edvam sem necessidade). Depois do
  deploy, confirmei só que a rota responde (`GET /api/pedidos`, sem efeito colateral).
- **Não consigo confirmar visualmente a chegada no WhatsApp físico do Edvam** — isso só ele pode
  ver checando o celular, como já fez na demanda 046. O que confirmei é que a chamada à Z-API não
  retornou erro (voltou com `zaapId` real) e a mensagem foi persistida no log — mesma evidência
  aceita como suficiente na demanda 046.

### Achados fora do escopo
Notei que o log de mensagem enviada (`jsgrafica_log_msgs_privadas`) recebeu 2 linhas pra cada
mensagem enviada (uma da minha chamada explícita a `registrarMensagemEnviada`, outra
aparentemente do workflow n8n `02 - LOG MSG ENVIADAS`, que já loga automaticamente qualquer envio
via Z-API independente da origem). Não é uma regressão desta demanda — é o comportamento já
existente desde antes (mesmo padrão usado pela 037/046), só registrando pra constar. Não
investiguei/corrigi por ser fora do escopo (a demanda pedia só "logar do mesmo jeito que já é
feito").

### Status final
**Concluída e deployada** (`dpl_FD3SkJANGU6w1YvFCCorXbiy4BMz`). Testado de ponta a ponta com
Z-API real: 1 produto sem Pix e 1 produto com Pix, ambos confirmados enviados e logados
corretamente. Falta só a confirmação visual do Edvam olhando o WhatsApp físico (mesma etapa
final que ele mesmo fez na demanda 046).
