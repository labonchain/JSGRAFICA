# Investigação — Quiosque de autoatendimento pra consultas (Celpe, IPVA, DETRAN, gov.br...)

Data: 2026-07-06
Levantado por: Edvam, aprofundado pelo PM

## Ideia original
Tablet na gráfica onde clientes fazem sozinhos consultas que hoje dependem de um atendente
(2ª via de conta, IPVA, DETRAN, gov.br) — incluindo pagamento da taxa de serviço via Pix na
própria tela, sem precisar de equipe. Edvam deixou claro: **não é pra construir agora**, mas quer
que already seja pensado de forma funcional, com base no uso real dos clientes — não um
palpite.

## O que já existe hoje (catálogo `jsgrafica_produtos`, categoria "Consulta Online")
| Produto | Preço | Dados pedidos |
|---|---|---|
| CONSULTA E 2ª VIA CONTA (água/luz/internet/telefone) | R$2,20 | tipo_conta, cpf, nome_titular |
| CONSULTA CPF (SCPC/Serasa/cartórios/cheques) | R$25 | cpf |
| CONSULTA SERASA | R$18 | cpf |
| CADASTRO E B.O. | R$7 | — |
| CADASTRO/MATRÍCULA ESCOLAR | R$10 | — |
| AGENDAMENTO/CURRÍCULO/ANTECEDENTES/DIGITAÇÃO | R$5 | — |
| ACESSO/ENVIO DOCUMENTOS | R$1,20 | — |
| SCANNER | R$0,70 | — |

Ou seja: "ajudar cliente com burocracia digital" já é uma linha de negócio estabelecida da
gráfica, não uma ideia nova — o quiosque seria uma forma de atender parte disso sem atendente.

## Demanda real, medida no histórico de mensagens (jsgrafica_log_msgs_privadas)
Contagem de contatos únicos mencionando cada termo (~últimos 6 meses):

| Assunto | Menções | Contatos únicos |
|---|---|---|
| Celpe (conta de luz) | 17 | 12 |
| IPVA | 17 | 10 |
| gov.br | 8 | 8 |
| DETRAN | 4 | 4 |
| Multa | 3 | 3 |
| CNH | 2 | 2 |
| Cartão de crédito | 2 | 2 |

Celpe e IPVA são os dois assuntos mais recorrentes, em volume parecido. gov.br aparece bastante
também, mas geralmente como parte de outro serviço (agendamento, CADÚNICO), não sozinho.

**Achado à parte, útil:** o contato "558132176990", já identificado como "contaminação" do log
numa investigação anterior, é na verdade o **WhatsApp oficial da Neoenergia/Celpe**
((81) 3217-6990) — confirma que a equipe já usa esse canal pra consultar fatura de cliente em
nome dele, e por isso aparece misturado no mesmo log (mesmo número conectado).

## Como cada serviço funciona hoje (manual, feito pela equipe)
- **Celpe (2ª via):** site da Neoenergia (`neoenergia.com/web/pernambuco/segunda-via-de-conta`)
  tem um caminho **público, sem login** — só CPF + data de nascimento + número da conta — mas
  **só gera o código de barras**. Pra fatura completa em PDF (o que o cliente pede, pra pagar em
  outro lugar e guardar), **precisa estar cadastrado e logado** — não é público. Não descobri
  ainda se a equipe usa um login próprio da gráfica ou faz via WhatsApp do bot da Neoenergia
  (evidência do achado acima) pra conseguir esse PDF completo.
- **IPVA (SEFAZ-PE):** mensagem real da equipe pro cliente: *"conseguimos tirar o ipva com o
  nosso, porém caso depois o senhor precise acessar os outros serviços do detran o senhor vai
  precisar dessa senha"* — ou seja, **pra IPVA em si a equipe usa acesso próprio** (não precisa
  da senha gov.br do cliente), mas **outros serviços do DETRAN exigem a senha gov.br pessoal do
  cliente**.
- **DETRAN (além de IPVA) e gov.br em geral:** dependem da **senha gov.br pessoal do cliente** —
  não tem como um sistema da gráfica fazer isso de forma genérica/anônima. Isso é uma barreira
  real pro autoatendimento: exigiria o cliente logar com a própria conta gov.br no tablet
  compartilhado (funciona, mas precisa de cuidado de segurança — sempre deslogar depois, nunca
  salvar senha no aparelho).

