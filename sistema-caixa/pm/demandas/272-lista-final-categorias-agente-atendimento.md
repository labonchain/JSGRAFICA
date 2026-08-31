# 272 — Lista final de categorias do agente de atendimento (6 categorias reais do catálogo)

Status: concluída
Criada em: 2026-08-14
Aprovada em: 2026-08-14
Concluída em: 2026-08-14
Chat executor: 01 - N8N JS GRAFICA

## Contexto
A demanda 208 (concluída em 2026-08-14) reincorporou/corrigiu o workflow `206 - JSGRAFICA |
AGENTE FASE B (TESTE ISOLADO)`, mas deixou um achado fora de escopo, sinalizado e não resolvido:
a lista de categorias do node `Enviar Lista Categorias` tinha 15 itens (nomes técnicos internos
do catálogo, ex. "Impressão papel couché", "Impressão papel adesivo"), acima do limite de 10
linhas totais que a Meta documenta pra listas interativas do WhatsApp (confirmado na demanda
260). Além do limite técnico, essa lista nunca foi atualizada pra usar a taxonomia em linguagem
de cliente que o blueprint já tinha decidido (demanda 256/259, Exemplo 2 de
`pm/conhecimento/blueprint-conversas-exemplo-agente.md`) — os dois problemas (limite de linhas +
vocabulário técnico) tinham a mesma causa raiz: a lista do workflow real nunca foi trocada.

O Edvam revisou o catálogo completo (`jsgrafica_produtos`, consulta real ao Supabase, 110
produtos ativos) e definiu a organização final em 2026-08-14, substituindo tanto a lista antiga
de 15 nomes técnicos quanto os 9 grupos em linguagem de cliente da 256/259 por 6 categorias
amplas e diretas, mapeadas 1:1 contra o catálogo real:

| Categoria | Sub-categoria (uso interno, não aparece pro cliente) | Produtos | Qtd |
|---|---|---|---|
| XEROX (CÓPIA) | Xerox | XEROX A3, XEROX COLORIDA A4, XEROX PRETO E BRANCO A4 | 3 |
| IMPRESSÕES | Papel Ofício | IMPRESSÃO P&B A4, IMPRESSÃO PRETO E BRANCO FRENTE E VERSO, IMPRESSÃO COLORIDA OFÍCIO A4 (jato/laser), IMPRESSÃO COLORIDA OFÍCIO A3, IMPRESSÃO COLORIDA FRENTE E VERSO, IMPRESSÃO 2ª VIA CONTA | 7 |
| IMPRESSÕES | Papel Couché | Cartão de visita 100un, Panfleto 10x14 100un, Couché A3/A4 90g/250g/300g (frente/verso) | 16 |
| IMPRESSÕES | Papel Foto | Foto 10x15, 15x20, 20x29, 3x4 (6 fotos), Polaroid 7x10, Papel foto A3/A4 230g | 7 |
| IMPRESSÕES | Papel Cartão | Cartão A3/A4 180g (frente/verso) | 4 |
| IMPRESSÕES | Papel Adesivo | Adesivo A3/A4 192g (com/sem recorte) | 4 |
| CONSULTA ONLINE | — | Acesso/envio documentos, agendamento/currículo/antecedentes/digitação, **digitação de provas**, cadastro/matrícula escolar, cadastro e B.O., consulta CPF/SCPC/Serasa, conta gov, scanner | 10 |
| RECARGAS | Celular | 20/25/30/35/40/50/60/100 reais | 8 |
| RECARGAS | VEM | 22 linhas, 10 a 52,50 (ver achado de dado sujo abaixo) | 22 |
| ESCRITÓRIO | Materiais | Caneta, lápis, envelope A4, papel ofício folha/pautado, pasta, carteira p/RG | 8 |
| ESCRITÓRIO | Encadernação | Até 30, 31-50, 51-100, 101-200, 201-300 folhas | 5 |
| ESCRITÓRIO | **Plastificação** | A3, A4, média, pequena | 4 |
| PERSONALIZADOS | Festas/Presentes | Criar arte, ímã com calendário, rifa, topo de bolo (com/sem recorte) | 5 |
| PERSONALIZADOS | Grande formato/Terceirizado | Adesivo leitoso/transparente (4 variações), banner ou lona, caneca/camisa | 7 |

