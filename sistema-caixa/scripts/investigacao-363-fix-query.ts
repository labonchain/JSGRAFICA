import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();
async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  const idReal = 'C8A70EFAA40D1E1C86F6';
  const { data, error, count } = await admin.from('jsgrafica_status_visualizacoes')
    .select('*', { count: 'exact' })
    .contains('ids', [idReal]);
  console.log('erro:', error);
  console.log('count:', count, 'data.length:', data?.length);
  console.log(JSON.stringify(data, null, 2));
}
main();
