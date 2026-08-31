# v0.4.1 — Integração da UI canônica com as RPCs do catálogo

## Princípio

A UI v0.4.1 não possui catálogo operacional próprio. O caminho real continua sendo:

`read-model privado → RPC pública de leitura → src/lib/catalog/data.ts → repository/adapter → UI`

RPCs já existentes na base canônica:

- `jsgrafica_catalogo_listar`
- `jsgrafica_catalogo_por_slug`

Nenhuma migration nova é necessária para este port de UI.

## Arquivos relevantes

- `src/lib/catalog/data.ts`: transporte HTTP server-side para as RPCs;
- `src/lib/catalog/repository.ts`: escolhe RPC por padrão e fixture somente quando explicitamente ativada para QA;
- `src/lib/catalog/storefront.ts`: adapter puro do objeto `CatalogProduct` para a taxonomia pública da UI;
- `src/lib/catalog/storefront-types.ts`: contrato de apresentação;
- `qa/fixtures/storefront-v040.json`: fixture de QA, não produção.

## Procedimento no ambiente correto

1. Manter `CATALOG_QA_FIXTURE=0` ou ausente.
2. Configurar `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` da conta oficial.
3. Confirmar que as RPCs retornam o contrato documentado em `src/lib/catalog/types.ts`.
4. Executar `npm run typecheck` e `npm run build`.
5. Abrir `/produtos-servicos` e confirmar que os itens vêm da RPC, sem a faixa visual `Dados de QA`.
6. Validar Impressões, Couchê, Fotos, Acabamentos, Encadernação, Personalizados, Serviços Digitais e detalhe de Papel Adesivo.
7. Confirmar que falha da RPC gera estado público de erro/indisponibilidade; não deve carregar fixture automaticamente.
8. Confirmar que retorno vazio gera estado vazio seguro.
9. Confirmar ausência dos itens internos e de qualquer registro não classificável/publicável.
10. Validar WhatsApp contextual com código/nome retornados pela fonte real.

## Mapeamento da taxonomia pública

A UI não expõe as categorias operacionais cruas. `storefront.ts` classifica apenas ofertas reconhecidas nos grupos públicos aprovados. Um item não reconhecido não entra silenciosamente no Hub; deve ser auditado antes de receber regra de apresentação.

O mesmo item pode ter contexto de navegação adicional sem duplicar o registro operacional. Exemplo: `Papel Fotográfico` pode ser encontrado no contexto de Impressões e Fotos.

## Campos a confirmar na fonte real

- `sku`, `slug`, `nome`, `categoria`;
- modalidade ativa e modo de preço;
- preço, quando permitido pelo modo de preço;
- `resumo_curto`;
- `especificacao_fisica` para formato/gramatura/frente-verso/corte;
- flags/gates já aplicados pelo read-model;
- assets públicos quando disponíveis.

Se um campo necessário não existir, registrar o gap. Não alterar schema como parte desta integração de UI.

## Segurança

- leitura server-side apenas;
- publishable/anon key conforme arquitetura aprovada;
- nunca usar `service_role` no front-end;
- nenhuma escrita de catálogo;
- nenhuma credencial real no pacote/Drive;
- arquivos pagos/Commerce Core permanecem fora deste gate.
