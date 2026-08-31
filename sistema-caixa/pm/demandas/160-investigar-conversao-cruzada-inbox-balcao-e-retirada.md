# 160 — Complemento da 159: conversão cruzada Inbox→balcão e revisão do padrão de retirada

Status: aprovada — liberada
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: —
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Continuação da demanda 159 (mapa da jornada de atendimento). O Edvam revisou os achados e trouxe
2 correções de perspectiva importantes antes de qualquer desenho de automação:

**1. Hipótese não testada na 159**: "o que acontece muitas vezes é que as pessoas falam no Inbox
mas não fecham o pedido, e quando têm tempo vão presencialmente e fazem o mesmo pedido no
balcão." A 159 mediu conversão como "contato novo → pedido vinculado a QUALQUER canal"
(~44-49%), mas não testou especificamente se contatos que conversaram no Inbox e NÃO geraram
pedido ali depois aparecem como pedido de balcão. Se uma fatia relevante do "não convertido" da
159 na verdade converteu por outro canal, a leitura de "atendimento que não vira venda" muda.

**Viabilidade confirmada pelo PM antes de escrever esta demanda**: existem 333 pedidos com
telefone em formato numérico real (não o literal `"balcao"`) gravados desde 2026-07-01 — inclui
tanto pedidos nascidos no Inbox quanto pedidos de balcão com contato vinculado (campo "Vincular
contato (opcional)" do balcão, ou nome/telefone capturados no fluxo "retira depois" da demanda
146). Dá pra cruzar.

**2. O padrão "pede via Inbox, aguarda produção real, retira depois" EXISTE de verdade** — ex.
imprimir grande quantidade de páginas, manda o arquivo, tira xerox, retira tempos depois. O
Edvam confirma isso acontece. **Mas a demanda 159 mediu isso numa janela onde a infraestrutura
pra capturar esse padrão corretamente ainda não existia direito**: a Fase 5 da Jornada do Pedido
(demanda 156, unificando "retira depois" do balcão na mesma esteira de produção do Inbox — antes
pulava direto pra "aguardando_retirada" sem passar por confirmado/em_producao/pronto) só foi
**deployada hoje, 2026-07-10**, no mesmo dia da janela de dados analisada pela 159. Ou seja: o
achado "o padrão de espera real quase não aparece" pode refletir uma limitação de como o sistema
registrava isso até agora, não a ausência real do comportamento do cliente.

## Objetivo
Duas coisas: (1) medir se conversas de Inbox sem pedido vinculado geram pedido de balcão depois,
com o mesmo contato; (2) documentar claramente que o padrão de retirada com espera real precisa
ser remedido daqui pra frente (pós-156), não julgado pelos dados de antes — sem forçar conclusão
que os dados de 5 dias não sustentam.

## Escopo
- Incluído, só-leitura:
  1. **Conversão cruzada Inbox→balcão**: pra uma amostra de contatos que tiveram conversa
     iniciada no Inbox (usar a mesma base de "início de sessão" da 159) e NÃO têm pedido
     vinculado àquele telefone dentro de, digamos, 48h da conversa — verificar se existe um
     pedido de balcão (com contato vinculado, nome batendo ou telefone batendo) do mesmo cliente
     em até alguns dias depois. Documentar a taxa encontrada e os casos concretos (não só o
     número — mostrar 3-5 exemplos reais).
  2. **Limitação a documentar, não investigar com código**: registrar explicitamente, no
     relatório, que a "taxa real de conversão" pode estar subestimada tanto pela conversão
     cruzada do item 1 quanto pela limitação de infraestrutura do item 2 do Contexto (pré-156).
     Recomendar reavaliar o padrão de retirada com espera real depois de 2-3 semanas de dado
     pós-156 (não é pra fazer essa remedição agora, só deixar marcado o que fazer e quando).
  3. Se a amostra do item 1 permitir, comentar informalmente (não precisa de rigor estatístico
     alto) se o padrão de conversão cruzada é mais comum em algum tipo de serviço específico
     (ex. serviços que geram dúvida de preço/prazo que a pessoa prefere resolver "ao vivo" no
     balcão).
- Fora de escopo: propor solução, desenhar automação, mexer em código. Segue investigação, como
  a 159.

## Registrado à parte (não é escopo desta demanda, só contexto pro PM já anotar)
**Dizu Refeições**: o Edvam esclareceu que é uma empresa do mesmo grupo (LabOnchain), e vai
ganhar um sistema próprio (parecido com o da JS Gráfica) pro ramo de alimentação, com **número
de WhatsApp exclusivo** — isso muda o enquadramento do achado da 159: não é "gente errando de
negócio pra sempre", é tráfego que deve migrar pra um número próprio quando esse sistema existir.
Enquanto isso não acontece, qualquer agente de atendimento da JS Gráfica ainda precisa saber
reconhecer e não tratar como pedido de gráfica — mas o objetivo de longo prazo não é "filtrar
Dizu pra sempre", é essa migração. Registrado em `pm/OBJETIVOS-MACRO.md`.

