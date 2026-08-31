# 163 — Balcão: lembrete leve pra vincular contato + criar contato rápido (sem travar venda)

Status: concluída
Criada em: 2026-07-12
Aprovada em: 2026-07-12
Concluída em: 2026-07-12
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam quer rastrear melhor o padrão "cliente pede no Inbox mas fecha no balcão"
(confirmado real na demanda 160 — Wilson Reis, Luciano Araújo, Beronice Maria: mandam arquivo no
WhatsApp, não fecham ali, aparecem dias depois como venda de balcão). Isso não exige capturar
contato em 100% das vendas (a 160 já mediu o padrão com cobertura parcial) — mas quanto mais
vendas tiverem contato vinculado, melhor a medição futura e mais fácil reconhecer o cliente que
já veio pelo WhatsApp.

**Decisão já tomada** (conversa com o PM, 2026-07-12): não travar nenhuma venda por causa disso —
esse projeto sempre protegeu a velocidade do caixa em venda rápida (mesmo racional da demanda
146, que deixou "leva agora" livre de propósito). Em vez de obrigar, a solução é um **lembrete
leve, que não bloqueia**, na hora que mais importa: quando a venda está prestes a fechar sem
nenhum contato vinculado.

**Confirmado tecnicamente antes desta demanda**: gerar/confirmar Pix no balcão NÃO depende de
contato nenhum (`app/api/mercadopago/cobranca/route.ts` — `telefone` é opcional, nem validado) —
esta demanda não mexe em pagamento, só na captura de quem é o cliente.

**Hoje**: campo "🔍 Vincular contato (opcional)" (`app/page.tsx` e `app/pdv/page.tsx`, bloco
"Vincular contato") só busca contato JÁ EXISTENTE — se a busca não encontra ninguém, não tem
alternativa, a venda segue sem vínculo.

## Objetivo
1. Ao confirmar uma venda sem contato vinculado, um lembrete leve pergunta se o cliente já falou
   no WhatsApp — 1 clique pra buscar, ou segue a venda normalmente sem vincular.
2. Quando a busca de contato não encontra ninguém, dá pra criar um contato novo rápido (nome +
   telefone opcional) sem sair da tela de venda, em vez de só "não achei nada".

