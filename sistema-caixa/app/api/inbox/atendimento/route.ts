export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function PATCH(req: NextRequest) {
  const { phone, status, atendente } = await req.json();
  if (!phone || !status) {
    return NextResponse.json({ error: 'phone e status obrigatórios' }, { status: 400 });
  }

  // Demanda 114: registra no histórico só quando é uma troca de verdade
  // (atendente diferente do que já estava, ou a conversa não estava em
  // atendimento ainda) — evita poluir o histórico com re-cliques no mesmo
  // status pelo mesmo operador (ex. o assumir automático da 114 disparando
  // de novo por engano numa conversa que já é dele).
  let precisaRegistrarHistorico = false;
  if (status === 'em_atendimento' && atendente) {
    const { data: atual } = await supabaseAdmin
      .from('jsgrafica_contatos')
      .select('atendente, status_atendimento')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle();
    precisaRegistrarHistorico = !atual || atual.status_atendimento !== 'em_atendimento' || atual.atendente !== atendente;
  }

  const agora = new Date().toISOString();
  const update: Record<string, string | null> = { status_atendimento: status };

  if (status === 'em_atendimento') {
    update.atendente = atendente || null;
    update.atendimento_aberto_em = agora;
    update.atendimento_resolvido_em = null;
  } else if (status === 'resolvido') {
    update.atendimento_resolvido_em = agora;
  } else if (status === 'aberto') {
    update.atendente = null;
    update.atendimento_aberto_em = null;
    update.atendimento_resolvido_em = null;
  }

  const { error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .update(update)
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (precisaRegistrarHistorico) {
    await supabaseAdmin.rpc('jsgrafica_registrar_atendimento', { p_phone: phone, p_operador: atendente });
  }

  // Demanda 321: humano resolvendo também limpa a trava interna da IA (Caminho C).
  // jsgrafica_agente_teste_sessoes.status ficava travado em 'escalada' pra sempre —
  // nada zerava esse campo, nem o humano resolvendo manualmente no Admin (bug real
  // confirmado no telefone 5521965185667, travado desde 19/08 mesmo resolvido várias
  // vezes). 'concluida' é valor de enum já existente, correto semanticamente, e —
  // ponto crítico — diferente de 'escalada', então a flag consultiva
  // ultima_interacao_foi_escalada (lida por workflows 296/297) também para de acusar
  // escalonamento depois disso. Best-effort: não falha a resolução se essa parte der
  // erro, já que o campo principal (status_atendimento) é o que a tela depende.
  if (status === 'resolvido') {
    const { error: erroSessao } = await supabaseAdmin
      .from('jsgrafica_agente_teste_sessoes')
      .update({ status: 'concluida' })
      .eq('telefone', phone);
    if (erroSessao) {
      console.error('Falha ao limpar jsgrafica_agente_teste_sessoes ao resolver', phone, erroSessao.message);
    }
  }

  return NextResponse.json({ success: true });
}
