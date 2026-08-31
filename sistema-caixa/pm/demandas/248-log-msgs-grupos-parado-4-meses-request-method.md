# 248 — `jsgrafica_log_msgs_grupos` sem receber linha real desde 2026-03-12 (coluna faltando)

Status: encerrada (não necessário)
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: 2026-07-29 (encerrada sem execução, decisão explícita do Edvam)
Chat executor: — (não despachada)

## Contexto
Achado da demanda 245, descoberto por acaso (não fazia parte do escopo original): a tabela
`jsgrafica_log_msgs_grupos` não tem a coluna `request_method`, que o node `Processar Evento` do
workflow `01` sempre inclui no payload de insert (`autoMapInputData`). A tabela irmã
`jsgrafica_log_msgs_privadas` TEM essa coluna — o schema divergiu entre as duas em algum momento.
Resultado: todo insert de mensagem de grupo falha com
`"Could not find the 'request_method' column of 'jsgrafica_log_msgs_grupos' in the schema cache"`.

Confirmado com dado real: a última linha real da tabela é de **2026-03-12** — ou seja, o log de
mensagens de grupo está **completamente parado há quase 4,5 meses**, silenciosamente, sem
nenhum erro visível em lugar nenhum até agora.

Esse é exatamente o padrão de risco que uma memória antiga do projeto já tinha sinalizado
("`autoMapInputData` com coluna faltando causa erro silencioso") — confirmado se concretizando
numa tabela inteira parada por meses.

## Objetivo
`jsgrafica_log_msgs_grupos` volta a receber mensagens de grupo normalmente, e confirma-se o
tamanho real da perda de dado do período parado.

## ⚠️ Checkpoint obrigatório antes de mexer
Confirmar a estrutura completa de `jsgrafica_log_msgs_privadas` (fonte de verdade do schema
esperado) e comparar coluna a coluna com `jsgrafica_log_msgs_grupos` — pode haver mais de uma
divergência, não presumir que `request_method` é a única. Reportar a lista completa de diferenças
ao PM antes de aplicar qualquer migration.

## Escopo
- Incluído: comparar o schema completo das duas tabelas (`jsgrafica_log_msgs_privadas` vs.
  `jsgrafica_log_msgs_grupos`), não só a coluna já identificada.
- Incluído: adicionar a(s) coluna(s) faltante(s) em `jsgrafica_log_msgs_grupos`, mesmo tipo/
  nullable da tabela irmã.
- Incluído: testar com evento sintético de grupo (mesma técnica já usada nas demandas 236/237/
  239/241/245) que o insert passa a funcionar depois da correção.
- Incluído: confirmar se há alguma forma de recuperar dado perdido no período (verificar se existe
  backup/snapshot do Supabase anterior a alguma correção acidental de schema, ou se os dados
  originais da Z-API/n8n ficaram em algum lugar recuperável) — reportar o que for encontrado, sem
  prometer recuperação se não for tecnicamente possível.
- Incluído: se não houver como recuperar, documentar claramente o intervalo de dado perdido
  (2026-03-12 até a data da correção) como lacuna permanente e conhecida, não escondida.
- Explicitamente fora de escopo: os 2 outros achados da demanda 245 relacionados a workflow
  (`PREPARAR LOG MSG GRUPOS` quebrando via `07-GRUPO-PEDIDOS`) — isso é lógica de n8n, não schema,
  e depende de um caminho já descontinuado; não faz parte desta demanda.

## Critérios de aceite
- [ ] Schema das 2 tabelas comparado por completo, não só a coluna já identificada
- [ ] Coluna(s) faltante(s) adicionada(s)
- [ ] Testado com evento sintético de grupo — insert funciona sem erro
- [ ] Investigado (e reportado, mesmo que negativo) se há como recuperar dado do período parado
- [ ] Extensão real da lacuna (2026-03-12 até a correção) documentada com clareza

## Riscos e cuidados
Prioridade alta — é perda de dado real e silenciosa, de quase metade do ano. Migration é aditiva
(adicionar coluna), baixo risco técnico em si; o cuidado maior é não afirmar que o dado foi
recuperado se não for tecnicamente verdade.

## Referências
Demanda 245 (achado original, `pm/demandas/245-*.md`, seção "Achados fora do escopo").
`jsgrafica_log_msgs_privadas` (schema de referência).

## Relato de execução

**Não despachada — encerrada por decisão explícita antes da execução.**

Antes de despachar, o PM verificou 2 coisas a pedido do Edvam: (1) quais grupos essa tabela
loga — confirmado, são grupos internos da equipe/negócio ("Arquivos JS 🗃️", "Avisos e reposições
das mercadorias", "Equipe JS Gráfica", etc.), nunca atendimento a cliente (JS Gráfica não atende
cliente em grupo); (2) se algo no sistema real lê essa tabela hoje — busca completa no código do
`caixa-js-grafica` (`app/`, `components/`, `lib/`): **zero arquivo referencia
`jsgrafica_log_msgs_grupos`**. É um log passivo sem nenhum consumidor real.

Diante disso, o Edvam decidiu conscientemente **não corrigir** — a tabela não tem uso real hoje,
não vale o esforço. Registrado como decisão de produto, não como bug esquecido: a lacuna de dado
(2026-03-12 em diante) existe e é conhecida, mas foi avaliada como sem impacto porque nada
depende dela.

- Status final: encerrada, não necessário (decisão do Edvam, 2026-07-29)
