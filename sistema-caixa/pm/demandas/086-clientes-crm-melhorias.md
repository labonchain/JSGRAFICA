# 086 — Página de Clientes: virar CRM de verdade (foto, ordenação, grade/tabela, aniversário, endereço)

Status: concluída (1 ressalva — ver Relato)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Depois de ver a v1 da página de Clientes (demanda 083), Edvam quer evoluir pra um CRM de verdade.
Pedido, item a item, com o que já existe vs. o que precisa ser criado (confirmado pelo PM direto
no schema de `jsgrafica_contatos`):

| Pedido | Já existe? |
|---|---|
| Foto do contato | Sim — `lead_photo` já existe, só falta exibir |
| Ordem alfabética | Não precisa de campo novo — é só mudar a ordenação da lista |
| Grade ou tabela (toggle de visualização) | Não precisa de campo novo — é só UI |
| Última mensagem recebida | Existe no log (`jsgrafica_log_msgs_privadas`), precisa buscar |
| Data de aniversário | **Não existe** — WhatsApp não fornece isso, precisa de campo novo e edição manual |
| Endereço | **Não existe** um campo genérico (só `business_address`, que é de conta comercial do WhatsApp, não serve) — precisa de campo novo e edição manual |
| Produtos já pedidos | Já existe (demanda 083, histórico de pedidos por telefone) |

## Objetivo
Página de Clientes mostra foto, permite ordenar A-Z, alternar entre grade e tabela, mostra a
última mensagem recebida, e permite registrar aniversário/endereço manualmente (quando a equipe
souber essa informação) — virando um CRM de verdade, não só uma lista de contatos.

## Escopo
- Incluído:
  1. Exibir `lead_photo` (avatar) na lista e no detalhe — já existe o dado, só interface.
  2. Ordenação alfabética por nome (com opção de voltar pra ordenação por último contato, se fizer
     sentido manter as duas).
  3. Toggle grade/tabela na lista (visualização em cards com foto vs. lista compacta).
  4. Última mensagem recebida de cada contato, buscando em `jsgrafica_log_msgs_privadas`
     (`from_me=false`, mais recente) — cuidado de performance: não fazer 1 query por contato na
     lista inteira, buscar em lote/join.
  5. Novos campos em `jsgrafica_contatos`: `data_aniversario` (date, nullable) e `endereco` (text,
     nullable) — editáveis manualmente no painel de detalhe, mesmo padrão de edição inline da
     demanda 082 (campo de nome).
- Fora de escopo: importar aniversário/endereço automaticamente de algum lugar (não existe fonte
  pra isso) — é sempre entrada manual da equipe, quando souberem.

## Critérios de aceite
- [x] Foto aparece quando o contato tem uma
- [x] Lista pode ser ordenada A-Z
- [ ] Toggle grade/tabela funciona — implementado e revisado por código, **não clicado ao vivo
      num navegador** (ver ressalva no Relato)
- [x] Última mensagem recebida aparece por contato, sem deixar a tela lenta
- [x] Dá pra editar aniversário e endereço de um cliente, e isso persiste

## Referências
`jsgrafica_contatos` (`lead_photo` já existe). `jsgrafica_log_msgs_privadas` (última mensagem).
Demanda 083 (base da página de Clientes). Demanda 082 (padrão de edição inline a reaproveitar).

## Relato de execução

**Status final: concluída, com 1 ressalva (ver abaixo) — deployada em produção**

### O que foi feito
1. **Migração** (`jsgrafica_contatos_add_aniversario_endereco`): 2 colunas novas, aditivas e
   nullable — `data_aniversario date`, `endereco text`. Sem dado nenhum apagado ou alterado.
2. **Migração** (`jsgrafica_rpc_ultima_msg_recebida_em_lote`, com 1 ajuste depois — ver testes):
   função SQL `jsgrafica_ultima_msg_recebida_em_lote(valores text[])` que retorna, numa **única
   query** (`DISTINCT ON`), a última mensagem recebida (`from_me = false`) de cada telefone/@lid
   da lista — exatamente o "buscar em lote/join" pedido no escopo, evitando 1 query por contato
   numa lista de até 500. Filtra fora linhas sem conteúdo (status/entrega do Z-API sem texto nem
   mídia), mesmo critério que `app/api/inbox/conversas/route.ts` já usa.
3. **`app/api/clientes/route.ts`**:
   - Lista: inclui `lead_photo` (→ `foto`), aceita `?ordenar=nome|ultimo_contato`, e chama a nova
     função em lote pra preencher `ultimaMsgRecebida` por contato (remapeando contact_lid → phone
     principal, mesma dualidade da demanda 038).
   - Detalhe: inclui `foto`, `aniversario` (`data_aniversario`), `endereco`.
   - **Novo `PATCH /api/clientes`** — edita `aniversario`/`endereco` (pelo menos 1 dos dois).
     Mantido separado do `PATCH /api/inbox/contato` (nome, demanda 082) porque são conceitos
     exclusivos da tela de Clientes, sem equivalente no Inbox.
