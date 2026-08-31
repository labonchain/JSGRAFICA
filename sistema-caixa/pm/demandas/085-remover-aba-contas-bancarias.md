# 085 — Remover a aba "Contas Bancárias" por enquanto (não faz sentido como está)

Status: aprovada
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 077 criou uma aba "🏦 Contas Bancárias" (cadastrar conta, taxa de cartão/Pix, marcar
padrão). Vendo funcionando, Edvam achou que não faz sentido como tela separada — o conceito de
"taxas de recebimento por conta" se parece mais com configuração de Open Finance (demanda 084,
integração Mercado Pago/bancos) do que com uma aba própria do menu principal. Ele quer repensar
onde isso deveria morar antes de manter uma aba dedicada.

## Objetivo
A aba "Contas Bancárias" sai do menu principal por enquanto — a funcionalidade de taxa por forma
de pagamento (já usada no cálculo do Fechar Caixa, demanda 077) continua existindo, só não como
tela própria visível na navegação.

## Escopo
- Incluído: remover a aba/link "🏦 Contas Bancárias" da navegação (admin e PDV, se estiver em
  ambos). Não apagar a tabela `jsgrafica_contas_bancarias` nem os dados já cadastrados — só tirar
  o acesso via menu por enquanto.
- Fora de escopo: decidir agora onde essa configuração deveria morar (isso fica registrado como
  backlog de produto — ver `pm/demandas/STATUS.md`, seção de arquitetura, a discutir quando a
  84/integração de bancos estiver mais madura).

## Critérios de aceite
- [ ] Aba "Contas Bancárias" não aparece mais na navegação
- [ ] `/api/fechamento` continua calculando a discriminação por forma de pagamento normalmente
      (a lógica em si não muda, só o acesso via UI)

## Referências
Demanda 077 (criou a aba). `jsgrafica_contas_bancarias` (mantém).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Confirmado antes: a aba só existia no admin (`app/page.tsx`) — nunca foi adicionada ao PDV
  (`app/pdv/page.tsx`, sem nenhuma referência a "Contas Bancárias"/`TelaContasBancarias`), então
  não havia nada a remover lá. Removida só a entrada `{ id: "contas", ... }` do array `abas` em
  `app/page.tsx` — mudança mínima e reversível: o componente `TelaContasBancarias`, a rota
  `/api/contas-bancarias`, o tipo `Aba` (ainda inclui `"contas"`) e o render condicional
  (`{aba === "contas" && <TelaContasBancarias />}`) continuam intactos no código, só ficaram
  inacessíveis por não ter mais botão de navegação. Fácil de trazer de volta quando o Edvam
  decidir onde essa configuração deve morar (84/Open Finance).
- Testes realizados e resultado:
  Playwright local: confirmado que o botão "🏦 Contas Bancárias" não aparece mais no menu do
  admin (screenshot). Confirmado que `/api/fechamento` continua respondendo normalmente com
  `porFormaPagamento` presente (lê a tabela `jsgrafica_contas_bancarias` direto, nunca dependeu da
  UI/rota de navegação). `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy.
  Deploy em produção: `npx vercel --prod --yes` → `dpl_J4Vk4taBq6YVaLDbqseMNh9Goruq`, reconfirmado
  com `/api/fechamento` respondendo (`porFormaPagamento` presente) em produção.
- Achados fora do escopo: nenhum.
- Status final: concluída.