## Critérios de aceite
- [ ] Taxa de conversão cruzada Inbox→balcão medida, com exemplos concretos (não só o número)
- [ ] Relatório documenta explicitamente a limitação de dado pré-156 pro padrão de retirada com
      espera real, com recomendação de quando remedir
- [ ] Nenhuma alteração em nenhuma tabela — investigação 100% só-leitura

## Referências
Demanda 159 (`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`, investigação original).
Demanda 156 (Fase 5 da Jornada do Pedido, deployada 2026-07-10 — motivo da limitação de dado).
Demanda 146 (captura de nome/telefone em "retira depois" do balcão, fonte de vínculo pro item 1).

## Relato de execução

**Status: concluída.** Complemento adicionado em
`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md` (seção "7. Complemento (demanda 160)").
100% só-leitura — nenhuma tabela alterada.

### 1. Conversão cruzada Inbox→balcão

Reaproveitei a metodologia de "início de sessão" da 159, janela 2026-07-01 a 2026-07-06 (com
folga até hoje 10/07 pra observar conversão tardia). Excluí 1 contato de teste óbvio (DDD do Rio
de Janeiro, repetindo item de teste dezenas de vezes) e 1 nome genérico (`J S Gráfica`) que dava
falso match.

- 152 sessões de Inbox sem pedido vinculado em 48h.
- 21 (13,8%) aparecem com pedido depois das 48h.
- Dessas 21, separei por "teve mensagem de WhatsApp até 2h antes do pedido" (proxy de continuar
  no mesmo canal vs. sumir e reaparecer só como pedido): **17 (11,2% do total) têm mensagem
  perto — é continuação tardia da mesma conversa de Inbox, não troca de canal. 4 (2,6% do total)
  não têm — sinal real de conversão cruzada Inbox→presencial.**
- Confirmei o conteúdo de conversa dos 4 casos (exemplos concretos, não só o número): Wilson Reis
  manda o arquivo e escreve "Imprimir a 2,3 e4 folha ok"/"Tô indo buscar", sem confirmação clara
  na conversa — o pedido só é lançado no sistema 2 dias depois, por Gabi. Luciano Araújo e
  Beronice Maria seguem o mesmo padrão (mídia sem texto, pedido registrado 2-3 dias depois).
- **Conclusão**: a hipótese do Edvam é real e confirmada com casos concretos, mas no recorte
  medido é uma fatia pequena (2,6%) comparada à simples continuação tardia no próprio Inbox
  (11,2%). Isso subestima levemente a taxa de conversão de 44-49% da 159 — ajuste marginal, não
  mudança de leitura. Não achei um tipo de serviço específico mais associado a esse padrão (os 4
  casos e a maioria dos 17 são o serviço mais comum, IMPRESSÃO P&B A4 — não um padrão distinto de
  "dúvida que se resolve melhor ao vivo").

### 2. Limitação documentada — padrão de retirada com espera real, dado pré-156

Registrado explicitamente no relatório: o achado da 159 (item 3, "Pix antecipado, retira depois"
quase não aparece) foi medido inteiramente antes ou no mesmo dia do deploy da Fase 5 da Jornada
do Pedido (demanda 156, hoje 2026-07-10) — que só agora unifica o "retira depois" do balcão na
mesma esteira de estados do Inbox. A ausência do padrão nos dados pode ser limitação de captura,
não ausência real do comportamento (o Edvam confirma que o padrão existe). **Não remedido agora**
(fora de escopo) — recomendação registrada: reavaliar em 2-3 semanas de dado pós-156 (meados/fim
de julho de 2026).

### Achados fora do escopo
Nenhum novo — a nota sobre a Dizu Refeições virar sistema próprio (registrada à parte pelo Edvam,
não escopo desta demanda) já foi incorporada ao resumo executivo do relatório da 159/160, e
também merece registro em `pm/OBJETIVOS-MACRO.md` (fora do meu escopo de execução, sinalizando
pro PM).

### Critérios de aceite
- [x] Taxa de conversão cruzada Inbox→balcão medida (2,6% do total, 21/152 com pedido tardio, dos
      quais 4 sem mensagem próxima), com exemplos concretos (Wilson Reis, Luciano Araújo,
      Beronice Maria)
- [x] Relatório documenta explicitamente a limitação de dado pré-156 pro padrão de retirada com
      espera real, com recomendação de remedir em 2-3 semanas
- [x] Nenhuma alteração em nenhuma tabela — investigação 100% só-leitura
