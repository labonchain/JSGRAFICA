# 252 — Atualizar Exemplo A do blueprint com o resultado real da demanda 250

Status: aprovada
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
A demanda 251 checou o status da demanda 250 no momento da execução e ela ainda aparecia "não
concluída" — por timing (a 250 fechou muito perto disso), não erro de verificação. Por isso o
Exemplo A do blueprint ficou com um bloco "⏳ pendente de atualizar quando a 250 fechar", cobrindo
os 2 cenários possíveis em aberto. A 250 já fechou de verdade, e o resultado é conhecido: fez os
dois caminhos (não só um) — texto do Pix ajustado ("a gente avisa por aqui") + rascunho de
confirmação gerado automaticamente assim que o pagamento é detectado
(`confirmarPedidosPagosPorOrder`), sempre pro Admin revisar, nunca enviado sozinho.

## Objetivo
O bloco "pendente" do Exemplo A vira a descrição real e final do que já está em produção.

## Escopo
- Incluído: substituir o bloco "⏳ pendente de atualizar quando a 250 fechar" por uma descrição
  do comportamento real implementado: rascunho de confirmação gerado automaticamente (função
  `montarMensagemPagamentoConfirmado`, `lib/pedidos.ts`) assim que
  `confirmarPedidosPagosPorOrder` confirma o pagamento — aparece pronto no Inbox pro Admin mandar
  com 1 clique, nunca sai sozinho.
- Incluído: adicionar esse passo à conversa exemplo do Exemplo A (o rascunho aparecendo, e o
  Admin mandando), mesmo padrão visual já usado pro card de aprovação de pedido.
- Incluído: atualizar a nota SISTEMA que hoje diz "nenhuma mensagem sai pro cliente confirmando
  isso" — não é mais verdade, corrigir pra refletir o rascunho automático.
- Explicitamente fora de escopo: qualquer outra mudança no documento — só este ponto específico.

## Critérios de aceite
- [ ] Bloco "pendente" removido, substituído pela descrição real
- [ ] Exemplo A mostra o passo do rascunho de confirmação aparecendo pro Admin
- [ ] Artefato republicado na mesma URL

## Riscos e cuidados
Nenhum — ajuste pequeno e pontual de documento.

## Referências
Demanda 250 (resultado real, `lib/pedidos.ts`/`lib/mercadopago.ts`). Demanda 251 (onde o bloco
pendente foi criado).

## Relato de execução

Executada em 2026-07-30 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Correção em
`pm/conhecimento/blueprint-conversas-exemplo-agente.md` (nova seção "O que mudou (252)") e
artefato republicado na mesma URL das correções anteriores.

### O que foi feito
Li o relato real da demanda 250 (concluída em 2026-07-30) e o código (`montarMensagemPagamentoConfirmado`
em `lib/pedidos.ts`, `confirmarPedidosPagosPorOrder` estendida em `lib/mercadopago.ts`) antes de
editar. Confirmado: a 250 fez os 2 caminhos, não só 1 — texto do Pix corrigido ("a gente avisa por
aqui", não mais "a gente já confirma automaticamente") E rascunho de confirmação gerado
automaticamente assim que o pagamento é detectado, sempre pro Admin revisar/mandar.

No Exemplo A: (1) atualizei o texto do Pix pro texto real e final (necessário — a versão antiga
contradizia diretamente a correção que está sendo documentada, deixar como estava seria
inconsistente dentro do próprio exemplo, não é escopo novo, é o mesmo ponto); (2) troquei a nota
SISTEMA de "nenhuma mensagem sai pro cliente" pra descrever o rascunho automático real, citando as
funções exatas; (3) removi o bloco "⏳ pendente de atualizar quando a 250 fechar" e substituí por
um passo novo na conversa — o rascunho aparecendo (texto exato de `montarMensagemPagamentoConfirmado`,
reproduzido literalmente, mesmo cuidado das demandas anteriores) e o Admin mandando sem editar.

### Testes realizados e resultado
Nenhum teste de execução — ajuste de documento. Conferi que o texto do Pix e do rascunho no
blueprint batem literalmente com o que está no código real (`lib/pedidos.ts`).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo.

### Status final
Concluída. Os 3 critérios de aceite atendidos: bloco "pendente" removido e substituído pela
descrição real; Exemplo A mostra o rascunho aparecendo pro Admin e sendo enviado; artefato
republicado na mesma URL com a seção "O que mudou (252)" visível.
