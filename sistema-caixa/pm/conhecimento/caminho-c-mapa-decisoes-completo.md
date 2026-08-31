# Caminho C: mapa de decisões completo, do jeito que precisa funcionar de verdade

Executado por: sessão SITE V2 (fora do fluxo normal dos chats especialistas, a pedido direto do
Edvam, 2026-08-27). Não substitui nenhum documento existente — amarra o que já estava desenhado
(`caminho-c-fronteira-ia-automacao-equipe.md`, demanda 293; `caminho-c-contrato-das-ferramentas.md`,
demanda 295) com os achados reais e o desenho novo desta sessão (demandas 314-316 + o desenho de
status de atendimento ainda não implementado).

**Por que este documento existe**: o Edvam pediu, na prática, "um mapa de decisões bem feito pra
IA funcionar corretamente" depois de uma sequência real de achados (histórico fora de ordem,
Dizu redirecionando cliente pagante, escalonamento que nunca expira). Nenhum documento existente
juntava a sequência INTEIRA numa visão só — cada um cobria uma parte. Este é o mapa de ponta a
ponta.

---

## 0. Estado real hoje (2026-08-27), antes deste mapa

- **Caminho C está no ar, conectado no roteamento real**, mas só responde quem está na whitelist
  (`jsgrafica_telefones_autorizados`) — hoje só números internos/teste, nenhum cliente real.
- **`CLAUDE.md` raiz da JS Gráfica ainda diz "sem auto-resposta ao cliente via WhatsApp"** — essa
  frase nunca foi atualizada pra deixar explícito que o Caminho C é a exceção aprovada (trancada
  por whitelist). Gap de documentação real, não de comportamento — sinalizado aqui, não corrigido
  neste documento.
- **3 correções aplicadas hoje** (demandas 314, 315, 316 — ver seção 4).
- **1 desenho novo ainda NÃO implementado** (status de atendimento compartilhado — seção 3).

---

## 1. O mapa de decisão, do início ao fim

Isto é a sequência REAL que uma mensagem nova percorre, hoje + o que falta adicionar. Cada caixa
cita se já existe, se foi corrigido hoje, ou se ainda é desenho.

```
1. Mensagem chega (workflow 01)
   │
   ├─ É grupo? ──────────────────────────────► vai pra jsgrafica_log_msgs_grupos, para aqui
   │  (existe)
   │
   ├─ Telefone está na whitelist (jsgrafica_telefones_autorizados)? ─► NÃO → para aqui
   │  (existe)
   │
   ├─ Tem sessão de PEDIDO ativa apontando pro 06-PEDIDOS (desativado)? ─► corrige destino
   │  (existe, corrigido demanda 306)
   │
   ├─ Contador de loop de resposta automática estourou? ─► para aqui
   │  (existe, corrigido demandas 307/308/309)
   │
   ├─ [NOVO, AINDA NÃO IMPLEMENTADO] Já tem humano OU IA já escalada atendendo esse telefone?
   │  ver seção 3 — se SIM, para aqui, IA fica calada
   │
   ▼
2. Chega no agente (workflow 297)
   │
   ├─ Gate Dizu (mensagem ATUAL bate padrão de comida)?
   │  (existe, REFINADO hoje — demanda 316 — não erra mais em pedido de cardápio impresso/placa)
   │  → SIM: redireciona pro número novo da Dizu (demanda 314), marca escalado, PARA
   │
   ├─ Gate Alto Toque (mensagem ATUAL pede dado pessoal)?
   │  (existe, sem mudança hoje)
   │  → SIM: escala direto, PARA
   │
   ├─ Carrega contexto: última sessão + últimas 8 msgs/7 dias
   │  (existe; ORDENAÇÃO corrigida hoje nos 2 sistemas — demanda 314;
   │   histórico antigo de Dizu agora É FILTRADO daqui — demanda 315)
   │
   ▼
3. IA raciocina (Gemini + ferramentas travadas)
   │  Regras completas: ver caminho-c-fronteira-ia-automacao-equipe.md (seções 2-4) e
   │  caminho-c-contrato-das-ferramentas.md (contrato de cada ferramenta) — não repetido aqui.
   │
   ├─ Responde sozinha (institucional/triagem/cortesia) — sem ferramenta
   ├─ Chama ferramenta (preço/pedido/Pix/cancelamento) — sempre recalcula da fonte real
   ├─ Guardrail de valor: mensagem com R$ sem chamada de ferramenta correspondente → bloqueia, escala
   ├─ Guardrail anti-vazamento de prompt de sistema (demanda 298)
   │
   ▼
4. Decisão final do turno
   │
   ├─ Resposta normal → [NOVO] marca em_atendimento + atendente="Agente Atendimento"
   │                     [NOVO] só manda a mensagem se conseguiu marcar (ver seção 3.4)
   │
   └─ Escalou (qualquer motivo) → [NOVO] marca escalado, solta a marca de atendente
                                    (só se ainda fosse ela quem estava marcada)
```

