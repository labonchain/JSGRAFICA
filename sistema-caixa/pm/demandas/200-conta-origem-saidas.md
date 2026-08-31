# 200 — Campo "conta de origem" nas saídas (separar de quem vendeu)

Status: concluída
Criada em: 2026-07-16
Aprovada em: 2026-07-16
Concluída em: 2026-07-16
Chat executor: 03 - APP JS GRAFICA

## Contexto
Mapeamento do PM (`pm/conhecimento/mapa-fluxo-dinheiro-entre-contas.md`), a partir do caso real
de hoje: venda de RECARGA VEM R$102,50 em Dinheiro na gaveta da Zu, repasse de R$100 bancado com
saldo do Mercado Pago (não com o dinheiro físico da venda). O sistema registrou a saída automática
como se tivesse saído da gaveta da Zu (único campo que existe hoje é `operador`), quando na
verdade o dinheiro físico continua 100% lá — quem gastou de verdade foi o Mercado Pago. Isso
gerou uma divergência de +R$97,80 no fechamento da Zu que só foi entendida depois de investigação
manual do PM. `jsgrafica_saidas` não tem NENHUM campo hoje pra dizer "de qual conta esse dinheiro
saiu de verdade" — só `operador` (quem vendeu/gaveta original), que conflita os dois conceitos.

## Objetivo
Toda saída pode registrar de qual conta o dinheiro realmente saiu (quando for diferente da gaveta
de quem vendeu) — e o cálculo de divergência por operador para de descontar dinheiro que nunca
saiu fisicamente da gaveta dele.

## Escopo
- Incluído: coluna nova `conta_origem` (nullable) em `jsgrafica_saidas`, valores fixos
  correspondentes às 7 contas do mapa: `dinheiro_zu`, `dinheiro_gabi`, `mercadopago`, `stone`,
  `caixa_economica`, `recargapay`. **Default `null`** — significa "mesma gaveta do operador",
  comportamento de hoje, sem nenhuma mudança pro caso comum (recarga paga e repassada com o
  mesmo dinheiro físico da venda).
- Repasse automático de recarga (VEM/Celular) continua nascendo com `conta_origem: null` sempre
  — **não perguntar nada na hora da venda** (não travar o balcão, mesma regra da 163/146/196).
  A correção é sempre DEPOIS, pelo Admin, pro caso raro (achado retroativamente, como hoje).
- **Correção auditável** (mesmo padrão da 180 `corrigirFormaPagamento`): ação Admin-only pra
  setar/mudar `conta_origem` de uma saída já existente, com histórico (quem corrigiu, de→para,
  quando) — nunca sobrescreve silenciosamente.
- `getTotalSaidasOperador` (usado no cálculo de divergência por operador, `lib/supabase-admin.ts`)
  passa a **ignorar** saídas cujo `conta_origem` não seja null e não corresponda à gaveta daquele
  operador (ex. `conta_origem='mercadopago'` nunca desconta do esperado de dinheiro da Zu/Gabi) —
  esse dinheiro fica registrado como pendente (ver item de "pendência" abaixo, resolvida de fato
  pela demanda 201).
- **Indicador simples de pendência**: uma lista (Financeiro ou Fechar Caixa) mostrando saídas com
  `conta_origem` preenchido e diferente da gaveta de quem vendeu, ainda sem uma transferência
  correspondente lançada (a 201 cria o mecanismo de transferência que resolve isso — aqui só
  precisa EXISTIR o dado pra a 201 consultar depois; se ficar mais simples implementar a lista
  junto com a 201, documentar essa decisão e não duplicar esforço).
- Explicitamente fora de escopo: perguntar `conta_origem` em qualquer fluxo de venda em tempo
  real — é sempre correção posterior, nunca fricção na hora de vender.

## Critérios de aceite
- [x] Coluna `conta_origem` criada, nullable, sem default diferente de null
- [x] Saída nova (venda normal) continua nascendo com `conta_origem: null`, zero mudança visível
- [x] Admin consegue corrigir `conta_origem` de uma saída existente, com histórico auditável
- [x] `getTotalSaidasOperador` não desconta saída com `conta_origem` de outra conta que não a
      gaveta do operador
- [x] Testado reproduzindo o caso real de hoje (saída de R$100 corrigida pra
      `conta_origem='mercadopago'`, divergência da Zu recalculada sem esse desconto)

## Riscos e cuidados
Não confundir `operador` (quem vendeu, mantém como está) com `conta_origem` (de onde saiu o
dinheiro de verdade) — são conceitos diferentes, mesmo erro que a gaveta_destino da 196 já evitou
uma vez (não misturar "quem" com "de onde").

## Referências
`pm/conhecimento/mapa-fluxo-dinheiro-entre-contas.md` (mapa completo). Demanda 180
(`corrigirFormaPagamento`, mesmo padrão de correção auditável). Demanda 196/197 (mesma lição:
separar "quem" de "de onde"). Caso real: saída `55c45c7e-dbd0-49f7-a12f-95192e12b1e2` (repasse de
`ped-1085`, corrigido manualmente pelo PM hoje via SQL direto — candidato a virar o teste real
desta demanda). Demanda 201 (tela de transferência entre contas, depende desta).

