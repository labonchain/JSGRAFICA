# 045 — Criar pedido a partir da conversa no Inbox

Status: aprovada — fundação das demandas 046/047 (fazer primeiro)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Análise do PM (2026-07-03) sobre o atendimento real: `jsgrafica_pedidos` tem 0 linhas — todo
pedido combinado no Inbox fica só na conversa, sem virar registro consultável. O workflow
`06 - JSGRAFICA | PEDIDOS` já tem toda a lógica de categorização e cálculo de preço pronta, mas
só roda através da Dizu (IA), que está bloqueada de atender cliente real — então essa lógica
nunca é usada hoje.

Edvam aprovou um mockup visual do fluxo proposto (ver
`https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb` — mockup estático, não é
o sistema real, só referência de layout/interação). Equipe da JS Gráfica tem pouca familiaridade
com sistemas — prioridade é simplicidade (poucos cliques, sem gestos como arrastar).

## Objetivo
O atendente, direto da conversa aberta no Inbox, consegue criar um pedido estruturado (categoria
→ specs → valor já calculado → confirmar) sem digitar preço de cabeça — e esse pedido fica
registrado em `jsgrafica_pedidos`, vinculado ao contato da conversa.

## Escopo
- Incluído:
  1. Botão "📦 Criar pedido" no painel direito do Inbox (mesma área do "Lançar Venda"), visível
     quando a conversa aberta ainda não tem pedido vinculado.
  2. Fluxo de 2 passos: (a) escolher categoria — reaproveitar as mesmas categorias/chips já
     existentes no "Lançar Venda" (Xerox, Impressão, Plastificação, Foto, Banner, Encadernação,
     etc.); (b) preencher specs simples da categoria (reaproveitar a lógica de perguntas por
     categoria do nó "INICIO — Montar Contexto" do workflow `06-PEDIDOS`, ex.: banner pergunta
     largura/altura/material; foto pergunta tamanho/quantidade) e mostrar o valor já calculado
     automaticamente (reaproveitar a regra de cálculo + desconto de 10% ≥50 cópias em
     impressão/xerox do nó "CALCULAR VALOR" do mesmo workflow — pode virar uma função/rota
     compartilhada, ex. `/api/pedidos/calcular-valor`, em vez de duplicar a lógica).
  3. Ao confirmar: `INSERT` em `jsgrafica_pedidos` com `telefone` do contato da conversa aberta,
     `pedido_criado_por` = nome do atendente logado (não `'dizu'`, já que aqui é humano criando),
     `status = 'confirmado'` (o atendente já falou com o cliente, não precisa da etapa de
     confirmação por botão que o 06-PEDIDOS usa pra fluxo via IA).
  4. Depois de criado, o card do painel direito passa a mostrar o resumo do pedido (serviço,
     specs, valor) em vez do botão de criar — isso alimenta a demanda 046.
- Fora de escopo: enviar qualquer mensagem automática ao cliente neste momento (isso é a 046);
  mexer no fluxo do `06-PEDIDOS` no n8n (só reaproveitar a lógica, não o workflow em si).

## Critérios de aceite
- [ ] Botão "Criar pedido" aparece só quando a conversa não tem pedido vinculado
- [ ] Fluxo de categoria → specs → valor calculado funciona pra pelo menos 3 categorias
      diferentes (ex.: Xerox, Plastificação, Banner)
- [ ] Pedido confirmado grava em `jsgrafica_pedidos` com telefone certo e valor batendo com o
      calculado na tela
- [ ] Testado criando um pedido real (ou com dado de teste) e conferindo a linha no banco

## Riscos e cuidados
Não duplicar a lógica de cálculo do 06-PEDIDOS sem necessidade — se possível, extrair pra uma
função/rota compartilhada, já que existe a chance de reaproveitar em outros lugares depois
(ex.: se o 06-PEDIDOS um dia voltar a rodar pra cliente real).

## Referências
Mockup: `https://claude.ai/code/artifact/d4d7844b-aad3-4ee4-936a-3401e05696cb`. Workflow
`06 - JSGRAFICA | PEDIDOS` (nós "INICIO — Montar Contexto" e "CALCULAR VALOR", referência de
lógica). Tabela `jsgrafica_pedidos`. `components/TelaInbox.tsx` (painel "Lançar Venda" já
existente, mesma área).

## Relato de execução

### O que foi feito
Li o mockup completo (`WebFetch` no artifact) e o workflow `06 - JSGRAFICA | PEDIDOS`
(`get_workflow_details`) — nós "INICIO — Montar Contexto" (perguntas por categoria) e
"CALCULAR VALOR" (desconto de 10% em impressão/xerox ≥50 unid.).

**Adaptação deliberada da referência**, registrada aqui porque desvia do texto literal da
demanda: o nó "INICIO — Montar Contexto" pergunta specs em texto livre (ex. "Qual tamanho?")
porque foi desenhado pra um chat de IA sem produto pré-selecionado. Mas o catálogo real
(`jsgrafica_produtos`) já tem essas specs embutidas como produtos distintos (ex. "FOTO 10X15" e
"FOTO 15X20" são dois produtos, não um produto + uma pergunta de tamanho). Reaproveitar a lógica
de perguntas por texto livre exigiria depois casar a resposta de volta com um produto/preço —
duplicando decisão que o catálogo já resolve. Por isso o fluxo implementado é: categoria (chips
idênticos ao "Lançar Venda") → produto específico da categoria (mesma grade de cards do "Lançar
Venda", já carrega tamanho/tipo/preço) → quantidade. A única lógica nova de fato (a regra de
desconto por volume) foi extraída pra `lib/pedidos.ts` (`calcularValorPedido`), usada tanto pela
rota de preview quanto pela gravação final — não duplicada.

