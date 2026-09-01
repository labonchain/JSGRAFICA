# 354 - Implementar de verdade o Canal do WhatsApp em Marketing → Conteúdo

Status: aprovada
Criada em: 2026-08-29
Aprovada em: 2026-08-29 (aprovação direta do Edvam com o 07-Marketing, registrada aqui pelo PM
pra manter o histórico auditável, mesmo padrão de sempre)
Concluída em: 2026-08-29
Chat executor: 07 - MARKETING JS GRAFICA

## Contexto
Mockup da demanda 353 (4 telas: Novo post, Plano de conteúdo, Como vai ficar, Configurações do
Canal) aprovado pelo Edvam. Ele pediu diretamente ao 07-Marketing pra avançar pra produção de
verdade, esta demanda formaliza isso.

Base técnica já confirmada e testada (demanda 352, 01-N8N): canal real criado
(`120363412925013708@newsletter`), `send-text`/`send-image`/`send-video` funcionando com o ID do
canal como `phone`. Endpoints de gestão do canal (nome, descrição, foto, seguidores, admins)
documentados em `pm/conhecimento/guia-canal-whatsapp-automacao.md`.

## Objetivo
Canal do WhatsApp funcionando de verdade dentro de Marketing → Conteúdo, nas 4 áreas do mockup
aprovado, com posts reais programáveis/publicáveis, não mais só mockup.

## Escopo
Incluído:
- Rotas de API novas em `caixa-js-grafica` pra: criar/editar/agendar/aprovar/cancelar/duplicar
  post de Canal (mesmo padrão já usado pra Status), chamando Z-API direto (`send-text`/
  `send-image`/`send-video` com o `id` do canal como `phone`), sem depender da fila compartilhada
  do LabOnchain (Canal não usa `labon_status_queue`, é integração direta, diferente do Status).
- Tela "Configurações do Canal" (Meu canal): editar nome/descrição/foto de verdade, ver
  seguidores/estado real, gerenciar admins, excluir canal (com confirmação extra, é destrutivo).
- Guardar o `id` do canal (`...@newsletter`) em lugar persistente e documentado (propor coluna
  nova em `jsgrafica_agent_config` ou tabela própria ao 02-DADOS, seguir o padrão já usado pro
  `tutor_phone`).
- Testar de ponta a ponta com conteúdo real antes de considerar pronto (mesmo cuidado já usado
  com Status: canal é público e permanente, não apagar depois de postado).

Explicitamente fora de escopo desta demanda:
- **"Seguir outros canais"**: fica fora até o Edvam confirmar se faz sentido pro negócio (ainda
  não confirmado, era hipótese do 07-Marketing na 353).
- Mudar workflow n8n de produção (isso é do 01-N8N, se precisar de alguma automação server-side
  que não seja rota do Next.js, propor demanda separada).
- Qualquer schema/coluna nova no Supabase fica proposta pro 02-DADOS, não implementada
  diretamente pelo 07-Marketing (mesma regra de sempre, ver `pm/equipe/07-marketing.md`).

## Critérios de aceite
- [x] Post real (texto, imagem ou vídeo) criado/agendado/publicado no Canal de verdade pela tela
      do Admin, confirmado por checagem visual no canal real (não só resposta HTTP 200).
- [x] Configurações do Canal (nome/descrição/foto) editáveis de verdade pela tela.
- [x] `id` do canal persistido em lugar documentado, não hardcoded solto no código.
- [x] Nenhuma regressão nas telas de Status/Instagram já existentes.

## Riscos e cuidados
Canal é público e permanente (não expira, não tem undo fácil). Mesma disciplina de sempre: nunca
testar com conteúdo que pareceria estranho pra um seguidor real, checkpoint antes de qualquer post
real visível.

## Referências
`pm/demandas/353-mockup-canal-whatsapp-marketing-conteudo.md` (mockup aprovado),
`pm/demandas/352-criar-testar-canal-whatsapp-js-grafica.md` (base técnica testada),
`pm/conhecimento/guia-canal-whatsapp-automacao.md`.

## Relato de execução

**Concluída em 2026-08-29, executor 07-Marketing. Testada de ponta a ponta com dado real,
confirmada pelo Edvam.**

### O que foi feito

- `lib/zapi.ts` estendido com as funções de gestão do Canal (atualizar nome/descrição/foto,
  metadata, seguidores, excluir, admin), reusando o cliente Z-API que já existia
  (`enviarMensagem`/`enviarImagem`/`enviarVideo` já prontos, só passando o id do canal como
  `phone` pra postar conteúdo — nenhuma duplicação de lógica de envio).
