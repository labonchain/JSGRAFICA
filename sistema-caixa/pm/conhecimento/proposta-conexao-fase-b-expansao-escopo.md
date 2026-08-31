# Proposta — conectar Fase B, regra de expansão gradual e escopo (demanda 243)

Executado por: 06 - AUTOMAÇÃO ATENDIMENTO INBOX JS GRAFICA
Data: 2026-07-29

**Isto é uma proposta, não uma execução.** Nada foi implementado, nenhum workflow foi editado,
nenhum número foi adicionado à whitelist. O objetivo é dar ao Edvam uma recomendação pronta pra
aprovar, ajustar ou rejeitar em cada um dos 3 pontos, sem exigir mais investigação antes de decidir.

---

## 0. Revalidação do estado da Fase B (pré-requisito do escopo)

Já se passaram 12 dias desde o último teste (demanda 206, 2026-07-17). Revalidei antes de propor
qualquer coisa:

| Item | Estado revalidado em 2026-07-29 |
|---|---|
| Workflow `206 - JSGRAFICA \| AGENTE FASE B (TESTE ISOLADO)` (id `M5WZ6zHAe625XyJm`) | **Ainda existe, `active: false`, 62 nós — idêntico à 206.** Webhook próprio isolado (`jsgrafica-agente-fase-b-teste-206`), nenhum outro workflow (incluindo o `01` real) referencia esse webhook. |
| Workflow `01 - JSGRAFICA \| LOG MSG RECEBIDAS` (roteamento real) | `active: true`, inalterado desde 2026-07-15 (antes desta demanda). Nenhuma referência ao 206 ou ao webhook de teste — **confirmado 100% desconectado**, como esperado. |
| Whitelist (`jsgrafica_telefones_autorizados`) | Só os 5 números de teste/interno já conhecidos (Edvam, "Cliente Teste", número da Dizu usado como teste, bot de outro projeto, 1 sem histórico). **Nenhum candidato real foi adicionado** — confirma que nada foi conectado por engano. |
| Instância Z-API (`jsgrafica_agent_config`) | `ativo: true`, `status: "ativo"`, última atualização 2026-07-10 — sinal de que a instância seguia configurada corretamente até essa data. **Não testei conectividade ao vivo agora** (fora do escopo desta demanda, que é só proposta) — recomendo o 01-N8N confirmar isso na prática antes de qualquer teste com tráfego real. |
| Catálogo (`jsgrafica_produtos`, categorias ativas) | **Achado que precisa correção antes de conectar**: a lista de `id`s de categoria usada pela 206 (`cat_impressao_couche`, `cat_impressao_foto`, `cat_impressao_oficio`, `cat_impressao_cartao`, `cat_impressao_adesivo`, `cat_encadernacao`, `cat_plastificacao`, `cat_escritorio`, `cat_personalizados`, `cat_xerox`, `cat_consulta_online`, `cat_servico_terceirizado`, `cat_outro`) **não cobre 2 categorias reais e ativas hoje**: "Recarga celular" e "Recarga vem" — confirmado uso real por cliente via WhatsApp na demanda 234 (José Carlos Souza, `558188398917`, pediu "RECARGA VEM 52,50" duas vezes). Além disso, o catálogo hoje tem 2 categorias que **não são serviço de cliente** ("Empréstimo", "Fechamento caixa" — mesmo achado de contaminação da demanda 234, lançamento financeiro interno registrado como se fosse produto) — se a Fase B algum dia gerar lista de categoria direto de `jsgrafica_produtos` sem esse filtro, essas 2 apareceriam por engano numa lista de opções pro cliente. |

**Conclusão da revalidação**: a estrutura do workflow 206 (os 7 passos, o debounce de rajada, os
gatilhos parciais) segue válida — nada mudou nela. O que precisa reconferência/ajuste **antes**
de conectar de verdade: (1) atualizar a lista de categorias com Recarga Celular/Recarga VEM e
filtrar Empréstimo/Fechamento caixa, (2) confirmar Z-API/credencial Gemini ao vivo, (3) decidir o
que fazer com a tabela `jsgrafica_agente_teste_sessoes` (hoje marcada explicitamente como teste,
não fonte de verdade de produção) antes de usá-la com tráfego real — decisão do 02-DADOS.

