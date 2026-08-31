# 082 — Editar nome do contato manualmente no Inbox (+ "Contato privado" como rótulo temporário)

Status: concluída
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Achado durante a demanda 081 (01-N8N): existem contatos (hoje ~43, número muda com o tempo) cujo
WhatsApp tem o recurso de privacidade "LID" ativado — o WhatsApp nunca envia nome nem telefone
real desses contatos pra nenhuma API, nem pra própria Z-API. Não é bug, é limitação de
plataforma: não tem como recuperar nome nenhum pra esses casos automaticamente. Pra esses
contatos, o Inbox mostra o identificador `@lid` cru e longo, que não significa nada pra equipe.

Solução do Edvam: como a equipe **já conhece essas pessoas de verdade** (têm salvas com nome no
WhatsApp pessoal delas), a forma de resolver é deixar a equipe **editar o nome manualmente** e
salvar isso no nosso banco — não depende de nenhuma API externa, é só um campo editável.

## Objetivo
A equipe consegue editar o nome (e outras infos básicas do contato) direto no painel do Inbox,
sem precisar de tela nova — resolve de vez os contatos sem nome automático.

## Escopo
- Incluído:
  1. No painel de contato que já existe no Inbox (onde hoje aparece foto/telefone/status), 
     adicionar um jeito de editar o nome do contato (campo editável ou botão "editar nome") — 
     grava em `lead_name` (ou campo equivalente), sobrescrevendo o que tiver.
  2. Enquanto não for editado, contato sem nenhum nome disponível (`lead_name` e
     `lead_push_name` ambos vazios/nulos) mostra "Contato privado" em vez do `phone`/`@lid` cru
     — rótulo temporário até alguém editar.
  3. Confirmar que a edição manual não é sobrescrita depois por um evento automático do n8n sem
     nome (a demanda 081 já corrigiu o n8n pra nunca sobrescrever um `lead_name` válido por vazio
     — um nome editado manualmente deve se comportar do mesmo jeito, como "válido").
- Fora de escopo por agora: uma tela dedicada de "Clientes" (lista separada, busca, edição em
  lote) — se não for suficiente editar direto no painel do Inbox, isso vira demanda própria depois.

## Critérios de aceite
- [x] Dá pra editar o nome de um contato direto no painel do Inbox
- [x] Nome editado aparece na lista de conversas e no cabeçalho, substituindo o @lid/telefone
- [x] Contato sem nenhum nome (ainda não editado) mostra "Contato privado", não o @lid cru
- [x] Testado editando pelo menos 1 dos contatos reais sem nome (ex.: um dos 43 já identificados)

## Referências
`app/api/inbox/conversas/route.ts` (`nomeDisplay`). Painel de contato em `TelaInbox.tsx`.
Demanda 081 (achado original, garante que edição manual não é sobrescrita).

## Relato de execução

**Status final: concluída**

### O que foi feito
1. Nova rota `app/api/inbox/contato/route.ts` (`PATCH`) — recebe `{ phone, nome }`, valida nome
   não-vazio e grava em `lead_name`, sobrescrevendo o que houver (mesmo campo que o n8n usa, já
   protegido pela demanda 081 contra sobrescrita por evento vazio).
2. `app/api/inbox/conversas/route.ts` — `nomeDisplay` trocado de `lead_name || lead_push_name ||
   phone` para `lead_name || lead_push_name || 'Contato privado'`. Adicionado campo `temNome`
   (boolean) na resposta pra o frontend distinguir "nome real" de "rótulo temporário" (evita, por
   exemplo, abrir a edição com "Contato privado" pré-preenchido no campo).
3. `components/TelaInbox.tsx`, Bloco 1 do painel direito (dados do contato):
   - Nome exibido em itálico/cinza quando `temNome === false` (visualmente diferente de um nome
     real).
   - Ícone de lápis ao lado do nome abre um campo de edição inline (input + Salvar/Cancelar,
     Enter salva, Esc cancela) chamando o novo endpoint PATCH.
   - Ao salvar, atualiza o estado local (`conversas`) — nome novo reflete imediatamente na lista
     de conversas à esquerda e no cabeçalho da thread, sem esperar o próximo polling.
   - Avatar usa "?" como fallback quando ainda não tem nome (em vez da primeira letra do @lid).

