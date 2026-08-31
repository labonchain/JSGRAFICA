# 243 — Proposta: conectar Fase B, regra de expansão gradual e escopo (mídia vs. texto)

Status: aprovada
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
A demanda 234 entregou a matéria-prima (manual de resposta com 11 regras citáveis, lista de
candidatos refinada) mas nunca chegou a propor nada sobre os 3 pontos que travam o avanço do
Objetivo 2 desde antes dela existir (ver `pm/OBJETIVOS-MACRO.md`, seção "Ainda não decidido"):

1. Conectar a Fase B (workflow de conversa de verdade) no roteamento real — hoje ela existe só
   como `206 - JSGRAFICA | AGENTE FASE B (TESTE ISOLADO)`, testada apenas com o número do Edvam,
   totalmente desconectada do roteamento real do workflow `01`.
2. Regra de expansão gradual — quantos números reais começar, quais, como monitorar.
3. Se a Fase 1 fica só em "mídia sem legenda" (43% do volume, o escopo original) ou expande pra
   texto puro também.

Esta é a primeira demanda que pede uma **proposta de decisão**, não uma execução — o 06-ATENDIMENTO
não implementa nada (não edita workflow, não conecta roteamento), só escreve a recomendação
fundamentada pro Edvam avaliar.

## Objetivo
Uma proposta escrita, com recomendação clara e evidência, pra cada um dos 3 pontos — pronta pra o
Edvam aprovar, ajustar ou rejeitar, sem exigir mais nenhuma investigação antes de decidir.

## Escopo
- Incluído: revalidar o estado atual da Fase B — já se passaram ~12 dias desde o último teste
  (demanda 206), e produtos/categorias mudaram nesse meio-tempo (ver histórico recente do
  projeto). Confirmar o que ainda está válido no workflow `206` e o que precisaria ser
  reconferido antes de considerar conectar de verdade.
- Incluído: proposta concreta de COMO conectar a Fase B no roteamento real do workflow `01` — que
  novo estado/destino criar, como evitar confundir com os destinos existentes (atendimento IA,
  `06-PEDIDOS`, etc.), o que precisa mudar exatamente (sem implementar, só desenhar o plano).
- Incluído: proposta concreta de regra de expansão gradual, usando a lista de candidatos já
  refinada (demandas 209 + 234): quem entra primeiro (número, perfil, justificativa), quantos por
  vez, que sinal usar pra decidir avançar pro próximo lote (ex.: taxa de aprovação sem edição das
  respostas geradas — ideia já registrada em `OBJETIVOS-MACRO.md`), o que fazer se um cliente do
  lote se comportar mal/diferente do esperado.
- Incluído: proposta de decisão sobre escopo (só mídia sem legenda vs. expandir pra texto puro),
  com justificativa baseada no manual de resposta da 234 — se o material novo dá segurança
  suficiente pra expandir agora ou se é melhor validar o escopo atual primeiro.
- Incluído: pra cada uma das 3 propostas, separar explicitamente o que é recomendação com
  evidência (cita achado real) do que é julgamento/preferência de produto (registrar como tal).
- Explicitamente fora de escopo: implementar qualquer coisa — conectar workflow de verdade, mudar
  roteamento, ativar número novo. É só a proposta escrita.

## Critérios de aceite
- [ ] Estado da Fase B revalidado — confirmado o que ainda vale do teste antigo (206) e o que
      precisa reconferência antes de qualquer conexão real
- [ ] Proposta escrita pros 3 pontos, cada uma com recomendação clara, alternativas consideradas
      (se houver), e separação evidência vs. julgamento
- [ ] Nada implementado — a demanda entrega documento de proposta, não código nem workflow mexido

## Riscos e cuidados
Nenhum — é proposta, não execução. Cuidado só em não confundir "recomendo X" com "já fiz X" no
relato final.

## Referências
Demanda 234 (`pm/conhecimento/manual-resposta-ia-100-clientes.md`, manual de resposta e lista de
candidatos refinada). Demanda 209 (lista de candidatos original). Demanda 206 (Fase B testada
isolada). `pm/OBJETIVOS-MACRO.md` (seção "2. Automação gradual do atendimento no Inbox" — os 3
pontos em aberto, o desenho da Fase 1, checklist técnico).