**Achado fora do escopo, registrado à parte**: o node `HTTP Request1` do workflow `01` ainda
aponta pro webhook `jsgraficagestaoprodutos`, do antigo workflow `05 - GESTAO PRODUTOS` — que o
`CLAUDE.md` documenta como removido de vez na demanda 010. Se esse workflow não existe mais, é
referência morta que pode gerar erro HTTP silencioso se algum fluxo passar por ali. Não investiguei
mais fundo (fora do escopo desta demanda) — sinalizando pro PM avaliar com o 01-N8N.

---

## 1. Proposta — como conectar a Fase B no roteamento real

### Recomendação
**Reaproveitar a ponte já desenhada pelo próprio 01-N8N no relato da demanda 206**, não inventar
mecanismo novo: *"quando a Fase B conectar de verdade, a ponte seria o workflow 01 chamar este
workflow via HTTP com o payload já normalizado — mesmo padrão que hoje ele usa pra chamar HTTP
06-PEDIDOS"*. Concretamente:

1. **Gatilho de entrada na Fase B, dentro do workflow `01`**: um novo destino no roteamento
   (ao lado dos já existentes — `06-PEDIDOS`, `07-GRUPO-PEDIDOS`, atendimento IA pausado, config)
   que dispara SOMENTE quando as 2 condições batem ao mesmo tempo:
   - `telefone` está na whitelist (`jsgrafica_telefones_autorizados`, `ativo = true`) — **mesma
     tabela já existente e editável desde a demanda 015**, não precisa de coluna nem tabela nova;
   - a mensagem é início de sessão nova (gap de 4h+, mesma definição usada desde a 159) **e**
     começa com mídia sem legenda (escopo da Fase 1 — ver proposta de escopo na seção 3).
   Se qualquer uma das 2 condições falhar, a mensagem segue o caminho de hoje (log + Inbox
   manual) — nada muda pra ninguém fora da whitelist.
2. **Chamada**: `HTTP Request` pro webhook `jsgrafica-agente-fase-b-teste-206` (renomear o
   webhook/workflow de "TESTE ISOLADO" pra um nome de produção quando for ativado de verdade —
   decisão de nomenclatura do 01-N8N), passando o mesmo payload normalizado que a 206 já espera
   (`telefone`, `from_me`, `media_type`, `media_url`, `caption`, `message_text`, etc. — já é o
   formato de saída do node `Processar Evento` do workflow 01, então não precisa transformação
   nova).
3. **Separação explícita de `JSGRAFICA_ATENDIMENTO_AI`**: **crítico deixar claro** — a Fase B é um
   agente DIFERENTE e mais restrito do agente geral de atendimento (que segue pausado, `CLAUDE.md`:
   *"Não religar atendimento automático ao cliente ainda"*). Conectar a Fase B **não é** religar o
   `JSGRAFICA_ATENDIMENTO_AI` — é um caminho novo, isolado, só pra números da whitelist, sempre
   terminando em `aguardando_aprovacao` (nunca manda produto pronto pro cliente sem humano
   aprovar). Recomendo que o node de roteamento novo tenha nome explícito tipo "AGENTE FASE B
   (aprovação humana)" pra não ser confundido com o agente geral por quem for mexer no workflow
   depois.
4. **O que NÃO muda**: nenhum destino existente (`06-PEDIDOS`, atendimento manual, etc.) é
   alterado — a Fase B é um destino adicional, condicional à whitelist, não uma substituição.

### Alternativa considerada e descartada
Reescrever a lógica da 206 diretamente dentro do workflow `01` (em vez de chamar via HTTP) —
descartada porque duplicaria ~62 nós dentro de um workflow que já tem 48 nós e é crítico pra
produção (todo o log de mensagens passa por ele); manter a Fase B como workflow separado, só
chamado condicionalmente, isola o risco (se o workflow 206 falhar, o pior caso é a mensagem não
ser respondida automaticamente — mas o log e o roteamento normal do `01` continuam intactos).

### Evidência vs. julgamento
A recomendação de reaproveitar a ponte via HTTP é **evidência direta** (é o próprio desenho já
documentado pelo executor da 206). A recomendação de nome do node/nomenclatura é **julgamento**,
registrado como tal — não tem achado de dado por trás, é boa prática de clareza.

---

## 2. Proposta — regra de expansão gradual

