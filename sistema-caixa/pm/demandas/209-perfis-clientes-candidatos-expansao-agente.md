# 209 — Perfis de clientes candidatos pra expansão gradual do agente

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-07-17
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Decisão do Edvam (2026-07-17): a expansão do agente (Fase B) pra cliente real vai ser gradual,
adicionando usuários aos poucos — mas antes de decidir por quem começar, ele pediu uma avaliação
de perfil real: identificar clientes recorrentes, com fluxo de demanda e comportamento padrão,
pra validar se os gatilhos do agente resolvem o atendimento deles de verdade. Não é escolher
número ao acaso — é usar o dado real já levantado (204/205) pra encontrar quem tem MAIOR chance
de já ser bem atendido pelo desenho atual, minimizando risco no início da expansão.

## Objetivo
Uma lista de candidatos reais (telefone + perfil resumido) pra serem os primeiros números
adicionados na whitelist do agente, ordenados por quão bem o padrão histórico deles se encaixa no
que a Fase 1 já cobre — com o raciocínio de cada escolha documentado, não só uma lista solta.

## Escopo
- Incluído:
  1. **Critério de "recorrente"**: cliente com 3+ sessões que viraram pedido no recorte já usado
     na 204/205 (2026-07-01 a 2026-07-17) — ajustar o corte se o volume ficar pequeno demais,
     documentar a decisão.
  2. **Critério de "fluxo padrão"**: maioria das sessões desse cliente cai nos tipos de serviço
     "rápidos" já identificados na 204 (Impressão P&B A4, Colorida, Xerox, 2ª via — não os
     "lentos por natureza" como currículo/digitação, que já são escalados por design) E maioria
     das sessões começando por mídia sem legenda (único escopo da Fase 1 hoje).
  3. **Critério de "comportamento sem debate"**: cliente sem histórico de cair nas sessões-outlier
     da 204 (ou caindo raramente) — cruzar com a lista de causas de debate já categorizada
     (seção 10.3 do mapa de jornada) pra ver se algum candidato tem padrão recorrente de UMA causa
     específica (ex. sempre negocia pagamento) que ainda não tem gatilho pronto (depende do que a
     208 entregar).
  4. **Checagem técnica leve por candidato**: telefone não está contaminado por outro tráfego
     (mesmo cuidado de sempre, `project_log_dados_contaminados`), não é o número de teste/whitelist
     já usado, não tem sinal de confusão com a Dizu no histórico.
  5. Entregar uma lista ordenada (do mais seguro pro menos seguro pra começar), com o perfil
     resumido de cada um (quantas sessões, qual serviço típico, tempo de resposta típico,
     qualquer causa de debate já vista) — sugestão de quantos começar por vez é do Edvam, não
     desta demanda, mas pode recomendar um número inicial se o dado sugerir algo óbvio.
- Fora de escopo: qualquer alteração de whitelist de verdade (`jsgrafica_telefones_autorizados`)
  — essa demanda só entrega a lista, adicionar de fato é decisão separada do Edvam.

## Critérios de aceite
- [ ] Lista de candidatos reais, ordenada, com perfil resumido e raciocínio de cada um
- [ ] Critérios de recorrência/fluxo padrão/sem debate aplicados e documentados
- [ ] Checagem de contaminação/confusão Dizu feita por candidato
- [ ] Nenhuma alteração de dado (100% investigação)

## Riscos e cuidados
Não expor dado pessoal desnecessário do cliente além do que já é usado nas investigações
anteriores (telefone, nome quando já público no sistema, padrão de pedido) — mesmo cuidado de
sempre.

## Referências
Demanda 204 (padrão por tipo de serviço, causas de debate). Demanda 205 (tempo de resposta por
tipo). Demanda 208 (gatilhos que vão existir de verdade até a expansão acontecer).
`project_log_dados_contaminados` (memória).

## Relato de execução

**Status: concluída.** Seção 12 adicionada ao `pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`.
100% investigação, nenhuma alteração de dado (whitelist não foi tocada).

### Método
Mesma janela/exclusões da 204/205 (2026-07-01 a 17). Corte de "recorrente" (3+ sessões com
pedido) mantido — deu 8 candidatos, volume suficiente, não precisou ajustar. Pra cada um: % de
sessões em serviço "rápido" (P&B A4/Colorida/Xerox/2ª via) vs "lento por natureza", % começando
por mídia sem legenda, checagem de sessão-outlier (mesma definição de mensagens/tempo da 204,
lendo o conteúdo quando havia outlier — não só contando), e checagem individual de contaminação/
Dizu (não só um sinal agregado — confirmei o texto real antes de excluir alguém).

### Achado que exigiu decisão de critério
Nenhum dos 8 candidatos cumpre ao mesmo tempo os 2 critérios de "fluxo padrão" (maioria em
serviço rápido E maioria começando por mídia) — os 3 melhores por "serviço rápido + zero
outlier" ficam entre 0% e 50% de sessões começando por mídia. **Registrei isso como achado
honesto, não escondido**: mesmo os candidatos mais seguros vão acionar o agente (Fase 1, só
mídia sem legenda) numa fração menor das interações reais deles — calibra a expectativa de
volume, não invalida a expansão.

### Achado que mudou o resultado de um candidato
**André Américo (558197252103)** tinha o padrão de pedido mais limpo à primeira vista (3/3
sessões em Impressão P&B A4, zero outlier) — mas a checagem de contaminação encontrou confusão
REAL e recorrente com a Dizu Refeições no mesmo número (2 pedidos de quentinha confirmados,
texto real lido, não só o sinal de palavra-chave). **Excluído da lista recomendada** apesar do
padrão de gráfica ser bom — risco real de o agente confundir pedido de comida com pedido de
gráfica no mesmo fio.

### Lista final (resumo, detalhe completo no documento)
1. Maria da Conceição Silva (558188768207) — melhor candidato, 100% P&B A4, zero outlier/
   contaminação, 50% começa por mídia.
2. Otto Silva (558187613253) — 100% serviço rápido, zero outlier/contaminação, 25% mídia.
3. Jociane Araújo (558199159103) — 100% serviço rápido, zero outlier/contaminação, 0% mídia.
4. Carmem Lúcia (558186508876) — maioria limpa, 1/3 outlier (produto especial).
5. José Roberto Silva (558191414184) — padrão conhecido de debate (múltiplas etapas de
   acabamento, já documentado na 204) — recomendo esperar a demanda 208 (gatilhos) concluir.
6-7. Vlademir Ribeiro e Vivian Cavalcante — não recomendados, maioria fora do escopo rápido.
8. André Américo — excluído (contaminação Dizu confirmada).

**Sugestão de tamanho inicial** (decisão é do Edvam): começar com os 2-3 primeiros da lista.

### Achados fora do escopo
Nenhum novo além do já registrado (a limitação de "nenhum candidato começa maioria por mídia" já
foi documentada como achado do próprio critério, não escondida).

### Critérios de aceite
- [x] Lista de candidatos reais, ordenada, com perfil resumido e raciocínio de cada um
- [x] Critérios de recorrência/fluxo padrão/sem debate aplicados e documentados (incluindo o
      achado honesto de que nenhum cumpre 100% os 2 critérios de fluxo padrão ao mesmo tempo)
- [x] Checagem de contaminação/confusão Dizu feita por candidato (achou 1 exclusão real)
- [x] Nenhuma alteração de dado (100% investigação) — whitelist não foi tocada
