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
  const { buscarPagamentos } = await import('../lib/mercadopago');

  // Janela ampla: 01-03-26 00:00 Recife (03:00 UTC) até agora — cobre os 6
  // meses pedidos (mar-ago/26), mesmo que a conta não tenha dado pra trás.
  const inicio = '2026-03-01T03:00:00.000Z';
  const fim = new Date().toISOString();

  let offset = 0;
  const limit = 50;
  let total = 0;
  const porMes = new Map<string, { qtdAprovados: number; somaAprovados: number; primeiroDia: string | null; ultimoDia: string | null }>();
  let dataMaisAntiga: string | null = null;

  while (true) {
    const busca = await buscarPagamentos({ dataInicio: inicio, dataFim: fim, limit, offset });
    total = busca.paging.total;
    for (const p of busca.results) {
      if (!dataMaisAntiga || p.date_created < dataMaisAntiga) dataMaisAntiga = p.date_created;
      if (p.status !== 'approved') continue;
      const mes = new Date(p.date_created).toLocaleDateString('pt-BR', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit' });
      const chave = mes.split('/').reverse().join('-'); // AAAA-MM
      const atual = porMes.get(chave) ?? { qtdAprovados: 0, somaAprovados: 0, primeiroDia: null, ultimoDia: null };
      atual.qtdAprovados++;
      atual.somaAprovados += p.transaction_amount;
      const diaLocal = new Date(p.date_created).toLocaleDateString('pt-BR', { timeZone: 'America/Recife' });
      if (!atual.primeiroDia || diaLocal < atual.primeiroDia) atual.primeiroDia = diaLocal;
      if (!atual.ultimoDia || diaLocal > atual.ultimoDia) atual.ultimoDia = diaLocal;
      porMes.set(chave, atual);
    }
    offset += limit;
    if (offset >= total) break;
  }

  console.log(`Janela pedida na API: ${inicio} a ${fim}`);
  console.log(`Total de registros retornados pela API (todo status): ${total}`);
  console.log(`Pagamento mais antigo encontrado: ${dataMaisAntiga}`);
  console.log(`\nAprovados por mês:`);
  for (const [mes, v] of [...porMes.entries()].sort()) {
    console.log(`  ${mes}: ${v.qtdAprovados} pagamentos · R$${v.somaAprovados.toFixed(2)} · dias ${v.primeiroDia}–${v.ultimoDia}`);
  }
}
main();
