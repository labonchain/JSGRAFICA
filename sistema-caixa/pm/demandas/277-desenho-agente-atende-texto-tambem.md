# 277 — Desenho: agente Fase B passa a atender também mensagem de texto puro

Status: concluída
Criada em: 2026-08-15
Aprovada em: 2026-08-15
Concluída em: 2026-08-15
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Decisão do Edvam (2026-08-15): o agente (workflow `206`, já conectado ao roteamento real na
demanda 274) deve passar a atender também mensagem de texto puro, não só mídia sem legenda como
hoje. Essa expansão de escopo é exatamente a "Proposta 3" que a demanda 243 tinha deixado em
aberto, com uma recomendação registrada de esperar (não é bloqueio, é ressalva): a Regra 4 do
manual de resposta (`manual-resposta-ia-100-clientes.md`, demanda 234) documentou risco real de
dado pessoal em fluxo majoritariamente por texto (currículo, digitação de documento, antecedentes,
conta gov) — hoje a régua é sempre escalar esse tipo de coleta pro humano, nunca o agente tentar
sozinho. Essa demanda decide avançar mesmo assim — o que falta é desenhar a triagem de texto com a
MESMA disciplina já usada pra mídia, não abrir mão dela.

**Contenção que já existe, independente deste desenho**: o agente só responde telefone que estiver
em `jsgrafica_telefones_autorizados` (demanda 275, painel de controle) — a exposição fica limitada
a quem o Edvam decidir autorizar, mesma trava que já protege o caminho de mídia hoje.

## Objetivo
Desenho completo (sem código) de como o agente deve reagir quando uma sessão nova começa com
mensagem de texto puro (hoje só reage a mídia sem legenda) — cobrindo o mesmo rigor que a
`blueprint-conversas-exemplo-agente.md` já tem pros outros casos: exemplos de conversa, régua de
quando responder direto vs perguntar vs escalar, e a integração com os gatilhos de escalonamento
que a 206/208 já implementaram (dado pessoal, negociação de pagamento fora do padrão, correções
repetidas, etc. — reaproveitar o que já existe, não redesenhar do zero).

