# Especificação Técnica de Operação - Canal do WhatsApp | JS Gráfica

**Versão:** 1.0  
**Data:** 30/08/2026  
**Documento-pai de pauta:** `PLANO_CONTEUDOS_CANAL_WHATSAPP_JS_GRAFICA.md`  
**Finalidade:** permitir que diferentes chats acompanhem, produzam, revisem e publiquem cada conteúdo do Canal sem perder contexto, repetir produção ou inventar dados.

---

## 1. Escopo e ordem obrigatória

Cada conteúdo do Canal percorre esta ordem:

```text
Pauta planejada -> Checagem técnica -> Briefing -> Copy -> Peça -> QA -> Aprovação -> Publicação -> Métricas -> Encerramento
```

Nenhuma etapa pode ser pulada. Uma peça não está pronta só porque a imagem foi criada: precisa ter copy, QA, aprovação e registro de publicação.

Este documento controla o processo. O plano editorial controla **o que** será produzido. O briefing controla **como** uma pauta específica será produzida.

## 2. Fontes de verdade

| Assunto | Fonte de verdade | Regra |
|---|---|---|
| Pautas e ordem editorial | Plano de Conteúdos do Canal | Não criar post fora do plano sem registrar novo ID |
| Marca, fontes, cores e logos | Manual da Marca JS Gráfica, revisão final 28/08/2026 | Prevalece sobre artes antigas e referências informais |
| Produtos, preços e disponibilidade | Catálogo/PDV e confirmação atual da equipe | Não copiar preço antigo nem estimar valor |
| Serviço digital e regra de órgão | Fonte oficial e confirmação atual | Conteúdo variável exige pesquisa antes da copy |
| Foto, vídeo e portfólio | Arquivo original aprovado pela JS Gráfica | Não expor dados pessoais nem cliente sem autorização |
| Publicação no Canal | Registro de publicação abaixo | Sem registro, tratar como não publicado |

## 3. Identificação única de cada conteúdo

Todo conteúdo deve manter o ID de pauta do plano, seguido por sua sequência de publicação quando houver repetição.

Exemplos:

- `P2-06` - serviço de banner.
- `P5-10` - prova/portfólio relacionado a banner.
- `P2-06-R02` - reaproveitamento da pauta de banner em outro ciclo.

Arquivos da produção devem seguir o padrão:

```text
CANAL_[ID]_[AAAAMMDD]_[TIPO]_v01.ext
```

Exemplos:

```text
CANAL_P2-06_20260830_BRIEFING_v01.md
CANAL_P2-06_20260830_COPY_v01.md
CANAL_P2-06_20260830_ARTE_v01.png
CANAL_P2-06_20260830_QA_v01.md
```

`TIPO` aceito: `BRIEFING`, `COPY`, `ARTE`, `VIDEO`, `QA`, `PUBLICACAO` ou `METRICAS`.

## 4. Estados permitidos

| Estado | Significado | Quem pode mover |
|---|---|---|
| `PLANEJADO` | Está no plano, ainda sem preparação | Coordenação/PM |
| `EM_CHECAGEM` | Confirmando dados, foto, preço, prazo ou regra | Chat responsável |
| `BLOQUEADO` | Falta uma dependência externa identificada | Chat responsável, com motivo obrigatório |
| `PRONTO_PARA_BRIEFING` | Dados essenciais confirmados | Coordenação/PM |
| `EM_BRIEFING` | Briefing visual e de conteúdo em elaboração | Chat de briefing |
| `BRIEFING_APROVADO` | Briefing validado; pode gerar copy e peça | Coordenação/usuário |
| `EM_PRODUCAO` | Copy e/ou peça sendo produzida | Chat de produção |
| `EM_QA` | Arquivo pronto, em conferência técnica e editorial | Chat de QA |
| `AGUARDANDO_APROVACAO` | QA passou; decisão humana pendente | Coordenação/usuário |
| `APROVADO_PARA_PUBLICAR` | Pode ser enviado ao Canal | Coordenação/usuário |
| `PUBLICADO` | Publicação confirmada e registrada | Chat/publicador |
| `MEDINDO` | Coletando resultado após publicação | Coordenação/analytics |
| `ENCERRADO` | Métricas registradas e aprendizado anotado | Coordenação/PM |
| `CANCELADO` | Não será produzido/publicado | Coordenação/usuário, com motivo |

## 5. Regras de transição

