"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { CATEGORIA_PARA_GRUPO, ORDEM_GRUPOS, sanitizarValorMonetario, TAXA_RECARGA_VEM, ordenarProdutosDoGrupo, iconeGrupo, CONTAS_ORIGEM } from "@/lib/dados";
import { type Usuario } from "@/lib/usuarios";
import { TelaInbox } from "@/components/TelaInbox";
import { TelaFechamento } from "@/components/TelaFechamento";
import { TelaFinanceiro } from "@/components/TelaFinanceiro";
import { TelaMarketingConteudo } from "@/components/TelaMarketingConteudo";
import { TelaPedidos } from "@/components/TelaPedidos";
import { TelaClientes } from "@/components/TelaClientes";
import { TelaContasPagarReceber } from "@/components/TelaContasPagarReceber";
import { TelaEntradas } from "@/components/TelaEntradas";
import { TelaMercadoPago } from "@/components/TelaMercadoPago";
import { TelaConciliacao } from "@/components/TelaConciliacao";
import { TelaTelefonesAutorizados } from "@/components/TelaTelefonesAutorizados";
import { ModalQrPix } from "@/components/ModalQrPix";
import { AbaKeepAlive, useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { VincularContatoBalcao } from "@/components/VincularContatoBalcao";
import { useDeslogarEm401 } from "@/lib/useDeslogarEm401";

type Aba = "pdv" | "entradas" | "saidas" | "fechamento" | "financeiro" | "produtos" | "pedidos" | "clientes" | "inbox" | "contas" | "contasPagarReceber" | "mercadoPago" | "conciliacao" | "config" | "conteudo";

// Demanda 087 — menu agrupado por área (2 fileiras), mockup aprovado pelo
// Edvam: https://claude.ai/code/artifact/f2c28956-0ad9-433f-a1aa-ea11b9e5f3b2
// Cada grupo só mostra as abas que já existem em `abasVisiveis` — não muda
// permissão nenhuma, só reorganiza a navegação existente.
// Demanda 075: "Movimento" e "Dashboard" viraram uma tela só, "financeiro".
const GRUPOS_NAV: { id: string; label: string; abas: Aba[] }[] = [
  { id: "atendimento", label: "💬 Atendimento",   abas: ["inbox", "clientes"] },
  { id: "vendas",      label: "📋 Vendas",         abas: ["pdv", "pedidos"] },
  { id: "financeiro",  label: "💰 Financeiro",     abas: ["entradas", "saidas", "fechamento", "financeiro", "contasPagarReceber", "mercadoPago", "conciliacao"] },
  // Demanda 310: só "Conteúdo" por ora (Novo post/Plano/Como vai ficar,
  // WhatsApp Status). Fica em grupo próprio porque não é nem venda nem
  // financeiro nem config, mesma lógica que separou "Atendimento".
  { id: "marketing",   label: "📢 Marketing",      abas: ["conteudo"] },
  { id: "config",      label: "⚙️ Configurações",  abas: ["produtos", "config"] },
];

interface ProdutoAPI {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
  ativo: boolean;
}

interface ItemCarrinho {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  // Demanda 105: desconto pontual por item, decisão manual do operador na
  // hora da venda — nunca regra automática (isso foi explicitamente
  // descartado pelo Edvam). "valor" e "pct" são mutuamente exclusivos.
  descontoTipo?: "valor" | "pct";
  descontoValor?: number;
  descontoPct?: number;
  descontoMotivo?: string;
}

function valorComDesconto(item: ItemCarrinho): number {
  const bruto = item.preco * item.quantidade;
  if (item.descontoTipo === "valor" && item.descontoValor) {
    return Math.max(0, Math.round((bruto - item.descontoValor) * 100) / 100);
  }
  if (item.descontoTipo === "pct" && item.descontoPct) {
    return Math.round(bruto * (1 - item.descontoPct / 100) * 100) / 100;
  }
  return bruto;
}

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Demanda 123 — item da lista "Saídas previstas", só os campos usados ali
// (mesmo formato de `ContaPagarReceber` em lib/supabase-admin.ts, sem
// importar o tipo do servidor pra um componente client).
interface ContaPrevista {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  vencimento: string;
  tipo: "pagar" | "receber";
  status: "pendente" | "pago" | "atrasado";
}

// CONFIG Z-API
// ─────────────────────────────────────────────────────────────
function TelaConfigZAPI() {
  const [status, setStatus]     = useState<Record<string, unknown> | null>(null);
  const [eventos, setEventos]   = useState<{ evento: string; motivo: string; data_evento: string; connected: boolean }[]>([]);
  const [qrcode, setQrcode]     = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]         = useState("");

  async function carregarStatus() {
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch("/api/zapi/status");
      const d = await res.json();
      if (d.error) { setErro(d.error); return; }
      setStatus(d.status);
      setEventos(d.eventos ?? []);
    } catch { setErro("Não foi possível conectar"); }
    finally { setCarregando(false); }
  }

  async function carregarQRCode() {
    setCarregando(true);
    setErro("");
    try {
      const res = await fetch("/api/zapi/qrcode");
      const d = await res.json();
      if (d.error) { setErro(d.error); return; }
      setQrcode(d.qrcode?.value || d.qrcode?.qrcode || JSON.stringify(d.qrcode));
    } catch { setErro("Erro ao buscar QR Code"); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregarStatus(); }, []);

  const conectado = status && (status.connected === true || (status as { value?: { connected?: boolean } }).value?.connected === true);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Configuração Z-API</h2>
        <p className="text-sm text-gray-500">Gerencie a conexão WhatsApp da gráfica.</p>
      </div>

      {/* Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm text-gray-700">Status da instância</h3>
          <button onClick={carregarStatus} disabled={carregando} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
            {carregando ? "Verificando..." : "Atualizar"}
          </button>
        </div>
        {erro && <p className="text-sm text-red-600 mb-2">{erro}</p>}
        {status ? (
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${conectado ? "bg-green-500" : "bg-red-500"}`} />
            <span className={`text-sm font-medium ${conectado ? "text-green-700" : "text-red-700"}`}>
              {conectado ? "Conectado" : "Desconectado"}
            </span>
            {(status as { phone?: string }).phone && (
              <span className="text-sm text-gray-500">{(status as { phone?: string }).phone}</span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Carregando...</p>
        )}
      </div>

      {/* QR Code */}
      {!conectado && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-gray-700">Conectar via QR Code</h3>
            <button onClick={carregarQRCode} disabled={carregando} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {carregando ? "Gerando..." : "Gerar QR Code"}
            </button>
          </div>
          {qrcode && (
            <div className="text-center">
              {qrcode.startsWith("data:image") || qrcode.startsWith("http") ? (
                <img src={qrcode} alt="QR Code" className="mx-auto max-w-48 border border-gray-200 rounded-lg" />
              ) : (
                <p className="text-xs text-gray-500 break-all font-mono bg-gray-50 p-2 rounded">{qrcode}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
            </div>
          )}
        </div>
      )}

      {/* Histórico de eventos */}
      {eventos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-medium text-sm text-gray-700 mb-3">Últimos eventos</h3>
          <div className="space-y-2">
            {eventos.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${e.connected ? "bg-green-500" : "bg-red-400"}`} />
                <div>
                  <span className="font-medium text-gray-700">{e.evento}</span>
                  {e.motivo && <span className="text-gray-400"> · {e.motivo}</span>}
                  <span className="text-gray-400 ml-1">
                    {e.data_evento ? new Date(e.data_evento).toLocaleString("pt-BR") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELA DE LOGIN
// ─────────────────────────────────────────────────────────────
function TelaLogin({ onLogin, sessaoExpirada }: { onLogin: (u: Usuario) => void; sessaoExpirada?: boolean }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Demanda 329 (Caminho A): senha valida no SERVIDOR agora (rota
  // /api/auth/login-admin), nunca mais comparada no navegador — a senha do
  // Edvam saiu de lib/usuarios.ts, que era importado por este componente
  // cliente e empacotava a senha inteira pro bundle público (achado da 302).
  async function tentarLogin(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/auth/login-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const data = await res.json();
      if (res.ok && data.usuario) {
        onLogin(data.usuario);
      } else {
        setErro(data.error || "Senha incorreta.");
        setSenha("");
      }
    } catch {
      setErro("Não deu pra conectar — tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-96">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🖨️</div>
          <h1 className="text-xl font-bold text-gray-800">JS Gráfica — Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Área restrita</p>
        </div>
        {sessaoExpirada && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-center py-2 px-3 mb-4">
            Sua sessão caiu — faça login de novo.
          </p>
        )}
        <form onSubmit={tentarLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(""); }}
              placeholder="Digite sua senha"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              required
            />
          </div>
          {erro && <p className="text-red-600 text-xs font-medium text-center">{erro}</p>}
          <button type="submit" disabled={enviando} className="w-full bg-blue-600 text-white rounded-lg py-3 font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PDV — PONTO DE VENDA
// ─────────────────────────────────────────────────────────────
function TelaPDV({ onVendaConfirmada, operador }: { onVendaConfirmada: () => void; operador: Usuario }) {
  const [produtosDB, setProdutosDB]         = useState<ProdutoAPI[]>([]);
  const [carregandoProds, setCarregandoProds] = useState(true);
  const [carrinho, setCarrinho]             = useState<ItemCarrinho[]>([]);
  const [grupoAtivo, setGrupoAtivo]         = useState("");
  const [avulsoValor, setAvulsoValor] = useState("");
  const [avulsoDesc, setAvulsoDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  // Demanda 163: busca/sugestões/criação de contato moram no componente
  // compartilhado VincularContatoBalcao — a página só guarda o vínculo.
  const [contatoSelecionado, setContatoSelecionado] = useState<{ phone: string; nome: string } | null>(null);
  const qtdInputRef = useRef<HTMLInputElement | null>(null);
  // Demanda 105: qual item do carrinho tem o painel de desconto aberto —
  // discreto por padrão (fechado), não atrapalha quem não usa.
  const [descontoAberto, setDescontoAberto] = useState<string | null>(null);

  const totalCarrinho = carrinho.reduce((acc, i) => acc + valorComDesconto(i), 0);

  function definirDescontoTipo(produtoId: string, tipo: "valor" | "pct") {
    setCarrinho(prev => prev.map(i => i.produtoId === produtoId
      ? { ...i, descontoTipo: tipo, descontoValor: undefined, descontoPct: undefined }
      : i));
  }
  function definirDescontoNumero(produtoId: string, valorTexto: string) {
    const num = parseFloat(valorTexto.replace(",", "."));
    setCarrinho(prev => prev.map(i => {
      if (i.produtoId !== produtoId) return i;
      // "R$" é o padrão visual do toggle (ver render) — sem isso, digitar
      // direto sem clicar no toggle deixava `descontoTipo` indefinido e o
      // desconto nunca era aplicado de verdade (achado no teste da 105).
      const tipo = i.descontoTipo ?? "valor";
      if (tipo === "pct") return { ...i, descontoTipo: tipo, descontoPct: num || undefined };
      return { ...i, descontoTipo: tipo, descontoValor: num || undefined };
    }));
  }
  function definirDescontoMotivo(produtoId: string, motivo: string) {
    setCarrinho(prev => prev.map(i => i.produtoId === produtoId ? { ...i, descontoMotivo: motivo || undefined } : i));
  }
  function removerDesconto(produtoId: string) {
    setCarrinho(prev => prev.map(i => i.produtoId === produtoId
      ? { ...i, descontoTipo: undefined, descontoValor: undefined, descontoPct: undefined, descontoMotivo: undefined }
      : i));
    setDescontoAberto(null);
  }

  const [modal, setModal] = useState<{ produtoId: string; nome: string; preco: number } | null>(null);
  const [modalQtd, setModalQtd] = useState("1");
  // Demanda 066: forma de pagamento e "já entregou agora?" antes de gravar a venda.
  const [modalVenda, setModalVenda] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<"Dinheiro" | "Cartão" | "Pix" | "Paga na retirada">("Dinheiro");
  // Demanda 137 (Fase 1): quando "Paga na retirada", captura QUAL forma o
  // cliente pretende usar depois — só gravação, opcional (mesma mudança do
  // PDV, implementações duplicadas).
  const [formaRetirada, setFormaRetirada] = useState<"Dinheiro" | "Cartão" | "Pix" | null>(null);
  // Demanda 196: quem NÃO tem gaveta física própria (o Edvam — papel admin)
  // vendendo em Dinheiro escolhe pra qual gaveta o físico vai; Zu/Gabi nunca
  // veem a pergunta (têm gaveta própria, o criador do pedido já é a gaveta).
  const perguntarGaveta = operador.papel === "admin";
  const [gavetaDestino, setGavetaDestino] = useState<"Zu" | "Gabi" | null>(null);
  // Demanda 141 (Fase 3): venda com Pix imediato gera cobrança real e mostra
  // o QR — confirmação vem do pagamento de verdade (poll + webhook/fallback
  // da 124); venda Pix nasce `pagamento_confirmado: false` agora. Mesma
  // mudança do PDV, implementações duplicadas.
  // Demanda 145: poll/copiar/estado "pago" moraram aqui até virarem parte do
  // ModalQrPix compartilhado — a página só guarda os dados da cobrança (e o
  // vendaId, que o cancelamento da 142 precisa).
  const [cobrancaPix, setCobrancaPix] = useState<null | {
    orderId: string; qrCode: string; qrCodeBase64: string | null;
    valor: number; erro?: boolean;
    // Demanda 147: Pix estático do RecargaPay (venda 100% recarga) — sem MP,
    // confirmação manual pelo botão do popup.
    estatico?: boolean; chave?: string; titular?: string;
    // Demanda 179: venda MISTA — instrução separada da recarga (RecargaPay),
    // que a cobrança MP acima não cobre.
    recarga?: {
      valor: number; pedidoIds: string[];
      chave: string | null; titular: string | null;
      qrCode: string | null; qrCodeBase64: string | null;
    } | null;
    // Demanda 142: precisa saber QUAL venda cancelar de verdade.
    vendaId: string;
  }>(null);

  // Demanda 147: o atendente conferiu o recebimento no app do RecargaPay e
  // marca a venda como paga — mesma gravação da confirmação manual da 113
  // (PATCH confirmarPagamento), sem mexer no status.
  async function confirmarPagamentoRecarga() {
    if (!cobrancaPix || !operador) return;
    if (!confirm("Confirmar que o Pix caiu na conta RecargaPay?")) return;
    try {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Demanda 199: forma própria — nunca é o Pix do Mercado Pago, é
        // sempre o Pix estático do RecargaPay (dinheiro que cai direto na
        // conta digital dele, nunca vira físico nem passa por gaveta).
        body: JSON.stringify({ vendaId: cobrancaPix.vendaId, confirmarPagamento: true, formaPagamento: "Pix RecargaPay", operador: operador.nome }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao confirmar o pagamento."); return; }
      setCobrancaPix(null);
      setFeedback({ tipo: "ok", msg: "Pagamento confirmado." });
    } catch {
      alert("Erro ao confirmar o pagamento.");
    }
  }

  // Demanda 179: venda MISTA — confirma SÓ os itens de recarga (por id; a
  // parte do MP confirma sozinha pelo poll/webhook). Mesma gravação manual
  // da 113/147, um PATCH por item de recarga.
  async function confirmarRecargaMista() {
    if (!cobrancaPix?.recarga || !operador) return;
    if (!confirm("Confirmar que o Pix da RECARGA caiu na conta RecargaPay?")) return;
    try {
      for (const pedidoId of cobrancaPix.recarga.pedidoIds) {
        const res = await fetch("/api/pedidos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          // Demanda 199: mesmo motivo do confirmarPagamentoRecarga acima.
          body: JSON.stringify({ id: pedidoId, confirmarPagamento: true, formaPagamento: "Pix RecargaPay", operador: operador.nome }),
        });
        const data = await res.json();
        if (!res.ok || data.error) { alert(data.error || "Erro ao confirmar a recarga."); return; }
      }
      setCobrancaPix(prev => (prev ? { ...prev, recarga: null } : prev));
      setFeedback({ tipo: "ok", msg: "Recarga confirmada como paga." });
    } catch {
      alert("Erro ao confirmar a recarga.");
    }
  }

  // Demanda 142: cancelar a VENDA de verdade a partir da tela de QR — o
  // "Fechar" só esconde. Reusa `cancelarPedido` (112) via PATCH por vendaId.
  // NADA é chamado no Mercado Pago: Pix não pago expira sozinho lá.
  async function cancelarVendaPix() {
    if (!cobrancaPix || !operador) return;
    if (!confirm("Cancelar esta venda? O pedido será cancelado (o QR não pago expira sozinho).")) return;
    try {
      const res = await fetch("/api/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendaId: cobrancaPix.vendaId, status: "cancelado", operador: operador.nome }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao cancelar a venda."); return; }
      setCobrancaPix(null);
      setFeedback({ tipo: "ok", msg: "Venda cancelada." });
    } catch {
      alert("Erro ao cancelar a venda.");
    }
  }
  const [entregouAgora, setEntregouAgora] = useState(true);
  // Demanda 146: "vai buscar depois" sem cliente vinculado deixava o pedido
  // aguardando retirada anônimo — impossível saber de quem é na lista. Se não
  // houver contato selecionado, o modal exige pelo menos um nome (digitar um
  // nome leva 2s, não trava a correria); telefone é opcional.
  const [retiradaNome, setRetiradaNome] = useState("");
  const [retiradaFone, setRetiradaFone] = useState("");

  // ── Resumo do dia + atalhos de mais vendidos (demanda 060) — reaproveita
  // o mesmo cálculo do dashboard (periodo=hoje), não duplica lógica. ──
  const [resumoHoje, setResumoHoje] = useState<{
    totalEntradas: number; itensVendidos: number;
    topProdutos: { nome: string; quantidade: number; valor: number }[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/produtos')
      .then(r => r.json())
      .then(d => { setProdutosDB(d.produtos || []); setCarregandoProds(false); })
      .catch(() => setCarregandoProds(false));
  }, []);

  useEffect(() => {
    fetch('/api/dashboard?periodo=hoje')
      .then(r => r.json())
      .then(d => setResumoHoje({
        totalEntradas: d.hoje?.totalEntradas ?? 0,
        itensVendidos: d.resumo?.itensVendidos ?? 0,
        topProdutos: d.topProdutos ?? [],
      }))
      .catch(() => {});
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
    return [...ordenados, { nome: 'Entrada Avulsa', produtos: [] as ProdutoAPI[] }];
  }, [produtosDB]);

  // Limpa feedback após 4s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  function abrirModal(produtoId: string) {
    const prod = produtosDB.find((p) => p.id === produtoId);
    if (!prod) return;
    setModal({ produtoId, nome: prod.nome, preco: prod.preco });
    setModalQtd("1");
    setTimeout(() => { qtdInputRef.current?.focus(); qtdInputRef.current?.select(); }, 50);
  }

  function confirmarModal() {
    if (!modal) return;
    const qtd = parseFloat(modalQtd.replace(",", "."));
    if (!qtd || qtd <= 0) return;
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produtoId === modal.produtoId);
      if (existe) return prev.map((i) => i.produtoId === modal.produtoId ? { ...i, quantidade: i.quantidade + qtd } : i);
      return [...prev, { produtoId: modal.produtoId, nome: modal.nome, preco: modal.preco, quantidade: qtd }];
    });
    setModal(null);
  }

  function removerDoCarrinho(produtoId: string) {
    setCarrinho((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  // Atalho dos mais vendidos hoje (demanda 060) — adiciona 1 unidade direto,
  // sem passar pelo modal de quantidade (o objetivo é agilizar, não navegar).
  function adicionarAoCarrinhoDireto(produtoId: string) {
    const prod = produtosDB.find((p) => p.id === produtoId);
    if (!prod) return;
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produtoId === produtoId);
      if (existe) return prev.map((i) => i.produtoId === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { produtoId, nome: prod.nome, preco: prod.preco ?? 0, quantidade: 1 }];
    });
  }

  function adicionarAvulso() {
    const v = parseFloat(avulsoValor.replace(",", "."));
    if (!v || v <= 0) return;
    setCarrinho((prev) => [
      ...prev,
      { produtoId: "avulso_" + Date.now(), nome: avulsoDesc || "Entrada diversa", preco: v, quantidade: 1 },
    ]);
    setAvulsoValor("");
    setAvulsoDesc("");
  }

  // ── Confirmar Pedido Balcão (demanda 054, ajustado na 066) — grava direto
  // em jsgrafica_pedidos, uma linha por item do carrinho. Antes da gravação,
  // pergunta forma de pagamento e se já entregou agora (066) — deixou de ser
  // sempre "entregue"/pago fixo. Todos os itens do carrinho recebem o mesmo
  // `venda_id`, gerado uma vez por confirmação, pra aparecerem agrupados na
  // aba Pedidos. Substituiu o fluxo antigo que gravava em jsgrafica_vendas —
  // essa tabela para de receber linha nova, mas o histórico continua intacto. ──
  async function confirmarVenda() {
    if (carrinho.length === 0) return;
    setLoading(true);
    setFeedback(null);
    setModalVenda(false);
    const totalSnapshot = totalCarrinho;
    const contatoSnapshot = contatoSelecionado;
    // Demanda 146: sem contato vinculado, o "vai buscar depois" usa o
    // nome/telefone digitados no modal — o pedido em aberto nunca fica
    // anônimo. Telefone digitado vira só dígitos (padrão do resto do app).
    const retiradaFoneLimpo = retiradaFone.replace(/\D/g, "");
    const telefone = contatoSelecionado?.phone
      || (!entregouAgora && retiradaFoneLimpo ? retiradaFoneLimpo : null);
    const nomeClienteVenda = contatoSnapshot?.nome
      || (!entregouAgora && retiradaNome.trim() ? retiradaNome.trim() : null);
    const vendaId = `venda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Demanda 141 (Fase 3): venda com Pix imediato deixa de nascer "paga" —
    // a cobrança real é gerada logo abaixo e a confirmação vem do pagamento
    // de verdade. Dinheiro/Cartão seguem confirmados na hora como sempre.
    const pagamentoConfirmado = formaPagamento !== "Paga na retirada" && formaPagamento !== "Pix";
    const statusEntrega = entregouAgora ? "entregue" : "aguardando_retirada";
    // Demanda 137 (Fase 1): deriva a escolha normalizada do que o modal já
    // pergunta desde a 066 — só captura, nada de lógica nova.
    const MAPA_FORMA: Record<string, "dinheiro" | "cartao" | "pix"> = { "Dinheiro": "dinheiro", "Cartão": "cartao", "Pix": "pix" };
    const formaPagamentoEscolhida = formaPagamento === "Paga na retirada"
      ? (formaRetirada ? MAPA_FORMA[formaRetirada] : undefined)
      : MAPA_FORMA[formaPagamento];
    const pagamentoMomento = formaPagamento === "Paga na retirada" ? "retirada" : "agora";
    try {
      for (const item of carrinho) {
        await fetch("/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origemBalcao: true,
            telefone,
            nomeCliente: nomeClienteVenda,
            produtoId: item.produtoId,
            servicoNome: item.nome,
            quantidade: item.quantidade,
            valorUnitario: item.preco,
            // Demanda 105: valorTotal é o preço de tabela (sem desconto),
            // valorFinal é o que realmente foi cobrado — mantém os dois
            // pra não perder a informação de que houve desconto.
            valorTotal: item.preco * item.quantidade,
            valorFinal: valorComDesconto(item),
            descontoTipo: item.descontoTipo ?? null,
            descontoValor: item.descontoTipo === "valor" ? (item.descontoValor ?? null) : null,
            descontoPct: item.descontoTipo === "pct" ? (item.descontoPct ?? null) : null,
            descontoMotivo: item.descontoMotivo ?? null,
            operador: operador.nome,
            formaPagamento,
            pagamentoConfirmado,
            statusEntrega,
            vendaId,
            // Demanda 196: pra qual gaveta física vai o dinheiro (só quando
            // quem vende não tem gaveta própria — a rota valida de novo).
            gavetaDestino: perguntarGaveta && formaPagamento === "Dinheiro" ? gavetaDestino : undefined,
            // Demanda 137 (Fase 1): escolha normalizada, só gravação.
            formaPagamentoEscolhida,
            pagamentoMomento,
            // Demanda 139 (Fase 2): derivado do statusEntrega que o modal já
            // pergunta ("Já entregou agora?", 066) — sem pergunta nova aqui.
            tipoEntregaEscolhido: statusEntrega === "aguardando_retirada" ? "retirada" : "imediata",
          }),
        });
      }
      const nomeContato = nomeClienteVenda ? ` · ${nomeClienteVenda}` : "";
      setFeedback({ tipo: "ok", msg: `✓ ${moeda(totalSnapshot)} registrado!${nomeContato}` });

      // Demanda 141 (Fase 3): Pix imediato → cobrança real + tela de QR.
      // Falha aqui NUNCA desfaz a venda (já gravada) — o modal avisa e o
      // pagamento pode ser confirmado manualmente depois (113).
      if (formaPagamento === "Pix") {
        try {
          const res = await fetch("/api/mercadopago/cobranca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vendaId, telefone }),
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || "erro");
          setCobrancaPix({
            orderId: data.orderId, qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64 ?? null,
            valor: data.valor, vendaId,
            // Demanda 147: venda 100% recarga → QR estático do RecargaPay.
            ...(data.recargaPay ? { estatico: true, chave: data.chave, titular: data.titular } : {}),
            // Demanda 179: venda mista → instrução separada da recarga.
            recarga: data.recarga ?? null,
          });
        } catch {
          setCobrancaPix({ orderId: "", qrCode: "", qrCodeBase64: null, valor: totalSnapshot, erro: true, vendaId });
        }
      }

      setCarrinho([]);
      setContatoSelecionado(null);
      setFormaPagamento("Dinheiro");
      setFormaRetirada(null);
      setGavetaDestino(null);
      setEntregouAgora(true);
      setRetiradaNome("");
      setRetiradaFone("");
      onVendaConfirmada();
    } catch {
      setFeedback({ tipo: "erro", msg: "Erro ao gravar. Verifique a conexão." });
    } finally {
      setLoading(false);
    }
  }

  const grupoObj = grupos.find((g) => g.nome === grupoAtivo);
  const produtosGrupo = grupoObj?.produtos || [];

  // Resolve os produtos mais vendidos hoje (nome) contra o catálogo (id/preço)
  // pra virar atalho clicável no carrinho vazio (demanda 060) — produtos sem
  // correspondência (ex. entrada avulsa antiga, produto desativado) são
  // ignorados em vez de quebrar.
  const atalhosTopProdutos = (resumoHoje?.topProdutos ?? [])
    .map((tp) => {
      const produto = produtosDB.find((p) => p.nome === tp.nome);
      return produto ? { produto, quantidadeHoje: tp.quantidade } : null;
    })
    .filter((x): x is { produto: ProdutoAPI; quantidadeHoje: number } => x !== null)
    .slice(0, 5);

  if (carregandoProds) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm gap-2">
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
        Carregando produtos...
      </div>
    );
  }

  return (
    <div className="flex h-full">

      {/* MODAL de quantidade */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-base mb-1">{modal.nome}</h3>
            <p className="text-gray-400 text-sm mb-5">{moeda(modal.preco)} por unidade</p>
            <label className="text-xs text-gray-500 mb-1 block">Quantidade</label>
            <input
              ref={qtdInputRef}
              type="number"
              min="1"
              value={modalQtd}
              onChange={(e) => setModalQtd(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmarModal(); if (e.key === "Escape") setModal(null); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="text-center text-sm text-gray-500 mb-5">
              Total: <strong className="text-blue-700 text-base">{moeda(modal.preco * (parseFloat(modalQtd.replace(",", ".")) || 0))}</strong>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarModal} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pagamento/entrega (demanda 066) */}
      {modalVenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalVenda(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-base mb-1">Finalizar venda</h3>
            <p className="text-gray-400 text-sm mb-5">Total: <strong className="text-blue-700">{moeda(totalCarrinho)}</strong></p>

            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(["Dinheiro", "Cartão", "Pix", "Paga na retirada"] as const).map(opcao => (
                <button key={opcao} onClick={() => setFormaPagamento(opcao)}
                  className={`text-sm font-medium rounded-lg py-2.5 px-2 border-2 transition-colors ${
                    formaPagamento === opcao ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  {opcao}
                </button>
              ))}
            </div>

            {/* Demanda 137 (Fase 1): captura QUAL forma o cliente vai usar na
                retirada — só gravação, opcional. */}
            {formaPagamento === "Paga na retirada" && (
              <div className="mb-5 -mt-2">
                <label className="text-xs text-gray-500 mb-1.5 block font-semibold">Como vai pagar na retirada? (opcional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Dinheiro", "Cartão", "Pix"] as const).map(opcao => (
                    <button key={opcao} onClick={() => setFormaRetirada(formaRetirada === opcao ? null : opcao)}
                      className={`text-sm font-medium rounded-lg py-2 px-2 border-2 transition-colors ${
                        formaRetirada === opcao ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>
                      {opcao}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Demanda 196: o Edvam não tem gaveta física própria — venda em
                Dinheiro dele precisa dizer PRA QUAL gaveta o físico vai (é a
                causa das gavetas de Zu/Gabi fecharem com sobra). Obrigatório
                só nesse caso; Zu/Gabi nunca veem isso. */}
            {perguntarGaveta && formaPagamento === "Dinheiro" && (
              <div className="mb-5 -mt-2 bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
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
                <p className="text-xs text-amber-700 mt-1.5">
                  O valor passa a contar no fechamento da gaveta escolhida.
                </p>
              </div>
            )}

            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">Já entregou agora?</label>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button onClick={() => setEntregouAgora(true)}
                className={`text-sm font-medium rounded-lg py-2.5 border-2 transition-colors ${
                  entregouAgora ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
                Sim, levou agora
              </button>
              <button onClick={() => setEntregouAgora(false)}
                className={`text-sm font-medium rounded-lg py-2.5 border-2 transition-colors ${
                  !entregouAgora ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
                Não, vai buscar depois
              </button>
            </div>

            {/* Demanda 146: "vai buscar depois" precisa de um dono — sem
                contato vinculado, exige pelo menos o nome de quem retira
                (senão o pedido em aberto fica anônimo na lista). */}
            {!entregouAgora && (
              contatoSelecionado ? (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-6 -mt-2 text-sm text-green-800">
                  👤 Retira: <strong>{contatoSelecionado.nome}</strong> · {contatoSelecionado.phone}
                </div>
              ) : (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 mb-6 -mt-2">
                  <label className="text-xs text-orange-800 mb-1.5 block font-bold">👤 Quem vai retirar? (obrigatório)</label>
                  <input type="text" value={retiradaNome} onChange={e => setRetiradaNome(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-orange-400 bg-white" />
                  <input type="text" inputMode="tel" value={retiradaFone} onChange={e => setRetiradaFone(e.target.value)}
                    placeholder="Telefone (opcional)"
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
                </div>
              )
            )}

            {/* Demanda 163: lembrete leve, NÃO-bloqueante — só no "levou
                agora" sem vínculo (o "retira depois" já captura o dono pela
                146). Buscar ou criar contato é opcional; confirmar sem
                vincular continua livre — a velocidade do caixa manda. */}
            {entregouAgora && !contatoSelecionado && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 -mt-2">
                <p className="text-xs font-bold text-blue-800 mb-1.5">💬 Esse cliente já falou com a gente no WhatsApp? (opcional)</p>
                <VincularContatoBalcao contato={contatoSelecionado} onVincular={setContatoSelecionado} />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setModalVenda(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmarVenda}
                disabled={loading || (!entregouAgora && !contatoSelecionado && !retiradaNome.trim())
                  || (perguntarGaveta && formaPagamento === "Dinheiro" && !gavetaDestino)}
                className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                {loading ? "Gravando..." : "✓ Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demanda 141 (Fase 3): tela de QR Pix do balcão. Demanda 145: o
          modal virou componente compartilhado (ModalQrPix) — mesmo
          visual/poll, agora reaproveitado também pelo Inbox. */}
      {cobrancaPix && (
        <ModalQrPix
          cobranca={cobrancaPix}
          onFechar={() => setCobrancaPix(null)}
          onCancelarVenda={cancelarVendaPix}
          onConfirmarPagamento={cobrancaPix.estatico ? confirmarPagamentoRecarga : undefined}
          onConfirmarRecarga={cobrancaPix.recarga ? confirmarRecargaMista : undefined}
        />
      )}

      {/* ÁREA CENTRAL — categorias (botões grandes) ou produtos da categoria
          escolhida, no mesmo lugar (demanda 061, substitui a lista lateral
          fina + o "Resumo de hoje" da demanda 060, que o Edvam não pediu) */}
      {/* Demanda 118: metade da tela pras categorias/produtos, metade pro
          carrinho — antes o carrinho era uma faixa fina fixa (w-72), difícil
          de ler no monitor de 15" usado no atendimento. */}
      <div className="w-1/2 overflow-y-auto p-6 bg-gray-50 flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-700">{grupoAtivo || "Escolha uma categoria"}</h2>
          {grupoAtivo && (
            <button onClick={() => setGrupoAtivo("")}
              className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100">
              ← Categorias
            </button>
          )}
        </div>

        {!grupoAtivo ? (
          <div className="grid grid-cols-4 gap-3">
            {grupos.map((g) => {
              const temNoCarrinho = g.produtos.some((p) => carrinho.find((c) => c.produtoId === p.id));
              const isAvulso = g.nome === "Entrada Avulsa";
              const avulsoNoCarrinho = carrinho.some((c) => c.produtoId.startsWith("avulso_"));
              return (
                <button
                  key={g.nome}
                  onClick={() => setGrupoAtivo(g.nome)}
                  className="relative border-2 border-gray-200 bg-white rounded-xl p-5 text-center hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95"
                >
                  <div className="text-2xl mb-2">{iconeGrupo(g.nome)}</div>
                  <div className="text-sm font-bold text-gray-700">{g.nome}</div>
                  {(temNoCarrinho || (isAvulso && avulsoNoCarrinho)) && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        ) : grupoAtivo === "Entrada Avulsa" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-md w-full">
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Serviço especial"
                    value={avulsoDesc}
                    onChange={(e) => setAvulsoDesc(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={avulsoValor}
                    onChange={(e) => setAvulsoValor(sanitizarValorMonetario(e.target.value))}
                    onKeyDown={(e) => { if (e.key === "Enter") adicionarAvulso(); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={adicionarAvulso}
                  className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-bold text-sm hover:bg-blue-700"
                >
                  + Adicionar ao carrinho
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Chips — trocar de categoria sem sair do centro (demanda 061) */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-gray-200 flex-shrink-0">
              {grupos.map((g) => (
                <button
                  key={g.nome}
                  onClick={() => setGrupoAtivo(g.nome)}
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    grupoAtivo === g.nome ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {g.nome}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {produtosGrupo.map((prod) => {
                const noCarrinho = carrinho.find((i) => i.produtoId === prod.id);
                return (
                  <button
                    key={prod.id}
                    onClick={() => abrirModal(prod.id)}
                    className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-md active:scale-95 ${
                      noCarrinho ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="font-semibold text-gray-800 text-sm leading-snug mb-1">{prod.nome}</div>
                    <div className="text-gray-400 text-xs">{moeda(prod.preco)}</div>
                    {noCarrinho && (
                      <div className="mt-2 text-xs text-blue-600 font-bold">
                        {noCarrinho.quantidade} un · {moeda(noCarrinho.preco * noCarrinho.quantidade)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* DIREITA — Carrinho */}
      <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Carrinho</h2>
          <p className="text-xs text-gray-400">{carrinho.length} {carrinho.length === 1 ? "item" : "itens"}</p>
        </div>

        {/* Vincular contato — demanda 163: virou componente compartilhado
            (busca + "+ Criar novo contato" quando não acha ninguém).
            Demanda 174: ganhou um cartão destacado com cabeçalho próprio —
            era um campo cinza discreto que passava batido; agora é o 1º
            bloco visível do fluxo da venda, ANTES dos itens. Continua 100%
            opcional: pular e ir direto pros produtos não muda em nada. */}
        <div className="px-3 py-2.5 border-b border-gray-100 relative">
          <div className={`rounded-xl border-2 p-2.5 ${contatoSelecionado ? "bg-green-50 border-green-300" : "bg-blue-50 border-blue-300"}`}>
            <p className={`text-xs font-bold mb-1.5 ${contatoSelecionado ? "text-green-800" : "text-blue-800"}`}>
              {contatoSelecionado ? "👤 Cliente vinculado à venda" : "👤 Quem é o cliente? (opcional)"}
            </p>
            <VincularContatoBalcao contato={contatoSelecionado} onVincular={setContatoSelecionado} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {carrinho.length === 0 && (
            <div className="text-center text-gray-300 text-sm mt-4">
              <div className="text-4xl mb-2">🛒</div>
              Clique em um produto para adicionar
              {/* Demanda 174: nudge pra vincular ANTES de montar o carrinho
                  — só um lembrete, nunca um passo obrigatório. */}
              {!contatoSelecionado && (
                <p className="text-xs text-blue-500 mt-2">
                  👆 Sabe quem é o cliente? Vincule ali em cima antes de começar.
                </p>
              )}
              {atalhosTopProdutos.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-xs text-gray-400 mb-1.5 text-center">Mais vendidos hoje</p>
                  <div className="space-y-1.5">
                    {atalhosTopProdutos.map(({ produto, quantidadeHoje }) => (
                      <button key={produto.id} onClick={() => adicionarAoCarrinhoDireto(produto.id)}
                        className="w-full text-left bg-white border-2 border-gray-200 hover:border-blue-300 rounded-lg px-3 py-2 transition-colors">
                        <div className="text-xs font-semibold text-gray-800">{produto.nome}</div>
                        <div className="text-xs text-gray-400">{moeda(produto.preco)} · {quantidadeHoje}× hoje</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {carrinho.map((item) => {
            const bruto = item.preco * item.quantidade;
            const final = valorComDesconto(item);
            const temDesconto = final < bruto;
            return (
              <div key={item.produtoId} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 leading-snug">{item.nome}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.quantidade} × {moeda(item.preco)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {temDesconto ? (
                      <>
                        <div className="text-xs text-gray-400 line-through">{moeda(bruto)}</div>
                        <div className="text-xs font-bold text-green-700">{moeda(final)}</div>
                      </>
                    ) : (
                      <div className="text-xs font-bold text-gray-800">{moeda(bruto)}</div>
                    )}
                    <button onClick={() => removerDoCarrinho(item.produtoId)} className="text-xs text-red-400 hover:text-red-600 mt-0.5">
                      remover
                    </button>
                  </div>
                </div>

                {/* Desconto pontual (demanda 105) — discreto, fechado por
                    padrão, não atrapalha quem não quer usar. */}
                <button onClick={() => setDescontoAberto(descontoAberto === item.produtoId ? null : item.produtoId)}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1">
                  {temDesconto ? "🏷️ Desconto aplicado — editar" : "🏷️ Aplicar desconto"}
                </button>

                {descontoAberto === item.produtoId && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-1.5" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => definirDescontoTipo(item.produtoId, "valor")}
                        className={`flex-1 text-xs font-semibold rounded-lg py-1.5 border ${(item.descontoTipo ?? "valor") === "valor" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                        R$
                      </button>
                      <button onClick={() => definirDescontoTipo(item.produtoId, "pct")}
                        className={`flex-1 text-xs font-semibold rounded-lg py-1.5 border ${item.descontoTipo === "pct" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}>
                        %
                      </button>
                    </div>
                    <input type="number" placeholder={item.descontoTipo === "pct" ? "% de desconto" : "R$ de desconto"}
                      value={item.descontoTipo === "pct" ? (item.descontoPct ?? "") : (item.descontoValor ?? "")}
                      onChange={e => definirDescontoNumero(item.produtoId, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    <input type="text" placeholder="Motivo (opcional)" value={item.descontoMotivo ?? ""}
                      onChange={e => definirDescontoMotivo(item.produtoId, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                    <div className="flex gap-1.5">
                      {temDesconto && (
                        <button onClick={() => removerDesconto(item.produtoId)}
                          className="flex-1 text-xs text-red-500 border border-red-200 rounded-lg py-1.5 hover:bg-red-50">
                          Remover
                        </button>
                      )}
                      <button onClick={() => setDescontoAberto(null)}
                        className="flex-1 text-xs bg-gray-700 text-white rounded-lg py-1.5 hover:bg-gray-800">
                        Ok
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {feedback && (
          <div className={`mx-3 mb-2 p-2.5 rounded-lg text-xs font-medium ${feedback.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {feedback.msg}
          </div>
        )}

        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-xl font-bold text-blue-700">{moeda(totalCarrinho)}</span>
          </div>
          <button
            onClick={() => setModalVenda(true)}
            disabled={loading || carrinho.length === 0}
            className="w-full bg-green-600 text-white rounded-lg py-3 font-bold text-sm hover:bg-green-700 active:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Gravando..." : "✓ Confirmar Venda"}
          </button>
          {carrinho.length > 0 && (
            <button onClick={() => setCarrinho([])} className="w-full mt-2 text-xs text-gray-400 hover:text-red-500 py-1">
              Limpar carrinho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SAÍDAS
// ─────────────────────────────────────────────────────────────
interface CategoriaSaidaAdmin { id: string; nome: string; ativo: boolean }

function TelaSaidas({ operador, onAbrirContasPagarReceber }: { operador: Usuario; onAbrirContasPagarReceber?: () => void }) {
  const isAdmin = operador.papel === "admin";
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  // Demanda 130: `id` + campos completos — a linha do card virou alvo de
  // Editar/Cancelar, não é mais só exibição.
  const [historico, setHistorico] = useState<{
    id: string; categoriaId: string; categoria: string; valor: number;
    descricao: string | null; dataDia: string; hora: string; operador: string;
    editadoEm: string | null;
    // Demanda 200: de qual conta o dinheiro saiu de verdade, quando
    // diferente da gaveta de quem vendeu (null = mesma gaveta, caso comum).
    contaOrigem: string | null;
  }[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  // Demanda 200: correção auditável de conta_origem — modal próprio,
  // separado do "Editar lançamento" (130), que não audita mudanças.
  const [corrigindoConta, setCorrigindoConta] = useState<null | { id: string; contaAtual: string | null; novaConta: string }>(null);
  const [salvandoConta, setSalvandoConta] = useState(false);

  // Demanda 201 — "🔁 Transferir entre contas": ação Admin-only separada de
  // "Adicionar saída" (não é uma categoria de despesa, é dinheiro mudando de
  // carteira). Gera 1 saída (categoria própria, `conta_origem`) + 1 linha em
  // jsgrafica_transferencias que registra os 2 lados — nunca existe um sem o
  // outro (mesma escrita no backend).
  const [transferindoAberto, setTransferindoAberto] = useState(false);
  const [transfOrigem, setTransfOrigem]   = useState("");
  const [transfDestino, setTransfDestino] = useState("");
  const [transfValor, setTransfValor]     = useState("");
  const [transfDescricao, setTransfDescricao] = useState("");
  // `hojeISO` só é declarado mais abaixo (usado pelo filtro de data dos
  // lançamentos) — inicialização inline aqui pra não depender da ordem de
  // declaração dentro do componente (useState roda na 1ª renderização).
  const [transfData, setTransfData] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [salvandoTransf, setSalvandoTransf] = useState(false);
  const [transferenciasHoje, setTransferenciasHoje] = useState<{
    id: string; conta_origem: string; conta_destino: string; valor: number;
    descricao: string | null; operador: string; created_at: string;
  }[]>([]);
  // Demanda 233: seletor de data pra ver/cancelar transferências de qualquer
  // dia — antes só mostrava hoje, sem jeito de achar uma transferência de
  // dia passado que travasse o cancelamento da saída-par (mesmo padrão já
  // usado em "Lançamentos" de Saídas, estado próprio pra não reordenar hooks
  // existentes no componente).
  const hojeISOTransf = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [transfFiltroData, setTransfFiltroData] = useState(hojeISOTransf);
  const transfEhHoje = transfFiltroData === hojeISOTransf();

  // Demanda 218: a tela "Pendências entre contas" (201) saiu do ar — a
  // premissa não batia com a operação real (dinheiro físico nunca "precisa"
  // virar saldo digital vinculado a uma venda específica; reabastecer conta
  // digital é sempre evento isolado e periódico; movimentações grandes entre
  // contas acontecem fora do sistema, direto no banco/app, sem nenhum
  // reflexo aqui). A Transferência entre Contas em si continua funcionando
  // normal — só o painel de alerta que monitorava "pendência" que saiu.
  const carregarTransferencias = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [ano, mes, dia] = transfFiltroData.split("-");
      const r = await fetch(`/api/transferencias?data=${dia}-${mes}-${ano.slice(-2)}`);
      const d = await r.json();
      setTransferenciasHoje(d.transferencias || []);
    } catch { /* silencioso */ }
  }, [isAdmin, transfFiltroData]);
  useEffect(() => { carregarTransferencias(); }, [carregarTransferencias]);
  useRecarregarAoReativar(() => { carregarTransferencias(); });

  // Demanda 233: cancela os 2 lados juntos via `DELETE /api/transferencias`
  // (mecanismo já existia desde a 201, só nunca tinha botão nenhum na tela).
  async function cancelarTransferencia(id: string) {
    if (!confirm("Cancelar esta transferência? Os 2 lados (a saída de origem e o registro da transferência) são removidos juntos.")) return;
    try {
      const res = await fetch("/api/transferencias", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao cancelar transferência."); return; }
      await carregarTransferencias();
      await carregarHistorico(); // a saída-par também some da lista de lançamentos
    } catch {
      alert("Erro ao cancelar transferência.");
    }
  }

  async function salvarTransferencia() {
    if (!transfOrigem || !transfDestino || salvandoTransf) return;
    const v = parseFloat(transfValor.replace(",", "."));
    if (!v || v <= 0) { alert("Informe um valor válido."); return; }
    const [ano, mes, diaN] = transfData.split("-");
    setSalvandoTransf(true);
    try {
      const res = await fetch("/api/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contaOrigem: transfOrigem,
          contaDestino: transfDestino,
          valor: v,
          descricao: transfDescricao || null,
          dataDia: `${diaN}-${mes}-${ano.slice(-2)}`,
          operador: operador.nome,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao lançar transferência."); return; }
      setTransferindoAberto(false);
      setTransfOrigem(""); setTransfDestino(""); setTransfValor(""); setTransfDescricao(""); setTransfData(hojeISO());
      await Promise.all([carregarHistorico(), carregarTransferencias()]);
    } catch {
      alert("Erro ao lançar transferência.");
    } finally {
      setSalvandoTransf(false);
    }
  }

  async function salvarCorrecaoConta() {
    if (!corrigindoConta || salvandoConta) return;
    setSalvandoConta(true);
    try {
      const res = await fetch("/api/saidas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: corrigindoConta.id,
          corrigirContaOrigem: true,
          contaOrigem: corrigindoConta.novaConta || null,
          operador: operador.nome,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao corrigir conta de origem."); return; }
      setCorrigindoConta(null);
      await carregarHistorico();
    } catch {
      alert("Erro ao corrigir conta de origem.");
    } finally {
      setSalvandoConta(false);
    }
  }

  // Demanda 123 (substitui o card-resumo da 097, que virou redundante depois
  // desta lista completa existir): "Saídas previstas" — todas as contas a
  // pagar pendentes/atrasadas, sem limite de 7 dias, ordenadas por
  // vencimento. Reaproveita o GET de Contas a Pagar/Receber (095/096) sem
  // parâmetro nenhum — mesma fonte que a própria tela de Contas a Pagar/
  // Receber usa, filtra só `tipo: 'pagar'` e não-pago aqui no cliente, sem
  // duplicar lógica de busca no servidor. Só Admin vê (PDV não acessa
  // Contas a Pagar/Receber, ver 096).
  const [previstas, setPrevistas] = useState<ContaPrevista[]>([]);
  const [carregandoPrevistas, setCarregandoPrevistas] = useState(true);
  // Demanda 136: a aba não desmonta mais ao trocar — o tick força previstas
  // e lançamentos a recarregarem quando a aba volta a ficar visível (o hook
  // useRecarregarAoReativar é chamado mais abaixo, junto do carregarHistorico).
  const [tickReativa, setTickReativa] = useState(0);
  useEffect(() => {
    if (!isAdmin) { setCarregandoPrevistas(false); return; }
    fetch("/api/contas-pagar-receber")
      .then(r => r.json())
      .then(d => setPrevistas((d.contas || []).filter((c: ContaPrevista) => c.tipo === "pagar" && c.status !== "pago")))
      .catch(() => {})
      .finally(() => setCarregandoPrevistas(false));
  }, [isAdmin, tickReativa]);

  // Demanda 123: escolher categoria vira um botão que abre esta coluna, em
  // vez da grade grande ocupar a área principal antes de qualquer escolha.
  const [adicionarAberto, setAdicionarAberto] = useState(false);

  // Demanda 130: editar/cancelar um lançamento já feito — antes só existia
  // criar, e toda correção exigia mexer direto no banco (3x nesta semana).
  const [editandoSaida, setEditandoSaida] = useState<null | {
    id: string; valor: string; categoriaId: string; descricao: string; dataDia: string;
  }>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  async function salvarEdicaoSaida() {
    if (!editandoSaida || salvandoEdicao) return;
    const v = parseFloat(editandoSaida.valor.replace(",", "."));
    if (!v || v <= 0) { alert("Informe um valor válido."); return; }
    if (!/^\d{2}-\d{2}-\d{2}$/.test(editandoSaida.dataDia)) { alert("Data inválida — use o formato DD-MM-AA."); return; }
    setSalvandoEdicao(true);
    try {
      const res = await fetch("/api/saidas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editandoSaida.id,
          valor: v,
          categoriaId: editandoSaida.categoriaId,
          descricao: editandoSaida.descricao,
          dataDia: editandoSaida.dataDia,
          operador: operador.nome,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao salvar edição."); return; }
      setEditandoSaida(null);
      await carregarHistorico();
    } catch {
      alert("Erro ao salvar edição.");
    } finally { setSalvandoEdicao(false); }
  }

  async function cancelarSaida(id: string) {
    if (!confirm("Cancelar este lançamento? A saída será removida do dia (o pedido vinculado, se houver, fica intacto).")) return;
    try {
      const res = await fetch("/api/saidas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "Erro ao cancelar lançamento."); return; }
      await carregarHistorico();
    } catch {
      alert("Erro ao cancelar lançamento.");
    }
  }

  // Demanda 129: seletor de data — ver lançamentos de qualquer dia, não só
  // hoje. `<input type="date">` (yyyy-mm-dd), convertido pro DD-MM-AA do
  // caixa na chamada. Padrão ao abrir continua sendo hoje.
  const hojeISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const [dataFiltro, setDataFiltro] = useState(hojeISO());
  const ehHoje = dataFiltro === hojeISO();

  // Demanda 091: histórico vinha só do estado local (acumulava na sessão,
  // sumia ao recarregar a página ou pra quem abrisse a tela sem ter lançado
  // nada ali) — agora busca de verdade as saídas do dia.
  const carregarHistorico = useCallback(async () => {
    setCarregandoHistorico(true);
    try {
      const [ano, mes, dia] = dataFiltro.split("-");
      const r = await fetch(`/api/saidas?data=${dia}-${mes}-${ano.slice(-2)}`);
      const d = await r.json();
      const saidas: {
        id: string; categoria_id: string; categoria_nome: string; valor: number;
        operador: string; descricao: string | null; data_dia: string; created_at: string;
        editado_em: string | null; conta_origem: string | null;
      }[] = d.saidas || [];
      setHistorico(saidas.map(s => ({
        id: s.id,
        categoriaId: s.categoria_id,
        categoria: s.categoria_nome,
        valor: Number(s.valor),
        descricao: s.descricao,
        dataDia: s.data_dia,
        operador: s.operador,
        hora: new Date(s.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        editadoEm: s.editado_em,
        contaOrigem: s.conta_origem,
      })));
    } catch { /* silencioso */ }
    finally { setCarregandoHistorico(false); }
  }, [dataFiltro]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);
  // Demanda 136: recarrega lançamentos (e previstas, via tick declarado
  // junto delas) quando a aba volta a ficar visível.
  useRecarregarAoReativar(() => { carregarHistorico(); setTickReativa(t => t + 1); });

  // ── Recarga VEM — quantidade + valor da carga, taxa calculada (demanda 052) ──
  const [recargaQtd, setRecargaQtd]     = useState("1");
  const [recargaCarga, setRecargaCarga] = useState("");
  const ehRecargaVem = categoriaAtiva === "recarga_vem";
  const recargaQtdNum   = parseFloat(recargaQtd.replace(",", "."));
  const recargaCargaNum = parseFloat(recargaCarga.replace(",", "."));
  const recargaValorSaida = (recargaQtdNum > 0 && recargaCargaNum > 0)
    ? Math.round((recargaCargaNum - TAXA_RECARGA_VEM) * recargaQtdNum * 100) / 100
    : null;

  // ── Categorias (demanda 050 — vêm do banco, não mais hardcoded) ──
  const [categoriasTodas, setCategoriasTodas]   = useState<CategoriaSaidaAdmin[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [gerenciarAberto, setGerenciarAberto]   = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null);
  const [editCategoriaNome, setEditCategoriaNome] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

  const carregarCategorias = useCallback(async () => {
    setCarregandoCategorias(true);
    try {
      const r = await fetch("/api/categorias-saida?all=true");
      const d = await r.json();
      setCategoriasTodas(d.categorias || []);
    } catch { /* silencioso */ }
    finally { setCarregandoCategorias(false); }
  }, []);

  useEffect(() => { carregarCategorias(); }, [carregarCategorias]);

  const categoriasAtivas = categoriasTodas.filter(c => c.ativo);

  async function criarCategoria() {
    if (!novaCategoriaNome.trim() || salvandoCategoria) return;
    setSalvandoCategoria(true);
    try {
      await fetch("/api/categorias-saida", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novaCategoriaNome.trim() }),
      });
      setNovaCategoriaNome("");
      await carregarCategorias();
    } catch { /* silencioso */ }
    finally { setSalvandoCategoria(false); }
  }

  function iniciarEdicaoCategoria(c: CategoriaSaidaAdmin) {
    setEditandoCategoria(c.id);
    setEditCategoriaNome(c.nome);
  }

  async function salvarEdicaoCategoria() {
    if (!editandoCategoria || !editCategoriaNome.trim()) return;
    setSalvandoCategoria(true);
    try {
      await fetch("/api/categorias-saida", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editandoCategoria, nome: editCategoriaNome.trim() }),
      });
      setEditandoCategoria(null);
      await carregarCategorias();
    } catch { /* silencioso */ }
    finally { setSalvandoCategoria(false); }
  }

  async function toggleAtivoCategoria(id: string, ativo: boolean) {
    setCategoriasTodas(prev => prev.map(c => c.id === id ? { ...c, ativo } : c));
    if (categoriaAtiva === id && !ativo) setCategoriaAtiva(null);
    await fetch("/api/categorias-saida", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ativo }),
    });
  }

  // Demanda 207 (CORRIGIDA pela 210 — achado urgente do Edvam): a 207 tinha
  // concluído, sem confirmar com o PM, que "toda saída manual é dinheiro
  // físico" — errado: o formulário não tem campo de forma de pagamento
  // porque nunca precisou, mas a saída pode MUITO bem ter saído de uma conta
  // digital (Mercado Pago, Stone, Caixa Econômica, RecargaPay), não só da
  // gaveta física de Zu/Gabi. A 210 troca o seletor binário Zu/Gabi pelas 6
  // contas reais (`CONTAS_ORIGEM`, mesma lista da 200/201 — não inventa uma
  // terceira). Continua obrigatório pro Admin (sem conta "padrão" própria).
  const [contaSaida, setContaSaida] = useState<string | null>(null);
  const precisaContaSaida = isAdmin;
  const CONTA_SAIDA_EH_GAVETA: Record<string, "Zu" | "Gabi"> = { dinheiro_zu: "Zu", dinheiro_gabi: "Gabi" };

  async function lancarSaida() {
    if (!categoriaAtiva) return;
    if (precisaContaSaida && !contaSaida) return;

    // Gaveta física (Dinheiro Zu/Gabi): `operador` vira o nome de quem tem a
    // gaveta, `conta_origem` fica null (dinheiro saiu da PRÓPRIA gaveta
    // escolhida, não é um caso de conta divergente da 200). Conta digital:
    // `operador` continua sendo quem lançou (Edvam — não mexe na gaveta
    // física de ninguém, correto), `conta_origem` grava a conta escolhida.
    const gavetaEscolhida = contaSaida ? CONTA_SAIDA_EH_GAVETA[contaSaida] : undefined;
    const body: Record<string, unknown> = {
      categoriaId: categoriaAtiva, descricao,
      operador: precisaContaSaida && gavetaEscolhida ? gavetaEscolhida : operador.nome,
      contaOrigem: precisaContaSaida && contaSaida && !gavetaEscolhida ? contaSaida : undefined,
    };

    if (ehRecargaVem) {
      if (!recargaQtdNum || recargaQtdNum <= 0 || !recargaCargaNum || recargaCargaNum <= 0 || recargaValorSaida === null) return;
      body.quantidade = recargaQtdNum;
      body.valorCarga = recargaCargaNum;
    } else {
      const v = parseFloat(valor.replace(",", "."));
      if (!v || v <= 0) return;
      body.valor = v;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/saidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao registrar saída");
      await carregarHistorico();
      setValor("");
      setDescricao("");
      setRecargaQtd("1");
      setRecargaCarga("");
      setCategoriaAtiva(null);
      setContaSaida(null);
    } catch {
      alert("Erro ao gravar saída.");
    } finally {
      setLoading(false);
    }
  }

  const totalPrevisto = previstas.reduce((acc, c) => acc + Number(c.valor), 0);

  // Demanda 193: contas previstas agrupadas por urgência de vencimento —
  // a lista única com um total só ("R$6.481 pendentes") misturava atrasado
  // com mês que vem. `vencimento` vem ISO (AAAA-MM-DD), comparável por texto.
  const hojeISOPrev = new Date().toISOString().slice(0, 10);
  const em7ISOPrev = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const blocosPrevistas: { titulo: string; cor: string; contas: ContaPrevista[] }[] = [
    { titulo: "Atrasadas",       cor: "text-red-700",   contas: previstas.filter(c => c.vencimento < hojeISOPrev) },
    { titulo: "Vencem hoje",     cor: "text-amber-700", contas: previstas.filter(c => c.vencimento === hojeISOPrev) },
    { titulo: "Próximos 7 dias", cor: "text-gray-700",  contas: previstas.filter(c => c.vencimento > hojeISOPrev && c.vencimento <= em7ISOPrev) },
    { titulo: "Mais adiante",    cor: "text-gray-500",  contas: previstas.filter(c => c.vencimento > em7ISOPrev) },
  ];
  const totalDiaSaidas = historico.reduce((acc, h) => acc + h.valor, 0);

  return (
    <div className="flex h-full gap-0">
      {/* Demanda 123: escolher categoria virou botão + coluna à esquerda,
          em vez da grade grande ocupar a área principal antes de qualquer
          escolha — "Saídas previstas"/"Lançamentos" é que importa pra
          decisão do dia, viram o conteúdo principal. */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-sm">Adicionar saída</h2>
          {adicionarAberto && (
            <button onClick={() => setGerenciarAberto(true)} title="Gerenciar categorias"
              className="text-xs text-gray-400 hover:text-gray-600">⚙️</button>
          )}
        </div>
        <div className="p-3">
          {!adicionarAberto ? (
            <>
              <button onClick={() => setAdicionarAberto(true)}
                className="w-full bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700">
                + Adicionar saída
              </button>
              {/* Demanda 201: dinheiro mudando de carteira (não é despesa) —
                  ação separada, Admin-only (isAdmin aqui é sempre true, só
                  Edvam acessa esta tela, mas o gate fica explícito mesmo
                  assim, mesmo critério de outras telas financeiras). */}
              {isAdmin && (
                <button onClick={() => setTransferindoAberto(true)}
                  className="w-full mt-2 border-2 border-indigo-200 text-indigo-700 rounded-lg py-2.5 text-sm font-bold hover:bg-indigo-50">
                  🔁 Transferir entre contas
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => { setAdicionarAberto(false); setCategoriaAtiva(null); setContaSaida(null); }}
                className="text-xs text-gray-500 hover:text-gray-700 mb-3">
                ← Fechar
              </button>
              {carregandoCategorias ? (
                <p className="text-sm text-gray-400">Carregando categorias...</p>
              ) : (
                <div className="space-y-1.5">
                  {categoriasAtivas.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoriaAtiva(cat.id === categoriaAtiva ? null : cat.id); setContaSaida(null); }}
                      className={`w-full text-left rounded-lg px-3 py-2 font-semibold text-sm border-2 transition-all ${
                        categoriaAtiva === cat.id
                          ? "bg-red-600 text-white border-red-600 shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-red-300"
                      }`}
                    >
                      {cat.nome}
                    </button>
                  ))}
                  {categoriasAtivas.length === 0 && (
                    <p className="text-sm text-gray-400">Nenhuma categoria ativa — crie uma em &ldquo;⚙️&rdquo;.</p>
                  )}
                </div>
              )}

              {categoriaAtiva && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="font-bold text-gray-700 text-sm mb-3">
                    {categoriasAtivas.find((c) => c.id === categoriaAtiva)?.nome}
                  </h3>

                  {/* Demanda 210 (corrige a 207): de qual das 6 contas reais
                      o dinheiro saiu — não só as 2 gavetas físicas. Mesma
                      lista `CONTAS_ORIGEM` da 200/201, não uma terceira. */}
                  {precisaContaSaida && (
                    <div className="mb-4 bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
                      <label className="text-xs text-amber-800 mb-1.5 block font-bold">
                        💵 De qual conta esse dinheiro saiu de verdade? (obrigatório — você não tem conta própria)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CONTAS_ORIGEM.map(c => (
                          <button key={c.id} onClick={() => setContaSaida(c.id)}
                            className={`text-sm font-medium rounded-lg py-2 px-2 border-2 transition-colors ${
                              contaSaida === c.id ? "border-amber-500 bg-amber-100 text-amber-800" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                            }`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ehRecargaVem ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">
                        Recarga VEM tem taxa fixa de {moeda(TAXA_RECARGA_VEM)} por recarga — o valor de
                        saída já sai descontado automaticamente.
                      </p>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Quantidade de recargas</label>
                        <input
                          type="number" min="1" step="1"
                          value={recargaQtd}
                          onChange={(e) => setRecargaQtd(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Valor da carga (por recarga)</label>
                        <input
                          type="number" step="0.01" placeholder="R$ 20,00"
                          value={recargaCarga}
                          onChange={(e) => setRecargaCarga(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") lancarSaida(); }}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
                        <input
                          type="text"
                          value={descricao}
                          onChange={(e) => setDescricao(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2.5">
                        <span className="text-xs text-gray-600">Valor de saída calculado</span>
                        <span className="text-sm font-bold text-red-700">
                          {recargaValorSaida !== null ? moeda(recargaValorSaida) : "—"}
                        </span>
                      </div>
                      <button
                        onClick={lancarSaida}
                        disabled={loading || recargaValorSaida === null || (precisaContaSaida && !contaSaida)}
                        className="w-full bg-red-600 text-white rounded-lg px-6 py-2.5 font-bold text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {loading ? "..." : "Lançar"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Descrição (opcional)"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                      />
                      <input
                        type="number"
                        placeholder="R$ 0,00"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") lancarSaida(); }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                      />
                      <button
                        onClick={lancarSaida}
                        disabled={loading || (precisaContaSaida && !contaSaida)}
                        className="w-full bg-red-600 text-white rounded-lg px-6 py-2.5 font-bold text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {loading ? "..." : "Lançar"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal: gerenciar categorias (demanda 050) — mesmo padrão da aba Produtos:
            tabela editável inline + toggle ativo/inativo, nada de UI nova. */}
        {gerenciarAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setGerenciarAberto(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-[30rem] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-800 mb-4">Gerenciar categorias de saída</h3>

              <div className="flex gap-2 mb-4">
                <input type="text" value={novaCategoriaNome} onChange={e => setNovaCategoriaNome(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") criarCategoria(); }}
                  placeholder="Nome da nova categoria"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400" />
                <button onClick={criarCategoria} disabled={salvandoCategoria || !novaCategoriaNome.trim()}
                  className="bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                  + Adicionar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {categoriasTodas.map(c => (
                      <tr key={c.id} className={!c.ativo ? "opacity-40" : ""}>
                        <td className="px-3 py-2">
                          {editandoCategoria === c.id ? (
                            <input type="text" value={editCategoriaNome} autoFocus
                              onChange={e => setEditCategoriaNome(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") salvarEdicaoCategoria(); if (e.key === "Escape") setEditandoCategoria(null); }}
                              className="w-full border border-red-300 rounded px-2 py-1 text-sm focus:outline-none" />
                          ) : (
                            <span className="text-gray-800">{c.nome}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center w-16">
                          <button onClick={() => toggleAtivoCategoria(c.id, !c.ativo)}
                            title={c.ativo ? "Clique para desativar" : "Clique para ativar"}
                            className={`w-10 h-5 rounded-full relative transition-colors ${c.ativo ? "bg-green-500" : "bg-gray-300"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.ativo ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </td>
                        <td className="px-2 py-2 w-24 text-right">
                          {editandoCategoria === c.id ? (
                            <div className="flex gap-1 justify-end">
                              <button onClick={salvarEdicaoCategoria} disabled={salvandoCategoria}
                                className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 disabled:opacity-50">
                                {salvandoCategoria ? "..." : "Salvar"}
                              </button>
                              <button onClick={() => setEditandoCategoria(null)}
                                className="text-xs border border-gray-200 text-gray-500 rounded px-2 py-1 hover:bg-gray-50">
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => iniciarEdicaoCategoria(c)}
                              className="text-xs text-red-600 hover:text-red-800 border border-red-200 rounded px-2 py-1 hover:bg-red-50">
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setGerenciarAberto(false)} className="mt-4 w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-500 hover:bg-gray-50">
                Fechar
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Área principal — o que importa pra decisão do dia (demanda 123):
          saídas previstas (contas a pagar pendentes) + o que já foi lançado
          hoje. Lançar uma saída nova virou ação secundária (coluna
          esquerda), não mais o conteúdo principal. */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-700">Saídas</h2>

        {/* Lançamentos (demanda 091, fonte `GET /api/saidas`) — demanda 129:
            subiu pro topo (é o que se usa mais no dia a dia, não as contas
            previstas) e ganhou seletor de data pra ver qualquer dia; o padrão
            ao abrir continua sendo hoje. */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-bold text-gray-700">Lançamentos</h3>
            <div className="flex items-center gap-2">
              {!ehHoje && (
                <button onClick={() => setDataFiltro(hojeISO())}
                  className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50">
                  Hoje
                </button>
              )}
              <input type="date" value={dataFiltro} max={hojeISO()}
                onChange={e => { if (e.target.value) setDataFiltro(e.target.value); }}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-red-400" />
            </div>
          </div>
          {carregandoHistorico ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-gray-400">
              {ehHoje ? "Nenhuma saída lançada ainda hoje." : "Nenhuma saída lançada nesse dia."}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {historico.map((h) => (
                <div key={h.id} className="bg-red-50 rounded-lg p-2.5">
                  <div className="text-xs font-medium text-gray-700">
                    {h.categoria}
                    {/* Demanda 130: rastro visível de que a linha foi alterada
                        depois do lançamento original. */}
                    {h.editadoEm && <span className="ml-1 text-[10px] text-amber-600" title={`Editada em ${new Date(h.editadoEm).toLocaleString("pt-BR")}`}>✎ editada</span>}
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs text-red-600 font-bold">{moeda(h.valor)}</span>
                    <span className="text-xs text-gray-400">{h.hora}</span>
                  </div>
                  {/* Demanda 200: quando o dinheiro saiu de uma conta diferente
                      da gaveta de quem vendeu (ex. repasse de recarga pago com
                      saldo do Mercado Pago), fica visível aqui — sem isso, a
                      única forma de saber era investigar manualmente. */}
                  {h.contaOrigem && (
                    <div className="mt-0.5">
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                        🏦 Saiu de: {CONTAS_ORIGEM.find(c => c.id === h.contaOrigem)?.label ?? h.contaOrigem}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs text-gray-400">{h.operador}</span>
                    {/* Demanda 130: editar/cancelar direto pela tela — antes
                        toda correção era na mão, direto no banco. Demanda 200:
                        "Conta" (Admin-only) corrige de onde o dinheiro saiu de
                        verdade, com histórico auditável — ação separada do
                        "Editar" (que não audita). */}
                    <span className="flex gap-1.5">
                      {isAdmin && (
                        <button onClick={() => setCorrigindoConta({ id: h.id, contaAtual: h.contaOrigem, novaConta: h.contaOrigem ?? "" })}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-50">
                          Conta
                        </button>
                      )}
                      <button onClick={() => setEditandoSaida({
                          id: h.id, valor: String(h.valor), categoriaId: h.categoriaId,
                          descricao: h.descricao ?? "", dataDia: h.dataDia,
                        })}
                        className="text-[10px] text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-1.5 py-0.5 hover:bg-blue-50">
                        Editar
                      </button>
                      <button onClick={() => cancelarSaida(h.id)}
                        className="text-[10px] text-red-500 hover:text-red-700 border border-red-200 rounded px-1.5 py-0.5 hover:bg-red-100">
                        Cancelar
                      </button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

            {/* Demanda 130: modal de edição de lançamento. */}
            {editandoSaida && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditandoSaida(null)}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-gray-800 mb-4">Editar lançamento</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                      <select value={editandoSaida.categoriaId}
                        onChange={e => setEditandoSaida({ ...editandoSaida, categoriaId: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400">
                        {categoriasAtivas.map(c => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Valor</label>
                      <input type="number" value={editandoSaida.valor}
                        onChange={e => setEditandoSaida({ ...editandoSaida, valor: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
                      <input type="text" value={editandoSaida.descricao}
                        onChange={e => setEditandoSaida({ ...editandoSaida, descricao: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Data do caixa (DD-MM-AA)</label>
                      <input type="text" value={editandoSaida.dataDia} placeholder="09-07-26"
                        onChange={e => setEditandoSaida({ ...editandoSaida, dataDia: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400" />
                      <p className="text-xs text-gray-400 mt-1">Mudar a data move o lançamento pro caixa daquele dia.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setEditandoSaida(null)}
                      className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={salvarEdicaoSaida} disabled={salvandoEdicao}
                      className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                      {salvandoEdicao ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Demanda 200: modal de correção AUDITÁVEL de conta_origem —
                Admin-only, separado do "Editar lançamento" acima (que não
                grava histórico). Toda mudança fica em conta_origem_historico. */}
            {corrigindoConta && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCorrigindoConta(null)}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-gray-800 mb-2">De qual conta esse dinheiro saiu de verdade?</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Só preencha quando o dinheiro NÃO saiu da gaveta física de quem vendeu — ex.
                    repasse de recarga pago com saldo do Mercado Pago, não com a gaveta da venda.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Conta de origem</label>
                      <select value={corrigindoConta.novaConta}
                        onChange={e => setCorrigindoConta({ ...corrigindoConta, novaConta: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                        <option value="">— Mesma gaveta de quem vendeu (padrão) —</option>
                        {CONTAS_ORIGEM.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setCorrigindoConta(null)}
                      className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={salvarCorrecaoConta}
                      disabled={salvandoConta || corrigindoConta.novaConta === (corrigindoConta.contaAtual ?? "")}
                      className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                      {salvandoConta ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Demanda 201: modal "🔁 Transferir entre contas" — De/Para/
                Valor/Data. Ao confirmar, o backend gera a saída (conta de
                origem) + a linha de transferência (os 2 lados) numa
                escrita só; se bater com uma pendência da 200, ela é
                resolvida automaticamente (aviso na tela). */}
            {transferindoAberto && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTransferindoAberto(false)}>
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-gray-800 mb-2">🔁 Transferir entre contas</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Peguei dinheiro de uma conta e botei em outra — não é venda nem despesa, é o
                    mesmo dinheiro mudando de carteira.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">De</label>
                      <select value={transfOrigem} onChange={e => setTransfOrigem(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                        <option value="">— Selecione —</option>
                        {CONTAS_ORIGEM.map(c => (
                          <option key={c.id} value={c.id} disabled={c.id === transfDestino}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Para</label>
                      <select value={transfDestino} onChange={e => setTransfDestino(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                        <option value="">— Selecione —</option>
                        {CONTAS_ORIGEM.map(c => (
                          <option key={c.id} value={c.id} disabled={c.id === transfOrigem}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Valor</label>
                      <input type="number" placeholder="R$ 0,00" value={transfValor}
                        onChange={e => setTransfValor(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
                      <input type="text" value={transfDescricao}
                        onChange={e => setTransfDescricao(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Data (padrão hoje — mude pra lançar retroativo)</label>
                      <input type="date" value={transfData} max={hojeISO()}
                        onChange={e => { if (e.target.value) setTransfData(e.target.value); }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setTransferindoAberto(false)}
                      className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button onClick={salvarTransferencia}
                      disabled={salvandoTransf || !transfOrigem || !transfDestino || !transfValor}
                      className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                      {salvandoTransf ? "Salvando..." : "Transferir"}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Demanda 201: a saída da transferência já aparece em "Lançamentos"
            acima (com o badge "🏦 Saiu de: ..." da 200) — mas esse card não
            mostra o lado "Para", que é justamente a outra metade do
            movimento. Card compacto separado só com o De→Para do dia.
            Demanda 233: seletor de data (antes só "hoje") + cancelar (antes
            não existia nenhum botão — o mecanismo de desfazer os 2 lados
            juntos já existia desde a 201, só nunca tinha UI). */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-bold text-gray-700">Transferências entre contas</h3>
              <div className="flex items-center gap-2">
                {!transfEhHoje && (
                  <button onClick={() => setTransfFiltroData(hojeISOTransf())}
                    className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50">
                    Hoje
                  </button>
                )}
                <input type="date" value={transfFiltroData}
                  onChange={e => { if (e.target.value) setTransfFiltroData(e.target.value); }}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
            {transferenciasHoje.length === 0 ? (
              <p className="text-sm text-gray-400">
                {transfEhHoje ? "Nenhuma transferência hoje." : "Nenhuma transferência nesse dia."}
              </p>
            ) : (
              <div className="space-y-1.5">
                {transferenciasHoje.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm bg-indigo-50 rounded-lg px-3 py-2">
                    <span className="text-indigo-800">
                      {CONTAS_ORIGEM.find(c => c.id === t.conta_origem)?.label ?? t.conta_origem}
                      {" → "}
                      {CONTAS_ORIGEM.find(c => c.id === t.conta_destino)?.label ?? t.conta_destino}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-indigo-800">{moeda(t.valor)}</span>
                      <button onClick={() => cancelarTransferencia(t.id)}
                        className="text-[10px] text-red-500 hover:text-red-700 border border-red-200 rounded px-1.5 py-0.5 hover:bg-red-100">
                        Cancelar
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saídas previstas (demanda 123) — demanda 129: desceu pra baixo dos
            Lançamentos (muda pouco no dia a dia, não precisa ser o topo). */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-700">Saídas previstas</h3>
              {previstas.length > 0 && (
                <span className="text-sm font-bold text-amber-700">
                  {moeda(totalPrevisto)} pendente{previstas.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {carregandoPrevistas ? (
              <p className="text-sm text-gray-400">Carregando...</p>
            ) : previstas.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma conta a pagar pendente.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {previstas.map(c => (
                  <button key={c.id} onClick={onAbrirContasPagarReceber} disabled={!onAbrirContasPagarReceber}
                    className="w-full flex items-center justify-between py-2.5 px-2 -mx-2 text-left rounded-lg hover:bg-gray-50 disabled:hover:bg-transparent">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{c.nome}</div>
                      <div className="text-xs text-gray-400">{c.categoria} · vence {formatarData(c.vencimento)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === "atrasado" && (
                        <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-red-100 text-red-700">Atrasado</span>
                      )}
                      <span className="text-sm font-bold text-gray-800">{moeda(c.valor)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Clique numa conta pra ver detalhes ou dar baixa em Contas a Pagar/Receber.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FECHAMENTO
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// PRODUTOS
// ─────────────────────────────────────────────────────────────
interface ProdutoAdmin { id: string; nome: string; preco: number | null; categoria: string; descricao?: string; ativo: boolean; controla_estoque?: boolean; estoque_atual?: number | null; }

function TelaProdutos() {
  const [produtos, setProdutos]           = useState<ProdutoAdmin[]>([]);
  const [carregando, setCarregando]       = useState(true);
  const [editando, setEditando]           = useState<string | null>(null);
  const [editNome, setEditNome]           = useState("");
  const [editPreco, setEditPreco]         = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editControlaEstoque, setEditControlaEstoque] = useState(false);
  const [editEstoqueAtual, setEditEstoqueAtual]       = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [salvando, setSalvando]           = useState(false);
  const [novoModal, setNovoModal]         = useState(false);
  const [novoNome, setNovoNome]           = useState("");
  const [novoPreco, setNovoPreco]         = useState("");
  const [novoCategoria, setNovoCategoria] = useState("");
  const [novoDescricao, setNovoDescricao] = useState("");
  const [novoControlaEstoque, setNovoControlaEstoque] = useState(false);
  const [novoEstoqueAtual, setNovoEstoqueAtual]       = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch('/api/produtos?all=true');
      const d = await r.json();
      setProdutos(d.produtos || []);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const categorias = [...new Set(produtos.map(p => p.categoria))].sort();
  const produtosFiltrados = filtroCategoria ? produtos.filter(p => p.categoria === filtroCategoria) : produtos;

  function iniciarEdicao(p: ProdutoAdmin) {
    setEditando(p.id);
    setEditNome(p.nome);
    setEditPreco(p.preco !== null && p.preco !== undefined ? String(p.preco) : '');
    setEditCategoria(p.categoria);
    setEditDescricao(p.descricao || '');
    setEditControlaEstoque(p.controla_estoque || false);
    setEditEstoqueAtual(p.estoque_atual !== null && p.estoque_atual !== undefined ? String(p.estoque_atual) : '0');
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    const novoPrecoNum = editPreco !== '' ? parseFloat(editPreco) : null;
    const novoEstoqueNum = editEstoqueAtual !== '' ? parseFloat(editEstoqueAtual) : 0;
    try {
      await fetch('/api/produtos', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editando, nome: editNome, preco: novoPrecoNum, categoria: editCategoria, descricao: editDescricao || null, controla_estoque: editControlaEstoque, estoque_atual: novoEstoqueNum }),
      });
      setProdutos(prev => prev.map(p => p.id === editando ? { ...p, nome: editNome, preco: novoPrecoNum, categoria: editCategoria, descricao: editDescricao || undefined, controla_estoque: editControlaEstoque, estoque_atual: novoEstoqueNum } : p));
      setEditando(null);
    } catch { /* silencioso */ }
    finally { setSalvando(false); }
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await fetch('/api/produtos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo }),
    });
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ativo } : p));
  }

  async function criarProduto() {
    if (!novoNome || !novoCategoria) return;
    setSalvando(true);
    try {
      await fetch('/api/produtos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome, preco: novoPreco ? parseFloat(novoPreco) : undefined, categoria: novoCategoria, descricao: novoDescricao || undefined, controla_estoque: novoControlaEstoque, estoque_atual: novoControlaEstoque && novoEstoqueAtual ? parseFloat(novoEstoqueAtual) : 0 }),
      });
      setNovoModal(false); setNovoNome(""); setNovoPreco(""); setNovoCategoria(""); setNovoDescricao(""); setNovoControlaEstoque(false); setNovoEstoqueAtual("");
      carregar();
    } catch { /* silencioso */ }
    finally { setSalvando(false); }
  }

  return (
    <div className="overflow-y-auto h-full bg-gray-50 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-base font-bold text-gray-700">Produtos</h2>
        <span className="text-xs text-gray-400">{produtos.length} cadastrados · {produtos.filter(p => p.ativo).length} ativos</span>
        <div className="ml-auto flex gap-2">
          <select
            value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setNovoModal(true)} className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
            + Novo produto
          </button>
        </div>
      </div>

      {/* Modal novo produto */}
      {novoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNovoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-5">Novo produto</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome</label>
                <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ex: XEROX P&B A4" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Preço (R$)</label>
                <input type="number" step="0.01" value={novoPreco} onChange={e => setNovoPreco(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                <input list="cats-list" value={novoCategoria} onChange={e => setNovoCategoria(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Digite ou selecione" />
                <datalist id="cats-list">{categorias.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
                <input type="text" value={novoDescricao} onChange={e => setNovoDescricao(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ex: Papel A4 75g, 1 face" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={novoControlaEstoque} onChange={e => setNovoControlaEstoque(e.target.checked)} className="rounded" />
                  <span className="text-xs text-gray-600">Controlar estoque</span>
                </label>
                {novoControlaEstoque && (
                  <div className="flex-1">
                    <input type="number" min="0" step="1" value={novoEstoqueAtual} onChange={e => setNovoEstoqueAtual(e.target.value)}
                      placeholder="Qtd inicial"
                      title="Quantidade disponível em estoque"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setNovoModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button onClick={criarProduto} disabled={salvando || !novoNome || !novoCategoria}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {salvando ? "Salvando..." : "Criar produto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            Carregando...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome / Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Preço</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24" title="Quantidade disponível em estoque. Apenas para produtos que você controla manualmente.">Estoque</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Ativo</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produtosFiltrados.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${!p.ativo ? 'opacity-40' : ''}`}>
                  {editando === p.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditando(null); }}
                          className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none mb-1" />
                        <input type="text" value={editDescricao} onChange={e => setEditDescricao(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Escape') setEditando(null); }}
                          placeholder="Descrição (opcional)"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none text-gray-500" />
                      </td>
                      <td className="px-4 py-2">
                        <input list="edit-cats-list" value={editCategoria} onChange={e => setEditCategoria(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditando(null); }}
                          className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none" />
                        <datalist id="edit-cats-list">{categorias.map(c => <option key={c} value={c} />)}</datalist>
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" value={editPreco} onChange={e => setEditPreco(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEditando(null); }}
                          placeholder="Sob consulta"
                          className="w-full border border-blue-300 rounded px-2 py-1 text-sm text-right focus:outline-none" />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input type="checkbox" checked={editControlaEstoque} onChange={e => setEditControlaEstoque(e.target.checked)}
                            title="Marcar para controlar estoque deste produto" className="rounded" />
                          {editControlaEstoque && (
                            <input type="number" min="0" step="1" value={editEstoqueAtual}
                              onChange={e => setEditEstoqueAtual(e.target.value)}
                              title="Quantidade atual em estoque"
                              className="w-14 border border-blue-300 rounded px-1.5 py-1 text-sm text-center focus:outline-none" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-gray-300">—</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={salvarEdicao} disabled={salvando}
                            className="text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-700 disabled:opacity-50">
                            {salvando ? "..." : "Salvar"}
                          </button>
                          <button onClick={() => setEditando(null)}
                            className="text-xs border border-gray-200 text-gray-500 rounded px-2 py-1 hover:bg-gray-50">
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{p.nome}</div>
                        {p.descricao && <div className="text-xs text-gray-400 mt-0.5">{p.descricao}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.categoria}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">{moeda(p.preco)}</td>
                      <td className="px-4 py-3 text-center">
                        {p.controla_estoque ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(p.estoque_atual ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                            title="Quantidade em estoque">
                            {p.estoque_atual ?? 0} un
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleAtivo(p.id, !p.ativo)} title={p.ativo ? 'Clique para desativar (some do PDV)' : 'Clique para ativar (aparece no PDV)'}
                          className={`w-10 h-5 rounded-full relative transition-colors ${p.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.ativo ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => iniciarEdicao(p)}
                          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
                          Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CONTAS BANCÁRIAS (demanda 077)
// ─────────────────────────────────────────────────────────────
interface ContaBancaria {
  id: string;
  nome: string;
  taxa_cartao_pct: number;
  taxa_pix_pct: number;
  padrao_cartao: boolean;
  padrao_pix: boolean;
  ativo: boolean;
}

function TelaContasBancarias() {
  const [contas, setContas]       = useState<ContaBancaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando]   = useState<string | null>(null);
  const [editNome, setEditNome]   = useState("");
  const [editTaxaCartao, setEditTaxaCartao] = useState("");
  const [editTaxaPix, setEditTaxaPix]       = useState("");
  const [salvando, setSalvando]   = useState(false);
  const [novoModal, setNovoModal] = useState(false);
  const [novoNome, setNovoNome]   = useState("");
  const [novoTaxaCartao, setNovoTaxaCartao] = useState("");
  const [novoTaxaPix, setNovoTaxaPix]       = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch('/api/contas-bancarias');
      const d = await r.json();
      setContas(d.contas || []);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function iniciarEdicao(c: ContaBancaria) {
    setEditando(c.id);
    setEditNome(c.nome);
    setEditTaxaCartao(String(c.taxa_cartao_pct));
    setEditTaxaPix(String(c.taxa_pix_pct));
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    try {
      await fetch('/api/contas-bancarias', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editando, nome: editNome, taxaCartaoPct: parseFloat(editTaxaCartao) || 0, taxaPixPct: parseFloat(editTaxaPix) || 0 }),
      });
      setEditando(null);
      carregar();
    } catch { /* silencioso */ }
    finally { setSalvando(false); }
  }

  async function marcarPadrao(id: string, campo: 'padraoCartao' | 'padraoPix') {
    await fetch('/api/contas-bancarias', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [campo]: true }),
    });
    carregar();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await fetch('/api/contas-bancarias', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo }),
    });
    setContas(prev => prev.map(c => c.id === id ? { ...c, ativo } : c));
  }

  async function criarConta() {
    if (!novoNome) return;
    setSalvando(true);
    try {
      await fetch('/api/contas-bancarias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome, taxaCartaoPct: parseFloat(novoTaxaCartao) || 0, taxaPixPct: parseFloat(novoTaxaPix) || 0 }),
      });
      setNovoModal(false); setNovoNome(""); setNovoTaxaCartao(""); setNovoTaxaPix("");
      carregar();
    } catch { /* silencioso */ }
    finally { setSalvando(false); }
  }

  return (
    <div className="overflow-y-auto h-full bg-gray-50 p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-base font-bold text-gray-700">Contas Bancárias</h2>
        <span className="text-xs text-gray-400">
          Configure a taxa de cartão/Pix de cada conta e marque qual é a padrão — o Fechar Caixa usa
          isso pra calcular o valor líquido esperado.
        </span>
        <button onClick={() => setNovoModal(true)} className="ml-auto bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-700">
          + Nova conta
        </button>
      </div>

      {novoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setNovoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-5">Nova conta bancária</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nome da conta/banco</label>
                <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Ex: Banco do Brasil - Edvam" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Taxa cartão (%)</label>
                  <input type="number" step="0.01" value={novoTaxaCartao} onChange={e => setNovoTaxaCartao(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Taxa Pix (%)</label>
                  <input type="number" step="0.01" value={novoTaxaPix} onChange={e => setNovoTaxaPix(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="0,00" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setNovoModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button onClick={criarConta} disabled={salvando || !novoNome}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                {salvando ? "Salvando..." : "Criar conta"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            Carregando...
          </div>
        ) : contas.length === 0 ? (
          <p className="text-center text-sm text-gray-400 p-8">Nenhuma conta cadastrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Conta</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Taxa cartão</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Taxa Pix</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Padrão cartão</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Padrão Pix</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Ativa</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {contas.map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  {editando === c.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" step="0.01" value={editTaxaCartao} onChange={e => setEditTaxaCartao(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" step="0.01" value={editTaxaPix} onChange={e => setEditTaxaPix(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400" />
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">—</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">—</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">—</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={salvarEdicao} disabled={salvando} className="text-xs text-white bg-blue-600 rounded px-2 py-1 hover:bg-blue-700 disabled:opacity-50">Salvar</button>
                          <button onClick={() => setEditando(null)} className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50">Cancelar</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{c.taxa_cartao_pct}%</td>
                      <td className="px-4 py-3 text-right text-gray-700">{c.taxa_pix_pct}%</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => marcarPadrao(c.id, 'padraoCartao')}
                          className={`text-xs font-bold px-2 py-1 rounded-full ${c.padrao_cartao ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                          {c.padrao_cartao ? '✓ Padrão' : 'Marcar'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => marcarPadrao(c.id, 'padraoPix')}
                          className={`text-xs font-bold px-2 py-1 rounded-full ${c.padrao_pix ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                          {c.padrao_pix ? '✓ Padrão' : 'Marcar'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleAtivo(c.id, !c.ativo)} title={c.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                          className={`w-10 h-5 rounded-full relative transition-colors ${c.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.ativo ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => iniciarEdicao(c)}
                          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50">
                          Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const [operador, setOperador] = useState<Usuario | null>(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [aba, setAba] = useState<Aba>("pdv");
  // Demanda 136: abas já visitadas ficam montadas (lazy — só monta na 1ª
  // visita, mas nunca mais desmonta; ver AbaKeepAlive.tsx).
  const [abasMontadas, setAbasMontadas] = useState<Set<Aba>>(() => new Set<Aba>(["pdv"]));
  useEffect(() => {
    setAbasMontadas(prev => (prev.has(aba) ? prev : new Set(prev).add(aba)));
  }, [aba]);
  const [resumoHeader, setResumoHeader] = useState<{ totalEntradas: number; nomeAba: string } | null>(null);
  // Atalho "abrir no Inbox" a partir da aba Clientes (demanda 083).
  const [abrirConversa, setAbrirConversa] = useState<{ phone: string; nonce: number } | null>(null);
  function abrirConversaNoInbox(phone: string) {
    setAbrirConversa({ phone, nonce: Date.now() });
    setAba("inbox");
  }
  // Demanda 171: caminho inverso — abre a aba Pedidos já filtrada pelo
  // telefone do contato (mesmo padrão do abrirConversa, com nonce).
  const [abrirBuscaPedidos, setAbrirBuscaPedidos] = useState<{ valor: string; nonce: number } | null>(null);
  function abrirPedidosDoContato(phone: string) {
    setAbrirBuscaPedidos({ valor: phone, nonce: Date.now() });
    setAba("pedidos");
  }

  // ── Demanda 325: banner persistente de conversas escaladas sem ninguém
  // ter resolvido, só existe no shell do Admin (aqui), nunca no PDV
  // (app/pdv/page.tsx é um arquivo separado, Zu/Gabi não têm acesso ao
  // Inbox mesmo). Poll simples e independente (não reaproveita o Broadcast
  // do Inbox, o banner vive fora da árvore de TelaInbox, e o volume de
  // conversas escaladas é sempre baixo, não precisa de tempo real). ──
  const [escaladosCount, setEscaladosCount] = useState(0);
  const carregarEscaladosCount = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox/escalados-count");
      const data = await res.json();
      if (typeof data.count === "number") setEscaladosCount(data.count);
    } catch { /* silencioso — tenta de novo no próximo ciclo */ }
  }, []);
  const [abrirFiltroEscalado, setAbrirFiltroEscalado] = useState<{ status: string; nonce: number } | null>(null);
  function abrirInboxEscalados() {
    setAbrirFiltroEscalado({ status: "escalado", nonce: Date.now() });
    setAba("inbox");
  }

  // Demanda 329 (Caminho A): restaura sessão perguntando pro SERVIDOR (cookie
  // HttpOnly, não legível por JS) — antes era só localStorage (`lerSessao`,
  // demanda 030), nunca validado de verdade, qualquer um podia forjar.
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.usuario) setOperador(data.usuario); })
      .catch(() => {})
      .finally(() => setVerificandoSessao(false));
  }, []);

  // Demanda 334: qualquer 401 em qualquer rota (sessão caiu no meio do uso)
  // volta pra tela de login na hora, em vez de deixar cada tela mostrar
  // "vazio" em silêncio (achado real: aba Clientes parecia sem dado nenhum).
  useDeslogarEm401(useCallback(() => { setOperador(null); setSessaoExpirada(true); }, []));

  const carregarResumo = useCallback(async () => {
    try {
      const res = await fetch("/api/fechamento");
      const data = await res.json();
      setResumoHeader({ totalEntradas: data.totalEntradas, nomeAba: data.nomeAba });
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    if (operador) carregarResumo();
  }, [operador, carregarResumo]);

  // Demanda 325: intervalo de 25s + refetch ao focar a aba (mesmo fallback
  // já usado no Inbox pra quando o Broadcast cai), só o suficiente pra um
  // banner de baixo volume, sem precisar de infra de tempo real dedicada.
  useEffect(() => {
    if (!operador || operador.papel !== "admin") return;
    carregarEscaladosCount();
    const intervalo = setInterval(carregarEscaladosCount, 25000);
    const aoFocar = () => carregarEscaladosCount();
    window.addEventListener("focus", aoFocar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("focus", aoFocar);
    };
  }, [operador, carregarEscaladosCount]);

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  // Telas disponíveis por papel
  const abas: { id: Aba; label: string; emoji: string; soAdmin?: boolean }[] = [
    { id: "inbox",      label: "Inbox",          emoji: "💬", soAdmin: true },
    { id: "pdv",        label: "Pedidos Balcão", emoji: "🧾" },
    // Demanda 098 — ledger cronológico de entradas (venda balcão, pedido
    // pago, abertura/fechamento de caixa). Mesma visibilidade de
    // `financeiro` (visível pro PDV também, sem instrução em contrário) —
    // ver relato da demanda pra decisão de acesso.
    { id: "entradas",   label: "Entradas",       emoji: "📥", soAdmin: true },
    { id: "saidas",     label: "Saídas",         emoji: "💸", soAdmin: true },
    { id: "fechamento", label: "Fechar Caixa",   emoji: "🔒", soAdmin: true },
    // Demanda 132: "Financeiro" repetia o nome da seção pai do menu (087) —
    // virou "Movimento" (escolha do Edvam). Demanda 194: "Movimento" virou o
    // dashboard geral do negócio — renomeado de novo pra "Visão Geral"
    // (confirmado com o Edvam, 2026-07-28). Só o rótulo: o id `financeiro` é
    // estado interno de aba (SPA), não existe rota/URL pra quebrar. (Ironia
    // registrada: a 075 tinha renomeado "Movimento"→"Financeiro"; o PDV
    // mostra "Relatórios" desde a 115 e segue como está.)
    { id: "financeiro", label: "Visão Geral",    emoji: "📊", soAdmin: true },
    // Demanda 096 — cadastro de obrigações futuras (a pagar/a receber), só
    // Admin (confirmado com o Edvam, PDV nunca lança nem vê conta futura) —
    // por isso nem existe em app/pdv/page.tsx, não é só `soAdmin` aqui.
    { id: "contasPagarReceber", label: "Contas a Pagar/Receber", emoji: "📋", soAdmin: true },
    // Demanda 084 — piloto Mercado Pago (sem custo), saldo/movimentações
    // reais. Só Admin, mesma decisão de acesso da 077/096.
    { id: "mercadoPago", label: "Mercado Pago", emoji: "💳", soAdmin: true },
    // Demanda 229 — 4ª peça do desenho de conciliação (225): itens pendentes
    // das demandas 227 (matching Mercado Pago) e 228 (gap agregado), pra
    // classificar ou ignorar. Mesma visibilidade das outras telas
    // financeiras (soAdmin).
    { id: "conciliacao", label: "Conciliação", emoji: "🔎", soAdmin: true },
    { id: "produtos",   label: "Produtos",       emoji: "📦", soAdmin: true },
    { id: "pedidos",    label: "Pedidos",        emoji: "🗂️", soAdmin: true },
    { id: "clientes",   label: "Clientes",       emoji: "👥", soAdmin: true },
    // Demanda 085: aba "Contas Bancárias" (criada na 077) removida do menu
    // por enquanto — Edvam quer repensar onde essa config deveria morar
    // (parece mais Open Finance/demanda 084 do que aba própria). A tela
    // (TelaContasBancarias), a rota /api/contas-bancarias e a tabela
    // continuam intactas, só sem link na navegação; o cálculo do Fechar
    // Caixa (demanda 077) não depende deste menu, lê a tabela direto.
    { id: "config",     label: "Conectar API",   emoji: "⚙️", soAdmin: true },
    // Demanda 310: Marketing → Conteúdo, só Admin (mesma visibilidade das
    // outras telas que publicam pra fora/mexem em dado sensível).
    { id: "conteudo",   label: "Conteúdo",       emoji: "🎨", soAdmin: true },
  ];

  const abasVisiveis = abas.filter(a => !a.soAdmin || operador?.papel === "admin");

  // Demanda 087: monta os grupos só com as telas que já estão em
  // `abasVisiveis` — grupo sem nenhuma tela visível (não deveria acontecer
  // no admin hoje, mas defensivo) some da 1ª fileira.
  const gruposVisiveis = GRUPOS_NAV
    .map(g => ({ ...g, itens: g.abas.map(id => abasVisiveis.find(a => a.id === id)).filter((a): a is typeof abasVisiveis[number] => !!a) }))
    .filter(g => g.itens.length > 0);

  // Grupo atual sempre derivado da aba atual — evita ter que manter 2
  // estados em sincronia (qualquer `setAba` direto, ex. no "Sair", já
  // reflete no grupo automaticamente).
  const grupoAtivoId = GRUPOS_NAV.find(g => g.abas.includes(aba))?.id ?? gruposVisiveis[0]?.id;
  const itensGrupoAtivo = gruposVisiveis.find(g => g.id === grupoAtivoId)?.itens ?? [];

  function selecionarGrupo(grupoId: string) {
    if (grupoId === grupoAtivoId) return; // já é o grupo atual, não pula pra 1ª tela
    const grupo = gruposVisiveis.find(g => g.id === grupoId);
    if (grupo && grupo.itens.length > 0) setAba(grupo.itens[0].id);
  }

  if (verificandoSessao) return null;

  if (!operador) {
    // Demanda 329: o cookie de sessão já foi gravado pelo servidor dentro
    // da própria chamada de login (Set-Cookie da resposta) — só falta
    // atualizar o estado local.
    return <TelaLogin onLogin={(u) => { setOperador(u); setSessaoExpirada(false); }} sessaoExpirada={sessaoExpirada} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-bold text-lg leading-tight">JS Gráfica — Caixa</h1>
            <p className="text-blue-200 text-xs capitalize">{hoje}{resumoHeader?.nomeAba ? ` · ${resumoHeader.nomeAba}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              {operador.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium leading-none">{operador.nome}</div>
              <div className="text-blue-300 text-xs mt-0.5 capitalize">{operador.papel}</div>
            </div>
            <button
              onClick={() => { fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); setOperador(null); setResumoHeader(null); setAba("pdv"); }}
              className="ml-2 text-blue-300 hover:text-white text-xs border border-blue-500 hover:border-blue-300 rounded px-2 py-1 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Demanda 325: banner persistente, sempre visível em TODA aba do
          Admin enquanto houver 1+ conversa escalada sem resolver, some
          sozinho assim que a contagem zera (renderização condicional
          simples, sem timer de esconder). Leva direto pro filtro "Escalado"
          do Inbox (demanda 321), não duplica UI nova de listagem. */}
      {operador.papel === "admin" && escaladosCount > 0 && (
        <button
          onClick={abrirInboxEscalados}
          className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 transition-colors flex-shrink-0"
        >
          <span>⚠️</span>
          {escaladosCount} conversa{escaladosCount > 1 ? "s" : ""} aguardando atendimento humano · clique para ver
        </button>
      )}

      {/* Nav — demanda 087: 2 fileiras, grupos por área em vez de abas soltas */}
      <nav className="bg-white border-b border-gray-200 flex flex-wrap px-2 flex-shrink-0">
        {gruposVisiveis.map((g) => (
          <button
            key={g.id}
            onClick={() => selecionarGrupo(g.id)}
            className={`flex items-center gap-1.5 px-3.5 h-[46px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              grupoAtivoId === g.id
                ? "border-blue-600 text-blue-700 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-blue-50"
            }`}
          >
            {g.label}
          </button>
        ))}
      </nav>
      <nav className="bg-blue-50 border-b border-gray-200 flex flex-wrap px-2 flex-shrink-0">
        {itensGrupoAtivo.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-3.5 h-[38px] text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              aba === a.id
                ? "border-blue-600 text-blue-800 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </nav>

      {/* Conteúdo — demanda 136: abas NÃO desmontam mais ao trocar (causa
          raiz do travamento de ~25s do Inbox, ver AbaKeepAlive.tsx). Cada
          tela monta na primeira visita (lazy) e depois só esconde/mostra —
          estado e conexões persistem; telas sensíveis a tempo recarregam
          sozinhas via useRecarregarAoReativar. */}
      <main className="flex-1 overflow-hidden">
        {([
          ["pdv",        <TelaPDV key="pdv" onVendaConfirmada={carregarResumo} operador={operador} />],
          ["entradas",   <TelaEntradas key="entradas" operadorLogado={operador} />],
          ["saidas",     <TelaSaidas key="saidas" operador={operador} onAbrirContasPagarReceber={() => setAba("contasPagarReceber")} />],
          ["fechamento", <TelaFechamento key="fechamento" operador={operador} onAbrirConciliacao={() => setAba("conciliacao")} />],
          ["financeiro", <TelaFinanceiro key="financeiro" onAbrirFechamento={() => setAba("fechamento")} />],
          ["contasPagarReceber", <TelaContasPagarReceber key="contasPagarReceber" operador={operador} />],
          ["mercadoPago", <TelaMercadoPago key="mercadoPago" />],
          ["conciliacao", <TelaConciliacao key="conciliacao" operador={operador.nome} />],
          ["produtos",   <TelaProdutos key="produtos" />],
          ["pedidos",    <TelaPedidos key="pedidos" operador={operador} onAbrirConversa={abrirConversaNoInbox} abrirBusca={abrirBuscaPedidos} />],
          ["clientes",   <TelaClientes key="clientes" onAbrirConversa={abrirConversaNoInbox} onAbrirPedidos={abrirPedidosDoContato} />],
          ["inbox",      <TelaInbox key="inbox" operador={operador} abrirConversa={abrirConversa} onAbrirPedidos={abrirPedidosDoContato} abrirFiltroStatus={abrirFiltroEscalado} />],
          ["contas",     <TelaContasBancarias key="contas" />],
          // Demanda 275: painel de telefones autorizados encaixado aqui —
          // mesma aba "Configurações" já existente (evita criar aba nova
          // pra uma tela pequena). Wrapper com scroll próprio porque
          // TelaConfigZAPI não tem overflow-y-auto/h-full como a maioria
          // das outras telas — juntar as duas sem isso deixaria o conteúdo
          // extra cortado pelo overflow-hidden do <main> abaixo.
          ["config",     <div key="config" className="overflow-y-auto h-full"><TelaConfigZAPI /><TelaTelefonesAutorizados /></div>],
          ["conteudo",   <TelaMarketingConteudo key="conteudo" />],
        ] as [Aba, React.ReactNode][]).map(([id, tela]) =>
          abasMontadas.has(id) && (
            <AbaKeepAlive key={id} ativa={aba === id}>{tela}</AbaKeepAlive>
          )
        )}
      </main>
    </div>
  );
}
