/**
 * Demanda 219 — teste isolado: confirma que a lógica nova de `eh_recarga`
 * (GET /api/pedidos) e o cálculo de `apenasRecarga` (ModalConfirmarPagamento)
 * funcionam certo nos 3 casos que importam:
 *   1. Pedido 100% recarga sozinho → apenasRecarga deve dar true
 *   2. Pedido não-recarga sozinho → apenasRecarga deve dar false (sem regressão)
 *   3. Venda MISTA (recarga + não-recarga) → apenasRecarga deve dar false
 *      (carrinho misto continua com as 4 opções, fora de escopo tratar aqui)
 *
 * Insere pedidos sintéticos reais na tabela (produtos reais já existentes:
 * prod-083 "RECARGA VEM 12,50" e prod-043 "SCANNER"), roda a MESMA função
 * (`idsProdutosRecarga`) que o GET /api/pedidos agora chama, reproduz o
 * mapeamento e o `.every()`/single-lookup que os componentes fazem, e apaga
 * os pedidos de teste no final. Não mexe em produção real nenhuma.
 *
 *   npx tsx scripts/spike-219-teste-eh-recarga.ts
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

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
  const { supabaseAdmin, idsProdutosRecarga } = await import('../lib/supabase-admin');

  const PROD_RECARGA = 'prod-083';   // RECARGA VEM 12,50
  const PROD_NAO_RECARGA = 'prod-043'; // SCANNER

  const idRecargaSozinha = `teste-219-${randomUUID().slice(0, 8)}`;
  const idNaoRecargaSozinha = `teste-219-${randomUUID().slice(0, 8)}`;
  const vendaMistaId = `venda-teste-219-${randomUUID().slice(0, 8)}`;
  const idMistaRecarga = `teste-219-${randomUUID().slice(0, 8)}`;
  const idMistaNaoRecarga = `teste-219-${randomUUID().slice(0, 8)}`;

  const base = {
    telefone: 'teste-219', nome_cliente: null, quem_vai_buscar: null,
    quantidade: 1, valor_unitario: 10, desconto_pct: 0, valor_total: 10, valor_final: 10,
    pagamento_tipo: 'pos_producao', forma_pagamento: null, pagamento_confirmado: false,
    status: 'confirmado', prazo_solicitado: null, prazo_entrega: null,
  };

  const linhas = [
    { id: idRecargaSozinha,    servico_id: PROD_RECARGA,     servico_nome: 'RECARGA VEM 12,50', venda_id: null,        ...base },
    { id: idNaoRecargaSozinha, servico_id: PROD_NAO_RECARGA, servico_nome: 'SCANNER',           venda_id: null,        ...base },
    { id: idMistaRecarga,      servico_id: PROD_RECARGA,     servico_nome: 'RECARGA VEM 12,50', venda_id: vendaMistaId, ...base },
    { id: idMistaNaoRecarga,   servico_id: PROD_NAO_RECARGA, servico_nome: 'SCANNER',           venda_id: vendaMistaId, ...base },
  ];

  console.log('Inserindo 4 pedidos sintéticos...');
  const { error: erroInsert } = await supabaseAdmin.from('jsgrafica_pedidos').insert(linhas);
  if (erroInsert) { console.error('Falha ao inserir:', erroInsert); return; }

  try {
    // Reproduz exatamente o que GET /api/pedidos faz agora.
    const { data } = await supabaseAdmin.from('jsgrafica_pedidos')
      .select('*').in('id', [idRecargaSozinha, idNaoRecargaSozinha, idMistaRecarga, idMistaNaoRecarga]);
    const setRecarga = await idsProdutosRecarga((data ?? []).map(p => p.servico_id));
    const pedidos = (data ?? []).map(p => ({ ...p, eh_recarga: !!p.servico_id && setRecarga.has(p.servico_id) }));

    const porId = Object.fromEntries(pedidos.map(p => [p.id, p]));

    // Caso 1: recarga sozinha.
    const caso1 = !!porId[idRecargaSozinha]?.eh_recarga;
    console.log(`Caso 1 (recarga sozinha) — eh_recarga=${caso1} (esperado true):`, caso1 === true ? 'OK' : 'FALHOU');

    // Caso 2: não-recarga sozinha (sem regressão).
    const caso2 = !!porId[idNaoRecargaSozinha]?.eh_recarga;
    console.log(`Caso 2 (não-recarga sozinha) — eh_recarga=${caso2} (esperado false):`, caso2 === false ? 'OK' : 'FALHOU');

    // Caso 3: venda mista — apenasRecarga = itens.every(p => p.eh_recarga).
    const itensMista = [porId[idMistaRecarga], porId[idMistaNaoRecarga]];
    const apenasRecargaMista = itensMista.every(p => !!p?.eh_recarga);
    console.log(`Caso 3 (venda mista) — apenasRecarga=${apenasRecargaMista} (esperado false):`, apenasRecargaMista === false ? 'OK' : 'FALHOU');
  } finally {
    console.log('Apagando os 4 pedidos sintéticos...');
    await supabaseAdmin.from('jsgrafica_pedidos')
      .delete().in('id', [idRecargaSozinha, idNaoRecargaSozinha, idMistaRecarga, idMistaNaoRecarga]);
    console.log('Limpeza concluída.');
  }
}

main();
