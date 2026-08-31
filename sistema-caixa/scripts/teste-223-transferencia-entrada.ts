/**
 * Demanda 223 — teste sintético: confirma que `getResumoDia` passou a somar
 * transferência recebida em `totalEntradas`, sem mudar `totalSaidas`. Cria 1
 * transferência sintética real (De/Para válidos), mede antes/depois, apaga
 * no final (transferência + a saída vinculada, mesmo mecanismo do DELETE da
 * rota real).
 *
 *   npx tsx scripts/teste-223-transferencia-entrada.ts
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
  const { supabaseAdmin, getResumoDia } = await import('../lib/supabase-admin');

  const dataDia = '01-01-99'; // 2099 — data isolada, bem longe de qualquer dado real
  const operadorTeste = 'teste-223';

  console.log(`Medindo totalEntradas/totalSaidas ANTES em ${dataDia}...`);
  const antes = await getResumoDia(dataDia);
  console.log('Antes:', antes);

  console.log('Inserindo saída (Transferência) + transferência sintética real...');
  const { data: saida, error: erroSaida } = await supabaseAdmin.from('jsgrafica_saidas').insert({
    data_dia: dataDia, operador: operadorTeste, categoria_id: 'transferencia_entre_contas',
    categoria_nome: 'Transferência entre contas', valor: 42.50, descricao: 'Teste 223',
    conta_origem: 'stone',
  }).select('id').single();
  if (erroSaida || !saida) { console.error('Falha ao inserir saída', erroSaida); return; }

  const { data: transferencia, error: erroTransf } = await supabaseAdmin.from('jsgrafica_transferencias').insert({
    data_dia: dataDia, conta_origem: 'stone', conta_destino: 'recargapay', valor: 42.50,
    descricao: 'Teste 223', operador: operadorTeste, saida_id: saida.id,
  }).select('id').single();
  if (erroTransf || !transferencia) { console.error('Falha ao inserir transferência', erroTransf); return; }

  try {
    console.log('Medindo DEPOIS (sem operador)...');
    const depois = await getResumoDia(dataDia);
    console.log('Depois:', depois);
    const entradaSubiu = Math.abs((depois.totalEntradas - antes.totalEntradas) - 42.50) < 0.001;
    const saidaBateuComATransferenciaJaContada = Math.abs((depois.totalSaidas - antes.totalSaidas) - 42.50) < 0.001; // a SAÍDA da transferência já contava antes da 223 — continua contando igual
    console.log(`totalEntradas subiu exatamente R$42,50: ${entradaSubiu ? 'OK' : 'FALHOU'}`);
    console.log(`totalSaidas subiu exatamente R$42,50 (só a saída de sempre, sem duplicar): ${saidaBateuComATransferenciaJaContada ? 'OK' : 'FALHOU'}`);

    console.log('\nMedindo com filtro por operador (deve ver a MESMA transferência, já que ela tem operador=teste-223)...');
    const depoisOperador = await getResumoDia(dataDia, operadorTeste);
    console.log('Depois (operador=teste-223):', depoisOperador);
    const entradaOperadorBateu = Math.abs(depoisOperador.totalEntradas - 42.50) < 0.001;
    console.log(`totalEntradas filtrado por operador bate exatamente R$42,50: ${entradaOperadorBateu ? 'OK' : 'FALHOU'}`);

    console.log('\nMedindo com filtro por operador SEM relação (deve dar 0, não contar a transferência de outro operador)...');
    const depoisOutroOperador = await getResumoDia(dataDia, 'outro-operador-inexistente');
    console.log(`totalEntradas pra operador sem transferência: ${depoisOutroOperador.totalEntradas} (esperado 0): ${depoisOutroOperador.totalEntradas === 0 ? 'OK' : 'FALHOU'}`);
  } finally {
    console.log('\nApagando transferência + saída sintéticas...');
    await supabaseAdmin.from('jsgrafica_transferencias').delete().eq('id', transferencia.id);
    await supabaseAdmin.from('jsgrafica_saidas').delete().eq('id', saida.id);
    const depoisLimpeza = await getResumoDia(dataDia);
    console.log('Depois da limpeza (deve bater com o "antes" original):', depoisLimpeza,
      JSON.stringify(depoisLimpeza) === JSON.stringify(antes) ? '(OK, igual ao original)' : '(DIVERGE do original!)');
  }
}

main();
