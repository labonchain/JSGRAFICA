# 358 - Subir o código do site-v2 pro GitHub (repo público compartilhado)

Status: concluída
Criada em: 2026-08-30
Aprovada em: 2026-08-30
Concluída em: 2026-08-30
Chat executor: 09 - SITE V2 JS GRAFICA

## Contexto
Mesma decisão da demanda 357: todo código da JS Gráfica vai pro repositório já existente
`labonchain/JSGRAFICA` (**público**, criado pelo Edvam, já em uso pelo pipeline de conteúdo via
GPT em `assets/`, `conteudos/`, `docs/`, `.github/`, não mexer nessas pastas).

Diferente do `caixa-js-grafica`, o `site-v2` **já tem git local inicializado** (2 commits:
`0662f6a`, `6c1b34b`), mas **sem remoto configurado** (`git remote -v` vazio), nunca foi
sincronizado em lugar nenhum.

## Objetivo
Código do `site-v2` disponível em `labonchain/JSGRAFICA`, numa pasta própria bem nomeada, sem
nenhum segredo real no histórico do git.

## Escopo
Incluído:
1. **Auditoria de segredo** nos 2 commits locais já existentes, antes de expor publicamente:
   - Conferir `.gitignore` já cobre `.env*`, `node_modules`, `.next`, `.vercel`.
   - `git log -p` ou busca no histórico local pra garantir que nenhum dos 2 commits já feitos
     tem segredo commitado sem querer (se tiver, não dá só pra ajustar o próximo commit, precisa
     reescrever histórico local antes de subir pro público, esse repo nunca foi exposto ainda,
     dá pra corrigir sem custo).
   - Segredos conhecidos do site-v2: `SUPABASE_SERVICE_ROLE_KEY`, credenciais próprias das 3
     tabelas de catálogo público, qualquer chave de API que o site-v2 use.
2. **Estrutura**: pasta própria no repo compartilhado, sugestão `site-v2/` (nome já bate com o
   projeto, natural), sem tocar no que já existe (`assets/`, `conteudos/`, `docs/`, `.github/`).
3. **Git**: adicionar o remoto `labonchain/JSGRAFICA`, `pull` antes de qualquer push (repo tem
   commits recentes de outro processo), decidir se aproveita o histórico local de 2 commits
   (ex.: via subtree) ou parte de um commit novo limpo dentro da pasta do monorepo — o que for
   mais simples e seguro, história de 2 commits não é grande perda se precisar recomeçar.
4. Confirmar visualmente no GitHub que o push chegou certo e sem segredo.

Explicitamente fora de escopo: mexer no que já existe no repo (conteúdo do GPT).

## Critérios de aceite
- [ ] `.gitignore` correto, nenhum `.env*` no histórico final do git.
- [ ] Auditoria dos 2 commits locais existentes documentada no relato.
- [ ] Código no ar em `labonchain/JSGRAFICA/site-v2/`, confirmado via `gh repo view`/navegador.
- [ ] Pastas já existentes do repo intactas.

## Riscos e cuidados
Mesmo cuidado da 357: repositório público e compartilhado, sempre `pull` antes de `push`, nunca
`push --force`. Achar segredo real em qualquer commit (local ou novo) bloqueia o push até corrigir.

## Referências
`labonchain/JSGRAFICA` (repo real), `pm/demandas/357-subir-caixa-js-grafica-para-github.md`
(mesma decisão, outro projeto).

## Relato de execução

**Concluída em 2026-08-30.**

**Auditoria de segredo (2 commits locais existentes, `0662f6a`/`6c1b34b`)**:
- Nenhum arquivo `.env*` em nenhum momento do histórico (`git log --diff-filter=A --name-only`, vazio).
- Nenhum arquivo com nome secret/key/credential no histórico.
- `git log -p --all` buscando `SUPABASE_SERVICE_ROLE`, `service_role`, `api_key`, `secret`,
  `token`, `senha`: só ocorrências de documentação (regras dizendo "nunca usar service_role") e
  nome de variável (`process.env.SUPABASE_PUBLISHABLE_KEY`), nenhum valor real.
  Uma ocorrência de "senhas do cliente" era texto de descrição de serviço (Gov.br), não segredo.
- Busca por padrão de JWT longo (`eyJ...`) nos diffs: nenhuma ocorrência.
- `git ls-files` confirmado sem nenhum `.env*` rastreado (123 arquivos tracked no total).
- `.gitignore` já cobre `.env`, `.env.local`, `.env.*.local`, `.vercel`, `node_modules`, `.next`.
- Conclusão: histórico local limpo, não precisou reescrever nada.

**Abordagem técnica**: mesmo método usado na demanda 357 (mais seguro pro repo compartilhado com
processo paralelo ativo). Não usei os 2 commits locais nem subtree — cloneI `labonchain/JSGRAFICA`
num diretório de scratchpad isolado, copiei o conteúdo rastreado do `site-v2` (via
`git archive HEAD`, garante que só arquivos commitados entram, nenhum arquivo solto tipo
`.env.production` que existe no disco local) pra dentro de `site-v2/` no clone, um commit único e
limpo (123 arquivos), `git pull --ff-only` antes e depois de montar o commit, `git push` (sem
`--force`). O histórico local antigo de 2 commits continua intacto no projeto local, só não foi
replicado no repositório público.

**Confirmação pós-push (via API do GitHub, não só local)**:
- `site-v2/` presente na árvore de `main` do repositório remoto.
- Nenhum arquivo `.env*` na árvore remota dentro de `site-v2/`.
- Pastas já existentes (`assets/`, `conteudos/`, `docs/`, `.github/`, `sistema-caixa/`,
  `site-institucional/`) intactas, nada sobrescrito ou apagado.
- Push: `0715287..0dc9f2f main -> main`, sem bloqueio de permissão do Claude Code (diferente do
  que aconteceu com 03-App/01-N8N na mesma leva de demandas).

**Achados fora do escopo**: nenhum.

**Status final: concluída.**

PRONTO PRA CLEAR
