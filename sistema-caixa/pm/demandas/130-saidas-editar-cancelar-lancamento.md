# 130 — Saídas: Admin poder editar ou cancelar um lançamento já feito

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
`app/api/saidas/route.ts` só tem `POST` — depois de lançada, uma saída não pode ser editada nem
cancelada por ninguém, nem o Admin. Isso já causou trabalho manual direto no banco pelo menos 2
vezes nesta semana (correção do valor de um repasse de recarga errado, e exclusão de uma saída
automática indevida) — o PM teve que mexer direto via API do Supabase porque não existe caminho
pela aplicação. O Edvam pediu explicitamente essa capacidade (2026-07-08): "o admin deve poder
editar uma saída lançada ou cancelar ela para lançar novamente em caso de erros."

## Objetivo
Admin consegue corrigir ou cancelar uma saída já lançada direto pela tela de Saídas, sem precisar
de ninguém mexer no banco.

## Escopo
- Incluído:
  1. `PATCH /api/saidas` — edita campos de uma saída existente (valor, categoria, descrição,
     data). Não precisa de motivo/justificativa obrigatória, mas registrar `editado_em`/
     `editado_por` (novas colunas) pra manter rastro de que foi alterada depois do lançamento
     original.
  2. `DELETE /api/saidas` (ou `PATCH` com algum campo `cancelado`, à escolha do executor,
     documentar a decisão) — cancela/remove uma saída. Se a saída tiver algum vínculo (ex.:
     `saida_vinculada_id` referenciado por um pedido, ver demanda 104/124), desfazer esse vínculo
     antes de cancelar, igual o PM teve que fazer manualmente — reaproveitar a mesma lógica seve
     já existir algo parecido em `cancelarPedido`.
  3. UI (`components/TelaSaidas.tsx` ou equivalente): botões "Editar" e "Cancelar" em cada linha
     do card "Lançamentos" (o mesmo card que a demanda 129 está reorganizando — coordenar as duas
     se forem executadas próximas, mas são independentes).
- Fora de escopo: histórico/auditoria completa de todas as edições (só os campos simples acima já
  resolvem o problema de hoje).

## Critérios de aceite
- [x] Dá pra editar valor/categoria/descrição/data de uma saída já lançada
- [x] Dá pra cancelar uma saída, e se ela tiver pedido vinculado, o vínculo é desfeito sem quebrar
      o pedido original
- [x] `editado_em`/`editado_por` gravados quando algo é editado

## Referências
Esta conversa (2026-07-08/09) — 2 correções manuais no banco que motivaram este pedido.
`app/api/saidas/route.ts`, `lib/supabase-admin.ts` (`cancelarPedido` como referência de padrão).

## Relato de execução

### O que foi feito
- **Migration** (`add_rastro_edicao_saidas`): `editado_em`/`editado_por` em `jsgrafica_saidas`.
- **`GET /api/saidas`** ampliado: passou a devolver `id` (a UI não tinha como mirar uma linha
  antes), `categoria_id`, `descricao`, `data_dia` (pré-preenchem o modal) e o rastro de edição.
- **`PATCH /api/saidas`**: edita valor/categoria/descrição/data. Categoria re-validada e nome
  re-derivado da tabela (mesma regra do POST, nunca vem pronto do cliente); data validada no
  formato DD-MM-AA; sempre grava `editado_em`/`editado_por`. **Sem recomputar a matemática de
  Recarga VEM de propósito** — editar é justamente o caminho de CORREÇÃO de um valor que saiu
  errado; o Admin manda o valor final que quer.
- **`DELETE /api/saidas`** — **decisão documentada (item 2 do escopo): DELETE real, não flag
  `cancelado`**. Motivos: todas as agregações (`getResumoDia`, dashboard, fechamento, Financeiro)
  somam as linhas sem conceito de status — uma flag exigiria mexer em todos os leitores; e as 3
  correções manuais desta semana (que motivaram a demanda) foram exatamente DELETEs. Se a saída
  estiver vinculada a um pedido (`saida_vinculada_id`, 104/124), o vínculo é desfeito ANTES de
  apagar — mesma ordem de `cancelarPedido` (112), a FK não tem `ON DELETE`. O pedido fica intacto.
- **UI** (`TelaSaidas` em `app/page.tsx` — não existe `components/TelaSaidas.tsx`, a tela vive
  ali): cada card de "Lançamentos de hoje" ganhou botões **Editar** (abre modal com categoria/
  valor/descrição/data pré-preenchidos — mudar a data move o lançamento pro caixa daquele dia) e
  **Cancelar** (confirm + DELETE). Card editado mostra selo "✎ editada" âmbar com tooltip de
  quando. A aba é só-Admin desde sempre (102 cancelada), então os botões não precisam de gate
  extra. Nota de coordenação: a 129 vai reorganizar este mesmo card — ela ainda não começou
  (conferido no STATUS), sem conflito; quando rodar, os botões já estarão lá.

### Testes realizados (dado sintético, tudo limpo no fim; 2 saídas reais de hoje intactas)
- **Editar (API)**: saída de teste criada via POST → PATCH mudando os 4 campos de uma vez —
  valor 11,11→22,22, categoria fornecedores→energia (nome re-derivado certo: "Neoenergia /
  Compesa / Placa solar"), descrição, e data 09-07→08-07 (e depois de volta, provando o
  movimento entre dias nos 2 sentidos). `editado_em`/`editado_por` gravados. Data em formato
  errado rejeitada com mensagem clara.
- **Cancelar COM pedido vinculado**: venda real de RECARGA VEM → saída automática gerada e
  vinculada (104) → DELETE da saída → pedido intacto (`entregue`, `saida_vinculada_id: null`),
  saída apagada de verdade (`count = 0`). DELETE de id inexistente → 404.
- **UI real (Playwright)**: selo "✎ editada" visível no card; modal abre pré-preenchido com os
  valores atuais; cancelamento feito PELA UI (confirm aceito) — card some da lista na hora.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_C4utWntjs18xCMJ56G74cvbiTjTo`). As correções que o PM fazia direto
no banco (editar valor errado, apagar saída indevida, desfazer vínculo de pedido) agora têm
caminho completo pela tela.