---

## 2. Achados de hoje, cada um no lugar certo do mapa

| # | Achado | Onde no mapa | Status |
|---|---|---|---|
| 314 | Ordenação do histórico quebrada (linha vazia entra primeiro / sem ordenação nenhuma) | Passo 2, "carrega contexto" | ✅ Corrigido e testado com dado real |
| — | Redirecionamento da Dizu com número novo dela | Passo 2, "gate Dizu" | ✅ Corrigido |
| 315 | Conversa antiga de Dizu contaminando pergunta nova não relacionada | Passo 2, "carrega contexto" | ✅ Corrigido |
| 316 | Gate de Dizu redirecionava cliente pagante pedindo cardápio impresso/placa | Passo 2, "gate Dizu" | ✅ Corrigido, testado contra 12 casos reais |
| — | Telefone `@lid` em 28% das linhas do log de mensagens | Afeta "carrega contexto" (agente fica cego a 79% das próprias respostas em conversas afetadas) | ❌ Não corrigido — achado real, sem fix aplicado |
| — | Escalonamento nunca expira (flag de 8 dias atrás ainda travando "Oi") | Passo 1 (novo gate) + Passo 4 (resolver) | 🔧 Vira o desenho da seção 3 |
| 317 | Anexo sem legenda + IA ligada derrubava a execução inteira do n8n, mensagem nunca era gravada em lugar nenhum (43% de toda mensagem nova de cliente é mídia sem texto) | Workflow `01`, node `Preparar Payload Agente Caminho C` + `HTTP Agente Caminho C` | ✅ Corrigido (2 camadas: nunca manda texto vazio pra IA + erro nesse node não derruba mais o resto da execução), testado contra 5 casos reais |
| — | Log de mensagem de grupo quebrado (coluna `request_method` não existe na tabela) — achado 5 meses parado, desde 13/03/2026 | Workflow `01`, node `MSG GRUPOS` | ⏸️ Não é prioridade (decisão do Edvam, 27/08) — o agente não interage em grupo |
| — | Relatório automático pro Google Sheets falhando ~40% das vezes hoje | Workflows `REPORT SHEETS` (2 workflows distintos) | ⏸️ Não é prioridade (decisão do Edvam, 27/08) — nada mais depende do Sheets |

---

## 3. Desenho novo: status de atendimento compartilhado (NÃO IMPLEMENTADO AINDA)

### 3.1. Os 4 estados

| Estado | Significado | Quem marca |
|---|---|---|
| `aberto` | Ninguém tocou, ou foi liberado de volta | Padrão / liberação após escalar |
| `em_atendimento` | Alguém (humano OU IA) respondendo agora | Humano (manual) ou IA (quando responde de verdade) |
| `escalado` **(valor novo)** | IA tentou e não conseguiu — precisa de humano com prioridade | Só a IA |
| `resolvido` | Atendimento encerrado, bookkeeping manual | Só humano — **a IA nunca marca isso sozinha** |

Campo usado: `jsgrafica_contatos.status_atendimento` (hoje `text` livre, sem CHECK constraint —
confirmado, dá pra adicionar o 4º valor sem migração de schema) + `atendente` (nome real, ou o
texto fixo `"Agente Atendimento"` quando é a IA).