1. `PLANEJADO` só vira `PRONTO_PARA_BRIEFING` após checagem dos dados necessários.
2. Pauta com preço, prazo, promoção, medida, estoque, condição de pagamento ou disponibilidade sem validação atual deve ir para `BLOQUEADO` ou `EM_CHECAGEM`.
3. Nenhum chat pode marcar `BRIEFING_APROVADO`, `APROVADO_PARA_PUBLICAR` ou `PUBLICADO` por conta própria.
4. `PUBLICADO` exige data/hora, formato, link ou identificador da postagem e nome de quem confirmou.
5. Se houver alteração importante após aprovação, criar nova versão e retornar para `EM_QA`.
6. Arquivo sem caminho/identificador verificável não pode ser marcado como entregue.

## 6. Registro mestre de produção

Este quadro deve ser atualizado a cada movimentação. Um chat que inicia uma etapa registra o estado de entrada; um chat que termina registra o estado de saída, links e pendências.

| ID | Pauta | Pilar | Estado | Dependência atual | Briefing | Copy | Peça | QA | Aprovação | Publicação | Observação curta |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1-01 | Abertura do Canal | P1 | APROVADO_PARA_PUBLICAR | Publicação manual, quando definida | v01 | v01 | v01 (Canal + Status) | v01 | Aprovada pelo usuário | - | Entregas completas; aprovação não equivale a publicação |
| P1-02 | Como falar com a JS | P1 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 31/08); aguardando aprovação final |
| P2-01 | Impressão e xerox | P2 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 31/08); aguardando aprovação final |
| P2-02 | Foto 3x4 e revelação de fotos | P2 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 31/08); aguardando aprovação final |
| P2-03 | Encadernação e plastificação | P2 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 31/08); aguardando aprovação final |
| P2-04 | Currículos | P2 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado com ressalva cosmética não bloqueante (squad js-grafica-canal-conteudo, 31/08) |
| P3-01 | Segunda via de conta | P3 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P3-02 | Recarga de celular e VEM | P3 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado com correção de contraste no pictograma VEM (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P3-03 | Agendamentos | P3 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P4-01 | Banner, lona e adesivo | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 31/08); aguardando aprovação final |
| P4-02 | Cartão de visita | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 31/08); aguardando aprovação final |
| P4-03 | Panfletos | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 31/08); aguardando aprovação final |
| P4-04 | Convites | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P4-05 | Topo de bolo | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P4-06 | Presentes personalizados | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado com correção real no ícone de almofada, feita por mim antes de aprovar (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P5-01 | Produção/entrega real | P5 | BLOQUEADO | Foto ou vídeo real aprovado | - | - | - | - | - | - | Não usar imagem genérica |
| P5-02 | Trabalho real de impressão | P5 | BLOQUEADO | Foto/vídeo e autorização | - | - | - | - | - | - | Sem dados de cliente |
| P1-03 | O que a JS resolve no dia a dia | P1 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P2-05 | Impressão A4 e A3 | P2 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado com correção de sobreposição na etiqueta A3 (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P6-01 | Antes de enviar seu arquivo | P6 | EM_CHECAGEM | Confirmar formatos e regras de envio | v01 | - | - | - | - | - | Não citar formato sem validação |
| P4-07 | Canecas personalizadas | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P4-08 | Camisas personalizadas | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado com correção de legibilidade no título (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P4-09 | Almofadas personalizadas | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P4-10 | Itens personalizados em cerâmica | P4 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P6-02 | Como pedir um personalizado | P6 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado com correção de contraste WCAG nos ícones (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P6-03 | Como pedir material de divulgação | P6 | AGUARDANDO_APROVACAO | Aprovação final do Edvam pra publicar | v01 | v01 | v01 (Canal + Status) | v01 | Aprovado pelo usuário (briefing) | - | QA aprovado (squad js-grafica-canal-conteudo, 30/08); aguardando aprovação final |
| P5-03 | Resultado real de impressão | P5 | BLOQUEADO | Foto real autorizada | v01 | - | - | - | - | - | Sem dados de cliente |
| P5-04 | Resultado real de personalizado | P5 | BLOQUEADO | Foto real autorizada | v01 | - | - | - | - | - | Sem direito de imagem pendente |
| P5-05 | Bastidor de produção autorizado | P5 | BLOQUEADO | Foto/vídeo e autorização | v01 | - | - | - | - | - | Sem tela, rosto ou pedido legível |
| P1-04 | Atendimento próximo no Ibura | P1 | BRIEFING_APROVADO | Produção pelo chat de designer | v01 | - | - | - | Aprovado pelo usuário | - | Sem endereço ou horário não confirmado |
| P2-06 | Revelação de fotos | P2 | BRIEFING_APROVADO | Produção pelo chat de designer | v01 | - | - | - | Aprovado pelo usuário | - | Sem rosto não autorizado |
| P4-11 | Presentes personalizados para celebrar | P4 | BRIEFING_APROVADO | Produção pelo chat de designer | v01 | - | - | - | Aprovado pelo usuário | - | Sem data, prazo ou personagem |
| P2-07 | Cadernos, apostilas e materiais didáticos | P2 | BRIEFING_APROVADO | Produção pelo chat de designer | v01 | - | - | - | Aprovado pelo usuário | - | Sem conteúdo escolar legível |
| P2-08 | Impressão em papel couchê | P2 | BRIEFING_APROVADO | Produção pelo chat de designer | v01 | - | - | - | Aprovado pelo usuário | - | Sem gramatura, preço ou prazo |
| P2-09 | Impressão em papel cartão | P2 | BRIEFING_APROVADO | Produção pelo chat de designer | v01 | - | - | - | Aprovado pelo usuário | - | Sem gramatura, acabamento ou preço |
| P2-10 | Impressão em papel adesivo | P2 | BRIEFING_APROVADO | Produção pelo chat de designer | v01 | - | - | - | Aprovado pelo usuário | - | Sem medida, instalação ou marca de cliente |
| P3-04 | Consulta e impressão de documentos | P3 | BRIEFING_APROVADO | Produção pelo chat de designer + validar operação no dia | v01 | - | - | - | Aprovado pelo usuário | - | Sem dado sensível ou promessa de resultado |
| P3-05 | Apoio de acesso ao Gov.br e serviços públicos online | P3 | BRIEFING_APROVADO | Produção pelo chat de designer + validar operação no dia | v01 | - | - | - | Aprovado pelo usuário | - | Sem senha, resultado ou regra de órgão |
| P3-06 | Declarações MEI e documentos empresariais | P3 | EM_CHECAGEM | Confirmar com a equipe se o serviço de declaração MEI/documentos empresariais é prestado de verdade hoje (catálogo só tem categorias genéricas de documento/cadastro, sem esse item específico) | v01 | - | - | - | - | - | Sem obrigação, prazo ou resultado fiscal |
| P3-07 | Licenciamento e renovações | P3 | EM_CHECAGEM | Confirmar com a equipe se licenciamento/renovação de veículo é prestado de verdade hoje (catálogo só tem categorias genéricas de documento/cadastro, sem esse item específico) | v01 | - | - | - | - | - | Sem taxa, boleto, placa ou emissão garantida |
| P3-08 | Consulta de situação do CadÚnico e benefícios sociais | P3 | EM_CHECAGEM | Confirmar com a equipe se consulta de CadÚnico/benefícios sociais é prestada de verdade hoje (catálogo só tem categorias genéricas de documento/cadastro, sem esse item específico) | v01 | - | - | - | - | - | Sem elegibilidade, benefício ou dado pessoal |

**Regra de expansão:** antes de iniciar o dia 2, incluir no registro mestre as três pautas seguintes; antes de iniciar a semana 2, incluir todas as pautas da semana 2. Não criar dezenas de linhas vazias sem necessidade de produção.

## 7. Ficha técnica mínima por pauta

Antes de abrir um briefing, preencher a ficha abaixo no registro ou em arquivo próprio.

```markdown
## Ficha técnica - [ID]

- Pauta:
- Pilar:
- Objetivo: descoberta | prova | utilidade | conversão
- Estado atual:
- Data-alvo de publicação:
- Formato: texto | imagem | vídeo
- Fonte de verdade do conteúdo:
- Dados que já estão confirmados:
- Dados que precisam ser confirmados:
- Riscos: preço | prazo | dado pessoal | direito de imagem | regra de órgão | nenhum
- Dependência para liberar o briefing:
- Responsável pela próxima ação:
- Última atualização: AAAA-MM-DD por [chat/pessoa]
```

## 8. Contrato do briefing

Um briefing só pode ser criado quando a ficha técnica estiver em `PRONTO_PARA_BRIEFING`. O arquivo de briefing deve conter:

1. ID e versão.
2. Objetivo único do post.
3. Público e contexto local.
4. Mensagem principal factual.
5. Formato a produzir.
6. Direção visual compatível com o manual.
7. Hierarquia: título, prova/benefício, dado funcional e CTA.
8. Aplicação de logo, cores, tipografia e pictograma, quando aplicável.
9. Elementos proibidos e dados que não podem aparecer.
10. Lista de referências/arquivos reais autorizados.
11. Critérios objetivos de aceite da peça.

O briefing não deve trazer preço, prazo ou promoção sem o respectivo registro de confirmação.

## 9. Contrato da copy

Copy é um arquivo separado da arte. Deve conter:

```markdown
## Copy - [ID] vNN

- Título/primeira linha:
- Legenda:
- CTA:
- Hashtags: não usar, salvo decisão específica posterior.
- Limite técnico: até 1.024 caracteres para post com imagem/vídeo; até 4.096 em texto simples.
- Dados validados em: [data e fonte]
- Revisão: ortografia, clareza, tom direto e sem promessa não comprovada.
```

Tom: frases curtas, serviço nomeado com clareza, linguagem de bairro profissional, sem jargão e sem exageros de marketing. A copy responde, conforme necessário: **o que é, quanto custa, quando fica pronto**. Quando preço ou prazo não estiverem validados, orientar orçamento pelo WhatsApp em vez de inventar.

## 10. Contrato da peça

| Item | Regra |
|---|---|
| Formato-base | 1080 x 1080 px para imagem |
| Vídeo | MP4/H.264 somente após teste de publicação confirmado |
| Título | Space Grotesk 500 ou 700 |
| Corpo | Inter 400 ou 600 |
| Dado funcional | IBM Plex Mono 400 ou 500 |
| Logo | Variação correta conforme o tamanho e o fundo |
| Legibilidade | Nenhum texto pequeno em Laranja Pêssego/Amarelo Aviso puros |
| Visual | Produto, resultado real ou pictograma do sistema |
| Proibição | Não usar impressora, régua ou esquadro genéricos como imagem principal |
| Proteção | Não publicar CPF, telefone de cliente, documento, tela com dados ou rosto sem autorização |

## 11. Checklist de QA antes de aprovação

Marcar todos os itens antes de enviar para aprovação:

- [ ] ID, versão e arquivo corretos.
- [ ] Mensagem confere com a ficha técnica e com a fonte de verdade.
- [ ] Preço, prazo, promoção e disponibilidade foram confirmados, se aparecerem.
- [ ] Sem informação ou promessa inventada.
- [ ] Marca, logo, cores e fontes seguem o manual.
- [ ] Contraste e leitura em tela de celular estão bons.
- [ ] Copy revisada, sem erros de português.
- [ ] CTA aponta para o WhatsApp sem prometer ação automática.
- [ ] Nenhum dado pessoal, documento ou imagem sem autorização.
- [ ] Formato compatível com o Canal.
- [ ] Copy dentro do limite técnico do formato.
- [ ] Arte/arquivo salvo com o nome padronizado e link registrado.

## 12. Registro de publicação e métricas

Após a publicação, completar:

```markdown
## Registro de publicação - [ID]

- Publicado em: AAAA-MM-DD HH:MM (horário de Recife)
- Formato: texto | imagem | vídeo
- Arquivo/copy publicados:
- Identificador/link da publicação:
- Confirmado por:
- Métricas D+1: visualizações, reações, encaminhamentos, seguidores ganhos/perdidos
- Métricas D+7: visualizações, reações, encaminhamentos, seguidores ganhos/perdidos
- Aprendizado: o que repetir, ajustar ou evitar
- Estado final: MEDINDO | ENCERRADO
```

## 13. Protocolo de handoff entre chats

Todo chat que concluir ou interromper uma tarefa deve deixar uma atualização curta e objetiva neste formato:

```markdown
### Handoff - [ID]
- Estado anterior -> estado atual:
- O que foi concluído:
- Arquivos e links gerados:
- Validações realizadas:
- Pendências/bloqueios:
- Próxima ação exata:
- Responsável sugerido:
- Atualizado em: AAAA-MM-DD HH:MM (Recife)
```

Não usar “feito”, “pronto” ou “quase pronto” sem indicar o estado do fluxo e os arquivos verificáveis.

## 14. Primeiro lote liberado para preparar fichas técnicas

| Prioridade | ID | Situação inicial | Próxima ação |
|---:|---|---|---|
| 1 | P1-01 | PLANEJADO | Preparar ficha técnica e depois briefing institucional |
| 2 | P1-02 | PLANEJADO | Confirmar CTA vigente; preparar ficha técnica |
| 3 | P2-01 | PLANEJADO | Confirmar lista ativa de impressão/xerox; preparar ficha |
| 4 | P3-01 | PLANEJADO | Confirmar lista atual de serviços digitais; preparar ficha |
| 5 | P4-01 | PLANEJADO | Confirmar lista atual de personalizados; preparar ficha |
| 6 | P6-01 | PLANEJADO | Validar formatos aceitos para arquivo; preparar ficha |
| 7 | P5-01 | BLOQUEADO | Reunir foto/vídeo real e autorização de uso |

## 15. Decisão de início

Nenhum briefing será iniciado antes de este documento estar adotado como registro mestre. A primeira produção começa pela ficha técnica de `P1-01`, e não pela arte. Depois da ficha técnica confirmada, o briefing poderá ser elaborado.
