"use client";
import { useState, useEffect } from "react";

// ── Demanda 163: vínculo de contato do balcão, agora com criação rápida ──
// Um componente só (usado no painel do carrinho E no lembrete do modal
// "Finalizar venda", nos 2 balcões) em vez das cópias de busca que cada
// página tinha: busca contato existente (mesma rota do Inbox) e, quando a
// busca não acha ninguém, oferece "+ Criar novo contato" (nome obrigatório,
// telefone opcional — POST /api/clientes, contato marcado tipo_registro
// BALCAO). NUNCA obrigatório: vender sem vincular continua igual.
export interface ContatoVinculado { phone: string; nome: string }

export function VincularContatoBalcao({
  contato,
  onVincular,
}: {
  contato: ContatoVinculado | null;
  onVincular: (c: ContatoVinculado | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<ContatoVinculado[]>([]);
  const [mostraSugestoes, setMostraSugestoes] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoFone, setNovoFone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!busca.trim() || busca.length < 2) { setSugestoes([]); setBuscou(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/inbox/conversas?q=${encodeURIComponent(busca)}`);
        const d = await res.json();
        setSugestoes((d.conversas || []).slice(0, 5).map((c: { phone: string; nome: string }) => ({ phone: c.phone, nome: c.nome })));
        setBuscou(true);
        setMostraSugestoes(true);
      } catch { /* silencioso — busca é opcional */ }
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  function limpar() {
    setBusca(""); setSugestoes([]); setBuscou(false);
    setCriando(false); setNovoNome(""); setNovoFone(""); setErro(null);
  }

  async function criarContato() {
    if (!novoNome.trim() || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, telefone: novoFone }),
      });
      const d = await res.json();
      if (!res.ok || d.error) { setErro(d.error || "Erro ao criar o contato."); return; }
      onVincular(d.contato);
      limpar();
    } catch {
      setErro("Erro ao criar o contato.");
    } finally {
      setSalvando(false);
    }
  }

  if (contato) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-gray-400">Vinculado a</div>
          <div className="text-sm font-semibold text-blue-700 truncate">{contato.nome}</div>
          {!contato.phone.startsWith("balcao-") && <div className="text-xs text-gray-400">{contato.phone}</div>}
        </div>
        <button onClick={() => { onVincular(null); limpar(); }}
          className="text-gray-300 hover:text-red-500 flex-shrink-0 text-sm leading-none">✕</button>
      </div>
    );
  }

  if (criando) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 space-y-2">
        <p className="text-xs font-bold text-blue-800">+ Novo contato</p>
        <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
          placeholder="Nome (obrigatório)" autoFocus
          className="w-full text-xs border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400" />
        <input type="text" inputMode="tel" value={novoFone} onChange={e => setNovoFone(e.target.value)}
          placeholder="Telefone/WhatsApp (opcional)"
          className="w-full text-xs border border-blue-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-blue-400" />
        {erro && <p className="text-xs text-red-600">⚠️ {erro}</p>}
        <div className="flex gap-2">
          <button onClick={criarContato} disabled={!novoNome.trim() || salvando}
            className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-xs font-bold hover:bg-blue-700 disabled:opacity-50">
            {salvando ? "Criando..." : "Criar e vincular"}
          </button>
          <button onClick={() => { setCriando(false); setErro(null); }}
            className="px-3 border border-gray-200 rounded-lg py-1.5 text-xs text-gray-500 hover:bg-gray-50">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        {/* Demanda 174: placeholder diz O QUE fazer (o rótulo "vincular
            contato" agora vem do cabeçalho destacado de quem usa o
            componente); demanda 183: telefone formatado também acha. */}
        <input type="text" placeholder="🔍 Buscar por nome ou telefone" value={busca}
          onChange={e => { setBusca(e.target.value); setMostraSugestoes(true); }}
          onFocus={() => { if (sugestoes.length > 0 || buscou) setMostraSugestoes(true); }}
          onBlur={() => setTimeout(() => setMostraSugestoes(false), 150)}
          title="Ligue a venda a um cliente — opcional, não precisa preencher"
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
        {mostraSugestoes && (sugestoes.length > 0 || buscou) && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 overflow-hidden">
            {sugestoes.map(s => (
              <button key={s.phone} onMouseDown={() => { onVincular(s); limpar(); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0">
                <div className="font-medium text-gray-800">{s.nome}</div>
                <div className="text-gray-400">{s.phone}</div>
              </button>
            ))}
            {/* Demanda 163: busca sem resultado deixava a operadora sem saída
                — agora dá pra criar o contato na hora, sem sair da venda. */}
            {buscou && sugestoes.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400">Nenhum contato encontrado.</div>
            )}
            {buscou && (
              <button onMouseDown={() => { setCriando(true); setNovoNome(busca.trim()); setMostraSugestoes(false); }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100">
                + Criar novo contato{busca.trim() ? ` "${busca.trim()}"` : ""}
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Cliente já falou no WhatsApp? Busque pelo nome. Não achou? Dá pra criar na hora — ou
        deixar em branco, a venda fecha normal.
      </p>
    </div>
  );
}
