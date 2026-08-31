/**
 * Demanda 220 — teste isolado: força uma falha REAL de `criarCobrancaPix`
 * (valor inválido, R$0,00 — o Mercado Pago rejeita antes de qualquer
 * movimentação real de dinheiro) e confirma que `registrarFalhaCobrancaPix`
 * grava o registro corretamente. Não cria nenhuma cobrança real, não afeta
 * nenhum pedido/venda de produção — só chama as 2 funções diretamente.
 *
 *   npx tsx scripts/spike-220-teste-falha-cobranca.ts
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
  const { criarCobrancaPix } = await import('../lib/mercadopago');
  const { registrarFalhaCobrancaPix } = await import('../lib/supabase-admin');

  const inicio = Date.now();
  let erroCapturado: unknown = null;
  try {
    // valor 0 — o Mercado Pago rejeita order de valor zero, sem nenhum
    // risco de cobrança real (não existe cobrança de R$0,00 de verdade).
    await criarCobrancaPix({
      valor: 0,
      externalReference: 'teste-220-falha-sintetica',
      telefone: '5581999990220',
    });
    console.log('INESPERADO: criarCobrancaPix não lançou erro com valor 0.');
  } catch (e) {
    erroCapturado = e;
    console.log('Falha capturada (esperada):', e instanceof Error ? e.message : String(e));
  }

  if (!erroCapturado) {
    console.log('Teste inconclusivo — não houve falha pra registrar.');
    return;
  }

  await registrarFalhaCobrancaPix({
    origem: 'pedidos',
    pedidoId: 'teste-220-falha-sintetica',
    vendaId: null,
    telefone: '5581999990220',
    valor: 0,
    erroMensagem: erroCapturado instanceof Error ? erroCapturado.message : String(erroCapturado),
    tempoDecorridoMs: Date.now() - inicio,
    payloadTentativa: { externalReference: 'teste-220-falha-sintetica', valor: 0, telefone: '5581999990220' },
  });
  console.log('registrarFalhaCobrancaPix chamado — confira a tabela.');
}

main();
