// Sonda pontual (demanda 354): sobe a foto de perfil já aprovada do canal
// (gerada na sessão anterior, ver pm/demandas/353-*) pro storage público do
// app, só pra ter uma URL real de teste do endpoint update-newsletter-picture.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();
const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

const CAMINHO_FOTO = 'C:/Users/edvam/AppData/Local/Temp/claude/c--Users-edvam-OneDrive-Documentos-Claude-Projects-JS-GRAFICA/67d7687d-7216-42fe-b0d2-8f86261dec21/scratchpad/avatar-canal-whatsapp/foto-perfil-canal-js-grafica.png';

async function main() {
  const bytes = readFileSync(CAMINHO_FOTO);
  const path = `canal-teste/foto-perfil-canal-${Date.now()}.png`;
  const { error } = await admin.storage.from('inbox-media').upload(path, bytes, { contentType: 'image/png' });
  if (error) throw error;
  const { data } = admin.storage.from('inbox-media').getPublicUrl(path);
  console.log(data.publicUrl);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
