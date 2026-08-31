# 233 — Cancelar saída vinculada a transferência deixa dinheiro fantasma

Status: concluída
Criada em: 2026-07-28
Aprovada em: 2026-07-28
Concluída em: 2026-07-28
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado da demanda 232, ao corrigir a edição de saída vinculada a transferência: `DELETE
/api/saidas` (cancelar) não tem nenhuma consciência de que a saída pode ser o lado de origem de
uma transferência (`jsgrafica_transferencias.saida_id`). Cancelar essa saída deixa a linha de
transferência **órfã** — e como `getResumoDia` (desde a 223) conta o valor da transferência como
entrada na conta de destino, o resultado é **dinheiro fantasma permanente**: a conta de destino
segue "recebendo" um valor cuja saída de origem não existe mais em lugar nenhum. Isso é mais
grave que o bug da 232 (lá o valor só ficava divergente entre os 2 lados; aqui um lado desaparece
de vez, sem editar mais nada).

## Objetivo
Cancelar uma saída vinculada a transferência nunca deixa dinheiro fantasma — ou os 2 lados são
desfeitos juntos, ou a ação é bloqueada até o Admin desfazer a transferência de um jeito
explícito.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirme como `DELETE /api/saidas` funciona hoje (mesmo levantamento que a 232 fez pro `PATCH`)
e proponha qual dos 2 caminhos faz mais sentido, com justificativa, antes de implementar:
1. **Cascata**: cancelar a saída também cancela (ou marca como desfeita) a transferência vinculada.
2. **Bloqueio**: cancelar essa saída é rejeitado com mensagem clara — o Admin precisa usar uma
   ação específica de "desfazer transferência" (pode ser nova, ou reaproveitar/adaptar algo que
   já exista) que trata os 2 lados de propósito.

Relate a recomendação ao PM antes de escrever qualquer código.

## Escopo
- Incluído: investigação de `DELETE /api/saidas` hoje — o que acontece de fato quando se tenta
  cancelar uma saída vinculada a transferência (reproduzir com dado sintético, não só ler código).
- Incluído: implementar a solução escolhida (cascata ou bloqueio), conforme decisão tomada no
  checkpoint.
- Incluído: verificar se existe algum caso real no histórico onde isso já aconteceu (saída
  cancelada que era origem de transferência, deixando órfã) — reportar se achar, não corrigir
  sem alinhar (mesmo dado sensível de fechamento já fechado).
- Explicitamente fora de escopo: mudar o mecanismo de criação de transferência (201) ou a
  sincronização de edição já corrigida pela 232.

## Critérios de aceite
- [x] Comportamento de hoje reproduzido e confirmado (não presumido)
- [x] Solução escolhida implementada e justificada
- [x] Testado com transferência sintética (tentar cancelar a saída de origem, confirmar o
      comportamento novo)
- [x] Verificado se existe caso real órfão no histórico, reportado se achar
- [x] Sem regressão em cancelar saída normal (não vinculada a transferência)

## Riscos e cuidados
Mesma disciplina de sempre: se achar caso real já quebrado no histórico, não corrigir dado de
fechamento já fechado sem confirmação explícita separada.

## Referências
Demanda 232 (achado original, mesmo mecanismo de vínculo `saida_id`). Demanda 201 (criação de
transferência). Demanda 223/228/231 (dependem da transferência estar sempre consistente).

## Relato de execução

### Checkpoint (antes de codar) — comportamento de hoje reproduzido, não presumido
Criei uma transferência sintética e tentei cancelar a saída-origem via `DELETE /api/saidas`
real. **O comportamento não é o que a demanda supõe**: não fica órfão nem dinheiro fantasma —
existe uma constraint de FK (`jsgrafica_transferencias.saida_id → jsgrafica_saidas.id`, sem
`ON DELETE`) que já rejeita a exclusão hoje. O problema real é outro: o erro é um 500 genérico
("Erro ao cancelar saída"), sem explicar o motivo, e sem apontar o que fazer.

