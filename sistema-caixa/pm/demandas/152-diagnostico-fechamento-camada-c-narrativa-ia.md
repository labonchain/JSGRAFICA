# 152 — Diagnóstico de Fechamento (Camada C/4): resumo narrativo gerado por IA

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto — plano geral (Camadas A e B concluídas e validadas)
A Camada A (149) coleta os dados do dia; a Camada B (150) sinaliza padrões conhecidos por regra.
Falta a parte que o Edvam pediu desde o início: **um resumo em português, gerado por IA,
explicando o fechamento do dia** — o que bateu, o que não bateu, hipóteses prováveis pras
divergências, citando os sinais da Camada B — editável pelo Admin depois.

O projeto já tem `GEMINI_API_KEY` configurada (`.env.local`) — reaproveitar, não configurar
integração nova.

## Objetivo
Existe um endpoint que gera (e salva, editável depois) um resumo narrativo do fechamento de um
dia, usando os dados da Camada A + os sinais da Camada B como entrada pro modelo.

## Escopo
- Incluído:
  1. Endpoint novo (ex. `POST /api/fechamento/diagnostico/resumo?data=DD-MM-AA`) que monta um
     prompt com os dados da 149 + sinais da 150 (não mandar dado bruto demais — resumir o que for
     relevante: totais, divergência, cada sinal com sua descrição) e chama o Gemini pra gerar um
     texto em português, tom direto (nada de "IA genérica" — direto, sem enrolação, no mesmo
     espírito das demandas deste projeto), citando números reais, nunca inventando causa que os
     dados não sustentam — se não tiver explicação, o texto deve dizer isso claramente, não
     forçar uma hipótese fraca.
  2. Salvar o resultado em `jsgrafica_fechamento` (colunas novas, ex. `resumo_ia`,
     `resumo_editado`, `resumo_gerado_em`) — permite que a Camada D (tela) mostre e deixe editar.
  3. **Se a chamada ao Gemini falhar** (erro, timeout, sem cota): não travar o fechamento nem
     quebrar o diagnóstico — devolver erro claro, o endpoint de diagnóstico (149/150) continua
     funcionando normalmente sem o resumo.
  4. Gerar de novo (re-chamar o endpoint) deve sobrescrever `resumo_ia` sem apagar
     `resumo_editado` se já existir uma versão editada pelo Admin (não perder edição manual à toa).
- Fora de escopo: tela de exibição/edição (Camada D). Qualquer correção automática de dado — o
  resumo só narra, nunca corrige nada sozinho.

## Critérios de aceite
- [ ] Endpoint gera resumo em português pro dia pedido, citando números e sinais reais
- [ ] Resumo não inventa causa quando os dados não sustentam uma explicação — diz isso com todas
      as letras
- [ ] Falha do Gemini não derruba o diagnóstico nem o fechamento
- [ ] Resumo editado manualmente não é perdido ao gerar de novo
- [ ] Testado contra 09-07-26 (divergência real de R$94,60, sem explicação) e confirma que o texto
      reflete isso honestamente, sem forçar uma causa

