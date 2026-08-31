# 181 — Botão "+" nova conversa do Inbox falha (falta contact_lid)

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA
Prioridade: baixa

## Contexto
Já reportado nas demandas 024 e 045/046 como "reportado, não corrigido". Auditoria do PM
(2026-07-15) confirma que **continua quebrado hoje**: `POST /api/inbox/conversas` (linhas
184-191) insere em `jsgrafica_contatos` sem preencher `contact_lid` (PK `NOT NULL` sem default) —
todo insert por esse caminho falha com erro 500. Impacto baixo porque o front
(`TelaInbox.tsx:1043`) não checa `res.ok` — a conversa abre normalmente, e se a operadora mandar a
primeira mensagem, `lib/inboxLog.ts` cria o contato certo por fora.

## Objetivo
O botão "+" nova conversa cria o contato corretamente na hora, sem depender de um envio de
mensagem posterior pra se autocorrigir.

## Escopo
- Incluído: `app/api/inbox/conversas/route.ts` (POST, linhas 184-191) — usar o mesmo fallback já
  estabelecido em outros lugares do código (`contact_lid = phone`, mesmo padrão de
  `lib/inboxLog.ts` e `api/clientes`).
- Explicitamente fora de escopo: qualquer outra parte do fluxo de nova conversa.

## Critérios de aceite
- [ ] Clicar em "+" nova conversa cria o contato sem erro 500
- [ ] Testado criando uma conversa nova de verdade (telefone sintético, depois apagado)

## Riscos e cuidados
Nenhum — é aplicar um padrão já usado em outro lugar do mesmo código.

## Referências
`app/api/inbox/conversas/route.ts:184-191`, `TelaInbox.tsx:1043-1047`, `lib/inboxLog.ts` (mesmo
fallback já resolvido). Demandas 024, 045/046 (achado original). Auditoria de cadastro do PM,
2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### O que foi feito
`POST /api/inbox/conversas` ganhou `contact_lid: phone` no insert — o mesmo fallback do
`lib/inboxLog.ts` e do `api/clientes`, como a demanda mandou. De quebra, a checagem de
existência que FALHA agora devolve 500 em vez de virar "não existe → insert" (mesma classe do
bug da 182, fechada aqui também).

### Testes
Fone sintético: 1º POST → 200 e exatamente 1 linha no banco com `contact_lid` preenchido (era
500 com violação de NOT NULL antes); 2º POST → 200 sem duplicar. Sintético apagado.
