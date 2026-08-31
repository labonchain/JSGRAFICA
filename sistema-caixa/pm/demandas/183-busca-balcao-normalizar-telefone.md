# 183 — Busca de contato no balcão não normaliza telefone digitado

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Auditoria do PM (2026-07-15): `VincularContatoBalcao.tsx` busca via `GET /api/inbox/conversas?q=`
(`app/api/inbox/conversas/route.ts:38`, `phone.ilike.%${busca}%`) usando o texto digitado CRU, sem
tirar espaço/traço/parênteses — mas a CRIAÇÃO (`POST /api/clientes`) normaliza (só dígitos + DDI).
Cenário real: operadora digita "81 98610-8547" (formatado) pra achar um cliente que já existe
como "5581986108547" (só dígitos) — a busca não acha, mostra "Nenhum contato encontrado". Pior:
clicar em "+ Criar novo contato" usa o texto digitado como NOME (`setNovoNome(busca.trim())`), não
telefone — pode criar contato novo com nome tipo "81 98610-8547" e telefone em branco, em vez de
vincular ao contato certo que já existia.

## Objetivo
Buscar contato no balcão com telefone formatado (espaço, traço, parênteses) encontra o contato
existente normalmente.

## Escopo
- Incluído: normalizar o texto de busca antes de comparar contra `phone` — tanto em
  `app/api/inbox/conversas/route.ts` (rota usada pela busca do balcão) quanto em
  `app/api/clientes/route.ts` (GET, mesma lógica de busca), usando a mesma normalização que a
  criação (`POST /api/clientes`) já usa.
- Cuidado: essa mesma rota (`/api/inbox/conversas`) também é usada pelo Inbox de verdade (buscar
  conversa por nome) — normalizar só quando o texto parecer telefone (só dígitos/espaço/traço/
  parênteses), sem quebrar busca por nome.
- Explicitamente fora de escopo: mudar o comportamento de "+ Criar novo contato" em si (já
  funciona bem quando o campo nome é preenchido de propósito).

## Critérios de aceite
- [ ] Buscar "81 98610-8547" (formatado) encontra o mesmo contato que buscar "5581986108547"
- [ ] Busca por nome continua funcionando normal (não normalizada como telefone)
- [ ] Testado com um contato sintético e busca formatada

## Riscos e cuidados
Não quebrar a busca por nome ao mexer na normalização — testar os dois casos.

## Referências
`components/VincularContatoBalcao.tsx:34,54-58,133`, `app/api/inbox/conversas/route.ts:38`,
`app/api/clientes/route.ts:44-53,131`. Auditoria de cadastro do PM, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### O que foi feito
Helper único `filtroBuscaContato()` em lib/supabase-admin, usado pelas 2 rotas de busca
(`/api/inbox/conversas` e `/api/clientes`): texto que parece telefone (só dígitos + espaço/
traço/parênteses/ponto/+) busca **só por `phone`**, normalizado pra dígitos; qualquer outra
coisa mantém o filtro de sempre (nome + push_name + phone com o texto cru).
**Achado no teste que mudou o design**: normalizar só o termo do phone não bastava —
parênteses no texto cru dentro do `.or()` do PostgREST viram agrupamento lógico e a query
volta VAZIA ("(81) 8330.8276" não achava nada nem por nome). Buscar só por phone quando é
telefone resolve os dois problemas de uma vez (e é o certo semanticamente).

### Testes
"81 8330-8276" e "(81) 8330.8276" acham o mesmo contato real que "558183308276", nas DUAS
rotas (local e produção pós-deploy); busca por nome ("Eliane", 10 resultados) idêntica à de
antes. O placeholder do campo do balcão virou "🔍 Buscar por nome ou telefone" (o rótulo
"vincular contato" já vem do cabeçalho novo da 174).

### Fora de escopo (respeitado e registrado)
O "+ Criar novo contato" segue pré-preenchendo o NOME com o texto digitado — se o texto era um
telefone que não existe na base, o nome sugerido vira o número (a demanda excluiu esse
comportamento explicitamente; com a busca normalizada o cenário fica raro, mas existe).