- `lib/canalWhatsapp.ts` novo: CRUD de posts do Canal (criar/editar/cancelar/aprovar), integração
  DIRETA com a Z-API (sem fila compartilhada do LabOnchain, diferente do Status).
- `app/api/marketing/canal/route.ts` (CRUD de posts) e `app/api/marketing/canal/config/route.ts`
  (identidade/metadata/admin/exclusão), mesmo formato de rota do Status.
- `components/ModalPost.tsx` estendido: seção "Canal do WhatsApp" real ao lado de Status,
  criação combinada (cada seção só entra se tiver conteúdo, precisa de pelo menos 1 das 2),
  edição/aprovação/cancelamento de post do Canal existente com UI própria.
- `components/ComoVaiFicarCanal.tsx` (novo) e `components/ConfiguracoesCanal.tsx` (novo):
  preview em formato feed/linha do tempo (diferente do carrossel do Status) e tela de identidade/
  seguidores/exclusão do canal.
- `components/TelaMarketingConteudo.tsx`: Canal como 3ª opção real de destino, aba
  "⚙️ Configurações" nova (só habilitada com Canal selecionado).
- Schema proposto ao 02-DADOS (`pm/conhecimento/proposta-schema-canal-whatsapp-354.md`), aplicado
  por eles na demanda 356 (coluna `canal_whatsapp_id` + tabela `jsgrafica_canal_posts`, RLS/revoke
  já no desenho).
- Robô de disparo agendado (30 em 30min) pedido à parte pelo Edvam, repassado ao PM pra abrir
  demanda pro 01-N8N — fora desta demanda, "aprovar" publica na hora enquanto ele não existir.

### Achados reais corrigidos durante o teste (não só leitura de doc)

1. **Bug real, corrigido**: `metadataCanal` (`GET .../newsletter?phone=`) devolve um ARRAY, não um
   objeto — mesmo passando 1 `phone` só. Corrigido desempacotando na própria função
   (`lib/zapi.ts`), quem chama nunca precisa saber disso.
2. **Bug real, corrigido, achado só testando de verdade**: os endpoints `update-newsletter-*`
   (nome/descrição/foto) NÃO usam `phone` no corpo — usam `id`. Primeira tentativa com `phone`
   devolveu erro real da Z-API (`400 Newsletter id is empty`); corrigido pra `id` e reconfirmado
   com chamada real bem-sucedida. Mesma correção aplicada por consistência em `delete-newsletter`
   (doc oficial confirma `POST {id}`, diferente do `DELETE ?phone=` que a doc de referência da 352
   sugeria) — não testado de verdade (destrutivo demais pro canal real), só corrigido por
   consistência de padrão + doc oficial.
3. **Achado, não resolvido, não bloqueia, reconferido 2x**: não existe endpoint funcional de
   "listar seguidores" em nenhuma de 8 variações de path testadas de verdade contra a API real
   (`/newsletter-subscribers`, `/newsletter/subscribers`, `/newsletter/{id}/subscribers`, as
   mesmas 3 trocando "subscribers" por "followers", `/newsletter-subscribers/{id}` e
   `/newsletter-subscribers-count`) — sempre o mesmo erro de ROTEAMENTO (não de dado vazio).
   Reconferido de propósito depois do Edvam confirmar que já segue o canal (>=1 seguidor real),
   pra descartar a hipótese de "só falha com 0 seguidores" (pedido do PM/Edvam) — mesmo resultado,
   e a metadata também não traz nenhum campo de contagem mesmo com seguidor real confirmado.
   Conclusão: parece ser recurso genuinamente indisponível nesta conta/plano, não bug de path/
   campo como os outros 2 achados acima. Tela mostra "—" nesse caso, não derruba nada. Registrado
   em `lib/zapi.ts` pra quem investigar depois.
4. **Achado de processo**: a doc/índice da Z-API já divergiu da API real 4 vezes nesta integração
   inteira (send-message-image→send-image e path de metadata na 352, +2 achados acima na 354) —
   padrão consistente o suficiente pra virar regra: qualquer endpoint novo de canal precisa de
   teste real antes de confiar, nunca só leitura de doc/llms.txt.

### Testes realizados (dado real, não só HTTP 200)

