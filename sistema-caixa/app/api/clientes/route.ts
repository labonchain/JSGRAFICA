export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, corrigirNomeContatoSeInvalido, filtroBuscaContato } from '@/lib/supabase-admin';

// Nome de exibição — mesmo critério de app/api/inbox/conversas/route.ts
// (demanda 082): sem lead_name/lead_push_name mostra "Contato privado" em vez
// do @lid/telefone cru.
function nomeDoContato(c: { lead_name: string | null; lead_push_name: string | null }) {
  const nome = c.lead_name || c.lead_push_name || 'Contato privado';
  const temNome = !!(c.lead_name || c.lead_push_name);
  return { nome, temNome };
}

// GET /api/clientes?q=busca&ordenar=nome|ultimo_contato   → lista (demanda 083/086)
// GET /api/clientes?phone=5581...                          → detalhe + histórico de pedidos
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (phone) return detalheCliente(phone);
  return listaClientes(searchParams.get('q') || '', searchParams.get('ordenar') || 'ultimo_contato');
}

// POST /api/clientes → criar contato rápido do BALCÃO (demanda 163): nome
// obrigatório, telefone opcional. Usado pelo "+ Criar novo contato" quando a
// busca de vínculo não acha ninguém — a venda não precisa mais seguir anônima
// só porque o cliente nunca mandou WhatsApp.
// - `contact_lid` é PK NOT NULL sem default: mesmo fallback do
//   lib/inboxLog.ts (contact_lid = phone); sem telefone, um id sintético
//   `balcao-<timestamp>` cumpre o papel nos DOIS campos.
// - `tipo_registro: 'BALCAO'` marca a origem (pipeline WhatsApp usa
//   INDIVIDUAL/GRUPO) — dá pra distinguir depois quem nunca teve conversa.
// - `data_ultimo_contato` fica NULL de propósito: contato de balcão não é
//   conversa — não deve aparecer na lista do Inbox (que ordena por essa
//   coluna, agora com nullsFirst: false). Se o cliente mandar WhatsApp um
//   dia, o pipeline preenche a data e ele entra na lista normalmente.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    // Normaliza o telefone digitado no balcão pro formato da base (só
    // dígitos, com DDI 55) — "81 98610-8547" vira "5581986108547".
    let telefone: string | null = null;
    if (typeof body.telefone === 'string' && body.telefone.trim()) {
      const digitos = body.telefone.replace(/\D/g, '');
      if (digitos.length < 8) {
        return NextResponse.json({ error: 'Telefone inválido — confira o número (ou deixe em branco)' }, { status: 400 });
      }
      telefone = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
    }

    // Telefone que já existe na base → vincula o contato EXISTENTE em vez de
    // criar duplicata (a base já sofre com linhas duplicadas por contact_lid
    // instável — não piorar).
    if (telefone) {
      const { data: existentes } = await supabaseAdmin
        .from('jsgrafica_contatos')
        .select('contact_lid, phone, lead_name, lead_push_name')
        .eq('phone', telefone);
      if (existentes && existentes.length > 0) {
        // Demanda 167 (refatorada na 172 pra função compartilhada): contato
        // sem nome utilizável (vazio ou nome-da-empresa) ganha o nome que a
        // operadora digitou; nome bom nunca é sobrescrito. Mesma regra do
        // "Criar pedido" do Inbox — ver corrigirNomeContatoSeInvalido.
        const nomeCorrigido = await corrigirNomeContatoSeInvalido(telefone, nome);
        if (nomeCorrigido) {
          return NextResponse.json({ contato: { phone: telefone, nome }, jaExistia: true, nomeCorrigido: true });
        }
        return NextResponse.json({
          contato: { phone: existentes[0].phone, nome: nomeDoContato(existentes[0]).nome },
          jaExistia: true,
        });
      }
    }

    const identificador = telefone ?? `balcao-${Date.now()}`;
    const agora = new Date().toISOString();
    const { error } = await supabaseAdmin.from('jsgrafica_contatos').insert({
      contact_lid:   identificador,
      phone:         identificador,
      lead_name:     nome,
      tipo_registro: 'BALCAO',
      criado_em:     agora,
      atualizado_em: agora,
    });
    if (error) throw error;

    return NextResponse.json({ contato: { phone: identificador, nome }, jaExistia: false });
  } catch (error) {
    console.error('[163] Erro ao criar contato rápido do balcão', error);
    return NextResponse.json({ error: 'Erro ao criar o contato' }, { status: 500 });
  }
}

