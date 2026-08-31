# 341 - Varredura de callers externos antes de rotacionar segredo (achado da 329/333)

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: 2026-08-28
Chat executor: 03 - APP JS GRAFICA

Incidente ao vivo, mesmo dia da 329: o Caminho C (workflow `296`, 3 nodes — `Preco: Calcular
Valor Real`, `Pix: Gerar Cobranca Real`, `Cancelar: Cancelar Via API`) ficou fora do ar desde o
deploy da 329, porque esses nodes chamavam `/api/pedidos/calcular-valor`, `/api/mercadopago/
cobranca` e `/api/pedidos` com o segredo antigo `X-App-Secret` (removido de propósito na 329).
A demanda 329 só tinha mapeado UM caller externo do mecanismo antigo — o gatilho Postgres
`jsgrafica_retentar_pix_apos_telefone_corrigido` (via `pg_net`) — e atualizou só esse. Os nodes do
`296` não estavam no radar na hora, porque chamar a API do app diretamente por um workflow n8n é
uma coisa que acontece fora do meu domínio de execução (n8n é domínio do 01-N8N).

Resolvido ao vivo, com autorização explícita do Edvam pra eu compartilhar o valor do
`INTERNAL_SERVICE_SECRET`: passei o valor e a instrução de troca de header, 01-N8N corrigiu os 3
nodes, confirmado no ar de novo pelo 01-N8N.

## Objetivo
Fechar a lacuna de processo: confirmar que não existe mais nenhum OUTRO caller externo (fora de
sessão de navegador) usando o segredo antigo ou qualquer mecanismo já descontinuado, no lado que é
meu domínio (Postgres/Supabase), e deixar registrado o processo certo pra da próxima vez que um
segredo desse tipo for rotacionado.

## Escopo
- Incluído: varredura de funções/triggers no Postgres (`pg_proc`) que chamem a API do app via
  `pg_net`/`net.http_post`, confirmando que nenhuma ainda usa um header descontinuado.
- Explicitamente fora de escopo: auditar workflows n8n (domínio do 01-N8N — já resolvido por eles
  ao vivo, meu escopo aqui é só confirmar o lado Postgres e documentar o processo).

## Relato de execução

### O que foi feito
Consulta direta em `pg_proc` (`arqkdnexpederquztegn`) por qualquer função cujo corpo mencione
`jsgrafica` e (`http_post` OU `net.http` OU `X-App-Secret` OU `X-Internal-Secret`) — cobre
qualquer trigger/função que chame a API do app de fora de uma sessão de navegador, esteja ela
usando o mecanismo antigo ou o novo.

**Resultado: só existe 1 função no banco inteiro fazendo esse tipo de chamada** —
`jsgrafica_retentar_pix_apos_telefone_corrigido` (a mesma já corrigida na 329), já usando
`X-Internal-Secret` com o valor atual. Nenhuma outra função/trigger no Postgres chama a API do
app diretamente. O gap real era mesmo só os 3 nodes do `296`, fora do alcance desta consulta por
serem n8n, não Postgres — já corrigidos ao vivo pelo 01-N8N.

### Processo pra próxima rotação (registrado aqui pra não repetir o gap)
Antes de rotacionar qualquer segredo desse tipo, checar OS DOIS lados, não só um:
1. **Postgres**: `select proname, prosrc from pg_proc where prosrc ilike '%http_post%'` (ou
   equivalente) — cobre qualquer trigger/função server-to-server.
2. **n8n**: pedir pro 01-N8N confirmar quais workflows/nodes chamam `admin.jsgrafica.site`/
   `pdv.jsgrafica.site` diretamente (fora do domínio de quem está rotacionando o segredo do lado
   do app) — n8n pode ter caller que o lado do app não teria como saber sozinho.

### Status final: concluída (lado Postgres confirmado limpo; lado n8n já resolvido ao vivo pelo
01-N8N antes desta demanda ser formalizada)
