# 343 - Organizar produtos digitais com o squad de marketing, foco em ticket médio

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-28
Concluída em: 2026-08-28
Chat executor: 08 - PRODUTOS E NOVOS NEGÓCIOS JS GRAFICA

Pedido direto do Edvam: agora que o Marketing vai ter um squad capaz de produzir peças
personalizadas com mais qualidade (339, em andamento), faz sentido usar essa capacidade pros
produtos digitais também — e organizar de vez o que está parado ou nem foi criado ainda nessa
frente. Objetivo de negócio explícito: **aumentar o ticket médio da gráfica**, não só ter mais
produto no catálogo. Tem que ser coisa que realmente faz sentido, bem feita, que as pessoas
comprem direto no site (Site V2), não só ideia solta.

## Contexto real já levantado (não refazer do zero)

- Pesquisa de validação já feita: trabalho escolar e desenho personalizado confirmados como
  demanda real no log de clientes; oração/receita/ímã de geladeira NÃO se confirmaram.
- EDU-KIT-002 (cartaz de trabalho escolar) chegou a entrar em produção mas foi pausado por
  decisão do Edvam (muita curadoria de conteúdo pra pouco retorno rápido).
- Foco mais recente conhecido: FAM-TPL-001 (Topo de Bolo Editável) em produção.
- 24 ideias já mapeadas em 4 categorias (EDU/FAM/NEG/COM) em
  `pm/conhecimento/produtos-digitais-templates-editaveis.md`.
- Site V2 já tem catálogo público conectado ao Supabase (`site-v2/`), com produtos digitais
  citados no backlog dele (`site-v2-backlog.md`) — 3 produtos digitais com arte pronta, mas
  proibidos de virar "ATIVO" até auditoria de licença/custo/prova física/venda paga confirmada.

## Objetivo

1. Revisar o que está parado ou nunca foi formalizado como demanda na frente de produtos
   digitais, com a régua de "realmente aumenta o ticket médio e as pessoas compram direto no
   site" — não é sobre ter mais ideia, é sobre priorizar o que já tem evidência real de demanda
   e vender de verdade.
2. Entender e propor como o squad de marketing (339, mesmo mecanismo, adaptado) pode produzir as
   peças de produto digital com mais qualidade do que o processo atual (que já pausou 1 vez por
   causa de curadoria pesada) — não é criar um squad novo do zero necessariamente, pode ser
   propor como reaproveitar/adaptar o que o 07-Marketing está montando.
3. Organizar isso em demandas formais e priorizadas, prontas pro PM levar pro Edvam aprovar uma
   a uma — não implementar nada agora, é organização e proposta.

## Escopo

- Incluído: revisão do backlog de produtos digitais existente, coordenação com o 07-Marketing
  pra entender a capacidade real do squad (339) antes de propor como reaproveitar, proposta de
  priorização com foco em ticket médio e venda direta no site.
- Explicitamente fora de escopo: implementar qualquer produto novo agora, mexer no código do
  Site V2 ou do squad de marketing diretamente (isso é do 07-Marketing/quem for dono técnico do
  Site V2) — este chat pensa e propõe, não executa código.

## Riscos e cuidados

Não prometer nada como "pronto pra vender" sem a auditoria de licença/custo/prova física já
exigida no backlog do Site V2 pros 3 produtos existentes — mesma régua vale pra qualquer produto
novo que sair daqui.

## Referências

Demanda 339 (squad de marca, em andamento), `pm/conhecimento/produtos-digitais-templates-
editaveis.md`, `site-v2-backlog.md`, `pm/equipe/08-produtos.md`.

## Relato de execução

Li o documento da 339 (squad de marca) e o `site-v2-backlog.md`/`site-v2-taxonomia-decisoes.md`
por inteiro antes de propor qualquer coisa, achados reais que mudaram a proposta:

- **A 339 ainda não está pronta pra ser reaproveitada hoje**: escopo é só manual de marca, run
  parada no checkpoint de briefing, e ela mesma já define que um squad de conteúdo recorrente é
  demanda futura separada, depois do manual existir. Não dá pra "usar a capacidade do 339 agora"
  literalmente, a proposta certa é sequenciar depois.
- **O item mais avançado de toda a frente não é nenhuma ideia minha**: o NEG-KIT-001 (Kit
  Delivery Brasil) já tem 30 artes reais produzidas, só não virou ATIVO por não ter passado pelos
  5 requisitos que o próprio Subprojeto PRODUTOS já define (Canva master, licença, custo real,
  prova física, validação comercial). Isso é mais perto de virar receita real do que qualquer
  item novo do meu backlog.
- **Categoria "Produtos digitais" e "Designer" já existem na taxonomia oficial do Site V2**
  (`site-v2-taxonomia-decisoes.md`), resolve a dúvida que o PM tinha deixado em aberto sobre a
  categoria Designer não confirmada.
- Separei o backlog em 2 velocidades reais: peça única (rápida, sem curadoria pesada, já validada
  no log de cliente) vs. kit de várias peças (precisa de curadoria, é onde o processo manual já
  travou 1 vez).

Organizei em 3 demandas formais, prontas pro PM levar pro Edvam aprovar uma a uma, nenhuma
implementada ainda:
- `346-fechar-gate-ativo-kit-delivery-brasil.md`: prioridade 1, é o mais perto de vender de
  verdade, só falta processo de validação, não arte nova.
- `347-templates-avulsos-vendaveis-agora.md`: prioridade 2, 6 itens de peça única (topo de bolo,
  cartão de visita, convite de aniversário, etiqueta, rótulo de docinho, cartaz de bairro),
  seguem com o processo atual (GPT + Drive + briefing peça a peça), não precisam esperar squad.
- `348-squad-producao-produtos-digitais.md`: prioridade 3, squad reaproveitando a infraestrutura
  opensquad da 339, mas só depois dela concluir, focado nos itens que realmente têm gargalo de
  curadoria (EDU-KIT-002 retomado, REL-KIT-001).

Testes realizados: nenhum (é organização/proposta, sem implementação, conforme escopo).
Achados fora do escopo: nenhum novo além dos já citados.
Status final: concluída.