## Relato de execução
Implementado exatamente conforme o mapa do PM (`pm/conhecimento/mapa-fluxo-dinheiro-entre-contas.md`).

**DB** (`saidas_conta_origem`, migration aplicada): coluna `conta_origem` (text, nullable, sem
default — sempre null a menos que corrigido explicitamente) + `conta_origem_historico` (jsonb,
default `[]`) em `jsgrafica_saidas`. Check constraint restringe aos 6 valores fixos
(`dinheiro_zu`, `dinheiro_gabi`, `mercadopago`, `stone`, `caixa_economica`, `recargapay` — a
gaveta física "sem dono" do Edvam não entra aqui, é conceito de `gaveta_destino` da 196, não uma
conta). Lista compartilhada em `lib/dados.ts` (`CONTAS_ORIGEM`), pronta pra 201 reaproveitar no
De/Para da transferência.

**Backend** (`app/api/saidas/route.ts`): novo branch `corrigirContaOrigem: true` no PATCH,
mesmo padrão da 180 (`corrigirFormaPagamento`) — separado do edit genérico (valor/categoria/
descrição/data, que não audita), sempre grava `{em, operador, de, para}` em
`conta_origem_historico` antes de mudar, rejeita valor inválido (fora dos 6 fixos) e rejeita
"correção" pro mesmo valor que já está (no-op explícito, não silencioso). GET passou a
selecionar `conta_origem` também.

**`getTotalSaidasOperador`** (`lib/supabase-admin.ts`): mapa `Zu→dinheiro_zu`,
`Gabi→dinheiro_gabi` — a query só soma saída do operador quando `conta_origem` é null (mesma
gaveta, caso comum) OU bate com a conta própria dele. Qualquer outra conta explícita (ex.
`mercadopago`) fica de fora do desconto. Operador sem entrada no mapa (ex. Edvam, sem gaveta
própria — não deveria chamar esta função hoje, mas por segurança) só soma saída com
`conta_origem` null.

**UI** (`app/page.tsx`, `TelaSaidas`): cada card de lançamento mostra um badge
"🏦 Saiu de: {label}" quando `conta_origem` está preenchido (visibilidade imediata, sem precisar
investigar). Botão "Conta" (Admin-only, ao lado de Editar/Cancelar) abre modal dedicado — select
com as 6 contas + opção "mesma gaveta de quem vendeu (padrão)" — que chama o PATCH auditável.
Modal separado do "Editar lançamento" (130) de propósito: aquele não audita mudanças, e misturar
os dois esconderia a natureza especial dessa correção.

**Decisão sobre o "indicador de pendência"** (item explicitamente flexível no escopo): NÃO
construí a lista agora — a demanda já antecipava essa opção ("se ficar mais simples implementar
junto com a 201, documentar e não duplicar esforço"). Motivo: "pendência resolvida" só existe de
verdade depois que a 201 criar o mecanismo de transferência (não há como marcar nada como
"resolvido" sem essa peça) — construir uma lista agora que seria imediatamente reescrita pra
consumir o novo dado da 201 seria retrabalho. A 201 vai consultar diretamente
`jsgrafica_saidas` filtrando `conta_origem is not null` e diferente da conta do `operador`
(mesmo mapa desta demanda) pra montar a lista de pendências e cruzar com as transferências já
lançadas.

**Teste com o caso real** (não sintético — a própria demanda sugeria isso, "candidato a virar o
teste real desta demanda"): a saída `55c45c7e-dbd0-49f7-a12f-95192e12b1e2` (repasse de R$100 do
`ped-1085`, ainda sem `conta_origem`) estava descontando R$100 do esperado de dinheiro físico da
Zu por engano (o repasse foi pago com saldo do Mercado Pago, não com a gaveta dela). Antes da
correção: `GET /api/fechamento?operador=Zu` → `totalSaidas: 100`, `saldoAcumulado: 55.50`. Apliquei
a correção real via `PATCH /api/saidas` (`corrigirContaOrigem: true, contaOrigem: 'mercadopago'`)
— resposta confirmou `conta_origem: 'mercadopago'` e o histórico `[{de: null, para: 'mercadopago',
operador: 'Edvam', em: ...}]`. Depois: `totalSaidas: 0`, `saldoAcumulado: 155.50` — exatamente
+R$100, resolvendo a divergência real que o PM tinha identificado. Testei também: correção pro
mesmo valor rejeitada (`"A conta de origem já é essa"`) e valor fora da lista fixa rejeitado
(`"Conta de origem inválida"`).

Teste de UI (Playwright, Admin): badge "Saiu de: Mercado Pago" visível no card do repasse real;
botão "Conta" abre o modal com o select já pré-preenchido com o valor atual; "Salvar" fica
desabilitado enquanto nada muda (evita corrigir pro mesmo valor à toa); "Cancelar" fecha sem
gravar nada. Prints em anexo ao chat.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_A8cDsrVWYxqqtfbaw7WBB6zy8zvL` (deploy mais lento que o normal, ~11min, sem erro), aliases
confirmados via `vercel inspect` em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

Nenhum dado sintético foi criado nesta demanda — o teste usou e corrigiu permanentemente o
registro real (que era exatamente o objetivo da correção, não um efeito colateral de teste).