**Decisões explícitas do Edvam nesta revisão** (não são achado de dado, são decisão de produto):
"Digitação de provas" sai de IMPRESSÕES e entra em CONSULTA ONLINE (é serviço de digitação, não
impressão). "Plastificação" (que estava sem categoria em nenhuma proposta anterior) entra em
ESCRITÓRIO.

**Achado de dado, à parte, não bloqueia esta demanda**: a categoria "Recarga VEM" tem pelo menos
3 nomes de produto quase idênticos (`RECARGA VEM`, `RECARGA VEM ` com espaço no fim, `RECARGA DE
VEM`) parecendo o mesmo item cadastrado 3 vezes — provável limpeza de catálogo a fazer depois,
fora do escopo desta demanda (não impede a lista de categorias, que não desce a esse nível de
detalhe).

## Objetivo
O node `Enviar Lista Categorias` do workflow `206` envia exatamente as 6 categorias acima + "Outro"
(7 itens no total), com títulos/descrições dentro do limite oficial do WhatsApp (título ≤24
caracteres, descrição ≤72 caracteres, confirmado na demanda 260), substituindo por completo a
lista antiga de 15 nomes técnicos.

## Escopo
- Incluído: reescrever o array `options` do node `Enviar Lista Categorias` (workflow `206`, id
  `M5WZ6zHAe625XyJm`) com os 7 itens: XEROX (CÓPIA), IMPRESSÕES, CONSULTA ONLINE, RECARGAS,
  ESCRITÓRIO, PERSONALIZADOS, Outro. Sugestão de descrição curta por item (ajustar se não couber
  no limite de caracteres):
  - XEROX (CÓPIA) — "P&B ou colorida"
  - IMPRESSÕES — "Papel ofício, foto, couché, cartão, adesivo"
  - CONSULTA ONLINE — "Currículo, CPF, cadastro, digitação..."
  - RECARGAS — "Celular ou VEM"
  - ESCRITÓRIO — "Papel, caneta, encadernação, plastificação"
  - PERSONALIZADOS — "Festa, presente, banner, caneca..."
  - Outro — "Não sei / nenhuma das opções"
- Incluído: manter os `id` de cada opção estáveis e óbvios (ex. `cat_xerox`, `cat_impressoes`,
  `cat_consulta_online`, `cat_recargas`, `cat_escritorio`, `cat_personalizados`, `cat_outro`) —
  não reaproveitar nenhum `id` antigo (`cat_impressao_couche` etc.) pra um significado novo.
- Incluído: testar isoladamente, mesmo critério de segurança de sempre (só número do Edvam),
  confirmando visualmente que a lista chega certa via Z-API (`zaapId` real) e dentro do limite de
  linhas.
- Explicitamente fora de escopo: qualquer limpeza do catálogo real (`jsgrafica_produtos`, achado
  de nomes duplicados de Recarga VEM); conectar em cliente real; qualquer outra mudança no
  workflow `206` além deste node.

## Critérios de aceite
- [x] Lista do `Enviar Lista Categorias` reescrita com exatamente os 7 itens definidos acima
- [x] Títulos e descrições dentro do limite oficial do WhatsApp (24/72 caracteres)
- [x] Testado isoladamente com o número do Edvam, envio real confirmado via Z-API — **conferência
      visual da renderização no WhatsApp em si ainda pendente do Edvam** (ver relato)
- [x] Nenhuma outra parte do workflow `206` alterada

## Riscos e cuidados
Mesmo risco de sempre: não pode, de jeito nenhum, mandar mensagem pra número que não seja o do
próprio Edvam, nem alterar o roteamento real (workflow `01`).

## Referências
Demanda 208 (achado original do limite de 10 linhas, não resolvido lá de propósito). Demanda 256/
259 (taxonomia anterior em linguagem de cliente, agora superada por esta revisão baseada
diretamente no catálogo real). `pm/conhecimento/blueprint-conversas-exemplo-agente.md` (Exemplo 2,
já atualizado nesta mesma data com a lista final). Consulta real a `jsgrafica_produtos`
(2026-08-14, 110 produtos ativos mapeados).

## Relato de execução

