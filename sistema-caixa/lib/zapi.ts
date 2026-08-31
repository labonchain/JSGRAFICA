import { supabaseAdmin } from './supabase-admin';

interface ZAPIConfig {
  instanceId: string;
  token: string;
  clientToken: string;
  connectedPhone: string;
}

let configCache: ZAPIConfig | null = null;
let cacheTtl = 0;

async function getConfig(): Promise<ZAPIConfig> {
  if (configCache && Date.now() < cacheTtl) return configCache;
  // Usa o cliente admin (service_role) — jsgrafica_agent_config guarda o
  // token da Z-API, tem RLS ativa sem política pra anon (correto pra
  // segurança, ver demanda 025), então a chave anônima nunca conseguiria
  // ler essa linha mesmo com ativo=true. Este módulo só roda server-side
  // (rotas de API), nunca é importado por componente 'use client'.
  const { data } = await supabaseAdmin
    .from('jsgrafica_agent_config')
    .select('instance_id, token, client_token, connected_phone')
    .eq('ativo', true)
    .single();
  if (!data) throw new Error('Configuração Z-API não encontrada');
  configCache = {
    instanceId:    data.instance_id,
    token:         data.token,
    clientToken:   data.client_token,
    connectedPhone: data.connected_phone,
  };
  cacheTtl = Date.now() + 60_000; // 1 min
  return configCache;
}

function baseUrl(cfg: ZAPIConfig) {
  return `https://api.z-api.io/instances/${cfg.instanceId}/token/${cfg.token}`;
}

