"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { CATEGORIA_PARA_GRUPO, ORDEM_GRUPOS, sanitizarValorMonetario, ordenarProdutosDoGrupo, iconeGrupo } from "@/lib/dados";
import { USUARIOS, type Usuario } from "@/lib/usuarios";
import { TelaInbox } from "@/components/TelaInbox";
import { TelaFechamento } from "@/components/TelaFechamento";
import { PortaoAberturaCaixa } from "@/components/PortaoAberturaCaixa";
import { TelaFinanceiro } from "@/components/TelaFinanceiro";
import { TelaEntradas } from "@/components/TelaEntradas";
import { TelaPedidos } from "@/components/TelaPedidos";
import { TelaClientes } from "@/components/TelaClientes";
import { ModalQrPix } from "@/components/ModalQrPix";
import { AbaKeepAlive } from "@/components/AbaKeepAlive";
import { VincularContatoBalcao } from "@/components/VincularContatoBalcao";
import { useDeslogarEm401 } from "@/lib/useDeslogarEm401";

type AbaPDV = "inbox" | "pdv" | "entradas" | "fechamento" | "financeiro" | "pedidos" | "clientes";

// Demanda 087 — menu agrupado por área (2 fileiras), mesmo mockup aprovado
// usado no admin (app/page.tsx). O PDV só tem acesso a um subconjunto das
// abas do admin hoje — grupos sem nenhuma tela disponível aqui (ex.
// "Configurações": Produtos/Conectar API não existem no PDV) somem sozinhos
// da 1ª fileira, sem precisar listar manualmente o que excluir.
// Demanda 075: "Movimento" virou "Financeiro" (mesma tela unificada do admin).
const GRUPOS_NAV_PDV: { id: string; label: string; abas: AbaPDV[] }[] = [
  { id: "atendimento", label: "💬 Atendimento", abas: ["inbox", "clientes"] },
  { id: "vendas",      label: "📋 Vendas",       abas: ["pdv", "pedidos"] },
  { id: "financeiro",  label: "💰 Financeiro",   abas: ["entradas", "fechamento", "financeiro"] },
];

const ABAS_PDV: { id: AbaPDV; label: string; emoji: string }[] = [
  { id: "inbox",      label: "Inbox",          emoji: "💬" },
  { id: "pdv",        label: "Pedidos Balcão", emoji: "🧾" },
  { id: "pedidos",    label: "Pedidos",        emoji: "🗂️" },
  { id: "clientes",   label: "Clientes",       emoji: "👥" },
  // Demanda 098 — mesma visibilidade de "financeiro" (sem instrução em
  // contrário pra restringir só ao Admin, ver relato da demanda).
  { id: "entradas",   label: "Entradas",       emoji: "📥" },
  { id: "fechamento", label: "Fechar Caixa",   emoji: "🔒" },
  // Demanda 115: rótulo vira "Relatórios" só no PDV (a tela virou um menu de
  // 3 relatórios nomeados desde a 101) — confirmado com o PM que o Admin
  // mantém "Financeiro", sem mudança de função nos dois.
  { id: "financeiro", label: "Relatórios",     emoji: "📊" },
];

interface ProdutoAPI { id: string; nome: string; preco: number | null; categoria: string; }

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


