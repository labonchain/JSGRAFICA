// Demanda 359: catálogo real pra cruzar contra os 39 briefings do pipeline
// de conteúdo GPT antes de aprovar qualquer um. Só leitura.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf-8');
const campo = (n: string) => env.match(new RegExp(`${n}=(.*)`))![1].trim();
const admin = createClient(campo('NEXT_PUBLIC_SUPABASE_URL'), campo('SUPABASE_SERVICE_ROLE_KEY'));

async function main() {
  const { data, error } = await admin.from('jsgrafica_produtos')
    .select('id, nome, categoria, descricao, preco, ativo, exibir_menu, prazo_entrega, requer_consulta, requer_orcamento, formas_pagamento, opcoes_variaveis, dados_necessarios')
    .order('categoria');
  if (error) throw error;
  writeFileSync('catalogo-produtos-359.json', JSON.stringify(data, null, 2));
  console.log('total produtos:', data?.length);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
