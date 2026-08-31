# 353 - Mockup do Canal do WhatsApp como 3º destino em Marketing → Conteúdo

Status: concluída
Criada em: 2026-08-29
Aprovada em: 2026-08-29
Concluída em: 2026-08-29
Chat executor: 07 - MARKETING JS GRAFICA

## Contexto
A demanda 352 (01-N8N) confirmou de ponta a ponta que dá pra criar e postar num Canal do
WhatsApp via Z-API (texto, imagem, vídeo), canal real já criado e testado
(`120363412925013708@newsletter`). Agora o Edvam quer trazer isso pra dentro do sistema, como um
3º destino de post na aba Marketing → Conteúdo, ao lado de WhatsApp Status e Instagram.

**Decisão explícita do Edvam**: mockup primeiro, validar com ele, só depois aplicar de verdade
(mesma disciplina já usada nas telas de Status/Instagram, ver `pm/equipe/07-marketing.md`).

**Diferença importante que muda o design, não é só "mais uma opção de canal"**: Canal do WhatsApp
é conteúdo permanente tipo feed (fica no histórico do canal pra sempre, até apagar), diferente de
Status (expira em 24h, visualização sequencial tipo Stories). Referência rápida de como Meta trata
essa diferença na prática (Meta Business Suite): post de feed usa preview de lista/linha do tempo
(pode rolar pra ver posts antigos, texto+mídia lado a lado), enquanto Story usa preview em tela
cheia sequencial, sem "histórico rolável". O mockup do Canal deve refletir "feed", não reaproveitar
a mesma lógica visual do preview de Status sem pensar.

## Objetivo
Mockup validado pelo Edvam de como o Canal do WhatsApp se encaixa nas 4 telas que já existem em
Marketing → Conteúdo (Novo post, Plano de conteúdo, Como vai ficar, Quadro), sem implementar
backend/API ainda.

## Escopo
Incluído:
- Pesquisa rápida de referência (Meta Business Suite ou similar) de como plataformas tratam
  criação/preview de conteúdo tipo feed permanente vs. story efêmero, pra embasar decisão de
  design, não pra copiar UI de concorrente.
- Mockup das 4 telas existentes, ESTENDIDAS pra incluir Canal como 3º destino:
  - **Novo post** (modal): nova seção "Canal do WhatsApp" ao lado de Status e Instagram, com os
    tipos de conteúdo que o canal realmente aceita (texto, imagem, vídeo — áudio e documento
    tecnicamente aceitos pela API mas ainda sem confirmação visual real do que aparece no canal,
    ver `pm/conhecimento/guia-canal-whatsapp-automacao.md`, não incluir esses 2 no mockup até
    confirmar).
  - **Plano de conteúdo**: like a tabela/calendário já mostra canal (Status/Instagram), incluir
    Canal como terceira opção de filtro/coluna.
  - **Como vai ficar**: preview precisa ser DIFERENTE do preview de Status (que é tela cheia
    sequencial), refletir o formato feed/lista permanente do canal.
  - **Quadro**: ainda sem mockup nenhuma das 3 opções (Status/Instagram/Canal), fora de escopo
    desta demanda, mencionar só se for trivial.
- Usar classes/tokens reais do app (`caixa-js-grafica`), nunca CSS solto "parecido" (regra já
  estabelecida, ver [[feedback_mockup_fidelidade_real]]).
- Checkpoint com o Edvam antes de considerar o mockup pronto.

Explicitamente fora de escopo:
- Implementar rota de API, schema novo, ou qualquer chamada real à Z-API pra Canal dentro do
  `caixa-js-grafica`. Essa é a próxima demanda, só depois do mockup aprovado.
- Resolver a pendência técnica ainda aberta da 352 (confirmação visual de áudio/documento no
  canal), isso é do 01-N8N.
- **Definir estratégia/conteúdo real de post pro Canal** (o quê, quando, com que frequência
  postar). Confirmado direto com o Edvam: esta demanda é só o painel/ferramenta (a estrutura pra
  programar post, igual já existe pra Status), o conteúdo em si vem depois, numa etapa separada.
  O mockup pode usar texto de exemplo/placeholder pra ilustrar a tela, sem compromisso de ser o
  conteúdo real.

## Critérios de aceite
- [x] Mockup das telas Novo post, Plano de conteúdo e Como vai ficar, com Canal como 3º destino.
- [x] Preview do Canal reflete formato feed/permanente, visualmente diferente do preview de
      Status.
- [x] Mockup usa componentes/tokens reais do app.
- [x] Validado com o Edvam (aprovação explícita, não presumida).

