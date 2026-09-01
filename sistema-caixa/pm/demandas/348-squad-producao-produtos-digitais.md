# 348 - Squad de produção de produtos digitais (kits com curadoria pesada)

Status: aprovada
Criada em: 2026-08-28
Aprovada em: 2026-08-29 (dependência da 339 satisfeita, 339 concluída em 28/08; escopo confirmado
com o Edvam: só produção nova segue o manual de marca novo, nada do que já existe é retrabalhado)
Concluída em: (vazio até conclusão)
Chat executor: 07 - MARKETING JS GRAFICA (dono da infraestrutura opensquad construída na 339)

## Contexto
Levantamento da demanda 343: o pedido do Edvam foi entender como o squad de marketing (339) pode
produzir peças de produto digital com mais qualidade que o processo atual manual (GPT + Drive +
briefing peça a peça), que já travou 1 vez por causa de curadoria pesada (EDU-KIT-002).

**Achado real, não é decisão minha**: a 339 ainda não terminou (status "em andamento", run parada
no checkpoint de briefing, Nina/curadoria ainda não começou) e seu escopo é só o manual de marca
(logo, paleta, tipografia, regras de aplicação), não produção de peça de produto. A própria 339
já deixou escrito que montar um squad de conteúdo recorrente é "demanda futura separada, depois
que o manual de marca existir" — não faz sentido pular essa ordem, peça de produto sem manual de
marca correria o risco de sair fora do padrão visual que a 339 está definindo agora.

**Por que não é urgente pra tudo**: nem todo item precisa de squad. Itens de peça única (cartão
de visita, topo de bolo, etiqueta) não têm o problema de curadoria pesada, seguem na demanda 347
com o processo atual. O squad resolve especificamente o gargalo dos itens tipo "kit" (8-20
peças, pesquisa de conteúdo por peça, risco real de "criar livre até bater N peças" que o próprio
Subprojeto PRODUTOS já baniu depois de acontecer de verdade no NEG-KIT-001).

## Objetivo
Montar um squad `js-grafica-produtos-digitais` (mesmo framework opensquad construído na 339,
`opensquad/_opensquad/core/`), com pipeline de curadoria + checkpoint + produção + revisão,
adaptado pra peça de produto (não identidade de marca), pra destravar os itens que dependem de
pesquisa/conteúdo real sem repetir o travamento do EDU-KIT-002.

## Escopo
- Incluído: desenho do squad (agentes, passos, checkpoints, seguindo o mesmo rigor de revisão da
  339), usando como primeiro caso real o **EDU-KIT-002 retomado** (cartaz de trabalho escolar,
  peças 2-8 que faltam) e o **REL-KIT-001** (kit igreja, só tem ficha, zero arte ainda).
- Explicitamente fora de escopo: começar a rodar antes da 339 (manual de marca) estar concluído
  e aprovado. Mudar o conteúdo/escopo do manual de marca em si (isso é só da 339).

## Critérios de aceite
- [ ] Squad desenhado e documentado, mesmo padrão da 339 (agentes nomeados, checkpoints,
      pontuação de revisão).
- [ ] Bloqueado explicitamente até a 339 concluir (dependência real, não arbitrária).
- [ ] Primeira run real feita com EDU-KIT-002 ou REL-KIT-001, sem repetir o erro de travar
      produção por pendência que não é risco jurídico/escopo/preço/dado do cliente/impacto
      técnico (ver [[feedback_briefing_pendencia_nao_bloqueia_arte]]).

## Riscos e cuidados
Não montar um squad novo do zero se der pra reaproveitar literalmente o mesmo
`opensquad/_opensquad/core/` da 339, só trocando o conteúdo dos agentes (evitar duplicar
infraestrutura).

## Referências
`pm/demandas/339-squad-brand-manual-marca-js-grafica.md`, `opensquad/CLAUDE.md`,
`opensquad/_opensquad/core/`, `pm/conhecimento/produtos-digitais-templates-editaveis.md`.

## Relato de execução (em andamento)

**Iniciada em 2026-08-31, executor 07-Marketing, com confirmação direta do Edvam.**

Squad `js-grafica-produtos-digitais` desenhado (`opensquad/squads/js-grafica-produtos-digitais/`),
reaproveitando `_opensquad/core/` da 339, pipeline próprio (6 passos: curadoria de conteúdo →
checkpoint → produção → checkpoint intermediário → revisão final → checkpoint final), 3 personas
novas (Vitória, Rafael, Marcela, sem repetir nomes já usados no `js-grafica-brand`). Detalhe da
diferença de desenho vs. squad de marca em `README.md` do squad: aqui o checkpoint de conteúdo
vem ANTES de qualquer arte, porque o gargalo real é curadoria de fato/informação, não direção
criativa.

Achado antes de começar: não tive acesso ao doc "Subprojeto PRODUTOS" (Google Drive) que tem a
ficha completa dos 2 casos reais (EDU-KIT-002, REL-KIT-001) — perguntei direto ao Edvam, ele não
tinha o link à mão. Decisão tomada com ele: seguir sem o doc, com o próprio squad levantando o
conteúdo como parte do trabalho (não travar esperando o link).

Escopo desta primeira run: só `EDU-KIT-002` (peças 2 a 8, 7 cartazes de trabalho escolar) — a
demanda permite "EDU-KIT-002 OU REL-KIT-001" como primeiro caso, escolhido o EDU por já ter
peça 1 existente (mesmo que pausada) e ser menor (7 peças vs. 20 do REL). `REL-KIT-001` fica
pra uma run seguinte deste mesmo squad, não desta demanda ainda.

Passo 1 (Vitória, curadoria de conteúdo) rodando. Relato continua depois do checkpoint 2
(aprovação do conteúdo pelo Edvam).