4. **`components/TelaClientes.tsx`**:
   - `Avatar` novo (mesmo padrão de fallback pra letra do `TelaInbox.tsx`, mas local — não
     exportado de lá) — usado na lista (grade e lista) e no cabeçalho do detalhe.
   - Toggle "Último contato" / "A-Z" na lista, manda `ordenar` pra API.
   - Toggle grade/tabela: lista compacta (linhas, como já era) ou grade de cards 2 colunas com
     avatar maior — puramente `useState` local, sem chamada de API extra.
   - Última mensagem recebida exibida na lista (linha ou card), com fallback pro "Último contato:
     {data}" quando não há mensagem com conteúdo.
   - Seção "Aniversário e endereço" no detalhe — mesmo padrão de edição inline da 082 (ícone de
     lápis → campos → Salvar/Cancelar), `<input type="date">` pro aniversário e `<textarea>` pro
     endereço, chamando o novo `PATCH /api/clientes`.

### Testes realizados e resultado
Local (`next dev` já ativo) e depois em produção, seguindo o alerta do Edvam nas demandas 082/083
de sempre confirmar em produção, não só local.

1. **Foto**: `GET /api/clientes` retornou `foto` com URL real da WhatsApp CDN pra contatos com
   `lead_photo` preenchido (ex. Edvan Filho, Ailton Photograf) — confirmado local e em prod.
2. **Ordenação A-Z**: `GET /api/clientes?ordenar=nome` retornou lista ordenada
   alfabeticamente (`.Thiago F`, `~Rebeka🕯️`, `🌷`, ... — nomes com emoji ficam no fim/meio pela
   ordenação Unicode, comportamento esperado do `localeCompare`, não é bug).
3. **Última mensagem recebida, sem N+1**: 1ª tentativa da função SQL trazia a última linha
   **mesmo sem conteúdo** (eventos de status/entrega do Z-API) — corrigido filtrando por
   `message_text`/`media_type`/`reaction_text` não nulos (mesmo critério do Inbox). Depois do
   ajuste, confirmado com 2 casos reais: `52063694233823@lid` → `"[audio]"` (mídia),
   `105879802253411@lid` → `"Que vendem as impressões em folhas A4 adesiva"` (texto). Contatos sem
   nenhuma mensagem recebida com conteúdo (ex. `170652120166628@lid`, `214099975757925@lid`)
   corretamente retornam `null` — confirmado por SQL direto que essas 2 pessoas de fato só têm
   linhas de status/entrega no log, nunca um texto/mídia recebido de verdade (não é bug, é dado
   real). Toda a busca é 1 query só (função `DISTINCT ON`), não 1 por contato.
4. **Editar aniversário/endereço, persistência confirmada**:
   - Local: `PATCH /api/clientes` em `170652120166628@lid` (Ailton Photograf) →
     `aniversario: "1990-05-20"`, `endereco: "Rua Teste 086, 123, Ibura"` → `GET` seguinte já
     refletia. Revertido pra `null`/`null` depois (estado original restaurado).
   - Produção: contato sintético criado só pro teste (`999999000003@lid`) → `PATCH
     https://admin.jsgrafica.site/api/clientes` com aniversário/endereço → `GET` seguinte
     confirmou persistência. Contato de teste apagado depois.
5. `npx tsc --noEmit` limpo, `npm run build` sem erro. `npx eslint` nos arquivos tocados não
   introduziu nenhuma classe de erro nova além do baseline já existente no projeto
   (`react-hooks/set-state-in-effect`, mesmo padrão usado em todo o resto do código).

### Deploy em produção
Aprendendo com o esquecimento das demandas 082/083: rodei `tsc`/`build` limpos, conferi os
arquivos financeiros por timestamp (nenhuma mudança inesperada) e **já deployei nesta mesma
entrega** — `npx vercel --prod --yes` → **deployment `dpl_49Y2YPH8nXxx2vsUy99zeuB9TqVb`**,
aliasado em `admin.jsgrafica.site` e `pdv.jsgrafica.site`. Todos os testes da seção acima que
dizem "produção" já são contra esse deploy, não só local.

### Achados fora do escopo
- **Ressalva no critério "Toggle grade/tabela funciona"**: mesma limitação já registrada nas
  demandas 082/083 — não tenho ferramenta de navegador nesta sessão pra clicar de fato e ver a
  troca de layout acontecer. É `useState` local simples (sem chamada de API), revisado por código,
  mas recomendo 1 clique manual rápido (Clientes → alternar entre os ícones de lista/grade) antes
  de fechar esse item 100%.
- Notei uma rota nova `app/api/inbox/rascunho-pedido` no manifesto do build que eu não criei —
  aparentemente outro chat (provavelmente 03-APP) adicionou algo nessa área entre uma sessão e
  outra. Não toquei nela, só registro que ela existe e compilou normalmente junto com o meu deploy.
- A ordenação alfabética usa `localeCompare` puro — nomes que começam com emoji/símbolo ficam
  misturados no meio da lista em vez de agrupados no fim. Comportamento aceitável pra v1 (não fazia
  parte do critério de aceite, só ordenar A-Z), mas registrando caso vire pedido de refinamento.

### Status final
Concluída e deployada em produção (`dpl_49Y2YPH8nXxx2vsUy99zeuB9TqVb`). 4 de 5 critérios
confirmados com dados reais em produção; o 5º (toggle grade/tabela) implementado e revisado por
código, pendente de 1 clique manual de confirmação visual — mesma ressalva recorrente das demandas
082/083 pela falta de ferramenta de navegador nesta sessão.
