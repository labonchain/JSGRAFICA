# 229 — Tela de conciliação: ver e classificar itens pendentes

Status: concluída
Criada em: 2026-07-22
Aprovada em: 2026-07-22
Concluída em: 2026-07-22
Chat executor: 03 - APP JS GRAFICA

## Contexto
Quarta peça do desenho de conciliação (demanda 225,
`pm/conhecimento/desenho-conciliacao-automatica.md`, seção 3). As peças anteriores já estão no
ar: tabelas (226), matching do Mercado Pago (227) e gap agregado (228) — ambas já estão gerando
pendências reais em `jsgrafica_conciliacao_pendencias` (10 itens reais em 21/07, incluindo o
R$300 sem vínculo e o resíduo de R$290,58). Falta a única peça visível: hoje ninguém vê essas
pendências em lugar nenhum, só consultando o banco direto.

## Objetivo
O Admin vê os itens pendentes de conciliação (do dia, na hora de fechar o caixa, e de qualquer
dia, numa tela separada) e consegue classificar cada um — a classificação gera o registro real
correspondente (entrada avulsa, saída ou transferência) e o item some da lista de pendentes.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirme o desenho exato das telas/componentes (onde entram na navegação atual, como fica o
modal de classificação) antes de escrever código de produção — relate ao PM com prints ou
descrição clara, e só depois de confirmação explícita implemente e faça deploy.

## Escopo
- Incluído: card **"🔍 Itens não explicados hoje"** na tela de fechamento "Sistema" (mesma tela
  onde o Admin já digita os saldos das 4 contas digitais) — lista as pendências
  (`jsgrafica_conciliacao_pendencias`, `status='pendente'`) daquele `data_dia`. Não trava o
  fechamento — o Admin pode fechar o dia com itens ainda pendentes.
- Incluído: aba/tela separada **"🔎 Conciliação"** (Financeiro ou nível próprio, à critério de
  onde encaixa melhor na navegação atual) listando TODAS as pendências de qualquer dia, mais
  histórico dos já `classificado`/`ignorado`.
- Incluído: modal de classificação — ao abrir um item pendente, o Admin escolhe:
  - **Entrada** → cria registro em `jsgrafica_entradas_avulsas` (`conta_destino` = conta do item,
    `valor`, `data_dia` default = data do item, `descricao` opcional), vincula `pendencia_id`.
  - **Saída** → cria registro em `jsgrafica_saidas` (mecanismo já existe — reaproveitar o mesmo
    formulário/lógica da saída manual, incluindo o seletor de `conta_origem` já existente desde a
    210).
  - **Transferência** → cria registro via mecanismo já existente da 201 (`conta_origem` = conta
    do item, `conta_destino` a escolher).
  - **"Sabido, não é transação real do negócio"** → não cria nenhum registro financeiro, só marca
    `status='classificado'` com esse motivo em `classificacao` (jsonb).
  - Em qualquer caso: grava `classificado_por`, `classificado_em`, marca `status='classificado'`.
