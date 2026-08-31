# SITE V2 — regras de execução do pacote

1. Ler primeiro o Documento Mestre, o documento operacional SITE V2 e o Protocolo de Handoff ChatGPT → Claude PM no Google Drive.
2. Confirmar que Supabase e Vercel são **as contas corretas da JS Gráfica** antes de executar qualquer passo externo.
3. Não implementar v2C.
4. Não fazer cutover do domínio de produção durante a aplicação/QA deste pacote.
5. `public.jsgrafica_produtos` continua fonte operacional. Não adicionar nela campos de SEO, galeria ou apresentação do site.
6. Estado comercial/lifecycle pertence a PRODUTOS. A camada pública materializa apenas um snapshot rastreável via `status_produto`, `status_produto_fonte` e timestamp.
7. O site público usa apenas `SUPABASE_PUBLISHABLE_KEY`; **nunca** service role.
8. Gate cumulativo de venda pública: produto operacional ativo + `status_produto=ATIVO` + `status_publicacao=PUBLICADO` + modalidade ativa. A migration também exige representação visual aprovada para permitir `PUBLICADO`.
9. Nenhum piloto atualmente `SELECIONADO` pode ser publicado como vendável e nenhum preço-teste pode virar preço público definitivo.
10. Preview deve manter `NEXT_PUBLIC_SITE_STAGE=preview`, bloqueando indexação.