## Escopo
- Incluído: mapear, com base no manual de resposta (234) e na base de conhecimento (255/256), como
  a equipe humana reage hoje quando a sessão começa por texto puro (ex.: "bom dia, vocês fazem
  currículo?", "quanto custa impressão colorida?") — mesma disciplina de evidência real usada nos
  outros exemplos do blueprint.
- Incluído: desenhar a triagem: texto que já nomeia um produto de tabela fixa objetivamente (ex.
  "quanto é impressão A4 colorida") pode seguir direto pra proposta, igual documento óbvio hoje;
  texto ambíguo ("preciso imprimir uma coisa") pergunta, igual imagem ambígua; texto que já sinaliza
  um dos fluxos de dado pessoal/alto toque (currículo, digitação, antecedentes, conta gov, negociação)
  escala direto, sem tentar coletar nada — reaproveitando a mesma lista de "Serviço Alto Toque?" que
  o `206` já usa pra mídia (não inventar categoria nova).
  Também prever que a "espera de rajada" (buffer de 90s) já existente cobre texto fragmentado do
  mesmo jeito que cobre hoje mídia + texto misto.
- Incluído: atualizar `blueprint-conversas-exemplo-agente.md` com os novos exemplos (conversas reais
  ou simuladas, seguindo a mesma checklist de voz da demanda 260) e a tabela de verificação/mapa de
  cobertura.
- Incluído: deixar claro pro 01-N8N implementar depois: quais mudanças de trigger no `206` são
  necessárias (hoje só dispara em `É Mídia Sem Legenda?`) — não implementar, só especificar.
- Explicitamente fora de escopo: implementar qualquer coisa no workflow `206` (isso é demanda
  separada pro 01-N8N depois deste desenho); mudar a lista de telefones autorizados; qualquer
  decisão sobre quando conectar cliente real além do que já foi decidido (274/275 já resolvem a
  parte técnica de quem entra).

## Critérios de aceite
- [ ] Régua de triagem de texto puro desenhada, com o mesmo rigor de evidência do resto do
      blueprint (citação real quando existir, hipótese marcada quando não existir)
- [ ] Reaproveita os gatilhos de escalonamento já existentes (não duplica lógica)
- [ ] Blueprint atualizado com os novos exemplos e tabelas
- [ ] Especificação clara do que muda no `206` pro 01-N8N implementar em seguida (demanda futura)

## Riscos e cuidados
Não perder de vista o motivo original da cautela (Regra 4: dado pessoal em texto) — expandir pra
texto não pode significar afrouxar a régua de escalar esse tipo de caso, só estender a mesma régua
pra um canal de entrada novo.

## Referências
Demanda 243 (Proposta 3, ressalva original sobre texto). Demanda 234
(`manual-resposta-ia-100-clientes.md`, Regra 4). Demandas 255/256 (base de conhecimento). Demandas
206/208 (`Serviço Alto Toque?` e gatilhos de escalonamento já implementados, reaproveitar).
`blueprint-conversas-exemplo-agente.md` (documento a atualizar).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. Antes de desenhar qualquer coisa, li o estado real e atual do `blueprint-conversas-exemplo-
     agente.md` (mudou muito desde a demanda 259, que eu tinha executado: 260 reescreveu voz e
     resolveu limite de lista, 267 achou requisito de data/hora, 272 trocou a lista de 9 grupos
     por 6 categorias reais do catálogo, e o achado de 2026-08-14 reverteu a remoção de Dizu da
     259, reincorporando como Exemplo 8 permanente) e o JSON real do workflow `206`
     (`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda274_2026-08-15.json`), pra fundamentar a
     especificação técnica em nós/condições que realmente existem, não em suposição.
  2. Mapeada a lógica exata do nó `Serviço Alto Toque?`: regex
     `/curr[ií]culo|digita[çc][ãa]o|prova|antecedente|foto composta|composi[çc][ãa]o/i` sobre
     `gemini_produto_detectado`. Achado: não cobre "conta gov", mesmo a Regra 4 do manual (234)
     citando um caso real de risco justamente com Gov.br (`558189032016`, Luciana). Reportado como
     gap de regex a corrigir antes de conectar texto em produção.
  3. Desenhados 2 exemplos novos na Parte 1 (Exemplo 9: texto objetivo → proposta direta, Exemplo
     10: texto ambíguo → pergunta → lista), ambos com citação EVIDÊNCIA DIRETA de conversa real
     (Maria Clara e Débora Borges, lote 10 e lote 01 da demanda 256), não hipótese pura. Anotado o
     Exemplo 3 (currículo) e o item de dado pessoal em "Outros casos rápidos" como já sendo,
     literalmente, o caso real de sessão iniciada por texto puro que passa a disparar o agente,
     reforçado com 2 citações novas da Regra 4 (Iraneide, template estruturado; Luciana, CPF/senha
     Gov.br). Anotado o Exemplo 4 (rajada) confirmando que o buffer de 90s já é genérico e cobre
     texto sem mudança nenhuma.
  4. Escrita seção nova "Especificação técnica pro 01-N8N implementar" na Parte 2, com 7 pontos:
     novo gatilho de entrada (`É Texto Puro (Sessão Nova)?`), novo nó de classificação por texto
     (`Gemini Analisar Texto`, com sugestão de prompt e o valor novo `"fora_de_escopo"` pra não
     disparar em saudação solta), lista explícita dos nós existentes reaproveitados sem alteração
     (`Documento Óbvio?`, `Serviço Alto Toque?`, `Produto Detectado Tem Sinal?`, caminho de
     proposta e de lista, buffer de rajada), o gap de regex do item 2 acima, sugestão de nó de
     erro, confirmação dos nós que já são genéricos hoje (Dizu, cancelar, negociação de pagamento,
     confirmação/negação de proposta), e uma nota de limitação já existente (proposta hoje só
     cobre P&B A4 hardcoded) que se propaga pro caminho de texto sem ser causada por esta demanda.
  5. Atualizada a tabela de verificação (3 linhas novas, #24-26, todas citando conversa real ou
     reaproveitando classificação já existente), o mapa de cobertura de regras (3 linhas novas),
     "Achados de risco" (2 itens novos: gap de regex, calibração de "fora_de_escopo"), histórico
     de correção e referências.
  6. Ao recontar a tabela de verificação pra somar as linhas novas, achei que a contagem antiga
     ("6 evidência direta") já estava errada antes desta demanda (a contagem real de linhas 1-23
     já era 7). Corrigido e declarado explicitamente no texto, não escondido, já que eu estava
     mexendo naquele mesmo parágrafo de qualquer forma.

- Testes realizados e resultado:
  - Busca por "Alto Toque" no JSON real do workflow `206` (não em memória/suposição) pra confirmar
    o regex exato antes de escrever a especificação técnica e o achado do gap de "conta gov".
  - Busca literal por travessão (—) no arquivo final: encontrados 2 pontos onde eu mesmo tinha
    introduzido travessão no texto novo (1 na linha do histórico, 1 na lista de categorias
    copiada pro Exemplo 10), corrigidos antes de reportar concluído. As demais ~30 ocorrências
    de travessão no arquivo são de texto pré-existente de outras sessões (260 reescreveu na
    época, mas 267/272/274 reintroduziram em conteúdo próprio depois), fora do escopo desta
    demanda mexer (a regra vale pro que eu escrevo, não retroativamente pro documento inteiro
    sem pedido explícito).
  - Conferência item a item dos 4 critérios de aceite contra o texto final (não só releitura
    corrida), ver abaixo.

- Achados fora do escopo (relatados, não resolvidos por conta própria):
  - Gap de regex do `Serviço Alto Toque?` (falta "conta gov") — reportado com recomendação
    específica na especificação técnica, não corrigido no workflow real (fora de escopo, esta
    demanda é só desenho, implementação é do 01-N8N).
  - Limitação de que o `206` hoje só tem proposta automática pra 1 produto (P&B A4 hardcoded,
    achado de demandas anteriores, não desta) se propaga pro caminho de texto igual já se propaga
    pro de mídia — sinalizado, não é problema novo criado aqui.
  - Contagem antiga da tabela de verificação estava errada antes desta demanda (item 6 acima) —
    corrigida por já estar mexendo no mesmo parágrafo, não abri demanda separada pra isso por ser
    trivial e já resolvido no ato.
  - Artefato HTML (mesma URL publicada nas demandas 253/259) não foi atualizado nesta demanda: os
    critérios de aceite da 277 pedem só o `.md`, ao contrário da 259 que pedia explicitamente os
    2 em sincronia. Verifiquei que o arquivo local usado pra publicar naquela sessão não existe
    mais neste ambiente (pasta temporária de sessão anterior, limpa) e as demandas 260/272 também
    não parecem ter tocado o artefato (só mencionam o `.md` nos próprios relatos). Ou seja, o
    artefato publicado provavelmente já está desatualizado desde a demanda 259, independente desta
    demanda. Não recriei/republiquei por estar fora do escopo pedido aqui, mas sinalizo pro Edvam
    decidir se vale uma demanda própria pra ressincronizar o artefato com o `.md` atual (que
    reflete 260, 267, 272 e agora 277, nenhum dos quais chegou até a versão publicada).

- Status final: **concluída**. Os 4 critérios de aceite batidos: régua de triagem de texto puro
  desenhada com rigor de evidência (Exemplos 9/10 com citação real, gatilhos de escalação
  marcados como reaproveitados, não como mecanismo novo); gatilhos de escalonamento existentes
  reaproveitados e listados explicitamente, nenhuma lógica duplicada; blueprint atualizado com os
  novos exemplos e todas as tabelas correspondentes (verificação, cobertura, riscos, histórico,
  referências); especificação técnica clara e específica pro 01-N8N implementar depois, incluindo
  1 achado de gap de regex não coberto até agora. Nenhuma implementação foi feita no workflow
  `206`, conforme fora de escopo explícito da demanda.
