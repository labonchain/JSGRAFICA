// Verificação real (não presumida) do schema proposto na 354/aplicado na
// 356: coluna canal_whatsapp_id em jsgrafica_agent_config + tabela
// jsgrafica_canal_posts (colunas, RLS, grants). Rodar: npx tsx scripts/verificar-schema-canal-356.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();
const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
const anon = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

async function main() {
  console.log('--- jsgrafica_agent_config.canal_whatsapp_id ---');
  const { data: cfg, error: erroCfg } = await admin
    .from('jsgrafica_agent_config')
    .select('canal_whatsapp_id, ativo')
    .eq('ativo', true)
    .single();
  console.log({ cfg, erroCfg: erroCfg?.message });

  console.log('--- jsgrafica_canal_posts: select vazio (confirma tabela + colunas) ---');
  const { data: linhas, error: erroSelect } = await admin
    .from('jsgrafica_canal_posts')
    .select('id, tipo, texto, image_url, video_url, caption_image, caption_video, status, scheduled_at, published_at, message_id, erro_detalhe, created_by, created_at, updated_at')
    .limit(1);
  console.log({ linhas, erroSelect: erroSelect?.message });

  console.log('--- jsgrafica_canal_posts: insert sintético + leitura + apagar (service_role) ---');
  const { data: inserida, error: erroInsert } = await admin
    .from('jsgrafica_canal_posts')
    .insert({ tipo: 'text', texto: 'TESTE SCHEMA 356 - apagar', scheduled_at: new Date().toISOString() })
    .select()
    .single();
  console.log({ inserida, erroInsert: erroInsert?.message });
  if (inserida?.id) {
    await admin.from('jsgrafica_canal_posts').delete().eq('id', inserida.id);
    console.log('linha sintética apagada, id', inserida.id);
  }

  console.log('--- jsgrafica_canal_posts: leitura via anon (espera permission denied) ---');
  const { data: viaAnon, error: erroAnon } = await anon.from('jsgrafica_canal_posts').select('id').limit(1);
  console.log({ viaAnon, erroAnon: erroAnon?.message, erroCode: erroAnon?.code });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
