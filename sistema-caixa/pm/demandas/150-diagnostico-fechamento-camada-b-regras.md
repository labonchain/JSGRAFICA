# 150 — Diagnóstico de Fechamento (Camada B/4): regras de detecção automática

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto — plano geral (Camada A concluída e validada)
A Camada A (demanda 149) entrega os dados brutos organizados. Fechando o dia 09-07-26 agora
(2026-07-10), o PM achou manualmente, olhando o JSON da 149, **5 pedidos de teste** (Xerox
R$0,45, telefone genérico "balcao", Pix nunca confirmado, criados em sequência rápida durante os
testes das demandas 141/145/146/147) contaminando o total do dia. Isso é exatamente o tipo de
coisa que devia ser sinalizado sozinho, sem o PM precisar ler o JSON na mão — é o objetivo desta
camada.

## Objetivo
O mesmo endpoint da Camada A passa a devolver também uma lista de **sinais** (findings)
detectados por regra determinística — sem IA ainda, sem inventar nada, só apontar padrões já
conhecidos.

## Escopo
- Incluído:
  1. Estender `GET /api/fechamento/diagnostico` com um array novo, `sinais`, cada item com
     `tipo`, `severidade` (info/atenção/crítico), `descricao`, e referência ao registro
     (pedido/saída) envolvido.
  2. Regras iniciais (baseadas em casos reais já vistos nesta sessão):
     - **Pedido Pix não confirmado, telefone genérico** (`balcao` sem `nomeCliente`, ou telefone
       de contato conhecido como teste) — sinal de teste esquecido.
     - **Múltiplos pedidos idênticos** (mesmo serviço + valor + operador, criados em minutos um do
       outro) — sinal de teste repetido/duplicado.
     - **Saída de categoria "Repasse Recarga..." sem pedido vinculado correspondente no dia** (ou
       o inverso: pedido de recarga sem repasse lançado) — sinal de lançamento faltando.
     - **Pedido com telefone em formato `@lid`** — sinal do problema já mapeado nas demandas
       126/134/135 (não deveria mais acontecer, mas sinalizar se acontecer).
     - **Fechamento por operador com divergência acima de um limiar** (ex. R$20) — sinal de
       possível erro de contagem, mesmo já sabendo que geralmente é o padrão da 080 (comparação
       errada) — sinalizar mesmo assim, pra revisão.
  3. Cada regra deve citar o(s) registro(s) exato(s) que a disparou — nunca um aviso genérico sem
     apontar o quê.
- Fora de escopo: narrativa em português/IA (Camada C). Corrigir automaticamente qualquer coisa
  encontrada — só sinalizar, correção continua sendo decisão humana.

## Critérios de aceite
- [ ] Rodar contra o dia 09-07-26 (antes da limpeza que o PM fez na mão) e confirma que os 5
      pedidos de teste teriam sido sinalizados automaticamente
- [ ] Rodar contra um dia limpo (ex. 08-07-26, já reconciliado) e confirma que não aparece sinal
      falso-positivo
- [ ] Cada sinal referencia o registro exato, não é genérico

