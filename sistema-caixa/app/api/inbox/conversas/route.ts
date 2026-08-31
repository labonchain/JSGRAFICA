export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, filtroBuscaContato } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // aberto | em_atendimento | resolvido | null (todos)
  const busca  = searchParams.get('q') || '';
  const arquivados = searchParams.get('arquivados') === 'true'; // false (padrão) = esconde arquivados

  // Busca contatos com última mensagem via subquery
  let query = supabaseAdmin
    .from('jsgrafica_contatos')
    .select(`
      phone,
      lead_name,
      lead_push_name,
      lead_photo,
      data_ultimo_contato,
      status_atendimento,
      atendente,
      atendimento_aberto_em,
      ultima_leitura_admin,
      mensagens_nao_lidas,
      arquivado,
      contact_lid
    `)
    .eq('arquivado', arquivados)
    // Demanda 163: nullsFirst explícito — contato criado pelo BALCÃO (sem
    // conversa, data_ultimo_contato NULL) não pode aparecer no TOPO do Inbox
    // (DESC no Postgres é NULLS FIRST por padrão). Vai pro fim; se um dia o
    // cliente mandar WhatsApp, o pipeline preenche a data e ele sobe.
    .order('data_ultimo_contato', { ascending: false, nullsFirst: false })
    .limit(100);

  if (status) query = query.eq('status_atendimento', status);
  // Demanda 183: texto que PARECE telefone (só dígitos e formatação comum —
  // espaço/traço/parênteses/+/ponto) busca só por `phone`, normalizado pra
  // dígitos — "81 98610-8547" acha o contato gravado como "5581986108547"
  // (a criação já normalizava, a busca não). Busca por NOME segue intocada.
  if (busca) query = query.or(filtroBuscaContato(busca));

  const { data: contatosRaw, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplica por telefone — o mesmo phone pode ter mais de uma linha em
  // jsgrafica_contatos (contact_lid instável, achado da demanda 008). Escolhe
  // como representante quem tiver foto (ou, empatando, o mais recente) e soma
  // os contadores dos duplicados nele. Não mexe no banco — só na exibição
  // (demanda 029).
  type ContatoRow = NonNullable<typeof contatosRaw>[number];
  // Demanda 126: nome tem prioridade sobre foto/recência ao escolher o
  // representante — sem isso, uma linha duplicada sem nome (contact_lid
  // instável, mesmo telefone ganha linha nova) podia virar "a mais recente" e
  // fazer o nome editado manualmente (demanda 082) parecer ter "revertido",
  // quando na verdade continuava salvo na outra linha, só não era mais
  // escolhida pra exibir (causa confirmada com dado real, ver
  // pm/conhecimento/mapa-dados-contato.md).
  function pontuarRepresentante(c: ContatoRow) {
    return (c.lead_name ? 2 : 0) + (c.lead_photo ? 1 : 0);
  }
  const porTelefone = new Map<string, ContatoRow>();
  for (const c of contatosRaw ?? []) {
    const atual = porTelefone.get(c.phone);
    if (!atual) { porTelefone.set(c.phone, c); continue; }
    const preferirNovo =
      pontuarRepresentante(c) > pontuarRepresentante(atual) ||
      (pontuarRepresentante(c) === pontuarRepresentante(atual) &&
       new Date(c.data_ultimo_contato ?? 0).getTime() > new Date(atual.data_ultimo_contato ?? 0).getTime());
    const representante = preferirNovo ? c : atual;
    porTelefone.set(c.phone, {
      ...representante,
      mensagens_nao_lidas: (atual.mensagens_nao_lidas ?? 0) + (c.mensagens_nao_lidas ?? 0),
    });
  }
  const contatos = Array.from(porTelefone.values())
    .sort((a, b) => new Date(b.data_ultimo_contato ?? 0).getTime() - new Date(a.data_ultimo_contato ?? 0).getTime());

  // Busca última mensagem com conteúdo por contato (ignora rows vazios, null vem por último).
  // Mensagens enviadas manualmente às vezes chegam da Z-API com `phone` no
  // formato "@lid" em vez do telefone normal do contato — mesmo evento, outro
  // formato (demanda 038). Por isso a busca também casa por `contact_lid`, e o
  // resultado é remapeado de volta pro telefone normal do contato.
  const phones = contatos.map(c => c.phone);
  const lids = contatos.map(c => c.contact_lid).filter((l): l is string => !!l);
  const lidParaPhone: Record<string, string> = {};
  for (const c of contatos) if (c.contact_lid) lidParaPhone[c.contact_lid] = c.phone;
  const valoresLote = [...phones, ...lids];

  // Demanda 108 (Inbox lento): esta busca fazia Seq Scan + Sort na tabela
  // inteira via `.or()` combinado — medido em ~2,4s, a mais lenta das 2
  // queries pesadas que a rota fazia a cada poll de 5s. Substituída por RPC
  // com DISTINCT ON (mesmo truque de índice das outras funções de lote desta
  // família, demanda 086) — medido em ~61ms.
  //
  // Demanda 284 (Inbox lento/prévia desatualizada de novo, contato de alto
  // volume): o DISTINCT ON acima não escala — qualquer contato com milhares
  // de mensagens (não só o de teste) obriga a ordenar TODO o resultado
  // combinado do lote inteiro (100 contatos) numa sort só, medido em ~1,58s
  // com um contato real de 8.452 mensagens no lote. RPC reescrita com LATERAL
  // (1 busca "top 1 ORDER BY ... LIMIT 1" por valor, usa o índice existente
  // em vez de ordenar tudo junto) — medido em ~80-150ms no mesmo lote.
  // Demanda 284: essa RPC e a de contagem (mais abaixo) são independentes
  // entre si — só dependem do mesmo `valoresLote` — mas rodavam em sequência
  // (um `await` esperando o outro terminar). Disparadas juntas com
  // `Promise.all`, cortando 1 ida-e-volta inteira de rede (~250-400ms neste
  // ambiente) do tempo total da rota a cada carregamento/poll do Inbox.
  const [{ data: ultimas }, { data: contagensRaw }] = phones.length
    ? await Promise.all([
        supabaseAdmin.rpc('jsgrafica_ultima_msg_qualquer_direcao_em_lote', { valores: valoresLote }),
        supabaseAdmin.rpc('jsgrafica_contagem_msgs_em_lote', { valores: valoresLote }),
      ])
    : [{ data: [] }, { data: [] }];

  type UltimaMsg = { valor: string; message_text: string | null; from_me: boolean | null; media_type: string | null; data_timestamp: number | null; sent_at: string | null };
  // Demanda 284: bug de dado separado do de performance acima — a RPC
  // devolve 1 linha por VALOR de busca (telefone E cada contact_lid), então
  // o mesmo contato aparece 2x quando tem mensagens gravadas sob os dois
  // formatos (telefone cru vs @lid, instabilidade conhecida desde a 038/266).
  // A versão antiga ficava com a PRIMEIRA linha vista (ordem alfabética do
  // valor, não recência) — @lid antigo geralmente vem antes do telefone na
  // ordenação, então uma mensagem de dias atrás gravada sob o @lid escondia
  // a mensagem de hoje gravada sob o telefone. Corrigido pra comparar
  // timestamp e ficar sempre com a mais recente das duas.
  const tsDe = (m: UltimaMsg) => m.data_timestamp ?? (m.sent_at ? new Date(m.sent_at).getTime() : 0);
  const mapaUltima: Record<string, UltimaMsg> = {};
  for (const m of (ultimas ?? []) as UltimaMsg[]) {
    const phoneKey = lidParaPhone[m.valor] ?? m.valor;
    const atual = mapaUltima[phoneKey];
    if (!atual || tsDe(m) > tsDe(atual)) mapaUltima[phoneKey] = m;
  }

  // Contagem de Recebidas/Enviadas ao vivo, direto da tabela de log — os
  // campos incrementais em jsgrafica_contatos ficaram desatualizados (não são
  // incrementados em todo caminho do pipeline, ex. mensagem manual da demanda
  // 037). Mesmo filtro phone-ou-contact_lid da subquery acima (demanda 039).
  //
  // Demanda 108 (Inbox lento): a versão antiga buscava as linhas CRUAS
  // (paginando até 30.000 linhas pra cobrir o limite de 1.000/requisição do
  // Supabase, achado da demanda 041) e somava em JS — repetido a cada 5s de
  // polling, ~656ms de scan + rede pra ~7.700 linhas reais. Substituído por
  // agregação no próprio Postgres (`jsgrafica_contagem_msgs_em_lote`, COUNT
  // ... FILTER numa query só) — medido em ~11ms, retornando só ~1 linha
  // por contato em vez das milhares de linhas cruas. (Busca em si já
  // disparada junto com a de última mensagem, ver `Promise.all` acima.)
  type ContagemLote = { valor: string; recebidas: number; enviadas: number };
  const mapaContagem: Record<string, { recebidas: number; enviadas: number }> = {};
  for (const c of (contagensRaw ?? []) as ContagemLote[]) {
    const phoneKey = lidParaPhone[c.valor] ?? c.valor;
    if (!mapaContagem[phoneKey]) mapaContagem[phoneKey] = { recebidas: 0, enviadas: 0 };
    mapaContagem[phoneKey].recebidas += Number(c.recebidas);
    mapaContagem[phoneKey].enviadas  += Number(c.enviadas);
  }

  // Demanda 321: motivo da escalação (Dizu/Alto Toque/guardrail/etc.) só existe
  // hoje em jsgrafica_agente_teste_sessoes.dados_extra.motivo_escalonamento —
  // invisível na tela sem essa busca. Só busca pros contatos que estão
  // realmente 'escalado' agora (normalmente poucos), não todo mundo.
  const phonesEscalados = contatos.filter(c => c.status_atendimento === 'escalado').map(c => c.phone);
  const mapaMotivoEscalonamento: Record<string, string | null> = {};
  if (phonesEscalados.length) {
    const { data: sessoesEscaladas } = await supabaseAdmin
      .from('jsgrafica_agente_teste_sessoes')
      .select('telefone, dados_extra')
      .in('telefone', phonesEscalados);
    for (const s of sessoesEscaladas ?? []) {
      const dadosExtra = s.dados_extra as { motivo_escalonamento?: string } | null;
      mapaMotivoEscalonamento[s.telefone] = dadosExtra?.motivo_escalonamento || null;
    }
  }

  const conversas = contatos.map(c => {
    const ultima = mapaUltima[c.phone];
    // Contato sem nenhum nome disponível (recurso de privacidade "LID" do
    // WhatsApp — nunca manda nome real pra esses casos) mostra "Contato
    // privado" em vez do @lid/telefone cru, até alguém editar manualmente
    // (demanda 082).
    const nomeDisplay = c.lead_name || c.lead_push_name || 'Contato privado';
    const temNome = !!(c.lead_name || c.lead_push_name);

    const naoLidas = c.mensagens_nao_lidas ?? 0;
    const contagem = mapaContagem[c.phone];

    return {
      phone:              c.phone,
      nome:               nomeDisplay,
      temNome,
      foto:               c.lead_photo,
      ultimaMsg:          ultima?.message_text || (ultima?.media_type ? `[${ultima.media_type}]` : ''),
      ultimaMsgDe:        ultima?.from_me ? 'nos' : 'cliente',
      ultimaMsgTs:        ultima?.data_timestamp ?? (ultima?.sent_at ? new Date(ultima.sent_at).getTime() : null),
      dataUltimoContato:  c.data_ultimo_contato,
      totalRecebidas:     contagem?.recebidas ?? 0,
      totalEnviadas:      contagem?.enviadas ?? 0,
      statusAtendimento:  c.status_atendimento || 'aberto',
      atendente:          c.atendente,
      motivoEscalonamento: c.status_atendimento === 'escalado' ? (mapaMotivoEscalonamento[c.phone] ?? null) : null,
      ultimaLeitura:      c.ultima_leitura_admin,
      naoLidas,
      arquivado:          c.arquivado ?? false,
    };
  });

  return NextResponse.json({ conversas });
}

