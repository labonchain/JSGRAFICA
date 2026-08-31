"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Usuario } from "@/lib/usuarios";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { ModalQrPix, type CobrancaPixModal } from "@/components/ModalQrPix";

interface Pedido {
  id: string;
  telefone: string;
  nome_cliente: string | null;
  quem_vai_buscar: string | null;
  servico_id: string | null;
  servico_nome: string | null;
  specs: Record<string, unknown> | null;
  quantidade: number | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  valor_unitario: number | null;
  desconto_pct: number;
  valor_total: number | null;
  valor_final: number | null;
  pagamento_tipo: string;
  forma_pagamento: string | null;
  pagamento_confirmado: boolean;
  // Demanda 177: dia em que a entrada contou no caixa (régua da 164) — usado
  // pelo aviso de "dia já fechado" ao cancelar pedido pago.
  pagamento_confirmado_at?: string | null;
  // Demanda 124: 'mercadopago' quando o Pix da cobrança gerada pelo sistema
  // caiu e a confirmação foi automática; 'manual' quando alguém confirmou.
  pagamento_confirmado_origem?: string | null;
  // Demanda 178: a order do Mercado Pago apareceu como estornada/cancelada
  // DEPOIS do pagamento confirmado — alerta pro time revisar (nunca reverte
  // sozinho).
  pagamento_estornado_at?: string | null;
  pagamento_estorno_detalhe?: string | null;
  // Demanda 300: precisa saber se o Pix foi ESCOLHIDO e se já tem cobrança
  // gerada pra decidir se mostra o botão "Gerar Pix" (retry manual).
  forma_pagamento_escolhida?: string | null;
  mp_order_id?: string | null;
  mp_pix_qr_code?: string | null;
  status: string;
  prazo_solicitado: string | null;
  prazo_entrega: string | null;
  confirmado_cliente_at: string | null;
  data_producao_at: string | null;
  data_pronto_at: string | null;
  data_entregue_at: string | null;
  created_at: string;
  venda_id: string | null;
  // Demanda 219: calculado pelo GET /api/pedidos (categoria do produto, mesma
  // checagem de 147/213) — usado só pra esconder o Pix genérico no modal de
  // confirmação de pagamento quando o item é recarga (VEM/celular).
  eh_recarga?: boolean;
}

// Demanda 071: exportado pra ser a única fonte de verdade de status de
// pedido — components/TelaInbox.tsx tinha sua própria cópia (STATUS_ORDER_PEDIDO/
// STATUS_LABEL_PEDIDO) que ficou desatualizada quando a 065 adicionou
// "aguardando_retirada", travando o cartão de pedido no Inbox em "Confirmado".
export const STATUS_CFG: Record<string, { label: string; cor: string; bg: string }> = {
  // Demanda 202 (Fase A do objetivo 2, OBJETIVOS-MACRO.md): status novo pro
  // futuro agente de WhatsApp (Fase B, ainda não construída) — quando existir,
  // ele nunca cria pedido direto na esteira, gera um pedido NESTE status pra
  // um humano revisar/aprovar antes (fluxo estilo iFood, decisão do Edvam,
  // 2026-07-12). Cor fúcsia de propósito — nenhum outro status usa essa cor,
  // precisa saltar aos olhos que isso não é um pedido normal ainda confirmado
  // por um humano. Hoje NADA cria pedido aqui — só infraestrutura pronta.
  aguardando_aprovacao:   { label: "🤖 Aguardando aprovação", cor: "text-fuchsia-700", bg: "bg-fuchsia-100" },
  aguardando_confirmacao: { label: "Aguardando",            cor: "text-amber-700",  bg: "bg-amber-100"  },
  confirmado:             { label: "Confirmado",            cor: "text-blue-700",   bg: "bg-blue-100"   },
  em_producao:            { label: "Em produção",           cor: "text-purple-700", bg: "bg-purple-100" },
  pronto:                 { label: "Pronto",                cor: "text-green-700",  bg: "bg-green-100"  },
  aguardando_retirada:    { label: "📦 Aguardando retirada", cor: "text-orange-700", bg: "bg-orange-100" },
  entregue:               { label: "Entregue",              cor: "text-gray-500",   bg: "bg-gray-100"   },
  cancelado:              { label: "Cancelado",             cor: "text-red-600",    bg: "bg-red-100"    },
};

// Demanda 065: "Pronto" deixou de ter um único próximo passo — ao terminar o
// serviço, o atendente escolhe entre "o cliente já levou" (Entregue) ou
// "ainda não veio buscar" (Aguardando retirada). Por isso vira lista de
// opções em vez de um valor único; os outros status continuam com 1 opção
// só, sem mudança de comportamento.
const PROXIMO: Record<string, { status: string; label: string }[] | null> = {
  // Demanda 202: "Aprovar" é só mais um avanço de status (mesmo mecanismo de
  // sempre) — pro status normal seguinte, `confirmado`. O botão "Rejeitar"
  // não é um avanço de status (é o `cancelar()` já existente do CardFila,
  // com rótulo diferente só quando o pedido está neste status — ver render).
  aguardando_aprovacao:   [{ status: "confirmado",  label: "✓ Aprovar"  }],
  aguardando_confirmacao: [{ status: "confirmado",  label: "Confirmar pedido"  }],
  confirmado:             [{ status: "em_producao", label: "Iniciar produção"  }],
  em_producao:            [{ status: "pronto",      label: "Marcar como pronto" }],
  pronto: [
    { status: "entregue",           label: "✓ Entregue (levou agora)" },
    { status: "aguardando_retirada", label: "📦 Aguardando retirada" },
  ],
  aguardando_retirada:    [{ status: "entregue",    label: "Marcar entregue" }],
  entregue:               null,
  cancelado:              null,
};

const FILTROS = [
  { value: "todos",                   label: "Todos"       },
  { value: "aguardando_aprovacao",     label: "🤖 Aguardando aprovação" },
  { value: "aguardando_confirmacao",  label: "Aguardando"  },
  { value: "confirmado",              label: "Confirmado"  },
  { value: "em_producao",             label: "Em produção" },
  { value: "pronto",                  label: "Pronto"      },
  { value: "aguardando_retirada",     label: "📦 Aguardando retirada" },
  { value: "entregue",                label: "Entregue"    },
];

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Demanda 146: venda de balcão sem contato grava telefone = 'balcao' — antes
// aparecia esse literal cru como "dono" do pedido. Dali em diante o balcão
// exige nome no "vai buscar depois", mas o histórico anônimo continua
// existindo e agora fica explícito em vez de enigmático.
function nomeDono(nomeCliente: string | null, telefone: string | null) {
  if (nomeCliente) return nomeCliente;
  if (!telefone || telefone === "balcao") return "Balcão (sem cliente)";
  return telefone;
}

