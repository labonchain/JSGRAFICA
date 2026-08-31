# 254 — Blueprint: redesenho rigoroso, cada mecanismo com evidência real ou marcado como hipótese

Status: aprovada
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Revisão do Edvam na aba "Resultado final" (demanda 253) achou 3 problemas concretos, e um padrão
mais sério por trás deles: **o documento está inventando mecanismo em vez de derivar da evidência
real da 234**. As correções anteriores (246, 247, 251, 252, 253) mexeram em tom e organização,
mas nunca voltaram a checar se o *mecanismo* de cada exemplo bate com o que a equipe realmente
faz. Investiguei os 3 pontos e confirmei que o Edvam está certo:

1. **Lista de 13-15 categorias como primeira resposta a mídia ambígua está errada.** A Regra 3
   do manual (234) mostra o padrão real: a equipe **nunca** apresenta menu — pergunta 1 coisa
   simples e aberta por vez (`558186828266`: "imprimir em folhas separadas ou na mesma folha?";
   `558199159103`: "Pra imprimir colorido 2,20 ou preto e branco 1,20 qual vai querer?"). A lista
   de categorias veio do desenho técnico da demanda 206 (anterior à pesquisa da 234) e nunca foi
   revalidada contra a evidência depois que ela existiu.
2. **"Recebemos tudo, obrigado 😊" está mal aplicado.** A Regra 9 (fechamento curto com
   "obrigado"/"obg") documenta esse tom pra **encerramento de conversa já resolvida**, não pra
   confirmação de recebimento no meio da conversa (isso é papel da Regra 1). Além disso, **não
   está confirmado nem no próprio relatório da 234 se as citações de "obg"/"Obrigado" da Regra 9
   são do CLIENTE agradecendo a equipe, ou da equipe encerrando com o cliente** — isso precisa
   ser reconferido direto na subamostra qualitativa antes de usar como precedente do agente.
3. **"Já chamo a equipe 😊" (escalação) não tem nenhum precedente real citado** — foi inventado
   pra preencher o exemplo, only a mensagem do cliente cancelando tem base real (seção 10.3 do
   mapa de jornada), a resposta da equipe não.

Achado adicional do PM (catálogo real, `jsgrafica_produtos`): existem **15 categorias reais**
(fora as 2 contaminadas já identificadas), com volume extremamente desigual — Impressão papel
ofício/xerox dominam 62-74% do volume real (achado já documentado nas demandas 161/204), enquanto
categorias como "Personalizados" ou "Plastificação" têm poucas unidades. Uma lista tratando as 15
como igualmente prováveis não reflete a realidade.

## Objetivo
Redesenhar os pontos problemáticos com o mesmo rigor de evidência já exigido desde a 234 — cada
mecanismo do documento (não só o texto da mensagem) precisa citar a conversa real que o embasa,
ou ser marcado explicitamente como hipótese/julgamento sem precedente direto.

## ⚠️ Checkpoint obrigatório antes de reescrever
Antes de propor a versão nova, ler de novo a subamostra qualitativa da 234 (os arquivos
`grupo1-5.md` citados no relatório, ou o próprio texto da seção 4 do manual) e confirmar:
(a) a autoria real das citações da Regra 9 (cliente ou equipe?); (b) se existe QUALQUER caso real
de escalonamento/cancelamento em que a equipe respondeu por texto (não só o silêncio testado na
206) — se não existir, documentar isso como ausência confirmada, não presumir.

## Escopo
- Incluído: redesenhar o fluxo de mídia ambígua — pergunta aberta e simples primeiro (grounded na
  Regra 3), lista estruturada só como fallback se a resposta livre continuar ambígua, não como
  primeira tentativa. Se ainda fizer sentido ter lista em algum ponto, priorizar as categorias de
  maior volume real (RAPIDO: P&B A4/Colorida/Xerox/2ª via) antes das raras, não ordem alfabética
  ou técnica.
- Incluído: corrigir a mensagem de confirmação de recebimento — não usar "obrigado" nesse ponto;
  usar o padrão real da Regra 1 (confirmar objetivamente o que foi recebido). Se a checagem do
  checkpoint confirmar que os "obg" da Regra 9 são do cliente, não da equipe, documentar isso
  claramente e não usar mais como precedente de fala do agente.