- Incluído: quando um item classificado afeta um `data_dia` cujo fechamento "Sistema" **já foi
  fechado antes da classificação**, mostrar um aviso visível (ex. banner "🔴 fechamento de DD/MM
  ficou desatualizado, precisa recalcular") — só sinalizar, **não recalcular automaticamente**
  (o mecanismo de recálculo em si é a próxima demanda, 230, de propósito separado).
- Incluído: opção "ignorar" um item sem classificar (`status='ignorado'`) pra quando o Admin
  decidir que não vale a pena investigar mais (ex. um dos créditos pequenos recorrentes de
  "cofrinho") — sem gerar registro financeiro, só sai da lista de pendentes ativos.
- Explicitamente fora de escopo: o mecanismo de recálculo de fechamento antigo em si (230).
  Qualquer mudança na lógica de matching/gap (227/228, já corretas). Classificação em lote (pode
  virar melhoria futura se o volume de itens pequenos recorrentes justificar — reportar se achar
  isso relevante, não implementar agora).

## Critérios de aceite
- [x] Card "Itens não explicados hoje" aparece na tela de fechamento "Sistema", não trava o
      fechamento
- [x] Tela "Conciliação" lista pendências de todos os dias + histórico de classificados
- [x] Classificar como Entrada/Saída/Transferência cria o registro real correspondente
      corretamente vinculado (`pendencia_id`)
- [x] Classificar como "sabido, não é real" não cria registro nenhum, só marca status
- [x] Opção de ignorar sem classificar funciona
- [x] Fechamento antigo afetado mostra aviso de desatualizado (sem recalcular sozinho)
- [x] Testado com os itens reais já existentes em produção (R$300, R$290,58, os créditos
      pequenos de "cofrinho") — listagem confirmada contra produção; classificação de cada
      item real é decisão do Admin pela tela, não aplicada por mim (ver relato)

## Riscos e cuidados
Não recalcular fechamento antigo automaticamente em nenhuma circunstância — isso é escopo
explícito da 230, decisão de arquitetura já tomada no desenho 225. Cuidado pra não duplicar
lógica de criação de saída/transferência já existente — reaproveitar, não reescrever.

## Referências
Demanda 225 (desenho completo, seção 3 — fluxo de UX detalhado). Demandas 226, 227, 228
(tabelas e lógica que alimentam esta tela). Demanda 217 (lição de não recalcular fechamento
antigo sem confirmação passo a passo — mesmo espírito aplicado aqui pro aviso de desatualizado).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - **Navegação**: nova aba "🔎 Conciliação" no grupo "💰 Financeiro" (`app/page.tsx`), Admin-only,
    mesmo padrão de todas as abas financeiras.
  - **`components/TelaConciliacao.tsx`** (nova) — lista todas as pendências
    (`GET /api/conciliacao/pendencias`), filtro por status (pendente/classificado/ignorado/todos)
    e por dia (mesmo seletor de data de `TelaEntradas.tsx`); mostra o banner 🔴 de "fechamento
    desatualizado" quando aplicável.
  - **`components/ModalClassificarPendencia.tsx`** (novo) — compartilhado entre a tela de
    Conciliação e o card do Fechamento. 4 caminhos + ignorar:
    - Entrada → `criarEntradaAvulsa` (nova, `lib/supabase-admin.ts`) → `jsgrafica_entradas_avulsas`
      com `pendencia_id` vinculado.
    - Saída → `criarSaida` (extraída) → `jsgrafica_saidas`, categoria escolhida via dropdown de
      `/api/categorias-saida` (já existente).
    - Transferência → `criarTransferencia` (extraída) → `jsgrafica_saidas` + `jsgrafica_transferencias`
      (mecanismo da 201). **Direção decidida pelo sinal do valor da pendência**: positivo = dinheiro
      chegou nessa conta (ela é destino, Admin escolhe de onde veio); negativo = saiu (ela é
      origem, Admin escolhe pra onde foi) — evita perguntar uma direção que já dá pra inferir.
    - "Sabido, não é real" → só marca `status='classificado'` com `classificacao={tipo:'sabido',
      motivo}`, motivo obrigatório, nenhum registro financeiro.
    - Ignorar → `status='ignorado'`, sem formulário.
  - **Card "🔍 Itens não explicados hoje"** em `TelaFechamento.tsx` — Admin-only, acima do "Como
    funciona", lista só pendências do `data_dia` atual, nunca trava o botão "Fechar Caixa". Link
    "Ver tela de Conciliação completa" usa a mesma prop `onAbrirConciliacao` (padrão idêntico ao
    `onAbrirContasPagarReceber` já existente em `TelaSaidas`).
  - **Aviso de "fechamento desatualizado"**: calculado AO VIVO (sem coluna nova no banco, sem
    depender de migration da 02-DADOS) — comparando `classificado_em` do item contra `fechado_em`
    do fechamento "Sistema" daquele `data_dia`; só se aplica a item classificado como
    entrada/saída/transferência (que gera registro real) DEPOIS do dia já ter sido fechado. Nunca
    recalcula sozinho (fica pra demanda 230).
  - **Refatoração pra reaproveitar de verdade (não duplicar)**: extraídas `criarSaida` e
    `criarTransferencia` de `app/api/saidas/route.ts` e `app/api/transferencias/route.ts` pra
    `lib/supabase-admin.ts`, com `dataDia` opcional (default hoje, comportamento idêntico ao de
    sempre pras 2 rotas existentes) — necessário porque a classificação de uma pendência pode ser
    de qualquer dia passado, e a rota de saídas só gravava hoje. As 2 rotas HTTP viraram
    validação + chamada da função; comportamento externo idêntico quando `dataDia` não é passado.
- Testes realizados e resultado:
  - `npx tsc --noEmit`/`npm run build` limpos.
  - **Regressão** (`scripts/teste-229-regressao-rotas.ts`, mantido no repo): `POST /api/saidas` e
    `POST /api/transferencias` chamados exatamente como as telas existentes chamam (sem
    `dataDia`) — gravam em hoje, mesmos valores, mesmos erros 400 nos casos inválidos
    (categoria inexistente, mesma conta origem/destino) — comportamento idêntico ao de antes do
    refactor. Dado sintético apagado depois.
  - **Fim a fim** (`scripts/teste-229-conciliacao.ts`, mantido no repo), contra o servidor real,
    pendências sintéticas isoladas (dia 2099): os 6 caminhos testados e corretos (entrada criada
    com `pendencia_id`; saída criada com categoria real; transferência-entrada
    origem=stone→destino=caixa_economica; transferência-saída origem=dinheiro_zu→destino=stone;
    sabido sem registro financeiro; ignorar sem registro); dupla classificação bloqueada (400);
    `fechamentoDesatualizado` calculado certo nos 2 casos (classificado antes de existir
    fechamento → `false`; classificado depois do dia já fechado → `true`). Tudo apagado no final,
    confirmado 0 linhas residuais.
  - **Testado contra produção com os itens reais**: `GET /api/conciliacao/pendencias` (dev local
    e produção, `admin.jsgrafica.site`) retorna os 10 itens reais de 21/07 corretamente formatados
    (R$300, R$-290,58 do resíduo do Mercado Pago, os créditos pequenos de "cofrinho", etc.) — só
    LISTAGEM confirmada; **não classifiquei nenhum item real** (decisão deliberada: classificar é
    uma decisão financeira do Admin — ex. o R$300 pode ser algo que ele reconheça ao ver, ou pode
    precisar investigar antes — não é uma ação que eu deva tomar no lugar dele só porque o
    mecanismo está pronto).
- Achados fora do escopo:
  - Nenhum novo.
- Status final: concluída, testada (regressão + fim a fim sintético + smoke test contra produção
  com dado real) e em produção — deploy `dpl_2qm6aEsBufpwA1nMKSrsPyUVA6tT`, alias confirmado em
  `pdv.jsgrafica.site` e `admin.jsgrafica.site`. Os 10 itens reais seguem `pendente`, aguardando o
  Admin classificar pela tela nova.