export async function zapiGet(path: string) {
  const cfg = await getConfig();
  const res = await fetch(`${baseUrl(cfg)}${path}`, {
    headers: { 'client-token': cfg.clientToken },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Z-API ${path}: ${res.status}`);
  return res.json();
}

export async function zapiPost(path: string, body: unknown) {
  const cfg = await getConfig();
  const res = await fetch(`${baseUrl(cfg)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client-token': cfg.clientToken,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Z-API ${path}: ${res.status} ${err}`);
  }
  return res.json();
}

export async function enviarMensagem(phone: string, message: string) {
  return zapiPost('/send-text', { phone, message });
}

// Demanda 191: apaga uma mensagem ENVIADA pela própria conta, pra todos
// (some do WhatsApp do cliente também). `owner: true` fixo — este módulo só
// expõe apagar o que a equipe mandou (apagar mensagem recebida é possível na
// Z-API, mas ficou fora de escopo por decisão da demanda). O WhatsApp tem
// janela de tempo pra "apagar pra todos" — quando estoura, a Z-API recusa e
// o erro sobe com o corpo da resposta pra rota traduzir pro atendente.
export async function apagarMensagem(phone: string, messageId: string) {
  const cfg = await getConfig();
  const params = new URLSearchParams({ phone, messageId, owner: 'true' });
  const res = await fetch(`${baseUrl(cfg)}/messages?${params.toString()}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'client-token': cfg.clientToken,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Z-API /messages (delete): ${res.status} ${err}`);
  }
  // 204/200 — corpo vazio ou {} nos dois casos.
  return true;
}

export async function enviarImagem(phone: string, imageUrl: string, caption?: string) {
  return zapiPost('/send-image', { phone, image: imageUrl, caption: caption || '' });
}

export async function enviarDocumento(phone: string, documentUrl: string, fileName: string, caption?: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
  return zapiPost(`/send-document/${ext}`, { phone, document: documentUrl, fileName, caption: caption || '' });
}

export async function enviarVideo(phone: string, videoUrl: string, caption?: string) {
  return zapiPost('/send-video', { phone, video: videoUrl, caption: caption || '' });
}

export async function getStatus() {
  return zapiGet('/status');
}

export async function getQRCode() {
  return zapiGet('/qr-code/image');
}

// ─── Canal do WhatsApp / Newsletter (demanda 354) ──────────────
// Postar conteúdo no canal reusa enviarMensagem/enviarImagem/enviarVideo
// acima direto (mesmos endpoints de envio normal, `phone` = id do canal,
// confirmado real na demanda 352). As funções abaixo são só de GESTÃO do
// canal (nome/descrição/foto/seguidores/admin/exclusão), endpoints próprios
// da seção newsletter da Z-API (`pm/conhecimento/guia-canal-whatsapp-automacao.md`).

// `follow-newsletter`/`unfollow-newsletter`/`mute-newsletter`/`unmute-newsletter`
// (documentados como PUT) ficam sem função aqui de propósito — "seguir
// outros canais" é hipótese não confirmada, fora do escopo da 354 (ver
// pm/demandas/354-*.md). Se um dia entrar em escopo, adicionar um helper
// `zapiPut` seguindo o mesmo formato de `zapiPost` acima.

export async function criarCanal(name: string, description?: string) {
  return zapiPost('/create-newsletter', { name, description: description || '' });
}

// Achado real (354, teste de verdade contra o canal real): os endpoints
// `update-newsletter-*` NÃO usam `phone` no corpo (diferente do
// `?phone=` da metadata, e diferente de enviarMensagem/enviarImagem —
// aquele é pra endpoint de ENVIO, este aqui é gestão de recurso por `id`).
// Confirmado com erro real da Z-API antes da correção: `update-newsletter-
// name` com `phone` devolvia 400 "Newsletter id is empty". Campo certo:
// `id`, confirmado contra a doc oficial depois do erro (não só suposição).
export async function atualizarFotoCanal(canalId: string, pictureUrl: string) {
  return zapiPost('/update-newsletter-picture', { id: canalId, pictureUrl });
}

export async function atualizarNomeCanal(canalId: string, name: string) {
  return zapiPost('/update-newsletter-name', { id: canalId, name });
}

export async function atualizarDescricaoCanal(canalId: string, description: string) {
  return zapiPost('/update-newsletter-description', { id: canalId, description });
}

export interface MetadataCanal {
  id?: string;
  name?: string;
  description?: string;
  picture?: string | null;
  state?: string;
  inviteLink?: string;
  viewMetadata?: { mute?: string; role?: string };
}

// `GET .../newsletter?phone={id}` — path documentado (`newsletter-metadata`)
// está errado, achado real da 352, usar sempre este. Achado novo (354,
// teste real): a resposta vem como ARRAY (mesmo passando 1 `phone` só),
// provavelmente o mesmo endpoint de listagem genérica filtrado por `phone`
// — desempacota aqui pra quem chama nunca precisar saber disso.
export async function metadataCanal(canalId: string): Promise<MetadataCanal> {
  const resposta = await zapiGet(`/newsletter?phone=${encodeURIComponent(canalId)}`);
  const item = Array.isArray(resposta) ? resposta[0] : resposta;
  if (!item) throw new Error('Canal não encontrado (resposta vazia da Z-API)');
  return item;
}

// Achado (354, teste real, reconferido 2x): 8 variações plausíveis de path
// testadas em 2026-08-29 (`/newsletter-subscribers`, `/newsletter/subscribers`,
// `/newsletter/{id}/subscribers`, os 3 mesmos trocando "subscribers" por
// "followers", `/newsletter-subscribers/{id}` e `/newsletter-subscribers-count`),
// todas devolvem "NOT_FOUND: Unable to find matching target resource method"
// (erro de ROTEAMENTO, não de dado vazio). Reconferido de propósito depois
// do Edvam confirmar que já segue o canal (>=1 seguidor real) pra descartar
// a hipótese de "endpoint só falha com 0 seguidores" — mesmo resultado, e a
// metadata (`GET .../newsletter?phone=`) também não traz nenhum campo de
// contagem, mesmo com seguidor real. Nem a documentação pública nem o
// índice `llms.txt` da Z-API bateram com a API real (mesmo padrão de
// divergência já visto nesta integração, ver guia-canal-whatsapp-automacao.md).
// Conclusão: não é bug de path/campo como os outros 2 achados desta
// demanda, parece ser recurso genuinamente indisponível nesta conta/plano —
// quem chama já trata a falha graciosamente (app/api/marketing/canal/config/
// route.ts não derruba a tela se isso falhar). Contagem de seguidores não é
// critério de aceite da 354, não bloqueia o resto.
export async function seguidoresCanal(canalId: string) {
  return zapiGet(`/newsletter-subscribers?phone=${encodeURIComponent(canalId)}`);
}

// Destrutivo e permanente — nunca chamar sem confirmação explícita muito
// clara na UI (mesmo cuidado documentado no mockup da 353). Achado (354):
// não é DELETE com `?phone=` como a doc de referência da 352 sugeria — é
// POST com `{id}` no corpo (mesmo padrão dos update-newsletter-* acima,
// confirmado contra a doc oficial depois do achado do erro real de nome).
// NUNCA testado de verdade (destrutivo demais pra arriscar no canal real) —
// se um dia precisar validar, só contra canal descartável.
export async function excluirCanal(canalId: string) {
  return zapiPost('/delete-newsletter', { id: canalId });
}

// Administração (354): sem endpoint documentado de "convidar admin" — só
// aceitar/remover/anular convite e transferir propriedade. Convite em si
// parece só existir pelo próprio app do WhatsApp, não pela API (achado,
// registrado no relato da demanda, não presumido como omissão de código).
// NUNCA testadas de verdade (sem admin/convite real pra testar contra) — a
// doc oficial destas 3 diverge até entre si sobre o nome do campo do canal
// (`id` sólido nos update-newsletter-*, mas a página de remove-admin cita
// `newsletterId`), por isso ficam com `id` por consistência com o resto do
// arquivo, mas marcadas explicitamente como não confirmadas.
export async function removerAdminCanal(canalId: string, adminPhone: string) {
  return zapiPost('/newsletter-remove-admin', { id: canalId, phone: adminPhone });
}

export async function anularConviteAdminCanal(canalId: string, adminPhone: string) {
  return zapiPost('/revoke-newsletter-admin-invite', { id: canalId, phone: adminPhone });
}

export async function transferirPropriedadeCanal(canalId: string, novoDonoPhone: string) {
  return zapiPost('/transfer-newsletter-ownership', { id: canalId, phone: novoDonoPhone });
}
