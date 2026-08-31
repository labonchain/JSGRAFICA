/**
 * Demanda 265 — gera o relatório "Dinheiro em conta" (settlement_report) do
 * Mercado Pago pra um dia específico, espera ficar pronto, baixa e mostra as
 * movimentações em formato legível. Urgente: desbloquear a conciliação de
 * julho (20, 21, 24, 31/07) mostrando taxa/saque/transferência que
 * `buscarPagamentos` (`/v1/payments/search`) nunca mostrou — essa API só
 * cobre pagamento recebido.
 *
 * 100% leitura na API do Mercado Pago (só cria o relatório em si — não
 * escreve/altera nada em `jsgrafica_*`). Nunca imprime o token de acesso.
 *
 *   npx tsx scripts/investigacao-265-relatorio-dinheiro-conta.ts 24-07-26
 *   npx tsx scripts/investigacao-265-relatorio-dinheiro-conta.ts 20-07-26 21-07-26 24-07-26 31-07-26
 *
 * Sem argumento, roda só pro dia 24-07-26 (o pedido explícito da demanda
 * como primeiro caso de confirmação).
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

// Parser simples do CSV do relatório — ponto e vírgula, sem campo com ; nem
// aspas embutidas nos valores reais observados (números/texto simples).
function parseCsv(texto: string): Record<string, string>[] {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (linhas.length === 0) return [];
  const cabecalho = linhas[0].split(';').map(h => h.trim());
  return linhas.slice(1).map(linha => {
    const valores = linha.split(';');
    const obj: Record<string, string> = {};
    cabecalho.forEach((h, i) => { obj[h] = (valores[i] ?? '').trim(); });
    return obj;
  });
}

async function investigarDia(dataDia: string) {
  const { limitesDiaCaixaUTC } = await import('../lib/supabase');
  const {
    criarRelatorioDinheiroEmConta,
    listarRelatoriosDinheiroEmConta,
    baixarRelatorioDinheiroEmConta,
  } = await import('../lib/mercadopago');

  const limites = limitesDiaCaixaUTC(dataDia);
  if (!limites) { console.error(`data_dia inválida: ${dataDia}`); return; }

  console.log(`\n${'='.repeat(70)}\nDia ${dataDia} — janela ${limites.inicio} a ${limites.fim}\n${'='.repeat(70)}`);

  console.log('1) Criando relatório (POST /v1/account/settlement_report)...');
  const criado = await criarRelatorioDinheiroEmConta(limites.inicio, limites.fim);
  console.log(`   Criado: id=${criado.id}, file_name="${criado.fileName}", date_created=${criado.dateCreated}`);

  // Achado real (não documentado na página consultada): o item aparece em
  // .../list IMEDIATAMENTE após criado, com status "pending" e file_name
  // vazio — "aparecer na lista" não significa pronto. O campo que importa é
  // `status` mudar de "pending" pra outra coisa. Em produção (conta sem
  // nenhum relatório anterior) isso levou vários minutos, não segundos —
  // orçamento de paciência generoso de propósito.
  console.log('2) Aguardando status sair de "pending" (poll em GET .../list, até 15 min)...');
  const MAX_TENTATIVAS = 90;
  const INTERVALO_MS = 10000;
  let pronto = false;
  let ultimoStatus = '(nenhum)';
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const lista = await listarRelatoriosDinheiroEmConta();
    const achado = lista.find(r => r.id === criado.id);
    ultimoStatus = achado?.status ?? '(não apareceu na lista)';
    if (achado && achado.status && achado.status !== 'pending') {
      console.log(`   Pronto na tentativa ${tentativa} (+${(tentativa - 1) * INTERVALO_MS / 1000}s): status="${achado.status}", file_name="${achado.fileName}"`);
      criado.fileName = achado.fileName; // pode ter mudado desde a criação
      pronto = true;
      break;
    }
    if (tentativa % 6 === 0) console.log(`   ... ainda "${ultimoStatus}" depois de ${tentativa * INTERVALO_MS / 1000}s`);
    await new Promise(r => setTimeout(r, INTERVALO_MS));
  }
  if (!pronto) {
    console.log(`   Não saiu de "${ultimoStatus}" depois de ${MAX_TENTATIVAS * INTERVALO_MS / 1000}s — tentando baixar direto mesmo assim, pra ver o comportamento real (pode falhar, é esperado se ainda não estiver pronto).`);
  }

  console.log('3) Baixando (GET /v1/account/settlement_report/:file_name)...');
  let csvBruto: string;
  try {
    csvBruto = await baixarRelatorioDinheiroEmConta(criado.fileName);
  } catch (e) {
    console.error(`   FALHOU: ${e instanceof Error ? e.message : e}`);
    return;
  }

  const todasLinhas = parseCsv(csvBruto);
  console.log(`   Baixado: ${csvBruto.length} caracteres, ${todasLinhas.length} linha(s) de movimentação no arquivo.`);
  if (todasLinhas.length === 0) {
    console.log('   Relatório veio vazio pra esse dia (0 linhas) — sem movimentação registrada nele, ou a janela não bateu com nenhuma transação.');
    return;
  }

  // Achado real (demanda 265, confirmado com dado real em produção): o
  // `begin_date`/`end_date` enviado NÃO recorta o arquivo com precisão de
  // dia-caixa — o relatório pedido pra "20-07-26" trouxe TRANSACTION_DATE até
  // a noite de 21-07-26 (quase 1,5 dia de dado, não 1 dia). Não dá pra
  // confiar no corte da própria API — filtramos aqui, no dia-caixa exato
  // (mesmas fronteiras de `limitesDiaCaixaUTC`), antes de calcular qualquer
  // total "do dia".
  const inicioMs = new Date(limites.inicio).getTime();
  const fimMs = new Date(limites.fim).getTime();
  const linhas = todasLinhas.filter(l => {
    const t = new Date(l.TRANSACTION_DATE).getTime();
    return !Number.isNaN(t) && t >= inicioMs && t < fimMs;
  });
  if (linhas.length !== todasLinhas.length) {
    console.log(`   ⚠️  A API devolveu mais dado do que o dia-caixa pedido — filtrado de ${todasLinhas.length} pra ${linhas.length} linha(s) estritamente dentro de ${limites.inicio} a ${limites.fim}.`);
  }
  if (linhas.length === 0) {
    console.log('   Depois de filtrar pelo dia-caixa exato, sobrou 0 linha — sem movimentação real nesse dia específico (o arquivo trazia dado de outro(s) dia(s) só).');
    return;
  }

  console.log(`   Colunas: ${Object.keys(linhas[0]).join(', ')}`);

  // Distribuição por TRANSACTION_TYPE — é a resposta direta pro critério de
  // aceite ("mostra taxa/saque/transferência, não só pagamento recebido?").
  const porTipo = new Map<string, { qtd: number; soma: number }>();
  for (const l of linhas) {
    const tipo = l.TRANSACTION_TYPE || '(vazio)';
    const atual = porTipo.get(tipo) ?? { qtd: 0, soma: 0 };
    atual.qtd++;
    atual.soma += Number(l.TRANSACTION_AMOUNT || l.SETTLEMENT_NET_AMOUNT || 0);
    porTipo.set(tipo, atual);
  }
  console.log('\n   Distribuição por TRANSACTION_TYPE:');
  for (const [tipo, { qtd, soma }] of porTipo) {
    console.log(`     - ${tipo}: ${qtd} linha(s), soma TRANSACTION_AMOUNT = R$${soma.toFixed(2)}`);
  }

  console.log('\n   Primeiras 20 linhas (legível):');
  for (const l of linhas.slice(0, 20)) {
    console.log(`     [${l.TRANSACTION_DATE}] ${l.TRANSACTION_TYPE} | valor=${l.TRANSACTION_AMOUNT} | taxa=${l.FEE_AMOUNT} | líquido=${l.SETTLEMENT_NET_AMOUNT} | ref=${l.EXTERNAL_REFERENCE || '(vazia)'} | order_id=${l.ORDER_ID || '(vazio)'}`);
  }
  if (linhas.length > 20) console.log(`     ... e mais ${linhas.length - 20} linha(s).`);

  // Soma total do dia pelo líquido (SETTLEMENT_NET_AMOUNT) — pra comparar
  // com a queda de saldo real que motivou a demanda.
  const somaLiquida = linhas.reduce((acc, l) => acc + Number(l.SETTLEMENT_NET_AMOUNT || 0), 0);
  console.log(`\n   Soma de SETTLEMENT_NET_AMOUNT do dia inteiro: R$${somaLiquida.toFixed(2)}`);
}

async function main() {
  const dias = process.argv.slice(2);
  const alvo = dias.length > 0 ? dias : ['24-07-26'];
  for (const dia of alvo) {
    try {
      await investigarDia(dia);
    } catch (e) {
      console.error(`Falha investigando ${dia}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main();
