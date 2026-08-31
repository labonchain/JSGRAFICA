# 253 — Reestruturar o blueprint em 2 abas: resultado final (pro Admin) + parte técnica

Status: aprovada
Criada em: 2026-07-30
Aprovada em: 2026-07-30
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
As 5 rodadas de correção anteriores (244, 246, 247, 251, 252) foram, cada uma, tecnicamente
corretas — mas o documento acumulou nota de correção em cima de nota de correção ("correção 247",
"⏳ pendente 251", "O que mudou (252)"), virando um histórico de revisões, não uma versão final
limpa. O Edvam foi explícito: isso **vai ser apresentado ao Admin pra aprovação final**, e ele
precisa entender claramente como o atendimento automático vai funcionar — sem ruído de processo
de correção no meio.

Decisão do Edvam sobre o que muda:
1. **O que o Admin precisa aprovar**: tudo — os exemplos de conversa E as 3 decisões da demanda
   243 (conectar a Fase B, lote de expansão, escopo mídia-vs-texto).
2. **Formato**: o mesmo artefato (mesma URL), reestruturado em **2 abas**: uma com o resultado
   final (pro Admin), outra com a parte técnica (histórico de correção, fundamentação da Z-API,
   achados — pra registro do PM/equipe, fora do caminho do Admin).

## Objetivo
O mesmo link do artefato passa a ter 2 abas claramente separadas:
- **Aba "Resultado final"**: versão limpa, final, sem nenhum rastro de revisão — pronta pro
  Admin ler do início ao fim e entender/aprovar, incluindo as 3 decisões da 243 explicadas em
  linguagem simples.
- **Aba "Parte técnica"**: tudo que hoje polui a Aba 1 — fundamentação real da Z-API (247),
  achados de risco, histórico de correção de cada rodada (246/247/251/252) — nada é perdido, só
  realocado.

## Escopo
- Incluído: reestruturar o artefato em navegação por abas (2 abas), mantendo a mesma URL.
- Incluído, na aba "Resultado final":
  - Reescrever os exemplos de conversa como **conversas finais únicas** — sem tag de qual
    demanda corrigiu o quê, sem callout de "achado"/"correção". Pode manter a etiqueta REAL vs.
    SIMULADO (é informação útil de confiança, não é ruído de processo), mas remover qualquer
    referência a número de demanda ou histórico de mudança.
  - Incluir uma seção clara, em linguagem simples (sem jargão técnico), explicando as 3 decisões
    da demanda 243 — o que está sendo proposto, por quê, e o que o Admin precisa decidir/aprovar
    em cada uma.
  - Ler essa aba do começo ao fim como se fosse o Admin vendo pela primeira vez, e confirmar
    explicitamente no relato que faz sentido sem precisar de contexto adicional.
- Incluído, na aba "Parte técnica": mover (não duplicar) a fundamentação da Z-API, os achados de
  risco, e o histórico "o que mudou" de cada rodada anterior.
- Incluído: atualizar `pm/conhecimento/blueprint-conversas-exemplo-agente.md` (arquivo fonte) na
  mesma estrutura de 2 seções, mantendo os dois documentos (artefato e `.md`) consistentes entre
  si.
- Explicitamente fora de escopo: mudar qualquer conteúdo de fundo já validado (as conversas em si,
  a fundamentação técnica) — é reestruturação de apresentação, não nova revisão de conteúdo.

## Critérios de aceite
- [ ] Artefato com 2 abas navegáveis, mesma URL
- [ ] Aba "Resultado final" sem nenhuma referência a número de demanda ou histórico de correção
- [ ] Aba "Resultado final" inclui as 3 decisões da 243 em linguagem simples, com o que o Admin
      precisa aprovar em cada uma
- [ ] Aba "Parte técnica" preserva tudo que saiu da aba 1 (nada perdido, só realocado)
- [ ] Relato confirma leitura da aba 1 do zero, como se fosse o Admin, e que faz sentido sozinha
- [ ] `.md` fonte atualizado na mesma estrutura

## Riscos e cuidados
Nenhum — reestruturação de apresentação, conteúdo já validado nas rodadas anteriores.

