# 149 — Diagnóstico de Fechamento (Camada A/4): endpoint de coleta de dados pra reconciliação

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto — plano geral (4 camadas, esta demanda é só a A)
Fechar caixa é o momento de mais estresse do dia pro Admin — hoje, quando dá divergência, a única
forma de investigar é manual (o PM fazendo, na mão, o que virou as demandas 131/143: cruzar
pedidos, saídas, saldo real do Mercado Pago, valores digitados). O Edvam quer que isso vire
**sistema contínuo**, não investigação pontual — desenhado em 4 camadas:

1. **(Esta demanda) Coleta de dados** — reúne tudo que é preciso reconciliar, num formato
   estruturado.
2. **Regras de detecção** — sinaliza padrões já conhecidos (pedido de teste esquecido, saída
   duplicada, recarga sem repasse, etc.) — formaliza o que o PM já faz na mão.
3. **Narrativa gerada por IA** (Gemini, já configurado no projeto — `GEMINI_API_KEY`) — resumo em
   português da divergência do dia, hipóteses prováveis, editável pelo Admin.
4. **Tela** — mostra o resumo na aba Fechar Caixa (ou aba própria "Diagnóstico"), com histórico.

**Cada camada só começa depois da anterior validada** — mesmo padrão da jornada do pedido
(137-148).

## Objetivo desta demanda (Camada A)
Existe uma função/endpoint que, pra um dia (`data_dia`), devolve todos os dados necessários pra
reconciliar o fechamento, num JSON estruturado — sem regra de detecção nem narrativa ainda, só
coleta.

## Escopo
- Incluído:
  1. Novo endpoint (ex. `GET /api/fechamento/diagnostico?data=DD-MM-AA`) que devolve:
     - Todos os pedidos `entregue` do dia (id, serviço, valor, forma de pagamento escolhida,
       pagamento_confirmado, mp_order_id, telefone/nome_cliente).
     - Todas as saídas do dia (categoria, valor, operador, vinculada a pedido ou não).
     - Saldo real do Mercado Pago do dia (`saldoMercadoPagoDoDia`, já existe — reaproveitar, não
       duplicar).
     - Os valores manuais gravados no fechamento geral daquele dia (Caixa Econômica, Stone,
       RecargaPay, dinheiro, moedas, se já foi fechado) — de `jsgrafica_fechamento`.
     - Os fechamentos por operador daquele dia (Zu/Gabi — dinheiro/moedas que cada uma contou).
     - `totalEntradas`/`totalSaidas`/`saldoAnterior`/`saldoAcumulado` calculados (mesma lógica já
       usada em `GET /api/fechamento`, reaproveitar).
  2. Não implementar nenhuma regra de detecção nem chamada de IA nesta demanda — só reunir e
     devolver os dados, cru, estruturado.
- Fora de escopo: Camadas B, C, D (ficam pras próximas demandas, só depois desta validada).

## Critérios de aceite
- [ ] Endpoint devolve todos os dados listados, pra qualquer dia (passado ou hoje)
- [ ] Reaproveita funções já existentes (`saldoMercadoPagoDoDia`, cálculo de `getResumoDia` etc.)
      em vez de duplicar lógica
- [ ] Testado contra um dia com divergência conhecida (ex. 07-07-26, R$22,97) e confirma que os
      dados batem com o que já sabemos desse dia

