# 330 - Piloto do Caminho C: forçar decisão formal de continuar/expandir/cortar

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

O piloto do Caminho C (demanda 299) foi anunciado com prazo de 4 dias, 18/08 a ~22/08. Hoje,
27/08, ele segue rodando sem nenhum registro de decisão formal do Edvam de continuar, expandir a
whitelist ou cortar. Achado na varredura completa de hoje.

## Objetivo
Não é uma correção de código. É o `06-Atendimento` compilar o resultado real do piloto até aqui
(taxa de acerto, escalações, bugs achados e corrigidos, achados ainda abertos como a 328) numa
recomendação objetiva pro Edvam decidir: continuar como está, expandir a whitelist pra algum
cliente real, ou pausar. Depende da 328 (achado mais crítico: ferramenta de pedido/Pix nunca
confirmada sendo acionada pela IA) estar resolvida ou pelo menos testada antes de qualquer
recomendação de expansão.

## Escopo
- Incluído: relatório de recomendação, sem mudança nenhuma de roteamento real.
- Explicitamente fora de escopo: qualquer mudança de whitelist ou de comportamento do agente sem
  confirmação explícita do Edvam depois da recomendação.

## Referências
Demanda 299, `pm/conhecimento/caminho-c-mapa-decisoes-completo.md`, demandas 305-328.

## Relato de execução

### O que foi feito
Relatório completo em `pm/conhecimento/caminho-c-piloto-recomendacao-330.md`, montado com dado
real (Supabase consultado direto, não por memória): whitelist real (6 telefones, todos internos),
volumetria real da IA desde 18/08 (103 respostas, 99 concentradas em 1 único telefone de teste),
os 17 bugs achados/corrigidos durante o piloto com data e origem, e checagem cruzada de cada
demanda 305-328 lida na fonte, não só resumida por terceiros.

**Recomendação entregue**: continuar restrito à whitelist interna, não expandir pra cliente real
ainda, não pausar. Só 1 condição pendente antes de expandir: auditoria dos branches de mídia
irmãos do bug achado na 322. A outra condição original (teste controlado limpo de pedido/Pix,
relacionada à 328) foi satisfeita durante a execução desta mesma demanda, quando o `01-N8N`
concluiu a 328 com um teste real (`ped-3833`) antes deste relatório ser fechado, atualizado no
relatório e nesta seção antes da entrega final.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
1. **Achado novo, não catalogado em nenhum resumo anterior desta demanda**: a demanda 322 (dona
   do `01-N8N`) documenta que hoje, 27/08, um bug de roteamento real desviou uma mensagem do
   telefone de teste do piloto pro agente legado sem guardrail (`JSGRAFICA_ATENDIMENTO_AI`), que
   cotou R$ 9,00 pra um produto que custa R$ 2,50 de verdade. Corrigido no mesmo dia pelo
   `01-N8N`, mas os branches de mídia irmãos (`image`, `video`, `audio`) do mesmo padrão de bug
   não foram auditados ainda, incluído como condição na recomendação.
2. **Achado independente sobre a demanda 328**: antes de saber que o `01-N8N` já tinha concluído a
   328 com teste controlado (`ped-3833`), consultei o log de mensagens real (não as demandas
   escritas) e achei, por conta própria, evidência de que a IA já tinha chamado
   `criar_pedido_aguardando_aprovacao` + `gerar_cobranca_pix` corretamente em 18/08 (pedido
   `ped-3149`, Pix real gerado), dentro de uma sessão de teste bagunçada. Mantido no relatório como
   confirmação independente, de fonte diferente, já reconciliado com o resultado real e mais forte
   da 328.

### Status final
Concluída. Nenhuma mudança de roteamento ou comportamento do agente feita (fora de escopo por
definição da própria demanda). Recomendação objetiva entregue pro Edvam decidir.
