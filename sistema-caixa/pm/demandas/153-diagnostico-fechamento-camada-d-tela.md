# 153 — Diagnóstico de Fechamento (Camada D/4, última): tela

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto — plano geral (Camadas A, B, C concluídas e validadas)
Tudo que falta é a interface. Já existem, prontos e testados:
- `GET /api/fechamento/diagnostico?data=DD-MM-AA` — dados (149) + `sinais[]` (150).
- `POST /api/fechamento/diagnostico/resumo?data=DD-MM-AA` — gera/regenera o resumo em texto
  (152), salva em `resumo_ia`/`resumo_editado`/`resumo_gerado_em` na linha do fechamento geral.

## Objetivo
O Admin consegue ver, pra qualquer dia, o resumo narrativo + os sinais encontrados, direto na
tela de Fechar Caixa — e editar o resumo se achar que precisa ajustar algo.

## Escopo
- Incluído:
  1. Nova seção/aba dentro de Fechar Caixa (ex. "🔍 Diagnóstico", ao lado ou abaixo do Histórico
     já existente da 132) — seletor de data (mesmo padrão já usado em Saídas, 129), mostrando pro
     dia escolhido:
     - O resumo narrativo (`resumo_editado` se existir, senão `resumo_ia`) em destaque, com botão
       "Editar" (vira textarea, salva via `PATCH` — endpoint novo simples, só grava
       `resumo_editado`, ou reaproveitar algo já existente a critério do executor) e botão
       "Gerar de novo" (chama o `POST /resumo`, com aviso de que sobrescreve `resumo_ia` mas não
       a edição salva).
     - A lista de `sinais`, agrupados por severidade (crítico primeiro), cada um mostrando a
       descrição e um link/destaque pro registro citado (pedido/saída/fechamento).
     - Se o dia não tiver fechamento geral ainda, mostrar isso claramente (mesmo aviso que o
       endpoint já devolve) em vez de tela vazia confusa.
  2. Botão "Gerar resumo" quando ainda não existe nenhum pro dia selecionado.
- Fora de escopo: qualquer mudança nos endpoints das Camadas A/B/C (já prontos, só consumir).

## Critérios de aceite
- [ ] Tela mostra resumo + sinais pra qualquer dia selecionado
- [ ] Editar funciona, salva em `resumo_editado`, preservado ao regenerar (já garantido pela 152,
      só precisa a UI não quebrar isso)
- [ ] Dia sem fechamento geral mostra aviso claro, não tela vazia
- [ ] Testado contra 09-07-26 (resumo real já existe, gerado na 152) e contra um dia sem resumo
      ainda, gerando na hora pela tela

## Referências
Demandas 149/150/152 (Camadas A/B/C, endpoints prontos). Demanda 132 (Histórico do Fechar Caixa,
referência de layout/posição).

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_2Sc7j2xJBHAcn3hRdXH2VPy6QESB`,
verificado em produção. **Fecha o sistema de diagnóstico inteiro (149→153).**

### O que foi feito
1. **`components/DiagnosticoFechamento.tsx` (novo)** — seção "🔍 Diagnóstico do fechamento"
   renderizada no fim da tela Fechar Caixa, **só-Admin** (mesma condição do Histórico da
   099/132), abaixo da discriminação por forma de pagamento. Seletor de data + botão "Hoje"
   (mesmo padrão da 129, conversão ISO→DD-MM-AA).
2. **Resumo narrativo**: mostra `resumo_editado` na frente do `resumo_ia` (badge
   "✎ editado pelo Admin" quando é edição; senão "Gerado pela IA em <data/hora>").
   - **✎ Editar** → textarea → salva via `PATCH /api/fechamento/diagnostico/resumo` (handler
     novo, aditivo — grava SÓ `resumo_editado`; texto vazio REMOVE a edição e a tela volta ao
     texto da IA).
   - **↻ Gerar de novo** → `confirm()` avisando que sobrescreve o automático mas preserva a
     edição → `POST /resumo` da 152.
   - **✨ Gerar resumo do dia** quando ainda não existe nenhum.
3. **Sinais** agrupados por severidade (🔴 Crítico → 🟡 Atenção → ℹ️ Info), cada um com a
   descrição e os registros citados em destaque (badges monospace com ícone por tabela:
   🧾 pedido / 💸 saída / 🔒 fechamento). Dia sem sinal → "✓ Nenhum sinal detectado".
4. **Dia sem fechamento geral**: aviso âmbar claro ("o resumo só pode ser salvo depois de fechar
   o caixa") + botão "✨ Gerar prévia (não salva)" que exibe o texto efêmero com a nota "Prévia —
   não salva" (comportamento do endpoint da 152 exposto na tela, nunca tela vazia).
Zero mudança nos endpoints das Camadas A/B/C além do PATCH aditivo.

### Testes (Playwright local, 15 checks + banco)
- **Hoje (dia aberto)**: aviso claro + botão de prévia — não é tela vazia.
- **09-07-26 (resumo real da 152)**: resumo renderizado com "não explicam a diferença", selo
  "Gerado pela IA", sinais 🟡 com registro `09-07-26/Sistema` em destaque, botões presentes
  (screenshot).
- **Ciclo completo de edição pela tela**: Editar → salvar texto → badge "✎ editado" na hora →
  ↻ Gerar de novo (confirm exibido) → **a tela continuou mostrando a edição** (preservação da
  152 respeitada pela UI) → Editar → apagar tudo → salvar → voltou "Gerado pela IA" (edição
  removida). Banco conferido no fim: `resumo_editado` null, `resumo_ia` presente.
- **08-07-26 (fechado, sem resumo)**: botão "✨ Gerar resumo do dia" → gerado e salvo pela
  própria tela (screenshot) — ficou como resumo oficial do dia, junto com os sinais.
- `tsc` e build limpos.
- **Produção**: tela real em admin.jsgrafica.site exibindo o resumo de 09-07 completo + sinais
  (screenshot) — só leitura, nada criado em produção.

### Critérios de aceite
- [x] Resumo + sinais pra qualquer dia selecionado (hoje, 09-07, 08-07 testados)
- [x] Edição salva em `resumo_editado` e preservada ao regenerar (ciclo completo pela UI)
- [x] Dia sem fechamento geral mostra aviso claro + prévia opcional, nunca tela vazia
- [x] Testado contra 09-07-26 (resumo real) e 08-07-26 (gerado na hora pela tela)

### Sistema de diagnóstico completo (149→153)
Camada A (coleta) → B (sinais por regra) → C (narrativa IA editável) → D (tela). O ciclo que era
investigação manual do PM (131/143) agora é: abrir Fechar Caixa → escolher o dia → ler o resumo
→ conferir os sinais com os ids exatos → editar/regerar se precisar.
