"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";
import { STATUS_CFG } from "@/components/TelaPedidos";

// ── Clientes types (demanda 083/086) ────────────────────────────
interface ClienteResumo {
  phone: string;
  nome: string;
  temNome: boolean;
  foto: string | null;
  dataUltimoContato: string | null;
  statusAtendimento: string;
  classificacao: string | null;
  ultimaMsgRecebida: string | null;
}

interface ClienteDetalhe {
  phone: string;
  nome: string;
  temNome: boolean;
  email: string | null;
  foto: string | null;
  aniversario: string | null;
  endereco: string | null;
  dataPrimeiroContato: string | null;
  dataUltimoContato: string | null;
  statusAtendimento: string;
  atendente: string | null;
  classificacao: string | null;
  totalRecebidas: number;
  totalEnviadas: number;
  // Demanda 119: migrado do painel do Inbox (demanda 114) — mesma coluna
  // jsonb, só a exibição mudou de lugar.
  historicoAtendimento: { operador: string; em: string }[];
}

interface PedidoResumo {
  id: string;
  servico_nome: string | null;
  quantidade: number | null;
  valor_final: number | null;
  status: string;
  created_at: string;
}

function moeda(v: number | null | undefined) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dthr(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function dataCurta(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function BadgeAtendimento({ status }: { status: string }) {
  if (status === "em_atendimento") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Em atend.</span>;
  if (status === "resolvido")      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Resolvido</span>;
  // Demanda 321: "escalado" (novo) — IA tentou e desistiu, precisa de humano
  // com prioridade. Sem este caso, caía silenciosamente em "Aberto" (errado:
  // esconderia que já houve uma tentativa da IA sem sucesso).
  if (status === "escalado")       return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">⚠ Escalado</span>;
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">Aberto</span>;
}

function BadgePedido({ status }: { status: string }) {
  const c = STATUS_CFG[status] ?? { label: status, cor: "text-gray-600", bg: "bg-gray-100" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${c.cor} ${c.bg}`}>{c.label}</span>;
}

// Mesmo padrão de avatar com fallback pra letra do TelaInbox.tsx (não
// exportado de lá — a foto vem do mesmo campo `lead_photo`, mas a tela de
// Clientes é um componente independente).
function Avatar({ foto, nome, sizeClass, textClass = "text-sm" }: { foto: string | null; nome: string; sizeClass: string; textClass?: string }) {
  const [erro, setErro] = useState(false);
  if (foto && !erro) {
    return <img src={foto} alt="" onError={() => setErro(true)} className={`${sizeClass} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 ${textClass}`}>
      {(nome || "?")[0].toUpperCase()}
    </div>
  );
}

// ─── DETALHE ────────────────────────────────────────────────────
function PainelDetalheCliente({
  phone,
  onNomeAtualizado,
  onAbrirConversa,
  onAbrirPedidos,
}: {
  phone: string;
  onNomeAtualizado: (phone: string, nome: string) => void;
  onAbrirConversa: (phone: string) => void;
  // Demanda 171: navegação cruzada — abre a aba Pedidos já filtrada por este
  // telefone (o campo de busca de TelaPedidos busca por telefone).
  onAbrirPedidos?: (phone: string) => void;
}) {
  const [cliente, setCliente]     = useState<ClienteDetalhe | null>(null);
  const [pedidos, setPedidos]     = useState<PedidoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEditado, setNomeEditado]   = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [nomeErro, setNomeErro]         = useState<string | null>(null);
  // ── Aniversário/endereço (demanda 086) — entrada manual, sem fonte automática ──
  const [editandoExtra, setEditandoExtra] = useState(false);
  const [aniversarioEditado, setAniversarioEditado] = useState("");
  const [enderecoEditado, setEnderecoEditado]       = useState("");
  const [salvandoExtra, setSalvandoExtra]           = useState(false);
  const [extraErro, setExtraErro]                   = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/clientes?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setCliente(data.cliente ?? null);
      setPedidos(data.pedidos ?? []);
    } finally {
      setCarregando(false);
    }
  }, [phone]);

  useEffect(() => { setEditandoNome(false); setNomeErro(null); setEditandoExtra(false); setExtraErro(null); carregar(); }, [carregar]);

  function iniciarEdicao() {
    if (!cliente) return;
    setNomeEditado(cliente.temNome ? cliente.nome : "");
    setNomeErro(null);
    setEditandoNome(true);
  }

  async function salvarNome() {
    const nome = nomeEditado.trim();
    if (!nome) { setNomeErro("Digite um nome."); return; }
    setSalvandoNome(true);
    setNomeErro(null);
    try {
      const res = await fetch("/api/inbox/contato", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, nome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar nome");
      setCliente(prev => prev ? { ...prev, nome: data.nome, temNome: true } : prev);
      onNomeAtualizado(phone, data.nome);
      setEditandoNome(false);
    } catch (e) {
      setNomeErro(e instanceof Error ? e.message : "Erro ao salvar nome");
    } finally {
      setSalvandoNome(false);
    }
  }

  function iniciarEdicaoExtra() {
    if (!cliente) return;
    setAniversarioEditado(cliente.aniversario ?? "");
    setEnderecoEditado(cliente.endereco ?? "");
    setExtraErro(null);
    setEditandoExtra(true);
  }

  async function salvarExtra() {
    setSalvandoExtra(true);
    setExtraErro(null);
    try {
      const res = await fetch("/api/clientes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, aniversario: aniversarioEditado || null, endereco: enderecoEditado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      setCliente(prev => prev ? { ...prev, aniversario: data.aniversario, endereco: data.endereco } : prev);
      setEditandoExtra(false);
    } catch (e) {
      setExtraErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvandoExtra(false);
    }
  }

  if (carregando) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Carregando...</div>;
  if (!cliente) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Cliente não encontrado</div>;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Avatar foto={cliente.foto} nome={cliente.temNome ? cliente.nome : "?"} sizeClass="w-12 h-12" textClass="text-base" />
          <div className="min-w-0 flex-1">
            {editandoNome ? (
              <div className="space-y-1.5">
                <input autoFocus value={nomeEditado} onChange={e => setNomeEditado(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") salvarNome(); if (e.key === "Escape") setEditandoNome(false); }}
                  placeholder="Nome do contato"
                  className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-base font-bold focus:outline-none focus:border-blue-500" />
                {nomeErro && <p className="text-xs text-red-500">{nomeErro}</p>}
                <div className="flex gap-1.5">
                  <button onClick={salvarNome} disabled={salvandoNome}
                    className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {salvandoNome ? "Salvando..." : "Salvar"}
                  </button>
                  <button onClick={() => setEditandoNome(false)}
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 font-medium">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className={`text-lg font-bold leading-tight truncate ${cliente.temNome ? "text-gray-800" : "text-gray-400 italic"}`}>{cliente.nome}</p>
                <button onClick={iniciarEdicao} title="Editar nome do contato" className="text-gray-300 hover:text-blue-500 flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z"/>
                  </svg>
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-0.5">{cliente.phone}</p>
            {cliente.email && <p className="text-sm text-gray-500">{cliente.email}</p>}
          </div>
        </div>
        <BadgeAtendimento status={cliente.statusAtendimento} />
      </div>

      <button onClick={() => onAbrirConversa(cliente.phone)}
        className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-blue-700">
        💬 Abrir conversa no Inbox
      </button>

      {/* Resumo */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Resumo</h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
              <div className="text-base font-bold text-gray-700">{cliente.totalRecebidas}</div>
              <div className="text-xs text-gray-400">Recebidas</div>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
              <div className="text-base font-bold text-gray-700">{cliente.totalEnviadas}</div>
              <div className="text-xs text-gray-400">Enviadas</div>
            </div>
          </div>
          <p className="text-gray-600">Primeiro contato: {dthr(cliente.dataPrimeiroContato)}</p>
          <p className="text-gray-600">Último contato: {dthr(cliente.dataUltimoContato)}</p>
          <p className="text-gray-600">
            Classificação: <span className="font-medium">{cliente.classificacao?.toUpperCase() === "RECORRENTE" ? "Recorrente" : cliente.classificacao?.toUpperCase() === "NOVO" ? "Novo" : "—"}</span>
          </p>
          {cliente.atendente && <p className="text-gray-600">Atendente: <span className="font-medium">{cliente.atendente}</span></p>}
        </div>
      </section>

      {/* Histórico de atendimento (demanda 119 — migrado do painel do Inbox,
          demanda 114) — últimas trocas de atendente pra esse contato. */}
      {cliente.historicoAtendimento.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Histórico de atendimento</h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            {[...cliente.historicoAtendimento].reverse().slice(0, 5).map((h, i) => (
              <p key={`${h.em}-${i}`} className="text-sm text-gray-600">
                <span className="font-medium text-gray-800">{h.operador}</span> assumiu · {dthr(h.em)}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Aniversário/endereço (demanda 086) — sempre manual, sem fonte automática */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aniversário e endereço</h3>
          {!editandoExtra && (
            <button onClick={iniciarEdicaoExtra} title="Editar aniversário/endereço" className="text-gray-300 hover:text-blue-500">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z"/>
              </svg>
            </button>
          )}
        </div>
        {editandoExtra ? (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Data de aniversário</label>
              <input type="date" value={aniversarioEditado} onChange={e => setAniversarioEditado(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Endereço</label>
              <textarea value={enderecoEditado} onChange={e => setEnderecoEditado(e.target.value)}
                placeholder="Rua, número, bairro..." rows={2}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-blue-400" />
            </div>
            {extraErro && <p className="text-xs text-red-500">{extraErro}</p>}
            <div className="flex gap-1.5">
              <button onClick={salvarExtra} disabled={salvandoExtra}
                className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {salvandoExtra ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setEditandoExtra(false)}
                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 font-medium">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <p className="text-gray-600">Aniversário: <span className="font-medium">{cliente.aniversario ? dataCurta(cliente.aniversario) : "—"}</span></p>
            <p className="text-gray-600">Endereço: <span className="font-medium">{cliente.endereco || "—"}</span></p>
          </div>
        )}
      </section>

      {/* Histórico de pedidos */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Histórico de pedidos ({pedidos.length})</h3>
          {/* Demanda 171: ver esses pedidos na aba Pedidos (filtrada). */}
          {onAbrirPedidos && pedidos.length > 0 && (
            <button onClick={() => onAbrirPedidos(phone)}
              className="text-xs font-semibold text-blue-600 hover:underline">
              Ver na aba Pedidos →
            </button>
          )}
        </div>
        {pedidos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum pedido registrado.</p>
        ) : (
          <div className="space-y-2">
            {pedidos.map(p => (
              <div key={p.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.servico_nome || "—"}</p>
                  <p className="text-xs text-gray-400">
                    {p.quantidade != null ? `Qtd: ${p.quantidade} · ` : ""}{dthr(p.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-700">{moeda(p.valor_final)}</p>
                  <BadgePedido status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── PRINCIPAL ──────────────────────────────────────────────────
export function TelaClientes({ onAbrirConversa, onAbrirPedidos }: {
  onAbrirConversa: (phone: string) => void;
  onAbrirPedidos?: (phone: string) => void;
}) {
  const [clientes, setClientes]   = useState<ClienteResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca]         = useState("");
  const [ordenar, setOrdenar]     = useState<"ultimo_contato" | "nome">("ultimo_contato");
  const [visualizacao, setVisualizacao] = useState<"lista" | "grade">("lista");
  const [phoneSel, setPhoneSel]   = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.set("q", busca);
      params.set("ordenar", ordenar);
      const res = await fetch(`/api/clientes?${params}`);
      const data = await res.json();
      setClientes(data.clientes ?? []);
    } finally {
      setCarregando(false);
    }
  }, [busca, ordenar]);

  useEffect(() => {
    const t = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca]);
  // Demanda 136: a aba não desmonta mais ao trocar — recarrega ao reativar.
  useRecarregarAoReativar(carregar);

  function nomeAtualizadoNaLista(phone: string, nome: string) {
    setClientes(prev => prev.map(c => c.phone === phone ? { ...c, nome, temNome: true } : c));
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Coluna central/esquerda — lista (demanda 117: mais espaço que o
          painel de detalhe, que virou compacto e foi pra direita) */}
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-white min-w-0">
        <div className="p-3 border-b border-gray-100 space-y-2">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <button onClick={() => setOrdenar("ultimo_contato")}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${ordenar === "ultimo_contato" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                Último contato
              </button>
              <button onClick={() => setOrdenar("nome")}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${ordenar === "nome" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                A-Z
              </button>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setVisualizacao("lista")} title="Ver em lista"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${visualizacao === "lista" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1.5H2zm0 4h12v1.5H2zm0 4h12v1.5H2z"/></svg>
              </button>
              <button onClick={() => setVisualizacao("grade")} title="Ver em grade"
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${visualizacao === "grade" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregando ? (
            <p className="text-center text-sm text-gray-400 p-6">Carregando...</p>
          ) : clientes.length === 0 ? (
            <p className="text-center text-sm text-gray-400 p-6">Nenhum cliente encontrado</p>
          ) : visualizacao === "lista" ? (
            clientes.map(c => (
              <button key={c.phone} onClick={() => setPhoneSel(c.phone)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-2.5 ${
                  phoneSel === c.phone ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                }`}>
                <Avatar foto={c.foto} nome={c.temNome ? c.nome : "?"} sizeClass="w-8 h-8 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm font-medium truncate ${c.temNome ? "text-gray-800" : "text-gray-400 italic"}`}>{c.nome}</span>
                    <BadgeAtendimento status={c.statusAtendimento} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.phone}</p>
                  {c.ultimaMsgRecebida ? (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.ultimaMsgRecebida}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">Último contato: {dthr(c.dataUltimoContato)}</p>
                  )}
                </div>
              </button>
            ))
          ) : (
            // Demanda 117: a lista ganhou mais espaço (flex-1 em vez de
            // w-96) — grade com mais colunas pra não sobrar vão vazio.
            <div className="grid grid-cols-3 gap-2 p-2">
              {clientes.map(c => (
                <button key={c.phone} onClick={() => setPhoneSel(c.phone)}
                  className={`text-left rounded-xl border p-2.5 hover:border-blue-300 transition-colors ${
                    phoneSel === c.phone ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                  }`}>
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <Avatar foto={c.foto} nome={c.temNome ? c.nome : "?"} sizeClass="w-12 h-12" textClass="text-base" />
                    <span className={`text-xs font-medium truncate w-full ${c.temNome ? "text-gray-800" : "text-gray-400 italic"}`}>{c.nome}</span>
                    <BadgeAtendimento status={c.statusAtendimento} />
                    {c.ultimaMsgRecebida && <p className="text-[10px] text-gray-500 truncate w-full">{c.ultimaMsgRecebida}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coluna direita — detalhe (demanda 117: virou compacta, com largura
          fixa igual a lista tinha antes, em vez de ocupar o espaço restante) */}
      <div className="w-96 flex-shrink-0 bg-gray-50 overflow-hidden">
        {phoneSel ? (
          <PainelDetalheCliente phone={phoneSel} onNomeAtualizado={nomeAtualizadoNaLista} onAbrirConversa={onAbrirConversa}  onAbrirPedidos={onAbrirPedidos} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Selecione um cliente para ver os detalhes
          </div>
        )}
      </div>
    </div>
  );
}
