# 232 — Editar saída vinculada a transferência não sincroniza o valor

Status: concluída
Criada em: 2026-07-28
Aprovada em: 2026-07-28
Concluída em: 2026-07-28
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado real durante o checkpoint da demanda 231: quando uma transferência é criada (201), ela
gera 2 registros vinculados por `saida_id` — a saída (origem) e a linha em
`jsgrafica_transferencias`, sempre com o mesmo `valor` nos dois. A ferramenta genérica de editar
saída (demanda 130) permite mudar o `valor` de qualquer saída, incluindo uma que seja o lado de
uma transferência — e quando isso acontece, o valor não se propaga pro registro da
transferência. Caso real confirmado: transferência de 24-07-26 (Dinheiro Zu → Mercado Pago)
ficou com `valor=945` na transferência mas `valor=890` na saída-par, editada depois — R$55 de
diferença entre os 2 lados do mesmo evento.

Isso não é só um detalhe: a demanda 231 (recálculo de fechamento) e a demanda 228 (gap agregado
por conta) partem do princípio de que os 2 lados de uma transferência sempre batem. Se isso
voltar a acontecer, os dois podem calcular errado sem ninguém perceber — não é cosmético.

## Objetivo
Editar o valor de uma saída que é o lado de origem de uma transferência mantém os 2 lados
sempre sincronizados — nunca fica possível os dois valores divergirem.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirme como a ferramenta de editar saída (130) funciona hoje e proponha a correção exata antes
de implementar — relate ao PM.

## Escopo
- Incluído: quando a rota de editar saída detectar que a saída sendo editada tem uma
  `jsgrafica_transferencias` vinculada (`saida_id`), a edição do `valor` atualiza os 2 registros
  juntos (mesma transação/chamada, não 2 passos separados que possam falhar no meio).
- Incluído: corrigir retroativamente o caso real de 24-07-26 (sincronizar os 2 lados pro valor
  correto) — confirmar com o PM qual valor é o certo (945 ou 890) antes de aplicar, não presumir.
- Incluído: considerar (e reportar a decisão, não só implementar sem explicar) se a edição
  também deveria ser bloqueada/avisada quando o valor novo tornaria a transferência sem sentido
  (ex. negativo) — mesmo espírito de "não deixar o sistema inventar" já aplicado em outras
  demandas desta leva.
- Explicitamente fora de escopo: mudar o mecanismo de criação de transferência (201) em si, ou o
  cálculo de gap agregado (228)/recálculo (231) — esses já assumem a sincronia, o conserto é na
  origem do problema (a edição).

## Critérios de aceite
- [x] Editar valor de saída vinculada a transferência atualiza os 2 lados juntos
- [x] Testado com transferência sintética (criar, editar a saída, conferir que os 2 lados batem)
- [x] Caso real de 24-07-26 corrigido, com confirmação do valor certo antes de aplicar
- [x] Sem regressão na edição de saída normal (não vinculada a transferência)

## Riscos e cuidados
Não presumir qual dos 2 valores (945 ou 890) é o correto pro caso real — perguntar antes de
corrigir o dado.

## Referências
Demanda 231 (achado original, checkpoint). Demanda 201 (criação de transferência). Demanda 130
(ferramenta de editar saída). Demanda 228 (gap agregado, depende da sincronia).

## Relato de execução

### Checkpoint (antes de codar)
Confirmado como `PATCH /api/saidas` funciona hoje (`app/api/saidas/route.ts`): edita
`valor`/`categoriaId`/`descricao`/`dataDia` de qualquer saída, tudo numa única chamada, sem
nenhuma consciência de que a saída pode ser o lado de uma transferência (201). Achados que
expandiram o entendimento do risco além do texto literal da demanda (relatados ao PM antes de
implementar):
- **`dataDia` é editável no MESMO modal** ("Editar lançamento", `app/page.tsx`) que edita o
  valor — `jsgrafica_transferencias` também tem sua própria coluna `data_dia`; editar só a data
  da saída sem a da transferência quebraria o mesmo tipo de sincronia, e pior: a 231 (cascata) e a
  228 (gap por conta) indexam tudo por `data_dia`.
- A categoria `transferencia_entre_contas` está `ativo=true` — aparece normal no dropdown de
  edição, sem nenhum bloqueio hoje.
- Confirmado que a relação saída↔transferência é sempre 1:1 (`saida_id`, 0 casos com mais de 1
  vínculo).