function dthr(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// Demanda 069: marcar "Entregue" com pagamento ainda pendente pede confirmação
// explícita — o aviso do cabeçalho de venda (066) é só passivo e passa
// despercebido numa correria no balcão.
// Demanda 072: só faz sentido pra quem exige Pix antecipado
// (pagamento_tipo === "pre_producao") — produto flexível/pós-produção paga
// exatamente na entrega, não existe "confirmar antes" de verdade, e o aviso
// virava ruído em todo pedido não pago (testado ao vivo pelo Edvam, apareceu
// num pedido flexível). Virou predicado puro (sem `confirm()` nativo) porque
// o modal novo não é síncrono — cada chamador decide o que fazer com o
// resultado (abrir modal próprio e só executar a mudança se confirmado).
// Demanda 089: exportado pra o cartão "Pedido desta conversa" do Inbox
// (components/TelaInbox.tsx) reaproveitar a mesma checagem, em vez de ter a
// própria cópia (o cartão do Inbox tinha seus próprios botões de avançar sem
// nenhuma checagem de pagamento pendente).
// Demanda 113: reabre pra "flexivel" também — a 072 tinha excluído esse caso
// porque o modal só perguntava "confirma que recebeu?" (redundante quando o
// próprio tipo já é "paga na entrega"). Agora que o modal passou a perguntar
// a forma de pagamento usada (Dinheiro/Cartão/Pix), deixou de ser redundante
// — vale pra qualquer pedido que chega em "entregue" sem forma de pagamento
// capturada ainda.
// Demanda 154 (Fase 4): regra UNIFICADA, sem exceção por forma nem por tipo —
// duas mudanças:
// (1) a exclusão de `pos_producao` (066/113) saiu: ela assumia que balcão
//     sempre pagava na hora da venda, mas desde a 141 existe balcão
//     "retira depois" + Pix SEM cobrança gerada — dava pra marcar "entregue"
//     sem nenhuma checagem (gap real documentado no relato da 141);
// (2) o gate vale pras transições de avanço que IMPLICAM trabalho feito ou
//     mercadoria saindo (em_producao/pronto/entregue), não só "entregue" —
//     produção não começa sem pagamento confirmado, e o conjunto é o MESMO
//     que o backend rejeita (PATCH /api/pedidos), senão um avanço sem modal
//     cairia num 400 seco.
// Demanda 155 (correção da 154): `aguardando_retirada` SAIU do conjunto — é
// estado de ESPERA (pedido pronto, cliente ainda não veio buscar/pagar), e
// "paga na retirada" chega nele sem pagamento POR DESIGN; travar ali exigia
// confirmar (ou forjar) um pagamento que ainda não aconteceu. A saída de
// verdade continua travada: `aguardando_retirada → entregue` passa pelo gate
// porque `entregue` está no conjunto.
// Quem já pagou (dinheiro/cartão na venda, Pix confirmado por MP/RecargaPay)
// chega aqui com pagamento_confirmado=true e não sente fricção nenhuma.
export const STATUS_AVANCO_COM_GATE = new Set(["em_producao", "pronto", "entregue"]);
export function precisaConfirmarPagamento(status: string, pagamentoConfirmado: boolean): boolean {
  return STATUS_AVANCO_COM_GATE.has(status) && !pagamentoConfirmado;
}

// Demanda 072: modal no estilo do sistema (mesmo padrão visual do modal
// "Finalizar Venda" da 066) — substitui o `confirm()` nativo do navegador.
// Demanda 089: exportado pelo mesmo motivo do predicado acima.
// Demanda 113: ganhou o seletor de forma de pagamento (Dinheiro/Cartão/Pix)
// — antes só confirmava "pago ou não" sem capturar como, e (achado ao
// implementar) `pagamento_confirmado` nem chegava a ser gravado de verdade
// nesse fluxo (só na criação do pedido de balcão). `onConfirmar` agora
// recebe a forma escolhida; quem chama decide o que fazer com ela.
// Demanda 165: `onConfirmar` passa também a DATA REAL do recebimento
// ('AAAA-MM-DD') — padrão hoje; só se mexe pra corrigir pagamento atrasado
// (caso Millena Carvalho). O backend rejeita data futura.
// Demanda 197: mesmo mecanismo de "gaveta de destino" da 196 (venda nova no
// balcão), agora também na confirmação POSTERIOR de pagamento em Dinheiro —
// é o mesmo modal, reaproveitado em TelaPedidos.tsx e TelaInbox.tsx. Quando
// `perguntarGaveta` (quem confirma não tem gaveta física própria — mesmo
// critério da 196, papel admin) e a forma escolhida é Dinheiro, pergunta
// "vai pra gaveta de quem?" antes de liberar o Confirmar.
// Demanda 199: 4ª opção "Pix RecargaPay" — Pix estático do RecargaPay
// (recarga VEM/celular), dinheiro que nunca é físico e nunca vira MP. Antes
// só existiam Dinheiro/Cartão/Pix aqui; recarga confirmada por este modal
// (ex. pedido criado pelo Inbox) tinha que forçar uma dessas 3 — achado real
// (ped-1065) mostrou alguém escolhendo Dinheiro por engano e a gaveta
// escolhida ficando com uma sobra fantasma que nunca existiu em espécie.
// Continua nunca perguntando gaveta (só Dinheiro aciona `precisaGaveta`).
// Demanda 219: `apenasRecarga` (true só quando TODO item sendo confirmado é
// recarga VEM/celular — 100% do carrinho, nunca carrinho misto) esconde a
// opção "Pix" genérica — pra recarga só existe Dinheiro/Cartão/Pix RecargaPay
// de verdade (147/213); o Pix genérico nunca chega a mover dinheiro nesse
// caso, e era isso que o atendente clicava por engano (causa raiz confirmada
// no relato da 219 — clique rápido entre status sem diferenciar os botões).
export function ModalConfirmarPagamento({
  onConfirmar,
  onCancelar,
  perguntarGaveta,
  apenasRecarga,
}: {
  onConfirmar: (formaPagamento: string, pagamentoConfirmadoEm: string, gavetaDestino?: "Zu" | "Gabi") => void;
  onCancelar: () => void;
  perguntarGaveta?: boolean;
  apenasRecarga?: boolean;
}) {
  const OPCOES: readonly ("Dinheiro" | "Cartão" | "Pix" | "Pix RecargaPay")[] = apenasRecarga
    ? ["Dinheiro", "Cartão", "Pix RecargaPay"]
    : ["Dinheiro", "Cartão", "Pix", "Pix RecargaPay"];
  const [forma, setForma] = useState<"Dinheiro" | "Cartão" | "Pix" | "Pix RecargaPay">("Dinheiro");
  const hojeISO = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const [dataPagamento, setDataPagamento] = useState(hojeISO);
  const [gavetaDestino, setGavetaDestino] = useState<"Zu" | "Gabi" | null>(null);
  const precisaGaveta = !!perguntarGaveta && forma === "Dinheiro";
  function escolherForma(opcao: "Dinheiro" | "Cartão" | "Pix" | "Pix RecargaPay") {
    setForma(opcao);
    if (opcao !== "Dinheiro") setGavetaDestino(null);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancelar}>
      <div className="bg-white rounded-2xl shadow-2xl p-7 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-base mb-2">Pagamento pendente</h3>
        <p className="text-gray-600 text-sm mb-4">
          Esse item ainda não foi marcado como pago. Confirme a forma de pagamento recebida antes de entregar.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {OPCOES.map(opcao => (
            <button key={opcao} onClick={() => escolherForma(opcao)}
              className={`text-sm font-medium rounded-lg py-2 px-1 border-2 transition-colors ${
                forma === opcao ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              {opcao}
            </button>
          ))}
        </div>
        {/* Demanda 165: recebeu antes e ninguém confirmou na hora? Ajusta a
            data pro dia REAL — a entrada conta naquele dia (164). Uso normal
            do dia a dia: não mexer, fica em hoje. */}
        <div className="mb-6">
          <label className="text-xs text-gray-500 mb-1 block">Recebido em (só mude se o pagamento foi em outro dia)</label>
          <input type="date" value={dataPagamento} max={hojeISO}
            onChange={e => { if (e.target.value) setDataPagamento(e.target.value); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400" />
        </div>
        {/* Demanda 197: mesmo bloco âmbar da 196 — quem confirma não tem
            gaveta física própria e a forma é Dinheiro. */}
        {precisaGaveta && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
            <label className="text-xs text-amber-800 mb-1.5 block font-bold">
              💵 Esse dinheiro vai pra gaveta de quem? (obrigatório — você não tem gaveta própria)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["Zu", "Gabi"] as const).map(nome => (
                <button key={nome} onClick={() => setGavetaDestino(nome)}
                  className={`text-sm font-medium rounded-lg py-2 px-2 border-2 transition-colors ${
                    gavetaDestino === nome ? "border-amber-500 bg-amber-100 text-amber-800" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                  }`}>
                  Gaveta da {nome}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => onConfirmar(forma, dataPagamento, gavetaDestino ?? undefined)}
            disabled={precisaGaveta && !gavetaDestino}
            className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-700 disabled:opacity-50">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Demanda 157: cancelar pedido já ENTREGUE (devolução depois da entrega) ──
// Caso real da gráfica (registrado em 07/07): cliente pagou, levou, devolveu
// depois. Só Admin vê o botão; confirmação mais forte que o confirm() do
// cancelamento normal porque esse dinheiro JÁ foi contado no caixa — motivo
// obrigatório ('Cancelamento' = nunca devia ter contado / 'Devolução/Reembolso'
// = devolveu depois de receber; mesmo efeito na soma, rótulo pra rastro) +
// aviso quando o dia do pedido já foi fechado (cancelar não corrige aquele
// fechamento — vira divergência histórica, o Diagnóstico 149-153 investiga).
// Mesmo padrão visual do ModalConfirmarPagamento — nada de estilo novo.
// Demanda 177: generalizado pra QUALQUER pedido com pagamento confirmado —
// com a régua da 164 (entrada conta pelo pagamento), um pedido pago já
// contou no caixa mesmo sem ter sido entregue; 10 pedidos pagos (7 clientes
// reais) foram cancelados sem aviso nenhum porque o modal só cobria
// status "entregue". O texto se adapta ao status.
export const MOTIVOS_CANCELAMENTO = ["Cancelamento", "Devolução/Reembolso"] as const;

export function ModalCancelarPago({
  pedido,
  avisoDiaFechado,
  onConfirmar,
  onVoltar,
}: {
  pedido: Pedido;
  avisoDiaFechado: string | null; // texto pronto quando o dia já foi fechado
  onConfirmar: (motivo: string) => void;
  onVoltar: () => void;
}) {
  const [motivo, setMotivo] = useState<(typeof MOTIVOS_CANCELAMENTO)[number]>("Cancelamento");
  const jaEntregue = pedido.status === "entregue";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onVoltar}>
      <div className="bg-white rounded-2xl shadow-2xl p-7 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-base mb-2">
          {jaEntregue ? "Cancelar pedido entregue" : "Cancelar pedido já pago"}
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {jaEntregue
            ? <>Esse pedido já foi entregue e o valor ({moeda(pedido.valor_final)}) já contou no caixa.</>
            : <>Esse pedido já está <strong>pago</strong> — o valor ({moeda(pedido.valor_final)}) já contou no caixa no dia do pagamento.</>}
          {" "}Cancelar tira ele da soma — escolha o motivo:
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {MOTIVOS_CANCELAMENTO.map(opcao => (
            <button key={opcao} onClick={() => setMotivo(opcao)}
              className={`text-sm font-medium rounded-lg py-2.5 px-2 border-2 transition-colors ${
                motivo === opcao ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              {opcao}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mb-4">
          &quot;Cancelamento&quot;: nunca devia ter contado (erro de lançamento, teste).
          &quot;Devolução/Reembolso&quot;: o cliente devolveu depois de já ter recebido.
          O estorno do dinheiro em si (Pix/cartão/dinheiro físico) é por fora — aqui só sai da contagem.
        </p>
        {avisoDiaFechado && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
            ⚠️ {avisoDiaFechado}
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onVoltar} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Voltar</button>
          <button onClick={() => onConfirmar(motivo)} className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700">Confirmar cancelamento</button>
        </div>
      </div>
    </div>
  );
}

// Demanda 157: o aviso de "dia já fechado" antes de cancelar um entregue —
// consulta a rota nova (converte o timestamp pro dia do caixa no servidor).
// Falha na checagem não bloqueia o cancelamento, só fica sem o aviso.
// Demanda 177: o dia que importa é o dia em que a entrada CONTOU (régua da
// 164): pagamento primeiro, entrega como fallback do histórico antigo.
async function avisoSeDiaFechado(pedido: Pedido): Promise<string | null> {
  const tsContou = pedido.pagamento_confirmado_at ?? pedido.data_entregue_at;
  if (!tsContou) return null;
  try {
    const r = await fetch(`/api/fechamento/dia-fechado?ts=${encodeURIComponent(tsContou)}`);
    const d = await r.json();
    if (d.fechado) {
      return `Esse pedido já foi contado no fechamento de ${d.dataDia}, que já está fechado. Cancelar agora não corrige aquele fechamento — vai aparecer como divergência se você conferir aquele dia depois (o Diagnóstico de Fechamento mostra).`;
    }
  } catch { /* sem checagem, sem aviso — o cancelamento não depende disso */ }
  return null;
}

function BadgeStatus({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, cor: "text-gray-600", bg: "bg-gray-100" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${c.cor} ${c.bg}`}>
      {c.label}
    </span>
  );
}

// Demanda 066: itens do mesmo carrinho de balcão compartilham `venda_id` —
// aqui eles viram uma única entrada na lista em vez de aparecerem soltos.
// Só agrupa quando há 2+ pedidos com o mesmo venda_id (1 item só não precisa
// de card de grupo).
type EntradaLista =
  | { tipo: "unico"; pedido: Pedido }
  | { tipo: "venda"; vendaId: string; pedidos: Pedido[] };

function agruparPorVenda(pedidos: Pedido[]): EntradaLista[] {
  const vistos = new Set<string>();
  const entradas: EntradaLista[] = [];
  for (const p of pedidos) {
    if (p.venda_id) {
      if (vistos.has(p.venda_id)) continue;
      const doGrupo = pedidos.filter(x => x.venda_id === p.venda_id);
      if (doGrupo.length > 1) {
        vistos.add(p.venda_id);
        entradas.push({ tipo: "venda", vendaId: p.venda_id, pedidos: doGrupo });
        continue;
      }
    }
    entradas.push({ tipo: "unico", pedido: p });
  }
  return entradas;
}

// ─── DETALHE ──────────────────────────────────────────────────────────────────
function PainelDetalhe({
  pedido,
  onMudar,
  isAdmin,
  onAbrirConversa,
  onCorrigirForma,
  onGerarPix,
  gerandoPix,
}: {
  pedido: Pedido;
  onMudar: (id: string, status: string, formaPagamento?: string, motivoCancelamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") => Promise<void>;
  isAdmin: boolean;
  onAbrirConversa?: (phone: string) => void;
  // Demanda 180: correção explícita e auditável da forma de pagamento.
  onCorrigirForma?: (id: string, forma: string) => Promise<void>;
  // Demanda 300: retry manual de Pix pra pedido que ficou preso (telefone
  // era @lid na criação, correção automática não roda pra todo caso).
  onGerarPix?: (id: string) => Promise<void>;
  gerandoPix?: boolean;
}) {
  const [salvando, setSalvando] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<string | null>(null);
  // Demanda 180: seletor inline da correção de forma (só Admin).
  const [corrigindoForma, setCorrigindoForma] = useState(false);
  // Demanda 157/177: modal de cancelamento de pedido PAGO (entregue ou não).
  const [cancelPago, setCancelPago] = useState<{ aviso: string | null } | null>(null);
  const proximo = PROXIMO[pedido.status];
  const specs = pedido.specs ? Object.entries(pedido.specs) : [];

  async function executarAvanco(status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    setSalvando(true);
    await onMudar(pedido.id, status, formaPagamento, undefined, pagamentoConfirmadoEm, gavetaDestino);
    setSalvando(false);
  }

  function avancarPara(status: string) {
    if (precisaConfirmarPagamento(status, pedido.pagamento_confirmado)) {
      setAcaoPendente(status);
      return;
    }
    executarAvanco(status);
  }

  // Demanda 177: pedido PAGO (qualquer status) cancela pelo modal com aviso
  // de "já contou no caixa" + motivo — antes só "entregue" tinha isso e 10
  // pedidos pagos foram cancelados com um confirm() genérico. Pedido NÃO
  // pago continua no fluxo simples de sempre.
  async function cancelar() {
    if (pedido.pagamento_confirmado) {
      await abrirCancelarPago();
      return;
    }
    if (!confirm("Cancelar este pedido?")) return;
    setSalvando(true);
    await onMudar(pedido.id, "cancelado");
    setSalvando(false);
  }

  async function abrirCancelarPago() {
    setSalvando(true);
    const aviso = await avisoSeDiaFechado(pedido);
    setSalvando(false);
    setCancelPago({ aviso });
  }

  async function cancelarPago(motivo: string) {
    setCancelPago(null);
    setSalvando(true);
    await onMudar(pedido.id, "cancelado", undefined, motivo);
    setSalvando(false);
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-0.5">{pedido.id}</p>
          {/* Demanda 171: cliente com telefone real vira link pro contato
              (aba Atendimento) — pedido anônimo/sintético fica texto puro. */}
          {onAbrirConversa && telefoneNavegavel(pedido.telefone) ? (
            <button onClick={() => onAbrirConversa(pedido.telefone)}
              title="Abrir a conversa/contato deste cliente"
              className="text-lg font-bold text-blue-700 leading-tight hover:underline text-left">
              {nomeDono(pedido.nome_cliente, pedido.telefone)} 💬
            </button>
          ) : (
            <p className="text-lg font-bold text-gray-800 leading-tight">
              {nomeDono(pedido.nome_cliente, pedido.telefone)}
            </p>
          )}
          {pedido.nome_cliente && pedido.telefone && pedido.telefone !== "balcao" && <p className="text-sm text-gray-500">{pedido.telefone}</p>}
          {pedido.quem_vai_buscar && (
            <p className="text-sm text-gray-500 mt-0.5">Busca: {pedido.quem_vai_buscar}</p>
          )}
        </div>
        <BadgeStatus status={pedido.status} />
      </div>

      {/* Ações */}
      {pedido.status !== "entregue" && pedido.status !== "cancelado" && (
        <div className="flex gap-2">
          {proximo && proximo.map(opcao => (
            <button
              key={opcao.status}
              onClick={() => avancarPara(opcao.status)}
              disabled={salvando}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : opcao.label}
            </button>
          ))}
          <button
            onClick={cancelar}
            disabled={salvando}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Demanda 157: pedido já ENTREGUE — só o Admin pode cancelar (caso
          real de devolução depois da entrega). Zu/Gabi não veem o botão. */}
      {pedido.status === "entregue" && isAdmin && (
        <div>
          <button
            onClick={abrirCancelarPago}
            disabled={salvando}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            {salvando ? "..." : "Cancelar pedido entregue"}
          </button>
        </div>
      )}
      {cancelPago && (
        <ModalCancelarPago
          pedido={pedido}
          avisoDiaFechado={cancelPago.aviso}
          onConfirmar={cancelarPago}
          onVoltar={() => setCancelPago(null)}
        />
      )}

      {/* Serviço */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Serviço</h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          <p className="font-medium text-gray-800">{pedido.servico_nome || "—"}</p>
          {pedido.quantidade != null && (
            <p className="text-sm text-gray-600">Quantidade: {pedido.quantidade}</p>
          )}
          {specs.length > 0 && (
            <div className="text-sm text-gray-600 space-y-0.5 pt-1 border-t border-gray-200 mt-2">
              {specs.map(([k, v]) => (
                <p key={k}><span className="font-medium">{k}:</span> {String(v)}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Arquivo */}
      {pedido.arquivo_url && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Arquivo</h3>
          <a
            href={pedido.arquivo_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-lg p-3 text-sm hover:bg-blue-100 transition-colors"
          >
            <span>📎</span>
            <span className="truncate">{pedido.arquivo_nome || "Abrir arquivo"}</span>
          </a>
        </section>
      )}

      {/* Pagamento */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pagamento</h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
          {pedido.valor_unitario != null && (
            <p className="text-gray-600">Valor unit.: {moeda(pedido.valor_unitario)}</p>
          )}
          {pedido.desconto_pct > 0 && (
            <p className="text-gray-600">Desconto: {pedido.desconto_pct}%</p>
          )}
          {pedido.valor_final != null && (
            <p className="font-semibold text-gray-800">Total: {moeda(pedido.valor_final)}</p>
          )}
          <p className="text-gray-600">
            {pedido.pagamento_tipo === "pos_producao" ? "Pós-produção" : pedido.pagamento_tipo}
            {pedido.forma_pagamento ? ` · ${pedido.forma_pagamento}` : ""}
          </p>
          {/* Demanda 124: variação própria quando o Pix da cobrança gerada
              pelo sistema caiu e a confirmação foi automática. */}
          <p className={pedido.pagamento_confirmado ? "text-green-700 font-medium" : "text-gray-400"}>
            {pedido.pagamento_confirmado
              ? (pedido.pagamento_confirmado_origem === "mercadopago"
                  ? `✓ Pago via ${pedido.forma_pagamento || "Pix"} — confirmado automaticamente`
                  : "✓ Pagamento confirmado")
              : "Pagamento pendente"}
          </p>
          {/* Demanda 300: Pix escolhido, ainda sem cobrança gerada (telefone
              provavelmente estava @lid na criação) — a correção automática
              (gatilho no banco) cobre a maioria dos casos sozinha, mas nem
              sempre tem número recuperável (ex. RJ Refrigeração); este botão
              é a rede de segurança manual. */}
          {!pedido.pagamento_confirmado && pedido.status !== "cancelado" &&
            pedido.forma_pagamento_escolhida === "pix" && !pedido.mp_order_id && onGerarPix && (
            <button
              onClick={() => onGerarPix(pedido.id)}
              disabled={gerandoPix}
              className="w-full mt-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg py-2 text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
            >
              {gerandoPix ? "Gerando Pix..." : "💠 Gerar Pix"}
            </button>
          )}
          {/* Demanda 178: estorno detectado no Mercado Pago DEPOIS da
              confirmação — o valor segue contado até alguém revisar. */}
          {pedido.pagamento_estornado_at && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2 text-xs font-medium">
              ⚠️ Estorno detectado no Mercado Pago em {dthr(pedido.pagamento_estornado_at)} —
              o valor ainda conta no caixa. Revise: se o estorno for real, cancele o pedido
              (motivo &quot;Devolução/Reembolso&quot;) pra tirar da contagem.
              {pedido.pagamento_estorno_detalhe && (
                <span className="block text-red-500 mt-1">{pedido.pagamento_estorno_detalhe}</span>
              )}
            </p>
          )}
          {/* Demanda 180: correção EXPLÍCITA da forma de pagamento (só
              Admin) — o único jeito de mudar depois de confirmado; a forma
              antiga vai pro histórico auditável, nada é sobrescrito às
              escondidas. */}
          {pedido.pagamento_confirmado && isAdmin && onCorrigirForma && (
            corrigindoForma ? (
              <div className="pt-1">
                <p className="text-xs text-gray-500 mb-1.5">Forma correta:</p>
                {/* Demanda 219: "Pix RecargaPay" faltava aqui (só existia em
                    ModalConfirmarPagamento desde a 199) — quem tentasse
                    corrigir um pedido de recarga mal rotulado não tinha a
                    opção certa. grid-cols-2 (era 4) porque agora são 5
                    botões no total (4 formas + Voltar), rótulo mais longo. */}
                <div className="grid grid-cols-2 gap-1.5">
                  {["Dinheiro", "Cartão", "Pix", "Pix RecargaPay"].map(opcao => (
                    <button key={opcao} disabled={salvando || opcao === pedido.forma_pagamento}
                      onClick={async () => {
                        setSalvando(true);
                        await onCorrigirForma(pedido.id, opcao);
                        setSalvando(false);
                        setCorrigindoForma(false);
                      }}
                      className="text-xs font-medium rounded-lg py-1.5 border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-700 disabled:opacity-40">
                      {opcao}
                    </button>
                  ))}
                  <button onClick={() => setCorrigindoForma(false)}
                    className="text-xs rounded-lg py-1.5 border border-gray-200 text-gray-400 hover:bg-gray-50">
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              // Demanda 189: o link azul "✏️ Corrigir forma de pagamento" da
              // 180 parecia um AVISO de que algo estava errado mesmo com a
              // forma certa (confusão real do Edvam, print de 15/07). Virou
              // ferramenta discreta: cinza, menor, com frase condicional que
              // deixa claro que só serve se o registro estiver errado.
              <button onClick={() => setCorrigindoForma(true)}
                title="Ferramenta do Admin: só se a forma registrada acima estiver errada — a antiga fica no histórico, nada se perde"
                className="text-[11px] text-gray-400 hover:text-gray-600">
                🔧 Forma registrada errada? Dá pra corrigir
              </button>
            )
          )}
        </div>
      </section>

      {/* Prazo */}
      {(pedido.prazo_solicitado || pedido.prazo_entrega) && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Prazo</h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm text-gray-700">
            {pedido.prazo_solicitado && <p>Solicitado: {pedido.prazo_solicitado}</p>}
            {pedido.prazo_entrega && <p className="font-medium">Entrega: {pedido.prazo_entrega}</p>}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Histórico</h3>
        <div className="space-y-1 text-sm text-gray-500">
          <p>Criado: {dthr(pedido.created_at)}</p>
          {pedido.confirmado_cliente_at && <p>Confirmado: {dthr(pedido.confirmado_cliente_at)}</p>}
          {pedido.data_producao_at      && <p>Produção iniciada: {dthr(pedido.data_producao_at)}</p>}
          {pedido.data_pronto_at        && <p>Pronto: {dthr(pedido.data_pronto_at)}</p>}
          {pedido.data_entregue_at      && <p>Entregue: {dthr(pedido.data_entregue_at)}</p>}
        </div>
      </section>

      {acaoPendente && (
        <ModalConfirmarPagamento
          perguntarGaveta={isAdmin}
          apenasRecarga={!!pedido.eh_recarga}
          onConfirmar={(formaPagamento, pagamentoConfirmadoEm, gavetaDestino) => { const status = acaoPendente; setAcaoPendente(null); executarAvanco(status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino); }}
          onCancelar={() => setAcaoPendente(null)}
        />
      )}
    </div>
  );
}

// ─── DETALHE DE VENDA AGRUPADA (demanda 066) ───────────────────────────────────
// Vários pedidos (1 por item do carrinho) que nasceram na mesma "Confirmar
// Venda" do balcão — cada item mantém seu próprio status/avanço (a gravação
// continua por item), só a exibição é agrupada num único painel.
function PainelDetalheVenda({
  pedidos,
  onMudar,
  onMudarLote,
  isAdmin,
  onAbrirConversa,
}: {
  pedidos: Pedido[];
  onMudar: (id: string, status: string, formaPagamento?: string, motivoCancelamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") => Promise<void>;
  // Demanda 192: avança vários itens de uma vez (1 PATCH por item, 1 reload
  // só no fim) — mesmo mecanismo da 190 no Atendimento.
  onMudarLote: (itens: Pedido[], status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") => Promise<void>;
  isAdmin: boolean;
  onAbrirConversa?: (phone: string) => void;
}) {
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [acaoPendente, setAcaoPendente] = useState<{ id: string; status: string } | null>(null);
  // Demanda 192: avanço em lote (todos os itens abertos, mesma etapa).
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [acaoPendenteLote, setAcaoPendenteLote] = useState<{ itens: Pedido[]; status: string } | null>(null);
  // Demanda 157/177: modal de cancelamento de item PAGO (entregue ou não).
  const [cancelPago, setCancelPago] = useState<{ pedido: Pedido; aviso: string | null } | null>(null);
  const primeiro = pedidos[0];
  const totalVenda = pedidos.reduce((acc, p) => acc + (p.valor_final ?? 0), 0);
  const algumPendente = pedidos.some(p => !p.pagamento_confirmado);
  // Demanda 178: estorno detectado em algum item — alerta no topo da venda.
  const algumEstornado = pedidos.some(p => p.pagamento_estornado_at);
  // Demanda 192: itens ainda abertos e se estão todos na mesma etapa.
  const itensAbertos = pedidos.filter(p => p.status !== "entregue" && p.status !== "cancelado");
  const mesmaEtapa = itensAbertos.length > 0 && itensAbertos.every(p => p.status === itensAbertos[0].status);
  const opcoesLote = mesmaEtapa ? (PROXIMO[itensAbertos[0].status] ?? []) : [];

  async function executarAvancoLote(itens: Pedido[], status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    setSalvandoLote(true);
    await onMudarLote(itens, status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino);
    setSalvandoLote(false);
  }

  // Demanda 192: gate de pagamento idêntico ao por-item (154/155) — abre o
  // modal UMA vez e a forma vale pra todos os itens não pagos; item já pago
  // avança sem receber forma (a 180 nem deixaria sobrescrever).
  function avancarTodos(status: string) {
    if (salvandoLote || salvandoId) return;
    const algumNaoPago = itensAbertos.some(p => !p.pagamento_confirmado);
    if (algumNaoPago && precisaConfirmarPagamento(status, false)) {
      setAcaoPendenteLote({ itens: itensAbertos, status });
      return;
    }
    executarAvancoLote(itensAbertos, status);
  }

  async function executarAvanco(id: string, status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    setSalvandoId(id);
    await onMudar(id, status, formaPagamento, undefined, pagamentoConfirmadoEm, gavetaDestino);
    setSalvandoId(null);
  }

  function avancarItem(id: string, status: string) {
    const item = pedidos.find(p => p.id === id);
    if (item && precisaConfirmarPagamento(status, item.pagamento_confirmado)) {
      setAcaoPendente({ id, status });
      return;
    }
    executarAvanco(id, status);
  }

  // Demanda 112: cancela só o item clicado, não a venda inteira — cada item
  // já mantém seu próprio status/avanço nesta tela, mesmo padrão aqui.
  // Demanda 177: item PAGO cai no modal com aviso + motivo (qualquer status).
  async function cancelarItem(id: string) {
    const item = pedidos.find(p => p.id === id);
    if (item?.pagamento_confirmado) {
      await abrirCancelarPago(item);
      return;
    }
    if (!confirm("Cancelar este item da venda?")) return;
    await executarAvanco(id, "cancelado");
  }

  async function abrirCancelarPago(pedido: Pedido) {
    setSalvandoId(pedido.id);
    const aviso = await avisoSeDiaFechado(pedido);
    setSalvandoId(null);
    setCancelPago({ pedido, aviso });
  }

  async function cancelarPago(motivo: string) {
    if (!cancelPago) return;
    const id = cancelPago.pedido.id;
    setCancelPago(null);
    setSalvandoId(id);
    await onMudar(id, "cancelado", undefined, motivo);
    setSalvandoId(null);
  }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400 font-mono mb-0.5">🧾 Venda com {pedidos.length} itens</p>
          {onAbrirConversa && telefoneNavegavel(primeiro.telefone) ? (
            <button onClick={() => onAbrirConversa(primeiro.telefone)}
              title="Abrir a conversa/contato deste cliente"
              className="text-lg font-bold text-blue-700 leading-tight hover:underline text-left">
              {nomeDono(primeiro.nome_cliente, primeiro.telefone)} 💬
            </button>
          ) : (
            <p className="text-lg font-bold text-gray-800 leading-tight">
              {nomeDono(primeiro.nome_cliente, primeiro.telefone)}
            </p>
          )}
          {primeiro.forma_pagamento && (
            <p className="text-sm text-gray-500">{primeiro.forma_pagamento}</p>
          )}
        </div>
        <p className="font-bold text-blue-700 text-lg">{moeda(totalVenda)}</p>
      </div>

      {algumPendente && (
        <p className="text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
          ⚠️ Pagamento pendente em pelo menos 1 item desta venda
        </p>
      )}
      {/* Demanda 178: estorno detectado no MP depois da confirmação. */}
      {algumEstornado && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ Estorno detectado no Mercado Pago em pelo menos 1 item — o valor ainda conta no
          caixa; revise e cancele o item se o estorno for real.
        </p>
      )}

      {/* Demanda 192: avançar TODOS os itens abertos de uma vez (mesma etapa)
          — mesmo mecanismo da 190 no Atendimento. "Pronto" tem 2 destinos
          possíveis (065), então vira um botão por opção. Etapas divergentes →
          aviso e seguem os botões por item. */}
      {itensAbertos.length > 1 && (mesmaEtapa ? (
        opcoesLote.length > 0 && (
          <div className="flex gap-2">
            {opcoesLote.map(opcao => (
              <button key={opcao.status} onClick={() => avancarTodos(opcao.status)}
                disabled={salvandoLote || !!salvandoId}
                className="flex-1 bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded-lg hover:bg-blue-800 disabled:opacity-50">
                {salvandoLote ? "Salvando..." : `Todos os ${itensAbertos.length} itens: ${opcao.label}`}
              </button>
            ))}
          </div>
        )
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Itens em etapas diferentes — avance um a um abaixo até alinharem.
        </p>
      ))}

      <div className="space-y-2">
        {pedidos.map(pedido => {
          const proximo = PROXIMO[pedido.status];
          return (
            <div key={pedido.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{pedido.servico_nome || "—"}</p>
                  {pedido.quantidade != null && (
                    <p className="text-xs text-gray-500">Qtd: {pedido.quantidade} · {moeda(pedido.valor_final)}</p>
                  )}
                </div>
                <BadgeStatus status={pedido.status} />
              </div>
              {pedido.status !== "entregue" && pedido.status !== "cancelado" && proximo && (
                <div className="flex gap-2">
                  {proximo.map(opcao => (
                    <button
                      key={opcao.status}
                      onClick={() => avancarItem(pedido.id, opcao.status)}
                      disabled={salvandoId === pedido.id}
                      className="flex-1 bg-blue-600 text-white text-xs font-medium py-1.5 px-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {salvandoId === pedido.id ? "Salvando..." : opcao.label}
                    </button>
                  ))}
                  <button
                    onClick={() => cancelarItem(pedido.id)}
                    disabled={salvandoId === pedido.id}
                    title="Cancelar este item"
                    className="px-2 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              )}
              {/* Demanda 178: estorno detectado neste item. */}
              {pedido.pagamento_estornado_at && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                  ⚠️ Estorno detectado no MP em {dthr(pedido.pagamento_estornado_at)}
                </p>
              )}
              {/* Demanda 157: item já entregue — só Admin cancela (devolução). */}
              {pedido.status === "entregue" && isAdmin && (
                <button
                  onClick={() => abrirCancelarPago(pedido)}
                  disabled={salvandoId === pedido.id}
                  className="px-2 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {salvandoId === pedido.id ? "..." : "Cancelar item entregue"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {acaoPendente && (
        <ModalConfirmarPagamento
          perguntarGaveta={isAdmin}
          apenasRecarga={!!pedidos.find(p => p.id === acaoPendente.id)?.eh_recarga}
          onConfirmar={(formaPagamento, pagamentoConfirmadoEm, gavetaDestino) => { const { id, status } = acaoPendente; setAcaoPendente(null); executarAvanco(id, status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino); }}
          onCancelar={() => setAcaoPendente(null)}
        />
      )}
      {/* Demanda 192: gate do avanço em lote — um modal, forma pra todos os
          itens não pagos. Demanda 219: só esconde o Pix genérico quando TODOS
          os itens do lote são recarga — carrinho misto continua com as 4
          opções (fora de escopo tratar aqui, ver relato da 219). */}
      {acaoPendenteLote && (
        <ModalConfirmarPagamento
          perguntarGaveta={isAdmin}
          apenasRecarga={acaoPendenteLote.itens.every(p => !!p.eh_recarga)}
          onConfirmar={(formaPagamento, pagamentoConfirmadoEm, gavetaDestino) => {
            const { itens, status } = acaoPendenteLote;
            setAcaoPendenteLote(null);
            executarAvancoLote(itens, status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino);
          }}
          onCancelar={() => setAcaoPendenteLote(null)}
        />
      )}
      {cancelPago && (
        <ModalCancelarPago
          pedido={cancelPago.pedido}
          avisoDiaFechado={cancelPago.aviso}
          onConfirmar={cancelarPago}
          onVoltar={() => setCancelPago(null)}
        />
      )}
    </div>
  );
}

// ─── CARD FILA ────────────────────────────────────────────────────────────────
function CardFila({
  pedido,
  onMudar,
  onAbrir,
  isAdmin,
}: {
  pedido: Pedido;
  onMudar: (id: string, status: string, formaPagamento?: string, motivoCancelamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") => Promise<void>;
  // Demanda 176: clicar no corpo do card abre o detalhe completo do pedido
  // (princípio do Edvam: card de pedido é sempre um link pro pedido).
  onAbrir: (pedido: Pedido) => void;
  // Demanda 197: mesmo critério da 196/197 pra saber se quem confirma
  // precisa escolher a gaveta de destino (papel admin = sem gaveta própria).
  isAdmin: boolean;
}) {
  const [salvando, setSalvando] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<string | null>(null);
  // Demanda 177: modal de cancelamento de pedido PAGO, também na fila.
  const [cancelPago, setCancelPago] = useState<{ aviso: string | null } | null>(null);
  const proximo = PROXIMO[pedido.status];
  const specs = pedido.specs ? Object.entries(pedido.specs) : [];
  // Demanda 202: destaque visual — este pedido foi gerado automaticamente
  // (futuro agente de WhatsApp, Fase B) e precisa de aprovação humana antes
  // de virar um pedido "de verdade" na esteira. Hoje nada cria pedido nesse
  // status; isso só existe pra a UI já estar pronta.
  const ehAguardandoAprovacao = pedido.status === "aguardando_aprovacao";

  async function executarAvanco(status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    setSalvando(true);
    await onMudar(pedido.id, status, formaPagamento, undefined, pagamentoConfirmadoEm, gavetaDestino);
    setSalvando(false);
  }

  function avancarPara(status: string) {
    if (precisaConfirmarPagamento(status, pedido.pagamento_confirmado)) {
      setAcaoPendente(status);
      return;
    }
    executarAvanco(status);
  }

  // Demanda 112: mesmo padrão simples de confirmação já usado em
  // PainelDetalhe — cancelamento não exige motivo, só "tem certeza?".
  // Demanda 177: pedido PAGO cai no modal com aviso + motivo.
  async function cancelar() {
    if (pedido.pagamento_confirmado) {
      setSalvando(true);
      const aviso = await avisoSeDiaFechado(pedido);
      setSalvando(false);
      setCancelPago({ aviso });
      return;
    }
    if (!confirm("Cancelar este pedido?")) return;
    setSalvando(true);
    await onMudar(pedido.id, "cancelado");
    setSalvando(false);
  }

  async function cancelarPago(motivo: string) {
    setCancelPago(null);
    setSalvando(true);
    await onMudar(pedido.id, "cancelado", undefined, motivo);
    setSalvando(false);
  }

  return (
    // Demanda 176: o corpo inteiro do card é clicável e abre o detalhe; os
    // botões de ação param a propagação pra continuarem fazendo só a ação.
    // Com modal aberto (acaoPendente/cancelPago), o clique no overlay não
    // pode navegar — o guard cobre o evento que borbulha do overlay.
    <div
      onClick={() => { if (!acaoPendente && !cancelPago) onAbrir(pedido); }}
      title="Abrir o detalhe deste pedido"
      className={`rounded-xl p-4 space-y-3 hover:shadow-md transition-all cursor-pointer ${
        ehAguardandoAprovacao
          ? "bg-fuchsia-50 border-2 border-fuchsia-300 hover:border-fuchsia-400"
          : "bg-white border border-gray-200 hover:border-blue-300"
      }`}
    >
      {/* Demanda 202: banner explícito — este card não é um pedido confirmado
          por um humano ainda, precisa saltar aos olhos antes de aprovar. */}
      {ehAguardandoAprovacao && (
        <p className="text-xs font-semibold text-fuchsia-800 bg-fuchsia-100 border border-fuchsia-300 rounded-lg px-2.5 py-1.5">
          🤖 Gerado automaticamente — revise antes de aprovar
        </p>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800 leading-tight">
            {nomeDono(pedido.nome_cliente, pedido.telefone)}
          </p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{pedido.id}</p>
        </div>
        <BadgeStatus status={pedido.status} />
      </div>

      <div className="text-sm text-gray-700 space-y-0.5">
        <p className="font-medium">{pedido.servico_nome || "Serviço não especificado"}</p>
        {pedido.quantidade != null && <p className="text-gray-500">Qtd: {pedido.quantidade}</p>}
        {specs.map(([k, v]) => (
          <p key={k} className="text-gray-500">{k}: {String(v)}</p>
        ))}
      </div>

      {pedido.prazo_entrega && (
        <p className="text-xs font-medium text-orange-700 bg-orange-50 rounded px-2 py-1 inline-block">
          Prazo: {pedido.prazo_entrega}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        {pedido.arquivo_url && (
          <a
            href={pedido.arquivo_url}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 text-center text-sm py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            📎 Arquivo
          </a>
        )}
        {proximo && proximo.map(opcao => (
          <button
            key={opcao.status}
            onClick={e => { e.stopPropagation(); avancarPara(opcao.status); }}
            disabled={salvando}
            className={`flex-1 text-white text-sm py-1.5 rounded-lg disabled:opacity-50 transition-colors ${
              ehAguardandoAprovacao ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {salvando ? "..." : opcao.label}
          </button>
        ))}
        {/* Demanda 112 — cancelar direto da fila de impressão, sem precisar
            abrir o detalhe. Demanda 202: rótulo/estilo vira "✕ Rejeitar" pra
            pedido aguardando aprovação — mesmo cancelamento de sempre por
            baixo (com motivo/histórico quando já pago), só rótulo diferente:
            "rejeitar" comunica melhor a decisão de um revisor humano do que
            "cancelar" comunicaria pro caso comum. */}
        <button
          onClick={e => { e.stopPropagation(); cancelar(); }}
          disabled={salvando}
          title={ehAguardandoAprovacao ? "Rejeitar este pedido" : "Cancelar este pedido"}
          className={ehAguardandoAprovacao
            ? "px-3 py-1.5 text-sm font-semibold text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            : "px-2.5 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"}
        >
          {ehAguardandoAprovacao ? "✕ Rejeitar" : "✕"}
        </button>
      </div>

      {acaoPendente && (
        <ModalConfirmarPagamento
          perguntarGaveta={isAdmin}
          apenasRecarga={!!pedido.eh_recarga}
          onConfirmar={(formaPagamento, pagamentoConfirmadoEm, gavetaDestino) => { const status = acaoPendente; setAcaoPendente(null); executarAvanco(status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino); }}
          onCancelar={() => setAcaoPendente(null)}
        />
      )}
      {cancelPago && (
        <ModalCancelarPago
          pedido={pedido}
          avisoDiaFechado={cancelPago.aviso}
          onConfirmar={cancelarPago}
          onVoltar={() => setCancelPago(null)}
        />
      )}
    </div>
  );
}

// ─── RESUMO SEM SELEÇÃO (demanda 175) ─────────────────────────────────────────
// O painel direito ficava um vazio gigante ("Selecione um pedido...") sempre
// que nada estava selecionado — em monitor grande, metade da tela morta.
// Agora mostra um panorama útil derivado da MESMA lista já carregada (zero
// chamada nova): contagem por status (clicável → aplica o filtro), pendências
// de pagamento e os pedidos em aberto mais recentes (clicável → seleciona).
function ResumoSemSelecao({
  pedidos,
  onFiltrar,
  onSelecionar,
}: {
  pedidos: Pedido[];
  onFiltrar: (status: string) => void;
  onSelecionar: (pedido: Pedido) => void;
}) {
  const ABERTOS = ["aguardando_aprovacao", "aguardando_confirmacao", "confirmado", "em_producao", "pronto", "aguardando_retirada"];
  const porStatus = ABERTOS
    .map(s => ({ status: s, count: pedidos.filter(p => p.status === s).length }))
    .filter(x => x.count > 0);
  const pendentesPagamento = pedidos.filter(p => !p.pagamento_confirmado && p.status !== "cancelado");
  const valorPendente = pendentesPagamento.reduce((a, p) => a + (p.valor_final ?? 0), 0);
  const estornados = pedidos.filter(p => p.pagamento_estornado_at && p.status !== "cancelado");
  const emAberto = pedidos.filter(p => ABERTOS.includes(p.status)).slice(0, 6);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-1">Panorama dos pedidos</h3>
        <p className="text-xs text-gray-400">Clique num pedido da lista pra ver o detalhe — ou use os atalhos abaixo.</p>
      </div>

      {porStatus.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {porStatus.map(({ status, count }) => {
            const cfg = STATUS_CFG[status];
            return (
              <button key={status} onClick={() => onFiltrar(status)}
                title="Filtrar a lista por esse status"
                className={`rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-blue-300 hover:shadow-sm transition-all`}>
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className={`text-xs font-medium ${cfg?.cor ?? "text-gray-500"}`}>{cfg?.label ?? status}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl p-4">
          🎉 Nenhum pedido em aberto — tudo entregue.
        </p>
      )}

      {pendentesPagamento.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-orange-800">
            💰 {pendentesPagamento.length} {pendentesPagamento.length === 1 ? "pedido" : "pedidos"} com pagamento pendente · {moeda(valorPendente)}
          </p>
        </div>
      )}
      {/* Demanda 178: estorno detectado — visível já na entrada da aba. */}
      {estornados.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-red-800">
            ⚠️ {estornados.length} {estornados.length === 1 ? "pedido" : "pedidos"} com estorno detectado no Mercado Pago — abra pra revisar
          </p>
        </div>
      )}

      {emAberto.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Em aberto mais recentes</h4>
          <div className="space-y-1.5">
            {emAberto.map(p => (
              <button key={p.id} onClick={() => onSelecionar(p)}
                className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-300 transition-colors flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-800 truncate">
                    {nomeDono(p.nome_cliente, p.telefone)}
                  </span>
                  <span className="block text-xs text-gray-400 truncate">{p.servico_nome || "—"} · {dthr(p.created_at)}</span>
                </span>
                <BadgeStatus status={p.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PRINCIPAL ────────────────────────────────────────────────────────────────
// Demanda 171: telefone "de verdade" navegável — pedido de balcão anônimo
// ('balcao'), contato sintético ('balcao-<ts>', 163) e entrada de contas a
// receber ('contas_a_receber', 096) não têm conversa/contato pra abrir.
export function telefoneNavegavel(telefone: string | null): boolean {
  return !!telefone && /^\d+$/.test(telefone);
}

export function TelaPedidos({ operador, onAbrirConversa, abrirBusca }: {
  operador: Usuario;
  // Demanda 171: clicar no cliente de um pedido abre a conversa/contato dele.
  onAbrirConversa?: (phone: string) => void;
  // Demanda 171: outra tela pede pra abrir Pedidos já filtrado (ex. Clientes
  // → "Ver na aba Pedidos"); nonce força reaplicar mesmo com o mesmo valor.
  abrirBusca?: { valor: string; nonce: number } | null;
}) {
  const [view, setView] = useState<"lista" | "fila">("lista");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  // Demanda 066: seleção passou a poder ser 1 pedido ou 1 venda agrupada
  // (vários pedidos com o mesmo venda_id) — deriva de `pedidos` a cada
  // render em vez de guardar o objeto, assim continua em sincronia sozinho
  // depois de qualquer `carregar()` (ex.: status mudou).
  const [selecao, setSelecao] = useState<{ tipo: "unico"; id: string } | { tipo: "venda"; vendaId: string } | null>(null);
  // Demanda 300: retry manual de Pix (rede de segurança pro caso sem
  // correção automática de telefone @lid) — QR do resultado, mesmo modal do
  // balcão/Inbox.
  const [gerandoPixId, setGerandoPixId] = useState<string | null>(null);
  const [qrPix, setQrPix] = useState<CobrancaPixModal | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/pedidos");
      const d = await res.json();
      const novos: Pedido[] = d.pedidos ?? [];
      setPedidos(novos);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  // Demanda 136: a aba não desmonta mais ao trocar — recarrega ao reativar.
  useRecarregarAoReativar(carregar);

  // Demanda 171: navegação vinda de Clientes/Inbox — pré-preenche a busca
  // com o telefone do contato (o campo já busca por telefone desde sempre).
  useEffect(() => {
    if (!abrirBusca?.valor) return;
    setBusca(abrirBusca.valor);
    setFiltroStatus("todos");
    setView("lista");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirBusca?.nonce]);

  async function mudarStatus(id: string, novoStatus: string, formaPagamento?: string, motivoCancelamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    const res = await fetch("/api/pedidos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: novoStatus, operador: operador.nome, formaPagamento, motivoCancelamento, pagamentoConfirmadoEm, gavetaDestino }),
    });
    // Demanda 224: a tentativa de mudar a forma de pagamento pode ter sido
    // bloqueada (pedido já confirmado com outra forma, regra da 180) — antes
    // isso era 100% silencioso; agora avisa e aponta a ferramenta certa.
    const data = await res.json().catch(() => null);
    if (data?.avisoFormaPagamentoNaoAlterada) {
      alert("A forma de pagamento já estava confirmada e NÃO foi alterada. Use \"🔧 Corrigir forma de pagamento\" se precisar mudar de verdade.");
    }
    await carregar();
  }

  // Demanda 192: avanço em LOTE (venda agrupada) — 1 PATCH por item, mas um
  // único reload no fim (o onMudar normal recarrega a cada chamada). Item já
  // pago não recebe forma de pagamento — só os pendentes confirmam junto.
  // Demanda 197: gavetaDestino segue a MESMA regra da forma — só vai pros
  // itens que estão sendo confirmados agora (já pago não recebe nada disso).
  async function mudarStatusLote(itens: Pedido[], novoStatus: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    // Demanda 224: mesmo aviso do avanço por item — se QUALQUER item do lote
    // bloquear a mudança de forma, avisa uma vez só no final (não interrompe
    // o lote no meio).
    let algumBloqueado = false;
    for (const item of itens) {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id, status: novoStatus, operador: operador.nome,
          formaPagamento: item.pagamento_confirmado ? undefined : formaPagamento,
          pagamentoConfirmadoEm: item.pagamento_confirmado ? undefined : pagamentoConfirmadoEm,
          gavetaDestino: item.pagamento_confirmado ? undefined : gavetaDestino,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.avisoFormaPagamentoNaoAlterada) algumBloqueado = true;
    }
    if (algumBloqueado) {
      alert("A forma de pagamento de pelo menos 1 item já estava confirmada e NÃO foi alterada. Use \"🔧 Corrigir forma de pagamento\" se precisar mudar de verdade.");
    }
    await carregar();
  }

  // Demanda 180: correção explícita e auditável da forma de pagamento de um
  // pedido já confirmado — a antiga vai pro histórico, nada é sobrescrito.
  async function corrigirFormaPagamento(id: string, forma: string) {
    const res = await fetch("/api/pedidos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, corrigirFormaPagamento: true, formaPagamento: forma, operador: operador.nome }),
    });
    const data = await res.json();
    if (!res.ok || data.error) alert(data.error || "Erro ao corrigir a forma de pagamento.");
    await carregar();
  }

  // Demanda 300: gera o Pix de um pedido que ficou preso (telefone estava em
  // formato @lid na criação, ninguém retentava — mesma rota que o gatilho
  // automático do banco chama assim que o telefone é corrigido).
  async function gerarPix(id: string) {
    setGerandoPixId(id);
    try {
      const res = await fetch("/api/pedidos/retentar-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId: id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Não foi possível gerar o Pix.");
        return;
      }
      setQrPix({ orderId: data.orderId, qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64, valor: data.valor });
      await carregar();
    } finally {
      setGerandoPixId(null);
    }
  }

  // Demanda 176: clicar no corpo de um card da Fila de impressão abre o
  // detalhe COMPLETO — volta pra view "lista" já com o pedido selecionado
  // (venda agrupada quando o pedido faz parte de um carrinho com 2+ itens,
  // igual à seleção normal da lista).
  function abrirDetalheDaFila(p: Pedido) {
    const doGrupo = p.venda_id ? pedidos.filter(x => x.venda_id === p.venda_id) : [];
    setSelecao(doGrupo.length > 1 ? { tipo: "venda", vendaId: p.venda_id! } : { tipo: "unico", id: p.id });
    setView("lista");
  }

  const filtrados = pedidos.filter(p => {
    if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        p.nome_cliente?.toLowerCase().includes(q) ||
        p.telefone.includes(q) ||
        p.servico_nome?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Demanda 202: pedido aguardando aprovação (futuro agente de WhatsApp,
  // Fase B — hoje nada cria pedido neste status) vira também revisável aqui,
  // decisão do Edvam (2026-07-12) de reaproveitar esta aba em vez de criar
  // uma nova. O contador do badge da aba (abaixo) já reflete isso sozinho —
  // cobre o "indicador visual simples" que a demanda pede como alternativa a
  // um popup de notificação completo (que fica pra quando a Fase B existir).
  const fila = pedidos.filter(p => p.status === "confirmado" || p.status === "em_producao" || p.status === "aguardando_aprovacao");

  const entradasLista = useMemo(() => agruparPorVenda(filtrados), [filtrados]);

  const pedidoAtivo = selecao?.tipo === "unico" ? pedidos.find(p => p.id === selecao.id) ?? null : null;
  const vendaAtiva = selecao?.tipo === "venda" ? pedidos.filter(p => p.venda_id === selecao.vendaId) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Abas de view */}
      <div className="px-4 pt-3 flex gap-1 border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setView("lista")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            view === "lista"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          📋 Todos os pedidos
        </button>
        <button
          onClick={() => setView("fila")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
            view === "fila"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🖨️ Fila de impressão
          {fila.length > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center leading-none">
              {fila.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW: lista */}
      {view === "lista" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Coluna esquerda — demanda 175: em monitor grande a lista era uma
              faixa espremida de 320px com um vazio gigante do lado; cresce
              com a tela (segue estreita em tela pequena, sem quebrar nada). */}
          <div className="w-80 xl:w-96 2xl:w-[28rem] flex flex-col border-r border-gray-200 bg-white shrink-0">
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Buscar cliente, telefone, serviço..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-gray-100">
              {FILTROS.map(f => {
                const count = f.value === "todos"
                  ? pedidos.length
                  : pedidos.filter(p => p.status === f.value).length;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFiltroStatus(f.value)}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                      filtroStatus === f.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                    {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex-1 overflow-y-auto">
              {carregando ? (
                <p className="text-center text-sm text-gray-400 p-6">Carregando...</p>
              ) : entradasLista.length === 0 ? (
                <p className="text-center text-sm text-gray-400 p-6">Nenhum pedido encontrado</p>
              ) : (
                entradasLista.map(entrada => {
                  if (entrada.tipo === "unico") {
                    const p = entrada.pedido;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelecao({ tipo: "unico", id: p.id })}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          selecao?.tipo === "unico" && selecao.id === p.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {nomeDono(p.nome_cliente, p.telefone)}
                          </span>
                          <BadgeStatus status={p.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate">{p.servico_nome || "—"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dthr(p.created_at)}</p>
                      </button>
                    );
                  }
                  const primeiro = entrada.pedidos[0];
                  const totalVenda = entrada.pedidos.reduce((acc, p) => acc + (p.valor_final ?? 0), 0);
                  const statusUnico = entrada.pedidos.every(p => p.status === primeiro.status) ? primeiro.status : null;
                  return (
                    <button
                      key={entrada.vendaId}
                      onClick={() => setSelecao({ tipo: "venda", vendaId: entrada.vendaId })}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        selecao?.tipo === "venda" && selecao.vendaId === entrada.vendaId ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          🧾 {nomeDono(primeiro.nome_cliente, primeiro.telefone)}
                        </span>
                        {statusUnico ? <BadgeStatus status={statusUnico} /> : (
                          <span className="text-xs text-gray-400 whitespace-nowrap">Vários status</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{entrada.pedidos.length} itens · {moeda(totalVenda)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{dthr(primeiro.created_at)}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna direita: detalhe */}
          <div className="flex-1 bg-gray-50 overflow-hidden">
            {pedidoAtivo ? (
              <PainelDetalhe key={pedidoAtivo.id} pedido={pedidoAtivo} onMudar={mudarStatus} isAdmin={operador.papel === "admin"} onAbrirConversa={onAbrirConversa} onCorrigirForma={corrigirFormaPagamento} onGerarPix={gerarPix} gerandoPix={gerandoPixId === pedidoAtivo.id} />
            ) : vendaAtiva && vendaAtiva.length > 0 ? (
              <PainelDetalheVenda key={vendaAtiva[0].venda_id} pedidos={vendaAtiva} onMudar={mudarStatus} onMudarLote={mudarStatusLote} isAdmin={operador.papel === "admin"} onAbrirConversa={onAbrirConversa} />
            ) : (
              <ResumoSemSelecao
                pedidos={pedidos}
                onFiltrar={s => { setFiltroStatus(s); setBusca(""); }}
                onSelecionar={p => setSelecao(p.venda_id && pedidos.filter(x => x.venda_id === p.venda_id).length > 1
                  ? { tipo: "venda", vendaId: p.venda_id }
                  : { tipo: "unico", id: p.id })}
              />
            )}
          </div>
        </div>
      )}

      {/* VIEW: fila de impressão */}
      {view === "fila" && (
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {carregando ? (
            <p className="text-center text-sm text-gray-400 py-12">Carregando...</p>
          ) : fila.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <p className="text-5xl mb-3">🖨️</p>
              <p className="text-sm">Nenhum pedido na fila de impressão</p>
              <p className="text-xs mt-1 text-gray-300">Pedidos confirmados, em produção e aguardando aprovação aparecem aqui</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {fila.map(p => (
                <CardFila key={p.id} pedido={p} onMudar={mudarStatus} onAbrir={abrirDetalheDaFila} isAdmin={operador.papel === "admin"} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Demanda 300: QR do Pix gerado manualmente (retry) — mesmo modal do
          balcão/Inbox, sem ação de cancelar venda (não existe aqui). */}
      {qrPix && (
        <ModalQrPix cobranca={qrPix} onFechar={() => setQrPix(null)} />
      )}
    </div>
  );
}
