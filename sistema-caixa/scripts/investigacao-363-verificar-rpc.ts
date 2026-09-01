// Investigação (demanda 363, parte 2): achado grave — RPC do painel devolve
// 800-1000+ views pra posts com ZERO linhas reais em
// jsgrafica_status_visualizacoes. Testar a RPC isoladamente com casos
// conhecidos (um messageId real com linhas reais, um messageId inventado que
// não deveria existir) pra isolar se o bug é geral ou específico. Só
// leitura.
//   npx tsx scripts/investigacao-363-verificar-rpc.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

  // Caso 1: messageId real conhecido com 2 linhas reais na tabela crua.
  const idReal = 'C8A70EFAA40D1E1C86F6';
  const { data: linhasReais } = await admin.from('jsgrafica_status_visualizacoes').select('*').contains('ids', [idReal]);
  console.log(`Linhas cruas reais pra ${idReal}: ${linhasReais?.length}`);
  const { data: rpc1, error: e1 } = await admin.rpc('jsgrafica_contar_visualizacoes_status', { message_ids: [idReal] });
  console.log('RPC pra esse mesmo id:', JSON.stringify(rpc1), 'erro:', e1);

  // Caso 2: messageId completamente inventado, não deveria existir na
  // tabela, RPC deveria devolver 0.
  const idFalso = 'ID_QUE_NAO_EXISTE_TESTE_363_XYZ';
  const { data: rpc2, error: e2 } = await admin.rpc('jsgrafica_contar_visualizacoes_status', { message_ids: [idFalso] });
  console.log('\nRPC pra id inventado (deveria ser 0 ou vazio):', JSON.stringify(rpc2), 'erro:', e2);

  // Caso 3: total real de linhas na tabela toda, e quantos message_ids
  // distintos existem (via `ids` jsonb), pra saber a escala real dos dados.
  const { count: totalLinhas } = await admin.from('jsgrafica_status_visualizacoes').select('*', { count: 'exact', head: true });
  console.log(`\nTotal de linhas em jsgrafica_status_visualizacoes: ${totalLinhas}`);
}
main().catch(e => { console.error('ERRO:', e); process.exit(1); });
