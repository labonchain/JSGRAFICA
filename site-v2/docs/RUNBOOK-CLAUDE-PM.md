# RUNBOOK — aplicação do SITE V2 v2A pelo Claude PM

Este runbook é autocontido. **Não executar em contas diferentes das contas oficiais da JS Gráfica. Não fazer cutover. Não implementar v2C.**

## 0. Pré-requisitos e confirmação de conta
1. Ler: Documento Mestre, documento operacional SITE V2, Protocolo de Handoff ChatGPT → Claude PM e `docs/MANIFESTO.md`.
2. Confirmar organização/projeto Vercel corretos da JS Gráfica.
3. Confirmar projeto Supabase correto da JS Gráfica.
4. Fazer snapshot/backup adequado do banco antes de migration.
5. Confirmar que `public.jsgrafica_produtos` existe e possui ao menos `id`, `nome`, `categoria`, `ativo`.
6. Não preencher preço/licença/status comercial por conta própria.

**STOP:** se a conta/projeto estiverem ambíguos, não aplicar nada.

## 1. Preparar código
1. Descompactar o snapshot canônico `site-v2-v0.4.1.zip`.
2. Conferir `MANIFEST-SHA256.txt`.
3. Copiar `.env.example` para `.env.local` apenas no ambiente seguro do executor.
4. Preencher `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` da conta correta.
5. Manter `NEXT_PUBLIC_SITE_STAGE=preview`.
6. Definir `NEXT_PUBLIC_SITE_URL` com URL de preview depois que ela existir.
7. Manter `CATALOG_QA_FIXTURE=0`/ausente no ambiente real; a fixture é somente para QA local.

## 2. Aplicar migration 001
Aplicar `supabase/migrations/001_catalogo_publico.sql` em preview/staging/branch apropriada quando disponível.

A migration deve:
- abortar se `jsgrafica_produtos`/colunas mínimas não existirem;
- herdar dinamicamente o tipo real de `jsgrafica_produtos.id`;
- criar publicação/modalidades/assets;
- habilitar RLS nas 3 tabelas novas;
- não conceder acesso direto a `anon/authenticated`;
- criar view privada + RPCs de leitura;
- não alterar RLS/grants da tabela operacional antiga.

Depois, configurar URL pública usada pelo read-model:
```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://PROJECT.supabase.co';
```
Use a URL real do projeto correto. Não é secret, mas não deve ser inventada.

Reconectar/sessão nova se necessário para a configuração de database ser observada.

## 3. Aplicar migration 002 — Storage
Aplicar `supabase/migrations/002_catalogo_storage.sql`.
Ler `docs/STORAGE.md` antes de subir qualquer objeto.

## 4. QA SQL obrigatório
Executar `supabase/qa/003_verificacao_pos_migration.sql`.
Critérios:
- 3 tabelas novas presentes;
- view privada presente;
- 2 RPCs presentes;
- RLS `true` nas 3 tabelas;
- zero grants diretos de tabela para `anon/authenticated`;
- EXECUTE apenas nas RPCs previstas;
- bucket `catalogo-publico` presente;
- `jsgrafica_catalogo_listar(NULL,NULL,NULL)` retorna `[]` antes de existir SKU elegível.

**STOP:** qualquer resultado diferente deve ser investigado antes do deploy do site.

## 5. Smoke test negativo dos gates
Sem usar os preços-piloto como preço real, criar somente se necessário um registro técnico de RASCUNHO ligado a um produto autorizado para teste. Validar que:
- não é possível `PUBLICADO` com `status_produto != ATIVO`;
- não é possível `PUBLICADO` sem produto operacional ativo;
- não é possível `PUBLICADO` sem modalidade ativa;
- não é possível `PUBLICADO` sem asset aprovado/publicável;
- `FIXO`/`A_PARTIR_DE` rejeitam preço nulo;
- `SOB_CONSULTA` aceita preço nulo.

Depois remover os registros técnicos. Não alterar lifecycle oficial de um SKU apenas para fazer o teste.

## 6. Build do site
```bash
npm install
npm run qa:static
npm run qa:port
npm run typecheck
npm run build
```
Todos devem passar.

## 7. Preview Vercel
1. Criar projeto/preview isolado a partir desta pasta/repositório.
2. Configurar as variáveis do `.env.example` com valores das contas corretas.
3. Manter `NEXT_PUBLIC_SITE_STAGE=preview`.
4. Não associar domínio de produção.
5. Registrar URL de preview no Drive.

## 8. QA de navegador no preview
Testar desktop e mobile:
- Home, Serviços, Produtos, Produtos e Serviços, Impressões, Couchê, Fotos, Acabamentos, Encadernação, Personalizados, Serviços Digitais, detalhe Papel Adesivo e Contato;
- menu, breadcrumbs, teclado e foco visível;
- 404;
- estado vazio quando nenhum SKU é elegível;
- ausência dos pilotos ainda `SELECIONADO`;
- `robots.txt` com `Disallow: /` no preview;
- canonical/metadata/sitemap;
- WhatsApp contextual por página e, quando houver produto real elegível, por SKU/modalidade;
- modalidades FIXO, A_PARTIR_DE e SOB_CONSULTA somente com dados aprovados;
- imagens com `alt` e sem layout shift evidente;
- Lighthouse/performance baseline e ausência de erro crítico de console.

## 9. Critérios de sucesso do gate de execução
- migrations aplicadas sem tocar `jsgrafica_produtos` fora de leitura/FK;
- RLS/grants/RPC confirmados;
- Storage contém apenas derivados web aprovados;
- preview acessível e não indexável;
- site funciona sem produto vendável;
- nenhum v2C presente;
- produção atual não foi alterada;
- rollback tecnicamente possível e documentado.

## 10. Critérios de parada
Parar imediatamente se:
- conta Supabase/Vercel não for inequivocamente a oficial;
- preflight SQL falhar;
- grants diretos aparecerem para `anon/authenticated` nas tabelas novas;
- qualquer piloto `SELECIONADO` aparecer vendável;
- qualquer preço-teste aparecer como definitivo sem handoff formal de PRODUTOS;
- preview tentar usar service role;
- configuração exigir mudança do domínio de produção.

## 11. Rollback de banco/Storage
Se a aplicação ainda não recebeu dados reais:
1. remover objetos de `catalogo-publico` ou confirmar que está vazio;
2. executar `supabase/rollback/002_catalogo_storage_rollback.sql`;
3. executar `supabase/rollback/001_catalogo_publico_rollback.sql`;
4. rerodar consultas de existência para garantir que só os objetos do pacote sumiram.

Se já houver objetos/dados reais, **não executar rollback destrutivo sem backup/export e autorização**. O rollback 002 aborta se o bucket tiver objetos.

## 12. Rollback do preview
- desativar/remover apenas o deployment de preview/projeto isolado;
- não tocar no projeto/domínio da landing atual;
- o baseline legado está incluído em `rollback/legacy-production/` e seus hashes em `qa/baseline-hashes.json`.

## 13. Registro obrigatório no Drive após execução
Registrar: projeto/ambiente, data, migrations executadas, resultados SQL, URL preview, build, QA browser, screenshots, desvios, decisão de seguir/parar e rollback testado/possível. Cutover só entra em discussão no gate seguinte do PM.