## Referências
Demanda 149 (Camada A, base de dados). Esta conversa (2026-07-10) — achado real que motivou a
regra dos pedidos de teste.

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_9maTX5fDkiirmguwWKC4qxDZayjF`,
verificado em produção.

### O que foi feito
O endpoint da 149 ganhou o array `sinais` — cada item com `tipo`, `severidade`
(`info`/`atencao`/`critico`), `descricao` em português citando valores/operador, e `registros`
(`{tabela: pedido|saida|fechamento, id}`) apontando o(s) registro(s) EXATO(s). Regras puras sobre
os dados que a Camada A já coleta (só 1 consulta nova: categoria dos produtos do dia, pra
distinguir recarga VEM de celular). Nenhuma correção automática — só sinaliza.

**Regras implementadas** (todas calibradas contra dados reais de 08/09-07 antes de fechar):
1. `pix_nao_confirmado_telefone_generico` (atenção) — Pix escolhido + nunca confirmado + telefone
   "balcao" sem nome. O padrão exato dos 5 testes de 09-07.
2. `pedidos_identicos_em_sequencia` (atenção) — mesmo serviço+valor+operador, gaps ≤10min,
   considerando SÓ os não confirmados. **Calibração que importou**: (a) no dia limpo a Gabi
   entregou 5+ impressões idênticas em minutos, todas confirmadas — rotina real, não dispara;
   (b) agrupar só os pendentes evita que vendas reais confirmadas do mesmo produto "diluam" um
   lote de testes (aconteceu no primeiro teste; corrigido).
3. Recargas, separadas por fluxo: `recarga_vem_sem_repasse` e `saida_repasse_vem_sem_pedido`
   (atenção — VEM é automático/vinculado desde a 104); `recarga_celular_sem_repasse_manual`
   (atenção — o incidente real da 128); `saida_repasse_celular_vinculada` (atenção — automático
   de celular foi desligado na 128, vínculo novo é regressão);
   `saida_repasse_celular_sem_pedido_no_dia` (info — pode ser repasse legítimo de dia anterior).
4. `telefone_formato_lid` (crítico) — telefone com `@` (126/134/135).
5. `divergencia_fechamento_geral` / `divergencia_operador_acima_limiar` (atenção, limiar R$20,
   `LIMIAR_DIVERGENCIA` no código) — sinaliza pra revisão, como a demanda manda.

### Critério 1 — 09-07-26 com os 5 pedidos de teste
O PM já tinha limpado os 5; foram **reinseridas réplicas fiéis** (XEROX R$0,45, telefone
"balcao", pix/pix nunca confirmado, entregues com ~2min de gap) só pra validação, e apagadas em
seguida. Resultado: **os 5 sinalizados duas vezes** — individualmente (regra 1, 5 sinais) e como
lote (regra 2, 1 sinal citando exatamente os 5 ids). De brinde, o dia também sinalizou a
divergência geral (R$94,60) e a da Zu (R$45,35), com a Gabi (R$-18,55) corretamente abaixo do
limiar; zero alarme de recarga (as 4 VEM do dia estavam vinculadas e o par celular manual
existia).

### Critério 2 — dia limpo 08-07-26
**Zero falso positivo nas regras de contaminação** (teste esquecido, duplicado, recargas): os
pares idênticos reais da Gabi não dispararam. Os sinais que aparecem são os que a demanda manda
aparecer mesmo: 2 divergências de operador (Gabi R$100,90, Zu R$28,05 — "sinalizar mesmo assim,
pra revisão") e o achado abaixo.

### ⚠️ Achado real da Camada B (pro PM encaminhar)
A regra do LID pegou um problema REAL e recorrente: **16 pedidos de 09-07 e 12 de 08-07 com
telefone em formato `@lid`** (ex. ped-0456, ped-0468... — ids completos no endpoint). Ou seja: a
correção da 134 protege o log do n8n, mas pedido novo criado pelo Inbox ainda nasce com o phone
LID da conversa — o problema das 126/134/135 continua produzindo dado novo contaminado. Não é
falso positivo: é exatamente o que a regra existe pra pegar ("não deveria mais acontecer, mas
sinalizar se acontecer"). Fora do escopo desta demanda corrigir — fica o sinal pro PM decidir o
encaminhamento (provável 01-N8N/02-DADOS).

### Testes/deploy
`tsc` e build limpos; réplicas apagadas após o teste (o dia 09-07 voltou ao estado pós-limpeza
do PM); produção verificada nos 2 dias (08-07: 14 sinais = 12 lid + 2 divergências; 09-07: 18 =
16 lid + 2 divergências — sem os sinais de teste, que era o esperado com os dados já limpos).

### Critérios de aceite
- [x] 09-07-26 (com os 5 testes reinseridos): os 5 sinalizados automaticamente, por 2 regras
- [x] 08-07-26 limpo: nenhum falso positivo nas regras de contaminação (divergências e LID são
      sinais verdadeiros previstos pela demanda)
- [x] Todo sinal cita registro exato (ids de pedido/saída/fechamento), nunca aviso genérico

**Camadas C (narrativa IA) e D (tela) NÃO iniciadas — aguardando validação do PM desta camada.**
