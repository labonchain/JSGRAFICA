# 251 — Blueprint: revisão final completa (tom, lista confusa, confirmação de pagamento)

Status: aprovada
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
Terceira rodada de revisão do blueprint (após 244, 246, 247) — as duas correções anteriores
foram parciais, não cobriram o documento inteiro. O Edvam apontou, revisando de novo:
1. O Exemplo A não mostra o que acontece depois que o cliente paga — o agente não confirma
   recebimento nem avisa que está finalizando com a equipe.
2. Ainda existem mensagens em parágrafo longo em vários pontos do documento — a correção da 246
   não pegou tudo.
3. A lista de 8 opções do Exemplo B confunde mais do que ajuda — alguns itens juntam 2-3
   categorias diferentes num só ("Encadernação · Plastificação · Escritório"), sem ficar claro
   se é 1 escolha ou 3.

Sobre o ponto 1: investigação separada (demanda 250, em andamento) confirmou que a confirmação
automática de pagamento **não existe hoje em lugar nenhum do sistema real** — nem na automação
proposta, nem na produção atual. O texto que já é mandado hoje promete algo que não acontece.

## Objetivo
Uma revisão completa e final do documento — não mais uma passada parcial — corrigindo os 3
pontos, com processo de verificação explícito pra garantir que não fica nada pra trás de novo.

## Escopo
- Incluído: **revisar mensagem por mensagem, exemplo por exemplo, sem exceção** — listar
  explicitamente, no relato final, quantas mensagens foram revisadas no total e confirmar que
  100% foram checadas (não só "as que pareciam problema"). Qualquer uma com mais de 1 frase
  completa (sujeito+verbo) na mesma bolha deve ser dividida, seguindo o mesmo padrão já usado na
  246 (comparar com exemplo REAL do manual da 234).
- Incluído: adicionar ao Exemplo A o passo que falta — depois que o pagamento é detectado, o que
  acontece de verdade. **Isso depende do resultado da demanda 250**: se ela optar por gerar
  rascunho automático de confirmação, o Exemplo A deve mostrar esse rascunho aparecendo pro
  Admin (não sendo mandado sozinho ao cliente — mesma disciplina de aprovação humana de sempre);
  se a 250 optar só por ajustar o texto do Pix, o Exemplo A deve refletir honestamente que não
  há confirmação automática ao cliente hoje, sem inventar um passo que não existe. Se a 250 ainda
  não tiver terminado quando esta demanda for executada, documentar a situação real atual (sem
  confirmação automática) e marcar claramente como "pendente de atualizar quando a 250 fechar".
- Incluído: revisar a lista do Exemplo B — não empacotar múltiplas categorias num único item de
  lista. Alternativas a considerar: (a) listar cada categoria real separadamente, mesmo que fique
  uma lista mais longa; (b) reduzir pra um conjunto menor de categorias mais amplas, com uma
  segunda pergunta de refinamento depois; (c) outra solução que resolva a confusão. Escolher uma,
  justificar, e aplicar — não deixar o problema descrito sem solução.
- Incluído: ao final, uma nova seção "O que mudou (251)" seguindo o mesmo padrão da 246/247,
  cobrindo os 3 pontos.
- Explicitamente fora de escopo: implementar qualquer coisa em produção — documento de revisão.

## Critérios de aceite
- [ ] 100% das mensagens do agente revisadas (número total declarado no relato), nenhuma em
      parágrafo longo
- [ ] Exemplo A atualizado com o passo de pós-pagamento, refletindo a realidade confirmada (ou
      marcado como pendente da 250 se ela ainda não tiver fechado)
- [ ] Lista do Exemplo B reformulada de forma clara, sem itens que empacotam múltiplas categorias
- [ ] Artefato republicado com seção "O que mudou (251)" visível

## Riscos e cuidados
Nenhum — documento de revisão. Mas esta é a 3ª rodada de correção do mesmo documento — vale
conferir com mais rigor antes de reportar concluído, dado o histórico de passadas incompletas.

## Referências
Demandas 244, 246, 247 (blueprint e correções anteriores). Demanda 250 (confirmação de
pagamento, pode ainda estar em andamento). Demanda 234 (manual de resposta, fonte do tom real).

## Relato de execução

Executada em 2026-07-30 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Correção em
`pm/conhecimento/blueprint-conversas-exemplo-agente.md` (nova seção "O que mudou (251)" logo
após a de 247) e artefato republicado na mesma URL das demandas 244/246/247.

