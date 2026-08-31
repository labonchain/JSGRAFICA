/**
 * Demanda 228 — CHECKPOINT DE INVESTIGAÇÃO (não é implementação de produção).
 * 100% leitura — nenhum INSERT/UPDATE/DELETE. Objetivo: reproduzir do zero,
 * com query própria contra o banco real, o cálculo de "gap agregado" que a
 * demanda 216 já fez manualmente uma vez (planilha em
 * pm/conhecimento/planilha-entradas-saidas-saldo-por-conta.md) e confirmar
 * que bate, antes de propor a versão que vira código de produção.
 *
 * Fórmula (desenho 225, seção 1.2 / demanda 228):
 *   variação informada = saldo_informado_hoje − saldo_informado_ontem (fechamento "Sistema")
 *   variação calculada  = Σ entradas da conta no dia − Σ saídas da conta no dia
 *   diferença           = variação informada − variação calculada
 *
 *   npx tsx scripts/investigacao-228-gap-agregado.ts
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

async function main() {
  const { supabaseAdmin } = await import('../lib/supabase-admin');
  const { limitesDiaCaixaUTC } = await import('../lib/supabase');

  type ContaCfg = {
    conta: string;
    formaPagamentoEntrada: string | null; // forma_pagamento que conta como entrada de pedido, se aplicável
  };
  const CONTAS: ContaCfg[] = [
    { conta: 'mercadopago',     formaPagamentoEntrada: 'Pix' },
    { conta: 'stone',           formaPagamentoEntrada: 'Cartão' },
    { conta: 'recargapay',      formaPagamentoEntrada: 'Pix RecargaPay' },
    { conta: 'caixa_economica', formaPagamentoEntrada: null },
  ];

  async function calcularDia(conta: string, formaPagamentoEntrada: string | null, dataDia: string) {
    const limites = limitesDiaCaixaUTC(dataDia);
    if (!limites) throw new Error(`data_dia inválida: ${dataDia}`);

    let entradaPedidos = 0;
    if (formaPagamentoEntrada) {
      const { data } = await supabaseAdmin.from('jsgrafica_pedidos')
        .select('valor_final')
        .eq('pagamento_confirmado', true).neq('status', 'cancelado')
        .eq('forma_pagamento', formaPagamentoEntrada)
        .gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
      entradaPedidos = (data ?? []).reduce((acc, r) => acc + Number(r.valor_final || 0), 0);
    }

    const { data: transfEntrada } = await supabaseAdmin.from('jsgrafica_transferencias')
      .select('valor').eq('data_dia', dataDia).eq('conta_destino', conta);
    const entradaTransf = (transfEntrada ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);

    const { data: saidasConta } = await supabaseAdmin.from('jsgrafica_saidas')
      .select('valor').eq('data_dia', dataDia).eq('conta_origem', conta);
    const saidaSaidas = (saidasConta ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);

    const { data: transfSaida } = await supabaseAdmin.from('jsgrafica_transferencias')
      .select('valor').eq('data_dia', dataDia).eq('conta_origem', conta);
    const saidaTransf = (transfSaida ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);

    const entrada = Math.round((entradaPedidos + entradaTransf) * 100) / 100;
    const saida = Math.round((saidaSaidas + saidaTransf) * 100) / 100;
    const resultado = Math.round((entrada - saida) * 100) / 100;
    return { entrada, saida, resultado };
  }

  async function saldoInformado(conta: string, dataDia: string): Promise<number | null> {
    const coluna = `saldo_${conta}`;
    const { data } = await supabaseAdmin.from('jsgrafica_fechamento')
      .select(coluna).eq('data_dia', dataDia).eq('fechado_por', 'Sistema').maybeSingle();
    if (!data) return null;
    const v = (data as unknown as Record<string, unknown>)[coluna];
    return v == null ? null : Number(v);
  }

  const CASOS = [
    { conta: 'mercadopago',     dataDia: '16-07-26', dataDiaAnterior: '15-07-26',
      esperado: { entrada: 142.05, saida: 100.00, resultado: 42.05, variacaoInformada: 51.98, diferenca: 9.93 } },
    { conta: 'recargapay',      dataDia: '14-07-26', dataDiaAnterior: '13-07-26',
      esperado: { entrada: 0.00, saida: 40.00, resultado: -40.00, variacaoInformada: 12.71, diferenca: 52.71 } },
    { conta: 'caixa_economica', dataDia: '13-07-26', dataDiaAnterior: '10-07-26',
      esperado: { entrada: 0.00, saida: 0.00, resultado: 0.00, variacaoInformada: 232.00, diferenca: 232.00 } },
  ];

  const LIMIAR = 2.00;

  for (const caso of CASOS) {
    const cfg = CONTAS.find(c => c.conta === caso.conta)!;
    const { entrada, saida, resultado } = await calcularDia(caso.conta, cfg.formaPagamentoEntrada, caso.dataDia);
    const saldoHoje = await saldoInformado(caso.conta, caso.dataDia);
    const saldoOntem = await saldoInformado(caso.conta, caso.dataDiaAnterior);
    const variacaoInformada = (saldoHoje != null && saldoOntem != null)
      ? Math.round((saldoHoje - saldoOntem) * 100) / 100 : null;
    const diferenca = variacaoInformada != null ? Math.round((variacaoInformada - resultado) * 100) / 100 : null;
    const geraPendencia = diferenca != null && Math.abs(diferenca) > LIMIAR;

    console.log(`\n=== ${caso.conta} — ${caso.dataDia} (vs ${caso.dataDiaAnterior}) ===`);
    console.log(`Entrada calc.:    ${entrada.toFixed(2)}  (esperado ${caso.esperado.entrada.toFixed(2)}) ${entrada === caso.esperado.entrada ? 'OK' : 'DIVERGE'}`);
    console.log(`Saída calc.:      ${saida.toFixed(2)}  (esperado ${caso.esperado.saida.toFixed(2)}) ${saida === caso.esperado.saida ? 'OK' : 'DIVERGE'}`);
    console.log(`Resultado calc.:  ${resultado.toFixed(2)}  (esperado ${caso.esperado.resultado.toFixed(2)}) ${resultado === caso.esperado.resultado ? 'OK' : 'DIVERGE'}`);
    console.log(`Saldo hoje/ontem: ${saldoHoje} / ${saldoOntem}`);
    console.log(`Variação informada: ${variacaoInformada}  (esperado ${caso.esperado.variacaoInformada}) ${variacaoInformada === caso.esperado.variacaoInformada ? 'OK' : 'DIVERGE'}`);
    console.log(`Diferença:        ${diferenca}  (esperado ${caso.esperado.diferenca}) ${diferenca === caso.esperado.diferenca ? 'OK' : 'DIVERGE'}`);
    console.log(`Geraria pendência (|diferença| > R$${LIMIAR.toFixed(2)}): ${geraPendencia}`);
  }
}

main();