### 3.2. Por que a IA nunca marca "resolvido"

Ela não tem julgamento confiável pra decidir "esse assunto acabou de vez, sem risco de o cliente
voltar no mesmo fio". Deixar só na mão humana evita fechamento prematuro. Ela só sabe: assumir
(claim) e escalar (largar).

### 3.3. Fluxo completo de transição

```
Mensagem nova chega
   │
   ├─ Não existe linha em jsgrafica_contatos ainda (contato novíssimo)
   │    → trata como "aberto", IA processa normal
   │
   ├─ em_atendimento + atendente = pessoa real → IA NÃO PROCESSA (fica calada)
   ├─ escalado                                  → IA NÃO PROCESSA (já tentou uma vez)
   └─ aberto / resolvido / em_atendimento+IA    → IA PROCESSA normal
```

- **IA processa e decide responder normal** → marca `em_atendimento` + `atendente="Agente Atendimento"`.
- **IA escala** (Dizu / Alto Toque / guardrail / decide sozinha) → marca `escalado`, solta a marca,
  **só se ainda fosse ela a marcada** (guarda de segurança, seção 3.4).
- **Humano clica "Resolver"** → vira `resolvido` **e limpa a trava interna da IA**
  (`jsgrafica_agente_teste_sessoes`) — fecha o bug do "Oi" de 8 dias de vez.
- **Humano clica "Assumir da IA"** (botão NOVO, não existe hoje) → vira `em_atendimento` com nome
  do humano, IA para. Ação deliberada, separada de só abrir/olhar a conversa (confirmado no código
  real: `assumirAutomaticamente()` só age quando o status já é `"aberto"` — olhar uma conversa em
  `em_atendimento` ou `escalado` NUNCA rouba o atendimento sozinho, isso já é seguro hoje).

### 3.4. As guardas de segurança contra corrida (humano x IA quase ao mesmo tempo)

Desenho original (demanda 321), com o refinamento das demandas 323/324 (2026-08-27, mesmo dia,
achado real ao vivo durante o piloto):

1. **Na hora de a IA reivindicar** (`Contatos: Reivindicar Atendimento (raw)`, workflow `297`):
   `UPDATE ... SET atendente='Agente Atendimento', status_atendimento='em_atendimento' WHERE
   phone=X AND status_atendimento <> 'escalado' AND (atendente IS NULL OR atendente='Agente
   Atendimento')` — a condição `status_atendimento <> 'escalado'` é a correção da demanda 323: sem
   ela, quando a própria IA escalava no meio do turno (Camada 2 — decisão dela mesma, via tool
   call, diferente dos gates determinísticos Dizu/Alto Toque/Guardrail-bloqueado, que não passam
   por este node), este UPDATE reclamava por engano a linha que a escalação real tinha acabado de
   marcar `escalado`/`atendente=null` segundos antes, revertendo silenciosamente pra
   `em_atendimento`. Confirmado ao vivo com o telefone `5521965185667` (execução `1576879`,
   2026-08-27). Se um humano já tiver assumido entre a checagem do passo 1 e este momento, esse
   UPDATE também não afeta nenhuma linha (write vira no-op), em vez de atropelar o humano — guarda
   original, intacta.
2. **A mensagem só é enviada de verdade se `_reivindicado` for `true`.** Isso NÃO é mais só "o
   UPDATE acima afetou 1 linha" — desde a demanda 324, `Contatos: Avaliar Reivindicacao` também
   força `_reivindicado=true` quando a própria IA chamou `escalar_para_humano` neste turno
   (detectado via `_intermediateSteps`, mesma técnica de `Guardrail Validacao Saida`, checando
   `action.tool === 'Tool_Escalar_Para_Humano'`). Motivo: com a guarda 1 sozinha, o cenário
   "a IA escalou e o UPDATE virou no-op de propósito" ficava indistinguível de "um humano assumiu
   no meio do caminho" — os dois dão 0 linhas — e os dois bloqueavam o envio, mas só o segundo
   cenário deveria bloquear. Sem esse desacoplamento, a confirmação "Chamando a equipe" nunca
   chegava ao cliente quando a IA escalava sozinha (achado real, mesmo dia, ver demanda 324) —
   pior que o bug original, que pelo menos enviava a confirmação (só corrompia o estado). Com o
   desacoplamento: 0 linhas + IA escalou neste turno → ainda assim envia; 0 linhas + IA NÃO
   escalou neste turno (humano pegou no meio do caminho) → continua bloqueando o envio, guarda
   original intacta.
