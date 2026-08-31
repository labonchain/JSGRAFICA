# 019 — Limpeza de código morto

Status: aprovada — baixa prioridade
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Itens de limpeza já identificados (backlog antigo do projeto): `lib/sheets.ts` sem uso (nenhuma
rota ativa chama), `TelaLog` (~150 linhas em `app/page.tsx`) é dead code, e o
`console.log` de diagnóstico em `app/api/inbox/enviar-midia/route.ts` pode sair agora que o
envio de mídia está estável.

## Objetivo
Remover o que está confirmado sem uso.

## Escopo
- Incluído: confirmar que `lib/sheets.ts` não é importado em nenhuma rota ativa antes de
  apagar; remover `TelaLog`; remover o `console.log` de diagnóstico.
- Fora de escopo: qualquer refatoração maior.

## Critérios de aceite
- [ ] Build continua passando depois da remoção
- [ ] PDV/Admin testados rapidamente pra confirmar que nada quebrou

## Referências
Backlog do projeto (`CLAUDE.md` do caixa-js-grafica).

## Relato de execução

### O que foi feito
- `lib/sheets.ts`: **já não existia** — confirmado por grep que não há nenhum import de
  `lib/sheets` em nenhum arquivo `.ts/.tsx` do projeto (só aparecia em cache de build). Olhando
  o `DEVLOG.md`, o arquivo já tinha sido apagado na migração de 02/05/2026. Nada a fazer aqui.
- `TelaLog` removido de `app/page.tsx`: apagada a função inteira (`interface LinhaLog` +
  `function TelaLog() {...}`, ~165 linhas) e o comentário de seção "LOG DE VENDAS". Confirmado
  por grep que não havia nenhuma chamada `<TelaLog` nem entrada `"log"` no array de abas — era
  mesmo código morto, sem nenhuma tela apontando pra ele.
- `console.log('[enviar-midia] zapi response:', ...)` removido de
  `app/api/inbox/enviar-midia/route.ts`.

### Achado fora do escopo (relatado, não resolvido)
Ao remover `TelaLog`, notei que ele era o **único consumidor** de `app/api/log/route.ts`
(`fetch('/api/log?mes=...')`). Com a tela removida, essa rota de API fica órfã (ninguém mais
chama). Não apaguei a rota porque não estava no escopo desta demanda ("qualquer refatoração
maior" está fora) e porque apagar uma rota de API é uma decisão um pouco maior do que remover
um componente de UI não referenciado — fica como candidata pro PM decidir se vira uma
demanda 019-b ou similar.

### Testes realizados
- `npx tsc --noEmit` — sem erros de tipo depois das remoções.
- `npm run build` — build de produção passou limpo, todas as rotas listadas normalmente
  (incluindo `/api/log`, que continua funcionando mesmo órfã).
- Rodei `npm run dev` limpo (tive que encerrar um processo antigo de dev server que tinha
  ficado rodando de um teste anterior nesta mesma sessão, ocupando a porta 3000 com código
  desatualizado — depois de matá-lo e subir de novo, testei contra o código atual de verdade)
  e testei via `curl`:
  - `GET /` (Admin) → 200
  - `GET /pdv` → 200
  - `GET /api/produtos` → 200
  - `GET /api/movimento` → 200, `nomeAba` correto (confirma que a correção da demanda 020
    continua de pé)
  - `GET /api/log?mes=07-26` → 200 (API órfã mas não quebrada)
- Não cliquei manualmente nas telas no navegador (sem ferramenta de browser disponível nesta
  sessão) — o teste via `curl` confirma que as páginas renderizam (200, sem erro 500) e que a
  API núcleo do PDV/Admin continua respondendo depois da remoção do código morto.

### Deploy
`npx vercel --prod --yes` — deployment `dpl_6uLCAbfghJZdr7ZM5aFxrQZLqFgh` (bundlado junto com
a demanda 022), aliased pra `pdv.jsgrafica.site`. Confirmado 200 em produção em
`admin.jsgrafica.site` e `pdv.jsgrafica.site` depois do deploy.

### Status final
Concluída (com o achado da rota `/api/log` órfã relatado acima para o PM decidir).
