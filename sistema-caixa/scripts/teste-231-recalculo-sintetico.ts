/**
 * Demanda 231 — teste sintético ponta a ponta do recálculo de fechamento
 * desatualizado, contra o servidor dev local (localhost:3000) e o banco
 * real, mas isolado em dias fictícios de 2099 (mesmo padrão de isolamento
 * já usado na demanda 223) — nenhum dado real é tocado.
 *
 * Cenário: 2 dias "Sistema" fechados em sequência (A → B). Depois do
 * fechamento, 3 pendências de conciliação são classificadas no dia A:
 * Entrada (+300), Saída (+50) e Transferência (deve ser ignorada — líquida
 * zero, confirmado no desenho). Testa: prévia calcula o delta e a cascata
 * corretamente; aplicar grava os valores certos e marca as pendências;
 * transferência nunca entra no delta; reaplicar depois de aplicado não
 * pega mais nada; parada segura quando o fingerprint não bate mais.
 *
 *   npx tsx scripts/teste-231-recalculo-sintetico.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)![1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)![1].trim();
const supabase = createClient(url, key);

const DIA_A = '01-01-99'; // 2099-01-01, isolado — mesmo padrão da 223
const DIA_B = '02-01-99'; // 2099-01-02

const criados: { tabela: string; id: string }[] = [];
async function inserir(tabela: string, linha: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.from(tabela).insert(linha).select().single();
  if (error) throw new Error(`Erro ao inserir em ${tabela}: ${error.message}`);
  criados.push({ tabela, id: data.id });
  return data;
}

async function limpar() {
  for (const { tabela, id } of criados.reverse()) {
    await supabase.from(tabela).delete().eq('id', id);
  }
  console.log(`Limpeza: ${criados.length} linha(s) sintética(s) removida(s).`);
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function main() {
  console.log('--- Montando cenário sintético (dias 2099) ---');

  const fechA = await inserir('jsgrafica_fechamento', {
    data_dia: DIA_A, fechado_por: 'Sistema',
    saldo_anterior: 1000, total_entradas: 200, total_saidas: 100, resultado_dia: 100,
    saldo_acumulado: 1100, total_fisico: 1100, divergencia: 0,
    fechado_em: '2099-01-01T20:00:00.000Z',
  });
  const fechB = await inserir('jsgrafica_fechamento', {
    data_dia: DIA_B, fechado_por: 'Sistema',
    saldo_anterior: 1100, total_entradas: 300, total_saidas: 250, resultado_dia: 50,
    saldo_acumulado: 1150, total_fisico: 1150, divergencia: 0,
    fechado_em: '2099-01-02T20:00:00.000Z',
  });

  // Pendência classificada como Entrada (+300) — cria a entrada avulsa real.
  const entradaAvulsa = await inserir('jsgrafica_entradas_avulsas', {
    data_dia: DIA_A, valor: 300, conta_destino: 'mercadopago', operador: 'Teste',
  });
  const pendEntrada = await inserir('jsgrafica_conciliacao_pendencias', {
    conta: 'mercadopago', data_dia: DIA_A, tipo_origem: 'mercadopago_pagamento', valor: 300,
    status: 'classificado', classificacao: { tipo: 'entrada', entradaAvulsaId: entradaAvulsa.id },
    classificado_por: 'Teste', classificado_em: '2099-01-01T21:00:00.000Z',
  });
  // Vincula de volta (pendencia_id na entrada avulsa) — mesmo padrão real.
  await supabase.from('jsgrafica_entradas_avulsas').update({ pendencia_id: pendEntrada.id }).eq('id', entradaAvulsa.id);

  // Pendência classificada como Saída (+50) — classificacao já guarda o valor direto (criarSaida).
  const saidaReal = await inserir('jsgrafica_saidas', {
    data_dia: DIA_A, categoria_id: 'fornecedores', categoria_nome: 'Fornecedores', valor: 50, operador: 'Teste',
  });
  const pendSaida = await inserir('jsgrafica_conciliacao_pendencias', {
    conta: 'stone', data_dia: DIA_A, tipo_origem: 'saldo_dia_agregado', valor: -50,
    status: 'classificado', classificacao: { tipo: 'saida', nomeAba: DIA_A, categoria: 'Fornecedores', valor: 50 },
    classificado_por: 'Teste', classificado_em: '2099-01-01T21:05:00.000Z',
  });

  // Pendência classificada como Transferência — deve ser ignorada (líquida zero).
  const pendTransferencia = await inserir('jsgrafica_conciliacao_pendencias', {
    conta: 'caixa_economica', data_dia: DIA_A, tipo_origem: 'saldo_dia_agregado', valor: 999,
    status: 'classificado', classificacao: { tipo: 'transferencia', transferenciaId: 'fake-nao-existe' },
    classificado_por: 'Teste', classificado_em: '2099-01-01T21:10:00.000Z',
  });

  console.log('\n--- Chamando GET /api/conciliacao/recalculo-previa ---');
  const resPrevia = await fetch('http://127.0.0.1:3002/api/conciliacao/recalculo-previa');
  const dataPrevia = await resPrevia.json();
  if (!resPrevia.ok) throw new Error(`Prévia falhou: ${JSON.stringify(dataPrevia)}`);
  const previa = dataPrevia.previa as any[];
  console.log(JSON.stringify(previa.filter(p => p.dataDia === DIA_A || p.dataDia === DIA_B), null, 2));

  const diaAPrevia = previa.find(p => p.dataDia === DIA_A);
  const diaBPrevia = previa.find(p => p.dataDia === DIA_B);
  assert(diaAPrevia, 'dia A aparece na prévia');
  assert(diaBPrevia, 'dia B aparece na prévia (cascata)');

  assert(diaAPrevia.totalEntradasDepois === 500, `dia A totalEntradasDepois = 500 (200+300), veio ${diaAPrevia.totalEntradasDepois}`);
  assert(diaAPrevia.totalSaidasDepois === 150, `dia A totalSaidasDepois = 150 (100+50), veio ${diaAPrevia.totalSaidasDepois}`);
  assert(diaAPrevia.saldoAcumuladoDepois === 1350, `dia A saldoAcumuladoDepois = 1350 (1000+500-150), veio ${diaAPrevia.saldoAcumuladoDepois}`);
  assert(diaAPrevia.divergenciaDepois === -250, `dia A divergenciaDepois = -250 (1100-1350), veio ${diaAPrevia.divergenciaDepois}`);
  assert(diaAPrevia.itensIncluidos.length === 2, `dia A inclui 2 itens (entrada+saida, NUNCA a transferência), veio ${diaAPrevia.itensIncluidos.length}`);
  assert(!diaAPrevia.itensIncluidos.some((i: any) => i.pendenciaId === pendTransferencia.id), 'transferência NUNCA entra no delta');

  assert(diaBPrevia.saldoAnteriorDepois === 1350, `dia B saldoAnteriorDepois herda 1350 do dia A, veio ${diaBPrevia.saldoAnteriorDepois}`);
  assert(diaBPrevia.totalEntradasDepois === diaBPrevia.totalEntradasAntes, 'dia B não tem delta próprio — entradas não mudam');
  assert(diaBPrevia.saldoAcumuladoDepois === 1400, `dia B saldoAcumuladoDepois = 1400 (1350+300-250), veio ${diaBPrevia.saldoAcumuladoDepois}`);
  assert(diaBPrevia.divergenciaDepois === -250, `dia B divergenciaDepois = -250 (1150-1400), veio ${diaBPrevia.divergenciaDepois}`);

  console.log('\n--- Testando parada segura: fingerprint desatualizado ---');
  const resApagado = await fetch('http://127.0.0.1:3002/api/conciliacao/recalculo-aplicar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diasEsperados: [{ dataDia: DIA_A, pendenciaIds: ['id-que-nao-existe-mais'] }, { dataDia: DIA_B, pendenciaIds: [] }] }),
  });
  const dataParada = await resApagado.json();
  assert(dataParada.paradoCedo === true, 'aplicar para cedo quando o fingerprint não bate');
  assert(dataParada.resultados[0].aplicado === false, 'dia A não foi aplicado na tentativa com fingerprint errado');

  // Confirma que NADA foi escrito na tentativa com fingerprint errado.
  const { data: fechAConfere1 } = await supabase.from('jsgrafica_fechamento').select('total_entradas').eq('id', fechA.id).single();
  assert(Number(fechAConfere1!.total_entradas) === 200, 'fechamento A continua intocado depois da tentativa com fingerprint errado');

  console.log('\n--- Aplicando de verdade, com o fingerprint certo da prévia ---');
  const diasEsperados = previa
    .filter(p => p.dataDia === DIA_A || p.dataDia === DIA_B)
    .map(p => ({ dataDia: p.dataDia, pendenciaIds: p.itensIncluidos.map((i: any) => i.pendenciaId) }));
  const resAplicar = await fetch('http://127.0.0.1:3002/api/conciliacao/recalculo-aplicar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diasEsperados }),
  });
  const dataAplicar = await resAplicar.json();
  console.log(JSON.stringify(dataAplicar, null, 2));
  assert(dataAplicar.paradoCedo === false, 'aplicar concluiu sem parar');
  assert(dataAplicar.resultados.every((r: any) => r.aplicado), 'todos os dias foram aplicados');

  const { data: fechAConfere } = await supabase.from('jsgrafica_fechamento')
    .select('total_entradas, total_saidas, saldo_anterior, saldo_acumulado, divergencia').eq('id', fechA.id).single();
  assert(Number(fechAConfere!.total_entradas) === 500, `fechamento A gravado: total_entradas=500, veio ${fechAConfere!.total_entradas}`);
  assert(Number(fechAConfere!.total_saidas) === 150, `fechamento A gravado: total_saidas=150, veio ${fechAConfere!.total_saidas}`);
  assert(Number(fechAConfere!.saldo_acumulado) === 1350, `fechamento A gravado: saldo_acumulado=1350, veio ${fechAConfere!.saldo_acumulado}`);

  const { data: fechBConfere } = await supabase.from('jsgrafica_fechamento')
    .select('total_entradas, saldo_anterior, saldo_acumulado').eq('id', fechB.id).single();
  assert(Number(fechBConfere!.saldo_anterior) === 1350, `fechamento B gravado: saldo_anterior=1350, veio ${fechBConfere!.saldo_anterior}`);
  assert(Number(fechBConfere!.total_entradas) === 300, 'fechamento B: total_entradas NÃO mudou (sem delta próprio)');
  assert(Number(fechBConfere!.saldo_acumulado) === 1400, `fechamento B gravado: saldo_acumulado=1400, veio ${fechBConfere!.saldo_acumulado}`);

  const { data: pendEntradaConfere } = await supabase.from('jsgrafica_conciliacao_pendencias').select('recalculo_aplicado_em').eq('id', pendEntrada.id).single();
  const { data: pendSaidaConfere } = await supabase.from('jsgrafica_conciliacao_pendencias').select('recalculo_aplicado_em').eq('id', pendSaida.id).single();
  const { data: pendTransfConfere } = await supabase.from('jsgrafica_conciliacao_pendencias').select('recalculo_aplicado_em').eq('id', pendTransferencia.id).single();
  assert(pendEntradaConfere!.recalculo_aplicado_em !== null, 'pendência Entrada marcada com recalculo_aplicado_em');
  assert(pendSaidaConfere!.recalculo_aplicado_em !== null, 'pendência Saída marcada com recalculo_aplicado_em');
  assert(pendTransfConfere!.recalculo_aplicado_em === null, 'pendência Transferência NUNCA marcada (nunca precisou)');

  console.log('\n--- Confirmando que reaplicar não pega mais nada (idempotência) ---');
  const resPreviaDepois = await fetch('http://127.0.0.1:3002/api/conciliacao/recalculo-previa');
  const dataPreviaDepois = await resPreviaDepois.json();
  const aindaTemAOuB = (dataPreviaDepois.previa as any[]).some(p => p.dataDia === DIA_A || p.dataDia === DIA_B);
  assert(!aindaTemAOuB, 'depois de aplicado, dia A/B somem da prévia (nada mais pendente)');

  console.log('\n--- Confirmando banner "desatualizado" via /api/conciliacao/pendencias ---');
  const resPendencias = await fetch(`http://127.0.0.1:3002/api/conciliacao/pendencias?dataDia=${DIA_A}`);
  const dataPendencias = await resPendencias.json();
  const pendenciasA = dataPendencias.pendencias as any[];
  const entradaComAviso = pendenciasA.find(p => p.id === pendEntrada.id);
  const transfComAviso = pendenciasA.find(p => p.id === pendTransferencia.id);
  assert(entradaComAviso.fechamentoDesatualizado === false, 'pendência Entrada já aplicada NÃO mostra mais o banner de desatualizado');
  assert(transfComAviso.fechamentoDesatualizado === false, 'pendência Transferência nunca mostra o banner (líquida zero, não precisa de ação)');

  console.log('\n✅ TODOS OS TESTES PASSARAM');
}

main()
  .catch(e => { console.error('\n❌ ERRO:', e); process.exitCode = 1; })
  .finally(async () => { await limpar(); });