**Decisões confirmadas com o PM**: (1) valor correto do caso real de 24-07-26 é **890** (o valor
editado/mais recente da saída, não o 945 original da transferência); (2) escopo expandido pra
sincronizar `data_dia` também e bloquear mudança de categoria, não só valor.

### O que foi feito
- **`app/api/saidas/route.ts` — `PATCH`**: antes de aplicar o `update`, busca se existe
  `jsgrafica_transferencias` com `saida_id = id` (sempre 0 ou 1 linha). Se existir:
  - `categoriaId` no corpo → rejeitado com 400 (nunca existe motivo legítimo pra uma transferência
    deixar de ser categorizada como transferência).
  - `valor` e/ou `dataDia` no corpo → depois de gravar a saída, propaga os MESMOS valores novos
    pra `jsgrafica_transferencias` (mesma chamada, não 2 passos separados). Se a sincronização da
    transferência falhar depois da saída já ter sido salva, retorna erro 500 explícito avisando
    que a saída mudou mas a transferência NÃO — nunca finge sucesso silencioso.
  - Saída normal (sem transferência vinculada) continua exatamente como antes — nenhum campo novo
    checado, nenhuma query extra desnecessária além do `maybeSingle()` de verificação.
- **Correção retroativa do caso real de 24-07-26** (Dinheiro Zu → Mercado Pago): transferência
  sincronizada de `945` pra `890` (valor confirmado com o PM). Isso deixou os 2 fechamentos
  "Sistema" já fechados que dependiam desse total (24-07-26 e 27-07-26, o único seguinte que já
  existe) desatualizados em cascata — corrigido também, com confirmação explícita do PM antes de
  aplicar (mesma disciplina manual da 217/223, 1 `UPDATE` de cada vez, conferindo o `RETURNING`):
  - 24-07-26: `total_entradas` 3365,35→3310,35, `saldo_acumulado` 242,46→187,46, `divergencia`
    19,43→74,43 (`saldo_anterior`/`total_saidas`/`total_fisico` intocados).
  - 27-07-26: `saldo_anterior` 242,46→187,46 (herda o novo valor de 24/07), `saldo_acumulado`
    450,96→395,96, `divergencia` -9,89→45,11.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Sintético ponta a ponta** (`scripts/teste-232-sync-transferencia.ts`, mantido no repo, dia
  isolado 2099): criada 1 saída+transferência vinculadas — editar o valor (500→777) sincronizou
  os 2 lados; editar a data (`data_dia`) também sincronizou os 2 lados; tentar mudar a categoria
  foi bloqueado com 400 e mensagem clara, categoria confirmada intocada depois; uma saída NORMAL
  (sem transferência), no mesmo teste, editou valor E categoria livremente, sem nenhum bloqueio —
  confirma zero regressão. Tudo apagado ao final.
- Caso real de 24-07-26 verificado via `SELECT` direto antes/depois da correção — transferência e
  saída-par batendo em R$890,00.
- Cascata de 24/27-07 conferida via `RETURNING` de cada `UPDATE` contra o valor esperado
  (calculado e reportado ao PM antes de aplicar).
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (não corrigidos aqui)
- **UI não avisa proativamente**: o bloqueio de categoria é só no backend (retorna erro depois do
  Admin já preencher o formulário e clicar "Salvar") — não desabilitei o campo no modal de edição
  nem expus visualmente "essa saída é uma transferência" antes da tentativa. Funcional e seguro
  (a mensagem de erro é clara e aparece via `alert()`, mesmo padrão já usado nesse modal), mas uma
  melhoria futura de UX seria desabilitar o campo categoria diretamente quando a saída for
  vinculada a transferência (exigiria estender `GET /api/saidas` pra expor esse vínculo).
- **`DELETE /api/saidas` (cancelar) não tem nenhuma consciência de transferência vinculada** —
  apagar a saída-origem de uma transferência deixa a linha de `jsgrafica_transferencias` órfã
  (`saida_id` apontando pra um registro que não existe mais), o que é pior que o bug original
  desta demanda: a transferência continua contando como entrada na conta de destino
  (`getResumoDia`) sem NENHUMA saída correspondente contando do outro lado — dinheiro fantasma
  permanente no agregado, não só um valor divergente. Fora do escopo literal desta demanda
  (que fala só de "editar", não "cancelar"), mas é o mesmo risco de fundo. Recomendo demanda
  própria: ou cancelar a transferência junto ao cancelar a saída-par, ou bloquear o cancelamento
  direto e exigir "desfazer transferência" como ação específica.

### Status final: concluída
Deploy em produção, mecanismo testado sintético + caso real corrigido e reconferido.