// ─── Login ───────────────────────────────────────────────────
// Demanda 329 (Caminho A — sessão real): antes, clicar em QUALQUER nome
// aqui (incluindo Edvam/admin) logava direto, sem senha nenhuma — dava pra
// virar uma sessão "admin" só clicando o nome dele na tela do PDV, sem
// conhecer a senha. Corrigido: atendente (Zu/Gabi) continua 1 clique só,
// sem senha, exatamente como sempre foi (mesmo padrão de sempre — presença
// física no balcão já é a "autenticação"); admin agora sempre pede a senha
// de verdade, mesmo aqui, via a MESMA rota /api/auth/login-admin que a tela
// de Admin usa — nunca existe um caminho de virar admin sem senha.
function TelaLogin({ onLogin, sessaoExpirada }: { onLogin: (u: Usuario) => void; sessaoExpirada?: boolean }) {
  const [pedindoSenhaDe, setPedindoSenhaDe] = useState<Usuario | null>(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function loginAtendente(u: Usuario) {
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/auth/login-pdv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: u.nome }),
      });
      const data = await res.json();
      if (res.ok && data.usuario) onLogin(data.usuario);
      else setErro(data.error || "Não foi possível entrar.");
    } catch {
      setErro("Não deu pra conectar — tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function loginAdmin(e: React.FormEvent) {
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
      if (res.ok && data.usuario) onLogin(data.usuario);
      else { setErro(data.error || "Senha incorreta."); setSenha(""); }
    } catch {
      setErro("Não deu pra conectar — tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function clicarUsuario(u: Usuario) {
    setErro("");
    if (u.papel === "admin") setPedindoSenhaDe(u);
    else loginAtendente(u);
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-96">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🖨️</div>
          <h1 className="text-xl font-bold text-gray-800">JS Gráfica — PDV</h1>
          <p className="text-gray-400 text-sm mt-1">
            {pedindoSenhaDe ? `Senha de ${pedindoSenhaDe.nome}` : "Quem está no caixa?"}
          </p>
        </div>
        {sessaoExpirada && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-center py-2 px-3 mb-4">
            Sua sessão caiu — faça login de novo.
          </p>
        )}
        {pedindoSenhaDe ? (
          <form onSubmit={loginAdmin} className="space-y-4">
            <input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(""); }}
              placeholder="Digite a senha"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              required
            />
            {erro && <p className="text-red-600 text-xs font-medium text-center">{erro}</p>}
            <button type="submit" disabled={enviando} className="w-full bg-blue-600 text-white rounded-lg py-3 font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
              {enviando ? "Entrando..." : "Entrar"}
            </button>
            <button type="button" onClick={() => { setPedindoSenhaDe(null); setSenha(""); setErro(""); }}
              className="w-full text-gray-400 text-xs hover:text-gray-600">
              Voltar
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            {erro && <p className="text-red-600 text-xs font-medium text-center">{erro}</p>}
            {USUARIOS.map(u => (
              <button
                key={u.id}
                type="button"
                disabled={enviando}
                onClick={() => clicarUsuario(u)}
                className="w-full border-2 border-gray-200 rounded-xl py-4 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all disabled:opacity-50"
              >
                {u.nome}
                <span className="ml-2 text-xs font-normal text-gray-400 capitalize">({u.papel})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PDV Principal ───────────────────────────────────────────
export default function PaginaPDV() {
  const [operador, setOperador]             = useState<Usuario | null>(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [aba, setAba]                       = useState<AbaPDV>("inbox");
  // Demanda 136: abas já visitadas ficam montadas (lazy) — nunca mais
  // desmontam ao trocar; ver components/AbaKeepAlive.tsx (causa raiz dos 25s).
  const [abasMontadas, setAbasMontadas] = useState<Set<AbaPDV>>(() => new Set<AbaPDV>(["inbox"]));
  useEffect(() => {
    setAbasMontadas(prev => (prev.has(aba) ? prev : new Set(prev).add(aba)));
  }, [aba]);
  // Atalho "abrir no Inbox" a partir da aba Clientes (demanda 083).
  const [abrirConversa, setAbrirConversa]   = useState<{ phone: string; nonce: number } | null>(null);
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
  const [produtosDB, setProdutosDB]         = useState<ProdutoAPI[]>([]);
  const [carregandoProds, setCarregandoProds] = useState(true);
  const [carrinho, setCarrinho]             = useState<ItemCarrinho[]>([]);
  const [grupoAtivo, setGrupoAtivo]         = useState("");
  const [avulsoValor, setAvulsoValor] = useState("");
  const [avulsoDesc, setAvulsoDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  const [modal, setModal] = useState<{ produtoId: string; nome: string; preco: number } | null>(null);
  const [modalQtd, setModalQtd] = useState("1");
  // Demanda 066: forma de pagamento e "já entregou agora?" antes de gravar a venda.
  const [modalVenda, setModalVenda] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<"Dinheiro" | "Cartão" | "Pix" | "Paga na retirada">("Dinheiro");
  // Demanda 137 (Fase 1): quando "Paga na retirada", captura QUAL forma o
  // cliente pretende usar depois — só gravação (campos novos por pedido),
  // nenhum comportamento muda. Opcional, clicar de novo desmarca.
  const [formaRetirada, setFormaRetirada] = useState<"Dinheiro" | "Cartão" | "Pix" | null>(null);
  // Demanda 196: quem NÃO tem gaveta física própria (papel admin — o Edvam,
  // que também consegue logar no PDV) vendendo em Dinheiro escolhe pra qual
  // gaveta o físico vai; Zu/Gabi (atendente) nunca veem a pergunta.
  const perguntarGaveta = operador?.papel === "admin";
  const [gavetaDestino, setGavetaDestino] = useState<"Zu" | "Gabi" | null>(null);
  // Demanda 141 (Fase 3): venda com Pix imediato gera cobrança real no
  // Mercado Pago e mostra o QR nesta tela nova — a confirmação vem do
  // pagamento de verdade (poll aqui + webhook/fallback da 124), por isso a
  // venda Pix nasce `pagamento_confirmado: false` agora.
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
  // "Fechar" só esconde; sem isso, venda aberta por engano ficava pendente
  // pra sempre. Reusa `cancelarPedido` (112) via PATCH por vendaId — reverte
  // saída vinculada se houver. NADA é chamado no Mercado Pago: Pix não pago
  // expira sozinho lá; cancelar aqui é só sobre o nosso pedido.
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

  // ── Resumo do dia + atalhos de mais vendidos (demanda 060) — reaproveita
  // o mesmo cálculo do dashboard (periodo=hoje), não duplica lógica. ──
  const [resumoHoje, setResumoHoje] = useState<{
    totalEntradas: number; itensVendidos: number;
    topProdutos: { nome: string; quantidade: number; valor: number }[];
  } | null>(null);

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

  // Demanda 329 (Caminho A): restaura sessão perguntando pro SERVIDOR
  // (cookie HttpOnly) — antes era só localStorage (`lerSessao`, demanda
  // 030), nunca validado de verdade.
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

  useEffect(() => {
    fetch('/api/produtos')
      .then(r => r.json())
      .then(d => { setProdutosDB(d.produtos || []); setCarregandoProds(false); })
      .catch(() => setCarregandoProds(false));
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

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  function abrirModal(produtoId: string) {
    const prod = produtosDB.find((p) => p.id === produtoId);
    if (!prod) return;
    setModal({ produtoId, nome: prod.nome, preco: prod.preco ?? 0 });
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
    if (carrinho.length === 0 || !operador) return;
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
    // de verdade (QR + poll/webhook). Dinheiro/Cartão seguem confirmados na
    // hora como sempre; "Paga na retirada" segue pendente como sempre.
    const pagamentoConfirmado = formaPagamento !== "Paga na retirada" && formaPagamento !== "Pix";
    const statusEntrega = entregouAgora ? "entregue" : "aguardando_retirada";
    // Demanda 137 (Fase 1): deriva a escolha normalizada do que o modal já
    // pergunta desde a 066 — "Paga na retirada" vira momento 'retirada' (com
    // a forma vindo da sub-pergunta nova, se respondida); as 3 formas
    // diretas viram momento 'agora'. Só captura, nada de lógica nova.
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
            // Demanda 196: gaveta física de destino do dinheiro (só admin).
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

      // Demanda 141 (Fase 3): Pix imediato → gera a cobrança real e abre a
      // tela de QR. Falha aqui NUNCA desfaz a venda (já gravada) — o modal
      // mostra o aviso e o pagamento pode ser confirmado manualmente depois
      // (fluxo da 113), mesma filosofia de resiliência da 124.
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
    } catch {
      setFeedback({ tipo: "erro", msg: "Erro ao gravar. Verifique a conexão." });
    } finally {
      setLoading(false);
    }
  }

  const grupoObj = grupos.find((g) => g.nome === grupoAtivo);
  const produtosGrupo = grupoObj?.produtos || [];
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

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

  // Demanda 087: monta os grupos só com as telas que já estão em ABAS_PDV —
  // grupo sem nenhuma tela some da 1ª fileira (ex. "Configurações" some
  // inteiro no PDV, já que Produtos/Conectar API não existem aqui).
  const gruposVisiveis = GRUPOS_NAV_PDV
    .map(g => ({ ...g, itens: g.abas.map(id => ABAS_PDV.find(a => a.id === id)).filter((a): a is typeof ABAS_PDV[number] => !!a) }))
    .filter(g => g.itens.length > 0);

  // Grupo atual sempre derivado da aba atual — mesmo padrão do admin, evita
  // 2 estados fora de sincronia.
  const grupoAtivoId = GRUPOS_NAV_PDV.find(g => g.abas.includes(aba))?.id ?? gruposVisiveis[0]?.id;
  const itensGrupoAtivo = gruposVisiveis.find(g => g.id === grupoAtivoId)?.itens ?? [];

  function selecionarGrupo(grupoId: string) {
    if (grupoId === grupoAtivoId) return;
    const grupo = gruposVisiveis.find(g => g.id === grupoId);
    if (grupo && grupo.itens.length > 0) setAba(grupo.itens[0].id);
  }

  if (verificandoSessao) return null;

  // Demanda 329: cookie de sessão já foi gravado pelo servidor na própria
  // chamada de login — só falta atualizar o estado local.
  if (!operador) return <TelaLogin onLogin={(u) => { setOperador(u); setSessaoExpirada(false); }} sessaoExpirada={sessaoExpirada} />;

  function sairDoPortao() {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setOperador(null); setCarrinho([]); setAba("inbox");
  }

  return (
    <PortaoAberturaCaixa operador={operador} onSair={sairDoPortao}>
    <div className="flex flex-col h-screen bg-gray-100">

      {/* Header */}
      <header className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-bold text-lg leading-tight">JS Gráfica</h1>
          <p className="text-blue-200 text-xs capitalize">{hoje}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              {operador.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium leading-none">{operador.nome}</div>
              <button onClick={sairDoPortao} className="text-blue-300 hover:text-white text-xs">
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs — demanda 087: 2 fileiras, grupos por área em vez de abas soltas */}
      <nav className="bg-white border-b border-gray-200 flex flex-wrap px-2 flex-shrink-0">
        {gruposVisiveis.map(g => (
          <button key={g.id} onClick={() => selecionarGrupo(g.id)}
            className={`flex items-center gap-1.5 px-3.5 h-[46px] text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              grupoAtivoId === g.id ? "border-blue-600 text-blue-700 font-bold" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-blue-50"
            }`}>
            {g.label}
          </button>
        ))}
      </nav>
      <nav className="bg-blue-50 border-b border-gray-200 flex flex-wrap px-2 flex-shrink-0">
        {itensGrupoAtivo.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-3.5 h-[38px] text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              aba === a.id ? "border-blue-600 text-blue-800 font-bold" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}>
            <span>{a.emoji}</span>{a.label}
          </button>
        ))}
      </nav>

      {/* Conteúdo por aba — demanda 136: abas não desmontam mais ao trocar
          (ver AbaKeepAlive.tsx): montam na 1ª visita e depois só alternam
          visibilidade — Realtime do Inbox e carrinho do balcão persistem. */}
      <main className="flex-1 overflow-hidden">
        {abasMontadas.has("inbox") && <AbaKeepAlive ativa={aba === "inbox"}><TelaInbox operador={operador} abrirConversa={abrirConversa} onAbrirPedidos={abrirPedidosDoContato} /></AbaKeepAlive>}
        {abasMontadas.has("pedidos") && <AbaKeepAlive ativa={aba === "pedidos"}><TelaPedidos operador={operador} onAbrirConversa={abrirConversaNoInbox} abrirBusca={abrirBuscaPedidos} /></AbaKeepAlive>}
        {abasMontadas.has("clientes") && <AbaKeepAlive ativa={aba === "clientes"}><TelaClientes onAbrirConversa={abrirConversaNoInbox} onAbrirPedidos={abrirPedidosDoContato} /></AbaKeepAlive>}
        {abasMontadas.has("entradas") && <AbaKeepAlive ativa={aba === "entradas"}><TelaEntradas operadorFixo={operador.papel === "admin" ? undefined : operador.nome} operadorLogado={operador} /></AbaKeepAlive>}
        {abasMontadas.has("fechamento") && <AbaKeepAlive ativa={aba === "fechamento"}><TelaFechamento operador={operador} /></AbaKeepAlive>}
        {abasMontadas.has("financeiro") && <AbaKeepAlive ativa={aba === "financeiro"}><TelaFinanceiro operadorFixo={operador.papel === "admin" ? undefined : operador.nome} onAbrirFechamento={() => setAba("fechamento")} /></AbaKeepAlive>}

        {abasMontadas.has("pdv") && (
          <AbaKeepAlive ativa={aba === "pdv"}>
          <div className="flex h-full overflow-hidden">

            {/* Modal quantidade */}
            {modal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
                <div className="bg-white rounded-2xl shadow-2xl p-7 w-80" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-gray-800 text-base mb-1">{modal.nome}</h3>
                  <p className="text-gray-400 text-sm mb-5">{moeda(modal.preco)} por unidade</p>
                  <label className="text-xs text-gray-500 mb-1 block">Quantidade</label>
                  <input ref={qtdInputRef} type="number" min="1" value={modalQtd}
                    onChange={e => setModalQtd(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") confirmarModal(); if (e.key === "Escape") setModal(null); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:border-blue-500 mb-4" autoFocus />
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

                  {/* Demanda 137 (Fase 1): captura QUAL forma o cliente vai
                      usar na retirada — só gravação, opcional. */}
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

                  {/* Demanda 196: venda em Dinheiro de quem não tem gaveta
                      própria (admin) escolhe a gaveta de destino — Zu/Gabi
                      nunca veem isso. */}
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
                      <p className="text-xs text-amber-700 mt-1.5">O valor passa a contar no fechamento da gaveta escolhida.</p>
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
                      agora" sem vínculo (o "retira depois" já captura o dono
                      pela 146). Confirmar sem vincular continua livre. */}
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

            {/* Demanda 141 (Fase 3): tela de QR Pix do balcão. Demanda 145:
                o modal virou componente compartilhado (ModalQrPix) — mesmo
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

            {/* ÁREA CENTRAL — categorias (botões grandes) ou produtos da
                categoria escolhida, no mesmo lugar (demanda 061, substitui a
                lista lateral fina + o "Resumo de hoje" da demanda 060, que o
                Edvam não pediu) */}
            {/* Demanda 118: metade da tela pras categorias/produtos, metade
                pro carrinho — antes o carrinho era uma faixa fina fixa
                (w-72), difícil de ler no monitor de 15" usado no
                atendimento (Zu/Gabi usam óculos). */}
            <div className="w-1/2 overflow-y-auto p-6 bg-gray-50 flex flex-col">
              {carregandoProds ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  Carregando...
                </div>
              ) : (
                <>
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
                      {grupos.map(g => {
                        const temNoCarrinho = g.produtos.some(p => carrinho.find(c => c.produtoId === p.id));
                        const isAvulso = g.nome === "Entrada Avulsa";
                        const avulsoNoCarrinho = carrinho.some(c => c.produtoId.startsWith("avulso_"));
                        return (
                          <button key={g.nome} onClick={() => setGrupoAtivo(g.nome)}
                            className="relative border-2 border-gray-200 bg-white rounded-xl p-5 text-center hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95">
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
                        <p className="text-xs text-gray-400 mb-4">
                          Use aqui quando o serviço não está em nenhuma categoria — por
                          exemplo, um preço combinado ou um serviço fora do comum. Se o que você
                          quer vender já aparece numa categoria, use ela em vez desta tela.
                        </p>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Descrição (opcional)</label>
                            <input type="text" placeholder="Ex: Serviço especial" value={avulsoDesc}
                              onChange={e => setAvulsoDesc(e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Valor</label>
                            <input type="text" inputMode="decimal" placeholder="R$ 0,00" value={avulsoValor}
                              onChange={e => setAvulsoValor(sanitizarValorMonetario(e.target.value))}
                              onKeyDown={e => { if (e.key === "Enter") adicionarAvulso(); }}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                          </div>
                          <button onClick={adicionarAvulso} className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-bold text-sm hover:bg-blue-700">
                            + Adicionar ao carrinho
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Chips — trocar de categoria sem sair do centro (demanda 061) */}
                      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-gray-200 flex-shrink-0">
                        {grupos.map(g => (
                          <button key={g.nome} onClick={() => setGrupoAtivo(g.nome)}
                            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                              grupoAtivo === g.nome ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
                            }`}>
                            {g.nome}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {produtosGrupo.map(prod => {
                          const noCarrinho = carrinho.find(i => i.produtoId === prod.id);
                          return (
                            <button key={prod.id} onClick={() => abrirModal(prod.id)}
                              className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-md active:scale-95 ${
                                noCarrinho ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
                              }`}>
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
                </>
              )}
            </div>

            {/* Carrinho */}
            <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">Carrinho</h2>
                <p className="text-xs text-gray-400">{carrinho.length} {carrinho.length === 1 ? "item" : "itens"}</p>
              </div>

              {/* Vincular contato — demanda 163: virou componente compartilhado
                  (busca + "+ Criar novo contato" quando não acha ninguém).
                  Demanda 174: cartão destacado com cabeçalho, 1º bloco do
                  fluxo da venda — mesmo tratamento do admin; sempre opcional. */}
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
                    {/* Demanda 174: nudge pra vincular ANTES do carrinho —
                        lembrete, nunca passo obrigatório. */}
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
                {carrinho.map(item => {
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
                          <button onClick={() => removerDoCarrinho(item.produtoId)} className="text-xs text-red-400 hover:text-red-600 mt-0.5">remover</button>
                        </div>
                      </div>

                      {/* Desconto pontual (demanda 105) — discreto, fechado
                          por padrão, não atrapalha quem não quer usar. */}
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
                <button onClick={() => setModalVenda(true)} disabled={loading || carrinho.length === 0}
                  className="w-full bg-green-600 text-white rounded-lg py-3 font-bold text-sm hover:bg-green-700 active:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
          </AbaKeepAlive>
        )}
      </main>
    </div>
    </PortaoAberturaCaixa>
  );
}