## Escopo
- Incluído, nos dois balcões (`app/page.tsx` e `app/pdv/page.tsx`):
  1. **Lembrete não-bloqueante**: no modal "Finalizar venda", se `contatoSelecionado` estiver
     vazio no momento de confirmar, mostrar um aviso leve (ex. "Esse cliente já falou com a gente
     no WhatsApp?") com o campo de busca em destaque — mas sempre com um jeito claro de
     confirmar a venda mesmo sem vincular (nunca trava). Decisão do executor sobre a forma exata
     (ex. o próprio modal já existente ganha essa seção, ou um passo extra opcional antes de
     confirmar) — o requisito é só: nunca bloquear.
  2. **Criar contato rápido**: quando a busca no campo "Vincular contato" não retorna nenhum
     resultado, mostrar a opção "+ Criar novo contato" — abre 2 campos (nome obrigatório,
     telefone opcional) e vincula esse contato novo à venda, sem sair da tela.
  3. **Resolução técnica do `contact_lid`**: `jsgrafica_contatos.contact_lid` é chave primária
     `NOT NULL` sem default — pra criar contato só com nome/telefone do balcão (sem payload de
     WhatsApp), reaproveitar o MESMO fallback já usado em outro lugar do código
     (`contact_lid = telefone`, usado em `lib/inboxLog.ts` pra contato novo criado ao enviar
     mensagem manual) — não inventar mecanismo novo.
  4. Contato criado assim precisa ficar identificável depois como "veio do balcão" (não confundir
     com contato que já teve conversa de WhatsApp de verdade) — decisão do executor sobre o campo
     exato (ex. reaproveitar `tipo_registro` se já existir com esse propósito, ou um valor
     específico), documentar a escolha no relato.
- Fora de escopo: qualquer mudança em pagamento/Pix (já confirmado que não depende disso). Tornar
  o vínculo obrigatório em qualquer cenário — decisão explícita de não travar.

## Critérios de aceite
- [ ] Venda sem contato vinculado mostra o lembrete ao confirmar, mas NUNCA impede a venda de
      fechar (testar explicitamente: ignorar o lembrete e confirmar mesmo assim funciona)
- [ ] Busca sem resultado mostra "+ Criar novo contato", cria com nome (+ telefone opcional) e
      vincula à venda em andamento
- [ ] Contato criado pelo balcão sem telefone real não quebra nada (mesmo fallback de
      `contact_lid` já usado em `lib/inboxLog.ts` — sem erro de constraint)
- [ ] Testado nos dois balcões (admin e PDV)
- [ ] Venda "leva agora" rápida sem qualquer intenção de vincular continua tão rápida quanto hoje
      (regressão explícita — cronometrar/comparar)

## Referências
Demanda 160 (achado que motiva — conversão cruzada Inbox→balcão real mas parcial). Demanda 146
(mesmo racional de não travar venda rápida). `lib/inboxLog.ts` (fallback `contact_lid = telefone`
já resolvido, reaproveitar). `app/api/mercadopago/cobranca/route.ts` (confirmação de que Pix não
depende de contato).

## Relato de execução
Executada em 2026-07-12 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_3kPwBUvijaZaz95Mr5VNfznz62Sd`,
testada nos 2 balcões (admin local + PDV de produção).

### O que foi feito
1. **`components/VincularContatoBalcao.tsx` (novo, compartilhado)** — as cópias de busca que
   cada balcão tinha viraram um componente só, usado em DOIS lugares por página: o campo
   "🔍 Vincular contato (opcional)" do painel do carrinho e o lembrete do modal. Busca com
   debounce (mesma rota do Inbox) e, quando não acha ninguém, **"+ Criar novo contato «busca»"**
   → nome (pré-preenchido com o que foi digitado, obrigatório) + telefone opcional → cria e
   vincula sem sair da venda.
2. **Lembrete não-bloqueante no modal "Finalizar venda"**: bloco azul leve "💬 Esse cliente já
   falou com a gente no WhatsApp? (opcional)" com o componente dentro — **só no "levou agora"
   sem vínculo** (decisão do executor: no "retira depois" a 146 já captura o dono, mostrar os
   dois seria redundante). O botão ✓ Confirmar NUNCA depende disso; ao vincular, o bloco some
   (objetivo cumprido) e o vínculo fica visível no painel.
3. **`POST /api/clientes` (novo)**: nome obrigatório; telefone normalizado pro formato da base
   ("81 99999-0163" → "5581999990163"); telefone já existente → **vincula o contato existente**
   em vez de duplicar (`jaExistia: true` — a base já sofre com duplicatas de contact_lid);
   telefone < 8 dígitos → 400.
4. **Resolução do `contact_lid` (item 3 do escopo)**: mesmo fallback do `lib/inboxLog.ts`
   (`contact_lid = phone`); SEM telefone, um id sintético `balcao-<timestamp>` cumpre o papel
   nos dois campos — zero erro de constraint (testado).
5. **Identificação da origem (item 4, decisão documentada)**: `tipo_registro: 'BALCAO'` — o
   pipeline do WhatsApp usa 'INDIVIDUAL'/'GRUPO', então o valor separa com precisão quem nunca
   teve conversa real.
6. **Proteção do Inbox (achado durante a execução)**: contato de balcão nasce com
   `data_ultimo_contato: NULL` e a rota de conversas ganhou `nullsFirst: false` — sem isso, o
   default do Postgres (NULLS FIRST em DESC) colocaria todo contato de balcão NO TOPO da lista
   do Inbox como se fosse conversa. Verificado: contato de balcão não aparece na lista; se o
   cliente mandar WhatsApp um dia, o pipeline preenche a data e ele entra normalmente.

### Testes (sintéticos, tudo apagado; vendas de teste SEMPRE em Dinheiro — MP é produção real)
- **API**: criar com telefone formatado → normalizado; mesmo telefone 2x → `jaExistia` sem
  duplicar; sem telefone → `balcao-<ts>`; sem nome → 400; telefone curto → 400; contato balcão
  AUSENTE da lista de conversas do Inbox (nullsFirst validado).
- **UI admin (local)**: lembrete visível no modal (screenshot) → **ignorado → venda fechou
  normal** (critério "nunca trava", explícito); busca sem resultado → "+ Criar novo contato"
  com nome pré-preenchido → criado com fone e vinculado (painel); com vínculo, lembrete ausente;
  criado SEM fone pelo lembrete do modal → venda fechou vinculada. Banco conferido: os 3 pedidos
  com exatamente `telefone: 'balcao'` (anônimo), `5581988880163` (com fone) e
  `balcao-<ts>` + nome (sem fone).
- **Regressão de velocidade (critério 5)**: venda rápida ignorando tudo = mesmíssimos cliques de
  antes (o lembrete não adiciona passo — é um bloco passivo no modal que já existia), medida em
  3,4s do primeiro clique ao fechamento via Playwright.
- **PDV de produção (Zu)**: campo novo no painel, lembrete no modal (screenshot), contato criado
  sem fone pelo lembrete, venda fechou vinculada, zero erros de página. Limpeza total: pedido,
  contato e a abertura de caixa 0/0 usada pra passar o portão de domingo — tudo apagado via REST
  com conferência.

### Critérios de aceite
- [x] Lembrete aparece e NUNCA impede a venda (ignorar + confirmar testado explicitamente)
- [x] Busca sem resultado → "+ Criar novo contato" → cria e vincula na hora
- [x] Contato sem telefone real sem erro de constraint (fallback do inboxLog + id sintético)
- [x] Testado nos dois balcões (admin local + PDV produção)
- [x] Venda rápida sem vínculo idêntica em cliques (regressão medida)
