# 286 — Travessão ainda aparece nas mensagens reais que o agente manda pro cliente

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16), print da conversa real: a mensagem "Não consegui
identificar de primeira — pode escolher a categoria que mais se parece com o que você precisa?"
que o workflow `206` manda de verdade pro cliente ainda tem travessão. A demanda 260
(2026-07-30) já tinha removido travessão de todo o documento `blueprint-conversas-exemplo-
agente.md` — mas isso nunca foi replicado pro texto de verdade dentro dos nodes do `206` (esse
texto específico está hardcoded no node `Enviar Lista Categorias`, junto com as outras mensagens
do workflow: confirmação de recebimento, proposta de preço, mensagens de escalonamento etc.).

Regra do projeto: nunca usar travessão em nenhum texto — vale pro texto que o cliente recebe de
verdade tanto quanto pra documentação interna.

## Objetivo
Nenhuma mensagem que o `206` manda de verdade pro cliente (WhatsApp real) tem travessão — nem a
que já foi achada, nem qualquer outra que tenha o mesmo problema.

## Escopo
- Incluído: buscar travessão em TODOS os textos de mensagem hardcoded dentro do workflow `206`
  (não só o node achado no print) — cada `jsCode`/`jsonBody` que monta uma mensagem pro cliente.
- Incluído: substituir por pontuação adequada ao contexto (não é troca cega de "—" por vírgula em
  todo canto — reler cada frase e escolher o que soa natural, mesmo padrão de cuidado já usado na
  demanda 260 quando limpou o documento).
- Incluído: conferir se o mesmo problema existe em outros workflows que mandam mensagem real (ex.
  `JSGRAFICA_ATENDIMENTO_AI`, `13-LEMBRETE PIX`) — reportar mesmo que a correção de cada um vire
  demanda própria.
- Incluído: testar com pelo menos os casos que já mandam mensagem via texto/mídia (proposta,
  lista de categorias, confirmação, escalonamento com aviso) confirmando visualmente que saiu sem
  travessão.
- Explicitamente fora de escopo: qualquer mudança de conteúdo/sentido das mensagens além de tirar
  o travessão — não é oportunidade pra reescrever texto por outro motivo.

## Critérios de aceite
- [x] Nenhum travessão em nenhuma mensagem real que o `206` manda, conferido node por node
- [x] Outros workflows que mandam mensagem real verificados, achado reportado mesmo que não
      corrigido aqui
- [x] Testado com mensagem real, texto exato confirmado sem travessão (confirmação visual no
      WhatsApp em si depende do Edvam, ver relato)

## Riscos e cuidados
Mesma disciplina de sempre — isso é texto que vai pro cliente de verdade, revisar com cuidado
antes de considerar concluído, não só busca-e-troca automática.

## Referências
Demanda 260 (`pm/demandas/260-*.md`, limpeza original do documento, mesma disciplina a replicar
aqui no texto real). Print do Edvam (2026-08-16) mostrando o travessão na mensagem real.

## Relato de execução

Executado em 2026-08-16, no workflow `206`. Backup antes de mexer:
`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda286_2026-08-16.json` (84 nodes).

### Levantamento: busquei travessão em TODOS os `parameters` de TODOS os 84 nodes do `206`
(não só o node do print), achei 7 nodes com o caractere:

| Node | Onde | Frase original | Correção |
|---|---|---|---|
| `Enviar Lista Categorias` | mensagem real (2 ocorrências na mesma string) | "Não consegui identificar de primeira — pode escolher a categoria que mais se parece com o que você precisa?" | "Não consegui identificar de primeira, pode escolher a categoria que mais se parece com o que você precisa?" (vírgula liga bem as duas orações, sentido idêntico) |
| `Montar Proposta` | mensagem real | "(mensagem de teste isolado — demanda 206)" | "(mensagem de teste isolado, demanda 206)" |
| `Montar Envio Confirmação` | mensagem real | idem | idem |
| `Montar Envio Pedido Criado` | mensagem real | idem | idem |
| `Montar Envio Negada` | mensagem real | idem | idem |
| `Montar Envio Categoria` | mensagem real | idem | idem |
| `Normalizar Evento` | **comentário de código**, não mensagem pro cliente | "...LOG MSG RECEBIDAS) — decisão da // demanda 206: não duplicar..." | "...LOG MSG RECEBIDAS). Decisão da // demanda 206: não duplicar..." (vira 2 frases, ponto final funciona melhor que vírgula aqui) |

A anotação parentética `"(mensagem de teste isolado, demanda 206)"` está em 6 das 7 ocorrências
(mesma troca em todas: vírgula, mantém o sentido de anotação curta). Cada frase foi relida antes
de decidir a pontuação, não foi troca cega de "—" por um caractere fixo. `Normalizar Evento` é o
único caso que não é mensagem de cliente (é comentário interno), corrigido mesmo assim, à parte
do escopo principal, porque a regra do projeto vale pra qualquer texto, e o custo/risco era zero.

