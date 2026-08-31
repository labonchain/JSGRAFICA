/**
 * Import histórico Google Sheets → Supabase
 * Uso: node scripts/import-historico.mjs [--dry-run] [--force]
 *
 * --dry-run  : mostra os primeiros 3 dias sem gravar nada
 * --force    : continua mesmo se já houver registros de import anteriores
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lê .env.local manualmente
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const SHEETS_FILE =
  'C:\\Users\\edvam\\.claude\\projects\\c--Users-edvam-OneDrive-Documentos-Claude-Projects-JS-GRAFICA\\a896f47b-9fde-4771-bf80-ce12af9269d9\\tool-results\\mcp-claude_ai_Google_Drive-read_file_content-1777746149506.txt';

// ── Normalização ──────────────────────────────────────────────────────────────
// Remove acentos e caracteres de substituição (U+FFFD), uppercase
function norm(s) {
  return s.toUpperCase()
    .replace(/�/g, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// ── DE-PARA: nome normalizado → produto_id ───────────────────────────────────
const DEPARA = {
  // variantes com caractere ordinal feminino (ª) em "2ª VIA"
  '2ª VIA CONTA': 'prod-001',
  'XEROX PRETO E BRANCO A4':                        'prod-036',
  'XEROX COLORIDA A4':                              'prod-035',
  'XEROX A3':                                       'prod-034',
  'IMPRESSAO PRETO E BRANCO OFICIO A4':             'prod-009',
  'IMPRESSAO P&B OFICIO A4':                        'prod-009',
  'IMPRESSAO P&B A4':                               'prod-009',
  'IMPRESSAO OFICIO A3':                            'prod-008',
  'IMPRESSAO P&B OFICIO A3':                        'prod-008',
  'IMPRESSAO COLORIDA OFICIO A4':                   'prod-007',
  'IMPRESSAO COLORIDA A3':                          'prod-006',
  '2A VIA CONTA':                                   'prod-001',
  '2 VIA CONTA':                                    'prod-001',
  'CONSULTA E 2A VIA CONTA':                        'prod-001',
  'CONSULTA SERASA':                                'prod-003',
  'CONSULTA SERASA SCPC':                           'prod-003',
  'CONSULTA CPF (SCPC| SERASA|CARTORIOS|CHEQUES)':  'prod-002',
  'CONSULTA CPF (SCPC, SERASA,CARTORIOS,CHEQUES)':  'prod-002',
  'CONSULTA CPF SCPC SERASA CARTORIOS CHEQUES':     'prod-002',
  'FOTO 3X4 8 FOTOS':                               'prod-025',
  'FOTO 3X4 (8 FOTOS)':                             'prod-025',
  'FOTO 10X15':                                     'prod-021',
  'FOTO 15X20':                                     'prod-023',
  'FOTO 20X29':                                     'prod-024',
  'FOTO POLAROID 7X10':                             'prod-022',
  'IMPRESSAO PAPEL FOTO A4':                        'prod-020',
  'IMPRESSAO PAPEL CARTAO A4':                      'prod-013',
  'IMPRESSAO PAPEL CARTAO A3':                      'prod-012',
  'IMPRESSAO PAPEL ADESIVO A4':                     'prod-011',
  'IMPRESSAO PAPEL ADESIVO A3':                     'prod-010',
  'IMPRESSAO PAPEL COUCHE A4 90G':                  'prod-019',
  'IMPRESSAO PAPEL COUCHE A4 75G':                  'prod-019',
  'IMPRESSAO PAPEL COUCHE A4 250G':                 'prod-017',
  'IMPRESSAO PAPEL COUCHE A4 300G':                 'prod-018',
  'IMPRESSAO PAPEL COUCHE A3':                      'prod-014',
  'IMPRESSAO PAPEL COUCHE A3 90G':                  'prod-016',
  'IMPRESSAO PAPEL COUCHE A3 300G':                 'prod-015',
  'PLASTIFICACAO PEQUENA':                          'prod-033',
  'PLASTIFICACAO MEDIA':                            'prod-032',
  'PLASTIFICACAO A3':                               'prod-030',
  'PLASTIFICACAO A4':                               'prod-031',
  'ENCADERNACAO ATE 30 FOLHAS':                     'prod-037',
  'ENCADERNACAO 31-50 FOLHAS':                      'prod-040',
  'ENCADERNACAO DE 31 A 50 FOLHAS':                 'prod-040',
  'ENCADERNACAO 51-100 FOLHAS':                     'prod-041',
  'ENCADERNACAO DE 51 A 100 FOLHAS':                'prod-041',
  'ENCADERNACAO 101-200 FOLHAS':                    'prod-038',
  'ENCADERNACAO DE 101 A 200 FOLHAS':               'prod-038',
  'ENCADERNACAO 201-300 FOLHAS':                    'prod-039',
  'RECARGA VEM':                                    'prod-005',
  'RECARGA VEM PIX':                                'prod-005',
  'RECARGA VEM DINHEIRO':                           'prod-005',
  'RECARGA VEM PIX / DINHEIRO':                     'prod-005',
  'RECARGA CELULAR':                                'prod-004',
  'RECARGA CELULAR PIX':                            'prod-004',
  'RECARGA CELULAR DINHEIRO':                       'prod-004',
  'RECARGA CELULAR PIX / DINHEIRO':                 'prod-004',
  'BANNER / ADESIVOS POR METRO':                    'prod-026',
  'BANNER POR METRO':                               'prod-026',
  'ADESIVOS POR METRO':                             'prod-027',
  'CANECA / CAMISA':                                'prod-048',
  'IMA COM CALENDARIO':                             'prod-047',
  'AGENDAMENTO / CURRICULO / ANTECEDENTES':         'prod-042',
  'AGENDAMENTO CURRICULO ANTECEDENTES':             'prod-042',
  'SCANNER':                                        'prod-043',
  'ENVELOPE A4':                                    'prod-044',
  'RIFA':                                           'prod-045',
  'TOPO DE BOLO':                                   'prod-046',
  'CADASTRO E BO':                                  'prod-049',
  'CADASTRO E B.O.':                                'prod-049',
  'CADASTRO / MATRICULA ESCOLAR':                   'prod-050',
  'CADASTRO MATRICULA ESCOLAR':                     'prod-050',
  'DIGITACAO PROVAS':                               'prod-051',
  'DIGIRTACAO PROVAS':                              'prod-051',
  'ACESSO / ENVIO DOCUMENTOS':                      'prod-052',
  'ACERSSO / ENVIO DOCUMENTOS':                     'prod-052',
  'ENVIO DOCUMENTOS':                               'prod-052',
  // tamanho extra de plastificação não cadastrado → aproxima para A3
  'PLASTIFICACAO GRANDE':                           'prod-030',
  // variantes com typos e espaçamentos do Sheets
  'AGENDAMENTO / CURRICULO / DITIGITACAO':          'prod-042',
  'AGENDAMENTO / CURRICULO / ANTECEDENTES / DIGITACAO': 'prod-042',
  'BANNER /ADESIVOS POR METRO':                     'prod-026',
  'BANNER':                                         'prod-026',
  'IMPRESSAO PAPEL FOTO A3':                        'prod-020',
  'ENCADERNACAO DE 201 A 300 FOLHAS':               'prod-039',
  'IMPRESSAO PAPEL COUCHE A3 250G':                 'prod-016',
  'CANECA':                                         'prod-048',
};

// ── Categorias de saída ───────────────────────────────────────────────────────
// Usa prefixo parcial para resistir a caracteres corrompidos por encoding
const CATS_SAIDAS = [
  { prefixo: 'Fornecedores',       id: 'fornecedores',  nome: 'Fornecedores' },
  { prefixo: 'Folha de pagamento', id: 'folha',         nome: 'Folha de Pagamento' },
  { prefixo: 'Retiradas s',        id: 'socios',        nome: 'Retiradas Sócios' },
  { prefixo: 'Alugu',              id: 'aluguel',       nome: 'Aluguel' },
  { prefixo: 'Energia el',         id: 'energia',       nome: 'Energia Elétrica' },
  { prefixo: 'Telefone',           id: 'telefone',      nome: 'Telefone / Internet' },
  // 'Internet' removed — would double-match 'Telefone / Internet' rows
  { prefixo: 'Despesas diversas',  id: 'diversas',      nome: 'Despesas Diversas' },
  { prefixo: 'Despesas financ',    id: 'diversas',      nome: 'Despesas Diversas' },
  { prefixo: 'SISTEMAS',           id: 'sistemas',      nome: 'Sistemas' },
  { prefixo: 'Pagamento cart',     id: 'cartoes',       nome: 'Pagamento Cartões' },
  { prefixo: 'RECARGA VEM',        id: 'recarga_vem',   nome: 'Repasse Recarga VEM/Celular' },
  { prefixo: 'RECARGA CELULAR',    id: 'recarga_vem',   nome: 'Repasse Recarga VEM/Celular' },
];

// ── Utilitários ───────────────────────────────────────────────────────────────
function parseMoeda(s) {
  if (!s) return 0;
  const clean = s.replace(/R\$\s*/g, '').replace(/["\s]/g, '').replace(/,/g, '');
  return parseFloat(clean) || 0;
}

// Extrai o último valor numérico não-zero de um trecho de texto.
// Trata corretamente:
//   "1,049.94"  → 1049.94  (número grande entre aspas)
//   0.00,374.36 → 374.36   (dois valores separados por vírgula)
//   -700.98     → -700.98  (negativo)
function ultimoValor(texto) {
  if (!texto) return 0;
  // Remove aspas e extrai número de dentro delas (commas = separador de milhar)
  const limpo = texto.replace(/"([\d,]+\.[\d]+)"/g, (_, n) => ' ' + n.replace(/,/g, '') + ' ');
  // Coleta todos os números decimais e inteiros (preserva negativos)
  const nums = [...limpo.matchAll(/-?[\d]+\.[\d]+|-?[\d]+/g)].map(m => parseFloat(m[0]));
  for (let i = nums.length - 1; i >= 0; i--) {
    if (nums[i] !== 0) return nums[i];
  }
  return 0;
}

// ── Parser principal ──────────────────────────────────────────────────────────
function splitDias(content) {
  const rx = /(\d{2}-\d{2}-\d{2}) ENTRADAS,/g;
  const ms = [...content.matchAll(rx)];
  return ms.map((m, i) => ({
    date: m[1],
    text: content.slice(m.index, i + 1 < ms.length ? ms[i + 1].index : content.length),
  }));
}

const naoMapeados = new Map(); // nome → contagem de dias

function parseEntradas(dayText, date) {
  // Seção de entradas: até "SAÍDAS" (ou variantes com encoding quebrado)
  const idxSaidas = dayText.search(/SA.{0,3}DAS/);
  const secao = idxSaidas > 0 ? dayText.slice(0, idxSaidas) : dayText;

  // Trata nomes com vírgula interna (ex: "CONSULTA CPF (SCPC, SERASA,...)")
  const preprocessed = secao.replace(/"([^"]+)"/g, (_, inner) =>
    '"' + inner.replace(/,/g, '|') + '"'
  );

  // Cada linha de produto: NOME,PRECO,qty,qty,...,TOTAL_QTY,R$ TOTAL_VALOR
  const rx = /([^,\s][^,]+),([\d]+\.[\d]+),((?:[\d\.]*,){2,})([\d\.]+),R\$ ([\d",.]+)/g;
  const vendas = [];

  for (const m of preprocessed.matchAll(rx)) {
    // "VR TOTAL" é o último cabeçalho da linha de header — aparece colado ao primeiro produto
    // Strip leading "R$ X.XX " artifact prefix before normalizing
    const nomeRaw = m[1].replace(/^VR TOTAL\s+/i, '').replace(/"/g, '').replace(/\|/g, ',').trim();
    const nome = nomeRaw.replace(/^R\$\s*[\d,\.]+\s+/, '');
    const nomeN = norm(nome);
    if (nomeN.startsWith('VR TOTAL') || nomeN === 'ENTRADAS' || nomeN === 'PRECO') continue;
    // Skip pure-number or very short garbage artifacts
    if (/^[´\d\s\.,]+$/.test(nomeN) || nomeN.length < 3) continue;
    const preco = parseFloat(m[2]);
    const quantidade = parseFloat(m[4]);
    if (quantidade <= 0) continue;
    if (nomeN.startsWith('TOTAL') || nomeN === 'ENTRADAS') continue;

    const total = parseMoeda(m[5]);

    // Entradas avulsas / não registradas → sem produto_id
    if (nomeN.includes('ENTRADA DIVERS') || nomeN.includes('VENDAS NAO') ||
        nomeN.includes('IMPRESSOES E ENCADERNACOES')) {
      vendas.push({ data_dia: date, operador: 'import', produto_id: null,
        produto_nome: nome, quantidade: 1, valor_unit: total, total });
      continue;
    }

    const produtoId = DEPARA[nomeN];
    if (produtoId) {
      vendas.push({ data_dia: date, operador: 'import', produto_id: produtoId,
        produto_nome: nome, quantidade, valor_unit: preco, total });
    } else {
      naoMapeados.set(nomeN, (naoMapeados.get(nomeN) || 0) + 1);
    }
  }

  return vendas;
}

function parseSaidas(dayText, date) {
  const s1 = dayText.search(/SA.{0,3}DAS,/);
  const s2 = dayText.search(/TOTAL DAS SA.{0,3}DAS/);
  if (s1 < 0 || s2 < 0) return [];

  const secao = dayText.slice(s1, s2);
  const saidas = [];

  for (const cat of CATS_SAIDAS) {
    const escaped = cat.prefixo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const catIdx = secao.search(new RegExp(escaped, 'i'));
    if (catIdx < 0) continue;

    // Each row ends with "R$ VALUE" (quoted for large values, plain for small ones).
    // Read the first R$ occurrence after the category name — always the row total.
    const afterCat = secao.slice(catIdx);
    const m = afterCat.match(/R\$ ([\d,\.]+)/);
    if (!m) continue;

    const valor = parseMoeda(m[1]);
    if (valor > 0) {
      saidas.push({ data_dia: date, operador: 'import',
        categoria_id: cat.id, categoria_nome: cat.nome, valor });
    }
  }

  return saidas;
}

// Extrai o último valor numérico não-zero da “linha” que começa no marcador.
// Busca o fim de linha apenas a partir da 1ª vírgula (evita falsos positivos
// em rótulos como “SALDO ACUMULADO (1 + 2 )”).
function extraiUltimoDaLinha(texto, marcadorRx, maxChars = 200) {
  const idx = texto.search(marcadorRx);
  if (idx < 0) return 0;
  const slice = texto.slice(idx, idx + maxChars);

  // Só começa a analisar a partir da primeira vírgula (após o rótulo)
  const firstComma = slice.indexOf(',');
  if (firstComma < 0) return 0;
  const afterLabel = slice.slice(firstComma);

  // Remove aspas de números grandes: “1,049.94” → 1049.94
  const cleaned = afterLabel.replace(/[“””]([\d,]+\.[\d]+)[“””]/g,
    (_, n) => n.replace(/,/g, ''));

  // Fix unquoted thousands-separator numbers: 1,116.14 → 1116.14
  // Lookbehind ensures the pre-comma group is not part of a decimal (e.g. "0.00,374.36" stays intact)
  const cleaned2 = cleaned.replace(/(?<![\d.])(\d{1,3}),(\d{3}\.\d+)/g, '$1$2');

  // Fim de linha = espaço antes de marcador de nova seção
  const endMatch = cleaned2.search(/ (?:RESUMO|BANCOS|DINHEIRO|MOEDAS|[123] |\d{2}-\d{2}-\d{2})/);
  const rowPart = endMatch > 0 ? cleaned2.slice(0, endMatch) : cleaned2;

  // Último valor não-zero
  const partes = rowPart.split(',');
  for (let i = partes.length - 1; i >= 0; i--) {
    const v = parseFloat(partes[i].replace(/[^\d\.\-]/g, ''));
    if (!isNaN(v) && v !== 0) return v;
  }
  return 0;
}

function parseFechamento(dayText, date) {
  function simples(rx) {
    const m = dayText.match(rx);
    return m ? parseMoeda(m[1]) : 0;
  }

  // total entradas — linha tem formato "TOTAL DAS ENTRADAS,...,R$ X.XX"
  const totalEntradas = simples(/TOTAL DAS ENTRADAS,+R\$ ([\d,\.]+)/);

  // restante via extrator robusto
  const totalSaidas    = extraiUltimoDaLinha(dayText, /TOTAL DAS SA.{0,4}DAS/);
  const saldoAnterior  = extraiUltimoDaLinha(dayText, /2 SALDO ANTERIOR/);
  const saldoAcumulado = extraiUltimoDaLinha(dayText, /3 SALDO ACUMULADO/);

  const bancos   = simples(/BANCOS,([\d\.]+)/);
  const dinheiro = simples(/DINHEIRO,([\d\.]+)/);
  const moedas   = simples(/MOEDAS,([\d\.]+)/);

  const resumoIdx = dayText.indexOf('RESUMO');
  const mTF = resumoIdx >= 0
    ? dayText.slice(resumoIdx).match(/\bTOTAL,([\d\.]+)/)
    : null;
  const totalFisico = mTF ? parseFloat(mTF[1]) : bancos + dinheiro + moedas;

  return {
    data_dia: date,
    saldo_anterior: saldoAnterior,
    total_entradas: totalEntradas,
    total_saidas: totalSaidas,
    resultado_dia: totalEntradas - totalSaidas,
    saldo_acumulado: saldoAcumulado,
    bancos, dinheiro, moedas,
    total_fisico: totalFisico,
    divergencia: totalFisico - saldoAcumulado,
    fechado_por: 'import',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force  = args.includes('--force');
  const debugDay = args.find(a => a.startsWith('--day='))?.slice(6);

  console.log('Lendo arquivo Sheets...');
  const raw = JSON.parse(readFileSync(SHEETS_FILE, 'utf-8'));
  const content = raw.fileContent;

  const dias = splitDias(content);
  console.log(`${dias.length} dias encontrados: ${dias[0].date} → ${dias[dias.length - 1].date}`);

  // ── Debug: mostra um dia específico e sai ────────────────────────────────
  if (debugDay) {
    const dia = dias.find(d => d.date === debugDay);
    if (!dia) { console.error(`Dia ${debugDay} não encontrado`); return; }
    const v = parseEntradas(dia.text, dia.date);
    const s = parseSaidas(dia.text, dia.date);
    const f = parseFechamento(dia.text, dia.date);
    // Show raw saidas section for debugging
    const s1r = dia.text.search(/SA.{0,3}DAS,/);
    const s2r = dia.text.search(/TOTAL DAS SA.{0,3}DAS/);
    if (s1r >= 0 && s2r >= 0) {
      console.log('[RAW SAIDAS]', dia.text.slice(s1r, s2r + 80));
    }
    console.log(`=== ${dia.date} ===`);
    console.log(`  Vendas (${v.length}):`);
    v.forEach(x => console.log(`    [${x.produto_id ?? 'AVULSO'}] ${x.produto_nome} × ${x.quantidade} = R$${x.total}`));
    console.log(`  Saídas (${s.length}):`);
    s.forEach(x => console.log(`    [${x.categoria_id}] ${x.categoria_nome} R$${x.valor}`));
    console.log(`  Fechamento: entradas=${f.total_entradas} saidas=${f.total_saidas} saldo=${f.saldo_acumulado} fisico=${f.total_fisico}`);
    return;
  }

  // ── Dry-run: mostra amostra e sai ─────────────────────────────────────────
  if (dryRun) {
    console.log('\n[DRY-RUN] Primeiros 3 dias:\n');
    for (const { date, text } of dias.slice(0, 3)) {
      const v = parseEntradas(text, date);
      const s = parseSaidas(text, date);
      const f = parseFechamento(text, date);
      console.log(`=== ${date} ===`);
      console.log(`  Vendas (${v.length}):`);
      v.forEach(x => console.log(`    [${x.produto_id ?? 'AVULSO'}] ${x.produto_nome} × ${x.quantidade} = R$${x.total}`));
      console.log(`  Saídas (${s.length}):`);
      s.forEach(x => console.log(`    [${x.categoria_id}] ${x.categoria_nome} R$${x.valor}`));
      console.log(`  Fechamento: entradas=${f.total_entradas} saidas=${f.total_saidas} saldo=${f.saldo_acumulado} fisico=${f.total_fisico}`);
    }
    if (naoMapeados.size) {
      console.log(`\nProdutos NÃO mapeados (${naoMapeados.size} nomes únicos):`);
      [...naoMapeados.entries()]
        .sort((a, b) => b[1] - a[1])
        .forEach(([n, c]) => console.log(`  ${String(c).padStart(3)}x  ${n}`));
    }
    return;
  }

  // ── Verificação de duplicata ──────────────────────────────────────────────
  const { count } = await supabase
    .from('jsgrafica_vendas')
    .select('id', { count: 'exact', head: true })
    .eq('operador', 'import');

  if ((count ?? 0) > 0 && !force) {
    console.error(`\nERRO: Já existem ${count} registros com operador='import'.`);
    console.error('Para reimportar, primeiro delete os registros antigos e rode com --force.');
    console.error("  DELETE FROM jsgrafica_vendas WHERE operador = 'import';");
    console.error("  DELETE FROM jsgrafica_saidas WHERE operador = 'import';");
    process.exit(1);
  }

  // ── Import ────────────────────────────────────────────────────────────────
  let totalV = 0, totalS = 0, totalF = 0;
  const erros = [];

  for (let i = 0; i < dias.length; i++) {
    const { date, text } = dias[i];
    const vendas   = parseEntradas(text, date);
    const saidas   = parseSaidas(text, date);
    const fechamento = parseFechamento(text, date);

    if (vendas.length > 0) {
      const { error } = await supabase.from('jsgrafica_vendas').insert(vendas);
      if (error) erros.push(`[${date}] vendas: ${error.message}`);
      else totalV += vendas.length;
    }

    if (saidas.length > 0) {
      const { error } = await supabase.from('jsgrafica_saidas').insert(saidas);
      if (error) erros.push(`[${date}] saídas: ${error.message}`);
      else totalS += saidas.length;
    }

    const { error: fe } = await supabase
      .from('jsgrafica_fechamento')
      .upsert(fechamento, { onConflict: 'data_dia' });
    if (fe) erros.push(`[${date}] fechamento: ${fe.message}`);
    else totalF++;

    if ((i + 1) % 10 === 0) process.stdout.write(`  ${i + 1}/${dias.length} dias...\r`);
  }

  console.log(`\n\nImport concluído:`);
  console.log(`  ${totalV} vendas`);
  console.log(`  ${totalS} saídas`);
  console.log(`  ${totalF} fechamentos`);

  if (erros.length) {
    console.error(`\n${erros.length} erros:`);
    erros.forEach(e => console.error(' ', e));
  }

  if (naoMapeados.size) {
    console.warn(`\n${naoMapeados.size} produtos não mapeados (não importados):`);
    [...naoMapeados.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([n, c]) => console.warn(`  ${String(c).padStart(3)}x  ${n}`));
  }
}

main().catch(console.error);
