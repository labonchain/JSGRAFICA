# 167 — Sincronizar nome do contato ao vincular/criar contato no pedido

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-14
Chat executor: 03 - APP JS GRAFICA

## Contexto
`jsgrafica_pedidos.nome_cliente` (nome digitado no pedido) e `jsgrafica_contatos.lead_name` (nome
usado pela busca em Clientes/Inbox) são campos totalmente desconectados — confirmado lendo
`app/api/pedidos/route.ts` (grava `nome_cliente` direto, nunca toca em `jsgrafica_contatos`) e
`app/api/clientes/route.ts` (POST, demanda 163: quando o telefone já existe como contato, devolve
o nome ANTIGO do contato e nunca atualiza pro nome novo digitado). Caso real: pedido de "Laura
Isabel" com telefone que já existia como contato de WhatsApp real e ativo, só que gravado com
`lead_name: "J S Gráfica"` (nome errado, ver demanda 168) — o pedido tem o nome certo, mas a
cliente é invisível na busca de Clientes/Inbox porque o contato dela continua com o nome errado.
Isso vai continuar acontecendo com qualquer contato de nome ruim/vazio (ver demanda 168, ~64
contatos hoje).

## Objetivo
Vincular ou criar contato a partir de um pedido corrige o nome do contato quando ele estava vazio
ou claramente pior que o nome novo — a busca por nome passa a encontrar a pessoa certa.

## Escopo
- Incluído: em `app/api/clientes/route.ts` (POST), quando o telefone já existe como contato,
  antes de devolver `jaExistia: true` com o nome antigo, comparar: se o contato existente não tem
  `lead_name` (nulo) OU tem `lead_name` claramente inválido pra uma pessoa (decisão do executor:
  pelo menos cobrir "nome vazio" com segurança; usar o approach documentado na demanda 168 pra
  reconhecer os casos de nome-igual-ao-nome-da-empresa, se prático), atualizar `lead_name` pro
  nome que a operadora digitou em vez de manter o antigo.
- Decisão explícita: NÃO sobrescrever um nome já bom só porque o pedido usou um apelido diferente
  (ex. contato já tem "Laura Isabel da Silva Costa", pedido digita "Laura" — não piorar). Regra
  conservadora: só corrige quando o nome existente está vazio/nulo, ou (se viável) é literalmente
  o nome da empresa (ver 168).
- Explicitamente fora de escopo: sincronização no sentido contrário (editar contato não deveria
  precisar tocar pedidos antigos). Fluxo do "criar pedido" via Inbox (`app/api/pedidos/route.ts`)
  — se esse caminho também tiver o mesmo problema, registrar achado, mas o foco aqui é o
  `api/clientes` do balcão (163).

## Critérios de aceite
- [ ] Criar/vincular contato num pedido, com telefone já existente e nome vazio no contato, atualiza
      o `lead_name` do contato pro nome digitado
- [ ] Criar/vincular contato com telefone já existente e nome BOM (não vazio) NÃO sobrescreve
- [ ] Depois da correção, o contato aparece na busca de Clientes/Inbox pelo nome novo
- [ ] Testado com o caso real da Laura Isabel (ou equivalente)

## Riscos e cuidados
Ver demanda 168 pro critério de "nome claramente inválido" (empresa) — coordenar as duas, já que
uma mexe no código (aqui) e a outra corrige o dado histórico (168) e a causa raiz no n8n (169).

## Referências
`app/api/clientes/route.ts` (função `nomeDoContato`, POST), `app/api/pedidos/route.ts`. Caso real:
Laura Isabel, telefone `558199744479`, contato `9324776665254@lid`.

## Relato de execução
Executada em 2026-07-14 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_Dikvv1SRkuYKFAPTJzR3W98RU32q`.

### O que foi feito
No `POST /api/clientes` (163), quando o telefone já existe: se NENHUMA linha do contato tem nome
utilizável — `lead_name` nulo/vazio OU igual ao nome da empresa (normalização: remove acentos e
não-alfanuméricos, compara com 'jsgrafica' — cobre "J S Gráfica", "JS Gráfica", "j s grafica"
etc., o padrão dos 29 contatos da 168) — o `lead_name` é atualizado pro nome que a operadora
digitou, em TODAS as linhas ruins do telefone (contato pode ter 2+ linhas por contact_lid
instável, 029). Resposta ganha `nomeCorrigido: true`. **Regra conservadora respeitada: qualquer
linha com nome bom → NADA é sobrescrito** (apelido não piora nome completo).

### Testes (contatos sintéticos, apagados)
Contato com `lead_name = 'J S Gráfica'` (caso Laura Isabel equivalente) → corrigido pro nome
digitado; contato com nome NULO → corrigido; contato com nome BOM → intacto (devolve o nome
antigo, sem `nomeCorrigido`); **busca de Clientes acha pelo nome novo** logo em seguida
(critério 3).

### Achado fora de escopo (registrado, não resolvido — volta pro PM)
O fluxo "criar pedido" do Inbox (`app/api/pedidos/route.ts`) grava `nome_cliente` no pedido e
também NÃO toca `jsgrafica_contatos` — mesmo gap, outro caminho (a própria demanda já previa
esse registro; fica pro PM decidir se vira demanda).
