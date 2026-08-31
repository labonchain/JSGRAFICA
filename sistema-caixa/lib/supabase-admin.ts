import { createClient } from '@supabase/supabase-js';
import { agoraRecife, parseDiaCaixa, limitesDiaCaixaUTC, formatarDiaCaixa, timestampParaDiaCaixa } from './supabase';
import { USUARIOS } from './usuarios';
import { CONTAS_ORIGEM, TAXA_RECARGA_VEM } from './dados';

// ─── Cliente Supabase com service_role — ignora RLS por completo ──────────
// Só pode ser importado por código que roda exclusivamente no servidor
// (rotas de API em app/api/**/route.ts). NUNCA importar este arquivo de um
// componente "use client" — isso colocaria a service_role key no bundle do
// navegador. Por isso ela vive num arquivo separado de `lib/supabase.ts`
// (que é importado pelo Inbox no client e só usa a chave anônima).
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Retry automático em falha transitória de conexão (demanda 270) ───────
// Achado real (2026-08-14, `get_runtime_errors` do Vercel): ~14min de
// instabilidade do lado do Supabase ("upstream connect error or disconnect/
// reset before headers... delayed connect error: 111") derrubaram 7+ rotas.
//
// Achado do CHECKPOINT desta demanda, confirmado lendo o código-fonte
// instalado (`node_modules/@supabase/postgrest-js/dist/index.cjs`, v2.105.1):
// o cliente Supabase JÁ TEM retry automático embutido, ligado por padrão
// (`retryEnabled = true`) — 3 tentativas, backoff exponencial 1s/2s/4s,
// cobre TANTO exceção de rede quanto resposta HTTP 503/520, mas só pra
// métodos idempotentes (GET/HEAD/OPTIONS). Ou seja: a maioria das rotas do
// achado real (leituras: /api/abertura-caixa, /api/conciliacao/pendencias,
// /api/contas-pagar-receber, /api/fechamento, /api/fechamento/diagnostico)
// JÁ GANHA retry de graça, sem nenhum código novo — confirmado com teste
// sintético (mock de fetch), não presumido.
//
// A ÚNICA lacuna real: pra métodos de ESCRITA (POST/PATCH/DELETE/PUT), a
// biblioteca NUNCA tenta de novo, nem numa exceção de rede genuína (conexão
// recusada/resetada ANTES de qualquer resposta chegar) — mesmo sendo o único
// caso 100% seguro de reaplicar (nada foi processado do outro lado, então
// não tem risco de duplicar saída/pedido/transferência). Fecha só essa
// lacuna aqui — não duplica a lógica de leitura que a biblioteca já faz
// melhor (respeita header Retry-After, backoff mais longo). Nunca retry em
// escrita que JÁ recebeu uma resposta HTTP (mesmo 5xx) — não dá pra saber
// se a mutação já foi aplicada antes da resposta se perder.
const RETRY_TENTATIVAS_ESCRITA = 2; // 3 tentativas no total, mesmo teto da leitura nativa
const RETRY_ESPERAS_MS_ESCRITA = [300, 800];
const METODOS_IDEMPOTENTES = ['GET', 'HEAD', 'OPTIONS'];

async function fetchComRetryEmEscritas(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const metodo = (init?.method || 'GET').toUpperCase();
  if (METODOS_IDEMPOTENTES.includes(metodo)) return fetch(input, init);

  let ultimoErro: unknown;
  for (let tentativa = 0; tentativa <= RETRY_TENTATIVAS_ESCRITA; tentativa++) {
    try {
      return await fetch(input, init);
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa === RETRY_TENTATIVAS_ESCRITA) throw erro;
      await new Promise(r => setTimeout(r, RETRY_ESPERAS_MS_ESCRITA[tentativa] ?? 1000));
    }
  }
  throw ultimoErro;
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetchComRetryEmEscritas },
});

// ─── Saldo acumulado do último fechamento registrado ───────────
// Movido de lib/supabase.ts (demanda 024): consulta jsgrafica_fechamento e
// precisa do client admin — nunca é chamado do navegador.
//
// Demanda 092: desde que fechamento por operador existe (074), pode haver
// mais de 1 linha pra mesma `data_dia` — 1 geral (representa o dia inteiro:
// `fechado_por` = `'Sistema'` nas linhas novas, ou `'import'` nas 225 linhas
// históricas migradas da planilha) e 1+ por operador (`fechado_por` = nome
// da pessoa — Gabi, Zu, Edvam —, fechamento parcial do caixa físico dela).
// Sem excluir as linhas por operador, o saldo do dia seguinte virava uma
// loteria de qual linha o Postgres devolvia primeiro num empate de data —
// testado de verdade: pegava o fechamento parcial da Gabi (R$536,49) em vez
// do geral (R$1.168,89). Filtra por exclusão (nome de operador conhecido),
// não por uma lista fixa de valores "gerais" — assim não quebra as 225
// linhas históricas (`'import'`) nem qualquer outro valor não-pessoal que
// venha a existir. Fechamento por operador nunca deve valer como "o saldo
// do dia" pra esse cálculo — mesmo tipo de confusão já achado na demanda 080.
// Distingue fechamento geral (dia inteiro) de fechamento por operador (gaveta
// física pessoal) — mesmo filtro por exclusão usado aqui e em qualquer outro
// lugar que agregue `jsgrafica_fechamento` por dia (ex. histórico do
// Financeiro, demanda 075). Não filtra por SQL `NOT IN`: exclui `NULL`
// silenciosamente (lógica de 3 valores), e existe pelo menos 1 linha
// histórica real com `fechado_por IS NULL` (`03-07-26`, saldo R$557,67) que
// precisa continuar valendo como "geral".
const NOMES_OPERADORES = new Set(USUARIOS.map(u => u.nome));
export function ehFechamentoGeral(fechadoPor: string | null | undefined): boolean {
  return !fechadoPor || !NOMES_OPERADORES.has(fechadoPor);
}

// Demanda 149: `antesDe` opcional (data_dia DD-MM-AA) — o diagnóstico de um
// dia PASSADO precisa do saldo anterior relativo àquele dia, não a hoje.
// Sem o parâmetro, comportamento idêntico ao de sempre (anterior a hoje).
export async function getSaldoAnterior(antesDe?: string): Promise<number> {
  let corte: Date;
  if (antesDe) {
    const ref = parseDiaCaixa(antesDe);
    if (!ref) return 0;
    corte = ref;
  } else {
    corte = agoraRecife(); corte.setHours(0, 0, 0, 0);
  }

  const { data } = await supabaseAdmin
    .from('jsgrafica_fechamento')
    .select('saldo_acumulado, data_dia, fechado_por');

  const maisRecente = (data ?? [])
    .filter(f => ehFechamentoGeral(f.fechado_por))
    .map(f => ({ ...f, dt: parseDiaCaixa(f.data_dia) }))
    .filter((f): f is typeof f & { dt: Date } => f.dt !== null && f.dt < corte)
    .sort((a, b) => b.dt.getTime() - a.dt.getTime())[0];

  return maisRecente?.saldo_acumulado ?? 0;
}

// ─── Selo aberto/fechado + histórico de dias (demanda 099) ─────
// "Fechado hoje" = existe uma linha de fechamento GERAL (não por operador,
// mesmo filtro `ehFechamentoGeral` da 092/075) pra `data_dia` de hoje —
// fechamento por operador não conta como o dia estar fechado, é só a gaveta
// física de uma pessoa.
export async function getStatusFechamentoHoje(dataDia: string): Promise<{ fechado: boolean; fechadoEm: string | null }> {
  const { data } = await supabaseAdmin
    .from('jsgrafica_fechamento')
    .select('fechado_por, fechado_em')
    .eq('data_dia', dataDia);
  const geral = (data ?? []).find(f => ehFechamentoGeral(f.fechado_por));
  return { fechado: !!geral, fechadoEm: geral?.fechado_em ?? null };
}

// Histórico dos últimos N dias de fechamento GERAL (exclui por operador, tira
// a foto mais recente por dia caso haja mais de 1 linha geral improvável —
// ex. 'import' e 'Sistema' no mesmo dia). `data_dia` é texto DD-MM-AA — não
// dá pra ordenar/filtrar por data direto no Postgres (dia vem antes do mês),
// mesmo cuidado já documentado em `parseDiaCaixa`.
export async function getHistoricoFechamento(limite: number = 10) {
  const { data } = await supabaseAdmin
    .from('jsgrafica_fechamento')
    .select('data_dia, fechado_por, total_entradas, total_saidas, saldo_acumulado, divergencia, fechado_em');

  const porDia = new Map<string, { dt: Date } & NonNullable<typeof data>[number]>();
  for (const f of data ?? []) {
    if (!ehFechamentoGeral(f.fechado_por)) continue;
    const dt = parseDiaCaixa(f.data_dia);
    if (!dt) continue;
    const existente = porDia.get(f.data_dia);
    if (!existente || (f.fechado_em ?? '') > (existente.fechado_em ?? '')) {
      porDia.set(f.data_dia, { ...f, dt });
    }
  }

  return Array.from(porDia.values())
    .sort((a, b) => b.dt.getTime() - a.dt.getTime())
    .slice(0, limite)
    .map(({ dt: _dt, ...resto }) => resto);
}