### Quem entra no lote 1
Usando a lista refinada da demanda 234 (que já cruza com a 209):

| Ordem | Telefone | Nome | Por quê |
|---|---|---|---|
| 1 | 558188768207 | Maria da Conceição Silva | Melhor perfil confirmado 2x (209 e 234): 100% Impressão P&B A4, zero outlier, zero contaminação |
| 2 | 558187613253 | Otto Silva | Confirmado 2x, mesmo padrão limpo |
| 3 | 558199159103 | Jociane Araújo | Confirmado 2x, melhor exemplo real do padrão de pergunta sequencial (Regra 3 do manual da 234) |

**Opcional, como 4º nome se o Edvam preferir começar com uma leva ligeiramente maior**:
**558186828266 (Lidiane Oliveira)** — candidata nova da 234, mesmo nível de limpeza que os 3
primeiros (5 pedidos na janela, 100% fluxo rápido, zero outlier).

**Não incluídos no lote 1** (com motivo, já registrado na 234): Carmem Lúcia (outlier real
documentado — considerar só depois de validar o lote 1), José Roberto Silva (bloqueado até a
demanda 208 fechar os gatilhos de escalonamento — **208 segue "liberada", não concluída, em
2026-07-29**), Vlademir Ribeiro/Vivian Cavalcante/André Américo (não recomendados, evidência
reforçada na 234).

