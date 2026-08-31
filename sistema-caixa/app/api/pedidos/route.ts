export const dynamic = 'force-dynamic';
// Demanda 198: teto explícito de duração — a criação de cobrança Pix pode
// esperar até ~11s pelo QR (mercadopago.ts) + latências de rede; declarar o
// limite aqui garante margem segura independente do default do plano Vercel.
export const maxDuration = 25;

import { NextRequest, NextResponse, after } from 'next/server';
import { supabaseAdmin, gravarRascunhosPedido, gerarSaidaAutomaticaNaVenda, cancelarPedido, getPixRecargaPay, idsProdutosRecarga, corrigirNomeContatoSeInvalido, registrarFalhaCobrancaPix, type PixRecargaPay } from '@/lib/supabase-admin';
import { calcularValorPedido, montarMensagensConfirmacaoPedidoMultiplo, type ItemConfirmacaoPedido } from '@/lib/pedidos';
import { criarCobrancaPix, conferirCobrancasPixPendentes } from '@/lib/mercadopago';
import { CATEGORIA_PARA_GRUPO } from '@/lib/dados';

// Demanda 137 (Fase 1) + 139 (Fase 2): valida e normaliza os campos de
// escolha de pagamento/entrega — só captura, nenhuma lógica usa esses
// valores ainda (esteira/cobrança só mudam nas Fases 3-5).
function camposEscolhaPagamento(body: { formaPagamentoEscolhida?: unknown; pagamentoMomento?: unknown; tipoEntregaEscolhido?: unknown }) {
  const forma = body.formaPagamentoEscolhida;
  const momento = body.pagamentoMomento;
  const entrega = body.tipoEntregaEscolhido;
  return {
    forma_pagamento_escolhida:
      forma === 'dinheiro' || forma === 'pix' || forma === 'cartao' ? forma : null,
    pagamento_momento:
      momento === 'agora' || momento === 'retirada' ? momento : null,
    tipo_entrega_escolhido:
      entrega === 'imediata' || entrega === 'retirada' ? entrega : null,
  };
}

// Demanda 179: instrução separada da recarga numa venda MISTA (recarga +
// item comum no Pix) — vai pro popup e pro rascunho junto da cobrança MP.
interface RecargaMistaInfo {
  valor: number;
  pedidoIds: string[];
  chave: string | null;
  titular: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
}

const TIMESTAMP_POR_STATUS: Record<string, string> = {
  em_producao: 'data_producao_at',
  pronto:      'data_pronto_at',
  entregue:    'data_entregue_at',
};

// Mensagem fixa por status (demanda 046) — sem personalização por IA.
// "entregue" não gera aviso: o cliente acabou de retirar, não faz sentido avisá-lo.
const TEMPLATE_POR_STATUS: Record<string, (servico: string) => string> = {
  em_producao: (servico) => `Seu pedido (${servico}) entrou em produção! 🖨️`,
  pronto:      () => `Prontinho! Seu pedido já está pronto pra retirada 😊`,
};