// ─── Fechamentos por operador hoje (demanda 121) ────────────────
// O Admin não tem gaveta própria (só banco/Pix) — quem conta e fecha
// dinheiro/moedas de verdade são Zu e Gabi. Antes desta demanda, o Admin
// precisava somar de cabeça o que cada uma já fechou e digitar o total na
// mão na Contagem física geral; o sistema já tinha esses dois valores
// salvos (linha própria em `jsgrafica_fechamento`, por operador) mas nunca
// mostrava nem somava. Traz o valor REAL contado e submetido por cada
// atendente ao fechar a própria gaveta — não o "esperado" calculado
// (`getTotalDinheiroRecebidoOperador`, usado só pra divergência dela mesma).
export async function getFechamentosOperadoresHoje(dataDia: string) {
  const { data } = await supabaseAdmin
    .from('jsgrafica_fechamento')
    .select('fechado_por, dinheiro, moedas, fechado_em')
    .eq('data_dia', dataDia);

  const atendentes = USUARIOS.filter(u => u.papel === 'atendente');
  return atendentes.map(u => {
    const linha = (data ?? []).find(f => f.fechado_por === u.nome);
    return {
      operador:  u.nome,
      fechou:    !!linha,
      dinheiro:  linha?.dinheiro ?? 0,
      moedas:    linha?.moedas ?? 0,
      fechadoEm: linha?.fechado_em ?? null,
    };
  });
}

// ─── Totais do dia: soma de vendas e saídas ────────────────────
// Desde a demanda 054, venda de balcão não grava mais em jsgrafica_vendas —
// vira pedido direto (jsgrafica_pedidos, status 'entregue'). Sem somar essa
// fonte aqui, o fechamento de caixa (que chama esta função pra calcular
// total_entradas) passaria a registrar entrada zerada/incompleta todo dia a
// partir do deploy da 054 — este é o fix crítico da demanda 055, não só o
// dashboard depende disso, o fechamento de caixa de verdade também.
export async function getResumoDia(dataDia: string, operador?: string) {
  let vendasQuery = supabaseAdmin.from('jsgrafica_vendas').select('total').eq('data_dia', dataDia);
  if (operador) vendasQuery = vendasQuery.eq('operador', operador);

  // Demanda 164: entrada conta pelo DIA DO PAGAMENTO (decisão do Edvam:
// "contar no financeiro tudo que foi recebido independente do status") —
// filtro por `pagamento_confirmado` (cancelado fica fora, regra da 157) e
// janela por `data_entrada_caixa` (coluna gerada no banco:
// pagamento_confirmado_at → data_entregue_at → created_at; o fallback mantém
// os 234 pedidos históricos de balcão sem timestamp nos dias em que já
// contavam).
  let pedidosQuery = supabaseAdmin.from('jsgrafica_pedidos').select('valor_final')
    .eq('pagamento_confirmado', true).neq('status', 'cancelado');
  const limites = limitesDiaCaixaUTC(dataDia);
  if (limites) pedidosQuery = pedidosQuery.gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
  if (operador) pedidosQuery = pedidosQuery.eq('pedido_criado_por', operador);

  // Achado da demanda 101: antes desta correção, saídas nunca eram somadas
  // quando `operador` era informado (só rodava com `!operador`) — inofensivo
  // até agora porque nada no código chamava esta função com `operador` (o
  // fechamento por operador da 074 usa `getTotalSaidasOperador` à parte).
  // Ativar esse parâmetro pra injetar "hoje ao vivo" filtrado por operador no
  // Financeiro (101) exigia essa correção — senão a saída de hoje de um
  // operador apareceria sempre zerada nesse relatório.
  let saidasQuery = supabaseAdmin.from('jsgrafica_saidas').select('valor').eq('data_dia', dataDia);
  if (operador) saidasQuery = saidasQuery.eq('operador', operador);

  // Demanda 223: transferência entre contas (201) já contava como saída na
  // conta de origem (linha acima, categoria `transferencia_entre_contas` em
  // `jsgrafica_saidas`), mas nunca tinha o lado simétrico — o dinheiro que
  // CHEGA na conta de destino nunca contava como entrada, distorcendo
  // `resultado_dia`/`saldo_acumulado` toda vez que a ferramenta é usada
  // (achado real da 222, seção 3.1, R$127 em 17/07). Filtro por `operador`
  // simétrico ao de saídas acima — a coluna existe em `jsgrafica_transferencias`
  // desde a 201.
  let transferenciasQuery = supabaseAdmin.from('jsgrafica_transferencias').select('valor').eq('data_dia', dataDia);
  if (operador) transferenciasQuery = transferenciasQuery.eq('operador', operador);

  // Demanda 231 (achado pré-existente da 226: a tabela foi criada e passou a
  // ser escrita pela classificação de conciliação "Entrada" — demanda 229 —
  // mas nenhuma demanda seguinte somou ela aqui; ficou dinheiro real gravado
  // sem nunca contar em nenhum total, ao vivo ou em fechamento novo).
  // Mesmo padrão simétrico da 223 (transferências): soma direto, sem
  // depender de nenhum outro cálculo.
  let entradasAvulsasQuery = supabaseAdmin.from('jsgrafica_entradas_avulsas').select('valor').eq('data_dia', dataDia);
  if (operador) entradasAvulsasQuery = entradasAvulsasQuery.eq('operador', operador);

  const [vendas, pedidosEntregues, saidas, transferencias, entradasAvulsas] = await Promise.all([vendasQuery, pedidosQuery, saidasQuery, transferenciasQuery, entradasAvulsasQuery]);

  const totalVendas          = (vendas.data ?? []).reduce((acc, r) => acc + Number(r.total), 0);
  const totalPedidos         = (pedidosEntregues.data ?? []).reduce((acc, r) => acc + Number(r.valor_final || 0), 0);
  const totalTransferencias  = (transferencias.data ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);
  const totalEntradasAvulsas = (entradasAvulsas.data ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);
  const totalEntradas        = totalVendas + totalPedidos + totalTransferencias + totalEntradasAvulsas;
  const totalSaidas          = (saidas.data ?? []).reduce((acc, r) => acc + Number(r.valor), 0);

  return { totalEntradas, totalSaidas };
}

// ─── Abertura e fechamento de caixa por operador (demanda 074) ─
// Gabi, Zu e Edvam têm 3 caixas físicos separados — cada um conta o próprio
// dinheiro na abertura do dia e de novo no fechamento. `jsgrafica_abertura_caixa`
// é 1 linha por operador por dia (`unique(data_dia, operador)`), independente
// de `jsgrafica_fechamento` (que já suporta 1 linha geral + 1 por operador
// via `fechado_por`, desde a 079/092).
export async function getAberturaOperador(dataDia: string, operador: string) {
  const { data } = await supabaseAdmin
    .from('jsgrafica_abertura_caixa')
    .select('dinheiro, moedas, total_contado, criado_em')
    .eq('data_dia', dataDia)
    .eq('operador', operador)
    .maybeSingle();
  return data ?? null;
}

