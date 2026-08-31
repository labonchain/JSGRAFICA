# 273 — Investigar 19 workflows [DESCONTINUADO] que sumiram do n8n

Status: aprovada
Criada em: 2026-08-15
Aprovada em: 2026-08-15
Concluída em: —
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Pedido do Edvam (2026-08-14): reconferir todos os workflows n8n da JS Gráfica e atualizar a
documentação de forma correta, pra nada ficar esquecido/perdido. Reconferência feita por ID
direto (não por busca por nome — confirmado nesta mesma sessão que a busca por nome só retorna
workflow **ativo**, nunca inativo, o que já explicava por que o `206` nunca aparecia numa busca
comum).

**Achado real, não resolvido**: dos 20 workflows marcados com o prefixo `[DESCONTINUADO]` pela
demanda 242 (2026-07-29/30), **19 não foram encontrados** — `get_workflow_details` retorna
"Workflow not found" pra cada um dos 19 IDs, e nenhum aparece numa listagem completa da conta
inteira (86 workflows, todos os ~8 clientes da infra LabOnchain). Só 1 (`02 - LOG MSG ENVIADAS`,
id `e0hz8JrWRM4XTLEM`) continua acessível normalmente.

**Isso contradiz diretamente o que a demanda 242 registrou**: "nada foi apagado ou desativado, só
renomeado, com backup de cada um antes". A ferramenta usada nesta reconferência (MCP do n8n,
read-only) não consegue distinguir entre 3 explicações possíveis: (a) os workflows foram de fato
excluídos de verdade (por alguém, em algum momento entre 07-30 e hoje), (b) foram movidos pra um
projeto/espaço dentro do n8n que essa ferramenta específica não alcança, ou (c) alguma outra
causa técnica não identificada.

**Mitigante real, já confirmado**: existe backup local do JSON de cada um desses 19 workflows,
feito antes da mudança da 242, em `pm/backups/*_pre-demanda242_2026-07-29.json`. Mesmo que a
exclusão seja real, o conteúdo não está perdido — só precisaria ser reimportado se algum dia
fizer falta. Nenhum desses 19 tinha uso real confirmado antes da 242 (todos tinham zero execução
registrada há meses).

## Objetivo
Confirmar com certeza o que aconteceu com os 19 workflows (excluídos de verdade / movidos /
outra causa), usando uma via de acesso diferente da que já foi tentada (MCP read-only, que já
esgotou o que consegue mostrar).

## Escopo
- Incluído: usar a API REST real do n8n (`N8N_API_KEY`, ver `reference_n8n_api_escrita.md` —
  nunca imprimir o valor da chave) pra consultar os 19 IDs diretamente — a API real pode ter
  escopo diferente do MCP (ex.: enxergar outro projeto/workspace, ou ter endpoint de lixeira/
  histórico que o MCP não expõe).
- Incluído: se a API real também não achar os 19, reportar isso como confirmação adicional (não
  é mais só um problema da ferramenta MCP) e recomendar ao Edvam checar direto na UI do n8n
  (login) como último recurso — isso nenhum chat consegue fazer sozinho.
- Incluído: registrar a lista dos 19 IDs confirmados (ou não) na documentação (`mapa-workflows-
  n8n.md`), com a conclusão final, o que quer que seja.
- Explicitamente fora de escopo: recriar/reimportar qualquer workflow — nenhum deles tem uso real
  hoje, não há urgência operacional, só integridade de documentação. Não é pra tentar "consertar"
  nada sem antes confirmar o que de fato aconteceu.

## Critérios de aceite
- [ ] Os 19 IDs conferidos via API REST real (não só MCP)
- [ ] Conclusão clara registrada: excluídos de verdade / movidos / outra causa — ou "não foi
      possível determinar via nenhuma ferramenta disponível, requer checagem manual do Edvam na
      UI", se for o caso
- [ ] `mapa-workflows-n8n.md` atualizado com o resultado final

## Riscos e cuidados
Nenhum risco operacional real (nenhum desses workflows está em uso). É investigação, não correção
— não excluir, recriar nem modificar nada sem confirmação explícita primeiro.

## Referências
`pm/conhecimento/mapa-workflows-n8n.md` (seção "Reconferência 2026-08-15", achado completo).
Demanda 242 (registro original, "nada foi apagado"). `reference_n8n_api_escrita.md` (como
acessar a API REST real). IDs completos na seção do mapa citada acima.

## Relato de execução
(preenchido pelo chat executor ao concluir)