export async function GET(req: NextRequest) {
  try {
    // Demanda 124 (fallback da confirmação automática): confere direto na
    // API do Mercado Pago os pedidos com cobrança Pix ainda pendente (trava
    // de 60s por cobrança) — a confirmação aparece mesmo se o webhook falhar.
    // Demanda 136: saiu do caminho da resposta — antes era `await` ANTES de
    // listar, e qualquer lentidão do MP segurava a listagem inteira. Agora
    // roda via `after()` (depois da resposta enviada; a Vercel mantém a
    // função viva pra isso) — a confirmação continua aparecendo no próximo
    // reload/poll, mesmo comportamento de convergência de sempre.
    after(async () => {
      try { await conferirCobrancasPixPendentes(); }
      catch (e) { console.error('[124] Falha na conferência de cobranças Pix', e); }
    });

    const telefone = req.nextUrl.searchParams.get('telefone');
    // Demanda 136: a listagem trazia a TABELA INTEIRA (`select('*')` sem
    // limite — só cresce, pra sempre) em toda abertura da aba Pedidos e em
    // toda busca de pedido de contato do Inbox. Padrão novo: N mais recentes
    // (500 cobre semanas de operação), com `?limite=` até 2000 pra quem
    // precisar de mais histórico explicitamente.
    const limiteParam = parseInt(req.nextUrl.searchParams.get('limite') ?? '', 10);
    const limite = Number.isFinite(limiteParam) ? Math.min(Math.max(limiteParam, 1), 2000) : 500;
    let query = supabaseAdmin.from('jsgrafica_pedidos').select('*').order('created_at', { ascending: false }).limit(limite);
    if (telefone) query = query.eq('telefone', telefone);

    const { data, error } = await query;
    if (error) throw error;
    // Demanda 219: front precisa saber se cada pedido é recarga (VEM/celular)
    // pra bloquear o botão "Pix" genérico no ModalConfirmarPagamento — mesma
    // checagem por categoria que os pontos de cobrança já usam (147/213),
    // reaproveitada sem alterar `idsProdutosRecarga`.
    const setRecarga = await idsProdutosRecarga((data ?? []).map(p => p.servico_id));
    const pedidos = (data ?? []).map(p => ({
      ...p,
      eh_recarga: !!p.servico_id && setRecarga.has(p.servico_id),
    }));
    return NextResponse.json({ pedidos });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Fluxo "Criar pedido" a partir da conversa no Inbox (demanda 045) —
    // produtoId presente identifica esse caminho: calcula preço/desconto a
    // partir do catálogo em vez de aceitar valor_final direto do cliente.
    // Checagem por `!body.origemBalcao` é obrigatória desde a demanda 104:
    // o balcão passou a mandar `produtoId` também (pra saber que produto
    // checar o flag `gera_saida_automatica`), então só `produtoId` presente
    // não basta mais pra distinguir os 2 fluxos — sem isso, toda venda de
    // balcão cairia aqui em vez de no branch certo abaixo.
    if (body.produtoId && !body.origemBalcao) {
      const {
        telefone, nomeCliente, produtoId, quantidade, valorManual, operador,
        vendaId, finalizarVenda,
      } = body;
      if (!telefone || !operador) {
        return NextResponse.json({ error: 'telefone e operador são obrigatórios' }, { status: 400 });
      }

      const { data: produto } = await supabaseAdmin
        .from('jsgrafica_produtos')
        .select('id, nome, categoria, preco, pagamento_tipo')
        .eq('id', produtoId)
        .eq('ativo', true)
        .single();
      if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

      let calculo;
      if (produto.preco == null) {
        // Requer orçamento manual (ex.: banner/adesivo por metro) — sem preço de
        // tabela pra calcular automaticamente, o atendente informa o combinado.
        const valor = Number(valorManual);
        if (!valor || valor <= 0) {
          return NextResponse.json({ error: 'Informe o valor combinado (produto requer orçamento manual)' }, { status: 400 });
        }
        calculo = { valorUnitario: valor, quantidade: 1, valorTotal: valor, descontoPct: 0, valorFinal: valor };
      } else {
        const qtd = Number(quantidade) || 1;
        const grupo = CATEGORIA_PARA_GRUPO[produto.categoria] || produto.categoria;
        calculo = calcularValorPedido(Number(produto.preco), qtd, grupo);
      }

      const pagamentoTipo = produto.pagamento_tipo || 'pos_producao';
      const precisaPix = pagamentoTipo === 'pre_producao';

      // Chave/titular Pix vêm de jsgrafica_agent_config — mesma tabela/campo
      // já usado em outros lugares do sistema (demanda 062).
      let chavePix: string | null = null;
      let titularPix: string | null = null;
      if (precisaPix) {
        const { data: config } = await supabaseAdmin
          .from('jsgrafica_agent_config')
          .select('chave_pix, titular_pix')
          .eq('ativo', true)
          .maybeSingle();
        chavePix = config?.chave_pix ?? null;
        titularPix = config?.titular_pix ?? null;
      }

      const agora = new Date().toISOString();
      const { data: pedido, error } = await supabaseAdmin.from('jsgrafica_pedidos').insert({
        telefone,
        nome_cliente:          nomeCliente || null,
        servico_id:            produto.id,
        servico_nome:          produto.nome,
        specs:                 { quantidade: calculo.quantidade },
        quantidade:            calculo.quantidade,
        valor_unitario:        calculo.valorUnitario,
        desconto_pct:          calculo.descontoPct,
        valor_total:           calculo.valorTotal,
        valor_final:           calculo.valorFinal,
        pagamento_tipo:        pagamentoTipo,
        requer_comprovante:    precisaPix,
        chave_pix:             precisaPix ? chavePix : null,
        status:                'confirmado',
        jornada_tipo:          'simples',
        pedido_criado_por:     operador,
        confirmado_cliente_at: agora,
        notificado_equipe:     false,
        venda_id:              vendaId ?? null,
        // Demanda 137 (Fase 1): escolha de pagamento capturada na criação —
        // só gravação, nenhum comportamento muda ainda.
        ...camposEscolhaPagamento(body),
      }).select().single();

      if (error) throw error;

      // Demanda 172: mesmo reparo de nome da 167, neste ponto de entrada —
      // contato do telefone sem nome utilizável (vazio/empresa) ganha o
      // nome_cliente do pedido. Best-effort: falha aqui nunca derruba a
      // criação. Obs.: o Inbox manda como nomeCliente o DISPLAY do próprio
      // contato ("Contato privado" quando sem nome) — a função valida o nome
      // de entrada e ignora esses casos; o ganho real é lead_name vazio com
      // push_name bom, que passa a ficar buscável.
      if (nomeCliente) {
        try { await corrigirNomeContatoSeInvalido(telefone, nomeCliente); }
        catch (e) { console.error('[172] Falha ao corrigir nome do contato', e); }
      }

      // Confirmação (+ Pix, se exigir) vira rascunho na caixa de resposta do
      // Inbox (demanda 073) — não envia mais direto ao cliente. Só telefone
      // real vindo do Inbox (pedido de balcão nunca cai aqui, esse branch é
      // só do fluxo "Criar pedido"). Mensagem por template fixo, sem IA;
      // TelaInbox.tsx pré-preenche a caixa de resposta com isso ao abrir a
      // conversa desse telefone.
      //
      // Demanda 076: "Criar pedido" aceita 2+ produtos, compartilhando o
      // mesmo `vendaId` (mesmo padrão do balcão, demanda 066) — o cliente
      // chama este POST 1 vez por item, sequencialmente, e só marca
      // `finalizarVenda` no último. Só nesse último é que a confirmação é
      // montada, buscando todos os itens já gravados com esse `vendaId`
      // (inclusive os das chamadas anteriores) pra virar 1 mensagem só. Sem
      // `vendaId` (fluxo de 1 produto só, como sempre foi), finaliza direto.
      const deveFinalizar = finalizarVenda !== false;
      // Demanda 145: quando uma cobrança Pix real é criada, os dados dela
      // voltam na resposta pro Inbox abrir o popup de QR (mesmo ModalQrPix do
      // balcão) — antes o copia-e-cola ia SÓ pro rascunho e passava batido.
      // O rascunho continua sendo gravado igual (fallback/histórico).
      let cobrancaResposta: {
        orderId: string; qrCode: string; qrCodeBase64: string | null;
        valor: number; erro?: boolean;
        // Demanda 147: popup estático do RecargaPay (recarga com Pix) — sem
        // poll, confirmação manual.
        estatico?: boolean; chave?: string; titular?: string;
        // Demanda 179: venda MISTA — a cobrança MP cobre só os não-recarga;
        // este bloco leva a instrução separada da recarga pro mesmo popup.
        recarga?: RecargaMistaInfo | null;
      } | null = null;
      if (/^\d+$/.test(telefone) && deveFinalizar) {
        let itensConfirmacao: ItemConfirmacaoPedido[];
        // Demanda 147: o gatilho também precisa do id e do produto de cada
        // item — recarga (VEM/celular) nunca entra em cobrança do MP.
        let itensIds: { id: string; servicoId: string | null; valorFinal: number }[];
        if (vendaId) {
          const { data: pedidosVenda } = await supabaseAdmin
            .from('jsgrafica_pedidos')
            .select('id, servico_id, servico_nome, quantidade, valor_final, desconto_pct, pagamento_tipo')
            .eq('venda_id', vendaId);
          itensConfirmacao = (pedidosVenda ?? []).map(p => ({
            servicoNome:   p.servico_nome ?? '',
            quantidade:    Number(p.quantidade) || 1,
            valorFinal:    Number(p.valor_final) || 0,
            descontoPct:   Number(p.desconto_pct) || 0,
            pagamentoTipo: p.pagamento_tipo,
          }));
          itensIds = (pedidosVenda ?? []).map(p => ({
            id: p.id, servicoId: p.servico_id ?? null, valorFinal: Number(p.valor_final) || 0,
          }));
        } else {
          itensConfirmacao = [{
            servicoNome: produto.nome, quantidade: calculo.quantidade,
            valorFinal: calculo.valorFinal, descontoPct: calculo.descontoPct, pagamentoTipo,
          }];
          itensIds = [{ id: pedido.id, servicoId: produto.id, valorFinal: calculo.valorFinal }];
        }

        // Demanda 141 (Fase 3): o gatilho da cobrança Pix deixou de ser o
        // `pagamento_tipo` do produto — quem manda é a ESCOLHA da Fase 1:
        // - 'pix' escolhido → cobrança cobre o TOTAL da venda (qualquer
        //   produto, qualquer momento — inclusive Pix na retirada);
        // - pergunta não respondida (null) → fallback: comportamento antigo
        //   da 124 (só os itens `pre_producao`, mesmo valor de antes);
        // - 'dinheiro'/'cartao' explícito → NENHUMA cobrança (o pagamento
        //   foi combinado por outra via; cartão segue 100% manual).
        const escolhaPagamento = camposEscolhaPagamento(body).forma_pagamento_escolhida;
        const totalVenda = Math.round(itensConfirmacao.reduce((a, i) => a + i.valorFinal, 0) * 100) / 100;
        const itensPreProducao = itensConfirmacao.filter(i => i.pagamentoTipo === 'pre_producao');
        const totalPreProducao = Math.round(itensPreProducao.reduce((a, i) => a + i.valorFinal, 0) * 100) / 100;

        // Demanda 147: recarga VEM/celular com Pix nunca gera cobrança MP —
        // o dinheiro precisa cair no RecargaPay (chave/QR estáticos, cliente
        // digita o valor, confirmação SEMPRE manual — não tem API):
        // - venda 100% recarga → popup/rascunho com o Pix estático do
        //   RecargaPay, zero Mercado Pago;
        // - venda mista → cobrança MP cobre SÓ os itens não-recarga (vínculo
        //   por id); a parte de recarga segue combinada manualmente;
        // - sem recarga → comportamento da 141, intocado.
        const setRecarga = escolhaPagamento === 'pix'
          ? await idsProdutosRecarga(itensIds.map(i => i.servicoId))
          : new Set<string>();
        const itensNaoRecarga = itensIds.filter(i => !i.servicoId || !setRecarga.has(i.servicoId));
        const itensRecarga = itensIds.filter(i => i.servicoId && setRecarga.has(i.servicoId));
        const totalNaoRecarga = Math.round(itensNaoRecarga.reduce((a, i) => a + i.valorFinal, 0) * 100) / 100;
        const totalRecarga = Math.round(itensRecarga.reduce((a, i) => a + i.valorFinal, 0) * 100) / 100;

        let alvoCobranca: { valor: number; cobreTodos: boolean; idsCobertos: string[] | null } | null = null;
        let pixRecargaPay: PixRecargaPay | null = null;
        // Demanda 179: na venda MISTA, a parte da recarga ganha instrução
        // própria (Pix estático do RecargaPay) — antes ficava sem nada.
        let recargaMista: RecargaMistaInfo | null = null;
        if (escolhaPagamento === 'pix') {
          if (itensRecarga.length === 0) {
            alvoCobranca = { valor: totalVenda, cobreTodos: true, idsCobertos: null };
          } else if (itensNaoRecarga.length === 0) {
            pixRecargaPay = await getPixRecargaPay();
            if (!pixRecargaPay) console.error('[147] Config Pix do RecargaPay ausente — recarga fica sem instrução de Pix');
          } else {
            alvoCobranca = { valor: totalNaoRecarga, cobreTodos: false, idsCobertos: itensNaoRecarga.map(i => i.id) };
            const rp = await getPixRecargaPay();
            if (!rp) console.error('[179] Config Pix do RecargaPay ausente — venda mista fica sem instrução da recarga');
            recargaMista = {
              valor: totalRecarga,
              pedidoIds: itensRecarga.map(i => i.id),
              chave: rp?.chave ?? null,
              titular: rp?.titular ?? null,
              qrCode: rp?.payload ?? null,
              qrCodeBase64: rp?.qrBase64 ?? null,
            };
          }
        } else if (escolhaPagamento === null && itensPreProducao.length > 0) {
          // Fallback legado da 124 — recarga é sempre `flexivel`, nunca cai aqui.
          alvoCobranca = { valor: totalPreProducao, cobreTodos: false, idsCobertos: null };
        }

        // Chave/titular estáticos (fallback da mensagem) — busca se ainda não
        // veio do caminho `precisaPix` deste item e vai existir seção de Pix.
        let chavePixFinal = chavePix, titularPixFinal = titularPix;
        if (pixRecargaPay) {
          // Demanda 147: o trecho de Pix do rascunho usa a chave do
          // RecargaPay — o texto de chave estática (062) já pede comprovante,
          // exatamente o fluxo manual desejado.
          chavePixFinal = pixRecargaPay.chave;
          titularPixFinal = pixRecargaPay.titular;
        } else if (alvoCobranca && chavePixFinal == null) {
          const { data: config } = await supabaseAdmin
            .from('jsgrafica_agent_config')
            .select('chave_pix, titular_pix')
            .eq('ativo', true)
            .maybeSingle();
          chavePixFinal = config?.chave_pix ?? null;
          titularPixFinal = config?.titular_pix ?? null;
        }

        // Demanda 124 (mecânica inalterada): cobrança REAL no Mercado Pago,
        // confirmação automática quando o Pix cai. Se a criação falhar (MP
        // fora do ar etc.), a mensagem cai na chave estática (062) com o
        // MESMO valor — o atendimento nunca trava por causa do MP.
        let cobrancaMsg: { copiaECola: string | null; valor: number } | null = null;
        if (pixRecargaPay) {
          // Demanda 147: `copiaECola: null` de propósito — o texto do
          // copia-e-cola do MP promete confirmação automática, que não existe
          // no RecargaPay; o da chave estática pede comprovante (manual).
          cobrancaMsg = { copiaECola: null, valor: totalRecarga };
          cobrancaResposta = {
            orderId: '', qrCode: pixRecargaPay.payload, qrCodeBase64: pixRecargaPay.qrBase64,
            valor: totalRecarga, estatico: true, chave: pixRecargaPay.chave, titular: pixRecargaPay.titular,
          };
        } else if (alvoCobranca) {
          cobrancaMsg = { copiaECola: null, valor: alvoCobranca.valor };
          const inicioTentativaCobranca = Date.now();
          try {
            const cobranca = await criarCobrancaPix({
              valor: alvoCobranca.valor,
              externalReference: String(vendaId ?? pedido.id),
              telefone,
            });
            cobrancaMsg.copiaECola = cobranca.qrCode;
            cobrancaResposta = {
              orderId: cobranca.orderId, qrCode: cobranca.qrCode,
              qrCodeBase64: cobranca.qrCodeBase64, valor: alvoCobranca.valor,
            };
            // Demanda 141: vínculo generalizado — grava `mp_order_id` nos
            // pedidos que a cobrança COBRE de verdade: todos os itens da
            // venda quando o Pix foi escolhido explicitamente; só os
            // `pre_producao` no fallback legado (cobrança parcial — marcar
            // os outros itens confirmaria pagamento que a cobrança não
            // cobre). Era hardcoded `pre_producao` sempre (124).
            // Demanda 147: venda mista com recarga → vínculo por id, só nos
            // itens não-recarga que a cobrança realmente cobre.
            let vinculo = supabaseAdmin.from('jsgrafica_pedidos').update({
              mp_order_id:      cobranca.orderId,
              mp_pix_qr_code:   cobranca.qrCode,
              mp_pix_expira_at: cobranca.expiraEm,
            });
            if (alvoCobranca.idsCobertos) {
              vinculo = vinculo.in('id', alvoCobranca.idsCobertos);
            } else {
              if (!alvoCobranca.cobreTodos) vinculo = vinculo.eq('pagamento_tipo', 'pre_producao');
              vinculo = vendaId ? vinculo.eq('venda_id', vendaId) : vinculo.eq('id', pedido.id);
            }
            const { error: erroVinculo } = await vinculo;
            if (erroVinculo) throw erroVinculo;
          } catch (e) {
            console.error('[141] Falha ao criar cobrança Pix — mensagem cai na chave estática (062)', e);
            // Demanda 220: registro permanente da falha (antes só o
            // console.error acima, perdido depois de um tempo).
            await registrarFalhaCobrancaPix({
              origem:            'pedidos',
              pedidoId:          vendaId ? null : pedido.id,
              vendaId:           vendaId ? String(vendaId) : null,
              telefone:          telefone || null,
              valor:             alvoCobranca.valor,
              erroMensagem:      e instanceof Error ? e.message : String(e),
              tempoDecorridoMs:  Date.now() - inicioTentativaCobranca,
              payloadTentativa:  { externalReference: String(vendaId ?? pedido.id), valor: alvoCobranca.valor, telefone: telefone || null },
            });
            cobrancaMsg.copiaECola = null;
            // Demanda 145: popup de erro só quando o Pix foi escolha
            // explícita do cliente (o atendente estava esperando um QR) — no
            // fallback legado (escolha null, 124) o comportamento continua o
            // de sempre: só o rascunho com a chave estática.
            if (escolhaPagamento === 'pix') {
              cobrancaResposta = { orderId: '', qrCode: '', qrCodeBase64: null, valor: alvoCobranca.valor, erro: true };
            }
          }
        }

        const mensagens = montarMensagensConfirmacaoPedidoMultiplo(itensConfirmacao, chavePixFinal, titularPixFinal, cobrancaMsg);
        // Demanda 179: venda mista — o rascunho ganha uma mensagem extra com
        // o Pix separado da recarga (RecargaPay, confirmação manual com
        // comprovante — não existe confirmação automática lá), e o popup do
        // atendente recebe o mesmo bloco pra mostrar as duas instruções.
        if (recargaMista) {
          const chaveTexto = recargaMista.chave
            ? `📱 Chave (CNPJ): *${recargaMista.chave}*\nTitular: ${recargaMista.titular ?? 'RecargaPay'}\n`
            : '';
          mensagens.push(
            `A parte de recarga é paga num Pix separado 😊\n\n${chaveTexto}💰 Valor: *R$ ${recargaMista.valor.toFixed(2)}*\n\nQuando fizer esse Pix, me manda o comprovante aqui.`,
          );
          if (cobrancaResposta) cobrancaResposta.recarga = recargaMista;
        }
        await gravarRascunhosPedido(telefone, mensagens);
      } else if (!/^\d+$/.test(telefone) && deveFinalizar) {
        // Demanda 238: telefone em formato não numérico (típico de "@lid" —
        // contato do WhatsApp ainda não resolvido pro número real) faz esse
        // `if` inteiro ser pulado — confirmação e Pix nunca são tentados, e
        // isso ficava 100% invisível (nenhum log, nenhum registro em
        // jsgrafica_mercadopago_falhas_cobranca). Achado real: contato novo
        // se autocorrige em minutos (ver jsgrafica_contatos), mas o pedido
        // já criado fica preso no telefone antigo até a varredura diária das
        // 4h (demanda 151) — nesse meio-tempo, ninguém sabia que o Pix nem
        // tinha sido tentado. Não é erro de cobrança (criarCobrancaPix nunca
        // roda) — só torna visível o skip, reaproveitando a mesma tabela
        // (origem 'pedidos', já válida) em vez de criar peça nova de schema.
        console.warn('[238] Pedido criado com telefone não numérico — confirmação/Pix NÃO foram tentados', {
          pedidoId: pedido.id, telefone,
        });
        await registrarFalhaCobrancaPix({
          origem:            'pedidos',
          pedidoId:          vendaId ? null : pedido.id,
          vendaId:           vendaId ? String(vendaId) : null,
          telefone,
          valor:             calculo.valorFinal,
          erroMensagem:      `PIX NÃO FOI TENTADO (não é erro de cobrança — criarCobrancaPix nunca chegou a rodar): telefone em formato não numérico ("${telefone}"), provável @lid ainda não resolvido pro número real. A varredura diária (demanda 151, 04h) corrige jsgrafica_pedidos.telefone, mas não retroage pra tentar o Pix depois.`,
          payloadTentativa:  { telefone },
        });
        // Mesmo critério de visibilidade da demanda 145 (só alerta quando o
        // Pix foi escolha explícita do cliente — no fallback legado o
        // comportamento de sempre é só o rascunho, sem popup) — reaproveita
        // o MESMO sinal (`erro: true`) que já abre o ModalQrPix de aviso na
        // Inbox pra quando `criarCobrancaPix` lança exceção de verdade, zero
        // UI nova.
        if (camposEscolhaPagamento(body).forma_pagamento_escolhida === 'pix') {
          cobrancaResposta = { orderId: '', qrCode: '', qrCodeBase64: null, valor: calculo.valorFinal, erro: true };
        }
      }

      return NextResponse.json({ pedido, cobrancaPix: cobrancaResposta });
    }

    // Fluxo "Pedidos Balcão" (demanda 054 — venda de balcão vira pedido
    // direto, sem passar por jsgrafica_vendas). Uma linha por item do
    // carrinho (mesma granularidade que jsgrafica_vendas já tinha) —
    // instantâneo, por isso já nasce em "entregue" (cliente leva na hora,
    // sem etapa de produção). Substitui o fluxo antigo de "fila de
    // impressão" opcional (que criava uma linha agregada com status
    // diferente) — ficou redundante depois que toda venda já vira pedido.
    //
    // Demanda 066: operador agora escolhe forma de pagamento e se já
    // entregou na hora — deixou de ser sempre "entregue"/pago fixo. `vendaId`
    // vincula todos os itens do mesmo carrinho pra exibição agrupada na aba
    // Pedidos (components/TelaPedidos.tsx), sem mudar a gravação por item.
    if (body.origemBalcao) {
      const {
        telefone, nomeCliente, produtoId, servicoNome, quantidade, valorUnitario, valorTotal, valorFinal, operador,
        formaPagamento, pagamentoConfirmado, statusEntrega, vendaId,
        descontoTipo, descontoValor, descontoPct, descontoMotivo,
        gavetaDestino,
      } = body;
      if (!servicoNome || !operador) {
        return NextResponse.json({ error: 'servicoNome e operador são obrigatórios' }, { status: 400 });
      }
      // Demanda 156 (Fase 5/5, última da jornada): balcão "retira depois"
      // deixou de nascer direto em `aguardando_retirada` — nasce `confirmado`
      // e percorre a MESMA esteira do Inbox (confirmado → em_producao →
      // pronto → aguardando_retirada → entregue), aparecendo de verdade como
      // "em produção"/"pronto" na aba Pedidos, com o gate de pagamento das
      // Fases 4 (154/155) valendo automaticamente. "Leva agora" fica de fora
      // DE PROPÓSITO: venda instantânea, sem etapa de produção real —
      // continua nascendo `entregue`, intocado.
      const status = statusEntrega === 'aguardando_retirada' ? 'confirmado' : 'entregue';
      const agora = new Date().toISOString();
      const { data: pedido, error } = await supabaseAdmin.from('jsgrafica_pedidos').insert({
        telefone:              telefone || 'balcao',
        nome_cliente:          nomeCliente || null,
        // Demanda 104: precisa do produto real (não só o nome livre) pra
        // checar `gera_saida_automatica` na hora de gerar o repasse — entra
        // como null pra "Entrada Avulsa" (produtoId sintético, sem produto
        // de catálogo de verdade por trás), que nunca deve gerar saída.
        servico_id:            (produtoId && !String(produtoId).startsWith('avulso_')) ? produtoId : null,
        servico_nome:          servicoNome,
        quantidade:            quantidade ?? 1,
        valor_unitario:        valorUnitario ?? null,
        // Demanda 105: `valor_total` é o preço de tabela (sem desconto),
        // `valor_final` é o que realmente foi cobrado — nunca perde a
        // informação de que houve desconto (auditoria). Desconto é sempre
        // decisão pontual do operador nesta venda, nunca regra automática.
        valor_total:           valorTotal ?? valorFinal ?? null,
        valor_final:           valorFinal ?? null,
        desconto_pct:          descontoTipo === 'pct'   ? (descontoPct   || 0)    : 0,
        desconto_valor:        descontoTipo === 'valor' ? (descontoValor || null) : null,
        desconto_motivo:       descontoMotivo || null,
        status,
        jornada_tipo:          'simples',
        pedido_criado_por:     operador,
        forma_pagamento:       formaPagamento ?? null,
        // Demanda 196: venda em Dinheiro de quem não tem gaveta própria (o
        // Edvam) diz pra qual gaveta o físico foi — só valores válidos, só
        // quando a forma é Dinheiro; qualquer outra coisa fica null (a
        // gaveta é a do próprio criador, comportamento de sempre).
        gaveta_destino:        (formaPagamento === 'Dinheiro' && (gavetaDestino === 'Zu' || gavetaDestino === 'Gabi'))
                                 ? gavetaDestino : null,
        pagamento_confirmado:  pagamentoConfirmado ?? true,
        // Demanda 164: venda que nasce paga (dinheiro/cartão na hora) grava
        // QUANDO foi paga — a entrada financeira conta por este timestamp
        // (data_entrada_caixa). O INSERT antigo não gravava; o histórico usa
        // o fallback data_entregue_at da coluna gerada.
        pagamento_confirmado_at: (pagamentoConfirmado ?? true) ? agora : null,
        // 'balcao' não é um pagamento_tipo válido (constraint só aceita
        // pre_producao/pos_producao/flexivel) — o antigo fluxo de "fila de
        // impressão" já usava esse valor e por isso nunca conseguia gravar
        // de verdade (achado ao testar a 054; não é regressão desta
        // demanda). Balcão paga na hora, sem etapa de produção separada.
        pagamento_tipo:        'pos_producao',
        confirmado_cliente_at: agora,
        data_entregue_at:      status === 'entregue' ? agora : null,
        venda_id:              vendaId ?? null,
        // Demanda 137 (Fase 1): escolha de pagamento capturada na criação —
        // só gravação, nenhum comportamento muda ainda.
        ...camposEscolhaPagamento(body),
      }).select().single();

      if (error) throw error;

      // Demanda 104: venda já nasce "entregue" (balcão paga na hora, sem
      // etapa de produção) — gera o repasse automático já aqui, não só na
      // transição via PATCH (que só existe pra quem nasce "aguardando_
      // retirada" e é marcado entregue depois). Nunca deixa uma falha aqui
      // derrubar a venda em si — o pedido já foi gravado, o cliente já
      // pagou; um erro no repasse automático fica só no log do servidor.
      if (status === 'entregue') {
        try { await gerarSaidaAutomaticaNaVenda(pedido); }
        catch (e) { console.error('[104] Falha ao gerar repasse automático', e); }
      }

      return NextResponse.json({ pedido });
    }

    return NextResponse.json({ error: 'Corpo inválido: informe produtoId (pedido via conversa) ou origemBalcao (venda de balcão)' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}

// Demanda 165: a confirmação manual pode informar a DATA REAL do recebimento
// (caso Millena Carvalho: Pix pago dias antes, confirmado tarde — sem isso a
// entrada cai no dia do clique e infla o dia errado; pior ainda com a régua
// da 164, que conta entrada pelo pagamento). Regras: 'AAAA-MM-DD', nunca
// futuro; data de HOJE (ou ausente) grava `now()` — comportamento de sempre;
// data passada grava meio-dia daquele dia no fuso de Recife (qualquer hora
// dentro do dia cai na mesma janela do caixa).
function resolverDataPagamento(valor: unknown): { ts: string } | { erro: string } {
  if (typeof valor !== 'string' || !valor.trim()) return { ts: new Date().toISOString() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { erro: 'Data do pagamento inválida (use AAAA-MM-DD)' };
  const hojeRecife = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  if (valor > hojeRecife) return { erro: 'Data do pagamento não pode ser no futuro' };
  if (valor === hojeRecife) return { ts: new Date().toISOString() };
  return { ts: `${valor}T15:00:00.000Z` }; // 12:00 em Recife (UTC-3)
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, vendaId, status, operador, formaPagamento, confirmarPagamento, motivoCancelamento, pagamentoConfirmadoEm, corrigirFormaPagamento, gavetaDestino } = await req.json();

    // Demanda 165: resolvida uma vez, usada pelos DOIS caminhos que
    // confirmam pagamento (confirmarPagamento e o 113 via formaPagamento).
    const dataPagamento = resolverDataPagamento(pagamentoConfirmadoEm);
    if ('erro' in dataPagamento) {
      return NextResponse.json({ error: dataPagamento.erro }, { status: 400 });
    }

    // Demanda 180: correção EXPLÍCITA e auditável da forma de pagamento de
    // um pedido JÁ confirmado (ex. operadora clicou "Dinheiro" mas era Pix).
    // É o único jeito de alterar a forma depois da confirmação — o caminho
    // genérico abaixo passou a nunca sobrescrever. A forma antiga vai pro
    // histórico (pagamento_confirmacoes_historico) ANTES de mudar; timestamp
    // e origem da confirmação original ficam intactos.
    if (corrigirFormaPagamento === true) {
      if (!id || !formaPagamento) {
        return NextResponse.json({ error: 'Informe id e formaPagamento para corrigir' }, { status: 400 });
      }
      const { data: pedidoCorrigir } = await supabaseAdmin
        .from('jsgrafica_pedidos')
        .select('forma_pagamento, pagamento_confirmado, pagamento_confirmado_origem, pagamento_confirmacoes_historico')
        .eq('id', id)
        .single();
      if (!pedidoCorrigir) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
      if (!pedidoCorrigir.pagamento_confirmado) {
        return NextResponse.json({ error: 'Este pedido ainda não tem pagamento confirmado — confirme normalmente' }, { status: 400 });
      }
      if (pedidoCorrigir.forma_pagamento === formaPagamento) {
        return NextResponse.json({ error: `A forma de pagamento já é ${formaPagamento}` }, { status: 400 });
      }
      const historico = Array.isArray(pedidoCorrigir.pagamento_confirmacoes_historico)
        ? pedidoCorrigir.pagamento_confirmacoes_historico : [];
      const { data: corrigido, error: erroCorrigir } = await supabaseAdmin
        .from('jsgrafica_pedidos')
        .update({
          forma_pagamento: formaPagamento,
          pagamento_confirmacoes_historico: [...historico, {
            em:            new Date().toISOString(),
            operador:      operador || 'Sistema',
            acao:          'forma_corrigida',
            de:            pedidoCorrigir.forma_pagamento,
            para:          formaPagamento,
            origem_antiga: pedidoCorrigir.pagamento_confirmado_origem,
          }],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (erroCorrigir) throw erroCorrigir;
      return NextResponse.json({ success: true, pedido: corrigido });
    }

    // Demanda 147: confirmação MANUAL de pagamento sem mexer no status —
    // usada pelo popup do RecargaPay no balcão (o atendente confere o
    // recebimento no app e clica "Confirmar pagamento"). Mesmos campos que a
    // confirmação da 113 grava, origem 'manual'.
    if (confirmarPagamento === true) {
      if (!id && !vendaId) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
      let q = supabaseAdmin.from('jsgrafica_pedidos').update({
        pagamento_confirmado:        true,
        pagamento_confirmado_at:     dataPagamento.ts,
        pagamento_confirmado_origem: 'manual',
        forma_pagamento:             formaPagamento || 'Pix',
        updated_at:                  new Date().toISOString(),
      }).eq('pagamento_confirmado', false).neq('status', 'cancelado');
      q = vendaId ? q.eq('venda_id', vendaId) : q.eq('id', id);
      const { data: confirmados, error: erroConf } = await q.select('id');
      if (erroConf) throw erroConf;
      if (!confirmados || confirmados.length === 0) {
        return NextResponse.json({ error: 'Nenhum pedido pendente de pagamento nessa venda' }, { status: 404 });
      }
      return NextResponse.json({ success: true, confirmados: confirmados.length });
    }

    if ((!id && !vendaId) || !status) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

    // Demanda 112: cancelamento tem lógica própria (reverte a saída
    // automática da 104, se o pedido tinha uma vinculada) — não passa pelo
    // fluxo genérico de status abaixo, que não sabe fazer essa reversão.
    // Demanda 142: aceita também `vendaId` pra cancelar a VENDA inteira
    // (todos os itens, cada um pelo mesmo `cancelarPedido` de sempre) — a
    // tela de QR do balcão (141) conhece a venda, não os ids dos itens.
    if (status === 'cancelado') {
      try {
        if (vendaId && !id) {
          const { data: itens } = await supabaseAdmin
            .from('jsgrafica_pedidos')
            .select('id')
            .eq('venda_id', vendaId)
            .neq('status', 'cancelado');
          if (!itens || itens.length === 0) {
            return NextResponse.json({ error: 'Venda não encontrada ou já cancelada' }, { status: 404 });
          }
          for (const item of itens) {
            await cancelarPedido(item.id, operador || 'Sistema', motivoCancelamento);
          }
          return NextResponse.json({ success: true, cancelados: itens.length });
        }
        const pedido = await cancelarPedido(id, operador || 'Sistema', motivoCancelamento);
        return NextResponse.json({ success: true, pedido });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao cancelar pedido' }, { status: 400 });
      }
    }
    if (!id) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

    const { data: pedidoAntes } = await supabaseAdmin
      .from('jsgrafica_pedidos')
      .select('telefone, servico_nome, pagamento_confirmado, forma_pagamento, pagamento_confirmado_origem, pagamento_confirmacoes_historico')
      .eq('id', id)
      .single();
    if (!pedidoAntes) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });

    // Demanda 154 (Fase 4): gate de pagamento no SERVIDOR — nenhum avanço de
    // status (produção/pronto/entregue) com pagamento não confirmado, a não
    // ser que a requisição venha com `formaPagamento` (que confirma e avança
    // atomicamente — mecanismo da 113, logo abaixo, inalterado). Antes só a
    // UI avisava; um PATCH direto passava batido. Mesmo conjunto de status do
    // gate do front (`STATUS_AVANCO_COM_GATE`, TelaPedidos.tsx) — divergir
    // aqui viraria 400 seco sem modal na tela. Regra unificada, sem exceção
    // por forma de pagamento nem por tipo de pedido (decisão do Edvam,
    // 2026-07-09: "unifica vai facilitar dar mais garantia pra todo fluxo").
    // Demanda 155: `aguardando_retirada` saiu do conjunto — estado de espera,
    // "paga na retirada" chega nele sem pagamento por design (a entrega em si
    // continua travada via `entregue`).
    const STATUS_AVANCO_COM_GATE = ['em_producao', 'pronto', 'entregue'];
    if (STATUS_AVANCO_COM_GATE.includes(status) && !pedidoAntes.pagamento_confirmado && !formaPagamento) {
      return NextResponse.json(
        { error: 'Pagamento ainda não confirmado — confirme a forma de pagamento recebida antes de avançar este pedido.' },
        { status: 400 },
      );
    }

    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    const tsField = TIMESTAMP_POR_STATUS[status];
    if (tsField) update[tsField] = new Date().toISOString();

    // Demanda 113: confirmar a forma de pagamento usada (Dinheiro/Cartão/
    // Pix) na hora de marcar como entregue com pagamento pendente — achado
    // ao implementar: antes dessa mudança, o modal "Pagamento pendente" já
    // existia (demanda 072) mas nunca gravava `pagamento_confirmado` de
    // verdade nesse fluxo (só na criação do pedido de balcão) — confirmar
    // aqui e marcar como pago são a mesma ação, sempre juntas.
    // Demanda 180: este caminho (o "B" da auditoria do PM) podia REESCREVER
    // uma confirmação já feita — trocando inclusive a origem 'mercadopago'
    // (automática) por 'manual' e a data real por outra — sem deixar rastro.
    // Regra nova: pedido já confirmado NUNCA tem os campos de confirmação
    // sobrescritos por aqui. Se a forma mandada for a mesma, é no-op (só o
    // status muda); se for DIFERENTE, a tentativa vai pro histórico
    // auditável (pagamento_confirmacoes_historico) e os campos originais
    // ficam intactos — corrigir forma de verdade é só pelo mecanismo
    // explícito `corrigirFormaPagamento` (acima). O fluxo legítimo não
    // sente: o front só manda formaPagamento quando o modal de pagamento
    // pendente abriu, e ele só abre pra pedido NÃO pago (gate da 154).
    // Demanda 224: sinaliza pro chamador quando a tentativa acima foi
    // bloqueada (silencioso até aqui — o achado da 222 mostrou o Edvam
    // tentando corrigir ped-1367 por este caminho sem nenhum aviso na tela).
    let avisoFormaPagamentoNaoAlterada = false;
    if (formaPagamento) {
      if (pedidoAntes.pagamento_confirmado) {
        if (formaPagamento !== pedidoAntes.forma_pagamento) {
          avisoFormaPagamentoNaoAlterada = true;
          const historico = Array.isArray(pedidoAntes.pagamento_confirmacoes_historico)
            ? pedidoAntes.pagamento_confirmacoes_historico : [];
          update.pagamento_confirmacoes_historico = [...historico, {
            em:             new Date().toISOString(),
            operador:       operador || 'Sistema',
            acao:           'tentativa_bloqueada',
            caminho:        'avanco_status_com_forma',
            status_pedido:  status,
            forma_tentada:  formaPagamento,
            forma_mantida:  pedidoAntes.forma_pagamento,
            origem_mantida: pedidoAntes.pagamento_confirmado_origem,
          }];
        }
      } else {
        update.forma_pagamento = formaPagamento;
        update.pagamento_confirmado = true;
        // Demanda 165: data real do recebimento quando informada (senão, agora).
        update.pagamento_confirmado_at = dataPagamento.ts;
        // Demanda 124: distingue confirmação manual (este fluxo, 113) da
        // automática via Mercado Pago — o card mostra textos diferentes.
        update.pagamento_confirmado_origem = 'manual';
        // Demanda 197: gaveta física que recebeu o dinheiro, quando quem
        // confirma não tem gaveta própria (mesma coluna/critério da 196,
        // agora neste segundo ponto de entrada — confirmação POSTERIOR de
        // pagamento). Revalidado aqui, nunca confia só na UI: só grava com
        // forma Dinheiro e valor 'Zu'/'Gabi'; qualquer outra coisa fica null
        // (a gaveta é a do próprio pedido_criado_por, comportamento de sempre).
        update.gaveta_destino = (formaPagamento === 'Dinheiro' && (gavetaDestino === 'Zu' || gavetaDestino === 'Gabi'))
          ? gavetaDestino : null;
      }
    }

    const { data: pedido, error } = await supabaseAdmin
      .from('jsgrafica_pedidos')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Demanda 104: pedido virou "entregue" agora (era "confirmado" — fluxo
    // Inbox — ou "aguardando_retirada" — balcão que não levou na hora) —
    // gera o repasse automático nesse instante, se o produto estiver
    // marcado. Nunca deixa uma falha aqui derrubar a atualização de status
    // em si (já foi salva com sucesso acima).
    if (status === 'entregue') {
      try { await gerarSaidaAutomaticaNaVenda(pedido); }
      catch (e) { console.error('[104] Falha ao gerar repasse automático', e); }
    }

    // Aviso de status vira rascunho na caixa de resposta do Inbox (demanda
    // 073) — não envia mais direto ao cliente. Só dispara pra telefone real
    // (fila de balcão usa 'balcao' como telefone) e só nos status que têm
    // template definido. Se o status mudar pela aba Pedidos (sem conversa
    // aberta), o rascunho fica pendente e aparece assim que alguém abrir a
    // conversa desse contato no Inbox.
    const template = TEMPLATE_POR_STATUS[status];
    if (template && pedidoAntes.telefone && /^\d+$/.test(pedidoAntes.telefone)) {
      const mensagem = template(pedidoAntes.servico_nome || 'seu pedido');
      await gravarRascunhosPedido(pedidoAntes.telefone, [mensagem]);
    }

    return NextResponse.json({
      success: true,
      pedido,
      // Demanda 224: front mostra aviso quando isso vier true — a forma de
      // pagamento NÃO mudou (pedido já estava confirmado com outra forma);
      // use "🔧 Corrigir forma de pagamento" pra corrigir de verdade.
      avisoFormaPagamentoNaoAlterada: avisoFormaPagamentoNaoAlterada || undefined,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }
}
