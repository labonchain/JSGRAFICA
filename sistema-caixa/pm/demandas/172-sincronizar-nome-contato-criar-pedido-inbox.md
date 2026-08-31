# 172 — Sincronizar nome do contato ao criar pedido pelo Inbox

Status: concluída
Criada em: 2026-07-14
Aprovada em: 2026-07-14
Concluída em: 2026-07-14
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 167 corrigiu o `POST /api/clientes` (fluxo do balcão, "+ Criar novo contato" da 163):
quando o telefone já existe com nome vazio ou igual ao nome da empresa, o nome digitado agora
corrige o contato. Achado registrado no relato da 167: o fluxo "Criar pedido" a partir de uma
conversa do Inbox (`app/api/pedidos/route.ts`) tem o MESMO gap — grava `nome_cliente` no pedido
mas nunca toca `jsgrafica_contatos.lead_name`. Sem esta demanda, os contatos que a 168 for corrigir
podem voltar a ficar com nome errado/vazio assim que a equipe criar um novo pedido puxando o nome
de dentro de uma conversa do WhatsApp.

## Objetivo
Criar um pedido a partir de uma conversa do Inbox corrige o nome do contato quando ele estava
vazio ou era claramente inválido (nome da empresa) — mesma regra da 167, outro ponto de entrada.

## Escopo
- Incluído: em `app/api/pedidos/route.ts` (POST, caminho do "Criar pedido" via Inbox), reaproveitar
  a MESMA lógica de correção de nome já implementada na 167 (`api/clientes`, ideal extrair pra uma
  função compartilhada em vez de duplicar) — quando o contato do telefone tem `lead_name` vazio ou
  igual ao nome da empresa (mesma normalização já feita na 167), atualizar pro nome usado ao criar
  o pedido.
- Mesma regra conservadora da 167: nunca sobrescrever um nome já bom.
- Explicitamente fora de escopo: qualquer outro campo do contato além do nome.

## Critérios de aceite
- [ ] Criar pedido pelo Inbox pra um contato com nome vazio/errado corrige o `lead_name`
- [ ] Criar pedido pra contato com nome bom não sobrescreve
- [ ] Contato aparece na busca de Clientes/Inbox pelo nome novo depois
- [ ] Testado com um caso equivalente ao da 167 (contato sintético)

## Riscos e cuidados
Reaproveitar a lógica da 167 em vez de duplicar — evita as duas regras divergirem no futuro.

## Referências
Demanda 167 (mesma raiz, fluxo do balcão já corrigido). `app/api/pedidos/route.ts`,
`app/api/clientes/route.ts` (função de correção de nome já existente).

## Relato de execução
Executada em 2026-07-14 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_74g1PBe4HMoBu2Hj4Z4ZT8PAnJYc`.

### O que foi feito
1. **Lógica extraída pra função compartilhada** (como a demanda pediu, evitando divergência):
   `corrigirNomeContatoSeInvalido(telefone, nomeNovo)` + `nomeContatoInvalido()` em
   `lib/supabase-admin.ts`. A 167 (`POST /api/clientes`) foi refatorada pra usar a mesma função —
   comportamento idêntico, regressão testada.
2. **`POST /api/pedidos` (caminho "Criar pedido" do Inbox)** chama o reparo logo após criar o
   pedido — best-effort (falha nunca derruba a criação).
3. **Descoberta que mudou o design**: o Inbox manda como `nomeCliente` o DISPLAY do próprio
   contato (`lead_name || lead_push_name || 'Contato privado'`) — então a função valida também o
   nome de ENTRADA: "Contato privado" e variações do nome da empresa nunca sobrescrevem nada
   (senão o reparo gravaria o próprio lixo de volta). O ganho real deste ponto de entrada é o
   contato com `lead_name` vazio e `push_name` bom: o pedido carrega o push_name e o `lead_name`
   passa a ficar buscável.

### Testes (sintéticos, tudo apagado — 3 pedidos, 3 rascunhos, 3 contatos)
- Contato `lead_name = 'J S Gráfica'` + pedido do Inbox com nome bom → **corrigido** (banco).
- Contato com nome bom + pedido com apelido → **intacto**.
- Contato com nome nulo + `nomeCliente: 'Contato privado'` → **NÃO gravou** (validação de
  entrada) — e em seguida o mesmo contato corrigido pelo caminho do balcão (regressão da 167
  refatorada, `nomeCorrigido: true`).
- Busca de Clientes acha pelo nome novo (critério 3).

### Critérios de aceite
- [x] Criar pedido pelo Inbox corrige lead_name vazio/errado
- [x] Nome bom não é sobrescrito
- [x] Busca acha pelo nome novo
- [x] Testado com casos equivalentes aos da 167 (sintéticos)
