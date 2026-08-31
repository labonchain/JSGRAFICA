"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { type Usuario } from "@/lib/usuarios";
import { CATEGORIA_PARA_GRUPO, ORDEM_GRUPOS, sanitizarValorMonetario, ordenarProdutosDoGrupo, CATEGORIAS_RECARGA } from "@/lib/dados";
import { STATUS_CFG, precisaConfirmarPagamento, ModalConfirmarPagamento } from "@/components/TelaPedidos";
import { ModalQrPix, type CobrancaPixModal } from "@/components/ModalQrPix";

// ── Inbox types ───────────────────────────────────────────────
interface Conversa {
  phone: string;
  nome: string;
  foto: string | null;
  ultimaMsg: string;
  ultimaMsgDe: "nos" | "cliente";
  ultimaMsgTs: number | null;
  dataUltimoContato: string | null;
  totalRecebidas: number;
  totalEnviadas: number;
  // Demanda 321: "escalado" é novo — a IA tentou atender e desistiu, precisa
  // de humano com prioridade. Só a IA marca esse valor (workflow 296).
  statusAtendimento: "aberto" | "em_atendimento" | "resolvido" | "escalado";
  atendente: string | null;
  motivoEscalonamento: string | null;
  ultimaLeitura: string | null;
  naoLidas: number;
  arquivado: boolean;
  temNome: boolean;
}

interface Mensagem {
  message_id: string;
  from_me: boolean;
  message_text: string | null;
  media_type: string | null;
  media_url: string | null;
  caption: string | null;
  transcription_text: string | null;
  ptt: boolean;
  audio_duration: number | null;
  status: string | null;
  sent_at: string | null;
  data_timestamp: number;
  quoted_msg_id: string | null;
  quoted_msg_body: string | null;
  reaction_text: string | null;
  from_api: boolean;
  // Demanda 191: mensagem enviada que a equipe apagou pra todos via Z-API —
  // a bolha vira "🚫 Mensagem apagada" (a linha do log nunca é deletada).
  apagada_em?: string | null;
  // Demanda 282: botão/lista de verdade que o cliente recebeu no WhatsApp,
  // extraído do payload original (raw_zapi) — só exibição, não clicável.
  interativo?:
    | { tipo: "botoes"; botoes: string[] }
    | { tipo: "lista"; botaoTexto: string; opcoes: string[] }
    | null;
}

// ── Produto (usado pelo fluxo de "Criar pedido", demanda 045) ──
interface ProdutoAPI { id: string; nome: string; preco: number | null; categoria: string; }

// ── Pedido types (demandas 045/046) ──────────────────────────
interface PedidoAPI {
  id: string;
  telefone: string;
  servico_nome: string | null;
  quantidade: number | null;
  desconto_pct: number | null;
  valor_final: number | null;
  status: string;
  venda_id: string | null;
  // Demanda 089: precisa pra checagem de pagamento pendente (mesma regra de
  // TelaPedidos.tsx, precisaConfirmarPagamento).
  pagamento_tipo: string;
  pagamento_confirmado: boolean;
  // Demanda 113: exibir forma de pagamento no card, mesmo padrão do Balcão.
  forma_pagamento: string | null;
  // Demanda 124: 'mercadopago' quando a confirmação veio automática (Pix
  // real pago via cobrança do sistema), 'manual' quando alguém confirmou.
  pagamento_confirmado_origem?: string | null;
  // Demanda 219: calculado pelo GET /api/pedidos — esconde o Pix genérico no
  // ModalConfirmarPagamento quando o item é recarga (VEM/celular).
  eh_recarga?: boolean;
}
interface CalculoPedido { valorUnitario: number; quantidade: number; valorTotal: number; descontoPct: number; valorFinal: number; }

// Demanda 124: pagamento confirmado automaticamente via Mercado Pago ganha
// texto próprio no card — o operador sabe que ninguém precisou conferir
// comprovante na mão.
function textoPagamento(p: PedidoAPI, textoPendente: string): string {
  if (!p.pagamento_confirmado) {
    return `${p.forma_pagamento ? `${p.forma_pagamento} · ` : ""}${textoPendente}`;
  }
  if (p.pagamento_confirmado_origem === "mercadopago") {
    return `✓ Pago via ${p.forma_pagamento || "Pix"} — confirmado automaticamente`;
  }
  return `${p.forma_pagamento ? `${p.forma_pagamento} · ` : ""}✓ Pago`;
}

// Demanda 076: item já resolvido (preço calculado ou valor manual
// informado) esperando confirmação final, dentro do carrinho de "Criar
// pedido" do Inbox.
interface ItemCarrinhoPedido {
  produto: ProdutoAPI;
  quantidade: number;
  valorManual: number | null;
  calculo: CalculoPedido | null;
}

// Demanda 071: a ordem/rótulo do progresso vêm de STATUS_CFG (TelaPedidos.tsx,
// fonte de verdade corrigida na 065) — antes era uma cópia própria aqui que
// ficou desatualizada e travava o cartão em "Confirmado" pra pedidos já em
// "aguardando_retirada". PROXIMO_STATUS_PEDIDO continua com 1 próximo passo só
// (o cartão aqui não tem espaço pra 2 opções como o painel de Pedidos) — de
// "pronto" continua indo direto pra "entregue" (comportamento já existente,
// fora de escopo mudar o desenho do cartão); "aguardando_retirada" ganhou o
// avanço pra "entregue" que faltava.
const STATUS_ORDER_PEDIDO = ["confirmado", "em_producao", "pronto", "aguardando_retirada", "entregue"];
const STATUS_LABEL_PEDIDO: Record<string, string> = Object.fromEntries(
  STATUS_ORDER_PEDIDO.map(s => [s, STATUS_CFG[s]?.label ?? s])
);
const PROXIMO_STATUS_PEDIDO: Record<string, string | undefined> = {
  confirmado: "em_producao", em_producao: "pronto", pronto: "entregue", aguardando_retirada: "entregue",
};

// Demanda 119: "Resumir conversa" (demanda 048) desativado por enquanto —
// código/estado/função continuam intactos, só a renderização fica atrás
// dessa flag. Reativar é só virar pra `true`, sem reconstruir nada.
const RESUMIR_CONVERSA_ATIVO = false;

function MsgStatus({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  const isSending  = s === "" || s === "sending" || s === "pending";
  const isRead     = s === "read" || s === "viewed" || s === "played";
  const isDouble   = isRead || s === "delivered" || s === "received" || s === "device";
  const color      = isRead ? "#53bdeb" : "currentColor";

  if (isSending) return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="opacity-50 flex-shrink-0">
      <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.5 3v2.5L7.3 6.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );

  return (
    <svg width={isDouble ? 17 : 11} height="11"
         viewBox={isDouble ? "0 0 17 11" : "0 0 11 11"}
         fill="none" className={isDouble ? "flex-shrink-0" : "opacity-70 flex-shrink-0"}>
      <path d="M1 5.5L4 8.5L10 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {isDouble && (
        <path d="M7 5.5L10 8.5L16 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      )}
    </svg>
  );
}

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Demanda 071: lê a largura salva da barra lateral (localStorage) — cai pro
// padrão se não houver nada salvo ainda ou se o componente renderizar no
// servidor (SSR não tem `window`).
function lerLarguraSalva(chave: string, padrao: number): number {
  if (typeof window === "undefined") return padrao;
  const salvo = Number(localStorage.getItem(chave));
  return salvo > 0 ? salvo : padrao;
}