## Por que isso não é um projeto simples
Cada tipo de consulta tem um "dono" diferente (Neoenergia, SEFAZ-PE, gov.br/DETRAN), com
exigência de dados e nível de acesso diferente — não dá pra tratar como um formulário único.
Uns são públicos e anônimos (bons candidatos a autoatendimento de verdade), outros exigem login
pessoal do cliente (o tablet vira só um "computador emprestado", não elimina a etapa de login,
só evita ocupar um funcionário). O público (idosos, pouca familiaridade com tecnologia) que mais
usa esse serviço é também o que mais precisa de ajuda com login/senha — o que empurra contra a
ideia de "sem precisar de equipe" pros casos que exigem senha pessoal.

## Fluxo proposto pelo Edvam (2026-07-06)
Quando exige senha: hoje, já existe a prática de o cliente digitar a própria senha num teclado
separado (a equipe não vê/mexe na senha dele) pra acessar e gerar o documento. No autoatendimento
seria a mesma lógica, só que sem precisar de atendente no meio:

1. Cliente usa o tablet, acessa o site do serviço (Celpe/SEFAZ/gov.br/DETRAN), loga com a própria
   senha se precisar (mesmo teclado separado de hoje), gera/baixa o documento.
2. Cliente confirma na nossa tela que quer imprimir aquilo — **abre um pedido** (reaproveitar
   `jsgrafica_pedidos`, a mesma estrutura já construída e testada esta sessão — status,
   pagamento, fila).
3. Cliente paga a taxa de serviço via Pix ali na tela (o pagamento da conta em si, se houver,
   continua sendo do banco dele, fora do nosso sistema).
4. Pedido vai pra **fila de impressão** (já existe como aba dentro de "Pedidos" — item 12 do
   backlog original do projeto, "fila de impressão com script local", ainda fase futura).
5. Equipe imprime, entrega, fecha o pedido (mesmo ciclo confirmado→em produção→pronto→aguardando
   retirada→entregue já em uso).

**Nota técnica do PM:** o passo 2 ("o sistema identifica") provavelmente não dá pra ser detecção
automática — não temos como monitorar o que o cliente faz dentro do site de terceiro (Celpe,
SEFAZ, gov.br). O mais realista é um botão explícito tipo "Pronto, quero imprimir isso" que o
próprio cliente aperta depois de baixar o PDF, abrindo o pedido manualmente — não é uma limitação
grave, só um ajuste de expectativa de "automático" pra "clique de confirmação".

O ponto forte dessa proposta: ela não cria um sistema paralelo — é o mesmo pedido, status,
pagamento e fila que a gráfica já usa pra impressão comum, só com o cliente operando o início do
fluxo sozinho em vez do atendente.

## Recomendação (pra quando isso virar prioridade, não agora)
Antes de desenhar a tela, vale um levantamento mais direto — perguntar pra Zu/Gabi/Edvam, serviço
por serviço, exatamente o passo a passo que eles fazem hoje (que login usam, se é da gráfica ou
do cliente, se gera PDF ou só código de barras) — o histórico de mensagens dá pistas, mas não
confirma tudo (ex.: ainda não sei como a equipe consegue o PDF completo da Celpe). Com isso
mapeado, dá pra separar os serviços em 2 grupos: **"público, dá pra virar autoatendimento de
verdade"** (ex.: IPVA, código de barras Celpe) vs. **"precisa de login pessoal do cliente"** (ex.:
DETRAN além do IPVA, a maior parte do gov.br) — e desenhar o quiosque só pro primeiro grupo de
início, com letra grande e passos guiados pro público idoso, Pix na tela pra taxa de serviço, e
reavaliar o segundo grupo depois de ver o uso real.

## Referências
`jsgrafica_produtos` (categoria "Consulta Online"). `jsgrafica_log_msgs_privadas` (buscas por
termo). `pm/project_log_dados_contaminados` (achado do contato 558132176990 = bot da Neoenergia).
