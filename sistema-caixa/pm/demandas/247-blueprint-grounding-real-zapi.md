# 247 — Fundamentar o blueprint na documentação real da Z-API (não estava lido antes)

Status: aprovada
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam questionou se a documentação real da Z-API/Meta tinha sido lida —
não tinha, achado confirmado pelo PM)
Concluída em: —
Chat executor: 06 - AUTOMAÇÃO ATENDIMENTO INBOX

## Contexto
O Edvam perguntou diretamente se este chat (ou o PM) já tinha lido a documentação real da Z-API
e as regras da Meta antes de propor botões/listas/Pix no blueprint das demandas 244/246. A
resposta honesta: não. As demandas anteriores se apoiaram em (a) um teste técnico real da 206
(prova que o envio funciona, não que é o tipo certo) e (b) uma busca genérica em blog sobre
política do WhatsApp — não na documentação oficial da Z-API nem no comportamento real já usado em
produção.

O PM leu agora a documentação real (`developer.z-api.io`) e achou:
- **Z-API não é a API oficial da Meta** — é um gateway não-oficial que emula WhatsApp Web, fora
  da rede formal de parceiros da Meta (`tips/Z-APIvsAPI-OFICIAL`). A regra "sessão de 24h não
  precisa aprovação da Meta pra botão", citada nas demandas anteriores, é uma regra da API oficial
  da Meta — não está confirmado que se aplica do mesmo jeito aqui.
- **Botões têm instabilidade reconhecida pela própria Z-API** (`tips/button-status`), sem garantia
  de funcionamento, sujeitos a quebrar com atualização do WhatsApp.
- **Existe endpoint dedicado pra Pix (`message/send-button-pix`)**, mas espera uma **chave Pix
  fixa** (CPF/CNPJ/telefone/e-mail/EVP) — não serve pro código dinâmico "copia e cola" que o
  Mercado Pago gera por cobrança, que é o que o sistema usa de verdade.