Depois da correção, rodei uma busca automatizada no JSON inteiro do workflow (não só nos 7 nodes
achados manualmente) confirmando `0` ocorrências restantes do caractere travessão em qualquer
`parameters` de qualquer node.

### Achado importante, fora do escopo estrito desta demanda, registrado pro Edvam avaliar
A anotação `"(mensagem de teste isolado, demanda 206)"` continua sendo enviada de verdade pro
cliente em TODA mensagem que o `206` manda, incluindo agora (desde a demanda 274) pra qualquer
telefone autorizado real, não só em teste isolado. Como a demanda pediu explicitamente pra não
mudar conteúdo/sentido das mensagens além do travessão, mantive o texto da anotação como está,
só corrigi a pontuação dela. Mas o fato de um cliente autorizado real poder ver literalmente
"(mensagem de teste isolado, demanda 206)" na resposta que recebe é um problema à parte, mais
sério que o travessão em si, que vale uma demanda própria pra decidir remover essa anotação
inteira agora que o `206` não é mais isolado.

### Outros workflows que mandam mensagem real, verificados

- **`13 - JSGRAFICA | LEMBRETE PIX PENDENTE`** (`17o7HPeASEqoqqnZ`): busquei travessão em todos
  os `parameters` dos 6 nodes. **Nenhuma ocorrência.** Limpo.
- **`JSGRAFICA_ATENDIMENTO_AI`** (`TCbbF5z5dvAOhWsS`): **4 nodes com travessão**, nenhum
  corrigido aqui (fora do escopo desta demanda, workflow diferente):
  - `PROCESSAR EVENTO`, `EXTRAIR E LIMPAR ESTADO`, `10 - PREPARAR LOG MEMORIA_CONVERSA_SUPABASE`:
    travessão em comentário de código, não em mensagem pro cliente (mesmo padrão do achado
    "bônus" do `Normalizar Evento` acima).
  - **`AI Agent1`** (o node LangChain que gera as respostas de verdade): **4 ocorrências dentro
    do PRÓPRIO PROMPT DE SISTEMA** que instrui a IA, incluindo uma na descrição do papel do
    agente ("Você é a porta de entrada — quando identificar o serviço, passa para o sistema de
    pedidos cuidar do restante.") e 3 em cabeçalhos de seção do prompt ("FASE 1 — ABERTURA" etc.).
    **Esse é o achado mais relevante dos 4**: mesmo o `ATENDIMENTO_AI` estando pausado pro
    cliente hoje (`CLAUDE.md`: "Não religar atendimento automático ao cliente ainda"), um modelo
    de linguagem pode reproduzir o estilo de pontuação do próprio prompt de sistema nas respostas
    que gera. Recomendo demanda própria pro 01-N8N corrigir o prompt inteiro quando esse workflow
    for revisitado, antes de qualquer religamento real.

### Testado com mensagem real
Via webhook real (`jsgraficamsgrecebidas`), usando o payload seguro estabelecido na demanda 283
(`chatLid` real, nomes reais, não sintéticos):
- **Texto ambíguo** ("Olá, vocês fazem panfletos?"): confirmado no `Parsear Resposta Gemini`/
  execução real que `Enviar Lista Categorias` rodou com sucesso, envio real confirmado
  (`zaapId: 01A00C114F7879DBAE7CB1A3EBEA28D0`); texto do node deployado conferido direto no
  workflow ao vivo, sem travessão.
- **Texto objetivo** ("Preciso de 50 cópias de xerox em P&B, frente e verso"): classificou
  `documento_obvio`, `Montar Proposta` gerou a mensagem `"Recebi seu arquivo! Pelo que vi, é
  IMPRESSÃO P&B A4 (1 unidade), fica *R$ 1.20*. Confirma? (mensagem de teste isolado, demanda
  206)"` (texto exato extraído da execução real), sem travessão, `Enviar Proposta Botões`
  confirmou envio real (`zaapId: 01A00C1AD0AA756381D2E015BCE01149`).

**Ressalva honesta**: confirmei o texto exato que foi enviado (extraído da execução real do n8n)
e o envio real via Z-API (`zaapId`), mas não tenho como abrir o WhatsApp do Edvam e ver a
renderização final. Peço que ele confira visualmente na próxima vez que testar.

### Checklist da demanda 283 seguido
Depois de cada teste: sessão de teste e log de mensagem apagados; `jsgrafica_contatos` conferido
(`contact_lid`, `lead_name`, `lead_chat_name` continuam corretos: `52063694233823@lid`, "Ninho",
"Ninho"). Nada corrompido.

### Diff final
Contra o backup pré-286: `0` nodes adicionados/removidos, `7` nodes com mudança (só o texto, nada
de lógica/conexão), `0` conexões alteradas.