// PATCH /api/clientes → edita aniversário/endereço (demanda 086, entrada manual
// da equipe — não existe fonte automática pra esses dois campos). Nome
// continua editado via PATCH /api/inbox/contato (demanda 082, mesma coluna
// usada pelo n8n) — mantido separado porque aniversário/endereço são conceito
// exclusivo da tela de Clientes, sem equivalente no Inbox.
export async function PATCH(req: NextRequest) {
  const { phone, aniversario, endereco } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });
  if (aniversario === undefined && endereco === undefined) {
    return NextResponse.json({ error: 'informe aniversario e/ou endereco' }, { status: 400 });
  }

  const update: Record<string, string | null> = {};
  if (aniversario !== undefined) update.data_aniversario = aniversario || null;
  if (endereco !== undefined) update.endereco = (endereco ?? '').trim() || null;

  const { error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .update(update)
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, aniversario: update.data_aniversario, endereco: update.endereco });
}

async function listaClientes(busca: string, ordenar: string) {
  let query = supabaseAdmin
    .from('jsgrafica_contatos')
    .select('phone, contact_lid, lead_name, lead_push_name, lead_photo, data_ultimo_contato, status_atendimento, classificacao')
    .eq('arquivado', false)
    .order('data_ultimo_contato', { ascending: false })
    .limit(500);

  // Demanda 183: telefone digitado formatado ("81 98610-8547") acha o
  // contato gravado só com dígitos — mesma regra da rota de conversas do
  // Inbox (filtroBuscaContato); busca por nome segue com o texto cru.
  if (busca) query = query.or(filtroBuscaContato(busca));

  const { data: contatosRaw, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mesma deduplicação por telefone da rota de conversas do Inbox —
  // contact_lid instável faz o mesmo telefone aparecer em mais de uma linha
  // (demanda 029). Fica com a linha de contato mais recente — mas nome tem
  // prioridade sobre recência (demanda 126, mesmo raciocínio de
  // app/api/inbox/conversas/route.ts — ver pm/conhecimento/mapa-dados-contato.md).
  type ContatoRow = NonNullable<typeof contatosRaw>[number];
  function pontuarRepresentante(c: ContatoRow) {
    return (c.lead_name ? 2 : 0) + (c.lead_photo ? 1 : 0);
  }
  const porTelefone = new Map<string, ContatoRow>();
  for (const c of contatosRaw ?? []) {
    const atual = porTelefone.get(c.phone);
    const preferirNovo = !atual
      || pontuarRepresentante(c) > pontuarRepresentante(atual)
      || (pontuarRepresentante(c) === pontuarRepresentante(atual)
          && new Date(c.data_ultimo_contato ?? 0).getTime() > new Date(atual.data_ultimo_contato ?? 0).getTime());
    if (preferirNovo) porTelefone.set(c.phone, c);
  }
  const contatos = Array.from(porTelefone.values());

  // Última mensagem recebida por contato, em lote — demanda 086 pede
  // explicitamente pra não fazer 1 query por contato. Usa a função SQL
  // `jsgrafica_ultima_msg_recebida_em_lote` (DISTINCT ON, 1 única query),
  // casando tanto por `phone` quanto por `contact_lid` (mesma dualidade da
  // demanda 038) e remapeando o resultado de volta pro telefone principal.
  const phones = contatos.map(c => c.phone);
  const lids = contatos.map(c => c.contact_lid).filter((l): l is string => !!l);
  const lidParaPhone: Record<string, string> = {};
  for (const c of contatos) if (c.contact_lid) lidParaPhone[c.contact_lid] = c.phone;

  const { data: ultimasRaw } = phones.length
    ? await supabaseAdmin.rpc('jsgrafica_ultima_msg_recebida_em_lote', { valores: [...phones, ...lids] })
    : { data: [] };

  type UltimaMsgLote = { valor: string; message_text: string | null; media_type: string | null; data_timestamp: number | null; sent_at: string | null };
  const mapaUltimaRecebida: Record<string, UltimaMsgLote> = {};
  for (const m of (ultimasRaw ?? []) as UltimaMsgLote[]) {
    const phoneKey = lidParaPhone[m.valor] ?? m.valor;
    const atual = mapaUltimaRecebida[phoneKey];
    const ts = m.data_timestamp ?? (m.sent_at ? new Date(m.sent_at).getTime() : 0);
    const tsAtual = atual ? (atual.data_timestamp ?? (atual.sent_at ? new Date(atual.sent_at).getTime() : 0)) : -1;
    if (!atual || ts > tsAtual) mapaUltimaRecebida[phoneKey] = m;
  }

  let clientes = contatos.map(c => {
    const ultima = mapaUltimaRecebida[c.phone];
    return {
      phone: c.phone,
      ...nomeDoContato(c),
      foto: c.lead_photo,
      dataUltimoContato: c.data_ultimo_contato,
      statusAtendimento: c.status_atendimento || 'aberto',
      classificacao: c.classificacao,
      ultimaMsgRecebida: ultima?.message_text || (ultima?.media_type ? `[${ultima.media_type}]` : null),
    };
  });

  clientes = ordenar === 'nome'
    ? clientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    : clientes.sort((a, b) => new Date(b.dataUltimoContato ?? 0).getTime() - new Date(a.dataUltimoContato ?? 0).getTime());

  return NextResponse.json({ clientes });
}

async function detalheCliente(phone: string) {
  const { data: linhas, error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .select('phone, contact_lid, lead_name, lead_push_name, lead_email, lead_photo, data_aniversario, endereco, data_primeiro_contato, data_ultimo_contato, status_atendimento, atendente, classificacao, historico_atendimento')
    .eq('phone', phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!linhas || linhas.length === 0) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });

  // Contato pode ter mais de uma linha (contact_lid instável, demanda 029) —
  // nome tem prioridade sobre recência ao escolher a representante (demanda
  // 126, mesmo raciocínio das outras 2 rotas deste arquivo/do Inbox).
  const representante = linhas.reduce((melhor, c) => {
    const pontoC = (c.lead_name ? 2 : 0) + (c.lead_photo ? 1 : 0);
    const pontoMelhor = (melhor.lead_name ? 2 : 0) + (melhor.lead_photo ? 1 : 0);
    if (pontoC !== pontoMelhor) return pontoC > pontoMelhor ? c : melhor;
    return new Date(c.data_ultimo_contato ?? 0).getTime() > new Date(melhor.data_ultimo_contato ?? 0).getTime() ? c : melhor;
  });

  // Contagem de recebidas/enviadas ao vivo, mesmo motivo da rota de conversas
  // do Inbox: os contadores incrementais da tabela ficam desatualizados
  // (demanda 039). Demanda 136: a versão antiga paginava até 30x1.000 linhas
  // CRUAS do log e somava em JS — a mesma classe de problema que a 108 já
  // tinha resolvido no Inbox e nunca foi replicado aqui. Agora usa a MESMA
  // RPC agregada da 108 (`jsgrafica_contagem_msgs_em_lote`, COUNT ... FILTER
  // no Postgres), escopada aos valores deste contato (phone + lids) — volta
  // ~1 linha por valor em vez de milhares.
  const lids = linhas.map(l => l.contact_lid).filter((l): l is string => !!l);
  const { data: contagens } = await supabaseAdmin
    .rpc('jsgrafica_contagem_msgs_em_lote', { valores: [phone, ...lids] });
  type ContagemLote = { valor: string; recebidas: number; enviadas: number };
  const totalRecebidas = ((contagens ?? []) as ContagemLote[]).reduce((a, c) => a + Number(c.recebidas), 0);
  const totalEnviadas  = ((contagens ?? []) as ContagemLote[]).reduce((a, c) => a + Number(c.enviadas), 0);

  const { data: pedidos } = await supabaseAdmin
    .from('jsgrafica_pedidos')
    .select('id, servico_nome, quantidade, valor_final, status, created_at')
    .eq('telefone', phone)
    .order('created_at', { ascending: false });

  const dataPrimeiroContato = linhas
    .map(l => l.data_primeiro_contato)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null;

  return NextResponse.json({
    cliente: {
      phone: representante.phone,
      ...nomeDoContato(representante),
      email: representante.lead_email,
      foto: representante.lead_photo,
      aniversario: representante.data_aniversario,
      endereco: representante.endereco,
      dataPrimeiroContato,
      dataUltimoContato: representante.data_ultimo_contato,
      statusAtendimento: representante.status_atendimento || 'aberto',
      atendente: representante.atendente,
      classificacao: representante.classificacao,
      totalRecebidas,
      totalEnviadas,
      // Demanda 119: histórico de quem assumiu o atendimento migrou do Inbox
      // pra cá — mesma coluna jsonb e mesma função de gravação da demanda
      // 114 (`jsgrafica_registrar_atendimento`), só a exibição mudou de lugar.
      historicoAtendimento: (representante.historico_atendimento ?? []) as { operador: string; em: string }[],
    },
    pedidos: pedidos ?? [],
  });
}