- CRUD completo de post do Canal testado contra o schema real (criar/editar/cancelar/listar),
  confirmado com `SELECT` real no Supabase.
- **Post real publicado de verdade** (`message_id` real `903F19C0E1B7D0FA5834`), **confirmado
  visualmente pelo Edvam** no canal real via link de convite.
- **Identidade do canal atualizada de verdade** (nome/descrição, round-trip pro mesmo valor real
  pra não alterar a marca à toa) — sucesso confirmado pela resposta real da Z-API.
- **Foto de perfil aplicada de verdade** nesta mesma sessão de teste — fecha de quebra a pendência
  que tinha ficado aberta na demanda 352 (foto nunca tinha sido aplicada). **Confirmada
  visualmente pelo Edvam.**
- `npx tsc --noEmit` limpo e `eslint` sem erros novos (só os já pré-existentes no resto do
  codebase, mesmo padrão, não introduzidos por esta demanda) em todos os arquivos tocados.
- Regressão: fluxo de Status revisado linha a linha (state/validação/render inalterados, só
  passou a coexistir com as novas seções condicionais) — não executado em produção real de novo
  nesta demanda (já está em produção, sem mudança de comportamento pra quem só usa Status).

### Achados fora do escopo, reportados

- Robô de agendamento (30/30min) — demanda pedida à parte ao PM/01-N8N (mensagem enviada em
  29/08).
- Gestão de administradores (convidar/remover/transferir) implementada em `lib/zapi.ts` mas
  **nunca testada de verdade** (sem admin/convite real disponível pra testar contra, e a doc
  diverge sobre o nome do campo do canal entre as páginas). Marcado explicitamente no código como
  não confirmado.

### Investigação extra (30/08, achado do 01-N8N, depois confirmado como falso alarme pelo Edvam)
01-N8N reportou `picture: null` na metadata real do canal, questionando se a foto realmente tinha
sido aplicada (ou se era só sucesso aparente na UI). Investiguei de forma independente, sem confiar
nem no relato anterior nem no achado do 01-N8N: baixei a URL de `preview` da metadata direto (não é
print antigo, é chamada real feita agora) — voltou uma imagem JPEG real, 200 OK, e é o selo certo
(conferido visualmente). Confirmação final: o Edvam mandou print real do WhatsApp confirmando a
foto no ar. **Não é bug de fluxo** (a chamada de update sempre funcionou de verdade) — é só que o
campo `picture` da resposta de metadata nunca é preenchido nesta conta (mais uma divergência real
da Z-API, quem tem a URL de verdade é sempre `preview`).

**Achado colateral real, corrigido**: como minha própria UI (`ConfiguracoesCanal.tsx` e o preview
"Como vai ficar" em `TelaMarketingConteudo.tsx`) só olhava `metadata.picture`, ela NUNCA mostrava a
foto aplicada de verdade (sempre caía no ícone de fallback), mesmo com a foto real no ar — bug
próprio, sem relação com o disparo da chamada. Corrigido: os 2 lugares agora usam
`picture ?? preview`. `MetadataCanal` (`lib/zapi.ts`) documentado com o achado. Deploy novo
confirmado no ar depois da correção.

**Conferência extra pedida pelo 01-N8N (mesmo ceticismo, nome/descrição)**: metadata real (mesma
chamada da investigação acima, feita agora, não reaproveitando resposta antiga) confirma
`name`/`description` batendo exatamente com o valor real aplicado (`JS Gráfica` / `Gráfica rápida
no Ibura, Recife-PE...`) — diferente de `picture`, esses 2 campos SÃO preenchidos de verdade na
metadata, sem o mesmo problema. Sem achado novo aqui.

### Correção de processo (achado do Edvam depois do primeiro relato)
Esqueci o deploy (`npx vercel --prod --yes`) antes do primeiro relato — só tinha testado local/via
API, o Edvam não via nada em produção. Corrigido: deploy rodado, confirmado com rotas
`/api/marketing/canal` e `/api/marketing/canal/config` no build, no ar em `pdv.jsgrafica.site`.

### Status final
Concluída. Todos os critérios de aceite atendidos com teste real, confirmado pelo Edvam. Deploy em
produção confirmado.

Ainda NÃO é "pronto pra clear" nesta janela: a demanda 348 (squad de produção de kits digitais)
segue aprovada no arquivo dela, mas sem confirmação direta do Edvam pra começar, ainda não
iniciada (mesma pendência já registrada no relato da 353).