// Foto de perfil com fallback pra letra do nome — cai pro fallback tanto
// quando não há foto salva quanto quando a URL falha ao carregar (as URLs de
// mídia do WhatsApp expiram depois de um tempo; sem isso ficava um ícone de
// imagem quebrada em vez do avatar — achado da demanda 029).
function Avatar({ foto, nome, sizeClass, textClass = "text-sm", extraClass = "" }: {
  foto: string | null; nome: string; sizeClass: string; textClass?: string; extraClass?: string;
}) {
  const [erro, setErro] = useState(false);
  if (foto && !erro) {
    return (
      <img src={foto} alt="" onError={() => setErro(true)}
        className={`${sizeClass} rounded-full object-cover ${extraClass}`} />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ${textClass} ${extraClass}`}>
      {(nome || "?")[0].toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// `abrirConversa` (demanda 083) — sinal vindo da página de Clientes pra abrir
// uma conversa específica direto no Inbox (atalho "abrir no Inbox"). Usa
// `nonce` pra disparar o efeito mesmo clicando duas vezes seguidas no mesmo
// telefone.
export function TelaInbox({ operador, abrirConversa, onAbrirPedidos, abrirFiltroStatus }: {
  operador: Usuario;
  abrirConversa?: { phone: string; nonce: number } | null;
  // Demanda 171: navegação cruzada — abre a aba Pedidos filtrada pelo contato.
  onAbrirPedidos?: (phone: string) => void;
  // Demanda 325: navegação cruzada do banner de escalados (shell do Admin,
  // app/page.tsx) — mesmo padrão de nonce do abrirConversa acima, pra poder
  // disparar de novo mesmo clicando 2x seguidas no banner sem trocar de aba.
  abrirFiltroStatus?: { status: string; nonce: number } | null;
}) {

  // ── Inbox state ──
  const [conversas, setConversas]           = useState<Conversa[]>([]);
  const [filtroStatus, setFiltroStatus]     = useState<string>("");
  const [busca, setBusca]                   = useState("");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [phoneAtivo, setPhoneAtivo]         = useState<string | null>(null);
  const [mensagens, setMensagens]           = useState<Mensagem[]>([]);
  const [reply, setReply]                   = useState("");
  // ── Sugestão de IA / resumo de conversa (demanda 048) ──
  const [sugerindoIA, setSugerindoIA]       = useState(false);
  const [sugestaoAtiva, setSugestaoAtiva]   = useState(false);
  const [iaErro, setIaErro]                 = useState<string | null>(null);
  const [resumoConversa, setResumoConversa] = useState<string | null>(null);
  const [resumindo, setResumindo]           = useState(false);
  const [resumoErro, setResumoErro]         = useState<string | null>(null);
  // ── Transcrever áudio sob demanda (demanda 059) ──
  const [transcrevendo, setTranscrevendo]   = useState<string | null>(null); // message_id em andamento
  // Demanda 191: apagar (pra todos) uma mensagem enviada — message_id em andamento.
  const [apagandoMsgId, setApagandoMsgId]   = useState<string | null>(null);
  const [transcricaoErro, setTranscricaoErro] = useState<Record<string, string>>({});
  // Demanda 288: lista interativa mostra só o botão por padrão (igual ao
  // WhatsApp real) — opções reveladas por mensagem, clicando no botão.
  const [listasExpandidas, setListasExpandidas] = useState<Record<string, boolean>>({});
  const [enviando, setEnviando]             = useState(false);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const threadRef        = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const phoneAtivoRef    = useRef<string | null>(null);
  const carregarConvRef  = useRef<() => void>(() => {});
  // Demanda 285: mesma lógica de ref que carregarConvRef, pra poder chamar
  // carregarMensagens (definida mais abaixo) de dentro de efeitos que
  // precisam existir antes dela no arquivo (polling e broadcast).
  const carregarMensagensRef = useRef<(phone: string, opts?: { silencioso?: boolean }) => void>(() => {});
  const dragRef          = useRef<{ panel: "left" | "right"; startX: number; startW: number } | null>(null);
  const inputDragRef     = useRef<{ startY: number; startH: number } | null>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const [anexo, setAnexo] = useState<{ file: File; preview: string; tipo: "image" | "video" | "document" } | null>(null);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  // Demanda 071: largura ajustada arrastando a borda fica salva entre sessões
  // (antes voltava sempre pro padrão 256/300 ao recarregar a página).
  const [leftWidth, setLeftWidth]   = useState(() => lerLarguraSalva("inbox_left_width", 256));
  const [rightWidth, setRightWidth] = useState(() => lerLarguraSalva("inbox_right_width", 300));
  const [inputHeight, setInputHeight] = useState(96);
  const [painelDireitoAberto, setPainelDireitoAberto] = useState(true);

  function startDrag(panel: "left" | "right", e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { panel, startX: e.clientX, startW: panel === "left" ? leftWidth : rightWidth };
    let valorFinal = dragRef.current.startW;
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      if (dragRef.current.panel === "left") {
        valorFinal = Math.max(160, Math.min(500, dragRef.current.startW + dx));
        setLeftWidth(valorFinal);
      } else {
        valorFinal = Math.max(200, Math.min(540, dragRef.current.startW - dx));
        setRightWidth(valorFinal);
      }
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // Salva só ao soltar o arraste, não a cada pixel movido.
      localStorage.setItem(panel === "left" ? "inbox_left_width" : "inbox_right_width", String(valorFinal));
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function startInputDrag(e: React.MouseEvent) {
    e.preventDefault();
    inputDragRef.current = { startY: e.clientY, startH: inputHeight };
    const onMove = (ev: MouseEvent) => {
      if (!inputDragRef.current) return;
      const dy = inputDragRef.current.startY - ev.clientY;
      setInputHeight(Math.max(60, Math.min(420, inputDragRef.current.startH + dy)));
    };
    const onUp = () => {
      inputDragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Nova conversa state ──
  const [novaConversaModal, setNovaConversaModal] = useState(false);
  const [novaConversaPhone, setNovaConversaPhone] = useState("");
  const [novaConversaLoading, setNovaConversaLoading] = useState(false);

  // ── Catálogo de produtos (usado só pelo fluxo de "Criar pedido" desde a
  // demanda 054 — "Lançar Venda" foi removida do Inbox, unificada em pedido) ──
  const [produtosDB, setProdutosDB]         = useState<ProdutoAPI[]>([]);

  // ── Pedido da conversa (demandas 045/046) ──
  const [pedidoAtivo, setPedidoAtivo]           = useState<PedidoAPI | null>(null);
  // Demanda 088: quando o pedido mais recente tem venda_id e há 2+ itens com
  // o mesmo venda_id, mostra a venda inteira em vez de só o item mais
  // recente (achado da demanda 076 — o card mostrava só 1 produto).
  const [itensVendaAtivo, setItensVendaAtivo]   = useState<PedidoAPI[] | null>(null);
  const [avancandoItemId, setAvancandoItemId]   = useState<string | null>(null);
  const [carregandoPedido, setCarregandoPedido] = useState(false);
  const [pedidoFluxo, setPedidoFluxo]           = useState(false);
  const [pedidoGrupoSel, setPedidoGrupoSel]     = useState("");
  const [pedidoProdutoSel, setPedidoProdutoSel] = useState<ProdutoAPI | null>(null);
  const [pedidoQtd, setPedidoQtd]               = useState("1");
  const [pedidoValorManual, setPedidoValorManual] = useState("");
  const [pedidoCalculo, setPedidoCalculo]       = useState<CalculoPedido | null>(null);
  const [pedidoCalculando, setPedidoCalculando] = useState(false);
  const [pedidoSalvando, setPedidoSalvando]     = useState(false);
  const [pedidoErro, setPedidoErro]             = useState<string | null>(null);
  const [avancandoPedido, setAvancandoPedido]   = useState(false);
  // Demanda 089: mesma checagem de pagamento pendente que TelaPedidos.tsx já
  // tem (demandas 069/072) — cobre tanto o item único quanto qualquer item de
  // uma venda com 2+ produtos (demanda 088), guardando id+status alvo.
  const [acaoPendentePedido, setAcaoPendentePedido] = useState<{ id: string; status: string } | null>(null);
  // Demanda 190: avançar a VENDA INTEIRA de uma vez (todos os itens abertos
  // no mesmo status) — o avanço por item da 088 continua existindo, mas o
  // caminho padrão de "finalizar" deixou de exigir item a item.
  const [avancandoVenda, setAvancandoVenda] = useState(false);
  const [acaoPendenteVenda, setAcaoPendenteVenda] = useState<{ itens: PedidoAPI[]; status: string } | null>(null);
  // Demanda 076: "Criar pedido" aceita 2+ produtos — cada item confirmado
  // (preço calculado ou valor manual já resolvido) entra aqui antes do envio
  // final, mesmo padrão de carrinho do balcão (demanda 066).
  const [pedidoCarrinho, setPedidoCarrinho]     = useState<ItemCarrinhoPedido[]>([]);
  // Demanda 137 (Fase 1): escolha de forma/momento de pagamento na criação —
  // 1 escolha por pedido/venda (gravada em todos os itens do carrinho), SÓ
  // captura: nenhuma cobrança/checagem usa esses valores ainda. Opcional
  // nesta fase (sem seleção → grava null), sem default pra não enviesar o
  // dado que as próximas fases vão usar.
  const [pedidoFormaEscolhida, setPedidoFormaEscolhida] = useState<"dinheiro" | "pix" | "cartao" | null>(null);
  const [pedidoMomento, setPedidoMomento]               = useState<"agora" | "retirada" | null>(null);
  // Demanda 138: as 2 perguntas saíram do card do carrinho (inline, fácil de
  // passar batido no painel que rola) e viraram um modal ao clicar
  // "Confirmar pedido" — mesmo padrão do "Finalizar venda" do balcão (066).
  const [modalPagamentoPedido, setModalPagamentoPedido] = useState(false);
  // Demanda 139 (Fase 2): tipo de entrega escolhido na criação — o Inbox
  // nunca teve esse conceito (todo pedido nasce 'confirmado' e só decide
  // entrega no fim da esteira). Só captura, opcional e sem default, mesma
  // filosofia da Fase 1; a esteira não muda (isso é Fase 5).
  const [pedidoTipoEntrega, setPedidoTipoEntrega] = useState<"imediata" | "retirada" | null>(null);
  // Demanda 145: cobrança Pix criada na confirmação do pedido vira popup
  // (mesmo ModalQrPix do balcão, 141/142) — antes o copia-e-cola ia só pro
  // rascunho de mensagem e o Edvam nem viu que tinha gerado. O atendente
  // copia do popup e cola na conversa; o rascunho continua como fallback.
  // Demanda 224: `vendaId`/`pedidoId` guardados junto (fora do tipo que o
  // ModalQrPix conhece) — precisos pra confirmar manualmente a recarga
  // (mesmo mecanismo do balcão, 147/179), agora estendido pro Inbox.
  const [cobrancaPixInbox, setCobrancaPixInbox] = useState<(CobrancaPixModal & { vendaId?: string; pedidoId?: string }) | null>(null);
  // Demanda 140: sinal visual de conclusão ao marcar "Entregue" — o painel
  // reseta pra "Criar pedido" (fix da mesma demanda) e este banner conta o
  // que aconteceu antes de sumir sozinho.
  const [pedidoConcluido, setPedidoConcluido] = useState<string | null>(null);
  useEffect(() => {
    if (!pedidoConcluido) return;
    const t = setTimeout(() => setPedidoConcluido(null), 6000);
    return () => clearTimeout(t);
  }, [pedidoConcluido]);

  const conversaAtiva   = conversas.find(c => c.phone === phoneAtivo) ?? null;

  // ── Carrega produtos (pro fluxo de "Criar pedido") ──
  useEffect(() => {
    fetch("/api/produtos").then(r => r.json()).then(d => setProdutosDB(d.produtos || []));
  }, []);

  const grupos = useMemo(() => {
    const mapa: Record<string, ProdutoAPI[]> = {};
    for (const p of produtosDB) {
      const g = CATEGORIA_PARA_GRUPO[p.categoria] || p.categoria;
      if (!mapa[g]) mapa[g] = [];
      mapa[g].push(p);
    }
    const ordenados = ORDEM_GRUPOS
      .filter(g => mapa[g]?.length > 0)
      .map(g => ({ nome: g, produtos: ordenarProdutosDoGrupo(g, mapa[g]) }));
    for (const [g, prods] of Object.entries(mapa)) {
      if (!ORDEM_GRUPOS.includes(g)) ordenados.push({ nome: g, produtos: ordenarProdutosDoGrupo(g, prods) });
    }
    return [...ordenados, { nome: "Entrada Avulsa", produtos: [] as ProdutoAPI[] }];
  }, [produtosDB]);

  // ── Carrega lista de conversas ──
  const carregarConversas = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroStatus) params.set("status", filtroStatus);
    if (busca)        params.set("q", busca);
    if (mostrarArquivados) params.set("arquivados", "true");
    const res = await fetch(`/api/inbox/conversas?${params}`);
    const data = await res.json();
    setConversas(data.conversas ?? []);
  }, [filtroStatus, busca, mostrarArquivados]);

  useEffect(() => { carregarConversas(); }, [carregarConversas]);
  useEffect(() => { carregarConvRef.current = carregarConversas; }, [carregarConversas]);
  useEffect(() => { phoneAtivoRef.current = phoneAtivo; }, [phoneAtivo]);

  // ── Abre conversa vinda da página de Clientes (demanda 083) ──
  useEffect(() => {
    if (!abrirConversa?.phone) return;
    setPhoneAtivo(abrirConversa.phone);
    setMensagens([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirConversa?.nonce]);

  // ── Aplica filtro vindo do banner de escalados do shell do Admin
  // (demanda 325), mesmo padrão de nonce do efeito acima, reutiliza o
  // filtro "Escalado" que já existia (demanda 321), sem duplicar UI. ──
  useEffect(() => {
    if (!abrirFiltroStatus?.status) return;
    setFiltroStatus(abrirFiltroStatus.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirFiltroStatus?.nonce]);

  // ── Polling de segurança enquanto a aba estiver em foco ──
  // Demanda 285 (achado real, PRIORIDADE MÁXIMA): o comentário da 136 dizia
  // que o Realtime (`postgres_changes`) era a fonte PRINCIPAL de atualização
  // e o polling só "rede de segurança" — isso nunca foi verdade depois da
  // demanda 025 (2026-07-02): RLS travou SELECT anônimo em
  // jsgrafica_log_msgs_privadas/jsgrafica_contatos, e `postgres_changes`
  // respeita RLS igual uma consulta normal — o Inbox rodou 100% no polling
  // de 60s por mais de um mês, sem ninguém perceber (confirmado com
  // pg_policies vazio + relrowsecurity=true nas 2 tabelas). Substituído por
  // canal de Broadcast (ver efeito abaixo, não depende de SELECT/RLS), com
  // este polling agora como rede de segurança de VERDADE — intervalo curto
  // o bastante pra cobrir o caso do Broadcast cair sem reconectar (achado
  // real da 025: exatamente esse tipo de falha silenciosa já aconteceu
  // antes). Atualiza lista E conversa aberta juntas (mesmo tick), pra nunca
  // mais mostrarem estado diferente ao mesmo tempo.
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | null = null;

    function atualizarTudo() {
      carregarConvRef.current();
      if (phoneAtivoRef.current) carregarMensagensRef.current(phoneAtivoRef.current, { silencioso: true });
    }

    function iniciarPolling() {
      intervalo = setInterval(atualizarTudo, 10000);
    }
    function pausarPolling() {
      if (intervalo) { clearInterval(intervalo); intervalo = null; }
    }

    if (document.visibilityState === "visible") iniciarPolling();
    document.addEventListener("visibilitychange", () =>
      document.visibilityState === "visible" ? iniciarPolling() : pausarPolling()
    );

    return () => {
      pausarPolling();
      document.removeEventListener("visibilitychange", pausarPolling);
    };
  }, []);

  // ── Carrega mensagens do contato ──
  // Demanda 285: `silencioso` evita o "Carregando..." piscar toda vez que o
  // polling de segurança/broadcast atualiza a conversa em segundo plano — só
  // mostra o loading de verdade quando o operador troca de conversa.
  const carregarMensagens = useCallback(async (phone: string, opts?: { silencioso?: boolean }) => {
    if (!opts?.silencioso) setCarregandoMsgs(true);
    const res = await fetch(`/api/inbox/mensagens?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    setMensagens(data.mensagens ?? []);
    if (!opts?.silencioso) setCarregandoMsgs(false);
  }, []);

  useEffect(() => { carregarMensagensRef.current = carregarMensagens; }, [carregarMensagens]);

  useEffect(() => {
    if (!phoneAtivo) return;
    // Marca como lida ao abrir — o GET /api/inbox/mensagens já zera
    // mensagens_nao_lidas/ultima_leitura_admin no servidor (demanda 024).
    setConversas(prev => prev.map(c => c.phone === phoneAtivo ? { ...c, naoLidas: 0 } : c));
    carregarMensagens(phoneAtivo);
  }, [phoneAtivo, carregarMensagens]);

  // ── Rascunho de mensagem de pedido pendente (demanda 073) — se o pedido
  // dessa conversa foi criado ou avançou de status enquanto ninguém tinha a
  // conversa aberta, o texto fica pronto aqui pra revisar/editar antes de
  // mandar (mesmo padrão de pré-preenchimento da sugestão de IA, 048). ──
  useEffect(() => {
    if (!phoneAtivo) return;
    fetch(`/api/inbox/rascunho-pedido?phone=${encodeURIComponent(phoneAtivo)}`)
      .then(r => r.json())
      .then(d => { if (d.rascunho) setReply(d.rascunho); })
      .catch(() => {});
  }, [phoneAtivo]);

  // ── Carrega o pedido vinculado à conversa (demandas 045/046) ──
  const carregarPedidoAtivo = useCallback(async (phone: string) => {
    setCarregandoPedido(true);
    try {
      const res = await fetch(`/api/pedidos?telefone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      const pedidos: PedidoAPI[] = data.pedidos ?? [];
      const maisRecente: PedidoAPI | undefined = pedidos[0];
      // "cancelado"/"entregue" não bloqueiam criar um novo pedido pra mesma conversa.
      const estaAberto = (p: PedidoAPI) => p.status !== "entregue" && p.status !== "cancelado";
      let ativo = maisRecente && estaAberto(maisRecente) ? maisRecente : null;
      // Demanda 190: venda PARCIALMENTE finalizada — se o item mais recente
      // já fechou mas OUTROS itens da mesma venda continuam abertos, a venda
      // segue sendo o pedido ativo. Antes, entregar o item que calhava de
      // ser pedidos[0] fazia o card voltar pra "Criar pedido" e os itens
      // restantes ficavam presos, invisíveis no Atendimento (só apareciam na
      // aba Pedidos como "Vários status" — relato do Edvam, 15/07).
      if (!ativo && maisRecente?.venda_id) {
        ativo = pedidos.find(p => p.venda_id === maisRecente.venda_id && estaAberto(p)) ?? null;
      }
      setPedidoAtivo(ativo);

      // Demanda 088: `GET /api/pedidos?telefone=` já traz TODO o histórico
      // desse telefone (não só o mais recente) — os outros itens da mesma
      // venda já estão em `pedidos`, só precisa filtrar pelo mesmo
      // `venda_id`, igual `agruparPorVenda()` faz em TelaPedidos.tsx.
      const itensVenda = ativo?.venda_id ? pedidos.filter(p => p.venda_id === ativo.venda_id) : [];
      setItensVendaAtivo(itensVenda.length > 1 ? itensVenda : null);
    } finally {
      setCarregandoPedido(false);
    }
  }, []);

  useEffect(() => {
    setPedidoFluxo(false);
    setPedidoProdutoSel(null);
    setPedidoCalculo(null);
    setPedidoErro(null);
    // Demanda 140: o banner de conclusão é da conversa em que aconteceu —
    // trocar de conversa limpa.
    setPedidoConcluido(null);
    if (!phoneAtivo) { setPedidoAtivo(null); setItensVendaAtivo(null); return; }
    carregarPedidoAtivo(phoneAtivo);
  }, [phoneAtivo, carregarPedidoAtivo]);

  // ── Reset da sugestão de IA / resumo ao trocar de conversa ──
  useEffect(() => {
    setSugestaoAtiva(false);
    setIaErro(null);
    setResumoConversa(null);
    setResumoErro(null);
  }, [phoneAtivo]);

  // ── Demanda 276: atalho de "Atendimento IA" direto na conversa —
  // reaproveita a MESMA API da demanda 275 (`/api/telefones-autorizados`),
  // sem duplicar lógica de backend. `null` = ainda carregando/desconhecido
  // (toggle desabilitado nesse estado, evita criar linha errada por clique
  // apressado); `"nao_cadastrado"` = telefone não está na tabela ainda
  // (alternar chama POST, cria com ativo=true); objeto = já existe
  // (alternar chama PATCH). ──
  const [autorizacaoIA, setAutorizacaoIA] = useState<{ id: string; ativo: boolean } | "nao_cadastrado" | null>(null);
  const [alternandoIA, setAlternandoIA] = useState(false);

  const carregarAutorizacaoIA = useCallback(async (phone: string) => {
    try {
      const res = await fetch("/api/telefones-autorizados");
      const data = await res.json();
      const encontrado = (data.telefones ?? []).find((t: { telefone: string }) => t.telefone === phone);
      setAutorizacaoIA(encontrado ? { id: encontrado.id, ativo: encontrado.ativo } : "nao_cadastrado");
    } catch {
      setAutorizacaoIA(null);
    }
  }, []);

  useEffect(() => {
    if (!phoneAtivo) { setAutorizacaoIA(null); return; }
    setAutorizacaoIA(null); // reseta ao trocar de conversa — evita mostrar o estado da conversa anterior por 1 instante
    carregarAutorizacaoIA(phoneAtivo);
  }, [phoneAtivo, carregarAutorizacaoIA]);

  async function alternarAutorizacaoIA() {
    if (!phoneAtivo || alternandoIA || autorizacaoIA === null) return;
    setAlternandoIA(true);
    try {
      if (autorizacaoIA === "nao_cadastrado") {
        const res = await fetch("/api/telefones-autorizados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefone: phoneAtivo, descricao: "Ativado direto pela conversa no Inbox" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao ativar atendimento IA");
        setAutorizacaoIA({ id: data.telefone.id, ativo: true });
      } else {
        const novoAtivo = !autorizacaoIA.ativo;
        const res = await fetch("/api/telefones-autorizados", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: autorizacaoIA.id, ativo: novoAtivo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao atualizar atendimento IA");
        setAutorizacaoIA({ id: autorizacaoIA.id, ativo: novoAtivo });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar atendimento IA");
    } finally {
      setAlternandoIA(false);
    }
  }

  // ── Calcula valor automaticamente (debounce) ao escolher produto/quantidade ──
  useEffect(() => {
    if (!pedidoProdutoSel || pedidoProdutoSel.preco == null) { setPedidoCalculo(null); return; }
    const qtd = parseFloat(pedidoQtd.replace(",", "."));
    if (!qtd || qtd <= 0) { setPedidoCalculo(null); return; }
    const t = setTimeout(async () => {
      setPedidoCalculando(true);
      setPedidoErro(null);
      try {
        const res = await fetch("/api/pedidos/calcular-valor", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produtoId: pedidoProdutoSel.id, quantidade: qtd }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao calcular valor");
        setPedidoCalculo(data.calculo);
      } catch (e) {
        setPedidoCalculo(null);
        setPedidoErro(e instanceof Error ? e.message : "Erro ao calcular valor");
      } finally {
        setPedidoCalculando(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [pedidoProdutoSel, pedidoQtd]);

  // Também usado como onLoad/onLoadedData de imagem e vídeo na thread — sem
  // isso, o scroll pro final roda antes da mídia carregar e "crescer" a
  // bolha, deixando a imagem recém-chegada fora da área visível.
  const rolarThreadParaFinal = useCallback(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, []);

  useEffect(() => {
    rolarThreadParaFinal();
  }, [mensagens, rolarThreadParaFinal]);

  // ── Reload ao focar a aba (fallback quando Broadcast desconecta) ──
  useEffect(() => {
    const onFocus = () => {
      carregarConvRef.current();
      if (phoneAtivoRef.current) carregarMensagens(phoneAtivoRef.current, { silencioso: true });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [carregarMensagens]);

  // Auto-ajuste de altura conforme o texto cresce. Achado real da demanda
  // 064: o truque de "encolher pra 1px, medir scrollHeight, crescer de
  // volta" mede certo, mas SÓ reaplica a altura via o `style={{height:
  // inputHeight}}` do JSX quando o estado muda — se o valor calculado
  // (`needed`) não for maior que a altura atual, `setInputHeight` vira um
  // no-op (React não re-renderiza pra um valor igual) e a caixa fica
  // travada no "1px" da medição, visualmente cortada. Isso é exatamente o
  // que acontecia com a sugestão da IA: ela chega de uma vez (não digitada
  // aos poucos), então se o texto sugerido precisar de menos altura que os
  // 96px padrão, a caixa nunca voltava do "1px". Corrigido escrevendo a
  // altura final direto no elemento aqui mesmo, sem depender de um
  // re-render do React pra desfazer a medição.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (!reply) { ta.style.height = "96px"; setInputHeight(96); return; }
    ta.style.height = "1px";
    const needed = Math.min(ta.scrollHeight, 420);
    setInputHeight(h => {
      const nova = Math.max(h, needed);
      ta.style.height = `${nova}px`;
      return nova;
    });
  }, [reply]);

  // ── Broadcast global — avisa que alguma conversa teve mensagem nova ──
  // Demanda 285 (achado real, PRIORIDADE MÁXIMA): isso SUBSTITUI a
  // assinatura `postgres_changes` antiga, que nunca funcionou de verdade —
  // ela usa o cliente de chave anônima (`lib/supabase.ts`), sujeito a RLS
  // igual uma consulta normal, e `jsgrafica_log_msgs_privadas` tem RLS
  // ligada com ZERO políticas de SELECT desde a demanda 025 (2026-07-02) —
  // bloqueava o evento em silêncio, sem erro nenhum, há mais de um mês.
  //
  // Caminho escolhido depois de avaliar 3 opções (relato completo na
  // demanda 285): NÃO abrir política de SELECT anônimo nessas tabelas (são
  // mensagens privadas de cliente — reabriria exatamente o risco que a
  // 024/025 fecharam, e sem Supabase Auth de verdade não tem como restringir
  // isso só à equipe). Em vez disso, um trigger no banco
  // (`jsgrafica_trg_notificar_nova_msg_inbox`, dispara em todo INSERT com
  // conteúdo em jsgrafica_log_msgs_privadas) manda um Broadcast com payload
  // VAZIO de propósito — canal público, sem precisar de nenhuma policy nova
  // em `realtime.messages` (testado de verdade com a chave anônima real,
  // confirmado chegando em <1s). Nenhum dado sensível trafega pelo canal —
  // é só um sinal pra buscar de novo pelas rotas de API já autenticadas com
  // service_role, exatamente como o resto do app já funciona (nunca dado
  // sensível direto pro cliente de chave anônima). Debounce de 300ms evita
  // uma rajada de refetch se várias mensagens chegarem juntas.
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('inbox-global')
      .on('broadcast', { event: 'nova_mensagem' }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          carregarConvRef.current();
          if (phoneAtivoRef.current) carregarMensagensRef.current(phoneAtivoRef.current, { silencioso: true });
        }, 300);
      })
      .subscribe();
    return () => {
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Anexo ──
  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipo = file.type.startsWith("image/") ? "image"
               : file.type.startsWith("video/") ? "video"
               : "document";
    const preview = tipo !== "document" ? URL.createObjectURL(file) : "";
    setAnexo({ file, preview, tipo });
    e.target.value = "";
  }

  async function enviarMidia() {
    if (!phoneAtivo || !anexo || enviandoMidia) return;
    setEnviandoMidia(true);
    try {
      // Demanda 093: o arquivo sobe direto do navegador pro Supabase Storage
      // via signed URL (rota leve, não recebe o arquivo em si) — nunca passa
      // pelo corpo de uma função da Vercel, que tem limite de ~4,5MB e
      // sempre falhava com foto de celular real (8MB+). Só a URL resultante
      // (texto, payload pequeno) vai pra API disparar o envio via Z-API.
      const resUrl = await fetch("/api/inbox/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: anexo.file.name }),
      });
      const dadosUrl = await resUrl.json();
      if (!resUrl.ok || dadosUrl.error) throw new Error(dadosUrl.error || "Erro ao gerar URL de upload");

      const { error: erroUpload } = await supabase.storage
        .from("inbox-media")
        .uploadToSignedUrl(dadosUrl.path, dadosUrl.token, anexo.file);
      if (erroUpload) throw new Error(erroUpload.message);

      const res = await fetch("/api/inbox/enviar-midia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneAtivo,
          operador: operador.nome,
          caption: reply.trim(),
          path: dadosUrl.path,
          fileName: anexo.file.name,
          contentType: anexo.file.type,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnexo(null);
      setReply("");
      setSugestaoAtiva(false);
    } catch {
      alert("Erro ao enviar arquivo.");
    } finally { setEnviandoMidia(false); }
  }

  // ── Enviar mensagem ──
  async function enviar() {
    if (!phoneAtivo || !reply.trim() || enviando) return;
    setEnviando(true);
    const texto = reply.trim();
    setReply("");
    setSugestaoAtiva(false);
    const temp: Mensagem = {
      message_id: `temp-${Date.now()}`, from_me: true, message_text: texto,
      media_type: null, media_url: null, caption: null, transcription_text: null,
      ptt: false, audio_duration: null, status: "sending", sent_at: new Date().toISOString(),
      data_timestamp: Date.now(), quoted_msg_id: null, quoted_msg_body: null,
      reaction_text: null, from_api: true,
    };
    setMensagens(prev => [...prev, temp]);
    const res = await fetch("/api/inbox/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneAtivo, message: texto, operador: operador.nome }),
    });
    if (!res.ok) {
      setMensagens(prev => prev.filter(m => m.message_id !== temp.message_id));
      setReply(texto);
    } else {
      setMensagens(prev => prev.map(m => m.message_id === temp.message_id ? { ...m, status: "sent" } : m));
    }
    setEnviando(false);
  }

  // ── Sugestão de resposta por IA (demanda 048) — só preenche o campo,
  // nunca envia sozinha. ──
  async function sugerirRespostaIA() {
    if (!phoneAtivo || sugerindoIA) return;
    setSugerindoIA(true);
    setIaErro(null);
    try {
      const res = await fetch("/api/inbox/sugestao-resposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneAtivo, nomeCliente: conversaAtiva?.nome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar sugestão");
      setReply(data.sugestao);
      setSugestaoAtiva(true);
    } catch (e) {
      setIaErro(e instanceof Error ? e.message : "Erro ao gerar sugestão");
    } finally {
      setSugerindoIA(false);
    }
  }

  // ── Resumir conversa longa (demanda 048) — nota de apoio, não é mensagem. ──
  async function resumirConversa() {
    if (!phoneAtivo || resumindo) return;
    setResumindo(true);
    setResumoErro(null);
    try {
      const res = await fetch("/api/inbox/resumir-conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneAtivo, nomeCliente: conversaAtiva?.nome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar resumo");
      setResumoConversa(data.resumo);
    } catch (e) {
      setResumoErro(e instanceof Error ? e.message : "Erro ao gerar resumo");
    } finally {
      setResumindo(false);
    }
  }

  // ── Demanda 191: apagar (pra todos) uma mensagem enviada pela equipe ──
  // Ação irreversível e visível pro cliente (some do WhatsApp dele) — por
  // isso o confirm explícito. A Z-API é chamada primeiro; se o WhatsApp
  // recusar (janela de "apagar pra todos" estourada), nada muda e o motivo
  // aparece pro atendente.
  async function apagarMensagemEnviada(m: Mensagem) {
    if (!phoneAtivo || apagandoMsgId) return;
    if (!confirm("Apagar esta mensagem PRA TODOS? Ela some do WhatsApp do cliente também.")) return;
    setApagandoMsgId(m.message_id);
    try {
      const res = await fetch("/api/inbox/apagar-mensagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneAtivo, messageId: m.message_id, operador: operador.nome }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao apagar a mensagem."); return; }
      setMensagens(prev => prev.map(x => x.message_id === m.message_id
        ? { ...x, apagada_em: new Date().toISOString() } : x));
    } catch {
      alert("Erro ao apagar a mensagem.");
    } finally {
      setApagandoMsgId(null);
    }
  }

  // ── Transcrever áudio sob demanda (demanda 059) — complementa o pipeline
  // automático do n8n, que às vezes falha (transcription_text vazio). ──
  async function transcreverAudio(messageId: string) {
    if (transcrevendo) return;
    setTranscrevendo(messageId);
    setTranscricaoErro(prev => {
      if (!(messageId in prev)) return prev;
      const copia = { ...prev };
      delete copia[messageId];
      return copia;
    });
    try {
      const res = await fetch("/api/inbox/transcrever-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao transcrever áudio");
      setMensagens(prev => prev.map(m => m.message_id === messageId ? { ...m, transcription_text: data.transcricao } : m));
    } catch (e) {
      setTranscricaoErro(prev => ({ ...prev, [messageId]: e instanceof Error ? e.message : "Erro ao transcrever áudio" }));
    } finally {
      setTranscrevendo(null);
    }
  }


  // ── Mudar status de atendimento ──
  async function mudarStatus(status: string) {
    if (!phoneAtivo) return;
    await fetch("/api/inbox/atendimento", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneAtivo, status, atendente: operador.nome }),
    });
    setConversas(prev => prev.map(c =>
      c.phone === phoneAtivo
        ? { ...c, statusAtendimento: status as Conversa["statusAtendimento"], atendente: status === "em_atendimento" ? operador.nome : null }
        : c
    ));
  }

  // Demanda 114: ao abrir uma conversa que ainda está "Aberta", assume
  // automaticamente pra quem abriu — sem precisar clicar em "Em
  // atendimento" à parte. Recebe o telefone explícito (não usa `phoneAtivo`
  // do estado, que ainda não teria atualizado no momento do clique). O
  // histórico de quem assumiu continua sendo gravado no servidor (função SQL
  // `jsgrafica_registrar_atendimento`, chamada por `PATCH /api/inbox/
  // atendimento`) — só a exibição saiu daqui e migrou pra TelaClientes.tsx
  // (demanda 119).
  async function assumirAutomaticamente(phone: string, statusAtual: string) {
    if (statusAtual !== "aberto") return;
    await fetch("/api/inbox/atendimento", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, status: "em_atendimento", atendente: operador.nome }),
    });
    setConversas(prev => prev.map(c =>
      c.phone === phone ? { ...c, statusAtendimento: "em_atendimento", atendente: operador.nome } : c
    ));
  }

  // ── Arquivar/desarquivar contato ──
  async function arquivarContato(phone: string, arquivado: boolean) {
    await fetch("/api/inbox/arquivar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, arquivado }),
    });
    // A conversa some da view atual (arquivada some da lista normal, e
    // vice-versa) — remove localmente em vez de esperar o próximo poll.
    setConversas(prev => prev.filter(c => c.phone !== phone));
    if (phoneAtivo === phone) setPhoneAtivo(null);
  }

  // ── Criar pedido (demanda 045, carrinho multi-produto na 076) ──
  function iniciarFluxoPedido() {
    setPedidoFluxo(true);
    setPedidoGrupoSel(grupos.find(g => g.nome !== "Entrada Avulsa")?.nome || "");
    setPedidoProdutoSel(null);
    setPedidoQtd("1");
    setPedidoValorManual("");
    setPedidoCalculo(null);
    setPedidoErro(null);
    setPedidoCarrinho([]);
  }

  function cancelarFluxoPedido() {
    setPedidoFluxo(false);
    setPedidoProdutoSel(null);
    setPedidoCalculo(null);
    setPedidoErro(null);
    setPedidoCarrinho([]);
    setPedidoFormaEscolhida(null);
    setPedidoMomento(null);
    setPedidoTipoEntrega(null);
    setModalPagamentoPedido(false);
  }

  function selecionarProdutoPedido(prod: ProdutoAPI) {
    setPedidoProdutoSel(prod);
    setPedidoQtd("1");
    setPedidoValorManual("");
    setPedidoCalculo(null);
    setPedidoErro(null);
  }

  // Confirma o item atual (preço calculado ou valor manual) e volta pro
  // seletor de produto — não envia nada ainda, só acumula no carrinho.
  function adicionarAoCarrinho() {
    if (!pedidoProdutoSel) return;
    const requerOrcamento = pedidoProdutoSel.preco == null;
    const valorManual = parseFloat(pedidoValorManual.replace(",", "."));
    if (requerOrcamento && (!valorManual || valorManual <= 0)) {
      setPedidoErro("Informe o valor combinado com o cliente.");
      return;
    }
    if (!requerOrcamento && !pedidoCalculo) return;

    setPedidoCarrinho(prev => [...prev, {
      produto: pedidoProdutoSel,
      quantidade: requerOrcamento ? 1 : parseFloat(pedidoQtd.replace(",", ".")),
      valorManual: requerOrcamento ? valorManual : null,
      calculo: requerOrcamento ? null : pedidoCalculo,
    }]);
    setPedidoProdutoSel(null);
    setPedidoQtd("1");
    setPedidoValorManual("");
    setPedidoCalculo(null);
    setPedidoErro(null);
  }

  function removerItemCarrinho(index: number) {
    setPedidoCarrinho(prev => prev.filter((_, i) => i !== index));
  }

  async function confirmarPedidoCarrinho() {
    if (!phoneAtivo || pedidoCarrinho.length === 0 || pedidoSalvando) return;
    setModalPagamentoPedido(false);
    setPedidoSalvando(true);
    setPedidoErro(null);
    // vendaId só faz sentido com 2+ itens — com 1 item só, mantém o
    // comportamento de sempre (sem venda_id), igual ao balcão (demanda 066).
    const vendaId = pedidoCarrinho.length > 1
      ? `venda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      : undefined;
    try {
      let ultimoPedido = null;
      for (let i = 0; i < pedidoCarrinho.length; i++) {
        const item = pedidoCarrinho[i];
        const isLast = i === pedidoCarrinho.length - 1;
        const res = await fetch("/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telefone: phoneAtivo,
            nomeCliente: conversaAtiva?.nome || null,
            produtoId: item.produto.id,
            quantidade: item.produto.preco == null ? 1 : item.quantidade,
            valorManual: item.produto.preco == null ? item.valorManual : undefined,
            operador: operador.nome,
            vendaId,
            finalizarVenda: isLast,
            // Demanda 137 (Fase 1): escolha capturada — mesma em todos os
            // itens da venda, só gravação.
            formaPagamentoEscolhida: pedidoFormaEscolhida ?? undefined,
            pagamentoMomento: pedidoMomento ?? undefined,
            // Demanda 139 (Fase 2): mesma escolha em todos os itens da venda.
            tipoEntregaEscolhido: pedidoTipoEntrega ?? undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao criar pedido");
        ultimoPedido = data.pedido;
        // Demanda 145: a cobrança só vem na última chamada (finalizarVenda).
        // Demanda 224: guarda vendaId/pedidoId junto — precisos pra
        // confirmar a recarga manualmente (ver confirmarPagamentoRecargaInbox).
        if (data.cobrancaPix) setCobrancaPixInbox({ ...data.cobrancaPix, vendaId, pedidoId: data.pedido?.id });
      }
      setPedidoAtivo(ultimoPedido);
      setPedidoFluxo(false);
      setPedidoProdutoSel(null);
      setPedidoCalculo(null);
      setPedidoCarrinho([]);
      setPedidoFormaEscolhida(null);
      setPedidoMomento(null);
      setPedidoTipoEntrega(null);
    } catch (e) {
      setPedidoErro(e instanceof Error ? e.message : "Erro ao criar pedido");
    } finally {
      setPedidoSalvando(false);
    }
  }

  // Demanda 224: mesmo mecanismo de confirmação manual da recarga que o
  // balcão já tem (confirmarPagamentoRecarga/confirmarRecargaMista, 147/179)
  // — antes ausente de propósito no Inbox (decisão original dessas demandas:
  // "confirma depois pela aba Pedidos"). Estendido agora porque confirmar só
  // pela aba Pedidos exige avançar o status junto (ModalConfirmarPagamento),
  // e o atendente pode querer marcar como pago sem mexer no status ainda —
  // mesmo padrão visual/confirm() do balcão, só usando vendaId OU pedidoId
  // (o Inbox só gera vendaId com 2+ itens, diferente do balcão que sempre gera).
  async function confirmarPagamentoRecargaInbox() {
    if (!cobrancaPixInbox || !operador) return;
    if (!confirm("Confirmar que o Pix caiu na conta RecargaPay?")) return;
    try {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cobrancaPixInbox.vendaId
          ? { vendaId: cobrancaPixInbox.vendaId, confirmarPagamento: true, formaPagamento: "Pix RecargaPay", operador: operador.nome }
          : { id: cobrancaPixInbox.pedidoId, confirmarPagamento: true, formaPagamento: "Pix RecargaPay", operador: operador.nome }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setPedidoErro(data.error || "Erro ao confirmar o pagamento."); return; }
      setCobrancaPixInbox(null);
      if (phoneAtivo) await carregarPedidoAtivo(phoneAtivo);
    } catch {
      setPedidoErro("Erro ao confirmar o pagamento.");
    }
  }

  // Demanda 224: venda MISTA (recarga + item comum) — confirma só os itens
  // de recarga, mesmo padrão do balcão (confirmarRecargaMista, 179).
  async function confirmarRecargaMistaInbox() {
    if (!cobrancaPixInbox?.recarga || !operador) return;
    if (!confirm("Confirmar que o Pix da RECARGA caiu na conta RecargaPay?")) return;
    try {
      for (const pedidoId of cobrancaPixInbox.recarga.pedidoIds) {
        const res = await fetch("/api/pedidos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pedidoId, confirmarPagamento: true, formaPagamento: "Pix RecargaPay", operador: operador.nome }),
        });
        const data = await res.json();
        if (!res.ok || data.error) { setPedidoErro(data.error || "Erro ao confirmar a recarga."); return; }
      }
      setCobrancaPixInbox(prev => (prev ? { ...prev, recarga: null } : prev));
      if (phoneAtivo) await carregarPedidoAtivo(phoneAtivo);
    } catch {
      setPedidoErro("Erro ao confirmar a recarga.");
    }
  }

  // ── Avançar status do pedido (demanda 046) ──
  async function executarAvancoPedido(status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    if (!pedidoAtivo || !phoneAtivo) return;
    const nomeServico = pedidoAtivo.servico_nome;
    setAvancandoPedido(true);
    try {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedidoAtivo.id, status, operador: operador.nome, formaPagamento, pagamentoConfirmadoEm, gavetaDestino }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao avançar status");
      // Demanda 140 (bug real, achado do Edvam): antes só fazia
      // `setPedidoAtivo(data.pedido)` — o card ficava preso mostrando o
      // pedido já entregue e "Criar pedido" só voltava com refresh.
      // Re-busca do servidor, mesmo padrão que `executarAvancoItemVenda`
      // sempre usou: `carregarPedidoAtivo` já trata entregue/cancelado como
      // "sem pedido ativo" e o painel reseta sozinho.
      if (status === "entregue") {
        setPedidoConcluido(nomeServico || "Pedido");
      }
      // Demanda 224: forma de pagamento pode ter sido bloqueada (pedido já
      // confirmado com outra forma, regra da 180) — antes 100% silencioso.
      if (data.avisoFormaPagamentoNaoAlterada) {
        setPedidoErro("A forma de pagamento já estava confirmada e NÃO foi alterada. Use \"🔧 Corrigir forma de pagamento\" na aba Pedidos se precisar mudar de verdade.");
      }
      await carregarPedidoAtivo(phoneAtivo);
    } catch {
      setPedidoErro("Erro ao avançar status do pedido.");
    } finally {
      setAvancandoPedido(false);
    }
  }

  // Demanda 089: mesma checagem de pagamento pendente que a aba Pedidos já
  // tem (demandas 069/072) — antes o cartão do Inbox deixava marcar
  // "Entregue" com Pix obrigatório não pago sem nenhum aviso.
  function avancarStatusPedido() {
    if (!pedidoAtivo || avancandoPedido) return;
    const proximo = PROXIMO_STATUS_PEDIDO[pedidoAtivo.status];
    if (!proximo) return;
    if (precisaConfirmarPagamento(proximo, pedidoAtivo.pagamento_confirmado)) {
      setAcaoPendentePedido({ id: pedidoAtivo.id, status: proximo });
      return;
    }
    executarAvancoPedido(proximo);
  }

  // Demanda 112: cancelar não existia em nenhuma tela — mesmo padrão simples
  // de confirmação (sem motivo obrigatório) já usado em TelaPedidos.tsx.
  function cancelarPedidoAtivo() {
    if (!pedidoAtivo || avancandoPedido) return;
    // Demanda 177: pedido PAGO já contou no caixa (régua da 164) — o aviso
    // vale pra qualquer status, não só entregue.
    const aviso = pedidoAtivo.pagamento_confirmado
      ? "⚠️ Esse pedido já está PAGO e o valor já contou no caixa — cancelar tira ele da soma. Cancelar mesmo assim?"
      : "Cancelar este pedido?";
    if (!confirm(aviso)) return;
    executarAvancoPedido("cancelado");
  }

  // ── Avançar status de 1 item de uma venda com 2+ produtos (demanda 088) —
  // cada item mantém seu próprio status/avanço, mesmo comportamento de
  // PainelDetalheVenda em TelaPedidos.tsx. Refaz `carregarPedidoAtivo` no
  // final em vez de mexer no estado local na mão, pra manter `pedidoAtivo` e
  // `itensVendaAtivo` sempre em sincronia com o servidor.
  async function executarAvancoItemVenda(id: string, status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    if (!phoneAtivo) return;
    setAvancandoItemId(id);
    try {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, operador: operador.nome, formaPagamento, pagamentoConfirmadoEm, gavetaDestino }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao avançar status");
      // Demanda 140: mesmo sinal de conclusão do caminho de item único.
      if (status === "entregue") {
        const nomeItem = itensVendaAtivo?.find(p => p.id === id)?.servico_nome;
        setPedidoConcluido(nomeItem || "Item");
      }
      // Demanda 224: mesmo aviso do caminho de item único.
      if (data.avisoFormaPagamentoNaoAlterada) {
        setPedidoErro("A forma de pagamento já estava confirmada e NÃO foi alterada. Use \"🔧 Corrigir forma de pagamento\" na aba Pedidos se precisar mudar de verdade.");
      }
      await carregarPedidoAtivo(phoneAtivo);
    } catch {
      setPedidoErro("Erro ao avançar status do pedido.");
    } finally {
      setAvancandoItemId(null);
    }
  }

  // Demanda 089: mesma checagem de pagamento pendente, aplicada por item.
  function avancarStatusItemVenda(item: PedidoAPI) {
    if (avancandoItemId) return;
    const proximo = PROXIMO_STATUS_PEDIDO[item.status];
    if (!proximo) return;
    if (precisaConfirmarPagamento(proximo, item.pagamento_confirmado)) {
      setAcaoPendentePedido({ id: item.id, status: proximo });
      return;
    }
    executarAvancoItemVenda(item.id, proximo);
  }

  // Demanda 112: cancela só o item clicado, não a venda inteira.
  function cancelarItemVenda(item: PedidoAPI) {
    if (avancandoItemId) return;
    // Demanda 177: mesmo aviso de "já contou no caixa" pra item pago.
    const aviso = item.pagamento_confirmado
      ? "⚠️ Esse item já está PAGO e o valor já contou no caixa — cancelar tira ele da soma. Cancelar mesmo assim?"
      : "Cancelar este item da venda?";
    if (!confirm(aviso)) return;
    executarAvancoItemVenda(item.id, "cancelado");
  }

  // ── Demanda 190: avançar TODOS os itens abertos da venda de uma vez ──
  // O relato do Edvam ("finalizar avança só o primeiro item") tinha 2 causas:
  // o card por item da 088 exigia N cliques por etapa, e — pior — entregar o
  // item que calhava de ser o mais recente escondia a venda inteira do
  // Atendimento (fix no carregarPedidoAtivo). Este caminho novo avança todos
  // os itens abertos juntos, com o MESMO gate de pagamento de sempre: itens
  // não pagos passam pelo ModalConfirmarPagamento uma vez só e a forma vale
  // pra todos; item já pago avança sem tocar em pagamento (a 180 garante que
  // nada é sobrescrito de qualquer jeito — aqui nem mandamos a forma).
  async function executarAvancoVendaInteira(itens: PedidoAPI[], status: string, formaPagamento?: string, pagamentoConfirmadoEm?: string, gavetaDestino?: "Zu" | "Gabi") {
    if (!phoneAtivo) return;
    setAvancandoVenda(true);
    // Demanda 224: mesmo aviso dos outros 2 caminhos — se algum item do lote
    // bloquear, avisa uma vez só no final (não interrompe os outros itens).
    let algumBloqueado = false;
    try {
      for (const item of itens) {
        const res = await fetch("/api/pedidos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id, status, operador: operador.nome,
            formaPagamento: item.pagamento_confirmado ? undefined : formaPagamento,
            pagamentoConfirmadoEm: item.pagamento_confirmado ? undefined : pagamentoConfirmadoEm,
            // Demanda 197: gaveta segue a mesma regra da forma — só pros
            // itens sendo confirmados agora.
            gavetaDestino: item.pagamento_confirmado ? undefined : gavetaDestino,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao avançar a venda");
        if (data.avisoFormaPagamentoNaoAlterada) algumBloqueado = true;
      }
      if (status === "entregue") setPedidoConcluido(`Venda inteira (${itens.length} itens)`);
      if (algumBloqueado) {
        setPedidoErro("A forma de pagamento de pelo menos 1 item já estava confirmada e NÃO foi alterada. Use \"🔧 Corrigir forma de pagamento\" na aba Pedidos se precisar mudar de verdade.");
      }
    } catch {
      setPedidoErro("Erro ao avançar a venda inteira — confira os itens abaixo (pode ter avançado só parte).");
    } finally {
      await carregarPedidoAtivo(phoneAtivo);
      setAvancandoVenda(false);
    }
  }

  function avancarVendaInteira() {
    if (!itensVendaAtivo || avancandoVenda || avancandoItemId) return;
    const abertos = itensVendaAtivo.filter(p => p.status !== "entregue" && p.status !== "cancelado");
    if (abertos.length === 0) return;
    if (!abertos.every(p => p.status === abertos[0].status)) return; // etapas diferentes → por item
    const proximo = PROXIMO_STATUS_PEDIDO[abertos[0].status];
    if (!proximo) return;
    const algumNaoPago = abertos.some(p => !p.pagamento_confirmado);
    if (algumNaoPago && precisaConfirmarPagamento(proximo, false)) {
      setAcaoPendenteVenda({ itens: abertos, status: proximo });
      return;
    }
    executarAvancoVendaInteira(abertos, proximo);
  }

  // Demanda 089: confirma a ação que ficou pendente do modal — decide se é o
  // fluxo de item único ou de item de venda pelo estado `itensVendaAtivo`.
  // Demanda 113: recebe a forma de pagamento escolhida no modal.
  // Demanda 165: repassa também a data real do recebimento escolhida no modal.
  function confirmarAvancoPendente(formaPagamento: string, pagamentoConfirmadoEm: string, gavetaDestino?: "Zu" | "Gabi") {
    if (!acaoPendentePedido) return;
    const { id, status } = acaoPendentePedido;
    setAcaoPendentePedido(null);
    if (itensVendaAtivo) executarAvancoItemVenda(id, status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino);
    else executarAvancoPedido(status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino);
  }

  // ── Nova conversa ──
  async function iniciarConversa() {
    const phone = novaConversaPhone.replace(/\D/g, "");
    if (!phone) return;
    setNovaConversaLoading(true);
    try {
      // Busca ou cria o contato via rota de API (demanda 024) — antes era
      // select + insert direto no client com a chave anônima.
      await fetch("/api/inbox/conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, operador: operador.nome }),
      });
      setNovaConversaModal(false);
      setNovaConversaPhone("");
      setPhoneAtivo(phone);
      setMensagens([]);
      await carregarConversas();
    } catch { /* silencioso */ }
    finally { setNovaConversaLoading(false); }
  }

  // ── Helpers ──
  function formatarHora(ts: number | null | string) {
    if (!ts) return "";
    let d: Date;
    if (typeof ts === "number") {
      // > 1e12 = milissegundos (Unix ms); caso contrário = segundos
      d = ts > 1e12 ? new Date(ts) : new Date(ts * 1000);
    } else {
      d = new Date(ts);
    }
    if (isNaN(d.getTime())) return "";
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString())
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  function badgeStatus(status: string) {
    if (status === "em_atendimento") return <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">Em atend.</span>;
    if (status === "resolvido")      return <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Resolvido</span>;
    // Demanda 321: tratamento visual distinto de "em atendimento" — a IA já
    // tentou e desistiu, precisa de humano com prioridade (não é só "alguém
    // está cuidando", é "ninguém está cuidando ainda").
    if (status === "escalado")       return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">⚠ Escalado</span>;
    return <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">Aberto</span>;
  }

  function previewMidia(tipo: string | null) {
    if (!tipo) return "";
    const mapa: Record<string, string> = { image: "📷 Imagem", audio: "🎵 Áudio", document: "📄 Documento", video: "🎥 Vídeo", sticker: "🎭 Sticker" };
    return mapa[tipo] || `[${tipo}]`;
  }

  const produtosGrupoPedido = grupos.find(g => g.nome === pedidoGrupoSel)?.produtos || [];

  // Demanda 224: carrinho 100% recarga (mesmo critério da 219) — usado só
  // pra trocar o rótulo do botão "Pix" pra "Pix RecargaPay" no modal
  // "Confirmar pedido". Não é uma 4ª opção separada de propósito: o valor
  // enviado ao backend continua sendo `'pix'` (único que
  // `camposEscolhaPagamento`, app/api/pedidos/route.ts, aceita) — pra
  // recarga, "Pix" SEMPRE vira o Pix estático do RecargaPay (nunca uma
  // cobrança Mercado Pago de verdade), então 2 botões separados com o mesmo
  // efeito só confundiria; só o texto muda pra refletir isso.
  const pedidoCarrinhoTodoRecarga = pedidoCarrinho.length > 0
    && pedidoCarrinho.every(it => CATEGORIAS_RECARGA.includes(it.produto.categoria));

  return (
    <div className="flex h-full overflow-hidden">

      {/* Modal nova conversa */}
      {novaConversaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNovaConversaModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-base mb-1">Nova conversa</h3>
            <p className="text-xs text-gray-400 mb-4">Digite o número completo com código do país. Ex: 5581998765432</p>
            <label className="text-xs text-gray-500 mb-1 block">Número de telefone</label>
            <input type="text" placeholder="55 DDD NÚMERO" value={novaConversaPhone}
              onChange={e => setNovaConversaPhone(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") iniciarConversa(); if (e.key === "Escape") setNovaConversaModal(false); }}
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setNovaConversaModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button onClick={iniciarConversa} disabled={novaConversaLoading || !novaConversaPhone.trim()}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {novaConversaLoading ? "..." : "Abrir conversa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ESQUERDA — lista de conversas ── */}
      <div style={{ width: leftWidth, minWidth: 160, maxWidth: 500 }} className="flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex gap-2">
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..."
            title="Busque contatos por nome ou número de telefone"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
          <button onClick={() => setNovaConversaModal(true)}
            title="Iniciar conversa com um novo número de telefone"
            className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-lg font-bold hover:bg-blue-700 flex-shrink-0">
            +
          </button>
        </div>
        <div className="flex gap-1 px-3 py-2 border-b border-gray-100 flex-wrap">
          {(["", "aberto", "em_atendimento", "escalado", "resolvido"] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${filtroStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s === "" ? "Todos" : s === "em_atendimento" ? "Em atend." : s === "escalado" ? "Escalado" : s === "resolvido" ? "Resolvido" : "Aberto"}
            </button>
          ))}
          <button onClick={() => setMostrarArquivados(v => !v)}
            title={mostrarArquivados ? "Voltar pra lista normal" : "Ver contatos arquivados/silenciados"}
            className={`text-xs px-2 py-1 rounded-full transition-colors ml-auto ${mostrarArquivados ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            🗄 Arquivados
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversas.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhuma conversa</p>}
          {conversas.map(c => {
            const temNaoLidas = c.naoLidas > 0 && c.phone !== phoneAtivo;
            return (
              <button key={c.phone} onClick={() => { setPhoneAtivo(c.phone); setMensagens([]); assumirAutomaticamente(c.phone, c.statusAtendimento); }}
                className={`w-full text-left px-3 py-3 border-b transition-colors
                  ${phoneAtivo === c.phone
                    ? "bg-blue-50 border-l-2 border-l-blue-500 border-b-gray-100"
                    : temNaoLidas
                    ? "bg-white border-b-gray-100 hover:bg-gray-50"
                    : "border-b-gray-50 hover:bg-gray-50"
                  }`}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <Avatar foto={c.foto} nome={c.nome} sizeClass="w-9 h-9" />
                    {temNaoLidas && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-green-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                        {c.naoLidas > 99 ? "99+" : c.naoLidas}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm truncate ${temNaoLidas ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>{c.nome}</span>
                      <span className={`text-xs flex-shrink-0 ${temNaoLidas ? "text-green-600 font-semibold" : "text-gray-400"}`}>{formatarHora(c.ultimaMsgTs)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className={`text-xs truncate ${temNaoLidas ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                        {c.ultimaMsgDe === "nos" && <span className="text-blue-500">Você: </span>}
                        {c.ultimaMsg || "—"}
                      </span>
                      {/* Demanda 268: o dado já existia e já trafegava ponta a
                          ponta (cabeçalho da conversa, ficha do cliente) — só
                          faltava exibir na lista lateral. */}
                      {c.statusAtendimento === "em_atendimento" && c.atendente && (
                        <span className="text-xs text-gray-400 flex-shrink-0 truncate max-w-[4.5rem]" title={`Atendendo: ${c.atendente}`}>
                          {c.atendente}
                        </span>
                      )}
                      {badgeStatus(c.statusAtendimento)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider esquerda */}
      <div onMouseDown={e => startDrag("left", e)}
        className="w-1 flex-shrink-0 bg-gray-200 hover:bg-blue-400 active:bg-blue-600 cursor-col-resize transition-colors" />

      {/* ── CENTRO — thread ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {!conversaAtiva ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar foto={conversaAtiva.foto} nome={conversaAtiva.nome} sizeClass="w-8 h-8" />
                <div>
                  <div className="font-medium text-sm text-gray-800">{conversaAtiva.nome}</div>
                  <div className="text-xs text-gray-400">{conversaAtiva.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {conversaAtiva.statusAtendimento === "aberto" && (
                  <button onClick={() => mudarStatus("em_atendimento")} title="Assumir este atendimento — registra você como responsável"
                    className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 font-medium">Assumir</button>
                )}
                {conversaAtiva.statusAtendimento === "em_atendimento" && (
                  <>
                    <span className="text-xs text-gray-500 hidden lg:inline">Atendendo: <strong>{conversaAtiva.atendente}</strong></span>
                    {/* Demanda 321: quando quem está "atendendo" é a própria IA
                        (Caminho C respondeu de verdade nesse turno), deixa
                        explícito e oferece assumir de propósito — ação separada
                        e deliberada, clicada à parte. Não mexe em
                        assumirAutomaticamente() (só age em "aberto", intocado). */}
                    {conversaAtiva.atendente === "Agente Atendimento" && (
                      <button onClick={() => mudarStatus("em_atendimento")} title="Assumir esta conversa da IA — passa a ser você quem responde"
                        className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 font-medium">Assumir da IA</button>
                    )}
                    <button onClick={() => mudarStatus("resolvido")} title="Marcar como resolvido — atendimento encerrado"
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">Resolver ✓</button>
                  </>
                )}
                {/* Demanda 321: "escalado" — a IA tentou e desistiu (Dizu/Alto
                    Toque/guardrail/ambíguo), precisa de humano com prioridade.
                    Mostra o motivo que a IA registrou e oferece assumir — mesmo
                    mecanismo PATCH do "Assumir" comum, sem mudança de backend. */}
                {conversaAtiva.statusAtendimento === "escalado" && (
                  <>
                    <span className="text-xs text-red-600 hidden lg:inline" title="Motivo que a IA registrou ao escalar">
                      ⚠ IA escalou{conversaAtiva.motivoEscalonamento ? `: ${conversaAtiva.motivoEscalonamento}` : ""}
                    </span>
                    <button onClick={() => mudarStatus("em_atendimento")} title="Assumir esta conversa escalada pela IA"
                      className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 font-medium">Assumir da IA</button>
                  </>
                )}
                {conversaAtiva.statusAtendimento === "resolvido" && (
                  <button onClick={() => mudarStatus("aberto")} title="Reabrir o atendimento — há algo pendente"
                    className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 font-medium">Reabrir</button>
                )}
                <button onClick={() => arquivarContato(conversaAtiva.phone, !conversaAtiva.arquivado)}
                  title={conversaAtiva.arquivado ? "Desarquivar — volta a aparecer na lista normal" : "Arquivar — some da lista normal (útil pra contato de teste)"}
                  className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium">
                  {conversaAtiva.arquivado ? "Desarquivar" : "🗄 Arquivar"}
                </button>
                <button onClick={() => setPainelDireitoAberto(v => !v)}
                  title={painelDireitoAberto ? "Ocultar painel lateral direito" : "Mostrar painel com contato e lançar venda"}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors ml-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    {painelDireitoAberto
                      ? <path d="M2 3h12v1.5H2zm0 4h8v1.5H2zm0 4h10v1.5H2zM12 6l3 2-3 2V6z"/>
                      : <path d="M2 3h12v1.5H2zm0 4h8v1.5H2zm0 4h10v1.5H2zM14 6l-3 2 3 2V6z"/>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
              {carregandoMsgs && <p className="text-center text-sm text-gray-400">Carregando...</p>}
              {mensagens.map(m => (
                <div key={m.message_id} className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}>
                  <div className={`group max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.from_me ? "bg-blue-600 text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm"}`}>
                    {/* Demanda 191: mensagem apagada pra todos — a bolha
                        preserva o lugar, o conteúdo some (igual ao WhatsApp). */}
                    {m.apagada_em ? (
                      <p className="italic opacity-70">🚫 Mensagem apagada</p>
                    ) : (<>
                    {m.quoted_msg_body && (
                      <div className={`text-xs mb-1.5 px-2 py-1 rounded border-l-2 ${m.from_me ? "border-blue-300 bg-blue-700/30" : "border-gray-300 bg-gray-100"}`}>
                        <p className="truncate">{m.quoted_msg_body}</p>
                      </div>
                    )}
                    {(m.media_type === "image" || m.media_type === "sticker") && m.media_url && (
                      <a href={m.media_url} target="_blank" rel="noreferrer" className="block mb-1">
                        <img src={m.media_url} alt={m.caption || previewMidia(m.media_type)}
                          onLoad={rolarThreadParaFinal}
                          className="max-w-full max-h-64 rounded-lg object-cover" />
                      </a>
                    )}
                    {m.media_type === "video" && m.media_url && (
                      <video src={m.media_url} controls onLoadedData={rolarThreadParaFinal}
                        className="max-w-full max-h-64 rounded-lg mb-1" />
                    )}
                    {m.media_type && !["audio", "image", "sticker", "video"].includes(m.media_type) && (
                      m.media_url ? (
                        <a href={m.media_url} target="_blank" rel="noreferrer"
                          className={`text-xs underline mb-1 inline-block ${m.from_me ? "text-blue-200" : "text-blue-500"}`}>
                          {previewMidia(m.media_type)} — abrir
                        </a>
                      ) : (
                        <div className="text-xs mb-1 opacity-80">{previewMidia(m.media_type)}</div>
                      )
                    )}
                    {(m.media_type === "audio" || m.ptt) && (
                      <div className="mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>🎵</span>
                          {m.audio_duration && <span className={`text-xs ${m.from_me ? "text-blue-200" : "text-gray-400"}`}>{m.audio_duration}s</span>}
                          {m.media_url && <a href={m.media_url} target="_blank" rel="noreferrer" className={`text-xs underline ${m.from_me ? "text-blue-200" : "text-blue-500"}`}>ouvir</a>}
                          {/* Transcrição sob demanda (demanda 059) — só aparece se ainda não tem transcrição */}
                          {!m.transcription_text && m.media_url && (
                            <button onClick={() => transcreverAudio(m.message_id)}
                              disabled={transcrevendo === m.message_id}
                              className={`text-xs underline disabled:opacity-50 ${m.from_me ? "text-blue-200" : "text-blue-500"}`}>
                              {transcrevendo === m.message_id ? "Transcrevendo..." : "📝 Transcrever"}
                            </button>
                          )}
                        </div>
                        {m.transcription_text && <p className={`text-xs mt-1 italic ${m.from_me ? "text-blue-200" : "text-gray-500"}`}>"{m.transcription_text}"</p>}
                        {transcricaoErro[m.message_id] && (
                          <p className={`text-xs mt-1 ${m.from_me ? "text-red-200" : "text-red-500"}`}>{transcricaoErro[m.message_id]}</p>
                        )}
                      </div>
                    )}
                    {m.message_text && <p className="whitespace-pre-wrap break-words leading-snug">{m.message_text}</p>}
                    {m.caption && !m.message_text && <p className="text-xs opacity-80 mt-0.5">{m.caption}</p>}
                    {/* Demanda 282: só exibição fiel do que o cliente recebeu no
                        WhatsApp (botão/lista) — não é clicável aqui dentro. */}
                    {m.interativo?.tipo === "botoes" && (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {m.interativo.botoes.map((b, i) => (
                          <div key={i}
                            className={`text-center text-xs font-medium rounded-full px-3 py-1 border ${m.from_me ? "border-blue-300 text-blue-100" : "border-gray-300 text-blue-600"}`}>
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                    {m.interativo?.tipo === "lista" && (
                      <div className="mt-1.5">
                        {/* Demanda 288: no WhatsApp real as opções só aparecem
                            depois de tocar no botão — escondidas por padrão
                            aqui também, reveladas com um clique no botão. */}
                        <button type="button"
                          onClick={() => setListasExpandidas(prev => ({ ...prev, [m.message_id]: !prev[m.message_id] }))}
                          className={`w-full text-center text-xs font-medium rounded-full px-3 py-1 border cursor-pointer ${m.from_me ? "border-blue-300 text-blue-100 hover:bg-blue-700/30" : "border-gray-300 text-blue-600 hover:bg-gray-100"}`}>
                          📋 {m.interativo.botaoTexto} {listasExpandidas[m.message_id] ? "▲" : "▼"}
                        </button>
                        {listasExpandidas[m.message_id] && (
                          <div className={`mt-1 text-xs space-y-0.5 ${m.from_me ? "text-blue-100" : "text-gray-500"}`}>
                            {m.interativo.opcoes.map((op, i) => <div key={i}>• {op}</div>)}
                          </div>
                        )}
                      </div>
                    )}
                    </>)}
                    <div className={`flex items-center justify-end gap-1 mt-0.5 ${m.from_me ? "text-blue-200" : "text-gray-400"}`}>
                      {/* Demanda 191: apagar pra todos — só mensagem enviada,
                          não apagada e já com id real do WhatsApp (não o
                          otimista temp-). Aparece no hover da bolha. */}
                      {m.from_me && !m.apagada_em && !m.message_id.startsWith("temp-") && (
                        <button onClick={() => apagarMensagemEnviada(m)}
                          disabled={apagandoMsgId === m.message_id}
                          title="Apagar pra todos (some do WhatsApp do cliente também)"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:scale-110 disabled:opacity-50 mr-1">
                          {apagandoMsgId === m.message_id ? "…" : "🗑️"}
                        </button>
                      )}
                      <span className="text-xs">{formatarHora(m.sent_at || m.data_timestamp)}</span>
                      {m.from_me && <MsgStatus status={m.status} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border-t border-gray-200 flex-shrink-0">
              {/* Barra de arrasto */}
              <div onMouseDown={startInputDrag}
                className="flex items-center justify-center h-4 cursor-row-resize hover:bg-blue-50 active:bg-blue-100 transition-colors select-none"
                title="Arraste para cima ou para baixo e ajuste o tamanho da caixa de texto">
                <svg width="48" height="8" viewBox="0 0 48 8" className="text-gray-400">
                  <circle cx="12" cy="4" r="2" fill="currentColor"/>
                  <circle cx="20" cy="4" r="2" fill="currentColor"/>
                  <circle cx="28" cy="4" r="2" fill="currentColor"/>
                  <circle cx="36" cy="4" r="2" fill="currentColor"/>
                </svg>
              </div>

              {/* Preview do anexo */}
              {anexo && (
                <div className="mx-4 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
                  {anexo.tipo === "image" && (
                    <img src={anexo.preview} alt="preview" className="h-16 w-16 object-cover rounded-lg flex-shrink-0" />
                  )}
                  {anexo.tipo === "video" && (
                    <video src={anexo.preview} className="h-16 w-16 object-cover rounded-lg flex-shrink-0" />
                  )}
                  {anexo.tipo === "document" && (
                    <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{anexo.file.name}</p>
                    <p className="text-xs text-gray-400">{(anexo.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setAnexo(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                  </button>
                </div>
              )}

              {iaErro && (
                <p className="mx-4 mb-1.5 text-xs text-red-500">✨ {iaErro}</p>
              )}
              {sugestaoAtiva && reply && (
                <p className="mx-4 mb-1.5 text-xs text-purple-600 font-semibold">
                  ✨ Sugestão da IA — edite antes de mandar
                </p>
              )}

              <div className="flex items-end gap-2 px-4 pb-3">
                {/* Input oculto de arquivo */}
                <input ref={fileInputRef} type="file"
                  accept="image/*,video/mp4,video/mpeg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  className="hidden" onChange={selecionarArquivo} />

                {/* Botão clipe */}
                <button onClick={() => fileInputRef.current?.click()}
                  title="Anexar imagem, vídeo ou documento"
                  className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0 mb-0.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>

                {/* Botão IA (demanda 048) — só sugere, nunca envia sozinho */}
                <button onClick={sugerirRespostaIA} disabled={sugerindoIA || !phoneAtivo}
                  title="Sugerir resposta com IA (você revisa e edita antes de enviar)"
                  className="text-purple-500 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0 mb-0.5 disabled:opacity-40">
                  {sugerindoIA ? "..." : "✨ IA"}
                </button>

                <textarea ref={textareaRef} value={reply}
                  onChange={e => { setReply(e.target.value); setSugestaoAtiva(false); }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); anexo ? enviarMidia() : enviar(); } }}
                  placeholder={anexo ? "Legenda (opcional)..." : "Digite uma mensagem... (Enter para enviar, Shift+Enter para quebrar linha)"}
                  style={{ height: inputHeight, overflowY: "auto" }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400" />

                <button
                  onClick={anexo ? enviarMidia : enviar}
                  disabled={(!reply.trim() && !anexo) || enviando || enviandoMidia}
                  title={anexo ? "Enviar arquivo via WhatsApp" : "Enviar mensagem via WhatsApp (Enter para enviar, Shift+Enter para nova linha)"}
                  className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5">
                  {(enviando || enviandoMidia) ? "..." : "➤"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Divider direita */}
      {painelDireitoAberto && (
        <div onMouseDown={e => startDrag("right", e)}
          className="w-1 flex-shrink-0 bg-gray-200 hover:bg-blue-400 active:bg-blue-600 cursor-col-resize transition-colors" />
      )}

      {/* ── DIREITA — contato + status + mini PDV ── */}
      {painelDireitoAberto && <div style={{ width: rightWidth, minWidth: 200, maxWidth: 540 }} className="flex-shrink-0 bg-white flex flex-col overflow-hidden">

        {/* ── Bloco 1: Dados do contato (demanda 116) — reduzido a nome +
            telefone, bem compacto; o resto (foto, edição de nome,
            recebidas/enviadas, último contato) já existe em detalhe na tela
            Clientes (demandas 083/086) e saiu daqui pra sobrar espaço pro(s)
            pedido(s) da conversa (Bloco 3), inclusive vendas com vários itens
            (demanda 088). ── */}
        {conversaAtiva ? (
          <div className="flex-shrink-0 border-b border-gray-200 px-4 py-2">
            <p className={`font-semibold text-sm truncate ${conversaAtiva.temNome ? "text-gray-800" : "text-gray-400 italic"}`}>{conversaAtiva.nome}</p>
            <p className="text-xs text-gray-400">{conversaAtiva.phone}</p>
          </div>
        ) : (
          <div className="flex-shrink-0 border-b border-gray-200 px-4 py-4 text-sm text-gray-400">
            Selecione uma conversa
          </div>
        )}

        {/* Demanda 119: bloco "Status do atendimento" (badges Aberto/Em
            atendimento/Resolvido, Atendente, Histórico de atendimento) saiu
            do painel — já é redundante com o badge colorido de cada conversa
            na lista da esquerda, e o controle de status manual (Assumir/
            Resolver ✓/Reabrir) já mora no cabeçalho da conversa, logo acima
            (ver JSX perto de "Arquivar"). Histórico de atendimento migrou pra
            TelaClientes.tsx. "Resumir conversa" (demanda 048) fica escondido
            atrás de `RESUMIR_CONVERSA_ATIVO`, não apagado — reativar é só
            virar a flag pra `true`. */}
        {conversaAtiva && RESUMIR_CONVERSA_ATIVO && (
          <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
            <button onClick={resumirConversa} disabled={resumindo}
              className="w-full text-xs text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-lg py-1.5 font-medium disabled:opacity-40 transition-colors">
              {resumindo ? "Resumindo..." : "🧠 Resumir conversa"}
            </button>
            {resumoErro && <p className="text-xs text-red-500 mt-1.5">{resumoErro}</p>}
            {resumoConversa && (
              <div className="mt-1.5 bg-purple-50 border border-purple-200 rounded-lg p-2">
                <p className="text-[10px] text-purple-500 font-bold uppercase tracking-wide mb-1">Resumo (nota interna)</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{resumoConversa}</p>
              </div>
            )}
          </div>
        )}

        {/* Demanda 276: atalho de "Atendimento IA" direto na conversa — antes
            só dava pra ligar/desligar em Configurações → Conectar API (275),
            um caminho longo pra ativar 1 cliente específico com o telefone
            já na tela. Reaproveita a mesma API da 275, a tela de
            Configurações continua existindo do jeito que está. */}
        {conversaAtiva && (
          <div className="flex-shrink-0 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">🤖 Atendimento IA</span>
              <button onClick={alternarAutorizacaoIA} disabled={alternandoIA || autorizacaoIA === null}
                className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
                  autorizacaoIA !== null && autorizacaoIA !== "nao_cadastrado" && autorizacaoIA.ativo ? "bg-green-500" : "bg-gray-300"
                }`}
                title={
                  autorizacaoIA === null ? "Carregando..."
                  : autorizacaoIA === "nao_cadastrado" ? "Não autorizado — clique pra ativar"
                  : autorizacaoIA.ativo ? "Ativo — clique pra desativar" : "Inativo — clique pra ativar"
                }>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  autorizacaoIA !== null && autorizacaoIA !== "nao_cadastrado" && autorizacaoIA.ativo ? "translate-x-5" : ""
                }`} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {autorizacaoIA === null ? "Carregando..."
                : autorizacaoIA === "nao_cadastrado" ? "Ainda não autorizado a receber o agente"
                : autorizacaoIA.ativo ? "Autorizado a receber o agente" : "Desativado"}
            </p>
          </div>
        )}

        {/* ── Bloco 3: Pedido da conversa (demandas 045/046) — última seção do
            painel desde a 054 (Lançar Venda saiu, "Pedido" é o único fluxo de
            transação que resta aqui) — por isso ocupa o espaço restante e
            rola por conta própria em vez de ficar do tamanho do conteúdo. ── */}
        {conversaAtiva && (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-medium">📦 Pedido desta conversa</p>
              {/* Demanda 171: navegação cruzada — todos os pedidos deste
                  contato na aba Pedidos, já filtrada pelo telefone. */}
              {onAbrirPedidos && phoneAtivo && (
                <button onClick={() => onAbrirPedidos(phoneAtivo)}
                  className="text-xs font-semibold text-blue-600 hover:underline">
                  Todos os pedidos →
                </button>
              )}
            </div>

            {/* Demanda 140: sinal de conclusão ao entregar — o painel reseta
                sozinho pra "Criar pedido" (fix na mesma demanda) e este banner
                confirma o que acabou de acontecer; some em ~6s. */}
            {pedidoConcluido && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-2.5 mb-2 text-xs font-semibold text-center">
                ✓ {pedidoConcluido} entregue — pedido concluído!
              </div>
            )}

            {carregandoPedido ? (
              <p className="text-xs text-gray-400">Carregando...</p>
            ) : itensVendaAtivo ? (
              // Demanda 088: venda com 2+ itens (mesmo venda_id) — mostra a
              // lista inteira + total, em vez de só o item mais recente.
              // Cada item mantém seu próprio status/avanço, mesmo padrão de
              // PainelDetalheVenda em TelaPedidos.tsx.
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">🧾 Venda com {itensVendaAtivo.length} itens</span>
                  <span className="font-bold text-purple-700">
                    {moeda(itensVendaAtivo.reduce((acc, p) => acc + (p.valor_final ?? 0), 0))}
                  </span>
                </div>
                {/* Demanda 190: caminho padrão — avança TODOS os itens
                    abertos de uma vez quando estão na mesma etapa; some
                    quando as etapas divergem (aí valem os botões por item). */}
                {(() => {
                  const abertos = itensVendaAtivo.filter(p => p.status !== "entregue" && p.status !== "cancelado");
                  if (abertos.length === 0) return null;
                  const mesmaEtapa = abertos.every(p => p.status === abertos[0].status);
                  if (!mesmaEtapa) {
                    return (
                      <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                        Itens em etapas diferentes — avance um a um abaixo até alinharem.
                      </p>
                    );
                  }
                  const proximo = PROXIMO_STATUS_PEDIDO[abertos[0].status];
                  if (!proximo) return null;
                  return (
                    <button onClick={avancarVendaInteira} disabled={avancandoVenda || !!avancandoItemId}
                      className="w-full bg-purple-700 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-purple-800 disabled:opacity-50">
                      {avancandoVenda
                        ? "Salvando..."
                        : `Avançar ${abertos.length > 1 ? `os ${abertos.length} itens` : "o item"} → ${STATUS_LABEL_PEDIDO[proximo]}`}
                    </button>
                  );
                })()}
                <div className="space-y-1.5">
                  {itensVendaAtivo.map(item => (
                    <div key={item.id} className="bg-white rounded-lg p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-800 truncate">{item.servico_nome}</div>
                          {item.quantidade != null && (
                            <div className="text-[10px] text-gray-500">Qtd: {item.quantidade} · {moeda(item.valor_final)}</div>
                          )}
                          {/* Demanda 113: forma de pagamento + status, mesmo padrão do Balcão (066).
                              Demanda 124: variação própria quando confirmado automático via MP. */}
                          <div className={`text-[10px] ${item.pagamento_confirmado ? "text-green-600" : "text-gray-400"}`}>
                            {textoPagamento(item, "Pendente")}
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_CFG[item.status]?.bg ?? "bg-gray-100"} ${STATUS_CFG[item.status]?.cor ?? "text-gray-600"}`}>
                          {STATUS_LABEL_PEDIDO[item.status] ?? item.status}
                        </span>
                      </div>
                      {PROXIMO_STATUS_PEDIDO[item.status] && (
                        <div className="flex gap-1">
                          <button onClick={() => avancarStatusItemVenda(item)} disabled={avancandoItemId === item.id}
                            className="flex-1 bg-purple-600 text-white rounded-lg py-1 text-[10px] font-bold hover:bg-purple-700 disabled:opacity-50">
                            {avancandoItemId === item.id ? "Salvando..." : `Avançar → ${STATUS_LABEL_PEDIDO[PROXIMO_STATUS_PEDIDO[item.status]!]}`}
                          </button>
                          {/* Demanda 112 */}
                          <button onClick={() => cancelarItemVenda(item)} disabled={avancandoItemId === item.id}
                            title="Cancelar este item"
                            className="px-2 text-[10px] text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 text-center">Ao avançar, o texto de aviso fica pronto na caixa de resposta pra você revisar e mandar</p>
              </div>
            ) : pedidoAtivo ? (
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-2.5 space-y-2">
                <div className="text-xs">
                  <div className="font-bold text-gray-800">{pedidoAtivo.servico_nome}</div>
                  {pedidoAtivo.quantidade != null && <div className="text-gray-500">Qtd: {pedidoAtivo.quantidade}</div>}
                  <div className="text-sm font-bold text-purple-700 mt-0.5">
                    {moeda(pedidoAtivo.valor_final)}
                    {!!pedidoAtivo.desconto_pct && pedidoAtivo.desconto_pct > 0 && (
                      <span className="text-xs font-normal text-gray-500"> ({pedidoAtivo.desconto_pct}% desc.)</span>
                    )}
                  </div>
                  {/* Demanda 113: forma de pagamento + status, mesmo padrão do Balcão (066).
                      Demanda 124: variação própria quando confirmado automático via MP. */}
                  <div className={`text-[10px] mt-0.5 ${pedidoAtivo.pagamento_confirmado ? "text-green-600" : "text-gray-400"}`}>
                    {textoPagamento(pedidoAtivo, "Pagamento pendente")}
                  </div>
                </div>

                <div className="flex items-center">
                  {STATUS_ORDER_PEDIDO.map((s, i) => {
                    const idxAtual = STATUS_ORDER_PEDIDO.indexOf(pedidoAtivo.status);
                    const feito = i < idxAtual;
                    const atual = i === idxAtual;
                    return (
                      <div key={s} className="flex-1 text-center relative">
                        {i > 0 && (
                          <div className={`absolute top-2.5 right-1/2 w-full h-0.5 ${feito || atual ? "bg-green-400" : "bg-gray-200"}`} />
                        )}
                        <div className={`relative mx-auto w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          feito ? "bg-green-500 text-white" : atual ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-400"
                        }`}>
                          {feito ? "✓" : i + 1}
                        </div>
                        <div className="text-[9px] text-gray-500 mt-0.5">{STATUS_LABEL_PEDIDO[s]}</div>
                      </div>
                    );
                  })}
                </div>

                {PROXIMO_STATUS_PEDIDO[pedidoAtivo.status] && (
                  <>
                    <div className="flex gap-1.5">
                      <button onClick={avancarStatusPedido} disabled={avancandoPedido}
                        className="flex-1 bg-purple-600 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
                        {avancandoPedido ? "Salvando..." : `Avançar → ${STATUS_LABEL_PEDIDO[PROXIMO_STATUS_PEDIDO[pedidoAtivo.status]!]}`}
                      </button>
                      {/* Demanda 112 */}
                      <button onClick={cancelarPedidoAtivo} disabled={avancandoPedido}
                        title="Cancelar este pedido"
                        className="px-2.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50">
                        ✕
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center">Ao avançar, o texto de aviso fica pronto na caixa de resposta pra você revisar e mandar</p>
                  </>
                )}
              </div>
            ) : !pedidoFluxo ? (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">Essa conversa ainda não tem um pedido registrado.</p>
                <button onClick={iniciarFluxoPedido}
                  className="w-full bg-purple-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-purple-700">
                  📦 Criar pedido
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Carrinho (demanda 076) — itens já confirmados, esperando o
                    envio final. Só aparece "N itens" agrupado na aba Pedidos
                    quando há 2+ (mesma regra do balcão, demanda 066). */}
                {pedidoCarrinho.length > 0 && (
                  <div className="bg-white border border-purple-200 rounded-lg p-2 space-y-1.5">
                    <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">
                      Carrinho ({pedidoCarrinho.length} {pedidoCarrinho.length === 1 ? "item" : "itens"})
                    </p>
                    {pedidoCarrinho.map((item, i) => {
                      const valor = item.calculo?.valorFinal ?? item.valorManual ?? 0;
                      return (
                        <div key={i} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-gray-700 truncate">
                            {item.produto.nome}{item.calculo && item.quantidade > 1 ? ` (${item.quantidade}x)` : ""}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="font-semibold text-gray-800">{moeda(valor)}</span>
                            <button onClick={() => removerItemCarrinho(i)} className="text-gray-300 hover:text-red-500">✕</button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-100 pt-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Total</span>
                      <span className="text-sm font-bold text-purple-700">
                        {moeda(pedidoCarrinho.reduce((acc, it) => acc + (it.calculo?.valorFinal ?? it.valorManual ?? 0), 0))}
                      </span>
                    </div>
                    {/* Demanda 138: as perguntas de pagamento (137) saíram
                        daqui — o botão abre o modal, igual ao balcão (066). */}
                    <button onClick={() => setModalPagamentoPedido(true)} disabled={pedidoSalvando}
                      className="w-full bg-purple-600 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-purple-700 disabled:opacity-50">
                      {pedidoSalvando ? "Gravando..." : `Confirmar pedido (${pedidoCarrinho.length} ${pedidoCarrinho.length === 1 ? "item" : "itens"})`}
                    </button>
                  </div>
                )}

                {!pedidoProdutoSel ? (
                  <>
                    {/* Demanda 133: tags de categoria com fonte/espaçamento
                        mais confortáveis — sem cor nova, só respiração. */}
                    <div className="flex flex-wrap gap-1.5">
                      {grupos.filter(g => g.nome !== "Entrada Avulsa").map(g => (
                        <button key={g.nome} onClick={() => setPedidoGrupoSel(g.nome)}
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            pedidoGrupoSel === g.nome ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}>
                          {g.nome}
                        </button>
                      ))}
                    </div>
                    {/* Demanda 133: sem o `max-h-40 overflow-y-auto` de antes —
                        o scroll interno era redundante (o painel pai já rola,
                        `flex-1 overflow-y-auto`) e cortava a lista com 160px.
                        1 produto por linha: card maior, mais fácil de ler/tocar. */}
                    <div className="grid grid-cols-1 gap-1.5">
                      {produtosGrupoPedido.map(prod => (
                        <button key={prod.id} onClick={() => selecionarProdutoPedido(prod)}
                          className="text-left rounded-xl border-2 border-gray-200 bg-white p-3 hover:border-purple-300 transition-all">
                          <div className="font-semibold text-gray-800 text-sm leading-snug">{prod.nome}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{prod.preco == null ? "Sob consulta" : moeda(prod.preco)}</div>
                        </button>
                      ))}
                      {produtosGrupoPedido.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">Nenhum produto ativo nessa categoria.</p>
                      )}
                    </div>
                    <button onClick={cancelarFluxoPedido} className="w-full text-xs text-gray-400 hover:text-red-500 text-center">
                      Cancelar criação de pedido
                    </button>
                  </>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">{pedidoProdutoSel.nome}</span>
                      <button onClick={() => { setPedidoProdutoSel(null); setPedidoCalculo(null); setPedidoErro(null); }}
                        className="text-xs text-gray-400 hover:text-red-500">✕</button>
                    </div>

                    {pedidoProdutoSel.preco == null ? (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Este produto exige orçamento manual — informe o valor combinado com o cliente:
                        </label>
                        <input type="text" inputMode="decimal" placeholder="Valor R$" value={pedidoValorManual}
                          onChange={e => setPedidoValorManual(sanitizarValorMonetario(e.target.value))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400" />
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Quantidade</label>
                        <input type="text" inputMode="decimal" value={pedidoQtd}
                          onChange={e => setPedidoQtd(e.target.value.replace(/[^\d,.]/g, ""))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-400" />
                      </div>
                    )}

                    {pedidoErro && <p className="text-xs text-red-500">{pedidoErro}</p>}
                    {pedidoCalculando && <p className="text-xs text-gray-400">Calculando...</p>}

                    {pedidoCalculo && (
                      <div className="bg-white rounded-lg p-2 flex items-center justify-between border border-green-200">
                        <span className="text-xs text-gray-500">
                          Total calculado{pedidoCalculo.descontoPct > 0 ? ` (${pedidoCalculo.descontoPct}% desc.)` : ""}
                        </span>
                        <span className="text-sm font-bold text-green-700">{moeda(pedidoCalculo.valorFinal)}</span>
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <button onClick={() => { setPedidoProdutoSel(null); setPedidoCalculo(null); setPedidoErro(null); }}
                        className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50">
                        Cancelar
                      </button>
                      <button onClick={adicionarAoCarrinho}
                        disabled={pedidoSalvando || (pedidoProdutoSel.preco != null && !pedidoCalculo) || (pedidoProdutoSel.preco == null && !pedidoValorManual)}
                        className="flex-1 bg-purple-600 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-purple-700 disabled:opacity-40">
                        + Adicionar ao pedido
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Demanda 089: mesmo modal de confirmação de pagamento pendente da
            aba Pedidos (TelaPedidos.tsx, demandas 069/072) — reaproveitado
            aqui pros dois fluxos de avanço do cartão (item único e item de
            uma venda com 2+ produtos). */}
        {acaoPendentePedido && (
          <ModalConfirmarPagamento
            perguntarGaveta={operador.papel === "admin"}
            apenasRecarga={!!(itensVendaAtivo?.find(p => p.id === acaoPendentePedido.id) ?? pedidoAtivo)?.eh_recarga}
            onConfirmar={confirmarAvancoPendente}
            onCancelar={() => setAcaoPendentePedido(null)}
          />
        )}

        {/* Demanda 190: gate de pagamento do "avançar venda inteira" — o
            modal abre UMA vez e a forma vale pra todos os itens não pagos
            (item já pago avança sem receber forma nenhuma). Demanda 219: só
            esconde o Pix genérico quando TODOS os itens da venda são
            recarga — venda mista continua com as 4 opções. */}
        {acaoPendenteVenda && (
          <ModalConfirmarPagamento
            perguntarGaveta={operador.papel === "admin"}
            apenasRecarga={acaoPendenteVenda.itens.every(p => !!p.eh_recarga)}
            onConfirmar={(formaPagamento, pagamentoConfirmadoEm, gavetaDestino) => {
              const { itens, status } = acaoPendenteVenda;
              setAcaoPendenteVenda(null);
              executarAvancoVendaInteira(itens, status, formaPagamento, pagamentoConfirmadoEm, gavetaDestino);
            }}
            onCancelar={() => setAcaoPendenteVenda(null)}
          />
        )}

        {/* Demanda 138: pergunta de pagamento da 137 virou modal ao clicar
            "Confirmar pedido" — mesmo padrão visual do "Finalizar venda" do
            balcão (066). Perguntas continuam OPCIONAIS e sem default (decisão
            da 137); Cancelar fecha sem criar nada; Confirmar executa
            exatamente o `confirmarPedidoCarrinho` de sempre. */}
        {modalPagamentoPedido && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalPagamentoPedido(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-7 w-96" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-800 text-base mb-1">Confirmar pedido</h3>
              <p className="text-gray-400 text-sm mb-5">
                {pedidoCarrinho.length} {pedidoCarrinho.length === 1 ? "item" : "itens"} · Total: <strong className="text-purple-700">
                  {moeda(pedidoCarrinho.reduce((acc, it) => acc + (it.calculo?.valorFinal ?? it.valorManual ?? 0), 0))}
                </strong>
              </p>

              {/* Demanda 139 (Fase 2): tipo de entrega antes das perguntas de
                  pagamento — ordem natural descrita pelo Edvam. Só captura,
                  opcional e sem default (mesma filosofia da Fase 1). */}
              <label className="text-xs text-gray-500 mb-1.5 block font-semibold">Tipo de entrega (opcional)</label>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {([["imediata", "Imediata"], ["retirada", "Retira depois"]] as const).map(([valor, rotulo]) => (
                  <button key={valor}
                    onClick={() => setPedidoTipoEntrega(pedidoTipoEntrega === valor ? null : valor)}
                    className={`text-sm font-medium rounded-lg py-2.5 border-2 transition-colors ${
                      pedidoTipoEntrega === valor ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {rotulo}
                  </button>
                ))}
              </div>

              <label className="text-xs text-gray-500 mb-1.5 block font-semibold">Forma de pagamento (opcional)</label>
              <div className="grid grid-cols-3 gap-2 mb-5">
                {(["dinheiro", "pix", "cartao"] as const).map(valor => {
                  // Demanda 224: só o RÓTULO do "Pix" muda pra carrinho 100%
                  // recarga — o valor enviado continua 'pix' (ver
                  // pedidoCarrinhoTodoRecarga acima pro motivo).
                  const rotulo = valor === "pix"
                    ? (pedidoCarrinhoTodoRecarga ? "Pix RecargaPay" : "Pix")
                    : valor === "dinheiro" ? "Dinheiro" : "Cartão";
                  return (
                    <button key={valor}
                      onClick={() => setPedidoFormaEscolhida(pedidoFormaEscolhida === valor ? null : valor)}
                      className={`text-sm font-medium rounded-lg py-2.5 px-2 border-2 transition-colors ${
                        pedidoFormaEscolhida === valor ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>
                      {rotulo}
                    </button>
                  );
                })}
              </div>

              <label className="text-xs text-gray-500 mb-1.5 block font-semibold">Pagar quando? (opcional)</label>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {([["agora", "Agora"], ["retirada", "Na retirada"]] as const).map(([valor, rotulo]) => (
                  <button key={valor}
                    onClick={() => setPedidoMomento(pedidoMomento === valor ? null : valor)}
                    className={`text-sm font-medium rounded-lg py-2.5 border-2 transition-colors ${
                      pedidoMomento === valor ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {rotulo}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setModalPagamentoPedido(false)}
                  className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
                <button onClick={confirmarPedidoCarrinho} disabled={pedidoSalvando}
                  className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                  {pedidoSalvando ? "Gravando..." : "✓ Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Demanda 145: popup com o QR/copia-e-cola da cobrança criada na
            confirmação — mesmo ModalQrPix do balcão. Sem "Cancelar venda"
            (142 é coisa de balcão; pedido do Inbox tem fluxo próprio). O
            atendente copia e cola na conversa manualmente.
            Demanda 224: onConfirmarPagamento/onConfirmarRecarga ligados —
            antes ausentes de propósito (147/179: "confirma depois pela aba
            Pedidos"), agora com o mesmo botão manual que o balcão sempre
            teve, pros casos em que confirmar sem mexer em status é mais
            direto que reabrir o avanço de status na aba Pedidos. */}
        {cobrancaPixInbox && (
          <ModalQrPix
            cobranca={cobrancaPixInbox}
            onFechar={() => setCobrancaPixInbox(null)}
            onConfirmarPagamento={cobrancaPixInbox.estatico ? confirmarPagamentoRecargaInbox : undefined}
            onConfirmarRecarga={cobrancaPixInbox.recarga ? confirmarRecargaMistaInbox : undefined}
            textoErro="O pedido foi confirmado normalmente, mas não deu pra gerar a cobrança Pix agora. O rascunho da conversa saiu com a chave Pix estática — revise e envie por ele."
          />
        )}

      </div>}
    </div>
  );
}
