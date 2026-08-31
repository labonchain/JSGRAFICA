# 093 — Enviar anexo (imagem/documento) falha em arquivos reais — limite de payload da Vercel

Status: concluída
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam: admin e PDV não conseguem enviar anexo (imagem, PDF, etc.) pelo Inbox — dá erro. **Causa
raiz confirmada pelo PM, reproduzida com certeza**: o fluxo atual (`app/api/inbox/enviar-midia/
route.ts`) recebe o arquivo inteiro no corpo da requisição, dentro de uma função serverless da
Vercel — que tem limite de **~4,5MB de payload**. Testado direto: arquivo de 3MB passa (mas
demora ~10s, arriscado); arquivo de 8MB (tamanho normal de foto de celular) falha sempre com:
```
HTTP 413 — Request Entity Too Large
FUNCTION_PAYLOAD_TOO_LARGE
```
Isso não é intermitente nem depende do tipo de arquivo (testei PNG, JPG, SVG, PDF, TXT, XLSX
pequenos — todos passam) — é puramente **tamanho**. Como a maioria das fotos reais de celular já
nasce acima de 4,5MB, isso explica o "sempre dá erro" relatado.

## Objetivo
Enviar anexo funciona com arquivos de tamanho real (fotos de celular, PDFs de página inteira),
não só arquivos pequenos de teste.

## Escopo
- Incluído: mudar o fluxo de envio de anexo pra o navegador **subir o arquivo direto pro
  Supabase Storage** (bucket `inbox-media`, já existe e é público), sem o arquivo passar pelo
  corpo de uma função da Vercel — usando o client Supabase do navegador com uma credencial
  apropriada (conferir se dá pra usar a anon key com policy de upload restrita, ou gerar uma
  signed URL de upload a partir de uma rota leve que não recebe o arquivo em si, só autoriza).
  Depois do upload direto, o navegador chama a API só com a **URL resultante** (payload pequeno,
  só texto) pra disparar o envio via Z-API — a lógica de mandar pro Z-API e logar continua igual,
  só muda quem faz o upload do arquivo em si.
- Fora de escopo: mudar o limite de tamanho de arquivo aceito pelo Z-API/WhatsApp em si (isso é
  limite deles, não nosso).

## Critérios de aceite
- [x] Enviar uma foto real de celular (5-10MB) pelo Inbox funciona, sem erro 413
- [x] Enviar um PDF de página inteira (alguns MB) funciona
- [x] Arquivo pequeno continua funcionando normal (sem regressão)
- [x] Testado no admin e no PDV

## Riscos e cuidados
Ao mudar pra upload direto do navegador, garantir que a credencial usada no client-side não
exponha nada sensível (mesmo cuidado de RLS já aplicado no resto do sistema — não usar a
service_role key no navegador, só uma policy de upload restrita com a anon key, ou uma rota que
gera signed URL sem expor credencial nenhuma).

## Referências
`app/api/inbox/enviar-midia/route.ts` (fluxo atual, a mudar). `components/TelaInbox.tsx`
(`enviarMidia()`, chamada do navegador). Bucket `inbox-media` (Supabase Storage, já existe,
público).

## Relato de execução

- **O que foi feito:**
  - Escolhida a abordagem de **signed URL de upload** (a 2ª opção citada na própria demanda), não
    policy pública de INSERT no bucket — nova rota leve `app/api/inbox/upload-url/route.ts`
    (POST, recebe só `{ fileName }`, retorna `{ path, token }` via
    `supabaseAdmin.storage.from('inbox-media').createSignedUploadUrl(path)`). O token já autoriza
    o upload só naquele path específico, mesmo com a chave anônima do navegador — não precisou
    criar nenhuma policy nova de escrita no bucket (ele continua só com leitura pública).
  - `components/TelaInbox.tsx` (`enviarMidia()`): antes de chamar a API, o navegador agora chama
    `/api/inbox/upload-url` (payload pequeno, só o nome do arquivo), recebe o `path`/`token`, e
    sobe o arquivo direto pro Supabase Storage com
    `supabase.storage.from('inbox-media').uploadToSignedUrl(path, token, file)` — o arquivo em si
    nunca passa pelo corpo de uma função da Vercel.
  - `app/api/inbox/enviar-midia/route.ts` reescrita: deixou de receber `FormData` com o arquivo,
    passou a receber JSON pequeno (`{ phone, operador, caption, path, fileName, contentType }`) —
    já chega com o upload feito, só gera a URL pública do `path` e segue exatamente a mesma lógica
    de sempre (dispara Z-API por tipo, loga em `jsgrafica_log_msgs_privadas`, atualiza
    `data_ultimo_contato`). Nada mudou na lógica de envio/log, só quem faz o upload do arquivo.
  - Bucket `inbox-media` conferido antes de mexer: público, limite de 50MB, sem restrição de mime
    — folga de sobra pra foto de celular (5-10MB) e PDF de página inteira.

- **Testes realizados e resultado:**
  - Gerados arquivos de teste reais (não simulados): foto JPEG 6,2MB (3000×4000, mesma ordem de
    grandeza de foto de celular) e PDF de 3 páginas, 5,8MB — ambos acima do limite de ~4,5MB da
    Vercel que causava o 413 antes.
  - Playwright real (não só chamada de API) contra o contato de teste já estabelecido nesta sessão
    ("Edvan Filho", mesmo contato usado nas demandas 045/046/062/066/070) — envio de ponta a
    ponta, Z-API real conectada:
    - **Admin**: foto 6,2MB e PDF 5,8MB, ambos enviados sem erro.
    - **PDV (login como Zu)**: foto 6,2MB enviada sem erro.
    - **Arquivo pequeno (PNG 329 bytes)**: enviado sem erro — sem regressão no caminho já existente.
  - Confirmado via SQL (não só ausência de alerta na tela) que as 4 mensagens foram realmente
    entregues: `status: 'DELIVERED'` em todas, `media_url` apontando pro nosso próprio Supabase
    Storage (`.../storage/v1/object/public/inbox-media/...`), não mais fantasma nem erro
    silencioso.
  - Verificado nos logs do servidor local que `/api/inbox/upload-url` e `/api/inbox/enviar-midia`
    responderam 200 nos 4 casos, nenhum 413/FUNCTION_PAYLOAD_TOO_LARGE.
  - `npx tsc --noEmit` e `npm run build` limpos. Reconfirmado em produção via curl:
    `/api/inbox/upload-url` responde com `path`/`token` válidos.

- **Achados fora do escopo:**
  - Nenhum achado novo fora do escopo desta demanda — a mudança ficou isolada no fluxo de envio de
    mídia (2 rotas + 1 função do componente), sem tocar em recebimento de mídia (que já tinha sido
    corrigido antes na demanda 034) nem em nenhuma outra tela.

- **Status final:** concluída e em produção (`dpl_FVYLtvmpKwnzqNEL6weGRpvVeMuD`,
  https://admin.jsgrafica.site e https://pdv.jsgrafica.site).
