import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();
async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));
  const { data, error } = await admin.from('labon_status_queue').select('*').limit(3);
  console.log('erro:', error);
  console.log(JSON.stringify(data, null, 2));

  const { data: d2, error: e2 } = await admin.from('jsgrafica_status_visualizacoes').select('*').limit(3);
  console.log('erro2:', e2);
  console.log(JSON.stringify(d2, null, 2));
}
main();
