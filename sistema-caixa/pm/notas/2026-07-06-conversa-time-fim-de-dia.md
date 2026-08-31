# Conversa com o time (Zu/Gabi/Edvam) — fim do dia, 2026-07-06

Primeiro dia de operação real do novo sistema de Pedidos. Resumo organizado do que mudou, do que
ainda vai mudar, e do que precisa da opinião do time antes de construir.

---

## 1. O que já está no ar hoje (pode perguntar como foi usar)

- **Aba "Pedidos" nova no PDV** (Zu e Gabi já têm acesso) — pergunta: foi fácil de achar/usar?
- **Status "Aguardando retirada"** — pra quando o pedido tá pronto mas o cliente ainda não veio
  buscar (ex.: livro deixado pra xerox). Pergunta: o nome/fluxo faz sentido no dia a dia?
- **Confirmação de pagamento ao entregar** — se um pedido com Pix obrigatório ainda não foi pago,
  aparece um aviso antes de marcar como entregue. Pergunta: incomodou, ou ajudou a não esquecer?
- **Venda de balcão agora pergunta forma de pagamento e se já entregou na hora.** Pergunta: o
  fluxo ficou mais lento ou continua rápido?

## 2. Mudança que vai acontecer ESTA NOITE (avisar o time antes de sair)

**As mensagens automáticas de pedido vão parar de mandar direto pro cliente.** Hoje, quando
alguém cria um pedido ou avança o status (em produção → pronto), o sistema manda a mensagem
sozinho pro WhatsApp do cliente. A partir de hoje à noite, isso muda: o texto vai aparecer **pronto
na caixa de resposta** da conversa, e a equipe decide se edita e manda — não vai mais sair
sozinho. **Importante avisar a Gabi e a Zu**: ao abrir uma conversa que tem pedido pendente, vai
aparecer uma mensagem pronta esperando pra ser enviada — é assim que deve ser, não é erro.

## 3. Perguntas em aberto que precisam da opinião do time (não decidir sozinho)

- **"Melhorar o filtro e a leitura dos dados de caixa"** — Edvam falou que quer melhorar isso,
  mas ainda não tem um exemplo concreto. Vale perguntar pro time: o que hoje é difícil de achar
  ou entender no Dashboard/Movimento/Fechamento? (filtrar por pessoa? por forma de pagamento?
  por período? outra coisa?)
- **Abertura de caixa diária por pessoa** (novo, ainda não construído): a ideia é Gabi, Zu e
  Edvam contarem o próprio dinheiro (cédulas e moedas) na abertura e no fechamento do dia, cada
  um no seu caixa. Vale perguntar: isso é viável na rotina de vocês? Trava a abertura da loja?

## 4. Ideias futuras (não é pra agora, só pra já ir pensando)

- **Quiosque de autoatendimento** pra consultas (2ª via de conta de luz, IPVA, DETRAN, gov.br) —
  cliente faz sozinho num tablet, paga a taxa de serviço via Pix na tela, sem precisar de
  atendente. Vale perguntar pro time: no dia a dia, quais desses serviços dão mais trabalho /
  mais gente pede? Isso ajuda a decidir por onde começar quando chegar a hora.

---

## Achados técnicos do dia (não precisa levar pro time, só registro)

- Corrigido bug de mensagem duplicada no Inbox (ID errado usado pro log).
- Corrigido: alguns produtos exigiam Pix antecipado por engano (ex.: lápis, consultas de CPF) —
  só "Serviço terceirizado" (banner/adesivo) exige Pix antecipado agora, como definido com Edvam.
- Detalhe técnico completo de tudo isso em `pm/demandas/STATUS.md`.
