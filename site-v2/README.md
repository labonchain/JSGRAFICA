# JS Gráfica — Site V2 / v0.4.1

Evolução **canônica** do Site V2 a partir do commit técnico v0.3.0:

`c777a1f2bb25cd749e8b767b884c5b9c8a2dd8ee`

A versão v0.4.1 porta a implementação front-end/UX aprovada no handoff v0.4.0 para a arquitetura canônica Next.js 16 + App Router + TypeScript + Tailwind 4, sem continuar a linhagem Sites `d0dadc0...`.

## O que v0.4.1 adiciona

- Hub `/produtos-servicos`.
- Impressões e subcategorias públicas.
- Seletor de variantes em `/produtos-servicos/impressoes/papel-couche`.
- Fotos.
- Acabamentos e Encadernação.
- Personalizados / Comunicação Visual.
- Serviços Digitais e Documentos.
- Detalhe de Impressão Papel Adesivo A4 192g.
- Página geral de Serviços revisada.
- Busca, filtros e ordenação no catálogo de atendimento.
- WhatsApp contextual por item.
- Layout responsivo alinhado à direção aprovada do v0.4.0.

## O que permanece da base técnica v0.3.0

- Next.js 16 / App Router / TypeScript / Tailwind CSS 4.
- Camada server-side de catálogo.
- RPCs `jsgrafica_catalogo_listar` e `jsgrafica_catalogo_por_slug`.
- Migrations, RLS/grants, read-model privado e Storage aprovados.
- Ausência de `service_role` no front-end.
- SEO técnico, sitemap/robots/canonical/OG.
- Estados vazio/erro/carregamento.
- Baseline e rollback da landing legada.
- Runbook para execução externa nas contas corretas.

## Fonte de dados

Produção/preview real deve usar as RPCs públicas de leitura. A UI nova consome `src/lib/catalog/repository.ts`, que adapta o read-model para a taxonomia pública.

Para QA local sem Supabase existe uma fixture isolada em `qa/fixtures/`, ativada **somente** com:

```bash
CATALOG_QA_FIXTURE=1
NEXT_PUBLIC_SITE_STAGE=preview
```

O repository recusa essa fixture quando `NEXT_PUBLIC_SITE_STAGE=production`. Não existe fallback silencioso para fixture em produção.

## Fora do escopo

Checkout, carrinho, pagamento, Commerce Core, entitlement, entrega automática, admin, autenticação administrativa, secrets, cutover e qualquer alteração em Supabase/Vercel real.

## Desenvolvimento local

```bash
cp .env.example .env.local
npm install
npm run dev
```

## QA

```bash
npm run qa:static
npm run qa:port
npm run typecheck
npm run build
```

Consulte `qa/RESULTADOS-v0.4.1.md`, `docs/INTEGRACAO-CATALOGO-RPCS-v0.4.1.md`, `docs/RUNBOOK-CLAUDE-PM.md` e `docs/MANIFESTO.md`.
