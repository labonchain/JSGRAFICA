# 357 - Subir o código do caixa-js-grafica pro GitHub (repo público compartilhado)

Status: aprovada
Criada em: 2026-08-30
Aprovada em: 2026-08-30
Concluída em: (vazio até conclusão)
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
(preenchido pelo 03-APP ao concluir)
