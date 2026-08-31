# 275 — Painel simples no Admin: quem o agente de atendimento atende

Status: concluída
Criada em: 2026-08-15
Aprovada em: 2026-08-15
Concluída em: 2026-08-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Hoje a lista de telefones autorizados a receber resposta do agente de atendimento
(`jsgrafica_telefones_autorizados`) só pode ser editada via SQL direto — nenhuma tela no sistema
mostra ou controla isso. Pedido explícito do Edvam (2026-08-15): uma tela simples no Admin pra
ligar/desligar quais números o agente atende, sem rodeios, sem precisar de SQL nem de pedir pra
alguém mexer no banco.

Isso é a peça que faltava pra viabilizar a "regra de expansão gradual" já desenhada na demanda
243 (começar com poucos números, expandir aos poucos conforme resultado) — hoje isso dependeria
de pedir um `UPDATE` toda vez.

## Objetivo
O Edvam (só Admin, mesma régua de acesso do resto de configuração sensível) consegue ver a lista
de telefones autorizados, ligar/desligar cada um, e adicionar um novo, direto na tela — sem SQL.

## Escopo
- Incluído: nova seção/tela no Admin (avaliar se cabe como aba própria ou dentro de uma tela de
  configuração já existente — decisão do executor, propor a mais simples) listando cada linha de
  `jsgrafica_telefones_autorizados`: telefone, nome do contato se existir vínculo com
  `jsgrafica_contatos` (só pra ficar legível — "5521965185667 (Edvam)" em vez de só o número
  cru), e um toggle visual ativo/inativo.
- Incluído: alternar o toggle atualiza `ativo` na tabela na hora (sem precisar salvar/confirmar
  numa etapa separada — 1 clique, 1 ação).
- Incluído: campo simples pra adicionar um telefone novo (número + confirmar), criando linha nova
  com `ativo=true`.
- Incluído: nenhuma tentativa de "excluir" telefone da lista — só desativar (histórico preservado,
  mesmo padrão de soft-delete usado no resto do sistema).
- Explicitamente fora de escopo: qualquer lógica de aprovação/expansão automática (ex. "depois de
  10 pedidos, sugerir próximo da lista") — isso é ideia futura, não desta demanda. Edição de
  qualquer outra tabela relacionada ao agente (categorias, regras de escalonamento etc.) — só a
  lista de telefones.

## Critérios de aceite
- [x] Tela lista os telefones autorizados reais, com nome do contato quando existir
- [x] Toggle liga/desliga cada telefone na hora, sem etapa extra
- [x] Adicionar telefone novo funciona e cria linha com `ativo=true`
- [x] Só Admin acessa (mesma régua de telas sensíveis já existentes)
- [x] Testado com dado real (ativar/desativar um dos 5 números de teste e confirmar no banco)

## Riscos e cuidados
Essa tabela hoje só tem números internos/teste — nenhum risco de expor cliente real só por
existir a tela. O risco fica em quem decide adicionar um número novo (decisão do Edvam, não da
tela em si) — a tela só facilita a execução de uma decisão já tomada, não decide nada sozinha.

## Referências
`jsgrafica_telefones_autorizados` (tabela). Demanda 243 (Proposta 2, regra de expansão gradual,
o motivo de existir essa tela). Demanda 274 (a ligação do agente que essa lista efetivamente
controla).

## Relato de execução

### O que foi feito
- **`app/api/telefones-autorizados/route.ts`** (novo): `GET` lista todas as linhas + resolve o
  nome do contato (join manual com `jsgrafica_contatos.phone`, sem FK formal entre as tabelas —
  só pra exibição, "5521965185667 (Nome)"). `POST` cria telefone novo, sempre `ativo=true`,
  normaliza pra só dígitos, rejeita duplicata com mensagem clara (diferenciando "já ativo" de
  "já existe mas inativo — ative pelo toggle"). `PATCH` alterna `ativo` — nunca exclui, nenhuma
  rota `DELETE` existe de propósito (soft-delete, pedido explícito do escopo). Mesma régua de
  acesso do resto do projeto: sem checagem de auth na rota em si (RLS trava a tabela pra
  `anon`/`authenticated`, `service_role` via `supabaseAdmin` é o limite real), gate de Admin só
  no front — consistente com todas as outras telas sensíveis já existentes.
- **`components/TelaTelefonesAutorizados.tsx`** (novo): lista com nome do contato, toggle visual
  (atualização otimista — muda a cor na hora, reverte sozinho se a chamada falhar, nunca deixa a
  tela mentir sobre o estado real) e formulário simples de adicionar.
- **`app/page.tsx`**: encaixado dentro da aba "⚙️ Configurações" já existente (sub-aba "Conectar
  API"), abaixo do card de status Z-API — decisão de não criar aba nova pra uma tela pequena,
  como a demanda deixava em aberto. Precisou de um wrapper `overflow-y-auto h-full` novo: a tela
  de Z-API sozinha não tinha esse scroll (conteúdo dela sempre coube na tela), e as duas juntas
  ficariam cortadas pelo `overflow-hidden` do `<main>` sem isso.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Com dado real**, direto contra a API em produção local (não sintético — a própria tabela só
  tem os 5 números internos/teste, achado documentado nos "Riscos" da demanda):
  - `GET` retornou os 5 telefones reais, nome do contato resolvido certo pra 4 deles (Edvam,
    Cliente Teste, Dizu Refeições, Mada AI Agent) e `null` pro que não tem contato vinculado.
  - `PATCH` num dos 5 (`5581984956007`, sem contato): `ativo` foi pra `false`, confirmado direto
    no banco via SQL; revertido de volta pra `true` em seguida (estado original restaurado,
    confirmado de novo — 5 linhas, nada a mais nem a menos).
  - `POST` com telefone sintético novo: criado com `ativo=true`; tentativa de adicionar o MESMO
    telefone de novo foi bloqueada (400, mensagem clara "já está na lista e ativo"); telefone
    sintético apagado direto no banco depois (não existe rota de exclusão no app, por design).
  - **Visual** (Playwright, dev server local): print confirma a tela renderizando certo dentro da
    aba Configurações, os 5 telefones com nome de contato, toggles verdes, formulário de
    adicionar — sem nenhum corte de layout.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo.

### Status final: concluída