3. **Na hora de soltar (escalar)**: mesmo princípio, `WHERE phone=X AND atendente='Agente
   Atendimento'` — nunca solta/sobrescreve a marca de um humano que assumiu no meio do caminho.

**O que NÃO tem solução simples, aceito como risco residual**: a janela exata entre "IA decidiu
responder" e "IA de fato grava a reivindicação" ainda existe (é o tempo de resposta do LLM).
Reduzir isso a zero exigiria travamento distribuído de verdade, desproporcional pro tamanho real
do risco — mesmo padrão de outras corridas já aceitas no sistema (ex: telefone/lid na hora do Pix).

### 3.5. Motivo da escalação visível pro humano

Hoje o "por que a IA escalou" (Dizu/Alto Toque/ambíguo/etc.) só existe em
`jsgrafica_agente_teste_sessoes.dados_extra.motivo_escalonamento`, invisível na tela do Inbox.
Ao implementar, mostrar esse motivo junto do badge "escalado" — senão aparece sem explicação
nenhuma pra quem for atender.

### 3.6b. Conversa `escalado` esquecida sem resolver (demanda 325, 2026-08-27)

Gap real achado ao vivo pelo próprio Edvam no seu número de teste, no dia seguinte à
implementação da seção 3: quando ninguém no Admin resolve uma conversa `escalado`, toda mensagem
nova desse cliente caía em silêncio total (o gate da seção 3.7.1 força `_destino='ignorar'`, e o
`Switch Destino` do workflow `01` não tinha nenhuma conexão na saída `IGNORAR`). Fechado dos 2
lados:

- **Visibilidade pro time**: banner persistente no shell do Admin (`app/page.tsx`), visível em
  toda aba (não só o Inbox) enquanto `jsgrafica_contatos.status_atendimento='escalado'` tiver
  1+ linha, some sozinho quando a contagem zera. Clique leva pro filtro "Escalado" que já existia
  (seção 3.5), sem duplicar UI. Rota nova `app/api/inbox/escalados-count`, poll simples de 25s.
- **Cortesia pro cliente**: workflow `01` ganhou 8 nodes novos (prefixo `Cortesia:`) na saída
  `IGNORAR` do `Switch Destino`, mas só disparam quando `_bloqueado_motivo === 'ia_ja_escalou'`
  (não no caso `'humano_atendendo'`, nem nos outros caminhos que também usam
  `_destino='ignorar'`, como o loop de auto-resposta da seção 2). Cooldown de 45 minutos por
  telefone, gravado no mesmo `jsgrafica_agente_teste_sessoes.dados_extra` da seção 3.5 (chave
  nova `cortesia_dead_end_enviada_em`, sem coluna nova). Mensagem curta, tom casual, escrita a
  partir de frases reais já em produção, nunca reprocessa a conversa pela IA, só avisa que a
  equipe já está ciente.

Detalhe completo, incluindo por que o texto da cortesia foi escrito daquele jeito e o diff
nó-a-nó confirmado: `pm/demandas/325-conversa-escalada-esquecida-cai-em-silencio.md`.

### 3.6. As 2 tabelas continuam com papéis diferentes, não uma substitui a outra

- `jsgrafica_contatos.status_atendimento`/`atendente`: status OPERACIONAL, visível pro humano,
  agora também escrito pela IA.
- `jsgrafica_agente_teste_sessoes`: continua sendo o diário interno da IA (motivo, histórico de
  mensagens da escalação, `pedido_id`, `classificacao`) — mais detalhado, não visível na tela.
  Sincronizadas nos pontos de contato certos (claim, escalar, resolver), sem duplicar dado.

