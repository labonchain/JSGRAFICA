"use client";

import { useState, useEffect, useCallback } from "react";
import { useRecarregarAoReativar } from "@/components/AbaKeepAlive";

// Demanda 275 — painel simples pra controlar quem o agente de atendimento
// atende (`jsgrafica_telefones_autorizados`), sem precisar de SQL direto.
// Peça que faltava pra viabilizar a "regra de expansão gradual" da demanda
// 243 (começar com poucos números, expandir aos poucos).

interface TelefoneAutorizado {
  id: string;
  telefone: string;
  ativo: boolean;
  descricao: string | null;
  nomeContato: string | null;
}

export function TelaTelefonesAutorizados() {
  const [telefones, setTelefones] = useState<TelefoneAutorizado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alternando, setAlternando] = useState<string | null>(null);
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/telefones-autorizados");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar");
      setTelefones(data.telefones ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar telefones autorizados");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useRecarregarAoReativar(carregar);

  async function alternarAtivo(t: TelefoneAutorizado) {
    setAlternando(t.id);
    // Otimista — 1 clique, sem etapa extra (critério de aceite da 275).
    setTelefones(prev => prev.map(x => x.id === t.id ? { ...x, ativo: !x.ativo } : x));
    try {
      const res = await fetch("/api/telefones-autorizados", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, ativo: !t.ativo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar");
    } catch (e) {
      // Reverte se der erro — nunca deixa a tela mentir sobre o estado real.
      setTelefones(prev => prev.map(x => x.id === t.id ? { ...x, ativo: t.ativo } : x));
      alert(e instanceof Error ? e.message : "Erro ao atualizar telefone");
    } finally {
      setAlternando(null);
    }
  }

  async function adicionar() {
    if (!novoTelefone.trim() || adicionando) return;
    setAdicionando(true);
    setErro(null);
    try {
      const res = await fetch("/api/telefones-autorizados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: novoTelefone, descricao: novaDescricao || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao adicionar");
      setNovoTelefone("");
      setNovaDescricao("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao adicionar telefone");
    } finally {
      setAdicionando(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">🤖 Quem o agente atende</h2>
        <p className="text-sm text-gray-500">
          Só os telefones ativos aqui recebem resposta do agente de atendimento automático.
          Desativar não apaga o histórico — só tira da lista de quem é atendido.
        </p>
      </div>

      {erro && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        {carregando ? (
          <p className="text-sm text-gray-400 text-center py-4">Carregando...</p>
        ) : telefones.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum telefone cadastrado ainda.</p>
        ) : (
          telefones.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {t.telefone}
                  {t.nomeContato && <span className="text-gray-400 font-normal"> ({t.nomeContato})</span>}
                </p>
                {t.descricao && <p className="text-xs text-gray-400 truncate">{t.descricao}</p>}
              </div>
              <button
                onClick={() => alternarAtivo(t)}
                disabled={alternando === t.id}
                className={`flex-shrink-0 relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${t.ativo ? "bg-green-500" : "bg-gray-300"}`}
                title={t.ativo ? "Ativo — clique pra desativar" : "Inativo — clique pra ativar"}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${t.ativo ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="text-sm font-bold text-gray-700">Adicionar telefone</h3>
        <input type="text" value={novoTelefone} onChange={e => setNovoTelefone(e.target.value)}
          placeholder="Ex.: 5581999999999"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        <input type="text" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)}
          placeholder="Descrição (opcional)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        <button onClick={adicionar} disabled={!novoTelefone.trim() || adicionando}
          className="w-full bg-blue-700 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50">
          {adicionando ? "Adicionando..." : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
