/**
 * Demanda 229 — teste sintético fim a fim contra o servidor real (dev
 * local, porta 3000): cria pendências sintéticas isoladas (dia 2099, sem
 * risco de tocar dado real) cobrindo os 6 caminhos (entrada, saída,
 * transferência-entrada, transferência-saída, sabido, ignorar) + confirma
 * bloqueio de dupla classificação + confirma o cálculo de
 * `fechamentoDesatualizado`. Limpa tudo no final.
 *
 *   npx tsx scripts/teste-229-conciliacao.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const text = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
    for (const line of text.split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 0 || line.trim().startsWith('#')) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = v;
    }
  } catch { /* ignorar */ }
}
loadEnv();

const BASE = 'http://localhost:3000';
const DIA = '01-01-99';

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');

  async function inserirPendencia(conta: string, tipo: string, valor: number, desc = 'teste 229') {
    const { data, error } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
      .insert({ conta, data_dia: DIA, tipo_origem: tipo, valor, descricao_sugerida: desc }).select('id').single();
    if (error || !data) throw error;
    return data.id as string;
  }

  const idEntrada = await inserirPendencia('stone', 'saldo_dia_agregado', 25.5);
  const idSaida = await inserirPendencia('recargapay', 'saldo_dia_agregado', -10);
  const idTransfEntrada = await inserirPendencia('caixa_economica', 'saldo_dia_agregado', 40); // positivo = chegou
  const idTransfSaida = await inserirPendencia('dinheiro_zu', 'saldo_dia_agregado', -15); // negativo = saiu
  const idSabido = await inserirPendencia('stone', 'mercadopago_pagamento', 2, 'cofrinho teste');
  const idIgnorar = await inserirPendencia('mercadopago', 'mercadopago_pagamento', 3);

  const idsCriados = [idEntrada, idSaida, idTransfEntrada, idTransfSaida, idSabido, idIgnorar];

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`${BASE}/api/conciliacao/pendencias`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, operador: 'teste-229', ...body }),
    });
    return { status: res.status, data: await res.json() };
  }

  try {
    console.log('=== 1. Entrada ===');
    const rEntrada = await patch(idEntrada, { acao: 'entrada', valor: 25.5, descricao: 'teste entrada' });
    console.log(rEntrada.status, rEntrada.data);
    const { data: entradaCriada } = await supabaseAdmin.from('jsgrafica_entradas_avulsas')
      .select('*').eq('pendencia_id', idEntrada).maybeSingle();
    console.log('entrada avulsa criada:', entradaCriada);

    console.log('\n=== 2. Saída ===');
    const { data: categorias } = await supabaseAdmin.from('jsgrafica_categorias_saida').select('id').eq('ativo', true).limit(1);
    const categoriaTeste = categorias?.[0]?.id;
    const rSaida = await patch(idSaida, { acao: 'saida', categoriaId: categoriaTeste, valor: 10, descricao: 'teste saida' });
    console.log(rSaida.status, rSaida.data);

    console.log('\n=== 3. Transferência (pendência positiva = conta é destino) ===');
    const rTransfEntrada = await patch(idTransfEntrada, { acao: 'transferencia', contaContraparte: 'stone', descricao: 'teste transf entrada' });
    console.log(rTransfEntrada.status, rTransfEntrada.data);
    const { data: transfEntradaCriada } = await supabaseAdmin.from('jsgrafica_transferencias')
      .select('conta_origem, conta_destino, valor').eq('data_dia', DIA).eq('conta_destino', 'caixa_economica').maybeSingle();
    console.log('transferência criada (esperado: origem=stone, destino=caixa_economica, valor=40):', transfEntradaCriada);

    console.log('\n=== 4. Transferência (pendência negativa = conta é origem) ===');
    const rTransfSaida = await patch(idTransfSaida, { acao: 'transferencia', contaContraparte: 'stone', descricao: 'teste transf saida' });
    console.log(rTransfSaida.status, rTransfSaida.data);
    const { data: transfSaidaCriada } = await supabaseAdmin.from('jsgrafica_transferencias')
      .select('conta_origem, conta_destino, valor').eq('data_dia', DIA).eq('conta_origem', 'dinheiro_zu').maybeSingle();
    console.log('transferência criada (esperado: origem=dinheiro_zu, destino=stone, valor=15):', transfSaidaCriada);

    console.log('\n=== 5. Sabido, não é real ===');
    const rSabido = await patch(idSabido, { acao: 'sabido', motivo: 'cofrinho recorrente, já sabido' });
    console.log(rSabido.status, rSabido.data);

    console.log('\n=== 6. Ignorar ===');
    const rIgnorar = await patch(idIgnorar, { acao: 'ignorar' });
    console.log(rIgnorar.status, rIgnorar.data);

    console.log('\n=== 7. Dupla classificação bloqueada? ===');
    const rDupla = await patch(idEntrada, { acao: 'entrada', valor: 25.5 });
    console.log(rDupla.status, rDupla.data, rDupla.status === 400 ? 'OK — bloqueado' : 'FALHOU — deveria bloquear');

    console.log('\n=== 8. fechamentoDesatualizado — cria fechamento "Sistema" DEPOIS da classificação ===');
    // idEntrada foi classificado ANTES deste fechamento — deve aparecer desatualizado.
    await supabaseAdmin.from('jsgrafica_fechamento').upsert({
      data_dia: DIA, fechado_por: 'Sistema', saldo_anterior: 0, total_entradas: 0, total_saidas: 0,
      resultado_dia: 0, saldo_acumulado: 0, bancos: 0, dinheiro: 0, moedas: 0, total_fisico: 0,
      divergencia: 0, fechado_em: new Date().toISOString(),
    }, { onConflict: 'data_dia,fechado_por' });
    // Mas a classificação já aconteceu ANTES desse fechado_em — então NÃO deveria estar desatualizado
    // (fez sentido no momento). Testa o caso oposto: cria uma pendência nova, fecha o dia, DEPOIS classifica.
    const idPosFechamento = await inserirPendencia('stone', 'saldo_dia_agregado', 5);
    await new Promise(r => setTimeout(r, 1200));
    const rPos = await patch(idPosFechamento, { acao: 'entrada', valor: 5 });
    console.log('classificação pós-fechamento:', rPos.status);
    idsCriados.push(idPosFechamento);

    const resGet = await fetch(`${BASE}/api/conciliacao/pendencias?dataDia=${DIA}`);
    const dataGet = await resGet.json();
    const itemPos = dataGet.pendencias.find((p: { id: string }) => p.id === idPosFechamento);
    console.log('fechamentoDesatualizado do item classificado DEPOIS do fechamento (esperado true):', itemPos?.fechamentoDesatualizado);
    const itemAntes = dataGet.pendencias.find((p: { id: string }) => p.id === idEntrada);
    console.log('fechamentoDesatualizado do item classificado ANTES do fechamento existir (esperado false):', itemAntes?.fechamentoDesatualizado);

  } finally {
    console.log('\n=== Limpeza ===');
    // Apaga entradas avulsas / saídas / transferências sintéticas criadas.
    const { data: entradasAvulsas } = await supabaseAdmin.from('jsgrafica_entradas_avulsas').select('id').eq('data_dia', DIA);
    for (const e of entradasAvulsas ?? []) await supabaseAdmin.from('jsgrafica_entradas_avulsas').delete().eq('id', e.id);

    const { data: transfs } = await supabaseAdmin.from('jsgrafica_transferencias').select('id, saida_id').eq('data_dia', DIA);
    for (const t of transfs ?? []) {
      await supabaseAdmin.from('jsgrafica_transferencias').delete().eq('id', t.id);
      if (t.saida_id) await supabaseAdmin.from('jsgrafica_saidas').delete().eq('id', t.saida_id);
    }
    await supabaseAdmin.from('jsgrafica_saidas').delete().eq('data_dia', DIA);
    await supabaseAdmin.from('jsgrafica_fechamento').delete().eq('data_dia', DIA).eq('fechado_por', 'Sistema');
    for (const id of idsCriados) await supabaseAdmin.from('jsgrafica_conciliacao_pendencias').delete().eq('id', id);
    console.log('Limpeza concluída.');
  }
}

main();
