/**
 * Demanda 250 — teste sintético ponta a ponta de `confirmarPedidosPagosPorOrder`
 * (lib/mercadopago.ts), chamada DIRETO (sem passar pela API do Mercado Pago
 * — a função só recebe uma `OrderMP` já pronta, então dá pra testar 100%
 * sintético sem gerar nenhuma cobrança real). Cobre: (1) pedido único gera
 * 1 rascunho; (2) 2 pedidos com o mesmo venda_id geram 1 rascunho só,
 * combinado; (3) telefone inválido (balcão/"@lid") NÃO gera rascunho nenhum.
 *
 *   npx tsx scripts/teste-250-rascunho-pagamento.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// lib/mercadopago.ts importa lib/supabase-admin.ts, que lê process.env
// direto (fora do ciclo de carregamento do Next.js) — precisa estar
// populado ANTES do import, por isso lido e injetado aqui primeiro.
const envFile = readFileSync('.env.local', 'utf-8');
for (const linha of envFile.split('\n')) {
  const m = linha.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);
let confirmarPedidosPagosPorOrder: (order: any) => Promise<number>;

const TELEFONE_TESTE = '99999999999998';

const criados: { tabela: string; id: string }[] = [];
async function inserir(tabela: string, linha: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.from(tabela).insert(linha).select().single();
  if (error) throw new Error(`Erro ao inserir em ${tabela}: ${error.message}`);
  criados.push({ tabela, id: data.id });
  return data;
}
async function limpar() {
  for (const { tabela, id } of criados.reverse()) await supabase.from(tabela).delete().eq('id', id);
  await supabase.from('jsgrafica_rascunhos_pedido').delete().eq('telefone', TELEFONE_TESTE);
  await supabase.from('jsgrafica_rascunhos_pedido').delete().eq('telefone', 'balcao');
  console.log(`Limpeza: ${criados.length} pedido(s) sintético(s) + rascunhos removidos.`);
}
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`OK: ${msg}`);
}
function orderSintetica(id: string): any {
  return { id, status: 'processed', transactions: { payments: [{ payment_method: { id: 'pix' } }] } };
}

async function main() {
  ({ confirmarPedidosPagosPorOrder } = await import('../lib/mercadopago'));

  console.log('--- Cenário 1: pedido único gera 1 rascunho ---');
  const pedidoUnico = await inserir('jsgrafica_pedidos', {
    telefone: TELEFONE_TESTE, servico_nome: 'IMPRESSÃO P&B A4', valor_final: 1.20, quantidade: 1,
    status: 'confirmado', pagamento_tipo: 'flexivel', pagamento_confirmado: false,
    mp_order_id: 'ORD-teste-250-unico', pedido_criado_por: 'Teste',
  });

  const qtdConfirmados1 = await confirmarPedidosPagosPorOrder(orderSintetica('ORD-teste-250-unico'));
  assert(qtdConfirmados1 === 1, `confirmarPedidosPagosPorOrder retornou 1, veio ${qtdConfirmados1}`);

  const { data: pedidoConfere } = await supabase.from('jsgrafica_pedidos')
    .select('pagamento_confirmado, forma_pagamento, pagamento_confirmado_origem').eq('id', pedidoUnico.id).single();
  assert(pedidoConfere!.pagamento_confirmado === true, 'pagamento_confirmado gravado true');
  assert(pedidoConfere!.forma_pagamento === 'Pix', 'forma_pagamento gravado "Pix"');
  assert(pedidoConfere!.pagamento_confirmado_origem === 'mercadopago', 'origem gravada "mercadopago"');

  const rascunho1 = await supabase.from('jsgrafica_rascunhos_pedido').select('mensagem').eq('telefone', TELEFONE_TESTE);
  assert(rascunho1.data!.length === 1, `exatamente 1 rascunho gerado, veio ${rascunho1.data!.length}`);
  assert(rascunho1.data![0].mensagem.includes('Recebemos seu pagamento'), 'mensagem confirma o pagamento');
  assert(rascunho1.data![0].mensagem.includes('IMPRESSÃO P&B A4'), 'mensagem cita o serviço certo');
  assert(rascunho1.data![0].mensagem.includes('1.20') || rascunho1.data![0].mensagem.includes('1,20'), 'mensagem cita o valor certo');
  console.log('Rascunho gerado:\n' + rascunho1.data![0].mensagem);
  await supabase.from('jsgrafica_rascunhos_pedido').delete().eq('telefone', TELEFONE_TESTE);

  console.log('\n--- Reprocessar a MESMA order não gera rascunho duplicado (idempotência) ---');
  const qtdReprocessado = await confirmarPedidosPagosPorOrder(orderSintetica('ORD-teste-250-unico'));
  assert(qtdReprocessado === 0, `reprocessar retorna 0 (já estava confirmado), veio ${qtdReprocessado}`);
  const rascunhoDepoisReprocessar = await supabase.from('jsgrafica_rascunhos_pedido').select('id').eq('telefone', TELEFONE_TESTE);
  assert(rascunhoDepoisReprocessar.data!.length === 0, 'nenhum rascunho novo gerado ao reprocessar');

  console.log('\n--- Cenário 2: 2 pedidos com o mesmo venda_id geram 1 rascunho combinado ---');
  const vendaIdTeste = 'venda-teste-250';
  const pedidoA = await inserir('jsgrafica_pedidos', {
    telefone: TELEFONE_TESTE, servico_nome: 'XEROX PRETO E BRANCO A4', valor_final: 4.50, quantidade: 10,
    status: 'confirmado', pagamento_tipo: 'flexivel', pagamento_confirmado: false,
    mp_order_id: 'ORD-teste-250-venda', venda_id: vendaIdTeste, pedido_criado_por: 'Teste',
  });
  const pedidoB = await inserir('jsgrafica_pedidos', {
    telefone: TELEFONE_TESTE, servico_nome: 'CANECA / CAMISA', valor_final: 40, quantidade: 1,
    status: 'confirmado', pagamento_tipo: 'flexivel', pagamento_confirmado: false,
    mp_order_id: 'ORD-teste-250-venda', venda_id: vendaIdTeste, pedido_criado_por: 'Teste',
  });

  const qtdConfirmados2 = await confirmarPedidosPagosPorOrder(orderSintetica('ORD-teste-250-venda'));
  assert(qtdConfirmados2 === 2, `2 pedidos confirmados juntos, veio ${qtdConfirmados2}`);

  const rascunho2 = await supabase.from('jsgrafica_rascunhos_pedido').select('mensagem').eq('telefone', TELEFONE_TESTE);
  assert(rascunho2.data!.length === 1, `exatamente 1 rascunho combinado (não 2 separados), veio ${rascunho2.data!.length}`);
  assert(rascunho2.data![0].mensagem.includes('XEROX PRETO E BRANCO A4'), 'rascunho combinado cita item A');
  assert(rascunho2.data![0].mensagem.includes('CANECA / CAMISA'), 'rascunho combinado cita item B');
  assert(rascunho2.data![0].mensagem.includes('44.50') || rascunho2.data![0].mensagem.includes('44,50'), 'rascunho combinado soma o total certo (4.50+40=44.50)');
  console.log('Rascunho combinado:\n' + rascunho2.data![0].mensagem);
  await supabase.from('jsgrafica_rascunhos_pedido').delete().eq('telefone', TELEFONE_TESTE);

  console.log('\n--- Cenário 3: telefone inválido (balcão) NÃO gera rascunho ---');
  const pedidoBalcao = await inserir('jsgrafica_pedidos', {
    telefone: 'balcao', servico_nome: 'IMPRESSÃO P&B A4', valor_final: 1.20, quantidade: 1,
    status: 'entregue', pagamento_tipo: 'flexivel', pagamento_confirmado: false,
    mp_order_id: 'ORD-teste-250-balcao', pedido_criado_por: 'Teste',
  });
  const qtdConfirmados3 = await confirmarPedidosPagosPorOrder(orderSintetica('ORD-teste-250-balcao'));
  assert(qtdConfirmados3 === 1, 'pedido de balcão ainda é confirmado normalmente');
  const rascunhoBalcao = await supabase.from('jsgrafica_rascunhos_pedido').select('id').eq('telefone', 'balcao');
  assert(rascunhoBalcao.data!.length === 0, 'NENHUM rascunho gerado pro telefone "balcao"');

  console.log('\n✅ TODOS OS TESTES PASSARAM');
}

main()
  .catch(e => { console.error('\n❌ ERRO:', e); process.exitCode = 1; })
  .finally(async () => { await limpar(); });