### 3.7. Cuidados de implementação (não são desenho, são risco técnico real)

1. **Bug de "zero linhas quebra o próximo node"** já aconteceu 6 vezes neste projeto
   (`alwaysOutputData` ausente). O node novo que checa `jsgrafica_contatos` antes de deixar a IA
   responder PRECISA devolver sempre alguma coisa, mesmo quando não acha nenhuma linha (contato
   novíssimo) — mesmo padrão já usado na correção de hoje (demanda 314, node via `httpRequest`
   direto, não o node "getAll" que já provou ser problemático).
2. **Ordem de ativação importa**: ligar primeiro a trava (gate no workflow `01`), só depois a IA
   passar a marcar `em_atendimento`, por último o "soltar quando escala". Nessa ordem, nunca a
   sobrescrita.
3. **Onde a checagem entra na fila do workflow `01` importa** — esse workflow já tem proteção
   contra loop de resposta automática (demandas 307-309), a checagem nova não pode bagunçar essa
   sequência já testada.
4. **Varrer todo o código que compara `status_atendimento`** contra os 3 valores conhecidos antes
   de introduzir o 4º (`escalado`) — telas/relatórios que assumem só 3 valores podem quebrar
   silenciosamente.
5. **Testar de verdade com o número de teste** antes de declarar pronto — corrida/trava não se
   prova só lendo código.

---

## 4. Checklist do que falta pra ativar cliente real com segurança

- [x] Implementar o desenho da seção 3 (status compartilhado + guardas de corrida) — **demanda
      321, 2026-08-27**: gate no `01`, claim no `297`, release no `296`, resolve limpando a trava
      da IA em `app/api/inbox/atendimento/route.ts`. Deployado na ordem certa (gate → resolve →
      release → claim → UI), backups + diff confirmado em cada workflow.
- [x] Varredura de código pra `status_atendimento` (item 3.7.4) — **demanda 321**: 5 arquivos
      reais encontrados, todos tratados (`TelaInbox.tsx`, `TelaClientes.tsx`,
      `conversas/route.ts`) ou confirmados inofensivos (`clientes/route.ts`,
      `inbox/atendimento/route.ts`).
- [x] Botão "Assumir da IA" na tela do Inbox — **demanda 321**, reaproveita o mecanismo PATCH do
      "Assumir" comum, sem mudança de backend.
- [x] Mostrar motivo da escalação na tela (seção 3.5) — **demanda 321**, lido de
      `jsgrafica_agente_teste_sessoes.dados_extra.motivo_escalonamento`, exposto como
      `motivoEscalonamento` na rota de conversas.
- [ ] Testar ao vivo com número de teste, todos os cenários (humano atende, IA atende, IA escala,
      humano resolve, humano assume por cima da IA) — telefone travado (`5521965185667`) resetado
      pra estado limpo (`aberto`, sem atendente, sessão `concluida`) pronto pro Edvam confirmar
      com mensagem real; execução desta demanda não mandou nenhuma mensagem de teste.
- [ ] Decidir e corrigir (ou aceitar conscientemente) o achado do telefone `@lid` cegando a IA
      pras próprias respostas em 79% das conversas afetadas (seção 2, achado não corrigido)
- [ ] Atualizar `CLAUDE.md` raiz pra refletir que Caminho C é exceção aprovada à regra de "sem
      auto-resposta", trancada por whitelist (gap de documentação apontado na seção 0)
- [ ] Só depois disso: ativar os primeiros candidatos reais na whitelist (lista já existe,
      demanda 209)

## Referências

`caminho-c-fronteira-ia-automacao-equipe.md` (demanda 293, fronteira IA/ferramenta/equipe, 2
camadas de escalação, cenários de retomada). `caminho-c-contrato-das-ferramentas.md` (demanda 295,
contrato técnico exato de cada ferramenta). Demandas 314, 315, 316 (correções de hoje, 2026-08-27,
ordenação/Dizu). `CLAUDE.md` raiz da JS Gráfica e `caixa-js-grafica/CLAUDE.md` (estado geral,
regra de "sem auto-resposta" ainda não reconciliada com o Caminho C real).
