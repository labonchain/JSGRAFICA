# Handoff - Demanda 359 (revisão dos 39 briefings)

- **Estado anterior -> estado atual:** 20 briefings em `EM_BRIEFING`/`EM_CHECAGEM` (aguardando
  1ª decisão) -> 17 movidos para `BRIEFING_APROVADO` (aprovado pelo Edvam), 3 movidos para
  `EM_CHECAGEM` (pendência real identificada), 1 (`P6-01`) e 3 (`P5-03/04/05`) mantidos como
  estavam (pendência de dado técnico e de mídia real, não de conteúdo).
- **O que foi concluído:** os 39 briefings existentes lidos um a um, cruzados com o catálogo real
  (`jsgrafica_produtos`, 112 itens) e com o manual de marca/direção de arte. Registro mestre
  (`docs/operacao/ESPECIFICACAO_TECNICA_OPERACAO_CANAL_JS_GRAFICA.md`) atualizado para refletir
  as decisões.
- **Liberados para produção agora** (`BRIEFING_APROVADO`, squad/designer pode seguir com
  copy+peça), 32 IDs no total:
  - Já aprovados antes desta revisão: `P1-01` a `P4-06` (15 IDs, incluindo `P1-01` já
    `APROVADO_PARA_PUBLICAR`).
  - Aprovados nesta revisão (17 novos): `P1-03`, `P1-04`, `P2-05`, `P2-06`, `P2-07`, `P2-08`,
    `P2-09`, `P2-10`, `P3-04`, `P3-05`, `P4-07`, `P4-08`, `P4-09`, `P4-10`, `P4-11`, `P6-02`,
    `P6-03`.
- **Pendência real, não liberado** (`EM_CHECAGEM`, achado desta revisão): `P3-06` (Declarações
  MEI), `P3-07` (Licenciamento/renovações de veículo), `P3-08` (Consulta CadÚnico). O catálogo
  real (`jsgrafica_produtos`) só tem categorias genéricas de documento/cadastro (`CONTA GOV`,
  `CADASTRO E B.O.`, `ACESSO/ENVIO DOCUMENTOS`), sem nenhum item específico de MEI, licenciamento
  de veículo ou CadÚnico. O Edvam confirmou que não sabe se esses 3 serviços específicos são
  prestados de verdade e precisa confirmar com a equipe antes de qualquer produção. **Não
  produzir arte/copy para esses 3 IDs até a equipe confirmar.**
- **Sem mudança** (já corretos, fora do escopo de decisão de conteúdo):
  - `P6-01` continua `EM_CHECAGEM` (formatos de arquivo aceitos ainda não confirmados pela
    equipe).
  - `P5-01`, `P5-02` (sem briefing ainda) e `P5-03`, `P5-04`, `P5-05` continuam `BLOQUEADO`
    (dependem de foto/vídeo real autorizado, que ainda não existe).
- **Achado colateral, não bloqueante**: `P4-06`/`P4-09`/`P4-10` citam almofada e cerâmica
  personalizada como serviços ativos — não há SKU específico no catálogo digital para esses 2
  itens (diferente de caneca/camisa, que aparecem como `CANECA / CAMISA` em `Serviço
  terceirizado`), mas o Manual da Marca (fonte de verdade oficial de posicionamento) já lista os
  dois como parte real da operação, e os 3 briefings já são cautelosos (não prometem item
  específico disponível, direcionam pra confirmação no atendimento). Não bloqueado por isso, só
  registrado.
- **Validações realizadas:** cruzamento completo com `jsgrafica_produtos` (categorias reais:
  impressão couchê/cartão/adesivo/ofício/foto, encadernação, plastificação, recarga
  celular/VEM, xerox, consulta online, serviço terceirizado, personalizados); nenhum preço, prazo
  ou promoção encontrado em nenhum dos 39 briefings (todos seguem a regra do manual).
- **Arquivos e links gerados:** commit no registro mestre (`docs/operacao/
  ESPECIFICACAO_TECNICA_OPERACAO_CANAL_JS_GRAFICA.md`); este handoff.
- **Próxima ação exata:** squad de produção segue com copy+peça para os 32 IDs liberados, na
  ordem que fizer sentido pro plano editorial (3 posts/dia). Equipe confirma com o Edvam se
  presta MEI/licenciamento de veículo/CadÚnico antes de reabrir `P3-06/07/08`. Equipe confirma
  formatos de arquivo aceitos pra liberar `P6-01`.
- **Responsável sugerido:** squad de design/produção (produção dos 32 liberados); equipe/Edvam
  (as 2 pendências reais acima).
- **Atualizado em:** 2026-08-30 23:21 (Recife), por 07-Marketing JS Gráfica (demanda 359).
