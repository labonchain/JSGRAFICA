# QA LOCAL — resultado do pacote v0.3.0

## Objetivo
Validar o que é possível neste ambiente sem tocar nas contas reais de Supabase/Vercel.

## Testes reproduzíveis
```bash
npm install
npm run qa:static
npm run typecheck
npm run build
npm run dev
```
Em outra sessão:
```bash
chromium --headless --disable-gpu --no-sandbox --window-size=1440,1100 --screenshot=qa/screenshots/home-desktop.png http://127.0.0.1:3000/
chromium --headless --disable-gpu --no-sandbox --window-size=390,844 --screenshot=qa/screenshots/home-mobile.png http://127.0.0.1:3000/
chromium --headless --disable-gpu --no-sandbox --window-size=1440,1100 --screenshot=qa/screenshots/produtos-empty.png http://127.0.0.1:3000/produtos
```

## O que o QA local deve provar
- estrutura de arquivos esperada;
- nenhuma string de service role ou v2C operacional no código runtime;
- `.env.example` sem valores reais;
- migrations/rollback presentes;
- gate cumulativo presente no SQL;
- REVOKE restrito às sequences novas;
- baseline legado copiado e hashado;
- TypeScript/build do código;
- Home/mobile e catálogo vazio renderizam sem overflow evidente.

## Limitações deliberadas
Este ambiente **não** aplica migrations na conta real, não configura Storage real, não publica preview Vercel real e não executa QA contra dados reais. Isso pertence ao Claude PM conforme protocolo global.

## Resultado desta geração
- QA estático: 33/33 PASS.
- Sintaxe TS/TSX: 24 arquivos, 0 erros.
- Registry npm: indisponível (`EAI_AGAIN`), portanto build Next completo deve ser repetido pelo Claude PM.
- Screenshots gerados por WeasyPrint + PDF renderer a partir do harness estático, identificados explicitamente como evidência visual local, não como preview real.

## Adendo v0.4.1 — port canônico do storefront

A versão v0.4.1 adiciona duas baterias reproduzíveis sem acesso externo:

```bash
npm run qa:port
```

O comando valida a presença das rotas/recursos portados, o repository canônico, o isolamento da fixture de QA, busca/filtros/ordenação, variantes Couchê, detalhe de Papel Adesivo, WhatsApp contextual, exclusão de itens internos e preservação de `supabase/`/`rollback/`.

Para QA local visual com dados de fixture, usar explicitamente:

```bash
CATALOG_QA_FIXTURE=1 NEXT_PUBLIC_SITE_STAGE=preview npm run dev
```

A fixture é recusada pelo repository quando `NEXT_PUBLIC_SITE_STAGE=production`. Em ambiente real de integração, manter `CATALOG_QA_FIXTURE=0` e configurar somente as variáveis públicas previstas no runbook; não existe fallback silencioso para fixture.

Resultados e limitações do ambiente desta entrega estão em `qa/RESULTADOS-v0.4.1.md`.
