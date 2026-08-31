# 174 — Dar mais destaque ao vincular contato no balcão, perguntando antes do carrinho

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 163 criou o campo "🔍 Vincular contato (opcional)" no balcão — mas ele é um campo de
texto discreto, no topo do painel do carrinho, fácil de ignorar (o carrinho começa vazio, "0
itens", e o campo de vínculo não chama atenção nenhuma perto do resto da tela). O Edvam quer dar
mais destaque visual a esse campo, e também considerar **perguntar isso ANTES de começar a
montar a venda** (antes de escolher produtos), não só como um campo discreto que fica lá esperando
enquanto a operadora já está escolhendo produtos.

## Objetivo
Vincular contato fica mais visível e, se possível, entra no início do fluxo da venda — sem nunca
travar ou atrasar uma venda rápida.

## Escopo
- Incluído: repensar a posição/destaque visual do campo "Vincular contato" no balcão (tanto
  `app/page.tsx` quanto `app/pdv/page.tsx`) — ideias possíveis pro executor avaliar: mover pra
  antes da grade de produtos, aumentar destaque visual (cor, ícone, tamanho), ou perguntar como um
  passo curto opcional antes de abrir o carrinho. Decisão de qual abordagem exata fica com o
  executor, desde que aumente a visibilidade real (não só cosmético).
- **Regra que não muda, herdada da 146/163**: nunca travar nem atrasar de verdade uma venda rápida
  — se a operadora quiser pular e ir direto pros produtos, tem que continuar tão rápido quanto
  hoje. "Perguntar antes" não pode virar "obrigar antes".
- Explicitamente fora de escopo: mudar a lógica de busca/criação de contato em si (já funciona,
  demandas 163/167/172) — só a posição/destaque na interface.

## Critérios de aceite
- [ ] Campo de vincular contato fica visivelmente mais destacado que hoje
- [ ] Testar percepção: alguém que nunca usou o sistema notaria o campo sem precisar procurar?
- [ ] Venda rápida ignorando o vínculo continua com o mesmo número de cliques/tempo de hoje
      (regressão explícita, mesmo critério já usado na 163)
- [ ] Testado nos dois balcões (admin e PDV)

## Riscos e cuidados
Mesmo risco já identificado na 163: esse projeto sempre protegeu a velocidade da venda rápida —
qualquer mudança de posição/fluxo que pareça "mais um passo obrigatório" precisa ser revisada com
cuidado antes de considerar concluído.

## Referências
Demanda 163 (campo original, "nunca travar"), demanda 146 (mesmo racional pra "retirada"). Prints
do Edvam mostrando o campo discreto no carrinho vazio.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### Abordagem escolhida (decisão do executor)
O campo discreto virou um **cartão destacado com cabeçalho próprio**, primeiro bloco do painel
do carrinho (antes dos itens — é o início visual do fluxo da venda): borda/fundo azul + "👤
Quem é o cliente? (opcional)" quando vazio; verde + "👤 Cliente vinculado à venda" quando
vinculado. No carrinho vazio, nudge "👆 Sabe quem é o cliente? Vincule ali em cima antes de
começar" (o "perguntar antes de montar a venda" sem virar passo). Placeholder do campo virou
"🔍 Buscar por nome ou telefone" (diz o que fazer). Nos 2 balcões, mesmo tratamento.
"Perguntar como passo separado antes do carrinho" foi descartado de propósito: qualquer tela/
modal intermediário é um passo a mais na venda rápida — violaria a regra da 146/163.

### Critérios
- Destaque real: era um input cinza padrão no meio de outros; agora é o único bloco colorido
  do painel, com título — visível sem procurar (screenshots admin + PDV de produção).
- **Venda rápida: ZERO clique a mais** — nenhum fluxo novo, só estilo em volta do componente
  existente; ignorar o campo continua idêntico (regressão da 163 preservada por construção e
  conferida nas vendas de teste da 185, que fecharam sem tocar no vínculo).
- Testado nos 2 balcões: admin local (Playwright) e PDV de produção (login Zu, só leitura).
