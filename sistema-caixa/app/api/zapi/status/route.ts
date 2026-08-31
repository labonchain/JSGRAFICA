export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getStatus } from '@/lib/zapi';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const status = await getStatus();

    // Últimos 5 eventos de conexão
    const { data: eventos } = await supabaseAdmin
      .from('jsgrafica_log_eventos_instancias')
      .select('evento, motivo, data_evento, connected, status_reconexao')
      .order('data_evento', { ascending: false })
      .limit(5);

    return NextResponse.json({ status, eventos: eventos ?? [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
