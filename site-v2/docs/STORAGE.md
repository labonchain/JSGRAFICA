# Storage — `catalogo-publico`

## Finalidade
Guardar **somente derivados destinados à web e aprovados para publicação**: capas, mockups e imagens de galeria.

## Nunca colocar neste bucket
- arquivo-mestre/editável;
- arquivo de produção/impressão;
- material bruto enviado pelo cliente;
- documentos internos;
- exports que contenham dados pessoais não destinados à publicação.

## Criação
A migration `supabase/migrations/002_catalogo_storage.sql` cria/ajusta:
- bucket: `catalogo-publico`;
- público: `true`;
- limite por arquivo: 10 MB;
- MIME: JPEG, PNG, WebP e AVIF.

## Convenção de caminho
`SKU/versao/arquivo.ext`

Exemplo estrutural **sem afirmar que o SKU está liberado**:
`NEG-KIT-001/v0.1/capa.webp`

## Política esperada
- leitura: URL pública apenas para objetos que o executor colocou no bucket;
- escrita/alteração/exclusão: **não liberar para `anon` nem `authenticated` pelo site**;
- upload é ação administrativa do executor autorizado na conta real.

## Antes de marcar um asset como `aprovado=true` e `publicavel=true`
1. confirmar que o arquivo é um derivado web aprovado por PRODUTOS;
2. confirmar origem/direitos e ausência de material de cliente indevido;
3. registrar `alt_text` significativo;
4. preencher dimensão quando conhecida;
5. garantir vínculo à versão aprovada do produto.