## Relato de execução

Executada em 2026-07-29 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Proposta completa em
`pm/conhecimento/proposta-conexao-fase-b-expansao-escopo.md`.

### O que foi feito
Revalidei o estado da Fase B antes de propor qualquer coisa (via MCP n8n, leitura pura): workflow
`206` continua existindo, `active: false`, 62 nós, webhook isolado, sem nenhuma referência a ele
no workflow `01` real (roteamento real confirmado 100% desconectado). Whitelist
(`jsgrafica_telefones_autorizados`) confirmada com só os 5 números de teste/interno já conhecidos
— nenhum candidato real foi adicionado por engano em nenhum momento. Conferi o catálogo ativo
(`jsgrafica_produtos`) contra a lista de categorias/`id`s de botão da 206 e achei uma
desatualização real (detalhe abaixo). A partir disso, escrevi as 3 propostas pedidas: (1) como
conectar a Fase B no roteamento real reaproveitando a ponte via HTTP já desenhada pelo próprio
01-N8N no relato da 206 (sem inventar mecanismo novo), com destino novo condicional a
whitelist+escopo, explicitamente separado do `JSGRAFICA_ATENDIMENTO_AI` (que segue pausado); (2)
regra de expansão gradual — lote 1 = Maria da Conceição Silva, Otto Silva, Jociane Araújo (+
Lidiane Oliveira opcional), critério de avanço = 10 pedidos gerados com ≥80% aprovação sem edição,
"kill switch" reaproveitando a whitelist já editável (015) sem mecanismo novo; (3) escopo —
recomendo NÃO expandir pra texto puro agora, evidência mista (Regra 4 do manual da 234 mostra
risco de dado sensível em fluxo de currículo/texto que a Fase B não tem desenhado), revisitar
depois do sinal de aprovação do lote 1.

### Testes realizados e resultado
Nenhum teste de execução (fora de escopo, é proposta). Só leitura/confirmação de estado: consultas
SQL read-only em `jsgrafica_produtos`, `jsgrafica_telefones_autorizados`, `jsgrafica_agent_config`
(confirmando instância Z-API `ativo`/`status: "ativo"`, última atualização 2026-07-10 — não testei
conectividade ao vivo, registrado como pendência de reconferência antes de qualquer teste real);
`get_workflow_details` nos workflows `01` e `206` via MCP n8n (leitura pura).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **Catálogo desatualizado na lista de categorias da 206**: 2 categorias reais e ativas hoje
  ("Recarga celular", "Recarga vem") não estão cobertas pela lista de `id`s de categoria da 206 —
  confirmado uso real via WhatsApp na própria demanda 234 (José Carlos Souza). Precisa correção
  antes de conectar de verdade (detalhado na proposta, seção 0).
- **2 categorias não-cliente em `jsgrafica_produtos`** ("Empréstimo", "Fechamento caixa") — mesma
  classe de contaminação já achada na 234 (lançamento financeiro interno registrado como produto).
  Se uma lista de categoria algum dia for gerada direto do catálogo sem filtro, essas apareceriam
  como opção pro cliente por engano.
- **Referência morta no workflow `01`**: node `HTTP Request1` ainda aponta pro webhook do antigo
  `05 - GESTAO PRODUTOS`, que o `CLAUDE.md` documenta como removido de vez (demanda 010). Pode
  estar gerando erro HTTP silencioso se algum fluxo passar por ali — não investigado a fundo (fora
  do escopo desta demanda), sinalizado pro PM avaliar com o 01-N8N.
- **Tabela `jsgrafica_agente_teste_sessoes`** segue marcada como teste isolado, não fonte de
  verdade de produção (achado já registrado na 206) — decisão sobre nome/ownership definitivo
  antes de usar com tráfego real fica pendente, é do 02-DADOS.

### Status final
Concluída. Os 3 critérios de aceite foram atendidos: estado da Fase B revalidado com achado
concreto (catálogo desatualizado); proposta escrita pros 3 pontos, cada uma com recomendação
clara, alternativa considerada (seção 1) e separação evidência vs. julgamento explícita; nada
implementado — só o documento de proposta, aguardando decisão do Edvam.