- Incluído: reescrever a mensagem de escalação/cancelamento com mais cuidado — se não houver
  precedente real (conforme checkpoint), marcar explicitamente como "SIMULADO, sem precedente
  direto no dado analisado" (já é a convenção da própria demanda 234) e desenhar com base nos
  princípios já documentados (carregar contexto completo pro humano, deixar claro que tem opção
  humana disponível) em vez de uma frase curta genérica.
- Incluído: revisar a cobertura de produtos/serviços do documento contra o catálogo real (15
  categorias, `jsgrafica_produtos`) — garantir que os exemplos refletem o peso real de volume
  (RAPIDO dominante), não tratam todas as categorias como igualmente prováveis.
- Incluído: para CADA mensagem do agente no documento (não só as 3 apontadas), produzir uma
  tabela de verificação no relato: mensagem → evidência real citada (telefone/pedido) OU
  "hipótese, sem precedente direto" — não deixar nenhuma sem essa classificação explícita.
- Explicitamente fora de escopo: as 3 decisões da demanda 243 (conectar/lote/escopo) e a
  reestruturação em abas (já feita na 253) — só o conteúdo/mecanismo dos exemplos.

## Critérios de aceite
- [ ] Checkpoint da autoria da Regra 9 e da ausência/presença de precedente de escalonamento
      resolvido antes de reescrever, relatado com evidência
- [ ] Fluxo de mídia ambígua redesenhado: pergunta aberta primeiro, lista só como fallback
      priorizado por volume real
- [ ] Mensagem de recebimento corrigida (Regra 1, não Regra 9 mal aplicada)
- [ ] Mensagem de escalação reescrita, com classificação explícita de evidência (real ou
      hipótese marcada)
- [ ] Tabela de verificação completa: toda mensagem do agente no documento, evidência ou hipótese
- [ ] Artefato (aba "Resultado final") e `.md` fonte atualizados de forma consistente

## Riscos e cuidados
Esta é a 6ª rodada de correção do mesmo documento — o problema até agora não foi falta de
esforço, foi falta de checar o mecanismo contra a evidência de fundo. Priorizar profundidade
sobre velocidade nesta rodada.

## Referências
Demanda 234 (`pm/conhecimento/manual-resposta-ia-100-clientes.md`, seção 4 — Regras 1, 3, 9;
seção 10.3 do mapa de jornada, cancelamento). Demanda 206 (origem da lista de 13 categorias,
anterior à 234). Demandas 161/204 (peso real de volume por categoria). `jsgrafica_produtos`
(catálogo real, 15 categorias).

## Relato de execução

Executada em 2026-07-30 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Reescrevi
`pm/conhecimento/blueprint-conversas-exemplo-agente.md` (novo checkpoint + tabela de verificação
+ tabela de catálogo/volume, adicionados à Parte 2; Exemplos 2/3/4/6 e "outros casos rápidos"
redesenhados na Parte 1) e o artefato HTML nas 2 abas.

### Checkpoint (feito ANTES de reescrever qualquer exemplo, como exigido no escopo)

**(a) Autoria das citações da Regra 9** — reli os 40 casos qualitativos originais da 234
(`grupo1-5.md`, ainda no scratchpad desta sessão). Das 4 citações do manual: **2 reais e de
autoria da EQUIPE** (`558187613253` Otto Silva — 4 ocorrências reais de "Obrigado"/"obg";
`558187734290` Rodrigo Isidoro — "obg", real). **2 citações erradas, achado novo**:
`558188167372` (Ruthe) não tem nenhum "obg"/"Obrigado" em nenhum dos 2 pedidos da conversa
capturada; `558196517857` nem faz parte da subamostra qualitativa de 40 — só existia na
reconstrução estruturada (SQL agregado), o texto nunca foi lido. Conclusão: a Regra 9 continua
válida (2 citações reais confirmam), mas o manual da 234 tem erro de citação — reportado, não
corrigido lá (fora do escopo desta demanda).