### Testes realizados e resultado
Servidor dev já estava rodando na porta 3000 (sessão do chat "03 - APP JS GRAFICA" — não subi
outro processo, só usei o já ativo, que recarrega os arquivos automaticamente via Turbopack).

1. **Contato sintético** (`999999000001@lid`, inserido só pro teste): `GET
   /api/inbox/conversas?q=999999000001` retornou `nome: "Contato privado"`, `temNome: false`.
   `PATCH /api/inbox/contato` com `nome: "Cliente Teste 082"` → `GET` seguinte já retornou o nome
   novo com `temNome: true`. Registro apagado depois de confirmar.
2. **Contato real sem nome** (`46287047127177@lid`, um dos 43 identificados na demanda 081):
   confirmado `nome: "Contato privado"` antes da edição. `PATCH` com um valor de teste claramente
   marcado (`"[TESTE 082 - sera revertido]"`) → refletiu na mesma consulta. Revertido depois pra
   `lead_name = null` (estado original restaurado, não ficou nome inventado gravado em cliente
   real).

### Deploy em produção (2026-07-07, adendo)
Achado do Edvam: os testes acima foram feitos só contra `next dev` local — o deploy real nunca
tinha sido rodado, então `admin.jsgrafica.site` continuava servindo a versão antiga (sem essas
rotas, por isso os 404 relatados). Corrigido:

1. Rechecagem antes do deploy: `npx tsc --noEmit` limpo, `npm run build` compilou sem erro e o
   manifesto de rotas já lista `/api/clientes` e `/api/inbox/contato`.
2. Conferi os arquivos financeiros (`components/TelaFechamento.tsx`, `app/api/fechamento`,
   `app/api/saidas`) por timestamp e conteúdo — `TelaFechamento.tsx` tinha sido modificado
   *depois* da minha última edição (provavelmente pelo chat 03-APP terminando o trabalho deles,
   nada relacionado a mim), os outros dois não foram tocados por ninguém durante minha sessão.
   Nada suspeito, nenhum arquivo do financeiro foi alterado por mim.
3. Deploy real: `npx vercel --prod --yes` → **deployment `dpl_3jBcLoNyvggcTV2P1Wxf3PxnDdJR`**
   (https://caixa-js-grafica-jhqd1zcll-edvams-projects.vercel.app), aliasado tanto em
   `pdv.jsgrafica.site` quanto `admin.jsgrafica.site`.
4. Reteste em produção:
   - `GET https://admin.jsgrafica.site/api/clientes` → HTTP 200 com dados reais (antes: 404).
   - `PATCH https://admin.jsgrafica.site/api/inbox/contato` → testado com um contato sintético
     criado só pro teste (`999999000002@lid`): `GET` antes mostrava "Contato privado", `PATCH`
     retornou 200 e o `GET` seguinte já refletia o nome novo. Contato de teste apagado depois.

### Achados fora do escopo
- Critério "edição manual não é sobrescrita por evento automático do n8n sem nome" não foi
  re-testado aqui — já foi validado com teste sintético via webhook na própria demanda 081 (mesmo
  campo `lead_name`, mesma lógica de "nome válido nunca é apagado por vazio"). Re-testar isso
  exigiria disparar um evento Z-API real ou webhook sintético, fora do escopo de frontend deste
  chat.
- Havia um servidor `next dev` já rodando na porta 3000 (provavelmente do chat "03 - APP JS
  GRAFICA", ocupado com demandas financeiras) — não encerrei, só testei contra ele. Vale o alerta:
  os dois chats estão editando o mesmo working directory/repo ao vivo.

### Status final
Concluída. Critérios de aceite todos atendidos.