export async function salvarAberturaOperador(dataDia: string, operador: string, dinheiro: number, moedas: number) {
  const totalContado = Math.round((dinheiro + moedas) * 100) / 100;
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_abertura_caixa')
    .upsert({ data_dia: dataDia, operador, dinheiro, moedas, total_contado: totalContado }, { onConflict: 'data_dia,operador' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Achado crítico da demanda 080, correção obrigatória na 074 ─
// O fechamento por operador comparava o físico contado (dinheiro+moedas da
// gaveta) contra o total geral de entradas daquele operador (inclui
// cartão/Pix/pedido ainda não confirmado como pago) — só que na gaveta física
// só entra dinheiro de verdade. Isso gerava divergência falsa sempre que
// houvesse venda em cartão/Pix, o caso normal, não exceção (achado real: Gabi
// "devendo" R$373,74 que na verdade eram vendas em cartão/Pix, nunca
// deveriam ter passado pela mão dela). As duas funções abaixo isolam só a
// parte que realmente passa fisicamente pela mão do operador: dinheiro
// recebido e dinheiro pago em saídas — o "esperado" pro fechamento dele é
// abertura + dinheiro recebido − dinheiro pago, nunca o total geral.
// Demanda 200: qual conta física (`conta_origem`/`conta_destino`) corresponde
// à gaveta de cada operador (só Zu/Gabi têm gaveta própria — Edvam não,
// mesmo critério da 196). Reaproveitada dos 2 lados: saída que sai da gaveta
// (200) e, desde a 212, transferência que ENTRA nela.
const CONTA_ORIGEM_POR_OPERADOR: Record<string, string> = { Zu: 'dinheiro_zu', Gabi: 'dinheiro_gabi' };

export async function getTotalDinheiroRecebidoOperador(dataDia: string, operador: string): Promise<number> {
  const limites = limitesDiaCaixaUTC(dataDia);
  // Demanda 164: o dinheiro entra na gaveta no momento do PAGAMENTO, não
  // da entrega — mesma régua nova de entradas (data_entrada_caixa + pago).
  // Demanda 196: quem manda é a GAVETA DE DESTINO quando existe (venda em
  // Dinheiro feita por quem não tem gaveta própria — o Edvam — escolhe pra
  // qual gaveta o físico foi); sem gaveta_destino, vale o criador do pedido
  // como sempre. Causa raiz das gavetas de Zu/Gabi fecharem quase sempre com
  // sobra: o dinheiro que o Edvam recebia ia fisicamente pra gaveta delas
  // mas não entrava no esperado de ninguém (11 de 12 fechamentos positivos).
  let query = supabaseAdmin
    .from('jsgrafica_pedidos')
    .select('valor_final')
    .eq('pagamento_confirmado', true)
    .neq('status', 'cancelado')
    .or(`gaveta_destino.eq.${operador},and(gaveta_destino.is.null,pedido_criado_por.eq.${operador})`)
    .eq('forma_pagamento', 'Dinheiro');
  if (limites) query = query.gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);
  const { data } = await query;
  const totalPedidos = (data ?? []).reduce((acc, r) => acc + Number(r.valor_final || 0), 0);

  // Demanda 212: transferência com DESTINO na gaveta física do operador (ex.
  // Mercado Pago → Dinheiro Gabi) também aumenta o esperado dela — simétrico
  // ao que a saída já faz do lado da origem (200/207/210). Antes o sistema só
  // sabia modelar dinheiro físico virando saldo digital, nunca o caminho
  // contrário. Soma separada de `jsgrafica_transferencias` (contas diferentes
  // de `jsgrafica_pedidos`) — zero risco de contar a mesma transação 2x.
  const contaPropria = CONTA_ORIGEM_POR_OPERADOR[operador];
  let totalTransferencias = 0;
  if (contaPropria) {
    const { data: transferencias } = await supabaseAdmin
      .from('jsgrafica_transferencias')
      .select('valor')
      .eq('data_dia', dataDia)
      .eq('conta_destino', contaPropria);
    totalTransferencias = (transferencias ?? []).reduce((acc, r) => acc + Number(r.valor || 0), 0);
  }

  return totalPedidos + totalTransferencias;
}

export async function getTotalSaidasOperador(dataDia: string, operador: string): Promise<number> {
  const contaPropria = CONTA_ORIGEM_POR_OPERADOR[operador];
  let query = supabaseAdmin
    .from('jsgrafica_saidas')
    .select('valor')
    .eq('data_dia', dataDia)
    .eq('operador', operador);
  query = contaPropria
    ? query.or(`conta_origem.is.null,conta_origem.eq.${contaPropria}`)
    : query.is('conta_origem', null);
  const { data } = await query;
  return (data ?? []).reduce((acc, r) => acc + Number(r.valor), 0);
}

// Demanda 218: a feature "pendências entre contas" (201, remendada na 214)
// saiu do ar de vez — a premissa não batia com a operação real da gráfica
// (dinheiro físico nunca "precisa" virar saldo digital vinculado a uma
// venda específica; reabastecer conta digital é sempre evento isolado e
// periódico; movimentações grandes entre contas acontecem fora do sistema,
// direto no banco/app, sem nenhum reflexo aqui). A função
// `listarPendenciasContaOrigem` que existia aqui foi removida por completo
// (não só a UI) — `conta_origem` na saída (200/210) e a Transferência entre
// Contas (201) em si continuam funcionando normalmente, só o painel que
// interpretava esses dados como "pendência a resolver" é que saiu.

// ─── Repasse automático na hora da venda (demanda 104) ─────────
// Substitui o mecanismo agregado da 079 (`gerarSaidaRecargaVemAutomatica`,
// que somava tudo e lançava 1 saída só no fechamento geral) — o Edvam
// decidiu mudar pra por-transação: toda venda de um produto marcado
// `gera_saida_automatica` (jsgrafica_produtos, demanda 107) já gera a saída
// de repasse correspondente no instante em que o pedido vira "entregue",
// sem esperar o fechamento, usando `preco_custo` (095) × quantidade como
// valor do repasse. Demanda 213: recarga (VEM/celular) SAIU deste mecanismo
// de vez — nunca teve "repasse desta venda" de verdade (reabastecer o
// RecargaPay é sempre manual e periódico, Transferência entre Contas, 201).
//
// Idempotente por natureza: dispara 1x, no evento discreto de POST/PATCH
// que muda o pedido pra "entregue" — nunca escaneia pedidos antigos em
// lote, então não reprocessa nem duplica nada que já tinha sido coberto
// pelo mecanismo antigo antes do deploy (conferido: os 2 pedidos reais de
// recarga já existentes já tinham `saida_vinculada_id` preenchido pela
// 079). A checagem de `saida_vinculada_id` abaixo é uma segunda trava, pro
// caso de o mesmo pedido passar por aqui 2x por algum motivo.
export async function gerarSaidaAutomaticaNaVenda(pedido: {
  id: string;
  servico_id: string | null;
  quantidade: number | null;
  valor_final: number | null;
  pedido_criado_por: string | null;
  data_entregue_at: string | null;
  saida_vinculada_id: string | null;
  forma_pagamento: string | null;
}) {
  if (pedido.saida_vinculada_id) return { criada: false as const, motivo: 'ja_vinculado' as const };
  // Demanda 211: Pix RecargaPay (199) cai direto na conta do RecargaPay — o
  // "lucro" da recarga já fica sentado lá sozinho, nunca passa pela mão de
  // quem vendeu. Gerar o repasse automático aqui seria uma saída FANTASMA,
  // descontando o esperado de dinheiro físico dela por um valor que nunca
  // saiu de lá de verdade (achado real: ped-1173, R$12,50 de repasse
  // indevido na gaveta da Gabi, apagado manualmente pelo PM). Checagem
  // ANTES de olhar produto/categoria — vale pra qualquer produto que algum
  // dia seja pago com essa forma, não só recarga VEM.
  if (pedido.forma_pagamento === 'Pix RecargaPay') {
    return { criada: false as const, motivo: 'pago_direto_recargapay' as const };
  }
  if (!pedido.servico_id) return { criada: false as const, motivo: 'sem_produto' as const };

  const { data: produto } = await supabaseAdmin
    .from('jsgrafica_produtos')
    .select('categoria, preco_custo, gera_saida_automatica')
    .eq('id', pedido.servico_id)
    .maybeSingle();
  if (!produto) return { criada: false as const, motivo: 'produto_nao_marcado' as const };

  // Demanda 213 (corrige o entendimento original da 188/128): o conceito de
  // "repasse desta venda" nunca existiu de verdade pra recarga (VEM ou
  // celular). Só 3 caminhos reais: Pix RecargaPay (já bloqueado acima, 211,
  // antes até de chegar aqui); Dinheiro/Cartão viram receita normal — a
  // recarga em si é feita com o saldo que já existe no RecargaPay (repasses
  // manuais anteriores + comissão acumulada), sem ligação nenhuma com esta
  // venda específica. Reabastecer o RecargaPay é sempre manual e periódico
  // (Transferência entre Contas, 201), nunca por-venda. Achado real do PM:
  // 9 saídas fictícias (R$175,00) geradas por este mecanismo desde 09/07,
  // responsáveis por quase toda a divergência de vários fechamentos.
  if (CATEGORIAS_RECARGA.includes(produto.categoria)) {
    return { criada: false as const, motivo: 'recarga_sem_repasse_automatico' as const };
  }

  // Generalização pra produtos além de recarga (ex. "Serviço terceirizado",
  // ainda não marcado `true` por decisão do 02-DADOS/107 — nenhum produto
  // real passa por este ramo hoje, fica pronto pra quando o Edvam marcar
  // um) — único ramo que resta depois da recarga sair do mecanismo (213).
  if (!produto.gera_saida_automatica) {
    return { criada: false as const, motivo: 'produto_nao_marcado' as const };
  }

  const quantidade  = Number(pedido.quantidade) || 1;
  const dataDia     = pedido.data_entregue_at ? timestampParaDiaCaixa(pedido.data_entregue_at) : formatarDiaCaixa();
  const operador    = pedido.pedido_criado_por || 'Sistema';

  // Sem preço de custo cadastrado, não tem base pra calcular — não gera
  // saída de R$0,00 sem sentido, só não faz nada.
  if (produto.preco_custo == null) return { criada: false as const, motivo: 'sem_preco_custo' as const };
  const valor: number = Math.round(Number(produto.preco_custo) * quantidade * 100) / 100;
  const categoriaId = 'fornecedores';
  const descricao = `Repasse automático na hora da venda (custo do produto × ${quantidade})`;

  const { data: categoria } = await supabaseAdmin
    .from('jsgrafica_categorias_saida')
    .select('nome')
    .eq('id', categoriaId)
    .maybeSingle();

  const { data: saida, error } = await supabaseAdmin
    .from('jsgrafica_saidas')
    .insert({
      data_dia:       dataDia,
      operador,
      categoria_id:   categoriaId,
      categoria_nome: categoria?.nome ?? categoriaId,
      valor,
      quantidade,
      descricao,
    })
    .select()
    .single();

  if (error || !saida) throw error ?? new Error('Falha ao gerar saída de repasse automático');

  await supabaseAdmin
    .from('jsgrafica_pedidos')
    .update({ saida_vinculada_id: saida.id })
    .eq('id', pedido.id);

  return { criada: true as const, valor, saidaId: saida.id };
}

// ─── Cancelar pedido/venda (demanda 112) ───────────────────────
// Não existia cancelamento em nenhuma tela — nem pro Admin (achado ao vivo:
// Edvam tentou apagar um pedido de teste e não conseguiu). Cancelar só muda
// o `status` pra 'cancelado' (já é um valor válido na constraint) — todo
// cálculo que soma por `status: 'entregue'` (getResumoDia, dashboard,
// entradas, forma de pagamento) já exclui automaticamente, sem precisar de
// nenhum filtro novo, já que 'cancelado' nunca é 'entregue'. O único cuidado
// real é reverter a saída automática da 104, se o pedido já tinha gerado
// uma (`saida_vinculada_id`) — senão fica uma saída "fantasma" sem a venda
// que a originou. Precisa nulificar a referência ANTES de apagar a saída: a
// FK (`jsgrafica_pedidos_saida_vinculada_id_fkey`) não tem `ON DELETE`,
// apagar primeiro violaria a constraint.
// Demanda 157: `motivo` opcional — usado pelo cancelamento de pedido já
// ENTREGUE ('Cancelamento' ou 'Devolução/Reembolso'), rastreabilidade de
// dinheiro que já tinha sido contado. Fluxos antigos seguem sem motivo (null).
export async function cancelarPedido(id: string, operador: string, motivo?: string | null) {
  const { data: pedido, error: erroBusca } = await supabaseAdmin
    .from('jsgrafica_pedidos')
    .select('status, saida_vinculada_id')
    .eq('id', id)
    .single();
  if (erroBusca || !pedido) throw erroBusca ?? new Error('Pedido não encontrado');
  if (pedido.status === 'cancelado') throw new Error('Pedido já está cancelado');

  const saidaParaApagar = pedido.saida_vinculada_id;

  const { data: atualizado, error } = await supabaseAdmin
    .from('jsgrafica_pedidos')
    .update({
      status:              'cancelado',
      cancelado_em:        new Date().toISOString(),
      cancelado_por:       operador,
      motivo_cancelamento: motivo ?? null,
      saida_vinculada_id:  null,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !atualizado) throw error ?? new Error('Falha ao cancelar pedido');

  if (saidaParaApagar) {
    await supabaseAdmin.from('jsgrafica_saidas').delete().eq('id', saidaParaApagar);
  }

  return atualizado;
}

export interface BucketFormaPagamento {
  forma: string;
  bruto: number;
  taxaPct: number;
  taxaValor: number;
  liquido: number;
  contaNome: string | null;
}

// ─── Discriminação do dia por forma de pagamento (demanda 077) ─
// Fechar Caixa hoje só mostra o bruto total (getResumoDia) — aqui é o
// detalhamento por forma de pagamento (dinheiro/cartão/Pix/paga na retirada),
// já descontando a taxa da conta bancária configurada como padrão pra cada
// forma (cartão/Pix). Só cobre `jsgrafica_pedidos` — é a única fonte com
// `forma_pagamento` (campo criado na demanda 066); `jsgrafica_vendas`
// (histórico anterior) nunca teve esse campo, então entra num bucket à
// parte ("Histórico sem forma registrada") em vez de ser somado errado em
// "Dinheiro". "Paga na retirada" não tem taxa calculada agora — o método
// real só se confirma quando o pedido é retirado, ainda sem essa etapa no
// fluxo (fora do escopo desta demanda).
export async function getResumoPorFormaPagamento(dataDia: string) {
  const limites = limitesDiaCaixaUTC(dataDia);

  // Demanda 164: mesma régua nova de entradas (pago + data_entrada_caixa).
  let pedidosQuery = supabaseAdmin
    .from('jsgrafica_pedidos')
    .select('forma_pagamento, valor_final')
    .eq('pagamento_confirmado', true)
    .neq('status', 'cancelado');
  if (limites) pedidosQuery = pedidosQuery.gte('data_entrada_caixa', limites.inicio).lt('data_entrada_caixa', limites.fim);

  const [{ data: pedidos }, { data: vendas }, { data: contas }] = await Promise.all([
    pedidosQuery,
    supabaseAdmin.from('jsgrafica_vendas').select('total').eq('data_dia', dataDia),
    supabaseAdmin.from('jsgrafica_contas_bancarias').select('nome, taxa_cartao_pct, taxa_pix_pct, padrao_cartao, padrao_pix').eq('ativo', true),
  ]);

  const contaCartao = (contas ?? []).find(c => c.padrao_cartao) ?? null;
  const contaPix     = (contas ?? []).find(c => c.padrao_pix) ?? null;

  const brutoPorForma: Record<string, number> = {};
  for (const p of pedidos ?? []) {
    const forma = p.forma_pagamento || 'Não informado';
    brutoPorForma[forma] = (brutoPorForma[forma] ?? 0) + Number(p.valor_final || 0);
  }

  function montarBucket(forma: string, bruto: number, taxaPct: number, contaNome: string | null): BucketFormaPagamento {
    const taxaValor = Math.round(bruto * (taxaPct / 100) * 100) / 100;
    return { forma, bruto, taxaPct, taxaValor, liquido: Math.round((bruto - taxaValor) * 100) / 100, contaNome };
  }

  const buckets: BucketFormaPagamento[] = [];
  if (brutoPorForma['Dinheiro'])          buckets.push(montarBucket('Dinheiro', brutoPorForma['Dinheiro'], 0, null));
  if (brutoPorForma['Cartão'])            buckets.push(montarBucket('Cartão', brutoPorForma['Cartão'], contaCartao?.taxa_cartao_pct ?? 0, contaCartao?.nome ?? null));
  if (brutoPorForma['Pix'])               buckets.push(montarBucket('Pix', brutoPorForma['Pix'], contaPix?.taxa_pix_pct ?? 0, contaPix?.nome ?? null));
  // Demanda 199: Pix estático do RecargaPay (recarga VEM/celular) — não é
  // dinheiro físico nem o Pix do Mercado Pago (sem taxa/conta configurável
  // aqui, o dinheiro cai direto na conta digital do RecargaPay). Sem este
  // bucket, esses pedidos ficavam fora do `totalLiquido` desta discriminação
  // mesmo já contando em `totalEntradas` do fechamento geral (getResumoDia)
  // — divergência silenciosa entre as duas telas.
  if (brutoPorForma['Pix RecargaPay'])    buckets.push(montarBucket('Pix RecargaPay', brutoPorForma['Pix RecargaPay'], 0, null));
  if (brutoPorForma['Paga na retirada'])  buckets.push(montarBucket('Paga na retirada (pendente)', brutoPorForma['Paga na retirada'], 0, null));
  if (brutoPorForma['Não informado'])     buckets.push(montarBucket('Não informado (pedido via Inbox)', brutoPorForma['Não informado'], 0, null));

  const totalVendasHistorico = (vendas ?? []).reduce((acc, v) => acc + Number(v.total), 0);
  if (totalVendasHistorico > 0) buckets.push(montarBucket('Histórico sem forma registrada', totalVendasHistorico, 0, null));

  const totalLiquido = buckets.reduce((acc, b) => acc + b.liquido, 0);

  return { buckets, totalLiquido };
}

// ─── Rascunhos de mensagem de pedido (demanda 073) ─────────────
// As mensagens automáticas de pedido (confirmação/Pix da 062, avisos de
// status da 046) pararam de ser enviadas direto ao cliente — depois de ver
// isso acontecer com um cliente real sem revisão humana, o Edvam corrigiu a
// intenção: gerar o texto pronto na caixa de resposta do Inbox (mesmo
// princípio da sugestão de IA, demanda 048), a equipe decide se edita e
// manda. Um telefone pode acumular mais de 1 rascunho (ex.: pedido avançou
// de status 2x antes de alguém abrir a conversa) — por isso fica numa
// tabela própria em vez de uma coluna única, e os textos são concatenados
// em ordem na hora de exibir.
export async function gravarRascunhosPedido(telefone: string, mensagens: string[]) {
  if (mensagens.length === 0) return;
  await supabaseAdmin.from('jsgrafica_rascunhos_pedido').insert(
    mensagens.map(mensagem => ({ telefone, mensagem }))
  );
}

export async function buscarRascunhoPedido(telefone: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('jsgrafica_rascunhos_pedido')
    .select('mensagem')
    .eq('telefone', telefone)
    .order('created_at', { ascending: true });
  if (!data || data.length === 0) return null;
  return data.map(r => r.mensagem).join('\n\n');
}

export async function limparRascunhoPedido(telefone: string) {
  await supabaseAdmin.from('jsgrafica_rascunhos_pedido').delete().eq('telefone', telefone);
}

// ─── Contas a Pagar/Receber (demanda 096) ──────────────────────
// Cadastro de obrigações futuras — só o Admin usa (confirmado com o Edvam,
// PDV nunca lança nem vê conta futura). Dar baixa gera o lançamento real
// (Saída se `pagar`, Entrada se `receber`) e vincula o id na própria linha —
// mesmo padrão de "gerar automático + vincular id" já usado na Recarga VEM
// (demanda 079), só que disparado pela baixa manual, não pelo fechamento.
export interface ContaPagarReceber {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  tipo: 'pagar' | 'receber';
  vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado';
  recorrente: boolean;
  frequencia: string | null;
  saida_vinculada_id: string | null;
  venda_vinculada_id: string | null;
  pedido_vinculado_id: string | null;
  operador: string;
  created_at: string;
  updated_at: string;
}

// `categoria_id` de jsgrafica_saidas não é FK (é texto livre, ver 095) — só
// precisa de um valor estável e legível, não de um slug perfeito sem acento.
function categoriaParaSlug(categoria: string): string {
  return categoria.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'geral';
}

// "Atrasado" é calculado na leitura (vencimento < hoje e ainda pendente) —
// não precisa de job/cron atualizando um valor gravado, nunca fica
// desatualizado.
export async function listarContasPagarReceber(): Promise<ContaPagarReceber[]> {
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .select('*')
    .order('vencimento', { ascending: true });
  if (error) throw error;

  const hoje = agoraRecife(); hoje.setHours(0, 0, 0, 0);
  return (data ?? []).map(c => {
    const vencimento = new Date(c.vencimento + 'T00:00:00');
    const status = c.status === 'pendente' && vencimento < hoje ? 'atrasado' as const : c.status;
    return { ...c, status };
  });
}

export async function criarContaPagarReceber(input: {
  nome: string; valor: number; categoria: string; tipo: 'pagar' | 'receber';
  vencimento: string; recorrente: boolean; operador: string;
  // Demanda 125: semanal além de mensal (caso real: pagamento semanal da
  // Gabi, antes contornado com 4 lançamentos manuais por mês). Default
  // mensal preserva todas as chamadas antigas.
  frequencia?: 'semanal' | 'mensal';
}): Promise<ContaPagarReceber> {
  const { data, error } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .insert({
      nome:        input.nome,
      valor:       input.valor,
      categoria:   input.categoria,
      tipo:        input.tipo,
      vencimento:  input.vencimento,
      recorrente:  input.recorrente,
      frequencia:  input.recorrente ? (input.frequencia ?? 'mensal') : null,
      operador:    input.operador,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Falha ao criar conta');
  return data;
}

// Demanda 125 — editar conta ainda não paga (nome/valor/categoria/vencimento).
// Conta já paga NUNCA é editável por aqui: o valor dela já virou uma Saída/
// Entrada real na baixa (saida_vinculada_id/pedido_vinculado_id) — editar
// depois faria o compromisso divergir do rastro real do caixa.
export async function editarContaPagarReceber(id: string, campos: {
  nome?: string; valor?: number; categoria?: string; vencimento?: string;
}): Promise<ContaPagarReceber> {
  const { data: conta } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (!conta) throw new Error('Conta não encontrada');
  if (conta.status === 'pago') throw new Error('Conta já paga/recebida não pode ser editada');

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (campos.nome !== undefined)       update.nome = campos.nome;
  if (campos.valor !== undefined)      update.valor = campos.valor;
  if (campos.categoria !== undefined)  update.categoria = campos.categoria;
  if (campos.vencimento !== undefined) update.vencimento = campos.vencimento;

  const { data, error } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Falha ao editar conta');
  return data;
}

// Demanda 125 — cancelar conta ainda não paga. **Decisão documentada:
// DELETE real, não status 'cancelado'** — um status novo vazaria em todos
// os leitores que filtram `status !== 'pago'` (o card "Saídas previstas" da
// 123 mostraria conta cancelada como pendente) e nos filtros da própria
// tela; mesmo racional da 130 pra saídas. Conta pendente não tem vínculo
// nenhum ainda (saida/pedido só nascem na baixa), então apagar não deixa
// órfão. Conta paga não passa por aqui — o rastro real do caixa fica.
export async function cancelarContaPagarReceber(id: string): Promise<void> {
  const { data: conta } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (!conta) throw new Error('Conta não encontrada');
  if (conta.status === 'pago') throw new Error('Conta já paga/recebida não pode ser cancelada');

  const { error } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Só cobre frequência mensal (único caso real citado pelo Edvam, ver 095) —
// `new Date` já rola sozinho pro mês seguinte em overflow de dia (ex. 31 de
// um mês curto), aceitável pro caso real (aluguel, sempre mesmo dia do mês).
function proximoVencimentoMensal(vencimento: string): string {
  const [ano, mes, dia] = vencimento.split('-').map(Number);
  const proxima = new Date(ano, mes - 1 + 1, dia);
  const yyyy = proxima.getFullYear();
  const mm = String(proxima.getMonth() + 1).padStart(2, '0');
  const dd = String(proxima.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Demanda 125 — frequência semanal (soma 7 dias), mesmo padrão da mensal.
// Caso real: pagamento semanal da Gabi, antes lançado 4x por mês na mão.
function proximoVencimentoSemanal(vencimento: string): string {
  const [ano, mes, dia] = vencimento.split('-').map(Number);
  const proxima = new Date(ano, mes - 1, dia + 7);
  const yyyy = proxima.getFullYear();
  const mm = String(proxima.getMonth() + 1).padStart(2, '0');
  const dd = String(proxima.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Demanda 166: `opts` controla a proteção contra saída duplicada — caso real
// da Gabi (13/07): salário pago e lançado como saída manual na sexta, baixa
// formal só na segunda → o sistema criava uma SEGUNDA saída de R$350 sem
// perguntar. Agora a baixa de conta a pagar procura saídas parecidas (mesmo
// valor, últimos 15 dias, ainda não vinculadas a outra conta) e devolve o
// conflito pra UI decidir: vincular à existente (`vincularSaidaId`), criar
// mesmo assim (`ignorarSaidaExistente`) ou desistir. Aviso, nunca bloqueio.
export interface SaidaParecida {
  id: string; data_dia: string; valor: number; categoria_nome: string;
  descricao: string | null; operador: string;
}

export async function darBaixaContaPagarReceber(
  id: string,
  operador: string,
  opts?: { ignorarSaidaExistente?: boolean; vincularSaidaId?: string },
) {
  const { data: conta, error: erroConta } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .select('*')
    .eq('id', id)
    .single();
  if (erroConta || !conta) throw erroConta ?? new Error('Conta não encontrada');
  if (conta.status === 'pago') throw new Error('Conta já está paga/recebida');

  const update: Record<string, unknown> = { status: 'pago', updated_at: new Date().toISOString() };

  if (conta.tipo === 'pagar' && opts?.vincularSaidaId) {
    // Demanda 166: o pagamento JÁ tinha saída manual — só vincula, sem criar
    // segunda saída (mesma correção que o PM fez na mão no caso da Gabi).
    const { data: saidaExistente } = await supabaseAdmin
      .from('jsgrafica_saidas')
      .select('id, valor')
      .eq('id', opts.vincularSaidaId)
      .maybeSingle();
    if (!saidaExistente) throw new Error('Saída escolhida não encontrada');
    update.saida_vinculada_id = saidaExistente.id;
  } else if (conta.tipo === 'pagar') {
    if (!opts?.ignorarSaidaExistente) {
      // Procura saída parecida: mesmo valor, lançada nos últimos 15 dias e
      // ainda não vinculada a nenhuma outra conta paga.
      const corte = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString();
      const [{ data: candidatas }, { data: jaVinculadas }] = await Promise.all([
        supabaseAdmin
          .from('jsgrafica_saidas')
          .select('id, data_dia, valor, categoria_nome, descricao, operador')
          .eq('valor', conta.valor)
          .gte('created_at', corte),
        supabaseAdmin
          .from('jsgrafica_contas_pagar_receber')
          .select('saida_vinculada_id')
          .not('saida_vinculada_id', 'is', null),
      ]);
      const vinculadas = new Set((jaVinculadas ?? []).map(c => c.saida_vinculada_id));
      // Demanda 195: conta RECORRENTE tem o mesmo valor todo ciclo POR
      // DESIGN — a saída do ciclo anterior não é duplicata do pagamento
      // atual (caso real: baixa do aluguel de julho quase reaproveitou a
      // saída de 15/06 importada com o mesmo R$1.300). Pra recorrente, só é
      // suspeita a candidata cujo DIA DO CAIXA esteja perto do vencimento
      // ATUAL da conta (meia janela do ciclo: mensal ±15 dias, semanal ±3)
      // — o "alguém já lançou o aluguel DESTE mês na mão" continua pegando.
      // Conta não-recorrente (frequencia null) segue a regra da 166 intacta.
      const dentroDoCicloAtual = (s: { data_dia: string | null }) => {
        if (!conta.frequencia) return true;
        const meiaJanelaDias = conta.frequencia === 'semanal' ? 3 : 15;
        const [dd, mm, aa] = String(s.data_dia ?? '').split('-').map(Number);
        const vcto = conta.vencimento ? new Date(`${conta.vencimento}T12:00:00`) : null;
        if (!dd || !mm || !aa || !vcto || isNaN(vcto.getTime())) return true; // sem como comparar → não perde a proteção
        const dataSaida = new Date(2000 + aa, mm - 1, dd, 12);
        const diffDias = Math.abs(dataSaida.getTime() - vcto.getTime()) / 864e5;
        return diffDias <= meiaJanelaDias;
      };
      const parecidas = (candidatas ?? []).filter(s => !vinculadas.has(s.id)).filter(dentroDoCicloAtual);
      if (parecidas.length > 0) {
        return { conflito: parecidas as SaidaParecida[] };
      }
    }
    // Saída real, mesmo formato usado em toda a gráfica (`data_dia` = hoje,
    // dia em que o dinheiro sai de verdade — não o vencimento original).
    const { data: saida, error } = await supabaseAdmin
      .from('jsgrafica_saidas')
      .insert({
        data_dia:       formatarDiaCaixa(),
        operador,
        categoria_id:   categoriaParaSlug(conta.categoria),
        categoria_nome: conta.categoria,
        valor:          conta.valor,
        descricao:      `Baixa de conta a pagar: ${conta.nome}`,
      })
      .select()
      .single();
    if (error || !saida) throw error ?? new Error('Falha ao gerar saída da baixa');
    update.saida_vinculada_id = saida.id;
  } else {
    // Entrada real — `jsgrafica_vendas` espera produto/operador (não cabe
    // recebimento avulso) e não recebe linha nova desde a 054; `jsgrafica_
    // pedidos` já é a fonte real de entradas do dia (Dashboard/Fechamento
    // somam de lá) e aceita entrada avulsa no mesmo formato do balcão
    // anônimo (demanda 054, `telefone: 'balcao'`) — reaproveitado aqui com
    // `telefone: 'contas_a_receber'` pra distinguir na aba Pedidos, sem
    // inventar tabela/campo novo. Decisão registrada no relato da 096.
    const agora = new Date().toISOString();
    const { data: pedido, error } = await supabaseAdmin
      .from('jsgrafica_pedidos')
      .insert({
        telefone:              'contas_a_receber',
        servico_nome:          conta.nome,
        quantidade:            1,
        valor_unitario:        conta.valor,
        valor_total:           conta.valor,
        valor_final:           conta.valor,
        status:                'entregue',
        jornada_tipo:          'simples',
        pedido_criado_por:     operador,
        pagamento_tipo:        'pos_producao',
        pagamento_confirmado:  true,
        confirmado_cliente_at: agora,
        data_entregue_at:      agora,
      })
      .select()
      .single();
    if (error || !pedido) throw error ?? new Error('Falha ao gerar entrada da baixa');
    update.pedido_vinculado_id = pedido.id;
  }

  const { data: contaAtualizada, error: erroUpdate } = await supabaseAdmin
    .from('jsgrafica_contas_pagar_receber')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (erroUpdate || !contaAtualizada) throw erroUpdate ?? new Error('Falha ao atualizar conta após baixa');

  let novaInstancia: ContaPagarReceber | null = null;
  if (conta.recorrente) {
    // Demanda 125: a próxima instância respeita a `frequencia` salva na
    // conta — não assume mais mensal sempre. Linha antiga sem frequência
    // (ou com qualquer valor desconhecido) segue mensal, comportamento de
    // antes.
    const frequencia = conta.frequencia === 'semanal' ? 'semanal' : 'mensal';
    novaInstancia = await criarContaPagarReceber({
      nome:       conta.nome,
      valor:      conta.valor,
      categoria:  conta.categoria,
      tipo:       conta.tipo,
      vencimento: frequencia === 'semanal'
        ? proximoVencimentoSemanal(conta.vencimento)
        : proximoVencimentoMensal(conta.vencimento),
      recorrente: true,
      frequencia,
      operador,
    });
  }

  return { contaAtualizada, novaInstancia };
}


// ── Demandas 167/172: reparo de nome de contato sem nome utilizável ──
// Um contato pode estar gravado sem nome ou com o nome da PRÓPRIA EMPRESA
// (bug de pipeline, 168/169 — 29 contatos reais como "J S Gráfica") e ficar
// invisível na busca. Quando um pedido/vínculo traz um nome MELHOR, corrige.
// Regras: (a) o nome de ENTRADA também é validado — "Contato privado" (o
// display de contato sem nome, que o Inbox manda de volta como nome_cliente)
// e variações do nome da empresa NUNCA sobrescrevem nada; (b) se QUALQUER
// linha do telefone tem nome bom, nada é tocado (apelido não piora nome
// completo); (c) corrige todas as linhas do phone (contact_lid instável,
// 029). Usada pelo POST /api/clientes (balcão, 167) e pelo "Criar pedido"
// do Inbox (172) — uma regra só, sem divergência futura.
// Demanda 184: nome só de emoji/pontuação/caractere invisível (ex. ".", "…",
// "ㅤ", ou um emoji sozinho) também é inválido — \p{L}/\p{N} (Unicode) cobre
// letra acentuada e até fonte estilizada tipo "𝐿𝒶𝓇𝒾𝓈𝓈𝒶" (achado secundário da
// 184: nome real em fonte Unicode, não é o mesmo problema, não deve cair
// aqui). Hangul filler (U+115F/1160/3164/FFA0) e marcas de iteração/
// repetição japonesas (U+3031-3035/309D/309E/30FD/30FE) são classificadas
// como "letra" pelo Unicode mas não servem de nome de verdade — removidas
// antes de testar, senão escapariam da checagem (caso real de 13/07 achado
// na 184: "ㅤ  ㅤ〻", filler + marca de iteração, nada disso é nome).
export function nomeContatoInvalido(n: string | null | undefined): boolean {
  if (!n || !n.trim()) return true;
  const semFillerInvisivel = n.replace(/[ᅟᅠㅤﾠ〱〲〳〴〵〻ゝゞヽヾ]/g, '');
  if (!/[\p{L}\p{N}]/u.test(semFillerInvisivel)) return true;
  const norm = n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  return norm === 'jsgrafica' || norm === 'contatoprivado';
}

export async function corrigirNomeContatoSeInvalido(telefone: string, nomeNovo: string): Promise<boolean> {
  if (nomeContatoInvalido(nomeNovo)) return false;
  const { data: linhas } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .select('contact_lid, lead_name')
    .eq('phone', telefone);
  if (!linhas || linhas.length === 0) return false;
  if (!linhas.every(c => nomeContatoInvalido(c.lead_name))) return false;
  const { error } = await supabaseAdmin
    .from('jsgrafica_contatos')
    .update({ lead_name: nomeNovo.trim(), atualizado_em: new Date().toISOString() })
    .in('contact_lid', linhas.map(c => c.contact_lid));
  if (error) { console.error('[167/172] Falha ao corrigir lead_name', error); return false; }
  return true;
}

// ── Demanda 147: Pix estático do RecargaPay (recargas VEM/celular) ──
// O dinheiro de recarga entra na conta RecargaPay (CNPJ da sócia Zuzeide),
// nunca no Mercado Pago. QR/payload são FIXOS (gerados 1x, cliente digita o
// valor no banco) e a confirmação é sempre manual — RecargaPay não tem API.
// Demanda 183: busca de contato digitada como telefone FORMATADO ("81
// 98610-8547", "(81) 98610.8547") não achava o contato gravado só com
// dígitos — a criação normalizava, a busca não. Devolve o filtro `.or()`
// inteiro (regra única pras 2 rotas de busca, inbox/conversas e clientes):
// - texto que parece telefone (só dígitos + formatação comum) → busca SÓ
//   por `phone`, com os dígitos limpos. Além de ser o certo semanticamente,
//   evita quebrar o parser do PostgREST — parênteses no meio de um `.or()`
//   viram agrupamento lógico e a query volta vazia (achado no teste com
//   "(81) 8330.8276").
// - qualquer outra coisa (nome) → mesmo filtro de sempre, intocado.
export function filtroBuscaContato(busca: string): string {
  const texto = busca.trim();
  const digitos = texto.replace(/\D/g, '');
  if (/^[\d\s\-().+]+$/.test(texto) && digitos.length >= 4) {
    return `phone.ilike.%${digitos}%`;
  }
  // Demanda 187: a busca por nome compara contra as colunas GERADAS
  // lead_name_busca/lead_push_name_busca (NFKC + translit de syllabics, ver
  // migration add_nome_busca_normalizado_187) — "Larissa" digitado normal
  // acha "𝐿𝒶𝓇𝒾𝓈𝓈𝒶". O termo digitado passa pela MESMA normalização (se
  // alguém colar o nome estilizado, também acha). Pra nome normal, coluna
  // normalizada é idêntica ao original — zero mudança de comportamento.
  const buscaNome = normalizarNomeBusca(busca);
  return `lead_name_busca.ilike.%${buscaNome}%,lead_push_name_busca.ilike.%${buscaNome}%,phone.ilike.%${busca}%`;
}

// Demanda 187: espelho em JS da função SQL `jsgrafica_normalizar_nome_busca`
// — NFKC (fonte matemática estilizada → ASCII) + os 20 Canadian Aboriginal
// Syllabics usados como letra "fancy" (caso real ᗷᗩK). Manter os dois lados
// iguais se o mapa crescer.
const SILABICOS_DE   = 'ᗩᗷᑕᗪᕮᖴᕼᒍᒪᗰᑎᑭᑫᖇᔕᑌᐯᗯ᙭ᘔ';
const SILABICOS_PARA = 'ABCDEFHJLMNPQRSUVWXZ';
export function normalizarNomeBusca(texto: string): string {
  return [...texto.normalize('NFKC')]
    .map(c => { const i = SILABICOS_DE.indexOf(c); return i >= 0 ? SILABICOS_PARA[i] : c; })
    .join('');
}

export const CATEGORIAS_RECARGA = ['Recarga vem', 'Recarga celular'];

export interface PixRecargaPay {
  chave: string;
  titular: string;
  payload: string;        // BR Code copia-e-cola estático, sem valor
  qrBase64: string | null;
}

export async function getPixRecargaPay(): Promise<PixRecargaPay | null> {
  const { data } = await supabaseAdmin
    .from('jsgrafica_agent_config')
    .select('chave_pix_recargapay, titular_pix_recargapay, pix_recargapay_payload, pix_recargapay_qr_base64')
    .eq('ativo', true)
    .maybeSingle();
  if (!data?.chave_pix_recargapay || !data?.pix_recargapay_payload) return null;
  return {
    chave:    data.chave_pix_recargapay,
    titular:  data.titular_pix_recargapay ?? 'RecargaPay',
    payload:  data.pix_recargapay_payload,
    qrBase64: data.pix_recargapay_qr_base64 ?? null,
  };
}

// Demanda 220: `criarCobrancaPix` (lib/mercadopago.ts) só logava falha via
// `console.error` — perdido depois de um tempo, e o log da Vercel nem
// sempre está disponível (achado real do 05-FINANCEIRO: tentou auditar o
// `ped-1251` e recebeu `ExceedsBillingLimitError` do próprio plano da
// Vercel). Chamado pelos 2 pontos de chamada de `criarCobrancaPix`
// (app/api/pedidos/route.ts e app/api/mercadopago/cobranca/route.ts) no
// catch de cada um — nunca dentro da própria `criarCobrancaPix` (mantém
// lib/mercadopago.ts sem depender do cliente Supabase). Tabela
// `jsgrafica_mercadopago_falhas_cobranca` criada pelo 02-DADOS antes desta
// implementação (RLS travada, só service_role, mesmo padrão de sempre).
// Nunca deixa a PRÓPRIA persistência derrubar o fluxo principal — se até
// isso falhar, cai no console.error de sempre (perda aceitável, é só o
// registro de auditoria que se perde, não a venda).
export async function registrarFalhaCobrancaPix(falha: {
  origem: 'pedidos' | 'mercadopago_cobranca';
  pedidoId?: string | null;
  vendaId?: string | null;
  telefone?: string | null;
  valor: number;
  erroMensagem: string;
  tempoDecorridoMs?: number | null;
  payloadTentativa?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabaseAdmin.from('jsgrafica_mercadopago_falhas_cobranca').insert({
      data_dia:            formatarDiaCaixa(),
      origem:              falha.origem,
      pedido_id:           falha.pedidoId ?? null,
      venda_id:            falha.vendaId ?? null,
      telefone:            falha.telefone ?? null,
      valor:               falha.valor,
      erro_mensagem:       falha.erroMensagem.slice(0, 1000),
      tempo_decorrido_ms:  falha.tempoDecorridoMs ?? null,
      payload_tentativa:   falha.payloadTentativa ?? null,
    });
  } catch (e) {
    console.error('[220] Falha ao registrar falha de cobrança Pix (persistência)', e);
  }
}

// Quais desses produtos são recarga (categoria) — usado pelos 2 gatilhos de
// cobrança (Inbox e balcão) pra excluir recarga de qualquer cobrança MP.
export async function idsProdutosRecarga(servicoIds: (string | null | undefined)[]): Promise<Set<string>> {
  const ids = [...new Set(servicoIds.filter((x): x is string => !!x))];
  if (ids.length === 0) return new Set();
  const { data } = await supabaseAdmin
    .from('jsgrafica_produtos')
    .select('id, categoria')
    .in('id', ids);
  return new Set((data ?? []).filter(p => CATEGORIAS_RECARGA.includes(p.categoria)).map(p => p.id));
}

// ─── Demanda 229 — criação de saída/transferência extraída pra reaproveitar ──
// Antes essa lógica só existia dentro de `app/api/saidas/route.ts` (POST) e
// `app/api/transferencias/route.ts` (POST). A classificação de uma pendência
// de conciliação (229) pode gerar uma saída/transferência de QUALQUER dia
// passado (o dia da própria pendência) — a rota de saídas gravava sempre
// `formatarDiaCaixa()` (hoje), sem parâmetro pra outro dia. Em vez de
// duplicar a lógica ou fazer uma rota chamar a outra por HTTP (frágil em
// serverless), extraída aqui — as 2 rotas HTTP passaram a só validar entrada
// e chamar isso; comportamento externo idêntico quando `dataDia` não é
// passado (cai no default de hoje).
export async function criarSaida(opts: {
  categoriaId: string;
  valor?: number;
  quantidade?: number;
  valorCarga?: number;
  descricao?: string | null;
  operador?: string | null;
  contaOrigem?: string | null;
  dataDia?: string;
}): Promise<{ nomeAba: string; categoria: string; valor: number }> {
  const dataDia = opts.dataDia || formatarDiaCaixa();

  if (opts.contaOrigem !== undefined && opts.contaOrigem !== null) {
    const contasValidas = CONTAS_ORIGEM.map(c => c.id) as string[];
    if (!contasValidas.includes(opts.contaOrigem)) {
      throw new Error('Conta de origem inválida');
    }
  }

  const { data: categoria } = await supabaseAdmin
    .from('jsgrafica_categorias_saida')
    .select('nome')
    .eq('id', opts.categoriaId)
    .eq('ativo', true)
    .maybeSingle();
  if (!categoria) throw new Error('Categoria não encontrada ou inativa');
  const categoriaNome = categoria.nome;

  let valorFinal = opts.valor;
  let quantidadeFinal = opts.quantidade ?? null;
  if (opts.categoriaId === 'recarga_vem') {
    const qtd = Number(opts.quantidade);
    const carga = Number(opts.valorCarga);
    if (!qtd || qtd <= 0 || !carga || carga <= 0) {
      throw new Error('Quantidade de recargas e valor da carga são obrigatórios');
    }
    valorFinal = Math.round((carga - TAXA_RECARGA_VEM) * qtd * 100) / 100;
    quantidadeFinal = qtd;
  }
  if (!valorFinal || valorFinal <= 0) throw new Error('Valor inválido');

  const { error } = await supabaseAdmin.from('jsgrafica_saidas').insert({
    data_dia:       dataDia,
    operador:       opts.operador || 'Sistema',
    categoria_id:   opts.categoriaId,
    categoria_nome: categoriaNome,
    valor:          valorFinal,
    quantidade:     quantidadeFinal,
    descricao:      opts.descricao || null,
    conta_origem:   opts.contaOrigem ?? null,
  });
  if (error) throw error;

  return { nomeAba: dataDia, categoria: categoriaNome, valor: valorFinal };
}

export async function criarTransferencia(opts: {
  contaOrigem: string;
  contaDestino: string;
  valor: number;
  descricao?: string | null;
  operador?: string | null;
  dataDia?: string;
}): Promise<{ id: string; conta_origem: string; conta_destino: string; valor: number }> {
  const contasValidas = CONTAS_ORIGEM.map(c => c.id) as string[];
  if (!contasValidas.includes(opts.contaOrigem) || !contasValidas.includes(opts.contaDestino)) {
    throw new Error('Conta de origem/destino inválida');
  }
  if (opts.contaOrigem === opts.contaDestino) {
    throw new Error('Origem e destino não podem ser a mesma conta');
  }
  if (!opts.valor || opts.valor <= 0) throw new Error('Valor inválido');
  const dia = opts.dataDia || formatarDiaCaixa();

  const labelDe: Record<string, string> = Object.fromEntries(CONTAS_ORIGEM.map(c => [c.id, c.label]));
  // Demanda 200: mesma gaveta física por operador — quem "perde" o dinheiro
  // fisicamente quando a origem é uma gaveta de dinheiro é o dono dela.
  const operadorSaida = ({ dinheiro_zu: 'Zu', dinheiro_gabi: 'Gabi' } as Record<string, string>)[opts.contaOrigem]
    ?? (opts.operador || 'Sistema');
  const descricaoSaida = `Transferência: ${labelDe[opts.contaOrigem]} → ${labelDe[opts.contaDestino]}${opts.descricao ? ' — ' + opts.descricao : ''}`;

  const { data: saida, error: erroSaida } = await supabaseAdmin.from('jsgrafica_saidas').insert({
    data_dia:       dia,
    operador:       operadorSaida,
    categoria_id:   'transferencia_entre_contas',
    categoria_nome: 'Transferência entre contas',
    valor:          opts.valor,
    descricao:      descricaoSaida,
    conta_origem:   opts.contaOrigem,
  }).select('id').single();
  if (erroSaida || !saida) throw erroSaida;

  const { data: transferencia, error: erroTransf } = await supabaseAdmin.from('jsgrafica_transferencias').insert({
    data_dia:      dia,
    conta_origem:  opts.contaOrigem,
    conta_destino: opts.contaDestino,
    valor:         opts.valor,
    descricao:     opts.descricao || null,
    operador:      opts.operador || 'Sistema',
    saida_id:      saida.id,
  }).select().single();
  if (erroTransf || !transferencia) throw erroTransf;

  return transferencia;
}

// ─── Demanda 229 — entrada avulsa (tabela criada na 226) ───────────────────
// Primeira e única forma de escrita nessa tabela hoje: classificar uma
// pendência de conciliação como "Entrada". `conta_destino` sempre uma das 6
// contas fixas (mesma lista/CHECK de `jsgrafica_saidas.conta_origem`).
export async function criarEntradaAvulsa(opts: {
  contaDestino: string;
  valor: number;
  descricao?: string | null;
  operador?: string | null;
  dataDia?: string;
  pendenciaId?: string | null;
}): Promise<{ id: string }> {
  const contasValidas = CONTAS_ORIGEM.map(c => c.id) as string[];
  if (!contasValidas.includes(opts.contaDestino)) throw new Error('Conta de destino inválida');
  if (!opts.valor || opts.valor <= 0) throw new Error('Valor inválido');
  const dataDia = opts.dataDia || formatarDiaCaixa();

  const { data, error } = await supabaseAdmin.from('jsgrafica_entradas_avulsas').insert({
    data_dia:      dataDia,
    valor:         opts.valor,
    conta_destino: opts.contaDestino,
    operador:      opts.operador || 'Sistema',
    descricao:     opts.descricao || null,
    pendencia_id:  opts.pendenciaId ?? null,
  }).select('id').single();
  if (error || !data) throw error;

  return data;
}

// ─── Demanda 231 — recálculo de fechamento "Sistema" desatualizado ─────────
// Modelo confirmado com dado real antes de implementar (checkpoint da 231):
// nunca recalcular o dia inteiro ao vivo (já causou 1 erro real na 223,
// absorvendo drift não relacionado) — só soma o delta exato que a
// classificação de conciliação criou, e propaga esse delta, sem mudar de
// valor, pelos dias seguintes (mesma cadeia saldo_anterior→saldo_acumulado
// já usada nas correções manuais das demandas 217/223).
export interface ItemDeltaPendente {
  pendenciaId: string;
  tipo: 'entrada' | 'saida';
  valor: number;
}

// Transferência NUNCA entra aqui: confirmado com as 12 transferências reais
// já lançadas que `criarSaidaETransferencia` sempre grava o mesmo valor nos
// 2 lados (saída + transferência), então o efeito líquido no agregado
// "Sistema" já é zero por construção. Exceção real encontrada (fora do
// escopo desta demanda, não corrigida aqui): se a saída-par for editada
// depois (rota genérica de editar saída, demanda 130), os 2 lados podem
// dessincronizar — ex. real em 24-07-26 (transferência R$945 vs saída-par
// editada pra R$890). Reportado ao PM como achado separado.
export async function getDeltasPendentesPorDia(): Promise<Map<string, { deltaEntradas: number; deltaSaidas: number; itens: ItemDeltaPendente[] }>> {
  const { data: pendenciasRaw, error } = await supabaseAdmin
    .from('jsgrafica_conciliacao_pendencias')
    .select('id, data_dia, status, classificacao, recalculo_aplicado_em')
    .eq('status', 'classificado')
    .is('recalculo_aplicado_em', null);
  if (error) throw error;

  type Classificacao = { tipo?: string; entradaAvulsaId?: string; valor?: number };
  const pendencias = (pendenciasRaw ?? []).filter(p => {
    const tipo = (p.classificacao as Classificacao | null)?.tipo;
    return tipo === 'entrada' || tipo === 'saida';
  });

  // 'entrada' só guarda o id do registro criado em `classificacao` — busca o
  // valor REALMENTE gravado (o Admin pode editar o valor na hora de
  // classificar, confirmado em ModalClassificarPendencia.tsx; não dá pra
  // confiar no `valor` original da pendência). 'saida' já grava o valor
  // direto em `classificacao` (retorno de `criarSaida`), não precisa buscar.
  const idsEntradaAvulsa = pendencias
    .filter(p => (p.classificacao as Classificacao).tipo === 'entrada')
    .map(p => (p.classificacao as Classificacao).entradaAvulsaId)
    .filter((id): id is string => !!id);
  let valoresEntradaAvulsa = new Map<string, number>();
  if (idsEntradaAvulsa.length > 0) {
    const { data: entradas } = await supabaseAdmin
      .from('jsgrafica_entradas_avulsas').select('id, valor').in('id', idsEntradaAvulsa);
    valoresEntradaAvulsa = new Map((entradas ?? []).map(e => [e.id as string, Number(e.valor)]));
  }

  const resultado = new Map<string, { deltaEntradas: number; deltaSaidas: number; itens: ItemDeltaPendente[] }>();
  for (const p of pendencias) {
    const classificacao = p.classificacao as Classificacao;
    const tipo = classificacao.tipo as 'entrada' | 'saida';
    const valor = tipo === 'entrada'
      ? (classificacao.entradaAvulsaId ? valoresEntradaAvulsa.get(classificacao.entradaAvulsaId) : undefined)
      : classificacao.valor;
    if (valor === undefined) continue; // registro vinculado não encontrado — ignora com segurança, não trava o resto

    const atual = resultado.get(p.data_dia) ?? { deltaEntradas: 0, deltaSaidas: 0, itens: [] };
    if (tipo === 'entrada') atual.deltaEntradas += valor; else atual.deltaSaidas += valor;
    atual.itens.push({ pendenciaId: p.id, tipo, valor });
    resultado.set(p.data_dia, atual);
  }

  return resultado;
}

export interface PreviaRecalculoDia {
  dataDia: string;
  totalEntradasAntes: number; totalEntradasDepois: number;
  totalSaidasAntes: number; totalSaidasDepois: number;
  saldoAnteriorAntes: number; saldoAnteriorDepois: number;
  saldoAcumuladoAntes: number; saldoAcumuladoDepois: number;
  divergenciaAntes: number; divergenciaDepois: number;
  itensIncluidos: ItemDeltaPendente[];
}

// Modo prévia: nunca escreve no banco. Mostra a cascata inteira, do 1º dia
// afetado até o último fechamento "Sistema" que já existe — não por dia de
// calendário (há lacunas reais, ex. fins de semana sem fechamento), pela
// ORDEM dos fechamentos que realmente existem, igual `getSaldoAnterior` já
// faz. Se o delta pendente for de um dia que ainda não tem fechamento
// "Sistema", não entra na cascata — o próprio fechamento normal desse dia já
// nasce certo (getResumoDia já soma o registro real).
export async function gerarPreviaRecalculo(): Promise<PreviaRecalculoDia[]> {
  const deltasPorDia = await getDeltasPendentesPorDia();
  if (deltasPorDia.size === 0) return [];

  const { data: fechamentosRaw, error } = await supabaseAdmin
    .from('jsgrafica_fechamento')
    .select('id, data_dia, total_entradas, total_saidas, saldo_anterior, saldo_acumulado, total_fisico, divergencia')
    .eq('fechado_por', 'Sistema');
  if (error) throw error;

  const fechamentos = (fechamentosRaw ?? [])
    .map(f => ({ ...f, _dt: parseDiaCaixa(f.data_dia) }))
    .filter(f => f._dt !== null)
    .sort((a, b) => (a._dt as Date).getTime() - (b._dt as Date).getTime());

  const primeiroIndex = fechamentos.findIndex(f => deltasPorDia.has(f.data_dia));
  if (primeiroIndex === -1) return [];

  const previa: PreviaRecalculoDia[] = [];
  let saldoAnteriorCadeia: number | null = null;

  for (let i = primeiroIndex; i < fechamentos.length; i++) {
    const f = fechamentos[i];
    const delta = deltasPorDia.get(f.data_dia);
    const deltaEntradas = delta?.deltaEntradas ?? 0;
    const deltaSaidas = delta?.deltaSaidas ?? 0;

    const totalEntradasAntes = Number(f.total_entradas);
    const totalSaidasAntes = Number(f.total_saidas);
    const totalEntradasDepois = Math.round((totalEntradasAntes + deltaEntradas) * 100) / 100;
    const totalSaidasDepois = Math.round((totalSaidasAntes + deltaSaidas) * 100) / 100;

    const saldoAnteriorAntes = Number(f.saldo_anterior);
    const saldoAnteriorDepois: number = saldoAnteriorCadeia ?? saldoAnteriorAntes;

    const saldoAcumuladoAntes = Number(f.saldo_acumulado);
    const saldoAcumuladoDepois: number = Math.round((saldoAnteriorDepois + totalEntradasDepois - totalSaidasDepois) * 100) / 100;

    const divergenciaAntes = Number(f.divergencia);
    const divergenciaDepois = Math.round((Number(f.total_fisico) - saldoAcumuladoDepois) * 100) / 100;

    previa.push({
      dataDia: f.data_dia,
      totalEntradasAntes, totalEntradasDepois,
      totalSaidasAntes, totalSaidasDepois,
      saldoAnteriorAntes, saldoAnteriorDepois,
      saldoAcumuladoAntes, saldoAcumuladoDepois,
      divergenciaAntes, divergenciaDepois,
      itensIncluidos: delta?.itens ?? [],
    });

    saldoAnteriorCadeia = saldoAcumuladoDepois;
  }

  return previa;
}

export interface ResultadoAplicarDia {
  dataDia: string;
  aplicado: boolean;
  motivo?: string;
  valoresNovos?: { totalEntradas: number; totalSaidas: number; saldoAnterior: number; saldoAcumulado: number; divergencia: number };
}

// Modo aplicar: recebe de volta o "fingerprint" exato da prévia que o Admin
// confirmou (quais pendências foram contadas em cada dia). Antes de cada
// UPDATE, re-deriva o delta fresco daquele dia e compara contra o esperado —
// se o conjunto mudou (ex. mais uma pendência foi classificada no meio do
// processo), PARA ali, sem aplicar aquele dia nem os seguintes (demanda 231,
// risco explícito: nunca aplicar silenciosamente em cima de cálculo que já
// não é mais o que foi mostrado na prévia). Aplica em sequência estrita,
// um UPDATE de cada vez, conferindo antes de seguir — mesmo padrão manual
// das demandas 217/223.
export async function aplicarRecalculo(
  diasEsperados: { dataDia: string; pendenciaIds: string[] }[],
): Promise<{ resultados: ResultadoAplicarDia[]; paradoCedo: boolean }> {
  const resultados: ResultadoAplicarDia[] = [];
  let saldoAnteriorCadeia: number | null = null;

  for (const diaEsperado of diasEsperados) {
    const deltasFrescos = await getDeltasPendentesPorDia();
    const deltaFresco = deltasFrescos.get(diaEsperado.dataDia) ?? { deltaEntradas: 0, deltaSaidas: 0, itens: [] };
    const idsFrescos = new Set(deltaFresco.itens.map(i => i.pendenciaId));
    const idsEsperados = new Set(diaEsperado.pendenciaIds);
    const mudou = idsFrescos.size !== idsEsperados.size || [...idsFrescos].some(id => !idsEsperados.has(id));
    if (mudou) {
      resultados.push({
        dataDia: diaEsperado.dataDia, aplicado: false,
        motivo: 'As pendências pendentes deste dia mudaram desde a prévia — recarregue a prévia antes de aplicar.',
      });
      return { resultados, paradoCedo: true };
    }

    const { data: f, error } = await supabaseAdmin.from('jsgrafica_fechamento')
      .select('id, total_entradas, total_saidas, saldo_anterior, saldo_acumulado, total_fisico')
      .eq('data_dia', diaEsperado.dataDia).eq('fechado_por', 'Sistema').single();
    if (error || !f) {
      resultados.push({ dataDia: diaEsperado.dataDia, aplicado: false, motivo: 'Fechamento não encontrado.' });
      return { resultados, paradoCedo: true };
    }

    const totalEntradasNovo  = Math.round((Number(f.total_entradas) + deltaFresco.deltaEntradas) * 100) / 100;
    const totalSaidasNovo    = Math.round((Number(f.total_saidas) + deltaFresco.deltaSaidas) * 100) / 100;
    const saldoAnteriorNovo: number  = saldoAnteriorCadeia ?? Number(f.saldo_anterior);
    const saldoAcumuladoNovo: number = Math.round((saldoAnteriorNovo + totalEntradasNovo - totalSaidasNovo) * 100) / 100;
    const divergenciaNova    = Math.round((Number(f.total_fisico) - saldoAcumuladoNovo) * 100) / 100;

    const { error: erroUpdate } = await supabaseAdmin.from('jsgrafica_fechamento').update({
      total_entradas:  totalEntradasNovo,
      total_saidas:    totalSaidasNovo,
      saldo_anterior:  saldoAnteriorNovo,
      saldo_acumulado: saldoAcumuladoNovo,
      divergencia:     divergenciaNova,
    }).eq('id', f.id);
    if (erroUpdate) {
      resultados.push({ dataDia: diaEsperado.dataDia, aplicado: false, motivo: erroUpdate.message });
      return { resultados, paradoCedo: true };
    }

    if (deltaFresco.itens.length > 0) {
      await supabaseAdmin.from('jsgrafica_conciliacao_pendencias')
        .update({ recalculo_aplicado_em: new Date().toISOString() })
        .in('id', deltaFresco.itens.map(i => i.pendenciaId));
    }

    resultados.push({
      dataDia: diaEsperado.dataDia, aplicado: true,
      valoresNovos: {
        totalEntradas: totalEntradasNovo, totalSaidas: totalSaidasNovo,
        saldoAnterior: saldoAnteriorNovo, saldoAcumulado: saldoAcumuladoNovo, divergencia: divergenciaNova,
      },
    });

    saldoAnteriorCadeia = saldoAcumuladoNovo;
  }

  return { resultados, paradoCedo: false };
}