**(b) Precedente real de resposta a cancelamento/escalação** — busquei "cancelar"/"desistir" nos
40 casos qualitativos: zero ocorrências. O achado mais antigo sobre "cancelar" (seção 10.3 /
`OBJETIVOS-MACRO.md`) preserva só a conclusão qualitativa, não o texto verbatim da resposta real
da equipe nos "3 casos" que ele menciona. **Confirmado como ausência, não presumido**: não existe
precedente real acessível hoje pra como a equipe responde por texto a cancelamento.

### O que foi feito
1. **Fluxo de mídia ambígua redesenhado** (Exemplo 2): pergunta aberta e simples primeiro
   ("O que você precisa fazer com essa imagem?", marcada HIPÓTESE — sem citação exata, grounded
   só no achado geral 9.4), lista de categorias só como fallback se a resposta livre continuar
   ambígua — nunca mais como 1ª resposta.
2. **Lista de fallback reordenada por volume real**, não alfabética/técnica — reconferi o
   catálogo direto no banco: **14 categorias reais** (não 15 como a estimativa inicial da
   demanda; 2 outras são lançamento financeiro interno, já eram contaminação conhecida).
   "Impressão papel ofício" sozinha é 68,7% dos pedidos reais (792/1150) — tabela completa de
   volume por categoria no documento.
3. **"Obrigado" removido da confirmação de recebimento** (Exemplo 3, rajada) — trocado por
   confirmação objetiva sem "obrigado" (Regra 1), reservando "obrigado" só pro encerramento real
   (Exemplo 1, já estava certo ali).
4. **Mensagem de escalação reescrita e marcada com hipótese explícita** (Exemplos 4, 6, "outros
   casos rápidos") — cada uma agora tem uma nota inline dizendo que não tem precedente real,
   citando o checkpoint, e o texto foi redesenhado a partir de 2 princípios documentados (nunca
   fingir que resolveu sozinho; deixar claro que humano assume com contexto completo).
5. **Tabela de verificação completa**: 17 linhas cobrindo toda mensagem do agente na Parte 1,
   classificadas em 3 níveis (EVIDÊNCIA DIRETA / PADRÃO GERAL / HIPÓTESE) — não um binário
   real/simulado, que mistura confiança de tom com precedência de mecanismo. Resultado: 3
   mensagens com evidência direta (todas texto de produção já existente — Pix, confirmação de
   pagamento, "Obrigado"), 6 com padrão geral (regra com múltiplos casos reais, frase específica
   nova), 8 hipótese explícita (mensagens de escalação/transição, onde o dado real é mais fraco
   porque hoje 100% do atendimento é humano). Tabela completa no `.md`, versão condensada no
   artefato.

### Testes realizados e resultado
Sem execução de código. Verificação: reconferi diretamente nos arquivos brutos da subamostra
qualitativa (não de memória) as 4 citações da Regra 9, uma a uma; rodei consulta SQL direta em
`jsgrafica_produtos`/`jsgrafica_pedidos` pra confirmar contagem de categorias e volume real
(792/90/64/59/35/21/19/18/15/12/8/8/5/4).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **2 citações erradas na Regra 9 do manual da demanda 234** — reportado ao PM, não corrigi o
  arquivo da 234 diretamente (pertence a outra demanda).
- **Contagem "15 categorias" da própria demanda 254 estava um pouco alta** — reconferido, são 14
  categorias reais ativas hoje (a diferença não muda nenhuma decisão, só corrigido o número).

### Status final
Concluída. Os 6 critérios de aceite atendidos: checkpoint feito e relatado com evidência antes de
qualquer reescrita; fluxo de mídia ambígua redesenhado (pergunta aberta primeiro, lista fallback
priorizada por volume real); mensagem de recebimento corrigida (Regra 1, sem "obrigado");
mensagem de escalação reescrita com classificação explícita de hipótese; tabela de verificação
completa (17 mensagens, 3 níveis de classificação); artefato (aba "Resultado final" + aba
"Parte técnica") e `.md` fonte atualizados de forma consistente, mesma URL.