Arquivos novos: `lib/pedidos.ts` (regra de desconto compartilhada), `lib/inboxLog.ts` (log de
mensagem enviada extraído de `app/api/inbox/responder`, reaproveitado pela 046),
`app/api/pedidos/calcular-valor/route.ts` (preview de valor).
Arquivos alterados: `app/api/pedidos/route.ts` (GET ganhou filtro `?telefone=`; POST ganhou um
segundo caminho ativado por `produtoId` — calcula preço/desconto do catálogo e usa
`pedido_criado_por` = atendente logado, `status: 'confirmado'` direto; o caminho antigo do
balcão/fila de impressão continua idêntico e sem quebra), `app/api/inbox/responder/route.ts`
(refatorado pra usar `lib/inboxLog.ts`, mesmo comportamento), `components/TelaInbox.tsx` (bloco
"📦 Pedido desta conversa" entre o status de atendimento e o "Lançar Venda", com o fluxo
categoria → produto → quantidade/valor manual → confirmar).

Produtos com `preco: null` (categoria "Impressão metro" — banner, adesivos; todos com
`requer_orcamento: true` no banco) não entram no cálculo automático — a tela pede o valor
combinado manualmente em vez de calcular `0 × qtd`, que seria o resultado (incorreto) da lógica
de referência aplicada literalmente a esses produtos.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` — limpos.
- `/api/pedidos/calcular-valor`: Xerox A3 qtd=60 → `desconto 10%, R$135,00` (correto: 150 × 0,9);
  Plastificação A3 qtd=6 → `sem desconto, R$66,00` (grupo fora da regra de volume); Banner por
  metro → `422 requerOrcamento` (sem preço de tabela).
- Fluxo completo via `curl` com telefone sintético (`550000000001`, não é WhatsApp real): criar
  pedido → grava com `desconto_pct`/`valor_final` batendo exato, `pedido_criado_por: "Edvam"`,
  `status: "confirmado"`. `GET ?telefone=` retorna o pedido certo.
- **Testado na UI real via Playwright** (login admin, Inbox, conversa real "Sr. Oliveira"):
  botão "Criar pedido" aparece só quando a conversa não tem pedido; categoria Xerox → produto
  "XEROX A3" → quantidade 60 → calcula e mostra "R$ 135,00 (10% desc.)" ao vivo; "Confirmar
  pedido" grava e o card passa a mostrar o resumo + stepper (alimenta a 046). Testado também o
  caminho de orçamento manual (Banner por metro → campo de valor livre em vez de calcular). O
  pedido de teste criado nesse contato real foi **apagado do banco depois do teste**
  (`ped-0005`), não ficou pedido de mentira vinculado a cliente de verdade.
- Critérios de aceite: 3+ categorias testadas (Xerox, Plastificação, Banner) ✅; botão só aparece
  sem pedido vinculado ✅; valor gravado bate com o calculado na tela ✅.

### Achados fora do escopo
- **🔴 Bug crítico corrigido (dentro do meu domínio, `lib/zapi.ts`)**: `jsgrafica_agent_config`
  tem RLS ativa **sem nenhuma política** (`pg_policies` vazio pra essa tabela) desde a demanda
  025. `lib/zapi.ts` buscava essa config com o cliente anônimo (`lib/supabase.ts`) — ou seja,
  desde a 025, **toda a Z-API parou de conseguir ler o próprio token de conexão**, silenciosamente
  (`getConfig()` lançava "Configuração Z-API não encontrada"). Isso não é specífico da 045/046 —
  já quebrava a resposta manual do Inbox em produção (`/api/inbox/responder`), `/api/zapi/status`
  e `/api/zapi/qrcode` também. Corrigi trocando pro `supabaseAdmin` (service_role) em
  `lib/zapi.ts` — arquivo é só server-side, nunca importado por componente `'use client'`
  (confirmei via grep). Testado: `/api/zapi/status` respondia com erro antes da correção, voltou
  a responder normal (`connected: true`) depois — **em produção também**, não só local.
- **Achado relacionado ao já registrado (`contact_lid` NOT NULL sem default)**: o mesmo problema
  já anotado pro botão "Nova conversa" (`STATUS.md`) também derrubava silenciosamente a criação
  automática de contato dentro do fluxo de log de mensagem enviada (`registrarMensagemEnviada`,
  usado por `/api/inbox/responder` e agora pela 046) — `jsgrafica_contatos.contact_lid` é a
  **chave primária** da tabela (não só NOT NULL). Corrigido nesse caminho específico (uso
  `contact_lid: phone` como valor, mesma convenção já usada nos registros legados) e verificado
  via teste com telefone sintético (contato passou a ser criado certo). O botão "Nova conversa"
  em si continua com o mesmo problema — não mexi nele, é um caminho de código diferente
  (`iniciarConversa` em `TelaInbox.tsx`), fora do escopo desta demanda.

### Status final
Concluída, testada (local + produção real) e deployada junto com a 046 —
`dpl_64fbuKP9ogvmu8CU2XWdaHwniR7g`.
