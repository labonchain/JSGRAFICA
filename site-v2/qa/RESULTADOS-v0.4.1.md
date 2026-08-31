# RESULTADOS DE QA — SITE V2 v0.4.1

Data: 2026-08-22
Base técnica: `c777a1f2bb25cd749e8b767b884c5b9c8a2dd8ee`
Escopo: port canônico da UI/UX aprovada do v0.4.0, sem alteração de schema, Supabase real, Vercel real, Commerce Core, pagamento, checkout, entitlement ou admin.

## Resultado executado neste ambiente

### 1. QA estático canônico

Comando:

```bash
npm run qa:static
```

Resultado: **33/33 checks aprovados**, exit `0`.

Inclui preservação das migrations/RLS/RPCs, ausência de `service_role`, robots de preview e hashes do baseline legado.

### 2. QA estático do port v0.4.1

Comando:

```bash
npm run qa:port
```

Primeira bateria: **33/33 checks aprovados**.
Segunda bateria funcional da fixture: **12/12 checks aprovados**.
Exit do comando: `0`.

Foram verificados em fonte/fixture isolada:

- as 10 rotas portadas;
- repository `server-only` e RPCs `jsgrafica_catalogo_listar` / `jsgrafica_catalogo_por_slug` preservadas;
- fixture somente por opt-in e recusada em `production`;
- ausência de fallback silencioso para fixture;
- busca, filtro e ordenação;
- 12 variantes de Papel Couchê;
- A3 / 300g / frente e verso resolve `prod-060`, R$ 11,50 na fixture de QA;
- detalhe de Papel Adesivo A4 192g com `prod-011` sem recorte e `prod-056` com recorte;
- WhatsApp contextual usando helper canônico;
- cinco faixas de encadernação, sete opções de fotos, dez serviços digitais/documentos e doze itens de personalizados no recorte de QA;
- ausência de `Recebimento de empréstimo` e `Vendas não registradas`;
- `.openai/`, `build/`, `db/`, `drizzle/`, `worker/` e `vite.config.ts` não foram portados;
- nenhum diff em `supabase/` ou `rollback/`.

A fixture contém 78 itens do recorte aprovado do v0.4.0 e é usada exclusivamente para QA local. Ela não é cópia dos 112 itens operacionais e não é fonte de produção.

### 3. Validação sintática TypeScript

Foi executado `typescript.transpileModule` com o TypeScript global 5.8.3 sobre os arquivos TS/TSX do projeto.

Resultado: **45 arquivos TS/TSX; 0 diagnósticos sintáticos**.

Foi executada também uma checagem auxiliar com stubs locais permissivos para módulos que não puderam ser instalados. Resultado: exit `0`. Esta checagem serve apenas como sanity check de fonte e **não substitui** o `npm run typecheck` real.

### 4. Typecheck real

Comando executado:

```bash
npm run typecheck
```

Resultado: **NÃO APROVADO NESTE AMBIENTE**, exit `2`.

Motivo: as dependências do projeto não estão instaladas. Os primeiros erros são ausência dos módulos/tipos de `next`, `react` e `@types/node`; por consequência aparecem erros JSX derivados e ausência da extensão `RequestInit.next` dos tipos do Next.js.

Não foi tratado como erro funcional confirmado do port, porque o mesmo ambiente não consegue instalar as dependências necessárias para executar o typecheck real.

### 5. Build real

Comando executado:

```bash
npm run build
```

Resultado: **NÃO EXECUTÁVEL NESTE AMBIENTE**, exit `127`.

Saída principal:

```text
sh: 1: next: not found
```

### 6. Instalação de dependências

Comando executado:

```bash
npm install --no-audit --no-fund --fetch-timeout=5000 --fetch-retries=0
```

Resultado: exit `1`.

Erro:

```text
EAI_AGAIN registry.npmjs.org
request to https://registry.npmjs.org/@tailwindcss%2fpostcss failed
```

Portanto este pacote **não declara** `npm install`, typecheck completo ou `next build` como aprovados localmente.

### 7. Diff de integridade

```bash
git diff --exit-code c777a1f2bb25cd749e8b767b884c5b9c8a2dd8ee -- supabase rollback
```

Resultado: exit `0`.

Nenhum arquivo de migration, RLS/RPC/Storage ou baseline de rollback foi alterado.

`git diff --check` é requisito antes do commit final e seu resultado final fica registrado na prova Git do pacote.

## Evidência visual

As imagens em `qa/screenshots-v0.4.1/` são **capturas de harness visual estático**, produzidas a partir dos mesmos estilos `store-*` e da fixture de QA do port. Elas demonstram composição/responsividade esperada, mas **não são screenshots de um Next.js em execução**.

Foram geradas capturas de:

- Hub Produtos e Serviços — mobile e desktop;
- Impressões;
- Papel Couchê;
- Fotos;
- Acabamentos;
- Encadernação;
- Personalizados / Comunicação Visual;
- Serviços Digitais / Documentos;
- detalhe Impressão Papel Adesivo A4 192g;
- Serviços revisada;
- estado vazio;
- estado de erro.

O Chromium headless disponível neste ambiente não completou a captura (timeout, com falhas de DBus). Não foi usada essa tentativa como evidência de navegador.

## Testes obrigatórios do executor em ambiente com dependências disponíveis

Antes de qualquer preview externo, o executor deve repetir:

```bash
npm install
npm run qa:static
npm run qa:port
npm run typecheck
npm run build
```

Depois deve iniciar o site com `CATALOG_QA_FIXTURE=1` somente em QA local/preview controlado e testar em navegador real: abertura de todas as rotas, busca, filtros, ordenação, seletor Couchê, detalhe de Papel Adesivo, WhatsApp contextual, mobile, desktop, estados vazio/erro e ausência de itens internos.

Em ambiente conectado às RPCs reais, definir `CATALOG_QA_FIXTURE=0` e confirmar que erro/ausência de configuração **não** cai silenciosamente na fixture.
