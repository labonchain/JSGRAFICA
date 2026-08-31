# 276 — Botão de ativar/desativar atendimento IA direto na conversa do Inbox

Status: concluída
Criada em: 2026-08-15
Aprovada em: 2026-08-15
Concluída em: 2026-08-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 275 criou a tela de gerenciar telefones autorizados dentro de Configurações → Conectar
API. Funciona, mas o Edvam apontou um problema real de uso: pra ativar o atendimento IA de um
cliente específico, ele precisa sair da conversa, ir em outra aba, achar o telefone (digitar ou
copiar), e voltar. O telefone do contato já está na tela da conversa (cabeçalho do Inbox) — o
controle devia estar ali, não em outro lugar.

Print de referência anexado pelo Edvam: conversa aberta com "Anderson Felipe / 558191767220" no
Inbox, mostrando o cabeçalho atual (nome, telefone, "Atendendo: Edvam", botões "Resolver ✓" e
"Arquivar").

## Objetivo
Dentro da própria conversa do Inbox, dá pra ver e alternar se aquele contato específico está
autorizado a receber atendimento por IA, sem sair da tela.

## Escopo
- Incluído: **posição definida pelo Edvam (2026-08-15)** — painel da direita, não o cabeçalho (que
  já está cheio: nome, telefone, "Atendendo: X", "Resolver ✓", "Arquivar"). Novo cartão pequeno,
  próximo ao bloco "Pedido desta conversa" (`components/TelaInbox.tsx`), com um toggle visual —
  "🤖 Atendimento IA" + estado atual (ativo/inativo) do telefone daquela conversa em
  `jsgrafica_telefones_autorizados`.
- Incluído: alternar o controle chama a MESMA API já construída na demanda 275
  (`app/api/telefones-autorizados/route.ts`, `POST`/`PATCH`) — não duplicar lógica de backend,
  só uma nova forma de acionar o que já existe.
- Incluído: se o telefone da conversa ainda não está na tabela, o botão cria a linha (mesmo
  comportamento do `POST` da 275, `ativo=true`); se já existe, alterna o `ativo` (`PATCH`).
- Incluído: manter a tela de Configurações → Conectar API da 275 como está — ela continua útil
  pra ver a lista inteira de uma vez e não é substituída por isso, é um jeito rápido a mais de
  ativar/desativar, contextual à conversa.
- Explicitamente fora de escopo: qualquer mudança na régua de quando o agente realmente responde
  (isso é o desenho já definido — mídia sem legenda, sessão nova); mudar o que aparece em
  Configurações.

## Critérios de aceite
- [x] Controle visível na conversa aberta do Inbox, mostrando o estado real (autorizado/não) do
      telefone daquela conversa
- [x] Alternar funciona sem sair da tela, usando a API já existente da 275
- [x] Testado com uma conversa real: ativar, confirmar no banco, desativar, confirmar de novo
- [x] Tela de Configurações continua funcionando exatamente como antes, sem regressão

## Riscos e cuidados
Mesma régua de segurança de sempre: isso só liga/desliga QUEM o agente pode responder — não muda
o desenho do agente em si. Nenhum risco novo além do que a 275 já trouxe (tabela sem cliente real
hoje, exceto o que o Edvam decidir ativar conscientemente).

## Referências
Demanda 275 (`app/api/telefones-autorizados/route.ts`, `components/TelaTelefonesAutorizados.tsx`
— reaproveitar a API, não duplicar). `components/TelaInbox.tsx` (onde este botão novo entra).
Print do Edvam (2026-08-15) mostrando a conversa de "Anderson Felipe" como referência de layout
atual do cabeçalho.

## Relato de execução

### O que foi feito
- **`components/TelaInbox.tsx`**: novo bloco `flex-shrink-0` no painel da direita, entre "Resumir
  conversa" e "Pedido desta conversa" (posição definida pelo Edvam) — cartão "🤖 Atendimento IA"
  com toggle e texto de estado ("Carregando...", "Ainda não autorizado a receber o agente",
  "Autorizado a receber o agente" ou "Desativado").
  - Estado carregado via `GET /api/telefones-autorizados` (a MESMA rota da demanda 275, sem
    nenhuma mudança nela) a cada troca de conversa (`useEffect` em `[phoneAtivo]`, mesmo padrão
    já usado por "Pedido da conversa"/rascunho/sugestão de IA nesse componente) — busca a lista
    inteira (5 telefones hoje, payload trivial) e procura o telefone da conversa ativa.
  - Alternar chama `POST` (telefone ainda não cadastrado → cria com `ativo=true`, descrição
    "Ativado direto pela conversa no Inbox") ou `PATCH` (já cadastrado → inverte `ativo`) — a
    MESMA lógica de decisão que `TelaTelefonesAutorizados.tsx` (275) já usa, só que decidida no
    front a partir do resultado do `GET`, sem endpoint novo.
  - Toggle fica desabilitado enquanto o estado ainda não carregou (`autorizacaoIA === null`) —
    evita criar uma linha errada por clique apressado antes de saber se o telefone já existe.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos.
- **Com conversa real** (Playwright, dev server local, telefone `558195049894`, confirmado antes
  do teste que NÃO estava na tabela): clique no toggle dentro da conversa aberta → confirmado
  direto no banco que criou a linha (`ativo=true`, `descricao="Ativado direto pela conversa no
  Inbox"`); 2º clique (desativar) → confirmado no banco `ativo=false`. Ciclo completo
  ativar/confirmar/desativar/confirmar, exatamente o critério de aceite. Linha de teste apagada
  depois (telefone real de cliente, não deixar resíduo numa tabela que o Edvam vê na tela —
  mesma disciplina da 275).
- **Sem regressão em Configurações → Conectar API**: print confirma os 5 telefones originais
  intactos, Z-API sem mudança nenhuma.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo.

### Status final: concluída
