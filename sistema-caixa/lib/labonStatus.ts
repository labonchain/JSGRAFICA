// Ponte pro webhook compartilhado do LabOnchain (LABON_DASHBOARD_STATUS,
// n8n workflow 2Kpnbf61dtsf1zmO), demanda 310. Nunca importar este arquivo
// de um componente "use client": assina o JWT com SUPABASE_JWT_SECRET, que
// autoriza escrita/leitura em labon_status_queue de QUALQUER cliente do
// LabOnchain (RLS de jsgrafica_agent_config exige a claim `tutor_phone`).
//
// Contrato do webhook confirmado direto na definição real do workflow
// (2026-08-19, não por suposição): body {agent_slug, acao, id?, tipo_status?,
// texto_status?, image_url?, video_url?, caption_image?, caption_video?,
// scheduled_at?}, header Authorization: Bearer <jwt>. `Checar Tutor` faz
// GET em {agent_slug}_agent_config com esse Bearer + apikey anon. O
// PostgREST valida a assinatura HS256 e usa a claim `role` pra decidir o
// role do Postgres da sessão; a RLS (`tutor_phone = auth.jwt()->>'tutor_phone'`)
// só libera a linha se a claim `tutor_phone` bater com a coluna.

import { createHmac } from 'crypto';
import { supabaseAdmin } from './supabase-admin';

const N8N_WEBHOOK_URL = 'https://n8n.labonchain.xyz/webhook/dashboard-status';
const AGENT_SLUG = 'jsgrafica';
const JWT_TTL_SEGUNDOS = 60; // só precisa sobreviver a 1 chamada HTTP

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function assinarJwtTutor(tutorPhone: string): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('SUPABASE_JWT_SECRET não configurado');

  const agora = Math.floor(Date.now() / 1000);
  const headerB64 = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64url(JSON.stringify({
    role: 'authenticated',
    tutor_phone: tutorPhone,
    iat: agora,
    exp: agora + JWT_TTL_SEGUNDOS,
  }));
  const semAssinatura = `${headerB64}.${payloadB64}`;
  const assinatura = base64url(createHmac('sha256', secret).update(semAssinatura).digest());
  return `${semAssinatura}.${assinatura}`;
}

export type TipoStatus = 'text' | 'image' | 'video';
export type AcaoStatus = 'criar' | 'listar' | 'aprovar' | 'editar' | 'cancelar';

export interface PostStatusPayload {
  id?: number;
  tipo_status?: TipoStatus;
  texto_status?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  caption_image?: string | null;
  caption_video?: string | null;
  scheduled_at?: string | null;
}

export interface PostStatus {
  id: number;
  agent_slug: string;
  tipo_status: TipoStatus;
  texto_status: string | null;
  image_url: string | null;
  video_url: string | null;
  caption_image: string | null;
  caption_video: string | null;
  status: 'pending' | 'approved' | 'published' | 'cancelled' | 'error';
  scheduled_at: string;
  published_at: string | null;
  erro_detalhe: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Demanda 345: contador de quantas pessoas viram o Status, só presente
  // (não undefined) em post `published` — anexado depois, fora deste
  // arquivo (que é só a ponte pro webhook compartilhado, sem acesso a
  // `response_zapi`/`jsgrafica_status_visualizacoes`).
  visualizacoes?: number;
}

async function buscarTutorPhone(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_agent_config')
    .select('tutor_phone')
    .limit(1)
    .single();
  if (error || !data?.tutor_phone) {
    throw new Error('tutor_phone não configurado em jsgrafica_agent_config');
  }
  return data.tutor_phone;
}

// Chama as 5 ações do LABON_DASHBOARD_STATUS. O response do webhook sempre
// tem `ok`; em erro de negócio (ex. post_nao_encontrado) o webhook responde
// 200 com ok:false, por isso o erro checa os dois casos.
export async function chamarLabonDashboardStatus(acao: AcaoStatus, payload: PostStatusPayload = {}) {
  const tutorPhone = await buscarTutorPhone();
  const token = assinarJwtTutor(tutorPhone);

  const res = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ agent_slug: AGENT_SLUG, acao, ...payload }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `Falha ao chamar LABON_DASHBOARD_STATUS (HTTP ${res.status})`);
  }
  return json as { ok: true; acao: AcaoStatus; post?: PostStatus; posts?: PostStatus[]; total?: number; id?: number };
}
