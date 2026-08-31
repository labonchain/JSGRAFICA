"use client";

import { useState, useEffect, useCallback } from "react";
import { type Usuario } from "@/lib/usuarios";

// Demanda 103: abertura de caixa vira portão obrigatório antes do PDV — Zu/
// Gabi não acessam nenhuma aba do sistema sem registrar a contagem física do
// início do dia primeiro. Antes (demanda 074), isso era um bloco dentro da
// aba "Fechar Caixa" — uma aba que a pessoa escolhia visitar. O Edvam
// descreveu a rotina real: é a 1ª coisa que acontece ao logar, não uma
// escolha — por isso virou um gate que envolve todo o conteúdo do PDV, não
// mais parte da tela de fechamento. Admin nunca passa por aqui (não tem
// gaveta física própria, mesma regra de sempre desde a 074).
export function PortaoAberturaCaixa({ operador, onSair, children }: {
  operador: Usuario; onSair: () => void; children: React.ReactNode;
}) {
  const isAdmin = operador.papel === "admin";

  const [abertura, setAbertura] = useState<{ total_contado: number } | null>(null);
  const [carregando, setCarregando] = useState(!isAdmin);
  const [dinheiro, setDinheiro] = useState("");
  const [moedas, setMoedas] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarAbertura = useCallback(async () => {
    if (isAdmin) return;
    setCarregando(true);
    try {
      const r = await fetch(`/api/abertura-caixa?operador=${encodeURIComponent(operador.nome)}`);
      const d = await r.json();
      setAbertura(d.abertura ?? null);
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, [operador.nome, isAdmin]);

  useEffect(() => { carregarAbertura(); }, [carregarAbertura]);

  async function registrar() {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/abertura-caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operador: operador.nome,
          dinheiro: parseFloat(dinheiro.replace(",", ".")) || 0,
          moedas:   parseFloat(moedas.replace(",", ".")) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErro(data.error || "Erro ao registrar abertura, tente de novo.");
        return;
      }
      setAbertura(data.abertura);
    } catch {
      setErro("Erro ao registrar abertura, tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (isAdmin) return <>{children}</>;

  if (carregando) return (
    <div className="flex items-center justify-center h-screen bg-gray-100 text-gray-400 text-sm gap-2">
      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" strokeOpacity=".3" /><path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
      Carregando...
    </div>
  );

  if (abertura) return <>{children}</>;

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🌅</div>
          <h1 className="text-xl font-bold text-gray-800">Abertura de caixa</h1>
          <p className="text-gray-400 text-sm mt-1">
            Antes de começar, conte o dinheiro e as moedas do seu caixa físico, <strong>{operador.nome}</strong>.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input type="number" placeholder="Dinheiro R$ 0,00" value={dinheiro} autoFocus
            onChange={e => setDinheiro(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") registrar(); }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
          <input type="number" placeholder="Moedas R$ 0,00" value={moedas}
            onChange={e => setMoedas(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") registrar(); }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        {erro && <p className="text-xs text-red-600 mb-3">{erro}</p>}
        <button onClick={registrar} disabled={salvando}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
          {salvando ? "Salvando..." : "Registrar abertura e entrar"}
        </button>
        <button onClick={onSair} className="w-full mt-3 text-xs text-gray-400 hover:text-red-500">
          Não é você? Sair
        </button>
      </div>
    </div>
  );
}
