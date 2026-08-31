# RESULTADOS DE QA LOCAL — v0.3.0

Data: 2026-08-21

## Executado e aprovado
- `npm run qa:static`: **33/33 PASS**.
- Parsing/transpilação sintática TypeScript via compilador TypeScript 5.8.3: **24 arquivos TS/TSX, 0 erros sintáticos**.
- Hash SHA-256 do `index.html` legado confere com a cópia de rollback.
- Hash SHA-256 do `vercel.json` legado confere com a cópia de rollback.
- Screenshots do harness visual local gerados: Home desktop, Home mobile e Produtos em estado vazio.

## Não executado neste ambiente
- `npm install`, `npm run typecheck` completo e `npm run build`: registry npm indisponível neste runtime (`getaddrinfo EAI_AGAIN registry.npmjs.org`).
- Aplicação SQL em Supabase real: proibida pelo protocolo de handoff.
- Storage real: proibido neste ambiente.
- Preview Vercel real: proibido neste ambiente.
- QA real de browser contra o build Next: pertence ao gate de execução do Claude PM.

## Natureza dos screenshots
As imagens em `qa/screenshots/` são renderizações do **harness estático** (`qa/static-preview/`) que replica os componentes/estilos essenciais para verificar hierarquia visual e estado vazio sem depender de instalação npm. Elas não são evidência de build Next ou preview Vercel e não devem ser tratadas como tal.

## Resultado
Pacote apto para handoff e aplicação/QA real pelo Claude PM, condicionado aos STOP criteria do runbook.
