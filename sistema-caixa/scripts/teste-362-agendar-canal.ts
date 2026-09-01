// Teste ponta a ponta da demanda 362 (ação real de "agendar" post do Canal,
// distinta de "aprovar" que publica na hora). Login real via
// /api/auth/login-admin, depois cria post real, agenda, confirma que NÃO
// chamou a Z-API (sem message_id, status approved), confirma que agendar com
// data passada é rejeitado, e limpa (cancela) os posts de teste no fim.
//   npx tsx scripts/teste-362-agendar-canal.ts
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (nome: string) => env.match(new RegExp(`${nome}=(.*)`))![1].trim();

const BASE = 'http://localhost:3000';

async function main() {
  // 1. Login real como admin, pra pegar o cookie de sessão real (mesmo
  // mecanismo que qualquer chamada de /api/* exige desde a demanda 329).
  const resLogin = await fetch(`${BASE}/api/auth/login-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha: campo('ADMIN_PASSWORD') }),
  });
  if (!resLogin.ok) throw new Error(`login falhou: ${resLogin.status} ${await resLogin.text()}`);
  const cookie = resLogin.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('sem cookie de sessão na resposta de login');
  console.log('1. Login OK, cookie de sessão obtido.');

  const headers = { 'Content-Type': 'application/json', Cookie: cookie };

  // 2. Cria post pendente real com scheduled_at no futuro (daqui a 2h).
  const futuro = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const resCriar = await fetch(`${BASE}/api/marketing/canal`, {
    method: 'POST', headers,
    body: JSON.stringify({ tipo: 'text', texto: '[TESTE 362, ignorar] post de teste do agendamento', scheduled_at: futuro }),
  });
  const criado = await resCriar.json();
  if (!resCriar.ok || criado.error) throw new Error(`criar falhou: ${JSON.stringify(criado)}`);
  const id = criado.post.id;
  console.log(`2. Post pendente criado, id=${id}, scheduled_at=${futuro}`);

  // 3. Agenda (não deve chamar a Z-API).
  const resAgendar = await fetch(`${BASE}/api/marketing/canal`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ id, acao: 'agendar' }),
  });
  const agendado = await resAgendar.json();
  if (!resAgendar.ok || agendado.error) throw new Error(`agendar falhou: ${JSON.stringify(agendado)}`);
  console.log(`3. Agendar OK: status=${agendado.post.status}, message_id=${agendado.post.message_id}, published_at=${agendado.post.published_at}`);
  if (agendado.post.status !== 'approved') throw new Error('FALHOU: status esperado approved');
  if (agendado.post.message_id !== null) throw new Error('FALHOU: message_id deveria continuar null (não publicou de verdade)');
  if (agendado.post.published_at !== null) throw new Error('FALHOU: published_at deveria continuar null');
  console.log('   Confirmado: nenhuma chamada real à Z-API aconteceu (sem message_id, sem published_at).');

  // 4. Cria um 2º post pendente com scheduled_at no PASSADO, confirma que
  // "agendar" rejeita (não dá pra "agendar" pra hora que já passou).
  const passado = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const resCriar2 = await fetch(`${BASE}/api/marketing/canal`, {
    method: 'POST', headers,
    body: JSON.stringify({ tipo: 'text', texto: '[TESTE 362, ignorar] post de teste rejeicao passado', scheduled_at: passado }),
  });
  const criado2 = await resCriar2.json();
  if (!resCriar2.ok || criado2.error) throw new Error(`criar 2 falhou: ${JSON.stringify(criado2)}`);
  const id2 = criado2.post.id;
  const resAgendar2 = await fetch(`${BASE}/api/marketing/canal`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ id: id2, acao: 'agendar' }),
  });
  const rejeitado = await resAgendar2.json();
  console.log(`4. Tentativa de agendar com data passada: status HTTP=${resAgendar2.status}, erro="${rejeitado.error}"`);
  if (resAgendar2.ok || !rejeitado.error) throw new Error('FALHOU: deveria ter rejeitado agendamento com data passada');
  console.log('   Confirmado: rejeitado corretamente.');

  // 5. Limpeza, cancela os 2 posts de teste.
  await fetch(`${BASE}/api/marketing/canal`, { method: 'PATCH', headers, body: JSON.stringify({ id, acao: 'cancelar' }) });
  await fetch(`${BASE}/api/marketing/canal`, { method: 'PATCH', headers, body: JSON.stringify({ id: id2, acao: 'cancelar' }) });
  console.log('5. Limpeza OK, os 2 posts de teste foram cancelados.');

  console.log('\nTeste 362 passou de ponta a ponta.');
}

main().catch(e => { console.error('ERRO:', e); process.exit(1); });