**Achado que mudou a recomendação**: `DELETE /api/transferencias` (demanda 201) já existe e já
cancela os 2 lados corretamente (apaga a transferência primeiro, depois a saída-par, respeitando
a FK) — só que **não existe nenhum botão em lugar nenhum da tela que chame essa rota**. O
mecanismo de "desfazer transferência" já estava pronto, só nunca foi exposto.

**Verificado no histórico real**: 0 casos de transferência órfã (`saida_id` apontando pra uma
saída inexistente) — esperado, já que a FK sempre bloqueou essa falha.

**Recomendação relatada e confirmada com o PM**: bloqueio intencional (mensagem clara) em
`DELETE /api/saidas` + expor o mecanismo de cancelar transferência já existente na tela (em vez
de duplicar lógica de cascata dentro do DELETE de saídas). PM também confirmou incluir um
seletor de data na lista de transferências (achado adjacente: só mostrava hoje, sem jeito de
achar/cancelar uma transferência de dia passado).

### O que foi feito
- **`app/api/saidas/route.ts` — `DELETE`**: antes de tentar apagar, verifica se existe
  `jsgrafica_transferencias` com `saida_id = id`; se existir, retorna 400 com mensagem clara
  ("essa saída é o lado de uma transferência... cancele a transferência, não a saída") em vez de
  deixar a constraint de FK estourar um 500 sem explicação.
- **`app/page.tsx` — card "Transferências entre contas"**: ganhou seletor de data (mesmo padrão
  visual/`input type="date"` já usado em "Lançamentos" de Saídas, estado próprio
  `transfFiltroData` pra não reordenar hooks existentes no componente) e botão "Cancelar" por
  linha, chamando `DELETE /api/transferencias` (mecanismo da 201, sem nenhuma mudança nele) com
  confirmação explícita (`confirm()`, mesmo padrão já usado em outros cancelamentos desta tela).
  Card deixou de sumir quando vazio (antes só aparecia com `length > 0`) — agora sempre visível
  pro Admin, com mensagem "Nenhuma transferência nesse dia" quando aplicável, mesmo padrão do
  card de Lançamentos.
- Nenhuma mudança em `DELETE /api/transferencias`, `POST /api/transferencias` ou no mecanismo de
  criação de transferência (201) — fora de escopo, confirmado que já funcionam certos.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Sintético ponta a ponta** (`scripts/teste-233-cancelar-transferencia.ts`, mantido no repo, dia
  isolado 2099): (1) `DELETE /api/saidas` numa saída vinculada retorna 400 com mensagem clara
  (antes: 500 genérico) — saída e transferência continuam intactas depois; (2) `DELETE
  /api/transferencias` na mesma transferência cancela os 2 lados de verdade (saída E transferência
  removidas); (3) cancelar uma saída NORMAL (sem transferência) continua funcionando sem nenhum
  bloqueio — zero regressão; (4) `GET /api/transferencias?data=` filtra por dia corretamente. Tudo
  conferido via `SELECT` direto antes/depois de cada passo, dado sintético apagado ao final.
  Confirmado no log do dev server: `PATCH /api/saidas 400`, `DELETE /api/saidas 500` (a tentativa
  ANTES do fix, capturada no log — confirma a reprodução do bug real), `DELETE /api/saidas 400`
  (depois do fix), `DELETE /api/transferencias 200`, `DELETE /api/saidas 200` (saída normal, sem
  bloqueio).
- Print da UI nova não foi possível capturar (Playwright + `127.0.0.1` bloqueou o HMR do Next dev,
  página em branco — artefato de ambiente de teste, não do código; confirmado pelo log do próprio
  dev server, sem nenhum erro de aplicação). Compensado com o teste ponta a ponta via API real
  contra o mesmo servidor, que exercita exatamente as mesmas rotas que a UI chama.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (não corrigidos aqui)
- Nenhum novo além do já relatado no checkpoint (mecanismo de desfazer transferência sem UI,
  resolvido nesta própria demanda).

### Status final: concluída
Deploy em produção. Nenhum dado real foi tocado (não havia caso órfão real pra corrigir).