Executado em 2026-08-14, 100% isolado no workflow `206` (id `M5WZ6zHAe625XyJm`, inativo), sem
tocar no roteamento real. Backup antes de mexer:
`pm/backups/206-jsgrafica-agente-fase-b_pre-demanda272_2026-08-14.json` (75 nodes).

**Mudança**: reescrito o array `options` do `jsonBody` do node `Enviar Lista Categorias`,
trocando os 15 itens técnicos antigos pelos 7 definidos pelo Edvam:

| id | título | descrição |
|---|---|---|
| `cat_xerox` | XEROX (CÓPIA) | P&B ou colorida |
| `cat_impressoes` | IMPRESSÕES | Papel ofício, foto, couché, cartão, adesivo |
| `cat_consulta_online` | CONSULTA ONLINE | Currículo, CPF, cadastro, digitação... |
| `cat_recargas` | RECARGAS | Celular ou VEM |
| `cat_escritorio` | ESCRITÓRIO | Papel, caneta, encadernação, plastificação |
| `cat_personalizados` | PERSONALIZADOS | Festa, presente, banner, caneca... |
| `cat_outro` | Outro | Não sei / nenhuma das opções |

Conferidos os limites de caracteres antes de deployar (título ≤24, descrição ≤72): o maior título
é "CONSULTA ONLINE" (15 caracteres), a maior descrição é "Papel ofício, foto, couché, cartão,
adesivo" (43 caracteres) — ambos folgados dentro do limite. 7 itens no total, dentro do limite de
10 linhas do WhatsApp (o achado da demanda 208 que motivou esta demanda).

Nenhum `id` antigo foi reaproveitado com significado diferente: `cat_xerox`, `cat_consulta_online`,
`cat_escritorio`, `cat_personalizados` e `cat_outro` já existiam com o mesmo sentido (agora
ampliado/consolidado, não trocado); `cat_impressoes` e `cat_recargas` são novos, consolidando os
antigos `cat_impressao_*`/`cat_recarga_*`.

**Testado** via `execute_workflow` com uma imagem real puxada de `jsgrafica_log_msgs_privadas`
(`message_id: 3EB05AFCF8DF31A4AD1847`), sem sessão prévia, número do Edvam. Gemini classificou
`gemini_tipo_midia: "imagem"` / `gemini_classificacao: "ambiguo"` — caiu corretamente no caminho
de `Enviar Lista Categorias`. Execução chegou até `Salvar Lista Enviada` com sucesso; `Enviar
Lista Categorias` retornou uma resposta real da Z-API (`zaapId: 01A002715AEF7379AC25B76E6BA2E3C2`),
confirmando que o payload com os 7 itens foi aceito e enviado de verdade. Sessão de teste
(`5b2b87ed...` — id real `cf0ac87c-74f1-468f-9a95-6325143206f8`) apagada logo depois
(`DELETE FROM jsgrafica_agente_teste_sessoes WHERE telefone = '5521965185667'`, `0` linhas
restantes confirmado).

**Diff final** contra o backup pré-272: `0` nodes adicionados, `0` removidos, exatamente `1` node
com mudança (`Enviar Lista Categorias`), `0` conexões alteradas — nada fora do escopo mudou.
Workflow `01` confirmado intocado (`updatedAt` idêntico ao verificado ao final da demanda 208,
`2026-08-14T14:57:58.021Z`).

**Ressalva honesta sobre o critério de "conferência visual"**: confirmei que o envio via Z-API foi
aceito de verdade (resposta real com `zaapId`) e que o JSON enviado tem exatamente os 7 itens com
os textos corretos — mas não tenho como abrir o WhatsApp do Edvam e ver a lista renderizada. A
demanda 208 já tinha registrado essa mesma lacuna (residual, não verificado se o WhatsApp trunca
ou reordena visualmente). Fica pendente uma checada rápida do Edvam no próprio celular pra fechar
esse ponto com 100% de certeza — tecnicamente o envio está correto, só a renderização final do
lado do cliente não foi vista por mim.

Fora de escopo, não tocado: limpeza dos nomes duplicados de "Recarga VEM" no catálogo (achado à
parte, registrado no Contexto desta demanda); qualquer conexão com cliente real; qualquer outra
parte do workflow `206`.