### Sinal pra avançar pro próximo lote
Uso a ideia já registrada em `pm/OBJETIVOS-MACRO.md` ("taxa de aprovação sem edição das respostas
geradas"), agora com um critério concreto:

- **Quando medir**: depois que o lote 1 acumular pelo menos **10 pedidos `aguardando_aprovacao`
  gerados pelo agente** (não dias corridos — o volume real de interação de cada um desses 3-4
  clientes é baixo, ~1-2 sessões/semana cada segundo a 234, então um prazo fixo em dias arriscaria
  medir com amostra pequena demais; melhor esperar o volume, mesmo que demore 2-3 semanas).
- **Critério**: ≥80% dos pedidos gerados aprovados **sem edição nenhuma** pelo Admin/Gabi na Fila
  de impressão → libera avançar pro próximo lote. Abaixo disso → pausar expansão, revisar com o
  Admin quais casos foram editados/rejeitados e por quê, antes de adicionar qualquer novo número.
  **O número 80% é julgamento, não evidência** — não existe dado histórico de taxa de aprovação
  ainda (é a primeira vez que isso vai existir de verdade), registrado explicitamente como palpite
  inicial calibrável, não um limiar cravado em pedra.
- **Próximo lote, se aprovado**: adicionar Carmem Lúcia (com aviso ao Admin de que o perfil dela
  tem histórico de negociação, prestar atenção nas primeiras aprovações dela especificamente) +
  reavaliar José Roberto Silva se a 208 já tiver concluído até lá.

### O que fazer se um cliente do lote se comportar diferente do esperado
Não precisa de mecanismo novo — a whitelist já é editável (demanda 015) e a aprovação humana já é
obrigatória (demanda 202) por desenho, então o "kill switch" já existe:
1. Qualquer pedido gerado errado fica em `aguardando_aprovacao` até alguém decidir — nunca chega
   ao cliente nem entra em produção sozinho. Rejeitar (cancela, mecanismo já existente da 202) é
   suficiente pro caso pontual.
2. Se um número específico gerar padrão recorrente de erro/edição (não só um caso isolado):
   `UPDATE jsgrafica_telefones_autorizados SET ativo = false` pra esse telefone — ele volta a cair
   no fluxo manual normal na próxima mensagem, sem precisar mexer em workflow nenhum.
3. Os gatilhos de escalonamento (206 + o que a 208 completar) já devem cobrir a maioria dos casos
   de risco automaticamente (cancelar, negociação de pagamento fora do padrão, etc.) — o passo 2
   acima é a rede de segurança extra pra padrão que os gatilhos não cobrirem.

### Achado honesto sobre o tamanho do "pool seguro"
Depois de 2 rodadas de investigação (209 sobre a janela 07-01/07-17, 234 sobre 07-01/07-28,
juntas cobrindo bem mais de 700 telefones reais), **só 4-5 candidatos limpos existem hoje** (os 3
do lote 1 + Lidiane opcional + Carmem com ressalva). Isso não é motivo pra não começar — é
material real e honesto sobre o ritmo esperado: a expansão vai ser lenta no início não por
excesso de cautela artificial, mas porque poucos clientes recorrentes têm padrão comprovadamente
limpo ainda. "Metamorfose" (`558187798504`, achado da 234) é um candidato promissor de alto volume
não avaliado qualitativamente — pode valer uma leitura dedicada pra abrir uma 3ª fonte de
candidatos além de esperar a 208.

---

## 3. Proposta — escopo: só mídia sem legenda, ou expandir pra texto puro?

### Recomendação: manter o escopo em "só mídia sem legenda" por agora — não expandir pra texto ainda

### Evidência a favor de manter o escopo atual
- O material novo da 234 não foi desenhado pra testar comportamento de texto-puro-triggered
  (a subamostra qualitativa buscou diversidade de perfil de cliente, não especificamente sessões
  que começam por texto) — não tem evidência nova SUFICIENTE pra decidir expandir com segurança,
  só teria sinal indireto.
- O sinal indireto que existe **é misto, não conclusivo**: a Regra 4 do manual da 234 mostra que
  fluxo de currículo/dado pessoal (que é majoritariamente texto) exige um template estruturado de
  campos sensíveis (CPF, senha de app do governo) que a Fase B **não tem desenhado hoje** —
  expandir escopo pra texto sem resolver isso primeiro herdaria um risco novo de segurança de
  dado, não é só "mais um tipo de mensagem pra processar".
- Ao mesmo tempo, alguns casos RAPIDO (P&B A4/Colorida/Xerox) da 234 mostram texto simples e
  direto ("Boa tarde\nPor favor tirar essas cópias") que segue o mesmo padrão fácil de mídia óbvia
  — sugerindo que uma expansão futura MAIS ESTREITA (só texto que já cita produto do catálogo por
  nome, não texto puro genérico) pode ser viável depois — **isso é hipótese pra investigação
  futura, não decisão pra agora**.

### Recomendação concreta
1. Não expandir escopo agora — o volume que a Fase 1 já cobre (43% de mídia sem legenda) é
   suficiente pra validar o mecanismo de aprovação/expansão gradual primeiro.
2. Revisitar depois que o lote 1 gerar o sinal de aprovação da proposta 2 (mesmo timing) — nesse
   ponto já existe dado real de quão bem o agente funciona, base melhor pra decidir se vale o
   esforço de desenhar texto.
3. Se/quando reconsiderar, escopo por partes é mais seguro que "todo texto de uma vez": começar
   por texto que já nomeia um produto do catálogo rápido (regra fácil de detectar), deixar
   currículo/dado-pessoal-sensível pra uma fase própria com desenho de segurança dedicado.

### Evidência vs. julgamento
O risco de dado sensível em fluxo de currículo é **achado com evidência real** (citação literal
na seção 4 do relatório da 234). A recomendação de "não expandir agora, esperar o sinal do lote 1"
é **julgamento de produto** (prioriza validar 1 variável de cada vez — expansão de número E
expansão de escopo ao mesmo tempo dificultaria saber qual mudança causou qual resultado) —
registrado como tal, o Edvam pode preferir paralelizar se quiser ir mais rápido.

---

## 4. Resumo — as 3 decisões pedidas ao Edvam

1. **Conectar**: aprovar o desenho da seção 1 (novo destino condicional no workflow `01`, chamando
   a 206 via HTTP, sem tocar no `JSGRAFICA_ATENDIMENTO_AI`) — implementação fica com o 01-N8N numa
   demanda separada, começando pelos 3 itens de reconferência da seção 0 (categorias, Z-API,
   decisão sobre `jsgrafica_agente_teste_sessoes`).
2. **Expansão**: aprovar lote 1 = Maria da Conceição Silva + Otto Silva + Jociane Araújo (+
   Lidiane Oliveira opcional), critério de avanço = 10 pedidos gerados com ≥80% aprovação sem
   edição.
3. **Escopo**: aprovar manter só "mídia sem legenda" por agora, revisitar depois do sinal do lote 1.

Todas as 3 decisões podem ser aprovadas juntas, parcialmente, ou ajustadas — não há dependência
técnica forçada entre elas (dá pra aprovar 1 e 3 sem aprovar 2 ainda, por exemplo).