## Referências
`pm/demandas/352-criar-testar-canal-whatsapp-js-grafica.md` (canal real, confirmado funcionando),
`pm/conhecimento/guia-canal-whatsapp-automacao.md`, `pm/equipe/07-marketing.md` (estado atual das
4 telas de Marketing → Conteúdo).

## Relato de execução

**Concluída em 2026-08-29, executor 07-Marketing. Aprovada pelo Edvam.**

Li `ModalPost.tsx` e `TelaMarketingConteudo.tsx` reais antes de desenhar, pra extrair classes/
cores/paddings exatos (não CSS "parecido"): card-shell `border-gray-200 rounded-xl`, pill de
seleção `border-blue-500 bg-blue-50 text-blue-700`, badges de status, etc. Canal do WhatsApp
ganhou identidade própria (ícone 📢, cor indigo `#4f46e5`/`#4338ca`) pra não colidir com o verde
do Status nem o fuchsia do Instagram.

3 artboards publicados num canvas só (Claude Design):
- **Novo post**: seção "Canal do WhatsApp" nova entre Status e Instagram, mesmo padrão
  estrutural da seção Status (ativa, não desabilitada, já que o canal real funciona desde a 352),
  só com os 3 tipos confirmados (texto/imagem/vídeo), sem áudio/documento (achado da 352, sem
  confirmação visual ainda).
- **Plano de conteúdo**: Canal como 3ª opção no seletor de canal (Instagram continua desabilitado
  igual hoje), calendário e tabela com posts de exemplo misturando Status/Canal, badge próprio
  pro Canal.
- **Como vai ficar**: diferença central pedida pela demanda. Em vez do carrossel de telas cheias
  do Status, o preview do Canal é perfil fixo (avatar, nome, descrição) + linha do tempo rolável
  (lista vertical, mais recente no topo), refletindo conteúdo permanente tipo feed. Pesquisa
  rápida de referência: Meta Business Suite trata feed como lista/linha do tempo rolável vs.
  Story como sequência de tela cheia, usei essa lógica de comportamento (não a UI) pra embasar a
  escolha.

Usei a foto de perfil aprovada no mesmo dia (ativo pontual do PM, avatar do canal real) como
avatar de exemplo nos 3 artboards, pra dar contexto visual real em vez de placeholder genérico.

**Achado de processo, corrigido antes de publicar**: a primeira versão do calendário em "Plano de
conteúdo" usava o motor de template do canvas (`<sc-for>`) pra gerar as células dinamicamente;
verificação por renderização real (Playwright, não só leitura de código) mostrou que esse motor
só roda dentro do runtime publicado do canvas, então uma checagem rápida fora dele (útil pra
pegar erro de layout antes de publicar) mostrava a grade quebrada (`{{d.num}}` literal). Trocado
por grade estática (35 células fixas, Agosto/2026 real, dia 1 = sábado), mais simples e sem
depender do motor de template pra algo que não precisa ser dinâmico.

Texto de conteúdo dos posts de exemplo é placeholder, confirmado com o Edvam que não precisa ser
o conteúdo real (isso é demanda futura separada). "Quadro" ficou fora do escopo, sem mockup,
como já estava definido.

Link do mockup aprovado: https://claude.ai/code/artifact/7d3bf87c-cda2-4aaf-97a9-6a8e38be6b6f

Pendência que ainda impede "pronto pra clear" nesta janela: demanda 348 (squad de produção de
produtos digitais) segue aprovada no arquivo dela, mas sem confirmação direta do Edvam nesta
sessão pra começar, ainda não iniciada.

**Adendo, mesmo dia (29/08), a pedido direto do Edvam, fora do escopo original desta demanda**:
4º artboard "Configurações do Canal" adicionado ao mesmo canvas, mapeando os endpoints de GESTÃO
de canal da Z-API (`update-newsletter-name/description/picture`, `newsletter-metadata`/
`-subscribers`, os 4 endpoints de administração, `delete-newsletter`), separados do fluxo de
postar conteúdo (que já é o resto do mockup). Dividido em 2 seções: "Meu canal" (gerenciar
identidade/seguidores/admins/exclusão — endpoints óbvios pro negócio) e "Seguir outros canais"
(`follow`/`unfollow`/`mute`/`unmute`/`search`/`list` — marcado explicitamente como hipótese não
confirmada, útil só se o Edvam quiser acompanhar canal de parceiro/concorrente pelo painel, fácil
de cortar se não fizer sentido). Aprovado pelo Edvam no mesmo canvas/link.
