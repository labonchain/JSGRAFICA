# 357 - Subir o código do caixa-js-grafica pro GitHub (repo público compartilhado)

Status: concluída
Criada em: 2026-08-30
Aprovada em: 2026-08-30
Concluída em: 2026-08-31
Chat executor: 03 - APP JS GRAFICA

## Contexto
Decisão do Edvam (30/08): todo o código da JS Gráfica vai pro GitHub, no repositório já existente
`labonchain/JSGRAFICA` (**público**, confirmado pelo Edvam, criado por ele mesmo, hoje usado pelo
pipeline de conteúdo via GPT que já commita lá automaticamente em `assets/`, `conteudos/`,
`docs/`, `.github/`). O `caixa-js-grafica` nunca teve repositório git inicializado até hoje.

**Risco real, não teórico**: este projeto já teve 2 incidentes reais de credencial exposta
(demanda 302: senha do Admin em texto puro no bundle JS público; achado de `service_role` do
Supabase em workflow n8n do LabOnchain). Repositório é público, qualquer segredo commitado fica
visível pra qualquer um imediatamente, sem chance de "ninguém vai achar por obscuridade".

## Objetivo
Código do `caixa-js-grafica` versionado e disponível em `labonchain/JSGRAFICA`, numa pasta própria
bem nomeada, **sem nenhum segredo real no histórico do git**, coexistindo sem conflito com o que
já está no repo.

## Escopo
Incluído:
1. **Auditoria de segredo, antes de qualquer commit**:
   - Confirmar que `.env.local`, `.env`, `.env*.local` estão no `.gitignore` (criar um `.gitignore`
     adequado se não existir: `node_modules`, `.next`, `.env*`, `.vercel`, etc.).
   - Buscar no código (não só nos `.env`) por segredo hardcoded: `grep -riE` por padrões tipo
     `SECRET`, `_KEY`, `TOKEN`, `PASSWORD`, `service_role`, e por qualquer valor literal que
     pareça chave/token/senha (ex.: o que a demanda 302 já achou uma vez, `lib/usuarios.ts` sendo
     importado em client component, etc.). Confirmar que não existe resíduo disso hoje.
   - Nomes de variável de ambiente sensíveis conhecidos, NUNCA hardcoded no código, só referência
     via `process.env`: `SESSION_SECRET`, `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`,
     `SUPABASE_JWT_SECRET`, `INTERNAL_SERVICE_SECRET`, `MERCADOPAGO`/Z-API tokens,
     `GOOGLE_SERVICE_ACCOUNT_JSON`.
2. **Estrutura**: pasta própria dentro do repo compartilhado, sugestão `sistema-caixa/` (ou nome
   que fizer mais sentido pro Edvam), sem tocar nas pastas já existentes (`assets/`, `conteudos/`,
   `docs/`, `.github/`, `README.md`, `CONTRIBUINDO.md` são do pipeline de conteúdo, não mexer).
3. **Git**: inicializar (não existe ainda), primeiro commit limpo, adicionar o remoto
   `labonchain/JSGRAFICA` já existente, dar `pull` antes de qualquer push (o repo tem commits
   recentes de outro processo, nunca sobrescrever), empurrar a pasta nova sem afetar o resto.
4. Confirmar visualmente no GitHub (via `gh` ou navegador) que o push chegou certo e que nenhum
   arquivo de segredo real subiu (conferir a lista de arquivos do commit antes E depois de subir).

5. **Item pequeno adicional**: o site institucional (landing page, raiz do workspace,
   `index.html` + `imagens/`) também nunca teve git inicializado e não tem domínio de time
   definido. Como é puramente estático (sem backend, sem `.env`, sem segredo nenhum, todos os CTA
   só linkam pro WhatsApp), inclua ele também nesta demanda, numa pasta separada, sugestão
   `site-institucional/`. Auditoria de segredo aqui é rápida (é só HTML/CSS/imagem).
6. **Decisão confirmada do Edvam (30/08)**: a pasta `pm/` (demandas, histórico, conhecimento,
   equipe) **também vai pro repositório público**, de propósito, pra que o GPT do pipeline de
   conteúdo consiga ler o histórico/continuidade do projeto. Isso é diferente de segredo técnico
   (API key/senha/token), é dado de negócio e cliente (nome/telefone em análise de jornada,
   número de faturamento, etc.) que o Edvam decidiu deliberadamente deixar público. **A regra de
   nunca vazar credencial de verdade continua valendo igual**, só o dado de negócio/cliente que
   deixou de ser bloqueio. `pm/backups/*.json` (backups de workflow n8n) merece atenção redobrada
   na auditoria de segredo, já que workflow pode ter credencial embutida em node.

Explicitamente fora de escopo: mexer no que já existe no repo (conteúdo do GPT), decidir estrutura
de monorepo definitiva pros outros projetos (cada um organiza a própria pasta).

## Critérios de aceite
- [ ] `.gitignore` correto, nenhum `.env*` no histórico do git.
- [ ] Varredura de segredo hardcoded feita e documentada no relato (o que foi checado, o que não
      achou).
- [ ] Código no ar em `labonchain/JSGRAFICA/sistema-caixa/` (ou nome escolhido), confirmado via
      `gh repo view`/navegador.
- [ ] Pastas já existentes do repo intactas.