## Referências
Demandas 149/150 (Camadas A/B, fonte de dados). `.env.local` (`GEMINI_API_KEY`, já configurada).

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_9dsXMhGwpvkHDBuRii6HqzygQKiT`,
verificado em produção (resumo real de 09-07-26 gerado e salvo pelo endpoint de produção).

### O que foi feito
1. **`POST /api/fechamento/diagnostico/resumo?data=DD-MM-AA`** (sem data → hoje; inválida → 400).
   Coleta via `montarDiagnosticoDia` — a coleta das Camadas A/B saiu do route handler pra
   `lib/diagnostico.ts` (refactor sem mudança de comportamento; o GET do diagnóstico virou casca
   fina) pra ser reaproveitada aqui sem duplicação.
2. **Prompt compacto, não o dump bruto**: totais do dia, fechamento geral gravado (físico ×
   esperado × divergência), gavetas por operador COM divergência real de cada uma, agregado de
   pedidos por forma de pagamento, saldo MP, e os sinais da Camada B (severidade + descrição).
   Instruções duras no prompt: português direto sem floreio, 1-3 parágrafos corridos, citar os
   números reais, **PROIBIDO forçar hipótese que os dados não sustentam** — mandado dizer "os
   dados disponíveis não explicam a diferença" nesses casos. `chamarGemini` reaproveitada da 048
   (ganhou `opts` opcional de tokens/temperatura — 500 fixos cortavam o texto; sem opts,
   comportamento idêntico).
3. **Persistência editável** (migration `add_resumo_ia_fechamento`: `resumo_ia`,
   `resumo_editado`, `resumo_gerado_em` em `jsgrafica_fechamento`): grava na linha GERAL do dia
   (critério `ehFechamentoGeral`; filtro com `.is()` pro caso histórico de `fechado_por` NULL).
   Regerar sobrescreve SÓ `resumo_ia`/`resumo_gerado_em` — `resumo_editado` nunca é tocado.
   **Dia sem fechamento geral**: gera e devolve o texto com `salvo: false` e aviso — salvar
   exigiria criar a linha, e isso marcaria o dia como "fechado" pro resto do sistema (decisão
   documentada).
4. **Falha do Gemini**: 502 com mensagem clara, nada gravado, fechamento e diagnóstico intocados.

### Ajuste de honestidade que o teste pegou
Na primeira geração o modelo escreveu que a gaveta da Gabi fechou "sem divergência" — inventado:
o prompt não trazia a divergência por operador (a Gabi teve R$-18,55, abaixo do limiar de sinal
da 150, então nem sinal havia). Correção: o diagnóstico ganhou `fechamentosOperadoresDetalhe`
(contado × esperado × divergência de cada gaveta) e o prompt passa os números — o texto passou a
citar as três divergências exatas (geral R$94,60, Zu R$45,35, Gabi R$-18,55) sem deduzir nada.

### Testes (contra 09-07-26, divergência real de R$94,60 sem causa)
- Resumo gerado cita os números reais e fecha com **"Os dados disponíveis não explicam a
  diferença."** — sem causa forçada, como exigido; sinais da Camada B refletidos (Zu como ponto
  de atenção).
- Preservação: `resumo_editado` sintético gravado via SQL → regerou → edição intacta no banco,
  `resumo_ia`/`resumo_gerado_em` atualizados, resposta com `resumoEditadoPreservado: true`
  (sintético removido depois).
- Dia sem fechamento geral (hoje): `salvo: false` + aviso, ZERO linha criada (conferido por SQL).
- Falha do Gemini: dev com `GEMINI_API_KEY` inválida (env de processo vence `.env.local`) →
  502 com a mensagem certa, `resumo_gerado_em` inalterado no banco, e o GET do diagnóstico
  respondendo normal no mesmo servidor quebrado.
- Data inválida → 400. `tsc`/build limpos. Regressão do GET 149/150 após o refactor: mesma
  resposta de antes (+ o campo aditivo `fechamentosOperadoresDetalhe`).
- **Produção**: POST real em `admin.jsgrafica.site` → resumo de 09-07-26 gerado e salvo
  (`salvo: true`) — ficou gravado na linha do dia como primeiro resumo oficial, pronto pra
  Camada D exibir.

### Observação
Durante os testes, os 16 sinais de telefone `@lid` de 09-07 (achado da 150) desapareceram do
diagnóstico — os telefones foram corrigidos no banco por fora (encaminhamento do PM). O
diagnóstico refletiu a correção na hora, como esperado; restam os 2 sinais de divergência.

### Critérios de aceite
- [x] Resumo em português citando números e sinais reais do dia
- [x] Sem causa inventada — "os dados disponíveis não explicam a diferença", com todas as letras
- [x] Falha do Gemini não derruba diagnóstico nem fechamento (testado com chave inválida)
- [x] Edição manual preservada ao regerar (testado com regeração real)
- [x] Testado contra 09-07-26 (R$94,60) — texto honesto, sem hipótese forçada

**Camada D (tela) NÃO iniciada — aguardando validação do PM desta camada.**
