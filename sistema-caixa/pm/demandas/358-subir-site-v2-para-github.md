# 358 - Subir o código do site-v2 pro GitHub (repo público compartilhado)

Status: aprovada
Criada em: 2026-08-30
Aprovada em: 2026-08-30
Concluída em: (vazio até conclusão)
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
(preenchido pelo 09-Site V2 ao concluir)