- **Mensagens com "Pix"/"boleto"/"cartão" ativam mecanismo de verificação automática do WhatsApp**
  (`tips/blockednumbernew`) — achado real, mas **o sistema já manda essas palavras hoje em
  produção sem problema relatado** (confirmado por investigação de código: `lib/pedidos.ts`
  `montarTrechoPix()` monta o texto, `lib/zapi.ts enviarMensagem()` manda via `/send-text` simples
  — nunca usou botão especial), porque **o envio é sempre disparado por um humano clicando
  "Enviar" no Inbox**, nunca automático (confirmado: `app/api/inbox/responder/route.ts`,
  reforçado pelo `CLAUDE.md`: "sem auto-resposta ao cliente", "sugestão de IA é botão, não
  automático").
- **Boa prática documentada de variar a mensagem** (`tips/best-practices`: pelo menos 5 versões
  diferentes do mesmo tipo de aviso) — o blueprint hoje usa frase fixa repetida por cenário.

**A pergunta real que ficou sem resposta em nenhuma demanda até agora**: quando o Admin aprova um
pedido gerado pelo agente (`aguardando_aprovacao` → aprovado), o WhatsApp sai **automaticamente**
pro cliente, ou continua precisando de um humano clicar "Enviar" como hoje? O artefato da 244/246
registrou isso como "decisão de implementação, não decidida aqui" — mas essa decisão afeta
diretamente o risco de banimento e precisa ser resolvida antes de qualquer conexão real.

## Objetivo
O blueprint (documento + artefato das demandas 244/246) revisado de forma fundamentada na
documentação técnica real da Z-API, com a decisão de "envio automático vs. manual" proposta
explicitamente, e as 3 imprecisões técnicas corrigidas.

## Escopo
- Incluído: ler as páginas reais da documentação da Z-API relevantes (URLs abaixo, já
  levantadas pelo PM) e citar cada uma como fonte, não como suposição:
  - `developer.z-api.io/tips/Z-APIvsAPI-OFICIAL` (Z-API não é API oficial da Meta)
  - `developer.z-api.io/tips/button-status` (instabilidade de botões)
  - `developer.z-api.io/message/send-button-pix` (limitação: chave fixa, não código dinâmico)
  - `developer.z-api.io/tips/blockednumbernew` (palavra-chave financeira ativa verificação)
  - `developer.z-api.io/tips/best-practices` (variação de mensagem, ritmo de envio)
  - `developer.z-api.io/message/send-button-list` e `send-option-list` (specs disponíveis, sem
    limite de caractere/quantidade documentado pela própria Z-API — registrar essa lacuna também)
- Incluído: substituir a proposta de "botão Pix" por texto simples, reproduzindo o padrão REAL já
  usado em produção (`montarTrechoPix()` em `lib/pedidos.ts`) — citar o template exato existente,
  não inventar um novo.
- Incluído: propor explicitamente a decisão de envio automático vs. manual pro momento de
  aprovação do pedido, com recomendação justificada (dado o achado de risco, recomendação
  provisória do PM é manter humano clicando enviar, pelo menos na primeira leva — mas cabe ao
  06-ATENDIMENTO desenhar a proposta formal com prós/contras).
- Incluído: reforçar o caminho de fallback por texto (que a 206 já testou parcialmente) como
  caminho principal de confirmação, não só acessório, dado a instabilidade documentada de botões.
- Incluído: revisar se as mensagens do agente no blueprint precisam de variação (pelo menos 2-3
  versões por tipo de mensagem-chave) em vez de frase fixa única, à luz da recomendação da Z-API.
- Explicitamente fora de escopo: pesquisar a política oficial da Meta em si (Z-API não é a API
  oficial, então essa pesquisa teria valor limitado agora) — foco na documentação real da Z-API,
  que é o gateway efetivamente usado.
- Explicitamente fora de escopo: implementar qualquer coisa — segue sendo documento de revisão.

## Critérios de aceite
- [ ] Cada afirmação técnica sobre botão/lista/Pix no blueprint cita a página real da Z-API que a
      embasa (não presunção)
- [ ] Proposta de Pix trocada pra texto simples, reproduzindo o template real já em produção
- [ ] Decisão de envio automático vs. manual proposta explicitamente, com recomendação
      justificada
- [ ] Fallback por texto reforçado como caminho principal, não acessório
- [ ] Avaliado se mensagens-chave precisam de variação, com decisão registrada (fez ou justificou
      não fazer)
- [ ] Artefato republicado com nova seção "O que mudou" (mesma prática da 246)

## Riscos e cuidados
Nenhum — documento de revisão, sem execução. Mas o conteúdo revisado aqui é o que vai embasar a
decisão real de conectar a Fase B (demanda 243) — precisão importa mais que velocidade nesta
demanda especificamente.

## Referências
Demandas 244/246 (blueprint atual). Demanda 243 (decisões pendentes que dependem deste
documento). `lib/pedidos.ts` (`montarTrechoPix`), `lib/zapi.ts` (`enviarMensagem`),
`app/api/inbox/responder/route.ts` (padrão real de envio manual hoje). Documentação Z-API citada
acima.

## Relato de execução

Executada em 2026-07-29 (06 - AUTOMAÇÃO ATENDIMENTO INBOX). Correção em
`pm/conhecimento/blueprint-conversas-exemplo-agente.md` (novas seções "O que mudou (247)" e
"Fundamentação técnica real" logo após a legenda) e artefato republicado na mesma URL das
demandas 244/246.

### O que foi feito
Antes de escrever qualquer correção, li as 7 páginas reais de `developer.z-api.io` listadas no
escopo (mais `send-option-list`, complementando `send-button-list`) e o código real
(`lib/pedidos.ts`, `lib/zapi.ts`, `app/api/inbox/responder/route.ts`). Achados confirmados: Z-API
não é parceira oficial da Meta (emula WhatsApp Web); botões têm instabilidade reconhecida pela
própria Z-API ("a cada atualização do whatsapp os botões podem sofrer alterações"); o endpoint
dedicado de Pix (`send-button-pix`) espera chave fixa, não código dinâmico — confirma que o
sistema está certo em nunca usá-lo, só texto simples (`montarTrechoPix`); palavras financeiras
podem ativar verificação automática do WhatsApp, risco real mas já mitigado hoje porque todo
envio passa por um humano clicando "Enviar" (`app/api/inbox/responder/route.ts`); boa prática de
5+ variações de mensagem mira campanha de disparo em massa, categoria de risco diferente de
resposta dentro de conversa iniciada pelo cliente; `send-option-list`/`send-button-list` não
documentam limite de opção/caractere, mas a lista de 13 categorias do Exemplo B já rodou de
verdade na 206 (evidência real, não só ausência de limite documentado).

A partir disso: reescrevi o Exemplo A trocando o placeholder genérico de Pix pelo texto real de
`montarTrechoPix()`; adicionei nota de fallback por texto (reconhecimento de "sim"/"confirma" já
testado no buffer da 206) nos Exemplos A e B, deixando claro que botão/lista são conveniência,
nunca dependência única; propus formalmente a decisão de envio automático x manual pós-aprovação
(recomendação: manter manual na primeira leva, com justificativa completa); avaliei a
recomendação de variação de mensagem e registrei a decisão (3 variações só pras poucas mensagens
verdadeiramente fixas sem dado variável, não pras que já variam por conterem produto/valor real).

### Testes realizados e resultado
Nenhum teste de execução — revisão de documento fundamentada em leitura de documentação e código
real, não em execução. Toda afirmação técnica sobre botão/lista/Pix no documento revisado agora
cita a página real da Z-API ou o arquivo de código que a confirma.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- A nota "sessão de 24h dispensa aprovação da Meta pra botão" em `pm/OBJETIVOS-MACRO.md` (de
  investigação anterior) vem da regra da API oficial da Meta — não confirmada pra Z-API, que não é
  parceira oficial. Não corrigi `OBJETIVOS-MACRO.md` (pertence a outra frente/investigação),
  só registrei a ressalva no blueprint e sinalizo aqui pro PM avaliar se atualiza a nota lá.

### Status final
Concluída. Todos os critérios de aceite atendidos: cada afirmação técnica cita fonte real; Pix
trocado por texto simples reproduzindo o template real; decisão de envio automático x manual
proposta com recomendação justificada; fallback por texto reforçado como caminho principal nos
Exemplos A e B; variação de mensagem avaliada com decisão registrada; artefato republicado na
mesma URL com nova seção "O que mudou" e "Fundamentação técnica real" visíveis no topo.
