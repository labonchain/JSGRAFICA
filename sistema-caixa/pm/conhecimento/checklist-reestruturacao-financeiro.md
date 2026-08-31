# Checklist — reestruturação do módulo Financeiro (2026-07-07)

Consolida tudo decidido em conversa com o Edvam, organizado por **quando pode ir pro ar**. Fonte
completa da discussão: `proposta-fluxo-financeiro.md`. Este arquivo é o que vira demandas.

**Regra de deploy confirmada pelo Edvam**: o caixa de hoje já abriu pelo fluxo atual e fecha à
noite normalmente, sem mexer nisso retroativamente. Tudo que **muda comportamento que Zu/Gabi já
estão usando agora** espera esse fechamento (mesmo padrão da demanda 073). Tudo **aditivo** (não
interfere no que já está em uso) pode ir a qualquer momento.

## ⚠️ Ainda não confirmado, falta resposta do Edvam
- **Saldo projetado no Financeiro**: entra na v1 (Edvam sinalizou risco menor que eu tinha
  suposto, mas não confirmou "sim, inclui" ainda) — perguntar antes de escrever a demanda do
  item 8 abaixo.

---

## Bloco A — pode ir a qualquer momento (aditivo, não mexe no que está em uso agora)

| # | O quê | Onde mexe |
|---|---|---|
| A1 | Coluna `preco_custo` em `jsgrafica_produtos` (todos os produtos) | Tabela `jsgrafica_produtos` + tela de Produtos (campo editável novo) |
| A2 | Coluna `visivel_pdv` em `jsgrafica_categorias_saida` (controle de quais categorias aparecem pro PDV) | Tabela `jsgrafica_categorias_saida`, `app/api/categorias-saida/route.ts`, tela de gerenciar categorias (admin) |
| A3 | Tabela nova `jsgrafica_contas_pagar_receber` (nome, valor, categoria, vencimento, tipo pagar/receber, status, recorrente, frequência) | Nova tabela + `app/api/contas-pagar-receber/route.ts` (novo) |
| A4 | Tela nova "📋 Contas a Pagar/Receber" — cadastro, marcar pago/recebido (baixa gera Saída/Entrada real automaticamente), suporte a recorrência mensal | Novo `components/TelaContasPagarReceber.tsx`, só Admin acessa |
| A5 | Tela nova "📥 Entradas" — ledger de entradas por PDV/Admin + histórico de abertura/fechamento | Novo `components/TelaEntradas.tsx` + rota nova que junta vendas/pedidos + eventos de abertura/fechamento |
| A6 | Card-resumo "contas a pagar a vencer" dentro de Saídas | `components/TelaSaidas` (achar/renomear componente atual embutido em `app/page.tsx`), lê de A3 |
| A7 | Selo "🟢 fechado / 🟡 em aberto" + histórico de dias anteriores em Fechar Caixa | `components/TelaFechamento.tsx` |
| A8 | Financeiro: mockup fiel refeito (classes Tailwind reais, não CSS aproximado) — **precisa aprovação visual antes de qualquer código** | Artefato novo, 04-FRONTEND, base real em `TelaFinanceiro.tsx` |
| A9 | Financeiro: menu de 3 relatórios nomeados (Fluxo de Caixa / Controle de Caixa / Relatório de Saídas) — só depois de A8 aprovado | `components/TelaFinanceiro.tsx` |
| A10 | Financeiro: saldo projetado (⚠️ aguardando confirmação, ver acima) — só depois de A8/A9 | `components/TelaFinanceiro.tsx`, nova query somando A3 pendente por vencimento |

## Bloco B — espera o caixa de hoje fechar (muda fluxo/permissão em uso agora)

| # | O quê | Onde mexe |
|---|---|---|
| B1 | ~~PDV ganha acesso à aba Saídas~~ **CANCELADO (2026-07-07)** — Edvam corrigiu: só Admin lança saída manualmente. Custo de produto com pagamento imediato (recarga etc.) é automático via B4, nunca manual pelo atendimento | — |
| B2 | Abertura de caixa vira portão obrigatório antes do PDV (sai da aba Fechar Caixa) | `components/TelaFechamento.tsx` (remove bloco `!isAdmin` de abertura), novo componente de gate/bloqueio, provavelmente em `app/pdv/page.tsx` |
| B3 | Renomear/separar a aba — "Fechar Caixa" passa a ser só fechamento (abertura saiu pra B2) | `app/page.tsx`, `app/pdv/page.tsx`, `components/TelaFechamento.tsx` |
| B4 | Recarga: entrada gera saída **na hora da venda** (substitui o mecanismo agregado da demanda 079) | `lib/supabase-admin.ts` (`gerarSaidaRecargaVemAutomatica()`), rota de vendas/pedidos que registra recarga |
| B5 | Custo vira saída automática só em produtos com repasse real (recarga, "Seviço terceirizado") — produção própria não gera saída, só entra na métrica de margem | Mesma lógica de B4, mais ampla (não só recarga) |
| B6 | Campo de desconto pontual (R$ ou %) no carrinho do PDV/Balcão | Componente de carrinho em `app/page.tsx`/`app/pdv/page.tsx` (Pedidos Balcão) |

## Ordem sugerida
1. **Bloco A primeiro** (qualquer momento, sem risco pro atendimento) — A1-A7 podem ir em paralelo entre 02-DADOS/03-APP; A8 (mockup) precisa estar aprovado antes de A9/A10.
2. **Confirmar com Edvam** que o caixa de hoje fechou.
3. **Bloco B depois**, numa janela só, fora do horário de atendimento (mesmo texto de liberação já usado na demanda 073) — B1-B3 e B4-B6 podem ser demandas separadas, mas o deploy dos dois espera a mesma janela segura.