## Referências
Demandas 131/143 (investigações manuais que esta camada formaliza). Demanda 084/124 (fonte do
saldo real do Mercado Pago). `app/api/fechamento/route.ts` (lógica de cálculo a reaproveitar).

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_6ASPdu3wXgJp5TRrUSe69EcBWDke`,
verificado em produção.

### O que foi feito
1. **Endpoint novo `GET /api/fechamento/diagnostico?data=DD-MM-AA`** (sem `data` → hoje; data
   inválida → 400). Devolve, num JSON estruturado:
   - `pedidosEntregues`: todos os entregues do dia (janela por `data_entregue_at`, a MESMA do
     `getResumoDia` — o dia do caixa é o da entrega), com id, serviço, quantidade, valor, forma
     de pagamento **usada** x **escolhida** (Fase 1), `pagamentoConfirmado`+origem, `mpOrderId`,
     telefone/nome, operador, vendaId, saída vinculada e horário;
   - `vendasLegado`: linhas de `jsgrafica_vendas` do dia (tabela parada desde a 054, mas o
     `getResumoDia` ainda soma — sem listar, dia antigo teria total que "não fecha" com a lista);
   - `saidas`: todas do dia, cada uma com `pedidoVinculado` (o vínculo mora no pedido,
     `saida_vinculada_id` — invertido aqui; cobre até pedido entregue noutro dia) e rastro de
     edição (130);
   - `saldoMercadoPago`: via `saldoMercadoPagoDoDia` (127, reaproveitada) — null se a integração
     falhar, nunca derruba o diagnóstico;
   - `fechamentoGeral`: a linha gravada do dia (critério `ehFechamentoGeral`, 092/075) com tudo
     que foi DIGITADO — contas nomeadas da 127, dinheiro/moedas, total físico, divergência;
   - `fechamentosOperadores`: gavetas de Zu/Gabi (`getFechamentosOperadoresHoje`, reaproveitada —
     já aceitava qualquer `data_dia`);
   - `totais`: `totalEntradas`/`totalSaidas`/`resultadoDia`/`saldoAnterior`/`saldoAcumulado`
     recalculados AGORA pela mesma lógica do fechamento real — comparável com o que foi gravado
     na época (diferença = alguém mexeu em pedido/saída depois do fechamento).
2. **Única mudança fora do endpoint:** `getSaldoAnterior()` ganhou parâmetro opcional `antesDe`
   (data_dia) — diagnóstico de dia passado precisa do saldo anterior relativo ÀQUELE dia. Sem o
   parâmetro, comportamento byte-idêntico ao de sempre (regressão do `GET /api/fechamento`
   testada: mesmo `saldoAnterior` de antes).
3. Zero regra de detecção, zero IA — só coleta, como o escopo manda. Todas as funções de cálculo
   reaproveitadas, nenhuma duplicada.

### Teste contra o dia da divergência conhecida (07-07-26)
- `fechamentoGeral.divergencia` = **22.97** ✓ (exatamente a divergência conhecida).
- Totais recalculados hoje **batem com os gravados na época**: entradas R$624,25 (109 pedidos),
  saídas R$472,47 (8 lançamentos, 1 vinculado a pedido), saldo anterior R$1.168,89, saldo
  acumulado R$1.320,67 — ninguém mexeu nos dados do dia depois do fechamento.
- Contas nomeadas null (o dia 07-07 foi fechado antes da 127, só `bancos` agregado R$958,04) e
  Zu/Gabi sem fechamento próprio naquele dia — o endpoint expõe isso corretamente em vez de
  inventar zero.

### Outros testes
- 09-07-26 (ontem): 91 pedidos, 10 saídas (4 vinculadas a repasse), Zu fechou R$52 / Gabi R$147,
  sem fechamento geral, breakdown de formas de pagamento coerente — incl. 5 pedidos com Pix
  escolhido ainda não confirmados, exatamente o tipo de matéria-prima que a Camada B vai usar.
- Sem parâmetro → hoje; `data=2026-07-07` (formato errado) → 400.
- **Nota**: `saldoMercadoPago` hoje vem da conta **sandbox** (credencial de teste ativa, decisão
  vigente da 084/124) — 0 pra 07-07 e R$8,56 pra 09-07 são os pagamentos de teste; quando a
  credencial de produção for ativada, o mesmo campo passa a refletir a conta real sem mudança de
  código.
- Testes 100% só-leitura — nenhum dado criado/alterado. `npx tsc --noEmit` e build limpos.
- Produção verificada: `admin.jsgrafica.site/api/fechamento/diagnostico?data=07-07-26` devolvendo
  os mesmos dados (divergência 22.97, totais idênticos).

### Critérios de aceite
- [x] Endpoint devolve todos os dados listados, pra qualquer dia (testado hoje, ontem e 07-07)
- [x] Reaproveita `saldoMercadoPagoDoDia`, `getResumoDia`, `getSaldoAnterior`,
      `getFechamentosOperadoresHoje`, `ehFechamentoGeral` — zero lógica duplicada
- [x] Testado contra 07-07-26: divergência R$22,97 confirmada e dados batem com a investigação

**Camadas B/C/D NÃO iniciadas — aguardando validação do PM desta camada, como o plano manda.**