// Cria uma conversa nova (contato ainda não existe) ou retorna a existente —
// usado pelo botão "+" do Inbox. Movido pra rota de API na demanda 024: antes
// era um insert direto via client-side com a chave anônima.
export async function POST(req: NextRequest) {
  const { phone, operador } = await req.json();
  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

  // .single() quebra com erro (descartado silenciosamente) quando o telefone
  // já tem 2+ linhas em jsgrafica_contatos (duplicata conhecida desde a
  // demanda 008/029) — o código caía no `if (!existente)` mesmo com o
  // contato já existindo, inserindo mais uma linha duplicada a cada nova
  // conversa iniciada pra esse telefone (achado da demanda 053, mesma classe
  // de bug do `.single()` em mensagens/route.ts, mas pior aqui: ativamente
  // cria mais duplicata em vez de só esconder mensagem). `.limit(1)` só
  // precisa saber se existe ao menos uma linha.
  const { data: existentes, error: erroBusca } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .select('phone')
    .eq('phone', phone)
    .limit(1);
  // Demanda 182 (mesma classe de bug, outro caminho): checagem que FALHA não
  // pode virar "não existe" → INSERT duplicado. Falhou, devolve erro.
  if (erroBusca) return NextResponse.json({ error: erroBusca.message }, { status: 500 });

  if (!existentes || existentes.length === 0) {
    const { error } = await supabaseAdmin.from('jsgrafica_contatos').insert({
      // Demanda 181: contact_lid é PK NOT NULL sem default — sem preencher,
      // TODO insert deste caminho falhava com 500 (reportado nas 024/045 e
      // confirmado quebrado até hoje; o front não checava res.ok e a criação
      // ficava por conta do primeiro envio de mensagem). Mesmo fallback
      // `contact_lid = phone` do lib/inboxLog.ts e do api/clientes.
      contact_lid: phone,
      phone,
      data_ultimo_contato: new Date().toISOString(),
      total_mensagens_enviadas: 0,
      total_mensagens_recebidas: 0,
      status_atendimento: 'em_atendimento',
      atendente: operador || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, phone });
}