### O que foi feito
Antes de corrigir qualquer coisa, checei o status da demanda 250 (achado relacionado ao ponto 1):
segue **"aprovada", não concluída**, em 2026-07-30 — segui a instrução do escopo pra esse caso e
documentei a situação real atual, marcada explicitamente como pendente de atualizar quando a 250
fechar, sem inventar um passo que não existe.

Reli o documento inteiro do início ao fim, mensagem por mensagem — não só os pontos que o Edvam
apontou. **Contagem total: 22 mensagens do AGENTE no documento antes desta revisão.** Revisei as
22, uma a uma, contra o critério "mais de 1 frase completa (sujeito+verbo) na mesma bolha deve
ser dividida" (mesmo padrão da 246, comparando com exemplo REAL do manual da 234 — em particular
o padrão "interjeição/fragmento + 1 frase com verbo", já precedentado pela citação real "Ok!
Vamos alterar 😊"). Resultado: **19 das 22 já estavam corretas** (a maioria seguia exatamente o
padrão fragmento+1 verbo já precedentado); **3 ainda tinham 2 frases completas escondidas atrás
de correções anteriores** — divididas agora: a abertura do Exemplo A ("Recebemos seu arquivo, já
te digo o valor" → 2 mensagens), uma continuação do Exemplo E ("Você mandou R$ 5,00, tem
diferença" → 2 mensagens) e a nota da Regra 4 ("Recebemos sua imagem — já chamo a equipe" → 2
mensagens). Com as 3 divisões, o documento passou a ter **25 mensagens do agente, 100%
revisadas, 100% dentro do padrão** — **1 exceção deliberada e documentada** (não esquecimento): o
template de Pix do Exemplo A não foi dividido porque não é uma resposta que eu escrevi — é a
reprodução fiel de 1 mensagem de texto único que o sistema já manda hoje (`/send-text`, 1
parâmetro `message`), dividir falsificaria o que o código realmente envia.

**Ponto 1 (passo pós-pagamento)**: adicionado ao Exemplo A, com nota SISTEMA explicando o achado
real da 250 (webhook do Mercado Pago detecta e grava `pagamento_confirmado=true`, mas nenhuma
mensagem sai pro cliente hoje) e um bloco "⏳ pendente de atualizar quando a 250 fechar" cobrindo
os 2 cenários possíveis (rascunho automático vs. só ajuste de texto).

**Ponto 3 (lista confusa)**: investigado antes de "escolher uma solução" — descobri que o
`.md` (fonte de verdade) **nunca teve o problema**: sempre listou as 13 categorias reais
separadamente. O empacotamento que o Edvam viu ("Encadernação · Plastificação · Escritório" como
1 item) era um bug de compactação visual só no artefato HTML, criado pra economizar espaço no
mockup. Das 3 alternativas do escopo, escolhi (a) listar cada categoria separadamente — as 13 já
são o conjunto testado de verdade na demanda 206, reduzir pra categorias mais amplas (b)
introduziria agrupamento novo e não testado só pra corrigir um bug de renderização. Corrigido o
HTML pra mostrar as 13 linhas sem nenhum " · " juntando itens.

### Testes realizados e resultado
Nenhum teste de execução — revisão de documento. Verificação: reli o arquivo `.md` inteiro do
início ao fim uma vez mais depois de todas as edições, conferindo que as 25 mensagens finais
seguem o padrão e que a lista do Exemplo B ficou sem ambiguidade nos dois artefatos (fonte e
HTML).

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo além do já registrado nas correções anteriores (247) — a nota desatualizada em
`OBJETIVOS-MACRO.md` sobre aprovação da Meta segue sinalizada, não corrigida (fora de escopo,
pertence a outra investigação).

### Status final
Concluída. Critérios de aceite atendidos com rigor extra dado o histórico de passadas
incompletas: 100% das 22 mensagens originais revisadas (não só as suspeitas), contagem total
declarada (22 → 25 após as 3 divisões), nenhuma em parágrafo longo (exceto a exceção documentada
do template de produção); Exemplo A atualizado com o passo pós-pagamento refletindo a realidade
confirmada e marcado como pendente da 250; lista do Exemplo B corrigida sem itens empacotados,
com a causa raiz (bug só no artefato, não na fonte) identificada e explicada; artefato republicado
na mesma URL com a seção "O que mudou (251)" visível no topo e navegável.
