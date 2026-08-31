// Registra uma mensagem enviada via Z-API no mesmo log que qualquer envio
// manual do Inbox usa (jsgrafica_log_msgs_privadas + jsgrafica_contatos) —
// extraído de app/api/inbox/responder para ser reaproveitado por qualquer
// rota que precise avisar o cliente automaticamente (ex.: avanço de status
// de pedido, demanda 046), sem inventar um caminho novo de logging.

import { supabaseAdmin } from './supabase-admin';

export async function registrarMensagemEnviada(phone: string, mensagem: string, msgId: string, operador?: string | null) {
  const agora = new Date().toISOString();

  await supabaseAdmin.from('jsgrafica_log_msgs_privadas').insert({
    phone,
    message_id: msgId,
    from_me: true,
    message_text: mensagem,
    sent_at: agora,
    data_timestamp: Date.now(),
    from_api: true,
    status: 'sent',
    // Demanda 294: só existe 1 caller hoje (app/api/inbox/responder), sempre equipe
    // digitando no Inbox — se esta função ganhar outro caller automático no futuro,
    // origem vira parâmetro, não fixo.
    enviado_por: 'equipe',
  });

  // Demanda 182: o check-then-insert que morava aqui (SELECT por phone →
  // update ou insert) criou 5 duplicatas reais em 08-09/07 — a causa raiz
  // confirmada com dado real não foi o `.single()` (já trocado na 053), e
  // sim o ERRO do SELECT sendo descartado (`const { data }` sem olhar
  // `error`): uma falha transiente na checagem virava "contato não existe"
  // → INSERT órfão (contact_lid = phone, sem nome), mesmo com a linha
  // original commitada no banco desde muito antes. Agora é um statement
  // ÚNICO e atômico no Postgres (função da migration
  // add_rpc_registrar_envio_contato_182): atualiza TODAS as linhas do phone
  // (cada uma incrementa o próprio contador — a versão antiga clobberava
  // todas com o valor de uma só) e só insere (contact_lid = phone, mesma
  // convenção de sempre pra contato sem @lid conhecido, achado da 046) se
  // NENHUMA existia. Se a chamada falhar, falha inteira — não existe mais o
  // caminho "não achei, então crio".
  const { error } = await supabaseAdmin.rpc('jsgrafica_registrar_envio_contato', {
    p_phone: phone,
    p_agora: agora,
    p_operador: operador || null,
  });
  if (error) {
    // Contador desatualizado é melhor que contato duplicado — só loga.
    console.error('[182] Falha ao registrar envio no contato (contadores ficam pra próxima)', error);
  }
}
