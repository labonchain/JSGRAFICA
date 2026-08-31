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

const DIA_ONTEM = '03-01-99';
const DIA_HOJE = '04-01-99';

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const { calcularGapContasSemApi } = await import('../lib/conciliacao');

  await supabaseAdmin.from('jsgrafica_fechamento').upsert({
    data_dia: DIA_ONTEM, fechado_por: 'Sistema', saldo_anterior: 0, total_entradas: 0, total_saidas: 0,
    resultado_dia: 0, saldo_acumulado: 0, bancos: 0, dinheiro: 0, moedas: 0, total_fisico: 0,
    divergencia: 0, saldo_stone: 0, saldo_caixa_economica: 0, saldo_mercadopago: 100, saldo_recargapay: 0,
    fechado_em: new Date().toISOString(),
  }, { onConflict: 'data_dia,fechado_por' });
  await supabaseAdmin.from('jsgrafica_fechamento').upsert({
    data_dia: DIA_HOJE, fechado_por: 'Sistema', saldo_anterior: 0, total_entradas: 0, total_saidas: 0,
    resultado_dia: 0, saldo_acumulado: 0, bancos: 0, dinheiro: 0, moedas: 0, total_fisico: 0,
    divergencia: 0, saldo_stone: 0, saldo_caixa_economica: 0, saldo_mercadopago: 60, saldo_recargapay: 0,
    fechado_em: new Date().toISOString(),
  }, { onConflict: 'data_dia,fechado_por' });

  try {
    // -40 informado, mas passamos somaPendenciasMPDoDia=25 (simula 227 já
    // tendo achado R$25 em itens individuais no mesmo dia).
    await calcularGapContasSemApi(DIA_HOJE, 25);
    const { data } = await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
      .select('descricao_sugerida, valor').eq('data_dia', DIA_HOJE).eq('conta', 'mercadopago').single();
    console.log('valor:', data?.valor);
    console.log('texto:', data?.descricao_sugerida);
  } finally {
    await supabaseAdmin.from('jsgrafica_conciliacao_pendencias').delete().in('data_dia', [DIA_ONTEM, DIA_HOJE]);
    await supabaseAdmin.from('jsgrafica_fechamento').delete().in('data_dia', [DIA_ONTEM, DIA_HOJE]).eq('fechado_por', 'Sistema');
    console.log('Limpeza concluída.');
  }
}
main();