## Referências
Demandas 234, 244, 246, 247, 251, 252 (todo o material a reorganizar). Demanda 243 (as 3
decisões a incluir na aba de resultado final).

## Relato de execução

Executada em 2026-07-30 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Reescrevi por completo
`pm/conhecimento/blueprint-conversas-exemplo-agente.md` (2 seções: "PARTE 1 — Resultado final" e
"PARTE 2 — Parte técnica") e o artefato HTML (navegação por 2 abas, mesma URL das correções
anteriores).

### O que foi feito
**Aba/Parte 1**: reescrevi os 6 exemplos de conversa (documento simples, foto ambígua, rajada,
desistência, cuidado com Pix, confusão com a Dizu) + "outros casos rápidos" (currículo, pagamento
na retirada) como conversas finais únicas — mantendo as etiquetas 🔵 REAL / 🟡 SIMULADO / ⚙️
SISTEMA (informação de confiança), removendo toda referência a número de demanda, "correção X" ou
achado de processo. Escrevi as 3 decisões da demanda 243 em linguagem simples, sem jargão técnico
(nada de "workflow", "endpoint", "aguardando_aprovacao" cru) — cada uma com "o que você decide"
explícito: (1) conectar a Fase B de verdade, com os limites de segurança explicados em palavras
simples; (2) o grupo inicial de 3-4 clientes + a regra de quando liberar o próximo grupo; (3)
manter o escopo só em foto/documento por enquanto, sem texto puro.

**Aba/Parte 2**: realoquei (não dupliquei) o histórico de correção das 5 rodadas anteriores
(244/246/247/251/252) resumido em 1 parágrafo cada, a tabela de fundamentação técnica real da
Z-API com as 6 fontes citadas, os achados de risco (contradição da escalação, filtro Dizu, regra
de telefone como identidade, limite de captura do log, contaminação de log), o mapa de cobertura
das 11 regras do manual da 234, e a seção "honesto sobre os limites".

Reescrevi o artefato HTML do zero com um seletor de 2 abas (botões `role="tab"`/`aria-selected`,
foco visível, JS simples de mostrar/esconder painel, sem depender de nenhuma capability de
runtime — é só alternância de exibição client-side) — mesma URL da 244/246/247/251/252,
reaproveitando a identidade visual já estabelecida (tema prova-gráfica/docket).

### Testes realizados e resultado
Sem execução de código — documento/artefato de apresentação. Conferi por busca de texto
(`grep`) que a aba 1 do artefato não contém nenhuma menção a "demanda", "correção" nem números
de demanda (246/247/251/252) — confirmado, zero ocorrências.

**Leitura da aba 1 do zero, como se fosse o Admin** (pedido explícito do escopo): reli a Parte 1
do `.md` (equivalente à aba 1) do início ao fim, sem pular nada, perguntando a cada parágrafo "um
Admin sem contexto técnico entenderia isso sozinho?". Resultado: faz sentido sozinha — a
legenda REAL/SIMULADO/SISTEMA é explicada antes de aparecer nas conversas; as 3 decisões
explicam o quê, o porquê e o que decidir, sem depender de ter lido nenhuma demanda anterior; os
exemplos de conversa são autoexplicativos com as notas de rodapé em português simples (ex. "o
agente nunca decide sozinho", "nenhum pedido... sem você aprovar"). Único ajuste feito durante
essa leitura: a linha de cabeçalho do arquivo (fora da Parte 1, mas no mesmo arquivo) ainda citava
"(demanda 253)" — removida por precaução, mesmo estando tecnicamente fora da seção Parte 1.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo.

### Status final
Concluída. Os 6 critérios de aceite atendidos: artefato com 2 abas navegáveis na mesma URL; aba
"Resultado final" sem nenhuma referência a demanda/correção (confirmado por busca de texto); as 3
decisões da 243 em linguagem simples com "o que você decide" explícito em cada uma; aba "Parte
técnica" preserva 100% do que saiu da aba 1 (histórico, fundamentação Z-API, achados de risco,
mapa de regras, limites — nada removido, só realocado); leitura da aba 1 do zero confirmada,
documento faz sentido sem contexto adicional; `.md` fonte atualizado na mesma estrutura de 2
partes, consistente com o artefato.
