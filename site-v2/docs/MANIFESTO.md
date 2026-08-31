# MANIFESTO — SITE V2 v0.4.1 — CANONICALIZAÇÃO FRONT-END

**Versão:** 0.4.1
**Data:** 2026-08-22
**Base técnica canônica:** `c777a1f2bb25cd749e8b767b884c5b9c8a2dd8ee`
**Fonte visual/UX:** handoff v0.4.0, tratado somente como referência reproduzível de interface
**Objetivo:** unir a base técnica aprovada do v0.3.0 à UI aprovada do v0.4.0 em uma única linhagem Git verificável.

## Escopo incluído

- preservação integral da arquitetura técnica do v0.3.0;
- Hub Produtos e Serviços;
- Impressões;
- Papel Couchê com seletor de formato/gramatura/frente-verso;
- Fotos;
- Acabamentos;
- Encadernação;
- Personalizados / Comunicação Visual;
- Serviços Digitais / Documentos;
- detalhe Impressão Papel Adesivo A4 192g;
- página geral Serviços revisada;
- busca, filtros e ordenação;
- WhatsApp contextual;
- responsividade mobile/desktop;
- repository/adapter compatível com as RPCs já aprovadas;
- fixture de QA isolada e opt-in, sem fallback de produção.

## Base técnica preservada

Nenhuma migration existente foi modificada. Permanecem as mesmas regras do v0.3.0 para:

- `jsgrafica_catalogo_publicacao`, modalidades e assets;
- read-model privado;
- RPCs `jsgrafica_catalogo_listar` e `jsgrafica_catalogo_por_slug`;
- RLS/grants;
- Storage público apenas para derivados web aprovados;
- menor privilégio;
- proibição de `service_role` no front-end;
- gates de publicação;
- rollback da landing legada.

## Dados e fixture

`catalog-data.ts` do v0.4.0 **não foi transportado como fonte de produção**.

A implementação canônica usa `src/lib/catalog/repository.ts`. Por padrão, o repository chama a camada RPC do v0.3.0. Para QA local sem Supabase, `CATALOG_QA_FIXTURE=1` carrega `qa/fixtures/storefront-v040.json`, um recorte gerado mecanicamente da referência v0.4.0. A fixture é recusada em `NEXT_PUBLIC_SITE_STAGE=production` e não é fallback de erro da RPC.

Itens internos como `Recebimento de empréstimo` e `Vendas não registradas` são excluídos do adapter público e também não existem na fixture.

## Infraestrutura da linhagem Sites não portada

Não foram transportados `.openai/`, `build/`, `db/`, `drizzle/`, `worker/`, `vite.config.ts` nem outras dependências específicas da linhagem `d0dadc0...`.

## Exclusões

- Supabase/Vercel reais;
- novas migrations/schema;
- Commerce Core;
- checkout/pagamento;
- entitlement/arquivo pago;
- autenticação/admin;
- secrets;
- ativação de SKU;
- definição de preço comercial;
- cutover.

## QA exigido

Consulte `qa/RESULTADOS-v0.4.1.md`. O pacote diferencia explicitamente testes executados de testes bloqueados por dependências externas/registry.

## Execução externa

Antes de ligar a fonte real, ler `docs/INTEGRACAO-CATALOGO-RPCS-v0.4.1.md`. O executor deve manter `CATALOG_QA_FIXTURE=0`, preencher somente as variáveis públicas previstas, executar typecheck/build no ambiente com dependências instaladas e validar as páginas em preview/staging antes de qualquer discussão de produção.