## Riscos e cuidados
Repositório é público e compartilhado com outro processo ativo (GPT de conteúdo commitando em
paralelo). Sempre `pull` antes de `push`, nunca `push --force`. Se encontrar QUALQUER segredo real
já em algum lugar do código durante a auditoria, **não subir enquanto não corrigir**, reportar como
achado urgente antes de continuar.

## Referências
`labonchain/JSGRAFICA` (repo real), demanda 302 (histórico do incidente de segredo exposto),
demanda 329 (correção definitiva de sessão/segredo).

## Relato de execução

**Concluída em 2026-08-31.**

**Abordagem técnica**: em vez de `git init` direto em `caixa-js-grafica` (arriscava reconciliar
históricos não relacionados num repo compartilhado ativo), cloneI `labonchain/JSGRAFICA` num
diretório separado (scratchpad), montei as pastas novas dentro do clone e só então commitei/dei
push a partir dele. Resultado é o mesmo (código no ar em `labonchain/JSGRAFICA`), método mais
seguro pro repo em uso paralelo.

**Auditoria de segredo (antes de qualquer commit)**:
- 🔴 **Achado urgente, reportado ao PM antes de continuar**: chave `service_role` do Supabase
  compartilhado (LabON, `ref: arqkdnexpederquztegn`) em texto puro em 2 arquivos de
  `pm/backups/*.json` (JWT decodificado e confirmado `role: service_role`), e tokens Z-API reais
  (WhatsApp) em texto puro em 27 dos 65 arquivos de `pm/backups/*.json` (capturados em `pinData`
  de execução real fixada no n8n). Decisão do Edvam (via PM): manter `pm/backups/` só localmente,
  nunca no repositório público, adicionar ao `.gitignore` do repositório. A decisão de rotacionar
  a chave `service_role` ficou como item separado, em aberto, não bloqueou esta demanda.
- Varredura de `SECRET`/`_KEY`/`TOKEN`/`PASSWORD`/`service_role` no código de `caixa-js-grafica`
  (`app/`, `lib/`, `components/`): nenhum valor hardcoded, só nomes de variável/campo e referência
  via `process.env` ou coluna de banco.
- Único texto de senha remanescente: a senha antiga do Admin (`075644js2026`) citada em 3 arquivos
  de demanda histórica (030, 329, STATUS.md). Já invalidada de propósito na demanda 329 e já
  documentada como publicamente exposta no `CLAUDE.md` do projeto — tratado como registro
  histórico morto, não como segredo vivo, não removido (mesmo critério do item 6: dado de negócio/
  histórico pode ficar, segredo técnico vivo não).
- `.gitignore` de `caixa-js-grafica` já cobria `.env*`/`node_modules`/`.next`/`.vercel` desde
  antes; confirmado (via `git ls-tree` na árvore enviada) que nenhum `.env`/`.env.local` real
  subiu. `sistema-caixa/.env.local.example` (só placeholder, sem valor real) foi incluído de
  propósito, corrigido num commit pequeno adicional depois de eu notar que o `.gitignore` genérico
  (`.env*`) tinha excluído ele por engano na primeira leva.

**Estrutura escolhida**: `sistema-caixa/` para o `caixa-js-grafica` completo (inclui `pm/` exceto
`pm/backups/`) e `site-institucional/` para o site estático da raiz (`index.html` + `imagens/`,
~156MB, nenhum arquivo isolado passa de 13MB, não bate limite do GitHub). Pastas já existentes do
repo (`assets/`, `conteudos/`, `docs/`, `.github/`, `.tmp/`, `README.md`, `CONTRIBUINDO.md`)
intactas, confirmado via `git status`/`git ls-tree` que nada foi apagado ou sobrescrito.

**Git**: commit único e limpo (657 arquivos), `git pull` antes do push (repo teve commits novos em
paralelo do pipeline de conteúdo, só em `docs/`, merge sem conflito), depois `git push`. Confirmado
no ar via `git ls-tree -r origin/main` (não local): `sistema-caixa/` e `site-institucional/`
presentes, `sistema-caixa/pm/backups/` ausente, nenhum `.env` real presente,
`sistema-caixa/.env.local.example` presente.

**Teste**: só verificação estrutural (lista de arquivos antes/depois de subir, árvore do commit
remoto), não é um teste funcional do app (esta demanda é só versionamento, não muda comportamento
do sistema em produção, nenhum deploy novo necessário).

**Achados fora do escopo**: nenhum além do já reportado (segredo em `pm/backups/`).

**Addendo, 2026-08-31 (fecha o achado de segurança por completo)**: a decisão de rotacionar a
chave `service_role` seguiu em aberto por escolha do Edvam, mas ele confirmou que os 2 arquivos
com a chave e os 27 arquivos com token Z-API real podiam ser apagados do disco local (todos
histórico morto, backups pré-mudança de demandas já concluídas há semanas/meses, nenhum servindo
de referência ativa pra reverter workflow em uso, confirmado um por um antes de apagar). Movi
primeiro pra uma pasta de quarentena fora de `pm/` (passo intermediário reversível), depois o
Edvam confirmou diretamente ("pode apagar isso sim") e apaguei os 29 arquivos de vez. Revarri
`pm/backups/` com os mesmos padrões (`z-api-token` literal, JWT `service_role`) depois de apagar:
zero ocorrência restante. **Esse achado de segurança está fechado, não é mais "decisão consciente
de deixar em aberto"** (só a decisão sobre rotacionar a chave em si segue em aberto, sem urgência,
já que o arquivo que a expunha não existe mais).

**Status final: concluída.**

PRONTO PRA CLEAR
